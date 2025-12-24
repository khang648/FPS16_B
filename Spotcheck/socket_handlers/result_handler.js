const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

// ======================= PATH CONSTANTS =======================
const RESULT_DIR = "/home/pi/Spotcheck/Results";
const SAMPLE_FILE_DIR = "/home/pi/Spotcheck/Sample_Files";

// ======================= REGISTER SOCKET =======================
function registerResultSocket(io, socket) {
  console.log("[result_handler][INFO] Result handler loaded for:", socket.id);

  /* ------------------- Scan toàn bộ thư mục Result ------------------- */
  socket.on("scan_result_folder", () => {
    console.log("[result_handler][INFO] Client requests scan");

    fs.readdir(RESULT_DIR, { withFileTypes: true }, (err, items) => {
      if (err) {
        console.error("[result_handler][ERROR] Cannot scan folder:", err);
        socket.emit("result_folder_list", []);
        return;
      }

      const folders = items
        .filter(item => item.isDirectory())
        .map(dir => {
          const full = path.join(RESULT_DIR, dir.name);
          const stat = fs.statSync(full);
          return { name: dir.name, mtime: stat.mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);

      socket.emit("result_folder_list", folders);
      console.log(`[result_handler][INFO] Sent ${folders.length} folders`);
    });
  });

  /* ------------------- Scan tất cả file .xlsx trong Sample_Files ------------------- */
  socket.on("scan_sample_files", () => {
    console.log("[result_handler][INFO] Client requests XLSX scan");

    fs.readdir(SAMPLE_FILE_DIR, { withFileTypes: true }, (err, items) => {
      if (err) {
        console.error("[result_handler][ERROR] Cannot scan sample files:", err);
        socket.emit("sample_file_list", []);
        return;
      }

      const files = items
        .filter(item => item.isFile() && item.name.toLowerCase().endsWith(".xlsx"))
        .map(file => {
          const full = path.join(SAMPLE_FILE_DIR, file.name);
          const stat = fs.statSync(full);
          return { name: file.name, size: stat.size, mtime: stat.mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);

      socket.emit("sample_file_list", files);
      console.log(`[result_handler][INFO] Sent ${files.length} sample files`);
    });
  });

  /* ------------------- Nén và gửi ZIP ------------------- */
  socket.on("download_selected_results", (folderList) => {
    console.log("[result_handler][INFO] Download request:", folderList);

    if (!Array.isArray(folderList) || folderList.length === 0) {
      console.warn("[result_handler][WARN] Empty folder list");
      return;
    }

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk) => {
      socket.emit("download_zip_data", chunk);
    });

    archive.on("end", () => {
      console.log("[result_handler][INFO] ZIP streaming completed");
      socket.emit("download_zip_done");
    });

    archive.on("error", (err) => {
      console.error("[result_handler][ERROR] Archiver error:", err);
      socket.emit("download_zip_error", err.message);
    });

    folderList.forEach(folderName => {
      const folderPath = path.join(RESULT_DIR, folderName);
      if (fs.existsSync(folderPath)) {
        archive.directory(folderPath, folderName);
      } else {
        console.warn(`[result_handler][WARN] Folder not found: ${folderName}`);
      }
    });

    archive.finalize();
  });

}

module.exports = { registerResultSocket };
