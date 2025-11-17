/**
 * HTML utility functions
 * Pure functions for HTML escaping and sanitization
 * No dependencies
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML insertion
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(str) {
    return (str || "").replace(
        /[&<>"']/g,
        (m) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            }[m])
    );
}

/**
 * Sanitize user input by escaping HTML and trimming whitespace
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized string
 *
 * @example
 * sanitizeInput('  <b>Hello</b>  ')
 * // Returns: '&lt;b&gt;Hello&lt;/b&gt;'
 */
export function sanitizeInput(input) {
    if (!input) return '';
    return escapeHtml(String(input).trim());
}
