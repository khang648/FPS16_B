window.socket = io();

/* ================= GLOBAL ================= */
const emailDialog = document.getElementById("email-dialog");
const emailInput = document.getElementById("email-input");
const btnEmailCancel = document.getElementById("email-cancel");
const btnEmailOk = document.getElementById("email-ok");

let samplename_data = [];
let automail = 0;
let selectedSampleFile = "";

let samplefile_create_direct = null;

/* ===== FIX RACE CONDITION ===== */
let pendingFiles = null;

/* ===== DRAG STATE ===== */
let isSelecting = false;

/* ================= SOCKET EVENTS ================= */

// Receive sample file list
socket.on("sample_file_list", (files) => {
  pendingFiles = files;
  tryRender();
});

// Receive Excel data
socket.on("excelData", (values) => {
  samplename_data = values;
  applyExcelValues(samplename_data);
});

// Receive JSON values
socket.on("jsonKeyValue", (res) => {
  if (res.error) {
    console.error("ERROR:", res.error);
    return;
  }

  if (res.key === "email") {
    automail = res.value;
    console.log("automail:", automail);
  }

  if (res.key === "samplefile_create_direct") {
    samplefile_create_direct = res.value;
    console.log("samplefile_create_direct:", samplefile_create_direct);
  }

  tryRender();
});

/* ================= FIX: WAIT BOTH ================= */

function tryRender() {
  if (!pendingFiles) return;
  if (samplefile_create_direct === null) return;

  renderFileGrid(pendingFiles);

  if (samplefile_create_direct == 1) {
    const firstItem = document.querySelector(".result-item");

    if (firstItem) {
      console.log("[AUTO] Select first file");
      toggleSelect(firstItem);

      socket.emit("writeJsonFile", {
        filePath: globalvar_tmp_path,
        data: { samplefile_create_direct: 0 }
      });

      samplefile_create_direct = 0;
    }
  }

  pendingFiles = null;
}

/* ================= FILE GRID ================= */

function renderFileGrid(folders) {
  const grid = document.getElementById("result-grid");
  grid.innerHTML = "";

  folders.forEach((folder) => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.dataset.folder = folder.name;

    item.innerHTML = `
      <div class="folder-icon">
        <i class="fa-solid fa-file-excel"></i>
      </div>
      <div class="folder-name">${folder.name}</div>
    `;

    item.addEventListener("click", () => toggleSelect(item));
    grid.appendChild(item);
  });
}

// Toggle select file
function toggleSelect(item) {
  const fileName = item.dataset.folder;

  document.querySelectorAll(".result-item.selected").forEach((el) => {
    el.classList.remove("selected");
  });

  item.classList.add("selected");
  selectedSampleFile = fileName;

  console.log("[Client] Auto-load sample file:", fileName);

  socket.emit("readExcelFile", {
    filePath: `/home/pi/Spotcheck/Sample_Files/${fileName}`,
    startCell: "B5",
    count: NUMBER_OF_WELLS
  });
}

/* ================= WELL DATA ================= */

function collectWellsState() {
  let result = {};

  for (let r = 0; r < NUMBER_OF_ROWS; r++) {
    for (let c = 0; c < NUMBER_OF_COLUMNS; c++) {
      const id = `${rowLabels[r]}${c + 1}`;
      const well = document.querySelector(`.well[data-pos="${id}"]`);
      result[id] = { active: well.classList.contains("active") };
    }
  }

  return result;
}

function collectWellValues() {
  const result = [];
  const rowLabels = ["A", "B", "C", "D"];

  for (let c = 1; c <= 4; c++) {
    for (let r = 0; r < 4; r++) {
      const id = `${rowLabels[r]}${c}`;
      const well = document.querySelector(`.well[data-pos="${id}"]`);
      result.push(well.textContent.trim());
    }
  }

  return result;
}

function applyExcelValues(values) {
  if (!values || values.length !== 16) return;

  const rowLabels = ["A", "B", "C", "D"];
  let idx = 0;

  for (let c = 1; c <= 4; c++) {
    for (let r = 0; r < 4; r++) {
      const id = `${rowLabels[r]}${c}`;
      const well = document.querySelector(`.well[data-pos="${id}"]`);
      const val = values[idx];

      well.textContent = val !== null ? val : "#";
      well.classList.remove("filled", "na");

      if (val === "N/A") {
        well.classList.add("na");
      } else if (val !== null && val !== "") {
        well.classList.add("filled");
      }

      idx++;
    }
  }
}

/* ================= WELL EVENTS ================= */

