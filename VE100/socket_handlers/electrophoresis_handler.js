const fs = require("fs");
const path = require("path");
const rpio = require("rpio");
const { SerialPort } = require("serialport");
const { captureCurrentFrame } = require("./camera_handler");
const { createCanvas, loadImage, registerFont } = require("canvas");




const COORDINATE_PATH = "/home/pi/VE100/Global/coordinates.json";
const DEFAULT_COORDINATES = {
  x_coordinate_9: 96,
  x_coordinate_17: 90,
  y_coordinate: 230,

  well_distance_9: 49,
  pace_9: 67,

  well_distance_17: 32,
  pace_17: 77,

  font_size_9: 15,
  font_size_17: 15
};

/* ================= GPIO CONFIG ================= */

const RELAY_PIN  = 17;
const RUNLED_PIN = 27;

rpio.init({ mapping: "gpio" });

rpio.open(RELAY_PIN,  rpio.OUTPUT, rpio.LOW);
rpio.open(RUNLED_PIN, rpio.OUTPUT, rpio.LOW);

function Relay(on) {
  rpio.write(RELAY_PIN, on ? rpio.HIGH : rpio.LOW);
}

function RunLED(on) {
  rpio.write(RUNLED_PIN, on ? rpio.HIGH : rpio.LOW);
}

function AllOff() {
  Relay(false);
  RunLED(false);
}

/* ================= UART CONFIG ================= */

const port = new SerialPort({
  path: "/dev/serial0",
  baudRate: 38400,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  autoOpen: true
});

port.on("open", () => {
  console.log("[UART] Opened /dev/serial0 @38400 8N1");
});

port.on("error", (err) => {
  console.log("[UART ERROR]:", err.message);
});

function uart_send(vol, state) {

  if (!port.isOpen) {
    console.log("[UART] Port not open");
    return;
  }

  function write(cmd, delay) {
    setTimeout(() => {
      port.write(cmd, (err) => {
        if (err) console.log("[UART WRITE ERROR]:", err.message);
      });
    }, delay);
  }

  write(`\rVOLTAGE ${vol}\r`, 0);
  write(`\rCURRENT 10\r`, 100);
  write(`\rCOMMIT\r`, 200);
  write(`\rOUTPUT ${state}\r`, 300);

  console.log(`[UART] Sent VOL=${vol}, STATE=${state}`);
}

/* ================= STATE ================= */

let stages = [];
let currentIndex = -1;
let timer = null;
let remaining = 0;
let isRunning = false;
let ioRef = null;

/* ================= PATH ================= */

const GLOBAL_INFO_PATH = "/home/pi/FPS16_B/VE100/tmp/global_info.json";
const RESULTS_BASE_PATH = "/home/pi/VE100/Results";

/* ========================================================= */

function resetState() {

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  currentIndex = -1;
  remaining = 0;
  stages = [];
  isRunning = false;

  console.log("[ELECTRO] Reset to IDLE");
}

/* ========================================================= */

function ensureSessionFolder() {

  try {

    if (!fs.existsSync(GLOBAL_INFO_PATH)) return false;

    const raw = JSON.parse(
      fs.readFileSync(GLOBAL_INFO_PATH, "utf8")
    );

    const folderName = raw.folder_name;
    if (!folderName) return false;

    if (!fs.existsSync(RESULTS_BASE_PATH)) {
      fs.mkdirSync(RESULTS_BASE_PATH, { recursive: true });
    }

    const fullPath = path.join(RESULTS_BASE_PATH, folderName);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    return true;

  } catch (err) {
    console.log("[FOLDER ERROR]:", err.message);
    return false;
  }
}

/* ========================================================= */

function applyStageVoltage(vol_set) {

  if (vol_set > 0) {
    Relay(true);
    RunLED(true);
    uart_send(vol_set, 1);
  } else {
    AllOff();
    uart_send(0, 0);
  }
}

/* ========================================================= */

function loadCoordinates() {

  try {

    if (!fs.existsSync(COORDINATE_PATH)) {

      fs.writeFileSync(
        COORDINATE_PATH,
        JSON.stringify(DEFAULT_COORDINATES, null, 2)
      );

      console.log("[COORD] Default coordinates.json created");

      return DEFAULT_COORDINATES;
    }

    const raw = JSON.parse(
      fs.readFileSync(COORDINATE_PATH, "utf8")
    );

    return { ...DEFAULT_COORDINATES, ...raw };

  } catch (err) {

    console.log("[COORD ERROR]:", err.message);

    return DEFAULT_COORDINATES;
  }
}

/* ========================================================= */
/* ================= IMAGE PROCESSING ====================== */
/* ========================================================= */

