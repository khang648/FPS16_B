window.socket = io();

/* ================= ELEMENTS ================= */
const inputEmail = document.getElementById("email-addr-input");
const inputPassword = document.getElementById("email-pass-input");
const btnAction = document.getElementById("btnLogin");
const btnBack = document.getElementById("btnBack");
const chkShowPassEmail = document.getElementById("showpass-checkbox");
const statusText = document.getElementById("email-status-label");

/* ================= DOM READY ================= */
document.addEventListener("DOMContentLoaded", () => {
  chkShowPassEmail.addEventListener("change", () => {
    inputPassword.type = chkShowPassEmail.checked ? "text" : "password";
  });

  btnAction.addEventListener("click", () => {
    if (btnAction.dataset.mode === "login") {
      handleLogin();
    } else {
      handleLogout();
    }
  });

  btnBack.addEventListener("click", () => {
    goToPage("../index.html");
  });

  socket.emit("email_setting_check_saved_credentials");
});

/* ================= LOAD SAVED CREDENTIALS ================= */
socket.on("email_setting_saved_credentials_result", (data) => {
  if (data.email && data.email.trim() !== "") {
    inputEmail.value = data.email;
    inputPassword.value = data.appPass;

    updateUI_LoggedIn();
  } else {
    updateUI_LoggedOut();
  }
});

/* ================= CHECK EMAIL RESULT ================= */
socket.on("check_email_credentials_result", (data) => {
  hidePopup();

  if (data.ok) {
    alert("🟢 Email account configured successfully");

    socket.emit("writeJsonFile", {
      filePath: globalvar_tmp_path,
      data: {
        email: inputEmail.value.trim(),
        appPass: inputPassword.value.trim()
      }
    });

    updateUI_LoggedIn();
  } else {
    alert("🔴 Invalid email or app password");
  }
});

/* ================= HANDLER LOGIN ================= */
function handleLogin() {
  const email = inputEmail.value.trim();
  const appPass = inputPassword.value.trim();

  if (!email || !appPass) {
    alert("🟡 Please enter your email and password");
    return;
  }

  chkShowPassEmail.checked = false;
  inputPassword.type = "password";

  socket.emit("check_email_credentials", {
    email: email,
    appPass: appPass
  });

  showPopup("loading", "Checking...");
}

/* ================= HANDLER LOGOUT ================= */
function handleLogout() {
  socket.emit("writeJsonFile", {
    filePath: globalvar_tmp_path,
    data: {
      email: "",
      appPass: ""
    }
  });

  inputEmail.value = "";
  inputPassword.value = "";

  updateUI_LoggedOut();
}

/* ================= UI UPDATE FUNCTIONS ================= */
function updateUI_LoggedIn() {
  statusText.textContent = "YOU ARE ALREADY LOGGED IN ✅";

  btnAction.textContent = "Logout";
  btnAction.dataset.mode = "logout";

  chkShowPassEmail.checked = false;
  chkShowPassEmail.disabled = true;

  inputEmail.disabled = true;
  inputPassword.disabled = true;
  inputPassword.type = "password";
}

function updateUI_LoggedOut() {
  statusText.textContent = "LOGIN";

  btnAction.textContent = "Login";
  btnAction.dataset.mode = "login";

  chkShowPassEmail.checked = false;
  chkShowPassEmail.disabled = false;

  inputEmail.disabled = false;
  inputPassword.disabled = false;
  inputPassword.type = "password";
}
