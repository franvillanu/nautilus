/**
 * Unit tests for removeDependenciesForTask function
 * Task 3.4: Remove all dependencies involving a task when it's deleted
 */

import { removeDependenciesForTask } from '../../src/services/dependencyService.js';

console.log('\n=== REMOVE DEPENDENCIES FOR TASK UNIT TESTS ===\n');

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

// Test 1: Remove task that has prerequisites
test('Remove task that has prerequisites', () => {
    const dependencies = {
        '2': [1],      // Task 2 depends on Task 1
        '3': [1, 2]    // Task 3 depends on Tasks 1 and 2
    };
    
    const result = removeDependenciesForTask(2, dependencies);
    
    // Task 2's entry should be removed
    // Task 3 should no longer have Task 2 as a prerequisite
    assertEquals(result.dependencies, {
        '3': [1]
    }, 'Should remove task as dependent and as prerequisite');
});

// Test 2: Remove task that is a prerequisite for others
test('Remove task that is a prerequisite for other tasks', () => {
    const dependencies = {
        '2': [1],      // Task 2 depends on Task 1
        '3': [1],      // Task 3 depends on Task 1
        '4': [1, 2]    // Task 4 depends on Tasks 1 and 2
    };
    
    const result = removeDependenciesForTask(1, dependencies);
    
    // Task 1 should be removed from all prerequisite lists
    assertEquals(result.dependencies, {
        '4': [2]
    }, 'Should remove task from all prerequisite lists');
});

// Test 3: Remove task with no dependencies
test('Remove task with no dependencies', () => {
    const dependencies = {
        '2': [1],
        '3': [2]
    };
    
    const result = removeDependenciesForTask(5, dependencies);
    
    // Nothing should change
    assertEquals(result.dependencies, {
        '2': [1],
        '3': [2]
    }, 'Should leave dependencies unchanged');
});

// Test 4: Remove task from empty dependency graph
test('Remove task from empty dependency graph', () => {
    const dependencies = {};
    
    const result = removeDependenciesForTask(1, dependencies);
    
    assertEquals(result.dependencies, {}, 'Should return empty graph');
});

// Test 5: Remove task that causes empty prerequisite lists
test('Remove task that causes other tasks to have no prerequisites', () => {
    const dependencies = {
        '2': [1],      // Task 2 depends only on Task 1
        '3': [1]       // Task 3 depends only on Task 1
    };
    
    const result = removeDependenciesForTask(1, dependencies);
    
    // Both Task 2 and Task 3 should be removed since they have no prerequisites left
    assertEquals(result.dependencies, {}, 'Should remove entries with empty prerequisite lists');
});

// Test 6: Remove task in complex graph
test('Remove task in complex dependency graph', () => {
    const dependencies = {
        '2': [1],
        '3': [1, 2],
        '4': [2, 3],
        '5': [3, 4]
    };
    
    const result = removeDependenciesForTask(3, dependencies);
    
    // Task 3's entry should be removed
    // Task 4 should only depend on Task 2
    // Task 5 should only depend on Task 4
    assertEquals(result.dependencies, {
        '2': [1],
        '4': [2],
        '5': [4]
    }, 'Should correctly update complex graph');
});

// Test 7: Immutability - original dependencies unchanged
test('Original dependencies object is not mutated', () => {
    const dependencies = {
        '2': [1],
        '3': [1, 2]
    };
    const original = JSON.stringify(dependencies);
    
    removeDependenciesForTask(1, dependencies);
    
    assertEquals(JSON.stringify(dependencies), original, 'Original should be unchanged');
});

// Test 8: Remove task that is both dependent and prerequisite
test('Remove task that is both dependent and prerequisite', () => {
    const dependencies = {
        '2': [1],      // Task 2 depends on Task 1
        '3': [2],      // Task 3 depends on Task 2
        '4': [2, 3]    // Task 4 depends on Tasks 2 and 3
    };
    
    const result = removeDependenciesForTask(2, dependencies);
    
    // Task 2's entry should be removed
    // Task 3 loses its only prerequisite, so it's removed
    // Task 4 should only depend on Task 3
    assertEquals(result.dependencies, {
        '4': [3]
    }, 'Should remove task from both roles');
});

// Test 9: Remove task with multiple prerequisites
test('Remove task with multiple prerequisites', () => {
    const dependencies = {
        '4': [1, 2, 3],  // Task 4 depends on Tasks 1, 2, and 3
        '5': [4]         // Task 5 depends on Task 4
    };
    
    const result = removeDependenciesForTask(4, dependencies);
    
    // Task 4's entry should be removed
    // Task 5 should have no prerequisites left
    assertEquals(result.dependencies, {}, 'Should remove task with multiple prerequisites');
});

// Test 10: Remove task that appears multiple times as prerequisite
test('Remove task that is prerequisite for multiple tasks', () => {
    const dependencies = {
        '2': [1],
        '3': [1],
        '4': [1],
        '5': [1, 2]
    };
    
    const result = removeDependenciesForTask(1, dependencies);
    
    // Task 1 should be removed from all prerequisite lists
    assertEquals(result.dependencies, {
        '5': [2]
    }, 'Should remove task from all occurrences');
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
