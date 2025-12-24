function Format_time_setpoint(time, sep = '') {
  const hours   = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  const colon = sep + ':' + sep;  // nếu sep = ' ' → " : " , nếu sep = '' → ":"

  return `${hours.toString().padStart(2, '0')}${colon}${minutes.toString().padStart(2, '0')}${colon}${seconds.toString().padStart(2, '0')}`;
}

function Format_Cycles_Topic(cycles, cycles_total) 
{
    let cyclesStr = `PCR Stage ${cycles} of ${cycles_total} cycles`;
    return cyclesStr;
}

function Extract_Name_From_Info(info) {
    let name_len = info[11];   // chiều dài UTF-8 bytes
    if (name_len > 49) name_len = 49;

    // Lấy mảng byte UTF-8
    const nameBytes = info.slice(12, 12 + name_len);

    // Giải mã UTF-8
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(new Uint8Array(nameBytes));
}

function Format_Protocol_Info(info, setpoint) {
    let out_buf = '';

    const lid_temp    = info[0];
    const volume      = info[1];
    const hold_start  = info[2];
    const loop_count  = info[3];
    const step_pcr    = [info[4], info[5], info[6]];
    const cycles_pcr  = [info[7], info[8], info[9]];
    const hold_end    = info[10];
    let name_len      = info[11];

    if (name_len > 49) name_len = 49;
    let name_buf = Extract_Name_From_Info(info);

    // Lấy ngày tháng năm
    const day       = info[12 + name_len];
    const month     = info[12 + name_len + 1];
    const year_low  = info[12 + name_len + 2];
    const year_high = info[12 + name_len + 3];
    const year      = (year_high << 8) | year_low;

    // Header
    out_buf += `Name protocol: ${name_buf}<br>Date & Time: ${String(day).padStart(2,'0')}-${String(month).padStart(2,'0')}-${year}<br>`;
    out_buf += `Lid Temp: ${lid_temp}°C<br>PCR Volume: ${volume}ul<br><br>================== Protocol =================<br>`;

    let step = 0;

    // Hold start
    for (let i = 0; i < hold_start; i++) {
        out_buf += `${setpoint[0][step]}°C - ${Format_time_setpoint(setpoint[1][step])}<br>`;
        step++;
    }
    out_buf += "==========================================<br>";

    // Loops
    for (let i = 0; i < loop_count && i < 3; i++) {
        if (step_pcr[i] > 0) {
            for (let k = 0; k < step_pcr[i]; k++) {
                out_buf += `${setpoint[0][step]}°C - ${Format_time_setpoint(setpoint[1][step])}<br>`;
                step++;
            }
            out_buf += `x${cycles_pcr[i]} Cycles<br>==========================================<br>`;
        }
    }

    // Hold end
    for (let i = 0; i < hold_end; i++) {
        out_buf += `${setpoint[0][step]}°C - ${Format_time_setpoint(setpoint[1][step])}<br>`;
        step++;
    }

    return out_buf;
}

function Extract_Name_From_Protocol(labelElement) {
const text = labelElement.textContent.trim(); // Lấy toàn bộ nội dung
  const parts = text.split(":");                 // Tách bằng dấu ":"
  return parts.length > 1 ? parts[1].trim() : ""; // Lấy phần sau dấu ":" nếu có
}

function limitUTF8Bytes(input, maxBytes) {
  let str = input.value;
  while (new TextEncoder().encode(str).length > maxBytes) 
 {
    str = str.slice(0, -1);
  }
  input.value = str;
}

function Format_Date_Time(date, month, year, hour, minute, second) 
{
  return `${String(date).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}  ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}