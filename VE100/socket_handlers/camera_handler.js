const { spawn } = require("child_process");

let camProcess = null;
let clients = new Set(); // lưu các socket đang xem camera
let buffer = Buffer.alloc(0);

/* ================================
   START CAMERA PROCESS
================================ */
function startCameraProcess(io) {

  if (camProcess) {
    console.log("[CAM] Camera already running");
    return;
  }

  console.log("[CAM] Starting camera process...");

  camProcess = spawn(
    "/usr/bin/rpicam-vid",
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

      // Gửi cho tất cả client đang xem
      for (const socket of clients) {
        socket.emit("camera:frame", frame.toString("base64"));
      }
    }
  });

  camProcess.stderr.on("data", d => {
    console.log("[CAM STDERR]:", d.toString().trim());
  });

  camProcess.on("close", code => {
    console.log("[CAM] Camera stopped with code", code);
    camProcess = null;
  });

  camProcess.on("error", err => {
    console.error("[CAM ERROR]:", err);
    camProcess = null;
  });
}

/* ================================
   STOP CAMERA PROCESS
================================ */
function stopCameraProcess() {
  if (camProcess) {
    console.log("[CAM] Stopping camera process...");
    camProcess.kill("SIGINT");
    camProcess = null;
  }
}

/* ================================
   REGISTER SOCKET
================================ */
function registerCameraSocket(io, socket) {

  socket.on("camera:start", () => {

    console.log("[CAM] Start requested:", socket.id);
    clients.add(socket);

    if (!camProcess) {
      startCameraProcess(io);
    }
  });

  socket.on("camera:stop", () => {

    console.log("[CAM] Stop requested:", socket.id);
    clients.delete(socket);

    // Nếu không còn ai xem → tắt camera
    if (clients.size === 0) {
      stopCameraProcess();
    }
  });

  socket.on("disconnect", () => {

    clients.delete(socket);

    if (clients.size === 0) {
      stopCameraProcess();
    }
  });
}

module.exports = {
  registerCameraSocket
};