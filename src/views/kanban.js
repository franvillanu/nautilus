/**
 * Kanban View Module
 * 
 * Pure computation functions for kanban board logic.
 * These functions handle task grouping, sorting, and date urgency calculations.
 * 
 * @module views/kanban
 */

import { PRIORITY_ORDER } from '../config/constants.js';

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
export function calculateDateUrgency(endDate, status) {
    if (!endDate) {
        return {
            hasDate: false,
            urgency: 'none',
            bgColor: null,
            textColor: 'var(--text-muted)',
            borderColor: null,
            icon: '',
            iconColor: ''
        };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(endDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Completed tasks: no urgency styling
    if (status === 'done') {
        return {
            hasDate: true,
            urgency: 'completed',
            diffDays,
            bgColor: 'rgba(148, 163, 184, 0.12)',
            textColor: '#94a3b8',
            borderColor: 'rgba(148, 163, 184, 0.25)',
            icon: '',
            iconColor: ''
        };
    }
    
    // Overdue - orange/yellow warning
    if (diffDays < 0) {
        return {
            hasDate: true,
            urgency: 'overdue',
            diffDays,
            bgColor: 'rgba(249, 115, 22, 0.2)',
            textColor: '#fb923c',
            borderColor: 'rgba(249, 115, 22, 0.4)',
            icon: '⚠ ',
            iconColor: '#f97316'
        };
    }
    
    // Within 1 week - purple/violet
    if (diffDays <= 7) {
        return {
            hasDate: true,
            urgency: 'soon',
            diffDays,
            bgColor: 'rgba(192, 132, 252, 0.25)',
            textColor: '#c084fc',
            borderColor: 'rgba(192, 132, 252, 0.5)',
            icon: '',
            iconColor: ''
        };
    }
    
    // Normal - blue glassmorphic
    return {
        hasDate: true,
        urgency: 'normal',
        diffDays,
        bgColor: 'rgba(59, 130, 246, 0.15)',
        textColor: '#93c5fd',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        icon: '',
        iconColor: ''
    };
}

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
export function generateTaskCardHTML(task, helpers) {
    const {
        escapeHtml,
        formatDate,
        getProjectColor,
        getTagColor,
        getPriorityLabel,
        projects,
        selectedCards,
        showProjects = true,
        showNoDate = true,
        noProjectText,
        noDateText
    } = helpers;

    const proj = projects.find(p => p.id === task.projectId);
    const projName = proj ? proj.name : noProjectText;
    const dueText = task.endDate ? formatDate(task.endDate) : noDateText;

    // Calculate date urgency
    const urgency = calculateDateUrgency(task.endDate, task.status);
    let dueHTML;
    if (urgency.hasDate) {
        const { bgColor, textColor, borderColor, icon, iconColor } = urgency;
        dueHTML = `<span style="
            background: ${bgColor};
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            color: ${textColor};
            border: 1px solid ${borderColor};
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            text-decoration: none;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        ">${icon ? `<span style="color: ${iconColor};">${icon}</span>` : ''}${escapeHtml(dueText)}</span>`;
    } else {
        dueHTML = showNoDate
            ? `<span style="color: var(--text-muted); font-size: 12px;">${dueText}</span>`
            : '';
    }

    const isSelected = selectedCards && selectedCards.has(task.id);
    const selectedClass = isSelected ? ' selected' : '';

    const projectIndicator = proj
        ? `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(proj.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`
        : '';

    const tagsAndDateHTML = `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 12px;">
        ${task.tags && task.tags.length > 0 ? task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join('') : ''}
        <span style="margin-left: auto;">${dueHTML}</span>
    </div>`;

    return `
        <div class="task-card${selectedClass}" draggable="true" data-task-id="${task.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div class="task-title" style="flex: 1;">${projectIndicator}${escapeHtml(task.title || "")}</div>
                <div class="task-priority priority-${task.priority}" style="flex-shrink: 0;">${getPriorityLabel(task.priority || "").toUpperCase()}</div>
            </div>
            ${showProjects ? `
            <div style="margin-top:8px; font-size:12px;">
                ${proj ?
                    `<span style="background-color: ${getProjectColor(proj.id)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(proj.name)}">${escapeHtml(proj.name)}</span>` :
                    `<span style="color: var(--text-muted);">${noProjectText}</span>`
                }
            </div>
            ` : ''}
            ${tagsAndDateHTML}
        </div>
    `;
}

/**
 * Generate HTML for all task cards in a status column
 * @param {Array} tasks - Array of tasks for this status
 * @param {Object} helpers - Helper functions (same as generateTaskCardHTML)
 * @returns {string} HTML string for all task cards
 */
export function generateKanbanColumnHTML(tasks, helpers) {
    return tasks.map(task => generateTaskCardHTML(task, helpers)).join('');
}
