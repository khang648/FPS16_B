import time
from PIL import Image, ImageDraw, ImageFont
from TFT_SPI import TFT_Init  # Thư viện của bạn

# Khởi tạo màn hình
disp, width, height = TFT_Init() # width=160, height=128

# ================= MÀU SẮC (RGB) =================
BG_COLOR     = (0, 0, 0)        # Xanh đen đậm
CARD_BG      = (0, 0, 0)     # Xanh navy nhạt hơn cho khung con
TEXT_WHITE   = (255, 255, 200)  # Chữ tiêu đề
CYAN_GLOW    = (70, 255, 255)  # Màu thời gian
RED_TEMP     = (0, 0, 255)      # Màu nhiệt độ
GREEN_ACTIVE = (0, 180, 120)    # màu xanh active
RED_UNACTIVE = (0, 0, 240)    # màu xanh active

# ================= FONTS =================
# Lưu ý: Bạn cần kiểm tra đường dẫn font trên Pi của bạn
try:
    font_main  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    font_mid   = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    font_label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 10)
    font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
    font_smallest = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 9)

    font_noti   = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    font_time_total = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
except:
    font_main = font_mid = font_label = ImageFont.load_default()


def draw_state(obj, system_run):
   
    if(system_run == 1):
        obj.rounded_rectangle((5, 5, 65, 21), radius=3, fill=GREEN_ACTIVE)
        obj.text((10, 6), "Running", font=font_small, fill=(255, 255, 255))
    else:
        obj.rounded_rectangle((5, 4, 45, 21), radius=3, fill=RED_UNACTIVE)
        obj.text((10, 6), "Stop", font=font_small, fill=(255, 255, 255))


def draw_wifi(obj, x, y, wifi_name):
    
    color = (255, 180, 70) # Màu xanh Cyan giống ảnh (Trong hệ BGR của bạn là Blue, Green, Red))
# Vẽ các cung tròn tạo biểu tượng wifi
    obj.arc((x,     y, x+12, y+10), start=210, end=330, fill=color, width = 1)
    obj.arc((x+2, y+4, x+10, y+10), start=210, end=330, fill=color, width = 1)
    obj.arc((x+4, y+8,  x+8, y+10), start=210, end=330, fill=color, width = 1)
    
    # Vẽ tên WiFi ngay sau icon
    limit = 11
    display_name = wifi_name
    
    if len(wifi_name) > limit:
        display_name = wifi_name[:limit] + "..."

    # 3. VẼ TÊN WIFI
    # x + 16 để tránh biểu tượng wifi, y + 2 để canh lề với header
    obj.text((x + 16, y + 2), display_name, font=font_smallest, fill=TEXT_WHITE)
    
def draw_ui(state_system ,cycles, cycles_setpoint, temp, remain_sec, wifi_name):
    # Tạo ảnh mới với màu nền đậm
    image = Image.new("RGB", (width, height), BG_COLOR)
    draw = ImageDraw.Draw(image)

    draw_state(draw, state_system) # hàm vẽ trạng thái hệ thống
    draw_wifi(draw, 70, 8, wifi_name)

    #draw.text((85, 8), "FPS32B26001", font=font_smallest, fill=TEXT_WHITE)
    draw.line((5, 25, 155, 25), fill=(120, 120, 120), width=1)

#=============================== Ô bên trái (Sample) =======================================
    draw.rounded_rectangle((5, 28, 77, 65), radius=7, outline=(120, 120, 120), fill=CARD_BG)
    draw.text((20, 32), "SAMPLE", font=font_label, fill=TEXT_WHITE)
    temp_str = f"{int(temp)}°C"
    draw.text((20, 44), temp_str, font=font_mid, fill=RED_TEMP)
#=============================================================================================
#=============================== Ô bên phải (Cycles) =========================================
    rect_right = (83, 28, 155, 65) # Tọa độ: x1, y1, x2, y2
    draw.rounded_rectangle(rect_right, radius=7, outline=(120, 120, 120), fill=CARD_BG)
    
    # 1. Căn giữa nhãn "CYCLES"
    label_text = "CYCLES"
    l_bbox = draw.textbbox((0, 0), label_text, font=font_label)
    draw.text((100, 32), label_text, font=font_label, fill=TEXT_WHITE)

    # 2. Hiển thị dạng x/y (Ví dụ: current_cycles / max_cycles)
    cycle_str = f"{current_cycles}/{cycles_setpoint}" # Tạo chuỗi dạng 1/30, 15/30...
    # Tính toán độ dài chuỗi thực tế để căn giữa
    c_bbox = draw.textbbox((0, 0), cycle_str, font=font_mid)
    c_tw = c_bbox[2] - c_bbox[0]
    
    # Tính tọa độ X để nằm giữa khung bên phải
    cycle_x = rect_right[0] + ((rect_right[2] - rect_right[0]) - c_tw) // 2
    
    # Vẽ chuỗi lên màn hình
    draw.text((cycle_x, 44), cycle_str, font=font_mid, fill=(0, 255, 150))
