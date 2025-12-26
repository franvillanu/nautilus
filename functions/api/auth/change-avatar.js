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

        const { avatarDataUrl } = await request.json();

        const normalized = avatarDataUrl ? String(avatarDataUrl) : null;
        if (normalized) {
            if (!normalized.startsWith('data:image/')) {
                return jsonResponse({ error: 'Invalid image data' }, 400);
            }

            const maxSizeBytes = 2048 * 1024; // 2MB
            if (normalized.length > maxSizeBytes * 1.37) {
                return jsonResponse({ error: 'Avatar image too large' }, 413);
            }
        }

        const userJson = await env.NAUTILUS_DATA.get(`user:${payload.userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }
        const user = JSON.parse(userJson);

        user.avatarDataUrl = normalized;
        await env.NAUTILUS_DATA.put(`user:${user.id}`, JSON.stringify(user));

        return jsonResponse({ success: true, avatarDataUrl: user.avatarDataUrl || null });
    } catch (error) {
        console.error('Change avatar error:', error);
        return jsonResponse({ error: 'Failed to change avatar' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
