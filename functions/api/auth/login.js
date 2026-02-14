// functions/api/auth/login.js
import { verifyPin, isValidPin } from '../../../utils/pin.js';
import { verifyPassword } from '../../../utils/password.js';
import { signJwt } from '../../../utils/jwt.js';

import { requireJwtSecret } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRET = requireJwtSecret(env);

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { identifier, pin, password } = await request.json();

        if (!identifier || (!pin && !password)) {
            return jsonResponse({ error: 'Credentials required' }, 400);
        }

        // Find user by username or email
        let userId;
        if (identifier.includes('@')) {
            userId = await env.NAUTILUS_DATA.get(`user:email:${identifier.toLowerCase()}`);
        } else {
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
        const userAuthMethod = user.authMethod || 'pin';

        // Verify credential based on user's auth method
        let valid = false;
        if (userAuthMethod === 'password' && password) {
            valid = await verifyPassword(password, user.passwordHash);
        } else if (userAuthMethod === 'pin' && pin) {
            if (!isValidPin(pin)) {
                return jsonResponse({ error: 'Invalid PIN format' }, 400);
            }
            valid = await verifyPin(pin, user.pinHash);
        } else {
            return jsonResponse({ error: 'Invalid credentials' }, 401);
        }

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
                avatarDataUrl: user.avatarDataUrl || null,
                needsSetup: user.needsSetup || false,
                authMethod: userAuthMethod
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return jsonResponse({ error: 'Login failed' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
