// functions/api/auth/setup.js
import { verifyRequest } from '../../../utils/jwt.js';
import { createPinHash, isValidPin } from '../../../utils/pin.js';
import { createPasswordHash, isValidPassword } from '../../../utils/password.js';
import { signJwt } from '../../../utils/jwt.js';

import { getJwtSecretsForVerify, requireJwtSecret } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRET = requireJwtSecret(env);
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const { username, name, email, newPin, newPassword, authMethod } = await request.json();

        // Validate required fields
        if (!username || !name || !email) {
            return jsonResponse({ error: 'Username, name, and email are required' }, 400);
        }

        // Determine auth method (default to pin for backward compatibility)
        const chosenMethod = authMethod || 'pin';

        // Validate credential based on chosen method
        if (chosenMethod === 'password') {
            if (!newPassword) {
                return jsonResponse({ error: 'Password required' }, 400);
            }
            if (!isValidPassword(newPassword)) {
                return jsonResponse({ error: 'Password must be at least 8 characters with uppercase, lowercase, and digit' }, 400);
            }
        } else {
            if (!newPin) {
                return jsonResponse({ error: 'PIN required' }, 400);
            }
            if (!isValidPin(newPin)) {
                return jsonResponse({ error: 'PIN must be 4 digits' }, 400);
            }
        }

        if (!isValidEmail(email)) {
            return jsonResponse({ error: 'Invalid email format' }, 400);
        }

        const newUsername = username.toLowerCase();

        // Get user record
        const userJson = await env.NAUTILUS_DATA.get(`user:${payload.userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        const user = JSON.parse(userJson);
        const oldUsername = user.username;

        // Check if username changed and is available
        if (newUsername !== oldUsername) {
            const existingUserId = await env.NAUTILUS_DATA.get(`user:username:${newUsername}`);
            if (existingUserId && existingUserId !== user.id) {
                return jsonResponse({ error: 'Username already taken' }, 409);
            }
        }

        // Check if email is available
        const existingEmailUserId = await env.NAUTILUS_DATA.get(`user:email:${email.toLowerCase()}`);
        if (existingEmailUserId && existingEmailUserId !== user.id) {
            return jsonResponse({ error: 'Email already in use' }, 409);
        }

        // Hash credential based on chosen method
        let pinHash = user.pinHash;
        let passwordHash = user.passwordHash || null;

        if (chosenMethod === 'password') {
            passwordHash = await createPasswordHash(newPassword);
        } else {
            pinHash = await createPinHash(newPin);
        }

        // Update user record
        const updatedUser = {
            ...user,
            username: newUsername,
            name,
            email: email.toLowerCase(),
            authMethod: chosenMethod,
            pinHash,
            passwordHash,
            needsSetup: false,
            setupCompletedAt: new Date().toISOString()
        };

        await env.NAUTILUS_DATA.put(`user:${user.id}`, JSON.stringify(updatedUser));

        // Update username lookup if changed
        if (newUsername !== oldUsername) {
            await env.NAUTILUS_DATA.delete(`user:username:${oldUsername}`);
            await env.NAUTILUS_DATA.put(`user:username:${newUsername}`, user.id);
        }

        // Create email lookup
        await env.NAUTILUS_DATA.put(`user:email:${email.toLowerCase()}`, user.id);

        // Generate new token with updated info
        const token = await signJwt({
            userId: user.id,
            username: newUsername,
            name
        }, JWT_SECRET);

        return jsonResponse({
            token,
            user: {
                id: user.id,
                username: newUsername,
                name,
                email: email.toLowerCase(),
                avatarDataUrl: updatedUser.avatarDataUrl || null,
                needsSetup: false,
                authMethod: chosenMethod
            }
        });
    } catch (error) {
        console.error('Setup error:', error);
        return jsonResponse({ error: 'Setup failed' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
