// functions/api/auth/change-pin.js
import { verifyRequest } from '../../../utils/jwt.js';
import { verifyPin, createPinHash, isValidPin } from '../../../utils/pin.js';

const JWT_SECRET = 'nautilus-secret-key-change-in-production';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

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

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
