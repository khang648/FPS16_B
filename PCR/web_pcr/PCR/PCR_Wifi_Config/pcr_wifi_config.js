function Render_Wifi_Config()
{
  loadHeader();
  document.addEventListener("headerLoaded", () => 
  {
    initHeaderLogic();
    Render_Tool("control-panel-wifi-config", "wifi_config");
    //Pack_Data(null, null , null, null , "request_wifi_config"); // Yêu cầu dữ liệu wifi
  }); 
}

/*==== Render Header và Protocol khi include file này======*/
Render_Wifi_Config();



const socket = io();

// Elements
const lblStatus       = document.getElementById("wifi-status-label");
const inputSSID       = document.getElementById("wifi-ssid");
const inputPass       = document.getElementById("wifi-password");
const chkShowPass     = document.getElementById("showPass");
const wifiListSection = document.getElementById("wifi-scan-section");
const wifiList        = document.getElementById("wifi-list");
const btnConnect      = document.getElementById("btnConnect");

// State
let wifiConnected = false;
let currentSSID = "";
let scanInterval = null;
let isWaitingForWifiConnect = false;


// Get Wifi Icon
function getWifiIcon(dBm) {
    let opacity = 1;
    if      (dBm >= 75) opacity = 1;
    else if (dBm >= 50) opacity = 0.7;
    else if (dBm >= 30) opacity = 0.3;
    else opacity = 0.2;

    return `<img src="../../assets/wifi.png" style="width:20px; height:20px; opacity:${opacity}">`;
}



// Display Connected State
function showConnectedState(info) {
    lblStatus.textContent = `Connected to: ${info.ssid}`;

    // inputSSID.value = info.ssid || "";
    // inputPass.value = info.password || "";
    inputSSID.value = "";
    inputPass.value = "";
}

// Display Disconnected State
function showDisconnectedState() {
    lblStatus.textContent = "Not connected";

    inputSSID.value = "";
    inputPass.value = "";
}

// Auto Scan WiFi every 15 seconds
function startAutoScan() {
    if (scanInterval) return;

    socket.emit("wifi:scan");

    scanInterval = setInterval(() => {
        socket.emit("wifi:scan");
    }, 15000);
}

function stopAutoScan() {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
}

// Khi socket bị ngắt
socket.on("disconnect", () => {
    console.log("Socket disconnected... waiting for network.");
});

// Khi socket kết nối lại -> nghĩa là wifi mới đã kết nối
socket.on("connect", () => {
    console.log("Socket reconnected!");

    if (isWaitingForWifiConnect) {
        hidePopup();
        const ssidInput = document.getElementById("wifi-ssid");
        const passInput = document.getElementById("wifi-password");
        ssidInput.value = "";
        passInput.value = "";
        // Show_Notification("Connected!", "OK");
        // setTimeout(() => location.reload(), 1000);
    }
});

// Receive Wifi status 
socket.on("wifi:status", (data) => {
    wifiConnected = data.connected;
    currentSSID = data.ssid || "";

    if(wifiConnected){
        showConnectedState(data);
    }
    else {
        showDisconnectedState(data);
    }

    // console.log(data);
    startAutoScan();
});

// Receive WiFi scan results
socket.on("wifi:scan_result", (list) => {
    console.log("Wifi list received: ", list);
    wifiList.innerHTML = "";

    list.forEach(item => {
        const li = document.createElement("li");
        li.className = "wifi-item";

        li.innerHTML = `
            <span class="wifi-name">${item.ssid}</span>
            <span class="wifi-icon">${getWifiIcon(item.strength)}</span>
        `;

        li.addEventListener("click", () => {
            inputSSID.value = item.ssid;
            inputPass.focus();
        });

        wifiList.appendChild(li);
    });

    //wifiListSection.classList.remove("hidden");
    
});


// Receive connection result
socket.on("wifi:connect_result", (data) => {
    if (data.success) {
        wifiConnected = true;
        showConnectedState(data);
        Show_Notification("Connected successfully!", "OK");
    } else {
        Show_Notification(`Failed: ${data.message}`, "OK");
    }
});


document.addEventListener("DOMContentLoaded", () => {

    // Show / Hide Password
    chkShowPass.addEventListener("change", () => {
        inputPass.type = chkShowPass.checked ? "text" : "password";
    });

    // Load initial WiFi status from server
    socket.emit("wifi:get_status");

    // Connect clicked
    btnConnect.addEventListener("click", async () => {
        const ssid = inputSSID.value.trim();
        const password = inputPass.value.trim();

        if (!ssid || !password) {
            alert("🟡 Please enter wifi SSID and Password");
            return;
        }

        const confirmed = confirm(`The system will connect to Wi-Fi "${ssid}"`);
        if (!confirmed) return;

        isWaitingForWifiConnect = true;   //Bật cờ

        socket.emit('web_pcr_wifi_config', { ssid, password });
        socket.emit('web_pcr_wifi_restart');

        Show_Loading();
    });

});
