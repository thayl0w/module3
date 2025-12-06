/* ---------------------------
   Recipe Finder — script.js
   Features:
   - Search by text
   - Browse by country (area) dropdown
   - Back button to restore last view
   - Home button to reset to default list
   - Favorites saved in localStorage
   - Voice search via Web Speech API 
   - Loading spinner and empty state
   - Footer icon slots for future icons
   --------------------------- */

/* -----------------------
   DOM element references (will be initialized in init)
   ----------------------- */
let searchInput, searchBtn, micBtn, recipesEl, spinner, emptyState;
let categorySelect, countrySelect, favoritesToggle, viewFavsBtn;
let homeBtn, backBtn, themeToggle;
let recipeModal, modalTitle, modalImage, modalInstructions;
let ingredientsList, favToggle, sourceLink, closeModal, modalBackBtn;

/* -----------------------
   App state
   ----------------------- */
const API_BASE = 'https://www.themealdb.com/api/json/v1/1';
let recognition = null; // speech recognition
let favorites = {};     // saved favorites { idMeal: mealObj }
let lastView = null;    // store last view state to support Back action
let showingFavorites = false;
let currentMealsCache = []; // store currently displayed meals for quicker restore

/* -----------------------
   Initialize app
   ----------------------- */
function init() {
  console.log('Initializing DOM elements...');
  
  // Initialize DOM element references
  searchInput = document.getElementById('searchInput');
  searchBtn = document.getElementById('searchBtn');
  micBtn = document.getElementById('micBtn');
  recipesEl = document.getElementById('recipes');
  spinner = document.getElementById('spinner');
  emptyState = document.getElementById('emptyState');
  categorySelect = document.getElementById('categorySelect');
  countrySelect = document.getElementById('countrySelect');
  favoritesToggle = document.getElementById('favoritesToggle');
  viewFavsBtn = document.getElementById('viewFavsBtn');
  homeBtn = document.getElementById('homeBtn'); // May be null if it's a link
  backBtn = document.getElementById('backBtn');
  themeToggle = document.getElementById('themeToggle');
  
  // Modal elements
  recipeModal = document.getElementById('recipeModal');
  modalTitle = document.getElementById('modalTitle');
  modalImage = document.getElementById('modalImage');
  modalInstructions = document.getElementById('modalInstructions');
  ingredientsList = document.getElementById('ingredientsList');
  favToggle = document.getElementById('favToggle');
  sourceLink = document.getElementById('sourceLink');
  closeModal = document.getElementById('closeModal');
  modalBackBtn = document.getElementById('modalBackBtn');
  
  // Check if essential elements exist
  if (!recipesEl) {
    console.error('recipesEl not found!');
    return;
  }
  if (!searchInput) {
    console.error('searchInput not found!');
    return;
  }
  if (!searchBtn) {
    console.error('searchBtn not found!');
    return;
  }
  
  console.log('Essential DOM elements found:', {
    recipesEl: !!recipesEl,
    searchInput: !!searchInput,
    searchBtn: !!searchBtn
  });
  
  console.log('Binding events...');
  bindEvents();
  
  console.log('Populating filters...');
  populateFilters();
  
  console.log('Restoring theme...');
  restoreTheme();
  
  // Load favorites (non-blocking, don't wait for it)
  loadFavoritesFromStorage().catch(err => {
    console.warn('Error loading favorites:', err);
  });
  
  // Check for URL parameters (from categories page)
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  const countryParam = urlParams.get('country');
  
  if (categoryParam) {
    console.log('Loading category:', categoryParam);
    if (categorySelect) {
      categorySelect.value = categoryParam;
    }
    fetchByCategory(categoryParam);
  } else if (countryParam) {
    console.log('Loading country:', countryParam);
    if (countrySelect) {
      countrySelect.value = countryParam;
    }
    fetchByCountry(countryParam);
  } else {
    // Initial content: show all meals
    console.log('Loading home list (all meals)...');
    loadHomeList();
  }
  
  console.log('Init function completed successfully');
}

/* -----------------------
   Event bindings
   ----------------------- */
