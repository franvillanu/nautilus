/**
 * Clear Feedback Cache Script
 * 
 * Run this in the browser console after deploying the D1 migration
 * to clear old cached feedback data and force a fresh load from D1.
 * 
 * Usage:
 * 1. Open browser console on your app
 * 2. Copy and paste this entire script
 * 3. Press Enter
 */

(function() {
    console.log('🧹 Clearing feedback cache...');
    
    // Clear the feedback cache
    localStorage.removeItem('feedbackItemsCache:v1');
    
    console.log('✅ Feedback cache cleared!');
    console.log('🔄 Reloading page to load fresh data from D1...');
    
    // Reload the page to fetch fresh data from D1
    setTimeout(() => {
        location.reload();
    }, 500);
})();
