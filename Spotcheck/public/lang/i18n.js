let currentLang = localStorage.getItem("lang") || "vi";

// global
window.translations = {};

// helper
window.t = function (key) {
  return window.translations?.[key] || key;
};

async function loadLanguage(lang) {

  const res = await fetch(`/lang/${lang}.json`);
  window.translations = await res.json();

  // HTML text
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[key]) {
      el.innerText = translations[key];
    }
  });

  // placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[key]) {
      el.placeholder = translations[key];
    }
  });

  localStorage.setItem("lang", lang);
  currentLang = lang;
}

function switchLanguage() {
  const lang = currentLang === "vi" ? "en" : "vi";
  loadLanguage(lang);
}

window.addEventListener("DOMContentLoaded", () => {
  loadLanguage(currentLang);
});