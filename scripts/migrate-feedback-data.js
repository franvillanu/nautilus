/**
 * Feedback Data Migration Script
 * 
 * This script recovers feedback items from the index-based storage format
 * and migrates them to the simple array format.
 * 
 * Run with: node scripts/migrate-feedback-data.js
 */

// This script needs to run in the Cloudflare Workers environment
// Use wrangler dev console or create a temporary API endpoint

export async function migrateFeedbackData(env) {
    console.log('Starting feedback data migration...');
    
    try {
        // Step 1: List all feedback item keys
        const listResult = await env.NAUTILUS_DATA.list({ prefix: 'global:feedback:item:' });
        const itemKeys = listResult.keys.map(k => k.name);
        
        console.log(`Found ${itemKeys.length} feedback items to migrate`);
        
        if (itemKeys.length === 0) {
            console.log('No items to migrate');
            return { success: true, migrated: 0 };
        }
        
        // Step 2: Load all individual items
        const items = [];
        for (const key of itemKeys) {
            const raw = await env.NAUTILUS_DATA.get(key);
            if (raw) {
                try {
                    const item = JSON.parse(raw);
                    items.push(item);
                    console.log(`Loaded item ${item.id}: ${item.description?.substring(0, 50)}...`);
                } catch (e) {
                    console.error(`Failed to parse item ${key}:`, e);
                }
            }
        }
        
        console.log(`Successfully loaded ${items.length} items`);
        
        // Step 3: Check if there's existing data in the array format
        const existingRaw = await env.NAUTILUS_DATA.get('global:feedbackItems');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        console.log(`Found ${existing.length} items in array format`);
        
        // Step 4: Merge (avoid duplicates by ID)
        const existingIds = new Set(existing.map(item => item.id));
        const newItems = items.filter(item => !existingIds.has(item.id));
        
        console.log(`${newItems.length} new items to add`);
        
        // Step 5: Combine and sort by createdAt (newest first)
        const allItems = [...existing, ...newItems];
        allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Step 6: Save to array format
        await env.NAUTILUS_DATA.put('global:feedbackItems', JSON.stringify(allItems));
        console.log(`Saved ${allItems.length} total items to global:feedbackItems`);
        
        // Step 7: Also update the index for backward compatibility
        const index = allItems.map(item => item.id);
        await env.NAUTILUS_DATA.put('global:feedback:index', JSON.stringify(index));
        console.log(`Updated index with ${index.length} IDs`);
        
        return {
            success: true,
            migrated: newItems.length,
            total: allItems.length,
            existing: existing.length
        };
        
    } catch (error) {
        console.error('Migration failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// For use in a Cloudflare Pages Function
export async function onRequestGet(context) {
    const result = await migrateFeedbackData(context.env);
    
    return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}
