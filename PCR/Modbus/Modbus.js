const { SerialPort } = require("serialport");
const ID             = require("./Modbus_ID");

const RXState = {
  WAIT_ID: 0,
  WAIT_FUNC: 1,
  WAIT_LEN: 2,
  WAIT_DATA: 3,
  WAIT_CRC_LOW: 4,
  WAIT_CRC_HIGH: 5,
};

let rx_state = RXState.WAIT_ID;       // trạng thái hiện tại của byte
let rx_buf = new Uint8Array(256);     //Mảng nhận dữ liệu
let rx_idx = 0;                       // vị trí byte
let rx_len = 0;                       // chiều dài
let crc_check = 0;                    // kiểm tra lỗi 
const MY_BOARD_ID = ID.DEVICE.WEB_ID; // ID của Pi          
let onFrameCallback = null;           // callback khi có frame hợp lệ

//=================== UART =====================//
const uart = new SerialPort  // Cấu hình uart
({ 
   path: "/dev/serial0",
   baudRate: 115200,
});

uart.on("data", (data) => { // Nhận dữ liệu đưa vào hàm phân tích frame
  const bytes = new Uint8Array(data);
  for (const b of bytes) Modbus_RX_Byte(b);
});

const ModbusState = {
  needUpdateTFT: false,
};

const PCR_Global = {
  block_temp: 0,
  cycles_pcr: new Array(ID.PCR_LOOP).fill(1),
  pcr_loop_index: 0,
  time_run: 0,
  state_system: 0
};


//=================== HÀM XỬ LÝ FRAME =====================//
function Modbus_RX_Byte(byte) {
  switch (rx_state) {
    case RXState.WAIT_ID:
      if (byte === MY_BOARD_ID) 
      {
        rx_buf[0] = byte;
        rx_idx = 1;
        rx_state = RXState.WAIT_FUNC;
      }
      break;

    case RXState.WAIT_FUNC:
      rx_buf[1] = byte;
      rx_idx = 2;
      rx_state = RXState.WAIT_LEN;
      break;

    case RXState.WAIT_LEN:
      rx_len = byte;
      rx_buf[2] = byte;      // lưu byte độ dài vào buffer
      rx_idx = 3;            // cập nhật chỉ số index sau byte độ dài

      if (rx_len === 0)      // Nếu độ dài = 0 thì chuyển sang byte CRC
      {
        rx_state = RXState.WAIT_CRC_LOW;
      } 
      else if (rx_len + 5 > rx_buf.length) 
      {
        rx_state = RXState.WAIT_ID;
        rx_idx = 0;
        rx_buf.fill(0);
      } 
      else 
      {
        rx_state = RXState.WAIT_DATA;
      }
      break;

    case RXState.WAIT_DATA:
      rx_buf[rx_idx++] = byte;
      if (rx_idx === 3 + rx_len) rx_state = RXState.WAIT_CRC_LOW;
      break;

    case RXState.WAIT_CRC_LOW:
      rx_buf[rx_idx++] = byte;   // lưu CRC low vào frame
      crc_check = byte;
      rx_state = RXState.WAIT_CRC_HIGH;
      break;

    case RXState.WAIT_CRC_HIGH:
      rx_buf[rx_idx++] = byte;   // lưu CRC low vào frame
      crc_check |= byte << 8;
      const crc_calc = crc16_modbus(rx_buf.slice(0, 3 + rx_len));
      if (crc_calc === crc_check) 
      {
        
        // frame đầy đủ gồm ID, FUNC, LEN, DATA, CRC_LOW, CRC_HIGH
        const frame = rx_buf.slice(0, 3 + rx_len + 2);
        //console.log(frame);

        Pasing_Frame(frame);
        if (onFrameCallback) 
          onFrameCallback(frame);
         
      }
      rx_state = RXState.WAIT_ID;
      rx_idx = 0;
      rx_buf.fill(0);
      break;
  }
}

