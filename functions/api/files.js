export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  try {
    if (!key) {
      return new Response("Missing key parameter", { status: 400 });
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
    return new Response("Error: " + (err.message || err.toString()), { status: 500 });
  }
}
