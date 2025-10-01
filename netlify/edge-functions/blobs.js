// /netlify/edge-functions/blobs.js
import { getStore } from "@netlify/blobs";

export default async (request, context) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const store = getStore("nautilus-data");

  if (request.method === "GET") {
    try {
      const value = await store.get(id);
      return new Response(value || "{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(`Load failed: ${err.message}`, { status: 500 });
    }
  }

  if (request.method === "PUT") {
    try {
      const body = await request.text();
      await store.set(id, body);
      return new Response("OK", { status: 200 });
    } catch (err) {
      return new Response(`Save failed: ${err.message}`, { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
