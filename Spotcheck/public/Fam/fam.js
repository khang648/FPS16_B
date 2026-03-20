window.socket = io();

const checkBtn = document.getElementById("check-btn");

/* ================= GLOBAL STATE ================= */
let allWells = [];
let hasResult = false;

/* ================= RESET RESULT ================= */
function resetAllWellsResult() {
  allWells.forEach((well) => {
    well.textContent = "#";
    well.classList.remove("green", "pink", "orange", "red");
  });

  const img = document.getElementById("resultImage");
  if (img) img.src = "";

  hasResult = false;
}

/* ================= WELL TOGGLE ================= */
function handleWellToggle(well) {
  if (hasResult) {
    resetAllWellsResult();
  }
  well.classList.toggle("filled");
}

/* ================= WELL GRID INIT ================= */
function initWellGrid(rows, cols) {
  const rowLabels = ["A", "B", "C", "D"];
  const wellGrid = document.getElementById("wellGrid");

  wellGrid.innerHTML = "";
  allWells = [];

  for (let r = 0; r < rows; r++) {
    const tr = document.createElement("tr");

    for (let c = 0; c < cols; c++) {
      const td = document.createElement("td");
      const div = document.createElement("div");

      const index = c * rows + r;

      div.classList.add("well");
      div.dataset.row = r;
      div.dataset.col = c;
      div.dataset.index = index;
      div.dataset.pos = `${rowLabels[r]}${c + 1}`;
      div.textContent = "#";

      div.addEventListener("click", () => {
        handleWellToggle(div);
      });

      td.appendChild(div);
      tr.appendChild(td);

      allWells[index] = div;
    }

    wellGrid.appendChild(tr);
  }
}

/* ================= CONTROL BUTTONS ================= */
function selectAllWells() {
  if (hasResult) resetAllWellsResult();
  allWells.forEach((well) => well.classList.add("filled"));
}

function deselectAllWells() {
  if (hasResult) resetAllWellsResult();
  allWells.forEach((well) => well.classList.remove("filled"));
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  initWellGrid(4, 4);

  document
    .getElementById("selectall-btn")
    .addEventListener("click", selectAllWells);

  document
    .getElementById("deselectall-btn")
    .addEventListener("click", deselectAllWells);

  checkBtn.addEventListener("click", () => {
    const selectedCount = allWells.filter((w) =>
      w.classList.contains("filled")
    ).length;

    if (selectedCount === 0) {
      alert(t("ALERT_WELL_MISSING"));
      return;
    }

    const img = document.getElementById("resultImage");
    if (img) img.src = "";

    const samplename_data = allWells.map((well) =>
      well.classList.contains("filled") ? "FAM" : "N/A"
    );

    socket.emit("writeJsonFile", {
      filePath: globalvar_tmp_path,
      data: {
        samplename_list: samplename_data
      }
    });

    checkBtn.textContent = t("LABEL_PROCESSING");
    checkBtn.disabled = true;

    socket.emit("fam_check");

    console.log("Sample list:", samplename_data);
  });

  document.getElementById("btnBack").addEventListener("click", () => {
    goToPage("../index.html");
  });
});

/* ================= SOCKET EVENT ================= */
socket.on("famcheck_done", (data) => {
  const img = document.getElementById("resultImage");
  img.src = `data:image/jpeg;base64,${data.image}`;

  const values = data.screening_list || [];

  const t1 = Number(data.fam_threshole_1);
  const t2 = Number(data.fam_threshole_2);
  const t3 = Number(data.fam_threshole_3);

  allWells.forEach((well, index) => {
    const rawValue = values[index];
    if (rawValue === "N/A" || rawValue === undefined) {
      return;
    }

    const value = Number(rawValue);
    if (isNaN(value)) return;

    well.textContent = value;
    well.classList.remove("green", "pink", "orange", "red");

    if (value <= t1) {
      well.classList.add("green");
    } else if (value <= t2) {
      well.classList.add("pink");
    } else if (value <= t3) {
      well.classList.add("orange");
    } else {
      well.classList.add("red");
    }
  });

  hasResult = true;

  checkBtn.textContent = t("BUTTON_CHECK");
  checkBtn.disabled = false;

  console.log("Value received:", values);
});
