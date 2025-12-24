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
