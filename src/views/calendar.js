/**
 * Calendar View Module
 * 
 * Pure computation functions for calendar view logic.
 * These functions handle date calculations, grid generation, and project overlap detection.
 * 
 * @module views/calendar
 */

/**
 * Calculate calendar grid parameters for a given month
 * @param {number} year - Full year (e.g., 2024)
 * @param {number} month - Month (0-11)
 * @returns {Object} Calendar grid parameters
 */
export function calculateCalendarGrid(year, month) {
    // Calculate first day of month (adjusted so Monday = 0, Sunday = 6)
    let firstDayOfWeek = new Date(year, month, 1).getDay();
    firstDayOfWeek = (firstDayOfWeek + 6) % 7; // Convert Sunday=0 to Sunday=6
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Calculate total cells needed (complete weeks)
    const totalCells = firstDayOfWeek + daysInMonth;
    const cellsNeeded = Math.ceil(totalCells / 7) * 7;
    const nextMonthDays = cellsNeeded - totalCells;
    
    return {
        firstDayOfWeek,
        daysInMonth,
        daysInPrevMonth,
        totalCells,
        cellsNeeded,
        nextMonthDays,
        totalRows: Math.ceil(cellsNeeded / 7)
    };
}

/**
 * Generate array of day cells for calendar grid
 * @param {number} year - Full year
 * @param {number} month - Month (0-11)
 * @param {Object} options - Options
 * @param {Date} options.today - Today's date
 * @returns {Array} Array of day cell objects
 */
export function generateCalendarDays(year, month, options = {}) {
    const { today = new Date() } = options;
    const grid = calculateCalendarGrid(year, month);
    const days = [];
    
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayDate = today.getDate();
    
    let cellIndex = 0;
    
    // Previous month's trailing days
    for (let i = grid.firstDayOfWeek - 1; i >= 0; i--) {
        const day = grid.daysInPrevMonth - i;
        days.push({
            day,
            type: 'prev-month',
            row: Math.floor(cellIndex / 7),
            column: cellIndex % 7,
            isWeekend: (cellIndex % 7) >= 5,
            dateStr: null // Not clickable
        });
        cellIndex++;
    }
    
    // Current month's days
    for (let day = 1; day <= grid.daysInMonth; day++) {
        const dateStr = formatDateISO(year, month, day);
        const isToday = isCurrentMonth && day === todayDate;
        const column = cellIndex % 7;
        
        days.push({
            day,
            type: 'current-month',
            row: Math.floor(cellIndex / 7),
            column,
            isWeekend: column >= 5,
            isToday,
            dateStr
        });
        cellIndex++;
    }
    
    // Next month's leading days
    for (let day = 1; day <= grid.nextMonthDays; day++) {
        days.push({
            day,
            type: 'next-month',
            row: Math.floor(cellIndex / 7),
            column: cellIndex % 7,
            isWeekend: (cellIndex % 7) >= 5,
            dateStr: null // Not clickable
        });
        cellIndex++;
    }
    
    return days;
}

/**
 * Format a date as ISO string (YYYY-MM-DD)
 * @param {number} year - Full year
 * @param {number} month - Month (0-11)
 * @param {number} day - Day of month
 * @returns {string} ISO date string
 */
