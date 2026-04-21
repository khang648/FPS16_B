window.socket = io();

window.Temp_Buf = JSON.parse(localStorage.getItem('Temp_Buf')) || new Array(50).fill(0);
import PCR_UI from '../PCR/PCR_Elements/Update_UI.js';   //Link các chương trình con bên Update_UI.js


// ===== Nhận thông tin thiết bị để cập nhật title =====
socket.on("device_info", (data) => {
    try 
    {
        const device_host = data.host_name   || "FPS32B";
        const device_seri = data.seri_number || "26001";

        const device_title = device_host + "-" + device_seri + " PCR";
        document.title = device_title;
        window.DEVICE_NAME = device_title;


        const titleElement = document.querySelector(".navbar-title");
        if (titleElement) 
        {
            titleElement.textContent = device_title;
        }
        document.addEventListener("headerLoaded", () => 
        {
            const el = document.querySelector(".navbar-title");
            if (el) el.textContent = device_title;
        });
    }
    catch (e)
    {
    }
});

// Nhận dữ liệu từ server gửi lên web tách frame và xử lý giao diện
socket.on('Web_PCR', (arr) => 
{
    try 
    {
        // 1. Chuyển JSON array về Uint8Array
        const frame = new Uint8Array(arr);
        if(frame.length < 5) 
        {
            console.warn("Frame quá ngắn"); return;
        }

        // 2. Tách header
        const id = frame[0];
        const func = frame[1];
        const length = frame[2];

        // 3. Kiểm tra tổng độ dài frame
        if(frame.length !== 3 + length + 2) 
        {
            console.error("Frame không khớp độ dài dữ liệu + CRC"); return;
        }

        // 4. Tách data từ phần tử thứ 3
        const data = frame.slice(3, 3 + length);

        // 5. Tách CRC
        const CRC_low  = frame[3 + length];
        const CRC_High = frame[4 + length];
        const CRC_Rec  = (CRC_High << 8) | CRC_low;

        // 6. Tính CRC kiểm tra
        const crcCalc = crc16_modbus(frame.slice(0, 3 + length));
        if(crcCalc !== CRC_Rec) 
        {
            console.error(`CRC lỗi: nhận ${CRC_Rec.toString(16)}, tính ${crcCalc.toString(16)}`);
            return;
        }

        // 7. Gửi dữ liệu đi phân tích
        Parsing_Data(id, func, data);

    } 
    catch(e) 
    {
        console.error("Lỗi parse frame:", e);
    }
});
/*=============================================================================*/
/*=============================================================================*/

// Nhận dữ liệu wifi từ server gửi lên
socket.on('response_wifi_config', (data) => 
{
    try 
    {
    document.getElementById('wifi-ssid').value     = data.ssid     || ''; // lấy pass và ssid
    document.getElementById('wifi-password').value = data.password || '';
    
    //console.log("Nhận dữ liệu Wi-Fi:", data);
    Hide_Loading(); // Tắt loading
    }
    catch(e) 
    {
    console.error(e);
    }
});

socket.on('wifi_config_saved', (res) => 
{
    if (res.success) 
    {
    Show_Notification("Update wifi successfully!" ,"Cancel");
    } 
    else
    {
    Show_Notification("Update wifi failed!" , "Canecel");
    }
});

