/**
 * Task Card Component Module
 *
 * Pure computation functions for kanban task card rendering.
 *
 * @module components/taskCard
 */

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
