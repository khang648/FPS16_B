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

    document.getElementById("foldername").value = res.value;
});


/* ================= SOCKET RESPONSE ================= */

socket.on("resultFolderExists", (res) => {

    const confirmOverwrite = confirm(
        t("ALERT_FOLDERNAME_EXIST")
    );

    if (confirmOverwrite) {

        socket.emit("overwriteResultFolder", {
            folderPath: res.folderPath
        });

    }
});


socket.on("resultFolderCreated", (res) => {

    const foldername = document.getElementById("foldername").value.trim();
    const now = new Date();
    const formattedTime = formatLocalDateTime(now);

    // Sau khi folder OK → mới ghi JSON
    socket.emit("writeJsonFile", {
        filePath: globalvar_tmp_path,
        data: {
            folder_name: foldername,
            session_createtime: formattedTime
        }
    });

    goToPage("./Sample_Naming/sample_naming.html");
});


socket.on("resultFolderError", (res) => {
    alert("🔴 Error creating folder: " + res.error);
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
                t("ALERT_FOLDERNAME_MISSING")
            );
            return;
        }

        const now = new Date();
        const formattedTime = formatLocalDateTime(now);

        // socket.emit("writeJsonFile", {
        //     filePath: globalvar_tmp_path,
        //     data: {
        //         folder_name: foldername,
        //         session_createtime: formattedTime
        //     }
        // });

        // goToPage("./Sample_Naming/sample_naming.html");

        socket.emit("createResultFolder", {
            folderName: foldername
        });
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
