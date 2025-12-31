function Render_PCR_New() 
{
  loadHeader();
  document.addEventListener("headerLoaded", () => 
  {
    initHeaderLogic();
    Show_Loading();
    Pack_Data(DEVICE.PCR_ID, PCR_REG.REQUEST_SAVED_UI, null, 0, "Web_PCR");   // Yêu cầu dữ liệu lưu trước đó
    Render_Chart_Temp();
    Render_Tool("control-panel-new", "new");
    
  });
}

/*==== Render Header và Protocol khi include file này======*/
document.addEventListener('DOMContentLoaded', () => {
    Render_PCR_New();
});


