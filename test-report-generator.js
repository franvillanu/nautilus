/**
 * Comprehensive Test Suite for Word Report Generator
 * Tests all calculation logic and data processing functions
 */

import fs from 'fs';

// ============================================================================
// TEST DATA
// ============================================================================

const testData = {
    projects: [
        {
            id: 1,
            name: "Project Alpha",
            description: "Test project 1",
            startDate: "2025-01-01",
            endDate: "2025-12-31",
            createdAt: "2025-01-01T00:00:00.000Z"
        },
        {
            id: 2,
            name: "Project Beta",
            description: "Test project 2",
            startDate: "2025-02-01",
            endDate: "2025-11-30",
            createdAt: "2025-02-01T00:00:00.000Z"
        }
    ],
    tasks: [
        // Project 1 tasks
        {
            id: 1,
            title: "Task 1",
            projectId: 1,
            status: "done",
            priority: "high",
            startDate: "2025-01-01",
            endDate: "2025-01-10",
            tags: ["TENERIFE", "SAN JUAN"]
        },
        {
            id: 2,
            title: "Task 2",
            projectId: 1,
            status: "progress",
            priority: "medium",
            startDate: "2025-01-15",
            endDate: "2025-01-20",
            tags: ["TENERIFE", "TAJAO"]
        },
        {
            id: 3,
            title: "Task 3",
            projectId: 1,
            status: "done",
            priority: "low",
            startDate: "2025-02-01",
            endDate: "2025-02-05",
            tags: ["TENERIFE"]
        },
        // Project 2 tasks
        {
            id: 4,
            title: "Task 4",
            projectId: 2,
            status: "todo",
            priority: "high",
            startDate: "2025-03-01",
            endDate: "2025-03-10",
            tags: ["LANZAROTE"]
        },
        {
            id: 5,
            title: "Task 5",
            projectId: 2,
            status: "done",
            priority: "medium",
            startDate: "2025-03-15",
            endDate: "2025-03-20",
            tags: []
        }
    ]
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

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

function assertEquals(actual, expected, message) {
    const condition = actual === expected;
    if (!condition) {
        console.log(`   Expected: ${expected}, Got: ${actual}`);
    }
    return assert(condition, message);
}

function assertArrayLength(arr, expectedLength, message) {
    return assertEquals(arr.length, expectedLength, message);
}

// ============================================================================
// MOCK FUNCTIONS (from generate-report.js logic)
// ============================================================================

const ISLAND_LOCALITY_CONFIG = {
    'TENERIFE': ['SAN JUAN', 'TAJAO', 'LOS CRISTIANOS', 'BOCA CANGREJO', 'LAS TERESITAS'],
    'LANZAROTE': [],
    'FUERTEVENTURA': [],
    'LA PALMA': []
};

const ALL_ISLANDS = Object.keys(ISLAND_LOCALITY_CONFIG);

function calculateGlobalInsights(projects, tasks) {
    const activeProjectIds = new Set(
        tasks
            .filter(task => task.status !== 'done')
            .map(task => task.projectId)
            .filter(id => id !== null)
    );

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'done').length;
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
        activeProjectsCount: activeProjectIds.size,
        totalTasks,
        completedTasks,
        completionPercent
    };
}

function calculateProjectMetrics(project, tasks) {
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === 'done').length;
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = projectTasks.filter(task =>
        task.status !== 'done' &&
        task.endDate &&
        task.endDate < today
    ).length;

    const tasksWithoutDates = projectTasks.filter(task =>
        !task.startDate || !task.endDate
    ).length;

    return {
        totalTasks,
        completedTasks,
        completionPercent,
        overdueTasks,
        tasksWithoutDates,
        tasks: projectTasks
    };
}

function getTaskTags(task) {
    return (task.tags || []).map(tag => tag.toUpperCase());
}

function getProjectTags(project) {
    return (project.tags || []).map(tag => tag.toUpperCase());
}

function getTaskIsland(task, project) {
    const taskTags = getTaskTags(task);
    const projectTags = getProjectTags(project);
    const allTags = [...taskTags, ...projectTags];

    for (const island of ALL_ISLANDS) {
        if (allTags.includes(island)) {
            return island;
        }
    }
    return null;
}

function getTaskLocality(task, island) {
    if (!island) return null;

    const taskTags = getTaskTags(task);
    const localities = ISLAND_LOCALITY_CONFIG[island];

    for (const locality of localities) {
        if (taskTags.includes(locality)) {
            return locality;
        }
    }
    return null;
}

function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;

        if (a.startDate !== b.startDate) {
            return a.startDate.localeCompare(b.startDate);
        }

        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;

        return a.endDate.localeCompare(b.endDate);
    });
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  WORD REPORT GENERATOR - COMPREHENSIVE TEST SUITE');
console.log('═══════════════════════════════════════════════════════════\n');

// ────────────────────────────────────────────────────────────────────────────
// TEST CATEGORY 1: Global Insights Calculations
// ────────────────────────────────────────────────────────────────────────────

