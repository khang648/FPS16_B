const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// ---------------------- CONSTANTS ----------------------
const START_CELL = "B5"; // Vị trí bắt đầu
const COEFFICIENT_PATH = "/home/pi/Spotcheck/Global/coefficient.xlsx";
const THRESHOLD_PATH = "/home/pi/Spotcheck/Global/threshold.json";
const COORD_PATH = "/home/pi/Spotcheck/Global/coordinates.json";
const COORD0_PATH = "/home/pi/Spotcheck/Global/coordinates0.json";
const FAM_PATH = "/home/pi/Spotcheck/Global/fam.json";

/* =========================================================
   Hàm đăng ký các socket event liên quan Excel/Admin
========================================================= */
function registerExcelSocket(io, socket) {

  /* ------------------- SAVE WELLS ------------------- */
  socket.on("save_wells_excel", ({ fileName, resultData }) => {
    try {
      const folderPath = "/home/pi/Spotcheck/Sample_Files";

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log("📁 Folder created:", folderPath);
      }

      const colData = resultData.map(val => (val && val.trim() !== "") ? val : "N/A");

      const wb = XLSX.utils.book_new();
      const ws = {};

      const match = START_CELL.match(/^([A-Z]+)(\d+)$/);
      if (!match) throw new Error("Invalid START_CELL format, must be like 'B5'");

      const startCol = match[1];
      const startRow = parseInt(match[2]);

      for (let i = 0; i < colData.length; i++) {
        const cellRef = `${startCol}${startRow + i}`;
        ws[cellRef] = { t: "s", v: colData[i] };
      }

      ws["!ref"] = `${startCol}${startRow}:${startCol}${startRow + colData.length - 1}`;
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      const savePath = path.join(folderPath, fileName + ".xlsx");
      XLSX.writeFile(wb, savePath);

      console.log(`Excel saved successfully: ${savePath}`);
      socket.emit("save_excel_success", { path: savePath });

    } catch (err) {
      console.error("Error saving Excel:", err);
      socket.emit("save_excel_error", { error: err.message });
    }
  });

  /* ------------------- LIST EXCEL FILES ------------------- */
  socket.on("listExcelFiles", () => {
    const folderPath = "/home/pi/Spotcheck/Sample_Files";
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        console.error("Error reading folder:", err);
        socket.emit("excelFileList", []);
        return;
      }
      const excelFiles = files.filter(f => f.endsWith(".xlsx") || f.endsWith(".xls"));
      socket.emit("excelFileList", excelFiles);
    });
  });

  /* ------------------- READ EXCEL FILE ------------------- */
  socket.on("readExcelFile", ({ filePath, startCell, count }) => {
    try {
      if (!fs.existsSync(filePath)) throw new Error("File does not exist");

      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const col = startCell.match(/[A-Z]+/i)[0];
      const rowStart = parseInt(startCell.match(/[0-9]+/)[0], 10);

      const values = [];
      for (let i = 0; i < count; i++) {
        const row = rowStart + i;
        const cellAddress = `${col}${row}`;
        const cell = sheet[cellAddress];
        values.push(cell ? cell.v : null);
      }

      socket.emit("excelData", values);

    } catch (err) {
      console.error("Error reading Excel file:", err);
      socket.emit("excelData", []);
    }
  });

  /* ------------------- READ RESULT FILE ------------------- */
  socket.on("read_excel_result", (folderName) => {
    try {
      const excelPath = path.join("/home/pi/Spotcheck/Results", folderName, `${folderName}.xlsx`);
      if (!fs.existsSync(excelPath)) {
        socket.emit("excel_result_error", "Excel file not found");
        return;
      }

      const wb = XLSX.readFile(excelPath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const get = (cell) => sheet[cell]?.v ?? "";

      /* ===== FIXED CELLS ===== */
      const info = {
        B9: get("B9"),
        B10: get("B10"),
        B11: get("B11")
      };

      /* ===== TABLE B13:E29 ===== */
      const table = [];
      for (let row = 13; row <= 29; row++) {
        const b = get(`B${row}`);
        if (b === "N/A" || b === "" || b == null) continue;
        table.push({
          B: b,
          C: get(`C${row}`),
          D: get(`D${row}`),
          E: get(`E${row}`)
        });
      }

      socket.emit("excel_result_data", { info, table });

    } catch (err) {
      console.error(err);
      socket.emit("excel_result_error", "Read excel failed");
    }
  });

  /* ------------------- HELPER FUNCTIONS ADMIN ------------------- */
  function readRange(ws, startRow, endRow, startCol, endCol) {
    const data = [];
    for (let r = startRow; r <= endRow; r++) {
      const row = [];
      for (let c = startCol; c <= endCol; c++) {
        row.push(ws[XLSX.utils.encode_cell({ r, c })]?.v ?? 0);
      }
      data.push(row);
    }
    return data;
  }

  function writeRange(ws, startRow, startCol, values) {
    for (let r = 0; r < values.length; r++) {
      for (let c = 0; c < values[r].length; c++) {
        ws[XLSX.utils.encode_cell({ r: startRow + r, c: startCol + c })] = {
          t: "n",
          v: Number(values[r][c]) || 0
        };
      }
    }
  }

  /* ------------------- ADMIN LOAD EXCEL ------------------- */
  socket.on("admin_load_excel", () => {
    try {
      const wb = XLSX.readFile(COEFFICIENT_PATH);
      const ws = wb.Sheets[wb.SheetNames[0]];

      const coeff = readRange(ws, 1, 4, 1, 4);
      const base = readRange(ws, 10, 13, 1, 4);

      console.log("Sending admin_excel_data:", { coeff, base });
      socket.emit("admin_excel_data", { coeff, base });

    } catch (err) {
      console.error("Error loading admin excel:", err);
      socket.emit("admin_excel_data", {
        coeff: Array(4).fill(0).map(() => Array(4).fill(0)),
        base: Array(4).fill(0).map(() => Array(4).fill(0))
      });
    }
  });

  /* ------------------- ADMIN WRITE EXCEL ------------------- */
  socket.on("admin_write_excel", ({ coeff, base }) => {
    try {
      let wb, ws;
  
      if (!fs.existsSync(COEFFICIENT_PATH)) {
        wb = XLSX.utils.book_new();
  
        // T?O SHEET C� K�CH THU?C
        const empty = Array.from({ length: 20 }, () => Array(10).fill(""));
        ws = XLSX.utils.aoa_to_sheet(empty);
  
        XLSX.utils.book_append_sheet(wb, ws, "Coefficient");
        console.log("?? Excel created");
      } else {
        wb = XLSX.readFile(COEFFICIENT_PATH);
        ws = wb.Sheets[wb.SheetNames[0]];
      }
  
      // ghi d? li?u
      writeRange(ws, 1, 1, coeff);
      writeRange(ws, 10, 1, base);
  
      XLSX.writeFile(wb, COEFFICIENT_PATH);
      socket.emit("admin_write_done");
  
    } catch (err) {
      console.error("Excel write error:", err);
    }
  });

  /* ------------------- ADMIN LOAD EXTRA JSON ------------------- */
  socket.on("admin_load_extra", () => {
    let threshold = { a: 0, b: 0 };
    let coord = { x1: 0, y1: 0, x2: 0, y2: 0 };
    let coord0 = { x1: 0, y1: 0, x2: 0, y2: 0 };
    let fam = { threshold_1: 0, threshold_2: 0, threshold_3: 0, minus_value: 0 };

    try { threshold = JSON.parse(fs.readFileSync(THRESHOLD_PATH, "utf8")); } catch {}
    try { coord = JSON.parse(fs.readFileSync(COORD_PATH, "utf8")); } catch {}
    try { coord0 = JSON.parse(fs.readFileSync(COORD0_PATH, "utf8")); } catch {}
    try { fam = JSON.parse(fs.readFileSync(FAM_PATH, "utf8")); } catch {}

    console.log("Sending admin_extra_data:", { threshold, coord, coord0, fam });
    socket.emit("admin_extra_data", { threshold, coord, coord0, fam });
  });

  /* ------------------- ADMIN WRITE EXTRA JSON ------------------- */
  function ensureDirAndWrite(filePath, dataObj) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(dataObj, null, 2));
  }

  socket.on("admin_write_extra", (data) => {
    try {
      if (data.threshold) {
        ensureDirAndWrite(THRESHOLD_PATH, {
          a: Number(data.threshold.a) || 0,
          b: Number(data.threshold.b) || 0
        });
      }

      if (data.coordinates) {
        ensureDirAndWrite(COORD_PATH, {
          x1: Number(data.coordinates.x1) || 0,
          y1: Number(data.coordinates.y1) || 0,
          x2: Number(data.coordinates.x2) || 0,
          y2: Number(data.coordinates.y2) || 0
        });
      }

      if (data.fam) {
        ensureDirAndWrite(FAM_PATH, {
          threshold_1: Number(data.fam.threshold_1) || 0,
          threshold_2: Number(data.fam.threshold_2) || 0,
          threshold_3: Number(data.fam.threshold_3) || 0,
          minus_value: Number(data.fam.minus_value) || 0
        });
      }

      console.log("admin_write_extra done");
      // socket.emit("admin_write_done");

    } catch (err) {
      console.error("Error writing admin extra:", err);
      socket.emit("admin_write_error", { error: err.message });
    }
  });

}

module.exports = { registerExcelSocket };
