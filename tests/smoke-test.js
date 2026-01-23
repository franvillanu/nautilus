/**
 * Smoke Test Suite
 * Quick automated verification that core functionality works after modularization
 * 
 * Run in browser console after app loads:
 *   await import('./tests/smoke-test.js');
 * 
 * Or run with Node.js (limited - no DOM):
 *   node tests/smoke-test.js
 */

const isNode = typeof window === 'undefined';

// Test utilities
let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`✅ ${message}`);
    } else {
        failed++;
        errors.push(message);
        console.log(`❌ ${message}`);
    }
}

function assertExists(value, name) {
    assert(value !== undefined && value !== null, `${name} exists`);
}

function assertFunction(value, name) {
    assert(typeof value === 'function', `${name} is a function`);
}

// ============================================================================
// MODULE IMPORT TESTS
// ============================================================================

async function testModuleImports() {
    console.log('\n📦 Testing Module Imports...\n');
    
    try {
        // Test debug module
        const debug = await import('../src/utils/debug.js');
        assertFunction(debug.applyDebugLogSetting, 'debug.applyDebugLogSetting');
        assertFunction(debug.isDebugLogsEnabled, 'debug.isDebugLogsEnabled');
        assertFunction(debug.logDebug, 'debug.logDebug');
        assertFunction(debug.debugTimeStart, 'debug.debugTimeStart');
        assertFunction(debug.debugTimeEnd, 'debug.debugTimeEnd');
        
        // Test html module
        const html = await import('../src/utils/html.js');
        assertFunction(html.escapeHtml, 'html.escapeHtml');
        assertFunction(html.sanitizeInput, 'html.sanitizeInput');
        
        // Test date module
        const date = await import('../src/utils/date.js');
        assertFunction(date.formatDate, 'date.formatDate');
        assertFunction(date.looksLikeDMY, 'date.looksLikeDMY');
        assertFunction(date.looksLikeISO, 'date.looksLikeISO');
        assertFunction(date.toISOFromDMY, 'date.toISOFromDMY');
        
        // Test colors module
        const colors = await import('../src/utils/colors.js');
        assertExists(colors.TAG_COLORS, 'colors.TAG_COLORS');
        assertExists(colors.PROJECT_COLORS, 'colors.PROJECT_COLORS');
        
        // Test constants module
        const constants = await import('../src/config/constants.js');
        assertExists(constants.VALID_STATUSES, 'constants.VALID_STATUSES');
        assertExists(constants.VALID_PRIORITIES, 'constants.VALID_PRIORITIES');
        assertExists(constants.STATUS_LABELS, 'constants.STATUS_LABELS');
        assertExists(constants.PRIORITY_LABELS, 'constants.PRIORITY_LABELS');
        
    } catch (e) {
        failed++;
        errors.push(`Module import failed: ${e.message}`);
        console.log(`❌ Module import failed: ${e.message}`);
    }
}

// ============================================================================
// FUNCTION BEHAVIOR TESTS
// ============================================================================

async function testFunctionBehavior() {
    console.log('\n🔬 Testing Function Behavior...\n');
    
    try {
        // Test escapeHtml
        const { escapeHtml } = await import('../src/utils/html.js');
        assert(
            escapeHtml('<script>') === '&lt;script&gt;',
            'escapeHtml escapes < and >'
        );
        assert(
            escapeHtml('"test"') === '&quot;test&quot;',
            'escapeHtml escapes quotes'
        );
        assert(
            escapeHtml(null) === '',
            'escapeHtml handles null'
        );
        
        // Test date functions
        const { looksLikeDMY, looksLikeISO, toISOFromDMY, formatDate } = await import('../src/utils/date.js');
        assert(
            looksLikeDMY('25/12/2025') === true,
            'looksLikeDMY recognizes DD/MM/YYYY'
        );
        assert(
            looksLikeISO('2025-12-25') === true,
            'looksLikeISO recognizes YYYY-MM-DD'
        );
        assert(
            toISOFromDMY('25/12/2025') === '2025-12-25',
            'toISOFromDMY converts correctly'
        );
        assert(
            formatDate('2025-12-25') === '25/12/2025',
            'formatDate converts ISO to DD/MM/YYYY'
        );
        
        // Test debug functions (should not throw)
        const { isDebugLogsEnabled, logDebug } = await import('../src/utils/debug.js');
        assert(
            typeof isDebugLogsEnabled() === 'boolean',
            'isDebugLogsEnabled returns boolean'
        );
        // logDebug should not throw even when disabled
        try {
            logDebug('test', 'message');
            assert(true, 'logDebug does not throw');
        } catch (e) {
            assert(false, 'logDebug does not throw');
        }
        
    } catch (e) {
        failed++;
        errors.push(`Function test failed: ${e.message}`);
        console.log(`❌ Function test failed: ${e.message}`);
    }
}

// ============================================================================
// BROWSER-ONLY TESTS
// ============================================================================

async function testBrowserGlobals() {
    if (isNode) {
        console.log('\n⏭️ Skipping browser tests (running in Node.js)\n');
        return;
    }
    
    console.log('\n🌐 Testing Browser Globals...\n');
    
    // Test that app.js globals are available
    assertExists(window.tasks, 'window.tasks');
    assertExists(window.projects, 'window.projects');
    assertFunction(window.saveData, 'window.saveData');
    assertFunction(window.loadData, 'window.loadData');
    
    // Test that key functions are available
    if (typeof renderTasks === 'function') {
        assertFunction(renderTasks, 'renderTasks');
    }
    if (typeof renderProjects === 'function') {
        assertFunction(renderProjects, 'renderProjects');
    }
    if (typeof showNotification === 'function') {
        assertFunction(showNotification, 'showNotification');
    }
}

// ============================================================================
// DOM TESTS (Browser only)
// ============================================================================

async function testDOMElements() {
    if (isNode) {
        console.log('\n⏭️ Skipping DOM tests (running in Node.js)\n');
        return;
    }
    
    console.log('\n🖼️ Testing DOM Elements...\n');
    
    // Test critical DOM elements exist
    assertExists(document.getElementById('dashboard'), 'Dashboard page');
    assertExists(document.getElementById('tasks'), 'Tasks page');
    assertExists(document.getElementById('projects'), 'Projects page');
    assertExists(document.getElementById('task-modal'), 'Task modal');
    assertExists(document.getElementById('project-modal'), 'Project modal');
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           NAUTILUS SMOKE TEST SUITE                        ║');
    console.log('║  Quick verification after modularization                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    await testModuleImports();
    await testFunctionBehavior();
    await testBrowserGlobals();
    await testDOMElements();
    
    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
        console.log('\n❌ FAILURES:');
        errors.forEach(e => console.log(`   - ${e}`));
    } else {
        console.log('\n✅ All tests passed!');
    }
    console.log('════════════════════════════════════════════════════════════\n');
    
    return { passed, failed, errors };
}

// Auto-run if imported as module
runAllTests();

export { runAllTests, testModuleImports, testFunctionBehavior };
