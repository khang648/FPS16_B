// ========================= Mảng truyền nhận dữ liệu =========================
const DATA_TX_SIZE  = 256;                  // Kích thước mảng
const DATA_TX       = new Uint8Array(DATA_TX_SIZE);  // mảng gửi dữ liệu
let DATA_TX_LENGHT  = 0; 


// ========================= Thông số cài protocol =========================
let HOLD_START_CNT  = 1;
let PCR_LOOP_CNT    = 1;
let STEP_PCR_CNT    = [2, 2, 2];
let Cycles_setpoint = [30, 30, 30];
let HOLD_END_CNT    = 1;
let PROTOCOL_NAME   = "none";

let Temp_Time_Setpoint = [
  [93,  93, 55, 72, 25, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39], // nhiệt độ
  [300, 10, 20, 120, 60, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29] // thời gian
];

let System = {
    LidTemp_setpoint: 60, // Nhiệt độ nắp
    Liquid_setpoint:  40, // Dung dịch
    lidTemp: 30,          // Nhiệt độ đo đượck
    BlockTemp: 30,
    Tab_Prev: "",
    Request_Data: "",
};

//*================================ lẤY DỮ LIỆU BIỂU ĐỒ NHIỆT ========================================*//

const Chart_Buf_Size   = 50; // Saved
const Saved_Buf_Size   = 20; // Saved
const History_Buf_Size = 10; // History
const Calib_Buf_Size   = 6;  // Callib

let Info_Saved = Array.from(
  { length: Saved_Buf_Size + History_Buf_Size },
  () => Array(64).fill(0)
);

let Setpoint_Saved = Array.from(
  { length: Saved_Buf_Size + History_Buf_Size },
  () => Array.from({ length: 2 }, () => Array(20).fill(0))
);

let Calib_Val_Saved = Array.from(
  { length: Calib_Buf_Size },
  () => new Array(64).fill(0)
);

// Các biến nhận điều khiển
let saved_calib_total = { value: 0 };  // Biến đếm tổng protocol đã lưu
let saved_calib_cnt   = { value: 0 }; // Biến đếm số protocol đã lưu

let saved_total = { value: 0 };
let saved_cnt   = { value: 0 };

let history_total =  { value: 0};
let history_cnt   =  { value: 0};

const save_new = 1;
const save_old = 2;
// ========================= Thông số cài protocol =========================



// ========================= Hàm reset =========================
function Reset_Data_PCR() 
{
  Temp_Time_Setpoint[0] = [93,  93, 55, 72, 25, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39];
  Temp_Time_Setpoint[1] = [300, 10, 20, 120, 60, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

  System.LidTemp_setpoint = 100;
  System.Liquid_setpoint  = 30;
  System.lidTemp          = 30;
  System.BlockTemp        = 30;

  HOLD_START_CNT = 1;
  PCR_LOOP_CNT = 1;
  STEP_PCR_CNT = [2, 3, 4];
  Cycles_setpoint = [35, 4, 5];
  HOLD_END_CNT = 1;
  PROTOCOL_NAME = "none";
}

function Create_Data_Saved_Protocol(info, setpoint, protocol_saved) {
  // --- Sao chép dữ liệu setpoint ---
  for (let i = 0; i < 2; i++) 
  {
    for (let j = 0; j < TEMP_TIME_SETPOINT_NUM; j++) 
    {
      Temp_Time_Setpoint[i][j] = setpoint[i][j];
    }
  }

  // --- Thông số Protocol Mẫu ---
  System.LidTemp_setpoint = info[0];   // Nhiệt độ nắp trên (100°C)
  System.Liquid_setpoint  = info[1];   // Thể tích chạy (30 µL)

  HOLD_START_CNT = info[2];     // Số bước nhiệt bắt đầu
  PCR_LOOP_CNT   = info[3];     // Số vòng PCR

  for (let i = 0; i < PCR_LOOP; i++) 
  {
    STEP_PCR_CNT[i] = info[4 + i];
  }

  for (let i = 0; i < PCR_LOOP; i++) 
  {
    Cycles_setpoint[i] = info[7 + i];
  }

  HOLD_END_CNT = info[10];      // Số bước nhiệt kết thúc

  PROTOCOL_NAME   = protocol_saved;
}


const COLORS = {
  MENU_TITLE: "#000000ff",

  PCR_Tile_Info: "#57a6beff",    // màu nền th COLORS.
  PCR_Tile_Step: "#a7e2ffff", // màu nền top container
  PCR_Step:      "#ffffffff", // màu nền top container
};

const FONT = {
  DATA:  "16px", // màu nền top container
  TITLE: "18px", // màu nền top container
};


// ========================= Ngưỡng nhiệt độ và thời gian =========================
const TEMP_MIN_THRESOLD    = 25;
const TEMP_MAX_THRESOLD    = 100;
const TIME_MAX_HOUR        = 2;
const TIME_MAX_MINUTE      = 59;
const TIME_MAX_SECOND      = 59;
const CYCLES_MAX_THRESOLD  = 100;

// ========================= Quản lý bước nhiệt =========================
const TEMP_TIME_SETPOINT_NUM = 20;
const STEP_HOLD_START        = 2;
const PCR_LOOP               = 3;
const STEP_PCR               = 4;
const STEP_HOLD_END          = 4;
const STEP_HOLD_MIN          = 1;
// ========================= Nhiệt độ nắp =========================
const LID_TEMP_MIN = 50;
const LID_TEMP_MAX = 105;
const LID_THRESOLD = [30, 40, 50];

const SystemState = {
    System_Stop: 0,
    System_Start: 1,
    System_Pause: 2,
};
