const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// Đường dẫn file tạm lưu thông tin email
const globalvar_tmp_path = "Spotcheck/tmp/global_info.json";

/* =========================================================
   Hàm đọc file global_info.json tạm
========================================================= */
function readTmpFile() {
    try {
        if (fs.existsSync(globalvar_tmp_path)) {
            return JSON.parse(fs.readFileSync(globalvar_tmp_path, "utf8"));
        }
    } catch (err) {
        console.log("[email_handler][ERROR] readTmpFile:", err);
    }
    return { email: "", appPass: "" };
}

/* =========================================================
   Hàm ghi file global_info.json tạm
========================================================= */
function writeTmpFile(data) {
    try {
        fs.writeFileSync(globalvar_tmp_path, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
        console.log("[email_handler][ERROR] writeTmpFile:", err);
    }
}

/* =========================================================
   Hàm đăng ký các socket event liên quan email
   io: object socket.io
   socket: socket của client
========================================================= */
function registerEmailSocket(io, socket) {
    console.log("[email_handler][INFO] Email socket registered:", socket.id);

    /* ------------------- KIỂM TRA EMAIL ĐÃ LƯU ------------------- */
    socket.on("email_setting_check_saved_credentials", () => {
        const saved = readTmpFile();

        socket.emit("email_setting_saved_credentials_result", {
            email: saved.email || "",
            appPass: saved.appPass || ""
        });

        console.log("[email_handler][INFO] Returned saved email status:", saved);
    });

    /* ------------------- KIỂM TRA CREDENTIALS GMAIL APP PASSWORD ------------------- */
    socket.on("check_email_credentials", async ({ email, appPass }) => {
        console.log("[email_handler][INFO] Checking Gmail login for:", email);

        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: email,
                    pass: appPass
                }
            });

            await transporter.verify();

            socket.emit("check_email_credentials_result", { ok: true });
            console.log("[email_handler][OK] Valid Gmail + App Password:", email);

        } catch (err) {
            socket.emit("check_email_credentials_result", { ok: false });
            console.log("[email_handler][ERROR] Invalid credentials:", err.message);
        }
    });
}

module.exports = { registerEmailSocket };
