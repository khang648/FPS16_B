// ��y l� file d�ng d? ch?y 2 server pcr v� spotcheck
// L?nh ch?y 
// sudo node server_app.js

const { exec, spawn } = require('child_process');
const rpio  = require('rpio');
const fs    = require('fs');

const WIFI_CONFIG_FILE = './information.json';
let WIFI_SSID = ''; 
let WIFI_PASS = '';
let serversStarted = false;      // Bi?n luu tr?ng th�i d� ch?y server hay chua
let serverProcesses = [];        // M?ng luu c�c server d� ch?y
let wifi_connected = false;      // Bi?n luu tr?ng th�i k?t n?i wifi
let Wifi_Check_Interval = null;  // Chuong tr�nh ki?m tra Wifi
let wifiLostStart = null;        // th?i di?m b?t d?u m?t Wi-Fi
const RETRY_CONNECT_WIFI = 10;   // K?t n?i l?i Wifi

const servers = [
    { name: 'PCR Server',       file: './PCR/server_pcr.js',       port: 3000 },
    { name: 'Spotcheck Server', file: './Spotcheck/server_sc.js',  port: 8081 },
    { name: 'TFT File',         file: './TFT/tft.py',              port: null }
];

// -------- GPIO LED - RESET BUTTON --------
const BUTTON_GPIO = 12;
const LED_RED = 5;
const LED_GREEN = 6;
let Press_Reset = null;
let Press_Hold = false;
let system_reset = false;
let ledBlinkTimer = null;

rpio.init({ mapping: 'gpio' });
rpio.open(BUTTON_GPIO, rpio.INPUT, rpio.PULL_UP);
rpio.open(LED_RED, rpio.OUTPUT, rpio.LOW);
rpio.open(LED_GREEN, rpio.OUTPUT, rpio.LOW);


// -------- H�M LED --------
function LED_Red(on) { rpio.write(LED_RED, on ? rpio.HIGH : rpio.LOW); }
function LED_Green(on) { rpio.write(LED_GREEN, on ? rpio.HIGH : rpio.LOW); }

function StartBlinkLED(ledPin, interval = 500) {
    StopBlinkLED();
    
    ledBlinkTimer = setInterval(() => 
    {
       rpio.write(ledPin, rpio.read(ledPin) ^ 1);
    }, interval); 
}

function StopBlinkLED() {
    if (ledBlinkTimer) clearInterval(ledBlinkTimer);
}

// -------- H�M CH?Y L?NH ASYNC NON BLOCKING--------
function runCommand(cmd) {
    return new Promise((resolve, reject) => 
    {
        exec(cmd, (err, stdout, stderr) => 
        {
            if (err) reject(stderr || err.message);
            else resolve(stdout);
        });
    });
}

// -------- KI?M TRA N�T NH?N --------
setInterval(async () => {
    const isPressed = (rpio.read(BUTTON_GPIO) === rpio.LOW);

    if (isPressed) 
    {
        if (!Press_Reset) 
        {
            Press_Reset = Date.now();          // b?t d?u nh?n
            Press_Hold = false;        // reset c?
        }

        // N?u gi? d? 10s v� chua x? l�
        if (Date.now() - Press_Reset >= 8000 && !Press_Hold) 
        {
            Press_Hold = true; // d�nh d?u d� x? l� d? kh�ng b? l?p
            system_reset = true; // th�ng b�o dang reset
            StopBlinkLED();
            LED_Green(false);     // t?t d�n xanh
            LED_Red(false);        // b?t d�n d?

            console.log('[BUTTON] Gi? d? 8s! B?t d?u chuy?n sang AP mode...');

            if (Wifi_Check_Interval) clearInterval(Wifi_Check_Interval); // D?ng check Wifi n?u c�
            Stop_Server();         // D?ng server
            Write_Wifi_Config();   // X�a n?i dung wifi
            await Start_AP_Mode();       // Chuy?n sang AP mode
            Run_Server();          // Ch?y server

            LED_Green(false);      // t?t d�n xanh
            LED_Red(true);         // b?t d�n d?
            console.log('[BUTTON] �� chuy?n sang AP mode th�nh c�ng.');
            system_reset = false;
        }
    } 
    else 
    {
        // Khi th? n�t: reset b? d?m
        Press_Reset = null;
        Press_Hold = false;
    }
}, 100);

