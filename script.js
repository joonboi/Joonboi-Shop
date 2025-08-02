let API_BASE = ""; // Will be loaded from config.json

const tagSelect = document.getElementById('tag');
const mediaRadios = document.querySelectorAll('input[name="mediaType"]');
const resultsDiv = document.getElementById('results');
const messageDiv = document.getElementById('message');
const form = document.getElementById('request-form');
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
    const option = document.createElement('option');
    option.value = tag.value;
    option.textContent = tag.label;
    tagSelect.appendChild(option);
  });
}

mediaRadios.forEach(radio => {
  radio.addEventListener('change', updateTagOptions);
});

updateTagOptions();

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
      resultsDiv.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">Error: ${data.message || 'Failed to add item.'}</p>`;
    }
  } catch (err) {
    resultsDiv.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">Error: ${err.message}</p>`;
  }
}

async function searchMedia(type, tag, title, year) {
  const response = await fetch(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaType: type, tag: tag, title: title, year: parseInt(year) })
  });
  if (!response.ok) throw new Error('Search failed');
  return await response.json();
}

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

  try {
    const results = await searchMedia(type, tag, title, year);
    if (results.length === 0) {
      resultsDiv.innerHTML = `<p>No results found for "${title} (${year})"</p>`;
    } else {
      resultsDiv.innerHTML = '<h2>Select a Match</h2>';

      results.slice(0, 5).forEach(item => {
        const div = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'Add This';
        btn.addEventListener('click', () => addMediaItem(item, type, tag, year));

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

// Load config before anything else
async function loadConfig() {
  try {
    const response = await fetch('config.json');
    const config = await response.json();
    API_BASE = config.apiUrl;
    console.log("Loaded API URL:", API_BASE);
  } catch (err) {
    resultsDiv.innerHTML = `<p style="color: #e74c3c;">Failed to load configuration.</p>`;
    throw err;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
});

async function adminLoginPrompt() {
  // Show modal
  const modal = document.getElementById("passwordModal");
  const input = document.getElementById("adminPassword");
  const submitBtn = document.getElementById("passwordSubmit");
  const cancelBtn = document.getElementById("passwordCancel");

  modal.classList.remove("hidden");
  input.value = "";
  input.focus();

  return new Promise((resolve) => {
    const cleanup = () => {
      modal.classList.add("hidden");
      submitBtn.removeEventListener("click", onSubmit);
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
          document.getElementById("admin-controls")?.classList.remove("hidden");
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

    submitBtn.addEventListener("click", onSubmit);
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

