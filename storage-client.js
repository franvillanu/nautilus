// storage-client.js
export async function saveData(key, value) {
    try {
        const response = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(value),
        });

        if (!response.ok) {
            throw new Error(`Failed to save data: ${response.status} ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error(`Error saving data for key "${key}":`, error);
        throw error;
    }
}

export async function loadData(key) {
    try {
        const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);

        if (!res.ok) {
            if (res.status === 404) {
                return null; // Key doesn't exist yet
            }
            throw new Error(`Failed to load data: ${res.status} ${res.statusText}`);
        }

        const text = await res.text();
        return text && text !== "null" ? JSON.parse(text) : null;
    } catch (error) {
        console.error(`Error loading data for key "${key}":`, error);
        // Return null on error to allow app to continue with empty state
        return null;
    }
}
