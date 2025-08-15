let backendUrl = ""; // Loaded from config.json
let sessionId = localStorage.getItem("sessionId") || null;
let pollInterval = null;
let isAdmin = false; // Will set based on server ownership

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
    showUser(data.username, data.is_owner || false);
    return true;
  } catch {
    localStorage.removeItem("sessionId");
    sessionId = null;
    return false;
  }
}

function showUser(username, owner=false) {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("user-section").style.display = "block";
  document.getElementById("username").textContent = username;
  isAdmin = owner;

  // Show admin-only radio buttons if owner
  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = owner ? "inline" : "none";
  });
}

function showLogin() {
  document.getElementById("login-section").style.display = "block";
  document.getElementById("user-section").style.display = "none";
}

// ====== Plex Login ======
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
      showUser(checkData.username, checkData.is_owner || false);
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

// ====== Media Selection Hierarchy ======
const categoryRadios = document.querySelectorAll('input[name="category"]');
const typeSection = document.getElementById("type-section");
const typeDropdown = document.getElementById("type-dropdown");
const extraSection = document.getElementById("extra-section");
const moviesExtra = document.getElementById("movies-extra");
const tvExtra = document.getElementById("tv-extra");

const typeOptions = {
  movies: ["Movies", "Concerts", "Bootlegs", "Anime", "Adult"],
  tvshow: ["TV Show", "Anime", "Kids"]
};

categoryRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    const cat = radio.value;
    extraSection.style.display = "none";

    if(cat.startsWith("x-")){
      typeSection.style.display = "none";
      return;
    }

    typeDropdown.innerHTML = '<option value="" disabled selected>Select type</option>';
    typeOptions[cat].forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.toLowerCase().replace(/\s+/g, "-");
      el.textContent = opt;
      typeDropdown.appendChild(el);
    });

    typeSection.style.display = "block";
  });
});

typeDropdown.addEventListener("change", () => {
  const cat = document.querySelector('input[name="category"]:checked')?.value;
  const type = typeDropdown.value;

  moviesExtra.style.display = (cat==="movies" && type==="movies") ? "block" : "none";
  tvExtra.style.display = (cat==="tvshow" && type==="tv-show") ? "block" : "none";
  extraSection.style.display = (moviesExtra.style.display==="block" || tvExtra.style.display==="block") ? "block" : "none";
});

// ====== ARR Search Button Placeholder ======
document.getElementById("search-btn").addEventListener("click", () => {
  const cat = document.querySelector('input[name="category"]:checked')?.value;
  const type = typeDropdown.value;
  const title = document.getElementById("media-title").value;
  const year = document.getElementById("media-year").value;
  const extraMovies = document.querySelector('input[name="movies-extra"]:checked')?.value;
  const tvSpanish = document.getElementById("tv-spanish").checked;

  const result = {
    category: cat,
    type: type,
    title: title,
    year: year,
    extraMovies: extraMovies,
    tvSpanish: tvSpanish
  };

  document.getElementById("search-results").textContent = JSON.stringify(result, null, 2);
});

// ====== DOMContentLoaded ======
document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  const loggedIn = await checkLoggedIn();
  if (!loggedIn) showLogin();

  document.getElementById("login-btn").addEventListener("click", startPlexLogin);
  document.getElementById("logout-btn").addEventListener("click", logout);
});
