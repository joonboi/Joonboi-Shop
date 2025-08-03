let API_BASE = ""; // Will be loaded from config.json

let isAdmin = false;

// Utility functions to get selected mediaType and tag
function getSelectedMediaType() {
  const mediaTypeSelect = document.getElementById("mediaType");
  return mediaTypeSelect ? mediaTypeSelect.value : "";
}

function getSelectedTag() {
  const tagSelect = document.getElementById("tag");
  return tagSelect ? tagSelect.value : "";
}

// Show/hide 3D checkbox depending on conditions
function update3DAvailableVisibility(mediaType, tag) {
  const checkbox3D = document.getElementById("checkbox-3d-available");
  if (isAdmin && mediaType.toLowerCase() === "movie" && tag.toLowerCase() === "movies") {
    checkbox3D.style.display = "block";
  } else {
    checkbox3D.style.display = "none";
    document.getElementById("is3DAvailable").checked = false;
  }
}

// Show admin UI elements and hide admin login
function showAdminUI() {
  document.getElementById("admin-controls").style.display = "block";
  document.getElementById("admin-login-container").style.display = "none";
}

// Hide admin UI elements and show admin login
function hideAdminUI() {
  document.getElementById("admin-controls").style.display = "none";
  document.getElementById("checkbox-3d-available").style.display = "none";
  document.getElementById("admin-login-container").style.display = "block";
}

// Admin login function
async function loginAdmin() {
  const passwordInput = document.getElementById("admin-password");
  const password = passwordInput.value.trim();
  if (!password) {
    alert("Please enter admin password");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      alert("Server error during login");
      return;
    }

    const data = await response.json();
    if (data.success) {
      isAdmin = true;
      showAdminUI();
      alert("Admin mode activated");
      passwordInput.value = "";
      update3DAvailableVisibility(getSelectedMediaType(), getSelectedTag());
    } else {
      alert("Incorrect password");
    }
  } catch (error) {
    alert("Failed to contact server");
    console.error(error);
  }
}

// Exit admin mode function
function exitAdminMode() {
  isAdmin = false;
  hideAdminUI();
  document.getElementById("is3DAvailable").checked = false;
  // Reset radio buttons to default
  const radios = document.querySelectorAll('input[name="mediaSource"]');
  radios.forEach((radio) => {
    if (radio.value === "default") {
      radio.checked = true;
    }
  });
  alert("Exited admin mode");
  update3DAvailableVisibility(getSelectedMediaType(), getSelectedTag());
}

// Perform the search request, adjusting URL and payload based on admin options
async function performSearch() {
  const mediaType = getSelectedMediaType();
  const tag = getSelectedTag();
  const title = document.getElementById("title").value.trim();
  const year = parseInt(document.getElementById("year").value, 10);

  if (!title || !year || isNaN(year)) {
    alert("Please enter a valid title and year.");
    return;
  }

  const use3D = isAdmin && document.getElementById("is3DAvailable").checked;
  const mediaSourceRadio = document.querySelector('input[name="mediaSource"]:checked');
  const mediaSource = mediaSourceRadio ? mediaSourceRadio.value : "default";

  // Determine which backend URL to use based on admin options
  let apiUrl = `${API_BASE}/api/search`;
  let searchPayload = { mediaType, tag, title, year };

  // Modify tag and mediaType for 3D Radarr or Whisparr-v3
  if (isAdmin) {
    if (mediaSource === "whisparr-v3") {
      // Use tag 'xmovie' or same mediaType but route could be different in backend later
      searchPayload.mediaType = mediaType; // keep as is
      searchPayload.tag = "xmovie"; // or another tag your backend recognizes (adjust backend accordingly)
    } else if (use3D && mediaType === "movie" && tag === "movies") {
      // Switch tag or flag to indicate radarr-3d backend usage
      searchPayload.tag = "movies"; // keep tag same, backend will check 3D flag via other means
      searchPayload.is3D = true; // you may want to add this field for backend to know to use radarr-3d
    }
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(searchPayload),
    });

    if (!response.ok) {
      const err = await response.json();
      alert(`Search failed: ${err.detail || "Unknown error"}`);
      return;
    }

    const results = await response.json();
    displayResults(results);
  } catch (error) {
    alert("Failed to perform search");
    console.error(error);
  }
}

// Display results function (adjust to your UI)
function displayResults(results) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!results || results.length === 0) {
    resultsDiv.textContent = "No results found.";
    return;
  }

  const ul = document.createElement("ul");
  results.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.title} (${item.year || item.firstAired || "N/A"})`;
    ul.appendChild(li);
  });
  resultsDiv.appendChild(ul);
}

// Event listeners to update 3D checkbox visibility on mediaType or tag change
document.getElementById("mediaType").addEventListener("change", () => {
  update3DAvailableVisibility(getSelectedMediaType(), getSelectedTag());
});
document.getElementById("tag").addEventListener("change", () => {
  update3DAvailableVisibility(getSelectedMediaType(), getSelectedTag());
});
