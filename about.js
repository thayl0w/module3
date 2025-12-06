/* ---------------------------
   About Page — about.js
   Features:
   - Display dynamic statistics
   - Show supported countries
   - Theme toggle functionality
   - Date/time display
   --------------------------- */

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';
const themeToggle = document.getElementById('themeToggle');
const countriesList = document.getElementById('countriesList');
const statsContainer = document.getElementById('statsContainer');

/**
 * Initialize the about page
 */
function init() {
  restoreTheme();
  bindEvents();
  loadCountries();
  loadStatistics();
  initFooterDateTime();
}

/**
 * Bind event listeners
 */
function bindEvents() {
  // Theme toggle
  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('rf-theme-dark', isDark);
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  });
}

/**
 * Restore theme preference from localStorage
 */
function restoreTheme() {
  const dark = localStorage.getItem('rf-theme-dark') === 'true';
  if (dark) {
    document.body.classList.add('dark');
    document.documentElement.classList.add('dark');
    themeToggle.textContent = '☀️';
  } else {
    document.documentElement.classList.remove('dark');
    themeToggle.textContent = '🌙';
  }
}

/**
 * Load and display supported countries
 */
async function loadCountries() {
  try {
    const response = await fetch(`${API_BASE}/list.php?a=list`);
    const data = await response.json();
    
    if (data && data.meals) {
      const countries = data.meals.map(a => a.strArea).sort();
      countriesList.innerHTML = '';
      
      countries.forEach(country => {
        const countryCard = document.createElement('div');
        countryCard.className = 'country-card';
        countryCard.textContent = country;
        countriesList.appendChild(countryCard);
      });
    }
  } catch (err) {
    console.error('Error loading countries:', err);
    countriesList.innerHTML = '<p>Unable to load countries at this time.</p>';
  }
}

/**
 * Load and display statistics
 */
async function loadStatistics() {
  try {
    // Fetch categories count
    const catResponse = await fetch(`${API_BASE}/list.php?c=list`);
    const catData = await catResponse.json();
    const categoryCount = catData && catData.meals ? catData.meals.length : 0;
    
    // Fetch areas count
    const areaResponse = await fetch(`${API_BASE}/list.php?a=list`);
    const areaData = await areaResponse.json();
    const areaCount = areaData && areaData.meals ? areaData.meals.length : 0;
    
    // Get favorites count from localStorage
    const favorites = JSON.parse(localStorage.getItem('rf-favorites') || '{}');
    const favoritesCount = Object.keys(favorites).length;
    
    // Estimate total recipes (sample from a few letters)
    let totalRecipes = 0;
    const sampleLetters = ['a', 'b', 'c', 'd', 'e'];
    for (const letter of sampleLetters) {
      try {
        const recipeResponse = await fetch(`${API_BASE}/search.php?f=${letter}`);
        const recipeData = await recipeResponse.json();
        if (recipeData && recipeData.meals) {
          totalRecipes += recipeData.meals.length;
        }
      } catch (err) {
        console.warn(`Error fetching recipes for letter ${letter}:`, err);
      }
    }
    // Estimate total (multiply by average)
    const estimatedTotal = Math.round((totalRecipes / sampleLetters.length) * 26);
    
    // Display statistics
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
        <div class="stat-number">${favoritesCount}</div>
        <div class="stat-label">Your Favorites</div>
      </div>
    `;
  } catch (err) {
    console.error('Error loading statistics:', err);
    statsContainer.innerHTML = '<p>Unable to load statistics at this time.</p>';
  }
}

/**
 * Update footer date and time display
 */
function updateFooterDateTime() {
  const footerDateTime = document.getElementById('footerDateTime');
  if (!footerDateTime) return;
  
  const now = new Date();
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  const dateTimeString = now.toLocaleString('en-US', options);
  footerDateTime.textContent = dateTimeString;
}

/**
 * Initialize footer date/time and update every second
 */
function initFooterDateTime() {
  updateFooterDateTime();
  setInterval(updateFooterDateTime, 1000);
}

// Initialize page
init();

