// /blobs.js
const API_URL = "/.netlify/functions/blobs";

export async function saveData(key, value) {
  try {
    const res = await fetch(`${API_URL}?id=${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error saving data:", err);
    return null;
  }
}

export async function loadData(key) {
  try {
    const res = await fetch(`${API_URL}?id=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error(`Load failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error loading data:", err);
    return null;
  }
}
