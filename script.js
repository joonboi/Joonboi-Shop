let backendUrl = ""; // will be loaded from config.json
let sessionId = localStorage.getItem("sessionId") || null;
let pollInterval = null;

async function loadConfig() {
  const res = await fetch("config.json");
  const cfg = await res.json();
  backendUrl = cfg.apiUrl;
}

async function checkLoggedIn() {
  if (!sessionId) return false;
  try {
    const res = await fetch(`${backendUrl}/me`, {
      headers: { Authorization: `Bearer ${sessionId}` },
    });
    if (!res.ok) throw new Error("Not logged in");
    const data = await res.json();
    showUser(data.username, data.is_owner);
    return true;
  } catch {
    localStorage.removeItem("sessionId");
    sessionId = null;
    return false;
  }
}

function showUser(username, isAdmin=false) {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("user-section").style.display = "block";
  document.getElementById("username").textContent = username;
  document.getElementById("media-section").style.display = "block";

  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = isAdmin ? "inline-block" : "none";
  });
}

function showLogin() {
  document.getElementById("login-section").style.display = "block";
  document.getElementById("user-section").style.display = "none";
  document.getElementById("media-section").style.display = "none";
}

async function startPlexLogin() {
  document.getElementById("status").textContent = "Connecting to Plex...";
  const res = await fetch(`${backendUrl}/plex/create_pin`);
  const data = await res.json();
  
  window.open(data.auth_url, "_blank");

  pollInterval = setInterval(async () => {
    const checkRes = await fetch(`${backendUrl}/plex/check_pin/${data.id}`);
    const checkData = await checkRes.json();
    if (checkData.authenticated) {
      clearInterval(pollInterval);
      sessionId = checkData.session_id;
      localStorage.setItem("sessionId", sessionId);
      showUser(checkData.username, checkData.is_owner);
      document.getElementById("status").textContent = "Login successful!";
    } else if (checkData.error) {
      clearInterval(pollInterval);
      document.getElementById("status").textContent = checkData.error;
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

// Media Request Elements
const mediaSection = document.getElementById("media-section");
const mediaType = document.getElementById("media-type");
const moviesOptions = document.getElementById("movies-options");
const tvOptions = document.getElementById("tv-options");
const searchBtn = document.getElementById("search-btn");
const searchResults = document.getElementById("search-results");

mediaType.addEventListener("change", () => {
  const val = mediaType.value;
  moviesOptions.style.display = val === "movies" ? "block" : "none";
  tvOptions.style.display = val === "tvshow" ? "block" : "none";
});

searchBtn.addEventListener("click", async () => {
  const type = mediaType.value;
  const title = document.getElementById("media-title").value;
  const year = document.getElementById("media-year").value;
  const extra = document.querySelector('input[name="movies-extra"]:checked')?.value || "none";
  const spanish = document.getElementById("tv-spanish").checked;

  if(!type || !title) {
    searchResults.textContent = "Please select type and enter a title.";
    return;
  }

  searchResults.textContent = "Searching...";
  try {
    const res = await fetch(`${backendUrl}/arr/search`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionId}`
      },
      body: JSON.stringify({ type, title, year, extra, spanish })
    });
    const data = await res.json();
    if(data.error){
      searchResults.textContent = data.error;
    } else if(data.alreadyAdded){
      searchResults.textContent = `Already added: ${data.message}`;
    } else {
      searchResults.innerHTML = `
        Found: ${data.message}<br/>
        <button id="add-btn">Add</button>
        <button id="decline-btn">Decline</button>
      `;
      document.getElementById("add-btn").addEventListener("click", async () => {
        await fetch(`${backendUrl}/arr/add`, {
          method:"POST",
          headers: { 
            "Content-Type":"application/json",
            "Authorization": `Bearer ${sessionId}`
          },
          body: JSON.stringify({ type, title, year, extra, spanish })
        });
        searchResults.textContent = "Add request sent!";
      });
      document.getElementById("decline-btn").addEventListener("click", () => {
        searchResults.textContent = "Declined.";
      });
    }
  } catch(e) {
    searchResults.textContent = "Error searching: " + e.message;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  const loggedIn = await checkLoggedIn();
  if (!loggedIn) showLogin();

  document.getElementById("login-btn").addEventListener("click", startPlexLogin);
  document.getElementById("logout-btn").addEventListener("click", logout);
});
