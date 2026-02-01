// Comprehensive QA Test Suite for Task Service
// Tests all CRUD operations, edge cases, and error conditions

import {
    createTask,
    updateTask,
    updateTaskField,
    deleteTask,
    duplicateTask,
    validateTask
} from '../src/services/taskService.js';

// Test utilities
let testsPassed = 0;
let testsFailed = 0;
const errors = [];

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        console.log(`✅ PASS: ${message}`);
    } else {
        testsFailed++;
        errors.push(message);
        console.log(`❌ FAIL: ${message}`);
    }
}

function assertDeepEqual(actual, expected, message) {
    const match = JSON.stringify(actual) === JSON.stringify(expected);
    assert(match, message);
    if (!match) {
        console.log(`   Expected:`, expected);
        console.log(`   Actual:`, actual);
    }
}

console.log('\n=== TASK SERVICE QA TEST SUITE ===\n');

// Test 1: Task Creation - Basic
console.log('--- Test 1: Basic Task Creation ---');
let tasks = [];
let taskCounter = 1;

const result1 = createTask({
    title: 'Test Task',
    description: 'Test Description',
    priority: 'high',
    status: 'todo',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    projectId: 1,
    tags: ['test']
}, tasks, taskCounter, []);

assert(result1.task !== null, 'Task created successfully');
assert(result1.task.id === 1, 'Task ID is 1');
assert(result1.task.title === 'Test Task', 'Task title is correct');
assert(result1.task.priority === 'high', 'Task priority is high');
assert(result1.task.status === 'todo', 'Task status is todo');
assert(result1.taskCounter === 2, 'Task counter incremented to 2');
assert(result1.tasks.length === 1, 'Tasks array has 1 task');
assert(result1.task.createdAt !== undefined, 'CreatedAt timestamp exists');

// Test 2: Task Creation - Default Values
console.log('\n--- Test 2: Task Creation with Defaults ---');
const result2 = createTask({
    title: 'Minimal Task'
}, result1.tasks, result1.taskCounter, []);

assert(result2.task.priority === 'medium', 'Default priority is medium');
assert(result2.task.status === 'todo', 'Default status is todo');
assert(result2.task.description === '', 'Default description is empty');
assert(result2.task.projectId === null, 'Default projectId is null');
assert(Array.isArray(result2.task.tags), 'Tags is an array');
assert(result2.task.tags.length === 0, 'Default tags array is empty');

tasks = result2.tasks;
taskCounter = result2.taskCounter;

// Test 3: Task Update - Full Update
console.log('\n--- Test 3: Full Task Update ---');
const result3 = updateTask(1, {
    title: 'Updated Task',
    description: 'Updated Description',
    priority: 'low',
    status: 'done',
    startDate: '2025-02-01',
    endDate: '2025-02-28',
    projectId: 2
}, tasks);

assert(result3.task !== null, 'Task updated successfully');
assert(result3.task.title === 'Updated Task', 'Title updated');
assert(result3.task.priority === 'low', 'Priority updated');
assert(result3.task.status === 'done', 'Status updated');
assert(result3.task.projectId === 2, 'ProjectId updated');
assert(result3.oldProjectId === 1, 'Old projectId captured correctly');

tasks = result3.tasks;

// Test 4: Task Update - Partial Update
console.log('\n--- Test 4: Partial Task Update ---');
const result4 = updateTask(1, {
    title: 'Partially Updated'
}, tasks);

assert(result4.task.title === 'Partially Updated', 'Title updated');
assert(result4.task.priority === 'low', 'Other fields unchanged (priority)');
assert(result4.task.status === 'done', 'Other fields unchanged (status)');

tasks = result4.tasks;

// Test 5: Task Update - Non-existent Task
console.log('\n--- Test 5: Update Non-existent Task ---');
const result5 = updateTask(999, { title: 'Should Fail' }, tasks);

assert(result5.task === null, 'Returns null for non-existent task');
assert(result5.tasks === tasks, 'Tasks array unchanged');

// Test 6: Update Task Field - Status Change
console.log('\n--- Test 6: Update Single Field (Status) ---');
const result6 = updateTaskField(1, 'status', 'progress', tasks);

assert(result6.task !== null, 'Field updated successfully');
assert(result6.task.status === 'progress', 'Status updated to progress');

