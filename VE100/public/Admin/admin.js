window.socket = io();

/* ================= GLOBAL INPUTS ================= */
const host_name = document.getElementById("host_name");
const seri_number = document.getElementById("seri_number");
const version = document.getElementById("currentVersion");

const aValue = document.getElementById("a_value");
const bValue = document.getElementById("b_value");

const x1 = document.getElementById("x1");
const y1 = document.getElementById("y1");
const x2 = document.getElementById("x2");
const y2 = document.getElementById("y2");

const x1_0 = document.getElementById("x1_0");
const y1_0 = document.getElementById("y1_0");
const x2_0 = document.getElementById("x2_0");
const y2_0 = document.getElementById("y2_0");

const threshold1 = document.getElementById("threshold_1");
const threshold2 = document.getElementById("threshold_2");
const threshold3 = document.getElementById("threshold_3");
const minusValue = document.getElementById("minus_value");

const btnApply = document.getElementById("btnApply");

/* ================= CREATE 4x4 TABLE ================= */
function createTable(tableId) {
  const table = document.getElementById(tableId);
  table.innerHTML = "";

  for (let r = 0; r < 4; r++) {
    const tr = document.createElement("tr");

    for (let c = 0; c < 4; c++) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";

      // handle excel-like paste
      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text");
        pasteExcel(tableId, r, c, text);
      });

      td.appendChild(input);
      tr.appendChild(td);
    }

    table.appendChild(tr);
  }
}

createTable("coeffTable");
createTable("baseTable");

/* ================= PASTE EXCEL ================= */
function pasteExcel(tableId, startR, startC, text) {
  const rows = text
    .trim()
    .split("\n")
    .map((r) => r.split("\t"));

  const table = document.getElementById(tableId);

  rows.forEach((row, rOffset) => {
    row.forEach((val, cOffset) => {
      const r = startR + rOffset;
      const c = startC + cOffset;

      if (r < 4 && c < 4) {
        table.rows[r].cells[c].querySelector("input").value = val.trim();
      }
    });
  });
}

/* ================= FILL / READ TABLE ================= */
function fillTable(id, data) {
  const table = document.getElementById(id);

  if (!Array.isArray(data) || data.length === 0) {
    console.warn(`[${id}] Invalid data received:`, data);
    data = Array(4)
      .fill(0)
      .map(() => Array(4).fill(0));
  }

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const value =
        Array.isArray(data[r]) && data[r][c] !== undefined
          ? data[r][c]
          : 0;

      table.rows[r].cells[c].querySelector("input").value = value;
    }
  }
}

function readTable(id) {
  const table = document.getElementById(id);
  const out = [];

  for (let r = 0; r < 4; r++) {
    const row = [];

    for (let c = 0; c < 4; c++) {
      const val = parseFloat(
        table.rows[r].cells[c].querySelector("input").value
      );
      row.push(isNaN(val) ? 0 : val);
    }

    out.push(row);
  }

  return out;
}

/* ================= LOAD ALL DATA ================= */
socket.emit("admin_load_excel");
socket.emit("admin_load_extra");

socket.on("admin_excel_data", ({ coeff, base }) => {
  console.log("Received admin_excel_data:", { coeff, base });
  fillTable("coeffTable", coeff);
  fillTable("baseTable", base);
});

socket.on("admin_extra_data", (data) => {
  console.log("Received admin_extra_data:", data);

  aValue.value = data?.threshold?.a ?? 0;
  bValue.value = data?.threshold?.b ?? 0;

  x1.value = data?.coord?.x1 ?? 0;
  y1.value = data?.coord?.y1 ?? 0;
  x2.value = data?.coord?.x2 ?? 0;
  y2.value = data?.coord?.y2 ?? 0;

  x1_0.value = data?.coord0?.x1 ?? 0;
  y1_0.value = data?.coord0?.y1 ?? 0;
  x2_0.value = data?.coord0?.x2 ?? 0;
  y2_0.value = data?.coord0?.y2 ?? 0;

  threshold1.value = data?.fam?.threshold_1 ?? 0;
  threshold2.value = data?.fam?.threshold_2 ?? 0;
  threshold3.value = data?.fam?.threshold_3 ?? 0;
  minusValue.value = data?.fam?.minus_value ?? 0;

  host_name.value = data.device_info.host_name; 
  seri_number.value = data.device_info.seri_number; 
  version.value = data.device_info.version;

});

