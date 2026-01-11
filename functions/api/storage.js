import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const op = url.searchParams.get("op");

  try {
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    if (!key) {
      return new Response("Missing key parameter", { status: 400 });
    }

    // Verify authentication
    const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
    if (!payload || !payload.userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Scope key by userId for most data, but use a shared
    // global key for feedback so all users see the same items.
    const scopedKey =
      key === "feedbackItems" || key.startsWith("feedback:")
        ? `global:${key}`
        : `user:${payload.userId}:${key}`;

    if (request.method === "GET") {
      const value = await env.NAUTILUS_DATA.get(scopedKey);
      return new Response(value || "null", {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      const body = await request.json();

      if (key === "feedbackItems" && op === "delta") {
        const existingRaw = await env.NAUTILUS_DATA.get(scopedKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const list = Array.isArray(existing) ? existing : [];
        const action = body && body.action;

        if (action === "add" && body.item) {
          const exists = list.some((f) => f && f.id === body.item.id);
          if (!exists) list.unshift(body.item);
        } else if (action === "update" && body.item && body.item.id != null) {
          const idx = list.findIndex((f) => f && f.id === body.item.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...body.item };
          }
        } else if (action === "delete" && body.id != null) {
          const idToDelete = body.id;
          const filtered = list.filter((f) => !f || f.id !== idToDelete);
          await env.NAUTILUS_DATA.put(scopedKey, JSON.stringify(filtered));
          return new Response("ok", { status: 200 });
        }

        await env.NAUTILUS_DATA.put(scopedKey, JSON.stringify(list));
        return new Response("ok", { status: 200 });
      }

      await env.NAUTILUS_DATA.put(scopedKey, JSON.stringify(body));
      return new Response("ok", { status: 200 });
    }

    if (request.method === "DELETE") {
      await env.NAUTILUS_DATA.delete(scopedKey);
      return new Response("ok", { status: 200 });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return new Response("Error: " + (err.message || err.toString()), { status: 500 });
  }
}
