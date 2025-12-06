/* ---------------------------
   Database Module — database.js
   Features:
   - IndexedDB integration for recipe storage
   - Favorites management
   - Search history
   - User preferences
   --------------------------- */

const DB_NAME = 'RecipeFinderDB';
const DB_VERSION = 1;
let db = null;

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Database failed to open');
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('favorites')) {
        const favoritesStore = db.createObjectStore('favorites', { keyPath: 'idMeal' });
        favoritesStore.createIndex('name', 'strMeal', { unique: false });
        favoritesStore.createIndex('category', 'strCategory', { unique: false });
        favoritesStore.createIndex('area', 'strArea', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('searchHistory')) {
        const historyStore = db.createObjectStore('searchHistory', { keyPath: 'id', autoIncrement: true });
        historyStore.createIndex('query', 'query', { unique: false });
        historyStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('userPreferences')) {
        db.createObjectStore('userPreferences', { keyPath: 'key' });
      }
    };
  });
}

/**
 * Get database instance (initialize if needed)
 * @returns {Promise<IDBDatabase>}
 */
async function getDatabase() {
  if (db) return db;
  return await initDatabase();
}

/**
 * Save favorite recipe to database
 * @param {Object} meal - Recipe object
 * @returns {Promise<void>}
 */
async function saveFavorite(meal) {
  try {
    const database = await getDatabase();
    const transaction = database.transaction(['favorites'], 'readwrite');
    const store = transaction.objectStore('favorites');
    await store.put(meal);
    
    // Also update localStorage for backward compatibility
    const favorites = JSON.parse(localStorage.getItem('rf-favorites') || '{}');
    favorites[meal.idMeal] = meal;
    localStorage.setItem('rf-favorites', JSON.stringify(favorites));
  } catch (err) {
    console.error('Error saving favorite:', err);
    // Fallback to localStorage
    const favorites = JSON.parse(localStorage.getItem('rf-favorites') || '{}');
    favorites[meal.idMeal] = meal;
    localStorage.setItem('rf-favorites', JSON.stringify(favorites));
  }
}

/**
 * Remove favorite recipe from database
 * @param {string} mealId - Recipe ID
 * @returns {Promise<void>}
 */
async function removeFavorite(mealId) {
  try {
    const database = await getDatabase();
    const transaction = database.transaction(['favorites'], 'readwrite');
    const store = transaction.objectStore('favorites');
    await store.delete(mealId);
    
    // Also update localStorage
    const favorites = JSON.parse(localStorage.getItem('rf-favorites') || '{}');
    delete favorites[mealId];
    localStorage.setItem('rf-favorites', JSON.stringify(favorites));
  } catch (err) {
    console.error('Error removing favorite:', err);
    // Fallback to localStorage
    const favorites = JSON.parse(localStorage.getItem('rf-favorites') || '{}');
    delete favorites[mealId];
    localStorage.setItem('rf-favorites', JSON.stringify(favorites));
  }
}

/**
 * Get all favorites from database
 * @returns {Promise<Array>}
 */
async function getAllFavorites() {
  try {
    const database = await getDatabase();
    const transaction = database.transaction(['favorites'], 'readonly');
    const store = transaction.objectStore('favorites');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error getting favorites:', err);
    // Fallback to localStorage
    const favorites = JSON.parse(localStorage.getItem('rf-favorites') || '{}');
    return Object.values(favorites);
  }
}

/**
 * Check if recipe is favorited
 * @param {string} mealId - Recipe ID
 * @returns {Promise<boolean>}
 */
async function isFavorite(mealId) {
  try {
    const database = await getDatabase();
    const transaction = database.transaction(['favorites'], 'readonly');
    const store = transaction.objectStore('favorites');
    
    return new Promise((resolve, reject) => {
      const request = store.get(mealId);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error checking favorite:', err);
    // Fallback to localStorage
    const favorites = JSON.parse(localStorage.getItem('rf-favorites') || '{}');
    return !!favorites[mealId];
  }
}

/**
 * Save search query to history
 * @param {string} query - Search query
 * @returns {Promise<void>}
 */
async function saveSearchHistory(query) {
  if (!query || query.trim().length === 0) return;
  
  try {
    const database = await getDatabase();
    const transaction = database.transaction(['searchHistory'], 'readwrite');
    const store = transaction.objectStore('searchHistory');
    
    const historyItem = {
      query: query.trim(),
      timestamp: Date.now()
    };
    
    await store.add(historyItem);
    
    // Keep only last 50 searches
    const allHistory = await new Promise((resolve, reject) => {
      const request = store.index('timestamp').openCursor(null, 'prev');
      const history = [];
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          history.push(cursor.value);
          if (history.length < 50) {
            cursor.continue();
          } else {
            // Delete older entries
            cursor.delete();
            cursor.continue();
          }
        } else {
          resolve(history);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error saving search history:', err);
  }
}

/**
 * Get search history
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>}
 */
async function getSearchHistory(limit = 10) {
  try {
    const database = await getDatabase();
    const transaction = database.transaction(['searchHistory'], 'readonly');
    const store = transaction.objectStore('searchHistory');
    const index = store.index('timestamp');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const history = [];
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && history.length < limit) {
          history.push(cursor.value);
          cursor.continue();
        } else {
          resolve(history);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error getting search history:', err);
    return [];
  }
}

/**
 * Save user preference
 * @param {string} key - Preference key
 * @param {*} value - Preference value
 * @returns {Promise<void>}
 */
async function savePreference(key, value) {
  try {
    const database = await getDatabase();
    const transaction = database.transaction(['userPreferences'], 'readwrite');
    const store = transaction.objectStore('userPreferences');
    await store.put({ key, value });
  } catch (err) {
    console.error('Error saving preference:', err);
    // Fallback to localStorage
    localStorage.setItem(`rf-pref-${key}`, JSON.stringify(value));
  }
}

/**
 * Get user preference
 * @param {string} key - Preference key
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>}
 */
async function getPreference(key, defaultValue = null) {
  try {
    const database = await getDatabase();
    const transaction = database.transaction(['userPreferences'], 'readonly');
    const store = transaction.objectStore('userPreferences');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error getting preference:', err);
    // Fallback to localStorage
    const stored = localStorage.getItem(`rf-pref-${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  }
}

// Initialize database on load (non-blocking)
if (typeof indexedDB !== 'undefined') {
  // Use setTimeout to avoid blocking page load
  setTimeout(() => {
    initDatabase().catch(err => {
      console.warn('IndexedDB not available, using localStorage fallback:', err);
    });
  }, 100);
}

