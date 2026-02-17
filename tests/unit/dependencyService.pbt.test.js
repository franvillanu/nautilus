/**
 * Property-Based Tests for Dependency Service
 * Feature: task-dependencies
 * Uses fast-check for property-based testing
 */

import fc from 'fast-check';
import {
    serializeDependencies,
    deserializeDependencies
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

console.log('\n=== DEPENDENCY SERVICE PROPERTY-BASED TESTS ===\n');

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
console.log(`Total Properties Tested: 1`);
console.log(`Total Edge Cases: 4`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);

if (testsFailed > 0) {
    console.log('\n=== FAILED TESTS ===');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    
    if (property16Error && property16Error.counterexample) {
        console.log('\n=== COUNTEREXAMPLE DETAILS ===');
        console.log('Property 16 failed with input:');
        console.log(JSON.stringify(property16Error.counterexample, null, 2));
    }
    
    process.exit(1);
} else {
    console.log('\n🎉 ALL PROPERTY-BASED TESTS PASSED! 🎉');
    console.log('\nProperty 16: Serialization round-trip preserves graph - VERIFIED');
    process.exit(0);
}
