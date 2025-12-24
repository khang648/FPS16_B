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
}


