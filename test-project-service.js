// Comprehensive QA Test Suite for Project Service
// Tests all CRUD operations, edge cases, and error conditions

import {
    createProject,
    updateProject,
    updateProjectField,
    deleteProject,
    getProjectTasks,
    validateProject
} from './src/services/projectService.js';

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

console.log('\n=== PROJECT SERVICE QA TEST SUITE ===\n');

// Test 1: Project Creation - Basic
console.log('--- Test 1: Basic Project Creation ---');
let projects = [];
let projectCounter = 1;

const result1 = createProject({
    name: 'Test Project',
    description: 'Test Description',
    startDate: '2025-01-01',
    endDate: '2025-01-31'
}, projects, projectCounter);

assert(result1.project !== null, 'Project created successfully');
assert(result1.project.id === 1, 'Project ID is 1');
assert(result1.project.name === 'Test Project', 'Project name is correct');
assert(result1.project.description === 'Test Description', 'Project description is correct');
assert(result1.project.startDate === '2025-01-01', 'Start date is correct');
assert(result1.project.endDate === '2025-01-31', 'End date is correct');
assert(result1.projectCounter === 2, 'Project counter incremented to 2');
assert(result1.projects.length === 1, 'Projects array has 1 project');
assert(result1.project.createdAt !== undefined, 'CreatedAt timestamp exists');

// Test 2: Project Creation - Default Values
console.log('\n--- Test 2: Project Creation with Minimal Data ---');
const result2 = createProject({
    name: 'Minimal Project'
}, result1.projects, result1.projectCounter);

assert(result2.project.name === 'Minimal Project', 'Name is set');
assert(result2.project.description === '', 'Default description is empty');
assert(result2.project.startDate === '', 'Default startDate is empty');
assert(result2.project.endDate === '', 'Default endDate is empty');
assert(result2.projectCounter === 3, 'Project counter incremented');

projects = result2.projects;
projectCounter = result2.projectCounter;

// Test 3: Project Update - Full Update
console.log('\n--- Test 3: Full Project Update ---');
const result3 = updateProject(1, {
    name: 'Updated Project',
    description: 'Updated Description',
    startDate: '2025-02-01',
    endDate: '2025-02-28'
}, projects);

assert(result3.project !== null, 'Project updated successfully');
assert(result3.project.name === 'Updated Project', 'Name updated');
assert(result3.project.description === 'Updated Description', 'Description updated');
assert(result3.project.startDate === '2025-02-01', 'Start date updated');
assert(result3.project.endDate === '2025-02-28', 'End date updated');

projects = result3.projects;

// Test 4: Project Update - Partial Update
console.log('\n--- Test 4: Partial Project Update ---');
const result4 = updateProject(1, {
    name: 'Partially Updated'
}, projects);

assert(result4.project.name === 'Partially Updated', 'Name updated');
assert(result4.project.description === 'Updated Description', 'Other fields unchanged');

projects = result4.projects;

// Test 5: Project Update - Non-existent Project
console.log('\n--- Test 5: Update Non-existent Project ---');
const result5 = updateProject(999, { name: 'Should Fail' }, projects);

assert(result5.project === null, 'Returns null for non-existent project');
assert(result5.projects === projects, 'Projects array unchanged');

// Test 6: Update Project Field - Name Change
console.log('\n--- Test 6: Update Single Field (Name) ---');
const result6 = updateProjectField(1, 'name', 'Field Updated Name', projects);

assert(result6.project !== null, 'Field updated successfully');
assert(result6.project.name === 'Field Updated Name', 'Name updated');

projects = result6.projects;

// Test 7: Update Project Field - Description
console.log('\n--- Test 7: Update Single Field (Description) ---');
const result7 = updateProjectField(1, 'description', 'New description', projects);

assert(result7.project.description === 'New description', 'Description updated');

projects = result7.projects;

// Test 8: Update Project Field - Date Conversion (DMY)
console.log('\n--- Test 8: Date Field with DMY Format ---');

// Mock date conversion functions for testing
global.looksLikeDMY = (str) => /^\d{2}\/\d{2}\/\d{4}$/.test(str);
global.looksLikeISO = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);
global.toISOFromDMY = (dmy) => {
    const [d, m, y] = dmy.split('/');
    return `${y}-${m}-${d}`;
};

const result8 = updateProjectField(1, 'startDate', '15/03/2025', projects);

