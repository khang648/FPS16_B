/* ================= GLOBAL SOCKET ================= */
window.socket = io();

/* ================= UTILITIES ================= */
/* Format time output */
function formatLocalDateTime(date) {
    const pad = n => n.toString().padStart(2, '0');
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

/* ================= SOCKET: RECEIVE JSON DATA ================= */
socket.on("jsonKeyValue", (res) => {
    if (res.error) {
        console.error("ERROR:", res.error);
        return;
    }

    const session_info = res.value;

    document.getElementById("filename").value = session_info[0];
    document.getElementById("technician").value = session_info[1];
});

/* ================= MAIN EXECUTION ================= */
window.addEventListener("DOMContentLoaded", () => {

    /* ---------- NEXT BUTTON ---------- */
    document.getElementById("btnNext")?.addEventListener("click", () => {
        const filename = document.getElementById("filename").value.trim();
        const technician = document.getElementById("technician").value.trim();

        let missing = [];
        if (!filename) missing.push("Result filename");
        if (!technician) missing.push("Technician");

        if (missing.length > 0) {
            alert(
                t("ALERT_INFOR_MISSING") 
                // + missing.join(", ")
            );
            return;
        }

        const now = new Date();
        const formattedTime = formatLocalDateTime(now);

        socket.emit("writeJsonFile", {
            filePath: globalvar_tmp_path,
            data: {
                session_info: [filename, technician],
                session_createtime: formattedTime
            }
        });

        goToPage("./Kit_Selection/kit_selection.html");
    });

    /* ---------- BACK BUTTON ---------- */
    document.getElementById("btnBack")?.addEventListener("click", () => {
        goToPage("../index.html");
    });

    /* ---------- AUTOFILL PREVIOUS DATA ---------- */
    socket.emit("readJsonKey", {
        filePath: globalvar_tmp_path,
        key: "session_info"
    });
});
