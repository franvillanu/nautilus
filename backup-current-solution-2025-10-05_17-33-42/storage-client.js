// storage-client.js
export async function saveData(key, value) {
    await fetch(`/api/storage?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
    });
}

export async function loadData(key) {
    const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const text = await res.text();
    return text && text !== "null" ? JSON.parse(text) : null;
}
