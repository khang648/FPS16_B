# Tải thư viện
# sudo pip3 install adafruit-circuitpython-rgb-display --break-system-packages
# sudo apt-get install fonts-dejavu
# sudo apt-get install python3-pil
# sudo apt-get install libopenjp2-7 libtiff5 libatlas-base-dev

import board
import digitalio
from adafruit_rgb_display import st7735


def TFT_Init():
#================= Cấu hình SPI - Các chân giao tiếp màn hình ST7735 1.8inch =====================
    cs_pin    = digitalio.DigitalInOut(board.CE0)   # CS  - GPIO8
    dc_pin    = digitalio.DigitalInOut(board.D27)   # DC  - GPIO27
    reset_pin = digitalio.DigitalInOut(board.D22)   # RST - GPIO22
    led_pin   = digitalio.DigitalInOut(board.D25)   # LED - GPIO25


    BAUDRATE = 24000000  # Tốc độ 24Mhz
    spi = board.SPI()

    disp = st7735.ST7735R(
        spi,
        rotation=90,
        cs=cs_pin,
        dc=dc_pin,
        rst=reset_pin,
        baudrate=BAUDRATE,
    ) 

#==================================================================================================
# ================= SCREEN SIZE ===================================================================
    if disp.rotation % 180 == 90:
        height = disp.width
        width = disp.height
    else:
        width = disp.width
        height = disp.height
#==================================================================================================

    # ===== BẬT ĐÈN NỀN HẾT CỠ =====
    led_pin.direction = digitalio.Direction.OUTPUT
    led_pin.value = True    # HIGH = ~3.3V → sáng max
    
    return disp, width, height # Trả về 