export function formatDateISO(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Check if a date falls within a project's date range
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {Object} project - Project object with startDate and optional endDate
 * @returns {boolean} True if date is within project range
 */
export function isDateInProjectRange(dateStr, project) {
    if (!project.startDate) return false;
    
    const currentDate = new Date(dateStr);
    const startDate = new Date(project.startDate);
    const endDate = project.endDate 
        ? new Date(project.endDate) 
        : new Date(project.startDate);
    
    return currentDate >= startDate && currentDate <= endDate;
}

/**
 * Count projects overlapping a specific date
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {Array} projects - Array of project objects
 * @param {Set|null} filteredProjectIds - Set of filtered project IDs (null = all)
 * @returns {number} Count of overlapping projects
 */
export function countOverlappingProjects(dateStr, projects, filteredProjectIds = null) {
    return projects.filter(project => {
        // Check if project matches filter
        if (filteredProjectIds && !filteredProjectIds.has(project.id)) {
            return false;
        }
        return isDateInProjectRange(dateStr, project);
    }).length;
}

/**
 * Get projects overlapping a specific date
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {Array} projects - Array of project objects
 * @param {Set|null} filteredProjectIds - Set of filtered project IDs (null = all)
 * @returns {Array} Array of overlapping projects
 */
export function getOverlappingProjects(dateStr, projects, filteredProjectIds = null) {
    return projects.filter(project => {
        // Check if project matches filter
        if (filteredProjectIds && !filteredProjectIds.has(project.id)) {
            return false;
        }
        return isDateInProjectRange(dateStr, project);
    });
}

/**
 * Get tasks for a specific date
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {Array} tasks - Array of task objects
 * @param {Object} options - Options
 * @param {boolean} options.includeBacklog - Include backlog tasks
 * @param {boolean} options.useStartDate - Also match by start date
 * @returns {Array} Array of tasks for the date
 */
export function getTasksForDate(dateStr, tasks, options = {}) {
    const { includeBacklog = false, useStartDate = false } = options;
    
    return tasks.filter(task => {
        // Exclude backlog unless explicitly included
        if (!includeBacklog && task.status === 'backlog') {
            return false;
        }
        
        // Match by end date
        if (task.endDate === dateStr) {
            return true;
        }
        
        // Optionally match by start date
        if (useStartDate && task.startDate === dateStr) {
            return true;
        }
        
        return false;
    });
}

/**
 * Calculate month navigation (handles year rollover)
 * @param {number} year - Current year
 * @param {number} month - Current month (0-11)
 * @param {number} delta - Change in months (+1 or -1)
 * @returns {Object} New year and month
 */
export function calculateMonthNavigation(year, month, delta) {
    let newMonth = month + delta;
    let newYear = year;
    
    if (newMonth < 0) {
        newMonth = 11;
        newYear--;
    } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
    }
    
    return { year: newYear, month: newMonth };
}

/**
 * Check if viewing current month
 * @param {number} year - Displayed year
 * @param {number} month - Displayed month (0-11)
 * @param {Date} today - Today's date
 * @returns {boolean} True if viewing current month
 */
export function isCurrentMonth(year, month, today = new Date()) {
    return today.getMonth() === month && today.getFullYear() === year;
}

/**
 * Prepare calendar data for rendering
 * @param {number} year - Year to display
 * @param {number} month - Month to display (0-11)
 * @param {Object} options - Options
 * @param {Array} options.tasks - Array of task objects
 * @param {Array} options.projects - Array of project objects
 * @param {Set|null} options.filteredProjectIds - Filtered project IDs
 * @param {boolean} options.includeBacklog - Include backlog tasks
 * @param {Date} options.today - Today's date
 * @returns {Object} Prepared calendar data
 */
export function prepareCalendarData(year, month, options = {}) {
    const {
        tasks = [],
        projects = [],
        filteredProjectIds = null,
        includeBacklog = false,
        today = new Date()
    } = options;
    
    const grid = calculateCalendarGrid(year, month);
    const days = generateCalendarDays(year, month, { today });
    
    // Enhance days with task and project counts
    const enhancedDays = days.map(day => {
        if (day.type !== 'current-month') {
            return { ...day, taskCount: 0, projectCount: 0 };
        }
        
        const dayTasks = getTasksForDate(day.dateStr, tasks, { includeBacklog });
        const projectCount = countOverlappingProjects(day.dateStr, projects, filteredProjectIds);
        
        return {
            ...day,
            taskCount: dayTasks.length,
            projectCount,
            hasProjects: projectCount > 0
        };
    });
    
    return {
        year,
        month,
        grid,
        days: enhancedDays,
        isCurrentMonth: isCurrentMonth(year, month, today),
        totalRows: grid.totalRows
    };
}
