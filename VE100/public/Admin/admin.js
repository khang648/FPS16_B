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