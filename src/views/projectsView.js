/**
 * Projects View Module
 * 
 * Pure computation functions for projects view logic.
 * These functions handle project statistics, sorting, and filtering.
 * 
 * @module views/projectsView
 */

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
