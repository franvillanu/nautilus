// functions/api/auth/change-username.js
import { verifyRequest } from '../../../utils/jwt.js';

import { getJwtSecretsForVerify } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const { newUsername } = await request.json();

        if (!newUsername) {
            return jsonResponse({ error: 'Username required' }, 400);
        }

        const username = newUsername.toLowerCase();

        // Check if available
        const existingUserId = await env.NAUTILUS_DATA.get(`user:username:${username}`);
        if (existingUserId && existingUserId !== payload.userId) {
            return jsonResponse({ error: 'Username already taken' }, 409);
        }

        // Get user record
        const userJson = await env.NAUTILUS_DATA.get(`user:${payload.userId}`);
        const user = JSON.parse(userJson);
        const oldUsername = user.username;

        // Update user
        user.username = username;
        await env.NAUTILUS_DATA.put(`user:${user.id}`, JSON.stringify(user));

        // Update lookup
        await env.NAUTILUS_DATA.delete(`user:username:${oldUsername}`);
        await env.NAUTILUS_DATA.put(`user:username:${username}`, user.id);

        return jsonResponse({ success: true, username });
    } catch (error) {
        console.error('Change username error:', error);
        return jsonResponse({ error: 'Failed to change username' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
