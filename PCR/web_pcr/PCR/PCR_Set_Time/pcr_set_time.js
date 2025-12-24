function Render_PCR_Set_Time()
{
  loadHeader();
  document.addEventListener("headerLoaded", () => 
  {
    initHeaderLogic();
    Pack_Data(DEVICE.PCR_ID, PCR_REG.SET_TIME_LOOP, null, 0, "Web_PCR");     // Gửi lệnh yêu cầu đọc thời gian
    Render_Tool("control-panel-set-time", "set_time");
  }); 
}

/*==== Render Header và Protocol khi include file này======*/
Render_PCR_Set_Time();


async function Click_Btn_Enter_Date_Time() 
{
   const result = await Show_Notification("Enter Date & Time", "Date_Time");

  if (result) 
  {
    const { day, month, year, hour, minute, second } = result;
    DATA_TX_LENGHT = Pack_Date_Time(DATA_TX, day, month, year, hour, minute, second);
    Pack_Data(DEVICE.PCR_ID, PCR_REG.SAVE_SET_TIME, DATA_TX, DATA_TX_LENGHT, "Web_PCR"); 
  }
}
