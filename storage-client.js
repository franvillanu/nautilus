// storage-client.js

/**
 * Gets the auth token from localStorage
 * @returns {string|null} Auth token or null
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Gets auth headers for API requests
 * @returns {object} Headers object
 */
function getAuthHeaders() {
    const token = getAuthToken();
    const headers = { "Content-Type": "application/json" };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}

export async function saveData(key, value) {
    console.time(`⏱️ saveData [${key}] - network request`);
    const startTime = performance.now();
    try {
        const response = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(value),
        });
        const endTime = performance.now();
        console.timeEnd(`⏱️ saveData [${key}] - network request`);
        console.log(`📊 saveData [${key}] took ${(endTime - startTime).toFixed(2)}ms`);

        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized - redirect to login
                window.location.hash = '#login';
                throw new Error('Unauthorized - please login');
            }
            throw new Error(`Failed to save data: ${response.status} ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.timeEnd(`⏱️ saveData [${key}] - network request`);
        console.error(`Error saving data for key "${key}":`, error);
        throw error;
    }
}

export async function loadData(key) {
    try {
        const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            if (res.status === 401) {
                // Unauthorized - redirect to login
                window.location.hash = '#login';
                return null;
            }
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
