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
} from "../../storage-client.js";

/**
 * Save all main application data (tasks, projects, feedback)
 * @param {Array} tasks - Tasks array
 * @param {Array} projects - Projects array
 * @param {Array} feedbackItems - Feedback items array
 * @returns {Promise<void>}
 */
export async function saveAll(tasks, projects, feedbackItems) {
    const previousTasksCache = loadArrayCache(TASKS_CACHE_KEY);
    const previousProjectsCache = loadArrayCache(PROJECTS_CACHE_KEY);
    if (Array.isArray(tasks)) persistArrayCache(TASKS_CACHE_KEY, tasks);
    if (Array.isArray(projects)) persistArrayCache(PROJECTS_CACHE_KEY, projects);

    try {
        await Promise.all([
            saveData("tasks", tasks),
            saveData("projects", projects),
            saveFeedbackItems(feedbackItems)
        ]);
    } catch (error) {
        // Rollback cache on network failure
        persistArrayCache(TASKS_CACHE_KEY, previousTasksCache);
        persistArrayCache(PROJECTS_CACHE_KEY, previousProjectsCache);
        console.error("Error saving all data:", error);
        throw error;
    }
}

/**
 * Save tasks to storage (cache-first for optimistic UI)
 * @param {Array} tasks - Tasks array
 * @returns {Promise<void>}
 */
export async function saveTasks(tasks) {
    // Cache-first: update localStorage immediately for instant refresh persistence
    const previousCache = loadArrayCache(TASKS_CACHE_KEY);
    if (Array.isArray(tasks)) persistArrayCache(TASKS_CACHE_KEY, tasks);

    try {
        await saveData("tasks", tasks);
    } catch (error) {
        // Rollback cache on network failure
        persistArrayCache(TASKS_CACHE_KEY, previousCache);
        const msg = error?.message ?? String(error);
        const stack = error?.stack;
        console.error("[Storage Service] saveTasks failed:", msg);
        if (stack) console.error("[Storage Service] Stack:", stack);
        throw error;
    }
}

/**
 * Save projects to storage (cache-first for optimistic UI)
 * @param {Array} projects - Projects array
 * @returns {Promise<void>}
 */
export async function saveProjects(projects) {
    // Cache-first: update localStorage immediately for instant refresh persistence
    const previousCache = loadArrayCache(PROJECTS_CACHE_KEY);
    if (Array.isArray(projects)) persistArrayCache(PROJECTS_CACHE_KEY, projects);

    try {
        await saveData("projects", projects);
    } catch (error) {
        // Rollback cache on network failure
        persistArrayCache(PROJECTS_CACHE_KEY, previousCache);
        console.error("Error saving projects:", error);
        throw error;
    }
}

/**
 * Save feedback items to storage (cache-first for optimistic UI)
 * @param {Array} feedbackItems - Feedback items array
 * @returns {Promise<void>}
 */
