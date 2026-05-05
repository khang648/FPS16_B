function Update_Chart_Temp(newValue, estimateValue) {
    const series = window.Temp_Series;
    const estimateSeries = window.Temp_Estimate_Series;

    const BUFFER_SIZE = Chart_Buf_Size; // dùng size cố định

    // ===== UPDATE BUFFER =====
    Chart_Buf.push(newValue);
    Chart_Estimate_Buf.push(estimateValue);

    if (Chart_Buf.length > BUFFER_SIZE) {
        Chart_Buf.shift();
    }

    if (Chart_Estimate_Buf.length > BUFFER_SIZE) {
        Chart_Estimate_Buf.shift();
    }

    // ===== BUILD DATA RIÊNG =====
    const historyData = Chart_Buf.map((v, i) => ({
        x: -((BUFFER_SIZE - 1 - i) * 2),
        sample: v
    }));

    const estimateData = Chart_Estimate_Buf.map((v, i) => ({
        x: -((BUFFER_SIZE - 1 - i) * 2),
        estimate: v
    }));

    // ===== UPDATE RIÊNG =====
    series?.data.setAll(historyData);
    estimateSeries?.data.setAll(estimateData);
}

function Update_Chart(data) {

    const series = window.Temp_Series;
    if (!series) return;

    const chartData = data.map((v, i) => 
    ({
        x: -((Chart_Buf_Size - 1 - i) * 2), 
        sample: v
    }));

    series.data.setAll(chartData);
}

function Update_Chart_Estimate(data) {

    const series = window.Temp_Estimate_Series;
    if (!series) return;

    const chartData = data.map((v, i) => ({
        x: -((Chart_Buf_Size - 1 - i) * 2),
        estimate: v
    }));

    series.data.setAll(chartData);
}


function Update_Btn(btn, imgSrc, text, enabled = true) {
    // Gán nội dung nút bằng ảnh + text
    btn.innerHTML = `<img src="${imgSrc}" style="width:16px; height:16px;"> ${text}`;

    // Bật/tắt nút
    btn.disabled = !enabled;

    if (enabled) 
    {
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    } 
    else 
    {
        btn.style.opacity = "0.6";
        btn.style.cursor = "not-allowed";
    }
}

function Update_Protocol_name(name)
{
  ui_LBNameProtocol.textContent = `Protocol Name: ${name}`;
}

