import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

/**
 * One-time migration endpoint: KV → D1
 * 
 * Migrates all feedback items from KV storage to D1 database
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
        
        if (!env.FEEDBACK_DB) {
            return new Response(JSON.stringify({ 
                error: "D1 database not configured" 
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        console.log('🚀 Starting KV → D1 migration...');
        
        // Step 1: Get all items from KV index format
        const indexListResult = await env.NAUTILUS_DATA.list({ prefix: 'global:feedback:item:' });
        const itemKeys = indexListResult.keys.map(k => k.name);
        
        console.log(`Found ${itemKeys.length} items in KV`);
        
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
        
        console.log(`Loaded ${allItems.length} items from KV`);
        
        // Step 2: Insert into D1 (batch insert for speed)
        let migrated = 0;
        const errors = [];
        
        for (const item of allItems) {
            try {
                const query = `
                    INSERT OR REPLACE INTO feedback_items 
                    (id, type, description, status, screenshot_url, created_at, resolved_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                
                await env.FEEDBACK_DB.prepare(query).bind(
                    item.id,
                    item.type || 'bug',
                    item.description || '',
                    item.status || 'open',
                    item.screenshotUrl || null,
                    item.createdAt || new Date().toISOString(),
                    item.resolvedAt || null
                ).run();
                
                migrated++;
            } catch (e) {
                errors.push({ id: item.id, error: e.message });
                console.error(`Failed to migrate item ${item.id}:`, e);
            }
        }
        
        console.log(`✅ Migrated ${migrated} items to D1`);
        
        const result = {
            success: true,
            message: 'Migration complete',
            stats: {
                foundInKV: itemKeys.length,
                loaded: allItems.length,
                migrated: migrated,
                errors: errors.length
            },
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined
        };
        
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
