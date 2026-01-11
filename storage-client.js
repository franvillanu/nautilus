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

const DEFAULT_TIMEOUT_MS = 20000;

async function fetchWithTimeout(resource, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(resource, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

export async function saveData(key, value) {
    try {
        const response = await fetchWithTimeout(`/api/storage?key=${encodeURIComponent(key)}`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(value),
        });

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
        console.error(`Error saving data for key "${key}":`, error);
        throw error;
    }
}

export async function loadData(key) {
    try {
        const res = await fetchWithTimeout(`/api/storage?key=${encodeURIComponent(key)}`, {
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

export async function loadManyData(keys) {
    try {
        const list = Array.isArray(keys) ? keys : [];
        const qs = encodeURIComponent(list.join(','));
        const res = await fetchWithTimeout(`/api/storage/batch?keys=${qs}`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            if (res.status === 401) {
                window.location.hash = '#login';
                return null;
            }
            return null;
        }

        const data = await res.json();
        return (data && typeof data === 'object') ? data : null;
    } catch (error) {
        console.error('Error batch loading data:', error);
        return null;
    }
}

export async function saveFeedbackDelta(delta) {
    try {
        const response = await fetchWithTimeout(`/api/storage?key=feedbackItems&op=delta`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(delta),
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.hash = '#login';
                throw new Error('Unauthorized - please login');
            }
            throw new Error(`Failed to save feedback delta: ${response.status} ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error('Error saving feedback delta:', error);
        throw error;
    }
}
