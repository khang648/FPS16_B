function Render_PCR_Temp_Calib()
{
  loadHeader();
  document.addEventListener("headerLoaded", () => 
  {
    initHeaderLogic();
    Pack_Data(DEVICE.PCR_ID, PCR_REG.REQUEST_CALIB_HISTORY, null, 0, "Web_PCR");     // Gửi lệnh yêu cầu đọc lại thông số đã được calib
    Show_Loading();
    Render_Tool("control-panel-temp-calib", "temp_calib");
  }); 
}

/*==== Render Header và Protocol khi include file này======*/
Render_PCR_Temp_Calib();



function Rule_Input_Calib() {
  const inputs = document.querySelectorAll('.value-input');

  inputs.forEach(input => 
  {
    input.maxLength = 5; // tối đa 5 ký tự
    let prevVal = input.value.trim();

    input.addEventListener('input', () => 
    {
      let val = input.value;

      val = val.replace(/[^0-9.]/g, '');

      const dotParts = val.split('.');
      if (dotParts.length > 2)  // tự động xóa dấu. 
      {
        val = dotParts[0] + '.' + dotParts[1];
      }

      if (dotParts.length === 2 && dotParts[1].length > 1)  // Chỉ cho phép nhật 1 số sau dấu .
      {
        dotParts[1] = dotParts[1].slice(0, 1);
        val = dotParts.join('.');
      }

      input.value = val;
    });


    // Khi mất focus kiểm tra giá trị
    input.addEventListener('blur', () => 
    {
      let val = input.value.trim();
      if (val !== '' && val !== '.' && !isNaN(parseFloat(val)) && val< 200) // số hợp lệ và nhỏ hơn 200
      {
        prevVal = val;
        input.value = val;
      } 
      else 
      {
        input.value = prevVal;
        alert("Invalid input!");
      }
    });
  });
}