function bindEvents() {
  // Add null checks for all event listeners
  if (searchBtn) {
    searchBtn.addEventListener('click', onSearchClicked);
  }
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSearchClicked(); });
  }
  if (micBtn) {
    micBtn.addEventListener('click', handleVoiceSearch);
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
    const category = categorySelect.value;
    const country = countrySelect.value;
    const q = searchInput.value.trim();
    
    if (country) {
      // If country is selected, fetch by country and apply category filter
      pushLastView();
      showingFavorites = false;
      favoritesToggle.setAttribute('aria-pressed', 'false');
      fetchByCountry(country, category);
    } else if (category) {
      // If only category is selected, fetch by category
      pushLastView();
      showingFavorites = false;
      favoritesToggle.setAttribute('aria-pressed', 'false');
      fetchByCategory(category);
    } else if (q) {
      // If search query exists, apply filters
      fetchAndRender(q, category, country);
    } else {
      // If nothing selected, go back to all meals
      loadHomeList();
    }
  });
  }

  if (countrySelect) {
    countrySelect.addEventListener('change', () => {
    const c = countrySelect.value;
    const category = categorySelect.value;
    if (c) {
      // Browsing by country -> push last view and load country with category filter
      pushLastView();
      showingFavorites = false;
      favoritesToggle.setAttribute('aria-pressed', 'false');
      fetchByCountry(c, category);
    } else {
      // if cleared, restore home or search
      if (category) {
        fetchByCategory(category);
      } else {
        loadHomeList();
      }
    }
  });
  }

  if (favoritesToggle) {
    favoritesToggle.addEventListener('click', () => {
    // Toggle favorites display
    showingFavorites = !showingFavorites;
    favoritesToggle.setAttribute('aria-pressed', String(showingFavorites));
    if (showingFavorites) {
      pushLastView();
      renderFavorites();
      showBackButton(true);
    } else {
      loadHomeList();
      showBackButton(false);
    }
  });
  }

  if (viewFavsBtn) {
    viewFavsBtn.addEventListener('click', () => {
    pushLastView();
    renderFavorites();
    showBackButton(true);
  });
  }

  // homeBtn is now a link, not a button, so we don't need to add event listener
  // But if it exists as a button, handle it
  if (homeBtn) {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearFilters();
      loadHomeList();
      showBackButton(false);
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
    handleBack();
  });
  }

  // Modal close/back events
  if (closeModal) {
    closeModal.addEventListener('click', hideModal);
  }
  if (modalBackBtn) {
    modalBackBtn.addEventListener('click', () => { hideModal(); handleBack(); });
  }

  // Close modal via clicking on overlay
  if (recipeModal) {
    recipeModal.addEventListener('click', (e) => { if (e.target === recipeModal) hideModal(); });
  }

  // ESC closes modal
  document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape' && recipeModal && recipeModal.getAttribute('aria-hidden') === 'false') {
      hideModal();
    }
  });

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('rf-theme-dark', isDark);
    // Update icon
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  });
  }
}

/* -----------------------
   Utility: Back button handling
   ----------------------- */

/**
 * Save the current view into lastView stack so we can restore it later.
 * lastView structure: { type: 'search'|'country'|'favorites'|'home', query, category, country, meals }
 */
function pushLastView() {
  lastView = {
    type: showingFavorites ? 'favorites' : (searchInput.value.trim() ? 'search' : 'home'),
    query: searchInput.value.trim(),
    category: categorySelect.value,
    country: countrySelect.value,
    meals: currentMealsCache.slice()
  };
  showBackButton(true);
}

/**
 * Handle Back button click: restore lastView if exists.
 */
function handleBack() {
  if (!lastView) {
    // nothing to go back to: take user home
    clearFilters();
    loadHomeList();
    showBackButton(false);
    return;
  }

  const view = lastView;
  lastView = null; // consume
  if (view.type === 'favorites') {
    renderFavorites();
    showingFavorites = true;
    favoritesToggle.setAttribute('aria-pressed', 'true');
  } else if (view.type === 'search') {
    searchInput.value = view.query || '';
    categorySelect.value = view.category || '';
    countrySelect.value = view.country || '';
    renderMeals(view.meals || []);
    showingFavorites = false;
    favoritesToggle.setAttribute('aria-pressed', 'false');
  } else {
    // home
    loadHomeList();
  }
  showBackButton(false);
}

/**
 * Show or hide the top Back button.
 * @param {boolean} show
 */
function showBackButton(show) {
  backBtn.style.display = show ? '' : 'none';
  backBtn.setAttribute('aria-hidden', String(!show));
}

/* -----------------------
   Theme restore
   ----------------------- */
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

/* -----------------------
   Favorites (localStorage)
   ----------------------- */

/** Load favorites from database or localStorage */
async function loadFavoritesFromStorage() {
  try {
    // Try to load from IndexedDB first (if available)
    if (typeof getAllFavorites === 'function' && typeof indexedDB !== 'undefined') {
      try {
        const dbFavorites = await getAllFavorites();
        if (dbFavorites && dbFavorites.length > 0) {
          favorites = {};
          dbFavorites.forEach(meal => {
            favorites[meal.idMeal] = meal;
          });
          // Sync to localStorage for backward compatibility
          localStorage.setItem('rf-favorites', JSON.stringify(favorites));
          return;
        }
      } catch (err) {
        console.warn('Error loading from IndexedDB, using localStorage:', err);
      }
    }
    
    // Fallback to localStorage (always works)
    const raw = localStorage.getItem('rf-favorites');
    favorites = raw ? JSON.parse(raw) : {};
    
    // Sync to IndexedDB if available (non-blocking)
    if (typeof saveFavorite === 'function' && typeof indexedDB !== 'undefined' && Object.keys(favorites).length > 0) {
      Object.values(favorites).forEach(meal => {
        saveFavorite(meal).catch(err => console.warn('Error syncing favorite:', err));
      });
    }
  } catch (err) {
    console.warn('Failed to parse favorites', err);
    favorites = {};
  }
}

