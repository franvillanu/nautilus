# Feedback Data Recovery Instructions

## Problem Summary

Your feedback data exists in the KV store but is stored in the "index format" (`global:feedback:item:XXX`), while the current code expects the "array format" (`global:feedbackItems`). This is why the UI shows no feedback items.

## What You Have

From your screenshot, you have **100+ feedback items** stored as:
- `global:feedback:item:f1`
- `global:feedback:item:f2`
- `global:feedback:item:f3`
- ... and many more

## Recovery Steps

### Option 1: Deploy Migration Endpoint (RECOMMENDED)

1. **Deploy the migration endpoint**:
   ```bash
   git checkout fix/feedback-data-recovery
   git push
   # Wait for Cloudflare Pages to deploy
   ```

2. **Run the migration** (in your browser or via curl):
   ```bash
   # Replace with your actual domain
   curl -X POST https://nautilus-dky.pages.dev/api/migrate-feedback \
     -H "Authorization: Bearer YOUR_AUTH_TOKEN"
   ```

3. **Verify the migration**:
   - Open your app
   - Go to Feedback section
   - All items should now be visible

4. **Clean up** (after successful migration):
   ```bash
   git checkout main
   rm functions/api/migrate-feedback.js
   git commit -m "chore: remove migration script after successful recovery"
   ```

### Option 2: Manual Recovery via Wrangler

1. **Install wrangler** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **List all feedback items**:
   ```bash
   wrangler kv:key list --binding=NAUTILUS_DATA --prefix="global:feedback:item:"
   ```

4. **Get each item and save to a file**:
   ```bash
   # This will take a while with 100+ items
   wrangler kv:key get "global:feedback:item:f1" --binding=NAUTILUS_DATA > item-f1.json
   wrangler kv:key get "global:feedback:item:f2" --binding=NAUTILUS_DATA > item-f2.json
   # ... repeat for all items
   ```

5. **Combine into array and upload**:
   ```bash
   # Manually combine all JSON files into an array
   # Then upload:
   wrangler kv:key put "global:feedbackItems" --binding=NAUTILUS_DATA --path=combined-feedback.json
   ```

### Option 3: Browser Console Recovery

1. **Open your app** in production
2. **Open browser console** (F12)
3. **Run this script**:

```javascript
// Feedback Data Recovery Script
async function recoverFeedbackData() {
    console.log('Starting feedback data recovery...');
    
    try {
        // Get auth token
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('Not logged in!');
            return;
        }
        
        // Call migration endpoint
        const response = await fetch('/api/migrate-feedback', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        console.log('Migration result:', result);
        
        if (result.success) {
            console.log(`✅ Successfully migrated ${result.stats.newItemsMigrated} items!`);
            console.log(`📊 Total items after migration: ${result.stats.totalAfterMigration}`);
            
            // Reload the page to see recovered data
            alert(`Migration successful! Recovered ${result.stats.newItemsMigrated} items. Reloading...`);
            window.location.reload();
        } else {
            console.error('❌ Migration failed:', result.error);
        }
    } catch (error) {
        console.error('💥 Error during recovery:', error);
    }
}

// Run the recovery
recoverFeedbackData();
```

## What the Migration Does

1. **Finds all items** stored in `global:feedback:item:XXX` format
2. **Loads each item** and parses the JSON
3. **Checks existing data** in `global:feedbackItems` to avoid duplicates
4. **Merges and sorts** all items by creation date (newest first)
5. **Saves to array format** that the current code expects
6. **Updates the index** for backward compatibility

## Expected Results

After migration:
- ✅ All feedback items visible in UI
- ✅ Pagination working correctly
- ✅ No data loss
- ✅ Both storage formats in sync

## Verification

After running the migration, verify:

1. **Check KV store**:
   ```bash
   wrangler kv:key get "global:feedbackItems" --binding=NAUTILUS_DATA
   ```
   Should return a JSON array with all your items

2. **Check UI**:
   - Open Feedback section
   - Should see all items with pagination
   - Try adding a new item - should work normally

3. **Check browser console**:
   - No errors
   - localStorage should have `feedbackItemsCache:v1` with data

## Troubleshooting

### "Unauthorized" error
- Make sure you're logged in
- Check that your auth token is valid
- Try logging out and back in

### "No items to migrate"
- Check if items are already in array format
- Verify KV store has items with prefix `global:feedback:item:`

### Items still not showing
- Clear browser cache and localStorage
- Hard refresh (Ctrl+Shift+R)
- Check browser console for errors

## Prevention

To prevent this in the future:
1. Always write migration scripts when changing storage formats
2. Test migrations on staging before production
3. Keep backward compatibility during transitions
4. Add data validation to detect format mismatches

## Need Help?

If the migration fails or you need assistance:
1. Check the browser console for error messages
2. Check Cloudflare Workers logs
3. Share the error output for debugging
