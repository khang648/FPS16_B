const fs                 = require('fs');
const path               = require('path'); 
const express            = require("express");
const http               = require("http");
const { Server }         = require("socket.io");
const modbus             = require("./Modbus/Modbus");
const ID                 = require("./Modbus/Modbus_ID");
const { exec }           = require('child_process');

const PIPE_PATH = '/tmp/tft_pipe';
const INFO_FILE = path.join(__dirname, '../information.json');

// Tạo Write Stream duy nhất
const tftPipe = fs.createWriteStream(PIPE_PATH, { flags: 'a' });

function sendToTFT(data) {
    try 
    {
        // Ghi dữ liệu kèm theo dấu xuống dòng rõ ràng
        tftPipe.write(JSON.stringify(data) + '\n');
    } 
    catch (err) 
    {
        console.error("Pipe Error:", err);
    }
}

let count_rx = 0;

// =========== Server Web + Socket.IO ==============
const app = express();
const server = http.createServer(app);
const io = new Server(server);
let Page_prev = "PCR/PCR_Base/pcr_base.html"; // Trang mặc định
let Tab_prev = ""; 

app.use(express.static(path.join(__dirname, "web_pcr")));

app.get("/", (req, res) => {
  res.redirect("/PCR/PCR_Base/pcr_base.html");
});

io.on("connection", (socket) => // khi có client kết nối
{
  socket.emit("Go_To_Page_Web", Page_prev, Tab_prev); // Khi có client mới kết nối thì gửi Link web trước đó
  
  //console.log("Go_To_Page_Web ", Page_prev, Tab_prev);
  //console.log("New client: ", socket.id);
  // Gửi host_name + seri_number khi client vừa kết nối

  //=========================================================
  //================== Gửi host và seri =====================
  try 
  {
    if (fs.existsSync(INFO_FILE)) 
    {
      const info = JSON.parse(fs.readFileSync(INFO_FILE, "utf8"));
      const hostName   = info.host_name   || "";
      const seriNumber = info.seri_number || "";
      socket.emit("device_info", 
      {
        host_name: hostName,
        seri_number: seriNumber,
        device_name: hostName + seriNumber
      });
    }
  } 
  catch (err) 
  {
    console.log("Cannot send device info:", err.message);
  }
  //=========================================================
  //=========================================================

  socket.on("Web_PCR", (jsonFrame) =>  // Web gửi dữ liệu liên quan đến PCR
  {
    try 
    {
      const frameArray = JSON.parse(jsonFrame); // Tách JSON
      modbus.Send_To_Uart(frameArray); // Gửi đi bằng UART
      //console.log("Web to uart: ", frameArray);
    }
    catch (err) 
    {
      //console.error("Web to uart error: ", err);
    }
  });

/*====================================================================================*/
/*====================================================================================*/ 
  // Nhận lệnh yêu cầu trạng tháng wifi
  socket.on("wifi:get_status", async () => 
  {
    try 
    {
      const wifiInfo = await getWifiStatus();  
      //console.log("Đã đọc trạng thái wifi");
      //console.log(wifiInfo);
      socket.emit("wifi:status", wifiInfo);
    } 
    catch (err) 
    {
      socket.emit("wifi:status", "");
    }
  });

  // Nhận yêu cầu quét WiFi từ client
  socket.on('wifi:scan', async () => {
    try 
    {
      const wifiList = await scanWifi();
      //console.log(wifiList);
      socket.emit("wifi:scan_result", wifiList);
    } 
    catch (err) 
    {
      socket.emit("wifi:scan_result", []);
    }
  });



  // Khi web request Wi-Fi config
  socket.on("request_wifi_config", () => 
  {
    try 
    {
      let cfg = { ssid: '', password: '' };
      if (fs.existsSync(INFO_FILE)) 
      {
        cfg = JSON.parse(fs.readFileSync(INFO_FILE, 'utf8')); // Đọc ssid và pass từ json
      }
      socket.emit("response_wifi_config", cfg); // gửi lên web
    } 
    catch (err) 
    {
      socket.emit("response_wifi_config", { ssid: '', password: '' }); // gửi ssid và pass rỗng
    }
  });
  
  // // Nhận Wi-Fi mới từ web thì lưu vào wifi.json
  // socket.on("web_pcr_wifi_config", (data) => {
  //   try
  //   {
  //       fs.writeFileSync(INFO_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  //       socket.emit('wifi_config_saved', { success: true }); // Lưu thành công
  //   } 
  //   catch (err) 
  //   {
  //       socket.emit('wifi_config_saved', { success: false }); // Lỗi lưu
  //   }
  // });

  // socket.on("web_pcr_wifi_config", (data) => {
  //   try 
  //   {
  //     let info = {};

  //     // 1. Đọc file cũ nếu tồn tại
  //     if (fs.existsSync(INFO_FILE)) {info = JSON.parse(fs.readFileSync(INFO_FILE, "utf8")); }
  //     // 2. Chỉ cập nhật wifi, giữ nguyên 
  //     info.ssid = data.ssid;
  //     info.password = data.password;
  //     // 3. Ghi lại file
  //     fs.writeFileSync( INFO_FILE,JSON.stringify(info, null, 2), { mode: 0o600 });

  //     socket.emit("wifi_config_saved", { success: true });
  //     console.log("WiFi updated, device kept:", info.device);

  //   } 
  //   catch (err) 
  //   {
  //     console.error("WiFi save error:", err);
  //     socket.emit("wifi_config_saved", { success: false });
  //   }
  // });
  socket.on("web_pcr_wifi_config", (data) => {
  try 
  {
    let info = {};

    // 1️⃣ Đọc file cũ nếu tồn tại
    if (fs.existsSync(INFO_FILE)) {
      info = JSON.parse(fs.readFileSync(INFO_FILE, "utf8"));
    }

    // 2️⃣ Đảm bảo giữ nguyên host_name và seri_number
    const hostName   = info.host_name || "";
    const seriNumber = info.seri_number || "";

    // 3️⃣ Chỉ cập nhật wifi
    info = {
      host_name:   hostName,
      seri_number: seriNumber,
      ssid:        data.ssid,
      password:    data.password
    };

    // 4️⃣ Ghi lại file
    fs.writeFileSync(INFO_FILE, JSON.stringify(info, null, 2), { mode: 0o600 });

    socket.emit("wifi_config_saved", { success: true });

    console.log(
      "WiFi updated, device kept:",
      hostName + seriNumber
    );

  } 
  catch (err) 
  {
    console.error("WiFi save error:", err);
    socket.emit("wifi_config_saved", { success: false });
  }
});



  // Nhận lệnh restart wifi
  socket.on("web_pcr_wifi_restart", async () => {

    await new Promise(r => setTimeout(r, 5000)); // Đợi 5s

    console.log('[INFO] Client requested Wi-Fi restart...');
    if (process.send) 
    {
      process.send('restart_system'); // gửi lên cha
    } 
    else
    {
      console.log('[WARN] process.send không khả dụng');
    }
  });


  socket.on("Save_Page_To_Server", (pagePath , TabPath) =>  // Khi nhận lệnh chuyển hướng trang
  {
    Page_prev = pagePath;
    Tab_prev = TabPath;
    socket.emit('Go_To_Page_Web', Page_prev, Tab_prev); // Gửi lại page với client vừa yêu cầu 
  });


  /*====================================================================================*/
  /*====================================================================================*/ 
});

