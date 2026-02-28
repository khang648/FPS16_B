/* =========================================================
   ELECTROPHORESIS HANDLER
   Server-side stage engine (SYNC SAFE VERSION)
========================================================= */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

/* ================= STATE ================= */

let stages = [];
let currentIndex = -1;
let timer = null;
let remaining = 0;
let isRunning = false;
let ioRef = null;

/* ================= CONFIG ================= */

const CAPTURE_FOLDER = "/home/pi/VE100/captures";

if (!fs.existsSync(CAPTURE_FOLDER)) {
  fs.mkdirSync(CAPTURE_FOLDER, { recursive: true });
}

/* =========================================================
   GET CURRENT STATE (FOR CLIENT SYNC)
========================================================= */

function getCurrentState() {
  return {
    isRunning,
    currentIndex,
    remaining,
    stages
  };
}

/* =========================================================
   START ELECTROPHORESIS
========================================================= */

function startProcess(io, stageConfig) {

  if (isRunning) {
    console.log("[ELECTRO] Already running");
    return;
  }

  if (!Array.isArray(stageConfig) || stageConfig.length === 0) {
    console.log("[ELECTRO] Invalid stage config");
    return;
  }

  console.log("[ELECTRO] Starting process...");

  ioRef = io;
  stages = stageConfig;
  currentIndex = -1;
  isRunning = true;

  runNextStage();
}

/* =========================================================
   RUN NEXT STAGE
========================================================= */

function runNextStage() {

  currentIndex++;

  if (currentIndex >= stages.length) {

    console.log("[ELECTRO] All stages completed");

    isRunning = false;
    ioRef.emit("electro:finished");

    return;
  }

  const stage = stages[currentIndex];
  remaining = stage.duration;

  console.log(`[ELECTRO] Stage ${stage.id} START`);

  ioRef.emit("electro:stageStart", {
    index: currentIndex,
    stage
  });

  timer = setInterval(() => {

    remaining--;

    ioRef.emit("electro:tick", {
      index: currentIndex,
      remaining
    });

    if (remaining <= 0) {

      clearInterval(timer);

      console.log(`[ELECTRO] Stage ${stage.id} COMPLETED`);

      captureImage(stage.id);

      ioRef.emit("electro:stageCompleted", {
        index: currentIndex
      });

      setTimeout(runNextStage, 1000);
    }

  }, 1000);
}

/* =========================================================
   CAPTURE IMAGE
========================================================= */

function captureImage(stageId) {

  const filename = `stage_${stageId}_${Date.now()}.jpg`;
  const savePath = path.join(CAPTURE_FOLDER, filename);

  console.log("[ELECTRO] Capturing:", filename);

  spawn(
    "/usr/bin/rpicam-still",
    [
      "--width", "1024",
      "--height", "768",
      "--shutter", "1000000",
      "--gain", "6",
      "--exposure", "long",
      "-o", savePath
    ]
  );
}

/* =========================================================
   STOP PROCESS
========================================================= */

function stopProcess() {

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log("[ELECTRO] Stopped & Reset");

  // Reset toàn bộ state
  isRunning = false;
  currentIndex = -1;
  remaining = 0;
  stages = [];

  // Thông báo client reset UI
  if (ioRef) {
    ioRef.emit("electro:reset");
  }
}

/* =========================================================
   REGISTER SOCKET
========================================================= */

function registerElectrophoresisSocket(io, socket) {

  socket.on("electro:start", (stageConfig) => {
    startProcess(io, stageConfig);
  });

  socket.on("electro:stop", () => {
    stopProcess();
  });

  // CLIENT SYNC REQUEST
  socket.on("electro:sync", () => {
    socket.emit("electro:state", getCurrentState());
  });
}

module.exports = {
  registerElectrophoresisSocket
};