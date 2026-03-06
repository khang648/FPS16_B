const { spawn } = require("child_process");

function registerADCSocket(io) {

  let py = null;
  let lastVoltage = null;

  function startPython() {

    console.log("[ADS1115] Starting voltage reader...");

    py = spawn("python3", [
      "/home/pi/FPS16_B/VE100/python_core/adc.py"
    ]);

    py.stdout.on("data", (data) => {

      try {
        const parsed = JSON.parse(data.toString());

        if (typeof parsed.voltage === "number") {
          lastVoltage = parsed.voltage;
          io.emit("electro:realVoltage", parsed.voltage);
        } else {
          io.emit("electro:realVoltage", "ERR");
        }

      } catch (err) {
        console.log("[ADS1115] JSON parse error");
        io.emit("electro:realVoltage", "ERR");
      }
    });

    py.stderr.on("data", (err) => {
      console.log("[ADS1115][PYTHON ERROR]", err.toString());
      io.emit("electro:realVoltage", "ERR");
    });

    py.on("close", (code) => {
      console.log("[ADS1115] Python stopped. Code:", code);
      io.emit("electro:realVoltage", "ERR");

      // tự restart sau 3 giây
      setTimeout(startPython, 3000);
    });
  }

  startPython();
}

module.exports = {
  registerADCSocket
};