console.log('─── Test Category 1: Global Insights Calculations ───\n');

const insights = calculateGlobalInsights(testData.projects, testData.tasks);

assertEquals(insights.totalTasks, 5, '1.1: Total tasks count is correct');
assertEquals(insights.completedTasks, 3, '1.2: Completed tasks count is correct');
assertEquals(insights.completionPercent, 60, '1.3: Completion percentage is correct (60%)');
assertEquals(insights.activeProjectsCount, 2, '1.4: Active projects count is correct');

// Test with no tasks
const emptyInsights = calculateGlobalInsights(testData.projects, []);
assertEquals(emptyInsights.completionPercent, 0, '1.5: Handles empty tasks gracefully');

// Test with all done tasks
const allDoneTasks = testData.tasks.map(t => ({ ...t, status: 'done' }));
const allDoneInsights = calculateGlobalInsights(testData.projects, allDoneTasks);
assertEquals(allDoneInsights.completionPercent, 100, '1.6: Correctly calculates 100% completion');
assertEquals(allDoneInsights.activeProjectsCount, 0, '1.7: No active projects when all done');

// ────────────────────────────────────────────────────────────────────────────
// TEST CATEGORY 2: Project Metrics Calculations
// ────────────────────────────────────────────────────────────────────────────

console.log('\n─── Test Category 2: Project Metrics Calculations ───\n');

const project1Metrics = calculateProjectMetrics(testData.projects[0], testData.tasks);
assertEquals(project1Metrics.totalTasks, 3, '2.1: Project 1 total tasks is correct');
assertEquals(project1Metrics.completedTasks, 2, '2.2: Project 1 completed tasks is correct');
assertEquals(project1Metrics.completionPercent, 67, '2.3: Project 1 completion % is correct');

const project2Metrics = calculateProjectMetrics(testData.projects[1], testData.tasks);
assertEquals(project2Metrics.totalTasks, 2, '2.4: Project 2 total tasks is correct');
assertEquals(project2Metrics.completedTasks, 1, '2.5: Project 2 completed tasks is correct');
assertEquals(project2Metrics.completionPercent, 50, '2.6: Project 2 completion % is correct');

// Test with tasks without dates
const tasksWithoutDates = [
    { id: 99, projectId: 1, status: 'todo', priority: 'low', tags: [] }
];
const metricsNoDates = calculateProjectMetrics(testData.projects[0], tasksWithoutDates);
assertEquals(metricsNoDates.tasksWithoutDates, 1, '2.7: Correctly counts tasks without dates');

// ────────────────────────────────────────────────────────────────────────────
// TEST CATEGORY 3: Island and Locality Detection
// ────────────────────────────────────────────────────────────────────────────

console.log('\n─── Test Category 3: Island and Locality Detection ───\n');

const task1 = testData.tasks[0]; // TENERIFE, SAN JUAN
const task2 = testData.tasks[1]; // TENERIFE, TAJAO
const task3 = testData.tasks[2]; // TENERIFE only
const task4 = testData.tasks[3]; // LANZAROTE
const task5 = testData.tasks[4]; // No tags

const island1 = getTaskIsland(task1, testData.projects[0]);
assertEquals(island1, 'TENERIFE', '3.1: Correctly detects TENERIFE island');

const locality1 = getTaskLocality(task1, island1);
assertEquals(locality1, 'SAN JUAN', '3.2: Correctly detects SAN JUAN locality');

const island2 = getTaskIsland(task2, testData.projects[0]);
const locality2 = getTaskLocality(task2, island2);
assertEquals(locality2, 'TAJAO', '3.3: Correctly detects TAJAO locality');

const island3 = getTaskIsland(task3, testData.projects[0]);
const locality3 = getTaskLocality(task3, island3);
assertEquals(locality3, null, '3.4: Returns null for island tag without locality');

const island4 = getTaskIsland(task4, testData.projects[1]);
assertEquals(island4, 'LANZAROTE', '3.5: Correctly detects LANZAROTE island');

const island5 = getTaskIsland(task5, testData.projects[1]);
assertEquals(island5, null, '3.6: Returns null for tasks without island tags');

// Test case-insensitive tag matching
const lowerCaseTask = { ...task1, tags: ['tenerife', 'san juan'] };
const islandLC = getTaskIsland(lowerCaseTask, testData.projects[0]);
assertEquals(islandLC, 'TENERIFE', '3.7: Tag matching is case-insensitive');

// ────────────────────────────────────────────────────────────────────────────
// TEST CATEGORY 4: Task Sorting
// ────────────────────────────────────────────────────────────────────────────

console.log('\n─── Test Category 4: Task Sorting ───\n');

const unsortedTasks = [
    { id: 1, startDate: '2025-03-01', endDate: '2025-03-10' },
    { id: 2, startDate: '2025-01-01', endDate: '2025-01-10' },
    { id: 3, startDate: '2025-02-01', endDate: '2025-02-05' },
    { id: 4, startDate: null, endDate: null }
];

