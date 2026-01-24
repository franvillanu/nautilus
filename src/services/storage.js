/**
 * Storage Service
 * Wraps storage-client.js with higher-level helper functions
 * Provides convenient methods for common storage operations
 */

import {
    loadData,
    saveData,
    loadManyData,
    loadFeedbackIndex,
    saveFeedbackIndex,
    loadFeedbackItem,
    saveFeedbackItem
} from "../../storage-client.js?v=20260116-feedback-exports";

/**
 * Save all main application data (tasks, projects, feedback)
 * @param {Array} tasks - Tasks array
 * @param {Array} projects - Projects array
 * @param {Array} feedbackItems - Feedback items array
 * @returns {Promise<void>}
 */
export async function saveAll(tasks, projects, feedbackItems) {
    try {
        await Promise.all([
            saveData("tasks", tasks),
            saveData("projects", projects),
            saveFeedbackItems(feedbackItems)
        ]);
    } catch (error) {
        console.error("Error saving all data:", error);
        throw error;
    }
}

/**
 * Save tasks to storage
 * @param {Array} tasks - Tasks array
 * @returns {Promise<void>}
 */
export async function saveTasks(tasks) {
    try {
        await saveData("tasks", tasks);
    } catch (error) {
        console.error("Error saving tasks:", error);
        throw error;
    }
}

/**
 * Save projects to storage
 * @param {Array} projects - Projects array
 * @returns {Promise<void>}
 */
export async function saveProjects(projects) {
    try {
        await saveData("projects", projects);
    } catch (error) {
        console.error("Error saving projects:", error);
        throw error;
    }
}

/**
 * Save feedback items to storage
 * @param {Array} feedbackItems - Feedback items array
 * @returns {Promise<void>}
 */
export async function saveFeedbackItems(feedbackItems) {
    try {
        const items = Array.isArray(feedbackItems) ? feedbackItems : [];
        const ids = items.map((item) => item && item.id).filter((id) => id != null);
        await Promise.all(items.map((item) => saveFeedbackItem(item)));
        await saveFeedbackIndex(ids);
    } catch (error) {
        console.error("Error saving feedback items:", error);
        throw error;
    }
}

/**
 * Save project colors map to storage
 * @param {Object} projectColorMap - Project colors map
 * @returns {Promise<void>}
 */
export async function saveProjectColors(projectColorMap) {
    try {
        await saveData("projectColors", projectColorMap);
    } catch (error) {
        console.error("Error saving project colors:", error);
        throw error;
    }
}

/**
 * Save sort mode and manual task order
 * @param {string} sortMode - Sort mode ('priority' or 'manual')
 * @param {Object} manualTaskOrder - Manual task order map
 * @returns {Promise<void>}
 */
export async function saveSortState(sortMode, manualTaskOrder) {
    try {
        await Promise.all([
            saveData('sortMode', sortMode),
            saveData('manualTaskOrder', manualTaskOrder)
        ]);
    } catch (error) {
        console.error("Error saving sort state:", error);
        throw error;
    }
}

/**
 * Load all main application data
 * @returns {Promise<{tasks: Array, projects: Array, feedbackItems: Array}>}
 */
export async function loadAll(options = {}) {
    try {
        const batch = await loadManyData(["tasks", "projects", "feedbackItems"]);

        // Load all data in parallel to avoid waterfall
        const [tasks, projects, feedbackItems] = await Promise.all([
            batch ? Promise.resolve(batch.tasks) : loadData("tasks"),
            batch ? Promise.resolve(batch.projects) : loadData("projects"),
            loadFeedbackItemsFromIndex(options.feedback || {})
        ]);

        return {
            tasks: tasks || [],
            projects: projects || [],
            feedbackItems: feedbackItems || []
        };
    } catch (error) {
        console.error("Error loading all data:", error);
        return {
            tasks: [],
            projects: [],
            feedbackItems: []
        };
    }
}

const FEEDBACK_CACHE_KEY = "feedbackItemsCache:v1";

