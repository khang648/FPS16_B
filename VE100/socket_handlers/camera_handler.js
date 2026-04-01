/* =========================================================
   CAMERA HANDLER
   Industrial MJPEG pipeline
========================================================= */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

/* ================= STATE ================= */

let camProcess = null;
let clients = new Set();

let buffer = Buffer.alloc(0);
let lastFrame = null;

let isStarting = false;
let restartTimer = null;

/* ================= CONFIG ================= */

const GLOBAL_INFO_PATH = "/home/pi/FPS16_B/VE100/tmp/global_info.json";
const RESULTS_BASE_PATH = "/home/pi/VE100/Results";

const CAMERA_CMD = "/usr/bin/rpicam-vid";

/* =========================================================
   ENSURE SESSION FOLDER
========================================================= */

function getSessionFolderPath() {

  try {

    if (!fs.existsSync(GLOBAL_INFO_PATH)) {
      console.log("[CAM] global_info.json not found");
      return null;
    }

    const raw = JSON.parse(
      fs.readFileSync(GLOBAL_INFO_PATH, "utf8")
    );

    const folderName = raw.folder_name;

    if (!folderName) {
      console.log("[CAM] folder_name missing");
      return null;
    }

    if (!fs.existsSync(RESULTS_BASE_PATH)) {
      fs.mkdirSync(RESULTS_BASE_PATH, { recursive: true });
    }

    const fullPath = path.join(RESULTS_BASE_PATH, folderName);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log("[CAM] Created session folder:", fullPath);
    }

    return fullPath;

  } catch (err) {

    console.log("[CAM] Folder error:", err.message);
    return null;
  }
}

/* =========================================================
   START CAMERA
========================================================= */

function startCameraProcess() {

  if (camProcess || isStarting) return;

  isStarting = true;

  console.log("[CAM] Starting camera pipeline...");

  camProcess = spawn(
    CAMERA_CMD,
    [
      "-t", "0",
      "--codec", "mjpeg",
      "--width", "1024",
      "--height", "768",
      "--framerate", "1",
      "--shutter", "1000000",
      "--gain", "6",
      "--exposure", "long",
      "--nopreview",
      "-o", "-"
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  buffer = Buffer.alloc(0);

  camProcess.stdout.on("data", chunk => {

    buffer = Buffer.concat([buffer, chunk]);

    let start, end;

    while (
      (start = buffer.indexOf(Buffer.from([0xff, 0xd8]))) !== -1 &&
      (end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start)) !== -1
    ) {

      const frame = buffer.slice(start, end + 2);
      buffer = buffer.slice(end + 2);

      lastFrame = frame;

      if (clients.size > 0) {

        const base64 = frame.toString("base64");

        for (const socket of clients) {
          socket.emit("camera:frame", base64);
        }

      }

    }

  });

  camProcess.stderr.on("data", d => {
    console.log("[CAM STDERR]:", d.toString().trim());
  });

  camProcess.on("close", code => {

    console.log("[CAM] Camera stopped:", code);

    camProcess = null;
    isStarting = false;

    autoRestart();

  });

  camProcess.on("error", err => {

    console.log("[CAM ERROR]:", err.message);

    camProcess = null;
    isStarting = false;

    autoRestart();

  });

}

/* =========================================================
   AUTO RESTART
========================================================= */

function autoRestart() {

  if (restartTimer) return;

  restartTimer = setTimeout(() => {

    restartTimer = null;

    if (!camProcess) {
      console.log("[CAM] Restarting camera...");
      startCameraProcess();
    }

  }, 3000);

}

/* =========================================================
   STOP CAMERA
========================================================= */

function stopCameraProcess() {

  if (!camProcess) return;

  console.log("[CAM] Stopping camera pipeline...");

  try {
    camProcess.kill("SIGINT");
  } catch (e) {}

  camProcess = null;

}

/* =========================================================
   SAFE FRAME CAPTURE
========================================================= */

function captureCurrentFrame(stageId) {

  if (!lastFrame) {

    console.log("[CAM] No frame available");

    return null;

  }

  const folder = getSessionFolderPath();

  if (!folder) return null;

  const filename = `stage_${stageId}.jpg`;
  const savePath = path.join(folder, filename);

  try {

    const frameCopy = Buffer.from(lastFrame);

    fs.writeFileSync(savePath, frameCopy);

    console.log("[CAM] Image saved:", savePath);

    return savePath;

  } catch (err) {

    console.log("[CAM] Save error:", err.message);

    return null;
  }

}

/* =========================================================
   REGISTER SOCKET
========================================================= */

function registerCameraSocket(io, socket) {

  socket.on("camera:start", () => {

    clients.add(socket);

    if (!camProcess) {
      startCameraProcess();
    }

  });

  socket.on("camera:stop", () => {

    clients.delete(socket);

    if (clients.size === 0) {
      stopCameraProcess();
    }

  });

  socket.on("disconnect", () => {

    clients.delete(socket);

  });

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  registerCameraSocket,
  captureCurrentFrame
};