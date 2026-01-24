// Main entry point for Nautilus after modularization
// Performance: Track module load time
const MAIN_JS_START = performance.now();

import { initializeEventDelegation, init } from '../app.js?v=20260124-perf-logs';
import { logPerformanceMilestone, isDebugLogsEnabled } from './utils/debug.js?v=20260124-perf-logs';

// Log module loading complete
const MAIN_JS_MODULES_LOADED = performance.now();
if (isDebugLogsEnabled()) {
    console.log(`[perf] main.js: modules imported in ${Math.round(MAIN_JS_MODULES_LOADED - MAIN_JS_START)}ms`);
}

initializeEventDelegation();
if (isDebugLogsEnabled()) {
    logPerformanceMilestone('event-delegation-setup');
}

document.addEventListener('DOMContentLoaded', () => {
    if (isDebugLogsEnabled()) {
        logPerformanceMilestone('dom-content-loaded');
    }
    if (typeof init === 'function') {
        init();
    }
});
