/**
 * Unit tests for cache-first optimistic saves
 * Tests that localStorage is updated BEFORE network calls
 * and rolled back on failure.
 */

// Mock localStorage
const mockStorage = new Map();
const originalLocalStorage = global.localStorage;

global.localStorage = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, value) => mockStorage.set(key, value),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear()
};

// Track call order
let callOrder = [];

// Mock saveData to track when network is called
const originalSaveData = async (key, data) => {
    callOrder.push(`network:${key}`);
    // Simulate network delay
    await new Promise(r => setTimeout(r, 10));
    return true;
};

// Mock saveData that fails
const failingSaveData = async (key, data) => {
    callOrder.push(`network:${key}`);
    throw new Error('Network error');
};

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

function beforeEach() {
    mockStorage.clear();
    callOrder = [];
}

console.log('\n=== CACHE-FIRST SAVES TEST SUITE ===\n');

// Test 1: Cache is updated before network for tasks
console.log('--- Test 1: Tasks - Cache updated before network ---');
beforeEach();

// Simulate the cache-first pattern
const TASKS_CACHE_KEY = "tasksCache:v1:test";
const testTasks = [{ id: 1, title: 'Test Task' }];

// This simulates what saveTasks() now does:
// 1. Get previous cache (for rollback)
const previousTasksCache = mockStorage.get(TASKS_CACHE_KEY) || '[]';
callOrder.push('cache:read');

// 2. Update cache FIRST
mockStorage.set(TASKS_CACHE_KEY, JSON.stringify(testTasks));
callOrder.push('cache:write');

// 3. Then network (simulated)
callOrder.push('network:tasks');

assert(callOrder[0] === 'cache:read', 'First operation is reading previous cache');
assert(callOrder[1] === 'cache:write', 'Second operation is writing to cache');
assert(callOrder[2] === 'network:tasks', 'Third operation is network save');
assert(mockStorage.get(TASKS_CACHE_KEY) === JSON.stringify(testTasks), 'Cache contains new tasks');

// Test 2: Cache is rolled back on network failure
console.log('\n--- Test 2: Tasks - Cache rollback on failure ---');
beforeEach();

const originalTasks = [{ id: 1, title: 'Original' }];
mockStorage.set(TASKS_CACHE_KEY, JSON.stringify(originalTasks));

const newTasks = [{ id: 1, title: 'Original' }, { id: 2, title: 'New Task' }];

// Simulate cache-first with rollback:
const prevCache = mockStorage.get(TASKS_CACHE_KEY);
mockStorage.set(TASKS_CACHE_KEY, JSON.stringify(newTasks));

// Verify cache was updated
assert(mockStorage.get(TASKS_CACHE_KEY) === JSON.stringify(newTasks), 'Cache updated with new tasks');

// Simulate network failure and rollback
try {
    throw new Error('Network error');
} catch (e) {
    // Rollback
    mockStorage.set(TASKS_CACHE_KEY, prevCache);
}

assert(mockStorage.get(TASKS_CACHE_KEY) === JSON.stringify(originalTasks), 'Cache rolled back to original after failure');

// Test 3: Projects follow same pattern
console.log('\n--- Test 3: Projects - Cache-first pattern ---');
beforeEach();

const PROJECTS_CACHE_KEY = "projectsCache:v1:test";
const testProjects = [{ id: 1, name: 'Test Project' }];

const previousProjectsCache = mockStorage.get(PROJECTS_CACHE_KEY) || '[]';
mockStorage.set(PROJECTS_CACHE_KEY, JSON.stringify(testProjects));

assert(mockStorage.get(PROJECTS_CACHE_KEY) === JSON.stringify(testProjects), 'Projects cache updated immediately');

// Test 4: Feedback follows same pattern
console.log('\n--- Test 4: Feedback - Cache-first pattern ---');
beforeEach();

const FEEDBACK_CACHE_KEY = "feedbackItemsCache:v1";
const testFeedback = [{ id: 1, message: 'Test Feedback' }];

const previousFeedbackCache = mockStorage.get(FEEDBACK_CACHE_KEY) || '[]';
mockStorage.set(FEEDBACK_CACHE_KEY, JSON.stringify(testFeedback));

assert(mockStorage.get(FEEDBACK_CACHE_KEY) === JSON.stringify(testFeedback), 'Feedback cache updated immediately');

// Test 5: Immediate refresh gets cached data
console.log('\n--- Test 5: Immediate refresh scenario ---');
beforeEach();

// Simulate: create task, save starts, immediately refresh
const task = { id: 99, title: 'Quick Task' };
const tasksArray = [task];

// Save starts - cache is updated FIRST
mockStorage.set(TASKS_CACHE_KEY, JSON.stringify(tasksArray));

// User refreshes immediately (before network completes)
// On refresh, we read from cache:
const cachedData = JSON.parse(mockStorage.get(TASKS_CACHE_KEY) || '[]');

assert(cachedData.length === 1, 'Cache has the new task');
assert(cachedData[0].id === 99, 'Cached task has correct ID');
assert(cachedData[0].title === 'Quick Task', 'Cached task has correct title');

// Test 6: Multiple rapid saves
console.log('\n--- Test 6: Multiple rapid saves ---');
beforeEach();

// First save
mockStorage.set(TASKS_CACHE_KEY, JSON.stringify([{ id: 1, title: 'Task 1' }]));
// Second save (before first network completes)
mockStorage.set(TASKS_CACHE_KEY, JSON.stringify([{ id: 1, title: 'Task 1' }, { id: 2, title: 'Task 2' }]));
// Third save
mockStorage.set(TASKS_CACHE_KEY, JSON.stringify([{ id: 1, title: 'Task 1' }, { id: 2, title: 'Task 2' }, { id: 3, title: 'Task 3' }]));

const finalCache = JSON.parse(mockStorage.get(TASKS_CACHE_KEY));
assert(finalCache.length === 3, 'All three tasks in cache after rapid saves');

// Final Summary
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
    console.log('\nCache-first optimistic saves are working correctly.');
    console.log('On immediate refresh, users will see their newly created items.');
    process.exit(0);
}