//=================== CRC & PACK DATA =====================//
function crc16_modbus(buf) {
  let crc = 0xffff;
  for (let pos = 0; pos < buf.length; pos++) {
    crc ^= buf[pos];
    for (let i = 0; i < 8; i++)
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
  }
  return crc & 0xffff;
}

function Pack_Data(id, func, data, length) 
{
  const frame = new Uint8Array(3 + length + 2);
  frame[0] = id;
  frame[1] = func;
  frame[2] = length;
  if (data) frame.set(data, 3);
  const crc = crc16_modbus(frame.slice(0, 3 + length));
  frame[3 + length] = crc & 0xff;
  frame[4 + length] = (crc >> 8) & 0xff;
  return frame;
}

function Pasing_Frame(frame)
{
  const id   = frame[0];
  const func = frame[1];
  const len  = frame[2];
  const data = frame.slice(3, 3 + len);

  // chỉ xử lý frame gửi cho WEB
  if (id !== MY_BOARD_ID) return;

  ModbusState.needUpdateTFT = false;   // reset mỗi frame

  switch (func)
  {
    case ID.PCR_REG.START_PROTOCOL:
      Parse_Start_Data(data);
      ModbusState.needUpdateTFT = true;
      break;

    case ID.PCR_REG.WAIT_STATE:
      Parse_Wait_Data(data);
      ModbusState.needUpdateTFT = true;
      break;

    case ID.PCR_REG.STOP_PROTOCOL:
      Parse_Stop_Data(data);
      ModbusState.needUpdateTFT = true;
      break;

    default:
      console.log("Unknown FUNC:", func, data);
      break;
  }
  //console.log("PCR_Global:", PCR_Global);
}

function Parse_Start_Data(data)
{
  let idx = 0;

  PCR_Global.block_temp = data[idx++];

  const time_count_low  = data[idx++];
  const time_count_high = data[idx++];
  const lid_temp = data[idx++];
  for (let i = 0; i < ID.PCR_LOOP; i++)
  {
    let c = data[idx++];
    PCR_Global.cycles_pcr[i] = (c === 0) ? 1 : c;
  }

  PCR_Global.pcr_loop_index = data[idx++];
  const step_setpoint  = data[idx++];
  const time_run_low  = data[idx++];
  const time_run_high = data[idx++];
  PCR_Global.time_run = (time_run_high << 8) | time_run_low;  // Lấy time
  PCR_Global.state_system = 1;
}


function Parse_Wait_Data(data)
{
  PCR_Global.block_temp = data[0];
  PCR_Global.pcr_loop_index = 0;
  PCR_Global.state_system = 0;
}

function Parse_Stop_Data(data)
{
  let idx = 0;
  const time_run_low  = data[idx++];
  const time_run_high = data[idx++];
  PCR_Global.time_run = (time_run_high << 8) | time_run_low;

  PCR_Global.pcr_loop_index = 0;
  PCR_Global.state_system = 0;
}

//=================== UART Queue =====================//
const uartQueue = [];
let sending = false;
let count_tx = 0;

function sendNext() {
  if (sending || uartQueue.length === 0) return;
  sending = true;

  const frame = uartQueue.shift();
  const buffer = Buffer.from(frame);

  uart.write(buffer, (err) => 
  {
    if (err) console.log("UART write error:", err.message);

    count_tx++;
    //console.log("UART write ok: ", count_tx);
    // Delay 5ms để tránh trùng frame
    setTimeout(() => 
    {
      sending = false;
      sendNext();
    }, 5);
  });
}

function Send_To_Uart(frame) {
  uartQueue.push(frame); // Để vào hàng đợi
  sendNext();            // Gửi Frame mỗi 5ms
}

// Cho phép server.js đăng ký callback khi có frame hợp lệ
function onFrame(callback) 
{
  onFrameCallback = callback;
}

module.exports = {
  Pack_Data,
  Send_To_Uart,
  onFrame,
  PCR_Global,
  ModbusState
};
