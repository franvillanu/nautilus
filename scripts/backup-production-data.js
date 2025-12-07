/**
 * Backup Production Data Script
 * Run this BEFORE deploying multi-user changes
 *
 * Usage: node scripts/backup-production-data.js
 */

// This script should be run in Cloudflare Workers environment
// Or adapted to use wrangler CLI to access KV

const BACKUP_KEYS = [
    'tasks',
    'projects',
    'feedbackItems',
    'projectColors',
    'sortMode',
    'manualTaskOrder'
];

async function backupProductionData(env) {
    const backup = {
        timestamp: new Date().toISOString(),
        data: {}
    };

    console.log('🔄 Starting production data backup...');

    for (const key of BACKUP_KEYS) {
        try {
            const value = await env.NAUTILUS_DATA.get(key);
            if (value) {
                backup.data[key] = JSON.parse(value);
                console.log(`✅ Backed up: ${key} (${value.length} bytes)`);
            } else {
                console.log(`⚠️  No data found for: ${key}`);
            }
        } catch (error) {
            console.error(`❌ Error backing up ${key}:`, error);
        }
    }

    // Save backup as JSON file
    const backupJson = JSON.stringify(backup, null, 2);
    console.log('\n📦 Backup complete!');
    console.log(`Total size: ${backupJson.length} bytes`);
    console.log('\n--- BACKUP DATA (copy and save this) ---\n');
    console.log(backupJson);
    console.log('\n--- END BACKUP DATA ---\n');

    return backup;
}

// For manual execution in browser console on production site:
console.log(`
To backup production data manually:
1. Open production site in browser
2. Open DevTools Console
3. Run this:

const backup = {};
const keys = ['tasks', 'projects', 'feedbackItems', 'projectColors', 'sortMode', 'manualTaskOrder'];

async function backupNow() {
    for (const key of keys) {
        try {
            const response = await fetch(\`/api/storage?key=\${key}\`);
            if (response.ok) {
                const data = await response.json();
                backup[key] = data;
                console.log('✅ Backed up:', key);
            }
        } catch (err) {
            console.error('❌ Error backing up', key, err);
        }
    }
    console.log('📦 BACKUP COMPLETE - Copy this object:');
    console.log(JSON.stringify({timestamp: new Date().toISOString(), data: backup}, null, 2));
}

backupNow();
`);

export default backupProductionData;
