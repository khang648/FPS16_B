window.socket = io();

/* ================= GLOBAL ================= */
let resultSelectList = [];
let zipChunks = [];

/* ================= PAGE LOAD ================= */
window.addEventListener("DOMContentLoaded", () => {
  socket.emit("scan_result_folder");
});

/* ================= SOCKET EVENTS ================= */

// Receive folder list
socket.on("result_folder_list", (folders) => {
  renderFolderGrid(folders);
});

// Receive Excel data
socket.on("excel_result_data", (data) => {
  renderExcelResult(data);
});

// Excel read error
socket.on("excel_result_error", (msg) => {
  alert("🔴 " + msg);
});

// Delete selected done
socket.on("delete_selected_done", () => {
  resultSelectList = [];
  socket.emit("scan_result_folder");
});

// Delete all done
socket.on("delete_all_done", () => {
  resultSelectList = [];
  socket.emit("scan_result_folder");
});

// Receive ZIP chunk
socket.on("download_zip_data", (chunk) => {
  zipChunks.push(new Uint8Array(chunk));
});

// ZIP completed
socket.on("download_zip_done", () => {
  const blob = new Blob(zipChunks, { type: "application/zip" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "Spotcheck_Results.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  alert(t("ALERT_DOWNLOAD_COMPLETE"));
});

/* ================= UI EVENTS ================= */

// Delete selected
document.getElementById("delete-btn")?.addEventListener("click", () => {
  if (resultSelectList.length === 0) {
    alert("🟡 You have not selected any folder to delete");
    return;
  }

  if (!confirm(`Delete ${resultSelectList.length} selected folder(s)?`)) return;
  socket.emit("delete_selected_folders", resultSelectList);
});

// Delete all
document.getElementById("deleteall-btn")?.addEventListener("click", () => {
  if (!confirm("Are you sure you want to delete ALL result folders?")) return;
  socket.emit("delete_all_folders");
});

// Download
document.getElementById("download-btn")?.addEventListener("click", () => {
  if (resultSelectList.length === 0) {
    alert("🟡 You haven't selected a folder yet");
    return;
  }

  zipChunks = [];
  socket.emit("download_selected_results", resultSelectList);
});

// Back
document.getElementById("back-btn")?.addEventListener("click", () => {
  goToPage("../index.html");
});

/* ================= FUNCTIONS ================= */

// Render folder grid
function renderFolderGrid(folders) {
  const grid = document.getElementById("result-grid");
  grid.innerHTML = "";

  folders.forEach((folder) => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.dataset.folder = folder.name;

    item.innerHTML = `
      <div class="folder-icon">
        <i class="fas fa-folder"></i>
      </div>
      <div class="folder-name">${folder.name}</div>
    `;

    item.addEventListener("click", () => {
      toggleSelect(item);
      socket.emit("read_excel_result", folder.name);
    });

    grid.appendChild(item);
  });
}

// Toggle select folder
function toggleSelect(item) {
  const folder = item.dataset.folder;

  document.querySelectorAll(".result-item.selected").forEach((el) => {
    el.classList.remove("selected");
  });

  resultSelectList = [];

  item.classList.add("selected");
  resultSelectList.push(folder);
}

// Render Excel preview
function renderExcelResult(data) {
  const panel = document.getElementById("excel-preview");

  let html = `
    <div class="excel-info">
      <div>${data.info.B9}</div>
      <div>${data.info.B10}</div>
      <div>${data.info.B11}</div>
    </div>

    <hr style="margin:10px 0; opacity:0.4">

    <table class="excel-table">
      <tbody>
  `;

  data.table.forEach((row, index) => {
    const colorClass =
      index === 0 ? "" : classifyColorFromText(row.D);

    html += `
      <tr class="${colorClass}">
        <td>${row.B}</td>
        <td>${row.C}</td>
        <td>${row.D}</td>
        <td>${row.E}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  panel.innerHTML = html;
}

// Classify result color
function classifyColorFromText(text) {
  if (!text) return "nosample";

  text = String(text).trim();

  if (text === "N/A") return "nosample";
  if (text === "0") return "negative";
  if (text === "1-50") return "lowcopy";
  if (text === "51-500" || text === "501-1000") return "mediumcopy";
  if (text === "1001-10000" || text === ">10000") return "positive";

  return "nosample";
}
