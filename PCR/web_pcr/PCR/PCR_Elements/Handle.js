
async function Click_Btn_Back(option, Tab_prev) {
  if(option === "new" | option === "view" )
  {
    if (PROTOCOL_NAME === "none" && Tab_prev === "none") // Kiểm tra tên và trang trước đó 
    {
      goToPage("PCR/PCR_Base/pcr_base.html", "none", "base"); // Về trang chính
    }   
    else if(Tab_prev === "history")
    {
      goToPage("PCR/PCR_History/pcr_history.html", "none", "history"); // quay về trang history
    }
    else  
    {
      goToPage("PCR/PCR_Saved/pcr_saved.html", "none", "saved"); // quay về trang saved
    }
  }
  
  if (["saved", "history", "admin"].includes(option)) 
  {
    goToPage("PCR/PCR_Base/pcr_base.html", "none", "base"); // quay về trang base
  }

  else if(option === "set_time")
  {
    Pack_Data(DEVICE.PCR_ID, PCR_REG.SET_TIME_DONE, null, 0, "Web_PCR");  // Gửi lệnh thoát khỏi settime
    goToPage("PCR/PCR_Admin/pcr_admin.html", "none", "admin"); // quay về trang base
  }

  else if (["temp_calib", "wifi_config"].includes(option)) 
  {
    goToPage("PCR/PCR_Admin/pcr_admin.html", "none", "admin"); // quay về trang ADMIN
  }
}

async function Click_Btn_Start(Btn_Name) // Người dùng nhấn nút Start
{
    if(Btn_Name == "START") //Khi nhấn 
    {
      const confirmed = await Show_Notification("The system will start!", "Yes_No"); // Hỏi
      if (!confirmed) 
        return;

      DATA_TX_LENGHT = Pack_Protocol(DATA_TX);
      Pack_Data(DEVICE.PCR_ID, PCR_REG.START_PROTOCOL, DATA_TX, DATA_TX_LENGHT, "Web_PCR"); 
    }
    else if( Btn_Name == "STOP")
    {
      const confirmed = await Show_Notification("The system will stop!", "Yes_No"); // Hỏi
      if (!confirmed) 
        return;

      Pack_Data(DEVICE.PCR_ID, PCR_REG.STOP_PROTOCOL, null, 0, "Web_PCR"); 
    }
}

