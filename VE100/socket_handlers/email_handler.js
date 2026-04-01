const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

// Đường dẫn file tạm lưu thông tin email
const globalvar_tmp_path = "/home/pi/FPS16_B/VE100/tmp/global_info.json";

// File parameters của hệ thống
const parameters_path = "/home/pi/VE100/parameters.json";

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
   ZIP RESULT FOLDER
========================================================= */
function zipFolder(sourceFolder, zipPath) {

    return new Promise((resolve, reject) => {

        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
            console.log("[email_handler][INFO] Zip created:", zipPath);
            resolve(zipPath);
        });

        archive.on("error", (err) => reject(err));

        archive.pipe(output);
        archive.directory(sourceFolder, false);
        archive.finalize();

    });
}

/* =========================================================
   AUTO SEND RESULT EMAIL
========================================================= */
async function autoSendResultEmail(resultFolder) {

    try {

        if (!fs.existsSync(globalvar_tmp_path)) {
            console.log("[email_handler][WARN] global_info.json not found");
            return;
        }

        const params = JSON.parse(fs.readFileSync(globalvar_tmp_path, "utf8"));

        const { email, appPass, automail, recipient } = params;

        if (automail !== 1) {
            console.log("[email_handler][INFO] automail disabled");
            return;
        }

        if (!email || !appPass || !recipient) {
            console.log("[email_handler][WARN] Missing email configuration");
            return;
        }

        const zipPath = resultFolder + ".zip";

        console.log("[email_handler][INFO] Zipping result folder:", resultFolder);

        await zipFolder(resultFolder, zipPath);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: email,
                pass: appPass
            }
        });

        console.log("[email_handler][INFO] Sending email to:", recipient);

        await transporter.sendMail({
            from: email,
            to: recipient,
            subject: "VE100 Result",
            text: "This is an email from VE100 device",
            attachments: [
                {
                    filename: path.basename(zipPath),
                    path: zipPath
                }
            ]
        });

        console.log("[email_handler][OK] Result email sent successfully");

    } catch (err) {

        console.log("[email_handler][ERROR] autoSendResultEmail:", err);

    }
}

/* =========================================================
   Hàm đăng ký các socket event liên quan email
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

/* =========================================================
   EXPORT
========================================================= */
module.exports = {
    registerEmailSocket,
    autoSendResultEmail
};