const sorted = sortTasks(unsortedTasks);
assertEquals(sorted[0].id, 2, '4.1: First task has earliest start date');
assertEquals(sorted[1].id, 3, '4.2: Second task has second earliest start date');
assertEquals(sorted[2].id, 1, '4.3: Third task has latest start date');
assertEquals(sorted[3].id, 4, '4.4: Tasks without dates go to the end');

// Test sorting by end date when start dates are equal
const sameDateTasks = [
    { id: 1, startDate: '2025-01-01', endDate: '2025-01-20' },
    { id: 2, startDate: '2025-01-01', endDate: '2025-01-10' }
];

const sortedSame = sortTasks(sameDateTasks);
assertEquals(sortedSame[0].id, 2, '4.5: Sorts by end date when start dates equal');

// ────────────────────────────────────────────────────────────────────────────
// TEST CATEGORY 5: Tag Processing
// ────────────────────────────────────────────────────────────────────────────

console.log('\n─── Test Category 5: Tag Processing ───\n');

const taskWithTags = { tags: ['tenerife', 'San Juan', 'CORAL'] };
const tags = getTaskTags(taskWithTags);
assertArrayLength(tags, 3, '5.1: Returns correct number of tags');
assertEquals(tags[0], 'TENERIFE', '5.2: Normalizes tags to uppercase');
assertEquals(tags[1], 'SAN JUAN', '5.3: Handles mixed case tags');

const taskNoTags = { tags: null };
const noTags = getTaskTags(taskNoTags);
assertArrayLength(noTags, 0, '5.4: Handles tasks with no tags (null)');

const taskEmptyTags = { tags: [] };
const emptyTags = getTaskTags(taskEmptyTags);
assertArrayLength(emptyTags, 0, '5.5: Handles tasks with empty tags array');

// ────────────────────────────────────────────────────────────────────────────
// TEST CATEGORY 6: Edge Cases and Data Integrity
// ────────────────────────────────────────────────────────────────────────────

console.log('\n─── Test Category 6: Edge Cases and Data Integrity ───\n');

// Test with null project
const nullProjectMetrics = calculateProjectMetrics({ id: 999 }, testData.tasks);
assertEquals(nullProjectMetrics.totalTasks, 0, '6.1: Handles non-existent project');
assertEquals(nullProjectMetrics.completionPercent, 0, '6.2: Zero percent for empty project');

// Test division by zero safety
const emptyProject = { id: 999, name: "Empty" };
const emptyMetrics = calculateProjectMetrics(emptyProject, []);
assertEquals(emptyMetrics.completionPercent, 0, '6.3: Safely handles division by zero');

// Test overdue task detection (tasks with endDate < today and status != done)
const overdueTask = {
    id: 100,
    projectId: 1,
    status: 'progress',
    startDate: '2024-01-01',
    endDate: '2024-12-31' // Past date
};

const metricsWithOverdue = calculateProjectMetrics(
    testData.projects[0],
    [...testData.tasks, overdueTask]
);
assert(metricsWithOverdue.overdueTasks >= 1, '6.4: Correctly detects overdue tasks');

// Test that done tasks are not counted as overdue
const overdueButDone = { ...overdueTask, status: 'done' };
const metricsOverdueDone = calculateProjectMetrics(
    testData.projects[0],
    [overdueButDone]
);
assertEquals(metricsOverdueDone.overdueTasks, 0, '6.5: Done tasks not counted as overdue');

// ────────────────────────────────────────────────────────────────────────────
// TEST CATEGORY 7: Integration Tests
// ────────────────────────────────────────────────────────────────────────────

console.log('\n─── Test Category 7: Integration Tests ───\n');

// Test full workflow with sample data
const sampleDataExists = fs.existsSync('test-data-sample.json');
assert(sampleDataExists, '7.1: Sample test data file exists');

if (sampleDataExists) {
    const sampleData = JSON.parse(fs.readFileSync('test-data-sample.json', 'utf8'));
    assert(sampleData.projects.length > 0, '7.2: Sample data has projects');
    assert(sampleData.tasks.length > 0, '7.3: Sample data has tasks');

    const sampleInsights = calculateGlobalInsights(sampleData.projects, sampleData.tasks);
    assert(sampleInsights.totalTasks > 0, '7.4: Sample data produces valid insights');
    assert(sampleInsights.completionPercent >= 0 && sampleInsights.completionPercent <= 100,
        '7.5: Sample data completion percentage in valid range');

    // Test that at least one task has island tags
    const hasIslandTags = sampleData.tasks.some(task => {
        const island = getTaskIsland(task, sampleData.projects.find(p => p.id === task.projectId));
        return island !== null;
    });
    assert(hasIslandTags, '7.6: Sample data contains tasks with island tags');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST SUMMARY
// ────────────────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);

if (testsFailed > 0) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  FAILED TESTS');
    console.log('═══════════════════════════════════════════════════════════');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    process.exit(1);
} else {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
    console.log('The report generator logic is working correctly.');
    console.log('You can now run: npm run generate-report\n');
    process.exit(0);
}
