let API_BASE = ""; // Will be loaded from config.json

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
  ],
  xmovie: [
    // You can add tags if needed for xmovie later
  ]
};

let isAdmin = false;

function updateTagOptions() {
  let selected = document.querySelector('input[name="mediaType"]:checked').value;
  const tagSelect = document.getElementById('tag');
  if (selected === 'xmovie') {
    tagSelect.innerHTML = '<option value="">-- Choose a tag --</option>';
  } else {
    tagSelect.innerHTML = '<option value="">-- Choose a tag --</option>';
    tagOptions[selected]?.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.value;
      option.textContent = tag.label;
      tagSelect.appendChild(option);
    });
  }
}

function showAdminElements() {
  isAdmin = true;
  const xMovieRadio = document.getElementById('xmovie-radio');
  xMovieRadio?.classList.remove('hidden');
  document.getElementById("admin-section")?.classList.remove("hidden");
}

function hideAdminElements() {
  isAdmin = false;
  const xMovieRadio = document.getElementById('xmovie-radio');
  const d3CheckboxContainer = document.getElementById('3d-container');
  const adminSection = document.getElementById("admin-section");
  const d3Checkbox = document.getElementById('is3D');
  const movieRadio = document.querySelector('input[name="mediaType"][value="movie"]');
  const tagSelect = document.getElementById('tag');

  xMovieRadio?.classList.add('hidden');
  d3CheckboxContainer?.classList.add('hidden');
  adminSection?.classList.add("hidden");

  if (d3Checkbox) d3Checkbox.checked = false;
  if (movieRadio) movieRadio.checked = true;
  updateTagOptions();
}

function update3DVisibility() {
  const d3CheckboxContainer = document.getElementById('3d-container');
  if (!d3CheckboxContainer) return;  // <--- Null check added here to avoid errors
  
  const tagSelect = document.getElementById('tag');
  const type = document.querySelector('input[name="mediaType"]:checked').value;
  const tag = tagSelect.value;
  if (isAdmin && type === 'movie' && tag === 'movies') {
    d3CheckboxContainer.classList.remove('hidden');
  } else {
    d3CheckboxContainer.classList.add('hidden');
    const d3Checkbox = document.getElementById('is3D');
    if (d3Checkbox) d3Checkbox.checked = false;
  }
}

async function addMediaItem(item, type, tag, year, is3D = false) {
  const messageDiv = document.getElementById('message');
  const resultsDiv = document.getElementById('results');

  messageDiv.textContent = "";
  resultsDiv.innerHTML = `<p>Adding "${item.title}"... Please wait.</p>`;

  try {
    const response = await fetch(`${API_BASE}/api/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaType: type, tag: tag, item: item, is3D })
    });

    const data = await response.json();

    if (response.ok) {
      resultsDiv.innerHTML = `<p style="color: #2ecc71; font-weight: bold;">${data.message}</p>`;
    } else {
      resultsDiv.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">Error: ${data.message || 'Failed to add item.'}</p>`;
    }
  } catch (err) {
    resultsDiv.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">Error: ${err.message}</p>`;
  }
}

async function searchMedia(type, tag, title, year, is3D = false) {
  const response = await fetch(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaType: type, tag: tag, title: title, year: parseInt(year), is3D })
  });
  if (!response.ok) throw new Error('Search failed');
  return await response.json();
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();

  const tagSelect = document.getElementById('tag');
  const mediaRadios = document.querySelectorAll('input[name="mediaType"]');
  const resultsDiv = document.getElementById('results');
  const messageDiv = document.getElementById('message');
  const form = document.getElementById('request-form');
  const submitBtn = form.querySelector('button[type="submit"]');

  updateTagOptions();
  update3DVisibility();

  mediaRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateTagOptions();
      update3DVisibility();
    });
  });

  tagSelect.addEventListener('change', update3DVisibility);

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Searching...";

    resultsDiv.innerHTML = `
      <p>Searching, please wait...</p>
      <div class="spinner" style="margin: 10px auto;"></div>
    `;

    if (!API_BASE) {
      resultsDiv.innerHTML = `<p style="color: #e74c3c;">API not loaded yet. Try again in a moment.</p>`;
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    const type = document.querySelector('input[name="mediaType"]:checked').value;
    const tag = tagSelect.value;
    const title = document.getElementById('title').value.trim();
    const year = document.getElementById('year').value.trim();

    if (!type || !tag || !title || !year) {
      resultsDiv.innerHTML = `<p style="color: #e74c3c;">Please fill out all fields.</p>`;
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    // Check if 3D checkbox is checked (only relevant if admin)
    const is3DChecked = (isAdmin && type === 'movie' && tag === 'movies') 
      ? document.getElementById('is3D').checked
      : false;

    try {
      const results = await searchMedia(type, tag, title, year, is3DChecked);
      if (results.length === 0) {
        resultsDiv.innerHTML = `<p>No results found for "${title} (${year})"</p>`;
      } else {
        resultsDiv.innerHTML = '<h2>Select a Match</h2>';

        results.slice(0, 5).forEach(item => {
          const div = document.createElement('div');
          const btn = document.createElement('button');
          btn.textContent = 'Add This';
          btn.addEventListener('click', () => addMediaItem(item, type, tag, year, is3DChecked));

          const posterUrl = (item.images && item.images.length > 0)
            ? item.images.find(img => img.coverType === "poster")?.remoteUrl || item.images[0].remoteUrl
            : 'https://via.placeholder.com/120x180?text=No+Image';

          div.innerHTML = `
            <p><strong>${item.title}</strong> (${item.year || 'N/A'})</p>
            <img src="${posterUrl}" alt="Poster" style="width: 120px; height: auto; margin-bottom: 8px; display: block;">
            <p>${item.overview || 'No description available.'}</p>
          `;
          div.appendChild(btn);
          resultsDiv.appendChild(div);
        });
      }
    } catch (err) {
      resultsDiv.innerHTML = `<p style="color: #e74c3c;">Error: ${err.message}</p>`;
    }

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  });
});

// Load config before anything else
async function loadConfig() {
  try {
    const response = await fetch('config.json');
    const config = await response.json();
    API_BASE = config.apiUrl;
    console.log("Loaded API URL:", API_BASE);
  } catch (err) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<p style="color: #e74c3c;">Failed to load configuration.</p>`;
    throw err;
  }
}

// Admin Login with modal + backend check
async function adminLoginPrompt() {
  const modal = document.getElementById("passwordModal");
  const input = document.getElementById("adminPassword");
  const submitBtnModal = document.getElementById("passwordSubmit");
  const cancelBtn = document.getElementById("passwordCancel");

  modal.classList.remove("hidden");
  input.value = "";
  input.focus();

  return new Promise((resolve) => {
    const cleanup = () => {
      modal.classList.add("hidden");
      submitBtnModal.removeEventListener("click", onSubmit);
      cancelBtn.removeEventListener("click", onCancel);
    };

    const onSubmit = async () => {
      const password = input.value;
      cleanup();

      if (!password) {
        resolve(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          alert("Welcome admin! Admin features unlocked.");
          showAdminElements();
          update3DVisibility();
          resolve(true);
        } else {
          alert("Incorrect password.");
          resolve(false);
        }
      } catch (err) {
        alert("Login failed: " + err.message);
        resolve(false);
      }
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    submitBtnModal.addEventListener("click", onSubmit);
    cancelBtn.addEventListener("click", onCancel);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    });
  });
}

// Exit Admin Mode function
function exitAdminMode() {
  isAdmin = false;
  hideAdminElements();
  alert("Exited admin mode.");
}
