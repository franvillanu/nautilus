import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

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
      key === "feedbackItems"
        ? "global:feedbackItems"
        : `user:${payload.userId}:${key}`;

    if (request.method === "GET") {
      const value = await env.NAUTILUS_DATA.get(scopedKey);
      return new Response(value || "null", {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      const body = await request.json();
      await env.NAUTILUS_DATA.put(scopedKey, JSON.stringify(body));
      return new Response("ok", { status: 200 });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return new Response("Error: " + (err.message || err.toString()), { status: 500 });
  }
}
