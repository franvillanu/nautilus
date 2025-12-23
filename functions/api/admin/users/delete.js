// functions/api/admin/users/delete.js
import { verifyRequest } from '../../../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // Verify admin auth
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload || payload.role !== 'admin') {
            return jsonResponse({ error: 'Admin access required' }, 403);
        }

        const { userId } = await request.json();

        if (!userId) {
            return jsonResponse({ error: 'User ID required' }, 400);
        }

        // Get user
        const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        const user = JSON.parse(userJson);

        // Delete user data
        await env.NAUTILUS_DATA.delete(`user:${userId}`);
        await env.NAUTILUS_DATA.delete(`user:${userId}:tasks`);
        await env.NAUTILUS_DATA.delete(`user:${userId}:projects`);
        await env.NAUTILUS_DATA.delete(`user:username:${user.username}`);
        if (user.email) {
            await env.NAUTILUS_DATA.delete(`user:email:${user.email}`);
        }

        // Remove from user list
        const userListJson = await env.NAUTILUS_DATA.get('admin:userlist');
        if (userListJson) {
            const userList = JSON.parse(userListJson);
            const filtered = userList.filter(id => id !== userId);
            await env.NAUTILUS_DATA.put('admin:userlist', JSON.stringify(filtered));
        }

        return jsonResponse({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return jsonResponse({ error: 'Failed to delete user' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
