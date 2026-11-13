import "./custom.js";

const gameServer = "https://gms.parcoil.com";
const storageKey = "letbethub-preferences-v1";
const defaultPageTitle = "letbethub — juegos para jugar";
const pageIcon = document.querySelector('link[rel="icon"]');
const gamesContainer = document.getElementById("gamesContainer");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
const catalogCount = document.getElementById("catalogCount");
const filterTabs = document.getElementById("filterTabs");
const settingsDialog = document.getElementById("settingsDialog");
const themeSelect = document.getElementById("themeSelect");
const googleModeToggle = document.getElementById("googleModeToggle");
const googleModeNotice = document.getElementById("googleModeNotice");
let gamesData = [];
let activeFilter = "all";

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeSelect.value = theme;
}

function savePreferences(updates, confirmation) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ ...readPreferences(), ...updates }));
    document.getElementById("settingsSaved").textContent = confirmation;
  } catch {
    document.getElementById("settingsSaved").textContent = "No se pudo guardar la preferencia en este navegador.";
  }
}

function saveTheme(theme) {
  applyTheme(theme);
  savePreferences({ theme }, "Apariencia guardada en este dispositivo.");
}

function applyGoogleMode(enabled) {
  document.documentElement.dataset.viewMode = enabled ? "google" : "default";
  document.title = enabled ? "letbethub · Modo Google" : defaultPageTitle;
  pageIcon.href = enabled ? "/favicon-mode.svg" : "/favicon.svg";
  googleModeToggle.checked = enabled;
  googleModeToggle.setAttribute("aria-checked", String(enabled));
  googleModeNotice.hidden = !enabled;
}

function saveGoogleMode(enabled) {
  applyGoogleMode(enabled);
  savePreferences({ googleMode: enabled }, enabled ? "Modo Google guardado en este dispositivo." : "Modo Google desactivado.");
}

const preferences = readPreferences();
applyTheme(preferences.theme || "dark");
applyGoogleMode(preferences.googleMode === true);

document.getElementById("openSettings").addEventListener("click", () => settingsDialog.showModal());
themeSelect.addEventListener("change", (event) => saveTheme(event.target.value));
googleModeToggle.addEventListener("change", (event) => saveGoogleMode(event.target.checked));
settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) settingsDialog.close();
});

function gameHref(game) {
  const params = new URLSearchParams({ gameurl: game.url, name: game.name });
  return `play.html?${params.toString()}`;
}

function renderFeatured(game) {
  if (!game) return;
  const image = document.getElementById("featuredImage");
  image.src = `${gameServer}/${game.url}/${game.image}`;
  image.alt = `Carátula de ${game.name}`;
  document.getElementById("featuredName").textContent = game.name;
  document.getElementById("featuredCard").href = gameHref(game);
  document.getElementById("featuredCard").setAttribute("aria-label", `Jugar ${game.name}`);
  document.getElementById("featuredLink").href = gameHref(game);
  document.getElementById("featuredButtonText").textContent = `Jugar ${game.name}`;
}

function renderGames() {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  const filteredGames = gamesData.filter((game) => {
    const matchesQuery = game.name.toLocaleLowerCase("es").includes(query);
    const matchesFilter = activeFilter === "all" || game.new === true;
    return matchesQuery && matchesFilter;
  });

  gamesContainer.replaceChildren();
  const fragment = document.createDocumentFragment();

  filteredGames.forEach((game) => {
    const link = document.createElement("a");
    link.className = "game-card";
    link.href = gameHref(game);
    link.setAttribute("aria-label", `Jugar ${game.name}`);

    const cover = document.createElement("div");
    cover.className = "game-cover";
    const image = document.createElement("img");
    image.src = `${gameServer}/${game.url}/${game.image}`;
    image.alt = `Carátula de ${game.name}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.onerror = () => {
      image.hidden = true;
      cover.classList.add("cover-unavailable");
      cover.dataset.initial = game.name.slice(0, 1).toUpperCase();
    };
    cover.append(image);

    const details = document.createElement("span");
    details.className = "game-details";
    const name = document.createElement("strong");
    name.className = "game-name";
    name.textContent = game.name;
    const playLabel = document.createElement("span");
    playLabel.className = "game-play-label";
    playLabel.textContent = "Jugar ↗";
    details.append(name, playLabel);
    link.append(cover, details);
    fragment.append(link);
  });

  gamesContainer.append(fragment);
  catalogCount.textContent = `${filteredGames.length} ${filteredGames.length === 1 ? "juego" : "juegos"}`;
  emptyState.hidden = filteredGames.length !== 0;
  gamesContainer.setAttribute("aria-busy", "false");
}

searchInput.addEventListener("input", renderGames);
filterTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  filterTabs.querySelectorAll("[data-filter]").forEach((tab) => {
    const selected = tab === button;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-pressed", String(selected));
  });
  renderGames();
});

fetch("./config/games.json")
  .then((response) => {
    if (!response.ok) throw new Error(`No se pudo cargar el catálogo (${response.status}).`);
    return response.json();
  })
  .then((data) => {
    gamesData = data;
    const featured = gamesData.find((game) => game.new) || gamesData[0];
    renderFeatured(featured);
    document.getElementById("gameCount").textContent = `${gamesData.length.toLocaleString("es")} juegos disponibles`;
    if (!gamesData.some((game) => game.new)) {
      filterTabs.querySelector('[data-filter="new"]').hidden = true;
    }
    renderGames();
  })
  .catch((error) => {
    gamesContainer.setAttribute("aria-busy", "false");
    emptyState.hidden = false;
    emptyState.textContent = "No pudimos cargar el catálogo. Recarga la página para volver a intentarlo.";
    console.error("No se pudo cargar el catálogo de juegos:", error);
  });
