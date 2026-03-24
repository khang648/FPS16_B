window.socket = io();

// ---------------- CREATE TABLE ----------------
function createTable(rows, cols) {
  const table = document.createElement("div");
  table.classList.add("tab-table");

  const corner = document.createElement("div");
  table.appendChild(corner);

  for (let c = 1; c <= cols; c++) {
    const colHeader = document.createElement("div");
    colHeader.classList.add("col-header");
    colHeader.textContent = String.fromCharCode(64 + c);
    table.appendChild(colHeader);
  }

  for (let r = 0; r < rows; r++) {
    const rowHeader = document.createElement("div");
    rowHeader.classList.add("row-header");
    rowHeader.textContent = r+1;
    table.appendChild(rowHeader);

    for (let c = 0; c < cols; c++) {
      const wellContainer = document.createElement("div");
      wellContainer.classList.add("well-container");

      const mainBtn = document.createElement("button");
      mainBtn.classList.add("well-main-btn");
      mainBtn.textContent = "...";

      const subBtn = document.createElement("button");
      subBtn.classList.add("well-sub-btn");
      subBtn.textContent = "-";

      wellContainer.appendChild(mainBtn);
      wellContainer.appendChild(subBtn);
      table.appendChild(wellContainer);
    }
  }

  return table;
}

// ====================== UTILS ======================
function classifyColorFromText(text) {
  if(!text) return "nosample";
  text = text.trim();
  if(text === "N/A") return "nosample";
  if(text === "0") return "negative";
  if(text === "1-100") return "lowcopy";
  if(text === "101-1000") return "mediumcopy";
  if(text === "1001-10000" || text === ">10000") return "positive";
  return "nosample";
}

// ====================== FOOTER BUTTONS ======================
function showFooterButtons() {
  const footer = document.getElementById("footerArea");
  footer.innerHTML = "";

  const btnContainer = document.createElement("div");
  btnContainer.classList.add("footer-buttons");

  // const btnDownload = document.createElement("button");
  // btnDownload.id = "btnDownload";
  // btnDownload.textContent = "Download";

  const btnFinish = document.createElement("button");
  btnFinish.id = "btnFinish";
  btnFinish.textContent = "Finish";

  // btnContainer.appendChild(btnDownload);
  btnContainer.appendChild(btnFinish);
  footer.appendChild(btnContainer);

  // Finish Clicked
  document.getElementById("btnFinish")?.addEventListener("click", () => {
    if (confirm(t("ALERT_BACKHOME"))) {
      goToPage("../index.html");
    } 
  });

  // Download Clicked
  // document.getElementById("btnDownload")?.addEventListener("click", () => {
  //     // Yêu cầu server nén và download
  //     socket.emit("request_download");
  // });
}

// ====================== UPDATE IMAGE TAB ======================
function updateImageTab() {
  const content = document.querySelector(".tab-content");
  content.innerHTML = "";

  const imgContainer = document.createElement("div");
  imgContainer.classList.add("image-container");

  const img = document.createElement("img");

  if (!window.analysisImage) {
    imgContainer.innerHTML = "<p>No image available.</p>";
  } else {
    img.src = window.analysisImage.startsWith("data:") 
                ? window.analysisImage 
                : "data:image/png;base64," + window.analysisImage;
  }

  imgContainer.appendChild(img);
  content.appendChild(imgContainer);
}

