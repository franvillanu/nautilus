// functions/api/admin/login.js
import { verifyPin } from '../../../utils/pin.js';
import { signJwt } from '../../../utils/jwt.js';
import { createPinHash } from '../../../utils/pin.js';
import { requireAdminPin, requireJwtSecret } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const JWT_SECRET = requireJwtSecret(env);
        const ADMIN_PIN = requireAdminPin(env);

        // Initialize admin if doesn't exist
        await initializeAdmin(env, ADMIN_PIN);

        const { pin } = await request.json();

        if (!pin) {
            return jsonResponse({ error: 'PIN required' }, 400);
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
            userId: 'admin'
        }, JWT_SECRET);

        return jsonResponse({ token });
    } catch (error) {
        console.error('Admin login error:', error);
        return jsonResponse({ error: 'Login failed' }, 500);
    }
}

async function initializeAdmin(env, adminPin) {
    // Always update admin PIN to match the code constant
    // This ensures PIN changes take effect immediately
    const pinHash = await createPinHash(adminPin);

    const adminExists = await env.NAUTILUS_DATA.get('admin:master');
    const admin = adminExists ? JSON.parse(adminExists) : {};

    await env.NAUTILUS_DATA.put('admin:master', JSON.stringify({
        pinHash,
        createdAt: admin.createdAt || new Date().toISOString()
    }));
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
