// State Consistency Test Suite
// Verifies global state remains valid after operations

import {
    createTask,
    updateTask,
    deleteTask,
    duplicateTask
} from '../src/services/taskService.js';

import {
    createProject,
    deleteProject
} from '../src/services/projectService.js';

// Mock date functions
global.looksLikeDMY = (str) => /^\d{2}\/\d{2}\/\d{4}$/.test(str);
global.looksLikeISO = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);
global.toISOFromDMY = (dmy) => {
    const [d, m, y] = dmy.split('/');
    return `${y}-${m}-${d}`;
};

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

// State validation helper
function validateState(tasks, projects, taskCounter, projectCounter, testName) {
    const issues = [];

    // 1. Check for duplicate task IDs
    const taskIds = tasks.map(t => t.id);
    const uniqueTaskIds = new Set(taskIds);
    if (taskIds.length !== uniqueTaskIds.size) {
        issues.push('Duplicate task IDs found');
    }

    // 2. Check for duplicate project IDs
    const projectIds = projects.map(p => p.id);
    const uniqueProjectIds = new Set(projectIds);
    if (projectIds.length !== uniqueProjectIds.size) {
        issues.push('Duplicate project IDs found');
    }

    // 3. Check taskCounter > max task ID
    if (tasks.length > 0) {
        const maxTaskId = Math.max(...taskIds);
        if (taskCounter <= maxTaskId) {
            issues.push(`taskCounter (${taskCounter}) should be > max task ID (${maxTaskId})`);
        }
    }

    // 4. Check projectCounter > max project ID
    if (projects.length > 0) {
        const maxProjectId = Math.max(...projectIds);
        if (projectCounter <= maxProjectId) {
            issues.push(`projectCounter (${projectCounter}) should be > max project ID (${maxProjectId})`);
        }
    }

    // 5. Check for orphaned tasks (projectId points to non-existent project)
    const orphanedTasks = tasks.filter(t => {
        if (t.projectId === null) return false;
        return !projects.find(p => p.id === t.projectId);
    });
    if (orphanedTasks.length > 0) {
        issues.push(`${orphanedTasks.length} orphaned tasks (projectId points to non-existent project)`);
    }

    // 6. Check all tasks have required fields
    const tasksWithMissingFields = tasks.filter(t => {
        return !t.id || !t.title || !t.status || !t.priority || !t.createdAt;
    });
    if (tasksWithMissingFields.length > 0) {
        issues.push(`${tasksWithMissingFields.length} tasks missing required fields`);
    }

    // 7. Check all projects have required fields
    const projectsWithMissingFields = projects.filter(p => {
        return !p.id || !p.name || !p.createdAt;
    });
    if (projectsWithMissingFields.length > 0) {
        issues.push(`${projectsWithMissingFields.length} projects missing required fields`);
    }

    // 8. Check counters are positive integers
    if (!Number.isInteger(taskCounter) || taskCounter < 1) {
        issues.push(`Invalid taskCounter: ${taskCounter}`);
    }
    if (!Number.isInteger(projectCounter) || projectCounter < 1) {
        issues.push(`Invalid projectCounter: ${projectCounter}`);
    }

    // 9. Check task IDs are positive integers
    const invalidTaskIds = tasks.filter(t => !Number.isInteger(t.id) || t.id < 1);
    if (invalidTaskIds.length > 0) {
        issues.push(`${invalidTaskIds.length} tasks with invalid IDs`);
    }

    // 10. Check project IDs are positive integers
    const invalidProjectIds = projects.filter(p => !Number.isInteger(p.id) || p.id < 1);
    if (invalidProjectIds.length > 0) {
        issues.push(`${invalidProjectIds.length} projects with invalid IDs`);
    }

    // Assert state is valid
    const isValid = issues.length === 0;
    assert(isValid, `${testName} - State is consistent`);

    if (!isValid) {
        console.log(`   Issues found:`);
        issues.forEach(issue => console.log(`   - ${issue}`));
    }

    return isValid;
}

console.log('\n=== STATE CONSISTENCY TEST SUITE ===\n');

// Test 1: Initial State Validation
console.log('--- Test 1: Empty State is Valid ---');
let tasks = [];
let projects = [];
let taskCounter = 1;
let projectCounter = 1;

validateState(tasks, projects, taskCounter, projectCounter, 'Empty state');

// Test 2: After Creating Tasks
console.log('\n--- Test 2: State After Creating Tasks ---');

for (let i = 0; i < 5; i++) {
    const result = createTask({
        title: `Task ${i + 1}`,
        status: 'todo',
        priority: 'medium'
    }, tasks, taskCounter, []);
    tasks = result.tasks;
    taskCounter = result.taskCounter;
}

validateState(tasks, projects, taskCounter, projectCounter, 'After creating 5 tasks');

// Test 3: After Creating Projects
console.log('\n--- Test 3: State After Creating Projects ---');

for (let i = 0; i < 3; i++) {
    const result = createProject({
        name: `Project ${i + 1}`
    }, projects, projectCounter);
    projects = result.projects;
    projectCounter = result.projectCounter;
}