// ====================== UPDATE BUTTONS ======================
function updateButtonsInDOM(current_tab) {
  const results = Array.isArray(window.analysisResult) ? window.analysisResult : [];
  const subresults = Array.isArray(window.analysisSubResult) ? window.analysisSubResult : [];
  const screenings = Array.isArray(window.analysisScreening) ? window.analysisScreening : [];

  const tabId = current_tab === "tab1" ? "wellTable-tab1" : "wellTable-tab2";
  const tabContainer = document.getElementById(tabId);
  if (!tabContainer) return;

  const mainBtns = Array.from(tabContainer.querySelectorAll(".well-main-btn"));
  const subBtns = Array.from(tabContainer.querySelectorAll(".well-sub-btn"));

  for (let i = 0; i < mainBtns.length; i++) {
    let val = current_tab === "tab1" ? results[i] : subresults[i];
    if (val === undefined || val === null || val === "") val = "...";

    mainBtns[i].textContent = String(val).trim();
    mainBtns[i].classList.remove("nosample","negative","lowcopy","mediumcopy", "positive");
    mainBtns[i].classList.add(classifyColorFromText(mainBtns[i].textContent));

    subBtns[i].classList.remove("nosample","negative","lowcopy", "mediumcopy", "positive");
    subBtns[i].classList.add(classifyColorFromText(mainBtns[i].textContent));

    const mainVal = mainBtns[i].textContent.trim();
    const screenVal = screenings[i];
    subBtns[i].textContent = mainVal === "N/A" ? "-" : (screenVal ?? "-");
  }
}

// ====================== SOCKET EVENTS ======================
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