function activateWell(id) {
  const el = document.querySelector(`.well[data-pos="${id}"]`);
  if (!el.classList.contains("active")) {
    el.classList.add("active");
  }
}

function onWellClicked(id) {
  const el = document.querySelector(`.well[data-pos="${id}"]`);
  el.classList.toggle("active");
}

/* ================= EMAIL ================= */

function showEmailDialog() {
  emailInput.value = "";
  emailDialog.style.display = "flex";
}

function hideEmailDialog() {
  emailDialog.style.display = "none";
}

/* ================= MAIN ================= */

document.addEventListener("DOMContentLoaded", () => {
  socket.emit("scan_sample_files");

  socket.emit("readJsonKey", {
    filePath: globalvar_tmp_path,
    key: "email"
  });

  socket.emit("readJsonKey", {
    filePath: globalvar_tmp_path,
    key: "samplefile_create_direct"
  });

  const wellGrid = document.getElementById("wellGrid");
  const rowLabels = ["A", "B", "C", "D"];
  wellGrid.innerHTML = "";

  for (let r = 0; r < NUMBER_OF_ROWS; r++) {
    const row = document.createElement("tr");

    const rowLabel = document.createElement("th");
    rowLabel.textContent = rowLabels[r];
    row.appendChild(rowLabel);

    for (let c = 1; c <= NUMBER_OF_COLUMNS; c++) {
      const td = document.createElement("td");
      const div = document.createElement("div");
      div.classList.add("well");
      div.dataset.pos = `${rowLabels[r]}${c}`;
      div.textContent = "#";
      td.appendChild(div);
      row.appendChild(td);
    }

    wellGrid.appendChild(row);
  }

  /* EVENTS giữ nguyên */
  for (let r = 0; r < NUMBER_OF_ROWS; r++) {
    for (let c = 0; c < NUMBER_OF_COLUMNS; c++) {
      const id = `${rowLabels[r]}${c + 1}`;
      const well = document.querySelector(`.well[data-pos="${id}"]`);

      well.addEventListener("mousedown", () => {
        isSelecting = true;
        activateWell(id);
      });

      well.addEventListener("mouseover", () => {
        if (isSelecting) activateWell(id);
      });

      well.addEventListener("touchstart", (e) => {
        e.preventDefault();
        isSelecting = true;
        activateWell(id);
      }, { passive: false });

      well.addEventListener("touchmove", (e) => {
        e.preventDefault();

        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);

        if (el && el.classList.contains("well")) {
          activateWell(el.dataset.pos);
        }
      }, { passive: false });

      well.addEventListener("click", () => onWellClicked(id));
    }
  }

  document.addEventListener("mouseup", () => isSelecting = false);
  document.addEventListener("touchend", () => isSelecting = false);

  document.addEventListener("contextmenu", (e) => e.preventDefault());

  btnEmailCancel.addEventListener("click", hideEmailDialog);

  btnEmailOk.addEventListener("click", () => {
    const emails = emailInput.value.trim();

    if (!emails) {
      alert("🟡 Please enter at least one email address");
      return;
    }

    socket.emit("writeJsonFile", {
      filePath: globalvar_tmp_path,
      data: {
        automail: 1,
        recipient: emails
      }
    });

    hideEmailDialog();
    goToAnalysisWithConfirm();
  });

  document.getElementById("btnCreate")?.addEventListener("click", () => {
    socket.emit("writeJsonFile", {
      filePath: globalvar_tmp_path,
      data: {
        samplefile_create_direct: 1
      }
    });

    goToPage("../Sample_Setting/sample_setting.html");
  });

  document.getElementById("btnBack")?.addEventListener("click", () => {
    goToPage("../Kit_Selection/kit_selection.html");
  });

  document.getElementById("btnNext")?.addEventListener("click", () => {
    if (!selectedSampleFile) {
      alert(t("ALERT_SAMPLEFILE_MISSING"));
      return;
    }

    const fileNoExt = selectedSampleFile.replace(/\.xlsx$/i, "");

    socket.emit("writeJsonFile", {
      filePath: globalvar_tmp_path,
      data: {
        samplename_list: samplename_data,
        samplefile_name: fileNoExt
      }
    });

    if (automail) {
      const ask = confirm(t("ALERT_AUTOEMAIL"));
      if (!ask) {
        goToAnalysisWithConfirm();
        return;
      }
      showEmailDialog();
    } else {
      goToAnalysisWithConfirm();
    }
  });
});

function goToAnalysisWithConfirm() {
  const ok = confirm(t("ALERT_PLACE_SAMPLE"));
  if (ok) {
    goToPage("../Analysis/analysis.html");
  }
}