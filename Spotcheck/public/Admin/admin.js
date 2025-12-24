window.socket = io();

/* ================= GLOBAL INPUTS ================= */
const aValue = document.getElementById("a_value");
const bValue = document.getElementById("b_value");

const x1 = document.getElementById("x1");
const y1 = document.getElementById("y1");
const x2 = document.getElementById("x2");
const y2 = document.getElementById("y2");

const x1_0 = document.getElementById("x1_0");
const y1_0 = document.getElementById("y1_0");
const x2_0 = document.getElementById("x2_0");
const y2_0 = document.getElementById("y2_0");

const threshold1 = document.getElementById("threshold_1");
const threshold2 = document.getElementById("threshold_2");
const threshold3 = document.getElementById("threshold_3");
const minusValue = document.getElementById("minus_value");

const btnApply = document.getElementById("btnApply");

/* ================= CREATE 4x4 TABLE ================= */
function createTable(tableId) {
  const table = document.getElementById(tableId);
  table.innerHTML = "";

  for (let r = 0; r < 4; r++) {
    const tr = document.createElement("tr");

    for (let c = 0; c < 4; c++) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";

      // handle excel-like paste
      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text");
        pasteExcel(tableId, r, c, text);
      });

      td.appendChild(input);
      tr.appendChild(td);
    }

    table.appendChild(tr);
  }
}

createTable("coeffTable");
createTable("baseTable");

/* ================= PASTE EXCEL ================= */
function pasteExcel(tableId, startR, startC, text) {
  const rows = text
    .trim()
    .split("\n")
    .map((r) => r.split("\t"));

  const table = document.getElementById(tableId);

  rows.forEach((row, rOffset) => {
    row.forEach((val, cOffset) => {
      const r = startR + rOffset;
      const c = startC + cOffset;

      if (r < 4 && c < 4) {
        table.rows[r].cells[c].querySelector("input").value = val.trim();
      }
    });
  });
}

/* ================= FILL / READ TABLE ================= */
function fillTable(id, data) {
  const table = document.getElementById(id);

  if (!Array.isArray(data) || data.length === 0) {
    console.warn(`[${id}] Invalid data received:`, data);
    data = Array(4)
      .fill(0)
      .map(() => Array(4).fill(0));
  }

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const value =
        Array.isArray(data[r]) && data[r][c] !== undefined
          ? data[r][c]
          : 0;

      table.rows[r].cells[c].querySelector("input").value = value;
    }
  }
}

function readTable(id) {
  const table = document.getElementById(id);
  const out = [];

  for (let r = 0; r < 4; r++) {
    const row = [];

    for (let c = 0; c < 4; c++) {
      const val = parseFloat(
        table.rows[r].cells[c].querySelector("input").value
      );
      row.push(isNaN(val) ? 0 : val);
    }

    out.push(row);
  }

  return out;
}

/* ================= LOAD ALL DATA ================= */
socket.emit("admin_load_excel");
socket.emit("admin_load_extra");

socket.on("admin_excel_data", ({ coeff, base }) => {
  console.log("Received admin_excel_data:", { coeff, base });
  fillTable("coeffTable", coeff);
  fillTable("baseTable", base);
});

socket.on("admin_extra_data", (data) => {
  console.log("Received admin_extra_data:", data);

  aValue.value = data?.threshold?.a ?? 0;
  bValue.value = data?.threshold?.b ?? 0;

  x1.value = data?.coord?.x1 ?? 0;
  y1.value = data?.coord?.y1 ?? 0;
  x2.value = data?.coord?.x2 ?? 0;
  y2.value = data?.coord?.y2 ?? 0;

  x1_0.value = data?.coord0?.x1 ?? 0;
  y1_0.value = data?.coord0?.y1 ?? 0;
  x2_0.value = data?.coord0?.x2 ?? 0;
  y2_0.value = data?.coord0?.y2 ?? 0;

  threshold1.value = data?.fam?.threshold_1 ?? 0;
  threshold2.value = data?.fam?.threshold_2 ?? 0;
  threshold3.value = data?.fam?.threshold_3 ?? 0;
  minusValue.value = data?.fam?.minus_value ?? 0;
});

/* ================= APPLY BUTTON ================= */
btnApply.addEventListener("click", () => {
  const coeffData = readTable("coeffTable");
  const baseData = readTable("baseTable");

  const extraData = {
    threshold: {
      a: parseFloat(aValue.value) || 0,
      b: parseFloat(bValue.value) || 0
    },
    coordinates: {
      x1: parseFloat(x1.value) || 0,
      y1: parseFloat(y1.value) || 0,
      x2: parseFloat(x2.value) || 0,
      y2: parseFloat(y2.value) || 0
    },
    fam: {
      threshold_1: parseFloat(threshold1.value) || 0,
      threshold_2: parseFloat(threshold2.value) || 0,
      threshold_3: parseFloat(threshold3.value) || 0,
      minus_value: parseFloat(minusValue.value) || 0
    }
  };

  console.log("Emitting admin_write_excel:", coeffData, baseData);
  console.log("Emitting admin_write_extra:", extraData);

  socket.emit("admin_write_excel", {
    coeff: coeffData,
    base: baseData
  });

  socket.emit("admin_write_extra", extraData);
});

/* ================= BACK BUTTON ================= */
document.getElementById("backBtn")?.addEventListener("click", () => {
  location.replace("../index.html");
});

/* ================= SUCCESS ================= */
socket.on("admin_write_done", () => {
  alert("🟢 Update successful");
});

window.history.replaceState(null, "", window.location.href);
