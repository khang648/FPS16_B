const fs = require("fs");
const path = require("path");

// ======================= PATH CONSTANT =======================
const jsonDir = "/home/pi/Spotcheck/Kits";

// ======================= REGISTER SOCKET =======================
function registerJsonSocket(io, socket) {

  /* ------------------- GỬI DANH SÁCH FILE JSON (Kits) ------------------- */
  socket.on("getJsonList", () => {
    console.log("[json_handler][INFO] Client requests Kits scan");

    fs.readdir(jsonDir, { withFileTypes: true }, (err, items) => {
      if (err) {
        console.error("[json_handler][ERROR] Cannot scan Kits folder:", err);
        socket.emit("jsonList", []);
        return;
      }

      // Lọc file .json và sắp xếp theo thời gian chỉnh sửa (mới nhất lên đầu)
      const files = items
        .filter(item => item.isFile() && item.name.toLowerCase().endsWith(".json"))
        .map(file => {
          const full = path.join(jsonDir, file.name);
          const stat = fs.statSync(full);
          return {
            name: file.name,
            size: stat.size,
            mtime: stat.mtimeMs
          };
        })
        .sort((a, b) => b.mtime - a.mtime);

      socket.emit("jsonList", files);
      console.log(`[json_handler][INFO] Sent ${files.length} kit files`);
    });
  });

  /* ------------------- ĐỌC NỘI DUNG FILE JSON ------------------- */
  socket.on("loadJsonFile", (filename) => {
    const filePath = path.join(jsonDir, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`[json_handler][WARN] File không tồn tại: ${filePath}`);
      socket.emit("jsonData", { error: "File không tồn tại" });
      return;
    }

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(content);
      socket.emit("jsonData", data);
      console.log(`[json_handler][INFO] Sent data for file: ${filename}`);
    } catch (err) {
      console.error("[json_handler][ERROR] Lỗi đọc hoặc parse JSON:", err);
      socket.emit("jsonData", { error: "Lỗi đọc file JSON" });
    }
  });

  /* ------------------- GHI / CẬP NHẬT FILE JSON ------------------- */
  socket.on("writeJsonFile", (data) => {
    const { filePath, data: updateObj } = data;
    const dir = path.dirname(filePath);

    try {
      // Tạo thư mục nếu chưa có và đặt quyền 777
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
      }
      fs.chmodSync(dir, 0o777);

      let jsonData = {};
      if (fs.existsSync(filePath)) {
        try {
          jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch (e) {
          jsonData = {};
        }
        fs.chmodSync(filePath, 0o777);
      }

      Object.assign(jsonData, updateObj);

      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), { mode: 0o777 });
      fs.chmodSync(filePath, 0o777);

      console.log("[json_handler][INFO] JSON updated successfully:", filePath);
      socket.emit("writeResult", "JSON updated successfully");
    } catch (err) {
      console.error("[json_handler][ERROR] Lỗi ghi file JSON:", err);
      socket.emit("writeResult", "Lỗi ghi file JSON");
    }
  });

  /* ------------------- XÓA SELECTED KITS ------------------- */
  socket.on("delete_selected_kit", (list) => {
    console.log("[json_handler][INFO] Deleting selected kits:", list);

    list.forEach(file => {
      const fullPath = path.join(jsonDir, file);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { force: true });
        console.log("[json_handler][INFO] Deleted:", fullPath);
      }
    });

    socket.emit("delete_selected_done");
  });

  /* ------------------- XÓA TẤT CẢ KITS ------------------- */
  socket.on("delete_all_kit", () => {
    console.log("[json_handler][INFO] Deleting ALL kits in:", jsonDir);

    const files = fs.readdirSync(jsonDir);
    files.forEach(file => {
      const fullPath = path.join(jsonDir, file);
      if (fs.existsSync(fullPath) && fullPath.endsWith(".json")) {
        fs.rmSync(fullPath, { force: true });
        console.log("[json_handler][INFO] Deleted:", fullPath);
      }
    });

    socket.emit("delete_all_done");
  });

  /* ------------------- ĐỌC 1 KEY TỪ FILE JSON ------------------- */
  socket.on("readJsonKey", (data) => {
    const { filePath, key } = data;

    try {
      if (!fs.existsSync(filePath)) {
        socket.emit("jsonKeyValue", { error: "File không tồn tại" });
        return;
      }

      const raw = fs.readFileSync(filePath, "utf8");
      const json = JSON.parse(raw);
      const value = json[key];

      socket.emit("jsonKeyValue", { key, value });
    } catch (err) {
      console.error("[json_handler][ERROR] readJsonKey:", err);
      socket.emit("jsonKeyValue", { error: err.message });
    }
  });

}

module.exports = { registerJsonSocket };
