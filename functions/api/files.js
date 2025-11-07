export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  try {
    if (!key) {
      return new Response("Missing key parameter", { status: 400 });
    }

    // Check if KV namespace is available
    if (!env.NAUTILUS_FILES) {
      console.error("NAUTILUS_FILES KV namespace is not bound. Check wrangler.toml configuration and deployment.");
      return new Response(JSON.stringify({
        error: "Storage not configured",
        message: "NAUTILUS_FILES KV namespace is not available. Please ensure the KV namespace is created and bound in Cloudflare Workers settings.",
        troubleshooting: "Check wrangler.toml has the correct KV namespace ID and that it's deployed to Cloudflare."
      }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method === "GET") {
      // Retrieve file from NAUTILUS_FILES KV
      const value = await env.NAUTILUS_FILES.get(key);
      if (!value) {
        return new Response("File not found", { status: 404 });
      }
      return new Response(value, {
        headers: { "Content-Type": "text/plain" }
      });
    }

    if (request.method === "POST") {
      // Store file in NAUTILUS_FILES KV
      const body = await request.text();
      await env.NAUTILUS_FILES.put(key, body);
      return new Response("ok", { status: 200 });
    }

    if (request.method === "DELETE") {
      // Delete file from NAUTILUS_FILES KV
      await env.NAUTILUS_FILES.delete(key);
      return new Response("ok", { status: 200 });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    console.error("Error in files API:", err);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: err.message || err.toString(),
      details: "Check Cloudflare Workers logs for more information"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
