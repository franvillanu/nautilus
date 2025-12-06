// functions/api/auth.js - Authentication endpoints
import { verifyPin, createPinHash, isValidPin } from '../../utils/pin.js';
import { signJwt, verifyRequest } from '../../utils/jwt.js';

const JWT_SECRET = 'nautilus-secret-key-change-in-production'; // TODO: Move to env

/**
 * Main handler for auth endpoints
 */
export async function onRequest(context) {
    const { request, env, params } = context;
    // params.path is an array like ['login'] or ['verify']
    const path = params.path ? params.path.join('/') : '';

    // Route to appropriate handler
    if (path === 'login' && request.method === 'POST') {
        return handleLogin(request, env);
    }
    if (path === 'verify' && request.method === 'GET') {
        return handleVerify(request, env);
    }
    if (path === 'setup' && request.method === 'POST') {
        return handleSetup(request, env);
    }
    if (path === 'change-username' && request.method === 'POST') {
        return handleChangeUsername(request, env);
    }
    if (path === 'change-email' && request.method === 'POST') {
        return handleChangeEmail(request, env);
    }
    if (path === 'change-pin' && request.method === 'POST') {
        return handleChangePin(request, env);
    }
    if (path === 'change-name' && request.method === 'POST') {
        return handleChangeName(request, env);
    }

    return new Response('Not found', { status: 404 });
}

/**
 * POST /api/auth/login
 * Login with username/email + PIN
 */
async function handleLogin(request, env) {
    try {
        const { identifier, pin } = await request.json();

        if (!identifier || !pin) {
            return jsonResponse({ error: 'Username/email and PIN required' }, 400);
        }

        if (!isValidPin(pin)) {
            return jsonResponse({ error: 'Invalid PIN format' }, 400);
        }

        // Find user by username or email
        let userId;
        if (identifier.includes('@')) {
            // Email lookup
            userId = await env.NAUTILUS_DATA.get(`user:email:${identifier.toLowerCase()}`);
        } else {
            // Username lookup
            userId = await env.NAUTILUS_DATA.get(`user:username:${identifier.toLowerCase()}`);
        }

        if (!userId) {
            return jsonResponse({ error: 'Invalid credentials' }, 401);
        }

        // Get user record
        const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        const user = JSON.parse(userJson);

        // Verify PIN
        const valid = await verifyPin(pin, user.pinHash);
        if (!valid) {
            return jsonResponse({ error: 'Invalid credentials' }, 401);
        }

        // Generate JWT
        const token = await signJwt({
            userId: user.id,
            username: user.username,
            name: user.name
        }, JWT_SECRET);

        return jsonResponse({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                needsSetup: user.needsSetup || false
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return jsonResponse({ error: 'Login failed' }, 500);
    }
}

/**
 * GET /api/auth/verify
 * Verify JWT token is valid
 */
async function handleVerify(request, env) {
    const payload = await verifyRequest(request, JWT_SECRET);
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
            needsSetup: user.needsSetup || false
        }
    });
}

/**
 * POST /api/auth/setup
 * Complete first-time user setup (change username, name, email, PIN)
 */
async function handleSetup(request, env) {
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

/**
 * POST /api/auth/change-username
 * Change username
 */
async function handleChangeUsername(request, env) {
    try {
        const payload = await verifyRequest(request, JWT_SECRET);
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

/**
 * POST /api/auth/change-email
 * Change email
 */
async function handleChangeEmail(request, env) {
    try {
        const payload = await verifyRequest(request, JWT_SECRET);
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

/**
 * POST /api/auth/change-pin
 * Change PIN
 */
async function handleChangePin(request, env) {
    try {
        const payload = await verifyRequest(request, JWT_SECRET);
        if (!payload) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const { currentPin, newPin } = await request.json();

        if (!currentPin || !newPin) {
            return jsonResponse({ error: 'Current and new PIN required' }, 400);
        }

        if (!isValidPin(newPin)) {
            return jsonResponse({ error: 'New PIN must be 4 digits' }, 400);
        }

        // Get user record
        const userJson = await env.NAUTILUS_DATA.get(`user:${payload.userId}`);
        const user = JSON.parse(userJson);

        // Verify current PIN
        const valid = await verifyPin(currentPin, user.pinHash);
        if (!valid) {
            return jsonResponse({ error: 'Current PIN incorrect' }, 401);
        }

        // Hash new PIN
        const pinHash = await createPinHash(newPin);

        // Update user
        user.pinHash = pinHash;
        await env.NAUTILUS_DATA.put(`user:${user.id}`, JSON.stringify(user));

        return jsonResponse({ success: true });
    } catch (error) {
        console.error('Change PIN error:', error);
        return jsonResponse({ error: 'Failed to change PIN' }, 500);
    }
}

/**
 * POST /api/auth/change-name
 * Change display name
 */
async function handleChangeName(request, env) {
    try {
        const payload = await verifyRequest(request, JWT_SECRET);
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

// Helper functions

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
