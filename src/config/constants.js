/**
 * Application constants
 * Status, priority labels and orderings
 * No dependencies
 */

/**
 * Valid task statuses
 */
export const VALID_STATUSES = ['todo', 'progress', 'review', 'done'];

/**
 * Valid task priorities
 */
export const VALID_PRIORITIES = ['low', 'medium', 'high'];

/**
 * Human-readable status labels
 * Maps status values to display labels
 */
export const STATUS_LABELS = {
    todo: "To Do",
    progress: "In Progress",
    review: "In Review",
    done: "Done"
};

/**
 * Human-readable priority labels
 * Maps priority values to display labels
 */
export const PRIORITY_LABELS = {
    low: "Low",
    medium: "Medium",
    high: "High"
};

/**
 * Priority ordering for sorting (descending)
 * Higher number = higher priority
 * Used for sorting tasks high to low priority
 */
export const PRIORITY_ORDER = {
    high: 3,
    medium: 2,
    low: 1
};

/**
 * Status ordering for sorting (ascending)
 * Lower number = earlier in workflow
 * Used for sorting tasks by completion stage
 */
export const STATUS_ORDER = {
    done: 1,
    progress: 2,
    review: 3,
    todo: 4
};

/**
 * All priority options for dropdowns
 */
export const PRIORITY_OPTIONS = [
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" }
];

/**
 * Priority color mappings for visual indicators
 */
export const PRIORITY_COLORS = {
    high: "var(--accent-red)",
    medium: "var(--accent-amber)",
    low: "var(--accent-green)"
};
