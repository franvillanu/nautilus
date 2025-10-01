// blobs.js (frontend helper)
export async function saveData(key, value) {
    try {
        await fetch(`/.netlify/functions/blobs?id=${key}`, {
            method: "PUT",
            body: JSON.stringify(value),
        });
    } catch (err) {
        console.error("Error saving data:", err);
    }
}

export async function loadData(key) {
    try {
        const res = await fetch(`/.netlify/functions/blobs?id=${key}`);
        if (!res.ok) throw new Error(`Load failed: ${res.status}`);
        const text = await res.text();
        if (!text) return []; // default empty
        const parsed = JSON.parse(text);

        // Force return type: if array expected, return []; otherwise object
        if (key === "projects" || key === "tasks") {
            return Array.isArray(parsed) ? parsed : [];
        } else if (key === "projectCounter" || key === "taskCounter") {
            return typeof parsed === "number" ? parsed : 1;
        } else {
            return parsed;
        }
    } catch (err) {
        console.error("Error loading data:", err);
        if (key === "projects" || key === "tasks") return [];
        if (key === "projectCounter" || key === "taskCounter") return 1;
        return null;
    }
}
