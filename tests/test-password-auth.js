// tests/test-password-auth.js
// Test suite for password authentication utilities
// Run with: node tests/test-password-auth.js

import { isValidPassword, getPasswordStrength, createPasswordHash, verifyPassword } from '../utils/password.js';

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

console.log('\n=== PASSWORD VALIDATION TESTS ===\n');

// isValidPassword tests
assert(isValidPassword('Abcdefg1') === true, 'Valid password: 8 chars, uppercase, lowercase, digit');
assert(isValidPassword('MyP@ssw0rd') === true, 'Valid password: with special chars');
assert(isValidPassword('LongPassword123!') === true, 'Valid password: long with special');
assert(isValidPassword('abcdefg1') === false, 'Invalid: no uppercase');
assert(isValidPassword('ABCDEFG1') === false, 'Invalid: no lowercase');
assert(isValidPassword('Abcdefgh') === false, 'Invalid: no digit');
assert(isValidPassword('Abcd1') === false, 'Invalid: too short');
assert(isValidPassword('') === false, 'Invalid: empty string');
assert(isValidPassword(null) === false, 'Invalid: null');
assert(isValidPassword(undefined) === false, 'Invalid: undefined');
assert(isValidPassword(12345678) === false, 'Invalid: number type');

console.log('\n=== PASSWORD STRENGTH TESTS ===\n');

// getPasswordStrength tests
assert(getPasswordStrength('') === 'weak', 'Strength: empty is weak');
assert(getPasswordStrength('abc') === 'weak', 'Strength: short is weak');
assert(getPasswordStrength('abcdefgh') === 'weak', 'Strength: lowercase only 8 chars is weak');
assert(getPasswordStrength('Abcdefg1') === 'fair', 'Strength: basic valid is fair');
assert(getPasswordStrength('MyP@ssword123') === 'strong', 'Strength: long with special is strong');
assert(getPasswordStrength('Abcdefghij12!@') === 'strong', 'Strength: all categories is strong');

console.log('\n=== PASSWORD HASH + VERIFY TESTS ===\n');

// createPasswordHash + verifyPassword roundtrip
const testPassword = 'TestPassword1';
try {
    const hash = await createPasswordHash(testPassword);
    assert(typeof hash === 'string', 'Hash is a string');
    assert(hash.includes(':'), 'Hash contains salt:hash separator');
    const [salt, hashPart] = hash.split(':');
    assert(salt.length > 0, 'Salt is non-empty');
    assert(hashPart.length > 0, 'Hash part is non-empty');

    const verified = await verifyPassword(testPassword, hash);
    assert(verified === true, 'Correct password verifies');

    const wrongVerified = await verifyPassword('WrongPassword1', hash);
    assert(wrongVerified === false, 'Wrong password does not verify');

    const emptyVerified = await verifyPassword('', hash);
    assert(emptyVerified === false, 'Empty password does not verify');
} catch (err) {
    assert(false, `Hash/verify threw error: ${err.message}`);
}

// createPasswordHash rejects invalid passwords
try {
    await createPasswordHash('weak');
    assert(false, 'createPasswordHash should throw for invalid password');
} catch (err) {
    assert(err.message.includes('Password must be'), 'createPasswordHash throws correct error for invalid password');
}

// verifyPassword handles malformed stored hashes
const malformedResult1 = await verifyPassword('Test1234', '');
assert(malformedResult1 === false, 'verifyPassword returns false for empty stored hash');

const malformedResult2 = await verifyPassword('Test1234', 'noseparator');
assert(malformedResult2 === false, 'verifyPassword returns false for hash without separator');

const malformedResult3 = await verifyPassword('Test1234', null);
assert(malformedResult3 === false, 'verifyPassword returns false for null stored hash');

// Unique salts test
const hash1 = await createPasswordHash('TestPassword1');
const hash2 = await createPasswordHash('TestPassword1');
const [salt1] = hash1.split(':');
const [salt2] = hash2.split(':');
assert(salt1 !== salt2, 'Same password produces different salts');

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
    process.exit(0);
}