assert(result8.project.startDate === '2025-03-15', 'DMY date converted to ISO');

projects = result8.projects;

// Test 9: Update Project Field - Date Conversion (ISO)
console.log('\n--- Test 9: Date Field with ISO Format ---');
const result9 = updateProjectField(1, 'endDate', '2025-03-31', projects);

assert(result9.project.endDate === '2025-03-31', 'ISO date preserved');

projects = result9.projects;

// Test 10: Update Project Field - Non-existent Project
console.log('\n--- Test 10: Update Field on Non-existent Project ---');
const result10 = updateProjectField(999, 'name', 'Should Fail', projects);

assert(result10.project === null, 'Returns null for non-existent project');
assert(result10.projects === projects, 'Projects array unchanged');

// Test 11: Delete Project - Without Tasks
console.log('\n--- Test 11: Delete Project (No Tasks) ---');
const result11 = deleteProject(2, projects);

assert(result11.project !== null, 'Deleted project returned');
assert(result11.project.id === 2, 'Correct project deleted');
assert(result11.projects.length === projects.length - 1, 'Projects array length decreased');
assert(!result11.projects.find(p => p.id === 2), 'Project removed from array');

projects = result11.projects;

// Test 12: Delete Project - Non-existent
console.log('\n--- Test 12: Delete Non-existent Project ---');
const result12 = deleteProject(999, projects);

assert(result12.project === null, 'Returns null for non-existent project');
assert(result12.projects === projects, 'Projects array unchanged');

// Test 13: Delete Project - With Tasks (Clear Associations)
console.log('\n--- Test 13: Delete Project and Clear Task Associations ---');
let tasks = [
    { id: 1, title: 'Task 1', projectId: 1 },
    { id: 2, title: 'Task 2', projectId: 1 },
    { id: 3, title: 'Task 3', projectId: null }
];

const result13 = deleteProject(1, projects, tasks, true);

assert(result13.project !== null, 'Project deleted');
assert(result13.projects.length === 0, 'Project removed from array');
assert(result13.tasks !== null, 'Tasks array returned');
assert(result13.tasks[0].projectId === null, 'Task 1 projectId cleared');
assert(result13.tasks[1].projectId === null, 'Task 2 projectId cleared');
assert(result13.tasks[2].projectId === null, 'Task 3 projectId unchanged');

// Test 14: Get Project Tasks
console.log('\n--- Test 14: Get Project Tasks ---');
const tasks2 = [
    { id: 1, title: 'Task 1', projectId: 5 },
    { id: 2, title: 'Task 2', projectId: 5 },
    { id: 3, title: 'Task 3', projectId: 10 },
    { id: 4, title: 'Task 4', projectId: null }
];

const projectTasks = getProjectTasks(5, tasks2);

assert(projectTasks.length === 2, 'Returns 2 tasks for project 5');
assert(projectTasks[0].id === 1, 'First task is correct');
assert(projectTasks[1].id === 2, 'Second task is correct');

// Test 15: Get Project Tasks - No Tasks
console.log('\n--- Test 15: Get Project Tasks (Empty) ---');
const emptyProjectTasks = getProjectTasks(999, tasks2);

assert(emptyProjectTasks.length === 0, 'Returns empty array for project with no tasks');

// Test 16: Validate Project - Valid Data
console.log('\n--- Test 16: Validate Valid Project ---');
const validation1 = validateProject({
    name: 'Valid Project',
    description: 'Valid description',
    startDate: '2025-01-01',
    endDate: '2025-12-31'
});

assert(validation1.valid === true, 'Valid project passes validation');
assert(validation1.errors.length === 0, 'No validation errors');

// Test 17: Validate Project - Missing Name
console.log('\n--- Test 17: Validate Project Missing Name ---');
const validation2 = validateProject({
    description: 'Missing name',
    startDate: '2025-01-01'
});

assert(validation2.valid === false, 'Invalid project fails validation');
assert(validation2.errors.includes('Project name is required'), 'Name error present');

// Test 18: Validate Project - Empty Name
console.log('\n--- Test 18: Validate Project Empty Name ---');
const validation3 = validateProject({
    name: '   ',
    startDate: '2025-01-01'
});

assert(validation3.valid === false, 'Empty name fails validation');

// Test 19: Validate Project - Invalid Start Date Format
console.log('\n--- Test 19: Validate Invalid Start Date Format ---');
const validation4 = validateProject({
    name: 'Test',
    startDate: '01/01/2025'  // DMY format, not ISO
});

