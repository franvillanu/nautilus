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
const DEBUG_LOG_LOCALSTORAGE_KEY = "debugLogsEnabled";

function isDebugLogsEnabled() {
    try {
        return localStorage.getItem(DEBUG_LOG_LOCALSTORAGE_KEY) === "true";
    } catch (e) {
        return false;
    }
}

function logFeedbackDebug(message, meta) {
    if (!isDebugLogsEnabled()) return;
    if (meta) {
        console.log(`[feedback-debug] ${message}`, meta);
    } else {
        console.log(`[feedback-debug] ${message}`);
    }
}
async function fetchWithTimeout(resource, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(resource, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

/**
 * Fetch with automatic retry on network errors (including QUIC protocol errors on slow networks)
 * @param {string} resource - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(resource, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fetchWithTimeout(resource, options, timeoutMs);
        } catch (error) {
            lastError = error;
            
            // Don't retry on abort (user-initiated or timeout)
            if (error.name === 'AbortError') {
                throw error;
            }
            
            // Retry on network errors (including QUIC protocol errors)
            if (attempt < maxRetries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
                // Exponential backoff: 500ms, 1000ms
                const delay = 500 * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            throw error;
        }
    }
    
    throw lastError;
}

export async function saveData(key, value) {
    try {
        const response = await fetchWithRetry(`/api/storage?key=${encodeURIComponent(key)}`, {
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

export async function deleteData(key) {
    try {
        const response = await fetchWithRetry(`/api/storage?key=${encodeURIComponent(key)}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.hash = '#login';
                throw new Error('Unauthorized - please login');
            }
            throw new Error(`Failed to delete data: ${response.status} ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error(`Error deleting data for key "${key}":`, error);
        throw error;
    }
}

export async function loadData(key) {
    try {
        const res = await fetchWithRetry(`/api/storage?key=${encodeURIComponent(key)}`, {
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
        const res = await fetchWithRetry(`/api/storage/batch?keys=${qs}`, {
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

export async function loadFeedbackIndex() {
    return loadData("feedback:index");
}

export async function saveFeedbackIndex(ids) {
    return saveData("feedback:index", ids);
}

export async function loadFeedbackItem(id) {
    return loadData(`feedback:item:${id}`);
}

export async function saveFeedbackItem(item) {
    return saveData(`feedback:item:${item.id}`, item);
}

export async function deleteFeedbackItem(id) {
    return deleteData(`feedback:item:${id}`);
}

export async function saveFeedbackDelta(delta) {
    try {
        const response = await fetchWithRetry(`/api/storage?key=feedbackItems&op=delta`, {
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

/**
 * Batch process multiple feedback operations in a single API call.
 * This significantly improves performance by reducing N API calls to 1.
 *
 * @param {Array} operations - Array of operations: [{action: 'add'|'update'|'delete', item?: object, id?: number}, ...]
 * @param {number} timeoutMs - Optional timeout in milliseconds (default: 20000)
 * @returns {Promise<object>} Response containing success status, processed count, and updated index
 */
export async function batchFeedbackOperations(operations, timeoutMs = DEFAULT_TIMEOUT_MS) {
    try {
        const debugEnabled = isDebugLogsEnabled();
        const requestId = `fb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const startedAt = (typeof performance !== "undefined" && performance.now)
            ? performance.now()
            : Date.now();
        let payloadBytes = null;
        if (debugEnabled) {
            try {
                payloadBytes = JSON.stringify({ operations }).length;
            } catch (e) {}
        }
        const headers = getAuthHeaders();
        if (debugEnabled) {
            headers["X-Debug-Logs"] = "1";
            headers["X-Request-Id"] = requestId;
            logFeedbackDebug("batch-feedback:request", {
                requestId,
                operationCount: Array.isArray(operations) ? operations.length : 0,
                payloadBytes,
                timeoutMs
            });
        }

        const response = await fetchWithRetry(`/api/batch-feedback`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ operations }),
        }, timeoutMs);

        if (!response.ok) {
            if (response.status === 401) {
                window.location.hash = '#login';
                throw new Error('Unauthorized - please login');
            }
            throw new Error(`Failed to batch process feedback: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (debugEnabled) {
            const endedAt = (typeof performance !== "undefined" && performance.now)
                ? performance.now()
                : Date.now();
            logFeedbackDebug("batch-feedback:response", {
                requestId,
                durationMs: Math.round(endedAt - startedAt),
                success: data && data.success,
                processed: data && data.processed,
                total: data && data.total
            });
        }
        return data;
    } catch (error) {
        console.error('Error batch processing feedback:', error);
        throw error;
    }
}
