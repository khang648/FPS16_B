/* ================= GLOBAL SOCKET ================= */
window.socket = io();

/* ================= SYSTEM CHECK NOTICE ================= */
socket.on("jsonKeyValue", (res) => {
    if (res.error) {
        console.error("ERROR:", res.error);
        return;
    }

    const lastCheckStr = res.value;
    if (!lastCheckStr) return;

    /* ----- detect ERROR time ----- */
    const ERROR_TIME_STR = "1111-11-11 11:11:11";
    if (lastCheckStr === ERROR_TIME_STR) {
        showBlinkNotice(
            "error",
            "⛔ System check FAILED. Analysis at this time may affect result accuracy"
        );
        return;
    }

    /* ----- parse valid time ----- */
    const lastCheckTime = new Date(lastCheckStr.replace(" ", "T"));
    if (isNaN(lastCheckTime)) {
        console.warn("Invalid time format:", lastCheckStr);
        return;
    }

    const now = new Date();
    const diffMinutes = (now - lastCheckTime) / (1000 * 60);

    /* ----- warning if older than 1 hour ----- */
    if (diffMinutes > 60) {
        showBlinkNotice(
            "warning",
            "⚠️ It's been more than 1 hour since the last system check"
        );
    }
});


/* ================= BLINK NOTICE ================= */
function showBlinkNotice(type, message) {
    const id = "systemBlinkNotice";
    if (document.getElementById(id)) return;

    const main = document.querySelector("div.main-content");
    if (!main) {
        console.error("Can't find div.main-content");
        return;
    }

    const notice = document.createElement("div");
    notice.id = id;
    notice.className = `${type}-popup`;
    notice.innerHTML = `<span>${message}</span>`;

    if (type !== "error") {
        notice.addEventListener("click", () => notice.remove());
    }

    main.style.position = "relative";
    main.appendChild(notice);
}

/* ================= MAIN INIT ================= */
window.addEventListener("DOMContentLoaded", () => {

    /* ----- RESET GLOBAL SESSION FILE ----- */
    socket.emit("writeJsonFile", {
        filePath: globalvar_tmp_path,
        data: {
            sensitivity: null,
            kit_value_a: null,
            kit_value_b: null,
            kit_selected: null,
            session_info: ["", "", ""],
            session_createtime: "",
            samplefile_create_direct: 0,
            samplename_list: Array(16).fill("N/A"),
            automail: 0,
            resultfile_name: null
        }
    });

    /* ================= BUTTON EVENTS ================= */

    // ANALYSIS
    document.getElementById("btnAnalysis")?.addEventListener("click", () => {
        document.getElementById("overlay").style.display = "flex";
    });

    // FAM
    document.getElementById("btnFam")?.addEventListener("click", () => {
        goToPage("./Fam/fam.html");
    });

    // SYSTEM CHECK
    document.getElementById("btnSystemCheck")?.addEventListener("click", () => {
        goToPage("./System_Check/system_check.html");
    });

    // KIT MANAGEMENT
    document.getElementById("btnSetting")?.addEventListener("click", () => {
        goToPage("./Kit_Management/kit_management.html");
    });

    // SAMPLE FILE
    document.getElementById("btnSampleFile")?.addEventListener("click", () => {
        socket.emit("writeJsonFile", {
            filePath: globalvar_tmp_path,
            data: { samplefile_create_direct: 0 }
        });
        goToPage("./Sample_Setting/sample_setting.html");
    });

    // WIFI
    document.getElementById("btnWifi")?.addEventListener("click", () => {
        goToPage("./Wifi_Setting/wifi_setting.html");
    });

    // RESULT
    document.getElementById("btnResults")?.addEventListener("click", () => {
        goToPage("./Result_View/result_view.html");
    });

    // EMAIL
    document.getElementById("btnEmail")?.addEventListener("click", () => {
        goToPage("./Email_Setting/email_setting.html");
    });

    // HIGH SENSITIVITY
    document.getElementById("btnHighSensitivity")?.addEventListener("click", () => {
        socket.emit("writeJsonFile", {
            filePath: globalvar_tmp_path,
            data: { sensitivity: "high" }
        });
        goToPage("./Session_Info/session_info.html");
    });

    // LOW SENSITIVITY
    document.getElementById("btnLowSensitivity")?.addEventListener("click", () => {
        socket.emit("writeJsonFile", {
            filePath: globalvar_tmp_path,
            data: { sensitivity: "low" }
        });
        goToPage("./Session_Info/session_info.html");
    });

    // CLOSE OVERLAY
    document.getElementById("btnCloseDialog")?.addEventListener("click", () => {
        document.getElementById("overlay").style.display = "none";
    });

    /* ----- CHECK LAST SYSTEM CHECK TIME ----- */
    socket.emit("readJsonKey", {
        filePath: globalvar_tmp_path,
        key: "lasttime_check"
    });
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
