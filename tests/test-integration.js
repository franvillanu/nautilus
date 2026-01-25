// Integration Test Suite - Cross-Service Operations
// Tests how taskService and projectService interact together

import {
    createTask,
    updateTask,
    updateTaskField,
    deleteTask,
    duplicateTask
} from '../src/services/taskService.js';

import {
    createProject,
    updateProject,
    updateProjectField,
    deleteProject,
    getProjectTasks
} from '../src/services/projectService.js';

// Mock date functions for testing
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

console.log('\n=== INTEGRATION TEST SUITE ===\n');

// Test 1: Create Project → Create Tasks → Verify Association
console.log('--- Test 1: Create Project and Associated Tasks ---');
let projects = [];
let tasks = [];
let projectCounter = 1;
let taskCounter = 1;

const projectResult = createProject({
    name: 'Test Project',
    description: 'Integration test project',
    startDate: '2025-01-01',
    endDate: '2025-12-31'
}, projects, projectCounter);

projects = projectResult.projects;
projectCounter = projectResult.projectCounter;
const project = projectResult.project;

// Create 3 tasks for this project
const task1Result = createTask({
    title: 'Task 1',
    projectId: project.id,
    status: 'todo',
    priority: 'high'
}, tasks, taskCounter, []);

tasks = task1Result.tasks;
taskCounter = task1Result.taskCounter;

const task2Result = createTask({
    title: 'Task 2',
    projectId: project.id,
    status: 'progress',
    priority: 'medium'
}, tasks, taskCounter, []);

tasks = task2Result.tasks;
taskCounter = task2Result.taskCounter;

const task3Result = createTask({
    title: 'Task 3',
    projectId: project.id,
    status: 'done',
    priority: 'low'
}, tasks, taskCounter, []);

tasks = task3Result.tasks;
taskCounter = task3Result.taskCounter;

assert(projects.length === 1, 'Project created');
assert(tasks.length === 3, '3 tasks created');
assert(tasks.every(t => t.projectId === project.id), 'All tasks associated with project');

const projectTasks = getProjectTasks(project.id, tasks);
assert(projectTasks.length === 3, 'getProjectTasks returns 3 tasks');

// Test 2: Delete Project (Keep Tasks) → Verify Tasks' projectId Cleared
console.log('\n--- Test 2: Delete Project and Clear Task Associations ---');

const deleteResult = deleteProject(project.id, projects, tasks, true);
projects = deleteResult.projects;
tasks = deleteResult.tasks;

assert(projects.length === 0, 'Project deleted');
assert(tasks.length === 3, 'Tasks still exist');
assert(tasks.every(t => t.projectId === null), 'All tasks have projectId cleared');

const clearedProjectTasks = getProjectTasks(project.id, tasks);
assert(clearedProjectTasks.length === 0, 'No tasks associated with deleted project');

// Test 3: Create Project → Create Tasks → Delete Project (Delete Tasks Option)
console.log('\n--- Test 3: Delete Project Without Clearing Associations ---');

// Reset state
projects = [];
tasks = [];
projectCounter = 1;
taskCounter = 1;

const project2Result = createProject({
    name: 'Project to Delete',
    description: 'Will be deleted'
}, projects, projectCounter);

projects = project2Result.projects;
projectCounter = project2Result.projectCounter;
const project2 = project2Result.project;

// Create 2 tasks
const task4Result = createTask({
    title: 'Task 4',
    projectId: project2.id
}, tasks, taskCounter, []);

tasks = task4Result.tasks;
taskCounter = task4Result.taskCounter;

const task5Result = createTask({
    title: 'Task 5',
    projectId: project2.id
}, tasks, taskCounter, []);

tasks = task5Result.tasks;
taskCounter = task5Result.taskCounter;

// Simulate app.js behavior: manually delete tasks first
tasks = tasks.filter(t => t.projectId !== project2.id);

// Then delete project without clearing (since tasks already deleted)
const delete2Result = deleteProject(project2.id, projects, tasks, false);
projects = delete2Result.projects;

