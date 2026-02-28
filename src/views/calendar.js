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
export function countOverlappingProjects(dateStr, projects, filteredProjectIds = null, searchText = '') {
    const search = searchText ? searchText.toLowerCase() : '';
    return projects.filter(project => {
        if (filteredProjectIds && !filteredProjectIds.has(project.id)) return false;
        if (search && !project.name.toLowerCase().includes(search)) return false;
        return isDateInProjectRange(dateStr, project);
    }).length;
}

/**
 * Get projects overlapping a specific date
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {Array} projects - Array of project objects
 * @param {Set|null} filteredProjectIds - Set of filtered project IDs (null = all)
 * @param {string} searchText - Optional search text to filter by project name
 * @returns {Array} Array of overlapping projects
 */
export function getOverlappingProjects(dateStr, projects, filteredProjectIds = null, searchText = '') {
    const search = searchText ? searchText.toLowerCase() : '';
    return projects.filter(project => {
        if (filteredProjectIds && !filteredProjectIds.has(project.id)) return false;
        if (search && !project.name.toLowerCase().includes(search)) return false;
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
    const { includeBacklog = false, useStartDate = false, searchText = '' } = options;
    const search = searchText ? searchText.toLowerCase() : '';

    return tasks.filter(task => {
        // Exclude backlog unless explicitly included
        if (!includeBacklog && task.status === 'backlog') {
            return false;
        }

        // Filter by search text
        if (search && !task.title.toLowerCase().includes(search)) {
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
        searchText = '',
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

        const dayTasks = getTasksForDate(day.dateStr, tasks, { includeBacklog, searchText });
        const projectCount = countOverlappingProjects(day.dateStr, projects, filteredProjectIds, searchText);
        
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

/**
 * Generate HTML for calendar day headers
 * @param {Array} dayNames - Array of day name strings
 * @returns {string} HTML string for day headers
 */
export function generateCalendarHeadersHTML(dayNames) {
    return dayNames.map((day, idx) => {
        const isWeekend = idx >= 5;
        return `<div class="calendar-day-header${isWeekend ? ' weekend' : ''}">${day}</div>`;
    }).join('');
}

/**
 * Generate HTML for a single calendar day cell
 * @param {Object} dayInfo - Day info object
 * @param {number} dayInfo.day - Day number
 * @param {string} dayInfo.dateStr - ISO date string
 * @param {string} dayInfo.type - 'prev-month', 'current-month', or 'next-month'
 * @param {number} dayInfo.row - Row index
 * @param {boolean} dayInfo.isToday - Is today
 * @param {boolean} dayInfo.isWeekend - Is weekend
 * @param {boolean} dayInfo.hasProjects - Has overlapping projects
 * @returns {string} HTML string for day cell
 */
export function generateCalendarDayHTML(dayInfo) {
    const { day, dateStr, type, row, isToday, isWeekend, hasProjects, paddingTopPx = 0 } = dayInfo;
    const spacer = paddingTopPx > 0 ? `<div class="project-spacer" style="height:${paddingTopPx}px"></div>` : '';

    if (type !== 'current-month') {
        return `<div class="calendar-day other-month" data-row="${row}">
            <div class="calendar-day-number">${day}</div>${spacer}
        </div>`;
    }

    const todayClass = isToday ? ' today' : '';
    const weekendClass = isWeekend ? ' weekend' : '';

    return `<div class="calendar-day${todayClass}${weekendClass}" data-row="${row}" data-action="showDayTasks" data-param="${dateStr}" data-has-project="${hasProjects}">
        <div class="calendar-day-number">${day}</div>${spacer}
        <div class="tasks-container"></div>
    </div>`;
}

/**
 * Generate HTML for entire calendar grid
 * @param {Object} calendarData - Calendar data from prepareCalendarData
 * @param {Array} dayNames - Array of day name strings
 * @returns {string} HTML string for calendar grid
 */
/**
 * Generate HTML for entire calendar grid using week-row structure.
 * Bars are embedded directly inside each week row (no separate overlay).
 * @param {Object} calendarData - from prepareCalendarData
 * @param {Array|null} barLayout - from computeBarLayout, or null for no bars
 * @param {Array} dayNames - array of day name strings
 * @returns {string} HTML string
 */
export function generateCalendarGridHTML(calendarData, barLayout, dayNames) {
    const { days, totalRows } = calendarData;

    // Day headers wrapped in a row container
    let html = `<div class="calendar-header-row">${generateCalendarHeadersHTML(dayNames)}</div>`;

    // Week rows — each contains bars (absolutely positioned) + 7 day cells
    for (let row = 0; row < totalRows; row++) {
        const rowData = barLayout && barLayout[row]
            ? barLayout[row]
            : { rowIndex: row, paddingTopPx: 0, bars: [] };

        html += `<div class="calendar-week">`;

        // Bars first — absolutely positioned, overlay the top of day cells
        for (const bar of rowData.bars) {
            html += generateBarHTML(bar);
        }

        // Day cells for this row — each gets a spacer so content sits below bars
        for (let col = 0; col < 7; col++) {
            const cellIndex = row * 7 + col;
            const day = days[cellIndex];
            if (!day) continue;
            html += generateCalendarDayHTML({ ...day, row, isWeekend: col >= 5, paddingTopPx: rowData.paddingTopPx });
        }

        html += `</div>`;
    }

    return html;
}

/**
 * Generate HTML for a single bar (project or task) inside a week row.
 * Bars are absolutely positioned relative to the .calendar-week container.
 * @param {Object} bar - bar data from computeBarLayout
 * @returns {string} HTML string
 */
function generateBarHTML(bar) {
    const COL = `${(100 / 7).toFixed(6)}%`;
    const { startCol, endCol, continuesLeft, continuesRight, topPx, height, type } = bar;
    const span      = endCol - startCol + 1;
    const chevW     = +((height * 0.6).toFixed(1));
    const chevGap   = 3;
    const leftInset  = continuesLeft  ? 0 : 6;
    const rightInset = continuesRight ? 0 : 6;

    const leftCalc  = leftInset === 0
        ? `calc(${startCol} * ${COL})`
        : `calc(${startCol} * ${COL} + 6px)`;
    const widthCalc = `calc(${span} * ${COL} - ${leftInset + rightInset}px)`;

    const r  = type === 'project' ? '6px' : '4px';
    const brTL = continuesLeft  ? '0' : r;
    const brBL = continuesLeft  ? '0' : r;
    const brTR = continuesRight ? '0' : r;
    const brBR = continuesRight ? '0' : r;

    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    let chevrons = '';

    if (type === 'project') {
        const classNames = `project-bar${bar.completed ? ' completed' : ''}`;
        const styles = [
            `position:absolute`,
            `top:${topPx}px`,
            `left:${leftCalc}`,
            `width:${widthCalc}`,
            `height:${height}px`,
            `background:linear-gradient(90deg,${bar.color},${bar.color}dd)`,
            `border-radius:${brTL} ${brTR} ${brBR} ${brBL}`,
            `z-index:10`,
            `cursor:pointer`,
            `pointer-events:auto`,
            `white-space:nowrap`,
            `overflow:hidden`,
            `text-overflow:ellipsis`,
            `font-size:10px`,
            `font-weight:600`,
            `color:white`,
            `padding:1px 6px`,
            `display:flex`,
            `align-items:center`,
            `box-shadow:0 1px 3px rgba(0,0,0,0.2)`,
            `text-shadow:0 1px 2px rgba(0,0,0,0.3)`,
        ].join(';');

        if (continuesLeft) {
            const cl = `calc(${startCol} * ${COL} - ${chevW + chevGap}px)`;
            chevrons += `<div class="continues-chevron continues-chevron-left" style="position:absolute;top:${topPx}px;height:${height}px;width:${chevW}px;left:${cl};background:${bar.color};clip-path:polygon(100% 0%,40% 50%,100% 100%,60% 100%,0% 50%,60% 0%);pointer-events:none;z-index:9"></div>`;
        }
        if (continuesRight) {
            const cl = `calc(${endCol + 1} * ${COL} + ${chevGap}px)`;
            chevrons += `<div class="continues-chevron continues-chevron-right" style="position:absolute;top:${topPx}px;height:${height}px;width:${chevW}px;left:${cl};background:${bar.color};clip-path:polygon(0% 0%,40% 0%,100% 50%,40% 100%,0% 100%,60% 50%);pointer-events:none;z-index:9"></div>`;
        }

        return `${chevrons}<div class="${classNames}" style="${styles}" data-action="showProjectDetails" data-param="${bar.projectId}" data-referrer="calendar" data-stop-propagation="1">${esc(bar.label)}</div>`;
    }

    // task bar
    const borderLeftW  = (bar.hasValidStart && bar.isFirstSegment) ? 5 : 1;
    const borderRightW = (bar.hasValidEnd   && bar.isLastSegment)  ? 5 : 1;
    const borderRightColor = (bar.hasValidEnd && bar.isLastSegment) ? bar.borderColor : '#4a5060';
    const classNames = `task-bar${bar.done ? ' done' : ''}${bar.hasValidStart ? ' has-start-date' : ''}${bar.hasValidEnd ? ' has-end-date' : ''}`;
    const styles = [
        `position:absolute`,
        `top:${topPx}px`,
        `left:${leftCalc}`,
        `width:${widthCalc}`,
        `height:${height}px`,
        `border-radius:${brTL} ${brTR} ${brBR} ${brBL}`,
        `border-left:${borderLeftW}px solid ${bar.borderColor}`,
        `border-right:${borderRightW}px solid ${borderRightColor}`,
        `z-index:11`,
        `cursor:pointer`,
        `pointer-events:auto`,
        `white-space:nowrap`,
        `overflow:hidden`,
        `text-overflow:ellipsis`,
        `font-size:11px`,
        `font-weight:500`,
        `padding:2px 6px`,
        `display:flex`,
        `align-items:center`,
        `box-shadow:var(--shadow-sm)`,
        `color:var(--text-primary)`,
    ].join(';');

    if (continuesLeft) {
        const cl = `calc(${startCol} * ${COL} - ${chevW + chevGap}px)`;
        chevrons += `<div class="continues-chevron continues-chevron-left" style="position:absolute;top:${topPx}px;height:${height}px;width:${chevW}px;left:${cl};background:${bar.borderColor};opacity:0.45;clip-path:polygon(100% 0%,100% 100%,0% 50%);pointer-events:none;z-index:10"></div>`;
    }
    if (continuesRight) {
        const cl = `calc(${endCol + 1} * ${COL} + ${chevGap}px)`;
        chevrons += `<div class="continues-chevron continues-chevron-right" style="position:absolute;top:${topPx}px;height:${height}px;width:${chevW}px;left:${cl};background:${bar.borderColor};opacity:0.45;clip-path:polygon(0% 0%,0% 100%,100% 50%);pointer-events:none;z-index:10"></div>`;
    }

    return `${chevrons}<div class="${classNames}" style="${styles}" data-action="openTaskDetails" data-param="${bar.taskId}" data-stop-propagation="1">${esc(bar.label)}</div>`;
}

/**
 * Compute bar layout data for all week rows. Pure function — no DOM access.
 *
 * @param {number} year
 * @param {number} month  0-11
 * @param {Object} options
 * @param {Array}    options.filteredProjects - pre-filtered projects array
 * @param {Array}    options.filteredTasks    - pre-filtered tasks array
 * @param {Function} options.getProjectColor  - (id) => color string
 * @param {Function} options.getProjectStatus - (id) => status string
 * @param {Object}   options.PRIORITY_COLORS  - { high, medium, low }
 * @param {Array}    options.days             - from generateCalendarDays()
 * @returns {Array} rows - [{ rowIndex, paddingTopPx, bars: [...] }]
 */
export function computeBarLayout(year, month, options = {}) {
    const {
        filteredProjects = [],
        filteredTasks    = [],
        getProjectColor  = () => '#6366f1',
        getProjectStatus = () => 'active',
        PRIORITY_COLORS  = {},
        days             = [],
    } = options;

    // Layout constants — must match CSS / generateBarHTML
    const PROJECT_H   = 18;
    const PROJECT_GAP = 3;
    const TASK_H        = 20;
    const TASK_GAP      = 4;
    const BETWEEN_GAP   = 6;
    const TOP_OFFSET    = 4;
    // Height occupied by the day-number row in each cell (padding-top + number + margin-bottom)
    // Bars must start below this so the day number stays visible at the top of the cell.
    const DAY_NUMBER_H  = 28;

    const padM = String(month + 1).padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthStartStr = `${year}-${padM}-01`;
    const monthEndStr   = `${year}-${padM}-${String(lastDay).padStart(2, '0')}`;
    const monthStartDt  = new Date(year, month, 1);
    const monthEndDt    = new Date(year, month + 1, 0);

    const currentMonthDays = days
        .map((d, i) => ({ ...d, gridIndex: i }))
        .filter(d => d.type === 'current-month');

    const firstDayIdx = currentMonthDays.length > 0 ? currentMonthDays[0].gridIndex                              : -1;
    const lastDayIdx  = currentMonthDays.length > 0 ? currentMonthDays[currentMonthDays.length - 1].gridIndex : -1;
    const totalRows   = Math.ceil(days.length / 7);

    // Segment storage: rowIndex -> [seg]
    const projSegs = new Map();
    const taskSegs = new Map();

    // Split a [startIndex..endIndex] span into per-row segments
    function splitRows(startIndex, endIndex, cb) {
        let cursor = startIndex;
        while (cursor <= endIndex) {
            const rowStart = Math.floor(cursor / 7) * 7;
            const rowEnd   = Math.min(rowStart + 6, endIndex);
            const segStart = Math.max(cursor, rowStart);
            const row      = Math.floor(segStart / 7);
            cb(row, segStart, rowEnd);
            cursor = rowEnd + 1;
        }
    }

    // Clip a date range to the current month and return grid indices
    function clippedIndices(startDt, endDt) {
        if (startDt > monthEndDt || endDt < monthStartDt) return null;
        const calStart = startDt < monthStartDt ? monthStartDt : startDt;
        const calEnd   = endDt   > monthEndDt   ? monthEndDt   : endDt;
        const si = currentMonthDays.find(d => d.day === calStart.getDate());
        const ei = currentMonthDays.find(d => d.day === calEnd.getDate());
        if (!si || !ei) return null;
        return { startIndex: si.gridIndex, endIndex: ei.gridIndex };
    }

    // --- Projects ---
    const projRank = new Map();
    filteredProjects
        .slice()
        .sort((a, b) => {
            const as = a.startDate || '', bs = b.startDate || '';
            if (as !== bs) return as.localeCompare(bs);
            const ae = a.endDate || a.startDate || '', be = b.endDate || b.startDate || '';
            if (ae !== be) return ae.localeCompare(be);
            const an = (a.name || '').toLowerCase(), bn = (b.name || '').toLowerCase();
            if (an !== bn) return an.localeCompare(bn);
            return (a.id || 0) - (b.id || 0);
        })
        .forEach((p, i) => projRank.set(p.id, i));

    filteredProjects.forEach(project => {
        const [sY, sM, sD] = project.startDate.split('-').map(Number);
        const [eY, eM, eD] = (project.endDate || project.startDate).split('-').map(Number);
        const idxs = clippedIndices(new Date(sY, sM - 1, sD), new Date(eY, eM - 1, eD));
        if (!idxs) return;
        splitRows(idxs.startIndex, idxs.endIndex, (row, segStart, segEnd) => {
            if (!projSegs.has(row)) projSegs.set(row, []);
            projSegs.get(row).push({ startIndex: segStart, endIndex: segEnd, project, rank: projRank.get(project.id) ?? 0 });
        });
    });

    // --- Tasks ---
    const taskRank = new Map();
    const prioOrder = { high: 0, medium: 1, low: 2 };
    const taskSortKey = t => (t.startDate?.length === 10 && t.startDate.includes('-')) ? t.startDate : (t.endDate || '');
    filteredTasks
        .slice()
        .sort((a, b) => {
            const ap = prioOrder[a.priority] ?? 3, bp = prioOrder[b.priority] ?? 3;
            if (ap !== bp) return ap - bp;
            const as = taskSortKey(a), bs = taskSortKey(b);
            if (as !== bs) return as.localeCompare(bs);
            const ae = a.endDate || '', be = b.endDate || '';
            if (ae !== be) return ae.localeCompare(be);
            const at = (a.title || '').toLowerCase(), bt = (b.title || '').toLowerCase();
            if (at !== bt) return at.localeCompare(bt);
            return (a.id || 0) - (b.id || 0);
        })
        .forEach((t, i) => taskRank.set(t.id, i));

    filteredTasks.forEach(task => {
        const hasStart = task.startDate?.length === 10 && task.startDate.includes('-');
        const hasEnd   = task.endDate?.length === 10   && task.endDate.includes('-');
        if (!hasStart && !hasEnd) return;

        let startDt, endDt;
        if (hasStart) { const [y,m,d] = task.startDate.split('-').map(Number); startDt = new Date(y, m-1, d); }
        else          { const [y,m,d] = task.endDate.split('-').map(Number);   startDt = new Date(y, m-1, d); }
        if (hasEnd)   { const [y,m,d] = task.endDate.split('-').map(Number);   endDt   = new Date(y, m-1, d); }
        else          { endDt = startDt; }

        const idxs = clippedIndices(startDt, endDt);
        if (!idxs) return;
        const { startIndex, endIndex } = idxs;
        splitRows(startIndex, endIndex, (row, segStart, segEnd) => {
            if (!taskSegs.has(row)) taskSegs.set(row, []);
            taskSegs.get(row).push({
                startIndex: segStart, endIndex: segEnd,
                task, rank: taskRank.get(task.id) ?? 0,
                isFirstSegment: segStart === startIndex,
                isLastSegment:  segEnd   === endIndex,
                hasValidStart: hasStart, hasValidEnd: hasEnd,
            });
        });
    });

    // --- Lane assignment (greedy interval packing) ---
    function assignTracks(segments) {
        segments.sort((a, b) => a.rank - b.rank || a.startIndex - b.startIndex || a.endIndex - b.endIndex);
        const trackEnds = [];
        segments.forEach(seg => {
            let t = trackEnds.findIndex(end => seg.startIndex > end);
            if (t === -1) { t = trackEnds.length; trackEnds.push(seg.endIndex); }
            else          { trackEnds[t] = seg.endIndex; }
            seg.track = t;
        });
        return trackEnds.length;
    }

    const rowMaxTracks = new Map(); // row -> { proj, task }
    const rowBarsMap   = new Map(); // row -> [bar data]

    // Project bars
    projSegs.forEach((segs, row) => {
        const numTracks = assignTracks(segs);
        if (!rowMaxTracks.has(row)) rowMaxTracks.set(row, { proj: 0, task: 0 });
        rowMaxTracks.get(row).proj = numTracks;
        if (!rowBarsMap.has(row)) rowBarsMap.set(row, []);
        segs.forEach(seg => {
            const startCol = seg.startIndex % 7;
            const endCol   = seg.endIndex   % 7;
            const topPx    = DAY_NUMBER_H + TOP_OFFSET + seg.track * (PROJECT_H + PROJECT_GAP);
            const pStart   = seg.project.startDate;
            const pEnd     = seg.project.endDate || seg.project.startDate;
            rowBarsMap.get(row).push({
                type: 'project',
                startCol, endCol, topPx, height: PROJECT_H,
                continuesLeft:  pStart < monthStartStr && seg.startIndex === firstDayIdx,
                continuesRight: pEnd   > monthEndStr   && seg.endIndex   === lastDayIdx,
                label:     seg.project.name,
                color:     getProjectColor(seg.project.id),
                completed: getProjectStatus(seg.project.id) === 'completed',
                projectId: seg.project.id,
            });
        });
    });

    // Task bars (processed after projects so projTracks count is final)
    taskSegs.forEach((segs, row) => {
        const numTracks  = assignTracks(segs);
        if (!rowMaxTracks.has(row)) rowMaxTracks.set(row, { proj: 0, task: 0 });
        rowMaxTracks.get(row).task = numTracks;
        const projTracks = rowMaxTracks.get(row).proj;
        const projHeight = projTracks * (PROJECT_H + PROJECT_GAP);
        const betweenGap = projTracks > 0 ? BETWEEN_GAP : 0;
        if (!rowBarsMap.has(row)) rowBarsMap.set(row, []);
        segs.forEach(seg => {
            const startCol = seg.startIndex % 7;
            const endCol   = seg.endIndex   % 7;
            const topPx    = DAY_NUMBER_H + TOP_OFFSET + projHeight + betweenGap + seg.track * (TASK_H + TASK_GAP);
            const bColor   = PRIORITY_COLORS[seg.task.priority] || 'var(--accent-blue)';
            const tStart   = seg.hasValidStart ? seg.task.startDate : seg.task.endDate;
            const tEnd     = seg.hasValidEnd   ? seg.task.endDate   : seg.task.startDate;
            rowBarsMap.get(row).push({
                type: 'task',
                startCol, endCol, topPx, height: TASK_H,
                continuesLeft:  tStart < monthStartStr && seg.startIndex === firstDayIdx,
                continuesRight: tEnd   > monthEndStr   && seg.endIndex   === lastDayIdx,
                label:          seg.task.title,
                borderColor:    bColor,
                done:           seg.task.status === 'done',
                taskId:         seg.task.id,
                hasValidStart:  seg.hasValidStart,
                hasValidEnd:    seg.hasValidEnd,
                isFirstSegment: seg.isFirstSegment,
                isLastSegment:  seg.isLastSegment,
            });
        });
    });

    // Build output rows
    const rows = [];
    for (let r = 0; r < totalRows; r++) {
        const t  = rowMaxTracks.get(r) || { proj: 0, task: 0 };
        const pH = t.proj > 0 ? t.proj * (PROJECT_H + PROJECT_GAP) : 0;
        const tH = t.task > 0 ? t.task * (TASK_H    + TASK_GAP   ) : 0;
        const gH = (t.proj > 0 && t.task > 0) ? BETWEEN_GAP : 0;
        rows.push({
            rowIndex:     r,
            paddingTopPx: (t.proj > 0 || t.task > 0) ? pH + tH + gH + TOP_OFFSET : 0,
            bars:         rowBarsMap.get(r) || [],
        });
    }
    return rows;
}
