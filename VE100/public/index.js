/* ================= GLOBAL SOCKET ================= */
window.socket = io();

/* ================= MAIN INIT ================= */
window.addEventListener("DOMContentLoaded", () => {

    /* ----- RESET GLOBAL SESSION FILE ----- */
    socket.emit("writeJsonFile", {
        filePath: globalvar_tmp_path,
        data: {
            folder_name: "",
            session_createtime: "",
            number_of_wells: 9,
            well_names: [
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            ],
            automail: 0,
        }
    });

    /* ================= BUTTON EVENTS ================= */

    // ANALYSIS
    document.getElementById("btnElectrophoresis")?.addEventListener("click", () => {
        // document.getElementById("overlay").style.display = "flex";
        goToPage("./Folder_Naming/folder_naming.html")
    });

    // WIFI
    document.getElementById("btnWifi")?.addEventListener("click", () => {
        goToPage("./Wifi_Setting/wifi_setting.html");
    });

    // BAND FINDER
    document.getElementById("btnBandFinder")?.addEventListener("click", () => {
        goToPage("./Band_Finder/band_finder.html");
    });


    // RESULT
    document.getElementById("btnResults")?.addEventListener("click", () => {
        goToPage("./Result_View/result_view.html");
    });

    // EMAIL
    document.getElementById("btnEmail")?.addEventListener("click", () => {
        goToPage("./Email_Setting/email_setting.html");
    });

    // SINGLE STAGE
    document.getElementById("btnSingleStage")?.addEventListener("click", () => {
        socket.emit("writeJsonFile", {
            filePath: globalvar_tmp_path,
            data: { sensitivity: "high" }
        });
        goToPage("./Folder_Naming/folder_naming.html");
    });

    // MULTI STAGE
    document.getElementById("btnMultiStage")?.addEventListener("click", () => {
        socket.emit("writeJsonFile", {
            filePath: globalvar_tmp_path,
            data: { sensitivity: "low" }
        });
        goToPage("./Folder_Naming/folder_naming.html");
    });

    // CLOSE OVERLAY
    document.getElementById("btnCloseDialog")?.addEventListener("click", () => {
        document.getElementById("overlay").style.display = "none";
    });

    /* ----- CHECK LAST SYSTEM CHECK TIME ----- */
    // socket.emit("readJsonKey", {
    //     filePath: globalvar_tmp_path,
    //     key: "lasttime_check"
    // });
});

/* ================= ADMIN HIDDEN ACCESS ================= */
let holdTimer = null;
const HOLD_DURATION = 5000;
const homeBtn = document.getElementById("homeBtn");

function startHold() {
    holdTimer = setTimeout(() => {
        goToPage("./Admin/admin.html");
    }, HOLD_DURATION);
}

function cancelHold() {
    clearTimeout(holdTimer);
}

/* Mouse */
homeBtn.addEventListener("mousedown", startHold);
homeBtn.addEventListener("mouseup", cancelHold);
homeBtn.addEventListener("mouseleave", cancelHold);

/* Touch */
homeBtn.addEventListener("touchstart", startHold);
homeBtn.addEventListener("touchend", cancelHold);
homeBtn.addEventListener("touchcancel", cancelHold);

/* ================= BLOCK BROWSER BACK ================= */
history.pushState(null, "", location.href);
window.addEventListener("popstate", () => {
    history.pushState(null, "", location.href);
});

/* ================= LANGUAGE ================= */
if (langSelect) {
  langSelect.value = localStorage.getItem("lang") || "en";

  langSelect.addEventListener("change", () => {
    const lang = langSelect.value;

    if (typeof loadLanguage === "function") {
      loadLanguage(lang);
    }

    try {
      localStorage.setItem("lang", lang);
    } catch (e) {
      console.warn("localStorage not available");
    }
  });
}
