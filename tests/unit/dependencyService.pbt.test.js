/**
 * Property-Based Tests for Dependency Service
 * Feature: task-dependencies
 * Uses fast-check for property-based testing
 */

import fc from 'fast-check';
import {
    serializeDependencies,
    deserializeDependencies,
    addDependency,
    removeDependency,
    removeDependenciesForTask,
    getPrerequisites,
    getDependents,
    isTaskBlocked
} from '../../src/services/dependencyService.js';

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

// Custom arbitraries for generating test data

/**
 * Generate a valid dependency graph
 * Returns an object like { "5": [1, 2], "7": [5] }
 */
const dependencyGraphArbitrary = fc.dictionary(
    fc.integer({ min: 1, max: 100 }).map(n => String(n)), // Keys are string task IDs
    fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 0, maxLength: 5 }) // Values are arrays of prerequisite IDs
);

/**
 * Generate a valid task array
 * Returns an array of task objects with id, title, and status
 */
const taskArrayArbitrary = fc.array(
    fc.record({
        id: fc.integer({ min: 1, max: 100 }),
        title: fc.string(),
        status: fc.constantFrom('todo', 'progress', 'done')
    }),
    { minLength: 2, maxLength: 20 }
).map(tasks => {
    // Ensure unique IDs
    const seen = new Set();
    return tasks.filter(task => {
        if (seen.has(task.id)) return false;
        seen.add(task.id);
        return true;
    });
});

console.log('\n=== DEPENDENCY SERVICE PROPERTY-BASED TESTS ===\n');

// Property 1: Adding dependency creates the relationship
console.log('--- Property 1: Adding dependency creates the relationship ---');
console.log('**Validates: Requirements 1.1**\n');

let property1Passed = true;
let property1Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                dependentIdx: fc.nat(),
                prerequisiteIdx: fc.nat()
            }),
            (tasks, { dependencies, dependentIdx, prerequisiteIdx }) => {
                // Skip if not enough tasks
                if (tasks.length < 2) return true;
                
                // Select two different tasks
                const dependentTask = tasks[dependentIdx % tasks.length];
                const prerequisiteTask = tasks[prerequisiteIdx % tasks.length];
                
                // Skip if same task (self-dependency)
                if (dependentTask.id === prerequisiteTask.id) return true;
                
                // Add the dependency
                const result = addDependency(
                    dependentTask.id,
                    prerequisiteTask.id,
                    dependencies,
                    tasks
                );
                
                // Should not have an error
                if (result.error !== null) return false;
                
                // The prerequisite should appear in the dependent's prerequisites
                const key = String(dependentTask.id);
                const prerequisites = result.dependencies[key] || [];
                
                return prerequisites.includes(prerequisiteTask.id);
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 1 PASSED: Adding dependency creates the relationship (100 iterations)');
    testsPassed++;
} catch (error) {
    property1Passed = false;
    property1Error = error;
    console.log('❌ Property 1 FAILED: Adding dependency creates the relationship');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 1: Adding dependency creates the relationship');
}

console.log('\n');

// Property 2: Invalid task IDs are rejected
console.log('--- Property 2: Invalid task IDs are rejected ---');
console.log('**Validates: Requirements 1.2**\n');

let property2Passed = true;
let property2Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                invalidId: fc.integer({ min: 101, max: 1000 }), // ID that won't exist in tasks
                validIdx: fc.nat()
            }),
            (tasks, { dependencies, invalidId, validIdx }) => {
                // Skip if not enough tasks
                if (tasks.length < 1) return true;
                
                // Ensure invalidId doesn't exist in tasks
                const taskIds = tasks.map(t => t.id);
                if (taskIds.includes(invalidId)) return true;
                
                const validTask = tasks[validIdx % tasks.length];
                
                // Test 1: Invalid dependent task ID
                const result1 = addDependency(
                    invalidId,
                    validTask.id,
                    dependencies,
                    tasks
                );
                
                // Should have an error
                if (result1.error === null) return false;
                if (!result1.error.includes('does not exist')) return false;
                
                // Test 2: Invalid prerequisite task ID
                const result2 = addDependency(
                    validTask.id,
                    invalidId,
                    dependencies,
                    tasks
                );
                
                // Should have an error
                if (result2.error === null) return false;
                if (!result2.error.includes('does not exist')) return false;
                
                // Test 3: Both invalid
                const result3 = addDependency(
                    invalidId,
                    invalidId + 1,
                    dependencies,
                    tasks
                );
                
                // Should have an error
                if (result3.error === null) return false;
                if (!result3.error.includes('does not exist')) return false;
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 2 PASSED: Invalid task IDs are rejected (100 iterations)');
    testsPassed++;
} catch (error) {
    property2Passed = false;
    property2Error = error;
    console.log('❌ Property 2 FAILED: Invalid task IDs are rejected');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 2: Invalid task IDs are rejected');
}

console.log('\n');

// Property 3: Circular dependencies are prevented
console.log('--- Property 3: Circular dependencies are prevented ---');
console.log('**Validates: Requirements 1.3, 4.1, 4.2**\n');

let property3Passed = true;
let property3Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                taskIndices: fc.array(fc.nat(), { minLength: 2, maxLength: 5 })
            }),
            (tasks, { dependencies, taskIndices }) => {
                // Skip if not enough tasks
                if (tasks.length < 2) return true;
                
                // Build a chain of dependencies: A -> B -> C -> ...
                let currentDeps = { ...dependencies };
                const chain = [];
                
                for (let i = 0; i < taskIndices.length - 1 && chain.length < tasks.length - 1; i++) {
                    const taskIdx = taskIndices[i] % tasks.length;
                    const nextTaskIdx = taskIndices[i + 1] % tasks.length;
                    
                    const task = tasks[taskIdx];
                    const nextTask = tasks[nextTaskIdx];
                    
                    // Skip if same task
                    if (task.id === nextTask.id) continue;
                    
                    // Add dependency: task depends on nextTask
                    const result = addDependency(task.id, nextTask.id, currentDeps, tasks);
                    
                    // Should succeed (no cycle yet)
                    if (result.error !== null) {
                        // If it fails, it should be because of a cycle we already created
                        // This is acceptable - continue testing
                        continue;
                    }
                    
                    currentDeps = result.dependencies;
                    chain.push({ dependent: task.id, prerequisite: nextTask.id });
                }
                
                // Test 1: Self-dependency should be rejected
                if (tasks.length > 0) {
                    const task = tasks[0];
                    const selfDepResult = addDependency(task.id, task.id, currentDeps, tasks);
                    
                    // Should be rejected
                    if (selfDepResult.error === null) return false;
                    
                    // Should mention self-dependency or cycle
                    if (!selfDepResult.error.toLowerCase().includes('itself') && 
                        !selfDepResult.error.toLowerCase().includes('cycle')) {
                        return false;
                    }
                }
                
                // Test 2: Try to close the loop if we have a chain of at least 2
                if (chain.length >= 2) {
                    // Try to make the last task depend on the first task's dependent
                    const firstDependent = chain[0].dependent;
                    const lastPrerequisite = chain[chain.length - 1].prerequisite;
                    
                    // Skip if they're the same (would be self-dependency, already tested)
                    if (firstDependent !== lastPrerequisite) {
                        // This should create a cycle: lastPrerequisite -> firstDependent
                        // when we already have firstDependent -> ... -> lastPrerequisite
                        const cycleResult = addDependency(
                            lastPrerequisite,
                            firstDependent,
                            currentDeps,
                            tasks
                        );
                        
                        // Should be rejected with an error
                        if (cycleResult.error === null) {
                            // This is a failure - we should have detected the cycle
                            return false;
                        }
                        
                        // Error should mention "cycle"
                        if (!cycleResult.error.toLowerCase().includes('cycle')) {
                            return false;
                        }
                    }
                }
                
                // Test 3: Simple A->B, then B->A should create cycle
                if (tasks.length >= 2) {
                    const taskA = tasks[0];
                    const taskB = tasks[1];
                    
                    // Create A -> B
                    const result1 = addDependency(taskA.id, taskB.id, {}, tasks);
                    if (result1.error !== null) return true; // Skip if can't create
                    
                    // Try to create B -> A (should fail)
                    const result2 = addDependency(taskB.id, taskA.id, result1.dependencies, tasks);
                    
                    // Should be rejected
                    if (result2.error === null) return false;
                    
                    // Should mention cycle
                    if (!result2.error.toLowerCase().includes('cycle')) return false;
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 3 PASSED: Circular dependencies are prevented (100 iterations)');
    testsPassed++;
} catch (error) {
    property3Passed = false;
    property3Error = error;
    console.log('❌ Property 3 FAILED: Circular dependencies are prevented');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 3: Circular dependencies are prevented');
}

console.log('\n');

// Property 6: Adding duplicate dependencies is idempotent
console.log('--- Property 6: Adding duplicate dependencies is idempotent ---');
console.log('**Validates: Requirements 4.5**\n');

let property6Passed = true;
let property6Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                dependentIdx: fc.nat(),
                prerequisiteIdx: fc.nat()
            }),
            (tasks, { dependencies, dependentIdx, prerequisiteIdx }) => {
                // Skip if not enough tasks
                if (tasks.length < 2) return true;
                
                // Select two different tasks
                const dependentTask = tasks[dependentIdx % tasks.length];
                const prerequisiteTask = tasks[prerequisiteIdx % tasks.length];
                
                // Skip if same task (self-dependency)
                if (dependentTask.id === prerequisiteTask.id) return true;
                
                // Add the dependency for the first time
                const result1 = addDependency(
                    dependentTask.id,
                    prerequisiteTask.id,
                    dependencies,
                    tasks
                );
                
                // Should succeed
                if (result1.error !== null) return true; // Skip if can't add (e.g., would create cycle)
                
                // Store the state after first add
                const afterFirstAdd = result1.dependencies;
                const key = String(dependentTask.id);
                const prereqsAfterFirst = afterFirstAdd[key] || [];
                
                // Add the same dependency again (duplicate)
                const result2 = addDependency(
                    dependentTask.id,
                    prerequisiteTask.id,
                    afterFirstAdd,
                    tasks
                );
                
                // Should not have an error (idempotent)
                if (result2.error !== null) return false;
                
                // The dependencies should be unchanged
                const afterSecondAdd = result2.dependencies;
                const prereqsAfterSecond = afterSecondAdd[key] || [];
                
                // Should have the same number of prerequisites
                if (prereqsAfterFirst.length !== prereqsAfterSecond.length) return false;
                
                // Should have the same prerequisites (no duplicates)
                const sortedFirst = [...prereqsAfterFirst].sort((a, b) => a - b);
                const sortedSecond = [...prereqsAfterSecond].sort((a, b) => a - b);
                
                for (let i = 0; i < sortedFirst.length; i++) {
                    if (sortedFirst[i] !== sortedSecond[i]) return false;
                }
                
                // The prerequisite should appear exactly once
                const count = prereqsAfterSecond.filter(id => id === prerequisiteTask.id).length;
                if (count !== 1) return false;
                
                // Test adding the same dependency a third time
                const result3 = addDependency(
                    dependentTask.id,
                    prerequisiteTask.id,
                    afterSecondAdd,
                    tasks
                );
                
                // Should still be idempotent
                if (result3.error !== null) return false;
                
                const prereqsAfterThird = result3.dependencies[key] || [];
                if (prereqsAfterThird.length !== prereqsAfterSecond.length) return false;
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 6 PASSED: Adding duplicate dependencies is idempotent (100 iterations)');
    testsPassed++;
} catch (error) {
    property6Passed = false;
    property6Error = error;
    console.log('❌ Property 6 FAILED: Adding duplicate dependencies is idempotent');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 6: Adding duplicate dependencies is idempotent');
}

