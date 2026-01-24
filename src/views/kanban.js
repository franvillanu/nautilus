/**
 * Kanban View Module
 * 
 * Pure computation functions for kanban board logic.
 * These functions handle task grouping, sorting, and date urgency calculations.
 * 
 * @module views/kanban
 */

import { PRIORITY_ORDER } from '../config/constants.js';
import { generateTaskCardHTML } from '../components/taskCard.js';

/**
 * Group tasks by status
 * @param {Array} tasks - Array of task objects
 * @param {boolean} [showBacklog=false] - Whether to include backlog tasks
 * @returns {Object} Tasks grouped by status
 */
export function groupTasksByStatus(tasks, showBacklog = false) {
    const byStatus = { backlog: [], todo: [], progress: [], review: [], done: [] };
    
    tasks.forEach(task => {
        // Exclude BACKLOG status unless showBacklog is enabled
        if (task.status === 'backlog' && !showBacklog) return;
        if (byStatus[task.status]) {
            byStatus[task.status].push(task);
        }
    });
    
    return byStatus;
}

/**
 * Sort tasks by priority (high to low)
 * @param {Array} tasks - Array of task objects
 * @returns {Array} Sorted tasks array
 */
export function sortTasksByPriority(tasks) {
    return [...tasks].sort((a, b) => {
        const priorityA = PRIORITY_ORDER[a.priority] || 0;
        const priorityB = PRIORITY_ORDER[b.priority] || 0;
        return priorityB - priorityA;
    });
}

/**
 * Sort tasks by manual order with priority fallback
 * @param {Array} tasks - Array of task objects
 * @param {Array} manualOrder - Array of task IDs in desired order
 * @returns {Array} Sorted tasks array
 */
export function sortTasksByManualOrder(tasks, manualOrder) {
    if (!manualOrder || manualOrder.length === 0) {
        return sortTasksByPriority(tasks);
    }
    
    const orderMap = new Map(manualOrder.map((id, idx) => [id, idx]));
    
    return [...tasks].sort((a, b) => {
        const oa = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
        const ob = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
        if (oa !== ob) return oa - ob;
        // Fallback to priority
        const pa = PRIORITY_ORDER[a.priority] || 0;
        const pb = PRIORITY_ORDER[b.priority] || 0;
        return pb - pa;
    });
}

/**
 * Sort grouped tasks by status
 * @param {Object} byStatus - Tasks grouped by status
 * @param {string} sortMode - 'manual' or 'priority'
 * @param {Object} [manualTaskOrder] - Manual order map by status
 * @returns {Object} Sorted tasks grouped by status
 */
export function sortGroupedTasks(byStatus, sortMode, manualTaskOrder = null) {
    const sorted = {};
    
    Object.keys(byStatus).forEach(status => {
        if (sortMode === 'manual' && manualTaskOrder && manualTaskOrder[status]) {
            sorted[status] = sortTasksByManualOrder(byStatus[status], manualTaskOrder[status]);
        } else {
            sorted[status] = sortTasksByPriority(byStatus[status]);
        }
    });
    
    return sorted;
}

/**
 * Calculate date urgency info for a task
 * @param {string|null} endDate - Task end date in ISO format
 * @param {string} status - Task status
 * @returns {Object} Urgency info with colors and styling
 */
/**
 * Get status counts from grouped tasks
 * @param {Object} byStatus - Tasks grouped by status
 * @returns {Object} Count for each status
 */
export function getStatusCounts(byStatus) {
    return {
        backlog: byStatus.backlog ? byStatus.backlog.length : 0,
        todo: byStatus.todo ? byStatus.todo.length : 0,
        progress: byStatus.progress ? byStatus.progress.length : 0,
        review: byStatus.review ? byStatus.review.length : 0,
        done: byStatus.done ? byStatus.done.length : 0
    };
}

/**
 * Filter tasks by updated time cutoff
 * @param {Array} tasks - Array of task objects
 * @param {number|null} cutoffTime - Cutoff timestamp (null = no filter)
 * @param {Function} getTaskUpdatedTime - Function to get task updated time
 * @returns {Array} Filtered tasks
 */
export function filterTasksByUpdatedTime(tasks, cutoffTime, getTaskUpdatedTime) {
    if (cutoffTime === null) {
        return tasks;
    }
    return tasks.filter(task => getTaskUpdatedTime(task) >= cutoffTime);
}

/**
 * Prepare kanban data for rendering
 * @param {Array} tasks - All tasks
 * @param {Object} options - Kanban options
 * @param {boolean} options.showBacklog - Show backlog column
 * @param {string} options.sortMode - 'manual' or 'priority'
 * @param {Object} options.manualTaskOrder - Manual order by status
 * @param {number|null} options.updatedCutoff - Updated time cutoff
 * @param {Function} options.getTaskUpdatedTime - Function to get task updated time
 * @returns {Object} Prepared kanban data
 */
export function prepareKanbanData(tasks, options = {}) {
    const {
        showBacklog = false,
        sortMode = 'priority',
        manualTaskOrder = null,
        updatedCutoff = null,
        getTaskUpdatedTime = null
    } = options;
    
    // Filter by updated time if cutoff provided
    let filteredTasks = tasks;
    if (updatedCutoff !== null && getTaskUpdatedTime) {
        filteredTasks = filterTasksByUpdatedTime(tasks, updatedCutoff, getTaskUpdatedTime);
    }
    
    // Group by status
    const byStatus = groupTasksByStatus(filteredTasks, showBacklog);
    
    // Sort each group
    const sorted = sortGroupedTasks(byStatus, sortMode, manualTaskOrder);
    
    // Get counts
    const counts = getStatusCounts(sorted);
    
    return {
        byStatus: sorted,
        counts,
        totalFiltered: filteredTasks.length,
        totalOriginal: tasks.length
    };
}

/**
 * Generate HTML for a single kanban task card
 * @param {Object} task - Task object
 * @param {Object} helpers - Helper functions and data
 * @param {Function} helpers.escapeHtml - HTML escape function
 * @param {Function} helpers.formatDate - Date format function
 * @param {Function} helpers.getProjectColor - Get project color function
 * @param {Function} helpers.getTagColor - Get tag color function
 * @param {Function} helpers.getPriorityLabel - Get priority label function
 * @param {Array} helpers.projects - Array of projects
 * @param {Set} helpers.selectedCards - Set of selected card IDs
 * @param {boolean} helpers.showProjects - Show projects on cards
 * @param {boolean} helpers.showNoDate - Show "No date" text
 * @param {string} helpers.noProjectText - Text for "No project"
 * @param {string} helpers.noDateText - Text for "No date"
 * @returns {string} HTML string for task card
 */
/**
 * Generate HTML for all task cards in a status column
 * @param {Array} tasks - Array of tasks for this status
 * @param {Object} helpers - Helper functions (same as generateTaskCardHTML)
 * @returns {string} HTML string for all task cards
 */
export function generateKanbanColumnHTML(tasks, helpers) {
    return tasks.map(task => generateTaskCardHTML(task, helpers)).join('');
}
