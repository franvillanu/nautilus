/**
 * List View Module
 * 
 * Pure computation functions for list view logic.
 * These functions handle task sorting and date formatting for list display.
 * 
 * @module views/listView
 */

import { PRIORITY_ORDER, STATUS_ORDER } from '../config/constants.js';

/**
 * Sort tasks by priority (high to low) then by end date (closest first, no date last)
 * @param {Array} tasks - Array of task objects
 * @returns {Array} Sorted tasks array
 */
export function sortTasksByPriorityAndDate(tasks) {
    return [...tasks].sort((a, b) => {
        const priorityA = PRIORITY_ORDER[a.priority] || 0;
        const priorityB = PRIORITY_ORDER[b.priority] || 0;

        // Primary sort: priority (high to low)
        if (priorityA !== priorityB) {
            return priorityB - priorityA;
        }

        // Secondary sort: end date (closest first, no date last)
        const dateA = a.endDate ? new Date(a.endDate) : null;
        const dateB = b.endDate ? new Date(b.endDate) : null;

        // Both have dates: sort by date (earliest first)
        if (dateA && dateB) {
            return dateA - dateB;
        }

        // Tasks with dates come before tasks without dates
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;

        // Both have no date: keep original order
        return 0;
    });
}

/**
 * Get sort value for a task based on column
 * @param {Object} task - Task object
 * @param {string} column - Column name to sort by
 * @param {Array} projects - Array of project objects (for project column)
 * @param {Function} getTaskUpdatedTime - Function to get task updated time
 * @returns {*} Sort value for comparison
 */
export function getColumnSortValue(task, column, projects = [], getTaskUpdatedTime = null) {
    switch (column) {
        case "title":
            return (task.title || "").toLowerCase();
        case "status": {
            const order = STATUS_ORDER || { backlog: 0, todo: 1, progress: 2, review: 3, done: 4 };
            return order[task.status] ?? 0;
        }
        case "priority": {
            const order = { low: 0, medium: 1, high: 2 };
            return order[task.priority] ?? 0;
        }
        case "project": {
            const proj = projects.find((p) => p.id === task.projectId);
            return proj ? proj.name.toLowerCase() : "";
        }
        case "startDate":
            return task.startDate || "";
        case "endDate":
            return task.endDate || "";
        case "updatedAt":
            return getTaskUpdatedTime ? getTaskUpdatedTime(task) : 0;
        default:
            return "";
    }
}

/**
 * Sort tasks by a specific column
 * @param {Array} tasks - Array of task objects
 * @param {string} column - Column name to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @param {Array} projects - Array of project objects (for project column)
 * @param {Function} getTaskUpdatedTime - Function to get task updated time
 * @returns {Array} Sorted tasks array
 */
export function sortTasksByColumn(tasks, column, direction, projects = [], getTaskUpdatedTime = null) {
    if (!column) {
        return tasks;
    }
    
    return [...tasks].sort((a, b) => {
        const aVal = getColumnSortValue(a, column, projects, getTaskUpdatedTime);
        const bVal = getColumnSortValue(b, column, projects, getTaskUpdatedTime);
        
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
        return 0;
    });
}

/**
 * Calculate smart date info for display (urgency indication)
 * @param {string|null} endDate - Task end date in ISO format
 * @param {string|null} status - Task status (to check if done)
 * @returns {Object} Date info with text, class, and showPrefix
 */
