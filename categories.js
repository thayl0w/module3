// categories page script
// loads categories, shows counts and has a small search

const API_URL = 'https://www.themealdb.com/api/json/v1/1';
const themeToggleCat = document.getElementById('themeToggle');
const categorySearch = document.getElementById('categorySearch');
const categoriesGrid = document.getElementById('categoriesGrid');
const emptyState = document.getElementById('emptyState');
const spinner = document.getElementById('spinner');
const viewAllBtn = document.getElementById('viewAllBtn');

let allCategories = [];

/**
 * Boot the categories page.
 */
function initCategoriesPage() {
  restoreThemePref();
  bindCategoryEvents();
  loadAllCategories();
  startFooterClockCategories();
}

/**
 * Bind UI events.
 */
function bindCategoryEvents() {
  if (themeToggleCat) {
    themeToggleCat.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('rf-theme-dark', isDark);
      themeToggleCat.textContent = isDark ? '☀️' : '🌙';
    });
  }

  if (categorySearch) {
    categorySearch.addEventListener('input', (e) => {
      filterCategories(e.target.value);
    });
  }

  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      // go back to main page
      window.location.href = 'index.html';
    });
  }
}

/**
 * Restore the saved theme.
 */
function restoreThemePref() {
  const dark = localStorage.getItem('rf-theme-dark') === 'true';
  if (dark) {
    document.body.classList.add('dark');
    document.documentElement.classList.add('dark');
    if (themeToggleCat) themeToggleCat.textContent = '☀️';
  } else {
    if (themeToggleCat) themeToggleCat.textContent = '🌙';
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Load categories from API and get counts.
 */
async function loadAllCategories() {
  try {
    toggleSpinner(true);
    if (emptyState) emptyState.classList.add('hidden');

    const res = await fetch(`${API_URL}/list.php?c=list`);
    const data = await res.json();

    if (data && data.meals) {
      allCategories = data.meals;

      // fetch counts for each category in parallel
      const withCounts = await Promise.all(allCategories.map(async (cat) => {
        try {
          const r = await fetch(`${API_URL}/filter.php?c=${encodeURIComponent(cat.strCategory)}`);
          const d = await r.json();
          return { ...cat, count: d && d.meals ? d.meals.length : 0 };
        } catch (err) {
          // return 0 if a count fetch fails
          return { ...cat, count: 0 };
        }
      }));

      allCategories = withCounts;
      renderCategories(allCategories);
    } else {
      if (emptyState) {
        emptyState.textContent = 'No categories found.';
        emptyState.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('Error loading categories:', err);
    if (emptyState) {
      emptyState.textContent = 'Error loading categories. Please try again later.';
      emptyState.classList.remove('hidden');
    }
  } finally {
    toggleSpinner(false);
  }
}

/**
 * Filter categories by name.
 */
function filterCategories(term) {
  if (!term) {
    renderCategories(allCategories);
    return;
  }
  const filtered = allCategories.filter(cat =>
    cat.strCategory.toLowerCase().includes(term.toLowerCase())
  );
  renderCategories(filtered);
}

/**
 * Render a list of category objects to the page.
 */
function renderCategories(list) {
  if (!categoriesGrid) return;
  categoriesGrid.innerHTML = '';

  if (!list || list.length === 0) {
    if (emptyState) {
      emptyState.textContent = 'No categories match your search.';
      emptyState.classList.remove('hidden');
    }
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  list.forEach(category => {
    const card = createCategoryCard(category);
    categoriesGrid.appendChild(card);
  });
}

/**
 * Make a category card element.
 */
function createCategoryCard(category) {
  const card = document.createElement('div');
  card.className = 'category-card';
  card.setAttribute('role', 'listitem');

  card.innerHTML = `
    <div class="category-icon">${getIcon(category.strCategory)}</div>
    <h3 class="category-name">${category.strCategory}</h3>
    <p class="category-count">${category.count || 0} recipes</p>
    <button class="view-category-btn" data-category="${category.strCategory}">View Recipes</button>
  `;

  const viewBtn = card.querySelector('.view-category-btn');
  viewBtn.addEventListener('click', () => {
    // go to main page with category param
    window.location.href = `index.html?category=${encodeURIComponent(category.strCategory)}`;
  });

  return card;
}

/**
 * Return a small emoji icon for some categories.
 * Not exhaustive, just a helpful visual.
 */
function getIcon(category) {
  const map = {
    'Beef': '🥩',
    'Chicken': '🍗',
    'Dessert': '🍰',
    'Lamb': '🐑',
    'Miscellaneous': '🍽️',
    'Pasta': '🍝',
    'Pork': '🐷',
    'Seafood': '🐟',
    'Side': '🥗',
    'Starter': '🥘',
    'Vegan': '🌱',
    'Vegetarian': '🥕',
    'Breakfast': '🥞',
    'Goat': '🐐'
  };
  return map[category] || '🍳';
}

/**
 * Show or hide the spinner element.
 */
function toggleSpinner(show) {
  if (!spinner) return;
  if (show) {
    spinner.classList.remove('hidden');
    spinner.setAttribute('aria-hidden', 'false');
  } else {
    spinner.classList.add('hidden');
    spinner.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Update footer date/time for categories page.
 */
function updateFooterDateTimeCategories() {
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
 * Start the footer clock updater.
 */
function startFooterClockCategories() {
  updateFooterDateTimeCategories();
  setInterval(updateFooterDateTimeCategories, 1000);
}

// start the page
initCategoriesPage();
