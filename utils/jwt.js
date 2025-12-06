// utils/jwt.js - JWT utilities using Web Crypto API

/**
 * Generates a JWT secret key from environment or creates one
 * @param {string} secret - Secret string (from env.JWT_SECRET)
 * @returns {Promise<CryptoKey>} Crypto key for HMAC
 */
async function getSecretKey(secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

/**
 * Creates a JWT token
 * @param {object} payload - Token payload (userId, username, name, etc.)
 * @param {string} secret - JWT secret
 * @param {number} expiresIn - Expiration in seconds (default 7 days)
 * @returns {Promise<string>} JWT token
 */
export async function signJwt(payload, secret, expiresIn = 7 * 24 * 60 * 60) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const claims = {
        ...payload,
        iat: now,
        exp: now + expiresIn
    };

    const encoder = new TextEncoder();
    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(claims));
    const message = `${headerB64}.${payloadB64}`;

    const key = await getSecretKey(secret);
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(message)
    );

    const signatureB64 = base64UrlEncode(signature);
    return `${message}.${signatureB64}`;
}

/**
 * Verifies and decodes a JWT token
 * @param {string} token - JWT token
 * @param {string} secret - JWT secret
 * @returns {Promise<object|null>} Decoded payload or null if invalid
 */
export async function verifyJwt(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const [headerB64, payloadB64, signatureB64] = parts;
        const message = `${headerB64}.${payloadB64}`;

        // Verify signature
        const encoder = new TextEncoder();
        const key = await getSecretKey(secret);
        const signature = base64UrlDecode(signatureB64);

        const valid = await crypto.subtle.verify(
            'HMAC',
            key,
            signature,
            encoder.encode(message)
        );

        if (!valid) {
            return null;
        }

        // Decode payload
        const payload = JSON.parse(base64UrlDecodeString(payloadB64));

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return null; // Token expired
        }

        return payload;
    } catch (error) {
        console.error('JWT verification error:', error);
        return null;
    }
}

/**
 * Extracts JWT token from Authorization header
 * @param {Request} request - HTTP request
 * @returns {string|null} Token or null
 */
export function extractToken(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

/**
 * Verifies request has valid JWT and returns payload
 * @param {Request} request - HTTP request
 * @param {string} secret - JWT secret
 * @returns {Promise<object|null>} Decoded payload or null
 */
export async function verifyRequest(request, secret) {
    const token = extractToken(request);
    if (!token) {
        return null;
    }
    return await verifyJwt(token, secret);
}

// Helper functions for base64url encoding/decoding

function base64UrlEncode(input) {
    if (typeof input === 'string') {
        const encoder = new TextEncoder();
        input = encoder.encode(input);
    }

    const bytes = new Uint8Array(input);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function base64UrlDecode(base64url) {
    let base64 = base64url
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    // Add padding
    const pad = base64.length % 4;
    if (pad) {
        base64 += '='.repeat(4 - pad);
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function base64UrlDecodeString(base64url) {
    const buffer = base64UrlDecode(base64url);
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
}
