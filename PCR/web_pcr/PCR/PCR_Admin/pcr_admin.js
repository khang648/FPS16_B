function Render_PCR_Admin() 
{
  loadHeader();
  document.addEventListener("headerLoaded", () => 
  {
    initHeaderLogic();
    Render_Tool("control-panel-admin", "admin");
  }); 
}

/*==== Render Header và Protocol khi include file này======*/
Render_PCR_Admin();



// ======== Carousel Logic ========
document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.getElementById('carousel');
  const cards = Array.from(carousel.querySelectorAll('.card'));

  // Tạo dot indicator
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'carousel-dots';
  carousel.parentNode.appendChild(dotsContainer);
  
  const dots = cards.map((_, i) => 
  {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot';
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => 
    {
      current = i;
      updateCarousel();
    });
    dotsContainer.appendChild(dot);
    return dot;
  });

  // Xử lý click card
  cards.forEach(card => {
    card.addEventListener('click', async () => 
    {
      const option = card.dataset.option;
      switch(option) {
        
        case 'set_time':
          goToPage("PCR/PCR_Set_Time/pcr_set_time.html");
          break;

        case 'reset_device':
          Require_Admin_Password(async () => 
          {
            const confirmed = await Show_Notification("The system will reset memory!", "Yes_No");
            if (!confirmed) return;

            Show_Loading();
            DATA_TX_LENGHT = Pack_Protocol(DATA_TX);
            Pack_Data(DEVICE.PCR_ID,PCR_REG.RESET_MEMORY,DATA_TX, DATA_TX_LENGHT, "Web_PCR");
          });

          break;

        case 'temp_calib':
          Require_Admin_Password(() => { goToPage("PCR/PCR_Temp_Calib/pcr_temp_calib.html"); });
          break;

        case 'wifi_config':
          goToPage("PCR/PCR_Wifi_Config/pcr_wifi_config.html");
          break;

        default:
          console.log("Chưa có hành động cho:", option);
      }
    });
  });

  // Carousel state
  let current = 0;
  let startX = 0;

  function updateCarousel() {
    const cardWidth = cards[0].offsetWidth;
    cards.forEach((card, i) => {
      const offset = i - current;
      card.style.opacity = Math.abs(offset) > 2 ? 0 : 1;
      card.style.zIndex = 100 - Math.abs(offset);
      card.style.transform = `
        translateX(calc(${offset * (cardWidth + 20)}px - 50%))
        translateY(-50%)
        scale(${1 - Math.abs(offset) * 0.2})
        rotateY(${offset * -30}deg)
      `;
    });
    // Cập nhật dot
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  }

  updateCarousel();

  // Swipe/drag
  const swipeThreshold = 50;
  const onStart = e => startX = e.touches ? e.touches[0].clientX : e.clientX;
  const onEnd = e => {
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diff = endX - startX;
    if (Math.abs(diff) < swipeThreshold) return;
    current = (diff < 0 ? current + 1 : current - 1 + cards.length) % cards.length;
    updateCarousel();
  };

  carousel.addEventListener('touchstart', onStart);
  carousel.addEventListener('touchend', onEnd);
  carousel.addEventListener('mousedown', onStart);
  carousel.addEventListener('mouseup', onEnd);
});