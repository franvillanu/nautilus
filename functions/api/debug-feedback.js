import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

/**
 * Debug endpoint to inspect all feedback-related keys in KV store
 * This will help us find where the recent data is stored
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
        
        console.log('🔍 Starting feedback data inspection...');
        
        const results = {
            timestamp: new Date().toISOString(),
            keys: {},
            summary: {}
        };
        
        // Check all possible feedback keys
        const keysToCheck = [
            'global:feedbackItems',
            'global:feedback:index',
            'feedbackItems',
            'feedback:index'
        ];
        
        for (const key of keysToCheck) {
            try {
                const raw = await env.NAUTILUS_DATA.get(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    results.keys[key] = {
                        exists: true,
                        type: Array.isArray(parsed) ? 'array' : typeof parsed,
                        length: Array.isArray(parsed) ? parsed.length : null,
                        sample: Array.isArray(parsed) && parsed.length > 0 
                            ? parsed.slice(0, 3).map(item => ({
                                id: item?.id,
                                type: item?.type,
                                description: item?.description?.substring(0, 50),
                                createdAt: item?.createdAt,
                                status: item?.status
                            }))
                            : null
                    };
                } else {
                    results.keys[key] = { exists: false };
                }
            } catch (e) {
                results.keys[key] = { exists: false, error: e.message };
            }
        }
        
        // List all keys with feedback prefix
        console.log('📋 Listing all feedback-related keys...');
        
        const prefixes = ['global:feedback', 'feedback'];
        for (const prefix of prefixes) {
            try {
                const listResult = await env.NAUTILUS_DATA.list({ prefix: prefix });
                results.summary[prefix] = {
                    count: listResult.keys.length,
                    keys: listResult.keys.map(k => k.name).slice(0, 20) // First 20 keys
                };
            } catch (e) {
                results.summary[prefix] = { error: e.message };
            }
        }
        
        // Get a few sample items from index format
        if (results.summary['global:feedback']?.keys) {
            const itemKeys = results.summary['global:feedback'].keys
                .filter(k => k.startsWith('global:feedback:item:'))
                .slice(0, 5);
            
            results.sampleItems = [];
            for (const key of itemKeys) {
                try {
                    const raw = await env.NAUTILUS_DATA.get(key);
                    if (raw) {
                        const item = JSON.parse(raw);
                        results.sampleItems.push({
                            key: key,
                            id: item.id,
                            type: item.type,
                            description: item.description?.substring(0, 100),
                            createdAt: item.createdAt,
                            status: item.status
                        });
                    }
                } catch (e) {
                    results.sampleItems.push({ key: key, error: e.message });
                }
            }
        }
        
        console.log('✅ Inspection complete');
        
        return new Response(JSON.stringify(results, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (err) {
        console.error('💥 Inspection failed:', err);
        return new Response(JSON.stringify({
            error: err.message || err.toString()
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
