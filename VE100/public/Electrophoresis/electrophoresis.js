/* =========================================================
   INIT
========================================================= */

const stagePanel = document.getElementById("stagePanel");
const currentVoltage = document.getElementById("currentVoltage");
const cameraImg = document.getElementById("img");
const btnStop = document.getElementById("btnStop");

const socket = io();

let isCameraRunning = false;
let stageData = null;
let isFinished = false;


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


/* =========================================================
   REAL VOLTAGE
========================================================= */

socket.on("electro:realVoltage", (voltage) => {

  if (!currentVoltage) return;

  if (voltage === "ERR") {
    currentVoltage.textContent = "ERR";
    currentVoltage.style.color = "red";
    return;
  }

  if (typeof voltage === "number") {
    currentVoltage.textContent = voltage.toFixed(2) + " V";
    currentVoltage.style.color = "var(--button-hover)";
  }
});


socket.on("electro:reset", () => {

  renderStages();

  if (currentVoltage) {
    currentVoltage.textContent = "0 V";
    currentVoltage.style.color = "var(--button-hover)";
  }

});


/* =========================================================
   LOAD JSON
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
      <div class="stage-title">${t("LABEL_CURRENTSTAGE")} ${i}</div>

      <div class="stage-voltage">
        <span class="voltage-value">${info.voltage.value}</span>
        <span class="voltage-unit">V</span>
      </div>

      <div class="stage-bottom">
        <div class="stage-countdown-label">${t("LABEL_TIMELEFT")}</div>

        <div class="stage-countdown">
          ${pad(info.timer.minute)}:${pad(info.timer.second)}
        </div>
      </div>
    `;

    stagePanel.appendChild(div);
  }
}


/* =========================================================
   BUILD CONFIG
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


/* =========================================================
   SYNC STATE
========================================================= */

socket.on("electro:state", (state) => {

  if (!state) return;

  const stages = getStages();

  if (state.isRunning) {

    setRunning(state.currentIndex);

    stages.forEach((el, i) => {

      const countdownEl = el.querySelector(".stage-countdown");
      if (!countdownEl) return;

      if (i < state.currentIndex) {
        countdownEl.textContent = "00:00";
      }
      else if (i === state.currentIndex) {
        countdownEl.textContent = formatTime(state.remaining);
      }
    });

    return;
  }

  if (!state.isRunning && state.currentIndex === -1) {

    const stageConfig = buildStageConfigFromJson(stageData);
    socket.emit("electro:start", stageConfig);
    return;
  }

  if (!state.isRunning && state.currentIndex >= state.stages.length) {

    setRunning(state.stages.length);

    stages.forEach((el) => {
      const countdownEl = el.querySelector(".stage-countdown");
      if (countdownEl) countdownEl.textContent = "00:00";
    });
  }

});


/* =========================================================
   REALTIME EVENTS
========================================================= */

socket.on("electro:stageStart", (data) => {
  setRunning(data.index);
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


/* =========================================================
   FINISHED EVENT
========================================================= */

socket.on("electro:finished", () => {

  console.log("[CLIENT] Process finished");

  isFinished = true;

  /* STOP CAMERA */
  if (isCameraRunning) {
    socket.emit("camera:stop");
    isCameraRunning = false;
  }

  /* SHOW COMPLETED */
  const completedDiv = document.createElement("div");
  completedDiv.id = "processCompleted";
  completedDiv.innerText = t("LABEL_COMPLETED");
  completedDiv.style.position = "fixed";
  completedDiv.style.top = "50%";
  completedDiv.style.left = "50%";
  completedDiv.style.transform = "translate(-50%, -50%)";
  completedDiv.style.fontSize = "48px";
  completedDiv.style.fontWeight = "bold";
  completedDiv.style.color = "#00ff88";
  completedDiv.style.zIndex = "9999";
  completedDiv.style.background = "rgba(0,0,0,0.7)";
  completedDiv.style.padding = "30px 60px";
  completedDiv.style.borderRadius = "12px";

  document.body.appendChild(completedDiv);

  /* CHANGE BUTTON */
  if (btnStop) {
    btnStop.innerText = t("BUTTON_FINISH");
    btnStop.classList.remove("stop-button");
    btnStop.classList.add("finish-button");
  }

});


/* =========================================================
   CAMERA CONTROL
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



// document.addEventListener("visibilitychange", () => {
//   if (document.hidden) {
//     if (isCameraRunning) {
//       socket.emit("camera:stop");
//       isCameraRunning = false;
//     }
//   } else {
//     if (!isCameraRunning) {
//       socket.emit("camera:start");
//       isCameraRunning = true;
//     }
//   }
// });


/* =========================================================
   STOP / FINISH BUTTON
========================================================= */

if (btnStop) {

  btnStop.addEventListener("click", () => {

    if (isFinished) {

      if (!confirm(t("ALERT_FINISH"))) return;

      window.location.href = "../index.html";
      return;
    }

    if (!confirm(t("ALERT_STOP"))) return;

    socket.emit("electro:stop");

    setTimeout(() => {
      window.location.href = "../index.html";
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