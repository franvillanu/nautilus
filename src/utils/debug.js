/**
 * Debug and logging utilities
 * Provides conditional debug logging with timing support
 * No dependencies
 */

const DEBUG_LOG_LOCALSTORAGE_KEY = "debugLogsEnabled";
const debugTimers = new Map();

/**
 * Apply debug log setting and persist to localStorage
 * @param {boolean} enabled - Whether debug logs should be enabled
 */
export function applyDebugLogSetting(enabled) {
    const next = !!enabled;
    window.debugLogsEnabled = next;
    try {
        localStorage.setItem(DEBUG_LOG_LOCALSTORAGE_KEY, String(next));
    } catch (e) {
        // localStorage may be unavailable
    }
}

/**
 * Check if debug logs are enabled
 * @returns {boolean} True if debug logging is enabled
 */
export function isDebugLogsEnabled() {
    if (typeof window.debugLogsEnabled === "boolean") return window.debugLogsEnabled;
    try {
        return localStorage.getItem(DEBUG_LOG_LOCALSTORAGE_KEY) === "true";
    } catch (e) {
        return false;
    }
}

/**
 * Log a debug message with optional metadata
 * @param {string} scope - The logging scope/category
 * @param {string} message - The message to log
 * @param {Object} [meta] - Optional metadata object
 */
export function logDebug(scope, message, meta) {
    if (!isDebugLogsEnabled()) return;
    if (meta) {
        console.log(`[debug:${scope}] ${message}`, meta);
    } else {
        console.log(`[debug:${scope}] ${message}`);
    }
}

/**
 * Start a debug timer for performance measurement
 * @param {string} scope - The logging scope/category
 * @param {string} label - Timer label
 * @param {Object} [meta] - Optional metadata object
 * @returns {string|undefined} Timer key for use with debugTimeEnd
 */
export function debugTimeStart(scope, label, meta) {
    if (!isDebugLogsEnabled()) return;
    const key = `${scope}:${label}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    debugTimers.set(key, (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now());
    logDebug(scope, `${label}:start`, meta);
    return key;
}

/**
 * End a debug timer and log the duration
 * @param {string} scope - The logging scope/category
 * @param {string} key - Timer key from debugTimeStart
 * @param {Object} [meta] - Optional metadata object
 */
export function debugTimeEnd(scope, key, meta) {
    if (!isDebugLogsEnabled()) return;
    const startedAt = debugTimers.get(key);
    if (startedAt == null) return;
    debugTimers.delete(key);
    const endedAt = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    logDebug(scope, "duration", { durationMs: Math.round(endedAt - startedAt), ...meta });
}
