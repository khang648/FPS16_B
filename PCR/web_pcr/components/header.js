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


  // Kiểm tra nhấn đủ 5s
  const title = document.getElementById("deviceTitle");

  let holdTimer = null;

  function startHold() {

    holdTimer = setTimeout(() => {
      // console.log("Đã click giữ 5 giây");
      goToPage("PCR/PCR_Config/pcr_config.html", "none");
    }, 5000);

  }

  function cancelHold() {

    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

  }

  title.addEventListener("pointerdown", startHold);
  title.addEventListener("pointerup", cancelHold);
  title.addEventListener("pointerleave", cancelHold);
}