/** Save favorites object to localStorage */
function saveFavoritesToStorage() {
  localStorage.setItem('rf-favorites', JSON.stringify(favorites));
}

/** Toggle favorite status for a meal object and persist */
async function toggleFavorite(meal) {
  if (!meal || !meal.idMeal) return;
  if (favorites[meal.idMeal]) {
    delete favorites[meal.idMeal];
    if (typeof removeFavorite === 'function') {
      await removeFavorite(meal.idMeal);
    }
  } else {
    favorites[meal.idMeal] = meal;
    if (typeof saveFavorite === 'function') {
      await saveFavorite(meal);
    }
  }
  saveFavoritesToStorage();
}

/* -----------------------
   Fetch helpers
   ----------------------- */

/**
 * Fetch JSON helper with spinner.
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function fetchJson(url) {
  console.log('fetchJson called for:', url);
  showSpinner(true);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    console.log('fetchJson success for:', url, 'data:', data);
    return data;
  } catch (err) {
    console.error('Fetch error for', url, ':', err);
    throw err;
  } finally {
    showSpinner(false);
  }
}

/* -----------------------
   Populate category & country filters
   ----------------------- */

/** Populate categories and countries (areas) dropdowns via API */
async function populateFilters() {
  console.log('populateFilters called');
  try {
    if (!categorySelect || !countrySelect) {
      console.warn('Category or country select not found');
      return;
    }
    
    console.log('Fetching categories and countries from API...');
    const [catData, areaData] = await Promise.all([
      fetchJson(`${API_BASE}/list.php?c=list`),
      fetchJson(`${API_BASE}/list.php?a=list`)
    ]);
    
    console.log('API responses received:', { catData, areaData });
    
    if (catData && catData.meals) {
      catData.meals.forEach(c => {
        const o = document.createElement('option');
        o.value = c.strCategory;
        o.textContent = c.strCategory;
        categorySelect.appendChild(o);
      });
      console.log('Categories populated:', catData.meals.length);
    }
    
    if (areaData && areaData.meals) {
      // Sort areas alphabetically for nicer UX
      const sorted = areaData.meals.map(a => a.strArea).sort((a,b)=>a.localeCompare(b));
      sorted.forEach(area => {
        const o = document.createElement('option');
        o.value = area;
        o.textContent = area;
        countrySelect.appendChild(o);
      });
      console.log('Countries populated:', sorted.length);
    }
  } catch (err) {
    console.error('populateFilters failed:', err);
    console.error('Error details:', err.stack);
  }
}

/* -----------------------
   Search and list rendering
   ----------------------- */

/** Search button handler */
async function onSearchClicked() {
  const q = searchInput.value.trim();
  if (!q) {
    // If no query, fallback to home list
    loadHomeList();
    return;
  }
  
  // Save to search history
  if (typeof saveSearchHistory === 'function') {
    await saveSearchHistory(q);
  }
  
  pushLastView();
  showingFavorites = false;
  favoritesToggle.setAttribute('aria-pressed', 'false');
  fetchAndRender(q, categorySelect.value, countrySelect.value);
}

/**
 * Fetch meals by search query and render them.
 * @param {string} query
 * @param {string} category
 * @param {string} country
 */
async function fetchAndRender(query, category = '', country = '') {
  try {
    recipesEl.innerHTML = '';
    emptyState.classList.add('hidden');

    const url = `${API_BASE}/search.php?s=${encodeURIComponent(query)}`;
    const data = await fetchJson(url);

    if (!data || !data.meals) {
      emptyState.textContent = `No recipes found for "${query}".`;
      emptyState.classList.remove('hidden');
      currentMealsCache = [];
      return;
    }

    let meals = data.meals;

    // Apply client-side filters if category or country selected
    if (category) meals = meals.filter(m => m.strCategory === category);
    if (country) meals = meals.filter(m => m.strArea === country);

    if (meals.length === 0) {
      emptyState.textContent = `No recipes match your filters.`;
      emptyState.classList.remove('hidden');
      currentMealsCache = [];
      return;
    }

    renderMeals(meals);
  } catch (err) {
    emptyState.textContent = 'Error loading recipes. Try again later.';
    emptyState.classList.remove('hidden');
    console.error(err);
  }
}

