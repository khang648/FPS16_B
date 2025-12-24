const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

// ---------------------- PATH CONSTANTS ----------------------
const RESULTS_PATH = "/home/pi/Spotcheck/Results";
const SAMPLEFILE_PATH = "/home/pi/Spotcheck/Sample_Files";
const global_info_path = "Spotcheck/tmp/global_info.json";

// ---------------------- TEMP VARIABLES ----------------------
let latestTab1Image = null;
let latestTab2Image = null;

/* =======================================================
   Đọc thông tin session từ global_info.json
======================================================= */
function getSessionInfo() {
  if (!fs.existsSync(global_info_path)) {
    throw new Error("Không tìm thấy global_info.json");
  }

  const jsonData = JSON.parse(fs.readFileSync(global_info_path, "utf8"));

  const resultFolder = jsonData.resultfile_name;
  const session_name = jsonData.session_info?.[0];
  const sensitivity = jsonData.sensitivity;

  if (!resultFolder || !session_name) {
    throw new Error("JSON thiếu thông tin session");
  }

  return { resultFolder, session_name, sensitivity };
}

/* =======================================================
   Lưu ảnh nếu chưa tồn tại
======================================================= */
function saveImageIfNotExists(folder, filename, base64Data) {
  const filePath = path.join(folder, filename);

  if (fs.existsSync(filePath)) {
    console.log("[filedownload_handler][INFO] Image exists, skip:", filename);
    return;
  }

  fs.writeFileSync(filePath, base64Data, "base64");
  console.log("[filedownload_handler][INFO] Image saved:", filename);
}

/* =======================================================
   REGISTER SOCKET EVENTS
======================================================= */
function registerFileDownloadSocket(io, socket) {

  /* ------------------- NHẬN ẢNH TỪ CLIENT ------------------- */
  socket.on("client_send_images", (data) => {
    console.log("[filedownload_handler][INFO] Images received");

    latestTab1Image = data.tab1;
    latestTab2Image = data.tab2;

    let resultFolder, sensitivity;
    try {
      ({ resultFolder, sensitivity } = getSessionInfo());
    } catch (err) {
      console.error("[filedownload_handler][ERR]", err.message);
      return;
    }

    const targetFolder = path.join(RESULTS_PATH, resultFolder);
    fs.mkdirSync(targetFolder, { recursive: true });

    const imgName = sensitivity === "low" ? "low_sensitivity.jpg" : "high_sensitivity.jpg";
    const subimageName = sensitivity === "low" ? "high_sensitivity.jpg" : "low_sensitivity.jpg";

    if (latestTab1Image) {
      const base64Tab1 = latestTab1Image.replace(/^data:image\/jpeg;base64,/, "");
      saveImageIfNotExists(targetFolder, imgName, base64Tab1);
    }

    if (latestTab2Image) {
      const base64Tab2 = latestTab2Image.replace(/^data:image\/jpeg;base64,/, "");
      saveImageIfNotExists(targetFolder, subimageName, base64Tab2);
    }
  });

  /* ------------------- DOWNLOAD → ZIP FOLDER ------------------- */
  socket.on("request_download", () => {
    console.log("[filedownload_handler][INFO] Download request received");

    let resultFolder, session_name;
    try {
      ({ resultFolder, session_name } = getSessionInfo());
    } catch (err) {
      console.error("[filedownload_handler][ERR]", err.message);
      socket.emit("error_message", err.message);
      return;
    }

    const targetFolder = path.join(RESULTS_PATH, resultFolder);
    const zipPath = path.join(RESULTS_PATH, `${session_name}.zip`);

    if (!fs.existsSync(targetFolder)) {
      socket.emit("error_message", "Không tìm thấy folder kết quả.");
      return;
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`[Server] Zip created (${archive.pointer()} bytes)`);

      const zipBase64 = fs.readFileSync(zipPath, { encoding: "base64" });

      socket.emit("download_ready", {
        filename: path.basename(zipPath),
        data: zipBase64
      });

      fs.unlink(zipPath, (err) => {
        if (err) console.error("[Server] Error deleting zip:", err);
        else console.log("[Server] Zip deleted:", zipPath);
      });
    });

    archive.on("error", (err) => {
      console.error("[Server] Zip error:", err);
      socket.emit("download_error", "Server zip error");
    });

    archive.pipe(output);
    archive.directory(targetFolder, false);
    archive.finalize();
  });

  /* ------------------- XÓA SELECTED RESULT FOLDERS ------------------- */
  socket.on("delete_selected_folders", (list) => {
    console.log("[Server] Deleting selected folders:", list);

    list.forEach(folder => {
      const fullPath = path.join(RESULTS_PATH, folder);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log("[Server] Deleted:", fullPath);
      }
    });

    socket.emit("delete_selected_done");
  });

  /* ------------------- XÓA TẤT CẢ RESULT FOLDERS ------------------- */
  socket.on("delete_all_folders", () => {
    console.log("[Server] Deleting ALL folders in:", RESULTS_PATH);

    const folders = fs.readdirSync(RESULTS_PATH);
    folders.forEach(name => {
      fs.rmSync(path.join(RESULTS_PATH, name), { recursive: true, force: true });
    });

    socket.emit("delete_all_done");
  });

  /* ------------------- XÓA SELECTED SAMPLE FILES ------------------- */
  socket.on("delete_selected_samplefile", (list) => {
    console.log("[Server] Deleting selected sample files:", list);

    list.forEach(file => {
      const fullPath = path.join(SAMPLEFILE_PATH, file);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { force: true });
        console.log("[Server] Deleted:", fullPath);
      }
    });

    socket.emit("delete_selected_done");
  });

  /* ------------------- XÓA TẤT CẢ SAMPLE FILES ------------------- */
  socket.on("delete_all_samplefile", () => {
    console.log("[Server] Deleting ALL sample files in:", SAMPLEFILE_PATH);

    const files = fs.readdirSync(SAMPLEFILE_PATH);
    files.forEach(file => {
      const fullPath = path.join(SAMPLEFILE_PATH, file);
      if (fullPath.endsWith(".xlsx")) {
        fs.rmSync(fullPath, { force: true });
        console.log("[Server] Deleted:", fullPath);
      }
    });

    socket.emit("delete_all_done");
  });

}

module.exports = { registerFileDownloadSocket };
