/**
 * Task Details Component Module
 *
 * Pure computation functions for task details modal logic.
 * These functions handle mobile field organization and tag display.
 *
 * @module components/taskDetails
 */

/**
 * Determine which fields should be in General vs Details tab on mobile
 * @param {Object} task - Task object
 * @param {Object} options - Configuration options
 * @param {boolean} options.startDateWasEverSet - If start date was ever set
 * @param {boolean} options.endDateWasEverSet - If end date was ever set
 * @returns {Object} Field placement decisions
 */
export function calculateMobileFieldPlacement(task, options = {}) {
    const { startDateWasEverSet = false, endDateWasEverSet = false } = options;

    const hasTags = Array.isArray(task?.tags) && task.tags.length > 0;
    const hasStartDate = typeof task?.startDate === 'string' && task.startDate.trim() !== '';
    const hasEndDate = typeof task?.endDate === 'string' && task.endDate.trim() !== '';
    const hasLinks = Array.isArray(task?.attachments) && task.attachments.some(att =>
        att.type === 'link' || (att.url && att.type !== 'file')
    );

    // Start/End dates: Once set, ALWAYS stay in General (even if cleared)
    const startDateInGeneral = startDateWasEverSet || hasStartDate;
    const endDateInGeneral = endDateWasEverSet || hasEndDate;

    // Tags and Links: Move dynamically based on current value
    const tagsInGeneral = hasTags;
    const linksInGeneral = hasLinks;

    return {
        hasTags,
        hasStartDate,
        hasEndDate,
        hasLinks,
        startDateInGeneral,
        endDateInGeneral,
        tagsInGeneral,
        linksInGeneral
    };
}

/**
 * Determine if the Details tab should be hidden
 * Details tab is hidden only when BOTH Tags AND Links are filled
 * (Dates don't affect this since they stay in General regardless)
 * @param {Object} fieldState - Field state from calculateMobileFieldPlacement
 * @returns {boolean} True if Details tab should be hidden
 */
export function shouldHideDetailsTab(fieldState) {
    return fieldState.hasTags && fieldState.hasLinks;
}

/**
 * Generate HTML for a single tag with remove button
 * @param {string} tag - Tag name
 * @param {Object} options - Display options
 * @param {boolean} options.isMobile - Is mobile view
 * @param {Function} options.getTagColor - Function to get tag color
 * @param {Function} options.escapeHtml - HTML escape function
 * @returns {string} HTML string for the tag
 */
export function generateTagHTML(tag, options) {
    const { isMobile = false, getTagColor, escapeHtml } = options;

    const padding = isMobile ? '3px 6px' : '4px 8px';
    const fontSize = isMobile ? '11px' : '12px';
    const gap = isMobile ? '4px' : '4px';
    const buttonSize = isMobile ? '12px' : '14px';
    const lineHeight = isMobile ? '1.2' : '1.4';
    const color = getTagColor(tag);

    return `
        <span class="task-tag" style="background-color: ${color}; color: white; padding: ${padding}; border-radius: 4px; font-size: ${fontSize}; display: inline-flex; align-items: center; gap: ${gap}; line-height: ${lineHeight};">
            ${escapeHtml(tag.toUpperCase())}
            <button type="button" data-action="removeTag" data-param="${escapeHtml(tag)}" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: ${buttonSize}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: auto;">×</button>
        </span>
    `;
}

/**
 * Generate HTML for all tags display
 * @param {Array} tags - Array of tag names
 * @param {Object} options - Display options
 * @param {boolean} options.isMobile - Is mobile view
 * @param {Function} options.getTagColor - Function to get tag color
 * @param {Function} options.escapeHtml - HTML escape function
 * @param {string} options.noTagsText - Text to show when no tags
 * @returns {string} HTML string for tags display
 */
export function generateTagsDisplayHTML(tags, options) {
    const { noTagsText = 'No tags' } = options;

    if (!tags || tags.length === 0) {
        return `<span style="color: var(--text-muted); font-size: 13px;">${noTagsText}</span>`;
    }

    return tags.map(tag => generateTagHTML(tag, options)).join('');
}

/**
 * Get tag display options based on viewport
 * @param {number} viewportWidth - Current viewport width
 * @returns {Object} Display options for tags
 */
export function getTagDisplayOptions(viewportWidth) {
    const isMobile = viewportWidth <= 768;

    return {
        isMobile,
        padding: isMobile ? '3px 6px' : '4px 8px',
        fontSize: isMobile ? '11px' : '12px',
        gap: isMobile ? '4px' : '4px',
        buttonSize: isMobile ? '12px' : '14px',
        lineHeight: isMobile ? '1.2' : '1.4'
    };
}

/**
 * Determine initial date state for a task
 * Used to track if dates were ever set (for mobile field persistence)
 * @param {Object} task - Task object
 * @returns {Object} Initial date state
 */
export function getInitialDateState(task) {
    const hasStartDate = typeof task?.startDate === 'string' && task.startDate.trim() !== '';
    const hasEndDate = typeof task?.endDate === 'string' && task.endDate.trim() !== '';

    return {
        startDateWasEverSet: !!task?.startDateWasEverSet || hasStartDate,
        endDateWasEverSet: !!task?.endDateWasEverSet || hasEndDate
    };
}

/**
 * Calculate task navigation context info
 * @param {Object} navigationContext - Navigation context object
 * @param {number} currentTaskId - Current task ID
 * @returns {Object} Navigation info with prev/next task IDs
 */
export function calculateTaskNavigation(navigationContext, currentTaskId) {
    if (!navigationContext || !navigationContext.taskIds || navigationContext.taskIds.length === 0) {
        return {
            hasPrev: false,
            hasNext: false,
            prevTaskId: null,
            nextTaskId: null,
            currentIndex: -1,
            totalTasks: 0
        };
    }

    const { taskIds } = navigationContext;
    const currentIndex = taskIds.indexOf(currentTaskId);

    if (currentIndex === -1) {
        return {
            hasPrev: false,
            hasNext: false,
            prevTaskId: null,
            nextTaskId: null,
            currentIndex: -1,
            totalTasks: taskIds.length
        };
    }

    return {
        hasPrev: currentIndex > 0,
        hasNext: currentIndex < taskIds.length - 1,
        prevTaskId: currentIndex > 0 ? taskIds[currentIndex - 1] : null,
        nextTaskId: currentIndex < taskIds.length - 1 ? taskIds[currentIndex + 1] : null,
        currentIndex,
        totalTasks: taskIds.length
    };
}
