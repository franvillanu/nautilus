# Backup Current Feedback Data

## IMPORTANT: Do This First!

Before making any changes, backup your current feedback data.

## Option 1: Browser Console Backup (Easiest)

1. Open your app: https://nautilusapp.science
2. Open browser console (F12)
3. Paste this script:

```javascript
// Backup current data
const backup = {
    timestamp: new Date().toISOString(),
    localStorage: {
        feedbackCache: localStorage.getItem('feedbackItemsCache:v1')
    },
    source: 'browser-backup'
};

// Download as JSON file
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `feedback-backup-${Date.now()}.json`;
a.click();

console.log('✅ Backup downloaded!');
console.log('Items in cache:', JSON.parse(backup.localStorage.feedbackCache || '[]').length);
```

This downloads a JSON file with all your cached feedback items.

## Option 2: Wrangler CLI Backup (Complete)

If you have Wrangler installed:

```bash
# Create backup directory
mkdir -p backups/feedback-$(date +%Y%m%d)

# List all feedback keys
wrangler kv:key list --binding=NAUTILUS_DATA --prefix="global:feedback" > backups/feedback-$(date +%Y%m%d)/keys.json

# Backup main array (if exists)
wrangler kv:key get "global:feedbackItems" --binding=NAUTILUS_DATA > backups/feedback-$(date +%Y%m%d)/feedbackItems.json

# Backup index (if exists)
wrangler kv:key get "global:feedback:index" --binding=NAUTILUS_DATA > backups/feedback-$(date +%Y%m%d)/index.json
```

## Option 3: Export from Cloudflare Dashboard

1. Go to Cloudflare Dashboard
2. Navigate to: Workers & Pages → KV
3. Select your `NAUTILUS_DATA` namespace
4. Search for keys starting with `global:feedback`
5. Manually copy/save the values

## Verify Backup

After backup, verify you have the data:

```javascript
// Check backup file
fetch('path/to/your/backup.json')
    .then(r => r.json())
    .then(backup => {
        const items = JSON.parse(backup.localStorage.feedbackCache || '[]');
        console.log('Backup contains', items.length, 'items');
        console.log('Sample:', items.slice(0, 3));
    });
```

## Restore from Backup (If Needed)

If something goes wrong, restore from backup:

```javascript
// Load your backup file
const backupData = /* paste your backup JSON here */;

// Restore to localStorage
localStorage.setItem('feedbackItemsCache:v1', backupData.localStorage.feedbackCache);

// Reload page
location.reload();
```

## What to Backup

Your backup should include:
- ✅ All feedback items from localStorage cache
- ✅ Timestamps for when backup was created
- ✅ Count of items backed up

## Safety Notes

- Backup is read-only - won't affect current data
- Keep backup file safe - it contains your feedback history
- Can restore anytime if migration fails
- Original KV data is NOT deleted during migration

## Next Steps

After backup is complete:
1. ✅ Verify backup file exists and has data
2. ✅ Keep backup file in safe location
3. ✅ Proceed with migration instructions

---

**DO NOT PROCEED WITHOUT BACKUP!**
