const { exec } = require("child_process");
const fs = require("fs");
const XLSX = require("xlsx");

// Đường dẫn global và fam
globalvar_tmp_path = 'Spotcheck/tmp/global_info.json';
fam_path = '/home/pi/Spotcheck/Global/fam.json';

/* =========================================================
   Hàm đọc giá trị Excel theo tên cell
   filePath: đường dẫn file Excel
   cellNames: mảng tên cell cần đọc
   sheetName: tên sheet (nếu null sẽ lấy sheet đầu tiên)
========================================================= */
function read16FromExcel(filePath, cellNames, sheetName = null) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error("[camera_handler][ERR] Không tìm được file:", filePath);
      return Array(cellNames.length).fill(null);
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[0]];

    // Lấy giá trị từng cell
    const out = cellNames.map(cellName => {
      const cell = sheet[cellName];
      if (!cell) return null;
      return (cell.w !== undefined) ? String(cell.w) : String(cell.v);
    });

    return out;

  } catch (err) {
    console.error("[camera_handler][ERR] Lỗi khi đọc file:", err);
    return Array(cellNames.length).fill(null);
  }
}

/* =========================================================
   Hàm đăng ký các socket event của camera
   io: object socket.io
   socket: socket của client
========================================================= */
function registerCameraSocket(io, socket) {

  /* ------------------- SYSTEM CHECK ------------------- */
  socket.on("system_check", () => {
    console.log("[camera_handler][INFO] system_check command received");

    let imagePath = "";

    // Gọi Python script
    // exec(`python3 Spotcheck/python_core/main.py system_check`, (err, stdout, stderr) => {
    exec(`Spotcheck/python_core/dist/main system_check`, (err, stdout, stderr) => {
      if (err) {
        console.error("[camera_handler][ERR] Lỗi khi chạy Python:", stderr || err.message);
        socket.emit("error_message", "Camera Error: " + (stderr || err.message));
        return;
      }

      // File ảnh kết quả
      imagePath = "/home/pi/Spotcheck/System_Check/process_image.jpg";
      if (!fs.existsSync(imagePath)) {
        console.error("[camera_handler][ERR] Không tìm thấy file ảnh:", imagePath);
        socket.emit("error_message", "Không tìm thấy ảnh");
        return;
      }

      fs.readFile(imagePath, (readErr, data) => {
        if (readErr) {
          console.error("[camera_handler][ERR] Lỗi đọc file ảnh:", readErr);
          socket.emit("error_message", "Lỗi đọc file ảnh: " + readErr.message);
          return;
        }
        const base64Image = data.toString("base64");

        // Cell cần đọc từ Excel
        const checkValueCells = [
          "B2","B3","B4","B5",
          "C2","C3","C4","C5",
          "D2","D3","D4","D5",
          "E2","E3","E4","E5"
        ];
        const baseValueCells = [
          "B11","B12","B13","B14",
          "C11","C12","C13","C14",
          "D11","D12","D13","D14",
          "E11","E12","E13","E14"
        ];

        const checkValueFile = "/home/pi/Spotcheck/System_Check/well_value.xlsx";
        const baseValueFile = "/home/pi/Spotcheck/Global/coefficient.xlsx";

        const result = read16FromExcel(checkValueFile, checkValueCells);
        const base_intensity = read16FromExcel(baseValueFile, baseValueCells);

        // Gửi dữ liệu về client
        io.emit("systemcheck_done", {
          image: base64Image,
          result: result,
          base_intensity: base_intensity,
        });

        console.log("[camera_handler][INFO] Đã gửi ảnh và kết quả đến client");
      });
    });
  });

  /* ------------------- SAMPLE ANALYSIS ------------------- */
  socket.on("sample_analysis", () => {
    console.log("[camera_handler][INFO] sample_analysis command received");

    let imagePath = "";
    let jsonData = null;
    let resultFolder = "";
    let session_name = "";
    let sensitivity = "";

    // Gọi Python script
    // exec(`python3 Spotcheck/python_core/main.py sample_analysis`, (err, stdout, stderr) => {
    exec(`Spotcheck/python_core/dist/main sample_analysis`, (err, stdout, stderr) => {
      if (err) {
        console.error("[camera_handler][ERR] Lỗi khi chạy Python:", stderr || err.message);
        socket.emit("error_message", "Camera Error: " + (stderr || err.message));
        return;
      }

      // Đọc global_info.json
      if (!fs.existsSync(globalvar_tmp_path)) {
        console.error("[camera_handler][ERR] Không tìm thấy global_info.json");
        socket.emit("error_message", "Không tìm thấy global_info.json.");
        return;
      }

      try {
        jsonData = JSON.parse(fs.readFileSync(globalvar_tmp_path, "utf8"));
        resultFolder = jsonData.resultfile_name;
        session_name = jsonData.session_info[0];
        sensitivity = jsonData.sensitivity;

        if (!resultFolder || resultFolder.trim() === "") {
          console.error("[camera_handler][ERR] JSON không có session_info hợp lệ");
          socket.emit("error_message", "JSON không có session_info hợp lệ");
          return;
        }

        imagePath = `/home/pi/Spotcheck/Results/${resultFolder}/process_image.jpg`;

      } catch (readErr) {
        console.error("[camera_handler][ERR] Lỗi đọc JSON:", readErr);
        socket.emit("error_message", "Lỗi đọc JSON: " + readErr.message);
        return;
      }

      if (!fs.existsSync(imagePath)) {
        console.error("[camera_handler][ERR] Không tìm thấy file ảnh:", imagePath);
        socket.emit("error_message", "Không tìm thấy ảnh");
        return;
      }

      fs.readFile(imagePath, (readErr, data) => {
        if (readErr) {
          console.error("[camera_handler][ERR] Lỗi đọc file ảnh:", readErr);
          socket.emit("error_message", "Lỗi đọc file ảnh: " + readErr.message);
          return;
        }
        const base64Image = data.toString("base64");

        // Các cell cần đọc từ Excel
        const screeningCells = [
          "B2","B3","B4","B5",
          "C2","C3","C4","C5",
          "D2","D3","D4","D5",
          "E2","E3","E4","E5"
        ];
        const resultCells = [
          "D14","D15","D16","D17",
          "D18","D19","D20","D21",
          "D22","D23","D24","D25",
          "D26","D27","D28","D29"
        ];
        const subResultCells = screeningCells;

        const screeningFile = `/home/pi/Spotcheck/Results/${resultFolder}/screening_value.xlsx`;
        const resultFile = `/home/pi/Spotcheck/Results/${resultFolder}/${session_name}.xlsx`;
        const subResultFile = `/home/pi/Spotcheck/Results/${resultFolder}/sub_result.xlsx`;

        const screening = read16FromExcel(screeningFile, screeningCells);
        const result = read16FromExcel(resultFile, resultCells);
        const subresult = read16FromExcel(subResultFile, subResultCells);

        console.log("result:", result);
        console.log("screening:", screening);
        console.log("subresult:", subresult);

        // Gửi về client
        io.emit("sampleanalysis_done", {
          image: base64Image,
          result_list: result,
          screening_list: screening,
          subresult_list: subresult,
          sensitivity_chose: sensitivity,
        });

        console.log("[camera_handler][INFO] Đã gửi ảnh và kết quả đến client");
      });
    });
  });

  /* ------------------- FAM CHECK ------------------- */
  socket.on("fam_check", () => {
    console.log("[camera_handler][INFO] fam_check command received");

    let imagePath = "";
    let resultFolder = "";
    let famThreshold = [];

    // Gọi Python script
    // exec(`python3 Spotcheck/python_core/main.py fam_check`, (err, stdout, stderr) => {
    exec(`Spotcheck/python_core/dist/main fam_check`, (err, stdout, stderr) => {
      if (err) {
        console.error("[camera_handler][ERR] Lỗi khi chạy Python:", stderr || err.message);
        socket.emit("error_message", "Camera Error: " + (stderr || err.message));
        return;
      }

      // Đọc global_info.json
      if (!fs.existsSync(globalvar_tmp_path)) {
        console.error("[camera_handler][ERR] Không tìm thấy global_info.json");
        socket.emit("error_message", "Không tìm thấy global_info.json.");
        return;
      }

      try {
        jsonData = JSON.parse(fs.readFileSync(globalvar_tmp_path, "utf8"));
        resultFolder = jsonData.famfolder_name;

        famData = JSON.parse(fs.readFileSync(fam_path, "utf8"));
        fam_threshole_1 = famData.threshold_1;
        fam_threshole_2 = famData.threshold_2;
        fam_threshole_3 = famData.threshold_3;

        if (!resultFolder || resultFolder.trim() === "") {
          console.error("[camera_handler][ERR] JSON không có session_info hợp lệ");
          socket.emit("error_message", "JSON không có session_info hợp lệ");
          return;
        }

        imagePath = `/home/pi/Spotcheck/Results/${resultFolder}/process_image.jpg`;

      } catch (readErr) {
        console.error("[camera_handler][ERR] Lỗi đọc JSON:", readErr);
        socket.emit("error_message", "Lỗi đọc JSON: " + readErr.message);
        return;
      }

      if (!fs.existsSync(imagePath)) {
        console.error("[camera_handler][ERR] Không tìm thấy file ảnh:", imagePath);
        socket.emit("error_message", "Không tìm thấy ảnh");
        return;
      }

      fs.readFile(imagePath, (readErr, data) => {
        if (readErr) {
          console.error("[camera_handler][ERR] Lỗi đọc file ảnh:", readErr);
          socket.emit("error_message", "Lỗi đọc file ảnh: " + readErr.message);
          return;
        }
        const base64Image = data.toString("base64");

        const screeningCells = [
          "B2","B3","B4","B5",
          "C2","C3","C4","C5",
          "D2","D3","D4","D5",
          "E2","E3","E4","E5"
        ];

        const screeningFile = `/home/pi/Spotcheck/Results/${resultFolder}/screening_value.xlsx`;
        const screening = read16FromExcel(screeningFile, screeningCells);

        console.log("screening:", screening);

        // Gửi về client
        io.emit("famcheck_done", {
          image: base64Image,
          screening_list: screening,
          fam_threshole_1: fam_threshole_1,
          fam_threshole_2: fam_threshole_2,
          fam_threshole_3: fam_threshole_3,
        });

        console.log("[camera_handler][INFO] Đã gửi ảnh và kết quả đến client");
      });
    });
  });
}

module.exports = { registerCameraSocket };
