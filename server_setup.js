// Ðây là file dùng d? t?i thu vi?n c?u hình I/O....
// L?nh ch?y 
// sudo node server_setup.js

const { execSync } = require('child_process');
const fs = require('fs');

const CONFIG_FILE = '/boot/firmware/config.txt';
const HOSTNAME    = 'FPS16B';
const HOSTS_FILE  = '/etc/hosts';
const SERVER_FILE = '/home/pi/FPS16_B/server_app.js'; 
const SYSCTL_FILE = '/etc/sysctl.conf';

const commands = [
    'sudo apt update',                               // Update
    'npm install serialport',                        //  Serial
    'sudo apt install -y nodejs npm',                //  node js
    'sudo apt install -y hostapd dnsmasq',           //  dns AP
    'sudo apt install -y avahi-daemon libnss-mdns',  //  mDNS
    'sudo apt install -y avahi-utils',
    'sudo systemctl enable avahi-daemon', 
    'sudo systemctl start avahi-daemon'              // B?t mDNS
];

// -------- B?T UART SERIAL T? Ð?NG --------
function Enable_Serial() {
     try 
     {
        let content = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE, 'utf8') : '';
        
        if (!content.includes('enable_uart=1')) 
        {
            fs.appendFileSync(CONFIG_FILE, '\nenable_uart=1\n', 'utf8');
            console.log('[UART] enable_uart=1 dã thêm vào config.txt');
        } 
        else 
        {
            console.log('[UART] UART dã b?t tru?c dó trong config.txt');
        }

        // Disable console login trên UART
        execSync('sudo systemctl disable serial-getty@ttyAMA0.service', { stdio: 'inherit' });
        console.log('[UART] Console login trên UART dã b? disable');

        // Thêm user vào nhóm dialout
        execSync('sudo usermod -a -G dialout $USER', { stdio: 'inherit' });
        console.log('[UART] User dã du?c thêm vào nhóm dialout');
    } 
    catch (err) 
    {
        console.error('[ERR] Không b?t du?c UART:', err.message);
    }
}

// -------- T?T BLUETOOTH --------
function Disnable_BLE() {
    try 
    {
        let content = '';

        if (fs.existsSync(CONFIG_FILE)) 
        {
            content = fs.readFileSync(CONFIG_FILE, 'utf8');
            if (!content.includes('dtoverlay=pi4-disable-bt'))  
            {
                fs.appendFileSync(CONFIG_FILE, '\ndtoverlay=pi4-disable-bt\n', 'utf8');
                console.log('[OK] Bluetooth dã du?c t?t.');
            } 
            else 
            {
                console.log('[INFO] Bluetooth dã b? t?t tru?c dó, b? qua.');
            }
        } 
        else 
        {
            console.error('[ERR] Không tìm th?y file config.txt:', CONFIG_FILE);
        }
    } 
    catch (err) 
    {
        console.error('[ERR] Không th? ch?nh s?a config.txt:', err.message);
    }
}

// -------- T?I THU VI?N ------------
function Install_Lib() 
{
    for (const cmd of commands) 
    {
        try 
        {
            console.log(`[RUN] ${cmd}`);
            // const output = execSync(cmd, { stdio: 'inherit' });
            // console.log(output.toString());
        } 
        catch (err) 
        {
            // console.error(`[ERROR] L?nh th?t b?i: ${cmd}`);
            // console.error(err.message);
            // console.log('[WARN] B? qua l?i và ti?p t?c...');
        }
    }

    console.log('[DONE] Ðã t?i xong toàn b? thu vi?n');
}

//--------- C?P NH?T HOST NAME & DNS --------
function Update_Host_Name() {
    try 
    {
        console.log(`[INFO] Ðang d?i hostname thành "${HOSTNAME}"...`);

        execSync(`sudo hostnamectl set-hostname ${HOSTNAME}`, { stdio: 'inherit' });      // Ð?i hostname
        console.log('[OK] Hostname dã du?c d?i.');

        execSync('sudo systemctl restart avahi-daemon', { stdio: 'inherit' });
        console.log('[OK] Avahi-daemon dã restart.');

        if (!fs.existsSync(HOSTS_FILE)) 
        {
            console.error('[ERR] Không tìm th?y file /etc/hosts');
            return;
        }

        let content = fs.readFileSync(HOSTS_FILE, 'utf8');

        if (!content.includes(`127.0.1.1       ${HOSTNAME}`)) 
        {
            fs.appendFileSync(HOSTS_FILE, `\n127.0.1.1       ${HOSTNAME}\n`, 'utf8');
            console.log('[OK] Dòng 127.0.1.1 dã du?c thêm vào /etc/hosts');
        }
        else 
        {
            console.log('[INFO] /etc/hosts dã có dòng này, b? qua.');
        }

        console.log('[DONE] Hoàn t?t d?i hostname và c?p nh?t hosts.');
    }
    catch (err) 
    {
        console.error('[ERR] L?i khi d?i hostname ho?c c?p nh?t hosts:', err.message);
    }
}

