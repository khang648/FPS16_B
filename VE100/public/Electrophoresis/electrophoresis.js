/* =========================================================
   INIT
========================================================= */

const stagePanel = document.getElementById("stagePanel");
const currentVoltage = document.getElementById("currentVoltage");
const cameraImg = document.getElementById("img");

const socket = io();

let isCameraRunning = false;
let stageData = null;

/* =========================================================
   FORMAT TIME
========================================================= */

function pad(num) {
  return num.toString().padStart(2, "0");
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

/* =========================================================
   SOCKET CONNECT
========================================================= */

socket.on("connect", () => {
  console.log("[CLIENT] Socket connected");
});

socket.on("disconnect", () => {
  console.log("[CLIENT] Socket disconnected");
  isCameraRunning = false;
});


socket.on("electro:reset", () => {

  console.log("[CLIENT] Reset received");

  // reset voltage
  updateVoltage(0);

  // reset stage UI về trạng thái ban đầu
  renderStages();

});

/* =========================================================
   LOAD JSON FROM SERVER
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  socket.emit("loadJsonFile", globalvar_tmp_path);
});

socket.on("jsonData", (data) => {

  if (!data || data.error) {
    console.error("JSON Error:", data?.error);
    return;
  }

  stageData = data;

  renderStages();

  // Sau khi render xong → hỏi server trạng thái
  socket.emit("electro:sync");
});

/* =========================================================
   RENDER STAGES
========================================================= */

function renderStages() {

  if (!stageData || !stageData.stages) return;

  stagePanel.innerHTML = "";

  const stageCount = stageData.stage_count || 0;

  for (let i = 1; i <= stageCount; i++) {

    const key = `stage_${i}`;
    const info = stageData.stages[key];
    if (!info) continue;

    const div = document.createElement("div");
    div.className = "stage waiting";

    div.innerHTML = `
      <div class="stage-title">STAGE ${i}</div>

      <div class="stage-voltage">
        <span class="voltage-value">${info.voltage.value}</span>
        <span class="voltage-unit">V</span>
      </div>

      <div class="stage-bottom">
        <div class="stage-countdown-label">TIME</div>
        <div class="stage-countdown">
          ${pad(info.timer.minute)}:${pad(info.timer.second)}
        </div>
      </div>
    `;

    stagePanel.appendChild(div);
  }

  currentVoltage.textContent = "0 V";
}

/* =========================================================
   CONVERT JSON → STAGE CONFIG
========================================================= */

function buildStageConfigFromJson(data) {

  const result = [];

  const stageCount = data.stage_count || 0;

  for (let i = 1; i <= stageCount; i++) {

    const key = `stage_${i}`;
    const info = data.stages[key];
    if (!info) continue;

    const totalSeconds =
      (info.timer.minute * 60) + info.timer.second;

    result.push({
      id: i,
      voltage: info.voltage.value,
      duration: totalSeconds
    });
  }

  return result;
}
/* =========================================================
   STATE CONTROL
========================================================= */

function getStages() {
  return document.querySelectorAll(".stage");
}

function setRunning(index) {

  const stages = getStages();

  stages.forEach((el, i) => {

    el.classList.remove("waiting", "running", "completed");

    if (i < index) el.classList.add("completed");
    else if (i === index) el.classList.add("running");
    else el.classList.add("waiting");
  });
}

function updateCountdown(index, remaining) {
  const stages = getStages();
  const el = stages[index]?.querySelector(".stage-countdown");
  if (el) el.textContent = formatTime(remaining);
}

function updateVoltage(voltage) {
  currentVoltage.textContent = voltage + " V";
}

/* =========================================================
   SYNC STATE FROM SERVER
========================================================= */

socket.on("electro:state", (state) => {

  if (!state) return;

  const stages = getStages();

  // =========================
  // CASE 1: SERVER ĐANG CHẠY
  // =========================
  if (state.isRunning) {

    setRunning(state.currentIndex);

    stages.forEach((el, i) => {

      const countdownEl = el.querySelector(".stage-countdown");
      if (!countdownEl) return;

      // Stage đã hoàn thành
      if (i < state.currentIndex) {
        countdownEl.textContent = "00:00";
      }

      // Stage đang chạy
      else if (i === state.currentIndex) {
        countdownEl.textContent = formatTime(state.remaining);
      }

      // Stage chưa chạy → giữ nguyên
    });

    const currentStage = state.stages[state.currentIndex];
    if (currentStage) {
      updateVoltage(currentStage.voltage);
    }

    return;
  }

  // =========================
  // CASE 2: CHƯA CHẠY GÌ
  // =========================
  if (!state.isRunning && state.currentIndex === -1) {

    const stageConfig = buildStageConfigFromJson(stageData);
    socket.emit("electro:start", stageConfig);
    return;
  }

  // =========================
  // CASE 3: ĐÃ HOÀN TẤT
  // =========================
  if (!state.isRunning && state.currentIndex >= state.stages.length) {

    setRunning(state.stages.length);

    stages.forEach((el) => {
      const countdownEl = el.querySelector(".stage-countdown");
      if (countdownEl) countdownEl.textContent = "00:00";
    });

    updateVoltage(0);
  }

});

/* =========================================================
   SOCKET EVENTS REALTIME
========================================================= */

socket.on("electro:stageStart", (data) => {
  setRunning(data.index);
  updateVoltage(data.stage.voltage);
});

socket.on("electro:tick", (data) => {
  updateCountdown(data.index, data.remaining);
});

socket.on("electro:stageCompleted", (data) => {
  const stages = getStages();
  if (stages[data.index]) {
    stages[data.index].classList.remove("running");
    stages[data.index].classList.add("completed");
  }
});

socket.on("electro:finished", () => {
  updateVoltage(0);
});

/* =========================================================
   CAMERA CONTROL (giữ nguyên)
========================================================= */

window.addEventListener("load", () => {
  if (!isCameraRunning) {
    socket.emit("camera:start");
    isCameraRunning = true;
  }
});

socket.on("camera:frame", (frame) => {
  if (!cameraImg) return;
  cameraImg.src = "data:image/jpeg;base64," + frame;
});

window.addEventListener("beforeunload", () => {
  if (isCameraRunning) {
    socket.emit("camera:stop");
    isCameraRunning = false;
  }
});

document.addEventListener("visibilitychange", () => {

  if (document.hidden) {
    if (isCameraRunning) {
      socket.emit("camera:stop");
      isCameraRunning = false;
    }
  } else {
    if (!isCameraRunning) {
      socket.emit("camera:start");
      isCameraRunning = true;
    }
  }
});

/* =========================================================
   STOP BUTTON
========================================================= */

const btnStop = document.getElementById("btnStop");

if (btnStop) {
  btnStop.addEventListener("click", () => {

    if (!confirm("Are you sure you want to stop?")) return;

    socket.emit("electro:stop");

    // Sau 500ms chuyển về trang chủ
    setTimeout(() => {
      window.location.href = "../index.html";  // chỉnh lại nếu path khác
    }, 500);

  });
}

/* =========================================================
   FULLSCREEN
========================================================= */

function toggleFullscreen() {

  const wrapper = document.getElementById("cameraWrapper");

  if (!document.fullscreenElement) {
    wrapper.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}