tasks = result6.tasks;

// Test 7: Update Task Field - Priority Change
console.log('\n--- Test 7: Update Single Field (Priority) ---');
const result7 = updateTaskField(1, 'priority', 'high', tasks);

assert(result7.task.priority === 'high', 'Priority updated to high');

tasks = result7.tasks;

// Test 8: Update Task Field - Date Conversion (DMY)
console.log('\n--- Test 8: Date Field with DMY Format ---');

// Mock date conversion functions for testing
global.looksLikeDMY = (str) => /^\d{2}\/\d{2}\/\d{4}$/.test(str);
global.looksLikeISO = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);
global.toISOFromDMY = (dmy) => {
    const [d, m, y] = dmy.split('/');
    return `${y}-${m}-${d}`;
};

const result8 = updateTaskField(1, 'startDate', '15/03/2025', tasks);

assert(result8.task.startDate === '2025-03-15', 'DMY date converted to ISO');

tasks = result8.tasks;

// Test 9: Update Task Field - Date Conversion (ISO)
console.log('\n--- Test 9: Date Field with ISO Format ---');
const result9 = updateTaskField(1, 'endDate', '2025-03-31', tasks);

assert(result9.task.endDate === '2025-03-31', 'ISO date preserved');

tasks = result9.tasks;

// Test 10: Update Task Field - Status to Done (completedDate)
console.log('\n--- Test 10: Status Change to Done Sets CompletedDate ---');
const result10 = updateTaskField(1, 'status', 'done', tasks);

assert(result10.task.completedDate !== undefined, 'CompletedDate set when status=done');

tasks = result10.tasks;

// Test 11: Update Task Field - ProjectId Change
console.log('\n--- Test 11: Update ProjectId Field ---');
const result11 = updateTaskField(1, 'projectId', '5', tasks);

assert(result11.task.projectId === 5, 'ProjectId updated to integer');
assert(result11.oldProjectId === 2, 'Old projectId captured');

tasks = result11.tasks;

// Test 12: Update Task Field - Clear ProjectId
console.log('\n--- Test 12: Clear ProjectId ---');
const result12 = updateTaskField(1, 'projectId', '', tasks);

assert(result12.task.projectId === null, 'ProjectId cleared to null');

tasks = result12.tasks;

// Test 13: Delete Task - Success
console.log('\n--- Test 13: Delete Existing Task ---');
const result13 = deleteTask(2, tasks);

assert(result13.task !== null, 'Deleted task returned');
assert(result13.task.id === 2, 'Correct task deleted');
assert(result13.tasks.length === tasks.length - 1, 'Tasks array length decreased');
assert(!result13.tasks.find(t => t.id === 2), 'Task removed from array');

tasks = result13.tasks;

// Test 14: Delete Task - Non-existent
console.log('\n--- Test 14: Delete Non-existent Task ---');
const result14 = deleteTask(999, tasks);

assert(result14.task === null, 'Returns null for non-existent task');
assert(result14.tasks === tasks, 'Tasks array unchanged');

// Test 15: Duplicate Task - Basic
console.log('\n--- Test 15: Duplicate Task ---');
const result15 = duplicateTask(1, tasks, taskCounter);

assert(result15.task !== null, 'Task duplicated successfully');
assert(result15.task.id === taskCounter, 'New task has new ID');
assert(result15.task.title === 'Copy Partially Updated', 'Title has "Copy" prefix');
assert(result15.task.priority === tasks[0].priority, 'Priority copied');
assert(result15.task.status === tasks[0].status, 'Status copied');
assert(result15.task.projectId === tasks[0].projectId, 'ProjectId copied');
assert(result15.taskCounter === taskCounter + 1, 'Task counter incremented');
assert(result15.tasks.length === tasks.length + 1, 'Tasks array increased');

tasks = result15.tasks;
taskCounter = result15.taskCounter;

// Test 16: Duplicate Already-Copied Task
console.log('\n--- Test 16: Duplicate Task with "Copy" Prefix ---');
const copyTaskId = result15.task.id;
const result16 = duplicateTask(copyTaskId, tasks, taskCounter);

assert(result16.task.title === 'Copy Copy Partially Updated', 'Duplicate always adds "Copy " prefix');

tasks = result16.tasks;
taskCounter = result16.taskCounter;