function loadFeedbackCache(cacheKey) {
    const key = cacheKey || FEEDBACK_CACHE_KEY;
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function persistFeedbackCache(cacheKey, items) {
    const key = cacheKey || FEEDBACK_CACHE_KEY;
    try {
        localStorage.setItem(key, JSON.stringify(items || []));
    } catch (e) {}
}

function mergeFeedbackItems(baseItems, updates) {
    const base = Array.isArray(baseItems) ? baseItems : [];
    const incoming = Array.isArray(updates) ? updates : [];
    if (base.length === 0) return incoming.filter(Boolean);

    const baseIds = new Set();
    const mergedBase = [];
    const updateMap = new Map();

    for (const item of incoming) {
        if (item && item.id != null) {
            updateMap.set(item.id, item);
        }
    }

    for (const item of base) {
        if (!item || item.id == null) continue;
        baseIds.add(item.id);
        mergedBase.push(updateMap.get(item.id) || item);
    }

    const newItems = [];
    for (const item of incoming) {
        if (item && item.id != null && !baseIds.has(item.id)) {
            newItems.push(item);
        }
    }

    return [...newItems, ...mergedBase];
}

async function loadFeedbackItemsByStatus(index, limitPending, limitDone) {
    const pendingLimit = Number.isInteger(limitPending) ? limitPending : null;
    const doneLimit = Number.isInteger(limitDone) ? limitDone : null;
    const items = [];
    let pendingCount = 0;
    let doneCount = 0;

    for (const id of index) {
        if (pendingLimit !== null && doneLimit !== null && pendingCount >= pendingLimit && doneCount >= doneLimit) {
            break;
        }
        const item = await loadFeedbackItem(id);
        if (!item) continue;
        const status = item.status === 'done' ? 'done' : 'open';
        if (status === 'done') {
            if (doneLimit !== null && doneCount >= doneLimit) continue;
            doneCount++;
        } else {
            if (pendingLimit !== null && pendingCount >= pendingLimit) continue;
            pendingCount++;
        }
        items.push(item);
    }

    return items;
}

async function refreshFeedbackItemsFromIndex(options) {
    const limitPending = options.limitPending;
    const limitDone = options.limitDone;
    const cacheKey = options.cacheKey || FEEDBACK_CACHE_KEY;
    const cached = Array.isArray(options.cached) ? options.cached : [];
    const onRefresh = typeof options.onRefresh === 'function' ? options.onRefresh : null;

    try {
        const index = await loadFeedbackIndex();
        if (Array.isArray(index) && index.length > 0) {
            let items = [];
            if (Number.isInteger(limitPending) || Number.isInteger(limitDone)) {
                items = await loadFeedbackItemsByStatus(index, limitPending, limitDone);
            } else {
                items = await Promise.all(index.map((id) => loadFeedbackItem(id)));
            }
            const merged = mergeFeedbackItems(cached, items.filter(Boolean));
            persistFeedbackCache(cacheKey, merged);
            if (onRefresh) onRefresh(merged);
        }
    } catch (error) {
        console.error("Error refreshing feedback items:", error);
    }
}

async function loadFeedbackItemsFromIndex(options = {}) {
    let cached = [];
    try {
        const limitPending = options.limitPending;
        const limitDone = options.limitDone;
        const cacheKey = options.cacheKey || FEEDBACK_CACHE_KEY;
        cached = options.useCache === false ? [] : loadFeedbackCache(cacheKey);
        const preferCache = !!(options.preferCache && cached.length > 0);
        if (preferCache) {
            void refreshFeedbackItemsFromIndex({ limitPending, limitDone, cacheKey, cached, onRefresh: options.onRefresh });
            return cached;
        }
        const index = await loadFeedbackIndex();
        if (Array.isArray(index) && index.length > 0) {
            let items = [];
            if (Number.isInteger(limitPending) || Number.isInteger(limitDone)) {
                items = await loadFeedbackItemsByStatus(index, limitPending, limitDone);
            } else {
                items = await Promise.all(index.map((id) => loadFeedbackItem(id)));
            }
            const merged = mergeFeedbackItems(cached, items.filter(Boolean));
            persistFeedbackCache(cacheKey, merged);
            return merged;
        }

        const legacy = await loadData("feedbackItems");
        if (Array.isArray(legacy) && legacy.length > 0) {
            try {
                const ids = legacy.map((item) => item && item.id).filter((id) => id != null);
                await Promise.all(legacy.map((item) => saveFeedbackItem(item)));
                await saveFeedbackIndex(ids);
            } catch (e) {
                console.error("Error migrating legacy feedback items:", e);
            }
            persistFeedbackCache(cacheKey, legacy);
            return legacy;
        }
    } catch (error) {
        console.error("Error loading feedback items:", error);
    }
    return cached || [];
}

/**
 * Load sort mode and manual task order
 * @returns {Promise<{sortMode: string, manualTaskOrder: Object}>}
 */
export async function loadSortState() {
    try {
        const [sortMode, manualTaskOrder] = await Promise.all([
            loadData('sortMode'),
            loadData('manualTaskOrder')
        ]);

        return {
            // Back-compat: older versions used 'auto' to mean priority ordering
            sortMode: (sortMode === 'auto' || !sortMode) ? 'priority' : sortMode,
            manualTaskOrder: manualTaskOrder || { todo: [], progress: [], review: [], done: [] }
        };
    } catch (error) {
        console.error("Error loading sort state:", error);
        return {
            sortMode: 'priority',
            manualTaskOrder: { todo: [], progress: [], review: [], done: [] }
        };
    }
}

/**
 * Load project colors map
 * @returns {Promise<Object>}
 */
export async function loadProjectColors() {
    try {
        const colors = await loadData("projectColors");
        return colors || {};
    } catch (error) {
        console.error("Error loading project colors:", error);
        return {};
    }
}

/**
 * Save application settings (per user) to storage
 * @param {Object} settings - Settings object
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
    try {
        await saveData("settings", settings);
    } catch (error) {
        console.error("Error saving settings:", error);
        throw error;
    }
}

/**
 * Load application settings (per user) from storage
 * @returns {Promise<Object>}
 */
export async function loadSettings() {
    try {
        const loaded = await loadData("settings");
        return loaded || {};
    } catch (error) {
        console.error("Error loading settings:", error);
        return {};
    }
}