assert(validation4.valid === false, 'Invalid date format fails validation');
assert(validation4.errors.some(e => e.includes('start date')), 'Start date error present');

// Test 20: Validate Project - Invalid End Date Format
console.log('\n--- Test 20: Validate Invalid End Date Format ---');
const validation5 = validateProject({
    name: 'Test',
    endDate: 'not-a-date'
});

assert(validation5.valid === false, 'Invalid end date fails validation');
assert(validation5.errors.some(e => e.includes('end date')), 'End date error present');

// Test 21: Validate Project - End Before Start
console.log('\n--- Test 21: Validate End Date Before Start Date ---');
const validation6 = validateProject({
    name: 'Test',
    startDate: '2025-12-31',
    endDate: '2025-01-01'
});

assert(validation6.valid === false, 'End before start fails validation');
assert(validation6.errors.some(e => e.includes('before start')), 'Date logic error present');

// Test 22: Project Immutability - Create
console.log('\n--- Test 22: Create Project Immutability ---');
const originalProjects = [{ id: 1, name: 'Original' }];
const result22 = createProject({ name: 'New Project' }, originalProjects, 2);

assert(result22.projects !== originalProjects, 'New array returned (not mutated)');
assert(originalProjects.length === 1, 'Original array unchanged');
assert(result22.projects.length === 2, 'New array has new project');

// Test 23: Project Immutability - Update
console.log('\n--- Test 23: Update Project Immutability ---');
const originalProjects2 = [{ id: 1, name: 'Original', description: 'Original desc' }];
const result23 = updateProject(1, { name: 'Updated' }, originalProjects2);

assert(result23.projects !== originalProjects2, 'New array returned');
assert(originalProjects2[0].name === 'Original', 'Original project unchanged');
assert(result23.projects[0].name === 'Updated', 'New project has update');

// Test 24: Project Immutability - Delete
console.log('\n--- Test 24: Delete Project Immutability ---');
const originalProjects3 = [{ id: 1, name: 'Project 1' }, { id: 2, name: 'Project 2' }];
const result24 = deleteProject(1, originalProjects3);

assert(result24.projects !== originalProjects3, 'New array returned');
assert(originalProjects3.length === 2, 'Original array unchanged');
assert(result24.projects.length === 1, 'New array has project removed');

// Test 25: Task Association Immutability
console.log('\n--- Test 25: Task Association Clearing Immutability ---');
const originalTasks = [{ id: 1, projectId: 10 }, { id: 2, projectId: 10 }];
const result25 = deleteProject(10, [{ id: 10, name: 'Test' }], originalTasks, true);

assert(result25.tasks !== originalTasks, 'New tasks array returned');
assert(originalTasks[0].projectId === 10, 'Original tasks unchanged');
assert(result25.tasks[0].projectId === null, 'New tasks have cleared associations');

// Test 26: Delete Project Without Clearing Associations
console.log('\n--- Test 26: Delete Project Without Clearing Associations ---');
const tasksWithProject = [{ id: 1, projectId: 20 }, { id: 2, projectId: 20 }];
const result26 = deleteProject(20, [{ id: 20, name: 'Test' }], tasksWithProject, false);

assert(result26.tasks === tasksWithProject, 'Tasks array unchanged when not clearing');
assert(result26.project !== null, 'Project still deleted');

// Test 27: Validate Project - Valid Dates Only
console.log('\n--- Test 27: Validate Project with Valid Dates Only ---');
const validation7 = validateProject({
    name: 'Test',
    startDate: '2025-01-01',
    endDate: '2025-12-31'
});

assert(validation7.valid === true, 'Valid dates pass validation');

// Test 28: Counter Incrementation
console.log('\n--- Test 28: Project Counter Increments Correctly ---');
let counter = 100;
const result28a = createProject({ name: 'Project 1' }, [], counter);
const result28b = createProject({ name: 'Project 2' }, result28a.projects, result28a.projectCounter);
const result28c = createProject({ name: 'Project 3' }, result28b.projects, result28b.projectCounter);

assert(result28a.project.id === 100, 'First project ID is 100');
assert(result28b.project.id === 101, 'Second project ID is 101');
assert(result28c.project.id === 102, 'Third project ID is 102');
assert(result28c.projectCounter === 103, 'Final counter is 103');

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
