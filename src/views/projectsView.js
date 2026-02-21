/**
 * Projects View Module
 *
 * Pure computation functions for projects view logic.
 * These functions handle project statistics, sorting, and filtering.
 *
 * @module views/projectsView
 */

import { PRIORITY_ORDER, STATUS_ORDER } from '../config/constants.js';

/**
 * Calculate task statistics for a project
 * @param {Array} tasks - Array of all task objects
 * @param {number} projectId - Project ID to calculate stats for
 * @returns {Object} Task statistics by status
 */
export function calculateProjectTaskStats(tasks, projectId) {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    
    const stats = {
        total: projectTasks.length,
        backlog: 0,
        todo: 0,
        progress: 0,
        review: 0,
        done: 0
    };
    
    projectTasks.forEach(task => {
        if (stats.hasOwnProperty(task.status)) {
            stats[task.status]++;
        }
    });
    
    return stats;
}

/**
 * Calculate completion percentage for a project
 * @param {Object} stats - Task statistics from calculateProjectTaskStats
 * @returns {number} Completion percentage (0-100)
 */
export function calculateCompletionPercentage(stats) {
    if (stats.total === 0) return 0;
    return Math.round((stats.done / stats.total) * 100);
}

/**
 * Determine project status based on dates and task completion
 * @param {Object} project - Project object
 * @param {Object} stats - Task statistics from calculateProjectTaskStats
 * @param {Date} today - Today's date
 * @returns {Object} Project status info
 */
export function determineProjectStatus(project, stats, today = new Date()) {
    const todayStr = today.toISOString().split('T')[0];
    
    // Check if all tasks are done
    if (stats.total > 0 && stats.done === stats.total) {
        return {
            status: 'completed',
            label: 'Completed',
            class: 'status-completed'
        };
    }
    
    // Check if project has ended (past end date)
    if (project.endDate && project.endDate < todayStr) {
        return {
            status: 'ended',
            label: 'Ended',
            class: 'status-ended'
        };
    }
    
    // Check if project hasn't started yet
    if (project.startDate && project.startDate > todayStr) {
        return {
            status: 'upcoming',
            label: 'Upcoming',
            class: 'status-upcoming'
        };
    }
    
    // Check if project is in progress (has tasks in progress or review)
    if (stats.progress > 0 || stats.review > 0) {
        return {
            status: 'active',
            label: 'Active',
            class: 'status-active'
        };
    }
    
    // Default: project exists but no active work
    return {
        status: 'idle',
        label: 'Idle',
        class: 'status-idle'
    };
}

/**
 * Sort projects by a specific field
 * @param {Array} projects - Array of project objects
 * @param {string} sortBy - Field to sort by ('name', 'startDate', 'endDate', 'progress')
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @param {Array} tasks - Array of all tasks (needed for progress sorting)
 * @returns {Array} Sorted projects array
 */