/** Create skeleton loading cards */
function createSkeletonCards(count = 6) {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton-image"></div>
      <div class="skeleton-body">
        <div class="skeleton-title"></div>
        <div class="skeleton-meta"></div>
        <div class="skeleton-actions">
          <div class="skeleton-btn"></div>
          <div class="skeleton-btn"></div>
        </div>
      </div>
    `;
    skeletons.push(skeleton);
  }
  return skeletons;
}

/** Render an array of meal objects into the grid */
function renderMeals(meals, append = false) {
  console.log('renderMeals called with', meals.length, 'meals');
  
  if (!recipesEl) {
    console.error('recipesEl is null in renderMeals!');
    return;
  }
  
  if (!meals || !Array.isArray(meals) || meals.length === 0) {
    console.warn('renderMeals: No meals to render');
    if (emptyState) {
      emptyState.textContent = 'No recipes to display.';
      emptyState.classList.remove('hidden');
    }
    return;
  }
  
  if (!append) {
    recipesEl.innerHTML = '';
  }
  currentMealsCache = meals.slice();
  meals.forEach(meal => {
    if (meal && meal.idMeal) {
      const card = createMealCard(meal);
      if (card) {
        recipesEl.appendChild(card);
      }
    }
  });
  
  console.log('renderMeals completed, rendered', meals.length, 'cards');
}

/** Render meals progressively with skeleton placeholders */
function renderMealsProgressive(meals, totalExpected = null) {
  // Clear and show skeletons
  recipesEl.innerHTML = '';
  const skeletonCount = totalExpected ? Math.min(totalExpected, 12) : 6;
  const skeletons = createSkeletonCards(skeletonCount);
  skeletons.forEach(skeleton => recipesEl.appendChild(skeleton));
  
  // Replace skeletons with real cards as they load
  let loadedCount = 0;
  const loadNext = () => {
    if (loadedCount < meals.length) {
      const batch = meals.slice(loadedCount, loadedCount + 3);
      batch.forEach((meal, idx) => {
        if (skeletons[loadedCount + idx]) {
          const card = createMealCard(meal);
          skeletons[loadedCount + idx].replaceWith(card);
        } else {
          const card = createMealCard(meal);
          recipesEl.appendChild(card);
        }
      });
      loadedCount += batch.length;
      
      if (loadedCount < meals.length) {
        requestAnimationFrame(loadNext);
      } else {
        // Remove any remaining skeletons
        skeletons.slice(loadedCount).forEach(s => {
          if (s.parentNode) s.remove();
        });
        currentMealsCache = meals.slice();
      }
    }
  };
  
  // Start loading after a tiny delay for smooth animation
  setTimeout(() => requestAnimationFrame(loadNext), 100);
}

/** Create a meal card element */
function createMealCard(meal) {
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role', 'listitem');

  const img = document.createElement('img');
  img.src = meal.strMealThumb;
  img.alt = meal.strMeal;

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = meal.strMeal;

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.textContent = `${meal.strArea || 'Unknown'} • ${meal.strCategory || ''}`;

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'action-btn';
  viewBtn.textContent = 'View';
  viewBtn.addEventListener('click', () => {
    // Save current view so Back can restore it
    pushLastView();
    openMealModal(meal.idMeal);
  });

  const favBtn = document.createElement('button');
  favBtn.className = 'action-btn';
  favBtn.textContent = favorites[meal.idMeal] ? '★ Saved' : '☆ Save';
  favBtn.addEventListener('click', () => {
    toggleFavorite(meal);
    favBtn.textContent = favorites[meal.idMeal] ? '★ Saved' : '☆ Save';
  });

  actions.appendChild(viewBtn);
  actions.appendChild(favBtn);

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(actions);

  card.appendChild(img);
  card.appendChild(body);

  return card;
}

/* -----------------------
   Country (area) browsing
   ----------------------- */

/**
 * Comprehensive function to fetch ALL meals for a country using multiple methods.
 * Ensures we get at least 200 foods per country, especially for Filipino food.
 * @param {string} areaName - Country/Area name
 * @param {string} categoryFilter - Optional category to filter by
 */
async function fetchByCountry(areaName, categoryFilter = '') {
  try {
    recipesEl.innerHTML = '';
    emptyState.classList.add('hidden');
    
    // Show skeleton loaders immediately
    const skeletonCount = 12;
    const skeletons = createSkeletonCards(skeletonCount);
    skeletons.forEach(skeleton => recipesEl.appendChild(skeleton));
    
    // Create progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.innerHTML = '<div class="progress-bar" id="progressBar" style="width:0%"></div>';
    recipesEl.insertBefore(progressContainer, recipesEl.firstChild);
    const progressBar = document.getElementById('progressBar');
    
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'loading-message';
    loadingMsg.textContent = `Loading ${areaName} recipes...`;
    recipesEl.insertBefore(loadingMsg, progressContainer);

    const allMeals = [];
    const mealIds = new Set();
    const mealsByCategory = {}; // Track meals per category
    
    // Step 1: Get all categories first
    let categories = [];
    try {
      const catData = await fetch(`${API_BASE}/list.php?c=list`).then(r => r.json());
      if (catData && catData.meals) {
        categories = catData.meals.map(c => c.strCategory);
      }
    } catch (err) {
      console.warn('Error fetching categories:', err);
    }
    
    // Step 2: Fetch meals by country (direct filter) - optimized and faster
    loadingMsg.textContent = `Fetching ${areaName} recipes...`;
    progressBar.style.width = '20%';
    
    try {
      const url = `${API_BASE}/filter.php?a=${encodeURIComponent(areaName)}`;
      const data = await fetch(url).then(r => r.json());
      if (data && data.meals) {
        // Process in larger batches for speed, show results as they load
        const batchSize = 30; // Increased batch size
        const mealsToProcess = data.meals.slice(0, 200); // Reduced to 200 for speed
        const totalBatches = Math.ceil(mealsToProcess.length / batchSize);
        
        for (let i = 0; i < mealsToProcess.length; i += batchSize) {
          const batch = mealsToProcess.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;
          const progress = 20 + (batchNum / totalBatches) * 40; // 20-60%
          progressBar.style.width = `${progress}%`;
          loadingMsg.textContent = `Loading recipes... ${Math.min(i + batchSize, mealsToProcess.length)}/${mealsToProcess.length}`;
          
          const detailPromises = batch.map(async (meal) => {
            try {
              const detailUrl = `${API_BASE}/lookup.php?i=${meal.idMeal}`;
              const detailData = await fetch(detailUrl).then(r => r.json());
              if (detailData && detailData.meals && detailData.meals[0]) {
                return detailData.meals[0];
              }
              return null;
            } catch (err) {
              return null;
            }
          });
          
          const detailResults = await Promise.all(detailPromises);
          const validMeals = detailResults.filter(m => m !== null && m.idMeal && !mealIds.has(m.idMeal));
          
          validMeals.forEach(meal => {
            mealIds.add(meal.idMeal);
            allMeals.push(meal);
            const cat = meal.strCategory || 'Unknown';
            if (!mealsByCategory[cat]) mealsByCategory[cat] = [];
            mealsByCategory[cat].push(meal);
          });
          
          // Show partial results immediately
          if (allMeals.length > 0 && allMeals.length <= skeletonCount) {
            renderMeals(allMeals, false);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching country meals:', err);
    }
    
    // Step 3: For each category, ensure we have at least 50 recipes (optimized)
    progressBar.style.width = '60%';
    loadingMsg.textContent = `Found ${allMeals.length} recipes. Enhancing categories...`;
    
    // Only process categories that need enhancement (limit to top 5 for speed)
    const categoriesToEnhance = categories
      .map(cat => ({
        name: cat,
        count: mealsByCategory[cat] ? mealsByCategory[cat].length : 0
      }))
      .filter(c => c.count < 50)
      .sort((a, b) => a.count - b.count)
      .slice(0, 5); // Only enhance top 5 categories for speed
    
    let processedCategories = 0;
    for (const { name: category, count: currentCount } of categoriesToEnhance) {
      processedCategories++;
      const progress = 60 + (processedCategories / categoriesToEnhance.length) * 30; // 60-90%
      progressBar.style.width = `${progress}%`;
      loadingMsg.textContent = `Enhancing ${category} (${currentCount}/50)...`;
      
      if (currentCount < 50) {
        try {
          const catUrl = `${API_BASE}/filter.php?c=${encodeURIComponent(category)}`;
          const catData = await fetch(catUrl).then(r => r.json());
          
          if (catData && catData.meals) {
            const needed = 50 - currentCount;
            const mealsToCheck = catData.meals.slice(0, Math.min(needed * 2, 100)); // Reduced search
            
            // Process in larger batches for speed
            const checkBatchSize = 20;
            for (let j = 0; j < mealsToCheck.length && mealsByCategory[category].length < 50; j += checkBatchSize) {
              const checkBatch = mealsToCheck.slice(j, j + checkBatchSize);
              
              const detailPromises = checkBatch.map(async (meal) => {
                try {
                  const detailUrl = `${API_BASE}/lookup.php?i=${meal.idMeal}`;
                  const detailData = await fetch(detailUrl).then(r => r.json());
                  if (detailData && detailData.meals && detailData.meals[0]) {
                    const fullMeal = detailData.meals[0];
                    if (fullMeal.strArea === areaName && !mealIds.has(fullMeal.idMeal)) {
                      return fullMeal;
                    }
                  }
                  return null;
                } catch (err) {
                  return null;
                }
              });
              
              const results = await Promise.all(detailPromises);
              const validMeals = results.filter(m => m !== null);
              
              validMeals.forEach(meal => {
                if (!mealIds.has(meal.idMeal) && mealsByCategory[category].length < 50) {
                  mealIds.add(meal.idMeal);
                  allMeals.push(meal);
                  if (!mealsByCategory[category]) mealsByCategory[category] = [];
                  mealsByCategory[category].push(meal);
                }
              });
              
              if (mealsByCategory[category].length >= 50) break;
            }
          }
        } catch (err) {
          console.warn(`Error fetching category ${category}:`, err);
        }
      }
    }
    
    // Step 4: Apply category filter if specified
    progressBar.style.width = '95%';
    let filteredMeals = allMeals;
    if (categoryFilter) {
      filteredMeals = allMeals.filter(m => m.strCategory === categoryFilter);
      loadingMsg.textContent = `Found ${filteredMeals.length} ${areaName} recipes in ${categoryFilter}`;
    } else {
      loadingMsg.textContent = `Loaded ${allMeals.length} ${areaName} recipes!`;
    }

    // Remove loading elements
    if (loadingMsg.parentNode) loadingMsg.remove();
    if (progressContainer.parentNode) progressContainer.remove();
    showSpinner(false);

    if (filteredMeals.length === 0) {
      recipesEl.innerHTML = '';
      emptyState.textContent = `No recipes found for ${areaName}${categoryFilter ? ` in ${categoryFilter}` : ''}.`;
      emptyState.classList.remove('hidden');
      currentMealsCache = [];
      return;
    }

    // Sort alphabetically
    filteredMeals.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
    currentMealsCache = filteredMeals;
    
    // Final render with smooth animation
    progressBar.style.width = '100%';
    setTimeout(() => {
      renderMeals(filteredMeals);
    }, 100);
    
    // Show success message with category breakdown
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    if (categoryFilter) {
      successMsg.textContent = `✨ Loaded ${filteredMeals.length} ${areaName} recipes in ${categoryFilter}!`;
    } else {
      const categorySummary = Object.keys(mealsByCategory)
        .filter(cat => mealsByCategory[cat].length >= 50)
        .map(cat => `${cat} (${mealsByCategory[cat].length})`)
        .join(', ');
      successMsg.textContent = `✨ Loaded ${allMeals.length} ${areaName} recipes! Categories with 50+: ${categorySummary || 'Building up...'}`;
    }
    recipesEl.insertBefore(successMsg, recipesEl.firstChild);
    
    setTimeout(() => {
      if (successMsg.parentNode) successMsg.remove();
    }, 8000);
    
  } catch (err) {
    showSpinner(false);
    emptyState.textContent = 'Error loading country recipes.';
    emptyState.classList.remove('hidden');
    console.error('fetchByCountry error:', err);
  }
}

/**
 * Get search terms for a country to find more recipes
 */
function getCountrySearchTerms(areaName) {
  const terms = [areaName];
  const countryTerms = {
    'Filipino': ['Philippine', 'Pinoy', 'Filipino food'],
    'Philippine': ['Filipino', 'Pinoy', 'Philippine food'],
    'American': ['USA', 'United States', 'American food'],
    'British': ['UK', 'United Kingdom', 'British food'],
    'Canadian': ['Canada', 'Canadian food'],
    'Chinese': ['China', 'Chinese food'],
    'French': ['France', 'French food'],
    'Indian': ['India', 'Indian food'],
    'Italian': ['Italy', 'Italian food'],
    'Japanese': ['Japan', 'Japanese food'],
    'Mexican': ['Mexico', 'Mexican food'],
    'Spanish': ['Spain', 'Spanish food'],
    'Thai': ['Thailand', 'Thai food'],
    'Vietnamese': ['Vietnam', 'Vietnamese food']
  };
  
  if (countryTerms[areaName]) {
    terms.push(...countryTerms[areaName]);
  }
  
  return terms;
}

/**
 * Fetch meals by category
 */
async function fetchByCategory(categoryName) {
  try {
    recipesEl.innerHTML = '';
    emptyState.classList.add('hidden');
    showSpinner(true);

    const url = `${API_BASE}/filter.php?c=${encodeURIComponent(categoryName)}`;
    const data = await fetchJson(url);

    if (!data || !data.meals) {
      emptyState.textContent = `No recipes found in ${categoryName} category.`;
      emptyState.classList.remove('hidden');
      currentMealsCache = [];
      return;
    }

    // Fetch full details for each meal
    const mealsWithDetails = [];
    const mealPromises = data.meals.slice(0, 500).map(async (meal) => {
      try {
        const detailUrl = `${API_BASE}/lookup.php?i=${meal.idMeal}`;
        const detailData = await fetch(detailUrl).then(r => r.json());
        if (detailData && detailData.meals && detailData.meals[0]) {
          return detailData.meals[0];
        }
        return null;
      } catch (err) {
        console.warn(`Error fetching details for ${meal.idMeal}:`, err);
        return null;
      }
    });

    const results = await Promise.all(mealPromises);
    mealsWithDetails.push(...results.filter(m => m !== null));

    showSpinner(false);
    currentMealsCache = mealsWithDetails;
    renderMeals(mealsWithDetails);
  } catch (err) {
    showSpinner(false);
    emptyState.textContent = 'Error loading category recipes.';
    emptyState.classList.remove('hidden');
    console.error('fetchByCategory error:', err);
  }
}

/* -----------------------
   Modal: load and show meal details
   ----------------------- */

/**
 * Open modal with recipe details for a given meal id.
 * Fetches full details via lookup.php?i={id}
 * @param {string} id
 */
async function openMealModal(id) {
  try {
    const data = await fetchJson(`${API_BASE}/lookup.php?i=${id}`);
    if (!data || !data.meals || !data.meals[0]) {
      alert('Recipe details not available.');
      return;
    }
    const meal = data.meals[0];

    // Populate modal UI
    modalTitle.textContent = meal.strMeal;
    modalImage.src = meal.strMealThumb;
    modalImage.alt = meal.strMeal;
    modalInstructions.textContent = meal.strInstructions || 'No instructions available.';
    sourceLink.href = meal.strSource || meal.strYoutube || '#';
    sourceLink.textContent = meal.strSource ? 'Open source recipe' : (meal.strYoutube ? 'Watch on YouTube' : 'Source');

    // Build ingredients list
    ingredientsList.innerHTML = '';
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ing && ing.trim()) {
        const li = document.createElement('li');
        li.textContent = measure ? `${ing} — ${measure}` : ing;
        ingredientsList.appendChild(li);
      }
    }

    // Update favorite toggle in modal
    favToggle.textContent = favorites[meal.idMeal] ? 'Remove from Favorites' : 'Add to Favorites';
    favToggle.onclick = () => {
      toggleFavorite(meal);
      favToggle.textContent = favorites[meal.idMeal] ? 'Remove from Favorites' : 'Add to Favorites';
    };

    showModal();
  } catch (err) {
    console.error('openMealModal error', err);
  }
}

/** Show modal and disable page scroll */
function showModal() {
  recipeModal.setAttribute('aria-hidden', 'false');
  recipeModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/** Hide modal and restore scroll */
function hideModal() {
  recipeModal.setAttribute('aria-hidden', 'true');
  recipeModal.style.display = 'none';
  document.body.style.overflow = '';
}

/* -----------------------
   Favorites view
   ----------------------- */

/** Render favorites as cards. */
function renderFavorites() {
  recipesEl.innerHTML = '';
  const favArray = Object.values(favorites);
  if (favArray.length === 0) {
    emptyState.textContent = 'You have no favorites yet. Save recipes to view them here.';
    emptyState.classList.remove('hidden');
    currentMealsCache = [];
    return;
  }
  emptyState.classList.add('hidden');
  currentMealsCache = favArray.slice();
  favArray.forEach(meal => {
    const card = createMealCard(meal);
    recipesEl.appendChild(card);
  });
}

/* -----------------------
   Home / default list - Load ALL meals
   ----------------------- */

/** Fetch ALL meals from TheMealDB by searching each letter a-z */
async function fetchAllMeals() {
  console.log('fetchAllMeals called');
  try {
    if (!recipesEl) {
      console.error('recipesEl is null in fetchAllMeals!');
      return;
    }
    
    recipesEl.innerHTML = '';
    if (emptyState) {
      emptyState.classList.add('hidden');
    }
    
    // Show skeleton loaders immediately
    const skeletons = createSkeletonCards(12);
    skeletons.forEach(skeleton => recipesEl.appendChild(skeleton));
    
    // Create progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.innerHTML = '<div class="progress-bar" id="progressBarAll" style="width:0%"></div>';
    recipesEl.insertBefore(progressContainer, recipesEl.firstChild);
    const progressBar = document.getElementById('progressBarAll');
    
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'loading-message';
    loadingMsg.textContent = 'Loading all recipes from around the world...';
    recipesEl.insertBefore(loadingMsg, progressContainer);

    const allMeals = [];
    const mealIds = new Set(); // To deduplicate meals
    
    // Fetch meals for each letter (a-z)
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    
    // Process in larger batches for speed
    const batchSize = 8; // Increased from 5
    const totalBatches = Math.ceil(letters.length / batchSize);
    
    for (let i = 0; i < letters.length; i += batchSize) {
      const batch = letters.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const progress = Math.min(95, Math.round((batchNum / totalBatches) * 90));
      progressBar.style.width = `${progress}%`;
      
      const promises = batch.map(letter => 
        fetch(`${API_BASE}/search.php?f=${letter}`)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
          })
          .then(data => data.meals || [])
          .catch(err => {
            console.warn(`Error fetching meals for letter ${letter}:`, err);
            return [];
          })
      );
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(meals => {
        if (meals && Array.isArray(meals)) {
          meals.forEach(meal => {
            if (meal && meal.idMeal && !mealIds.has(meal.idMeal)) {
              mealIds.add(meal.idMeal);
              allMeals.push(meal);
            }
          });
        }
      });
      
      // Update progress
      loadingMsg.textContent = `Loading recipes... Found ${allMeals.length} so far (${progress}%)`;
      
      // Show partial results as they load (every 2 batches for smooth updates)
      if (batchNum % 2 === 0 && allMeals.length > 0) {
        const sortedMeals = [...allMeals].sort((a, b) => a.strMeal.localeCompare(b.strMeal));
        renderMeals(sortedMeals, false);
      }
    }

    // Remove loading elements
    if (loadingMsg.parentNode) loadingMsg.remove();
    if (progressContainer.parentNode) progressContainer.remove();
    showSpinner(false);
    progressBar.style.width = '100%';

    if (allMeals.length === 0) {
      emptyState.textContent = 'No recipes found. Please try again later.';
      emptyState.classList.remove('hidden');
      currentMealsCache = [];
      return;
    }

    // Sort meals alphabetically by name
    allMeals.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
    
    // Final render
    setTimeout(() => {
      renderMeals(allMeals);
      currentMealsCache = allMeals;
      
      // Show success message briefly
      const successMsg = document.createElement('div');
      successMsg.className = 'success-message';
      successMsg.textContent = `✨ Loaded ${allMeals.length} recipes from around the world!`;
      recipesEl.insertBefore(successMsg, recipesEl.firstChild);
      
      // Remove success message after 5 seconds
      setTimeout(() => {
        if (successMsg.parentNode) {
          successMsg.remove();
        }
      }, 5000);
    }, 100);
    
  } catch (err) {
    showSpinner(false);
    emptyState.textContent = 'Error loading all recipes. Please try again later.';
    emptyState.classList.remove('hidden');
    console.error('fetchAllMeals error:', err);
    currentMealsCache = [];
  }
}

/** Load a friendly home list - now shows ALL meals */
function loadHomeList() {
  console.log('loadHomeList called');
  
  if (searchInput) {
    searchInput.value = '';
  }
  if (categorySelect) {
    categorySelect.value = '';
  }
  if (countrySelect) {
    countrySelect.value = '';
  }
  
  // Load all meals
  console.log('Calling fetchAllMeals...');
  fetchAllMeals().catch(err => {
    console.error('Error in fetchAllMeals:', err);
    console.error('Error stack:', err.stack);
    // Fallback: show a sample search
    console.log('Trying fallback search...');
    fetchAndRender('chicken').catch(fallbackErr => {
      console.error('Fallback also failed:', fallbackErr);
      if (emptyState) {
        emptyState.textContent = 'Unable to load recipes. Please check your internet connection and try again.';
        emptyState.classList.remove('hidden');
      }
    });
  });
}

/* -----------------------
   Helpers: spinner, clear filters
   ----------------------- */

/** Show / hide spinner */
function showSpinner(show) {
  if (show) {
    spinner.classList.remove('hidden');
    spinner.setAttribute('aria-hidden', 'false');
  } else {
    spinner.classList.add('hidden');
    spinner.setAttribute('aria-hidden', 'true');
  }
}

/** Clear search and filters */
function clearFilters() {
  searchInput.value = '';
  categorySelect.value = '';
  countrySelect.value = '';
}

/* -----------------------
   Voice search
   ----------------------- */

/** Initialize and handle voice search clicking */
function handleVoiceSearch() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Voice search not supported in this browser. Try Chrome or Edge on desktop/mobile.');
    return;
  }

  if (!recognition) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      searchInput.value = text;
      onSearchClicked();
    };

    recognition.onerror = (e) => {
      console.warn('Speech recognition error', e);
      alert('Voice recognition error. Try again.');
    };
  }

  try {
    recognition.start();
  } catch (err) {
    console.warn('recognition start error', err);
  }
}

/* -----------------------
   Footer date/time display
   ----------------------- */

/** Update footer date and time display */
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

/** Initialize footer date/time and update every second */
function initFooterDateTime() {
  updateFooterDateTime();
  setInterval(updateFooterDateTime, 1000);
}

/* -----------------------
   Small helpers & bootstrap
   ----------------------- */

/** Render meals when we already have an array (used by fetchByCountry and favorites) */
function renderMealsDirect(meals) {
  renderMeals(meals);
}

// Start the app when DOM is ready
(function() {
  function startApp() {
    try {
      console.log('Starting app initialization...');
      
      // Ensure DOM is fully loaded
      const recipesElement = document.getElementById('recipes');
      if (!recipesElement) {
        console.warn('DOM not ready, waiting...');
        setTimeout(startApp, 100);
        return;
      }
      
      console.log('DOM ready, initializing...');
      init();
      console.log('Init completed, starting footer datetime...');
      initFooterDateTime();
      console.log('App initialization complete!');
    } catch (err) {
      console.error('Error initializing app:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      // Show error message to user only if content area exists
      const content = document.getElementById('content');
      if (content) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'empty-state';
        errorDiv.textContent = 'Error loading application: ' + (err.message || err.toString()) + '. Please check console for details.';
        errorDiv.style.cssText = 'margin:20px; padding:20px; background:#fee; color:#c00; border-radius:10px;';
        content.appendChild(errorDiv);
      }
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    // DOM already loaded, but wait a tiny bit to ensure all scripts are loaded
    setTimeout(startApp, 50);
  }
})();
