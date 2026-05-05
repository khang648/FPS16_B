function Render_PCR_New(option = "new") 
{
  loadHeader();
  document.addEventListener("headerLoaded", () => 
  {
    initHeaderLogic();
    Pack_Data(DEVICE.PCR_ID, PCR_REG.REQUEST_SAVED_UI, null, 0, "Web_PCR");   // Yêu cầu dữ liệu lưu trước đó
    Render_Chart_Temp();
    Render_Tool("control-panel-new", option);
    
  });
}

document.addEventListener('DOMContentLoaded', () => {

    setTimeout(() => {
        if (!System.Option_Prev) 
        {
          alert("Please reload the page.!!!");
          return;
        }
        Show_Loading();
        Render_PCR_New(System.Option_Prev);
    }, 500);

});