// -------- CLEAR C?NG --------
async function freePort(port) {
    try { await runCommand(`sudo fuser -k ${port}/tcp`); }
    catch {}
}

// -------- START SERVER --------
// async function Run_Server() {
//   if (serversStarted) 
//   {
//     console.log('[SERVER]Server d� ch?y tru?c d� chua du?c x�a');
//     return;
//   }
//     serversStarted = true;

//   for (const s of servers) 
//   {
//     await freePort(s.port); // Clear c?ng

//     if(system_reset == true)
//         return;

//     const child = spawn('node', [s.file], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] }); 
//     serverProcesses.push(child);
//     console.log(`[START] ${s.name} -> ${s.file} (PID: ${child.pid})`);

//     child.stdout.on('data', data => process.stdout.write(`[${s.name}] ${data}`));
//     child.stderr.on('data', data => process.stderr.write(`[${s.name} ERROR] ${data}`));

//     // ?? L?ng nghe t�n hi?u t? process con
//     child.on('message', async (msg) => 
//     {
//       if (msg === 'restart_system') 
//       {
//         console.log(`[SYSTEM] Nh?n l?nh restart t? ${s.name}`);
//         await Restart_System();
//       }
//     });

//     child.on('exit', code => 
//     {
//         console.log(` ${s.name}.js d� d?ng, m� tho�t = ${code}`);
//     });
//   }
// }

