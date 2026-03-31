/* ================= GLOBAL ================= */
window.socket = io();

let sampleSelectList = [];
let samplefile_create_direct = null;

/* ================= SOCKET EVENTS ================= */

socket.on("jsonKeyValue", (res) => {
  if (res.error) {
    console.error("ERROR:", res.error);
    return;
  }
  samplefile_create_direct = res.value;
});

socket.on("sample_file_list", (files) => {
  renderFileGrid(files);
});

/* ================= WELL GRID ================= */

function initWellGrid(rows, cols) {
  const rowLabels = ["A","B","C","D","E","F","G","H"];

  const wellGrid = document.getElementById("wellGrid");
  const sampleName = document.getElementById("sampleName");
  const selectedWell = document.getElementById("selectedWell");
  const saveBtn = document.getElementById("saveBtn");

  /* ===== CREATE GRID ===== */
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

  /* ===== GET WELLS ===== */
  const wells = [];
  for (let c = 1; c <= cols; c++) {
    for (let r = 0; r < rows; r++) {
      wells.push(
        document.querySelector(`.well[data-pos="${rowLabels[r]}${c}"]`)
      );
    }
  }

  /* ===== STATE ===== */
  let currentIndex = 0;
  let selectedWells = [];
  let quickSetCounter = 1;

  let isMouseDown = false;
  let isTouching = false;

  function selectWell(index) {
    wells.forEach(w => w.classList.remove("active"));

    if (index < wells.length) {
      wells[index].classList.add("active");
      selectedWell.textContent = wells[index].dataset.pos;
    }
  }

  selectWell(currentIndex);

  /* =========================================================
     PC (MOUSE)
  ========================================================= */
  wells.forEach(well => {

    well.addEventListener("mousedown", () => {
      isMouseDown = true;
      selectedWells = [well];

      wells.forEach(w => w.classList.remove("active"));
      well.classList.add("active");
    });

    well.addEventListener("mouseover", () => {
      if (!isMouseDown) return;

      if (!selectedWells.includes(well)) {
        selectedWells.push(well);
        well.classList.add("active");
      }
    });

    well.addEventListener("mouseup", () => {
      isMouseDown = false;
    });

    /* CLICK */
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
    isMouseDown = false;
  });

  /* =========================================================
     MOBILE (TOUCH)
  ========================================================= */

  function getWellFromTouch(touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    return el?.closest(".well");
  }

  wells.forEach(well => {
    well.addEventListener("touchstart", (e) => {
      e.preventDefault();

      isTouching = true;
      selectedWells = [well];

      currentIndex = wells.indexOf(well);

      wells.forEach(w => w.classList.remove("active"));
      well.classList.add("active");
      
      // update UI giống PC
      selectedWell.textContent = well.dataset.pos;

      sampleName.value = well.classList.contains("filled")
        ? well.textContent
        : "";

    }, { passive: false });
  });

  document.addEventListener("touchmove", (e) => {
    if (!isTouching) return;

    const touch = e.touches[0];
    const well = getWellFromTouch(touch);

    if (well && !selectedWells.includes(well)) {
      selectedWells.push(well);
      well.classList.add("active");
    }
  }, { passive: false });

  document.addEventListener("touchend", () => {
    isTouching = false;
  });

  /* =========================================================
     INPUT
  ========================================================= */

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

  /* ===== SET ===== */
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

  /* ===== QUICK SET ===== */
  document.getElementById("quickSetBtn").addEventListener("click", () => {
    let target;

    if (selectedWells.length > 0) {
      target = selectedWells.slice().sort((a, b) => {

        const rowA = a.dataset.pos.charCodeAt(0); // A,B,C,D
        const colA = parseInt(a.dataset.pos.slice(1));

        const rowB = b.dataset.pos.charCodeAt(0);
        const colB = parseInt(b.dataset.pos.slice(1));

        // SORT THEO CỘT TRƯỚC, RỒI TỚI HÀNG
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

  /* ===== CLEAR ===== */
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

  /* ===== SAVE ===== */
  saveBtn.addEventListener("click", () => {
    const filledWells = wells.filter(w => w.classList.contains("filled"));

    if (filledWells.length === 0) {
      alert(t("ALERT_WELLNAME_MISSING"));
      return;
    }

    const fileName = prompt(t("ALERT_ENTER_FILENAME"));
    if (!fileName) return;

    const resultData = wells.map(w =>
      w.classList.contains("filled") ? w.textContent : ""
    );

    socket.emit("save_wells_excel", {
      fileName,
      resultData,
      resultCellStart: 1
    });

    const confirmBack = confirm(t("ALERT_CREATEFILE_DONE"));

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

  socket.emit("readExcelFile", {
    filePath: `/home/pi/Spotcheck/Sample_Files/${fileName}`,
    startCell: "B5",
    count: 16
  });
}

/* ================= MAIN ================= */

document.addEventListener("DOMContentLoaded", () => {

  initWellGrid(4, 4);

  document.getElementById("delete-btn").addEventListener("click", () => {
    if (sampleSelectList.length === 0) {
      alert(t("ALERT_DELETEFILE_MISSING"));
      return;
    }

    if (!confirm(t("ALERT_DELETE_FILE"))) return;

    socket.emit("delete_selected_samplefile", sampleSelectList);
  });

  socket.on("delete_selected_done", () => {
    sampleSelectList = [];
    socket.emit("scan_sample_files");
    document.getElementById("clearBtn").click();
  });

  document.getElementById("deleteall-btn").addEventListener("click", () => {
    if (!confirm(t("ALERT_DELETEALL_FILE"))) return;
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

      if (!val || val === "N/A") {
        well.classList.remove("filled");
      } else {
        well.classList.add("filled");
      }

      well.classList.remove("active");
    });
  });

  document.getElementById("btnBack").addEventListener("click", () => {
    if (samplefile_create_direct == 0) {
      goToPage("../index.html");
    } else {
      goToPage("../Sample_Selection/sample_selection.html");
    }
  });

  socket.emit("scan_sample_files");

  socket.emit("readJsonKey", {
    filePath: globalvar_tmp_path,
    key: "samplefile_create_direct"
  });
});
