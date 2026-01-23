/**
 * Validation utility functions
 * Pure functions for input validation
 * No dependencies
 */

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 *
 * @example
 * isValidEmailAddress('user@example.com') // Returns: true
 * isValidEmailAddress('invalid-email') // Returns: false
 * isValidEmailAddress('') // Returns: false
 */
export function isValidEmailAddress(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}
