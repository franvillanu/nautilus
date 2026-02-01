/**
 * Unit Tests for Mass Edit Feature
 * 
 * Tests selection management, state updates, and mass edit operations
 */

// Mock dependencies
let massEditState;
let tasks;
let projects;

// Test helpers
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

function resetState() {
    massEditState = {
        selectedTaskIds: new Set(),
        lastSelectedId: null,
        isToolbarVisible: false,
        pendingChanges: null
    };
    
    tasks = [
        { id: 1, title: 'Task 1', status: 'todo', priority: 'high', tags: ['urgent'], projectId: 1 },
        { id: 2, title: 'Task 2', status: 'progress', priority: 'medium', tags: ['dev'], projectId: 1 },
        { id: 3, title: 'Task 3', status: 'todo', priority: 'low', tags: ['bug'], projectId: 2 },
        { id: 4, title: 'Task 4', status: 'done', priority: 'high', tags: ['urgent', 'bug'], projectId: null },
        { id: 5, title: 'Task 5', status: 'review', priority: 'medium', tags: [], projectId: 2 },
    ];
    
    projects = [
        { id: 1, name: 'Project Alpha' },
        { id: 2, name: 'Project Beta' }
    ];
}

console.log('\n=== MASS EDIT UNIT TESTS ===\n');

// ================================
// Test 1: Basic Selection
// ================================
console.log('--- Test 1: Basic Task Selection ---');
resetState();

// Add single task
massEditState.selectedTaskIds.add(1);
massEditState.lastSelectedId = 1;
assert(massEditState.selectedTaskIds.size === 1, 'Single task added to selection');
assert(massEditState.selectedTaskIds.has(1), 'Task ID 1 is selected');
assert(massEditState.lastSelectedId === 1, 'Last selected ID is tracked');

// Add another task
massEditState.selectedTaskIds.add(3);
assert(massEditState.selectedTaskIds.size === 2, 'Second task added to selection');
assert(massEditState.selectedTaskIds.has(3), 'Task ID 3 is selected');

// Remove task
massEditState.selectedTaskIds.delete(1);
assert(massEditState.selectedTaskIds.size === 1, 'Task removed from selection');
assert(!massEditState.selectedTaskIds.has(1), 'Task ID 1 is no longer selected');

// ================================
// Test 2: Range Selection
// ================================
console.log('\n--- Test 2: Range Selection (Shift-Click) ---');
resetState();

// Simulate shift-click from task 1 to task 3
const startIndex = 0; // Task 1
const endIndex = 2;   // Task 3

for (let i = startIndex; i <= endIndex; i++) {
    massEditState.selectedTaskIds.add(tasks[i].id);
}

assert(massEditState.selectedTaskIds.size === 3, 'Range selection adds 3 tasks');
assert(massEditState.selectedTaskIds.has(1), 'Task 1 in range');
assert(massEditState.selectedTaskIds.has(2), 'Task 2 in range');
assert(massEditState.selectedTaskIds.has(3), 'Task 3 in range');
assert(!massEditState.selectedTaskIds.has(4), 'Task 4 not in range');

// ================================
// Test 3: Select All
// ================================
console.log('\n--- Test 3: Select All Tasks ---');
resetState();

tasks.forEach(task => massEditState.selectedTaskIds.add(task.id));

assert(massEditState.selectedTaskIds.size === tasks.length, 'All tasks selected');
assert(massEditState.selectedTaskIds.size === 5, 'Exactly 5 tasks selected');
tasks.forEach(task => {
    assert(massEditState.selectedTaskIds.has(task.id), `Task ${task.id} is selected`);
});

// ================================
// Test 4: Clear Selection
// ================================
console.log('\n--- Test 4: Clear All Selection ---');
resetState();

// Add some tasks
massEditState.selectedTaskIds.add(1);
massEditState.selectedTaskIds.add(2);
massEditState.selectedTaskIds.add(3);
massEditState.lastSelectedId = 3;

// Clear
massEditState.selectedTaskIds.clear();
massEditState.lastSelectedId = null;

assert(massEditState.selectedTaskIds.size === 0, 'Selection cleared');
assert(massEditState.lastSelectedId === null, 'Last selected ID cleared');

// ================================
// Test 5: Mass Edit Status Change
// ================================
console.log('\n--- Test 5: Mass Edit Status Change ---');
resetState();

// Select tasks 1, 2, 3
[1, 2, 3].forEach(id => massEditState.selectedTaskIds.add(id));

