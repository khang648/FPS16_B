const fs = require("fs");
const axios = require("axios");
const { exec, spawn } = require("child_process");

const INFO_PATH = "/home/pi/FPS16_B/information.json";
const GITHUB_API = "https://api.github.com/repos/khang648/FPS16_B/releases/latest";

function registerUpdateSocket(io, socket) {

    // Gửi version hiện tại cho Client ngay khi kết nối
    // try {
    //     if (fs.existsSync(INFO_PATH)) {
    //         const local = JSON.parse(fs.readFileSync(INFO_PATH));
    //         socket.emit("current_version", local.version);
    //     }
    // } catch (err) {
    //     console.error("Error sending initial version:", err.message);
    // }

    // CHECK VERSION
    socket.on("check_update", async () => {
        // Kiểm tra kết nối internet thực tế thay vì chỉ kiểm tra IP nội bộ
        // Lệnh này thử gửi 1 gói tin ping đến Google DNS trong vòng 2 giây
        exec("ping -c 1 -W 2 8.8.8.8", async (error) => {
            
            // Nếu error tồn tại, nghĩa là không thể ping ra ngoài (đang ở mode AP hoặc mất mạng)
            if (error) {
                console.warn("[Update Check] No internet access detected (Device might be in AP Mode).");
                return socket.emit("update_check_result", { 
                    hasUpdate: false, 
                    error: "no_network" 
                });
            }

            // Nếu có mạng, bắt đầu thực hiện kiểm tra phiên bản
            try {
                if (!fs.existsSync(INFO_PATH)) {
                    console.error("[Update Check] File information.json not found at:", INFO_PATH);
                    return socket.emit("update_check_result", { 
                        hasUpdate: false, 
                        error: "Local file missing" 
                    });
                }

                // Đọc file local
                const rawData = fs.readFileSync(INFO_PATH, "utf8");
                const local = JSON.parse(rawData);
                
                // Bảo vệ: Nếu file hỏng hoặc không có version, dừng lại để tránh lỗi so sánh
                if (!local.version) {
                    throw new Error("Key 'version' not found in information.json");
                }

                const localVersion = String(local.version).trim();

                // Gọi GitHub API
                const res = await axios.get(GITHUB_API, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    timeout: 5000 
                });

                const latest = String(res.data.tag_name).trim();
                const hasUpdate = (localVersion !== latest);

                console.log(`[Update Check] Local: ${localVersion}, Latest: ${latest}`);

                socket.emit("update_check_result", {
                    hasUpdate: hasUpdate,
                    latest: latest,
                    current: localVersion
                });

            } catch (err) {
                console.error("GitHub API or File Error:", err.message);
                socket.emit("update_check_result", { 
                    hasUpdate: false, 
                    error: "Update check failed" 
                });
            }
        });
    });

    // START UPDATE
    socket.on("start_update", () => {
        const BACKUP_NAME = "FPS16_B_backup";
        
        socket.emit("update_status", "Downloading source code...");

        const wget = spawn('wget', [
            '--progress=dot:giga', 
            '-O', 'update.zip', 
            'https://github.com/khang648/FPS16_B/archive/refs/heads/master.zip'
        ], { cwd: '/home/pi' });

        wget.stderr.on('data', (data) => {
            const line = data.toString();
            const match = line.match(/(\d+)%/);
            if (match) {
                const percent = parseInt(match[1]);
                const overallPercent = Math.round(percent * 0.7); 
                socket.emit("update_progress", overallPercent);
            }
        });

        wget.on('close', (code) => {
            if (code !== 0) {
                return socket.emit("update_error", "Download failed.");
            }

            socket.emit("update_status", "Installing dependencies (npm install)... Please wait.");
            socket.emit("update_progress", 80);

            const installCmd = `
                cd /home/pi &&
                rm -rf temp_extract && mkdir -p temp_extract &&
                unzip -q -o update.zip -d temp_extract &&
                cd /home/pi/temp_extract/FPS16_B-master && 
                npm install --production &&
                cd /home/pi &&
                rm -rf ${BACKUP_NAME} && 
                mv FPS16_B ${BACKUP_NAME} &&
                mv temp_extract/FPS16_B-master FPS16_B &&
                rm -rf update.zip temp_extract
            `;

            exec(installCmd, { timeout: 600000 }, (err) => {
                if (err) {
                    console.error("Installation Error:", err);
                    return socket.emit("update_error", "Installation failed.");
                }

                socket.emit("update_progress", 100);
                socket.emit("update_status", "Success! System is rebooting...");
                socket.emit("update_done");

                setTimeout(() => {
                    exec("sudo reboot");
                }, 5000);
            });
        });
    });
}

module.exports = { registerUpdateSocket };