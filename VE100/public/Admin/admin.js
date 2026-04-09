/* ================= SOCKET ================= */
const socket = io();

let writeCount = 0;

/* ================= PATH ================= */
const GLOBALVAR_PATH = "/home/pi/FPS16_B/information.json";
const COORD_PATH = "/home/pi/VE100/Global/coordinates.json";

/* ================= REQUEST HELPER ================= */
function loadJson(filePath) {
  return new Promise((resolve, reject) => {

    const handler = (data) => {
      socket.off("jsonData", handler);

      if (data?.error) {
        reject(data.error);
      } else {
        resolve(data);
      }
    };

    socket.on("jsonData", handler);
    socket.emit("loadJsonFile", filePath);
  });
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const deviceData = await loadJson(GLOBALVAR_PATH);
    renderDeviceInfo(deviceData);
  } catch (err) {
    console.warn("[LOAD DEVICE ERROR]", err);
  }

  try {
    const coordData = await loadJson(COORD_PATH);
    renderCoordinates(coordData);
  } catch (err) {
    console.warn("[LOAD COORD ERROR]", err);
  }

  socket.on("writeResult", (res) => {
    if (!res.success) {
      alert(`Save error:\n${res.error}`);
      return;
    }
    writeCount++;
    if (writeCount === 2) {
      alert("🟢 Save done !");
      writeCount = 0;
    }
  });

  /* ---------- BACK BUTTON ---------- */
  document.getElementById("btnBack")?.addEventListener("click", () => {
      goToPage("../index.html");
  });

});

/* ================= RENDER ================= */
function renderDeviceInfo(data) {
  document.getElementById("host_name").value = data.host_name || "";
  document.getElementById("seri_number").value = data.seri_number || "";
  document.getElementById("currentVersion").value = data.version || "";
}

function renderCoordinates(data) {
  setValue("x_coordinate_9", data.x_coordinate_9);
  setValue("x_coordinate_17", data.x_coordinate_17);
  setValue("y_coordinate", data.y_coordinate);

  setValue("well_distance_9", data.well_distance_9);
  setValue("pace_9", data.pace_9);

  setValue("well_distance_17", data.well_distance_17);
  setValue("pace_17", data.pace_17);

  setValue("font_size_9", data.font_size_9);
  setValue("font_size_17", data.font_size_17);
}

/* ================= APPLY ================= */
document.getElementById("btnApply").addEventListener("click", () => {
  writeCount = 0;

  saveDeviceInfo();
  saveCoordinates();
});

/* ================= SAVE ================= */
function saveDeviceInfo() {
  const data = {
    host_name: document.getElementById("host_name").value.trim(),
    seri_number: document.getElementById("seri_number").value.trim(),
  };

  socket.emit("writeJsonFile", {
    filePath: GLOBALVAR_PATH,
    data: data,
  });
}

function saveCoordinates() {
  const data = {
    x_coordinate_9: getFloat("x_coordinate_9"),
    x_coordinate_17: getFloat("x_coordinate_17"),
    y_coordinate: getFloat("y_coordinate"),

    well_distance_9: getFloat("well_distance_9"),
    pace_9: getFloat("pace_9"),

    well_distance_17: getFloat("well_distance_17"),
    pace_17: getFloat("pace_17"),

    font_size_9: getFloat("font_size_9"),
    font_size_17: getFloat("font_size_17"),
  };

  socket.emit("writeJsonFile", {
    filePath: COORD_PATH,
    data: data,
  });

  
}

/* ================= HELPER ================= */
function setValue(id, value) {
  document.getElementById(id).value = value ?? "";
}

function getFloat(id) {
  const val = parseFloat(document.getElementById(id).value);
  return isNaN(val) ? 0 : val;
}

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