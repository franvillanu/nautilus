// utils/password.js - Password hashing utilities using Web Crypto API
// Mirrors utils/pin.js structure but with stronger iteration count for passwords

const PASSWORD_ITERATIONS = 600000; // OWASP 2024 recommendation for passwords

/**
 * Generates a random salt for password hashing
 * @returns {Promise<string>} Base64-encoded salt
 */
async function generateSalt() {
    const saltBuffer = new Uint8Array(16);
    crypto.getRandomValues(saltBuffer);
    return arrayBufferToBase64(saltBuffer);
}

/**
 * Hashes a password with a salt using PBKDF2
 * @param {string} password - User password
 * @param {string} salt - Base64-encoded salt
 * @returns {Promise<string>} Base64-encoded hash
 */
async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = base64ToArrayBuffer(salt);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: PASSWORD_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    return arrayBufferToBase64(new Uint8Array(hashBuffer));
}

/**
 * Verifies a password against a stored hash
 * @param {string} password - Password to verify
 * @param {string} storedHash - Stored hash in format "salt:hash"
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, hash] = storedHash.split(':');
    const computedHash = await hashPassword(password, salt);
    return computedHash === hash;
}

/**
 * Creates a hash for a new password
 * @param {string} password - User password (must pass isValidPassword)
 * @returns {Promise<string>} Hash in format "salt:hash"
 */
export async function createPasswordHash(password) {
    if (!isValidPassword(password)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, and digit');
    }

    const salt = await generateSalt();
    const hash = await hashPassword(password, salt);
    return `${salt}:${hash}`;
}

/**
 * Validates password meets minimum requirements
 * @param {string} password - Password to validate
 * @returns {boolean} True if valid
 */
export function isValidPassword(password) {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
}

/**
 * Returns password strength assessment (advisory only)
 * @param {string} password - Password to assess
 * @returns {'weak'|'fair'|'strong'} Strength level
 */
export function getPasswordStrength(password) {
    if (!password) return 'weak';
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 3) return 'weak';
    if (score <= 4) return 'fair';
    return 'strong';
}

// Helper functions for base64 encoding/decoding

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