// lắng nghe tất cả interface
const PORT = 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => { 
  console.log(`Server running on: http://${HOST}:${PORT}`)
  get_Device_Name();
  detectWifiModeOnce();
});



//======================= KHI NHẬN THÀNH CÔNG DỮ LIÊU TỪ UART=======================//
modbus.onFrame((frame) =>  
{
  count_rx++;
  io.emit("Web_PCR", Array.from(frame)); // Gửi dữ liệu nhận được lên web

  if (modbus.ModbusState.needUpdateTFT) 
  {
    const tftData = {
      state:          modbus.PCR_Global.state_system,
      temp:           modbus.PCR_Global.block_temp,
      cycle_cnt:      modbus.PCR_Global.cycles_cnt[ modbus.PCR_Global.pcr_loop_index],
      cycle_setpoint: modbus.PCR_Global.cycles_setpoint[ modbus.PCR_Global.pcr_loop_index],
      time:           modbus.PCR_Global.time_run,
      wifi:           modbus.PCR_Global.wifi_name,
      device:         modbus.PCR_Global.device_name
    }; 

    //console.log("[TFT SEND]", JSON.stringify(tftData));

    sendToTFT(tftData);
  }
 //console.log(frame);
});

//=================== GỬI REQUEST ĐỊNH KỲ LẤY DỮ LIỆU =====================//
setInterval(() => 
{
  const frame = modbus.Pack_Data(ID.DEVICE.PCR_ID, ID.PCR_REG.REQUEST_DATA, null, 0);
  //console.log("đã gửi dữ liệu UART ", frame);
  modbus.Send_To_Uart(frame);
}, 500);