// Test 17: Duplicate Non-existent Task
console.log('\n--- Test 17: Duplicate Non-existent Task ---');
const result17 = duplicateTask(999, tasks, taskCounter);

assert(result17.task === null, 'Returns null for non-existent task');
assert(result17.tasks === tasks, 'Tasks array unchanged');

// Test 18: Validate Task - Valid Data
console.log('\n--- Test 18: Validate Valid Task ---');
const validation1 = validateTask({
    title: 'Valid Task',
    priority: 'high',
    status: 'todo'
});

assert(validation1.valid === true, 'Valid task passes validation');
assert(validation1.errors.length === 0, 'No validation errors');

// Test 19: Validate Task - Missing Title
console.log('\n--- Test 19: Validate Task Missing Title ---');
const validation2 = validateTask({
    priority: 'high',
    status: 'todo'
});

assert(validation2.valid === false, 'Invalid task fails validation');
assert(validation2.errors.includes('Title is required'), 'Title error present');

// Test 20: Validate Task - Empty Title
console.log('\n--- Test 20: Validate Task Empty Title ---');
const validation3 = validateTask({
    title: '   ',
    priority: 'high'
});

assert(validation3.valid === false, 'Empty title fails validation');

// Test 21: Validate Task - Invalid Priority
console.log('\n--- Test 21: Validate Invalid Priority ---');
const validation4 = validateTask({
    title: 'Test',
    priority: 'urgent'
});

assert(validation4.valid === false, 'Invalid priority fails validation');
assert(validation4.errors.includes('Invalid priority value'), 'Priority error present');

// Test 22: Validate Task - Invalid Status
console.log('\n--- Test 22: Validate Invalid Status ---');
const validation5 = validateTask({
    title: 'Test',
    status: 'completed'
});

assert(validation5.valid === false, 'Invalid status fails validation');
assert(validation5.errors.includes('Invalid status value'), 'Status error present');

// Test 23: Task Immutability - Create
console.log('\n--- Test 23: Create Task Immutability ---');
const originalTasks = [{id: 1, title: 'Original'}];
const result23 = createTask({title: 'New Task'}, originalTasks, 2, []);

assert(result23.tasks !== originalTasks, 'New array returned (not mutated)');
assert(originalTasks.length === 1, 'Original array unchanged');
assert(result23.tasks.length === 2, 'New array has new task');

// Test 24: Task Immutability - Update
console.log('\n--- Test 24: Update Task Immutability ---');
const originalTasks2 = [{id: 1, title: 'Original', priority: 'low'}];
const result24 = updateTask(1, {priority: 'high'}, originalTasks2);

assert(result24.tasks !== originalTasks2, 'New array returned');
assert(originalTasks2[0].priority === 'low', 'Original task unchanged');
assert(result24.tasks[0].priority === 'high', 'New task has update');

// Test 25: Task Immutability - Delete
console.log('\n--- Test 25: Delete Task Immutability ---');
const originalTasks3 = [{id: 1, title: 'Task 1'}, {id: 2, title: 'Task 2'}];
const result25 = deleteTask(1, originalTasks3);

assert(result25.tasks !== originalTasks3, 'New array returned');
assert(originalTasks3.length === 2, 'Original array unchanged');
assert(result25.tasks.length === 1, 'New array has task removed');

// Test 26: Duplicate with Attachments
console.log('\n--- Test 26: Duplicate Task with Attachments ---');
const taskWithAttachments = {
    id: 100,
    title: 'Task with Files',
    attachments: [{name: 'file1.pdf', url: 'http://example.com/file1.pdf'}],
    tags: ['tag1', 'tag2'],
    priority: 'medium',
    status: 'todo',
    description: '',
    projectId: null,
    startDate: '',
    endDate: ''
};
const result26 = duplicateTask(100, [taskWithAttachments], 101);

assert(result26.task.attachments.length === 1, 'Attachments copied');
assert(result26.task.attachments !== taskWithAttachments.attachments, 'Attachments array is new reference');
assert(result26.task.tags.length === 2, 'Tags copied');
assert(result26.task.tags !== taskWithAttachments.tags, 'Tags array is new reference');

// Final Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);

if (testsFailed > 0) {
    console.log('\n=== FAILED TESTS ===');
    errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
    });
    process.exit(1);
} else {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    process.exit(0);
}
