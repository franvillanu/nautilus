/**
 * Property-Based Tests for Dependency Service
 * Feature: task-dependencies
 * Uses fast-check for property-based testing
 */

import fc from 'fast-check';
import {
    serializeDependencies,
    deserializeDependencies,
    addDependency
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
console.log(`Total Properties Tested: 3`);
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
    console.log('Property 16: Serialization round-trip preserves graph - VERIFIED');
    process.exit(0);
}
