// ===== Khai báo mảng chứa các đối tượng giao diện =====
let STEP_HOLD_START_BUF  = new Array(STEP_HOLD_START).fill(null);
let PCR_LOOP_BUF         = Array.from({ length: PCR_LOOP }, () => new Array(2).fill(null));
let STEP_PCR_BUF         = Array.from({ length: PCR_LOOP }, () => new Array(STEP_PCR).fill(null));
let STEP_HOLD_END_BUF    = new Array(STEP_HOLD_END).fill(null);

let PANEL_STEP_RUNNING   = new Array(TEMP_TIME_SETPOINT_NUM).fill(null);
let LABEL_TIME_RUNNING   = new Array(TEMP_TIME_SETPOINT_NUM).fill(null);
let LABEL_CYCLES_RUNNING = new Array(PCR_LOOP).fill(null);
let INPUT_CYCLES_RUNNING = new Array(PCR_LOOP).fill(null);

let ui_LidTemp        = null;
let ui_Liquid         = null;
let ui_BtnStart       = null;
let ui_BtnEdit        = null;
let ui_BtnSave        = null;
let ui_BtnSaveAs      = null;
let ui_TimeProgram    = null;
let ui_BtnBack        = null;
let ui_BtnOpen        = null;
let ui_BtnDelete      = null;

let ui_LBNameProtocol = null;
let ui_savedList      = null;
let ui_PnlSaved       = null;
let ui_LBSavedTitle   = null;
let ui_PnlPreview     = null;
let ui_LBPreviewTitle = null;
let ui_LBPreview      = null;

/*==============Các biến xử lý nhấn nút==================*/
let Position_Click    = null;
let loading           = null;
let Tab_prev          = "pcr_menu";

let loading_Start = 0;

/*==================== Tạo loading=================================*/
function Hide_Loading()
{
  if(loading != null) // Nếu trước đó hiện loading
  {
    const elapsed = Date.now() - loading_Start;
    const waitTime = Math.max(0, 1000 - elapsed); // Timeout sau 2s
    
    setTimeout(() => 
    {
      if (loading) 
      {
        loading.close();
        loading = null;
      }
    }, waitTime);
  }
}

async function Show_Loading()
{
  loading_Start = Date.now(); 
  loading = await Show_Notification("Loading...", "Loading");
}

/*==================== Tạo notificacation==================================*/
function Show_Notification(message, type = "Yes_No") {
  return new Promise((resolve) => {

        // --- Xóa overlay cũ nếu có ---
    const Old_Overlay = document.getElementById("notification-overlay");
    if (Old_Overlay) Old_Overlay.remove(); // Xóa nó 

    // --- Overlay ---
    const overlay = document.createElement("div");
    overlay.id = "notification-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    });

    // --- Box ---
    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#fff",
      padding: "20px 30px",
      borderRadius: "12px",
      textAlign: "center",
      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      minWidth: "250px",
      maxWidth: "90%",
    });

    // --- Nội dung ---
    let contentHTML = "";

    const buttonStyle = `
      padding:8px;
      border:none;
      border-radius:8px;
      color:#fff;
      cursor:pointer;
      font-family: 'Noto Serif', serif;
      font-size:18px;
      flex:1;
    `;

    if (type === "Yes_No") {
      contentHTML = `
        <p style="font-size:18px; font-family:'Noto Serif', serif; margin-bottom:15px;">${message}</p>
        <div style="display:flex; gap:10px; width:90%; margin:0 auto;">
          <button id="notify-yes" style="${buttonStyle}; background:#28a745;">Yes</button>
          <button id="notify-no" style="${buttonStyle}; background:#dc3545;">No</button>
        </div>
      `;
    } 
    else if (type === "Cancel") {
      contentHTML = `
        <p style="font-size:18px; font-family:'Noto Serif', serif; margin-bottom:15px;">${message}</p>
        <div style="display:flex; justify-content:center; width:90%; margin:0 auto;">
          <button id="notify-cancel" style="${buttonStyle}; background:#dc3545;">Cancel</button>
        </div>
      `;
    } 
    else if (type === "Loading") {
      contentHTML = `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div class="spinner" style="
            width:40px;
            height:40px;
            border:4px solid #ddd;
            border-top:4px solid #007bff;
            border-radius:50%;
            animation: spin 1s linear infinite;
            margin-bottom:12px;
          "></div>
          <p style="font-size:18px; font-family:'Noto Serif', serif; margin:0;">${message}</p>
        </div>
      `;

      // CSS animation chỉ thêm 1 lần
      if (!document.getElementById("spinner-style")) {
        const style = document.createElement("style");
        style.id = "spinner-style";
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    } 

    else if (type === "Save_Protocol") {
  contentHTML = `
    <p style="font-size:18px; font-family:'Noto Serif', serif; margin-bottom:10px;">${message}</p>
    <input id="protocol-name" type="text" placeholder="Protocol Name"
      style="width:90%; padding:6px; border:1px solid #ccc; border-radius:6px;
             margin-bottom:15px; font-size:18px; font-family:'Noto Serif', serif; outline:none;"
      maxlength="27"
      oninput="limitUTF8Bytes(this, 27)"
      autocomplete="off" 
      autocapitalize="words"
      />
    <div style="display:flex; gap:10px; width:90%; margin:0 auto;">
      <button id="notify-save" style="${buttonStyle}; background:#28a745;">Save</button>
      <button id="notify-cancel" style="${buttonStyle}; background:#dc3545;">Cancel</button>
    </div>
  `;

  box.innerHTML = contentHTML;
  overlay.appendChild(box);        // append box vào overlay
  document.body.appendChild(overlay); // append overlay vào DOM

  const input = document.getElementById("protocol-name"); // bây giờ chắc chắn không null

  // 🔹 Bật nhận dạng giọng nói nếu trình duyệt hỗ trợ
  if (input && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) 
  {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // hoặc 'vi-VN' nếu muốn tiếng Việt
    recognition.continuous = false;
    recognition.interimResults = false;

    // Khi input được focus, bật mic
    input.addEventListener('focus', () => recognition.start());

    recognition.onresult = (event) => 
    {
      const transcript = event.results[0][0].transcript;
      input.value = transcript; // tự động điền văn bản
    };

    recognition.onerror = (event) => 
    {
      console.warn("Speech recognition error:", event.error);
    };
  }

  // 🔹 Sự kiện Save / Cancel
  document.getElementById("notify-save").onclick = async () => 
  {
    const name = input.value.trim();
    document.body.removeChild(overlay);
    resolve(null);

    if (name) {
      PROTOCOL_NAME = name; // Lấy tên protocol
      DATA_TX_LENGHT = Pack_Save_Protocol(DATA_TX,save_new);
      Pack_Data(DEVICE.PCR_ID, PCR_REG.SAVE_PROTOCOL_EEPROM, DATA_TX, DATA_TX_LENGHT, "Web_PCR"); 
    }
  };

  document.getElementById("notify-cancel").onclick = () => 
  {
    document.body.removeChild(overlay);
    resolve(null);
  };
}


    else if (type === "Date_Time") {
      contentHTML = `
        <p style="font-size:18px; font-family:'Noto Serif', serif; margin-bottom:10px;">${message}</p>
        <input id="datetime-input" type="text" placeholder="DD:MM:YYYY  HH:MM:SS"
          style="width:90%; padding:6px; border:1px solid #ccc; border-radius:6px;
                 margin-bottom:15px; font-size:18px; font-family:'Noto Serif', serif; outline:none; text-align:center;" 
                 maxlength="20" />
        <div style="display:flex; gap:10px; width:90%; margin:0 auto;">
          <button id="notify-ok" style="${buttonStyle}; background:#28a745;">OK</button>
          <button id="notify-cancel" style="${buttonStyle}; background:#dc3545;">Cancel</button>
        </div>
      `;
    }

    box.innerHTML = contentHTML;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // --- Sự kiện ---
    if (type === "Yes_No") {
      document.getElementById("notify-yes").onclick = () => { document.body.removeChild(overlay); resolve(true); };
      document.getElementById("notify-no").onclick = () => { document.body.removeChild(overlay); resolve(false); };
    } 
    
    else if (type === "Cancel") {
      document.getElementById("notify-cancel").onclick = () => { document.body.removeChild(overlay); resolve(); };
    } 
    
    else if (type === "Loading") {
      resolve({
        close: () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
      });
    } 
    
    else if (type === "Save_Protocol") 
    {
        document.getElementById("notify-save").onclick = async () => 
        {
          const name = document.getElementById("protocol-name").value.trim();
          document.body.removeChild(overlay);
          resolve(null);

          if (name) 
          {
            PROTOCOL_NAME = name; // Lấy tên protocol
            DATA_TX_LENGHT = Pack_Save_Protocol(DATA_TX, save_new);
            Pack_Data(DEVICE.PCR_ID, PCR_REG.SAVE_PROTOCOL_EEPROM, DATA_TX, DATA_TX_LENGHT, "Web_PCR"); 
          }
       };

      document.getElementById("notify-cancel").onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
    }

    else if (type === "Date_Time") {
      const input = document.getElementById("datetime-input");
      input.inputMode = "numeric";  
      
      // 🔹 Tự động định dạng khi nhập
      input.addEventListener("input", (e) => 
      {
        let val = e.target.value.replace(/\D/g, ""); // chỉ lấy số
        let out = "";

        // Chèn dấu / : và khoảng trắng tự động theo vị trí
        if (val.length > 0) out += val.substring(0, 2);
        if (val.length > 2) out += "/" + val.substring(2, 4);
        if (val.length > 4) out += "/" + val.substring(4, 8);
        if (val.length > 8) out += "  " + val.substring(8, 10);
        if (val.length > 10) out += ":" + val.substring(10, 12);
        if (val.length > 12) out += ":" + val.substring(12, 14);

        e.target.value = out;
      });

      // 🔹 Khi nhấn OK
      document.getElementById("notify-ok").onclick = () => 
      {
        const val = input.value.trim();
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s{2}(\d{2}):(\d{2}):(\d{2})$/;

        if (!regex.test(val)) {
          alert("⚠️ Invalid input format!\nCorrect format: DD/MM/YYYY  HH:MM:SS");
          return;
        }

        const [, d, m, y, h, min, s] = val.match(regex);

        // Kiểm tra giới hạn hợp lệ
        const day = +d, month = +m, year = +y, hour = +h, minute = +min, second = +s;
        const valid =
          day >= 1 && day <= 31 &&
          month >= 1 && month <= 12 &&
          year >= 2000 && year <= 2100 &&
          hour >= 0 && hour <= 23 &&
          minute >= 0 && minute <= 59 &&
          second >= 0 && second <= 59;

        if (!valid) 
        {
          alert("⚠️ Invalid value!\nPlease check date or time range.");
          return;
        }

        document.body.removeChild(overlay);
        resolve({ day, month, year, hour, minute, second });
      };

      // 🔹 Khi nhấn Cancel
      document.getElementById("notify-cancel").onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
    }
  });
}