async function Click_Btn_Edit(Btn_Name) // Người dùng nhấn nút Stop
{
    if(Btn_Name == "PAUSE") //Khi nhấn 
    {
      const confirmed = await Show_Notification("The system will pause!"); // Hỏi
      if (!confirmed) 
        return;

      Pack_Data(DEVICE.PCR_ID, PCR_REG.PAUSE_PROTOCOL, null, 0, "Web_PCR"); 
    }
    else if( Btn_Name == "RESUME")
    {
      const confirmed = await Show_Notification("The system will resume!"); // Hỏi
      if (!confirmed) 
        return;
    
      Pack_Data(DEVICE.PCR_ID, PCR_REG.RESUME_PROTOCOL, null, 0, "Web_PCR"); 
    }
    else if( Btn_Name === "EDIT")
    {
      showProgram({
          title: "Edit PCR Program",
          data: 
          {
              HOLD_START_CNT: HOLD_START_CNT,
              PCR_LOOP_CNT:    PCR_LOOP_CNT,
              STEP_PCR_CNT:    STEP_PCR_CNT,
              HOLD_END_CNT:    HOLD_END_CNT,
              CYCLES_PCR_CNT: Cycles_setpoint
          },
          onSave: (newData) => // khi nhấn lưu
          {
              //============== Phần Hold Start=========================
              Hold_Start_Diff = newData.HOLD_START_CNT - HOLD_START_CNT; //cái mới trừ cái cũ
              if(Hold_Start_Diff > 0) 
              {
                Modify_Step("insert", HOLD_START_CNT, Hold_Start_Diff);
              }
              else if(Hold_Start_Diff < 0)
              {
                Modify_Step("delete", newData.HOLD_START_CNT, Hold_Start_Diff * -1); // Xóa xóa bắt đầu từ vị trí mới
              }

              HOLD_START_CNT = newData.HOLD_START_CNT; // Cập nhật lại đúng số
              //============== Phần Hold Start=========================
              
              
              //============== Phần PCR ==========================
              let oldPCR_LOOP_CNT = PCR_LOOP_CNT;

              if (newData.PCR_LOOP_CNT > oldPCR_LOOP_CNT) 
              {
                  // Tổng step của các stage cũ
                  let Step_PCR_Total = STEP_PCR_CNT.slice(0, oldPCR_LOOP_CNT).reduce((a,b)=>a+b,0);
                  for (let i = oldPCR_LOOP_CNT; i < newData.PCR_LOOP_CNT; i++) 
                  {
                      let steps = newData.STEP_PCR_CNT[i] || 2;                
                      newData.CYCLES_PCR_CNT[i] = 30;
                      Modify_Step("insert", HOLD_START_CNT + Step_PCR_Total, steps);
                      Step_PCR_Total += steps;
                  }
              } 
              else if (newData.PCR_LOOP_CNT < oldPCR_LOOP_CNT) 
              {
                  // Xóa step của các stage bị loại bỏ
                  let startIndex = HOLD_START_CNT + STEP_PCR_CNT.slice(0, newData.PCR_LOOP_CNT).reduce((a,b)=>a+b,0);
                  let stepsToDelete = STEP_PCR_CNT.slice(newData.PCR_LOOP_CNT, oldPCR_LOOP_CNT).reduce((a,b)=>a+b,0);
                  Modify_Step("delete", startIndex, stepsToDelete);
              }
              //============== Cập nhật mảng STEP_PCR_CNT ==================


              //============== Update STEP_PCR_CNT từng PCR loop ==================              
              let stepOffset = 0;

              for (let i = 0; i < PCR_LOOP_CNT; i++)
              {
                  let oldStep = STEP_PCR_CNT[i];
                  let newStep = newData.STEP_PCR_CNT[i];
                  let diff    = newStep - oldStep;

                  let baseIndex = HOLD_START_CNT + stepOffset;
                  // console.log("Loop", i, "BaseIndex:", baseIndex);

                  if (diff > 0)
                  {
                      // thêm step vào cuối loop cũ
                      Modify_Step("insert", baseIndex + oldStep, diff);
                      //console.log("Thêm step", baseIndex + oldStep);
                  }
                  else if (diff < 0)
                  {
                      // xóa step từ cuối loop cũ
                      Modify_Step("delete", baseIndex + newStep, -diff);
                  }

                  stepOffset += oldStep;
              }
              STEP_PCR_CNT = [...newData.STEP_PCR_CNT];

              //console.log(Temp_Time_Setpoint);
              //==================================================================

              //============== Phần Hold End ==========================
              let Hold_End_Diff = newData.HOLD_END_CNT - HOLD_END_CNT;
              if (Hold_End_Diff > 0) 
              {
                  Modify_Step("insert", HOLD_START_CNT + STEP_PCR_CNT.reduce((a,b)=>a+b,0) + HOLD_END_CNT, Hold_End_Diff);
              } 
              else if (Hold_End_Diff < 0) 
              {
                  Modify_Step("delete", HOLD_START_CNT + STEP_PCR_CNT.reduce((a,b)=>a+b,0) + newData.HOLD_END_CNT, -Hold_End_Diff);
              }
              HOLD_END_CNT = newData.HOLD_END_CNT;

              //============== Phần PCR ===========================

              // Cập nhật lại các biến toàn cục
              HOLD_START_CNT = newData.HOLD_START_CNT;
              PCR_LOOP_CNT   = newData.PCR_LOOP_CNT;
              STEP_PCR_CNT   = newData.STEP_PCR_CNT;
              HOLD_END_CNT   = newData.HOLD_END_CNT;
              Render_PCR_Program(); // Render lại giao diện Program
          }
      });
    }
}

//                   vị trí chức năng thêm hoặc xóa
function Modify_Step(mode, index, count = 1, temp = 60, time = 60) {
  if (mode === "insert") {
    Temp_Time_Setpoint[0].splice(index, 0, ...Array(count).fill(temp));  
    Temp_Time_Setpoint[1].splice(index, 0, ...Array(count).fill(time));
  }
  else if (mode === "delete") {
    Temp_Time_Setpoint[0].splice(index, count);
    Temp_Time_Setpoint[1].splice(index, count);
  }


}

async function Click_Btn_Open(index, tab ,option) // Người dùng nhấn nút Open
{
  const info = Info_Saved[index];
  const setpoint = Setpoint_Saved[index];
  const name = Extract_Name_From_Info(info);

  if(tab === "history")  // Nếu đang là tab history   
  {  
    System.History_Position = index; // gán vị trí click của history 
    localStorage.setItem("History_Position", System.History_Position);
  }
  else
  {
    System.History_Position = 100; // gán số không giá trị
    localStorage.setItem("History_Position", System.History_Position);
  }

  Create_Data_Saved_Protocol(info, setpoint, name); // Tạo data theo weblocal
  DATA_TX_LENGHT = Pack_Protocol(DATA_TX);
  Pack_Data(DEVICE.PCR_ID, PCR_REG.SAVED_UI, DATA_TX, DATA_TX_LENGHT, "Web_PCR");   // Lưu Thông tin vào máy PCR
  goToPage("PCR/PCR_New/pcr_new.html", tab, option);
}

