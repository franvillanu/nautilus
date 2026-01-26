// functions/api/auth/delete-account.js
import { verifyRequest } from '../../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // Verify user auth (not admin - users delete their own account)
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload || !payload.userId) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const userId = payload.userId;

        // Get user record to verify it exists
        const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        const user = JSON.parse(userJson);

        // Delete all user data
        await env.NAUTILUS_DATA.delete(`user:${userId}`);
        await env.NAUTILUS_DATA.delete(`user:${userId}:tasks`);
        await env.NAUTILUS_DATA.delete(`user:${userId}:projects`);
        await env.NAUTILUS_DATA.delete(`user:username:${user.username.toLowerCase()}`);
        if (user.email) {
            await env.NAUTILUS_DATA.delete(`user:email:${user.email.toLowerCase()}`);
        }

        // Remove from user list (if exists)
        const userListJson = await env.NAUTILUS_DATA.get('admin:userlist');
        if (userListJson) {
            const userList = JSON.parse(userListJson);
            const filtered = userList.filter(id => id !== userId);
            await env.NAUTILUS_DATA.put('admin:userlist', JSON.stringify(filtered));
        }

        return jsonResponse({ success: true });
    } catch (error) {
        console.error('Delete account error:', error);
        return jsonResponse({ error: 'Failed to delete account' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
