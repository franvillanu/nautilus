// /netlify/edge-functions/blobs.js
import { getStore } from "@netlify/blobs";

export default async (request) => {
  const store = getStore("nautilus-data"); // all your app data stored here
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const method = request.method;

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (method === "GET") {
      const data = await store.get(id, { type: "json" });
      return new Response(JSON.stringify(data || {}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "PUT") {
      const body = await request.json();
      await store.set(id, JSON.stringify(body));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