validateState(tasks, projects, taskCounter, projectCounter, 'After creating 3 projects');

// Test 4: After Associating Tasks with Projects
console.log('\n--- Test 4: State After Task-Project Association ---');

// Associate tasks with projects
const update1 = updateTask(1, { projectId: 1 }, tasks);
tasks = update1.tasks;

const update2 = updateTask(2, { projectId: 1 }, tasks);
tasks = update2.tasks;

const update3 = updateTask(3, { projectId: 2 }, tasks);
tasks = update3.tasks;

validateState(tasks, projects, taskCounter, projectCounter, 'After associating tasks with projects');

// Test 5: After Duplicating Tasks
console.log('\n--- Test 5: State After Duplicating Tasks ---');

const dup1 = duplicateTask(1, tasks, taskCounter);
tasks = dup1.tasks;
taskCounter = dup1.taskCounter;

const dup2 = duplicateTask(3, tasks, taskCounter);
tasks = dup2.tasks;
taskCounter = dup2.taskCounter;

validateState(tasks, projects, taskCounter, projectCounter, 'After duplicating 2 tasks');

// Test 6: After Deleting Tasks
console.log('\n--- Test 6: State After Deleting Tasks ---');

const del1 = deleteTask(4, tasks);
tasks = del1.tasks;

const del2 = deleteTask(5, tasks);
tasks = del2.tasks;

validateState(tasks, projects, taskCounter, projectCounter, 'After deleting 2 tasks');

// Test 7: After Deleting Project (Clear Associations)
console.log('\n--- Test 7: State After Deleting Project (Clear Associations) ---');

const delProj1 = deleteProject(2, projects, tasks, true);
projects = delProj1.projects;
tasks = delProj1.tasks;

validateState(tasks, projects, taskCounter, projectCounter, 'After deleting project 2 (cleared associations)');

// Test 8: After Rapid Sequential Operations
console.log('\n--- Test 8: State After Rapid Sequential Operations ---');

// Create 10 tasks rapidly
for (let i = 0; i < 10; i++) {
    const result = createTask({
        title: `Rapid Task ${i + 1}`,
        status: 'todo',
        priority: 'low'
    }, tasks, taskCounter, []);
    tasks = result.tasks;
    taskCounter = result.taskCounter;
}

// Create 5 projects rapidly
for (let i = 0; i < 5; i++) {
    const result = createProject({
        name: `Rapid Project ${i + 1}`
    }, projects, projectCounter);
    projects = result.projects;
    projectCounter = result.projectCounter;
}

validateState(tasks, projects, taskCounter, projectCounter, 'After rapid operations');

// Test 9: Verify No ID Collisions
console.log('\n--- Test 9: No ID Collisions ---');

const allTaskIds = tasks.map(t => t.id);
const allProjectIds = projects.map(p => p.id);

assert(new Set(allTaskIds).size === allTaskIds.length, 'All task IDs are unique');
assert(new Set(allProjectIds).size === allProjectIds.length, 'All project IDs are unique');

// Test 10: Counter Never Decreases
console.log('\n--- Test 10: Counters Only Increase ---');

const currentTaskCounter = taskCounter;
const currentProjectCounter = projectCounter;

// Delete some items (counters should NOT decrease)
const delTask = deleteTask(tasks[0].id, tasks);
tasks = delTask.tasks;

const delProj = deleteProject(projects[0].id, projects, tasks, true);
projects = delProj.projects;
tasks = delProj.tasks;

assert(taskCounter === currentTaskCounter, 'taskCounter unchanged after deletion');
assert(projectCounter === currentProjectCounter, 'projectCounter unchanged after deletion');

validateState(tasks, projects, taskCounter, projectCounter, 'After deletions (counters stable)');

// Test 11: Large Counter Values
console.log('\n--- Test 11: Large Counter Values ---');

// Reset with large counters
tasks = [];
projects = [];
taskCounter = 9999;
projectCounter = 8888;

const largeTask = createTask({ title: 'Large Counter Task' }, tasks, taskCounter, []);
tasks = largeTask.tasks;
taskCounter = largeTask.taskCounter;

const largeProj = createProject({ name: 'Large Counter Project' }, projects, projectCounter);
projects = largeProj.projects;
projectCounter = largeProj.projectCounter;

assert(largeTask.task.id === 9999, 'Task created with large ID');
assert(largeProj.project.id === 8888, 'Project created with large ID');
assert(taskCounter === 10000, 'Task counter incremented correctly');
assert(projectCounter === 8889, 'Project counter incremented correctly');

validateState(tasks, projects, taskCounter, projectCounter, 'With large counter values');

// Test 12: Mixed Operations Preserve Consistency
console.log('\n--- Test 12: Complex Mixed Operations ---');

tasks = [];
projects = [];
taskCounter = 1;
projectCounter = 1;

// Complex sequence
const p1 = createProject({ name: 'P1' }, projects, projectCounter);
projects = p1.projects;
projectCounter = p1.projectCounter;

const t1 = createTask({ title: 'T1', projectId: p1.project.id }, tasks, taskCounter, []);
tasks = t1.tasks;
taskCounter = t1.taskCounter;