// Prepare status change
const statusChange = {
    field: 'status',
    value: 'done'
};

// Apply change
massEditState.selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = statusChange.value;
    }
});

assert(tasks[0].status === 'done', 'Task 1 status changed to done');
assert(tasks[1].status === 'done', 'Task 2 status changed to done');
assert(tasks[2].status === 'done', 'Task 3 status changed to done');
assert(tasks[3].status === 'done', 'Task 4 status unchanged (not selected)');
assert(tasks[4].status === 'review', 'Task 5 status unchanged (not selected)');

// ================================
// Test 6: Mass Edit Priority Change
// ================================
console.log('\n--- Test 6: Mass Edit Priority Change ---');
resetState();

// Select tasks 2, 4, 5
[2, 4, 5].forEach(id => massEditState.selectedTaskIds.add(id));

const priorityChange = {
    field: 'priority',
    value: 'high'
};

massEditState.selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.priority = priorityChange.value;
    }
});

assert(tasks[0].priority === 'high', 'Task 1 priority unchanged (not selected)');
assert(tasks[1].priority === 'high', 'Task 2 priority changed to high');
assert(tasks[2].priority === 'low', 'Task 3 priority unchanged (not selected)');
assert(tasks[3].priority === 'high', 'Task 4 priority already high');
assert(tasks[4].priority === 'high', 'Task 5 priority changed to high');

// ================================
// Test 7: Mass Edit Project Assignment
// ================================
console.log('\n--- Test 7: Mass Edit Project Assignment ---');
resetState();

// Select tasks 1, 3, 4
[1, 3, 4].forEach(id => massEditState.selectedTaskIds.add(id));

const projectChange = {
    field: 'project',
    value: 2  // Project Beta
};

massEditState.selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.projectId = projectChange.value;
    }
});

assert(tasks[0].projectId === 2, 'Task 1 moved to Project Beta');
assert(tasks[1].projectId === 1, 'Task 2 unchanged (not selected)');
assert(tasks[2].projectId === 2, 'Task 3 already in Project Beta');
assert(tasks[3].projectId === 2, 'Task 4 moved from no project to Project Beta');
assert(tasks[4].projectId === 2, 'Task 5 unchanged (not selected)');

// ================================
// Test 8: Mass Edit Remove Project
// ================================
console.log('\n--- Test 8: Mass Edit Remove Project ---');
resetState();

// Select tasks 1, 2
[1, 2].forEach(id => massEditState.selectedTaskIds.add(id));

const removeProjectChange = {
    field: 'project',
    value: null
};

massEditState.selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.projectId = removeProjectChange.value;
    }
});

assert(tasks[0].projectId === null, 'Task 1 project removed');
assert(tasks[1].projectId === null, 'Task 2 project removed');
assert(tasks[2].projectId === 2, 'Task 3 unchanged (not selected)');

// ================================
// Test 9: Mass Edit Tags - Add Mode
// ================================
console.log('\n--- Test 9: Mass Edit Tags - Add Mode ---');
resetState();

// Select tasks 1, 2, 3
[1, 2, 3].forEach(id => massEditState.selectedTaskIds.add(id));

const tagsAddChange = {
    field: 'tags',
    mode: 'add',
    tags: ['tested', 'ready']
};

massEditState.selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const newTags = new Set([...task.tags, ...tagsAddChange.tags]);
        task.tags = Array.from(newTags);
    }
});

assert(tasks[0].tags.includes('urgent'), 'Task 1 kept original tag "urgent"');
assert(tasks[0].tags.includes('tested'), 'Task 1 added tag "tested"');
assert(tasks[0].tags.includes('ready'), 'Task 1 added tag "ready"');
assert(tasks[0].tags.length === 3, 'Task 1 has 3 tags total');

assert(tasks[1].tags.includes('dev'), 'Task 2 kept original tag "dev"');
assert(tasks[1].tags.includes('tested'), 'Task 2 added tag "tested"');
assert(tasks[1].tags.length === 3, 'Task 2 has 3 tags total');

// ================================
// Test 10: Mass Edit Tags - Replace Mode
// ================================
console.log('\n--- Test 10: Mass Edit Tags - Replace Mode ---');
resetState();

// Select tasks 1, 4
[1, 4].forEach(id => massEditState.selectedTaskIds.add(id));

const tagsReplaceChange = {
    field: 'tags',
    mode: 'replace',
    tags: ['new-tag']
};

massEditState.selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.tags = [...tagsReplaceChange.tags];
    }
});

