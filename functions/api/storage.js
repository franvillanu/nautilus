export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  try {
    if (!key) {
      return new Response("Missing key parameter", { status: 400 });
    }

    if (request.method === "GET") {
      const value = await env.NAUTILUS_DATA.get(key);
      return new Response(value || "null", {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      const body = await request.json();
      await env.NAUTILUS_DATA.put(key, JSON.stringify(body));
      return new Response("ok", { status: 200 });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return new Response("Error: " + (err.message || err.toString()), { status: 500 });
  }
}
