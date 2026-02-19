import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

/**
 * Feedback Screenshot Storage API
 * 
 * Stores screenshots in KV separately from feedback items
 * to avoid D1 size limits (SQLite TOOBIG error)
 * 
 * Endpoints:
 * - POST /api/feedback-screenshot (upload screenshot, returns ID)
 * - GET /api/feedback-screenshot/:id (retrieve screenshot)
 * - DELETE /api/feedback-screenshot/:id (delete screenshot)
 */
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
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
        
        const method = request.method;
        
        // POST - Upload screenshot
        if (method === 'POST') {
            const body = await request.json();
            
            if (!body.data || !body.feedbackId) {
                return new Response(JSON.stringify({ 
                    error: "Missing required fields: data, feedbackId" 
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            // Generate unique screenshot ID
            const screenshotId = `screenshot:${payload.userId}:${body.feedbackId}:${Date.now()}`;
            
            // Store in KV (supports up to 25MB per value)
            await env.FEEDBACK_SCREENSHOTS.put(screenshotId, body.data);
            
            return new Response(JSON.stringify({
                success: true,
                screenshotId: screenshotId
            }), {
                status: 201,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // GET - Retrieve screenshot
        if (method === 'GET') {
            const screenshotId = url.searchParams.get('id');
            
            if (!screenshotId) {
                return new Response(JSON.stringify({ 
                    error: "Missing screenshot ID parameter" 
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            const data = await env.FEEDBACK_SCREENSHOTS.get(screenshotId);
            
            if (!data) {
                return new Response(JSON.stringify({ 
                    error: "Screenshot not found" 
                }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            return new Response(JSON.stringify({
                success: true,
                data: data
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // DELETE - Delete screenshot
        if (method === 'DELETE') {
            const body = await request.json();
            
            if (!body.screenshotId) {
                return new Response(JSON.stringify({ 
                    error: "Missing required field: screenshotId" 
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            await env.FEEDBACK_SCREENSHOTS.delete(body.screenshotId);
            
            return new Response(JSON.stringify({
                success: true
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (err) {
        console.error('Feedback screenshot API error:', err);
        return new Response(JSON.stringify({
            error: "Server error",
            message: err.message || err.toString()
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