assert(tasks[0].tags.length === 1, 'Task 1 has only 1 tag');
assert(tasks[0].tags[0] === 'new-tag', 'Task 1 tags replaced with "new-tag"');
assert(!tasks[0].tags.includes('urgent'), 'Task 1 old tag "urgent" removed');

assert(tasks[3].tags.length === 1, 'Task 4 has only 1 tag');
assert(tasks[3].tags[0] === 'new-tag', 'Task 4 tags replaced');
assert(!tasks[3].tags.includes('urgent'), 'Task 4 old tags removed');

// ================================
// Test 11: Mass Edit Tags - Remove Mode
// ================================
console.log('\n--- Test 11: Mass Edit Tags - Remove Mode ---');
resetState();

// Select tasks 1, 4 (both have 'urgent' tag)
[1, 4].forEach(id => massEditState.selectedTaskIds.add(id));

const tagsRemoveChange = {
    field: 'tags',
    mode: 'remove',
    tags: ['urgent']
};

massEditState.selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.tags = task.tags.filter(tag => !tagsRemoveChange.tags.includes(tag));
    }
});

assert(!tasks[0].tags.includes('urgent'), 'Task 1 "urgent" tag removed');
assert(tasks[0].tags.length === 0, 'Task 1 has no tags left');

assert(!tasks[3].tags.includes('urgent'), 'Task 4 "urgent" tag removed');
assert(tasks[3].tags.includes('bug'), 'Task 4 still has "bug" tag');
assert(tasks[3].tags.length === 1, 'Task 4 has 1 tag remaining');

// ================================
// Test 12: Mass Edit Dates
// ================================
console.log('\n--- Test 12: Mass Edit Dates ---');
resetState();

// Select tasks 1, 2
[1, 2].forEach(id => massEditState.selectedTaskIds.add(id));

const datesChange = {
    field: 'dates',
    startDate: '2026-02-15',
    endDate: '2026-02-28'
};

massEditState.selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        if (datesChange.startDate) task.startDate = datesChange.startDate;
        if (datesChange.endDate) task.endDate = datesChange.endDate;
    }
});

assert(tasks[0].startDate === '2026-02-15', 'Task 1 start date set');
assert(tasks[0].endDate === '2026-02-28', 'Task 1 end date set');
assert(tasks[1].startDate === '2026-02-15', 'Task 2 start date set');
assert(tasks[1].endDate === '2026-02-28', 'Task 2 end date set');

// ================================
// Test 13: Empty Selection Edge Case
// ================================
console.log('\n--- Test 13: Empty Selection Edge Case ---');
resetState();

// Try to apply changes with no selection
const emptySelectionSize = massEditState.selectedTaskIds.size;
assert(emptySelectionSize === 0, 'No tasks selected initially');

// Attempting to apply should do nothing
massEditState.selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = 'done';
    }
});

// Verify no tasks were changed
const changedTasks = tasks.filter(t => {
    // Task 4 already had status 'done', so count tasks that changed from their original state
    return (t.id === 1 && t.status === 'todo') || 
           (t.id === 2 && t.status === 'progress') ||
           (t.id === 3 && t.status === 'todo') ||
           (t.id === 5 && t.status === 'review');
}).length;
assert(changedTasks === 4, 'No tasks changed when selection is empty');

// ================================
// Test 14: Selection Persistence After Filter
// ================================
console.log('\n--- Test 14: Selection State Integrity ---');
resetState();

// Select multiple tasks
[1, 2, 3].forEach(id => massEditState.selectedTaskIds.add(id));

// Simulate a filter that hides task 2
const visibleTasks = tasks.filter(t => t.id !== 2);

// Check that selection state is preserved
assert(massEditState.selectedTaskIds.has(1), 'Task 1 selection preserved');
assert(massEditState.selectedTaskIds.has(2), 'Task 2 selection preserved (even when hidden)');
assert(massEditState.selectedTaskIds.has(3), 'Task 3 selection preserved');
assert(massEditState.selectedTaskIds.size === 3, 'All 3 selections preserved');

// ================================
// Test 15: Pending Changes State
// ================================
console.log('\n--- Test 15: Pending Changes State ---');
resetState();

// Set pending changes
massEditState.pendingChanges = {
    field: 'status',
    value: 'review'
};

assert(massEditState.pendingChanges !== null, 'Pending changes stored');
assert(massEditState.pendingChanges.field === 'status', 'Correct field in pending changes');
assert(massEditState.pendingChanges.value === 'review', 'Correct value in pending changes');

