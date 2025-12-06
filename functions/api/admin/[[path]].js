// functions/api/admin.js - Admin endpoints
import { verifyPin, createPinHash, isValidPin } from '../../utils/pin.js';
import { signJwt, verifyRequest } from '../../utils/jwt.js';

const JWT_SECRET = 'nautilus-secret-key-change-in-production'; // TODO: Move to env
const ADMIN_PIN_HASH = 'gKq9V8Y5H4Z2X1C3:DpL7mN4kR6wQ8tY2bV5xZ9cS1fG3hJ7aE6nU0iO4pM8'; // Hash of 0327 - will be generated on first run

/**
 * Main handler for admin endpoints
 */
export async function onRequest(context) {
    const { request, env, params } = context;
    // params.path is an array like ['login'] or ['users'] or ['users', 'reset']
    const path = params.path ? params.path.join('/') : '';

    // Initialize admin if not exists
    await initializeAdmin(env);

    // Route to appropriate handler
    if (path === 'login' && request.method === 'POST') {
        return handleAdminLogin(request, env);
    }
    if (path === 'users' && request.method === 'GET') {
        return handleListUsers(request, env);
    }
    if (path === 'users' && request.method === 'POST') {
        return handleCreateUser(request, env);
    }
    if (path === 'users/reset' && request.method === 'POST') {
        return handleResetUser(request, env);
    }
    if (path === 'users/delete' && request.method === 'POST') {
        return handleDeleteUser(request, env);
    }

    return new Response('Not found', { status: 404 });
}

/**
 * Initialize admin account if it doesn't exist
 */
async function initializeAdmin(env) {
    const adminExists = await env.NAUTILUS_DATA.get('admin:master');
    if (!adminExists) {
        // Create admin with PIN 0327
        const pinHash = await createPinHash('0327');
        await env.NAUTILUS_DATA.put('admin:master', JSON.stringify({
            pinHash,
            createdAt: new Date().toISOString()
        }));
        console.log('Admin account initialized');
    }
}

/**
 * POST /api/admin/login
 * Admin login with master PIN
 */
async function handleAdminLogin(request, env) {
    try {
        const { pin } = await request.json();

        if (!pin) {
            return jsonResponse({ error: 'PIN required' }, 400);
        }

        if (!isValidPin(pin)) {
            return jsonResponse({ error: 'Invalid PIN format' }, 400);
        }

        // Get admin record
        const adminJson = await env.NAUTILUS_DATA.get('admin:master');
        if (!adminJson) {
            return jsonResponse({ error: 'Admin not configured' }, 500);
        }

        const admin = JSON.parse(adminJson);

        // Verify PIN
        const valid = await verifyPin(pin, admin.pinHash);
        if (!valid) {
            return jsonResponse({ error: 'Invalid PIN' }, 401);
        }

        // Generate admin JWT
        const token = await signJwt({
            role: 'admin',
            adminId: 'master'
        }, JWT_SECRET);

        return jsonResponse({ token, role: 'admin' });
    } catch (error) {
        console.error('Admin login error:', error);
        return jsonResponse({ error: 'Login failed' }, 500);
    }
}

/**
 * GET /api/admin/users
 * List all users
 */
