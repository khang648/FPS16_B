function loadHeader() {
  fetch("/components/header.html")
    .then(res => res.text())
    .then(html => {
      document.body.insertAdjacentHTML("afterbegin", html);
      initHeaderLogic();
      document.dispatchEvent(new Event("headerLoaded"));
    });
}



function initHeaderLogic() {
  const buttons = document.querySelectorAll("#sideMenu button");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.getAttribute("data-page");
      goToPage(page);
    });
  });

  const title = document.getElementById("deviceTitle");

  let holdTimer = null;

  function startHold(e) {
    e.preventDefault(); // 🔥 chặn select + context menu

    holdTimer = setTimeout(() => {
      goToPage("PCR/PCR_Config/pcr_config.html", "none");
    }, 100);
  }

  function cancelHold() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  // ✅ pointer events
  title.addEventListener("pointerdown", startHold, { passive: false });
  title.addEventListener("pointerup", cancelHold);
  title.addEventListener("pointerleave", cancelHold);

  // 🔥 FIX iOS (bắt buộc)
  title.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });

  // 🔥 chặn menu chuột phải / long press
  title.addEventListener("contextmenu", (e) => e.preventDefault());
}