function Show_Keyboard_Input({title = "Enter password",type = "number", maxLength = 4 }) {
  return new Promise((resolve) => {

    // --- Xóa overlay cũ ---
    const old = document.getElementById("keyboard-overlay");
    if (old) old.remove();

    // --- Overlay ---
    const overlay = document.createElement("div");
    overlay.id = "keyboard-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999
    });

    // --- Box ---
    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#fff",
      padding: "20px",
      borderRadius: "12px",
      minWidth: "260px",
      textAlign: "center",
      boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
    });

    box.innerHTML = `
      <p style="font-size:18px; margin-bottom:10px;">${title}</p>
      <input id="keyboard-input"
        type="${type}"
        maxlength="${maxLength}"
        style="width:90%; padding:8px; border-radius:8px; font-size:18px; text-align:center;"
        autocomplete="off"
      >
      <p id="keyboard-error"
         style="color:red; display:none; margin-top:6px;">
         Wrong password
      </p>
      <div style="display:flex; gap:10px; margin-top:15px;">
        <button id="keyboard-ok"
          style="flex:1; padding:8px; background:#28a745; color:#fff; border:none; border-radius:8px;">
          OK
        </button>
        <button id="keyboard-cancel"
          style="flex:1; padding:8px; background:#dc3545; color:#fff; border:none; border-radius:8px;">
          Cancel
        </button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const input = document.getElementById("keyboard-input");
    const error = document.getElementById("keyboard-error");

    input.focus();

    // --- OK ---
    document.getElementById("keyboard-ok").onclick = () => {
      const val = input.value.trim();
      document.body.removeChild(overlay);
      resolve(val);
    };

    // --- Cancel ---
    document.getElementById("keyboard-cancel").onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };
  });
}

async function Require_Admin_Password(onSuccess) {
  const val = await Show_Keyboard_Input({ title: "Enter password", type: "password", maxLength: 4 });

  if (val === null) return;

  if (val === PASS_ADMIN) 
  {
    onSuccess();
  } 
  else 
  {
    Show_Notification("Wrong password", "Cancel");
  }
}


/*================================== Các panel đối tượng =================================*/
function Render_PCR_Program() {
  const TITLE_PERCENT  = 23;
  const HEADER_PERCENT = 15;
  const STEP_SHOW      = 4; // số bước hiển thị
  let stepIndex = 0;
  let prevTemp = 25;


  const container = document.getElementById("pcr-new-list");
  
  container.innerHTML = ""; // reset container
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.padding = "0";
  container.style.margin  = "0";
  container.style.overflowX = "hidden"; 
  container.style.width = "100%"; 
  container.style.backgroundColor = COLORS.PCR_Step;

/*======================================================================================== */

  // Tính tổng số step để tính % bảng
  let STEP_PCR_TOTAL = 0;
  for (let i = 0; i < PCR_LOOP_CNT; i++) 
  { STEP_PCR_TOTAL += STEP_PCR_CNT[i]; }
  let STEP_TOTAL = HOLD_START_CNT + STEP_PCR_TOTAL + HOLD_END_CNT;


    // --- wrapper để scroll ngang ---
  const wrapper = document.createElement("div");
  wrapper.style.width = "100%";
  wrapper.style.height = (100- TITLE_PERCENT) + "%";
  wrapper.style.overflowX = "auto";   // bật scroll ngang
  wrapper.style.WebkitOverflowScrolling = "touch"; // cuộn mượt trên iOS
  wrapper.style.overflowY = "hidden";
  //wrapper.style.border = "1px solid #000"; // chỉ để nhìn rõ

  // tạo table
  const table = document.createElement("table");
  table.style.width = ((100/STEP_SHOW)*STEP_TOTAL) + "%";
  table.style.height = "100%";
  table.style.borderCollapse = "collapse"; 
  table.style.tableLayout = "fixed";       
  table.className = "pcr-table";

  const headerRow = document.createElement("tr");   // hàng header
  const bodyRow = document.createElement("tr");  // hàng body

  function createStepBox(title, widthPercent, subSteps = 1, cycleValue = null, index = 0) 
  {
    // --- header cell ---
    const th = document.createElement("th");
    th.style.height = HEADER_PERCENT + "%";
    th.style.width = widthPercent + "%";
    th.style.border = "1px solid #000";
    th.style.backgroundColor = COLORS.PCR_Tile_Step;
    th.style.fontWeight = "normal";   // 👈 chữ không đậm
    th.colSpan = subSteps; // gộp theo số substep

    if (title === "PCR Stage" && cycleValue !== null) 
    {
      // tạo container cho text + input
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.justifyContent = "center";
      div.style.alignItems = "center";
      div.style.gap = "4px";

      const label = document.createElement("span");
      label.textContent = "PCR Stage   cycles ";
      label.style.fontSize = FONT.DATA;
      LABEL_CYCLES_RUNNING[index] = label;

      const cycles = document.createElement("input");
      cycles.type = "text";
      cycles.inputMode = "numeric";
      cycles.value = cycleValue;
      cycles.style.width = "40px";
      cycles.style.height = "15px";
      cycles.style.textAlign = "center";
      cycles.style.border = "1px solid #000";
      cycles.style.borderRadius = "4px";
      cycles.style.width = "5ch";
      cycles.maxLength = 3; // Tối đa 3 số
      cycles.style.fontFamily = "'Noto Serif', serif";
      cycles.style.fontSize = "14px";
      cycles.id = `Cycles_${index}`;
      INPUT_CYCLES_RUNNING[index] = cycles;

      div.appendChild(label);
      div.appendChild(cycles);
      th.appendChild(div);

      cycles.addEventListener("input", () => {
        cycles.value = cycles.value.replace(/[^0-9]/g, ""); // chỉ số 
      });

      cycles.addEventListener("change", () => 
      {
        let Cycles_Val = parseFloat(cycles.value);
        if (isNaN(Cycles_Val) || Cycles_Val < 0) Cycles_Val = 0;  // Kiểm tra giá trị hợp lệ
        if (Cycles_Val > CYCLES_MAX_THRESOLD) Cycles_Val = CYCLES_MAX_THRESOLD;
        
        Cycles_setpoint[index] = Cycles_Val; 
        cycles.value           = Cycles_Val;  
      });

    } 
    else 
    {
      th.textContent = title;
    }

    headerRow.appendChild(th);

    // --- body cells ---
    for (let j = 0; j < subSteps; j++) 
    {
      const td = document.createElement("td");
      td.style.height = (100 - TITLE_PERCENT) + "%";
      td.style.border = "1px solid #000";
      td.style.verticalAlign = "middle";
      td.style.textAlign = "center";

      const curTemp = Temp_Time_Setpoint[0][stepIndex] || 25;
      const curTime = Temp_Time_Setpoint[1][stepIndex] || 0;

      // gọi hàm vẽ input/line vào td
      Create_Input_Line(td, stepIndex);
      prevTemp = curTemp;
      stepIndex++;

      bodyRow.appendChild(td);
    }
  }


  // Tạo top Title
  const topTable = create_Title(PROTOCOL_NAME, System.LidTemp_setpoint, System.Liquid_setpoint, TITLE_PERCENT);

  // --- 1. HOLD_START ---
  for (let i = 0; i < HOLD_START_CNT; i++) {
    createStepBox("Hold Stage", (100 / STEP_SHOW));
  }

  // --- 2. PCR_LOOP ---
  for (let i = 0; i < PCR_LOOP_CNT; i++) 
  {
    const widthPercent = (100 / STEP_SHOW) * (STEP_PCR_CNT[i] || 1);
    const subSteps = STEP_PCR_CNT[i] || 1;
    const cycleValue = Cycles_setpoint[i] || 0;
    createStepBox("PCR Stage", widthPercent, subSteps, cycleValue, i);
  }

  // --- 3. HOLD_END ---
  for (let i = 0; i < HOLD_END_CNT; i++) {
    createStepBox("Hold Stage", (100 / STEP_SHOW));
  }

  // ghép header + body vào table
  table.appendChild(headerRow);
  table.appendChild(bodyRow);
  wrapper.appendChild(table);

  container.appendChild(topTable);
  container.appendChild(wrapper);
}

function Create_Input_Line(body, stepIndex) 
{
  const prevTemp = Temp_Time_Setpoint[0][stepIndex - 1] || 25;
  const curTemp  = Temp_Time_Setpoint[0][stepIndex] || 25;
  const curTime  = Temp_Time_Setpoint[1][stepIndex] || 0;


  const TEMP_MIN = 5;
  const TEMP_MAX = 120;
  const LINE_X1 = 0.15;
  const TEMP_TIME_OFSET = 3;

  function mapTempToY(temp, bodyHeight) {
    const topPercent = 0;
    const bottomPercent = 1;
    const ratio = (TEMP_MAX - temp) / (TEMP_MAX - TEMP_MIN);
    return ratio * (bottomPercent - topPercent) * bodyHeight + topPercent * bodyHeight;
  }

  function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
  }


  body.innerHTML = "";
  body.style.position = "relative";
  body.style.width = "100%";
  body.style.height = "100%";

  const bodyWidth = body.clientWidth;
  const bodyHeight = body.clientHeight;

  /*==============================Lưu vào mảng với vị trí tương ứng=============================================*/ 
  PANEL_STEP_RUNNING[stepIndex] = body;
  

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  body.appendChild(svg);

  const x0 = 0;
  const x1 = bodyWidth * LINE_X1;
  const x2 = bodyWidth;

  const y0 = mapTempToY(prevTemp, bodyHeight);
  const y1 = mapTempToY(curTemp, bodyHeight);
  const y2 = y1;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", `${x0},${y0} ${x1},${y1} ${x2},${y2}`);
  line.setAttribute("stroke", "red");
  line.setAttribute("stroke-width", "3");
  line.setAttribute("fill", "none");
  svg.appendChild(line);

  // --- Temp container ---
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "50%";
  tempContainer.style.transform = "translate(-35%, -100%)"; // căn giữa trên line
  tempContainer.style.display = "flex";
  tempContainer.style.alignItems = "center";
  tempContainer.style.gap = "2px"; // khoảng cách nhỏ giữa input và label

  const tempInput = document.createElement("input");
  tempInput.type = "text";
  tempInput.inputMode = "numeric";
  tempInput.value = curTemp;
  tempInput.placeholder = "Temp";
  tempInput.style.width = "3ch"; // 8 ký tự
  tempInput.style.textAlign = "center";
  tempInput.style.border = "1px solid #000";
  tempInput.style.borderRadius = "5px";
  tempInput.maxLength = 3;
  tempInput.id = `Step_Temp_${stepIndex}`;
  tempInput.style.fontFamily = "'Noto Serif', serif";
  tempInput.style.fontSize = "14px";

  const tempLabel = document.createElement("span");
  tempLabel.textContent = "°C";

  tempContainer.appendChild(tempInput);
  tempContainer.appendChild(tempLabel);
  body.appendChild(tempContainer);


  // --- Time input (luôn dưới line) ---
  const timeInput = document.createElement("input");
  timeInput.type = "text";
  timeInput.inputMode = "numeric";
  timeInput.value = formatTime(curTime);
  timeInput.placeholder = "HH:MM:SS";
  timeInput.style.textAlign = "center";
  timeInput.style.position = "absolute";
  timeInput.style.left = "50%";
  timeInput.style.width = "8ch"; // 8 ký tự
  timeInput.style.border = "1px solid #000";
  timeInput.style.borderRadius = "5px"; 
  timeInput.style.transform = "translate(-50%, 0)"; // luôn dưới line
  timeInput.maxLength = 8;
  timeInput.id = `Step_Time_${stepIndex}`; 
  timeInput.style.fontFamily = "'Noto Serif', serif";
  timeInput.style.fontSize = "14px";
  body.appendChild(timeInput);

    /*==============================Lưu vào mảng với vị trí tương ứng=============================================*/ 
  LABEL_TIME_RUNNING[stepIndex] = timeInput;

  // --- Cập nhật vị trí ban đầu ---
  tempInput.style.top = `${y1}px`;
  timeInput.style.top = `${y1}px`;

  function UpdateLine() 
  {
      const w = body.clientWidth;
      const h = body.clientHeight;
      const newX1 = w * LINE_X1;
      const newX2 = w;
      const newY0 = mapTempToY(prevTemp, h);
      const newY1 = mapTempToY(parseFloat(tempInput.value) || curTemp, h);
      const newY2 = newY1;

      line.setAttribute("points", `${0},${newY0} ${newX1},${newY1} ${newX2},${newY2}`);
      tempContainer.style.top = `${newY1 - TEMP_TIME_OFSET}px`;
      timeInput.style.top     = `${newY1 + TEMP_TIME_OFSET}px`;
  }

  tempInput.addEventListener("input", () => {
      tempInput.value = tempInput.value.replace(/[^0-9]/g, ""); // chỉ số 
  });

  tempInput.addEventListener("change", () => 
  {
    let newTemp = parseFloat(tempInput.value);
    if (isNaN(newTemp) || newTemp < TEMP_MIN_THRESOLD) newTemp = TEMP_MIN_THRESOLD;  // Kiểm tra giá trị hợp lệ
    if (newTemp > TEMP_MAX_THRESOLD) newTemp = TEMP_MAX_THRESOLD;
    Temp_Time_Setpoint[0][stepIndex] = newTemp; // Cập nhật mảng
    tempInput.value = newTemp;     // Cập nhật input hiển thị (đảm bảo không vượt quá giới hạn)
    //Render_PCR_Program();    // Vẽ lại toàn bộ với giá trị mới
    Redraw_All_Step_Line();

  });

  timeInput.addEventListener("keydown", (e) => {
      const pos = timeInput.selectionStart;

      const start = timeInput.selectionStart; 
      const end = timeInput.selectionEnd;

      // Nếu chọn nhiều kí tự
      if (end - start > 0 && (e.key === "Backspace" || e.key === "Delete")) 
      {
          e.preventDefault();
          let valArr = timeInput.value.split("");
          for (let i = start; i < end; i++) 
          {
            if (valArr[i] !== ":") valArr[i] = "0"; // thay số bằng 0, giữ ":"
          }
          timeInput.value = valArr.join("");
          timeInput.setSelectionRange(start, start);
          return;
      }

      // Phím cho phép: mũi tên, tab, delete, backspace
      const allowedKeys = ["ArrowLeft","ArrowRight","Tab","Delete","Backspace"];
      if (allowedKeys.includes(e.key)) 
      {
         // Không cho xóa dấu :
          // if ((e.key === "Backspace" && (pos === 3 || pos === 6)) || 
          //     (e.key === "Delete" && (pos === 2 || pos === 5))) {
          //     e.preventDefault();
          // }
        
          const val = timeInput.value;
          if (e.key === "Backspace" && val[pos - 1] === ":") 
          {
              e.preventDefault();
              return;
          }
          if (e.key === "Delete" && val[pos] === ":") 
          {
              e.preventDefault();
              return;
          }
          return;
      }
    
      // Chỉ cho phép số 0-9
      if (!/[0-9]/.test(e.key)) 
      {
          e.preventDefault();
          return;
      }

      // Tự động nhảy qua dấu :
      if (pos === 2 || pos === 5) 
      {
          timeInput.setSelectionRange(pos + 1, pos + 1);
      }
  });
  
  timeInput.addEventListener("input", () => {
      timeInput.value = timeInput.value.replace(/[^0-9:]/g, "");
  });

  timeInput.addEventListener("blur", () => {
      // let [h, m, s] = timeInput.value.split(":").map(v => parseInt(v) || 0);
      let parts = timeInput.value.split(":");
      let h = parseInt(parts[0]) || 0;
      let m = parseInt(parts[1]) || 0;
      let s = parseInt(parts[2]) || 0;

      if (h < 0) h = 0; if (h > TIME_MAX_HOUR)   h = TIME_MAX_HOUR;
      if (m < 0) m = 0; if (m > TIME_MAX_MINUTE) m = TIME_MAX_MINUTE;
      if (s < 0) s = 0; if (s > TIME_MAX_SECOND) s = TIME_MAX_SECOND;

      timeInput.value = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
      Temp_Time_Setpoint[1][stepIndex] = h*3600 + m*60 + s;
  });

  const resizeObserver = new ResizeObserver(UpdateLine);
  resizeObserver.observe(body);

  if (window.visualViewport) 
  {
    window.visualViewport.addEventListener('resize', UpdateLine);
  }
}

function Redraw_All_Step_Line() // Vẽ lại tất cả các đường nhiệt độ
{
  for (let i = 0; i < PANEL_STEP_RUNNING.length; i++)
  {
    if (PANEL_STEP_RUNNING[i])
    {
      Redraw_Step_Line(i);
    }
  }
}

function Redraw_Step_Line(stepIndex) // vẽ lại đường nhiệt độ
{
  const TITLE_PERCENT  = 20;
  const td = PANEL_STEP_RUNNING[stepIndex];
  if (!td) return;

  // reset td
  td.innerHTML = "";
  td.style.height = (100 - TITLE_PERCENT) + "%";
  td.style.border = "1px solid #000";
  td.style.verticalAlign = "middle";
  td.style.textAlign = "center";

  // lấy dữ liệu hiện tại
  const curTemp = Temp_Time_Setpoint[0][stepIndex] || 25;
  const curTime = Temp_Time_Setpoint[1][stepIndex] || 0;

  // vẽ lại input + line
  Create_Input_Line(td, stepIndex);
}

function create_Title(PROTOCOL_NAME, LidTemp_setpoint, Liquid_setpoint, TITLE_PERCENT = 20) {
    // --- Tạo table trong topContainer ---
    const topTable = document.createElement("table");
    topTable.style.width = "100%";
    topTable.style.height = TITLE_PERCENT + "%";  // chiếm toàn bộ topContainer
    topTable.style.borderCollapse = "collapse";
    topTable.style.tableLayout = "fixed";
    topTable.style.backgroundColor = COLORS.PCR_Tile_Info;
    topTable.style.borderRight = "1px solid #000";
    topTable.style.borderLeft = "1px solid #000";
    topTable.style.borderTop = "1px solid #000";

    // --- Hàng 1: Protocol Name ---
    const row1 = document.createElement("div");
    row1.style.flex = "1"; // chiếm 50% topContainer
    row1.style.height = "50%";
    row1.style.display = "flex";
    row1.style.alignItems = "center";
    row1.style.justifyContent = "center";

    ui_LBNameProtocol = document.createElement("span");
    ui_LBNameProtocol.textContent = `Protocol Name: ${PROTOCOL_NAME}`;
    ui_LBNameProtocol.id = `Protocol_Name`;
    ui_LBNameProtocol.style.fontSize = FONT.DATA;
    row1.appendChild(ui_LBNameProtocol);

    // --- Hàng 2: LidTemp + PCR Volume ---
    const row2 = document.createElement("div");
    row2.style.flex = "1"; // chiếm 50% topContainer
    row2.style.height = "50%";
    row2.style.display = "flex"; // 2 ô ngang
    row2.style.borderTop = "1px solid #000";

    // Ô trái: LidTemp
    const leftCell = document.createElement("div");
    leftCell.style.flex = "1"; // chiếm 50% row2
    leftCell.style.display = "flex";
    leftCell.style.alignItems = "center";
    leftCell.style.justifyContent = "center";
    leftCell.style.gap = "4px"; // khoảng cách 4px giữa các phần tử

    const labelLid = document.createElement("span");
    labelLid.textContent = "Lid Temp: ";
    labelLid.style.fontSize = FONT.DATA;

    ui_LidTemp = document.createElement("input");
    ui_LidTemp.type = "text";
    ui_LidTemp.inputMode="numeric";
    ui_LidTemp.value = `${LidTemp_setpoint}`;
    // ui_LidTemp.style.width = "50px";
    ui_LidTemp.style.width = "5ch"; // 8 ký tự
    ui_LidTemp.style.textAlign = "center";
    ui_LidTemp.style.borderRadius = "5px";
    ui_LidTemp.style.borderRight = "1px solid #000";
    ui_LidTemp.maxLength = 3;
    ui_LidTemp.id = `LidTemp`;
    ui_LidTemp.style.fontFamily = "'Noto Serif', serif";
    ui_LidTemp.style.fontSize = "14px";
    ui_LidTemp.style.height = "15px";
    const unitLid = document.createElement("span");
    unitLid.textContent = " °C";
    unitLid.style.fontSize = FONT.DATA;

    leftCell.appendChild(labelLid);
    leftCell.appendChild(ui_LidTemp);
    leftCell.appendChild(unitLid);

    // Ô phải: PCR Volume
    const rightCell = document.createElement("div");
    rightCell.style.flex = "1"; // chiếm 50% row2
    rightCell.style.display = "flex";
    rightCell.style.alignItems = "center";
    rightCell.style.justifyContent = "center";
    rightCell.style.gap = "4px"; // khoảng cách 4px giữa các phần tử

    const labelVol = document.createElement("span");
    labelVol.textContent = "PCR Volume: ";
    labelVol.style.fontSize = FONT.DATA;

    ui_Liquid = document.createElement("input");
    ui_Liquid.type = "text";
    ui_Liquid.inputMode="numeric";
    ui_Liquid.value = `${Liquid_setpoint}`;
    // ui_Liquid.style.width = "50px";
    ui_Liquid.style.width = "5ch"; // 8 ký tự
    ui_Liquid.style.textAlign = "center";
    ui_Liquid.style.borderRadius = "5px";
    ui_Liquid.style.borderRight = "1px solid #000";
    ui_Liquid.maxLength = 3;
    ui_Liquid.id = `Liquid`;
    ui_Liquid.style.fontFamily = "'Noto Serif', serif";
    ui_Liquid.style.fontSize = "14px";
    ui_Liquid.style.height = "15px";
    const unitLiq = document.createElement("span");
    unitLiq.textContent = "ul";
    unitLiq.style.fontSize = FONT.DATA;

    rightCell.appendChild(labelVol);
    rightCell.appendChild(ui_Liquid);
    rightCell.appendChild(unitLiq);

    // Thêm ô vào row2
    row2.appendChild(leftCell);
    row2.appendChild(rightCell);

    // Thêm 2 hàng vào topContainer
    topTable.appendChild(row1);
    topTable.appendChild(row2);

    ui_LidTemp.addEventListener("input", () => {
      ui_LidTemp.value = ui_LidTemp.value.replace(/[^0-9]/g, ""); // chỉ số 
    });

    ui_LidTemp.addEventListener("change", () => 
    {
      let newLid = parseFloat(ui_LidTemp.value);
      if (isNaN(newLid) || newLid < LID_TEMP_MIN) newLid = LID_TEMP_MIN;  // Kiểm tra giá trị hợp lệ
      if (newLid > LID_TEMP_MAX) newLid = LID_TEMP_MAX;

      System.LidTemp_setpoint = newLid;  // Lấy nhiệt độ nắp
      ui_LidTemp.value   = newLid;  // Cập nhật nhiệt độ nắp hiển thị
    });


    ui_Liquid.addEventListener("input", () => {
      ui_Liquid.value = ui_Liquid.value.replace(/[^0-9]/g, ""); // chỉ số 
    });

    ui_Liquid.addEventListener("change", () => 
    {
      let val = parseFloat(ui_Liquid.value);
      if (!LID_THRESOLD.includes(val))  // Kiểm tra xem giá trị có nằm trong mảng không
      {  val = 30;  } // Nếu không, chọn mặc định
      System.Liquid_setpoint = val; 
      ui_Liquid.value = val;
    });



    return topTable;
}

function createStepBox(widthPercent, index) {
  const stepBox = document.createElement("div");
  stepBox.className = "step-box";
  stepBox.style.flex = `0 0 ${widthPercent}%`;

  const header = document.createElement("div");
  header.className = "step-header";
  header.textContent = `Step ${index + 1}`;
  stepBox.appendChild(header);

  const body = document.createElement("div");
  body.className = "step-body";
  stepBox.appendChild(body);

  return stepBox;
}

function Render_Chart_Temp() {
    const container = document.getElementById("Temp-Chart");
    if (!container) return;

    if (window.TempChartRoot) {
        window.TempChartRoot.dispose();
    }

    const root = am5.Root.new(container, {
        useSafeResolution: false
    });

    // Tắt logo
    if (root._logo) {
      root._logo.dispose();
    }

    window.TempChartRoot = root;

    // ================= FONT =================
    root.setThemes([am5themes_Animated.new(root)]);
    root.container.setAll({
        width: am5.percent(100),
        height: am5.percent(100),
        fontFamily: "'Noto Serif', serif", 
        fontSize: 16
    });

    // ================= CHART =================
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            width: am5.percent(100),
            height: am5.percent(100),
            panX: true,
            panY: false,
            wheelX: "panX",
            wheelY: "zoomX",
            pinchZoomX: true
        })
    );

    // ================= X AXIS =================
    const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
            min: -8000,   // quá khứ
            max: 0,       // NOW
            strictMinMax: true,
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 80
            })
        })
    );

    xAxis.get("renderer").labels.template.setAll({
        fontFamily: "'Noto Serif', serif",
        fontSize: 14
    });

    xAxis.get("renderer").labels.template.adapters.add("text", (text, target) => {
        const v = target.dataItem?.get("value");
        if (v == null) return text;

        return formatTimeByScale(v, xAxis, true);
    });


    // ================= Y AXIS =================
    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            max: 100,
            strictMinMax: true,
            maxPrecision: 0,
            extraTooltipPrecision: 0,
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 15
            })
        })
    );

    yAxis.set("gridCount", 11);

    yAxis.get("renderer").labels.template.setAll({
        fontFamily: "'Noto Serif', serif",
        fontSize: 14
    });

    yAxis.get("renderer").labels.template.adapters.add("text", (text, target) => {
        const v = target.dataItem?.get("value");
        return v != null ? v + " °C" : text;
    });

    // ================= SERIES =================
    const series = chart.series.push(
        am5xy.LineSeries.new(root, {
            xAxis,
            yAxis,
            valueXField: "x",
            valueYField: "sample",
            stroke: am5.color(0xff0000),
            tooltip: am5.Tooltip.new(root, {
                //labelText: "{valueY.formatNumber('#.0')} °C\n{valueX.formatNumber('0')} s",
                getFillFromSprite: false,   
                getStrokeFromSprite: false,
                autoTextColor: false       
            })
        })
    );

    const estimateSeries = chart.series.push(
          am5xy.LineSeries.new(root, {
              xAxis,
              yAxis,
              valueXField: "x",
              valueYField: "estimate", // khác field
              stroke: am5.color(0x0000ff), // màu xanh cho dễ phân biệt
              tooltip: am5.Tooltip.new(root, {
                //labelText: "{valueY.formatNumber('#.0')} °C\n{valueX.formatNumber('0')} s",
                getFillFromSprite: false,   
                getStrokeFromSprite: false,
                autoTextColor: false       
            })
        })
      );
      window.Temp_Estimate_Series = estimateSeries;

    const Tooltip = series.get("tooltip");
    Tooltip.label.adapters.add("text", (text, target) => {
        const dataItem = target.dataItem;
        if (!dataItem) return text;

        const y = dataItem.get("valueY");
        const x = dataItem.get("valueX");

        return `${y.toFixed(1)} °C\n${formatTimeByScale(x, xAxis)}`;
    });

    series.set("fill", am5.color(0xff0000)); // màu nền phủ

    window.Temp_Series = series;
    window.Temp_XAxis = xAxis;

    series.strokes.template.set("strokeWidth", 2);
    series.fills.template.setAll({
        visible: true,
        fillOpacity: 0.3,
     });


    estimateSeries.strokes.template.set("strokeWidth", 2);
    estimateSeries.fills.template.setAll({
        visible: true,
        fillOpacity: 0.3,
     });

    const tooltip = series.get("tooltip");
    tooltip.set("background", am5.RoundedRectangle.new(root, {
        fill: am5.color(0xD1D1D1),   // nền xám
        fillOpacity: 0.9,
        strokeOpacity: 0,
        cornerRadiusTL: 5,
        cornerRadiusTR: 5,
        cornerRadiusBL: 5,
        cornerRadiusBR: 5,
        
    }));

    tooltip.label.setAll({
        fill: am5.color(0x000000),   // chữ đen
        fontFamily: "'Noto Serif', serif",
        fontSize: 14
    });

  window.Temp_Buf = new Array(Chart_Buf_Size).fill(0);
  window.Chart_Estimate_Buf = new Array(Chart_Buf_Size).fill(0);

  // CHỈ 1 initialData duy nhất
  const initialData = window.Temp_Buf.map((v, i) => ({
      x: -((Chart_Buf_Size - 1 - i) * 2),
      value: v,
      estimate: window.Chart_Estimate_Buf[i]
  }));

  // set cho cả 2 series
  series.data.setAll(initialData);
  estimateSeries.data.setAll(initialData);
    

    // ================= TAP HIỂN THỊ NHIỆT ĐỘ =================

    const cursor = chart.set("cursor",
        am5xy.XYCursor.new(root, {
            behavior: "none",
            xAxis: xAxis
        })
    );

    cursor.lineY.set("visible", false);
    cursor.lineX.set("visible", true);

    const valueLabel = am5.Label.new(root, {
        text: "",
        visible: false,
    });


    chart.plotContainer.children.push(valueLabel);

    // Khi chạm / di chuyển trong chart
    cursor.events.on("cursorpositionchanged", () => {
        const positionX = cursor.getPrivate("positionX");
        if (positionX == null) return;

        const xValue = xAxis.positionToValue(positionX);
        const dataItem = series.getDataItemByX(xValue);
        if (!dataItem) return;

        const yValue = dataItem.get("valueY");

        valueLabel.setAll({
            text: yValue.toFixed(1) + " °C",
            x: cursor.get("point").x,
            y: cursor.get("point").y - 30,
            visible: true
        });
    });

    // Khi mất focus / nhả tay
    cursor.events.on("cursorhidden", () => {
        valueLabel.set("visible", false);
    });

    cursor.lineX.setAll({
        strokeWidth: 3,          
        stroke: am5.color(0x4D4D4D),  
        strokeOpacity: 0.8
    });

  //=================PHẦN ZOOM IN ZOOM OUT===============
  chart.zoomOutButton.set("forceHidden", true); // ẩn nút - mặc định trong thư viện
   xAxis.animate({ key: "start", to: 0.92, duration: 300, easing: am5.ease.out(am5.ease.cubic) }); // Khi khởi tạo hiện chart cuối cùng bên phải
  // ================= ANIMATION =================
  chart.appear(600, 100);


const container_object = document.getElementById("pcr-chart");
container_object.style.position = "relative";

// xóa control cũ nếu có
const oldControl = container.querySelector(".chart-control");
if (oldControl) oldControl.remove();

const controlDiv = document.createElement("div");
controlDiv.className = "chart-control";

controlDiv.style.position = "absolute";
controlDiv.style.right  = "5px";
controlDiv.style.top = "5px";
controlDiv.style.background = "rgba(255, 255, 255, 0.3)";
controlDiv.style.border = "1px solid rgba(0,0,0,0.6)";
controlDiv.style.backdropFilter = "blur(4px)";   
controlDiv.style.padding = "6px 10px";
controlDiv.style.borderRadius = "6px";
controlDiv.style.fontFamily = "serif";
controlDiv.style.fontSize = "14px";
controlDiv.style.zIndex = "100";


controlDiv.style.display = "flex";
controlDiv.style.flexDirection = "column"; 
controlDiv.style.alignItems = "flex-start"; 
controlDiv.style.gap = "5px";

// ===== SYSTEM =====
const sysLabel = document.createElement("label");
sysLabel.style.cursor = "pointer";

const sysCheckbox = document.createElement("input");
sysCheckbox.type = "checkbox";
sysCheckbox.checked = true;

const sysIcon = document.createElement("span");
sysIcon.innerHTML = " ● ";
sysIcon.style.color = "red";

sysLabel.appendChild(sysCheckbox);
sysLabel.appendChild(sysIcon);
sysLabel.appendChild(document.createTextNode("Sample"));

// ===== ESTIMATE =====
const estLabel = document.createElement("label");
estLabel.style.cursor = "pointer";

const estCheckbox = document.createElement("input");
estCheckbox.type = "checkbox";
estCheckbox.checked = true;

const estIcon = document.createElement("span");
estIcon.innerHTML = " ● ";
estIcon.style.color = "blue";

estLabel.appendChild(estCheckbox);
estLabel.appendChild(estIcon);
estLabel.appendChild(document.createTextNode("Estimate"));

// ===== ADD =====
controlDiv.appendChild(sysLabel);
controlDiv.appendChild(estLabel);

container.appendChild(controlDiv);

// ===== EVENT =====
sysCheckbox.addEventListener("change", () => {
    sysCheckbox.checked ? series.show() : series.hide();
});

estCheckbox.addEventListener("change", () => {
    estCheckbox.checked ? estimateSeries.show() : estimateSeries.hide();
});


  // ================== NÚT ZOOM IN/OUT NGOÀI CHART ==================
  // ================== NÚT ZOOM IN/OUT NGOÀI CHART ==================
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");

  const ZOOM_STEP = 0.25; // 25% biểu đồ mỗi lần zoom

  zoomInBtn.addEventListener("click", () => {
      const start = xAxis.get("start") ?? 0;
      const end = xAxis.get("end") ?? 1;
      const range = end - start;

      // thu hẹp 10% giữ trung tâm
      let newStart = start + ZOOM_STEP * range / 2;
      let newEnd   = end - ZOOM_STEP * range / 2;

      // hạn chế quá zoom
      if (newEnd - newStart < 0.001) { 
          const mid = (start + end) / 2;
          newStart = mid - 0.001;
          newEnd = mid + 0.001;
      }

      xAxis.animate({ key: "start", to: newStart, duration: 300, easing: am5.ease.out(am5.ease.cubic) });
      xAxis.animate({ key: "end",   to: newEnd,   duration: 300, easing: am5.ease.out(am5.ease.cubic) });
  });

  zoomOutBtn.addEventListener("click", () => {
      const start = xAxis.get("start") ?? 0;
      const end = xAxis.get("end") ?? 1;
      const range = end - start;

      // mở rộng 10% giữ trung tâm
      let newStart = start - ZOOM_STEP * range / 2;
      let newEnd   = end + ZOOM_STEP * range / 2;

      // hạn chế vượt ra ngoài 0→1
      if (newStart < 0) newStart = 0;
      if (newEnd > 1)   newEnd = 1;

      xAxis.animate({ key: "start", to: newStart, duration: 300, easing: am5.ease.out(am5.ease.cubic) });
      xAxis.animate({ key: "end",   to: newEnd,   duration: 300, easing: am5.ease.out(am5.ease.cubic) });
  });


    function formatTimeByScale(xValue, xAxis, isAxis = false) {
        if (xValue === 0) {
            return isAxis ? "Now" : "Now";
        }

        const range = Math.abs(
            xAxis.getPrivate("selectionMax") -
            xAxis.getPrivate("selectionMin")
        );

        const abs = Math.abs(xValue);
        const sign = "-"; 

        if (range <= 720) {
            return `${sign}${abs.toFixed(1)} s`;
        }
        else if (range <= 7200) {
            return `${sign}${(abs / 60).toFixed(1)} m`;
        }
        else {
            return `${sign}${(abs / 3600).toFixed(1)} h`;
        }
    }
}

function Render_Tool(Panel_ID, option = "new") {
    const container = document.getElementById(Panel_ID)

    container.innerHTML = "";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.gap = "5px"; // khoảng cách giữa 2 hàng
    container.style.backgroundColor = "#ffffffff"; // khoảng cách giữa 2 hàng

    // const Two_Row = ["new", "saved", "history", "temp_calib"].includes(option); // Nếu 1 trong 5 thì tạo chiều cao 20% còn nếu là admin thì chiều cao 10%
    
    const Two_Row = ["new", "saved", "history"].includes(option); // Nếu 1 trong 5 thì tạo chiều cao 20% còn nếu là admin thì chiều cao 10%
    container.style.height = Two_Row ? "20%" : "10%";

    
    if (Two_Row) 
    {
      // --- Hàng 1: START / EDIT / SAVE + thời gian ---
      const topRow = document.createElement("div");
      Object.assign(topRow.style, 
      {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "50%", // 10% tổng màn hình nếu container 20%
          gap: "2%",
          paddingLeft: "2%",   // <-- camelCase
          paddingRight: "2%",  // <-- camelCase
          boxSizing: "border-box",
          backgroundColor: "#ffffffff"
      });

      if (option === "new") 
      {
        // Nút START
        ui_BtnStart = document.createElement("button");
        ui_BtnStart.className = "ctrl-btn";
        ui_BtnStart.innerHTML = `<img src="../../assets/PCR_START_TOOL.png" style="width:16px; height:16px;"> START`;

        ui_BtnStart.addEventListener("click", function() 
        {
          const btnName = this.innerText.trim(); // Lấy tên nút khi click
          Click_Btn_Start(btnName);                  // Truyền tên vào hàm
        });
        topRow.appendChild(ui_BtnStart);

        // Nút EDIT
        ui_BtnEdit = document.createElement("button");
        ui_BtnEdit.className = "ctrl-btn";
        ui_BtnEdit.innerHTML = `<img src="../../assets/PCR_EDIT_TOOL.png" style="width:16px; height:16px;"> EDIT`;
        ui_BtnEdit.addEventListener("click", function() 
        {
          const btnName = this.innerText.trim(); // Lấy tên nút khi click
          Click_Btn_Edit(btnName);                  // Truyền tên vào hàm
        });

        topRow.appendChild(ui_BtnEdit);

        // Nút SAVE
        ui_BtnSave = document.createElement("button");
        ui_BtnSave.className = "ctrl-btn";
        ui_BtnSave.innerHTML = `<img src="../../assets/PCR_SAVE_TOOL.png" style="width:16px; height:16px;"> SAVE`;
        ui_BtnSave.addEventListener("click", function() 
        {
          const name_protocol = Extract_Name_From_Protocol(ui_LBNameProtocol);// Lấy tên nút khi click
          console.log(name_protocol);
          Click_Btn_Save(name_protocol);                  // Truyền tên vào hàm
        });
        topRow.appendChild(ui_BtnSave);

        // Nút SAVE AS
        ui_BtnSaveAs = document.createElement("button");
        ui_BtnSaveAs.className = "ctrl-btn";
        ui_BtnSaveAs.innerHTML = `<img src="../../assets/PCR_SAVE_TOOL.png" style="width:16px; height:16px;"> SAVE AS`;
        ui_BtnSaveAs.addEventListener("click", function() 
        {
          //const name_protocol = Extract_Name_From_Protocol(ui_LBNameProtocol);// Lấy tên nút khi click
          // console.log(name_protocol);
          Click_Btn_Save("none");                  // Truyền tên vào hàm
        });
        topRow.appendChild(ui_BtnSaveAs);
      }
      else if (option === "saved") 
      {
        // Nút Open
        ui_BtnOpen = document.createElement("button");
        ui_BtnOpen.className = "ctrl-btn";
        ui_BtnOpen.innerHTML = `<img src="../../assets/PCR_OPEN_TOOL.png" style="width:16px; height:16px;"> OPEN`;
        ui_BtnOpen.addEventListener("click", () => {
          if(Position_Click != null)
          {
            Tab_prev = ui_LBSavedTitle.textContent;
            Click_Btn_Open(Position_Click , option , "new"); // click open thì hiện new binhg thường
          }
        });
        topRow.appendChild(ui_BtnOpen);
        // Nút Delete
        ui_BtnDelete = document.createElement("button");
        ui_BtnDelete.className = "ctrl-btn";
        ui_BtnDelete.innerHTML = `<img src="../../assets/PCR_DELETE_TOOL.png" style="width:16px; height:16px; "> DELETE`;
        ui_BtnDelete.addEventListener("click", function() 
        {
          if(Position_Click != null)
          {
            Click_Btn_Delete(Position_Click);               
          }
        });
        
        topRow.appendChild(ui_BtnDelete);
      }
      else if (option === "history") 
      {
        // Nút Open
        ui_BtnOpen = document.createElement("button");
        ui_BtnOpen.className = "ctrl-btn";
        ui_BtnOpen.innerHTML = `<img src="../../assets/PCR_OPEN_TOOL.png" style="width:16px; height:16px;"> OPEN`;
        ui_BtnOpen.addEventListener("click", () => {
          if(Position_Click != null)
          {
            Tab_prev = ui_LBSavedTitle.textContent;
            Click_Btn_Open(Position_Click, option, "view");
          }
        });
        topRow.appendChild(ui_BtnOpen);
      }
      // else if( option === "temp_calib")
      // {
      //   // Nút Reload
      //   ui_BtnReload = document.createElement("button");
      //   ui_BtnReload.className = "ctrl-btn";
      //   ui_BtnReload.innerHTML = `<img src="../../assets/PCR_RELOAD_TOOL.png" style="width:16px; height:16px;"> RELOAD`;        
      //   ui_BtnReload.addEventListener("click", function() 
      //   {
      //     Click_Btn_Reload();               // Truyền tên vào hàm
      //   });

      //   topRow.appendChild(ui_BtnReload);

      //   // Nút Upload
      //   ui_BtnUpload = document.createElement("button");
      //   ui_BtnUpload.className = "ctrl-btn";
      //   ui_BtnUpload.innerHTML = `<img src="../../assets/PCR_UPLOAD_TOOL.png" style="width:16px; height:16px;"> UPLOAD`;        
      //   ui_BtnUpload.addEventListener("click", function() 
      //   {
      //     Click_Btn_Upload();          
      //   });
      //   topRow.appendChild(ui_BtnUpload);
      // }
      // else if( option === "wifi_config")
      // {
      //   // Nút Submit
      //   ui_BtnSubmit = document.createElement("button");
      //   ui_BtnSubmit.className = "ctrl-btn";
      //   ui_BtnSubmit.innerHTML = `<img src="../../assets/PCR_SUBMIT_TOOL.png" style="width:16px; height:16px;"> SUBMIT`;
      //   ui_BtnSubmit.addEventListener("click", function() 
      //   {
      //     Click_Btn_Submit();                  // Truyền tên vào hàm
      //   });
      //   topRow.appendChild(ui_BtnSubmit);

      //   // Nút Restart
      //   ui_BtnRestart = document.createElement("button");
      //   ui_BtnRestart.className = "ctrl-btn";
      //   ui_BtnRestart.innerHTML = `<img src="../../assets/PCR_RESTART_TOOL.png" style="width:16px; height:16px;"> RESTART`;        
      //   ui_BtnRestart.addEventListener("click", function() 
      //   {
      //     Click_Btn_Restart();               // Truyền tên vào hàm
      //   });
      //   topRow.appendChild(ui_BtnRestart);
      // }
      container.appendChild(topRow);
    }
  
    // --- Hàng 2: BACK + TIME RUN (nếu option === "new") ---
const bottomRow = document.createElement("div");
Object.assign(bottomRow.style, 
{
    display: "flex",
    justifyContent: "center",
    width: "100%",
    height: Two_Row ? "50%" : "100%",
    backgroundColor: "#ffffffff",
});


if (option === "new") // nếu là new thì render Time run
{
    bottomRow.style.flexDirection = "row";

    // ---- Cột trái: BACK ----
    const backBox = document.createElement("div");
    Object.assign(backBox.style, {
        width: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "top",
        background: "#ffffffff",
        paddingLeft: "2%",   // <-- camelCase
        paddingRight: "1%",  // <-- camelCase
    });
    ui_BtnBack = document.createElement("button");
    ui_BtnBack.className = "back-btn";
    ui_BtnBack.innerHTML = `<img src="../../assets/PCR_BACK_TOOL.png" style="width:16px; height:16px;"> BACK`; 
    ui_BtnBack.addEventListener("click", function()  
    { 
        Click_Btn_Back(option, System.Tab_Prev); 
    });

    backBox.appendChild(ui_BtnBack);

    // ---- Cột phải: TIME RUN ----
    const timeBox = document.createElement("div");
    Object.assign(timeBox.style, {
        width: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "top",
        fontSize: "20px",
        backgroundColor: "#ffffffff",
        paddingLeft: "1%",   // <-- camelCase
        paddingRight: "2%",  // <-- camelCase
    });
        
    const timeDisplay = document.createElement("div");
    timeDisplay.className = "time-display"; 

    ui_TimeProgram = document.createElement("span");
    ui_TimeProgram.id = "time";
    ui_TimeProgram.textContent = "00 : 00 : 00";
    timeDisplay.appendChild(ui_TimeProgram);
    timeBox.appendChild(timeDisplay);

    bottomRow.appendChild(backBox);
    bottomRow.appendChild(timeBox);
}
else if (option === "view") // nếu là new thì render Time run
{
    bottomRow.style.flexDirection = "row";

    // ---- Cột trái: BACK ----
    const backBox = document.createElement("div");
    Object.assign(backBox.style, {
        width: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "top",
        background: "#ffffffff",
        paddingLeft: "2%",   // <-- camelCase
        paddingRight: "1%",  // <-- camelCase
    });
    ui_BtnBack = document.createElement("button");
    ui_BtnBack.className = "back-btn";
    ui_BtnBack.innerHTML = `<img src="../../assets/PCR_BACK_TOOL.png" style="width:16px; height:16px;"> BACK`; 
    ui_BtnBack.addEventListener("click", function()  
    { 
        Click_Btn_Back(option, System.Tab_Prev); 
    });

    backBox.appendChild(ui_BtnBack);

    // ---- Cột phải: TIME RUN ----
    const timeBox = document.createElement("div");
    Object.assign(timeBox.style, {
        width: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "top",
        fontSize: "20px",
        backgroundColor: "#ffffffff",
        paddingLeft: "1%",   // <-- camelCase
        paddingRight: "2%",  // <-- camelCase
    });
        
    const timeDisplay = document.createElement("div");
    timeDisplay.className = "time-display"; 

    ui_TimeProgram = document.createElement("span");
    ui_TimeProgram.id = "time";
    ui_TimeProgram.textContent = "00 : 00 : 00";
    timeDisplay.appendChild(ui_TimeProgram);
    timeBox.appendChild(timeDisplay);

    bottomRow.appendChild(backBox);
    bottomRow.appendChild(timeBox);
}
else
{
    // ===== CÁC OPTION KHÁC: chỉ có BACK =====
    bottomRow.style.justifyContent = "center";

    ui_BtnBack = document.createElement("button");
    ui_BtnBack.className = "back-btn";
    ui_BtnBack.innerHTML = `<img src="../../assets/PCR_BACK_TOOL.png" style="width:16px; height:16px;"> BACK`; 
    ui_BtnBack.addEventListener("click", function()  
    { 
        Click_Btn_Back(option, System.Tab_Prev); 
    });

    bottomRow.appendChild(ui_BtnBack);
}

    container.appendChild(bottomRow);
}

/*======================================= Tạo saved protocol =======================================================*/
function Render_Saved_Protocol(Panel_ID ,name_tab) {
    const container = document.getElementById(Panel_ID);
    Position_Click = null; // Reset con trỏ

    container.innerHTML = ""; // reset container
    Object.assign(container.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      height: "80%",
      width: "100%",
      gap: "20px",
      padding: "20px 0", /* cách viền trên/dưới cố định */
    });

    // --- Panel trên ---
    ui_PnlSaved = document.createElement("div");
    Object.assign(ui_PnlSaved.style, {
      width: "100%",
      height: "50%",
      backgroundColor: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      border: "1px solid #000",
      boxSizing: "border-box",
      boxShadow: "4px 4px 4px rgba(0, 0, 0, 0.25)" 
    });

    ui_LBSavedTitle = document.createElement("div");
    ui_LBSavedTitle.textContent = name_tab;
    Object.assign(ui_LBSavedTitle.style, {
      width: "100%",
      height: "15%",
      backgroundColor: "#57a6be",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      color: "#ffffffff",
      borderBottom: "1px solid #000",
    });
    ui_PnlSaved.appendChild(ui_LBSavedTitle);

    // --- Vùng chứa các nút ---
    ui_savedList = document.createElement("div");
    Object.assign(ui_savedList.style, {
      flex: "1",
      width: "100%",
      display: "flex",
      flexWrap: "wrap",        // Cho phép xuống hàng
      justifyContent: "flex-start",
      alignContent:  "flex-start",
      gap: "3%",              // Khoảng cách giữa các nút
      paddingLeft:   "3%",
      paddingTop:    "2%",
      paddingBottom: "2%",
      overflowY: "auto",       // Cho phép cuộn dọc
      overflowX: "hidden",
      boxSizing: "border-box",
      backgroundColor: "#ffffffff",
    });
    ui_PnlSaved.appendChild(ui_savedList);

      // ===== PANEL DƯỚI (Preview) =====
    ui_PnlPreview = document.createElement("div");
    Object.assign(ui_PnlPreview.style, {
      width: "100%",
      height: "50%",
      backgroundColor: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      border: "1px solid #000",
      boxSizing: "border-box",
      flexShrink: "0", 
      overflow: "hidden", 
      boxShadow: "4px 4px 4px rgba(0, 0, 0, 0.25)" 
    }); 

    ui_LBPreviewTitle = document.createElement("div");
    ui_LBPreviewTitle.textContent = "PREVIEW";
    Object.assign(ui_LBPreviewTitle.style, {
      width: "100%",
      height: "15%",
      backgroundColor: "#57a6be",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      color: "#ffffffff",
      borderBottom: "1px solid #000",
    });
    ui_PnlPreview.appendChild(ui_LBPreviewTitle);

    // --- Vùng chứa dữ liệu
    ui_LBPreview = document.createElement("div");
    Object.assign(ui_LBPreview.style, {
      //flex: "1",
      height: "300px", 
      width: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      boxSizing: "border-box",
      fontSize: "16px",
      padding:   "3%",
      textAlign: "Left",
      backgroundColor: "#ffffffff",
      whiteSpace: "pre-wrap",   // giữ khoảng trắng và xuống dòng
      wordBreak: "break-word",  // xuống dòng khi quá dài
    });

    ui_PnlPreview.appendChild(ui_LBPreview);
    // ===== GẮN VÀO CONTAINER =====
    container.appendChild(ui_PnlSaved);
    container.appendChild(ui_PnlPreview);
}

let lastActiveBtn = null;
function Render_Saved_Obj(parentElement, Protocol_name, index) 
{
    const btn = document.createElement("button");
     btn.textContent = `${index + 1}. ${Protocol_name}`;

    Object.assign(btn.style, {
      width: "47%",
      height: "15%",
      border: "1px solid #919191ff",
      borderRadius: "8px",
      textAlign: "left",
      paddingLeft: "2%",
      backgroundColor: "#f0f0f0",
      color: "#000000ff",
      cursor: "pointer",
      fontSize: "14px",
      fontFamily: "'Noto Serif', 'Serif'",
      transition: "0.2s",

      //Thêm các thuộc tính sau để hiển thị 1 dòng với "..."
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    });

    btn.onclick = () => 
    {
      // Bỏ active của các nút khác
      parentElement.querySelectorAll("button").forEach(btn_other => 
      {
        btn_other.style.backgroundColor = "#f0f0f0";
      });

      btn.style.backgroundColor = "#a9a9a9"; // bật active nút này


      ui_LBPreview.innerHTML = Format_Protocol_Info(Info_Saved[index], Setpoint_Saved[index]);
      Position_Click = index;
    };

    parentElement.appendChild(btn);
}

