// functions/api/admin/users.js
import { verifyRequest } from '../../../utils/jwt.js';
import { createPinHash, isValidPin } from '../../../utils/pin.js';
import { getJwtSecretsForVerify } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;

    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    // Verify admin auth
    const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
    if (!payload || payload.role !== 'admin') {
        return jsonResponse({ error: 'Admin access required' }, 403);
    }

    if (request.method === 'GET') {
        return handleListUsers(env);
    }

    if (request.method === 'POST') {
        return handleCreateUser(request, env);
    }

    return new Response('Method not allowed', { status: 405 });
}

async function handleListUsers(env) {
    try {
        const userListJson = await env.NAUTILUS_DATA.get('admin:userlist');
        const userIds = userListJson ? JSON.parse(userListJson) : [];

        const users = [];
        for (const userId of userIds) {
            if (!userId) continue;
            const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
            if (userJson) {
                const user = JSON.parse(userJson);
                users.push({
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    needsSetup: user.needsSetup,
                    createdAt: user.createdAt
                });
            }
        }

        return jsonResponse({ users });
    } catch (error) {
        console.error('List users error:', error);
        return jsonResponse({ error: 'Failed to list users' }, 500);
    }
}

async function handleCreateUser(request, env) {
    try {
        const { username, name, tempPin } = await request.json();

        if (!username || !name || !tempPin) {
            return jsonResponse({ error: 'Username, name, and temp PIN required' }, 400);
        }

        if (!isValidPin(tempPin)) {
            return jsonResponse({ error: 'PIN must be 4 digits' }, 400);
        }

        const normalizedUsername = username.toLowerCase();

        // Check if username exists
        const existingUserId = await env.NAUTILUS_DATA.get(`user:username:${normalizedUsername}`);
        if (existingUserId) {
            return jsonResponse({ error: 'Username already exists' }, 409);
        }

        // Create user
        const userId = `user-${Date.now()}-${normalizedUsername}`;
        const pinHash = await createPinHash(tempPin);

        const user = {
            id: userId,
            username: normalizedUsername,
            name,
            email: '',
            pinHash,
            needsSetup: true,
            createdAt: new Date().toISOString()
        };

        await env.NAUTILUS_DATA.put(`user:${userId}`, JSON.stringify(user));
        await env.NAUTILUS_DATA.put(`user:username:${normalizedUsername}`, userId);

        // Add to user list
        const userListJson = await env.NAUTILUS_DATA.get('admin:userlist');
        const userList = userListJson ? JSON.parse(userListJson) : [];
        userList.push(userId);
        await env.NAUTILUS_DATA.put('admin:userlist', JSON.stringify(userList));

        return jsonResponse({
            success: true,
            user: {
                id: userId,
                username: normalizedUsername,
                name,
                tempPin
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        return jsonResponse({ error: 'Failed to create user' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
