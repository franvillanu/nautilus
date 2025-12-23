// functions/api/auth/change-email.js
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

        const { newEmail } = await request.json();

        if (!newEmail || !isValidEmail(newEmail)) {
            return jsonResponse({ error: 'Valid email required' }, 400);
        }

        const email = newEmail.toLowerCase();

        // Check if available
        const existingUserId = await env.NAUTILUS_DATA.get(`user:email:${email}`);
        if (existingUserId && existingUserId !== payload.userId) {
            return jsonResponse({ error: 'Email already in use' }, 409);
        }

        // Get user record
        const userJson = await env.NAUTILUS_DATA.get(`user:${payload.userId}`);
        const user = JSON.parse(userJson);
        const oldEmail = user.email;

        // Update user
        user.email = email;
        await env.NAUTILUS_DATA.put(`user:${user.id}`, JSON.stringify(user));

        // Update lookup
        if (oldEmail) {
            await env.NAUTILUS_DATA.delete(`user:email:${oldEmail}`);
        }
        await env.NAUTILUS_DATA.put(`user:email:${email}`, user.id);

        return jsonResponse({ success: true, email });
    } catch (error) {
        console.error('Change email error:', error);
        return jsonResponse({ error: 'Failed to change email' }, 500);
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