// -------- HÀM CHẠY LỆNH ASYNC NON BLOCKING--------
function run(cmd) {
    return new Promise((resolve, reject) => 
    {
        exec(cmd, (err, stdout, stderr) => 
        {
            if (err) {
                reject(stderr || err.message);
            }
            else {
                resolve(stdout);
            }
        });
    });
}

async function getWifiStatus() {
    // Kiểm tra WiFi có bật hay không
    const wifiStatus = await run(`nmcli -t -f WIFI g`);
    if (wifiStatus.trim() !== "enabled") {
        return { connected: false, ssid: "", password: "" };
    }

    // Lấy danh sách WiFi đang kết nối
    const wifiList = await run(`nmcli -t -f ACTIVE,SSID dev wifi`);
    const lines = wifiList.split("\n");

    let currentSSID = "";

    for (const line of lines) {
        const [active, ssid] = line.split(":");
        if (active === "yes") {
            currentSSID = ssid.trim();
            break;
        }
    }

    if (!currentSSID) {
        return { connected: false, ssid: "", password: "" };
    }

    // Tìm profile tương ứng với SSID
    // const profiles = await run(`nmcli -t -f NAME,SSID connection show`);    // Bên PCR Lệnh này không hợp lệ
    const profiles = await run(`nmcli -t -f NAME connection show`);  
    const profileLines = profiles.split("\n");
    let profileName = "";
    for (const line of profileLines) {
        const [name, ssid] = line.split(":");
        if (ssid && ssid.trim() === currentSSID) {
            profileName = name.trim();
            break;
        }
    }

    let password = "";
    if (profileName) {
        password = await run(
            `sudo nmcli -s -g 802-11-wireless-security.psk connection show "${profileName}"`
        ).catch(() => "");
    }

    return {
        connected: true,
        ssid: currentSSID,
        password: password || ""
    };
}

// Quét WiFi và loại bỏ SSID trùng (giữ signal mạnh nhất)
async function scanWifi() {
  await run('sudo nmcli device wifi rescan');

  const output = await run('nmcli -t -f SSID,SIGNAL device wifi list');
  const wifiMap = {};

  for (const line of output.split('\n')) {
    if (!line.trim()) continue;

    const [rawSSID, rawSignal] = line.split(':');
    const ssid   = rawSSID || 'Hidden';
    const signal = Number(rawSignal) || 0;

    if (!wifiMap[ssid] || wifiMap[ssid].strength < signal) {
      wifiMap[ssid] = { ssid, strength: signal };
    }
  }

  return Object.values(wifiMap);
}

async function detectWifiModeOnce() {
    let info;

    try {
        info = JSON.parse(fs.readFileSync(INFO_FILE, 'utf8'));
    } catch (err) {
        console.log('[WIFI] Cannot read information.json');
        modbus.PCR_Global.wifi_name = "error";
        return;
    }

    try {
        // Tạo tên AP từ host_name + seri_number
        const deviceName = (info.host_name && info.seri_number)
            ? info.host_name + info.seri_number
            : "AP";

        // 1️⃣ Kiểm tra AP mode
        const apStatus = await run('systemctl is-active hostapd').catch(() => "");

        if (apStatus.trim() === 'active') {
            modbus.PCR_Global.wifi_name = deviceName;
            console.log('[WIFI MODE] ACCESS POINT:', deviceName);
            return;
        }

        // 2️⃣ Kiểm tra Station mode
        const iwInfo = await run('iw dev wlan0 link').catch(() => "");

        if (iwInfo && !iwInfo.includes('Not connected')) {
            modbus.PCR_Global.wifi_name = info.ssid || "";
            console.log('[WIFI MODE] WIFI CONNECTED:', modbus.PCR_Global.wifi_name);
            return;
        }

        // 3️⃣ Không có wifi
        modbus.PCR_Global.wifi_name = "";
        console.log('[WIFI MODE] No active wifi');

    } catch (err) {
        console.log('[WIFI MODE] Detect error:', err.message);
        modbus.PCR_Global.wifi_name = "";
    }
}

async function get_Device_Name() {
    try 
    {
        const data = fs.readFileSync(INFO_FILE, 'utf8');
        const info = JSON.parse(data);

        if (info.host_name && info.seri_number) 
        {
            modbus.PCR_Global.device_name = info.host_name + info.seri_number;
        } 
        else 
        {
            modbus.PCR_Global.device_name = "UNKNOWN";
        }
    } 
    catch (err) 
    {
        console.log("[INFO] Cannot read information.json");
        modbus.PCR_Global.device_name = "UNKNOWN";
    }
}
