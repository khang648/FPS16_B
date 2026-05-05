function Pack_Protocol(data) {
    let offset = 0;

    // 1. Temp (uint8)
    for (let i = 0; i < TEMP_TIME_SETPOINT_NUM; i++) {
        data[offset++] = Temp_Time_Setpoint[0][i] & 0xFF;
    }

    // 2. Time (uint16, little endian)
    for (let i = 0; i < TEMP_TIME_SETPOINT_NUM; i++) {
        const val = Temp_Time_Setpoint[1][i];
        data[offset++] = val & 0xFF;       // low byte
        data[offset++] = (val >> 8) & 0xFF; // high byte
    }

    // 3. LidTemp & Liquid
    data[offset++] = System.LidTemp_setpoint & 0xFF;
    data[offset++] = System.Liquid_setpoint & 0xFF;

    // 4. HOLD_START_CNT & PCR_LOOP_CNT
    data[offset++] = HOLD_START_CNT & 0xFF;
    data[offset++] = PCR_LOOP_CNT & 0xFF;

    // 5. STEP_PCR_CNT & Cycles_setpoint
    for (let i = 0; i < PCR_LOOP; i++) {
        data[offset++] = STEP_PCR_CNT[i] & 0xFF;
    }
    for (let i = 0; i < PCR_LOOP; i++) {
        data[offset++] = Cycles_setpoint[i] & 0xFF;
    }

    // 6. HOLD_END_CNT
    data[offset++] = HOLD_END_CNT & 0xFF;

    // 7. PROTOCOL_NAME
    const utf8Bytes = new TextEncoder().encode(PROTOCOL_NAME); // Uint8Array UTF-8
    data[offset++] = utf8Bytes.length & 0xFF;  // chiều dài (byte)
    for (let b of utf8Bytes) 
    {
        data[offset++] = b;
    }

    return offset;
}

function Pack_Save_Protocol(data, save_old) {
    let offset = 0;

    // 1. Temp (uint8)
    for (let i = 0; i < TEMP_TIME_SETPOINT_NUM; i++) {
        data[offset++] = Temp_Time_Setpoint[0][i] & 0xFF;
    }

    // 2. Time (uint16, little endian)
    for (let i = 0; i < TEMP_TIME_SETPOINT_NUM; i++) {
        const val = Temp_Time_Setpoint[1][i];
        data[offset++] = val & 0xFF;       // low byte
        data[offset++] = (val >> 8) & 0xFF; // high byte
    }

    // 3. LidTemp & Liquid
    data[offset++] = System.LidTemp_setpoint & 0xFF;
    data[offset++] = System.Liquid_setpoint & 0xFF;

    // 4. HOLD_START_CNT & PCR_LOOP_CNT
    data[offset++] = HOLD_START_CNT & 0xFF;
    data[offset++] = PCR_LOOP_CNT & 0xFF;

    // 5. STEP_PCR_CNT & Cycles_setpoint
    for (let i = 0; i < PCR_LOOP; i++) {
        data[offset++] = STEP_PCR_CNT[i] & 0xFF;
    }
    for (let i = 0; i < PCR_LOOP; i++) {
        data[offset++] = Cycles_setpoint[i] & 0xFF;
    }

    // 6. HOLD_END_CNT
    data[offset++] = HOLD_END_CNT & 0xFF;

    // 7. PROTOCOL_NAME
    //console.log(PROTOCOL_NAME);
    const utf8Bytes = new TextEncoder().encode(PROTOCOL_NAME); // Uint8Array UTF-8
    data[offset++] = utf8Bytes.length & 0xFF;  // chiều dài (byte)
    for (let b of utf8Bytes) 
    {
        data[offset++] = b;
    }
    // 11. Ghi save_old
    data[offset++] = save_old & 0xFF;

//    console.log("Tên Protocol lưu\n", PROTOCOL_NAME);
// console.log("Data lưu\n")
// console.log(Temp_Time_Setpoint);
// console.log("HOLD_START_CNT =", HOLD_START_CNT);
// console.log("PCR_LOOP_CNT  =", PCR_LOOP_CNT);
// console.log("STEP_PCR_CNT  =", STEP_PCR_CNT);
// console.log("HOLD_END_CNT  =", HOLD_END_CNT);

    return offset;
}

function Pack_Date_Time(data, date, month, year, hour, minute, second) {
  let idx = 0;

  data[idx++] = date;               // ngày
  data[idx++] = month;              // tháng
  data[idx++] = year & 0xFF;        // năm thấp    
  data[idx++] = (year >> 8) & 0xFF; // năm cao
  data[idx++] = hour;               // giờ
  data[idx++] = minute;             // phút
  data[idx++] = second;             // giây

  return idx;
}

function Pack_Data(id, func, data, lenght, event) {
    const frame = new Uint8Array(3 + DATA_TX_SIZE + 2); // 3 Header + Data 

    frame[0] = id;
    frame[1] = func;
    frame[2] = lenght;

    if (data) 
    {
        frame.set(data, 3); // copy data vào frame bắt đầu từ index 3
    }

    const crc = crc16_modbus(frame.slice(0, 3 + lenght)); // tính CRC cho header + data
    frame[3 + lenght] = crc & 0xFF;
    frame[4 + lenght] = (crc >> 8) & 0xFF;

    const jsonFrame = JSON.stringify(Array.from(frame.slice(0, 3 + lenght + 2)));

        // --- Chờ socket sẵn sàng ---
    if (event != null) {
        const sendFrame = () => 
        {
            if (window.socket && window.socket.connected)  // kiểm tra kết nối
            {
                window.socket.emit(event, jsonFrame);
                //console.log("Web gửi dữ liệu xuống Pi   Tổng bytes:", frame.slice(0, 3 + lenght + 2).length);
            } 
            else 
            {
                setTimeout(sendFrame, 10);  // nếu chưa sẵn sàng, thử lại sau 10ms
            }
        };
        sendFrame();
    } 
}

