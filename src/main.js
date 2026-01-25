// Main entry point for Nautilus after modularization
// Performance: Track module load time using earliest known page start
const NAV_START = (typeof window !== 'undefined' && typeof window.__pageLoadStart === 'number')
    ? window.__pageLoadStart
    : performance.now();

import { initializeEventDelegation } from '../app.js';
import { logPerformanceMilestone, isDebugLogsEnabled } from './utils/debug.js';

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
    // Do NOT call init() here. Auth.js calls initializeApp (= init) when user is verified
    // (completeLogin). Calling init on DOMContentLoaded caused a race: init started loading
    // data, completeLogin awaited init but got early return (isInitialized), showed app
    // before data loaded → user saw zeros then 1–3s later real data. Single init path only.
});
