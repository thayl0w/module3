// Simple about page script
// Shows countries, estimates some stats, and updates the footer time

const API_URL = 'https://www.themealdb.com/api/json/v1/1';
const themeToggle = document.getElementById('themeToggle');
const countriesList = document.getElementById('countriesList');
const statsContainer = document.getElementById('statsContainer');

/**
 * Start up the about page.
 * Restores theme, hooks events, loads data and the footer clock.
 */
function initAboutPage() {
  applySavedTheme();
  attachEvents();
  loadCountryList();
  loadStatistics();
  startFooterClock();
}

/**
 * Hook up buttons and UI events.
 */
function attachEvents() {
  // toggle light/dark
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('rf-theme-dark', isDark);
      themeToggle.textContent = isDark ? '☀️' : '🌙';
    });
  }
}

/**
 * Apply the saved theme from localStorage.
 */
function applySavedTheme() {
  const dark = localStorage.getItem('rf-theme-dark') === 'true';
  if (dark) {
    document.body.classList.add('dark');
    document.documentElement.classList.add('dark');
    if (themeToggle) themeToggle.textContent = '☀️';
  } else {
    if (themeToggle) themeToggle.textContent = '🌙';
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Load areas/countries from TheMealDB and render them.
 */
async function loadCountryList() {
  if (!countriesList) return;
  try {
    const res = await fetch(`${API_URL}/list.php?a=list`);
    const data = await res.json();

    if (data && data.meals) {
      // make a simple sorted list of area names
      const countries = data.meals.map(a => a.strArea).sort((a,b) => a.localeCompare(b));
      countriesList.innerHTML = '';

      countries.forEach(country => {
        const card = document.createElement('div');
        card.className = 'country-card';
        card.textContent = country;
        countriesList.appendChild(card);
      });
    } else {
      countriesList.innerHTML = '<p>No countries found.</p>';
    }
  } catch (err) {
    console.error('Could not load countries:', err);
    countriesList.innerHTML = '<p>Unable to load countries at this time.</p>';
  }
}

/**
 * Load some stats:
 * - number of categories
 * - number of areas
 * - number of saved favorites
 * - estimate total recipes (simple sampling)
 */
async function loadStatistics() {
  if (!statsContainer) return;
  try {
    // categories
    const catRes = await fetch(`${API_URL}/list.php?c=list`);
    const catData = await catRes.json();
    const categoryCount = catData && catData.meals ? catData.meals.length : 0;

    // areas
    const areaRes = await fetch(`${API_URL}/list.php?a=list`);
    const areaData = await areaRes.json();
    const areaCount = areaData && areaData.meals ? areaData.meals.length : 0;

    // favorites from localStorage
    let favCount = 0;
    try {
      const fav = JSON.parse(localStorage.getItem('rf-favorites') || '{}');
      favCount = Object.keys(fav).length;
    } catch (e) {
      favCount = 0;
    }

    // quick sample to guess total recipes (not exact)
    let totalSample = 0;
    const sampleLetters = ['a','b','c','d','e'];
    for (const ch of sampleLetters) {
      try {
        const r = await fetch(`${API_URL}/search.php?f=${ch}`);
        const d = await r.json();
        if (d && d.meals) totalSample += d.meals.length;
      } catch (err) {
        // don't stop on small errors
        console.warn('sample fetch error for', ch, err);
      }
    }
    // crude estimate across alphabet
    const estimatedTotal = Math.round((totalSample / sampleLetters.length) * 26);

    // render the stats cards
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${estimatedTotal}+</div>
        <div class="stat-label">Total Recipes</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${categoryCount}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${areaCount}</div>
        <div class="stat-label">Countries</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${favCount}</div>
        <div class="stat-label">Your Favorites</div>
      </div>
    `;
  } catch (err) {
    console.error('Error loading statistics:', err);
    statsContainer.innerHTML = '<p>Unable to load statistics at this time.</p>';
  }
}

/**
 * Update the footer date/time text.
 */
function updateFooterDateTimeAbout() {
  const footerDateTime = document.getElementById('footerDateTime');
  if (!footerDateTime) return;
  const now = new Date();
  const opts = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  };
  footerDateTime.textContent = now.toLocaleString('en-US', opts);
}

/**
 * Start the footer clock and update every second.
 */
function startFooterClock() {
  updateFooterDateTimeAbout();
  setInterval(updateFooterDateTimeAbout, 1000);
}

// Run it
initAboutPage();