// function Pack_Calib_Val(data, Heating_Val, Cooling_Val, Time_out, Temp_Hi, Temp_Lo) {
//   const totalFloats = 3 + 3 + 3; // 3 giá trị chính + 3 hi + 3 lo
//   const buffer = new ArrayBuffer(totalFloats * 4);
//   const view = new DataView(buffer);
//   let idx = 0;

//   // --- Đóng gói dữ liệu ---
//   view.setFloat32(idx, Heating_Val, true); idx += 4;
//   view.setFloat32(idx, Cooling_Val, true); idx += 4;
//   view.setFloat32(idx, Time_out, true);    idx += 4;

//   for (let i = 0; i < 3; i++) { view.setFloat32(idx, Temp_Hi[i], true); idx += 4; }
//   for (let i = 0; i < 3; i++) { view.setFloat32(idx, Temp_Lo[i], true); idx += 4; }

//   const packedData = new Uint8Array(buffer);

//   // --- Copy dữ liệu vào mảng data ---
//   for (let i = 0; i < packedData.length; i++) 
//   {
//     data[i] = packedData[i];
//   }

//   return packedData.length;
// }


function Pack_Calib_Val(data, Heating_Val, Cooling_Val, Time_out, Temp_Hi, Temp_Lo, Heating_Speed, Cooling_Speed) 
{
  const totalFloats = 3 + 3 + 3 + 2; // = 11 float
  const buffer = new ArrayBuffer(totalFloats * 4);
  const view = new DataView(buffer);
  let idx = 0;

  // --- main ---
  view.setFloat32(idx, Heating_Val, true); idx += 4;
  view.setFloat32(idx, Cooling_Val, true); idx += 4;
  view.setFloat32(idx, Time_out, true);    idx += 4;

  // --- Temp Hi ---
  for (let i = 0; i < 3; i++) 
  { 
    view.setFloat32(idx, Temp_Hi[i], true); 
    idx += 4; 
  }

  // --- Temp Lo ---
  for (let i = 0; i < 3; i++) 
  { 
    view.setFloat32(idx, Temp_Lo[i], true); 
    idx += 4; 
  }

  // 🔥 --- Speed ---
  view.setFloat32(idx, Heating_Speed, true); idx += 4;
  view.setFloat32(idx, Cooling_Speed, true); idx += 4;

  const packedData = new Uint8Array(buffer);

  // copy ra data
  for (let i = 0; i < packedData.length; i++) 
  {
    data[i] = packedData[i];
  }


  console.log(packedData);
  return packedData.length;
}

function crc16_modbus(buf) 
{
    let crc = 0xFFFF;

    for (let pos = 0; pos < buf.length; pos++) 
    {
        crc ^= buf[pos];
        for (let i = 0; i < 8; i++) 
        {
            if (crc & 0x0001) {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }

    return crc & 0xFFFF; // đảm bảo 16 bit
}

function Get_Protocol(data) {
    let idx = 0;

    // 1. Đọc Temp kiểu uint8
    for (let i = 0; i < TEMP_TIME_SETPOINT_NUM; i++) {
        Temp_Time_Setpoint[0][i] = data[idx++];
    }

    // 2. Đọc Time kiểu uint16 (little endian)
    for (let i = 0; i < TEMP_TIME_SETPOINT_NUM; i++) {
        const low  = data[idx++];
        const high = data[idx++];
        Temp_Time_Setpoint[1][i] = (high << 8) | low;
    }

    //console.log(Temp_Time_Setpoint);

    // 3. Đọc LidTemp
    System.LidTemp_setpoint = data[idx++];

    // 4. Đọc Liquid
    System.Liquid_setpoint = data[idx++];

    // 5. Đọc HOLD_START_CNT và PCR_LOOP_CNT
    HOLD_START_CNT = data[idx++];
    PCR_LOOP_CNT   = data[idx++];

    // 6. Đọc STEP_PCR_CNT[]
    for (let i = 0; i < PCR_LOOP; i++) {
        STEP_PCR_CNT[i] = data[idx++];
    }

    // 7. Đọc Cycles_setpoint[]
    for (let i = 0; i < PCR_LOOP; i++) {
        Cycles_setpoint[i] = data[idx++];
    }

    // 8. Đọc HOLD_END_CNT
    HOLD_END_CNT = data[idx++];

    // 9. Đọc độ dài chuỗi PROTOCOL_NAME
    const protocol_len = data[idx++];

    // 10. Đọc chuỗi PROTOCOL_NAME
    const bytes = data.slice(idx, idx + protocol_len);
    idx += protocol_len;

    // Giải mã UTF-8 đúng chuẩn
    const decoder = new TextDecoder('utf-8');
    PROTOCOL_NAME = decoder.decode(new Uint8Array(bytes));


// console.log("Data nhận được \n")
// console.log(Temp_Time_Setpoint);
// console.log("HOLD_START_CNT =", HOLD_START_CNT);
// console.log("PCR_LOOP_CNT  =", PCR_LOOP_CNT);
// console.log("STEP_PCR_CNT  =", STEP_PCR_CNT);
// console.log("HOLD_END_CNT  =", HOLD_END_CNT);

}



