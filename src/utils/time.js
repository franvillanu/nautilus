/**
 * Time utility functions
 * Pure functions for time manipulation (HH:MM format)
 * No dependencies
 */

/**
 * Normalize a time string to HH:MM format
 * @param {string} value - Time string to normalize
 * @returns {string} Normalized time string or empty string if invalid
 *
 * @example
 * normalizeHHMM('9:05') // Returns: '09:05'
 * normalizeHHMM('23:59') // Returns: '23:59'
 * normalizeHHMM('invalid') // Returns: ''
 */
export function normalizeHHMM(value) {
    if (!value || typeof value !== "string") return "";
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return "";
    if (hours < 0 || hours > 23) return "";
    if (minutes < 0 || minutes > 59) return "";
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Snap a time to the nearest step interval
 * @param {string} hhmm - Time string in HH:MM format
 * @param {number} stepMinutes - Step interval in minutes
 * @returns {string} Snapped time string or empty string if invalid
 *
 * @example
 * snapHHMMToStep('09:07', 15) // Returns: '09:00'
 * snapHHMMToStep('09:08', 15) // Returns: '09:15'
 */
export function snapHHMMToStep(hhmm, stepMinutes) {
    const normalized = normalizeHHMM(hhmm);
    if (!normalized) return "";
    const [hoursStr, minutesStr] = normalized.split(":");
    const total = Number(hoursStr) * 60 + Number(minutesStr);
    const step = Number(stepMinutes) || 1;
    const snapped = Math.round(total / step) * step;
    const wrapped = ((snapped % (24 * 60)) + (24 * 60)) % (24 * 60);
    const outHours = Math.floor(wrapped / 60);
    const outMinutes = wrapped % 60;
    return `${String(outHours).padStart(2, "0")}:${String(outMinutes).padStart(2, "0")}`;
}

/**
 * Convert HH:MM time string to total minutes
 * @param {string} hhmm - Time string in HH:MM format
 * @returns {number|null} Total minutes or null if invalid
 *
 * @example
 * hhmmToMinutes('09:30') // Returns: 570
 * hhmmToMinutes('00:00') // Returns: 0
 * hhmmToMinutes('invalid') // Returns: null
 */
export function hhmmToMinutes(hhmm) {
    const normalized = normalizeHHMM(hhmm);
    if (!normalized) return null;
    const [hoursStr, minutesStr] = normalized.split(":");
    return Number(hoursStr) * 60 + Number(minutesStr);
}

/**
 * Convert total minutes to HH:MM time string
 * @param {number} totalMinutes - Total minutes (0-1439)
 * @returns {string} Time string in HH:MM format
 *
 * @example
 * minutesToHHMM(570) // Returns: '09:30'
 * minutesToHHMM(0) // Returns: '00:00'
 * minutesToHHMM(1439) // Returns: '23:59'
 */
export function minutesToHHMM(totalMinutes) {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Number(totalMinutes)));
    const hours = Math.floor(clamped / 60);
    const minutes = clamped % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Clamp a time value to a range
 * @param {string} hhmm - Time string to clamp
 * @param {string} startHHMM - Range start time
 * @param {string} endHHMM - Range end time
 * @returns {string} Clamped time string or empty string if invalid
 *
 * @example
 * clampHHMMToRange('08:00', '09:00', '17:00') // Returns: '09:00'
 * clampHHMMToRange('12:00', '09:00', '17:00') // Returns: '12:00'
 * clampHHMMToRange('18:00', '09:00', '17:00') // Returns: '17:00'
 */
export function clampHHMMToRange(hhmm, startHHMM, endHHMM) {
    const valueMinutes = hhmmToMinutes(hhmm);
    const startMinutes = hhmmToMinutes(startHHMM);
    const endMinutes = hhmmToMinutes(endHHMM);
    if (valueMinutes == null || startMinutes == null || endMinutes == null) return "";
    if (valueMinutes < startMinutes) return startHHMM;
    if (valueMinutes > endMinutes) return endHHMM;
    return hhmm;
}

/**
 * Get cutoff timestamp for "updated within" filter
 * @param {string} value - Filter value ('5m', '30m', '24h', 'week', 'month', 'all')
 * @returns {number|null} Cutoff timestamp in milliseconds, or null for 'all'
 *
 * @example
 * getKanbanUpdatedCutoffTime('5m')  // Returns: Date.now() - 5 minutes
 * getKanbanUpdatedCutoffTime('all') // Returns: null
 */
export function getKanbanUpdatedCutoffTime(value) {
    const now = Date.now();
    switch (value) {
        case '5m': return now - 5 * 60 * 1000;
        case '30m': return now - 30 * 60 * 1000;
        case '24h': return now - 24 * 60 * 60 * 1000;
        case 'week': return now - 7 * 24 * 60 * 60 * 1000;
        case 'month': return now - 30 * 24 * 60 * 60 * 1000;
        case 'all':
        default:
            return null;
    }
}

/**
 * Get the updated timestamp from a task object
 * @param {Object} task - Task object with updatedAt, createdAt, or createdDate
 * @returns {number} Timestamp in milliseconds, or 0 if invalid
 *
 * @example
 * getTaskUpdatedTime({ updatedAt: '2024-01-15T10:30:00Z' }) // Returns: timestamp
 * getTaskUpdatedTime({}) // Returns: 0
 */
export function getTaskUpdatedTime(task) {
    const raw = (task && (task.updatedAt || task.createdAt || task.createdDate)) || "";
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? time : 0;
}

/**
 * Format a task's updated/created date for display
 * @param {Object} task - Task object with updatedAt, createdAt, or createdDate
 * @returns {string} Formatted date string or empty string if invalid
 *
 * @example
 * formatTaskUpdatedDateTime({ updatedAt: '2024-01-15T10:30:00Z' })
 * // Returns: '2024/01/15, 10:30' (locale-dependent)
 */
export function formatTaskUpdatedDateTime(task) {
    const raw = (task && (task.updatedAt || task.createdAt || task.createdDate)) || "";
    const d = new Date(raw);
    const t = d.getTime();
    if (!Number.isFinite(t) || t === 0) return "";
    try {
        return d.toLocaleString(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    } catch (e) {
        return d.toISOString().slice(0, 16).replace("T", " ");
    }
}
