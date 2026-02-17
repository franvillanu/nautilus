/**
 * Unit Tests for getPrerequisites function
 * Tests the retrieval of prerequisite tasks for a given task
 */

import { getPrerequisites } from '../../src/services/dependencyService.js';

console.log('\n=== GET PREREQUISITES UNIT TESTS ===\n');

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

// Test 1: Get prerequisites for task with single prerequisite
console.log('Test 1: Task with single prerequisite');
const deps1 = { "5": [1] };
const result1 = getPrerequisites(5, deps1);
assert(
    arrayEquals(result1, [1]),
    'Returns single prerequisite'
);

// Test 2: Get prerequisites for task with multiple prerequisites
console.log('\nTest 2: Task with multiple prerequisites');
const deps2 = { "10": [1, 2, 5] };
const result2 = getPrerequisites(10, deps2);
assert(
    arrayEquals(result2, [1, 2, 5]),
    'Returns all prerequisites'
);

// Test 3: Get prerequisites for task with no prerequisites
console.log('\nTest 3: Task with no prerequisites');
const deps3 = { "5": [1, 2] };
const result3 = getPrerequisites(10, deps3);
assert(
    result3.length === 0,
    'Returns empty array for task with no prerequisites'
);

// Test 4: Get prerequisites from empty dependency graph
console.log('\nTest 4: Empty dependency graph');
const deps4 = {};
const result4 = getPrerequisites(5, deps4);
assert(
    result4.length === 0,
    'Returns empty array for empty graph'
);

// Test 5: Verify immutability - returned array is a copy
console.log('\nTest 5: Immutability check');
const deps5 = { "5": [1, 2, 3] };
const result5 = getPrerequisites(5, deps5);
result5.push(999); // Modify the returned array
const result5Again = getPrerequisites(5, deps5);
assert(
    !result5Again.includes(999) && result5Again.length === 3,
    'Returns a copy, not the original array'
);

// Test 6: Multiple tasks in graph
console.log('\nTest 6: Multiple tasks in graph');
const deps6 = {
    "5": [1, 2],
    "7": [5],
    "10": [3, 4, 5]
};
const result6a = getPrerequisites(5, deps6);
const result6b = getPrerequisites(7, deps6);
const result6c = getPrerequisites(10, deps6);
assert(
    arrayEquals(result6a, [1, 2]) &&
    arrayEquals(result6b, [5]) &&
    arrayEquals(result6c, [3, 4, 5]),
    'Correctly retrieves prerequisites for different tasks'
);

// Test 7: Task ID as number vs string key
console.log('\nTest 7: Task ID handling');
const deps7 = { "42": [10, 20] };
const result7a = getPrerequisites(42, deps7); // Number input
const result7b = getPrerequisites("42", deps7); // String input
assert(
    arrayEquals(result7a, [10, 20]) && arrayEquals(result7b, [10, 20]),
    'Handles both number and string task IDs'
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
