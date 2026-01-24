// Main entry point for Nautilus after modularization
// Performance: Track module load time using earliest known page start
const NAV_START = (typeof window !== 'undefined' && typeof window.__pageLoadStart === 'number')
    ? window.__pageLoadStart
    : performance.now();

import { initializeEventDelegation, init } from '../app.js?v=20260124-cache-swr';
import { logPerformanceMilestone, isDebugLogsEnabled } from './utils/debug.js?v=20260124-perf-mark';

// Log module loading complete (time until main.js executes)
const MAIN_JS_MODULES_LOADED = performance.now();
if (isDebugLogsEnabled()) {
    console.log(`[perf] main.js: executed after ${Math.round(MAIN_JS_MODULES_LOADED - NAV_START)}ms since nav start`);
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
