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

    document.getElementById("foldernamename").value = res.value[0];
});

/* ================= MAIN EXECUTION ================= */
window.addEventListener("DOMContentLoaded", () => {

    /* ---------- NEXT BUTTON ---------- */
    document.getElementById("btnNext")?.addEventListener("click", () => {
        const foldername = document.getElementById("foldername").value.trim();

        let missing = [];
        if (!foldername) missing.push("Folder name");

        if (missing.length > 0) {
            alert(
                "🟡 Please fill in the following information completely: " +
                missing.join(", ")
            );
            return;
        }

        const now = new Date();
        const formattedTime = formatLocalDateTime(now);

        socket.emit("writeJsonFile", {
            filePath: globalvar_tmp_path,
            data: {
                folder_name: foldername,
                session_createtime: formattedTime
            }
        });

        goToPage("./Sample_Naming/sample_naming.html");
    });

    /* ---------- BACK BUTTON ---------- */
    document.getElementById("btnBack")?.addEventListener("click", () => {
        goToPage("../index.html");
    });

    /* ---------- AUTOFILL PREVIOUS DATA ---------- */
    socket.emit("readJsonKey", {
        filePath: globalvar_tmp_path,
        key: "folder_name"
    });
});
