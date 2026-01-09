/*========== Import Module ==========*/
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require('fs');

const wifi = require("./socket_handlers/wifi_handler");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/*========== Thư mục public ==========*/
app.use(express.static(path.join(__dirname, "public")));

/*========== Route mặc định ==========*/
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "/Spotcheck/public/index.html"));
// });

/*========== Thư mực chứa kits ==========*/
app.get('/list-json', (req, res) => {
  const folderPath = "/home/pi/Spotcheck/Programs/Quantitative";  // thư mục cố định
  fs.readdir(folderPath, (err, files) => {
    if (err) return res.status(500).send('Lỗi đọc thư mục');
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    res.json(jsonFiles);
  });
});


app.get("/api/device-info", (req, res) => {
  try {
    const WIFI_PATH = "/home/pi/FPS16_B/information.json";
    const wifiRaw = JSON.parse(fs.readFileSync(WIFI_PATH, "utf8"));

    res.json({
      host_name: wifiRaw.host_name || "",
      seri_number: wifiRaw.seri_number || ""
    });
    
  } catch (err) {
    res.status(500).json({
      host_name: "",
      seri_number: ""
    });
  }
});

/*========== Wifi file ==========*/
const WIFI_CONFIG_FILE = path.join(__dirname, '../information.json');

/*========== Soket.IO ==========*/
const { registerCameraSocket } = require("./socket_handlers/camera_handler");
const { registerJsonSocket } = require("./socket_handlers/json_handler")
const { registerExcelSocket } = require("./socket_handlers/excel_handler");
const { registerFileDownloadSocket } = require("./socket_handlers/filedownload_handler");
const { registerEmailSocket } = require("./socket_handlers/email_handler");
const { registerResultSocket } = require("./socket_handlers/result_handler");


io.on("connection", (socket) => {
  console.log("[Spotcheck][INFO] Client connected:", socket.id);

  // Import socket
  registerCameraSocket(io, socket);
  registerJsonSocket(io, socket);
  registerExcelSocket(io, socket); 
  registerFileDownloadSocket(io, socket);
  registerEmailSocket(io, socket);
  registerResultSocket(io, socket);

  /*---------- WIFI CONFIG - START ----------*/
  // Wi-Fi config request received 
  socket.on("request_wifi_config", () => 
  {
    try 
    {
      let cfg = { ssid: '', password: '' };
      if (fs.existsSync(WIFI_CONFIG_FILE)) 
      {
        cfg = JSON.parse(fs.readFileSync(WIFI_CONFIG_FILE, 'utf8')); // Đọc ssid và pass từ json
      }
      socket.emit("response_wifi_config", cfg); // gửi lên web
    } 
    catch (err) 
    {
      socket.emit("response_wifi_config", { ssid: '', password: '' }); // gửi ssid và pass rỗng
    }
  });

  // Nhận Wi-Fi mới từ web thì lưu vào information.json
  socket.on("web_pcr_wifi_config", (data) => {
    try
    {
        fs.writeFileSync(WIFI_CONFIG_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
        socket.emit('wifi_config_saved', { success: true }); // Lưu thành công
    } 
    catch (err) 
    {
        socket.emit('wifi_config_saved', { success: false }); // Lỗi lưu
    }
  });

  // Nhận lệnh restart wifi
  socket.on("web_pcr_wifi_restart", async () => {

    await new Promise(r => setTimeout(r, 5000)); // Đợi 5s

    //console.log('[INFO] Client requested Wi-Fi restart...');
    if (process.send) 
    {
      process.send('restart_system'); // gửi lên cha
    } 
    else
    {
      console.log('[Spotcheck][WARNING] process.send không khả dụng');
    }
  })
  /*---------- WIFI CONFIG - END ----------*/


  socket.on("wifi:get_status", async () => {
      const status = await wifi.getWifiStatus();
      socket.emit("wifi:status", status);
  });

  // Quét WiFi
  socket.on("wifi:scan", async () => {
      const list = await wifi.scanWifi();
      socket.emit("wifi:scan_result", list);
  });

  // Kết nối WiFi
  socket.on("wifi:connect", async ({ ssid, password }) => {
      const result = await wifi.connectWifi(ssid, password);
      socket.emit("wifi:connect_result", result);
  });

  // Ngắt kết nối (ĐỂ TRỐNG CHO BẠN TỰ VIẾT)
  socket.on("wifi:disconnect", async (ssid) => {
      console.log(">>> user muốn disconnect, tự xử lý ở đây <<<");

      // ví dụ:
      // const ok = await wifi.disconnectWifi(ssid);
      // socket.emit("wifi:disconnect_result", { success: ok });

  });
  
  socket.on("disconnect", () => {
    console.log("[Spotcheck][INFO] Client disconnected:", socket.id);
  });
});

/*========== Khởi động server ==========*/
// const PORT = 80;
// server.listen(PORT, () => {
//   console.log(`Webserver running at http://localhost:${PORT}`);
// });

const PORT = 8081;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => { 
 console.log(`[Spotcheck][INFO] Server running on: http://${HOST}:${PORT}`)
});