socket.on("Go_To_Page_Web", (pagePath , TabPath, Option) =>  // Nhận lệnh chuyển hướng trang từ server gửi lên
{
    if (pagePath.startsWith("/")) pagePath = pagePath.slice(1);
    const currentPath = window.location.pathname.replace(/^\//, "");
    
    System.Tab_Prev = TabPath;
    System.Option_Prev = Option;
    
    if (currentPath !== pagePath) 
    {
        window.location.href = "/" + pagePath;
    }
    // else
    // {
    //     console.log(System.Tab_Prev);
    // }
});

socket.on("Warning_Client", () => {
Show_Notification('This system is under control, please connect later.', 'Cancel');

});

socket.on("disconnect", (reason) => {
    console.warn("Socket disconnected:", reason);
    Show_Notification("Disconnected! Reload the page to use the system.", "Cancel");
});

/*=============================================================================*/
/*=============================================================================*/

// Hàm phân tích dữ liệu nhận được từ server gửi lên
async function Parsing_Data(id, func, data) 
{
    //console.log(data);
    
    switch(func) // nhận ID function gì
    {
        case PCR_REG.START_PROTOCOL:
             //console.log("Nhận lệnh start");
             PCR_UI.Update_Start_Protocol(data); // Lấy từ phần tử thứ 3
             break;

        case PCR_REG.STOP_PROTOCOL:
             //console.log("Nhận lệnh stop");
             PCR_UI.Update_Stop_Protocol(data); // ví dụ cập nhật chart nhiệt độ
             break;

        case PCR_REG.WAIT_STATE:
             //console.log("Nhận lệnh wait");
             PCR_UI.Update_Wait_Screen(data); // ví dụ cập nhật chart nhiệt độ
             break;

        case PCR_REG.REQUEST_SAVED_PROTOCOL:
            //console.log("Nhận lệnh request saved");
             PCR_UI.Get_Saved_Protocol(data, saved_cnt , saved_total, Info_Saved, Setpoint_Saved);  // Nhận các protocol đã lưu
	        if ((saved_cnt.value == (saved_total.value - 1) && saved_total.value > 0) || saved_total.value == 0) // nếu nhận đủ protocol thì hiển thị
             {
                PCR_UI.Update_Saved_Tab(PCR_REG.REQUEST_SAVED_PROTOCOL);
                Hide_Loading();
             }
             //console.log(saved_cnt, saved_total);
             break;

        case PCR_REG.REQUEST_HISTORY_PROTOCOL:
            //console.log("Nhận lệnh request history");
             PCR_UI.Get_Saved_Protocol(data, history_cnt , history_total, Info_Saved, Setpoint_Saved);  // Nhận các protocol đã lưu
	         if ((history_cnt.value == (history_total.value - 1) && history_total.value > 0) || history_total.value == 0) // nếu nhận đủ protocol thì hiển thị
             {
                PCR_UI.Update_Saved_Tab(PCR_REG.REQUEST_HISTORY_PROTOCOL);
                Hide_Loading();
             }
             //console.log(history_cnt, history_total);
             break;

        case PCR_REG.REQUEST_CHART_UI: // Nhận được Saved hiện tại 
            PCR_UI.Get_Chart_Buf(data, chart_buf_cnt , chart_buf_total, Chart_Buf);  // Nhận các mảng đã đã lưu
            if ((chart_buf_cnt.value == (chart_buf_total.value - 1) && chart_buf_cnt.value > 0) || chart_buf_cnt.value == 0) // nếu nhận đủ mảng
            {
                PCR_UI.Update_Chart(Chart_Buf);
            }
            //console.log(chart_buf_cnt);
            //console.log(System.History_Position);
            break;

        case PCR_REG.UPDATE_TIME_DONE: // Nhận được Saved hiện tại 
            PCR_UI. Update_Time_Done(data);

            break;

        case PCR_REG.SAVE_OK_PROTOCOL: // Nhận lệch save thành công
             //console.log("Nhận lệnh save thành công");
             Hide_Loading();
             PCR_UI.Update_Protocol_name(PROTOCOL_NAME); // đổi tên Protocol
             Show_Notification("Saved successfully", "Cancel");
             break;

        case PCR_REG.SAVE_KO_PROTOCOL: // Nhận lệch save không thành công
             //console.log("Nhận lệnh save thất bại");
             Hide_Loading();
             Show_Notification("Save failed, check eeprom!", "Cancel");
             break;

        case PCR_REG.MULTI_NAME_ERR: // Nhận lệch trùng tên
             //console.log("Nhận lệnh save trùng tên");
             Hide_Loading();
             Show_Notification("Multi name!", "Cancel");
             break;

        case PCR_REG.FULL_MEM_ERR: // Nhận lệnh đầy bộ nhớ
             //console.log("Nhận lệnh save đầy bộ nhớ");
             Hide_Loading();
             Show_Notification("Full memory!", "Cancel");
             break;


        case PCR_REG.DELETE_OK_PROTOCOL: // Nhận lệnh đầy bộ nhớ
             //console.log("Nhận lệnh delete thành công");
             Position_Click = null; // Reset vị tri click
             Show_Notification("Delete successfully!", "Cancel");
             break;

        case PCR_REG.DELETE_ERROR_PROTOCOL: // Nhận lệnh đầy bộ nhớ
             //console.log("Nhận lệnh delete thất bại");
             Hide_Loading();
             Show_Notification("Delete failed, check eeprom!", "Cancel");
             break;

        case PCR_REG.SET_TIME_LOOP:     
             //console.log("Nhận lệnh time loop");
             PCR_UI.Update_Date_Time(data); 
             break;

        case PCR_REG.RESET_MEMORY_DONE: Hide_Loading(); Show_Notification("System memory reset successful!",  "Cancel"); break;

//     case ERROR_EEPROM:              Show_Notification("Error reading memory!"                , 0, SYS_ERR); break;    // Lỗi giao tiếp eeprom
//     case ERROR_DAC1:                Show_Notification("Voltage regulator error 1!"           , 0, SYS_ERR); break;    // Lỗi giao tiếp DAC khi vừa mở máy
//     case ERROR_DAC2:                Show_Notification("Voltage regulator error 2!"           , 0, SYS_ERR); break;    // Lỗi giao tiếp DAC khi vừa mở máy
//     case ERROR_DAC:                 Show_Notification("Voltage regulation error!"            , 0, SYS_ERR); break;    // Lỗi giao tiếp DAC trong quá trình chạy
//     case ERROR_ADC:                 Show_Notification("Temperature reading error!"           , 0, SYS_ERR); break;    // Lỗi giao tiếp ADC trong quá trình chạy
//     case ERROR_CALIB_EMPTY_EEPROM:  Show_Notification("Calibration parameters not saved!"    , 0, SYS_ERR); break;    // Trước đó không có thông số được lưu
//     case ERROR_CALIB_POSI_EEPROM:   Show_Notification("Error reading calibration parameters!", 0, SYS_ERR); break;    // Lỗi đọc thông số hiệu chuẩn
//     case ERROR_PEL1:                Show_Notification("Thermal block sensor 1 error!"        , 0, SYS_ERR); break;    // lỗi dây cảm biến sò 1
//     case ERROR_PEL2:                Show_Notification("Thermal block sensor 2 error!"        , 0, SYS_ERR); break;    // Lỗi dây cảm biến sò 2
//     case ERROR_HEAT_BLOCK:          Show_Notification("Thermal lid sensor error!"            , 0, SYS_ERR); break;    // Lỗi dây cảm biến nắp gia nhiệt
//     case ERROR_TCA9548:             Show_Notification("Communication IC error!"              , 0, SYS_ERR); break;    // Lỗi ic giao tiếp i2c
    
    case PCR_REG.REQUEST_CALIB_HISTORY:  
          //console.log("Nhận lệnh request calib history");
          PCR_UI.Get_Saved_Calib(data, saved_calib_cnt , saved_calib_total, Calib_Val_Saved);  // Nhận các số đã calib   
          if((saved_calib_cnt.value == (saved_calib_total.value - 1) && saved_calib_total.value > 0) || saved_calib_total.value == 0) // nếu nhận đủ protocol thì hiển thị
          {
             PCR_UI.Update_System_log(Calib_Val_Saved, saved_calib_total.value);
             Hide_Loading();
          }
          break;
      
    case PCR_REG.SAVE_CALIB_OK:      
           PCR_UI.Update_Save_Calib(1);
          break;  

    case PCR_REG.SAVE_CALIB_KO:      
           PCR_UI.Update_Save_Calib(0);
          break; 
          
    case PCR_REG.REQUEST_SAVED_UI: // Nhận được Saved hiện tại
          Get_Protocol(data); // Lấy giá trị
          Render_PCR_Program();       // Render lại Program
          Hide_Loading();

          const click_posi = new Uint8Array([System.History_Position]);
          Pack_Data(DEVICE.PCR_ID, PCR_REG.REQUEST_CHART_UI, click_posi, click_posi.length, "Web_PCR");  // yêu cầu mảng buf

          break;

    case PCR_REG.POWER_OUTAGE: // Nhận được thông báo mất điện từ thiết bị
          const confirmed = await Show_Notification("Do you want to continue the program?", "Yes_No",);
          if (confirmed) 
            Pack_Data(DEVICE.PCR_ID, PCR_REG.POWER_OUTAGE_RESTART, null, 0, "Web_PCR"); // Gửi thông báo là nhấn okie
          else 
            Pack_Data(DEVICE.PCR_ID, PCR_REG.POWER_OUTAGE_NONE, null, 0, "Web_PCR");  // Gửi thông bao là nhấn hủy
          break;


        default:
            console.log("Sai địa chỉ Func", func);
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