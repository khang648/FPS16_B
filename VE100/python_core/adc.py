import time
import json
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn

# ===== CẤU HÌNH HỆ SỐ CHIA ÁP =====
MAX_VOLTAGE_VALUE = 100
DEIVIDE_VOLTAGE_VALUE = 4.096 

try:
    # ===== INIT I2C =====
    i2c = busio.I2C(board.SCL, board.SDA)
    ads = ADS.ADS1115(i2c)

    # Đọc kênh P2 theo yêu cầu của bạn
    v_adc = AnalogIn(ads, ADS.P2)

    while True:
        try:
            # Điện áp tham chiếu từ ADS
            v_refVoltage = v_adc.voltage

            # Tính điện áp thực
            v_realVoltage = round(
                v_refVoltage * MAX_VOLTAGE_VALUE / DEIVIDE_VOLTAGE_VALUE,
                2
            )

            print(json.dumps({
                "voltage": v_realVoltage
            }), flush=True)

        except Exception:
            # Nếu đọc lỗi trong lúc chạy
            print(json.dumps({
                "voltage": "ERR"
            }), flush=True)

        time.sleep(0.5)

except Exception:
    while True:
        print(json.dumps({
            "voltage": "ERR"
        }), flush=True)
        time.sleep(1)