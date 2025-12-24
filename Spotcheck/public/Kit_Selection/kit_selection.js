window.socket = io();

let a_value = null;
let b_value = null;
let savedKit = "";

/* ================= RECEIVE SAVED KIT NAME ================= */
socket.on("jsonKeyValue", (res) => {
  if (res.error) {
    console.error("ERROR:", res.error);
    return;
  }

  savedKit = res.value;
});

/* ================= RECEIVE KIT LIST ================= */
socket.on("jsonList", (files) => {
  console.log("FILES RECEIVED:", files);

  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "";

  if (!files || files.length === 0) {
    fileList.innerHTML =
      `<div style="text-align:center; color:#a8bcd6;">No kits available</div>`;
    return;
  }

  files.forEach((file) => {
    const filename = file.name;
    const kitName = filename.replace(".json", "");

    const div = document.createElement("div");
    div.className = "file-item";
    div.textContent = kitName;

    div.onclick = () => {
      document
        .querySelectorAll(".file-item")
        .forEach((el) => el.classList.remove("active"));

      div.classList.add("active");
      document.getElementById("kitName").value = kitName;

      socket.emit("loadJsonFile", filename);
    };

    if (savedKit && kitName === savedKit) {
      div.classList.add("active");
      document.getElementById("kitName").value = savedKit;
      socket.emit("loadJsonFile", filename);
    }

    fileList.appendChild(div);
  });
});

/* ================= RECEIVE KIT DATA ================= */
socket.on("jsonData", (data) => {
  const result = calculateAB(data);
  a_value = result.a_value;
  b_value = result.b_value;

  const kitDetails = document.getElementById("kitDetails");
  kitDetails.style.opacity = "0";

  setTimeout(() => {
    renderKitDetails(data);
    kitDetails.style.opacity = "1";
  }, 150);
});

/* ================= RENDER KIT DETAILS ================= */
function renderKitDetails(data) {
  const kitDetails = document.getElementById("kitDetails");
  kitDetails.innerHTML = "";

  if (!data || data.error) {
    kitDetails.innerHTML =
      `<p style="color:#a8bcd6;"> ${data?.error || "Không thể đọc dữ liệu kit."}</p>`;
    return;
  }

  kitDetails.innerHTML += `<p><strong>Concentration & Value:</strong></p>`;

  let hasPair = false;
  for (let i = 1; i <= 10; i++) {
    const conc = data[`concen${i}`];
    const val = data[`value${i}`];

    if (conc != null && val != null) {
      hasPair = true;

      const item = document.createElement("div");
      item.className = "cv-item";
      item.innerHTML = `<span>${conc}</span><span>${val}</span>`;
      kitDetails.appendChild(item);
    }
  }

  if (!hasPair) {
    kitDetails.innerHTML +=
      `<p style="color:#a8bcd6;">(No concentration-value pairs)</p>`;
  }

  kitDetails.innerHTML += `
    <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:8px 0;">
    <p><strong>n_low:</strong> ${data.n_low ?? ""}</p>
    <p><strong>n_high:</strong> ${data.n_high ?? ""}</p>
  `;

  if (a_value != null && b_value != null) {
    kitDetails.innerHTML += `
      <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:8px 0;">
      <p><strong>a_value:</strong> ${a_value}</p>
      <p><strong>b_value:</strong> ${b_value}</p>
    `;
  }
}

/* ================= CALCULATE A AND B ================= */
function calculateAB(data) {
  const pts_list = [];

  Object.keys(data).forEach((key) => {
    // t�m key d?ng concenX
    if (key.startsWith("concen")) {
      const index = key.replace("concen", "");
      const conc = data[key];
      const val  = data[`value${index}`];

      if (conc != null && val != null && conc !== "" && val !== "") {
        pts_list.push([
          Math.log10(parseFloat(conc)),
          parseFloat(val)
        ]);
      }
    }
  });

  // c?n �t nh?t 2 di?m
  if (pts_list.length < 2) {
    return { a_value: null, b_value: null };
  }

  const x = pts_list.map(pt => pt[0]);
  const y = pts_list.map(pt => pt[1]);

  const n = x.length;
  const sumX  = x.reduce((a, v) => a + v, 0);
  const sumY  = y.reduce((a, v) => a + v, 0);
  const sumXY = x.reduce((a, v, i) => a + v * y[i], 0);
  const sumX2 = x.reduce((a, v) => a + v * v, 0);

  const a = parseFloat(
    ((n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)).toFixed(4)
  );

  const b = parseFloat(
    ((sumY - a * sumX) / n).toFixed(4)
  );

  return { a_value: a, b_value: b };
}

/* ================= MAIN EXECUTION ================= */
window.addEventListener("DOMContentLoaded", () => {
  socket.emit("readJsonKey", {
    filePath: globalvar_tmp_path,
    key: "kit_selected"
  });

  document.getElementById("btnNext")?.addEventListener("click", () => {
    const kitName = document.getElementById("kitName").value.trim();

    if (kitName === "") {
      alert("🟡 Please select a kit first");
      return;
    }

    socket.emit("writeJsonFile", {
      filePath: globalvar_tmp_path,
      data: {
        kit_value_a: a_value,
        kit_value_b: b_value,
        kit_selected: kitName
      }
    });

    goToPage("../Sample_Selection/sample_selection.html");
  });

  document.getElementById("btnBack")?.addEventListener("click", () => {
    goToPage("../Session_Info/session_info.html");
  });

  socket.emit("getJsonList");
});