export function calculateSmartDateInfo(endDate, status = null) {
    if (!endDate) {
        return { 
            text: null, // Caller should provide translated "No end date" text
            class: "", 
            showPrefix: false,
            hasDate: false
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(endDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        // Only show "overdue" styling if task is not done
        if (status === 'done') {
            return { 
                text: null, // Caller should format the date
                class: "", 
                showPrefix: true,
                hasDate: true,
                diffDays,
                urgency: 'completed'
            };
        }
        return {
            text: null, // Caller should provide translated overdue text
            class: "overdue",
            showPrefix: true,
            hasDate: true,
            diffDays,
            daysOverdue: Math.abs(diffDays),
            urgency: 'overdue'
        };
    } else if (diffDays === 0) {
        return { 
            text: null, // Caller should provide "Today" text
            class: "today", 
            showPrefix: true,
            hasDate: true,
            diffDays,
            urgency: 'today'
        };
    } else if (diffDays === 1) {
        return { 
            text: null, // Caller should provide "Tomorrow" text
            class: "soon", 
            showPrefix: true,
            hasDate: true,
            diffDays,
            urgency: 'tomorrow'
        };
    } else if (diffDays <= 7) {
        return { 
            text: null, // Caller should format the date
            class: "soon", 
            showPrefix: true,
            hasDate: true,
            diffDays,
            urgency: 'soon'
        };
    } else {
        // For all other dates (future), just show the formatted date
        return { 
            text: null, // Caller should format the date
            class: "", 
            showPrefix: true,
            hasDate: true,
            diffDays,
            urgency: 'normal'
        };
    }
}

/**
 * Generate HTML for a single task row in list view
 * @param {Object} task - Task object
 * @param {Object} helpers - Helper functions and data
 * @param {Function} helpers.escapeHtml - HTML escape function
 * @param {Function} helpers.formatDate - Date formatting function
 * @param {Function} helpers.getTagColor - Get tag color function
 * @param {Function} helpers.getProjectColor - Get project color function
 * @param {Function} helpers.getPriorityLabel - Get priority label function
 * @param {Function} helpers.getStatusLabel - Get status label function
 * @param {Function} helpers.formatTaskUpdatedDateTime - Format updated time function
 * @param {Array} helpers.projects - Array of projects
 * @param {string} helpers.noProjectText - Text for "No project"
 * @param {string} helpers.noDateText - Text for "No date"
 * @returns {string} HTML string for the table row
 */
export function generateTaskRowHTML(task, helpers) {
    const {
        escapeHtml,
        formatDate,
        getTagColor,
        getProjectColor,
        getPriorityLabel,
        getStatusLabel,
        formatTaskUpdatedDateTime,
        projects,
        noProjectText,
        noDateText
    } = helpers;

    const statusClass = `status-badge ${task.status}`;
    const proj = projects.find((p) => p.id === task.projectId);
    const projName = proj ? proj.name : noProjectText;
    const start = task.startDate ? formatDate(task.startDate) : noDateText;
    const due = task.endDate ? formatDate(task.endDate) : noDateText;
    const updated = formatTaskUpdatedDateTime(task) || "";
    const prText = task.priority ? getPriorityLabel(task.priority) : "";

    const tagsHTML = task.tags && task.tags.length > 0
        ? task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join('')
        : '';

    const projectIndicator = proj
        ? `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(proj.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`
        : '';

    const rowClass = task.status === 'done' ? ' task-row-done' : '';

    return `
        <tr class="task-row${rowClass}" data-action="openTaskDetails" data-param="${task.id}">
            <td>${projectIndicator}${escapeHtml(task.title || "")}</td>
            <td><span class="priority-badge priority-${task.priority}">${prText}</span></td>
            <td><span class="${statusClass}">${(getStatusLabel(task.status)).toUpperCase()}</span></td>
            <td>${tagsHTML || '<span style="color: var(--text-muted); font-size: 12px;">-</span>'}</td>
            <td>${escapeHtml(projName)}</td>
            <td>${start}</td>
            <td>${due}</td>
            <td>${escapeHtml(updated)}</td>
        </tr>
    `;
}

/**
 * Generate HTML for all task rows in list view
 * @param {Array} tasks - Array of task objects
 * @param {Object} helpers - Helper functions and data (same as generateTaskRowHTML)
 * @returns {string} HTML string for all table rows
 */
export function generateListViewHTML(tasks, helpers) {
    return tasks.map(task => generateTaskRowHTML(task, helpers)).join('');
}

/**
 * Prepare list view data for rendering
 * @param {Array} tasks - All tasks
 * @param {Object} options - List view options
 * @param {Object} options.currentSort - Current sort state { column, direction }
 * @param {Array} options.projects - Array of project objects
 * @param {number|null} options.updatedCutoff - Updated time cutoff
 * @param {Function} options.getTaskUpdatedTime - Function to get task updated time
 * @returns {Object} Prepared list view data
 */
export function prepareListViewData(tasks, options = {}) {
    const {
        currentSort = null,
        projects = [],
        updatedCutoff = null,
        getTaskUpdatedTime = null
    } = options;
    
    // Filter by updated time if cutoff provided
    let filteredTasks = tasks;
    if (updatedCutoff !== null && getTaskUpdatedTime) {
        filteredTasks = tasks.filter((t) => getTaskUpdatedTime(t) >= updatedCutoff);
    }
    
    // Apply default sort (priority then date)
    let sortedTasks = sortTasksByPriorityAndDate(filteredTasks);
    
    // Apply column sort if specified
    if (currentSort && currentSort.column) {
        sortedTasks = sortTasksByColumn(
            sortedTasks, 
            currentSort.column, 
            currentSort.direction,
            projects,
            getTaskUpdatedTime
        );
    }
    
    return {
        tasks: sortedTasks,
        count: sortedTasks.length,
        totalOriginal: tasks.length
    };
}
