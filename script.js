let backendUrl = ""; // will be loaded from config.json
let sessionId = localStorage.getItem("sessionId") || null;
let pollInterval = null;

async function loadConfig() {
  const res = await fetch("config.json");
  const cfg = await res.json();
  backendUrl = cfg.backend_url;
}

async function checkLoggedIn() {
  if (!sessionId) return false;
  try {
    const res = await fetch(`${backendUrl}/me`, {
      headers: { Authorization: `Bearer ${sessionId}` },
    });
    if (!res.ok) throw new Error("Not logged in");
    const data = await res.json();
    showUser(data.username);
    return true;
  } catch {
    localStorage.removeItem("sessionId");
    sessionId = null;
    return false;
  }
}

function showUser(username) {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("user-section").style.display = "block";
  document.getElementById("username").textContent = username;
}

function showLogin() {
  document.getElementById("login-section").style.display = "block";
  document.getElementById("user-section").style.display = "none";
}

async function startPlexLogin() {
  document.getElementById("status").textContent = "Connecting to Plex...";
  const res = await fetch(`${backendUrl}/plex/create_pin`);
  const data = await res.json();
  
  // Open Plex auth popup
  window.open(data.auth_url, "_blank");

  // Start polling for authentication
  pollInterval = setInterval(async () => {
    const checkRes = await fetch(`${backendUrl}/plex/check_pin/${data.id}`);
    const checkData = await checkRes.json();
    if (checkData.authenticated) {
      clearInterval(pollInterval);
      sessionId = checkData.session_id;
      localStorage.setItem("sessionId", sessionId);
      showUser(checkData.username);
      document.getElementById("status").textContent = "Login successful!";
    }
  }, 3000);
}

async function logout() {
  await fetch(`${backendUrl}/logout`, {
    headers: { Authorization: `Bearer ${sessionId}` },
  });
  localStorage.removeItem("sessionId");
  sessionId = null;
  showLogin();
  document.getElementById("status").textContent = "Logged out.";
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  const loggedIn = await checkLoggedIn();
  if (!loggedIn) showLogin();

  document.getElementById("login-btn").addEventListener("click", startPlexLogin);
  document.getElementById("logout-btn").addEventListener("click", logout);
});
