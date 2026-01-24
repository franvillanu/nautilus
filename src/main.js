// Main entry point for Nautilus after modularization
import { initializeEventDelegation, init } from '../app.js?v=20260124-loading-perf-fix';

initializeEventDelegation();

document.addEventListener('DOMContentLoaded', () => {
    if (typeof init === 'function') {
        init();
    }
});
