window.socket = io();

let kitSelectList = [];

/* ================= SAVE FILE ================= */
function Save_Clicked() {
  const kitName = document.getElementById("kitName").value.trim();
  const nLow  = Number(document.getElementById("nLow").value.trim());
  const nHigh = Number(document.getElementById("nHigh").value.trim());

  if (!kitName || !nLow || !nHigh) {
    alert("Please enter Kit name, nLow and nHigh.");
    return;
  }

  const rows = document.querySelectorAll("#tableBody tr");
  let validPoints = [];

  rows.forEach((row, index) => {
    const inputs = row.querySelectorAll("input");
    const concentration = inputs[0].value.trim();
    const value = inputs[1].value.trim();

    // ch? l?y c?p h?p l?
    if (concentration !== "" && value !== "") {
      validPoints.push({
        index: index + 1, // gi? s? th? t? concenX
        concentration: Number(concentration),
        value: Number(value)
      });
    }
  });

  // c?n �t nh?t 2 c?p
  if (validPoints.length < 2) {
    alert("Please enter at least 2 valid data points.");
    return;
  }

  // t?o object data g?i xu?ng server
  const jsonData = {
    n_low: nLow,
    n_high: nHigh
  };

  validPoints.forEach((pt) => {
    jsonData[`concen${pt.index}`] = pt.concentration;
    jsonData[`value${pt.index}`]  = pt.value;
  });

  socket.emit("writeJsonFile", {
    filePath: `/home/pi/Spotcheck/Kits/${kitName}.json`,
    data: jsonData
  });

  alert("File saved");
  socket.emit("getJsonList");
}

/* ================= LOAD FILE ================= */
function Load_Clicked() {
  document.getElementById("fileInput").click();
}

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const jsonData = JSON.parse(e.target.result);
      console.log("JSON data:", jsonData);
      alert("🟢 JSON file loaded successfully!");
    } catch (err) {
      alert("🔴 Invalid file!");
    }
  };

  reader.readAsText(file);
}

/* ================= INIT ================= */
window.addEventListener("DOMContentLoaded", () => {
  socket.emit("getJsonList");
});

/* ================= RECEIVE FILE LIST ================= */
socket.on("jsonList", (files) => {
  console.log("kits list:", files);
  renderFileGrid(files);
});

/* ================= RENDER FILE GRID ================= */
function renderFileGrid(folders) {
  const grid = document.getElementById("result-grid");
  grid.innerHTML = "";

  folders.forEach((folder) => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.dataset.folder = folder.name;

    const displayName = folder.name.replace(/\.json$/i, "");

    item.innerHTML = `
      <div class="folder-icon">
        <i class="fa-solid fa-vial"></i>
      </div>
      <div class="folder-name">${displayName}</div>
    `;

    item.addEventListener("click", () => toggleSelect(item));
    grid.appendChild(item);
  });
}

/* ================= SELECT FILE ================= */
function toggleSelect(item) {
  const fileName = item.dataset.folder;

  document.querySelectorAll(".result-item.selected").forEach((el) => {
    el.classList.remove("selected");
  });

  item.classList.add("selected");
  kitSelectList = [fileName];

  document.getElementById("kitName").value = fileName.replace(/\.json$/i, "");

  socket.emit("loadJsonFile", fileName);
  console.log("Loading file:", fileName);
}

/* ================= RECEIVE JSON DATA ================= */
socket.on("jsonData", (data) => {
  document.getElementById("nLow").value = data.n_low ?? "";
  document.getElementById("nHigh").value = data.n_high ?? "";

  if (data.kitName) {
    document.getElementById("kitName").value = data.kitName;
  }

  const rows = document.querySelectorAll("#tableBody tr");
  for (let i = 0; i < rows.length; i++) {
    const inputs = rows[i].querySelectorAll("input");
    inputs[0].value = data[`concen${i + 1}`] ?? "";
    inputs[1].value = data[`value${i + 1}`] ?? "";
  }

  console.log("Loaded JSON:", data);
});

/* ================= DELETE ALL FILES ================= */
function DeleteAll_Clicked() {
  if (confirm(t("ALERT_DELETEALL_FILE"))) {
    socket.emit("deleteAllJson");
  }
}

socket.on("deleteAllResult", (msg) => {
  alert(msg);
  socket.emit("getJsonList");
});

/* ================= CLEAR FORM ================= */
function Clear_Clicked() {
  document.getElementById("kitName").value = "";
  document.getElementById("nLow").value = "";
  document.getElementById("nHigh").value = "";

  const rows = document.querySelectorAll("#tableBody tr");
  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input");
    inputs.forEach((input) => (input.value = ""));
  });

  console.log("Cleared all fields.");
}

/* ================= DELETE SELECTED ================= */
document.querySelector(".delete-btn").addEventListener("click", () => {
  if (kitSelectList.length === 0) {
    alert(t("ALERT_DELETEFILE_MISSING"));
    return;
  }

  if (!confirm(t("ALERT_DELETE_FILE"))) return;

  console.log("[Client] Request delete folders:", kitSelectList);
  socket.emit("delete_selected_kit", kitSelectList);
});

socket.on("delete_selected_done", () => {
  kitSelectList = [];
  socket.emit("getJsonList");
  Clear_Clicked();
});

/* ================= DELETE ALL (ALT) ================= */
document.querySelector(".deleteall-btn").addEventListener("click", () => {
  if (!confirm(t("ALERT_DELETEALL_FILE"))) return;

  console.log("[Client] Request delete ALL file");
  socket.emit("delete_all_kit");
});

socket.on("delete_all_done", () => {
  kitSelectList = [];
  socket.emit("getJsonList");
  Clear_Clicked();
});

/* ================= BACK ================= */
function Back_Clicked() {
  goToPage("../index.html");
}