async function handleListUsers(request, env) {
    try {
        // Verify admin token
        const payload = await verifyRequest(request, JWT_SECRET);
        if (!payload || payload.role !== 'admin') {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        // List all users (KV doesn't have list by prefix, so we maintain a user list)
        const userListJson = await env.NAUTILUS_DATA.get('admin:userlist');
        const userIds = userListJson ? JSON.parse(userListJson) : [];

        const users = [];
        for (const userId of userIds) {
            const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
            if (userJson) {
                const user = JSON.parse(userJson);
                users.push({
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    needsSetup: user.needsSetup || false,
                    createdAt: user.createdAt,
                    setupCompletedAt: user.setupCompletedAt || null
                });
            }
        }

        return jsonResponse({ users, total: users.length, max: 3 });
    } catch (error) {
        console.error('List users error:', error);
        return jsonResponse({ error: 'Failed to list users' }, 500);
    }
}

/**
 * POST /api/admin/users
 * Create new user
 */
async function handleCreateUser(request, env) {
    try {
        // Verify admin token
        const payload = await verifyRequest(request, JWT_SECRET);
        if (!payload || payload.role !== 'admin') {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const { username, name, tempPin } = await request.json();

        // Validate inputs
        if (!username || !name || !tempPin) {
            return jsonResponse({ error: 'Username, name, and temp PIN required' }, 400);
        }

        if (!isValidPin(tempPin)) {
            return jsonResponse({ error: 'Temp PIN must be 4 digits' }, 400);
        }

        const usernameLC = username.toLowerCase().trim();
        const nameStr = name.trim();

        // Validate username format (alphanumeric, 3-20 chars)
        if (!/^[a-z0-9]{3,20}$/.test(usernameLC)) {
            return jsonResponse({
                error: 'Username must be 3-20 characters, lowercase letters and numbers only'
            }, 400);
        }

        // Check user limit (max 3)
        const userListJson = await env.NAUTILUS_DATA.get('admin:userlist');
        const userIds = userListJson ? JSON.parse(userListJson) : [];

        if (userIds.length >= 3) {
            return jsonResponse({ error: 'Maximum 3 users allowed' }, 400);
        }

        // Check if username exists
        const existingUserId = await env.NAUTILUS_DATA.get(`user:username:${usernameLC}`);
        if (existingUserId) {
            return jsonResponse({ error: 'Username already exists' }, 409);
        }

        // Generate user ID
        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Hash temp PIN
        const pinHash = await createPinHash(tempPin);

        // Create user record
        const user = {
            id: userId,
            username: usernameLC,
            name: nameStr,
            email: null,
            pinHash,
            needsSetup: true,
            createdAt: new Date().toISOString()
        };

        // Save user
        await env.NAUTILUS_DATA.put(`user:${userId}`, JSON.stringify(user));

        // Create username lookup
        await env.NAUTILUS_DATA.put(`user:username:${usernameLC}`, userId);

        // Add to user list
        userIds.push(userId);
        await env.NAUTILUS_DATA.put('admin:userlist', JSON.stringify(userIds));

        return jsonResponse({
            success: true,
            user: {
                id: userId,
                username: usernameLC,
                name: nameStr,
                needsSetup: true,
                tempPin: tempPin // Return temp PIN to show admin (only time we return it)
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        return jsonResponse({ error: 'Failed to create user' }, 500);
    }
}

/**
 * POST /api/admin/users/reset
 * Reset user PIN (generates new temp PIN and marks needsSetup)
 */
async function handleResetUser(request, env) {
    try {
        // Verify admin token
        const payload = await verifyRequest(request, JWT_SECRET);
        if (!payload || payload.role !== 'admin') {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const { userId, newTempPin } = await request.json();

        if (!userId || !newTempPin) {
            return jsonResponse({ error: 'User ID and new temp PIN required' }, 400);
        }

        if (!isValidPin(newTempPin)) {
            return jsonResponse({ error: 'Temp PIN must be 4 digits' }, 400);
        }

        // Get user
        const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        const user = JSON.parse(userJson);

        // Hash new temp PIN
        const pinHash = await createPinHash(newTempPin);

        // Update user
        user.pinHash = pinHash;
        user.needsSetup = true;

        await env.NAUTILUS_DATA.put(`user:${userId}`, JSON.stringify(user));

        return jsonResponse({
            success: true,
            user: {
                id: userId,
                username: user.username,
                name: user.name,
                tempPin: newTempPin
            }
        });
    } catch (error) {
        console.error('Reset user error:', error);
        return jsonResponse({ error: 'Failed to reset user' }, 500);
    }
}

/**
 * POST /api/admin/users/delete
 * Delete user
 */
async function handleDeleteUser(request, env) {
    try {
        // Verify admin token
        const payload = await verifyRequest(request, JWT_SECRET);
        if (!payload || payload.role !== 'admin') {
            return jsonResponse({ error: 'Unauthorized' }, 401);
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
        await env.NAUTILUS_DATA.delete(`user:username:${user.username}`);
        if (user.email) {
            await env.NAUTILUS_DATA.delete(`user:email:${user.email}`);
        }

        // Delete user's tasks and projects
        await env.NAUTILUS_DATA.delete(`user:${userId}:tasks`);
        await env.NAUTILUS_DATA.delete(`user:${userId}:projects`);

        // Remove from user list
        const userListJson = await env.NAUTILUS_DATA.get('admin:userlist');
        const userIds = userListJson ? JSON.parse(userListJson) : [];
        const updatedUserIds = userIds.filter(id => id !== userId);
        await env.NAUTILUS_DATA.put('admin:userlist', JSON.stringify(updatedUserIds));

        return jsonResponse({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return jsonResponse({ error: 'Failed to delete user' }, 500);
    }
}

// Helper function

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
