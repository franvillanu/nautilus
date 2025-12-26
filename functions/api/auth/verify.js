// functions/api/auth/verify.js
import { verifyRequest } from '../../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
    if (!payload) {
        return jsonResponse({ error: 'Invalid token' }, 401);
    }

    // Get fresh user data
    const userJson = await env.NAUTILUS_DATA.get(`user:${payload.userId}`);
    if (!userJson) {
        return jsonResponse({ error: 'User not found' }, 404);
    }

    const user = JSON.parse(userJson);

    return jsonResponse({
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            avatarDataUrl: user.avatarDataUrl || null,
            needsSetup: user.needsSetup || false
        }
    });
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
