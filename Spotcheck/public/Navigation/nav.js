/*---------- Biến toàn cục dùng chung ---------*/
globalvar_tmp_path = "Spotcheck/tmp/global_info.json";
NUMBER_OF_WELLS = 16;
NUMBER_OF_ROWS = 4;
NUMBER_OF_COLUMNS = 4;

/*---------- Hàm chuyển trang ---------*/
window.goToPage = function(pagePath) {
  if (!pagePath) return;
  window.location.href = "/" + pagePath;
};

/*---------- Device Info -----------*/
window.DEVICE_INFO = {
  host_name: "",
  seri_number: ""
};

async function loadDeviceInfo() {
  try {
    const res = await fetch("/api/device-info");
    const data = await res.json();

    window.DEVICE_INFO.host_name = data.host_name;
    window.DEVICE_INFO.seri_number = data.seri_number;

    applyDeviceInfo();
  } catch (e) {
    console.warn("Failed to load device info");
  }
}

function applyDeviceInfo() {
  // ===== SET TITLE =====
  document.title = `${DEVICE_INFO.host_name}-${DEVICE_INFO.seri_number} Spotcheck `;

  // ===== OPTIONAL: set to elements =====
  // document
  //   .querySelectorAll("[data-host-name]")
  //   .forEach(el => el.textContent = DEVICE_INFO.host_name);

  // document
  //   .querySelectorAll("[data-seri-number]")
  //   .forEach(el => el.textContent = DEVICE_INFO.seri_number);
}

document.addEventListener("DOMContentLoaded", loadDeviceInfo);