assert(projects.length === 0, 'Project deleted');
assert(tasks.length === 0, 'Tasks were deleted separately');

// Test 4: Duplicate Task with Project Association
console.log('\n--- Test 4: Duplicate Task with Project Association ---');

projects = [];
tasks = [];
projectCounter = 1;
taskCounter = 1;

const project3Result = createProject({
    name: 'Project for Duplication Test'
}, projects, projectCounter);

projects = project3Result.projects;
projectCounter = project3Result.projectCounter;
const project3 = project3Result.project;

const task6Result = createTask({
    title: 'Original Task',
    description: 'Original description',
    projectId: project3.id,
    priority: 'high',
    status: 'progress',
    tags: ['tag1', 'tag2']
}, tasks, taskCounter, []);

tasks = task6Result.tasks;
taskCounter = task6Result.taskCounter;
const task6 = task6Result.task;

const dupResult = duplicateTask(task6.id, tasks, taskCounter);
tasks = dupResult.tasks;
taskCounter = dupResult.taskCounter;
const duplicatedTask = dupResult.task;

assert(duplicatedTask !== null, 'Task duplicated');
assert(duplicatedTask.projectId === project3.id, 'Duplicated task maintains project association');
assert(duplicatedTask.title === 'Copy Original Task', 'Duplicated task has Copy prefix');
assert(duplicatedTask.priority === 'high', 'Duplicated task has same priority');
assert(duplicatedTask.status === 'progress', 'Duplicated task has same status');

const project3Tasks = getProjectTasks(project3.id, tasks);
assert(project3Tasks.length === 2, 'Project now has 2 tasks (original + duplicate)');

// Test 5: Update Project → Verify Tasks Remain Associated
console.log('\n--- Test 5: Update Project Does Not Affect Task Associations ---');

const updateProjectResult = updateProject(project3.id, {
    name: 'Updated Project Name',
    description: 'Updated description',
    startDate: '2025-06-01',
    endDate: '2025-12-31'
}, projects);

projects = updateProjectResult.projects;
const updatedProject = updateProjectResult.project;

assert(updatedProject.name === 'Updated Project Name', 'Project updated');

// Verify tasks still associated
const stillAssociatedTasks = getProjectTasks(project3.id, tasks);
assert(stillAssociatedTasks.length === 2, 'Tasks still associated after project update');
assert(tasks.every(t => t.projectId === project3.id), 'All tasks still have correct projectId');

// Test 6: Update Task → Change Project Association
console.log('\n--- Test 6: Move Task to Different Project ---');

const project4Result = createProject({
    name: 'Second Project'
}, projects, projectCounter);

projects = project4Result.projects;
projectCounter = project4Result.projectCounter;
const project4 = project4Result.project;

// Move task6 from project3 to project4
const moveTaskResult = updateTask(task6.id, {
    projectId: project4.id
}, tasks);

tasks = moveTaskResult.tasks;
const movedTask = moveTaskResult.task;
const oldProjectId = moveTaskResult.oldProjectId;

assert(movedTask.projectId === project4.id, 'Task moved to new project');
assert(oldProjectId === project3.id, 'Old project ID tracked');

const project3TasksAfterMove = getProjectTasks(project3.id, tasks);
const project4TasksAfterMove = getProjectTasks(project4.id, tasks);

assert(project3TasksAfterMove.length === 1, 'Project 3 now has 1 task (duplicate only)');
assert(project4TasksAfterMove.length === 1, 'Project 4 now has 1 task (moved task)');

// Test 7: Remove Task from Project (Set projectId to null)
console.log('\n--- Test 7: Remove Task from Project ---');

const removeFromProjectResult = updateTaskField(duplicatedTask.id, 'projectId', '', tasks);
tasks = removeFromProjectResult.tasks;

assert(removeFromProjectResult.task.projectId === null, 'Task projectId set to null');

const project3TasksAfterRemoval = getProjectTasks(project3.id, tasks);
assert(project3TasksAfterRemoval.length === 0, 'Project 3 has no tasks after removal');

// Test 8: Delete Task → Verify Project Task Count
console.log('\n--- Test 8: Delete Task Reduces Project Task Count ---');

