// netlify/edge-functions/blobs.js
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("nautilus-data");
  await store.set("foo", "bar");
  const value = await store.get("foo");
  return new Response(JSON.stringify({ value }), {
    headers: { "content-type": "application/json" },
  });
};
