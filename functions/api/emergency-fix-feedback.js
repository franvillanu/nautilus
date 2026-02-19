import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

/**
 * Emergency fix for feedback storage size issue
 * 
 * Problem: Single array with base64 screenshots exceeded 25MB KV limit
 * Solution: Store items individually + maintain index (like before commit 86f5dab)
 */
export async function onRequest(context) {
    const { request, env } = context;
    
    try {
        const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);
        
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload || !payload.userId) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        if (request.method !== "POST") {
            return new Response(JSON.stringify({ error: "Use POST" }), {
                status: 405,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        console.log('🚨 Emergency fix: Migrating to index-based storage...');
        
        // Step 1: Get all items from index format
        const indexListResult = await env.NAUTILUS_DATA.list({ prefix: 'global:feedback:item:' });
        const itemKeys = indexListResult.keys.map(k => k.name);
        
        console.log(`Found ${itemKeys.length} items in index format`);
        
        const allItems = [];
        for (const key of itemKeys) {
            try {
                const raw = await env.NAUTILUS_DATA.get(key);
                if (raw) {
                    const item = JSON.parse(raw);
                    allItems.push(item);
                }
            } catch (e) {
                console.error(`Failed to load ${key}:`, e);
            }
        }
        
        // Step 2: Get items from localStorage cache (sent by client)
        const body = await request.json();
        const cachedItems = body.cachedItems || [];
        
        console.log(`Received ${cachedItems.length} items from client cache`);
        
        // Step 3: Merge (avoid duplicates)
        const itemsById = new Map();
        
        // Add index items first
        allItems.forEach(item => {
            if (item && item.id) {
                itemsById.set(item.id, item);
            }
        });
        
        // Add/update with cached items (newer data)
        cachedItems.forEach(item => {
            if (item && item.id) {
                itemsById.set(item.id, item);
            }
        });
        
        const mergedItems = Array.from(itemsById.values());
        mergedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log(`Total unique items: ${mergedItems.length}`);
        
        // Step 4: Save each item individually
        let saved = 0;
        const errors = [];
        
        for (const item of mergedItems) {
            try {
                const itemKey = `global:feedback:item:${item.id}`;
                await env.NAUTILUS_DATA.put(itemKey, JSON.stringify(item));
                saved++;
            } catch (e) {
                errors.push({ id: item.id, error: e.message });
                console.error(`Failed to save item ${item.id}:`, e);
            }
        }
        
        // Step 5: Update index
        const index = mergedItems.map(item => item.id);
        await env.NAUTILUS_DATA.put('global:feedback:index', JSON.stringify(index));
        
        // Step 6: Create a lightweight array (without screenshots) for backward compatibility
        const lightweightItems = mergedItems.map(item => ({
            ...item,
            screenshotUrl: item.screenshotUrl ? '[stored separately]' : ''
        }));
        
        try {
            await env.NAUTILUS_DATA.put('global:feedbackItems', JSON.stringify(lightweightItems));
            console.log('✅ Saved lightweight array for backward compatibility');
        } catch (e) {
            console.warn('⚠️  Could not save lightweight array:', e.message);
        }
        
        const result = {
            success: true,
            message: 'Emergency fix applied',
            stats: {
                foundInIndex: allItems.length,
                receivedFromCache: cachedItems.length,
                totalMerged: mergedItems.length,
                savedIndividually: saved,
                errors: errors.length
            },
            errors: errors.length > 0 ? errors : undefined
        };
        
        console.log('✅ Emergency fix complete:', result);
        
        return new Response(JSON.stringify(result, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (err) {
        console.error('💥 Emergency fix failed:', err);
        return new Response(JSON.stringify({
            success: false,
            error: err.message || err.toString()
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
