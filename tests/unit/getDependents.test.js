/**
 * Unit Tests for getDependents function
 * Tests the retrieval of dependent tasks for a given task
 */

import { getDependents } from '../../src/services/dependencyService.js';

console.log('\n=== GET DEPENDENTS UNIT TESTS ===\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        console.log(`✅ PASS: ${message}`);
    } else {
        testsFailed++;
        console.log(`❌ FAIL: ${message}`);
    }
}

function arrayEquals(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort((a, b) => a - b);
    const sorted2 = [...arr2].sort((a, b) => a - b);
    return sorted1.every((val, idx) => val === sorted2[idx]);
}

// Test 1: Get dependents for task with single dependent
console.log('Test 1: Task with single dependent');
const deps1 = { "5": [1] }; // Task 5 depends on Task 1
const result1 = getDependents(1, deps1); // Get tasks that depend on Task 1
assert(
    arrayEquals(result1, [5]),
    'Returns single dependent task'
);

// Test 2: Get dependents for task with multiple dependents
console.log('\nTest 2: Task with multiple dependents');
const deps2 = {
    "5": [1],
    "7": [1],
    "10": [1]
}; // Tasks 5, 7, and 10 all depend on Task 1
const result2 = getDependents(1, deps2);
assert(
    arrayEquals(result2, [5, 7, 10]),
    'Returns all dependent tasks'
);

// Test 3: Get dependents for task with no dependents
console.log('\nTest 3: Task with no dependents');
const deps3 = { "5": [1, 2] }; // Task 5 depends on Tasks 1 and 2
const result3 = getDependents(10, deps3); // Task 10 has no dependents
assert(
    result3.length === 0,
    'Returns empty array for task with no dependents'
);

// Test 4: Get dependents from empty dependency graph
console.log('\nTest 4: Empty dependency graph');
const deps4 = {};
const result4 = getDependents(5, deps4);
assert(
    result4.length === 0,
    'Returns empty array for empty graph'
);

// Test 5: Verify immutability - returned array is a copy
console.log('\nTest 5: Immutability check');
const deps5 = { "5": [1], "7": [1], "10": [1] };
const result5 = getDependents(1, deps5);
result5.push(999); // Modify the returned array
const result5Again = getDependents(1, deps5);
assert(
    !result5Again.includes(999) && result5Again.length === 3,
    'Returns a copy, not the original array'
);

// Test 6: Complex dependency graph
console.log('\nTest 6: Complex dependency graph');
const deps6 = {
    "5": [1, 2],    // Task 5 depends on 1 and 2
    "7": [5],       // Task 7 depends on 5
    "10": [3, 4, 5] // Task 10 depends on 3, 4, and 5
};
const result6a = getDependents(1, deps6);  // Tasks depending on 1
const result6b = getDependents(5, deps6);  // Tasks depending on 5
const result6c = getDependents(3, deps6);  // Tasks depending on 3
const result6d = getDependents(7, deps6);  // Tasks depending on 7
assert(
    arrayEquals(result6a, [5]) &&
    arrayEquals(result6b, [7, 10]) &&
    arrayEquals(result6c, [10]) &&
    arrayEquals(result6d, []),
    'Correctly retrieves dependents for different tasks in complex graph'
);

// Test 7: Task ID as number vs string key
console.log('\nTest 7: Task ID handling');
const deps7 = { "42": [10] }; // Task 42 depends on Task 10
const result7a = getDependents(10, deps7); // Number input
const result7b = getDependents("10", deps7); // String input
assert(
    arrayEquals(result7a, [42]) && arrayEquals(result7b, [42]),
    'Handles both number and string task IDs'
);

// Test 8: Task appears as prerequisite multiple times in same dependent
console.log('\nTest 8: Task as prerequisite in multiple dependencies');
const deps8 = {
    "5": [1, 2],
    "7": [1, 3],
    "10": [1, 4]
}; // Task 1 is prerequisite for tasks 5, 7, and 10
const result8 = getDependents(1, deps8);
assert(
    arrayEquals(result8, [5, 7, 10]) && result8.length === 3,
    'Returns each dependent task once even if prerequisite appears multiple times'
);

// Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);

if (testsFailed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
} else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
}