const deleteTaskResult = deleteTask(movedTask.id, tasks);
tasks = deleteTaskResult.tasks;

assert(deleteTaskResult.task !== null, 'Task deleted');
assert(tasks.length === 1, '1 task remains');

const project4TasksAfterDelete = getProjectTasks(project4.id, tasks);
assert(project4TasksAfterDelete.length === 0, 'Project 4 has no tasks after deletion');

// Test 9: Multiple Projects with Overlapping Tasks
console.log('\n--- Test 9: Multiple Projects with Tasks ---');

projects = [];
tasks = [];
projectCounter = 1;
taskCounter = 1;

// Create 3 projects
const projectA = createProject({ name: 'Project A' }, projects, projectCounter);
projects = projectA.projects;
projectCounter = projectA.projectCounter;

const projectB = createProject({ name: 'Project B' }, projects, projectCounter);
projects = projectB.projects;
projectCounter = projectB.projectCounter;

const projectC = createProject({ name: 'Project C' }, projects, projectCounter);
projects = projectC.projects;
projectCounter = projectC.projectCounter;

// Create tasks for each project
for (let i = 0; i < 3; i++) {
    const result = createTask({
        title: `Task A${i + 1}`,
        projectId: projectA.project.id
    }, tasks, taskCounter, []);
    tasks = result.tasks;
    taskCounter = result.taskCounter;
}

for (let i = 0; i < 2; i++) {
    const result = createTask({
        title: `Task B${i + 1}`,
        projectId: projectB.project.id
    }, tasks, taskCounter, []);
    tasks = result.tasks;
    taskCounter = result.taskCounter;
}

for (let i = 0; i < 4; i++) {
    const result = createTask({
        title: `Task C${i + 1}`,
        projectId: projectC.project.id
    }, tasks, taskCounter, []);
    tasks = result.tasks;
    taskCounter = result.taskCounter;
}

assert(projects.length === 3, '3 projects created');
assert(tasks.length === 9, '9 tasks created total');
assert(getProjectTasks(projectA.project.id, tasks).length === 3, 'Project A has 3 tasks');
assert(getProjectTasks(projectB.project.id, tasks).length === 2, 'Project B has 2 tasks');
assert(getProjectTasks(projectC.project.id, tasks).length === 4, 'Project C has 4 tasks');

// Delete project B
const deleteBResult = deleteProject(projectB.project.id, projects, tasks, true);
projects = deleteBResult.projects;
tasks = deleteBResult.tasks;

assert(projects.length === 2, 'Project B deleted');
assert(tasks.length === 9, 'All tasks still exist');

const projectBTasksAfterDelete = getProjectTasks(projectB.project.id, tasks);
assert(projectBTasksAfterDelete.length === 0, 'Project B has no tasks');

const tasksWithNullProject = tasks.filter(t => t.projectId === null);
assert(tasksWithNullProject.length === 2, '2 tasks have null projectId (former Project B tasks)');

// Test 10: Complex Workflow - Full Lifecycle
console.log('\n--- Test 10: Complex Workflow - Full Lifecycle ---');

projects = [];
tasks = [];
projectCounter = 1;
taskCounter = 1;

// 1. Create project
const wfProject = createProject({
    name: 'Workflow Project',
    startDate: '2025-01-01',
    endDate: '2025-12-31'
}, projects, projectCounter);

projects = wfProject.projects;
projectCounter = wfProject.projectCounter;

// 2. Create 5 tasks
for (let i = 0; i < 5; i++) {
    const result = createTask({
        title: `Workflow Task ${i + 1}`,
        projectId: wfProject.project.id,
        status: i % 2 === 0 ? 'todo' : 'progress'
    }, tasks, taskCounter, []);
    tasks = result.tasks;
    taskCounter = result.taskCounter;
}

assert(tasks.length === 5, '5 tasks created');

// 3. Update 2 tasks
const updateWf1 = updateTask(1, { status: 'done' }, tasks);
tasks = updateWf1.tasks;

const updateWf2 = updateTask(3, { priority: 'high' }, tasks);
tasks = updateWf2.tasks;

