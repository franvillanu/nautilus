import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

/**
 * One-time migration endpoint to recover feedback data
 * 
 * This endpoint reads all feedback items from the index-based storage
 * and migrates them to the simple array format.
 * 
 * DELETE THIS FILE after migration is complete!
 */
export async function onRequest(context) {
    const { request, env } = context;
    
    try {
        const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);
        
        // Verify authentication
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload || !payload.userId) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        if (request.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed. Use POST to run migration." }), {
                status: 405,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        console.log('🔄 Starting feedback data migration...');
        
        // Step 1: List all feedback item keys
        const listResult = await env.NAUTILUS_DATA.list({ prefix: 'global:feedback:item:' });
        const itemKeys = listResult.keys.map(k => k.name);
        
        console.log(`📦 Found ${itemKeys.length} feedback items in index format`);
        
        if (itemKeys.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No items to migrate',
                migrated: 0
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // Step 2: Load all individual items
        const items = [];
        const errors = [];
        
        for (const key of itemKeys) {
            try {
                const raw = await env.NAUTILUS_DATA.get(key);
                if (raw) {
                    const item = JSON.parse(raw);
                    items.push(item);
                }
            } catch (e) {
                errors.push({ key, error: e.message });
                console.error(`❌ Failed to load ${key}:`, e);
            }
        }
        
        console.log(`✅ Successfully loaded ${items.length} items`);
        
        // Step 3: Check existing data in array format
        const existingRaw = await env.NAUTILUS_DATA.get('global:feedbackItems');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        console.log(`📋 Found ${existing.length} items already in array format`);
        
        // Step 4: Merge (avoid duplicates by ID)
        const existingIds = new Set(existing.map(item => item && item.id).filter(Boolean));
        const newItems = items.filter(item => item && item.id && !existingIds.has(item.id));
        
        console.log(`🆕 ${newItems.length} new items to add`);
        
        // Step 5: Combine and sort by createdAt (newest first)
        const allItems = [...existing, ...newItems];
        allItems.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });
        
        // Step 6: Save to array format
        await env.NAUTILUS_DATA.put('global:feedbackItems', JSON.stringify(allItems));
        console.log(`💾 Saved ${allItems.length} total items to global:feedbackItems`);
        
        // Step 7: Also update the index for backward compatibility
        const index = allItems.map(item => item.id);
        await env.NAUTILUS_DATA.put('global:feedback:index', JSON.stringify(index));
        console.log(`📇 Updated index with ${index.length} IDs`);
        
        const result = {
            success: true,
            message: 'Migration completed successfully',
            stats: {
                foundInIndexFormat: itemKeys.length,
                loadedSuccessfully: items.length,
                existingInArrayFormat: existing.length,
                newItemsMigrated: newItems.length,
                totalAfterMigration: allItems.length,
                errors: errors.length
            },
            errors: errors.length > 0 ? errors : undefined
        };
        
        console.log('✨ Migration complete:', result);
        
        return new Response(JSON.stringify(result, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (err) {
        console.error('💥 Migration failed:', err);
        return new Response(JSON.stringify({
            success: false,
            error: err.message || err.toString()
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