/*==================================================================*/
let Time_Update_Char = 2; // 2 giây cập nhận biểu đồ 1 lần
let block_temp_prev = 0;  // Nhiệt độ lóc trên trước đó
let Time_count_prev = 0;  // Thời gian giữ trước đó
let lid_temp_prev = 0;    // Nhiệt độ lóc trên trước đó
let cycles_pcr_prev = new Array(PCR_LOOP).fill(100);
let pcr_loop_index_prev = 100; // Nhiệt độ lóc trên trước đó
let step_setpoint_prev  = 100; // Nhiệt độ lóc trên trước đó
let time_run_prev = 0;   // Nhiệt độ lóc trên trước đó
let state_system_prev  = 0; // trạng thái máy
let state_system = 0;  
let Update_Chart_Cnt = 0;   // Biến đếm số lần cập nhật màn hình
let Fist_Reload_Page = true;
/*==================================================================*/
function Update_Start_Protocol(data)
{
    let idx = 0;
    let block_temp      = data[idx++]; // lấy nhiệt độ block
    let Estimate_temp   = data[idx++]; // lấy nhiệt độ dự đoán
    let time_count_low  = data[idx++]; // lấy byte low
    let time_count_high = data[idx++]; // lấy byet high
    let Time_count = (time_count_high << 8) | time_count_low;  // Lấy time
    let lid_temp = data[idx++];        // lấy nhiệt độ nắp
    let cycles_pcr = new Array(PCR_LOOP); ;  // lấy số cycles trong các vòng pcr
    for (let i = 0; i < PCR_LOOP; i++) // lấy số cyles đã chạy
    {
      cycles_pcr[i] = data[idx++];

      if(cycles_pcr[i] == 0) {cycles_pcr[i] = 1;} // tránh trường hợp cycles = 0
    }

    for (let i = 0; i < PCR_LOOP; i++)
    {
      data[idx++]; // lấy bỏ các cycles
    }

    let pcr_loop_index = data[idx++]; // lấy vị trí vòng pcr hiện tại
    let step_setpoint  = data[idx++]; // lấy step hiện tại
    let time_run_low   = data[idx++]; // lấy byte low
    let time_run_high  = data[idx++]; // lấy byet high
    let time_run       = (time_run_high << 8) | time_run_low;  // Lấy time
    state_system       = data[idx++]; // trạng thái máy

    if (state_system === SystemState.System_Auto)
    {
        // 🕒 update time trên notification
        if (time_run != time_run_prev)
        {
            Show_Notification( `Auto calibrating...\nTime:[${Format_time_setpoint(time_run)}]`,"Loading");
            time_run_prev = time_run;
        }

        // 🔔 đảm bảo state chỉ set 1 lần
        if (state_system !== state_system_prev)
        {
            state_system_prev = state_system;
        }

        return;
    }

    if(block_temp != block_temp_prev) 
    { 
        let label = document.querySelector(".label-Sample-Temp");
        if(label)
        {
          label.textContent = `Sample Temp: ${Math.round(block_temp)}°C`;
        }
        block_temp_prev = block_temp;
    }
    if(lid_temp != lid_temp_prev)     { ui_LidTemp.value = lid_temp;       lid_temp_prev = lid_temp; }                                               // Cập nhật lid_Temp    
    if(Time_count != Time_count_prev) { LABEL_TIME_RUNNING[step_setpoint].value = Format_time_setpoint(Time_count); Time_count_prev = Time_count; }  // Cập nhật thời gian tại step

    if(++Update_Chart_Cnt >= Time_Update_Char * 2) // Cập nhật dữ liệu mỗi 1s
    {
      Update_Chart_Cnt = 0;
      Update_Chart_Temp(block_temp, Estimate_temp); // Cập nhật biểu đồ nhiệt
    }

    if(step_setpoint != step_setpoint_prev) // chuyển màu step và reset time
    {
       if(step_setpoint != 0 && step_setpoint_prev != 100) // nếu step từ 1 trở về sau thì reset màu và cập nhật lại thời gian
       {
        PANEL_STEP_RUNNING[step_setpoint_prev].style.background = "#FFFFFF"; 
        LABEL_TIME_RUNNING[step_setpoint_prev].value = Format_time_setpoint(Temp_Time_Setpoint[1][step_setpoint_prev]);
       }
       PANEL_STEP_RUNNING[step_setpoint].style.background = "#F5F34C"; 
       step_setpoint_prev = step_setpoint; // gán lại vị trí mới
    }
    else if (PANEL_STEP_RUNNING[step_setpoint].style.background !== "#F5F34C")  // Tránh trường hợp không kịp render
    {
        PANEL_STEP_RUNNING[step_setpoint].style.background = "#F5F34C";
    }

    if(Fist_Reload_Page == true) // Chỉnh lại lần đầu các protocol đang chạy
    {
      for (let i = 0; i < PCR_LOOP_CNT; i++) // chạy từ 0 đến 3
      {
          if (LABEL_CYCLES_RUNNING[i] == null) continue;

          if (cycles_pcr[i] != cycles_pcr_prev[i])
          {
              LABEL_CYCLES_RUNNING[i].textContent = Format_Cycles_Topic(cycles_pcr[i], Cycles_setpoint[i]);
              cycles_pcr_prev[i] = cycles_pcr[i];
          }
      }
      Fist_Reload_Page = false;
    }

    if(cycles_pcr[pcr_loop_index] != cycles_pcr_prev[pcr_loop_index] && PCR_LOOP_CNT > 0) // cycles tăng lên và có vòng PCR mới cập nhật
    {
        if(LABEL_CYCLES_RUNNING[pcr_loop_index] != null) // Nếu tồn tại mới cập nhật
        {
          LABEL_CYCLES_RUNNING[pcr_loop_index].textContent = Format_Cycles_Topic(cycles_pcr[pcr_loop_index] , Cycles_setpoint[pcr_loop_index]); // Cập nhật lại số cycles
          cycles_pcr_prev[pcr_loop_index] = cycles_pcr[pcr_loop_index];
        }
    }
    //console.log(cycles_pcr);
    
    if(time_run != time_run_prev) { ui_TimeProgram.textContent = Format_time_setpoint(time_run, ' '); time_run_prev = time_run; }              // Cập nhật thời gian chạy chương trình

    if(state_system != state_system_prev) // nếu trạng thái mới
    {
      switch(state_system)  
      {
        case SystemState.System_Start:  
              // Lock các thông số không cho người dùng thay đổi
              PANEL_STEP_RUNNING.forEach(p => Lock_Panel(p, true));
              LABEL_TIME_RUNNING.forEach(p => Lock_Panel(p, true));
              INPUT_CYCLES_RUNNING.forEach(p => Lock_Panel(p, true));
              Lock_Panel(ui_LidTemp, true);
              Lock_Panel(ui_Liquid,  true);


            for(let i = 0; i< PCR_LOOP_CNT; i++) 
            {
               if(LABEL_CYCLES_RUNNING[i] != null) // nếu tồn tại mới cập nhật
               {
                  INPUT_CYCLES_RUNNING[i].style.display = "none"; // ẩn các nút cycles
               }          
            }

            Update_Btn(ui_BtnStart,  "../../assets/PCR_STOP_TOOL.png" , "STOP",  true);
            Update_Btn(ui_BtnEdit,   "../../assets/PCR_PAUSE_TOOL.png", "PAUSE", true);
            Update_Btn(ui_BtnSave,   "../../assets/PCR_SAVE_TOOL.png",  "SAVE",  false);
            Update_Btn(ui_BtnSaveAs, "../../assets/PCR_SAVE_TOOL.png",  "SAVE AS",  false);
            Update_Btn(ui_BtnBack,   "../../assets/PCR_BACK_TOOL.png",   "BACK" , false);


            break;

         case SystemState.System_Pause:  Update_Btn(ui_BtnEdit,  "../../assets/PCR_RESUME_TOOL.png", "RESUME", true);
            break;
      }
      state_system_prev = state_system;
    } 
}
function Update_Stop_Protocol(data)
{
    let idx = 0;
    let time_count_low  = data[idx++]; // lấy byte low
    let time_count_high = data[idx++]; // lấy byet high
    let time_run = (time_count_high << 8) | time_count_low;  // Lấy time

    // Chỉnh lại step của protocol
    PANEL_STEP_RUNNING[step_setpoint_prev].style.background = "#FFFFFF";  // Chỉnh màu
    LABEL_TIME_RUNNING[step_setpoint_prev].value = Format_time_setpoint(Temp_Time_Setpoint[1][step_setpoint_prev]); // Chỉnh lại thời gian cuối

    for(let i = 0; i< PCR_LOOP_CNT; i++) // Đổi lại tên PCR
    {
        if(LABEL_CYCLES_RUNNING[i] != null) // nếu tồn tại mới cập nhật
        {
            LABEL_CYCLES_RUNNING[i].textContent = "PCR Stage   cycles ";
            INPUT_CYCLES_RUNNING[i].style.display = "inline-block"; // Hiện lại các nút
        }     
    }
    ui_LidTemp.value = System.LidTemp_setpoint;  
    ui_TimeProgram.textContent = "00 : 00 : 00";

    //Mở Lock các thông số
    PANEL_STEP_RUNNING.forEach(p => Lock_Panel(p, false));
    LABEL_TIME_RUNNING.forEach(p => Lock_Panel(p, false));
    INPUT_CYCLES_RUNNING.forEach(p => Lock_Panel(p, false));
    Lock_Panel(ui_LidTemp, false);
    Lock_Panel(ui_Liquid,  false);

    Update_Btn(ui_BtnStart, "../../assets/PCR_START_TOOL.png", "START",  true);
    Update_Btn(ui_BtnEdit,  "../../assets/PCR_EDIT_TOOL.png",  "EDIT" ,  true);
    Update_Btn(ui_BtnSave,  "../../assets/PCR_SAVE_TOOL.png",  "SAVE" ,  true);
    Update_Btn(ui_BtnSaveAs, "../../assets/PCR_SAVE_TOOL.png",  "SAVE AS",  true);
    Update_Btn(ui_BtnBack,  "../../assets/PCR_BACK_TOOL.png",  "BACK" ,  true);

    Show_Notification(`Complete Program!<br>Total time run: ${Format_time_setpoint(time_run, " ")}`, "Cancel");

    block_temp_prev = 0;       // Nhiệt độ lóc trên trước đó
    Time_count_prev = 0;       // Thời gian giữ trước đó
    lid_temp_prev = 0;         // Nhiệt độ lóc trên trước đó
    cycles_pcr_prev = new Array(PCR_LOOP).fill(100);   // reset số cycles trong pcr
    Fist_Reload_Page = true;
    pcr_loop_index_prev = 100; // Nhiệt độ lóc trên trước đó
    step_setpoint_prev = 100;  // Nhiệt độ lóc trên trước đó
    time_run_prev = 0;         // Nhiệt độ lóc trên trước đó
    state_system = SystemState.System_Stop;
    state_system_prev  = 0;    // trạng thái máy trước đó
}
function Update_Wait_Screen(data)
{
    let idx = 0;
    let block_temp = data[idx]; // lấy nhiệt độ block
    idx++;
    let Estimate_Temp = data[idx]; // lấy nhiệt độ dự đoán

    
    if(block_temp != block_temp_prev) 
    { 
        let label = document.querySelector(".label-Sample-Temp");
        if(label)
        {
          label.textContent = `Sample Temp: ${Math.round(block_temp)}°C`;
        }
        block_temp_prev = block_temp;
    }

    // console.log(System.Option_Prev);
    
    if(++Update_Chart_Cnt >= Time_Update_Char * 2 && System.Option_Prev == "new") // Cập nhật dữ liệu mỗi 2s nếu đang ở giao diện new
    {
      Update_Chart_Cnt = 0;
      Update_Chart_Temp(block_temp, Estimate_Temp); // Cập nhật biểu đồ nhiệt
    }
}
function Get_Saved_Protocol(data, Save_cnt, Save_total, infor, Setpoint) {
  let idx = 0;

  Save_cnt.value   = data[idx++];  
  Save_total.value = data[idx++];

  // --- 1. Đọc info (64 byte) ---
  for (let i = 0; i < 64; i++) {
    infor[Save_cnt.value][i] = data[idx++];
  }

  // --- 2. Đọc Temp kiểu uint8_t ---
  for (let i = 0; i < TEMP_TIME_SETPOINT_NUM; i++) {
    Setpoint[Save_cnt.value][0][i] = data[idx++];
  }

  // --- 3. Đọc Time kiểu uint16_t (little endian) ---
  for (let i = 0; i < TEMP_TIME_SETPOINT_NUM; i++) {
    const low  = data[idx++];
    const high = data[idx++];
    Setpoint[Save_cnt.value][1][i] = (high << 8) | low;
  }
}