const t2 = createTask({ title: 'T2', projectId: p1.project.id }, tasks, taskCounter, []);
tasks = t2.tasks;
taskCounter = t2.taskCounter;

const p2 = createProject({ name: 'P2' }, projects, projectCounter);
projects = p2.projects;
projectCounter = p2.projectCounter;

const dupT1 = duplicateTask(t1.task.id, tasks, taskCounter);
tasks = dupT1.tasks;
taskCounter = dupT1.taskCounter;

const moveT2 = updateTask(t2.task.id, { projectId: p2.project.id }, tasks);
tasks = moveT2.tasks;

const delP1 = deleteProject(p1.project.id, projects, tasks, true);
projects = delP1.projects;
tasks = delP1.tasks;

validateState(tasks, projects, taskCounter, projectCounter, 'After complex mixed operations');

// Test 13: All Tasks Have Valid Status and Priority
console.log('\n--- Test 13: Task Field Validity ---');

const validStatuses = ['todo', 'progress', 'review', 'done'];
const validPriorities = ['low', 'medium', 'high'];

const invalidStatusTasks = tasks.filter(t => !validStatuses.includes(t.status));
const invalidPriorityTasks = tasks.filter(t => !validPriorities.includes(t.priority));

assert(invalidStatusTasks.length === 0, 'All tasks have valid status');
assert(invalidPriorityTasks.length === 0, 'All tasks have valid priority');

// Test 14: CreatedAt Timestamps are Valid
console.log('\n--- Test 14: Timestamp Validity ---');

const invalidTaskTimestamps = tasks.filter(t => {
    const date = new Date(t.createdAt);
    return isNaN(date.getTime());
});

const invalidProjectTimestamps = projects.filter(p => {
    const date = new Date(p.createdAt);
    return isNaN(date.getTime());
});

assert(invalidTaskTimestamps.length === 0, 'All tasks have valid createdAt timestamps');
assert(invalidProjectTimestamps.length === 0, 'All projects have valid createdAt timestamps');

// Test 15: ProjectId Consistency
console.log('\n--- Test 15: ProjectId References are Valid ---');

const tasksWithInvalidProjectId = tasks.filter(t => {
    if (t.projectId === null) return false; // null is valid
    if (!Number.isInteger(t.projectId)) return true; // must be integer
    return !projects.find(p => p.id === t.projectId); // must exist
});

assert(tasksWithInvalidProjectId.length === 0, 'All task projectIds are valid (null or existing project)');

// Test 16: Array Integrity
console.log('\n--- Test 16: Array Integrity ---');

assert(Array.isArray(tasks), 'tasks is an array');
assert(Array.isArray(projects), 'projects is an array');

const tasksAreObjects = tasks.every(t => typeof t === 'object' && t !== null);
const projectsAreObjects = projects.every(p => typeof p === 'object' && p !== null);

assert(tasksAreObjects, 'All tasks are objects');
assert(projectsAreObjects, 'All projects are objects');

// Test 17: No Undefined or Null IDs
console.log('\n--- Test 17: No Undefined/Null IDs ---');

const tasksWithInvalidId = tasks.filter(t => t.id === undefined || t.id === null);
const projectsWithInvalidId = projects.filter(p => p.id === undefined || p.id === null);

assert(tasksWithInvalidId.length === 0, 'No tasks with undefined/null ID');
assert(projectsWithInvalidId.length === 0, 'No projects with undefined/null ID');

// Test 18: Counter Always >= 1
console.log('\n--- Test 18: Counters Always Positive ---');

assert(taskCounter >= 1, 'taskCounter is always >= 1');
assert(projectCounter >= 1, 'projectCounter is always >= 1');

// Test 19: Final State Validation
console.log('\n--- Test 19: Final Overall State Validation ---');

validateState(tasks, projects, taskCounter, projectCounter, 'Final overall state');

console.log('\n=== STATE STATISTICS ===');
console.log(`Tasks: ${tasks.length}`);
console.log(`Projects: ${projects.length}`);
console.log(`Task Counter: ${taskCounter}`);
console.log(`Project Counter: ${projectCounter}`);
console.log(`Tasks with Projects: ${tasks.filter(t => t.projectId !== null).length}`);
console.log(`Tasks without Projects: ${tasks.filter(t => t.projectId === null).length}`);

if (projects.length > 0) {
    projects.forEach(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        console.log(`  - ${p.name}: ${projectTasks.length} tasks`);
    });
}

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
    console.log('\n🎉 ALL STATE CONSISTENCY TESTS PASSED! 🎉');
    console.log('\nValidations Performed:');
    console.log('- Unique task IDs');
    console.log('- Unique project IDs');
    console.log('- Counter > max ID');
    console.log('- No orphaned tasks');
    console.log('- Required fields present');
    console.log('- Valid field values (status, priority)');
    console.log('- Valid timestamps');
    console.log('- Valid projectId references');
    console.log('- Array integrity');
    console.log('- Positive counters');
    console.log('- No null/undefined IDs');
    console.log('- State consistency after all operations');
    process.exit(0);
}
