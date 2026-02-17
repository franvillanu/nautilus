/**
 * Unit tests for isTaskBlocked function
 * Task 5.1: Check if task is blocked by incomplete prerequisites
 */

import { isTaskBlocked, addDependency } from '../../src/services/dependencyService.js';

console.log('\n=== IS TASK BLOCKED UNIT TESTS ===\n');

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

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertFalse(condition, message) {
    if (condition) {
        throw new Error(message);
    }
}

// Test data
const tasks = [
    { id: 1, title: 'Task 1', status: 'done' },
    { id: 2, title: 'Task 2', status: 'progress' },
    { id: 3, title: 'Task 3', status: 'todo' },
    { id: 4, title: 'Task 4', status: 'done' },
    { id: 5, title: 'Task 5', status: 'todo' }
];

// Test 1: Task with no prerequisites is not blocked
test('Task with no prerequisites is not blocked', () => {
    const dependencies = {};
    const result = isTaskBlocked(1, dependencies, tasks);
    
    assertFalse(result.blocked, 'Task should not be blocked');
    assertEquals(result.blockingTasks, [], 'Should have no blocking tasks');
});

// Test 2: Task with completed prerequisite is not blocked
test('Task with completed prerequisite is not blocked', () => {
    const dependencies = { '2': [1] }; // Task 2 depends on Task 1 (done)
    const result = isTaskBlocked(2, dependencies, tasks);
    
    assertFalse(result.blocked, 'Task should not be blocked when prerequisite is done');
    assertEquals(result.blockingTasks, [], 'Should have no blocking tasks');
});

// Test 3: Task with incomplete prerequisite is blocked
test('Task with incomplete prerequisite is blocked', () => {
    const dependencies = { '5': [3] }; // Task 5 depends on Task 3 (todo)
    const result = isTaskBlocked(5, dependencies, tasks);
    
    assertTrue(result.blocked, 'Task should be blocked when prerequisite is not done');
    assertEquals(result.blockingTasks.length, 1, 'Should have one blocking task');
    assertEquals(result.blockingTasks[0].id, 3, 'Blocking task should be Task 3');
});

// Test 4: Task with multiple prerequisites - all completed
test('Task with multiple completed prerequisites is not blocked', () => {
    const dependencies = { '5': [1, 4] }; // Task 5 depends on Tasks 1 and 4 (both done)
    const result = isTaskBlocked(5, dependencies, tasks);
    
    assertFalse(result.blocked, 'Task should not be blocked when all prerequisites are done');
    assertEquals(result.blockingTasks, [], 'Should have no blocking tasks');
});

// Test 5: Task with multiple prerequisites - some incomplete
test('Task with some incomplete prerequisites is blocked', () => {
    const dependencies = { '5': [1, 2, 3] }; // Task 5 depends on Tasks 1 (done), 2 (progress), 3 (todo)
    const result = isTaskBlocked(5, dependencies, tasks);
    
    assertTrue(result.blocked, 'Task should be blocked when some prerequisites are not done');
    assertEquals(result.blockingTasks.length, 2, 'Should have two blocking tasks');
    
    const blockingIds = result.blockingTasks.map(t => t.id).sort();
    assertEquals(blockingIds, [2, 3], 'Blocking tasks should be Tasks 2 and 3');
});

// Test 6: Task with multiple prerequisites - all incomplete
test('Task with all incomplete prerequisites is blocked', () => {
    const dependencies = { '5': [2, 3] }; // Task 5 depends on Tasks 2 (progress) and 3 (todo)
    const result = isTaskBlocked(5, dependencies, tasks);
    
    assertTrue(result.blocked, 'Task should be blocked when all prerequisites are not done');
    assertEquals(result.blockingTasks.length, 2, 'Should have two blocking tasks');
});

// Test 7: Task with prerequisite in 'progress' status is blocked
test('Task with prerequisite in progress is blocked', () => {
    const dependencies = { '5': [2] }; // Task 5 depends on Task 2 (progress)
    const result = isTaskBlocked(5, dependencies, tasks);
    
    assertTrue(result.blocked, 'Task should be blocked when prerequisite is in progress');
    assertEquals(result.blockingTasks.length, 1, 'Should have one blocking task');
    assertEquals(result.blockingTasks[0].status, 'progress', 'Blocking task should have progress status');
});

// Test 8: Empty dependency graph
test('Empty dependency graph - task not blocked', () => {
    const dependencies = {};
    const result = isTaskBlocked(1, dependencies, tasks);
    
    assertFalse(result.blocked, 'Task should not be blocked in empty graph');
    assertEquals(result.blockingTasks, [], 'Should have no blocking tasks');
});

// Test 9: Blocking tasks contain full task objects
test('Blocking tasks contain full task objects with all properties', () => {
    const dependencies = { '5': [3] }; // Task 5 depends on Task 3 (todo)
    const result = isTaskBlocked(5, dependencies, tasks);
    
    assertTrue(result.blocked, 'Task should be blocked');
    assertEquals(result.blockingTasks.length, 1, 'Should have one blocking task');
    
    const blockingTask = result.blockingTasks[0];
    assertTrue(blockingTask.id !== undefined, 'Blocking task should have id');
    assertTrue(blockingTask.title !== undefined, 'Blocking task should have title');
    assertTrue(blockingTask.status !== undefined, 'Blocking task should have status');
    assertEquals(blockingTask.title, 'Task 3', 'Blocking task should be Task 3');
});

// Test 10: Task that doesn't exist in dependencies
test('Task not in dependencies is not blocked', () => {
    const dependencies = { '2': [1] };
    const result = isTaskBlocked(5, dependencies, tasks);
    
    assertFalse(result.blocked, 'Task not in dependencies should not be blocked');
    assertEquals(result.blockingTasks, [], 'Should have no blocking tasks');
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
