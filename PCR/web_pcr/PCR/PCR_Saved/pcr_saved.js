function Render_PCR_Saved() 
{
  loadHeader();
  document.addEventListener("headerLoaded", () => 
  {
    Show_Loading();
    initHeaderLogic();
    Render_Saved_Protocol("pcr-saved-list-preview" ,"SAVED PROTOCOL");
    Render_Tool("control-panel-saved", "saved");
    Pack_Data(DEVICE.PCR_ID, PCR_REG.REQUEST_SAVED_PROTOCOL, null, 0, "Web_PCR");
  }); 
}

/*==== Render Header và Protocol khi include file này======*/
document.addEventListener('DOMContentLoaded', () => {
  Render_PCR_Saved();
});