/* ================= APPLY BUTTON ================= */
btnApply.addEventListener("click", () => {
  const coeffData = readTable("coeffTable");
  const baseData = readTable("baseTable");

  const extraData = {
    threshold: {
      a: parseFloat(aValue.value) || 0,
      b: parseFloat(bValue.value) || 0
    },
    coordinates: {
      x1: parseFloat(x1.value) || 0,
      y1: parseFloat(y1.value) || 0,
      x2: parseFloat(x2.value) || 0,
      y2: parseFloat(y2.value) || 0
    },
    fam: {
      threshold_1: parseFloat(threshold1.value) || 0,
      threshold_2: parseFloat(threshold2.value) || 0,
      threshold_3: parseFloat(threshold3.value) || 0,
      minus_value: parseFloat(minusValue.value) || 0
    },
    device_info: {
      host_name: host_name.value,
      seri_number: seri_number.value
    }
  };

  console.log("Emitting admin_write_excel:", coeffData, baseData);
  console.log("Emitting admin_write_extra:", extraData);

  socket.emit("admin_write_excel", {
    coeff: coeffData,
    base: baseData
  });

  socket.emit("admin_write_extra", extraData);
});

/* ================= BACK BUTTON ================= */
document.getElementById("backBtn")?.addEventListener("click", () => {
  location.replace("../index.html");
});

/* ================= SUCCESS ================= */
socket.on("admin_write_done", () => {
  alert("🟢 Update successful");
});

window.history.replaceState(null, "", window.location.href);




/* ================= UPDATE LOGIC ================= */
const modal = document.getElementById("updateModal");
const statusText = document.getElementById("updateStatus");
const progressFill = document.getElementById("progressFill");
const btnCheck = document.getElementById("btnCheckUpdate"); // Đảm bảo ID này đúng trong HTML
const btnStart = document.getElementById("btnStartUpdate");
const btnClose = document.getElementById("btnCloseModal");

// Nhấn nút Check Update
btnCheck.onclick = () => {
    modal.classList.remove("hidden");
    statusText.innerText = "Checking for updates...";
    statusText.style.color = "#fff";
    progressFill.style.width = "0%";
    btnStart.hidden = true;
    btnClose.disabled = false;
    
    // Gửi yêu cầu check lên server
    socket.emit("check_update");
};

// Nhận kết quả check từ Server
socket.on("update_check_result", (data) => {
    // Mất kết nối mạng
    if (data.error === "no_network") {
        statusText.innerText = "Wi-Fi Connection Required";
        statusText.style.color = "#ff4d4d";

        const confirmGo = confirm("This device is not connected to Wi-Fi. Please connect to a network to perform the update. Go to Wi-Fi Settings now?");
        
        if (confirmGo) {
            window.location.href = "../Wifi_Setting/wifi_setting.html";
        }
        return;
    }

    // Các lỗi khác
    if (data.error) {
        statusText.innerText = "Error: " + data.error;
        statusText.style.color = "#ff4d4d";
        return;
    }

    // Có bản cập nhật mới
    if (data.hasUpdate) {
        statusText.innerText = `New version available: ${data.latest}`;
        statusText.style.color = "#aaf917";
        btnStart.hidden = false;
    } 
    // Đã là bản mới nhất
    else {
        statusText.innerText = "System is up to date.";
        statusText.style.color = "#fff";
        btnStart.hidden = true;
    }
});

// Nhấn nút Start Update
btnStart.onclick = () => {
    btnStart.hidden = true;
    btnClose.disabled = true; // Khóa nút Close để tránh người dùng thoát giữa chừng
    statusText.innerText = "Initializing update...";
    socket.emit("start_update");
};

// Cập nhật dòng trạng thái từ Server (Downloading, Installing...)
socket.on("update_status", (message) => {
    statusText.innerText = message;
    statusText.style.color = "#ffce00"; // Màu vàng báo hiệu đang xử lý/chờ
});

// Cập nhật thanh % Progress
socket.on("update_progress", (percent) => {
    progressFill.style.width = percent + "%";
});

// Thông báo khi Server gửi tín hiệu Done (trước khi reboot)
socket.on("update_done", () => {
    statusText.innerText = "Update successful! Rebooting...";
    statusText.style.color = "#00ff00";
});

// Xử lý lỗi trong quá trình Download/Install
socket.on("update_error", (msg) => {
    statusText.innerText = "Error: " + msg;
    statusText.style.color = "#ff4d4d";
    btnStart.hidden = false; // Hiện lại nút để thử lại nếu muốn
    btnClose.disabled = false;
});

// Bắt sự kiện khi Server online trở lại sau khi Reboot
socket.on("server_online", () => {
    // Chỉ xử lý nếu người dùng vẫn đang mở Modal update
    if (!modal.classList.contains("hidden")) {
        statusText.innerText = "System is back online!";
        statusText.style.color = "#00ff00";
        progressFill.style.width = "100%";
        btnClose.disabled = false;
        btnClose.innerText = "Done";
    }
});

// Đóng Modal
btnClose.onclick = () => {
    if (!btnClose.disabled) {
        modal.classList.add("hidden");
    }
};