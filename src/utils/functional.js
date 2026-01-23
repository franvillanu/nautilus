/**
 * Functional utility functions
 * Pure functions for common operations
 * No dependencies
 */

/**
 * Creates a debounced version of a function that delays execution
 * until after `wait` milliseconds have elapsed since the last call.
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Milliseconds to wait before executing
 * @returns {Function} Debounced function
 *
 * @example
 * const debouncedSearch = debounce(search, 300);
 * input.addEventListener('input', debouncedSearch);
 */
export function debounce(fn, wait) {
    let t = null;
    return function(...args) {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * Toggle an item in a Set - adds if `on` is true, removes if false
 * @param {Set} setObj - The Set to modify
 * @param {*} val - Value to add or remove
 * @param {boolean} on - Whether to add (true) or remove (false)
 *
 * @example
 * const selected = new Set();
 * toggleSet(selected, 'item1', true);  // adds 'item1'
 * toggleSet(selected, 'item1', false); // removes 'item1'
 */
export function toggleSet(setObj, val, on) {
    if (on) setObj.add(val);
    else setObj.delete(val);
}
