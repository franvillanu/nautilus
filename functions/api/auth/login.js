// functions/api/auth/login.js
import { verifyPin, isValidPin } from '../../../utils/pin.js';
import { signJwt } from '../../../utils/jwt.js';

const JWT_SECRET = 'nautilus-secret-key-change-in-production';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

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

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