// ----------------- T?O SYSTEMD SERVICE - CH? KH?I Ð?NG XONG WIFI M?I CH?Y SERVER -----------------
function Auto_Start_Server() {
    try {
        const serviceContent = `
[Unit]
Description=Auto start Node.js server_app.js (wait for WiFi)
After=network-online.target
Wants=network-online.target

[Service]
ExecStartPre=/bin/sleep 5
ExecStart=/usr/bin/node ${SERVER_FILE}
Restart=always
RestartSec=5
User=root                         
Environment=NODE_ENV=production
WorkingDirectory=/home/pi/FPS16_B

# ---- Hi?n th? log ra console và luu vào journal ----
StandardOutput=journal+console
StandardError=journal+console
SyslogIdentifier=server_app

[Install]
WantedBy=multi-user.target
`;

        const servicePath = '/etc/systemd/system/server_app.service';
        fs.writeFileSync('/tmp/server_app.service', serviceContent, 'utf8');
        execSync(`sudo mv /tmp/server_app.service ${servicePath}`);
        execSync('sudo chmod 644 ' + servicePath);
        execSync('sudo systemctl daemon-reload');
        execSync('sudo systemctl enable server_app.service');
        execSync('sudo systemctl restart server_app.service');

        console.log('[OK] Service server_app.js dã du?c c?u hình d? hi?n th? log ra console.');
    } 
    catch (err) {
        console.error('[ERR] Không th? t?o service:', err.message);
    }
}

// ----------------- REBOOT -----------------
function Reboot_Device() {
    try 
    {
        console.log('[INFO] Reboot thi?t b? trong 5 giây d? áp d?ng các thay d?i...');
        setTimeout(() => 
        {
            execSync('sudo reboot');
        }, 5000);
    } 
    catch (err) 
    {
        console.error('[ERR] Không th? reboot thi?t b?:', err.message);
    }
}


// ----------------- T?O THU M?C SPOTCHECK -----------------
function Create_Spotcheck_Folders() {
    try {
        const BASE_DIR = '/home/pi/Spotcheck';

        const subDirs = [
            'Results',
            'System_Check',
            'Sample_Files',
            'Global'
        ];

        // T?o thu m?c g?c Spotcheck n?u chua có
        if (!fs.existsSync(BASE_DIR)) {
            fs.mkdirSync(BASE_DIR, { recursive: true });
            console.log('[OK] Ðã t?o thu m?c:', BASE_DIR);
        } else {
            console.log('[INFO] Thu m?c Spotcheck dã t?n t?i.');
        }

        // T?o các thu m?c con
        for (const dir of subDirs) {
            const fullPath = `${BASE_DIR}/${dir}`;
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`[OK] Ðã t?o thu m?c: ${fullPath}`);
            } else {
                console.log(`[INFO] Ðã t?n t?i: ${fullPath}`);
            }
        }

        console.log('[DONE] Hoàn t?t ki?m tra & t?o thu m?c Spotcheck.');
    } catch (err) {
        console.error('[ERR] Không th? t?o thu m?c Spotcheck:', err.message);
    }
}

// -------- T?T IPV6 --------
function Disable_IPv6() {
    try {
        if (!fs.existsSync(SYSCTL_FILE)) {
            console.error('[ERR] Không tìm th?y sysctl.conf');
            return;
        }

        let content = fs.readFileSync(SYSCTL_FILE, 'utf8');

        const rules = [
            'net.ipv6.conf.all.disable_ipv6 = 1',
            'net.ipv6.conf.default.disable_ipv6 = 1',
            'net.ipv6.conf.lo.disable_ipv6 = 1'
        ];

        let updated = false;

        for (const rule of rules) {
            if (!content.includes(rule)) {
                content += `\n${rule}`;
                updated = true;
            }
        }

        if (updated) {
            fs.writeFileSync(SYSCTL_FILE, content + '\n', 'utf8');
            console.log('[OK] IPv6 dã du?c disable trong sysctl.conf');

            execSync('sudo sysctl -p', { stdio: 'inherit' });
            console.log('[OK] Ðã apply c?u hình sysctl');
        } else {
            console.log('[INFO] IPv6 dã b? t?t tru?c dó, b? qua.');
        }
    } catch (err) {
        console.error('[ERR] Không th? t?t IPv6:', err.message);
    }
}

Install_Lib();        // T?i thu vi?n
Enable_Serial();      // B?t Uart
Disnable_BLE();       // T?t Ble
Update_Host_Name();   // C?p nh?t hostname l?i c?a thi?t b?
Auto_Start_Server();  // C?p nh?t t? d?ng b?t Server
Disable_IPv6();       // T?t IPv6
Create_Spotcheck_Folders(); // T?o thu m?c Spotcheck
Reboot_Device();      // Reset thi?t b?