export function sortProjects(projects, sortBy, direction = 'asc', tasks = []) {
    return [...projects].sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
            case 'name':
                aVal = (a.name || '').toLowerCase();
                bVal = (b.name || '').toLowerCase();
                break;
            case 'startDate':
                aVal = a.startDate || '';
                bVal = b.startDate || '';
                break;
            case 'endDate':
                aVal = a.endDate || '';
                bVal = b.endDate || '';
                break;
            case 'progress':
                const statsA = calculateProjectTaskStats(tasks, a.id);
                const statsB = calculateProjectTaskStats(tasks, b.id);
                aVal = calculateCompletionPercentage(statsA);
                bVal = calculateCompletionPercentage(statsB);
                break;
            case 'taskCount':
                aVal = tasks.filter(t => t.projectId === a.id).length;
                bVal = tasks.filter(t => t.projectId === b.id).length;
                break;
            default:
                aVal = a.id;
                bVal = b.id;
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Filter projects by search term
 * @param {Array} projects - Array of project objects
 * @param {string} searchTerm - Search term to filter by
 * @returns {Array} Filtered projects array
 */
export function filterProjectsBySearch(projects, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return projects;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    return projects.filter(project => {
        const name = (project.name || '').toLowerCase();
        const description = (project.description || '').toLowerCase();
        
        return name.includes(term) || description.includes(term);
    });
}

/**
 * Filter projects by status
 * @param {Array} projects - Array of project objects
 * @param {Set|Array} statusFilter - Set or array of status values to include
 * @param {Array} tasks - Array of all tasks (needed for status calculation)
 * @param {Date} today - Today's date
 * @returns {Array} Filtered projects array
 */
export function filterProjectsByStatus(projects, statusFilter, tasks = [], today = new Date()) {
    if (!statusFilter || (statusFilter.size === 0 && statusFilter.length === 0)) {
        return projects;
    }
    
    const statusSet = statusFilter instanceof Set ? statusFilter : new Set(statusFilter);
    
    return projects.filter(project => {
        const stats = calculateProjectTaskStats(tasks, project.id);
        const statusInfo = determineProjectStatus(project, stats, today);
        return statusSet.has(statusInfo.status);
    });
}

/**
 * Prepare projects view data for rendering
 * @param {Array} projects - Array of project objects
 * @param {Array} tasks - Array of all task objects
 * @param {Object} options - Options
 * @param {string} options.searchTerm - Search term to filter by
 * @param {Set|null} options.statusFilter - Status filter
 * @param {string} options.sortBy - Field to sort by
 * @param {string} options.sortDirection - Sort direction
 * @param {Date} options.today - Today's date
 * @returns {Object} Prepared projects view data
 */
export function prepareProjectsViewData(projects, tasks, options = {}) {
    const {
        searchTerm = '',
        statusFilter = null,
        sortBy = 'name',
        sortDirection = 'asc',
        today = new Date()
    } = options;
    
    // Apply search filter
    let filteredProjects = filterProjectsBySearch(projects, searchTerm);
    
    // Apply status filter
    if (statusFilter && statusFilter.size > 0) {
        filteredProjects = filterProjectsByStatus(filteredProjects, statusFilter, tasks, today);
    }
    
    // Apply sorting
    const sortedProjects = sortProjects(filteredProjects, sortBy, sortDirection, tasks);
    
    // Enhance with stats
    const enhancedProjects = sortedProjects.map(project => {
        const stats = calculateProjectTaskStats(tasks, project.id);
        const statusInfo = determineProjectStatus(project, stats, today);
        const completionPct = calculateCompletionPercentage(stats);
        
        return {
            ...project,
            stats,
            statusInfo,
            completionPct
        };
    });
    
    return {
        projects: enhancedProjects,
        count: enhancedProjects.length,
        totalOriginal: projects.length
    };
}

/**
 * Sort project tasks by priority (desc) and status (asc)
 * @param {Array} tasks - Array of task objects
 * @returns {Array} Sorted tasks
 */
export function sortProjectTasks(tasks) {
    // If any task has a manual projectOrder, use that ordering
    const hasManualOrder = tasks.some(t => typeof t.projectOrder === 'number');
    if (hasManualOrder) {
        return [...tasks].sort((a, b) => {
            const ao = typeof a.projectOrder === 'number' ? a.projectOrder : 9999;
            const bo = typeof b.projectOrder === 'number' ? b.projectOrder : 9999;
            return ao - bo;
        });
    }
    return [...tasks].sort((a, b) => {
        const aPriority = PRIORITY_ORDER[a.priority || 'low'] || 1;
        const bPriority = PRIORITY_ORDER[b.priority || 'low'] || 1;
        if (aPriority !== bPriority) {
            return bPriority - aPriority;
        }
        const aStatus = STATUS_ORDER[a.status || 'todo'] || 4;
        const bStatus = STATUS_ORDER[b.status || 'todo'] || 4;
        return aStatus - bStatus;
    });
}

/**
 * Generate HTML for a single project item (desktop view)
 * @param {Object} project - Project object
 * @param {Array} allTasks - All tasks array
 * @param {Object} helpers - Helper functions and translations
 * @returns {string} HTML string
 */
export function generateProjectItemHTML(project, allTasks, helpers) {
    const {
        escapeHtml,
        formatDatePretty,
        getProjectColor,
        getProjectStatus,
        getProjectStatusLabel,
        getTagColor,
        getPriorityLabel,
        getStatusLabel,
        getLocale,
        t
    } = helpers;

    const projectTasks = allTasks.filter(task => task.projectId === project.id);
    const stats = calculateProjectTaskStats(allTasks, project.id);
    const { done: completed, progress: inProgress, review, todo, backlog, total } = stats;

    const completedPct = total > 0 ? (completed / total) * 100 : 0;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const swatchColor = getProjectColor(project.id);
    const projectStatus = getProjectStatus(project.id);

    const sortedTasks = sortProjectTasks(projectTasks);
    const hasManualOrder = projectTasks.some(t => typeof t.projectOrder === 'number');

    const tasksHtml = sortedTasks.length > 0
        ? sortedTasks.map(task => {
            const priority = task.priority || 'low';
            const hasStartDate = task.startDate && task.startDate !== '';
            const hasEndDate = task.endDate && task.endDate !== '';
            let dateRangeHtml = '';
            if (hasStartDate && hasEndDate) {
                dateRangeHtml = `<span class="date-badge">${formatDatePretty(task.startDate, getLocale())}</span><span class="date-arrow">→</span><span class="date-badge">${formatDatePretty(task.endDate, getLocale())}</span>`;
            } else if (hasEndDate) {
                dateRangeHtml = `<span class="date-badge">${formatDatePretty(task.endDate, getLocale())}</span>`;
            } else if (hasStartDate) {
                dateRangeHtml = `<span class="date-badge">${formatDatePretty(task.startDate, getLocale())}</span>`;
            }

            return `
                <div class="expanded-task-item" data-action="openTaskDetails" data-param="${task.id}" data-task-id="${task.id}" draggable="true" data-stop-propagation="true">
                    <div class="expanded-drag-handle" data-stop-propagation="true">⠿</div>
                    <div class="expanded-task-info">
                        <div class="expanded-task-name">${escapeHtml(task.title)}</div>
                        ${(dateRangeHtml || (task.tags && task.tags.length > 0)) ? `
                            <div class="expanded-task-meta">
                                ${task.tags && task.tags.length > 0 ? `
                                    <div class="task-tags">
                                        ${task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join(' ')}
                                    </div>
                                ` : ''}
                                ${dateRangeHtml ? `<div class="expanded-task-dates">${dateRangeHtml}</div>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="expanded-task-priority">
                        <div class="priority-chip priority-${priority}">${getPriorityLabel(priority)}</div>
                    </div>
                    <div class="expanded-task-status-col">
                        <div class="expanded-task-status ${task.status}">${getStatusLabel(task.status)}</div>
                    </div>
                </div>
            `;
        }).join('')
        : `<div class="no-tasks-message">${t('tasks.noTasksInProject')}</div>`;

    return `
        <div class="project-list-item" id="project-item-${project.id}">
            <div class="project-row" data-action="toggleProjectExpand" data-param="${project.id}">
                <div class="project-chevron">▸</div>
                <div class="project-info">
                    <div class="project-swatch" style="background: ${swatchColor};"></div>
                    <div class="project-name-desc">
                        <div class="project-title project-title-link" data-action="showProjectDetails" data-param="${project.id}" data-stop-propagation="true">${escapeHtml(project.name || t('projects.untitled'))}</div>
                        ${project.tags && project.tags.length > 0 ? `
                            <div class="project-tags-row">
                                ${project.tags.map(tag => `<span class="project-tag" style="background-color: ${getProjectColor(project.id)};">${escapeHtml(tag.toUpperCase())}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div class="project-description">${escapeHtml(project.description || t('projects.noDescription'))}</div>
                    </div>
                </div>
                <div class="project-status-col">
                    <span class="project-status-badge ${projectStatus}">${getProjectStatusLabel(projectStatus).toUpperCase()}</span>
                </div>
                <div class="project-progress-col">
                    <div class="progress-bar-wrapper">
                        <div class="progress-segment done" style="width: ${completedPct}%;"></div>
                    </div>
                    <div class="progress-percent">${completionPct}%</div>
                </div>
                <div class="project-tasks-col">
                    <span class="project-tasks-breakdown">${t('projects.tasksBreakdown', { total, done: completed })}</span>
                </div>
                <div class="project-dates-col">
                    <span class="date-badge">${formatDatePretty(project.startDate, getLocale())}</span>
                    <span class="date-arrow">→</span>
                    <span class="date-badge">${formatDatePretty(project.endDate, getLocale())}</span>
                </div>
            </div>
            <div class="project-tasks-expanded">
                <div class="expanded-tasks-container">
                    <div class="expanded-tasks-header">
                        <span>\u{1F4CB} ${t('projects.details.tasksTitle', { count: total })}</span>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            ${hasManualOrder ? `<button class="add-btn expanded-add-task-btn auto-sort-btn" type="button" data-action="resetExpandedProjectTaskOrder" data-param="${project.id}" data-stop-propagation="true" title="${t('projects.details.resetSortTitle')}">↕ ${t('projects.details.resetSort')}</button>` : ''}
                            ${total > 0 ? `<button class="add-btn expanded-add-task-btn" type="button" data-action="navigateToProjectTasksList" data-param="${project.id}" data-stop-propagation="true" title="${t('projects.details.viewInList')}" style="background: var(--bg-tertiary); color: var(--text-secondary);">${t('projects.details.viewInListBtn')}</button>` : ''}
                            <button class="add-btn expanded-add-task-btn" type="button" data-action="openTaskModalForProject" data-param="${project.id}" data-stop-propagation="true">${t('tasks.addButton')}</button>
                        </div>
                    </div>
                    ${tasksHtml}
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate HTML for all project items
 * @param {Array} projects - Array of project objects
 * @param {Array} allTasks - All tasks array
 * @param {Object} helpers - Helper functions
 * @returns {string} HTML string for all projects
 */
export function generateProjectsListHTML(projects, allTasks, helpers) {
    return projects.map(project => generateProjectItemHTML(project, allTasks, helpers)).join('');
}
