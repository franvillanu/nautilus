/**
 * Phase 1 Module Validation Test
 *
 * Validates that all Phase 1 modules:
 * - Export correctly
 * - Have working functions
 * - Constants are accessible
 * - No runtime errors
 *
 * Usage:
 *   Open browser console and run:
 *   await import('./tests/phase1-validation.js')
 */

console.log('🧪 Phase 1 Module Validation Starting...\n');

let passed = 0;
let failed = 0;

// Test 1: HTML Utils Module
try {
    const htmlModule = await import('../src/utils/html.js');

    // Test escapeHtml
    const testHtml = '<script>alert("xss")</script>';
    const escaped = htmlModule.escapeHtml(testHtml);
    if (escaped === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;') {
        console.log('✅ HTML utils: escapeHtml works');
        passed++;
    } else {
        console.error('❌ HTML utils: escapeHtml failed');
        failed++;
    }

    // Test sanitizeInput
    const sanitized = htmlModule.sanitizeInput('  <b>test</b>  ');
    if (sanitized === '&lt;b&gt;test&lt;/b&gt;') {
        console.log('✅ HTML utils: sanitizeInput works');
        passed++;
    } else {
        console.error('❌ HTML utils: sanitizeInput failed');
        failed++;
    }
} catch (err) {
    console.error('❌ HTML utils module failed to load:', err.message);
    failed += 2;
}

// Test 2: Date Utils Module
try {
    const dateModule = await import('../src/utils/date.js');

    // Test formatDate
    const formatted = dateModule.formatDate('2025-12-25');
    if (formatted === '25/12/2025') {
        console.log('✅ Date utils: formatDate works');
        passed++;
    } else {
        console.error('❌ Date utils: formatDate failed, got:', formatted);
        failed++;
    }

    // Test toISOFromDMY
    const iso = dateModule.toISOFromDMY('25/12/2025');
    if (iso === '2025-12-25') {
        console.log('✅ Date utils: toISOFromDMY works');
        passed++;
    } else {
        console.error('❌ Date utils: toISOFromDMY failed');
        failed++;
    }

    // Test formatDatePretty
    const pretty = dateModule.formatDatePretty('2025-12-25');
    if (pretty.includes('Dec') && pretty.includes('25')) {
        console.log('✅ Date utils: formatDatePretty works');
        passed++;
    } else {
        console.error('❌ Date utils: formatDatePretty failed');
        failed++;
    }
} catch (err) {
    console.error('❌ Date utils module failed to load:', err.message);
    failed += 3;
}

// Test 3: Colors Module
try {
    const colorsModule = await import('../src/utils/colors.js');

    // Test TAG_COLORS
    if (Array.isArray(colorsModule.TAG_COLORS) && colorsModule.TAG_COLORS.length === 16) {
        console.log('✅ Colors: TAG_COLORS loaded (16 colors)');
        passed++;
    } else {
        console.error('❌ Colors: TAG_COLORS invalid');
        failed++;
    }

    // Test PROJECT_COLORS
    if (Array.isArray(colorsModule.PROJECT_COLORS) && colorsModule.PROJECT_COLORS.length === 15) {
        console.log('✅ Colors: PROJECT_COLORS loaded (15 colors)');
        passed++;
    } else {
        console.error('❌ Colors: PROJECT_COLORS invalid');
        failed++;
    }

    // Verify all colors are hex format
    const allColorsValid = [...colorsModule.TAG_COLORS, ...colorsModule.PROJECT_COLORS]
        .every(color => /^#[0-9A-Fa-f]{6}$/.test(color));

    if (allColorsValid) {
        console.log('✅ Colors: All colors in valid hex format');
        passed++;
    } else {
        console.error('❌ Colors: Some colors have invalid format');
        failed++;
    }
} catch (err) {
    console.error('❌ Colors module failed to load:', err.message);
    failed += 3;
}

// Test 4: Constants Module
try {
    const constantsModule = await import('../src/config/constants.js');

    // Test VALID_STATUSES
    if (Array.isArray(constantsModule.VALID_STATUSES) && constantsModule.VALID_STATUSES.length === 4) {
        console.log('✅ Constants: VALID_STATUSES loaded');
        passed++;
    } else {
        console.error('❌ Constants: VALID_STATUSES invalid');
        failed++;
    }

    // Test STATUS_LABELS
    if (constantsModule.STATUS_LABELS.todo === "To Do" && constantsModule.STATUS_LABELS.done === "Done") {
        console.log('✅ Constants: STATUS_LABELS loaded');
        passed++;
    } else {
        console.error('❌ Constants: STATUS_LABELS invalid');
        failed++;
    }

    // Test PRIORITY_ORDER
    if (constantsModule.PRIORITY_ORDER.high === 3 && constantsModule.PRIORITY_ORDER.low === 1) {
        console.log('✅ Constants: PRIORITY_ORDER loaded');
        passed++;
    } else {
        console.error('❌ Constants: PRIORITY_ORDER invalid');
        failed++;
    }

    // Test PRIORITY_OPTIONS
    if (Array.isArray(constantsModule.PRIORITY_OPTIONS) && constantsModule.PRIORITY_OPTIONS.length === 3) {
        console.log('✅ Constants: PRIORITY_OPTIONS loaded');
        passed++;
    } else {
        console.error('❌ Constants: PRIORITY_OPTIONS invalid');
        failed++;
    }

    // Test PRIORITY_COLORS
    if (constantsModule.PRIORITY_COLORS.high && constantsModule.PRIORITY_COLORS.high.includes('accent-red')) {
        console.log('✅ Constants: PRIORITY_COLORS loaded');
        passed++;
    } else {
        console.error('❌ Constants: PRIORITY_COLORS invalid');
        failed++;
    }
} catch (err) {
    console.error('❌ Constants module failed to load:', err.message);
    failed += 5;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Phase 1 Validation Summary\n');
console.log(`  Total Tests: ${passed + failed}`);
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  Status: ${failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
console.log('='.repeat(50) + '\n');

if (failed === 0) {
    console.log('🎉 Phase 1 modules are working correctly!');
    console.log('\nAll extracted modules:');
    console.log('  • src/utils/html.js (2 functions)');
    console.log('  • src/utils/date.js (7 functions)');
    console.log('  • src/utils/colors.js (2 constants)');
    console.log('  • src/config/constants.js (9 constants)');
    console.log('\n✅ Ready for Phase 2');
} else {
    console.error('⚠️  Some tests failed. Review errors above.');
}

export const validationResult = {
    passed,
    failed,
    success: failed === 0
};