async function processFinalImage(imagePath) {

  try {

    if (!imagePath || !fs.existsSync(imagePath)) {
      console.log("[IMAGE] Invalid path:", imagePath);
      return;
    }

    if (!fs.existsSync(GLOBAL_INFO_PATH)) return;

    const raw = JSON.parse(
      fs.readFileSync(GLOBAL_INFO_PATH, "utf8")
    );

    const numberOfWells = raw.number_of_wells;
    const wellNames = raw.well_names || [];

    const img = await loadImage(imagePath);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);

    ctx.fillStyle = "lightgray";
    ctx.fillRect(0, 550, img.width, img.height - 550);

    registerFont("/home/pi/VE100/Global/arial.ttf", {
      family: "ArialCustom"
    });




    const coord = loadCoordinates();
    ctx.fillStyle = "rgb(0,255,0)";
    const yTop = coord.y_coordinate;

    if (numberOfWells === 9) {
      ctx.font = `${coord.font_size_9}px ArialCustom`;
      for (let i = 0; i < 5; i++) {
        const x = coord.x_coordinate_9 + i * coord.well_distance_9;
        ctx.fillText((i + 1).toString(), x, yTop);
      }

      for (let i = 5; i < 9; i++) {
        const x =
          coord.x_coordinate_9 +
          coord.pace_9 +
          (i - 5) * coord.well_distance_9;

        ctx.fillText((i + 1).toString(), x, yTop);
      }

    } else if (numberOfWells === 17) {
      ctx.font = `${coord.font_size_17}px ArialCustom`;
      for (let i = 0; i < 9; i++) {
        const x = coord.x_coordinate_17 + i * coord.well_distance_17;
        ctx.fillText((i + 1).toString(), x, yTop);
      }

      for (let i = 9; i < 17; i++) {
        const x =
          coord.x_coordinate_17 +
          coord.pace_17 +
          (i - 9) * coord.well_distance_17;

        ctx.fillText((i + 1).toString(), x, yTop);
      }
    }


    
    ctx.fillStyle = "black";

    /* ===== FONT SCALE ===== */

    const fontSize = Math.round(img.width * 0.025);
    ctx.font = `${fontSize}px ArialCustom`;
    ctx.textBaseline = "middle";

    /* ===== TEXT AREA ===== */

    const textAreaTop = 550;
    const textAreaHeight = img.height - textAreaTop;

    /* ===== GRID CONFIG ===== */

    const rowsPerColumn = 5;
    const columns = Math.ceil(numberOfWells / rowsPerColumn);

    const colWidth = img.width / columns;

    /* ===== ROW SPACING ===== */

    const rowSpacing = textAreaHeight / (rowsPerColumn + 1);

    /* ===== DRAW ===== */

    for (let i = 0; i < numberOfWells; i++) {

      const col = Math.floor(i / rowsPerColumn);
      const row = i % rowsPerColumn;

      const x = col * colWidth + colWidth * 0.1;
      const y = textAreaTop + rowSpacing * (row + 1);

      let name = wellNames[i] || "";

      if (name.length > 20) {
        name = name.substring(0, 20);
      }

      ctx.fillText(
        `${i + 1}. ${name}`,
        x,
        y
      );
    }



    const outputPath = path.join(
      path.dirname(imagePath),
      "final_result.png"
    );

    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));

    console.log("[IMAGE] Final result saved:", outputPath);

  } catch (err) {
    console.log("[IMAGE ERROR]:", err.message);
  }
}

/* ========================================================= */
/* ================= FIXED ASYNC FLOW ====================== */
/* ========================================================= */

function startProcess(io, stageConfig) {

  if (isRunning) return;
  if (!Array.isArray(stageConfig) || stageConfig.length === 0) return;
  if (!ensureSessionFolder()) return;

  ioRef = io;
  stages = stageConfig;
  currentIndex = -1;
  isRunning = true;

  runNextStage();
}

async function runNextStage() {

  currentIndex++;

  if (currentIndex >= stages.length) {

    applyStageVoltage(0);

    try {
      const lastImagePath = await captureCurrentFrame("final");

      if (lastImagePath && fs.existsSync(lastImagePath)) {
        await processFinalImage(lastImagePath);
      } else {
        console.log("[IMAGE] Final image not found:", lastImagePath);
      }

    } catch (err) {
      console.log("[FINAL IMAGE ERROR]:", err.message);
    }

    if (ioRef) ioRef.emit("electro:finished");

    electrophoresisState.isRunning = false;

    resetState();
    return;
  }

  const stage = stages[currentIndex];
  remaining = stage.duration;

  applyStageVoltage(stage.voltage || 0);

  if (ioRef) {
    ioRef.emit("electro:stageStart", {
      index: currentIndex,
      stage
    });
  }

  timer = setInterval(() => {

    remaining--;

    if (ioRef) {
      ioRef.emit("electro:tick", {
        index: currentIndex,
        remaining
      });
    }

    if (remaining <= 0) {

      clearInterval(timer);
      timer = null;

      (async () => {

        try {
          await captureCurrentFrame(stage.id);
        } catch (err) {
          console.log("[STAGE IMAGE ERROR]:", err.message);
        }

        if (ioRef) {
          ioRef.emit("electro:stageCompleted", {
            index: currentIndex
          });
        }

        setTimeout(runNextStage, 1000);

      })();
    }

  }, 1000);
}

/* ========================================================= */

function stopProcess() {

  applyStageVoltage(0);

  if (ioRef) ioRef.emit("electro:reset");

  resetState();
}

/* ========================================================= */

function registerElectrophoresisSocket(io, socket) {

  socket.on("electro:start", (stageConfig) => {
    electrophoresisState.isRunning = true;
    startProcess(io, stageConfig);
  });

  socket.on("electro:stop", () => {
    electrophoresisState.isRunning = false;
    stopProcess();
  });

  socket.on("electro:sync", () => {
    socket.emit("electro:state", {
      isRunning,
      currentIndex,
      remaining,
      stages
    });
  });
}


/*==================== CHUYỂN TRANG TRỰC TIẾP NÊU ĐANG RUNNING ===================*/
let electrophoresisState = {
  isRunning: false
};

function getElectrophoresisState() {
  return electrophoresisState;
}



module.exports = {
  registerElectrophoresisSocket,
  getElectrophoresisState
};