import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

/**
 * D1-based Feedback API
 * 
 * Fast, scalable feedback storage using Cloudflare D1 SQL database
 * 
 * Endpoints:
 * - GET /api/feedback-d1?page=1&limit=10&status=open
 * - POST /api/feedback-d1 (create)
 * - PUT /api/feedback-d1/:id (update)
 * - DELETE /api/feedback-d1/:id (delete)
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
        
        // Check if D1 is available
        if (!env.FEEDBACK_DB) {
            return new Response(JSON.stringify({ 
                error: "D1 database not configured",
                hint: "Add FEEDBACK_DB binding to wrangler.toml"
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const method = request.method;
        
        // GET - List feedback items with pagination
        if (method === 'GET') {
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const status = url.searchParams.get('status'); // 'open', 'done', or null for all
            const offset = (page - 1) * limit;
            
            // Always filter by the authenticated user — feedback is private per user.
            let query = 'SELECT * FROM feedback_items WHERE created_by = ?';
            let countQuery = 'SELECT COUNT(*) as total FROM feedback_items WHERE created_by = ?';
            const params = [payload.userId];
            const countParams = [payload.userId];

            if (status) {
                query += ' AND status = ?';
                countQuery += ' AND status = ?';
                params.push(status);
                countParams.push(status);
            }
            
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            // Execute queries in parallel
            const [itemsResult, countResult] = await Promise.all([
                env.FEEDBACK_DB.prepare(query).bind(...params).all(),
                env.FEEDBACK_DB.prepare(countQuery).bind(...countParams).first()
            ]);
            
            const total = countResult?.total || 0;
            const totalPages = Math.ceil(total / limit);
            
            return new Response(JSON.stringify({
                success: true,
                items: itemsResult.results || [],
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasMore: page < totalPages
                }
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // POST - Create or update feedback item (UPSERT)
        if (method === 'POST') {
            const body = await request.json();
            
            if (!body.id || !body.type || !body.description) {
                return new Response(JSON.stringify({ 
                    error: "Missing required fields: id, type, description" 
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            const stringId = String(body.id);
            
            // Use INSERT OR REPLACE to handle duplicates (UPSERT)
            const query = `
                INSERT OR REPLACE INTO feedback_items (id, type, description, status, screenshot_url, created_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            await env.FEEDBACK_DB.prepare(query).bind(
                stringId, // Convert to string to match TEXT column type
                body.type,
                body.description,
                body.status || 'open',
                body.screenshotUrl || null,
                body.createdAt || new Date().toISOString(),
                payload.userId
            ).run();
            
            return new Response(JSON.stringify({
                success: true,
                id: body.id
            }), {
                status: 201,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // PUT - Update feedback item
        if (method === 'PUT') {
            const body = await request.json();
            
            if (!body.id) {
                return new Response(JSON.stringify({ 
                    error: "Missing required field: id" 
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            // Build dynamic update query
            const updates = [];
            const params = [];
            
            if (body.type) {
                updates.push('type = ?');
                params.push(body.type);
            }
            if (body.description) {
                updates.push('description = ?');
                params.push(body.description);
            }
            if (body.status) {
                updates.push('status = ?');
                params.push(body.status);
                if (body.status === 'done' && !body.resolvedAt) {
                    updates.push('resolved_at = ?');
                    params.push(new Date().toISOString());
                } else if (body.status === 'open') {
                    // Clear resolved_at when un-marking so the item has clean state
                    updates.push('resolved_at = ?');
                    params.push(null);
                }
            }
            if (body.screenshotUrl !== undefined) {
                updates.push('screenshot_url = ?');
                params.push(body.screenshotUrl);
            }
            if (body.resolvedAt) {
                updates.push('resolved_at = ?');
                params.push(body.resolvedAt);
            }
            
            if (updates.length === 0) {
                return new Response(JSON.stringify({ 
                    error: "No fields to update" 
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            // Scope update to the authenticated user so one user cannot edit another's items.
            params.push(String(body.id), payload.userId);

            const query = `UPDATE feedback_items SET ${updates.join(', ')} WHERE id = ? AND created_by = ?`;
            const result = await env.FEEDBACK_DB.prepare(query).bind(...params).run();
            
            if (result.meta.changes === 0) {
                return new Response(JSON.stringify({ 
                    error: "Feedback item not found" 
                }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            return new Response(JSON.stringify({
                success: true,
                id: body.id
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // DELETE - Delete feedback item
        if (method === 'DELETE') {
            const body = await request.json();
            
            if (!body.id) {
                return new Response(JSON.stringify({ 
                    error: "Missing required field: id" 
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            // Scope delete to the authenticated user so one user cannot delete another's items.
            const query = 'DELETE FROM feedback_items WHERE id = ? AND created_by = ?';
            const result = await env.FEEDBACK_DB.prepare(query).bind(String(body.id), payload.userId).run();
            
            if (result.meta.changes === 0) {
                return new Response(JSON.stringify({ 
                    error: "Feedback item not found" 
                }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" }
                });
            }
            
            return new Response(JSON.stringify({
                success: true,
                id: body.id
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
        console.error('Feedback D1 API error:', err);
        return new Response(JSON.stringify({
            error: "Server error",
            message: err.message || err.toString()
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
