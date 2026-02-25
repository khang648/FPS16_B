/* ================= GLOBAL SOCKET ================= */
window.socket = io();

const parameters_path = "/home/pi/VE100/parameters.json";

document.addEventListener("DOMContentLoaded", () => {

  const stageContainer = document.getElementById("stageContainer");
  const stageCountInput = document.getElementById("stageCount");
  const saveBtn = document.getElementById("saveBtn");
  const MAX_STAGE = 5;

  // yêu cầu server gửi parameters.json
  socket.emit("loadJsonFile", "parameters.json");

  socket.on("writeResult", (res) => {

    if (res.success) {
      alert("🟢 Parameters saved successfully!");
    } else {
      alert("🔴 Save failed: " + res.error);
    }
  });

  socket.on("jsonData", (data) => {

    // Nếu file không tồn tại hoặc lỗi → giữ default
    if (data.error) {
      console.warn("Load parameters failed:", data.error);
      return;
    }

    if (!data.stage_count || !data.stages) return;

    // Set stage count
    const stageCountInput = document.getElementById("stageCount");
    stageCountInput.value = data.stage_count;

    // Trigger lại logic ẩn/hiện stage
    stageCountInput.dispatchEvent(new Event("change"));

    // Set từng stage
    for (let i = 1; i <= 5; i++) {

      const stageData = data.stages[`stage_${i}`];
      if (!stageData) continue;

      const stageBox = document.querySelector(`.stage-box[data-stage="${i}"]`);
      if (!stageBox) continue;

      const voltageInput = stageBox.querySelector(".voltage-input");
      const minInput = stageBox.querySelector(".min-input");
      const secInput = stageBox.querySelector(".sec-input");
      const toggleBtn = stageBox.querySelector(".toggle-btn");

      // --- Set voltage value
      voltageInput.value = stageData.voltage?.value ?? 0;

      // --- Set timer
      minInput.value = stageData.timer?.minute ?? 0;
      secInput.value = stageData.timer?.second ?? 0;

      // --- Set trạng thái voltage enable/disable
      if (stageData.voltage?.enabled === false) {

        voltageInput.disabled = true;
        voltageInput.value = 0;

        voltageInput.classList.add("disabled-input");
        toggleBtn.textContent = "Turn On";
        toggleBtn.dataset.state = "off";

      } else {

        voltageInput.disabled = false;
        voltageInput.classList.remove("disabled-input");
        toggleBtn.textContent = "Turn Off";
        toggleBtn.dataset.state = "on";
      }
    }

    console.log("Parameters loaded successfully");

  });

  /* =============================
     Clone Stage 2–5
  ============================== */
  const firstStage = document.querySelector(".stage-box");

  for (let i = 2; i <= MAX_STAGE; i++) {
    const clone = firstStage.cloneNode(true);
    clone.setAttribute("data-stage", i);
    clone.querySelector(".stage-title").innerText = `Stage ${i}`;
    stageContainer.appendChild(clone);
  }

  const stageBoxes = document.querySelectorAll(".stage-box");

  /* =============================
     Stage Enable/Disable
  ============================== */
  function updateStageVisibility() {
    const count = parseInt(stageCountInput.value);

    stageBoxes.forEach((box, index) => {
      if (index < count) {
        box.classList.remove("disabled");
      } else {
        box.classList.add("disabled");
      }
    });
  }

  stageCountInput.addEventListener("input", updateStageVisibility);
  updateStageVisibility();

  /* =============================
     Voltage Toggle
  ============================== */
  function initToggle(btn) {
    const input = btn.parentElement.querySelector(".voltage-input");

    input.disabled = true;

    btn.addEventListener("click", () => {

      if (btn.dataset.state === "off") {
        btn.dataset.state = "on";
        btn.innerText = "Turn OFF";
        input.disabled = false;
      } else {
        btn.dataset.state = "off";
        btn.innerText = "Turn ON";
        input.value = 0;
        input.disabled = true;
      }
    });
  }

  document.querySelectorAll(".toggle-btn").forEach(initToggle);

  /* =============================
     SAVE
  ============================== */
  saveBtn.addEventListener("click", () => {

    const saveBtn = document.getElementById("saveBtn");
    const stageCountInput = document.getElementById("stageCount");

    saveBtn.addEventListener("click", () => {

      if (!confirm("Save Setting?")) return;

      const stage_count = parseInt(stageCountInput.value);
      const stages = {};

      for (let i = 1; i <= 5; i++) {

        const stageBox = document.querySelector(`.stage-box[data-stage="${i}"]`);
        if (!stageBox) continue;

        const voltageInput = stageBox.querySelector(".voltage-input");
        const minInput = stageBox.querySelector(".min-input");
        const secInput = stageBox.querySelector(".sec-input");

        const voltage_enabled = !voltageInput.disabled;

        const voltage = parseInt(voltageInput.value) || 0;
        const minute = parseInt(minInput.value) || 0;
        const second = parseInt(secInput.value) || 0;

        stages[`stage_${i}`] = {
          voltage: {
            value: voltage,
            enabled: voltage_enabled
          },
          timer: {
            minute: minute,
            second: second
          }
        };
      }

      const dataToSave = {
        stage_count: stage_count,
        stages: stages
      };

      

      socket.emit("writeJsonFile", {
        filePath: parameters_path,
        data: dataToSave
      });

    });
  });

  /* =============================
     NEXT
  ============================== */
  nextBtn.addEventListener("click", () => {

    const saveBtn = document.getElementById("saveBtn");
    const stageCountInput = document.getElementById("stageCount");

    saveBtn.addEventListener("click", () => {

      if (!confirm("Save Setting?")) return;

      const stage_count = parseInt(stageCountInput.value);
      const stages = {};

      for (let i = 1; i <= 5; i++) {

        const stageBox = document.querySelector(`.stage-box[data-stage="${i}"]`);
        if (!stageBox) continue;

        const voltageInput = stageBox.querySelector(".voltage-input");
        const minInput = stageBox.querySelector(".min-input");
        const secInput = stageBox.querySelector(".sec-input");

        const voltage_enabled = !voltageInput.disabled;

        const voltage = parseInt(voltageInput.value) || 0;
        const minute = parseInt(minInput.value) || 0;
        const second = parseInt(secInput.value) || 0;

        stages[`stage_${i}`] = {
          voltage: {
            value: voltage,
            enabled: voltage_enabled
          },
          timer: {
            minute: minute,
            second: second
          }
        };
      }

      const dataToSave = {
        stage_count: stage_count,
        stages: stages
      };

      socket.emit("writeJsonFile", {
        filePath: globalvar_tmp_path,
        data: dataToSave
      });

      goToPage("./Electrophoresis/electrophoresis.html");

    });
  });

});
