function Render_PCR_History() 
{
  loadHeader();
  document.addEventListener("headerLoaded", () => 
  {
    Show_Loading();
    initHeaderLogic();
    Render_Saved_Protocol("pcr-history-list-preview" ,"HISTORY");
    Render_Tool("control-panel-history", "history");
    Pack_Data(DEVICE.PCR_ID, PCR_REG.REQUEST_HISTORY_PROTOCOL, null, 0, "Web_PCR");
  });
  
}

/*==== Render Header và Protocol khi include file này======*/
document.addEventListener('DOMContentLoaded', () => {
    Render_PCR_History();
});

