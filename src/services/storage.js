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
export async function loadAll() {
    try {
        const batch = await loadManyData(["tasks", "projects", "feedbackItems"]);
        const tasks = batch ? batch.tasks : await loadData("tasks");
        const projects = batch ? batch.projects : await loadData("projects");
        const feedbackItems = await loadFeedbackItemsFromIndex();

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

async function loadFeedbackItemsFromIndex() {
    try {
        const index = await loadFeedbackIndex();
        if (Array.isArray(index) && index.length > 0) {
            const items = await Promise.all(index.map((id) => loadFeedbackItem(id)));
            return items.filter(Boolean);
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
            return legacy;
        }
    } catch (error) {
        console.error("Error loading feedback items:", error);
    }
    return [];
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
