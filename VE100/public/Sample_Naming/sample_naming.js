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
      input.placeholder = `Enter sample name ${i}`;
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
