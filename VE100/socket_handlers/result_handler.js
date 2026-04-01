const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

// ======================= PATH CONSTANTS =======================

const RESULT_DIR = "/home/pi/VE100/Results";

// ======================= REGISTER SOCKET =======================

function registerResultSocket(io, socket) {

  console.log("[result_handler][INFO] Result handler loaded for:", socket.id);

  /* ============================================================
     SCAN RESULT FOLDER
  ============================================================ */

  socket.on("scan_result_folder", (reqPath) => {

    const targetPath = reqPath || RESULT_DIR;

    console.log("[result_handler][INFO] Scan request:", targetPath);

    fs.readdir(targetPath, { withFileTypes: true }, (err, items) => {

      if (err) {
        console.error("[result_handler][ERROR] Cannot scan folder:", err);
        socket.emit("result_folder_list", []);
        return;
      }

      const list = [];

      items.forEach((item) => {

        const fullPath = path.join(targetPath, item.name);

        try {

          if (item.isDirectory()) {

            const stat = fs.statSync(fullPath);

            list.push({
              name: item.name,
              type: "folder",
              mtime: stat.mtimeMs
            });

          }

          else if (item.isFile() && /\.(jpg|jpeg|png|bmp)$/i.test(item.name)) {

            const stat = fs.statSync(fullPath);

            list.push({
              name: item.name,
              type: "image",
              mtime: stat.mtimeMs
            });

          }

        } catch (e) {

          console.warn("[result_handler][WARN] Skip item:", item.name);

        }

      });

      /* ===== Sort newest first ===== */

      list.sort((a, b) => b.mtime - a.mtime);

      socket.emit("result_folder_list", list);

      console.log(`[result_handler][INFO] Sent ${list.length} items`);

    });

  });


  /* ============================================================
     DOWNLOAD SELECTED FOLDERS
  ============================================================ */

  socket.on("download_selected_results", (folderList) => {

    console.log("[result_handler][INFO] Download request:", folderList);

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk) => {
      socket.emit("download_zip_data", chunk);
    });

    archive.on("end", () => {
      socket.emit("download_zip_done", "results.zip");
      console.log("[result_handler][INFO] Zip stream finished");
    });

    archive.on("error", (err) => {
      console.error("[result_handler][ERROR] Zip error:", err);
    });

    folderList.forEach((folderName) => {

      const folderPath = path.join(RESULT_DIR, folderName);

      if (fs.existsSync(folderPath)) {

        archive.directory(folderPath, folderName);

      }

    });

    archive.finalize();

  });


  /* ============================================================
     DELETE SELECTED FOLDERS
  ============================================================ */

  socket.on("delete_selected_results", (folderList) => {

    console.log("[result_handler][INFO] Delete request:", folderList);

    folderList.forEach((folderName) => {

      const folderPath = path.join(RESULT_DIR, folderName);

      try {

        if (fs.existsSync(folderPath)) {

          fs.rmSync(folderPath, {
            recursive: true,
            force: true
          });

          console.log("[result_handler][INFO] Deleted:", folderPath);

        }

      } catch (err) {

        console.error("[result_handler][ERROR] Delete failed:", err);

      }

    });

    socket.emit("delete_selected_done");

  });

}


// ======================= REGISTER HTTP ROUTE =======================

function registerResultRoutes(app) {

  /* ============================================================
     LOAD IMAGE FOR BAND FINDER
  ============================================================ */

  app.get("/bandfinder_image", (req, res) => {

    const filePath = req.query.path;

    if (!filePath) {
      console.error("[result_handler][ERROR] Missing image path");
      return res.status(400).send("Missing path");
    }

    if (!fs.existsSync(filePath)) {
      console.error("[result_handler][ERROR] File not found:", filePath);
      return res.status(404).send("File not found");
    }

    res.sendFile(filePath);

  });

}


// ======================= EXPORT =======================

module.exports = {
  registerResultSocket,
  registerResultRoutes
};