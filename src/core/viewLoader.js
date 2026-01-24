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
        'dashboard': () => import('../views/=de67bf1d'),
        'kanban': () => import('../views/=e7e72a33'),
        'listView': () => import('../views/=afdc58f7'),
        'calendar': () => import('../views/=e3d7c2a9'),
        'projectsView': () => import('../views/=a5610e1e'),
        'taskDetails': () => import('../components/=980a836a'),
        'taskCard': () => import('../components/=901263b9'),
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
