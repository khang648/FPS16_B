/*========== RESULT HANDLER ==========*/
const fs = require("fs");
const path = require("path");

const RESULTS_BASE_PATH = "/home/pi/VE100/Results";

function registerFolderSocket(io, socket) {

    /* ================= CREATE RESULT FOLDER ================= */
    socket.on("createResultFolder", ({ folderName }) => {

        try {

            if (!folderName || !/^[a-zA-Z0-9_-]+$/.test(folderName)) {
                return socket.emit("resultFolderError", {
                    error: "Invalid folder name"
                });
            }

            /* ===== 1. Ensure base Results folder exists ===== */
            if (!fs.existsSync(RESULTS_BASE_PATH)) {
                fs.mkdirSync(RESULTS_BASE_PATH, { recursive: true });
                console.log("[VE100][INFO] Created base Results folder");
            }

            const folderPath = path.join(RESULTS_BASE_PATH, folderName);

            /* ===== 2. Check session folder ===== */
            if (fs.existsSync(folderPath)) {

                socket.emit("resultFolderExists", {
                    exists: true,
                    folderPath
                });

            } else {

                fs.mkdirSync(folderPath, { recursive: true });

                socket.emit("resultFolderCreated", {
                    success: true
                });
            }

        } catch (err) {

            console.log("[VE100][ERROR] createResultFolder:", err.message);

            socket.emit("resultFolderError", {
                error: err.message
            });
        }
    });

    /* ================= OVERWRITE FOLDER ================= */
    socket.on("overwriteResultFolder", ({ folderPath }) => {

        try {

            if (!fs.existsSync(RESULTS_BASE_PATH)) {
                fs.mkdirSync(RESULTS_BASE_PATH, { recursive: true });
            }

            if (fs.existsSync(folderPath)) {
                fs.rmSync(folderPath, { recursive: true, force: true });
            }

            fs.mkdirSync(folderPath, { recursive: true });

            socket.emit("resultFolderCreated", {
                success: true
            });

        } catch (err) {

            console.log("[VE100][ERROR] overwriteResultFolder:", err.message);

            socket.emit("resultFolderError", {
                error: err.message
            });
        }
    });
}

module.exports = { registerFolderSocket };