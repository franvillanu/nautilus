// utils/pin.js - PIN hashing utilities using Web Crypto API

/**
 * Generates a random salt for PIN hashing
 * @returns {Promise<string>} Base64-encoded salt
 */
async function generateSalt() {
    const saltBuffer = new Uint8Array(16);
    crypto.getRandomValues(saltBuffer);
    return arrayBufferToBase64(saltBuffer);
}

/**
 * Hashes a PIN with a salt using PBKDF2
 * @param {string} pin - 4-digit PIN
 * @param {string} salt - Base64-encoded salt
 * @returns {Promise<string>} Base64-encoded hash
 */
async function hashPin(pin, salt) {
    const encoder = new TextEncoder();
    const pinBuffer = encoder.encode(pin);
    const saltBuffer = base64ToArrayBuffer(salt);

    // Import PIN as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        pinBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    // Derive hash using PBKDF2
    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    return arrayBufferToBase64(new Uint8Array(hashBuffer));
}

/**
 * Verifies a PIN against a stored hash
 * @param {string} pin - PIN to verify
 * @param {string} storedHash - Stored hash in format "salt:hash"
 * @returns {Promise<boolean>} True if PIN matches
 */
export async function verifyPin(pin, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const computedHash = await hashPin(pin, salt);
    return computedHash === hash;
}

/**
 * Creates a hash for a new PIN
 * @param {string} pin - 4-digit PIN
 * @returns {Promise<string>} Hash in format "salt:hash"
 */
export async function createPinHash(pin) {
    // Validate PIN is 4 digits
    if (!/^\d{4}$/.test(pin)) {
        throw new Error('PIN must be exactly 4 digits');
    }

    const salt = await generateSalt();
    const hash = await hashPin(pin, salt);
    return `${salt}:${hash}`;
}

/**
 * Validates PIN format (4 digits)
 * @param {string} pin - PIN to validate
 * @returns {boolean} True if valid format
 */
export function isValidPin(pin) {
    return /^\d{4}$/.test(pin);
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
