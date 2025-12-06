/* ---------------------------
   Categories Page — categories.js
   Features:
   - Display all recipe categories
   - Search/filter categories
   - Show recipe count per category
   - Interactive category cards
   - Theme toggle functionality
   --------------------------- */

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';
const themeToggle = document.getElementById('themeToggle');
const categorySearch = document.getElementById('categorySearch');
const categoriesGrid = document.getElementById('categoriesGrid');
const emptyState = document.getElementById('emptyState');
const spinner = document.getElementById('spinner');
const viewAllBtn = document.getElementById('viewAllBtn');

let allCategories = [];

/**
 * Initialize the categories page
 */
function init() {
  restoreTheme();
  bindEvents();
  loadCategories();
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
  
  // Category search
  categorySearch.addEventListener('input', (e) => {
    filterCategories(e.target.value);
  });
  
  // View all recipes button
  viewAllBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
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
 * Load all categories from API
 */
async function loadCategories() {
  try {
    showSpinner(true);
    emptyState.classList.add('hidden');
    
    const response = await fetch(`${API_BASE}/list.php?c=list`);
    const data = await response.json();
    
    if (data && data.meals) {
      allCategories = data.meals;
      
      // Fetch recipe count for each category
      const categoriesWithCounts = await Promise.all(
        allCategories.map(async (category) => {
          try {
            const countResponse = await fetch(`${API_BASE}/filter.php?c=${encodeURIComponent(category.strCategory)}`);
            const countData = await countResponse.json();
            return {
              ...category,
              count: countData && countData.meals ? countData.meals.length : 0
            };
          } catch (err) {
            return { ...category, count: 0 };
          }
        })
      );
      
      allCategories = categoriesWithCounts;
      renderCategories(allCategories);
    } else {
      emptyState.textContent = 'No categories found.';
      emptyState.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error loading categories:', err);
    emptyState.textContent = 'Error loading categories. Please try again later.';
    emptyState.classList.remove('hidden');
  } finally {
    showSpinner(false);
  }
}

/**
 * Filter categories based on search input
 */
function filterCategories(searchTerm) {
  const filtered = allCategories.filter(cat => 
    cat.strCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );
  renderCategories(filtered);
}

/**
 * Render categories to the grid
 */
function renderCategories(categories) {
  categoriesGrid.innerHTML = '';
  
  if (categories.length === 0) {
    emptyState.textContent = 'No categories match your search.';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  categories.forEach(category => {
    const categoryCard = createCategoryCard(category);
    categoriesGrid.appendChild(categoryCard);
  });
}

/**
 * Create a category card element
 */
function createCategoryCard(category) {
  const card = document.createElement('div');
  card.className = 'category-card';
  card.setAttribute('role', 'listitem');
  
  card.innerHTML = `
    <div class="category-icon">${getCategoryIcon(category.strCategory)}</div>
    <h3 class="category-name">${category.strCategory}</h3>
    <p class="category-count">${category.count || 0} recipes</p>
    <button class="view-category-btn" data-category="${category.strCategory}">View Recipes</button>
  `;
  
  // Add click handler
  const viewBtn = card.querySelector('.view-category-btn');
  viewBtn.addEventListener('click', () => {
    // Navigate to main page with category filter
    window.location.href = `index.html?category=${encodeURIComponent(category.strCategory)}`;
  });
  
  return card;
}

/**
 * Get emoji icon for category
 */
function getCategoryIcon(category) {
  const icons = {
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
  return icons[category] || '🍳';
}

/**
 * Show/hide spinner
 */
function showSpinner(show) {
  if (show) {
    spinner.classList.remove('hidden');
    spinner.setAttribute('aria-hidden', 'false');
  } else {
    spinner.classList.add('hidden');
    spinner.setAttribute('aria-hidden', 'true');
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

