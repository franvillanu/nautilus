// Regression Test Suite
// Validates that core functionality remains intact after bug fixes

import { escapeHtml, sanitizeInput } from "../src/utils/html.js";
import {
    createTask,
    updateTask,
    updateTaskField,
    deleteTask,
    duplicateTask
} from "../src/services/taskService.js";
import {
    createProject,
    updateProject,
    deleteProject
} from "../src/services/projectService.js";

let testsPassed = 0;
let testsFailed = 0;
const errors = [];

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        console.log(`✅ PASS: ${message}`);
        return true;
    } else {
        testsFailed++;
        errors.push(message);
        console.log(`❌ FAIL: ${message}`);
        return false;
    }
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║           REGRESSION TEST SUITE                            ║');
console.log('║  Validates core functionality after bug fixes              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// CORE FUNCTIONALITY: Task Service
// ============================================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔬 TEST GROUP 1: Task Service (CRUD Operations)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1.1: Create Task
console.log('--- Test 1.1: Create Task ---');
let tasks = [];
let taskCounter = 1;
const taskData = {
    title: "Test Task",
    description: "Test description",
    status: "todo",
    priority: "high",
    projectId: null,
    startDate: "2025-11-01",
    endDate: "2025-11-30"
};
const createResult = createTask(taskData, tasks, taskCounter);
tasks = createResult.tasks;
taskCounter = createResult.taskCounter;
assert(createResult.task !== null, 'Task created successfully');
assert(createResult.task.id === 1, 'Task has correct ID');
assert(createResult.task.title === "Test Task", 'Task has correct title');
assert(tasks.length === 1, 'Tasks array contains 1 task');
assert(taskCounter === 2, 'Task counter incremented');

// Test 1.2: Update Task
console.log('\n--- Test 1.2: Update Task ---');
const updateResult = updateTask(1, { title: "Updated Task" }, tasks);
tasks = updateResult.tasks;
assert(updateResult.task !== null, 'Task updated successfully');
assert(updateResult.task.title === "Updated Task", 'Task title updated');
assert(tasks[0].title === "Updated Task", 'Update reflected in array');

// Test 1.3: Update Task Field
console.log('\n--- Test 1.3: Update Task Field ---');
const fieldResult = updateTaskField(1, 'status', 'done', tasks);
tasks = fieldResult.tasks;
assert(fieldResult.task !== null, 'Task field updated');
assert(fieldResult.task.status === 'done', 'Status changed to done');

// Test 1.4: Duplicate Task
console.log('\n--- Test 1.4: Duplicate Task ---');
const dupResult = duplicateTask(1, tasks, taskCounter);
tasks = dupResult.tasks;
taskCounter = dupResult.taskCounter;
assert(dupResult.task !== null, 'Task duplicated');
assert(tasks.length === 2, 'Tasks array now has 2 tasks');
assert(dupResult.task.id === 2, 'Duplicate has new ID');
assert(dupResult.task.title.startsWith('Copy '), 'Duplicate has "Copy " prefix');

// Test 1.5: Delete Task
console.log('\n--- Test 1.5: Delete Task ---');
const deleteResult = deleteTask(2, tasks);
tasks = deleteResult.tasks;
assert(deleteResult.task !== null, 'Task deleted');
assert(tasks.length === 1, 'Tasks array back to 1 task');
assert(!tasks.find(t => t.id === 2), 'Deleted task not in array');

// ============================================================================
// CORE FUNCTIONALITY: Project Service
// ============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔬 TEST GROUP 2: Project Service (CRUD Operations)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 2.1: Create Project
console.log('--- Test 2.1: Create Project ---');
let projects = [];
let projectCounter = 1;
const projectData = {
    name: "Test Project",
    description: "Test description",
    startDate: "2025-11-01"
};
const createProjResult = createProject(projectData, projects, projectCounter);
projects = createProjResult.projects;
projectCounter = createProjResult.projectCounter;
assert(createProjResult.project !== null, 'Project created successfully');
assert(createProjResult.project.id === 1, 'Project has correct ID');
assert(projects.length === 1, 'Projects array contains 1 project');

// Test 2.2: Update Project
console.log('\n--- Test 2.2: Update Project ---');
const updateProjResult = updateProject(1, { name: "Updated Project" }, projects);
projects = updateProjResult.projects;
assert(updateProjResult.project !== null, 'Project updated successfully');
assert(updateProjResult.project.name === "Updated Project", 'Project name updated');

// Test 2.3: Delete Project (clears task associations)
console.log('\n--- Test 2.3: Delete Project with Task Association ---');
tasks[0].projectId = 1; // Associate task with project
const deleteProjResult = deleteProject(1, projects, tasks, true);
projects = deleteProjResult.projects;
tasks = deleteProjResult.tasks;
assert(deleteProjResult.project !== null, 'Project deleted');
assert(projects.length === 0, 'Projects array empty');
assert(tasks[0].projectId === null, 'Task association cleared');

// ============================================================================
// CORE FUNCTIONALITY: Data Validation
// ============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔬 TEST GROUP 3: Data Validation & Integrity');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 3.1: Required Fields
console.log('--- Test 3.1: Task with Minimal Required Fields ---');
const minimalTask = {
    title: "Minimal Task",
    description: "",
    status: "todo",
    priority: "medium",
    projectId: null,
    startDate: "",
    endDate: ""
};
const minResult = createTask(minimalTask, [], 1);
assert(minResult.task !== null, 'Task created with minimal fields');
assert(minResult.task.tags !== undefined, 'Task has tags array');
assert(Array.isArray(minResult.task.tags), 'Tags is an array');

// Test 3.2: ID Uniqueness
console.log('\n--- Test 3.2: ID Uniqueness ---');
const task1 = createTask({ title: "Task 1" }, [], 1);
const task2 = createTask({ title: "Task 2" }, task1.tasks, task1.taskCounter);
assert(task1.task.id !== task2.task.id, 'Task IDs are unique');
assert(task2.task.id === task1.task.id + 1, 'IDs increment correctly');

// Test 3.3: Immutability
console.log('\n--- Test 3.3: Service Functions Return New Arrays ---');
const originalTasks = [{ id: 1, title: "Original" }];
const updateImm = updateTask(1, { title: "Modified" }, originalTasks);
assert(updateImm.tasks !== originalTasks, 'Update returns new array');
assert(originalTasks[0].title === "Original", 'Original array unchanged');
assert(updateImm.tasks[0].title === "Modified", 'New array has changes');

// ============================================================================
// CORE FUNCTIONALITY: HTML Utilities
// ============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔬 TEST GROUP 4: HTML Utilities (XSS Protection)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 4.1: escapeHtml
console.log('--- Test 4.1: HTML Escaping ---');
const dangerous = '<script>alert("xss")</script>';
const escaped = escapeHtml(dangerous);
assert(!escaped.includes('<script>'), 'Script tags escaped');
assert(escaped.includes('&lt;'), 'Less-than escaped');
assert(escaped.includes('&gt;'), 'Greater-than escaped');

// Test 4.2: sanitizeInput
console.log('\n--- Test 4.2: Input Sanitization ---');
const dirtyInput = '  <b>Hello</b>  ';
const clean = sanitizeInput(dirtyInput);
assert(!clean.includes('<b>'), 'HTML tags removed');
assert(clean === '&lt;b&gt;Hello&lt;/b&gt;', 'Trimmed and escaped');

// ============================================================================
// CORE FUNCTIONALITY: Edge Cases
// ============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔬 TEST GROUP 5: Edge Cases & Error Handling');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 5.1: Update Non-Existent Task
console.log('--- Test 5.1: Update Non-Existent Task ---');
const noTask = updateTask(999, { title: "Ghost" }, tasks);
assert(noTask.task === null, 'Returns null for non-existent task');
assert(noTask.tasks === tasks, 'Original array unchanged');

// Test 5.2: Delete Non-Existent Task
console.log('\n--- Test 5.2: Delete Non-Existent Task ---');
const noDelete = deleteTask(999, tasks);
assert(noDelete.task === null, 'Returns null for non-existent task');
assert(noDelete.tasks === tasks, 'Original array unchanged');

// Test 5.3: Empty Arrays
console.log('\n--- Test 5.3: Operations on Empty Arrays ---');
const emptyUpdate = updateTask(1, { title: "Test" }, []);
assert(emptyUpdate.task === null, 'Handles empty task array');
assert(Array.isArray(emptyUpdate.tasks), 'Returns array even when empty');

// Test 5.4: Project Deletion with Multiple Tasks
console.log('\n--- Test 5.4: Project Deletion Clears All Task Associations ---');
let multiTasks = [
    { id: 1, title: "Task 1", projectId: 5 },
    { id: 2, title: "Task 2", projectId: 5 },
    { id: 3, title: "Task 3", projectId: 6 }
];
let multiProjects = [{ id: 5, name: "Project A" }];
const multiDelete = deleteProject(5, multiProjects, multiTasks, true);
assert(multiDelete.tasks[0].projectId === null, 'Task 1 cleared');
assert(multiDelete.tasks[1].projectId === null, 'Task 2 cleared');
assert(multiDelete.tasks[2].projectId === 6, 'Task 3 unchanged');

// ============================================================================
// INTEGRATION: Task-Project Relationship
// ============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔬 TEST GROUP 6: Task-Project Integration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 6.1: Create Task with Project
console.log('--- Test 6.1: Create Task with Project Association ---');
projects = createProject({ name: "Project X", startDate: "2025-11-01" }, [], 1).projects;
const projTask = createTask({ title: "Project Task", projectId: 1 }, [], 1);
assert(projTask.task.projectId === 1, 'Task associated with project');

// Test 6.2: Update Task Project
console.log('\n--- Test 6.2: Update Task Project Association ---');
const changeProj = updateTaskField(1, 'projectId', null, projTask.tasks);
assert(changeProj.task.projectId === null, 'Project association updated');
assert(changeProj.oldProjectId === 1, 'Old project tracked');

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                  REGRESSION TEST SUMMARY                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

if (testsFailed > 0) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    FAILED TESTS                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    console.log('\n⚠️  REGRESSION DETECTED: Core functionality broken!\n');
    process.exit(1);
} else {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║    ✅ ALL CORE FUNCTIONALITY INTACT! ✅                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Verified Functionality:');
    console.log('  ✅ Task CRUD operations (create, update, delete, duplicate)');
    console.log('  ✅ Project CRUD operations');
    console.log('  ✅ Task-Project associations');
    console.log('  ✅ Data validation & integrity');
    console.log('  ✅ HTML escaping & XSS protection');
    console.log('  ✅ Edge case handling');
    console.log('  ✅ Immutability patterns');
    console.log('  ✅ ID generation & uniqueness\n');

    process.exit(0);
}
