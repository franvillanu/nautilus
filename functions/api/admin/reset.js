// functions/api/admin/reset.js
import { verifyRequest } from '../../../utils/jwt.js';
import { createPinHash, isValidPin } from '../../../utils/pin.js';

const JWT_SECRET = 'nautilus-secret-key-change-in-production';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // Verify admin auth
        const payload = await verifyRequest(request, JWT_SECRET);
        if (!payload || payload.role !== 'admin') {
            return jsonResponse({ error: 'Admin access required' }, 403);
        }

        const { userId, newPin } = await request.json();

        if (!userId || !newPin) {
            return jsonResponse({ error: 'User ID and new PIN required' }, 400);
        }

        if (!isValidPin(newPin)) {
            return jsonResponse({ error: 'PIN must be 4 digits' }, 400);
        }

        // Get user
        const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        const user = JSON.parse(userJson);

        // Reset PIN
        const pinHash = await createPinHash(newPin);
        user.pinHash = pinHash;
        user.needsSetup = true;

        await env.NAUTILUS_DATA.put(`user:${userId}`, JSON.stringify(user));

        return jsonResponse({ success: true });
    } catch (error) {
        console.error('Reset PIN error:', error);
        return jsonResponse({ error: 'Failed to reset PIN' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
