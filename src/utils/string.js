/**
 * String utility functions
 * Pure functions for string manipulation
 * No dependencies
 */

/**
 * Capitalize the first letter of a string
 * @param {string} value - String to capitalize
 * @returns {string} String with first letter capitalized
 *
 * @example
 * capitalizeFirst('hello') // Returns: 'Hello'
 * capitalizeFirst('HELLO') // Returns: 'HELLO'
 * capitalizeFirst('') // Returns: ''
 */
export function capitalizeFirst(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}
