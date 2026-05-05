const socket = io();
const THRESHOLD_FILE = "/home/pi/Spotcheck/Global/analysis_threshold.json";

const thresholdSelect = document.getElementById("negativeThreshold");
const applyBtn = document.getElementById("btnApply");
const resultDisplay = document.getElementById("resultDisplay");

const thresholdMap = {
    "0.85": "20%",
    "0.90": "5%",
    "0.95": "0%"
};

/**
 * Cập nhật giao diện hiển thị logic ngưỡng
 * Sử dụng window.t(key) từ i18n.js
 */
function updateResultUI(val) {
    if (!val) return;
    
    const valStr = parseFloat(val).toFixed(2);
    
    // Lấy text thông qua hàm t(key) đã định nghĩa trong i18n.js
    const prefix = window.t("FPR_PREFIX");
    const mid = window.t("FPR_MID");
    const noFpr = window.t("FPR_NO");

    let htmlContent = `${prefix} <span class="highlight">${valStr}</span>`;

    if (valStr === "0.95") {
        htmlContent += noFpr;
    } else {
        const fprText = thresholdMap[valStr] || "N/A";
        htmlContent += `${mid} <span class="highlight">${fprText}</span>`;
    }
    
    resultDisplay.innerHTML = htmlContent;
}

// 1. KHI LOAD TRANG
window.addEventListener("DOMContentLoaded", () => {
    socket.emit("readJsonKey", {
        filePath: THRESHOLD_FILE,
        key: "Doubt"
    });
});

// Lắng nghe dữ liệu từ server
socket.on("jsonKeyValue", (response) => {
    if (response.error) {
        thresholdSelect.value = "0.95";
        updateResultUI("0.95");
        return;
    }
    
    if (response.key === "Doubt" && response.value !== undefined) {
        const valStr = parseFloat(response.value).toFixed(2);
        if (thresholdMap[valStr]) {
            thresholdSelect.value = valStr;
            updateResultUI(valStr);
        } else {
            thresholdSelect.value = "0.95";
            updateResultUI("0.95");
        }
    }
});

// Cập nhật UI ngay khi thay đổi giá trị trên Combobox
thresholdSelect.addEventListener("change", () => {
    updateResultUI(thresholdSelect.value);
});

/**
 * QUAN TRỌNG: Lắng nghe sự kiện thay đổi ngôn ngữ nếu có
 * Nếu i18n.js của bạn có cơ chế switchLanguage, 
 * ta cần render lại text mô tả mà không cần load lại trang.
 */
const originalLoadLanguage = window.loadLanguage;
window.loadLanguage = async function(lang) {
    await originalLoadLanguage(lang);
    // Sau khi load xong file json mới, cập nhật lại UI ngay lập tức
    updateResultUI(thresholdSelect.value);
};

// 2. KHI ẤN APPLY
applyBtn.addEventListener("click", () => {
    const newValue = parseFloat(thresholdSelect.value);

    // Sử dụng window.t() cho hộp thoại xác nhận
    const confirmMsg = window.t("CONFIRM_THRESHOLD_CHANGE");
    
    if (confirm(confirmMsg)) {
        socket.emit("writeJsonFile", {
            filePath: THRESHOLD_FILE,
            data: { Doubt: newValue }
        });
    }
});

// Lắng nghe kết quả ghi file
socket.on("writeResult", (message) => {
    if (message === "JSON updated successfully") {
        // Sử dụng window.t() cho thông báo thành công
        alert(window.t("ALERT_APPLY_DONE"));
    } else {
        alert("Error: " + message);
    }
});


 /* ---------- BACK BUTTON ---------- */
document.getElementById("btnBack")?.addEventListener("click", () => {
    goToPage("../index.html");
});

 /* ---------- BACK BUTTON ---------- */
document.getElementById("btnNext")?.addEventListener("click", () => {
    goToPage("./Session_Info/session_info.html");
});