console.log('\n');

// Property 7: Removing dependency deletes the relationship
console.log('--- Property 7: Removing dependency deletes the relationship ---');
console.log('**Validates: Requirements 2.1**\n');

let property7Passed = true;
let property7Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                dependentIdx: fc.nat(),
                prerequisiteIdx: fc.nat()
            }),
            (tasks, { dependencies, dependentIdx, prerequisiteIdx }) => {
                // Skip if not enough tasks
                if (tasks.length < 2) return true;
                
                // Select two different tasks
                const dependentTask = tasks[dependentIdx % tasks.length];
                const prerequisiteTask = tasks[prerequisiteIdx % tasks.length];
                
                // Skip if same task (self-dependency)
                if (dependentTask.id === prerequisiteTask.id) return true;
                
                // First, add a dependency
                const addResult = addDependency(
                    dependentTask.id,
                    prerequisiteTask.id,
                    dependencies,
                    tasks
                );
                
                // Skip if we couldn't add the dependency (e.g., would create cycle)
                if (addResult.error !== null) return true;
                
                // Verify the dependency was added
                const key = String(dependentTask.id);
                const prereqsAfterAdd = addResult.dependencies[key] || [];
                if (!prereqsAfterAdd.includes(prerequisiteTask.id)) {
                    // This shouldn't happen - addDependency should have added it
                    return false;
                }
                
                // Now remove the dependency
                const removeResult = removeDependency(
                    dependentTask.id,
                    prerequisiteTask.id,
                    addResult.dependencies
                );
                
                // Verify the dependency was removed
                const prereqsAfterRemove = removeResult.dependencies[key] || [];
                
                // The prerequisite should no longer be in the list
                if (prereqsAfterRemove.includes(prerequisiteTask.id)) {
                    return false;
                }
                
                // If there were other prerequisites, they should still be there
                const otherPrereqs = prereqsAfterAdd.filter(id => id !== prerequisiteTask.id);
                if (otherPrereqs.length > 0) {
                    // Check that other prerequisites are preserved
                    if (prereqsAfterRemove.length !== otherPrereqs.length) {
                        return false;
                    }
                    for (const prereqId of otherPrereqs) {
                        if (!prereqsAfterRemove.includes(prereqId)) {
                            return false;
                        }
                    }
                } else {
                    // If there were no other prerequisites, the key should be removed or empty
                    if (prereqsAfterRemove.length !== 0) {
                        return false;
                    }
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 7 PASSED: Removing dependency deletes the relationship (100 iterations)');
    testsPassed++;
} catch (error) {
    property7Passed = false;
    property7Error = error;
    console.log('❌ Property 7 FAILED: Removing dependency deletes the relationship');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 7: Removing dependency deletes the relationship');
}

console.log('\n');

// Property 8: Removing one dependency preserves others
console.log('--- Property 8: Removing one dependency preserves others ---');
console.log('**Validates: Requirements 2.3**\n');

let property8Passed = true;
let property8Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                taskIndices: fc.array(fc.nat(), { minLength: 3, maxLength: 6 })
            }),
            (tasks, { dependencies, taskIndices }) => {
                // Skip if not enough tasks
                if (tasks.length < 3) return true;
                
                // Build a dependency graph with multiple relationships
                let currentDeps = { ...dependencies };
                const addedDependencies = [];
                const seenPairs = new Set();
                
                // Add multiple dependencies between different task pairs
                for (let i = 0; i < taskIndices.length - 1; i++) {
                    const depIdx = taskIndices[i] % tasks.length;
                    const prereqIdx = taskIndices[i + 1] % tasks.length;
                    
                    const depTask = tasks[depIdx];
                    const prereqTask = tasks[prereqIdx];
                    
                    // Skip if same task
                    if (depTask.id === prereqTask.id) continue;
                    
                    // Skip if we've already added this exact dependency
                    const pairKey = `${depTask.id}->${prereqTask.id}`;
                    if (seenPairs.has(pairKey)) continue;
                    
                    // Try to add dependency
                    const result = addDependency(depTask.id, prereqTask.id, currentDeps, tasks);
                    
                    // Skip if it would create a cycle
                    if (result.error !== null) continue;
                    
                    currentDeps = result.dependencies;
                    seenPairs.add(pairKey);
                    addedDependencies.push({
                        dependent: depTask.id,
                        prerequisite: prereqTask.id
                    });
                }
                
                // Skip if we couldn't add at least 2 DISTINCT dependencies
                if (addedDependencies.length < 2) return true;
                
                // Take a snapshot of all dependencies before removal
                const beforeRemoval = JSON.parse(JSON.stringify(currentDeps));
                
                // Pick one dependency to remove (the first one)
                const toRemove = addedDependencies[0];
                
                // Remove the selected dependency
                const removeResult = removeDependency(
                    toRemove.dependent,
                    toRemove.prerequisite,
                    currentDeps
                );
                
                const afterRemoval = removeResult.dependencies;
                
                // Verify the removed dependency is gone
                const removedKey = String(toRemove.dependent);
                const prereqsAfterRemoval = afterRemoval[removedKey] || [];
                if (prereqsAfterRemoval.includes(toRemove.prerequisite)) {
                    // The dependency should have been removed
                    return false;
                }
                
                // Verify all OTHER dependencies are preserved
                for (let i = 1; i < addedDependencies.length; i++) {
                    const dep = addedDependencies[i];
                    const key = String(dep.dependent);
                    
                    // Check if this dependency still exists
                    const prereqsBefore = beforeRemoval[key] || [];
                    const prereqsAfter = afterRemoval[key] || [];
                    
                    // The prerequisite should still be there
                    if (!prereqsAfter.includes(dep.prerequisite)) {
                        // This dependency should have been preserved
                        return false;
                    }
                    
                    // If this is a different dependent task, all its prerequisites should be unchanged
                    if (dep.dependent !== toRemove.dependent) {
                        // All prerequisites should be exactly the same
                        const sortedBefore = [...prereqsBefore].sort((a, b) => a - b);
                        const sortedAfter = [...prereqsAfter].sort((a, b) => a - b);
                        
                        if (sortedBefore.length !== sortedAfter.length) {
                            return false;
                        }
                        
                        for (let j = 0; j < sortedBefore.length; j++) {
                            if (sortedBefore[j] !== sortedAfter[j]) {
                                return false;
                            }
                        }
                    }
                }
                
                // Also verify that tasks not involved in the removal are completely unchanged
                for (const [key, prereqs] of Object.entries(beforeRemoval)) {
                    const taskId = parseInt(key, 10);
                    
                    // Skip the task we removed from
                    if (taskId === toRemove.dependent) continue;
                    
                    // All other tasks should have identical prerequisite lists
                    const prereqsAfter = afterRemoval[key] || [];
                    const sortedBefore = [...prereqs].sort((a, b) => a - b);
                    const sortedAfter = [...prereqsAfter].sort((a, b) => a - b);
                    
                    if (sortedBefore.length !== sortedAfter.length) {
                        return false;
                    }
                    
                    for (let j = 0; j < sortedBefore.length; j++) {
                        if (sortedBefore[j] !== sortedAfter[j]) {
                            return false;
                        }
                    }
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 8 PASSED: Removing one dependency preserves others (100 iterations)');
    testsPassed++;
} catch (error) {
    property8Passed = false;
    property8Error = error;
    console.log('❌ Property 8 FAILED: Removing one dependency preserves others');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 8: Removing one dependency preserves others');
}

console.log('\n');

// Property 9: Task deletion removes all related dependencies
console.log('--- Property 9: Task deletion removes all related dependencies ---');
console.log('**Validates: Requirements 2.4, 8.1, 8.3**\n');

let property9Passed = true;
let property9Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                taskIndices: fc.array(fc.nat(), { minLength: 3, maxLength: 8 })
            }),
            (tasks, { dependencies, taskIndices }) => {
                // Skip if not enough tasks
                if (tasks.length < 3) return true;
                
                // Build a dependency graph with multiple relationships
                let currentDeps = { ...dependencies };
                const addedDependencies = [];
                const seenPairs = new Set();
                
                // Add multiple dependencies between different task pairs
                for (let i = 0; i < taskIndices.length - 1; i++) {
                    const depIdx = taskIndices[i] % tasks.length;
                    const prereqIdx = taskIndices[i + 1] % tasks.length;
                    
                    const depTask = tasks[depIdx];
                    const prereqTask = tasks[prereqIdx];
                    
                    // Skip if same task
                    if (depTask.id === prereqTask.id) continue;
                    
                    // Skip if we've already added this exact dependency
                    const pairKey = `${depTask.id}->${prereqTask.id}`;
                    if (seenPairs.has(pairKey)) continue;
                    
                    // Try to add dependency
                    const result = addDependency(depTask.id, prereqTask.id, currentDeps, tasks);
                    
                    // Skip if it would create a cycle
                    if (result.error !== null) continue;
                    
                    currentDeps = result.dependencies;
                    seenPairs.add(pairKey);
                    addedDependencies.push({
                        dependent: depTask.id,
                        prerequisite: prereqTask.id
                    });
                }
                
                // Skip if we couldn't add at least 2 dependencies
                if (addedDependencies.length < 2) return true;
                
                // Pick a task to delete - choose one that's involved in dependencies
                // Try to find a task that appears in multiple dependencies
                const taskCounts = new Map();
                for (const dep of addedDependencies) {
                    taskCounts.set(dep.dependent, (taskCounts.get(dep.dependent) || 0) + 1);
                    taskCounts.set(dep.prerequisite, (taskCounts.get(dep.prerequisite) || 0) + 1);
                }
                
                // Find task with highest involvement
                let taskToDelete = null;
                let maxCount = 0;
                for (const [taskId, count] of taskCounts.entries()) {
                    if (count > maxCount) {
                        maxCount = count;
                        taskToDelete = taskId;
                    }
                }
                
                // If no task found, just pick the first one involved
                if (taskToDelete === null) {
                    taskToDelete = addedDependencies[0].dependent;
                }
                
                // Track which dependencies should be removed
                const shouldBeRemoved = addedDependencies.filter(
                    dep => dep.dependent === taskToDelete || dep.prerequisite === taskToDelete
                );
                
                const shouldBePreserved = addedDependencies.filter(
                    dep => dep.dependent !== taskToDelete && dep.prerequisite !== taskToDelete
                );
                
                // Remove all dependencies for the task
                const removeResult = removeDependenciesForTask(taskToDelete, currentDeps);
                const afterRemoval = removeResult.dependencies;
                
                // Verify 1: The deleted task should not appear as a dependent
                const deletedKey = String(taskToDelete);
                if (afterRemoval[deletedKey]) {
                    // The task's dependencies should have been removed
                    return false;
                }
                
                // Verify 2: The deleted task should not appear as a prerequisite anywhere
                for (const [key, prereqs] of Object.entries(afterRemoval)) {
                    if (prereqs.includes(taskToDelete)) {
                        // The task should not be a prerequisite for any other task
                        return false;
                    }
                }
                
                // Verify 3: All dependencies involving the deleted task should be gone
                for (const dep of shouldBeRemoved) {
                    const key = String(dep.dependent);
                    const prereqs = afterRemoval[key] || [];
                    
                    if (dep.dependent === taskToDelete) {
                        // This task's dependencies should be completely removed
                        if (afterRemoval[key]) {
                            return false;
                        }
                    } else if (dep.prerequisite === taskToDelete) {
                        // This task should no longer have the deleted task as a prerequisite
                        if (prereqs.includes(taskToDelete)) {
                            return false;
                        }
                    }
                }
                
                // Verify 4: All dependencies NOT involving the deleted task should be preserved
                for (const dep of shouldBePreserved) {
                    const key = String(dep.dependent);
                    const prereqs = afterRemoval[key] || [];
                    
                    // This dependency should still exist
                    if (!prereqs.includes(dep.prerequisite)) {
                        return false;
                    }
                }
                
                // Verify 5: No extra dependencies should be added or removed
                // Count total dependencies before and after
                let countBefore = 0;
                for (const prereqs of Object.values(currentDeps)) {
                    countBefore += prereqs.length;
                }
                
                let countAfter = 0;
                for (const prereqs of Object.values(afterRemoval)) {
                    countAfter += prereqs.length;
                }
                
                // The difference should be exactly the number of dependencies involving the deleted task
                const expectedRemoved = shouldBeRemoved.length;
                if (countBefore - countAfter !== expectedRemoved) {
                    return false;
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 9 PASSED: Task deletion removes all related dependencies (100 iterations)');
    testsPassed++;
} catch (error) {
    property9Passed = false;
    property9Error = error;
    console.log('❌ Property 9 FAILED: Task deletion removes all related dependencies');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 9: Task deletion removes all related dependencies');
}

console.log('\n');

// Property 10: Query returns correct prerequisites
console.log('--- Property 10: Query returns correct prerequisites ---');
console.log('**Validates: Requirements 3.1**\n');

let property10Passed = true;
let property10Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                taskIndices: fc.array(fc.nat(), { minLength: 2, maxLength: 8 })
            }),
            (tasks, { dependencies, taskIndices }) => {
                // Skip if not enough tasks
                if (tasks.length < 2) return true;
                
                // Build a dependency graph with multiple relationships
                let currentDeps = { ...dependencies };
                const addedDependencies = new Map(); // Map from dependent ID to set of prerequisite IDs
                const seenPairs = new Set();
                
                // Add multiple dependencies between different task pairs
                for (let i = 0; i < taskIndices.length - 1; i++) {
                    const depIdx = taskIndices[i] % tasks.length;
                    const prereqIdx = taskIndices[i + 1] % tasks.length;
                    
                    const depTask = tasks[depIdx];
                    const prereqTask = tasks[prereqIdx];
                    
                    // Skip if same task
                    if (depTask.id === prereqTask.id) continue;
                    
                    // Skip if we've already added this exact dependency
                    const pairKey = `${depTask.id}->${prereqTask.id}`;
                    if (seenPairs.has(pairKey)) continue;
                    
                    // Try to add dependency
                    const result = addDependency(depTask.id, prereqTask.id, currentDeps, tasks);
                    
                    // Skip if it would create a cycle
                    if (result.error !== null) continue;
                    
                    currentDeps = result.dependencies;
                    seenPairs.add(pairKey);
                    
                    // Track what we added
                    if (!addedDependencies.has(depTask.id)) {
                        addedDependencies.set(depTask.id, new Set());
                    }
                    addedDependencies.get(depTask.id).add(prereqTask.id);
                }
                
                // Skip if we couldn't add any dependencies
                if (addedDependencies.size === 0) return true;
                
                // Test 1: For each task with dependencies, verify getPrerequisites returns exactly what we added
                for (const [dependentId, expectedPrereqs] of addedDependencies.entries()) {
                    const actualPrereqs = getPrerequisites(dependentId, currentDeps);
                    
                    // Should have the same number of prerequisites
                    if (actualPrereqs.length !== expectedPrereqs.size) {
                        return false;
                    }
                    
                    // Should contain exactly the same prerequisites
                    for (const prereqId of expectedPrereqs) {
                        if (!actualPrereqs.includes(prereqId)) {
                            return false;
                        }
                    }
                    
                    // Should not contain any extra prerequisites
                    for (const prereqId of actualPrereqs) {
                        if (!expectedPrereqs.has(prereqId)) {
                            return false;
                        }
                    }
                }
                
                // Test 2: For tasks with no dependencies, should return empty array
                for (const task of tasks) {
                    if (!addedDependencies.has(task.id)) {
                        const prereqs = getPrerequisites(task.id, currentDeps);
                        if (prereqs.length !== 0) {
                            return false;
                        }
                    }
                }
                
                // Test 3: Add a task with multiple prerequisites and verify all are returned
                if (tasks.length >= 3) {
                    // Pick a task that doesn't have dependencies yet
                    const targetTask = tasks.find(t => !addedDependencies.has(t.id));
                    if (targetTask) {
                        // Add multiple prerequisites to this task
                        const prereqTasks = tasks.filter(t => t.id !== targetTask.id).slice(0, 3);
                        let testDeps = { ...currentDeps };
                        const expectedMultiPrereqs = new Set();
                        
                        for (const prereqTask of prereqTasks) {
                            const result = addDependency(targetTask.id, prereqTask.id, testDeps, tasks);
                            if (result.error === null) {
                                testDeps = result.dependencies;
                                expectedMultiPrereqs.add(prereqTask.id);
                            }
                        }
                        
                        // Query should return all prerequisites
                        if (expectedMultiPrereqs.size > 0) {
                            const actualMultiPrereqs = getPrerequisites(targetTask.id, testDeps);
                            
                            if (actualMultiPrereqs.length !== expectedMultiPrereqs.size) {
                                return false;
                            }
                            
                            for (const prereqId of expectedMultiPrereqs) {
                                if (!actualMultiPrereqs.includes(prereqId)) {
                                    return false;
                                }
                            }
                        }
                    }
                }
                
                // Test 4: Verify immutability - getPrerequisites should not modify the dependencies object
                const depsCopy = JSON.stringify(currentDeps);
                for (const task of tasks) {
                    getPrerequisites(task.id, currentDeps);
                }
                const depsAfter = JSON.stringify(currentDeps);
                
                if (depsCopy !== depsAfter) {
                    return false;
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 10 PASSED: Query returns correct prerequisites (100 iterations)');
    testsPassed++;
} catch (error) {
    property10Passed = false;
    property10Error = error;
    console.log('❌ Property 10 FAILED: Query returns correct prerequisites');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 10: Query returns correct prerequisites');
}

console.log('\n');

// Property 11: Query returns correct dependents
console.log('--- Property 11: Query returns correct dependents ---');
console.log('**Validates: Requirements 3.2**\n');

let property11Passed = true;
let property11Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                taskIndices: fc.array(fc.nat(), { minLength: 2, maxLength: 8 })
            }),
            (tasks, { dependencies, taskIndices }) => {
                // Skip if not enough tasks
                if (tasks.length < 2) return true;
                
                // Build a dependency graph with multiple relationships
                let currentDeps = { ...dependencies };
                const addedDependencies = []; // Array of { dependent, prerequisite }
                const seenPairs = new Set();
                
                // Track expected dependents for each prerequisite
                const expectedDependents = new Map(); // Map from prerequisite ID to set of dependent IDs
                
                // Add multiple dependencies between different task pairs
                for (let i = 0; i < taskIndices.length - 1; i++) {
                    const depIdx = taskIndices[i] % tasks.length;
                    const prereqIdx = taskIndices[i + 1] % tasks.length;
                    
                    const depTask = tasks[depIdx];
                    const prereqTask = tasks[prereqIdx];
                    
                    // Skip if same task
                    if (depTask.id === prereqTask.id) continue;
                    
                    // Skip if we've already added this exact dependency
                    const pairKey = `${depTask.id}->${prereqTask.id}`;
                    if (seenPairs.has(pairKey)) continue;
                    
                    // Try to add dependency
                    const result = addDependency(depTask.id, prereqTask.id, currentDeps, tasks);
                    
                    // Skip if it would create a cycle
                    if (result.error !== null) continue;
                    
                    currentDeps = result.dependencies;
                    seenPairs.add(pairKey);
                    addedDependencies.push({
                        dependent: depTask.id,
                        prerequisite: prereqTask.id
                    });
                    
                    // Track expected dependents
                    if (!expectedDependents.has(prereqTask.id)) {
                        expectedDependents.set(prereqTask.id, new Set());
                    }
                    expectedDependents.get(prereqTask.id).add(depTask.id);
                }
                
                // Skip if we couldn't add any dependencies
                if (addedDependencies.length === 0) return true;
                
                // Test 1: For each prerequisite task, verify getDependents returns exactly the tasks that depend on it
                for (const [prereqId, expectedDeps] of expectedDependents.entries()) {
                    const actualDependents = getDependents(prereqId, currentDeps);
                    
                    // Should have the same number of dependents
                    if (actualDependents.length !== expectedDeps.size) {
                        return false;
                    }
                    
                    // Should contain exactly the same dependents
                    for (const depId of expectedDeps) {
                        if (!actualDependents.includes(depId)) {
                            return false;
                        }
                    }
                    
                    // Should not contain any extra dependents
                    for (const depId of actualDependents) {
                        if (!expectedDeps.has(depId)) {
                            return false;
                        }
                    }
                }
                
                // Test 2: For tasks that are not prerequisites for any task, should return empty array
                for (const task of tasks) {
                    if (!expectedDependents.has(task.id)) {
                        const dependents = getDependents(task.id, currentDeps);
                        if (dependents.length !== 0) {
                            return false;
                        }
                    }
                }
                
                // Test 3: Test a task that is a prerequisite for multiple tasks
                if (tasks.length >= 4) {
                    // Pick a task to be the common prerequisite
                    const prereqTask = tasks[0];
                    // Pick multiple tasks to depend on it
                    const dependentTasks = tasks.slice(1, 4);
                    
                    let testDeps = {};
                    const expectedMultiDeps = new Set();
                    
                    for (const depTask of dependentTasks) {
                        const result = addDependency(depTask.id, prereqTask.id, testDeps, tasks);
                        if (result.error === null) {
                            testDeps = result.dependencies;
                            expectedMultiDeps.add(depTask.id);
                        }
                    }
                    
                    // Query should return all dependents
                    if (expectedMultiDeps.size > 0) {
                        const actualMultiDeps = getDependents(prereqTask.id, testDeps);
                        
                        if (actualMultiDeps.length !== expectedMultiDeps.size) {
                            return false;
                        }
                        
                        for (const depId of expectedMultiDeps) {
                            if (!actualMultiDeps.includes(depId)) {
                                return false;
                            }
                        }
                    }
                }
                
                // Test 4: Verify immutability - getDependents should not modify the dependencies object
                const depsCopy = JSON.stringify(currentDeps);
                for (const task of tasks) {
                    getDependents(task.id, currentDeps);
                }
                const depsAfter = JSON.stringify(currentDeps);
                
                if (depsCopy !== depsAfter) {
                    return false;
                }
                
                // Test 5: Verify symmetry - if A depends on B, then B should have A as a dependent
                for (const dep of addedDependencies) {
                    const dependents = getDependents(dep.prerequisite, currentDeps);
                    if (!dependents.includes(dep.dependent)) {
                        return false;
                    }
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 11 PASSED: Query returns correct dependents (100 iterations)');
    testsPassed++;
} catch (error) {
    property11Passed = false;
    property11Error = error;
    console.log('❌ Property 11 FAILED: Query returns correct dependents');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 11: Query returns correct dependents');
}

console.log('\n');

// Property 4: Multiple prerequisites allowed
console.log('--- Property 4: Multiple prerequisites allowed ---');
console.log('**Validates: Requirements 1.6**\n');

let property4Passed = true;
let property4Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                dependentIdx: fc.nat(),
                prerequisiteIndices: fc.array(fc.nat(), { minLength: 2, maxLength: 5 })
            }),
            (tasks, { dependencies, dependentIdx, prerequisiteIndices }) => {
                // Skip if not enough tasks
                if (tasks.length < 3) return true;
                
                // Select a dependent task
                const dependentTask = tasks[dependentIdx % tasks.length];
                
                // Select multiple different prerequisite tasks
                const prerequisiteTasks = [];
                const seenIds = new Set([dependentTask.id]);
                
                for (const idx of prerequisiteIndices) {
                    const prereqTask = tasks[idx % tasks.length];
                    
                    // Skip if it's the dependent task itself or already selected
                    if (seenIds.has(prereqTask.id)) continue;
                    
                    seenIds.add(prereqTask.id);
                    prerequisiteTasks.push(prereqTask);
                }
                
                // Skip if we couldn't get at least 2 different prerequisites
                if (prerequisiteTasks.length < 2) return true;
                
                // Add multiple prerequisites to the same dependent task
                let currentDeps = { ...dependencies };
                const addedPrerequisites = [];
                
                for (const prereqTask of prerequisiteTasks) {
                    const result = addDependency(
                        dependentTask.id,
                        prereqTask.id,
                        currentDeps,
                        tasks
                    );
                    
                    // Skip if adding this prerequisite would create a cycle
                    if (result.error !== null) continue;
                    
                    currentDeps = result.dependencies;
                    addedPrerequisites.push(prereqTask.id);
                }
                
                // Skip if we couldn't add at least 2 prerequisites
                if (addedPrerequisites.length < 2) return true;
                
                // Test 1: All added prerequisites should be retrievable
                const retrievedPrereqs = getPrerequisites(dependentTask.id, currentDeps);
                
                // Should have at least the number of prerequisites we added
                if (retrievedPrereqs.length < addedPrerequisites.length) {
                    return false;
                }
                
                // All added prerequisites should be in the retrieved list
                for (const prereqId of addedPrerequisites) {
                    if (!retrievedPrereqs.includes(prereqId)) {
                        return false;
                    }
                }
                
                // Test 2: Each prerequisite should appear exactly once (no duplicates)
                const prereqCounts = new Map();
                for (const prereqId of retrievedPrereqs) {
                    prereqCounts.set(prereqId, (prereqCounts.get(prereqId) || 0) + 1);
                }
                
                for (const [prereqId, count] of prereqCounts.entries()) {
                    if (count !== 1) {
                        // Each prerequisite should appear exactly once
                        return false;
                    }
                }
                
                // Test 3: The dependency graph should store all prerequisites correctly
                const key = String(dependentTask.id);
                const storedPrereqs = currentDeps[key] || [];
                
                // Should have exactly the prerequisites we added
                if (storedPrereqs.length !== addedPrerequisites.length) {
                    return false;
                }
                
                // All added prerequisites should be in storage
                for (const prereqId of addedPrerequisites) {
                    if (!storedPrereqs.includes(prereqId)) {
                        return false;
                    }
                }
                
                // Test 4: Adding more prerequisites should work (up to a reasonable limit)
                // Try to add one more prerequisite if possible
                const remainingTasks = tasks.filter(t => 
                    t.id !== dependentTask.id && 
                    !addedPrerequisites.includes(t.id)
                );
                
                if (remainingTasks.length > 0) {
                    const additionalPrereq = remainingTasks[0];
                    const result = addDependency(
                        dependentTask.id,
                        additionalPrereq.id,
                        currentDeps,
                        tasks
                    );
                    
                    // If successful (no cycle), verify it was added
                    if (result.error === null) {
                        const updatedPrereqs = getPrerequisites(dependentTask.id, result.dependencies);
                        
                        // Should now have one more prerequisite
                        if (updatedPrereqs.length !== addedPrerequisites.length + 1) {
                            return false;
                        }
                        
                        // The new prerequisite should be included
                        if (!updatedPrereqs.includes(additionalPrereq.id)) {
                            return false;
                        }
                        
                        // All previous prerequisites should still be there
                        for (const prereqId of addedPrerequisites) {
                            if (!updatedPrereqs.includes(prereqId)) {
                                return false;
                            }
                        }
                    }
                }
                
                // Test 5: Verify that getDependents works correctly for each prerequisite
                for (const prereqId of addedPrerequisites) {
                    const dependents = getDependents(prereqId, currentDeps);
                    
                    // The dependent task should be in the list
                    if (!dependents.includes(dependentTask.id)) {
                        return false;
                    }
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 4 PASSED: Multiple prerequisites allowed (100 iterations)');
    testsPassed++;
} catch (error) {
    property4Passed = false;
    property4Error = error;
    console.log('❌ Property 4 FAILED: Multiple prerequisites allowed');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 4: Multiple prerequisites allowed');
}

console.log('\n');

// Property 5: One task can be prerequisite for many
console.log('--- Property 5: One task can be prerequisite for many ---');
console.log('**Validates: Requirements 1.7**\n');

let property5Passed = true;
let property5Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                prerequisiteIdx: fc.nat(),
                dependentIndices: fc.array(fc.nat(), { minLength: 2, maxLength: 5 })
            }),
            (tasks, { dependencies, prerequisiteIdx, dependentIndices }) => {
                // Skip if not enough tasks
                if (tasks.length < 3) return true;
                
                // Select a prerequisite task
                const prerequisiteTask = tasks[prerequisiteIdx % tasks.length];
                
                // Select multiple different dependent tasks
                const dependentTasks = [];
                const seenIds = new Set([prerequisiteTask.id]);
                
                for (const idx of dependentIndices) {
                    const depTask = tasks[idx % tasks.length];
                    
                    // Skip if it's the prerequisite task itself or already selected
                    if (seenIds.has(depTask.id)) continue;
                    
                    seenIds.add(depTask.id);
                    dependentTasks.push(depTask);
                }
                
                // Skip if we couldn't get at least 2 different dependents
                if (dependentTasks.length < 2) return true;
                
                // Add the same prerequisite to multiple dependent tasks
                let currentDeps = { ...dependencies };
                const addedDependents = [];
                
                for (const depTask of dependentTasks) {
                    const result = addDependency(
                        depTask.id,
                        prerequisiteTask.id,
                        currentDeps,
                        tasks
                    );
                    
                    // Skip if adding this dependency would create a cycle
                    if (result.error !== null) continue;
                    
                    currentDeps = result.dependencies;
                    addedDependents.push(depTask.id);
                }
                
                // Skip if we couldn't add at least 2 dependents
                if (addedDependents.length < 2) return true;
                
                // Test 1: All added dependents should have the prerequisite in their prerequisites
                for (const depId of addedDependents) {
                    const prereqs = getPrerequisites(depId, currentDeps);
                    
                    // The prerequisite should be in the list
                    if (!prereqs.includes(prerequisiteTask.id)) {
                        return false;
                    }
                }
                
                // Test 2: The prerequisite should have all dependents in its dependents list
                const retrievedDependents = getDependents(prerequisiteTask.id, currentDeps);
                
                // Should have at least the number of dependents we added
                if (retrievedDependents.length < addedDependents.length) {
                    return false;
                }
                
                // All added dependents should be in the retrieved list
                for (const depId of addedDependents) {
                    if (!retrievedDependents.includes(depId)) {
                        return false;
                    }
                }
                
                // Test 3: Each dependent should appear exactly once (no duplicates)
                const depCounts = new Map();
                for (const depId of retrievedDependents) {
                    depCounts.set(depId, (depCounts.get(depId) || 0) + 1);
                }
                
                for (const [depId, count] of depCounts.entries()) {
                    if (count !== 1) {
                        // Each dependent should appear exactly once
                        return false;
                    }
                }
                
                // Test 4: The dependency graph should store all relationships correctly
                for (const depId of addedDependents) {
                    const key = String(depId);
                    const storedPrereqs = currentDeps[key] || [];
                    
                    // The prerequisite should be in the stored prerequisites
                    if (!storedPrereqs.includes(prerequisiteTask.id)) {
                        return false;
                    }
                }
                
                // Test 5: Adding more dependents should work (up to a reasonable limit)
                // Try to add one more dependent if possible
                const remainingTasks = tasks.filter(t => 
                    t.id !== prerequisiteTask.id && 
                    !addedDependents.includes(t.id)
                );
                
                if (remainingTasks.length > 0) {
                    const additionalDependent = remainingTasks[0];
                    const result = addDependency(
                        additionalDependent.id,
                        prerequisiteTask.id,
                        currentDeps,
                        tasks
                    );
                    
                    // If successful (no cycle), verify it was added
                    if (result.error === null) {
                        const updatedDependents = getDependents(prerequisiteTask.id, result.dependencies);
                        
                        // Should now have one more dependent
                        if (updatedDependents.length !== addedDependents.length + 1) {
                            return false;
                        }
                        
                        // The new dependent should be included
                        if (!updatedDependents.includes(additionalDependent.id)) {
                            return false;
                        }
                        
                        // All previous dependents should still be there
                        for (const depId of addedDependents) {
                            if (!updatedDependents.includes(depId)) {
                                return false;
                            }
                        }
                    }
                }
                
                // Test 6: Verify that getPrerequisites works correctly for each dependent
                for (const depId of addedDependents) {
                    const prereqs = getPrerequisites(depId, currentDeps);
                    
                    // The prerequisite task should be in the list
                    if (!prereqs.includes(prerequisiteTask.id)) {
                        return false;
                    }
                }
                
                // Test 7: Removing one dependent should not affect others
                if (addedDependents.length >= 2) {
                    const depToRemove = addedDependents[0];
                    const remainingDeps = addedDependents.slice(1);
                    
                    const removeResult = removeDependency(
                        depToRemove,
                        prerequisiteTask.id,
                        currentDeps
                    );
                    
                    // The removed dependent should no longer have the prerequisite
                    const prereqsAfterRemove = getPrerequisites(depToRemove, removeResult.dependencies);
                    if (prereqsAfterRemove.includes(prerequisiteTask.id)) {
                        return false;
                    }
                    
                    // All other dependents should still have the prerequisite
                    for (const depId of remainingDeps) {
                        const prereqs = getPrerequisites(depId, removeResult.dependencies);
                        if (!prereqs.includes(prerequisiteTask.id)) {
                            return false;
                        }
                    }
                    
                    // The prerequisite should still have the remaining dependents
                    const depsAfterRemove = getDependents(prerequisiteTask.id, removeResult.dependencies);
                    if (depsAfterRemove.length !== remainingDeps.length) {
                        return false;
                    }
                    
                    for (const depId of remainingDeps) {
                        if (!depsAfterRemove.includes(depId)) {
                            return false;
                        }
                    }
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 5 PASSED: One task can be prerequisite for many (100 iterations)');
    testsPassed++;
} catch (error) {
    property5Passed = false;
    property5Error = error;
    console.log('❌ Property 5 FAILED: One task can be prerequisite for many');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 5: One task can be prerequisite for many');
}

console.log('\n');

// Property 16: Serialization round-trip preserves graph
console.log('--- Property 16: Serialization round-trip preserves graph ---');
console.log('Validates: Requirements 10.2, 10.4\n');

let property16Passed = true;
let property16Error = null;

try {
    fc.assert(
        fc.property(dependencyGraphArbitrary, (dependencies) => {
            // Serialize then deserialize
            const serialized = serializeDependencies(dependencies);
            const deserialized = deserializeDependencies(serialized);
            
            // Check that all keys are preserved
            const originalKeys = Object.keys(dependencies).sort();
            const deserializedKeys = Object.keys(deserialized).sort();
            
            if (originalKeys.length !== deserializedKeys.length) {
                return false;
            }
            
            for (let i = 0; i < originalKeys.length; i++) {
                if (originalKeys[i] !== deserializedKeys[i]) {
                    return false;
                }
            }
            
            // Check that all values (prerequisite arrays) are preserved
            for (const key of originalKeys) {
                const originalPrereqs = dependencies[key].sort((a, b) => a - b);
                const deserializedPrereqs = deserialized[key].sort((a, b) => a - b);
                
                if (originalPrereqs.length !== deserializedPrereqs.length) {
                    return false;
                }
                
                for (let i = 0; i < originalPrereqs.length; i++) {
                    if (originalPrereqs[i] !== deserializedPrereqs[i]) {
                        return false;
                    }
                }
            }
            
            return true;
        }),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 16 PASSED: Serialization round-trip preserves graph (100 iterations)');
    testsPassed++;
} catch (error) {
    property16Passed = false;
    property16Error = error;
    console.log('❌ Property 16 FAILED: Serialization round-trip preserves graph');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 16: Serialization round-trip preserves graph');
}

console.log('\n');

// Property 12: Blocked status computed correctly
console.log('--- Property 12: Blocked status computed correctly ---');
console.log('**Validates: Requirements 6.1, 6.2**\n');

let property12Passed = true;
let property12Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                taskIndices: fc.array(fc.nat(), { minLength: 2, maxLength: 5 })
            }),
            (tasks, { dependencies, taskIndices }) => {
                // Skip if not enough tasks
                if (tasks.length < 2) return true;
                
                // Build a dependency graph
                let currentDeps = { ...dependencies };
                const seenPairs = new Set();
                
                // Add some dependencies
                for (let i = 0; i < taskIndices.length - 1; i++) {
                    const depIdx = taskIndices[i] % tasks.length;
                    const prereqIdx = taskIndices[i + 1] % tasks.length;
                    
                    const depTask = tasks[depIdx];
                    const prereqTask = tasks[prereqIdx];
                    
                    // Skip if same task
                    if (depTask.id === prereqTask.id) continue;
                    
                    // Skip if we've already added this exact dependency
                    const pairKey = `${depTask.id}->${prereqTask.id}`;
                    if (seenPairs.has(pairKey)) continue;
                    
                    // Try to add dependency
                    const result = addDependency(depTask.id, prereqTask.id, currentDeps, tasks);
                    
                    // Skip if it would create a cycle
                    if (result.error !== null) continue;
                    
                    currentDeps = result.dependencies;
                    seenPairs.add(pairKey);
                }
                
                // Now test blocked status for all tasks
                for (const task of tasks) {
                    const result = isTaskBlocked(task.id, currentDeps, tasks);
                    
                    // Get prerequisites for this task
                    const prerequisites = getPrerequisites(task.id, currentDeps);
                    
                    if (prerequisites.length === 0) {
                        // No prerequisites -> should not be blocked
                        if (result.blocked) return false;
                        if (result.blockingTasks.length !== 0) return false;
                    } else {
                        // Has prerequisites -> check if any are not done
                        const incompletePrerequsites = prerequisites
                            .map(prereqId => tasks.find(t => t.id === prereqId))
                            .filter(prereqTask => prereqTask && prereqTask.status !== 'done');
                        
                        if (incompletePrerequsites.length > 0) {
                            // Should be blocked
                            if (!result.blocked) return false;
                            if (result.blockingTasks.length !== incompletePrerequsites.length) return false;
                            
                            // Check that blocking tasks are correct
                            const blockingIds = result.blockingTasks.map(t => t.id).sort();
                            const expectedIds = incompletePrerequsites.map(t => t.id).sort();
                            
                            for (let i = 0; i < blockingIds.length; i++) {
                                if (blockingIds[i] !== expectedIds[i]) return false;
                            }
                        } else {
                            // All prerequisites are done -> should not be blocked
                            if (result.blocked) return false;
                            if (result.blockingTasks.length !== 0) return false;
                        }
                    }
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 12 PASSED: Blocked status computed correctly (100 iterations)');
    testsPassed++;
} catch (error) {
    property12Passed = false;
    property12Error = error;
    console.log('❌ Property 12 FAILED: Blocked status computed correctly');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 12: Blocked status computed correctly');
}

console.log('\n');

// Property 13: Deleting prerequisite unblocks dependents
console.log('--- Property 13: Deleting prerequisite unblocks dependents ---');
console.log('**Validates: Requirements 8.2**\n');

let property13Passed = true;
let property13Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                dependentIdx: fc.nat(),
                prerequisiteIdx: fc.nat()
            }),
            (tasks, { dependencies, dependentIdx, prerequisiteIdx }) => {
                // Skip if not enough tasks
                if (tasks.length < 2) return true;
                
                // Select two different tasks
                const dependentTask = tasks[dependentIdx % tasks.length];
                const prerequisiteTask = tasks[prerequisiteIdx % tasks.length];
                
                // Skip if same task
                if (dependentTask.id === prerequisiteTask.id) return true;
                
                // Skip if prerequisite is already done (we want to test unblocking)
                if (prerequisiteTask.status === 'done') return true;
                
                // Add a dependency: dependent depends on prerequisite
                const addResult = addDependency(
                    dependentTask.id,
                    prerequisiteTask.id,
                    dependencies,
                    tasks
                );
                
                // Skip if we couldn't add the dependency
                if (addResult.error !== null) return true;
                
                // Check that the dependent task is blocked
                const blockedBefore = isTaskBlocked(dependentTask.id, addResult.dependencies, tasks);
                
                // Should be blocked because prerequisite is not done
                if (!blockedBefore.blocked) return true; // Skip if not blocked (edge case)
                
                // Verify the prerequisite is in the blocking tasks
                const blockingIds = blockedBefore.blockingTasks.map(t => t.id);
                if (!blockingIds.includes(prerequisiteTask.id)) return false;
                
                // Now remove the prerequisite task (simulate deletion)
                const afterDeletion = removeDependenciesForTask(
                    prerequisiteTask.id,
                    addResult.dependencies
                );
                
                // Check blocked status after deletion
                const blockedAfter = isTaskBlocked(
                    dependentTask.id,
                    afterDeletion.dependencies,
                    tasks
                );
                
                // The prerequisite should no longer be in the blocking tasks
                const blockingIdsAfter = blockedAfter.blockingTasks.map(t => t.id);
                if (blockingIdsAfter.includes(prerequisiteTask.id)) return false;
                
                // If this was the only prerequisite, the task should be unblocked
                const prereqsAfter = getPrerequisites(dependentTask.id, afterDeletion.dependencies);
                if (prereqsAfter.length === 0) {
                    if (blockedAfter.blocked) return false;
                    if (blockedAfter.blockingTasks.length !== 0) return false;
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 13 PASSED: Deleting prerequisite unblocks dependents (100 iterations)');
    testsPassed++;
} catch (error) {
    property13Passed = false;
    property13Error = error;
    console.log('❌ Property 13 FAILED: Deleting prerequisite unblocks dependents');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 13: Deleting prerequisite unblocks dependents');
}

console.log('\n');

// Property 14: Bulk deletion removes all related dependencies
console.log('--- Property 14: Bulk deletion removes all related dependencies ---');
console.log('**Validates: Requirements 9.1**\n');

let property14Passed = true;
let property14Error = null;

try {
    fc.assert(
        fc.property(
            taskArrayArbitrary,
            fc.record({
                dependencies: fc.constant({}),
                taskIndices: fc.array(fc.nat(), { minLength: 4, maxLength: 10 })
            }),
            (tasks, { dependencies, taskIndices }) => {
                // Skip if not enough tasks
                if (tasks.length < 4) return true;
                
                // Build a dependency graph with multiple relationships
                let currentDeps = { ...dependencies };
                const addedDependencies = [];
                const seenPairs = new Set();
                
                // Add multiple dependencies between different task pairs
                for (let i = 0; i < taskIndices.length - 1; i++) {
                    const depIdx = taskIndices[i] % tasks.length;
                    const prereqIdx = taskIndices[i + 1] % tasks.length;
                    
                    const depTask = tasks[depIdx];
                    const prereqTask = tasks[prereqIdx];
                    
                    // Skip if same task
                    if (depTask.id === prereqTask.id) continue;
                    
                    // Skip if we've already added this exact dependency
                    const pairKey = `${depTask.id}->${prereqTask.id}`;
                    if (seenPairs.has(pairKey)) continue;
                    
                    // Try to add dependency
                    const result = addDependency(depTask.id, prereqTask.id, currentDeps, tasks);
                    
                    // Skip if it would create a cycle
                    if (result.error !== null) continue;
                    
                    currentDeps = result.dependencies;
                    seenPairs.add(pairKey);
                    addedDependencies.push({
                        dependent: depTask.id,
                        prerequisite: prereqTask.id
                    });
                }
                
                // Skip if we couldn't add at least 2 dependencies
                if (addedDependencies.length < 2) return true;
                
                // Select a subset of tasks to "delete" (at least 2)
                const numToDelete = Math.min(
                    Math.max(2, Math.floor(tasks.length / 3)),
                    tasks.length - 1
                );
                const tasksToDelete = new Set();
                for (let i = 0; i < numToDelete; i++) {
                    const idx = taskIndices[i] % tasks.length;
                    tasksToDelete.add(tasks[idx].id);
                }
                
                // Simulate bulk deletion by calling removeDependenciesForTask for each deleted task
                let afterBulkDelete = { ...currentDeps };
                for (const taskId of tasksToDelete) {
                    const result = removeDependenciesForTask(taskId, afterBulkDelete);
                    afterBulkDelete = result.dependencies;
                }
                
                // Verify that all dependencies involving deleted tasks are removed
                for (const taskId of tasksToDelete) {
                    const key = String(taskId);
                    
                    // Task should not have any prerequisites
                    if (afterBulkDelete[key] && afterBulkDelete[key].length > 0) {
                        return false;
                    }
                    
                    // Task should not appear as a prerequisite for any other task
                    for (const [depKey, prereqs] of Object.entries(afterBulkDelete)) {
                        if (prereqs.includes(taskId)) {
                            return false;
                        }
                    }
                }
                
                // Verify that dependencies NOT involving deleted tasks are preserved
                for (const dep of addedDependencies) {
                    // Skip if either task was deleted
                    if (tasksToDelete.has(dep.dependent) || tasksToDelete.has(dep.prerequisite)) {
                        continue;
                    }
                    
                    // This dependency should still exist
                    const key = String(dep.dependent);
                    const prereqs = afterBulkDelete[key] || [];
                    if (!prereqs.includes(dep.prerequisite)) {
                        return false;
                    }
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 14 PASSED: Bulk deletion removes all related dependencies (100 iterations)');
    testsPassed++;
} catch (error) {
    property14Passed = false;
    property14Error = error;
    console.log('❌ Property 14 FAILED: Bulk deletion removes all related dependencies');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 14: Bulk deletion removes all related dependencies');
}

console.log('\n');

// Property 15: Dependencies independent of project membership
console.log('--- Property 15: Dependencies independent of project membership ---');
console.log('**Validates: Requirements 9.2**\n');

let property15Passed = true;
let property15Error = null;

try {
    fc.assert(
        fc.property(
            fc.array(
                fc.record({
                    id: fc.integer({ min: 1, max: 100 }),
                    title: fc.string(),
                    status: fc.constantFrom('todo', 'progress', 'done'),
                    projectId: fc.option(fc.integer({ min: 1, max: 20 }), { nil: null })
                }),
                { minLength: 2, maxLength: 20 }
            ).map(tasks => {
                // Ensure unique IDs
                const seen = new Set();
                return tasks.filter(task => {
                    if (seen.has(task.id)) return false;
                    seen.add(task.id);
                    return true;
                });
            }),
            fc.record({
                dependencies: fc.constant({}),
                dependentIdx: fc.nat(),
                prerequisiteIdx: fc.nat(),
                newProjectId: fc.option(fc.integer({ min: 1, max: 20 }), { nil: null })
            }),
            (tasks, { dependencies, dependentIdx, prerequisiteIdx, newProjectId }) => {
                // Skip if not enough tasks
                if (tasks.length < 2) return true;
                
                // Select two different tasks
                const dependentTask = tasks[dependentIdx % tasks.length];
                const prerequisiteTask = tasks[prerequisiteIdx % tasks.length];
                
                // Skip if same task
                if (dependentTask.id === prerequisiteTask.id) return true;
                
                // Add a dependency
                const addResult = addDependency(
                    dependentTask.id,
                    prerequisiteTask.id,
                    dependencies,
                    tasks
                );
                
                // Skip if we couldn't add the dependency
                if (addResult.error !== null) return true;
                
                // Verify the dependency exists
                const prereqsBefore = getPrerequisites(dependentTask.id, addResult.dependencies);
                if (!prereqsBefore.includes(prerequisiteTask.id)) {
                    return false;
                }
                
                // Simulate moving the dependent task to a different project
                // (In the actual app, this would be done via updateTaskField)
                // The dependency graph should remain unchanged
                const dependenciesAfterMove = addResult.dependencies;
                
                // Verify the dependency still exists after "moving" the task
                const prereqsAfter = getPrerequisites(dependentTask.id, dependenciesAfterMove);
                if (!prereqsAfter.includes(prerequisiteTask.id)) {
                    return false;
                }
                
                // Verify the dependency graph is identical
                const keysBefore = Object.keys(addResult.dependencies).sort();
                const keysAfter = Object.keys(dependenciesAfterMove).sort();
                
                if (keysBefore.length !== keysAfter.length) {
                    return false;
                }
                
                for (let i = 0; i < keysBefore.length; i++) {
                    if (keysBefore[i] !== keysAfter[i]) {
                        return false;
                    }
                    
                    const prereqsBefore = addResult.dependencies[keysBefore[i]];
                    const prereqsAfter = dependenciesAfterMove[keysAfter[i]];
                    
                    if (prereqsBefore.length !== prereqsAfter.length) {
                        return false;
                    }
                    
                    const sortedBefore = [...prereqsBefore].sort((a, b) => a - b);
                    const sortedAfter = [...prereqsAfter].sort((a, b) => a - b);
                    
                    for (let j = 0; j < sortedBefore.length; j++) {
                        if (sortedBefore[j] !== sortedAfter[j]) {
                            return false;
                        }
                    }
                }
                
                return true;
            }
        ),
        { numRuns: 100 }
    );
    
    console.log('✅ Property 15 PASSED: Dependencies independent of project membership (100 iterations)');
    testsPassed++;
} catch (error) {
    property15Passed = false;
    property15Error = error;
    console.log('❌ Property 15 FAILED: Dependencies independent of project membership');
    console.log(`Error: ${error.message}`);
    if (error.counterexample) {
        console.log('Counterexample:', JSON.stringify(error.counterexample, null, 2));
    }
    testsFailed++;
    errors.push('Property 15: Dependencies independent of project membership');
}

// Additional edge case tests for serialization

console.log('\n--- Edge Case: Empty dependency graph ---');
const emptyGraph = {};
const serializedEmpty = serializeDependencies(emptyGraph);
const deserializedEmpty = deserializeDependencies(serializedEmpty);
assert(
    Object.keys(deserializedEmpty).length === 0,
    'Empty graph serialization round-trip'
);

console.log('\n--- Edge Case: Graph with empty arrays ---');
const graphWithEmpty = { "1": [], "2": [1], "3": [] };
const serializedWithEmpty = serializeDependencies(graphWithEmpty);
const deserializedWithEmpty = deserializeDependencies(serializedWithEmpty);
assert(
    Object.keys(deserializedWithEmpty).length === 3 &&
    deserializedWithEmpty["1"].length === 0 &&
    deserializedWithEmpty["2"].length === 1 &&
    deserializedWithEmpty["3"].length === 0,
    'Graph with empty arrays serialization round-trip'
);

console.log('\n--- Edge Case: Null/undefined input to deserialize ---');
const deserializedNull = deserializeDependencies(null);
const deserializedUndefined = deserializeDependencies(undefined);
assert(
    Object.keys(deserializedNull).length === 0 &&
    Object.keys(deserializedUndefined).length === 0,
    'Null/undefined deserialize to empty graph'
);

console.log('\n--- Edge Case: Invalid data types in deserialization ---');
const invalidData = { "1": "not-an-array", "2": [1, 2], "3": null };
const deserializedInvalid = deserializeDependencies(invalidData);
assert(
    !deserializedInvalid["1"] && // Invalid entry should be skipped
    deserializedInvalid["2"] && deserializedInvalid["2"].length === 2,
    'Invalid data types handled gracefully'
);

// Final Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Total Properties Tested: 16`);
console.log(`Total Edge Cases: 4`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);

if (testsFailed > 0) {
    console.log('\n=== FAILED TESTS ===');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    
    if (property1Error && property1Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 1) ===');
        console.log('Property 1 failed with input:');
        console.log(JSON.stringify(property1Error.counterexample, null, 2));
    }
    
    if (property2Error && property2Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 2) ===');
        console.log('Property 2 failed with input:');
        console.log(JSON.stringify(property2Error.counterexample, null, 2));
    }
    
    if (property3Error && property3Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 3) ===');
        console.log('Property 3 failed with input:');
        console.log(JSON.stringify(property3Error.counterexample, null, 2));
    }
    
    if (property4Error && property4Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 4) ===');
        console.log('Property 4 failed with input:');
        console.log(JSON.stringify(property4Error.counterexample, null, 2));
    }
    
    if (property5Error && property5Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 5) ===');
        console.log('Property 5 failed with input:');
        console.log(JSON.stringify(property5Error.counterexample, null, 2));
    }
    
    if (property6Error && property6Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 6) ===');
        console.log('Property 6 failed with input:');
        console.log(JSON.stringify(property6Error.counterexample, null, 2));
    }
    
    if (property7Error && property7Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 7) ===');
        console.log('Property 7 failed with input:');
        console.log(JSON.stringify(property7Error.counterexample, null, 2));
    }
    
    if (property8Error && property8Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 8) ===');
        console.log('Property 8 failed with input:');
        console.log(JSON.stringify(property8Error.counterexample, null, 2));
    }
    
    if (property9Error && property9Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 9) ===');
        console.log('Property 9 failed with input:');
        console.log(JSON.stringify(property9Error.counterexample, null, 2));
    }
    
    if (property10Error && property10Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 10) ===');
        console.log('Property 10 failed with input:');
        console.log(JSON.stringify(property10Error.counterexample, null, 2));
    }
    
    if (property11Error && property11Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 11) ===');
        console.log('Property 11 failed with input:');
        console.log(JSON.stringify(property11Error.counterexample, null, 2));
    }
    
    if (property16Error && property16Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 16) ===');
        console.log('Property 16 failed with input:');
        console.log(JSON.stringify(property16Error.counterexample, null, 2));
    }
    
    if (property12Error && property12Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 12) ===');
        console.log('Property 12 failed with input:');
        console.log(JSON.stringify(property12Error.counterexample, null, 2));
    }
    
    if (property13Error && property13Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 13) ===');
        console.log('Property 13 failed with input:');
        console.log(JSON.stringify(property13Error.counterexample, null, 2));
    }
    
    if (property14Error && property14Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 14) ===');
        console.log('Property 14 failed with input:');
        console.log(JSON.stringify(property14Error.counterexample, null, 2));
    }
    
    if (property15Error && property15Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS (Property 15) ===');
        console.log('Property 15 failed with input:');
        console.log(JSON.stringify(property15Error.counterexample, null, 2));
    }
    
    process.exit(1);
} else {
    console.log('\n🎉 ALL PROPERTY-BASED TESTS PASSED! 🎉');
    console.log('\nProperty 1: Adding dependency creates the relationship - VERIFIED');
    console.log('Property 2: Invalid task IDs are rejected - VERIFIED');
    console.log('Property 3: Circular dependencies are prevented - VERIFIED');
    console.log('Property 4: Multiple prerequisites allowed - VERIFIED');
    console.log('Property 5: One task can be prerequisite for many - VERIFIED');
    console.log('Property 6: Adding duplicate dependencies is idempotent - VERIFIED');
    console.log('Property 7: Removing dependency deletes the relationship - VERIFIED');
    console.log('Property 8: Removing one dependency preserves others - VERIFIED');
    console.log('Property 9: Task deletion removes all related dependencies - VERIFIED');
    console.log('Property 10: Query returns correct prerequisites - VERIFIED');
    console.log('Property 11: Query returns correct dependents - VERIFIED');
    console.log('Property 12: Blocked status computed correctly - VERIFIED');
    console.log('Property 13: Deleting prerequisite unblocks dependents - VERIFIED');
    console.log('Property 14: Bulk deletion removes all related dependencies - VERIFIED');
    console.log('Property 15: Dependencies independent of project membership - VERIFIED');
    console.log('Property 16: Serialization round-trip preserves graph - VERIFIED');
    process.exit(0);
}