assert(updateWf1.task.status === 'done', 'Task 1 status updated');
assert(updateWf2.task.priority === 'high', 'Task 3 priority updated');

// 4. Delete 1 task
const deleteWf = deleteTask(5, tasks);
tasks = deleteWf.tasks;

assert(tasks.length === 4, '1 task deleted, 4 remain');

// 5. Update project dates
const updateWfProject = updateProjectField(wfProject.project.id, 'endDate', '2025-06-30', projects);
projects = updateWfProject.projects;

assert(updateWfProject.project.endDate === '2025-06-30', 'Project end date updated');

// 6. Delete project (keep tasks)
const deleteWfProject = deleteProject(wfProject.project.id, projects, tasks, true);
projects = deleteWfProject.projects;
tasks = deleteWfProject.tasks;

assert(projects.length === 0, 'Project deleted');
assert(tasks.length === 4, 'All 4 tasks still exist');
assert(tasks.every(t => t.projectId === null), 'All tasks have projectId cleared');

// Test 11: Counter Synchronization Across Operations
console.log('\n--- Test 11: Counter Synchronization ---');

projects = [];
tasks = [];
projectCounter = 100; // Start at 100
taskCounter = 200;   // Start at 200

const p1 = createProject({ name: 'P1' }, projects, projectCounter);
projects = p1.projects;
projectCounter = p1.projectCounter;

const t1 = createTask({ title: 'T1' }, tasks, taskCounter, []);
tasks = t1.tasks;
taskCounter = t1.taskCounter;

const p2 = createProject({ name: 'P2' }, projects, projectCounter);
projects = p2.projects;
projectCounter = p2.projectCounter;

const t2 = createTask({ title: 'T2' }, tasks, taskCounter, []);
tasks = t2.tasks;
taskCounter = t2.taskCounter;

assert(p1.project.id === 100, 'First project ID is 100');
assert(p2.project.id === 101, 'Second project ID is 101');
assert(t1.task.id === 200, 'First task ID is 200');
assert(t2.task.id === 201, 'Second task ID is 201');
assert(projectCounter === 102, 'Project counter is 102');
assert(taskCounter === 202, 'Task counter is 202');

// Test 12: Orphaned Task Prevention
console.log('\n--- Test 12: No Orphaned Tasks After Operations ---');

// Start fresh
projects = [];
tasks = [];
projectCounter = 1;
taskCounter = 1;

// Create project and tasks
const orphanProject = createProject({ name: 'Orphan Test' }, projects, projectCounter);
projects = orphanProject.projects;
projectCounter = orphanProject.projectCounter;

const orphanTask1 = createTask({ title: 'OT1', projectId: orphanProject.project.id }, tasks, taskCounter, []);
tasks = orphanTask1.tasks;
taskCounter = orphanTask1.taskCounter;

const orphanTask2 = createTask({ title: 'OT2', projectId: orphanProject.project.id }, tasks, taskCounter, []);
tasks = orphanTask2.tasks;
taskCounter = orphanTask2.taskCounter;

// Delete project WITH clearing associations
const orphanDelete = deleteProject(orphanProject.project.id, projects, tasks, true);
projects = orphanDelete.projects;
tasks = orphanDelete.tasks;

// Verify no orphaned tasks
const orphanedTasks = tasks.filter(t => {
    if (t.projectId === null) return false;
    return !projects.find(p => p.id === t.projectId);
});

assert(orphanedTasks.length === 0, 'No orphaned tasks (projectId points to non-existent project)');
assert(tasks.every(t => t.projectId === null), 'All tasks have null projectId after project deletion');

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
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED! 🎉');
    console.log('\nCoverage:');
    console.log('- Cross-service operations');
    console.log('- Task-project associations');
    console.log('- Project deletion with task handling');
    console.log('- Task duplication with projects');
    console.log('- Moving tasks between projects');
    console.log('- Multi-project scenarios');
    console.log('- Complex workflows');
    console.log('- Counter synchronization');
    console.log('- Orphaned task prevention');
    process.exit(0);
}
