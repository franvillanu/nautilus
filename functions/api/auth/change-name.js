// functions/api/auth/change-name.js
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

        const { newName } = await request.json();

        if (!newName || newName.trim().length === 0) {
            return jsonResponse({ error: 'Name required' }, 400);
        }

        // Get user record
        const userJson = await env.NAUTILUS_DATA.get(`user:${payload.userId}`);
        const user = JSON.parse(userJson);

        // Update user
        user.name = newName.trim();
        await env.NAUTILUS_DATA.put(`user:${user.id}`, JSON.stringify(user));

        return jsonResponse({ success: true, name: user.name });
    } catch (error) {
        console.error('Change name error:', error);
        return jsonResponse({ error: 'Failed to change name' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
