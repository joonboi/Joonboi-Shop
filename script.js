let API_BASE = ""; // loaded from config.json at startup
let currentPinId = null;
let plexAuthToken = null;
let pollInterval = null;

const loginBtn = document.getElementById("login-plex-btn");
const authMessage = document.getElementById("auth-message");
const authSection = document.getElementById("auth-section");

const form = document.getElementById("request-form");
const resultsDiv = document.getElementById("results");
const messageDiv = document.getElementById("message");

const tagSelect = document.getElementById("tag");
const mediaRadios = document.querySelectorAll('input[name="mediaType"]');
const submitBtn = form.querySelector('button[type="submit"]');

const tagOptions = {
  movie: [
    { value: "movies", label: "Movies - Regular films" },
    { value: "bootleg", label: "Bootleg - In theaters or unreleased" },
    { value: "live", label: "Live - Concerts, stand-up, etc." },
    { value: "anime", label: "Anime - Japanese animation" }
  ],
  tv: [
    { value: "tv", label: "TV - Series" },
    { value: "anime", label: "Anime - Japanese animation" },
    { value: "kids", label: "Kids - Family or educational" }
  ]
};

function updateTagOptions() {
  const selected = document.querySelector('input[name="mediaType"]:checked').value;
  tagSelect.innerHTML = '<option value="">-- Choose a tag --</option>';
  tagOptions[selected].forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag.value;
    opt.textContent = tag.label;
    tagSelect.appendChild(opt);
  });
}
mediaRadios.forEach(r => r.addEventListener('change', updateTagOptions));
updateTagOptions();

async function createPin() {
  const resp = await fetch(`${API_BASE}/plex/create_pin`);
  if (!resp.ok) throw new Error("Failed to create PIN");
  return resp.json(); // { id, code, auth_url }
}

async function checkPin(pinId) {
  const resp = await fetch(`${API_BASE}/plex/check_pin/${pinId}`);
  if (!resp.ok) throw new Error("Failed to check pin status");
  return resp.json(); // { authenticated: bool, token: string|null }
}

async function verifyAccessWithBackend(token) {
  const resp = await fetch(`${API_BASE}/plex/verify_access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  if (!resp.ok) {
    // attempt to show backend-provided message
    const txt = await resp.text().catch(()=>null);
    throw new Error(txt || "Failed to verify access");
  }
  return resp.json(); // { access: true/false }
}

async function startLoginFlow() {
  authMessage.textContent = "Creating PIN...";
  loginBtn.disabled = true;

  try {
    const pinData = await createPin();
    currentPinId = pinData.id;

    // Open Plex auth page in a new tab (user triggers popup -> not blocked)
    window.open(pinData.auth_url, "_blank");

    authMessage.textContent = "Plex login opened in a new tab. Please authorize the app there.";
    loginBtn.textContent = "Waiting for authorization...";

    pollInterval = setInterval(async () => {
      try {
        const status = await checkPin(currentPinId);
        if (status.authenticated) {
          clearInterval(pollInterval);
          plexAuthToken = status.token;
          authMessage.textContent = "Authorized. Verifying server access...";
          // ask backend if this token has access to your server
          const acc = await verifyAccessWithBackend(plexAuthToken);
          if (acc.access === true) {
            // show requester UI
            authSection.style.display = "none";
            form.style.display = "flex";
            messageDiv.textContent = "Logged in and authorized. You can make requests.";
          } else {
            authMessage.textContent = "You do NOT have access to this Plex server.";
            loginBtn.disabled = false;
            loginBtn.textContent = "Login with Plex";
          }
        } else {
          authMessage.textContent = "Waiting for authorization...";
        }
      } catch (err) {
        clearInterval(pollInterval);
        authMessage.textContent = `Error during auth: ${err.message}`;
        loginBtn.disabled = false;
        loginBtn.textContent = "Login with Plex";
      }
    }, 3000);

  } catch (err) {
    authMessage.textContent = `Login error: ${err.message}`;
    loginBtn.disabled = false;
    loginBtn.textContent = "Login with Plex";
  }
}

loginBtn.addEventListener('click', startLoginFlow);

// --- Existing search/add functionality (unchanged) ---

async function searchMedia(type, tag, title, year) {
  const response = await fetch(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaType: type, tag: tag, title: title, year: parseInt(year) })
  });
  if (!response.ok) throw new Error('Search failed');
  return await response.json();
}

async function addMediaItem(item, type, tag, year) {
  messageDiv.textContent = "";
  resultsDiv.innerHTML = `<p>Adding "${item.title}"... Please wait.</p>`;

  try {
    const response = await fetch(`${API_BASE}/api/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaType: type, tag: tag, item: item })
    });

    const data = await response.json();

    if (response.ok) {
      resultsDiv.innerHTML = `<p style="color: #2ecc71; font-weight: bold;">${data.message}</p>`;
    } else {
      resultsDiv.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">Error: ${data.detail || data.message || 'Failed to add item.'}</p>`;
    }
  } catch (err) {
    resultsDiv.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">Error: ${err.message}</p>`;
  }
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Searching...";

  resultsDiv.innerHTML = `<p>Searching, please wait...</p><div class="spinner" style="margin:10px auto;"></div>`;

  if (!API_BASE) {
    resultsDiv.innerHTML = `<p style="color:#e74c3c;">API not loaded yet. Try again in a moment.</p>`;
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  const type = document.querySelector('input[name="mediaType"]:checked').value;
  const tag = tagSelect.value;
  const title = document.getElementById('title').value.trim();
  const year = document.getElementById('year').value.trim();

  if (!type || !tag || !title || !year) {
    resultsDiv.innerHTML = `<p style="color:#e74c3c;">Please fill out all fields.</p>`;
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  try {
    const results = await searchMedia(type, tag, title, year);
    if (!Array.isArray(results) || results.length === 0) {
      resultsDiv.innerHTML = `<p>No results found for "${title} (${year})"</p>`;
    } else {
      resultsDiv.innerHTML = '<h2>Select a Match</h2>';
      results.slice(0,5).forEach(item => {
        const div = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'Add This';
        btn.addEventListener('click', () => addMediaItem(item, type, tag, year));

        const posterUrl = (item.images && item.images.length > 0)
          ? item.images.find(img => img.coverType === "poster")?.remoteUrl || item.images[0].remoteUrl
          : 'https://via.placeholder.com/120x180?text=No+Image';

        div.innerHTML = `
          <p><strong>${item.title}</strong> (${item.year || 'N/A'})</p>
          <img src="${posterUrl}" alt="Poster" style="width:120px;height:auto;margin-bottom:8px;display:block;">
          <p>${item.overview || 'No description available.'}</p>
        `;
        div.appendChild(btn);
        resultsDiv.appendChild(div);
      });
    }
  } catch (err) {
    resultsDiv.innerHTML = `<p style="color:#e74c3c;">Error: ${err.message}</p>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Load config.json to set API_BASE (cloudflared tunnel url)
async function loadConfig() {
  try {
    const resp = await fetch('config.json');
    const cfg = await resp.json();
    API_BASE = cfg.apiUrl.replace(/\/$/, ''); // remove trailing slash if any
    console.log("Loaded API_BASE:", API_BASE);
  } catch (err) {
    resultsDiv.innerHTML = `<p style="color:#e74c3c;">Failed to load configuration: ${err.message}</p>`;
    throw err;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
});