function Get_Chart_Buf(data, Chart_buf_cnt, Chart_buf_total, Chart_Buf) {
  let idx = 0;

  Chart_buf_cnt.value   = data[idx++];  
  Chart_buf_total.value = data[idx++];

  const PACK_SIZE = 200;
  const offset = Chart_buf_cnt.value * PACK_SIZE;

  // ===== Copy 200 mẫu =====
  for (let i = 0; i < PACK_SIZE; i++) 
  {
      if (idx >= data.length) break;
      
      Chart_Buf[offset + i] = data[idx++];
  }
}

function Update_Saved_Tab(Tab_type)
{
  switch(Tab_type)
  {
    case PCR_REG.REQUEST_SAVED_PROTOCOL :   Render_Saved_Protocol("pcr-saved-list-preview" ,"SAVED PROTOCOL"); // Tạo lại giao diện saved protocol
                                            for(let i = 0; i < saved_total.value ; i++)  // Tạo số protocol tương ứng đã lưu
                                            {
                                              Render_Saved_Obj(ui_savedList, Extract_Name_From_Info(Info_Saved[i]), i); 
                                            }                                          
                                            break;     

    case PCR_REG.REQUEST_HISTORY_PROTOCOL : Render_Saved_Protocol("pcr-history-list-preview" ,"HISTORY PROTOCOL"); 
                                            for(let i = 0; i < history_total.value ; i++)  // Tạo số protocol tương ứng đã lưu
                                            {
                                              Render_Saved_Obj(ui_savedList, Extract_Name_From_Info(Info_Saved[i]), i); 
                                            }                                          
                                            break;                             
  }
}
function Update_Date_Time(data) {
  // data là mảng Uint8Array hoặc Array gồm 8 phần tử [date, month, year_low, year_high, hour, minute, second]
  let idx = 0;
  const date = data[idx++];
  const month = data[idx++];
  const year_low = data[idx++];
  const year_high = data[idx++];
  const year = (year_high << 8) | year_low;
  const hour = data[idx++];
  const minute = data[idx++];
  const second = data[idx++];

  // Format chuỗi giống như trong C
  const formatted = Format_Date_Time(date, month, year, hour, minute, second);
    // Kiểm tra tồn tại element trước khi cập nhật
  const Date_Time = document.getElementById("system-date");
  if (Date_Time) 
  {
    Date_Time.textContent = formatted;
  }
}
function Update_System_log(Calib_Buf, saved_total) {
  const calib = Calib_Buf[0]; 

  document.getElementById("Heating_Val").value      = (Math.round(calib[0] * 10) / 10);
  document.getElementById("Cooling_Val").value      = (Math.round(calib[1] * 10) / 10);
  document.getElementById("Time_out_Val").value     = (Math.round(calib[2] * 10) / 10);

  document.getElementById("Pel1_Hi").value          = (Math.round(calib[3] * 10) / 10);
  document.getElementById("Pel2_Hi").value          = (Math.round(calib[4] * 10) / 10);
  document.getElementById("HeatBlock_Hi").value     = (Math.round(calib[5] * 10) / 10);

  document.getElementById("Pel1_Lo").value          = (Math.round(calib[6] * 10) / 10);
  document.getElementById("Pel2_Lo").value          = (Math.round(calib[7] * 10) / 10);
  document.getElementById("HeatBlock_Lo").value     = (Math.round(calib[8] * 10) / 10)

  document.getElementById("Heating_Speed").value = (Math.round(calib[9] * 10) / 10);
  document.getElementById("Cooling_Speed").value = (Math.round(calib[10] * 10) / 10);

  // --- Cập nhật lịch sử calibration vào label
    const historyLabel = document.getElementById("system-content");
    if (!historyLabel) return;
    let historyText = "";

    if (saved_total === 0) 
    {
    historyText = "-> Request history successful\n" +
                  "-> The system is not calibrated\n" +
                  "-> Please restart the device memory";
    } 
    else 
    {
      for (let i = 0; i < saved_total; i++) 
      {
        const entry = Calib_Buf[i];
        historyText += (i + 1) + "./==================================\n" +
                      "Peltier1                 : " + entry[3].toFixed(1) + "°C ---- " + entry[6].toFixed(1) + "°C\n" +
                      "Peltier2                 : " + entry[4].toFixed(1) + "°C ---- " + entry[7].toFixed(1) + "°C\n" +
                      "Heat block            : " + entry[5].toFixed(1) + "°C ---- " + entry[8].toFixed(1) + "°C\n" +
                      "OverHeating         : " + entry[0].toFixed(1) + "\n" +
                      "Over Cooling        : " + entry[1].toFixed(1) + "\n" +
                      "Time out               : " + entry[2].toFixed(1) + "s\n" +
                      "Heating speed       : " + entry[9].toFixed(1) + "°C/s\n" +
                      "Cooling speed       : " + entry[10].toFixed(1) + "°C/s\n";
      }
    }
  historyLabel.textContent = historyText;
  
  Rule_Input_Calib(); // Gọi hàm này để người dùng nhập số không bị sai
}
function Get_Saved_Calib(data, Save_cnt, Save_total, Calib_Buf) {
    let idx = 0;
    Save_cnt.value = data[idx++];   // vị trí số hiện tại
    Save_total.value = data[idx++]; // tổng số đã calib
  
    const numFloats = (data.length - 2) / 4; // Tính số float còn lại
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    for (let i = 0; i < numFloats; i++) 
    {
        Calib_Buf[Save_cnt.value][i] = view.getFloat32(idx, true);
        idx += 4;
    }
}
function Update_Save_Calib(saved_ok)
{
  const historyLabel = document.getElementById("system-content");
  if (!historyLabel) return;  

  if (saved_ok === 1)
  {
    historyLabel.textContent = "-> Data saved successfully!";
  
    const values = [
    parseFloat(document.getElementById("Heating_Val").value) || 0.0,
    parseFloat(document.getElementById("Cooling_Val").value) || 0.0,
    parseFloat(document.getElementById("Time_out_Val").value) || 0.0,
    parseFloat(document.getElementById("Pel1_Hi").value) || 0.0,
    parseFloat(document.getElementById("Pel2_Hi").value) || 0.0,
    parseFloat(document.getElementById("HeatBlock_Hi").value) || 0.0,
    parseFloat(document.getElementById("Pel1_Lo").value) || 0.0,
    parseFloat(document.getElementById("Pel2_Lo").value) || 0.0,
    parseFloat(document.getElementById("HeatBlock_Lo").value) || 0.0
    ];

    // Gán lại giá trị để tránh lưu liên tục 1 giá trị 
    for (let i = 0; i < values.length; i++) 
    {
      Calib_Val_Saved[0][i] = values[i];
    }

  }
  else
    historyLabel.textContent = "-> Data save failed!";
}
function Lock_Panel(panel, lock)
{
    if(!panel) return;

    panel.style.pointerEvents = lock ? "none" : "auto";
}


function Update_Time_Done(data)
{
    let idx = 0;
    let time_count_low  = data[idx++]; // lấy byte low
    let time_count_high = data[idx++]; // lấy byet high
    let time_run = (time_count_high << 8) | time_count_low;  // Lấy time

    ui_TimeProgram.textContent = Format_time_setpoint(time_run, ' '); 
                // console.log(time_run);
}

// Export tất cả chỉ với 1 dòng
export default {
  Update_Chart_Temp,
  Update_Btn,
  Update_Protocol_name,
  Update_Start_Protocol,
  Update_Stop_Protocol,
  Update_Wait_Screen,
  Update_Saved_Tab,
  Update_Date_Time,
  Update_System_log,
  Update_Save_Calib,
  Get_Chart_Buf,
  Update_Chart,
  Update_Chart_Estimate,
  Update_Time_Done,

  Get_Saved_Protocol,
  Get_Saved_Calib,
};