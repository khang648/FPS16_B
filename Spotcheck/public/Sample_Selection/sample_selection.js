window.socket = io();

/* ================= GLOBAL ================= */
const emailDialog = document.getElementById("email-dialog");
const emailInput = document.getElementById("email-input");
const btnEmailCancel = document.getElementById("email-cancel");
const btnEmailOk = document.getElementById("email-ok");

let samplename_data = [];
let automail = 0;
let selectedSampleFile = "";

/* ================= SOCKET EVENTS ================= */

// Receive sample file list
socket.on("sample_file_list", (files) => {
  renderFileGrid(files);
});

// Receive email login info
socket.on("jsonKeyValue", (res) => {
  if (res.error) {
    console.error("ERROR:", res.error);
    return;
  }

  automail = res.value;
  console.log("automail:", automail);
});

// Receive Excel data
socket.on("excelData", (values) => {
  samplename_data = values;
  applyExcelValues(samplename_data);
});

/* ================= FILE GRID ================= */

// Render file grid
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

// Collect well state
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

// Collect well values
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

// Apply Excel values
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

// Well clicked
function onWellClicked(id) {
  const el = document.querySelector(`.well[data-pos="${id}"]`);
  el.classList.toggle("active");
}

/* ================= EMAIL DIALOG ================= */

function showEmailDialog() {
  emailInput.value = "";
  emailDialog.style.display = "flex";
}

function hideEmailDialog() {
  emailDialog.style.display = "none";
}

/* ================= MAIN EXECUTION ================= */

document.addEventListener("DOMContentLoaded", () => {
  socket.emit("scan_sample_files");

  socket.emit("readJsonKey", {
    filePath: globalvar_tmp_path,
    key: "email"
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

  for (let r = 0; r < NUMBER_OF_ROWS; r++) {
    for (let c = 0; c < NUMBER_OF_COLUMNS; c++) {
      const id = `${rowLabels[r]}${c + 1}`;
      const well = document.querySelector(`.well[data-pos="${id}"]`);
      well.addEventListener("click", () => onWellClicked(id));
    }
  }

  btnEmailCancel.addEventListener("click", () => {
    hideEmailDialog();
  });

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
    goToPage("../Analysis/analysis.html");
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
      alert("🟡 Please select a sample file first");
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
      const ask = confirm("Do you want to automatically send the result file by email?");
      if (!ask) {
        goToPage("../Analysis/analysis.html");
        return;
      }
      showEmailDialog();
    } else {
      goToPage("../Analysis/analysis.html");
    }
  });
});