#=============================================================================================
#=============================== Ô bên dưới (Time) =========================================

    # Vẽ ô thời gian còn lại (Phần dưới)
    draw.rounded_rectangle((5, 70, 155, 122), radius=7, outline=(255, 150, 0), fill=(0, 0, 0))
    draw.text((36, 75), "REMAINING TIME", font=font_label, fill=(255, 180, 0))
    
    # Format thời gian HH:MM:SS
    m, s = divmod(remain_sec, 60)
    h, m = divmod(m, 60)
    time_str = f"{h:02}:{m:02}:{s:02}"
    
    # Căn giữa chữ thời gian
    bbox = draw.textbbox((0, 0), time_str, font=font_main)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, 87), time_str, font=font_main, fill=CYAN_GLOW)

    # Hiển thị lên màn hình
    disp.image(image)

def draw_finish_ui(time_total_sec):
    # 1. Khởi tạo ảnh mới (Nền tối)
    image = Image.new("RGB", (width, height), (5, 10, 20))
    draw = ImageDraw.Draw(image)

    # Các hằng số màu sắc
    GREEN_THEME = (0, 255, 120)
    TEXT_WHITE  = (255, 255, 255)
    BOX_BG      = (10, 30, 35)

    # 2. Vẽ Header: "COMPLETE THE PROGRAM!"
    # Vẽ thanh dọc trang trí bên trái
    draw.rectangle((5, 12, 8, 42), fill=GREEN_THEME)
    
    header_txt = "COMPLETE THE\nPROGRAM!"
    draw.multiline_text((14, 10), header_txt, font=font_noti, fill=TEXT_WHITE, spacing=2)

    # 3. Vẽ dòng trạng thái "TASK_FINISHED" và "100%"
    draw.text((10, 50), "FINISHED", font=font_label, fill=GREEN_THEME)
    draw.text((120, 50), "100%", font=font_label, fill=GREEN_THEME)

    # 4. Vẽ Thanh Progress Bar (đầy 100%)
    # Thanh nền tối
    draw.rounded_rectangle((10, 67, 148, 73), radius=3, fill=(20, 50, 45))
    # Thanh sáng (đè lên)
    draw.rounded_rectangle((10, 67, 148, 73), radius=3, fill=GREEN_THEME)

    # 5. Vẽ Khung chứa TOTAL TIME
    draw.rounded_rectangle((10, 80, 148, 115), radius=7, outline=(0, 80, 60), fill=BOX_BG)
    
    # Label "TOTAL TIME:"
    draw.text((20, 85), "TOTAL\nTIME:", font=font_small, fill=(255, 255, 255), spacing=0)

    # Chuyển đổi giây thành HH:MM:SS
    m, s = divmod(time_total_sec, 60)
    h, m = divmod(m, 60)
    time_str = f"{h:02}:{m:02}:{s:02}"

    # Vẽ con số thời gian (Căn phải trong khung)
    t_bbox = draw.textbbox((0, 0), time_str, font=font_time_total)
    t_w = t_bbox[2] - t_bbox[0]
    draw.text((140 - t_w, 90), time_str, font=font_time_total, fill=GREEN_THEME)

    # Đẩy lên màn hình
    disp.image(image)

# ================= MAIN LOOP =================
try:
    current_cycles  = 0
    setpoint_cycles = 40
    current_temp = 36.6
    time_left = 145  # 2 phút 25 giây
    state_system = 0

    while time_left >= 0:

        draw_ui(state_system, current_cycles, setpoint_cycles, current_temp, time_left, "Chào em nhac")
        
        time_left -= 1

        # Giả lập nhiệt độ dao động nhẹ cho sinh động
        current_temp += 1
        current_cycles += 1
        state_system +=1

        if current_temp > 99:
            current_temp = 25

        if current_cycles > setpoint_cycles:
            current_cycles = 0
        if state_system > 1:
            state_system = 1
        time.sleep(0.2)
        
        # draw_finish_ui(300)
        # time.sleep(2)


except KeyboardInterrupt:
    print("Stopped")