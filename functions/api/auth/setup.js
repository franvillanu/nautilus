// functions/api/auth/setup.js
import { verifyRequest } from '../../../utils/jwt.js';
import { createPinHash, isValidPin } from '../../../utils/pin.js';
import { signJwt } from '../../../utils/jwt.js';

const JWT_SECRET = 'nautilus-secret-key-change-in-production';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const payload = await verifyRequest(request, JWT_SECRET);
        if (!payload) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const { username, name, email, newPin } = await request.json();

        // Validate inputs
        if (!username || !name || !email || !newPin) {
            return jsonResponse({ error: 'All fields required' }, 400);
        }

        if (!isValidPin(newPin)) {
            return jsonResponse({ error: 'PIN must be 4 digits' }, 400);
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

        // Hash new PIN
        const pinHash = await createPinHash(newPin);

        // Update user record
        const updatedUser = {
            ...user,
            username: newUsername,
            name,
            email: email.toLowerCase(),
            pinHash,
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
                needsSetup: false
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
