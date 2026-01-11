import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

/**
 * Batch Feedback API Endpoint
 *
 * Processes multiple feedback operations (add/update/delete) in a single request.
 * This reduces API calls from N to 1, significantly improving performance.
 *
 * Expected request body:
 * {
 *   operations: [
 *     { action: 'add', item: { id: 1, type: 'bug', description: '...', ... } },
 *     { action: 'update', item: { id: 2, status: 'done', ... } },
 *     { action: 'delete', id: 3 }
 *   ]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   processed: 3,
 *   index: [1, 2, 4, 5]
 * }
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
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json();
    const operations = body.operations || [];

    if (!Array.isArray(operations) || operations.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid operations array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Load current feedback index
    const indexKey = "global:feedback:index";
    const indexRaw = await env.NAUTILUS_DATA.get(indexKey);
    let feedbackIndex = indexRaw ? JSON.parse(indexRaw) : [];

    // Process all operations
    let processed = 0;
    const errors = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      try {
        if (op.action === "add" && op.item) {
          // Save individual item
          const itemKey = `global:feedback:item:${op.item.id}`;
          await env.NAUTILUS_DATA.put(itemKey, JSON.stringify(op.item));

          // Add to index if not exists (newest first)
          if (!feedbackIndex.includes(op.item.id)) {
            feedbackIndex.unshift(op.item.id);
          }

          processed++;
        } else if (op.action === "update" && op.item && op.item.id != null) {
          // Update individual item
          const itemKey = `global:feedback:item:${op.item.id}`;
          const existingRaw = await env.NAUTILUS_DATA.get(itemKey);

          if (existingRaw) {
            const existing = JSON.parse(existingRaw);
            const updated = { ...existing, ...op.item };
            await env.NAUTILUS_DATA.put(itemKey, JSON.stringify(updated));
            processed++;
          } else {
            // Item doesn't exist, treat as add
            await env.NAUTILUS_DATA.put(itemKey, JSON.stringify(op.item));
            if (!feedbackIndex.includes(op.item.id)) {
              feedbackIndex.unshift(op.item.id);
            }
            processed++;
          }
        } else if (op.action === "delete" && op.id != null) {
          // Delete individual item
          const itemKey = `global:feedback:item:${op.id}`;
          await env.NAUTILUS_DATA.delete(itemKey);

          // Remove from index
          feedbackIndex = feedbackIndex.filter(id => id !== op.id);

          processed++;
        } else {
          errors.push({ index: i, error: "Invalid operation", operation: op });
        }
      } catch (err) {
        errors.push({ index: i, error: err.message, operation: op });
      }
    }

    // Save updated index
    await env.NAUTILUS_DATA.put(indexKey, JSON.stringify(feedbackIndex));

    const response = {
      success: errors.length === 0,
      processed: processed,
      total: operations.length,
      index: feedbackIndex
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Server error",
      message: err.message || err.toString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
