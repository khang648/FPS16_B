/*========== Import Module ==========*/
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const wifi = require("./socket_handlers/wifi_handler");
const { registerCameraSocket } = require("./socket_handlers/camera_handler");
const { registerJsonSocket } = require("./socket_handlers/json_handler");
const { 
  registerElectrophoresisSocket,
  getElectrophoresisState
} = require("./socket_handlers/electrophoresis_handler");
const { registerADCSocket } = require("./socket_handlers/adc_handler");
const { registerFolderSocket } = require("./socket_handlers/folder_handler");
const { registerResultSocket, registerResultRoutes } = require("./socket_handlers/result_handler");
const { registerEmailSocket } = require("./socket_handlers/email_handler");
const { registerUpdateSocket } = require("./socket_handlers/update_handler");

/*========== INIT ==========*/
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 1e8,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/*========== CONSTANTS ==========*/
const PORT = 1010;
const HOST = "0.0.0.0";

const WIFI_CONFIG_FILE = path.join(__dirname, "../information.json");
const DEVICE_INFO_FILE = "/home/pi/FPS16_B/information.json";

/*========== GLOBAL ERROR HANDLER ==========*/
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Rejection:", reason);
});


/*========== ELECTROPHORESIS AUTO REDIRECT ==========*/
app.use((req, res, next) => {
  try {

    const state = getElectrophoresisState();

    if (
      state &&
      state.isRunning &&
      (req.path === "/" || req.path === "/index.html")
    ) {
      console.log("[VE100][INFO] Redirect to electrophoresis page");
      return res.redirect("/Electrophoresis/electrophoresis.html");
    }

  } catch (err) {
    console.log("[VE100][ERROR] redirect:", err.message);
  }

  next();
});

/*========== STATIC PUBLIC FOLDER ==========*/
app.use(express.static(path.join(__dirname, "public")));

/*========== API DEVICE INFO ==========*/
app.get("/api/device-info", (req, res) => {
  try {
    if (!fs.existsSync(DEVICE_INFO_FILE)) {
      return res.json({
        host_name: "",
        seri_number: ""
      });
    }

    const wifiRaw = JSON.parse(
      fs.readFileSync(DEVICE_INFO_FILE, "utf8")
    );

    res.json({
      host_name: wifiRaw.host_name || "",
      seri_number: wifiRaw.seri_number || ""
    });

  } catch (err) {
    console.log("[VE100][ERROR] device-info:", err.message);
    res.status(500).json({
      host_name: "",
      seri_number: ""
    });
  }
});

/*========== SOCKET.IO ==========*/
io.on("connection", (socket) => {

  console.log("[VE100][INFO] Client connected:", socket.id);

  /* ===== Register module sockets ===== */
  registerJsonSocket(io, socket);
  registerCameraSocket(io, socket);
  registerElectrophoresisSocket(io, socket);
  registerADCSocket(io, socket);
  registerFolderSocket(io, socket);
  registerResultSocket(io, socket);
  registerResultRoutes(app);
  registerEmailSocket(io, socket);
  registerUpdateSocket(io, socket);

  /* ================= WIFI CONFIG ================= */

  socket.on("request_wifi_config", () => {
    try {
      let cfg = { ssid: "", password: "" };

      if (fs.existsSync(WIFI_CONFIG_FILE)) {
        cfg = JSON.parse(
          fs.readFileSync(WIFI_CONFIG_FILE, "utf8")
        );
      }

      socket.emit("response_wifi_config", cfg);

    } catch (err) {
      console.log("[VE100][ERROR] read wifi config:", err.message);
      socket.emit("response_wifi_config", {
        ssid: "",
        password: ""
      });
    }
  });

  socket.on("web_pcr_wifi_config", (data) => {
    try {

      fs.writeFileSync(
        WIFI_CONFIG_FILE,
        JSON.stringify(data, null, 2),
        { mode: 0o600 }
      );

      socket.emit("wifi_config_saved", { success: true });

    } catch (err) {
      console.log("[VE100][ERROR] save wifi config:", err.message);
      socket.emit("wifi_config_saved", { success: false });
    }
  });

  socket.on("web_pcr_wifi_restart", async () => {

    console.log("[VE100][INFO] Restart requested...");

    await new Promise((r) => setTimeout(r, 5000));

    if (process.send) {
      process.send("restart_system");
    } else {
      console.log("[VE100][WARNING] process.send not available");
    }
  });

  /* ================= WIFI CONTROL ================= */

  socket.on("wifi:get_status", async () => {
    try {
      const status = await wifi.getWifiStatus();
      socket.emit("wifi:status", status);
    } catch (err) {
      console.log("[VE100][ERROR] wifi:get_status:", err.message);
      socket.emit("wifi:status", { connected: false });
    }
  });

  socket.on("wifi:scan", async () => {
    try {
      const list = await wifi.scanWifi();
      socket.emit("wifi:scan_result", list);
    } catch (err) {
      console.log("[VE100][ERROR] wifi:scan:", err.message);
      socket.emit("wifi:scan_result", []);
    }
  });

  socket.on("wifi:connect", async ({ ssid, password }) => {
    try {
      const result = await wifi.connectWifi(ssid, password);
      socket.emit("wifi:connect_result", result);
    } catch (err) {
      console.log("[VE100][ERROR] wifi:connect:", err.message);
      socket.emit("wifi:connect_result", { success: false });
    }
  });

  socket.on("wifi:disconnect", async (ssid) => {
    console.log("[VE100][INFO] Disconnect requested:", ssid);
    // implement nếu cần
  });

  socket.on("disconnect", () => {
    console.log("[VE100][INFO] Client disconnected:", socket.id);
  });
});

/*========== START SERVER ==========*/
server.listen(PORT, HOST, () => {
  console.log(
    `[VE100][INFO] Server running on: http://${HOST}:${PORT}`
  );
});