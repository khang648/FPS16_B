/*=========================================================================*/
const DEVICE = {
 PCR_ID                   : 0xF7,
 SPOTCHECK_ID             : 0xF9,
 WEB_ID                   : 0xF8,
};

const PCR_REG = {
 REQUEST_DATA             : 0x00,  // Yêu cầu P48 gửi data
 WAIT_STATE               : 0x01,  // Bắt đầu chạy
 START_PROTOCOL           : 0x02,  // Bắt đầu chạy
 STOP_PROTOCOL            : 0x03,  // Kết thúc quá trình chạy
 PAUSE_PROTOCOL           : 0x04,  // Tạm dừng
 RESUME_PROTOCOL          : 0x05,  // Tiếp tục protocol đang chạy
 REQUEST_SAVED_PROTOCOL   : 0X06,  // Lệnh đọc tất cả protocol đã lưu
 SAVE_PROTOCOL_EEPROM     : 0X07,  // Lệnh lưu protocol
 FULL_MEM_ERR             : 0x08,  // Full bộ nhớ
 MULTI_NAME_ERR           : 0X09,  // Trùng tên
 SAVE_OK_PROTOCOL         : 0X10,  // Lưu protocol thành công
 SAVE_KO_PROTOCOL         : 0X11,  // Lưu protocol không thành công
 DELETE_PROTOCOL          : 0X12,  // Delete Protocol
 DELETE_OK_PROTOCOL       : 0X13,  // Delete Protocol
 DELETE_ERROR_PROTOCOL    : 0X14,  // Delete Protocol
 REQUEST_HISTORY_PROTOCOL : 0X15,  // Lệnh đọc tất cả history đã chạy
 SET_TIME_LOOP            : 0X16,  // Vào vòng lặp gửi thời gian
 SET_TIME_DONE            : 0X17,  // Thông báo cài thời gian xong
 SAVE_SET_TIME            : 0X18,  // Thông báo cài thời gian xong
 RESET_MEMORY             : 0X19,  // Reset bộ nhớ
 RESET_MEMORY_DONE        : 0X20,  // Reset thành công
 ERROR_EEPROM             : 0X21,  // Lỗi khởi tạo eeprom
 ERROR_DAC                : 0X22,  // Lỗi khởi tạo DAC
 ERROR_DAC1               : 0X23,  // Lỗi khởi tạo DAC
 ERROR_DAC2               : 0X24,  // Lỗi khởi tạo DAC
 ERROR_ADC                : 0X25,  // Lỗi khởi tạo ADC

 REQUEST_CALIB_HISTORY    : 0X26,  // Yêu cầu thông số nhiệt độ calib
 SAVE_CALIB_VAL           : 0X27,  // Yêu cầu lưu thông số calib
 SAVE_CALIB_OK            : 0X28,  // Lưu thông số calib ok
 SAVE_CALIB_KO            : 0X29,  // lưu thông số calib không ok

 ERROR_CALIB_EMPTY_EEPROM  :0X30,  // Lỗi không chưa thông số nào được lưu
 ERROR_CALIB_POSI_EEPROM   :0X31,  // Lỗi lưu calib sai vị trí

 ERROR_PEL1               : 0X32,  // Lỗi dây cảm biến Pel1
 ERROR_PEL2               : 0X33,  // Lỗi dây cảm biến Pel2
 ERROR_HEAT_BLOCK         : 0X34,  // Lỗi dây cảm biến heat block
 ERROR_TCA9548            : 0X35, // Lỗi khởi tạo DAC
 
 SAVED_UI                 : 0X36, // Lưu các thông số ở tab saved
 REQUEST_SAVED_UI         : 0X37,  // Yêu cầu dữ liệu 
 REQUEST_CHART_UI         : 0X38, // Yêu cầu dữ liệu đã lưu
 UPDATE_TIME_DONE         : 0X39 , // Yêu cầu cập nhật tổng thời gian chạy
 
 POWER_OUTAGE             : 0X40,  // Mất điện
 POWER_OUTAGE_RESTART     : 0X41,  // Chạy lại chương trình mất điện
 POWER_OUTAGE_NONE        : 0X42,  // Bỏ qua sự cố mất điện

 REQUEST_ESTIMATE_CHART_UI: 0X43, // Yêu cầu dữ liệu dự đoán
 AUTO_CALIB_SPEED         : 0x44, // Bắt đầu tự động calib tốc độ nhiệt
 AUTO_CALIB_SPEED_DONE    : 0x45  // Thông báo đã calib thành công
};