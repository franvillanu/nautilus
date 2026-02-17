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
    getDependents
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
console.log(`Total Properties Tested: 10`);
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
    
    process.exit(1);
} else {
    console.log('\n🎉 ALL PROPERTY-BASED TESTS PASSED! 🎉');
    console.log('\nProperty 1: Adding dependency creates the relationship - VERIFIED');
    console.log('Property 2: Invalid task IDs are rejected - VERIFIED');
    console.log('Property 3: Circular dependencies are prevented - VERIFIED');
    console.log('Property 6: Adding duplicate dependencies is idempotent - VERIFIED');
    console.log('Property 7: Removing dependency deletes the relationship - VERIFIED');
    console.log('Property 8: Removing one dependency preserves others - VERIFIED');
    console.log('Property 9: Task deletion removes all related dependencies - VERIFIED');
    console.log('Property 10: Query returns correct prerequisites - VERIFIED');
    console.log('Property 11: Query returns correct dependents - VERIFIED');
    console.log('Property 16: Serialization round-trip preserves graph - VERIFIED');
    process.exit(0);
}
