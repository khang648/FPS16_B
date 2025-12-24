/* ================= GLOBAL ================= */
window.socket = io();

let sampleSelectList = [];
let samplefile_create_direct = null;

/* ================= SOCKET EVENTS ================= */

// Nhận dữ liệu JSON key-value
socket.on("jsonKeyValue", (res) => {
  if (res.error) {
    console.error("ERROR:", res.error);
    return;
  }

  samplefile_create_direct = res.value;
});

// Nhận danh sách sample file
socket.on("sample_file_list", (files) => {
  renderFileGrid(files);
});

/* ================= WELL GRID ================= */

function initWellGrid(rows, cols) {
  const rowLabels = ["A","B","C","D","E","F","G","H","I","J","K","L"];
  const wellGrid = document.getElementById("wellGrid");
  const sampleName = document.getElementById("sampleName");
  const selectedWell = document.getElementById("selectedWell");
  const saveBtn = document.getElementById("saveBtn");

  for (let r = 0; r < rows; r++) {
    const tr = document.createElement("tr");

    for (let c = 1; c <= cols; c++) {
      const td = document.createElement("td");
      const div = document.createElement("div");

      div.classList.add("well");
      div.dataset.pos = `${rowLabels[r]}${c}`;
      div.textContent = "N/A";

      td.appendChild(div);
      tr.appendChild(td);
    }

    wellGrid.appendChild(tr);
  }

  const wells = [];
  for (let c = 1; c <= cols; c++) {
    for (let r = 0; r < rows; r++) {
      wells.push(
        document.querySelector(`.well[data-pos="${rowLabels[r]}${c}"]`)
      );
    }
  }

  let currentIndex = 0;
  let selecting = false;
  let selectedWells = [];
  let quickSetCounter = 1;

  function selectWell(index) {
    wells.forEach(w => w.classList.remove("active"));
    if (index < wells.length) {
      wells[index].classList.add("active");
      selectedWell.textContent = wells[index].dataset.pos;
    }
  }

  selectWell(currentIndex);

  wells.forEach(well => {
    well.addEventListener("mousedown", () => {
      selecting = true;
      selectedWells = [well];
      wells.forEach(w => w.classList.remove("active"));
      well.classList.add("active");
    });

    well.addEventListener("mouseover", () => {
      if (selecting && !selectedWells.includes(well)) {
        selectedWells.push(well);
        well.classList.add("active");
      }
    });

    well.addEventListener("mouseup", () => {
      selecting = false;
    });

    well.addEventListener("click", () => {
      currentIndex = wells.indexOf(well);
      selectWell(currentIndex);

      sampleName.value = well.classList.contains("filled")
        ? well.textContent
        : "";
      sampleName.focus();
    });
  });

  document.addEventListener("mouseup", () => {
    selecting = false;
  });

  sampleName.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    const val = sampleName.value.trim();
    const well = wells[currentIndex];

    if (val !== "") {
      well.textContent = val;
      well.classList.add("filled");
    } else {
      well.textContent = "N/A";
      well.classList.remove("filled");
    }

    currentIndex = (currentIndex + 1) % wells.length;
    selectWell(currentIndex);

    const nextWell = wells[currentIndex];
    sampleName.value = nextWell.classList.contains("filled")
      ? nextWell.textContent
      : "";
  });

  document.getElementById("setBtn").addEventListener("click", () => {
    const val = sampleName.value.trim();
    const well = wells[currentIndex];

    if (val !== "") {
      well.textContent = val;
      well.classList.add("filled");
    } else {
      well.textContent = "N/A";
      well.classList.remove("filled");
    }
  });

  document.getElementById("quickSetBtn").addEventListener("click", () => {
    let target;

    if (selectedWells.length > 0) {
      target = selectedWells.slice().sort((a, b) => {
        const [rowA, colA] = [
          a.dataset.pos.charCodeAt(0),
          parseInt(a.dataset.pos.slice(1))
        ];
        const [rowB, colB] = [
          b.dataset.pos.charCodeAt(0),
          parseInt(b.dataset.pos.slice(1))
        ];
        return colA - colB || rowA - rowB;
      });
    } else {
      target = wells;
    }

    target.forEach(w => {
      w.textContent = "Sample " + quickSetCounter++;
      w.classList.add("filled");
      w.classList.remove("active");
    });

    selectedWells = [];
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    wells.forEach(w => {
      w.textContent = "N/A";
      w.classList.remove("filled");
      w.classList.remove("active");
    });

    sampleName.value = "";
    currentIndex = 0;
    selectedWells = [];
    quickSetCounter = 1;

    selectWell(currentIndex);
  });

  saveBtn.addEventListener("click", () => {
    const filledWells = wells.filter(w => w.classList.contains("filled"));
    if (filledWells.length === 0) {
      alert("🟡 You must enter at least one well name before saving!");
      return;
    }

    const fileName = prompt("Enter filename to save Excel:");
    if (!fileName) return;

    const resultData = wells.map(w =>
      w.classList.contains("filled") ? w.textContent : ""
    );

    const RESULT_CELL_START = 1;

    socket.emit("save_wells_excel", {
      fileName,
      resultData,
      resultCellStart: RESULT_CELL_START
    });

    const confirmBack = confirm(
      "File has been created.\nDo you want to go back?"
    );

    if (confirmBack) {
      if (samplefile_create_direct == 0) {
        goToPage("../index.html");
      } else {
        goToPage("../Sample_Selection/sample_selection.html");
      }
    } else {
      location.reload();
    }
  });
}

