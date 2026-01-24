/**
 * Filter Predicate Functions
 * 
 * Pure functions for filtering tasks based on various criteria.
 * These predicates are used by getFilteredTasks() and can be composed.
 * 
 * @module filterPredicates
 */

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 * @returns {string} Today's date in ISO format
 */
export function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get a date offset from today as ISO string
 * @param {number} days - Number of days to offset (positive = future, negative = past)
 * @returns {string} Date in ISO format
 */
export function getDateOffsetISO(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

/**
 * Check if task matches search query
 * @param {Object} task - Task object
 * @param {string} search - Search query (lowercase)
 * @returns {boolean} True if task matches search
 */
export function matchesSearch(task, search) {
    if (!search) return true;
    return (
        (task.title && task.title.toLowerCase().includes(search)) ||
        (task.description && task.description.toLowerCase().includes(search))
    );
}

/**
 * Check if task matches status filter
 * @param {Object} task - Task object
 * @param {Set<string>} statuses - Set of selected statuses
 * @returns {boolean} True if task matches status filter
 */
export function matchesStatus(task, statuses) {
    return statuses.size === 0 || statuses.has(task.status);
}

/**
 * Check if task matches priority filter
 * @param {Object} task - Task object
 * @param {Set<string>} priorities - Set of selected priorities
 * @returns {boolean} True if task matches priority filter
 */
export function matchesPriority(task, priorities) {
    return priorities.size === 0 || priorities.has(task.priority);
}

/**
 * Check if task matches project filter
 * @param {Object} task - Task object
 * @param {Set<string>} projects - Set of selected project IDs (as strings)
 * @returns {boolean} True if task matches project filter
 */
export function matchesProject(task, projects) {
    if (projects.size === 0) return true;
    if (task.projectId && projects.has(task.projectId.toString())) return true;
    if (!task.projectId && projects.has("none")) return true;
    return false;
}

/**
 * Check if task matches tag filter
 * @param {Object} task - Task object
 * @param {Set<string>} tags - Set of selected tags
 * @returns {boolean} True if task matches tag filter
 */
export function matchesTags(task, tags) {
    if (tags.size === 0) return true;
    if (task.tags && task.tags.some(tag => tags.has(tag))) return true;
    if ((!task.tags || task.tags.length === 0) && tags.has("none")) return true;
    return false;
}

/**
 * Check if task matches a date preset
 * @param {Object} task - Task object
 * @param {string} preset - Date preset name
 * @param {string} today - Today's date in ISO format
 * @returns {boolean} True if task matches the preset
 */
export function matchesDatePreset(task, preset, today) {
    const todayDate = new Date(today + 'T00:00:00');
    
    switch (preset) {
        // END DATE FILTERS
        case "no-date":
            return !task.endDate || task.endDate === "";

        case "overdue":
            return task.endDate && task.endDate < today;

        case "end-today":
            return task.endDate === today;

        case "end-tomorrow": {
            const endTomorrow = new Date(todayDate);
            endTomorrow.setDate(endTomorrow.getDate() + 1);
            return task.endDate === endTomorrow.toISOString().split('T')[0];
        }

        case "end-7days": {
            const endSevenDays = new Date(todayDate);
            endSevenDays.setDate(endSevenDays.getDate() + 7);
            return task.endDate === endSevenDays.toISOString().split('T')[0];
        }

        case "end-week": {
            const endWeekEnd = new Date(todayDate);
            endWeekEnd.setDate(endWeekEnd.getDate() + 7);
            const endWeekEndStr = endWeekEnd.toISOString().split('T')[0];
            return task.endDate && task.endDate >= today && task.endDate <= endWeekEndStr;
        }

        case "end-month": {
            const endMonthEnd = new Date(todayDate);
            endMonthEnd.setDate(endMonthEnd.getDate() + 30);
            const endMonthEndStr = endMonthEnd.toISOString().split('T')[0];
            return task.endDate && task.endDate >= today && task.endDate <= endMonthEndStr;
        }

        // START DATE FILTERS
        case "no-start-date":
            return !task.startDate || task.startDate === "";

        case "already-started":
            return task.startDate && task.startDate < today && task.status !== 'done';

        case "start-today":
            return task.startDate === today;

        case "start-tomorrow": {
            const startTomorrow = new Date(todayDate);
            startTomorrow.setDate(startTomorrow.getDate() + 1);
            return task.startDate === startTomorrow.toISOString().split('T')[0];
        }

        case "start-7days": {
            const startSevenDays = new Date(todayDate);
            startSevenDays.setDate(startSevenDays.getDate() + 7);
            return task.startDate === startSevenDays.toISOString().split('T')[0];
        }

        case "start-week": {
            const startWeekEnd = new Date(todayDate);
            startWeekEnd.setDate(startWeekEnd.getDate() + 7);
            const startWeekEndStr = startWeekEnd.toISOString().split('T')[0];
            return task.startDate && task.startDate >= today && task.startDate <= startWeekEndStr;
        }

        case "start-month": {
            const startMonthEnd = new Date(todayDate);
            startMonthEnd.setDate(startMonthEnd.getDate() + 30);
            const startMonthEndStr = startMonthEnd.toISOString().split('T')[0];
            return task.startDate && task.startDate >= today && task.startDate <= startMonthEndStr;
        }

        default:
            return true;
    }
}

/**
 * Check if task matches any of the selected date presets (OR logic)
 * @param {Object} task - Task object
 * @param {Set<string>} datePresets - Set of selected date presets
 * @param {string} today - Today's date in ISO format
 * @returns {boolean} True if task matches any preset
 */
export function matchesAnyDatePreset(task, datePresets, today) {
    if (datePresets.size === 0) return true;
    return Array.from(datePresets).some(preset => matchesDatePreset(task, preset, today));
}

/**
 * Check if task matches date range filter
 * @param {Object} task - Task object
 * @param {string} dateFrom - Start date in ISO format (or empty)
 * @param {string} dateTo - End date in ISO format (or empty)
 * @param {string} dateField - Which date field to check ('startDate' or 'endDate')
 * @returns {boolean} True if task matches date range
 */
export function matchesDateRange(task, dateFrom, dateTo, dateField = 'endDate') {
    if (!dateFrom && !dateTo) return true;
    
    const taskDateValue = dateField === 'startDate' ? task.startDate : task.endDate;
    
    // Task must have the appropriate date field to be filtered by date
    if (!taskDateValue) return false;
    
    // For same date filtering, only check the specified date field
    if (dateFrom && dateTo) {
        if (dateFrom === dateTo) {
            return taskDateValue === dateTo;
        } else {
            return taskDateValue >= dateFrom && taskDateValue <= dateTo;
        }
    } else if (dateFrom) {
        return taskDateValue >= dateFrom;
    } else if (dateTo) {
        return taskDateValue <= dateTo;
    }
    
    return true;
}

/**
 * Filter tasks based on filter state
 * Pure function that takes tasks array and filter state, returns filtered array
 * 
 * @param {Array} tasks - Array of task objects
 * @param {Object} filterState - Filter state object
 * @param {string} filterState.search - Search query
 * @param {Set<string>} filterState.statuses - Selected statuses
 * @param {Set<string>} filterState.priorities - Selected priorities
 * @param {Set<string>} filterState.projects - Selected project IDs
 * @param {Set<string>} filterState.tags - Selected tags
 * @param {Set<string>} filterState.datePresets - Selected date presets
 * @param {string} filterState.dateFrom - Date range start
 * @param {string} filterState.dateTo - Date range end
 * @param {string} [filterState.dateField] - Which date field to use for range filter
 * @returns {Array} Filtered tasks array
 */
export function filterTasks(tasks, filterState) {
    const {
        search = "",
        statuses = new Set(),
        priorities = new Set(),
        projects = new Set(),
        tags = new Set(),
        datePresets = new Set(),
        dateFrom = "",
        dateTo = "",
        dateField = "endDate"
    } = filterState;
    
    const today = getTodayISO();
    const searchLower = search.toLowerCase();
    
    return tasks.filter(task => {
        // Search filter
        if (!matchesSearch(task, searchLower)) return false;
        
        // Status filter
        if (!matchesStatus(task, statuses)) return false;
        
        // Priority filter
        if (!matchesPriority(task, priorities)) return false;
        
        // Project filter
        if (!matchesProject(task, projects)) return false;
        
        // Tag filter
        if (!matchesTags(task, tags)) return false;
        
        // Date preset filter (OR logic)
        if (datePresets.size > 0) {
            if (!matchesAnyDatePreset(task, datePresets, today)) return false;
        }
        // Date range filter (only if no presets)
        else if (dateFrom || dateTo) {
            if (!matchesDateRange(task, dateFrom, dateTo, dateField)) return false;
        }
        
        return true;
    });
}
