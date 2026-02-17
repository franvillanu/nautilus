/**
 * Unit tests for removeDependency function
 * Task 3.1: Remove single dependency relationship
 */

import { removeDependency } from '../../src/services/dependencyService.js';

console.log('\n=== REMOVE DEPENDENCY UNIT TESTS ===\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${description}`);
        passed++;
    } catch (error) {
        console.log(`❌ FAIL: ${description}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

function assertEquals(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\n   Expected: ${JSON.stringify(expected)}\n   Actual: ${JSON.stringify(actual)}`);
    }
}

// Test 1: Remove existing dependency
test('Remove existing dependency relationship', () => {
    const dependencies = { '2': [1, 3] };
    const result = removeDependency(2, 1, dependencies);
    
    assertEquals(result.dependencies['2'], [3], 'Should remove prerequisite 1, keep 3');
});

// Test 2: Remove last prerequisite (key should be deleted)
test('Remove last prerequisite removes the key', () => {
    const dependencies = { '2': [1] };
    const result = removeDependency(2, 1, dependencies);
    
    assertEquals(result.dependencies['2'], undefined, 'Should remove key when no prerequisites remain');
});

// Test 3: Remove non-existent dependency (no error)
test('Remove non-existent dependency is safe', () => {
    const dependencies = { '2': [1] };
    const result = removeDependency(2, 3, dependencies);
    
    assertEquals(result.dependencies['2'], [1], 'Should keep existing dependencies unchanged');
});

// Test 4: Remove from non-existent task (no error)
test('Remove from non-existent task is safe', () => {
    const dependencies = { '2': [1] };
    const result = removeDependency(5, 1, dependencies);
    
    assertEquals(result.dependencies, { '2': [1] }, 'Should keep dependencies unchanged');
});

// Test 5: Remove from empty dependencies
test('Remove from empty dependencies is safe', () => {
    const dependencies = {};
    const result = removeDependency(2, 1, dependencies);
    
    assertEquals(result.dependencies, {}, 'Should return empty dependencies');
});

// Test 6: Immutability - original dependencies unchanged
test('Original dependencies object is not mutated', () => {
    const dependencies = { '2': [1, 3], '5': [2] };
    const original = JSON.stringify(dependencies);
    
    removeDependency(2, 1, dependencies);
    
    assertEquals(JSON.stringify(dependencies), original, 'Original should be unchanged');
});

// Test 7: Remove one dependency preserves others
test('Removing one dependency preserves other dependencies', () => {
    const dependencies = { '2': [1, 3], '5': [2, 4] };
    const result = removeDependency(2, 1, dependencies);
    
    assertEquals(result.dependencies['2'], [3], 'Should remove only specified dependency from task 2');
    assertEquals(result.dependencies['5'], [2, 4], 'Should preserve dependencies for other tasks');
});

// Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
} else {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    process.exit(0);
}