/* ================= FILE GRID ================= */

function renderFileGrid(folders) {
  const grid = document.getElementById("result-grid");
  grid.innerHTML = "";

  folders.forEach(folder => {
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

function toggleSelect(item) {
  const fileName = item.dataset.folder;

  document.querySelectorAll(".result-item.selected").forEach(el => {
    el.classList.remove("selected");
  });

  item.classList.add("selected");
  sampleSelectList = [fileName];

  console.log("[Client] Auto-load sample file:", fileName);

  socket.emit("readExcelFile", {
    filePath: `/home/pi/Spotcheck/Sample_Files/${fileName}`,
    startCell: "B5",
    count: NUMBER_OF_WELLS
  });
}

/* ================= MAIN EXECUTION ================= */

document.addEventListener("DOMContentLoaded", () => {
  initWellGrid(4, 4);

  document.querySelector(".delete-btn").addEventListener("click", () => {
    if (sampleSelectList.length === 0) {
      alert("🟡 You have not selected any file to delete");
      return;
    }

    if (!confirm(`Delete ${sampleSelectList.length} selected file ?`)) return;

    socket.emit("delete_selected_samplefile", sampleSelectList);
  });

  socket.on("delete_selected_done", () => {
    sampleSelectList = [];
    socket.emit("scan_sample_files");
    document.getElementById("clearBtn").click();
  });

  document.querySelector(".deleteall-btn").addEventListener("click", () => {
    if (!confirm("Are you sure you want to delete ALL files?")) return;
    socket.emit("delete_all_samplefile");
  });

  socket.on("delete_all_done", () => {
    sampleSelectList = [];
    socket.emit("scan_sample_files");
    document.getElementById("clearBtn").click();
  });

  socket.on("excelData", (values) => {
    if (!Array.isArray(values) || values.length !== 16) {
      alert("🔴 Invalid sample data received!");
      return;
    }

    const rowLabels = ["A", "B", "C", "D"];
    const wells = [];

    for (let c = 1; c <= 4; c++) {
      for (let r = 0; r < 4; r++) {
        wells.push(
          document.querySelector(`.well[data-pos="${rowLabels[r]}${c}"]`)
        );
      }
    }

    wells.forEach((well, idx) => {
      const val = values[idx];
      well.textContent = val;

      if (val === "N/A" || val === null || val === undefined) {
        well.classList.remove("filled");
      } else {
        well.classList.add("filled");
      }

      well.classList.remove("active");
    });
  });

  btnBack.addEventListener("click", goBackPage);

  function goBackPage() {
    if (samplefile_create_direct == 0) {
      goToPage("../index.html");
    } else {
      goToPage("../Sample_Selection/sample_selection.html");
    }
  }

  socket.emit("scan_sample_files");

  socket.emit("readJsonKey", {
    filePath: globalvar_tmp_path,
    key: "samplefile_create_direct"
  });
});