async function Run_Server() {
  if (serversStarted) {
    console.log('[SERVER] Server đã chạy');
    return;
  }

  serversStarted = true;

  for (const s of servers) {

    if (system_reset) return;

    // Chỉ free port nếu có port
    if (s.port) {
      await freePort(s.port);
    }

    let child;

    // 👉 NodeJS server
    if (s.file.endsWith('.js')) {
      child = spawn('node', [s.file], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
    }
    // 👉 Python service
    else if (s.file.endsWith('.py')) {
      child = spawn('python3', [s.file], { stdio: ['pipe', 'pipe', 'pipe'] });
    }

    serverProcesses.push(child);
    console.log(`[START] ${s.name} -> ${s.file} (PID: ${child.pid})`);

    child.stdout.on('data', data =>
      process.stdout.write(`[${s.name}] ${data}`)
    );

    child.stderr.on('data', data =>
      process.stderr.write(`[${s.name} ERROR] ${data}`)
    );

    child.on('exit', code => {
      console.log(`[STOP] ${s.name} exit code = ${code}`);
    });
  }
}


// -------- STOP SERVER --------
async function Stop_Server() {
    if (serverProcesses.length === 0) return;
    
    console.log('[SERVER] �ang d?ng server cu...');
    
    await Promise.all(serverProcesses.map(p => new Promise(resolve => 
    {
        p.once('exit', () => resolve());
        try { p.kill('SIGTERM'); } catch {}
    })));

    serverProcesses = [];
    serversStarted = false;

    console.log('[SERVER] Server d� d?ng ho�n to�n.');
}

// -------- WIFI CONFIG --------
function Read_Wifi_Config() {
    try {
        if (fs.existsSync(WIFI_CONFIG_FILE)) {
            const data = JSON.parse(fs.readFileSync(WIFI_CONFIG_FILE, 'utf8'));
            WIFI_SSID = data.ssid || '';
            WIFI_PASS = data.password || '';
            console.log(`[INFO] Loaded Wi-Fi config:`);
            console.log(`       SSID: "${WIFI_SSID}"`);
            console.log(`       PASS: "${WIFI_PASS}"`);
        } else {
            console.error('[WARN] Kh�ng t�m th?y wifi.json');
        }
    } catch (err) {
        console.error('[ERROR] L?i d?c wifi.json:', err);
    }
}

// ------- X�A SSID PASS --------
function Write_Wifi_Config() {
    try {
        fs.writeFileSync(WIFI_CONFIG_FILE, JSON.stringify({ ssid: '', password: '' }, null, 4), 'utf8');
        console.log('[INFO] �� x�a SSID v� password trong wifi.json');
        return true;
    } catch (err) {
        console.error('[ERROR] Kh�ng th? x�a wifi.json:', err.message);
        return false;
    }
}

async function Remove_Old_Wifi() {
    try 
    {
        const profiles = (await runCommand('nmcli -t -f NAME connection show'))
            .split('\n').filter(Boolean);
        for (const profile of profiles) 
        {
            await runCommand(`sudo nmcli connection delete id "${profile}"`);
            console.log(`[INFO] X�a profile cu: ${profile}`);
        }
    } 
    catch (err) 
    {
        console.warn('[WARN] Kh�ng x�a du?c profile cu:', err);
    }
}

// -------- WAIT WIFI --------
async function Wait_For_Wifi(ssid, timeoutSec = 15) {
    const start = Date.now();
    while ((Date.now() - start) / 1000 < timeoutSec) 
    {
        try 
        {
            if(system_reset == true)
                return false;

            const status = await runCommand('nmcli -t -f DEVICE,STATE device');
            const wlan0 = status.split('\n').find(line => line.startsWith('wlan0:'));
            if (wlan0 && wlan0.includes('connected')) 
            {
                console.log(`[OK] Raspberry Pi d� k?t n?i Wi-Fi th�nh c�ng: ${ssid}`);
                return true;
            }
        } 
        catch {}
        await new Promise(r => setTimeout(r, 1000));
    }
    console.error(`[ERR] Kh�ng th? k?t n?i Wi-Fi "${ssid}" sau ${timeoutSec} gi�y.`);
    return false;
}

// -------- START AP MODE --------
async function Start_AP_Mode() {
    console.log('[INFO] �ang b?t AP mode "FPS16B"...');
    try {
        await runCommand('sudo systemctl stop wpa_supplicant');
        await Remove_Old_Wifi();
        await runCommand('sudo nmcli radio wifi off');
        await runCommand('sudo nmcli radio wifi on');
        await runCommand('sudo ip addr flush dev wlan0');
        await runCommand('sudo ip addr add 192.168.50.1/24 dev wlan0');

        fs.writeFileSync('/etc/hostapd/hostapd.conf', `
interface=wlan0
driver=nl80211
ssid=FPS16B
hw_mode=g
channel=7
auth_algs=1
ignore_broadcast_ssid=0
`);

        fs.writeFileSync('/etc/dnsmasq.conf', `
interface=wlan0
dhcp-range=192.168.50.10,192.168.50.100,255.255.255.0,24h
`);

        await runCommand('sudo systemctl restart hostapd');
        await runCommand('sudo systemctl restart dnsmasq');

        console.log('[OK] AP mode "FPS16B" d� b?t t?i 192.168.50.1');
    } 
    catch (err) 
    {
        console.error('[ERR] Kh�ng th? b?t AP mode:', err);
    }
}

// -------- CONNECT WIFI --------
async function Connect_To_Wifi(ssid, password) {
    StopBlinkLED();        // ?? D?ng m?i blink c�n s�t l?i
    StartBlinkLED(LED_GREEN, 500);    // B?t d?u blink led
    LED_Red(false);
    LED_Green(false);


     if( ssid.trim() === '' &&  password.trim() === '') // N?u kh�ng c� ssid v� pass th� return false
     {
       return false;
     }
    
     console.log(`[INFO] B?t d?u k?t n?i Wi-Fi: ${ssid}`); 
     try 
     {
         console.log('[INFO] Ki?m tra v� t?t AP n?u dang b?t...');
        
         await runCommand('sudo systemctl start wpa_supplicant');
         await runCommand('sudo systemctl stop hostapd');
         await runCommand('sudo systemctl stop dnsmasq');
         await runCommand('sudo nmcli radio wifi on');     // B?t l?i wifi n?u b? t?t
         
        //  await Enable_Interface('wlan0');
         await Remove_Old_Wifi();                          // X�a t�n wifi cu
     } 
     catch (err) 
     {
         console.warn('[WARN] Kh�ng th? t?t AP:', err);
     }


     for (let cnt = 0; cnt <= RETRY_CONNECT_WIFI; cnt++) 
     {
         try 
         {
             await runCommand(`sudo nmcli device wifi connect "${ssid}" password "${password}" ifname wlan0`);
             const ok = await Wait_For_Wifi(ssid, 15);

             if(system_reset == true)
                 return false;

             StopBlinkLED();
             return ok;
         } 
         catch (err) 
         {
             console.error('[ERR] L?i khi k?t n?i Wi-Fi:', err);
             if(system_reset == true)
                 return false;
         }

         if (cnt < RETRY_CONNECT_WIFI)
             await new Promise(r => setTimeout(r, 2000));
     }
     console.error(`[ERR] Kh�ng th? k?t n?i Wi-Fi "${ssid}" sau ${RETRY_CONNECT_WIFI} l?n th?`);
     return false;
}

// H�m ki?m tra tr?ng th�i Wi-Fi
async function Check_Wifi_Status() 
{
    try 
    {
        const status = await runCommand('nmcli -t -f DEVICE,STATE device');
        const wlan0 = status.split('\n').find(line => line.startsWith('wlan0:'));
        const disconnected = wlan0 && wlan0.includes('disconnected');

        if (disconnected) 
        {
            if (!wifiLostStart) // M?t wifi
            {    
                StartBlinkLED(LED_GREEN, 500);
                LED_Red(false);
                wifiLostStart = Date.now(); // b?t d?u d?m m?t Wi-Fi
                console.log('[WARN] Wi-fi disconnected: ' + wifiLostStart);
            } 
            else 
            {
                const lostTime = (Date.now() - wifiLostStart) / 1000;
                if (lostTime >= 60) // m?t Wi-Fi 60s ? b?t AP
                { 
                    console.log('[WARN] Wi-Fi m?t li�n t?c 60s. B?t AP mode...');
                    Stop_Server();
                    await Start_AP_Mode();
                    Run_Server();

                    LED_Red(true);
                    LED_Green(false);

                    StopBlinkLED(); // d?ng Blink led
                    clearInterval(Wifi_Check_Interval); // T?t check wifi
                    wifiLostStart = null; // reset b? d?m
                }
            }
        } 
        else 
        {
            StopBlinkLED();  // D?ng blink led
            LED_Red(false);  // T?t d�n d?
            LED_Green(true); // B?t d�n xanh
            wifiLostStart = null; // Wi-Fi tr? l?i ? reset b? d?m
        }
    } 
    catch (err) 
    {
        console.error('[ERR] Ki?m tra Wi-Fi th?t b?i:', err);
    }
}

// -------- H�M KH?I CH?Y WIFI + SERVER --------
async function Start_System() 
{
    Read_Wifi_Config();

    wifi_connected = await Connect_To_Wifi(WIFI_SSID, WIFI_PASS);

    if(system_reset == true)
        return;

    if (wifi_connected) 
    {
        StopBlinkLED();
        LED_Red(false);
        LED_Green(true);
        console.log('[INFO] Wi-Fi k?t n?i th�nh c�ng, kh?i ch?y server...');
        Run_Server();

        // D?ng interval cu n?u c�
        if (Wifi_Check_Interval) clearInterval(Wifi_Check_Interval);
        Wifi_Check_Interval = setInterval(Check_Wifi_Status, 5000); // Ki?m tra wifi m?i 5s
    } 
    else 
    {
        StopBlinkLED();
        LED_Red(true);
        LED_Green(false);
        console.log('[INFO] K?t n?i Wi-Fi th?t b?i, b?t AP mode...');
        await Start_AP_Mode();
        console.log('[INFO] AP mode d� b?t, kh?i ch?y server...');
        Run_Server();
    }
}

// -------- MAIN --------
(async () => {
    await Start_System();
})();

async function Restart_System() 
{
    console.log('[INFO] Nh?n l?nh RESTART. D?ng server v� kh?i ch?y l?i...');
    Stop_Server();   // d?ng server
    if (Wifi_Check_Interval) clearInterval(Wifi_Check_Interval); // d?ng check wifi cu
    
    
    Start_System();        // g?i l?i h�m ch?y system
    console.log('[INFO] Xong qu� tr�nh kh?i d?ng l?i !');
}





// L?nh ki?m tra log h? th?ng
// sudo journalctl -u server_app -f    