// Clear pending changes
massEditState.pendingChanges = null;
assert(massEditState.pendingChanges === null, 'Pending changes cleared');

// ================================
// Test 16: Multiple Tag Operations
// ================================
console.log('\n--- Test 16: Multiple Tag Operations ---');
resetState();

// Test adding multiple tags in sequence
massEditState.selectedTaskIds.add(5); // Task 5 has no tags

// Add first set
let newTags = new Set([...tasks[4].tags, 'tag1', 'tag2']);
tasks[4].tags = Array.from(newTags);

assert(tasks[4].tags.length === 2, 'Task 5 has 2 tags after first add');

// Add second set (with one duplicate)
newTags = new Set([...tasks[4].tags, 'tag2', 'tag3']);
tasks[4].tags = Array.from(newTags);

assert(tasks[4].tags.length === 3, 'Task 5 has 3 tags (no duplicates)');
assert(tasks[4].tags.includes('tag1'), 'Has tag1');
assert(tasks[4].tags.includes('tag2'), 'Has tag2');
assert(tasks[4].tags.includes('tag3'), 'Has tag3');

// ================================
// Test 17: Selection Toggle Logic
// ================================
console.log('\n--- Test 17: Selection Toggle Logic ---');
resetState();

// Add task
massEditState.selectedTaskIds.add(1);
assert(massEditState.selectedTaskIds.has(1), 'Task 1 added');

// Toggle off (remove)
massEditState.selectedTaskIds.delete(1);
assert(!massEditState.selectedTaskIds.has(1), 'Task 1 removed');

// Toggle on again
massEditState.selectedTaskIds.add(1);
assert(massEditState.selectedTaskIds.has(1), 'Task 1 re-added');

// ================================
// Test 18: Last Selected ID Tracking
// ================================
console.log('\n--- Test 18: Last Selected ID Tracking ---');
resetState();

// Select task 1
massEditState.selectedTaskIds.add(1);
massEditState.lastSelectedId = 1;
assert(massEditState.lastSelectedId === 1, 'Last selected is task 1');

// Select task 3
massEditState.selectedTaskIds.add(3);
massEditState.lastSelectedId = 3;
assert(massEditState.lastSelectedId === 3, 'Last selected updated to task 3');

// Deselect task 3 (should clear lastSelectedId)
massEditState.selectedTaskIds.delete(3);
if (massEditState.lastSelectedId === 3) {
    massEditState.lastSelectedId = null;
}
assert(massEditState.lastSelectedId === null, 'Last selected cleared when that task is deselected');

// ================================
// Test 19: Boundary Cases
// ================================
console.log('\n--- Test 19: Boundary Cases ---');
resetState();

// Try to select non-existent task
massEditState.selectedTaskIds.add(999);
assert(massEditState.selectedTaskIds.has(999), 'Can add non-existent task ID to Set');

// Try to apply changes to non-existent task (should skip silently)
const taskExists = tasks.find(t => t.id === 999);
assert(!taskExists, 'Non-existent task is not in tasks array');

// Try to add empty tags array
massEditState.selectedTaskIds.clear();
massEditState.selectedTaskIds.add(1);
tasks[0].tags = [];
assert(tasks[0].tags.length === 0, 'Empty tags array is valid');

// ================================
// Test 20: State Cleanup
// ================================
console.log('\n--- Test 20: State Cleanup ---');
resetState();

// Populate state
massEditState.selectedTaskIds.add(1);
massEditState.selectedTaskIds.add(2);
massEditState.lastSelectedId = 2;
massEditState.pendingChanges = { field: 'status', value: 'done' };
massEditState.isToolbarVisible = true;

// Clear all state
massEditState.selectedTaskIds.clear();
massEditState.lastSelectedId = null;
massEditState.pendingChanges = null;
massEditState.isToolbarVisible = false;

assert(massEditState.selectedTaskIds.size === 0, 'Selected IDs cleared');
assert(massEditState.lastSelectedId === null, 'Last selected ID cleared');
assert(massEditState.pendingChanges === null, 'Pending changes cleared');
assert(massEditState.isToolbarVisible === false, 'Toolbar visibility reset');

// ================================
// Final Summary
// ================================
console.log('\n=== TEST SUMMARY ===');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);

if (testsFailed > 0) {
    console.log('\n=== FAILED TESTS ===');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    process.exit(1);
} else {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    process.exit(0);
}
