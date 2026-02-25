const { exec } = require("child_process");

/**
 * Chạy lệnh shell và trả về stdout
 */
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 2048 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`[WiFi][ERR] Command failed: ${cmd}`, err);
        return resolve("");
      }
      resolve(stdout.trim());
    });
  });
}

// ========================================================
// Lấy trạng thái WiFi hiện tại
// ========================================================
async function getWifiStatus() {
  try {
    const wifiStatus = await run(`nmcli -t -f WIFI g`);
    if (wifiStatus !== "enabled") {
      return { connected: false, ssid: "", password: "" };
    }

    const wifiList = await run(`nmcli -t -f ACTIVE,SSID dev wifi`);
    let currentSSID = "";
    for (const line of wifiList.split("\n")) {
      const [active, ssid] = line.split(":");
      if (active === "yes") {
        currentSSID = ssid?.trim() || "";
        break;
      }
    }

    if (!currentSSID) return { connected: false, ssid: "", password: "" };

    const profiles = await run(`nmcli -t -f NAME,SSID connection show`);
    let profileName = "";
    for (const line of profiles.split("\n")) {
      const [name, ssid] = line.split(":");
      if (ssid?.trim() === currentSSID) {
        profileName = name?.trim() || "";
        break;
      }
    }

    let password = "";
    if (profileName) {
      password = await run(
        `sudo nmcli -s -g 802-11-wireless-security.psk connection show "${profileName}"`
      );
    }

    return { connected: true, ssid: currentSSID, password: password || "" };
  } catch (err) {
    console.error("[WiFi][ERR] getWifiStatus failed:", err);
    return { connected: false, ssid: "", password: "" };
  }
}

// ========================================================
// Quét WiFi và loại bỏ SSID trùng
// ========================================================
async function scanWifi() {
  try {
    await run(`sudo nmcli device wifi rescan`);
    const list = await run(`nmcli -t -f SSID,SIGNAL device wifi list`);

    const wifiMap = {};
    list.split("\n").forEach(line => {
      if (!line.trim()) return;
      const [ssid, strength] = line.split(":");
      const cleanSSID = ssid || "Hidden";
      const signal = parseInt(strength || 0, 10);

      // Giữ SSID mạnh nhất
      if (!wifiMap[cleanSSID] || wifiMap[cleanSSID].strength < signal) {
        wifiMap[cleanSSID] = { ssid: cleanSSID, strength: signal };
      }
    });

    return Object.values(wifiMap);
  } catch (err) {
    console.error("[WiFi][ERR] scanWifi failed:", err);
    return [];
  }
}

// ========================================================
// Kết nối WiFi
// ========================================================
async function connectWifi(ssid, password) {
  try {
    const cmd = password
      ? `sudo nmcli device wifi connect "${ssid}" password "${password}"`
      : `sudo nmcli device wifi connect "${ssid}"`;

    const output = await run(cmd);
    const success = output.toLowerCase().includes("successfully");

    return {
      success,
      ssid,
      password: password || "",
      message: success ? "Connected successfully" : output
    };
  } catch (err) {
    console.error("[WiFi][ERR] connectWifi failed:", err);
    return { success: false, message: "Connection failed" };
  }
}

// ========================================================
// Ngắt kết nối WiFi
// ========================================================
async function disconnectWifi(ssid) {
  try {
    const output = await run(`sudo nmcli connection down "${ssid}"`);
    return output.toLowerCase().includes("successfully");
  } catch (err) {
    console.error("[WiFi][ERR] disconnectWifi failed:", err);
    return false;
  }
}

// ========================================================
module.exports = {
  getWifiStatus,
  scanWifi,
  connectWifi,
  disconnectWifi
};
