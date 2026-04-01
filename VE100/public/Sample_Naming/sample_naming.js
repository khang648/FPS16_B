/* ================= GLOBAL SOCKET ================= */
window.socket = io();

document.addEventListener("DOMContentLoaded", () => {
  const wellSelect = document.getElementById("wellSelect");
  const tableBody = document.getElementById("wellTableBody");

  function generateRows(count) {
    tableBody.innerHTML = "";

    for (let i = 1; i <= count; i++) {
      const row = document.createElement("tr");

      // Cột số thứ tự
      const colNo = document.createElement("td");
      colNo.textContent = i;

      // Cột nhập tên
      const colName = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      // input.placeholder = t("PLACEHOLDER_SAMPLENAME") + `${i}`;
      input.dataset.index = i;

      colName.appendChild(input);
      row.appendChild(colNo);
      row.appendChild(colName);
      tableBody.appendChild(row);
    }

    enableEnterNavigation();
  }

  function enableEnterNavigation() {
    const inputs = tableBody.querySelectorAll("input");

    inputs.forEach((input, index) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault(); // chặn submit

          const nextInput = inputs[index + 1];
          if (nextInput) {
            nextInput.focus();
          }
        }
      });
    });
  }

  wellSelect.addEventListener("change", () => {
    const count = parseInt(wellSelect.value);
    generateRows(count);
  });

  // Load mặc định
  generateRows(parseInt(wellSelect.value));


  /* ================= LOAD DATA FROM SERVER ================= */
  let loadedWellCount = null;
  let loadedWellNames = null;

  socket.on("jsonKeyValue", (res) => {
    if (res.key === "number_of_wells") {
      loadedWellCount = res.value;
    }

    if (res.key === "well_names") {
      loadedWellNames = res.value;
    }

    // Khi đã nhận đủ dữ liệu thì restore
    if (loadedWellCount !== null && loadedWellNames !== null) {
      restoreData();
    }
  });

  function restoreData() {
    // set dropdown
    wellSelect.value = loadedWellCount;

    // tạo lại bảng
    generateRows(parseInt(loadedWellCount));

    // fill dữ liệu
    const inputs = tableBody.querySelectorAll("input");

    if (Array.isArray(loadedWellNames)) {
      inputs.forEach((input, index) => {
        input.value = loadedWellNames[index] || "";
      });
    }
  }

  // gọi đọc dữ liệu
  socket.emit("readJsonKey", {
    filePath: globalvar_tmp_path,
    key: "number_of_wells"
  });

  socket.emit("readJsonKey", {
    filePath: globalvar_tmp_path,
    key: "well_names"
  });


  /* ---------- NEXT BUTTON ---------- */
  document.getElementById("btnNext")?.addEventListener("click", () => {
    const wellCount = parseInt(document.getElementById("wellSelect").value);
    const inputs = document.querySelectorAll("#wellTableBody input");

    // Tạo mảng tên giếng theo đúng thứ tự
    const wellNames = Array.from(inputs).map(input => input.value.trim());

    const dataToSave = {
      number_of_wells: wellCount,
      well_names: wellNames
    };

    socket.emit("writeJsonFile", {
      filePath: globalvar_tmp_path,
      data: dataToSave
    });

    goToPage("./Parameter_Setting/parameter_setting.html");
  });

  /* ---------- BACK BUTTON ---------- */
  document.getElementById("btnBack")?.addEventListener("click", () => {
    goToPage("./Folder_Naming/folder_naming.html");
  });
});