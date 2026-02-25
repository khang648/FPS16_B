/* ================= GLOBAL SOCKET ================= */
window.socket = io();

/* ================= DOM ELEMENTS ================= */
const lblStatus       = document.getElementById("wifi-status-label");
const inputSSID       = document.getElementById("wifi-ssid");
const inputPass       = document.getElementById("wifi-password");
const chkShowPassWifi     = document.getElementById("showPass");
const wifiListSection = document.getElementById("wifi-scan-section");
const wifiList        = document.getElementById("wifi-list");
const btnConnect      = document.getElementById("btnConnect");

/* ================= STATE ================= */
let wifiConnected = false;
let currentSSID = "";
let scanInterval = null;
let isWaitingForWifiConnect = false;

/* ================= WIFI ICON ================= */
function getWifiIcon(dBm) {
    if (dBm >= 75) return '<i class="fas fa-wifi"></i>';
    if (dBm >= 50) return '<i class="fas fa-wifi" style="opacity:0.7"></i>';
    if (dBm >= 30) return '<i class="fas fa-wifi" style="opacity:0.3"></i>';
    return '<i class="fas fa-wifi" style="opacity:0.2"></i>';
}

/* ================= UI STATE ================= */
function showConnectedState(info) {
    lblStatus.textContent = `Connected to: ${info.ssid}`;
    inputSSID.value = "";
    inputPass.value = "";
}

function showDisconnectedState() {
    lblStatus.textContent = "Not connected";
    inputSSID.value = "";
    inputPass.value = "";
}

/* ================= AUTO SCAN ================= */
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

/* ================= SOCKET EVENTS ================= */
socket.on("disconnect", () => {
    console.log("Socket disconnected... waiting for network.");
});

socket.on("connect", () => {
    console.log("Socket reconnected!");

    if (isWaitingForWifiConnect) {
        hidePopup();
        inputSSID.value = "";
        inputPass.value = "";
    }
});

/* ---------- WIFI STATUS ---------- */
socket.on("wifi:status", (data) => {
    wifiConnected = data.connected;
    currentSSID = data.ssid || "";

    if (wifiConnected) {
        showConnectedState(data);
    } else {
        showDisconnectedState();
    }

    startAutoScan();
});

/* ---------- WIFI SCAN RESULT ---------- */
socket.on("wifi:scan_result", (list) => {
    console.log("Wifi list received:", list);

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

    wifiListSection.classList.remove("hidden");
});

/* ---------- CONNECT RESULT ---------- */
socket.on("wifi:connect_result", (data) => {
    if (data.success) {
        wifiConnected = true;
        showConnectedState(data);
        Show_Notification("Connected successfully!", "OK");
    } else {
        Show_Notification(`Failed: ${data.message}`, "OK");
    }
});

/* ================= MAIN INIT ================= */
document.addEventListener("DOMContentLoaded", () => {

    /* Show / Hide password */
    chkShowPassWifi.addEventListener("change", () => {
        inputPass.type = chkShowPassWifi.checked ? "text" : "password";
    });

    /* Load current wifi status */
    socket.emit("wifi:get_status");

    /* Connect button */
    btnConnect.addEventListener("click", () => {
        const ssid = inputSSID.value.trim();
        const password = inputPass.value.trim();

        if (!ssid || !password) {
            alert("🟡 Please enter wifi SSID and Password");
            return;
        }

        if (!confirm(`The system will connect to Wi-Fi "${ssid}"`)) return;

        isWaitingForWifiConnect = true;

        socket.emit("web_pcr_wifi_config", { ssid, password });
        socket.emit("web_pcr_wifi_restart");

        showPopup("loading", "Please wait...");
    });

    /* Back button */
    document.getElementById("btnBack").addEventListener("click", () => {
        window.history.back();
    });
});
