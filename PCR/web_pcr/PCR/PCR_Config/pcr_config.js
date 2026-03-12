/* ===== LOAD HEADER ===== */

function Render_PCR_Config() 
{
  loadHeader();

  document.addEventListener("headerLoaded", () => 
  {
      console.log("Header loaded");
  });
}


/* ===== LOAD KHI MỞ TRANG ===== */

document.addEventListener("DOMContentLoaded", () => {

    Render_PCR_Config();

});



const socket = io();

const hostInput = document.getElementById("host_name");
const seriInput = document.getElementById("seri_number");

const applyBtn = document.getElementById("applyBtn");
const backBtn = document.getElementById("backBtn");



/* ===== NHẬN DEVICE INFO ===== */

socket.on("device_info", (data) => {

    console.log("Device info:", data);

    hostInput.value = data.host_name || "";
    seriInput.value = data.seri_number || "";

    /* cập nhật header */
    const title = document.getElementById("deviceTitle");
    if(title)
        title.textContent = `${data.host_name} - PCR ${data.seri_number}`;
});


/* ===== APPLY ===== */

applyBtn.addEventListener("click", () => {

    const host = hostInput.value;
    const seri = seriInput.value;

    socket.emit("update_device_info", {
        host_name: host,
        seri_number: seri
    });

});

/* ===== SERVER TRẢ KẾT QUẢ ===== */
socket.on("device_info_saved", (msg) => {

    alert("Lưu thành công!");

});

/* ===== BACK ===== */

backBtn.addEventListener("click", () => {

    goToPage("PCR/PCR_Base/pcr_base.html", "none");

});