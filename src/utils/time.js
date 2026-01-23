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
