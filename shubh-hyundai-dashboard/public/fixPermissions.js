// Emergency Permission Cache Fix
// Run this in browser console to immediately clear cache and refresh permissions

console.log("🚨 Emergency Permission Cache Fix Starting...");

// Step 1: Clear ALL permission caches
const allKeys = Object.keys(localStorage);
let clearedCount = 0;

allKeys.forEach(key => {
  if (key.startsWith('permissions_')) {
    localStorage.removeItem(key);
    clearedCount++;
    console.log("🗑️ Cleared cache:", key);
  }
});

console.log(`✅ Cleared ${clearedCount} permission cache entries`);

// Step 2: Clear any other related caches
const otherCaches = ['lastFetchedEmail', 'userPermissions', 'rolePermissions'];
otherCaches.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log("🗑️ Cleared other cache:", key);
  }
});

// Step 3: Force reload the page
console.log("🔄 Forcing page reload to get fresh permissions...");
setTimeout(() => {
  window.location.reload();
}, 1000);

console.log("✅ Cache cleared! Page will reload in 1 second to fetch fresh permissions.");
