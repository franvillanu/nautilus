/**
 * View Loader - Lazy loading for view modules
 *
 * Dynamically imports view modules only when needed,
 * reducing initial load time.
 */

// Cache for loaded modules
const viewCache = new Map();

/**
 * Lazy load a view module
 * @param {string} viewName - Name of the view to load
 * @returns {Promise<Object>} - Module exports
 */
export async function loadView(viewName) {
    if (viewCache.has(viewName)) {
        return viewCache.get(viewName);
    }

    const viewMap = {
        'dashboard': () => import('../views/dashboard.js'),
        'kanban': () => import('../views/kanban.js'),
        'listView': () => import('../views/listView.js'),
        'calendar': () => import('../views/calendar.js'),
        'projectsView': () => import('../views/projectsView.js'),
        'taskDetails': () => import('../components/taskDetails.js'),
        'taskCard': () => import('../components/taskCard.js'),
    };

    const loader = viewMap[viewName];
    if (!loader) {
        throw new Error(`Unknown view: ${viewName}`);
    }

    const module = await loader();
    viewCache.set(viewName, module);
    return module;
}

/**
 * Preload a view module without blocking
 * @param {string} viewName - Name of the view to preload
 */
export function preloadView(viewName) {
    if (!viewCache.has(viewName)) {
        loadView(viewName).catch(() => {
            // Silently ignore preload errors
        });
    }
}

/**
 * Check if a view is already loaded
 * @param {string} viewName - Name of the view
 * @returns {boolean}
 */
export function isViewLoaded(viewName) {
    return viewCache.has(viewName);
}