export async function saveFeedbackItems(feedbackItems) {
    const items = Array.isArray(feedbackItems) ? feedbackItems : [];

    // Cache-first: update localStorage immediately for instant refresh persistence
    const previousCache = loadFeedbackCache(FEEDBACK_CACHE_KEY);
    persistFeedbackCache(FEEDBACK_CACHE_KEY, items);

    try {
        // Use D1 API for each item
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) {
            throw new Error('Not authenticated');
        }

        // Save each item to D1
        await Promise.all(items.map(async (item) => {
            const response = await fetch('/api/feedback-d1', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save item ${item.id}: ${response.status}`);
            }
        }));
    } catch (error) {
        // Rollback cache on network failure
        persistFeedbackCache(FEEDBACK_CACHE_KEY, previousCache);
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
 * Save project templates to storage
 * @param {Array} templates - Templates array
 * @returns {Promise<void>}
 */
export async function saveTemplates(templates) {
    try {
        await saveData("templates", templates);
    } catch (error) {
        console.error("Error saving templates:", error);
        throw error;
    }
}

/**
 * Load project templates from storage
 * @returns {Promise<Array>}
 */
export async function loadTemplates() {
    try {
        const data = await loadData("templates");
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error loading templates:", error);
        return [];
    }
}

/**
 * Load all main application data
 * @returns {Promise<{tasks: Array, projects: Array, feedbackItems: Array}>}
 */
export async function loadAll(options = {}) {
    const preferCache = !!options.preferCache;
    const feedbackOptions = options.feedback || {};

    try {
        const cachedTasks = preferCache ? loadArrayCache(TASKS_CACHE_KEY) : [];
        const cachedProjects = preferCache ? loadArrayCache(PROJECTS_CACHE_KEY) : [];
        const feedbackPreferCache = feedbackOptions.preferCache ?? preferCache;
        const cachedFeedback = await loadFeedbackItemsFromIndex({
            ...feedbackOptions,
            preferCache: feedbackPreferCache
        });

        const hasCached = (cachedTasks && cachedTasks.length > 0) || (cachedProjects && cachedProjects.length > 0);
        if (preferCache && hasCached) {
            const onRefresh = typeof options.onRefresh === "function" ? options.onRefresh : null;
            const refreshOptions = {
                ...options,
                preferCache: false,
                feedback: { ...feedbackOptions, preferCache: false }
            };
            void loadAllNetwork(refreshOptions).then((fresh) => {
                if (onRefresh) onRefresh(fresh);
            });
            return {
                tasks: cachedTasks || [],
                projects: cachedProjects || [],
                feedbackItems: cachedFeedback || []
            };
        }

        return await loadAllNetwork({
            ...options,
            feedback: { ...feedbackOptions, preferCache: feedbackPreferCache }
        });
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
const TASKS_CACHE_KEY = "tasksCache:v1";
const PROJECTS_CACHE_KEY = "projectsCache:v1";
const CACHE_TOKEN_KEY = "nautilus_cache_token:v1";

function getScopedCacheKey(baseKey, tokenOverride) {
    try {
        const token = tokenOverride ?? localStorage.getItem("authToken");
        return token ? `${baseKey}:${token}` : baseKey;
    } catch (e) {
        return baseKey;
    }
}

function loadArrayCache(baseKey) {
    try {
        const token = localStorage.getItem("authToken");
        const scopedKey = getScopedCacheKey(baseKey, token);
        const raw = localStorage.getItem(scopedKey);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;

        // Do NOT migrate "previous" cache: that was another user's data. Returning it
        // on login-as-different-user caused 1–3s of wrong dashboard before network refresh.
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function persistArrayCache(baseKey, items) {
    try {
        const token = localStorage.getItem("authToken");
        localStorage.setItem(getScopedCacheKey(baseKey, token), JSON.stringify(items || []));
        if (token) {
            localStorage.setItem(CACHE_TOKEN_KEY, token);
        }
    } catch (e) {}
}

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

function applyFeedbackLimits(items, options) {
    const limitPending = options.limitPending;
    const limitDone = options.limitDone;
    if (!Array.isArray(items)) return items;
    if (!Number.isInteger(limitPending) && !Number.isInteger(limitDone)) return items;

    const pending = [];
    const done = [];
    for (const item of items) {
        if (!item) continue;
        const status = item.status === 'done' ? 'done' : 'open';
        if (status === 'done') done.push(item);
        else pending.push(item);
    }
    const limitedPending = Number.isInteger(limitPending) ? pending.slice(0, limitPending) : pending;
    const limitedDone = Number.isInteger(limitDone) ? done.slice(0, limitDone) : done;
    return [...limitedPending, ...limitedDone];
}

async function loadAllNetwork(options = {}) {
    const feedbackOptions = options.feedback || {};
    const batch = await loadManyData(["tasks", "projects", "feedbackItems"]);

    // Validate batch data: use only if arrays, otherwise fall back to per-key load.
    // Bug fix: Previously only feedbackItems was validated; tasks/projects could return corrupted data.
    const tasksFromBatch = batch && Array.isArray(batch.tasks) ? batch.tasks : null;
    const projectsFromBatch = batch && Array.isArray(batch.projects) ? batch.projects : null;
    // Feedback is now stored in D1, NOT KV. Always load from D1 via loadFeedbackItemsFromIndex.
    // Ignoring batch.feedbackItems entirely to avoid serving stale/empty KV data.

    const tasksPromise = tasksFromBatch !== null ? Promise.resolve(tasksFromBatch) : loadData("tasks");
    const projectsPromise = projectsFromBatch !== null ? Promise.resolve(projectsFromBatch) : loadData("projects");

    // Always load feedback from D1 (feedback migrated out of KV).
    const feedbackPromise = loadFeedbackItemsFromIndex(feedbackOptions);

    const [tasks, projects, feedbackItems] = await Promise.all([
        tasksPromise,
        projectsPromise,
        feedbackPromise
    ]);

    // Normalize to arrays (handle corrupted loadData responses)
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeProjects = Array.isArray(projects) ? projects : [];
    const safeFeedback = Array.isArray(feedbackItems) ? feedbackItems : [];

    persistArrayCache(TASKS_CACHE_KEY, safeTasks);
    persistArrayCache(PROJECTS_CACHE_KEY, safeProjects);
    const cacheKey = feedbackOptions.cacheKey || FEEDBACK_CACHE_KEY;
    persistFeedbackCache(cacheKey, safeFeedback);

    return {
        tasks: safeTasks,
        projects: safeProjects,
        feedbackItems: safeFeedback
    };
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

    // PERFORMANCE FIX: Load all items in PARALLEL first, then filter by status
    // Old approach: sequential for loop with await (SLOW!)
    // New approach: Promise.all + filter (FAST!)
    const allItems = await Promise.all(index.map((id) => loadFeedbackItem(id)));

    const pending = [];
    const done = [];

    // Separate items by status
    for (const item of allItems) {
        if (!item) continue;
        const status = item.status === 'done' ? 'done' : 'open';
        if (status === 'done') {
            done.push(item);
        } else {
            pending.push(item);
        }
    }

    // Apply limits
    const limitedPending = pendingLimit !== null ? pending.slice(0, pendingLimit) : pending;
    const limitedDone = doneLimit !== null ? done.slice(0, doneLimit) : done;

    return [...limitedPending, ...limitedDone];
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
    // Load from D1 database
    let cached = [];
    try {
        const cacheKey = options.cacheKey || FEEDBACK_CACHE_KEY;
        cached = options.useCache === false ? [] : loadFeedbackCache(cacheKey);
        const preferCache = !!(options.preferCache && cached.length > 0);
        
        if (preferCache) {
            // Return cached immediately for instant UI
            // Refresh in background — D1 is authoritative, update cache even if empty
            void loadFeedbackFromD1().then((items) => {
                if (Array.isArray(items)) {
                    persistFeedbackCache(cacheKey, items);
                    if (typeof options.onRefresh === "function") {
                        options.onRefresh({ feedbackItems: items });
                    }
                }
            }).catch(() => {});
            return cached;
        }

        // Load from D1
        const items = await loadFeedbackFromD1();
        if (Array.isArray(items)) {
            persistFeedbackCache(cacheKey, items);
            return items;
        }

        // Fallback to cache only on network error (items === [] is valid: D1 is authoritative)
        return cached || [];
    } catch (error) {
        console.error("Error loading feedback items:", error);
        return cached || [];
    }
}

async function loadFeedbackFromD1() {
    try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) {
            return [];
        }

        // Load all items from D1 (paginated, but get all for now)
        const response = await fetch('/api/feedback-d1?limit=1000', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success || !Array.isArray(data.items)) return [];
        // Normalize D1 snake_case columns to camelCase expected by the app
        return data.items.map(row => ({
            id: row.id,
            type: row.type,
            description: row.description,
            status: row.status,
            screenshotUrl: row.screenshot_url || row.screenshotUrl || '',
            createdAt: row.created_at || row.createdAt || '',
            createdBy: row.created_by || row.createdBy || '',
            resolvedAt: row.resolved_at || row.resolvedAt || null,
        }));
    } catch (error) {
        console.error("Error loading from D1:", error);
        return [];
    }
}

/**
 * Save a single feedback item to D1
 * @param {Object} item - Feedback item to save
 * @returns {Promise<void>}
 */
export async function saveSingleFeedbackItem(item) {
    try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('/api/feedback-d1', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save item ${item.id}: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error("Error saving single feedback item:", error);
        throw error;
    }
}

/**
 * Update a single feedback item in D1
 * @param {Object} item - Feedback item to update
 * @returns {Promise<void>}
 */
export async function updateSingleFeedbackItem(item) {
    try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('/api/feedback-d1', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update item ${item.id}: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error("Error updating single feedback item:", error);
        throw error;
    }
}

/**
 * Delete a single feedback item from D1
 * @param {number} itemId - ID of feedback item to delete
 * @returns {Promise<void>}
 */
export async function deleteSingleFeedbackItem(itemId) {
    try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('/api/feedback-d1', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: itemId })
        });
        
        if (!response.ok) {
            // 404 = item doesn't exist in D1 (legacy KV item or already deleted) — treat as success
            if (response.status === 404) {
                return;
            }
            const errorText = await response.text();
            throw new Error(`Failed to delete item ${itemId}: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error("Error deleting single feedback item:", error);
        throw error;
    }
}

async function loadFeedbackFromIndex() {
    try {
        // Load index first (small, fast)
        const index = await loadData("feedback:index");
        if (!Array.isArray(index) || index.length === 0) {
            return [];
        }
        
        // Load all items in parallel (FAST!)
        const items = await Promise.all(
            index.map(id => loadData(`feedback:item:${id}`))
        );
        
        // Filter out nulls and return
        return items.filter(Boolean);
    } catch (error) {
        console.error("Error loading from index:", error);
        return [];
    }
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