async function Click_Btn_Delete(index) // Người dùng nhấn nút Stop
{
  let name = null;
  name = Extract_Name_From_Info(Info_Saved[index]); // lây tên protocol

  if(name != null)
  {
    PROTOCOL_NAME = name; // Gán tên vào protocol name
    DATA_TX_LENGHT = Pack_Protocol(DATA_TX);
    Pack_Data(DEVICE.PCR_ID, PCR_REG.DELETE_PROTOCOL, DATA_TX, DATA_TX_LENGHT, "Web_PCR");  
    loading = await Show_Notification("Loading...", "Loading"); // Hiện loading
  }
}

async function Click_Btn_Save(name_protocol) // Người dùng nhấn nút Stop
{
  if(name_protocol === "none") //Lưu protocol mới
  {
    Show_Notification("Enter protocol name:" ,"Save_Protocol");
  }
  else //Lưu protocol cũ
  {
    PROTOCOL_NAME = name_protocol; // Lấy tên theo tên được truyền vào
    DATA_TX_LENGHT = Pack_Save_Protocol(DATA_TX, save_old);
    Pack_Data(DEVICE.PCR_ID, PCR_REG.SAVE_PROTOCOL_EEPROM, DATA_TX, DATA_TX_LENGHT, "Web_PCR"); 
    loading = await Show_Notification("Loading...", "Loading"); // Hiện loading
  }
}

async function Click_Btn_Reload() {
  Pack_Data(DEVICE.PCR_ID, PCR_REG.REQUEST_CALIB_HISTORY, null, 0, "Web_PCR");     // Gửi lệnh yêu cầu đọc lại thông số đã được calib
  Show_Loading();
}

async function Click_Btn_Upload() {
    // Lấy giá trị hiện tại từ các input
    const Heating_Val   = parseFloat(document.getElementById("Heating_Val").value) || 0.0;
    const Cooling_Val   = parseFloat(document.getElementById("Cooling_Val").value) || 0.0;
    const Time_out      = parseFloat(document.getElementById("Time_out_Val").value) || 0.0;

    const Temp_Hi = [
        parseFloat(document.getElementById("Pel1_Hi").value) || 0.0,
        parseFloat(document.getElementById("Pel2_Hi").value) || 0.0,
        parseFloat(document.getElementById("HeatBlock_Hi").value) || 0.0
    ];

    const Temp_Lo = [
        parseFloat(document.getElementById("Pel1_Lo").value) || 0.0,
        parseFloat(document.getElementById("Pel2_Lo").value) || 0.0,
        parseFloat(document.getElementById("HeatBlock_Lo").value) || 0.0
    ];

    // --- Kiểm tra hợp lệ ---
    if (Heating_Val < 0 || Heating_Val > 10) 
    {
        alert("Heating value must be 0 to 10");
        return;
    }
    if (Cooling_Val < 0 || Cooling_Val > 10) 
    {
        alert("Cooling value must be 0 to 10");
        return;
    }
    if (Time_out < 60 || Time_out > 1000) 
    {
        alert("Time out value must be 60 to 1000");
        return;
    }

    for (let i = 0; i < 3; i++) 
    {
        if (Temp_Hi[i] < 70 || Temp_Hi[i] > 120) 
        {
            alert(`Peltier ${i+1} high temperature must be 70 to 120`);
            return;
        }
        if (Temp_Lo[i] < 30 || Temp_Lo[i] > 70) 
        {
            alert(`Peltier ${i+1} high temperature must be 30 to 70`);
            return;
        }
    }



    // Nếu dữ liệu hợp lệ thì tiến hành kiểm tra có giống dữ liệu đang được lưu không
    const calib = Calib_Val_Saved[0];

    // So sánh tất cả các giá trị
    const currentValues = [Heating_Val, Cooling_Val, Time_out, ...Temp_Hi, ...Temp_Lo];
    const EPS = 0.05; // sai số 0.05
    const isSame = currentValues.every((val, idx) => Math.abs(val - calib[idx]) < EPS);

    if (isSame) 
    {
      const historyLabel = document.getElementById("system-content");
      historyLabel.textContent  = "-> Data has been saved before! ";
    }
    else // Nếu là số mới và dữ liệu hợp lệ thì gửi dữ liệu lưu lại
    {
      DATA_TX_LENGHT = Pack_Calib_Val(DATA_TX, Heating_Val, Cooling_Val, Time_out, Temp_Hi, Temp_Lo);
      Pack_Data(DEVICE.PCR_ID, PCR_REG.SAVE_CALIB_VAL, DATA_TX, DATA_TX_LENGHT, "Web_PCR"); 
    }
}

function goToPage(pagePath, Tab_Prev, Option) {
  socket.emit("Save_Page_To_Server", pagePath, Tab_Prev, Option); // Gửi xuống server
}
