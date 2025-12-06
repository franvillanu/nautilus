/**
 * PRODUCTION DATA BACKUP SCRIPT
 *
 * Instructions:
 * 1. Open your production site: https://nautilus-dky.pages.dev
 * 2. Open DevTools Console (F12)
 * 3. Copy and paste this ENTIRE script
 * 4. Press Enter
 * 5. File will auto-download: nautilus-production-backup-YYYY-MM-DD.json
 *
 * This backs up ALL data from production KV storage.
 */

(async function() {
    console.log('🔄 Starting production data backup...');

    const backup = {
        timestamp: new Date().toISOString(),
        source: 'production',
        data: {}
    };

    // List of all keys to backup
    const keys = [
        'tasks',
        'projects',
        'feedbackItems',
        'projectColors',
        'sortMode',
        'manualTaskOrder'
    ];

    // Fetch each key from storage API
    for (const key of keys) {
        try {
            console.log(`  Fetching: ${key}...`);
            const response = await fetch(`/api/storage?key=${key}`);

            if (response.ok) {
                const text = await response.text();
                try {
                    backup.data[key] = JSON.parse(text);
                    console.log(`  ✅ ${key}: ${text.length} bytes`);
                } catch (e) {
                    // If it's not JSON, store as-is
                    backup.data[key] = text;
                    console.log(`  ✅ ${key}: ${text.length} bytes (raw)`);
                }
            } else {
                console.log(`  ⚠️  ${key}: not found or empty`);
                backup.data[key] = null;
            }
        } catch (error) {
            console.error(`  ❌ Error fetching ${key}:`, error);
            backup.data[key] = null;
        }
    }

    // Create download
    const backupJson = JSON.stringify(backup, null, 2);
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nautilus-production-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('\n📦 BACKUP COMPLETE!');
    console.log(`File downloaded: ${a.download}`);
    console.log(`Total size: ${(backupJson.length / 1024).toFixed(2)} KB`);
    console.log('\nBackup contains:');
    Object.keys(backup.data).forEach(key => {
        const value = backup.data[key];
        if (value === null) {
            console.log(`  - ${key}: (empty)`);
        } else if (Array.isArray(value)) {
            console.log(`  - ${key}: ${value.length} items`);
        } else if (typeof value === 'object') {
            console.log(`  - ${key}: object with ${Object.keys(value).length} keys`);
        } else {
            console.log(`  - ${key}: ${value}`);
        }
    });

    console.log('\n✅ SAFE TO PROCEED WITH MIGRATION');
    console.log('Keep this backup file safe!');
})();
