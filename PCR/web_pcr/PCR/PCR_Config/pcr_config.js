/* ================================
   INIT PAGE
================================ */
function Render_PCR_Config() 
{
    loadHeader();

    document.addEventListener("headerLoaded", () => 
    {
        // Load calib history khi vào trang
        Pack_Data(
            DEVICE.PCR_ID,
            PCR_REG.REQUEST_CALIB_HISTORY,
            null,
            0,
            "Web_PCR"
        );

        Show_Loading();
        Rule_Input_Calib();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    Render_PCR_Config();
});


/* ================================
   SOCKET DEVICE INFO
================================ */
const socket = io();

const hostInput = document.getElementById("host_name");
const seriInput = document.getElementById("seri_number");


socket.on("device_info", (data) => {

    hostInput.value = data.host_name || "";
    seriInput.value = data.seri_number || "";

    const title = document.getElementById("deviceTitle");
    if (title) {
        title.textContent = `${data.host_name} - PCR ${data.seri_number}`;
    }
});


socket.on("device_info_saved", () => {
    alert("Device info saved!");
});


/* ================================
   DEVICE CONFIG BUTTONS
================================ */
document.querySelectorAll(".btn-back").forEach(btn => {
    btn.addEventListener("click", () => {
        goToPage("PCR/PCR_Base/pcr_base.html", "none");
    });
});

document.getElementById("deviceBackBtn")?.addEventListener("click", () => {
    goToPage("PCR/PCR_Base/pcr_base.html", "none");
});


/* ================================
   TEMP CALIB BUTTONS
================================ */

/* BACK (giống device back) */
document.getElementById("calibBackBtn")?.addEventListener("click", () => {
    goToPage("PCR/PCR_Base/pcr_base.html", "none");
});


/* APPLY = UPLOAD CALIB */
document.querySelectorAll(".btn-calib-apply").forEach(btn => {
    btn.addEventListener("click", () => {
        Click_Btn_Upload();
    });
});
/* ================================
   SYSTEM LOG - RELOAD
================================ */
document.getElementById("reloadBtn")?.addEventListener("click", () => {
    Click_Btn_Reload();
});


/* ================================
   INPUT VALIDATION
================================ */
function Rule_Input_Calib() {

    const inputs = document.querySelectorAll('.value-input');

    inputs.forEach(input => 
    {
        input.maxLength = 5;

        let prevVal = input.value.trim();

        input.addEventListener('input', () => 
        {
            let val = input.value;

            val = val.replace(/[^0-9.]/g, '');

            const dotParts = val.split('.');
            if (dotParts.length > 2) {
                val = dotParts[0] + '.' + dotParts[1];
            }

            if (dotParts.length === 2 && dotParts[1].length > 1) {
                dotParts[1] = dotParts[1].slice(0, 1);
                val = dotParts.join('.');
            }

            input.value = val;
        });

        input.addEventListener('blur', () => 
        {
            let val = input.value.trim();

            if (val !== '' && val !== '.' && !isNaN(parseFloat(val)) && val < 200) 
            {
                prevVal = val;
                input.value = val;
            } 
            else 
            {
                input.value = prevVal;
                alert("Invalid input!");
            }
        });
    });
}










document.querySelector(".btn-auto-speed")?.addEventListener("click", () => {
    Click_Btn_Auto();
});