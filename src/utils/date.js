/**
 * Date utility functions
 * Pure functions for date formatting and conversion
 */

import { capitalizeFirst } from './string.js';

/**
 * Check if string looks like DD/MM/YYYY or DD-MM-YYYY format
 * @param {string} s - Date string to check
 * @returns {boolean} True if matches DD/MM/YYYY pattern
 *
 * @example
 * looksLikeDMY('25/12/2025') // Returns: true
 * looksLikeDMY('2025-12-25') // Returns: false
 */
export function looksLikeDMY(s) {
    return (
        typeof s === "string" &&
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s.trim())
    );
}

/**
 * Check if string looks like ISO YYYY-MM-DD format
 * @param {string} s - Date string to check
 * @returns {boolean} True if matches ISO date pattern
 *
 * @example
 * looksLikeISO('2025-12-25') // Returns: true
 * looksLikeISO('25/12/2025') // Returns: false
 */
export function looksLikeISO(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

/**
 * Convert DD/MM/YYYY or DD-MM-YYYY to ISO YYYY-MM-DD
 * @param {string} s - Date string in DD/MM/YYYY format
 * @returns {string} ISO formatted date or original string if invalid
 *
 * @example
 * toISOFromDMY('25/12/2025') // Returns: '2025-12-25'
 * toISOFromDMY('invalid') // Returns: 'invalid'
 */
export function toISOFromDMY(s) {
    if (!looksLikeDMY(s)) return s || "";
    const parts = s.trim().split(/[\/\-]/);
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (!d || !m || !y || d > 31 || m > 12) return "";
    const dd = String(d).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}

/**
 * Convert ISO YYYY-MM-DD to DD/MM/YYYY
 * @param {string} s - ISO date string
 * @returns {string} DD/MM/YYYY formatted date or original string if invalid
 *
 * @example
 * toDMYFromISO('2025-12-25') // Returns: '25/12/2025'
 * toDMYFromISO('invalid') // Returns: 'invalid'
 */
export function toDMYFromISO(s) {
    if (!looksLikeISO(s)) return s || "";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
}

/**
 * Format date to DD/MM/YYYY for display
 * @param {string} s - Date string (ISO or DD/MM/YYYY)
 * @returns {string} Formatted date as DD/MM/YYYY
 *
 * @example
 * formatDate('2025-12-25') // Returns: '25/12/2025'
 * formatDate('25/12/2025') // Returns: '25/12/2025'
 * formatDate(null) // Returns: 'No date'
 */
export function formatDate(s) {
    if (!s) return "No date";

    // If it's already in dd/mm/yyyy format, just return it
    if (looksLikeDMY(s)) {
        return s.replace(/-/g, "/");
    }

    // If it's in ISO format, convert to dd/mm/yyyy
    if (looksLikeISO(s)) {
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
    }

    return "No date";
}

/**
 * Format date in human-friendly format (e.g. "Oct 10, 2025")
 * @param {string} s - Date string (ISO or DD/MM/YYYY)
 * @returns {string} Formatted date like "Dec 25, 2025"
 *
 * @example
 * formatDatePretty('2025-12-25') // Returns: 'Dec 25, 2025'
 * formatDatePretty(null) // Returns: 'No date'
 */
export function formatDatePretty(s, locale = undefined) {
    if (!s) return "No date";
    try {
        // ISO yyyy-mm-dd
        if (looksLikeISO(s)) {
            const [y, m, d] = s.split("-");
            const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
        }

        // dd/mm/yyyy or dd-mm-yyyy
        if (looksLikeDMY(s)) {
            const parts = s.split(/[\/\-]/);
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const y = parseInt(parts[2], 10);
            const date = new Date(y, m - 1, d);
            return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    } catch (e) {
        // fallthrough
    }
    return "No date";
}

/**
 * Format activity timestamp in relative time (Today, Yesterday, 3d ago, etc.)
 * @param {string} dateString - ISO timestamp
 * @returns {string} Relative time description
 *
 * @example
 * formatActivityDate(new Date().toISOString()) // Returns: 'Today'
 * formatActivityDate('2025-12-20') // Returns: 'Dec 20' (if not recent)
 */
export function formatActivityDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get localized day names for calendar display
 * @param {string} locale - Locale string (e.g., 'en-US', 'es-ES')
 * @returns {string[]} Array of 7 day names starting from Monday
 *
 * @example
 * getCalendarDayNames('en-US') // Returns: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
 */
export function getCalendarDayNames(locale) {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const baseDate = new Date(2024, 0, 1); // Monday
    return Array.from({ length: 7 }, (_, idx) => {
        const label = formatter.format(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + idx));
        return capitalizeFirst(label);
    });
}

/**
 * Format month and year for calendar header
 * @param {string} locale - Locale string (e.g., 'en-US', 'es-ES')
 * @param {number} year - Year number
 * @param {number} month - Month number (0-11)
 * @returns {string} Formatted month and year (e.g., 'January 2025')
 *
 * @example
 * formatCalendarMonthYear('en-US', 2025, 0) // Returns: 'January 2025'
 */
export function formatCalendarMonthYear(locale, year, month) {
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    return capitalizeFirst(formatter.format(new Date(year, month, 1)));
}

/**
 * Strip time component from a Date, returning only the date at midnight
 * @param {Date} d - Date object to strip time from
 * @returns {Date} New Date object with time set to 00:00:00
 *
 * @example
 * stripTime(new Date('2025-12-25T14:30:00')) // Returns: Date for 2025-12-25T00:00:00
 */
export function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
