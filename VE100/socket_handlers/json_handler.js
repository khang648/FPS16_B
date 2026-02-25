const fs = require("fs");
const path = require("path");

// 
const jsonDir = "/home/pi/VE100";

// ======================= REGISTER SOCKET =======================
function registerJsonSocket(io, socket) {
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
  socket.on("writeJsonFile", (payload) => {

    const { filePath, data: updateObj } = payload;
    const dir = path.dirname(filePath);
    try {
      // Tạo thư mục nếu chưa tồn tại
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
      }

      // Đọc file cũ nếu có
      let jsonData = {};

      if (fs.existsSync(filePath)) {
        try {
          jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch (e) {
          console.warn("[json_handler][WARN] JSON lỗi format, reset về {}");
          jsonData = {};
        }
      }

      // Merge dữ liệu mới
      Object.assign(jsonData, updateObj);

      // Ghi file
      fs.writeFileSync(
        filePath,
        JSON.stringify(jsonData, null, 2),
        { mode: 0o777 }
      );

      console.log("[json_handler][INFO] JSON updated:", filePath);

      // Trả kết quả chuẩn object
      socket.emit("writeResult", {
        success: true,
        filePath: filePath
      });

    } catch (err) {

      console.error("[json_handler][ERROR] Lỗi ghi file JSON:", err);

      socket.emit("writeResult", {
        success: false,
        error: err.message
      });
    }
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
