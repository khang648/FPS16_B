function OpenTab(func) 
{
    if (func === "NEW")
    {
      System.History_Position = 100; // gán số không giá trị
      localStorage.setItem("History_Position", System.History_Position);
      
      goToPage("PCR/PCR_New/pcr_new.html" , "none", "new");
    } 

    else if (func === "SAVED")
    {
      goToPage("PCR/PCR_Saved/pcr_saved.html", "none", "saved");
    } 

    else if (func === "HISTORY")
    {
      goToPage("PCR/PCR_History/pcr_history.html", "none", "history");
    } 

    else if (func === "ADMIN")
    {
      goToPage("PCR/PCR_Admin/pcr_admin.html", "none", "admin");
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