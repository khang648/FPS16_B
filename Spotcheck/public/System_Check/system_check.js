/* ================= GLOBAL SOCKET ================= */
window.socket = io();

/* ================= GLOBAL VARIABLES ================= */
let wells = [];
let __beamIntervalId = null;
let __resizeTO = null;
let numRows = 4;
let numCols = 4;

/* ================= FORMAT TIME ================= */
function formatLocalDateTime(date) {
    const pad = n => n.toString().padStart(2, '0');
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

/* ================= STATUS UPDATE ================= */
function updateStatus(type, message) {
    const statusPanel = document.querySelector(".status-panel");
    const statusText = document.getElementById("statusText");

    statusPanel.classList.remove("ok", "error", "warning");
    if (type) statusPanel.classList.add(type);
    statusText.innerHTML = message;
}
window.updateStatus = updateStatus;

/* ================= PROGRESS UPDATE ================= */
function updateProgress(percent) {
    const bar = document.getElementById("progressBar");
    const label = document.getElementById("progressLabel");

    const val = Math.min(Math.max(percent, 0), 100);
    if (bar) bar.style.width = val + "%";
    if (label) label.textContent = val + "%";
}
window.updateProgress = updateProgress;

/* ================= COLUMN SCAN ANIMATION ================= */
function startColumnScan(delayMs = 1000, debug = false) {
    if (__beamIntervalId) {
        clearInterval(__beamIntervalId);
        __beamIntervalId = null;
    }

    const beam = document.getElementById("scanBeam");
    if (!beam) return;

    beam.style.display = "block";

    requestAnimationFrame(() => {
        const table = document.getElementById("wellTable");
        const wrapper = document.getElementById("tableWrapper");
        if (!table || !wrapper) return;

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        if (rows.length === 0) return;

        const firstRowCells = Array.from(rows[0].children);
        const colCount = firstRowCells.length;

        const wrapperRect = wrapper.getBoundingClientRect();
        const colPositions = firstRowCells.map(td => {
            const r = td.getBoundingClientRect();
            return {
                x: Math.round(r.left - wrapperRect.left),
                width: Math.round(r.width)
            };
        });

        if (colPositions.some(c => c.width === 0)) {
            requestAnimationFrame(() => startColumnScan(delayMs, debug));
            return;
        }

        beam.style.width = colPositions[0].width + "px";

        const seq = [];
        for (let i = 0; i < colCount; i++) seq.push(i);
        for (let i = colCount - 2; i > 0; i--) seq.push(i);

        let idx = 0;

        function moveBeam(colIndex) {
            const p = colPositions[colIndex];
            beam.style.transform = `translateX(${p.x}px)`;
        }

        moveBeam(seq[idx]);

        __beamIntervalId = setInterval(() => {
            idx = (idx + 1) % seq.length;
            moveBeam(seq[idx]);
        }, delayMs);
    });
}

function stopColumnScan() {
    if (__beamIntervalId) {
        clearInterval(__beamIntervalId);
        __beamIntervalId = null;

        const beam = document.getElementById("scanBeam");
        if (beam) beam.style.display = "none";
    }
}
window.stopColumnScan = stopColumnScan;

/* ================= SOCKET EVENTS ================= */
socket.on("systemcheck_done", (data) => {

    /* ---------- IMAGE RESULT ---------- */
    const img = document.getElementById("resultImage");
    img.src = `data:image/jpg;base64,${data.image}`;

    updateStatus("ok", "<i class='fa-solid fa-image'></i> Image received");
    stopColumnScan();

    /* ---------- SAFE PARSE DATA ---------- */
    const resultValuesRaw = Array.isArray(data.result) ? data.result : [];
    const baseIntensityRaw = Array.isArray(data.base_intensity) ? data.base_intensity : [];

    const resultValues = resultValuesRaw
        .map(v => Number(v))
        .map(v => (Number.isNaN(v) ? null : v));

    const baseIntensityValues = baseIntensityRaw
        .map(v => Number(v))
        .map(v => (Number.isNaN(v) ? null : v));

    /* ---------- AVERAGE CALCULATION ---------- */
    const calcAverage = (arr) => {
        const valid = arr.filter(v => v !== null);
        if (valid.length === 0) return NaN;
        return valid.reduce((a, b) => a + b, 0) / valid.length;
    };

    const avgCurrent = calcAverage(resultValues);
    const avgBase = calcAverage(baseIntensityValues);

    /* ---------- ERROR FLAGS ---------- */
    let err1 = false;
    let err2 = false;

    if (
        Number.isNaN(avgCurrent) ||
        Number.isNaN(avgBase) ||
        avgCurrent > avgBase * 1.3 ||
        avgCurrent < avgBase * 0.7
    ) {
        err2 = true;
    }

    /* ---------- UPDATE WELL TABLE ---------- */
    if (wells.length >= 16) {
        for (let i = 0; i < wells.length; i++) {
            const well = wells[i];
            const td = well.parentElement;

            const val = resultValues[i] ?? null;
            const base = baseIntensityValues[i] ?? null;

            well.textContent = (val !== null) ? val.toFixed(1) : "-";
            td.classList.remove("well-err", "well-ok");

            if (err2) {
                td.classList.add("well-err");
                continue;
            }

            if (val === null || base === null) {
                td.classList.add("well-err");
                err1 = true;
                continue;
            }

            if (val > base * 1.3 || val < base * 0.7) {
                td.classList.add("well-err");
                err1 = true;
            } else {
                td.classList.add("well-ok");
            }
        }
    }

    /* ---------- FOOTER BUTTONS ---------- */
    const footer = document.querySelector(".footer-content");
    footer.innerHTML = "";

    if (err2) {
        const btn = document.createElement("button");
        btn.textContent = "RECHECK";
        btn.className = "button";
        btn.onclick = () => {
            socket.emit("process_image", 0);
            goToPage("./System_Check/system_check.html");
        };
        footer.appendChild(btn);

        updateStatus("error", "⛔ [SYSTEM ERROR] - Please clean the plate and check again");

    } else if (err1) {
        const btn1 = document.createElement("button");
        btn1.textContent = "RECHECK";
        btn1.className = "button";
        btn1.onclick = () => {
            socket.emit("process_image", 0);
            goToPage("./System_Check/system_check.html");
        };

        const btn2 = document.createElement("button");
        btn2.textContent = "BACK";
        btn2.className = "button";
        btn2.onclick = () => goToPage("../index.html");

        footer.appendChild(btn1);
        footer.appendChild(btn2);

        updateStatus("warning", "⚠️ [SYSTEM WARNING] - Red wells need to be cleaned");

    } else {
        const btn = document.createElement("button");
        btn.textContent = "BACK";
        btn.className = "button";
        btn.onclick = () => goToPage("../index.html");
        footer.appendChild(btn);

        updateStatus("ok", "✅ [SYSTEM OK] - System check completed");
    }

    /* ---------- SAVE LAST CHECK TIME ---------- */
    const formattedTime = (!err2)
        ? formatLocalDateTime(new Date())
        : "1111-11-11 11:11:11";

    socket.emit("writeJsonFile", {
        filePath: globalvar_tmp_path,
        data: { lasttime_check: formattedTime }
    });
});

socket.on("progress_update", (data) => updateProgress(data.percent));
socket.on("system_status", (data) => updateStatus(data.type, data.message));

/* ================= WELL GRID INIT ================= */
function initWellGrid(rows, cols) {
    const rowLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const wellGrid = document.getElementById("wellGrid");

    wellGrid.innerHTML = "";

    for (let r = 0; r < rows; r++) {
        const tr = document.createElement("tr");

        for (let c = 1; c <= cols; c++) {
            const td = document.createElement("td");
            const div = document.createElement("div");

            const pos = `${rowLabels[r]}${c}`;
            div.classList.add("well");
            div.dataset.pos = pos;
            div.textContent = pos;

            td.appendChild(div);
            tr.appendChild(td);
        }
        wellGrid.appendChild(tr);
    }

    wells = [];
    for (let c = 1; c <= cols; c++) {
        for (let r = 0; r < rows; r++) {
            const pos = `${rowLabels[r]}${c}`;
            wells.push(document.querySelector(`.well[data-pos="${pos}"]`));
        }
    }
}

/* ================= MAIN INIT ================= */
document.addEventListener("DOMContentLoaded", () => {

    initWellGrid(numRows, numCols);

    window.addEventListener("load", () => {
        startColumnScan(500, false);
    });

    window.addEventListener("resize", () => {
        if (__resizeTO) clearTimeout(__resizeTO);
        __resizeTO = setTimeout(() => {
            startColumnScan(500, false);
        }, 150);
    });

    socket.emit("system_check");
});
