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
  const debugEnabled = request.headers.get("x-debug-logs") === "1";
  const requestId = request.headers.get("x-request-id") || `fb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const startedAt = Date.now();
  const logDebug = (message, meta) => {
    if (!debugEnabled) return;
    if (meta) {
      console.log(`[feedback-debug] ${message}`, { requestId, ...meta });
    } else {
      console.log(`[feedback-debug] ${message}`, { requestId });
    }
  };

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

    if (debugEnabled) {
      const summary = {
        total: operations.length,
        add: 0,
        update: 0,
        delete: 0,
        maxScreenshotChars: 0,
        totalScreenshotChars: 0
      };
      for (const op of operations) {
        if (!op || !op.action) continue;
        if (op.action === "add") summary.add++;
        if (op.action === "update") summary.update++;
        if (op.action === "delete") summary.delete++;
        if (op.item && typeof op.item.screenshotUrl === "string") {
          const len = op.item.screenshotUrl.length;
          summary.totalScreenshotChars += len;
          if (len > summary.maxScreenshotChars) summary.maxScreenshotChars = len;
        }
      }
      logDebug("batch-feedback:start", {
        contentLength: request.headers.get("content-length"),
        operationCount: operations.length,
        summary
      });
    }

    // Load current feedback index
    const indexKey = "global:feedback:index";
    const indexLoadStartedAt = Date.now();
    const indexRaw = await env.NAUTILUS_DATA.get(indexKey);
    let feedbackIndex = indexRaw ? JSON.parse(indexRaw) : [];
    logDebug("batch-feedback:index-loaded", {
      durationMs: Date.now() - indexLoadStartedAt,
      indexSize: Array.isArray(feedbackIndex) ? feedbackIndex.length : 0
    });

    // Process all operations
    let processed = 0;
    const errors = [];

    const opsStartedAt = Date.now();
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
        logDebug("batch-feedback:op-error", {
          index: i,
          action: op && op.action,
          id: op && (op.id || (op.item && op.item.id)),
          error: err.message || String(err)
        });
      }
    }
    logDebug("batch-feedback:ops-complete", {
      durationMs: Date.now() - opsStartedAt,
      processed,
      errors: errors.length
    });

    // Save updated index
    const indexSaveStartedAt = Date.now();
    await env.NAUTILUS_DATA.put(indexKey, JSON.stringify(feedbackIndex));
    logDebug("batch-feedback:index-saved", {
      durationMs: Date.now() - indexSaveStartedAt,
      indexSize: Array.isArray(feedbackIndex) ? feedbackIndex.length : 0
    });

    const response = {
      success: errors.length === 0,
      processed: processed,
      total: operations.length,
      index: feedbackIndex
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    logDebug("batch-feedback:done", {
      totalDurationMs: Date.now() - startedAt,
      success: response.success,
      processed: response.processed,
      total: response.total,
      errors: errors.length
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    logDebug("batch-feedback:exception", {
      totalDurationMs: Date.now() - startedAt,
      error: err.message || err.toString()
    });
    return new Response(JSON.stringify({
      error: "Server error",
      message: err.message || err.toString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
