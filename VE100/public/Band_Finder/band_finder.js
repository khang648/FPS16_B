window.socket = io();

/* =========================================================
   GLOBAL
========================================================= */

const ROOT_PATH = "/home/pi/VE100/Results";

let currentPath = ROOT_PATH;
let resultSelectList = [];
let zipChunks = [];

const backBtn = document.getElementById("btn-back");
const pathBar = document.getElementById("pathBar");

const btnDownload = document.getElementById("btn-download");
const btnDelete = document.getElementById("btn-delete");

let currentImageName = "";
/* =========================================================
   BAND BUTTONS
========================================================= */

const btnBase = document.getElementById("btnBase");
const btnFirst = document.getElementById("btnFirst");
const btnLast = document.getElementById("btnLast");
const btnResult = document.getElementById("btnResult");

const btnFind = document.getElementById("btnFind");
const btnReset = document.getElementById("btnReset");
const btnSave = document.getElementById("btnSave");

const firstBandInput = document.getElementById("firstBandValue");
const lastBandInput = document.getElementById("lastBandValue");
const bandSizeInput = document.getElementById("bandSize");

/* =========================================================
   CANVAS
========================================================= */

const canvas = document.getElementById("overlayCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

/* =========================================================
   LINE STATE
========================================================= */

let activeLine = null;
let isDragging = false;

const lines = {
  base: { y: null, color: "#bbbbbb" },
  first: { y: null, color: "#4A90E2" },
  last: { y: null, color: "#ff4d4d" },
  result: { y: null, color: "#2ecc71" }
};

let a_val = 0;
let b_val = 0;

/* =========================================================
   PAGE LOAD
========================================================= */

window.addEventListener("DOMContentLoaded", () => {

  if (pathBar) pathBar.innerText = ROOT_PATH;

  socket.emit("scan_result_folder", ROOT_PATH);

  updateBackButton();
  disableBandButtons();

});

/* =========================================================
   BUTTON CONTROL
========================================================= */

function disableBandButtons() {

  if(btnBase) btnBase.disabled = true;
  if(btnFirst) btnFirst.disabled = true;
  if(btnLast) btnLast.disabled = true;

  if(btnFind) btnFind.disabled = true;
  if(btnReset) btnReset.disabled = true;
  if(btnSave) btnSave.disabled = true;

  if(btnResult) btnResult.disabled = true;

}

function enableBandButtons() {

  if(btnBase) btnBase.disabled = false;
  if(btnFirst) btnFirst.disabled = false;
  if(btnLast) btnLast.disabled = false;

  if(btnFind) btnFind.disabled = false;
  if(btnReset) btnReset.disabled = false;

  if(btnResult) btnResult.disabled = true;

}

/* =========================================================
   SOCKET EVENTS
========================================================= */

socket.on("result_folder_list", (items) => {

  resetSelection();

  renderFolderGrid(items);

});

/* =========================================================
   RESET SELECTION
========================================================= */

function resetSelection(){

  resultSelectList = [];

  document.querySelectorAll(".result-item.selected").forEach(el=>{
    el.classList.remove("selected");
  });

}

/* =========================================================
   RENDER GRID
========================================================= */

function renderFolderGrid(items){

  const grid = document.getElementById("result-grid");
  if(!grid) return;

  grid.innerHTML = "";

  items.forEach(item=>{

    const div = document.createElement("div");
    div.className = "result-item";

    if(item.type === "folder"){

      div.innerHTML = `
        <div class="folder-icon">
          <i class="fas fa-folder"></i>
        </div>
        <div class="folder-name">${item.name}</div>
      `;

      div.addEventListener("click", ()=>{

        const index = resultSelectList.indexOf(item.name);

        if(index === -1){

          resultSelectList.push(item.name);
          div.classList.add("selected");

        }else{

          resultSelectList.splice(index,1);
          div.classList.remove("selected");

        }

      });

      div.addEventListener("dblclick", ()=>{

        resetSelection();
        openFolder(item.name);

      });

    }
    else{

      div.innerHTML = `
        <div class="image-icon">
          <i class="fas fa-file-image"></i>
        </div>
        <div class="folder-name">${item.name}</div>
      `;

      div.addEventListener("click", ()=>{

        resetSelection();
        loadImage(item.name);

      });

    }

    grid.appendChild(div);

  });

}

/* =========================================================
   OPEN FOLDER
========================================================= */

function openFolder(folderName){

  currentPath = ROOT_PATH + "/" + folderName;

  if(pathBar) pathBar.innerText = currentPath;

  socket.emit("scan_result_folder", currentPath);

  updateBackButton();

}

/* =========================================================
   BACK BUTTON
========================================================= */

function updateBackButton(){

  if(!backBtn) return;

  if(currentPath === ROOT_PATH)
    backBtn.style.display = "none";
  else
    backBtn.style.display = "inline-block";

}

if(backBtn){

  backBtn.addEventListener("click", ()=>{

    resetSelection();

    currentPath = ROOT_PATH;

    if(pathBar) pathBar.innerText = ROOT_PATH;

    socket.emit("scan_result_folder", ROOT_PATH);

    updateBackButton();

  });

}

/* =========================================================
   LOAD IMAGE
========================================================= */

function loadImage(file){

  currentImageName = file;

  const img = document.getElementById("bandImage");
  const placeholder = document.querySelector(".image-placeholder");

  if(!img) return;

  const fullPath = currentPath + "/" + file;

  img.src = "/bandfinder_image?path=" + encodeURIComponent(fullPath);

  img.onload = ()=>{

    if(placeholder) placeholder.style.display = "none";

    resizeCanvas();
    drawLines();

    enableBandButtons();

  };

}

/* =========================================================
   CANVAS RESIZE
========================================================= */

function resizeCanvas(){

  const img = document.getElementById("bandImage");

  if(!img || !canvas) return;

  const rect = img.getBoundingClientRect();

  canvas.width = rect.width;
  canvas.height = rect.height;

  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";

  canvas.style.left = img.offsetLeft + "px";
  canvas.style.top = img.offsetTop + "px";

}

/* =========================================================
   SELECT LINE
========================================================= */

function selectLine(type){

  activeLine = type;

  document.querySelectorAll(".line-btn").forEach(btn=>{
    btn.classList.remove("active");
  });

  if(type==="base" && btnBase) btnBase.classList.add("active");
  if(type==="first" && btnFirst) btnFirst.classList.add("active");
  if(type==="last" && btnLast) btnLast.classList.add("active");
  if(type==="result" && btnResult) btnResult.classList.add("active");

}

if(btnBase) btnBase.onclick = ()=>selectLine("base");
if(btnFirst) btnFirst.onclick = ()=>selectLine("first");
if(btnLast) btnLast.onclick = ()=>selectLine("last");
if(btnResult) btnResult.onclick = ()=>selectLine("result");

/* =========================================================
   DRAW LINES
========================================================= */

function drawLines(){

  if(!ctx) return;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  Object.keys(lines).forEach(key=>{

    const line = lines[key];

    if(line.y === null) return;

    ctx.beginPath();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 2;

    ctx.moveTo(0,line.y);
    ctx.lineTo(canvas.width,line.y);

    ctx.stroke();

  });

}

/* =========================================================
   MOVE LINE
========================================================= */

function moveLine(e){

  if(!activeLine) return;

  const rect = canvas.getBoundingClientRect();

  let clientY = e.touches ? e.touches[0].clientY : e.clientY;

  let y = clientY - rect.top;

  y = Math.max(0, Math.min(y, rect.height));

  if(activeLine === "result" && lines.first.y !== null && lines.last.y !== null){

    if(y < lines.first.y) y = lines.first.y;
    if(y > lines.last.y) y = lines.last.y;

  }

  lines[activeLine].y = y;

  if(activeLine === "result" && lines.base.y !== null){
    const offset = y - lines.base.y;
    const band = Math.pow(10,(offset - b_val)/a_val);
    bandSizeInput.value = Math.round(band);
  }

  drawLines();

}

/* =========================================================
   CANVAS EVENTS
========================================================= */

if(canvas){

  canvas.addEventListener("mousedown",(e)=>{
    isDragging = true;
    moveLine(e);
  });

  canvas.addEventListener("mousemove",(e)=>{
    if(!isDragging) return;
    moveLine(e);
  });

  canvas.addEventListener("mouseup",()=>isDragging=false);
  canvas.addEventListener("mouseleave",()=>isDragging=false);

}

/* =========================================================
   TOUCH EVENTS
========================================================= */

if(canvas){

  canvas.addEventListener("touchstart",(e)=>{
    isDragging=true;
    moveLine(e);
  });

  canvas.addEventListener("touchmove",(e)=>{
    if(!isDragging) return;
    e.preventDefault();
    moveLine(e);
  });

  canvas.addEventListener("touchend",()=>isDragging=false);

}

/* =========================================================
   FIND BAND
========================================================= */

if(btnFind){

  btnFind.onclick = ()=>{

    if(lines.base.y===null || lines.first.y===null || lines.last.y===null){

      alert("Please set BASE / FIRST / LAST");

      return;

    }

    const base = lines.base.y;
    const first = lines.first.y;
    const last = lines.last.y;

    if(!(base < first && first < last)){

      alert("Line order must be BASE < FIRST < LAST");

      return;

    }

    const firstVal = parseFloat(firstBandInput.value);
    const lastVal = parseFloat(lastBandInput.value);
    const targetBand = parseFloat(bandSizeInput.value);

    const first_offset = first - base;
    const last_offset = last - base;

    a_val = (last_offset - first_offset) /
            (Math.log10(firstVal) - Math.log10(lastVal));

    b_val = first_offset - Math.log10(lastVal)*a_val;

    const result_offset = Math.log10(targetBand)*a_val + b_val;

    const result_pos = result_offset + base;

    lines.result.y = result_pos;

    drawLines();

    if(btnResult) btnResult.disabled = false;
    if(btnSave) btnSave.disabled = false;

    selectLine("result");

  };

}

/* =========================================================
   BANDSIZE INPUT CONTROL
========================================================= */

if(bandSizeInput){

  bandSizeInput.addEventListener("input",()=>{

    if(lines.base.y === null) return;

    const band = parseInt(bandSizeInput.value);

    if(isNaN(band)) return;

    const offset = Math.log10(band)*a_val + b_val;

    const pos = lines.base.y + offset;

    lines.result.y = pos;

    drawLines();

  });

}

/* =========================================================
   RESET
========================================================= */

if(btnReset){

  btnReset.onclick = ()=>{

    Object.keys(lines).forEach(k=>{
      lines[k].y = null;
    });

    activeLine = null;

    document.querySelectorAll(".line-btn").forEach(btn=>{
      btn.classList.remove("active");
    });

    drawLines();

    if(btnResult) btnResult.disabled = true;

  };

}

/* =========================================================
   AUTO RESIZE
========================================================= */

window.addEventListener("resize",()=>{
  setTimeout(()=>{
    resizeCanvas();
    drawLines();
  },150);
});

window.addEventListener("orientationchange",()=>{
  setTimeout(()=>{
    resizeCanvas();
    drawLines();
  },300);
});


/* =========================================================
   SAVE IMAGE (RESULT ONLY)
========================================================= */

if(btnSave){

  btnSave.onclick = ()=>{

    const img = document.getElementById("bandImage");

    if(!img || lines.result.y === null){
      alert("No result band");
      return;
    }

    let bandValue = parseInt(bandSizeInput.value);

    if(isNaN(bandValue)){
      alert("Invalid band size");
      return;
    }

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;

    tempCtx.drawImage(img,0,0);

    const rect = img.getBoundingClientRect();
    const scale = img.naturalHeight / rect.height;  
    const y = lines.result.y * scale;

    /* RESULT LINE */

    tempCtx.beginPath();
    tempCtx.strokeStyle = "#00ff00";
    tempCtx.lineWidth = 4;

    tempCtx.moveTo(0,y);
    tempCtx.lineTo(tempCanvas.width,y);

    tempCtx.stroke();

    /* BAND SIZE TEXT */

    const text = bandValue + " bp";

    tempCtx.font = "40px Arial";
    tempCtx.fillStyle = "#00ff00";
    tempCtx.strokeStyle = "black";
    tempCtx.lineWidth = 3;

    const textX = tempCanvas.width - 260;

    tempCtx.strokeText(text,textX,y-10);
    tempCtx.fillText(text,textX,y-10);

    /* CREATE IMAGE */

    const url = tempCanvas.toDataURL("image/png");

    const a = document.createElement("a");

    const folderName = currentPath.split("/").pop();
    const imageName = currentImageName.replace(/\.[^/.]+$/, "");

    /* filename: folder + image + band */

    a.download = folderName + "_" + imageName + "[" + bandValue  + "bp" + "]" + ".png";

    a.href = url;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  };

}


/* =========================================================
   DOWNLOAD
========================================================= */

if(btnDownload){

  btnDownload.onclick = ()=>{

    if(resultSelectList.length===0){

      alert(t("ALERT_FOLDER_MISSING"));
      return;

    }

    socket.emit("download_selected_results",resultSelectList);

  };

}

socket.on("download_zip_data",(chunk)=>{
  zipChunks.push(new Uint8Array(chunk));
});

socket.on("download_zip_done",(filename)=>{

  const blob = new Blob(zipChunks,{type:"application/zip"});

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = filename || "results.zip";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);

  zipChunks=[];

});

/* =========================================================
   DELETE
========================================================= */

if(btnDelete){

  btnDelete.onclick = ()=>{

    if(resultSelectList.length===0){

      alert(t("ALERT_FOLDER_MISSING"));
      return;

    }

    if(!confirm(t("ALERT_DELETE_FOLDER"))) return;

    socket.emit("delete_selected_results",resultSelectList);

  };

}

socket.on("delete_selected_done",()=>{

  resetSelection();
  socket.emit("scan_result_folder",currentPath);

});

/* =========================================================
   BACK PAGE
========================================================= */

const btnBack = document.getElementById("btnBack");

if(btnBack){

  btnBack.addEventListener("click",()=>{
    window.history.back();
  });

}