socket.on("download_ready", ({ filename, url }) => {
  console.log("Download ready:", filename);

  if (isIOS()) {
    // iOS: mở tab mới để user Save to Files
    window.open(url, "_blank");
  } else {
    // Desktop + Android: auto download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
});

socket.on("sampleanalysis_done", async (data) => {
  console.log("data received: ", data)
  window.analysisImage = data.image;
  window.analysisResult = data.result_list || [];
  window.analysisScreening = data.screening_list || [];
  window.analysisSubResult = data.subresult_list || [];
  window.sensitivity_chose = data.sensitivity_chose;

  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
  if (activeTab === "tab-image") updateImageTab();
  else updateButtonsInDOM(activeTab);

  // Đổi tên tab theo sensitivity
  const tab1Btn = document.querySelector('.tab-btn[data-tab="tab1"]');
  const tab2Btn = document.querySelector('.tab-btn[data-tab="tab2"]');

  if (window.sensitivity_chose === "low") {
    if(tab1Btn) tab1Btn.textContent = t("BUTTON_SENSITIVITY_LOW");
    if(tab2Btn) tab2Btn.textContent = t("BUTTON_SENSITIVITY_HIGH");
  } else if (window.sensitivity_chose === "high") {
    if(tab1Btn) tab1Btn.textContent = t("BUTTON_SENSITIVITY_HIGH");
    if(tab2Btn) tab2Btn.textContent = t("BUTTON_SENSITIVITY_LOW");
  } else {
    // fallback
    if(tab1Btn) tab1Btn.textContent = "Sensitivity 1";
    if(tab2Btn) tab2Btn.textContent = "Sensitivity 2";
  }

  showFooterButtons();

  try {
        // Tạo 2 ảnh riêng tab1 và tab2
        const imgDataTab1 = await generateTableImage("tab1");
        const imgDataTab2 = await generateTableImage("tab2");

        // Gửi 2 ảnh lên server
        socket.emit("client_send_images", {
            tab1: imgDataTab1,
            tab2: imgDataTab2
        });

      } catch (err) {
        console.error("Error generating images:", err);
        alert("🔴 Cannot generate images. Make sure data is ready.");
      }

  // socket.emit("request_download"); // Download ngay khi có kết quả
  if (confirm(t("ALERT_DOWNLOAD_RESULT"))) {
    socket.emit("request_download");
  }
});

// ====================== DOM CONTENT LOADED ======================
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const content = document.querySelector(".tab-content");

  const ROWS = 4;
  const COLS = 4;

  function activateTab(tabName) {
    tabs.forEach(t => t.classList.remove("active"));
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (tabBtn) tabBtn.classList.add("active");

    content.innerHTML = "";

    if (tabName === "tab-image") {
      const imgContainer = document.createElement("div");
      imgContainer.classList.add("image-container");
      const img = document.createElement("img");
      img.alt = "Image Tab";
      imgContainer.appendChild(img);
      content.appendChild(imgContainer);
      updateImageTab();
    } else {
      const table = createTable(ROWS, COLS);
      table.id = tabName === "tab1" ? "wellTable-tab1" : "wellTable-tab2";
      content.appendChild(table);
      updateButtonsInDOM(tabName);
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  activateTab("tab1");
  socket.emit('sample_analysis');
});

// ====================== GENERATE IMAGE PER TAB ======================
async function generateTableImage(tabName) {
  const ROWS = 4;
  const COLS = 4;

  const table = createTable(ROWS, COLS);
  updateButtonsInDOMForTable(table, tabName);

  // === STYLE HEADER NHỎ LẠI ===
  const headers = table.querySelectorAll(".col-header, .row-header");
  headers.forEach(h => {
      h.style.fontSize = "11px";   
      h.style.fontWeight = "500";
      h.style.padding = "2px 4px";
      h.style.whiteSpace = "nowrap";
      h.style.color = "#2f2f2fff";   // <<< MÀU HEADER
  });

  // === STYLE WELL RỘNG HƠN ===
  const wells = table.querySelectorAll(".well-container");
  wells.forEach(w => {
    w.style.margin = "1px";        
    w.style.padding = "0px";
    w.style.overflow = "hidden";
    w.style.minWidth = "100px";
    w.style.display = "flex";
    w.style.flexDirection = "column";
  });

  const mainBtns = table.querySelectorAll(".well-main-btn");
  const subBtns = table.querySelectorAll(".well-sub-btn");

  mainBtns.forEach(btn => {
    btn.style.fontSize = "11px";
    btn.style.fontWeight = "600";
    btn.style.padding = "5px 0";
    btn.style.letterSpacing = "0.5px";
    btn.style.whiteSpace = "normal";
    btn.style.wordWrap = "break-word";
    btn.style.textAlign = "center";
  });

  subBtns.forEach(btn => {
    btn.style.fontSize = "9px";
    btn.style.padding = "5px 0";
    btn.style.opacity = "0.9";
    btn.style.whiteSpace = "normal";
    btn.style.wordWrap = "break-word";
    btn.style.textAlign = "center";
  });

  const container = document.createElement("div");
  container.style.display = "inline-block";
  container.style.background = "#f0f0f1ff";
  container.style.padding = "10px";
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.appendChild(table);

  document.body.appendChild(container);

  const canvas = await html2canvas(container, { scale: 3});
  document.body.removeChild(container);

  return canvas.toDataURL("image/jpeg", 0.95);
}


function updateButtonsInDOMForTable(table, current_tab) {
  const results = Array.isArray(window.analysisResult) ? window.analysisResult : [];
  const subresults = Array.isArray(window.analysisSubResult) ? window.analysisSubResult : [];
  const screenings = Array.isArray(window.analysisScreening) ? window.analysisScreening : [];

  const mainBtns = Array.from(table.querySelectorAll(".well-main-btn"));
  const subBtns = Array.from(table.querySelectorAll(".well-sub-btn"));

  for (let i = 0; i < mainBtns.length; i++) {
    let val = current_tab === "tab1" ? results[i] : subresults[i];
    if(val === undefined || val===null || val==="") val = "...";

    mainBtns[i].textContent = String(val).trim();
    mainBtns[i].classList.remove("nosample","negative","lowcopy", "mediumcopy", "positive");
    mainBtns[i].classList.add(classifyColorFromText(mainBtns[i].textContent));

    subBtns[i].classList.remove("nosample","negative","lowcopy", "mediumcopy", "positive");
    subBtns[i].classList.add(classifyColorFromText(mainBtns[i].textContent));

    const mainVal = mainBtns[i].textContent.trim();
    const screenVal = screenings[i];
    subBtns[i].textContent = mainVal==="N/A" ? "-" : (screenVal ?? "-");
  }
}
