// historyService.js - Historical changes tracking service
// Tracks all changes to tasks and projects with full change history

let history = [];
let historyCounter = 1;

/**
 * Data structure for history entry:
 * {
 *     id: number,
 *     entityType: 'task' | 'project',
 *     entityId: number,
 *     entityTitle: string,
 *     action: 'created' | 'updated' | 'deleted',
 *     changes: { field: { before: value, after: value } },
 *     timestamp: string (ISO),
 *     date: string (YYYY-MM-DD for grouping)
 * }
 */

/**
 * Record a history entry
 * @param {string} entityType - 'task' or 'project'
 * @param {number} entityId - ID of the entity
 * @param {string} entityTitle - Title/name for display
 * @param {string} action - 'created', 'updated', or 'deleted'
 * @param {Object} changes - Object with field changes { field: { before, after } }
 */
function recordHistory(entityType, entityId, entityTitle, action, changes = {}) {
    const now = new Date();
    const entry = {
        id: historyCounter++,
        entityType,
        entityId,
        entityTitle,
        action,
        changes,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0]
    };

    history.unshift(entry); // Add to beginning (newest first)
    saveHistory();
    return entry;
}

/**
 * Record task creation
 */
function recordTaskCreated(task) {
    return recordHistory('task', task.id, task.title, 'created', {
        title: { before: null, after: task.title },
        status: { before: null, after: task.status },
        priority: { before: null, after: task.priority }
    });
}

/**
 * Record task update with field changes
 */
function recordTaskUpdated(oldTask, newTask) {
    const changes = {};
    const fieldsToTrack = [
        'title', 'description', 'status', 'priority', 'category',
        'startDate', 'endDate', 'projectId', 'tags', 'attachments'
    ];

    fieldsToTrack.forEach(field => {
        const oldValue = oldTask[field];
        const newValue = newTask[field];

        // Deep comparison for arrays and objects
        const isDifferent = JSON.stringify(oldValue) !== JSON.stringify(newValue);

        if (isDifferent) {
            changes[field] = {
                before: oldValue,
                after: newValue
            };
        }
    });

    // Only record if there are actual changes
    if (Object.keys(changes).length > 0) {
        return recordHistory('task', newTask.id, newTask.title, 'updated', changes);
    }
    return null;
}

/**
 * Record task deletion
 */
function recordTaskDeleted(task) {
    return recordHistory('task', task.id, task.title, 'deleted', {
        title: { before: task.title, after: null },
        status: { before: task.status, after: null }
    });
}

/**
 * Record project creation
 */
function recordProjectCreated(project) {
    return recordHistory('project', project.id, project.name, 'created', {
        name: { before: null, after: project.name },
        startDate: { before: null, after: project.startDate },
        endDate: { before: null, after: project.endDate }
    });
}

/**
 * Record project update
 */
function recordProjectUpdated(oldProject, newProject) {
    const changes = {};
    const fieldsToTrack = ['name', 'description', 'startDate', 'endDate'];

    fieldsToTrack.forEach(field => {
        if (oldProject[field] !== newProject[field]) {
            changes[field] = {
                before: oldProject[field],
                after: newProject[field]
            };
        }
    });

    if (Object.keys(changes).length > 0) {
        return recordHistory('project', newProject.id, newProject.name, 'updated', changes);
    }
    return null;
}

/**
 * Record project deletion
 */
function recordProjectDeleted(project) {
    return recordHistory('project', project.id, project.name, 'deleted', {
        name: { before: project.name, after: null }
    });
}

/**
 * Get all history entries
 */
function getHistory() {
    return [...history];
}

/**
 * Get history entries for a specific entity
 */
function getEntityHistory(entityType, entityId) {
    return history.filter(entry =>
        entry.entityType === entityType && entry.entityId === entityId
    );
}

/**
 * Get history entries grouped by date
 */
function getHistoryByDate() {
    const grouped = {};

    history.forEach(entry => {
        if (!grouped[entry.date]) {
            grouped[entry.date] = [];
        }
        grouped[entry.date].push(entry);
    });

    return grouped;
}

/**
 * Filter history by criteria
 */
function filterHistory(filters = {}) {
    let filtered = [...history];

    // Filter by entity type
    if (filters.entityType) {
        filtered = filtered.filter(entry => entry.entityType === filters.entityType);
    }

    // Filter by action
    if (filters.action) {
        filtered = filtered.filter(entry => entry.action === filters.action);
    }

    // Filter by date range
    if (filters.dateFrom) {
        filtered = filtered.filter(entry => entry.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
        filtered = filtered.filter(entry => entry.date <= filters.dateTo);
    }

    // Filter by search text
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(entry =>
            entry.entityTitle.toLowerCase().includes(searchLower)
        );
    }

    return filtered;
}

/**
 * Save history to storage
 */
async function saveHistory() {
    if (typeof window !== 'undefined' && window.saveData) {
        await window.saveData('history', history);
    }
}

/**
 * Load history from storage
 */
async function loadHistory() {
    if (typeof window !== 'undefined' && window.loadData) {
        const data = await window.loadData('history');
        if (data && Array.isArray(data)) {
            history = data;

            // Recalculate counter
            if (history.length > 0) {
                historyCounter = Math.max(...history.map(h => h.id)) + 1;
            }
        }
    }
    return history;
}

/**
 * Clear all history (use with caution)
 */
async function clearHistory() {
    history = [];
    historyCounter = 1;
    await saveHistory();
}

/**
 * Get statistics about history
 */
function getHistoryStats() {
    const stats = {
        total: history.length,
        byType: {
            task: history.filter(h => h.entityType === 'task').length,
            project: history.filter(h => h.entityType === 'project').length
        },
        byAction: {
            created: history.filter(h => h.action === 'created').length,
            updated: history.filter(h => h.action === 'updated').length,
            deleted: history.filter(h => h.action === 'deleted').length
        },
        recentCount: history.filter(h => {
            const dayAgo = new Date();
            dayAgo.setDate(dayAgo.getDate() - 1);
            return new Date(h.timestamp) > dayAgo;
        }).length
    };

    return stats;
}

// Export functions for use in app.js
if (typeof window !== 'undefined') {
    // Browser environment - attach to window
    window.historyService = {
        recordHistory,
        recordTaskCreated,
        recordTaskUpdated,
        recordTaskDeleted,
        recordProjectCreated,
        recordProjectUpdated,
        recordProjectDeleted,
        getHistory,
        getEntityHistory,
        getHistoryByDate,
        filterHistory,
        saveHistory,
        loadHistory,
        clearHistory,
        getHistoryStats
    };
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        recordHistory,
        recordTaskCreated,
        recordTaskUpdated,
        recordTaskDeleted,
        recordProjectCreated,
        recordProjectUpdated,
        recordProjectDeleted,
        getHistory,
        getEntityHistory,
        getHistoryByDate,
        filterHistory,
        saveHistory,
        loadHistory,
        clearHistory,
        getHistoryStats
    };
}
