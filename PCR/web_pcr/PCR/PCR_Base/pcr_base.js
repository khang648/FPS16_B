function OpenTab(func) 
{
    if (func === "NEW")
    {
      goToPage("PCR/PCR_New/pcr_new.html" , "none");
    } 

    else if (func === "SAVED")
    {
      goToPage("PCR/PCR_Saved/pcr_saved.html", "none");
    } 

    else if (func === "HISTORY")
    {
      goToPage("PCR/PCR_History/pcr_history.html", "none");
    } 

    else if (func === "ADMIN")
    {
      goToPage("PCR/PCR_Admin/pcr_admin.html", "none");
    } 
}

function Render_PCR_Base() 
{
  loadHeader();
  document.addEventListener("headerLoaded", () => 
  {
    initHeaderLogic();
  });
}

/*==== Render Header khi include file này======*/
Render_PCR_Base();