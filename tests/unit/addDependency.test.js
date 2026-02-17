/**
 * Unit tests for addDependency function
 * Task 2.1: Validate task existence and create dependency relationships
 */

import { addDependency } from '../../src/services/dependencyService.js';

console.log('\n=== ADD DEPENDENCY UNIT TESTS ===\n');

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

// Test data
const tasks = [
    { id: 1, title: 'Task 1', status: 'todo' },
    { id: 2, title: 'Task 2', status: 'progress' },
    { id: 3, title: 'Task 3', status: 'done' }
];

// Test 1: Successfully add a dependency
test('Add valid dependency between two existing tasks', () => {
    const dependencies = {};
    const result = addDependency(2, 1, dependencies, tasks);
    
    assertEquals(result.error, null, 'Should not return an error');
    assertEquals(result.dependencies['2'], [1], 'Should create dependency relationship');
});

// Test 2: Reject non-existent dependent task
test('Reject dependency when dependent task does not exist', () => {
    const dependencies = {};
    const result = addDependency(999, 1, dependencies, tasks);
    
    assertEquals(result.error, 'Task 999 does not exist', 'Should return error for non-existent dependent task');
    assertEquals(result.dependencies, {}, 'Should not modify dependencies');
});

// Test 3: Reject non-existent prerequisite task
test('Reject dependency when prerequisite task does not exist', () => {
    const dependencies = {};
    const result = addDependency(2, 999, dependencies, tasks);
    
    assertEquals(result.error, 'Task 999 does not exist', 'Should return error for non-existent prerequisite task');
    assertEquals(result.dependencies, {}, 'Should not modify dependencies');
});

// Test 4: Reject self-dependency
test('Reject task depending on itself', () => {
    const dependencies = {};
    const result = addDependency(1, 1, dependencies, tasks);
    
    assertEquals(result.error, 'A task cannot depend on itself', 'Should return error for self-dependency');
    assertEquals(result.dependencies, {}, 'Should not modify dependencies');
});

// Test 5: Add multiple prerequisites to same task
test('Add multiple prerequisites to the same task', () => {
    const dependencies = {};
    
    const result1 = addDependency(3, 1, dependencies, tasks);
    assertEquals(result1.error, null, 'First dependency should succeed');
    
    const result2 = addDependency(3, 2, result1.dependencies, tasks);
    assertEquals(result2.error, null, 'Second dependency should succeed');
    assertEquals(result2.dependencies['3'].sort(), [1, 2], 'Should have both prerequisites');
});

// Test 6: Idempotent - adding same dependency twice
test('Adding duplicate dependency is idempotent', () => {
    const dependencies = { '2': [1] };
    const result = addDependency(2, 1, dependencies, tasks);
    
    assertEquals(result.error, null, 'Should not return error for duplicate');
    assertEquals(result.dependencies['2'], [1], 'Should not create duplicate');
});

// Test 7: Detect circular dependency (A→B, B→A)
test('Reject circular dependency (direct cycle)', () => {
    const dependencies = { '2': [1] }; // Task 2 depends on Task 1
    const result = addDependency(1, 2, dependencies, tasks); // Try to make Task 1 depend on Task 2
    
    if (!result.error || !result.error.includes('cycle')) {
        throw new Error('Should return error about circular dependency');
    }
    assertEquals(result.dependencies, { '2': [1] }, 'Should not modify dependencies');
});

// Test 8: Detect circular dependency (A→B→C→A)
test('Reject circular dependency (indirect cycle)', () => {
    const dependencies = {
        '2': [1],  // Task 2 depends on Task 1
        '3': [2]   // Task 3 depends on Task 2
    };
    const result = addDependency(1, 3, dependencies, tasks); // Try to make Task 1 depend on Task 3
    
    if (!result.error || !result.error.includes('cycle')) {
        throw new Error('Should return error about circular dependency');
    }
});

// Test 9: Create dependency in empty graph
test('Create dependency in empty dependency graph', () => {
    const dependencies = {};
    const result = addDependency(2, 1, dependencies, tasks);
    
    assertEquals(result.error, null, 'Should succeed with empty graph');
    assertEquals(result.dependencies['2'], [1], 'Should create new entry');
});

// Test 10: Immutability - original dependencies unchanged
test('Original dependencies object is not mutated', () => {
    const dependencies = { '3': [1] };
    const original = JSON.stringify(dependencies);
    
    addDependency(2, 1, dependencies, tasks);
    
    assertEquals(JSON.stringify(dependencies), original, 'Original should be unchanged');
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
