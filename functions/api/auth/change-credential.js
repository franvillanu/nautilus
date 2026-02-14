// functions/api/auth/change-credential.js
// Change PIN/password or switch authentication method
// Requires JWT auth

import { verifyRequest } from '../../../utils/jwt.js';
import { verifyPin, createPinHash, isValidPin } from '../../../utils/pin.js';
import { verifyPassword, createPasswordHash, isValidPassword } from '../../../utils/password.js';
import { getJwtSecretsForVerify } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const { currentPin, currentPassword, newPin, newPassword, newAuthMethod } = await request.json();

        // Get user record
        const userJson = await env.NAUTILUS_DATA.get(`user:${payload.userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        const user = JSON.parse(userJson);
        const currentMethod = user.authMethod || 'pin';

        // Verify current credential
        let currentValid = false;
        if (currentMethod === 'password') {
            if (!currentPassword) {
                return jsonResponse({ error: 'Current password required' }, 400);
            }
            currentValid = await verifyPassword(currentPassword, user.passwordHash);
        } else {
            if (!currentPin) {
                return jsonResponse({ error: 'Current PIN required' }, 400);
            }
            currentValid = await verifyPin(currentPin, user.pinHash);
        }

        if (!currentValid) {
            return jsonResponse({ error: 'Current credential incorrect' }, 401);
        }

        // Determine target method
        const targetMethod = newAuthMethod || currentMethod;

        // Validate and hash new credential
        if (targetMethod === 'password') {
            if (!newPassword) {
                return jsonResponse({ error: 'New password required' }, 400);
            }
            if (!isValidPassword(newPassword)) {
                return jsonResponse({ error: 'Password must be at least 8 characters with uppercase, lowercase, and digit' }, 400);
            }
            user.passwordHash = await createPasswordHash(newPassword);
            user.authMethod = 'password';
        } else {
            if (!newPin) {
                return jsonResponse({ error: 'New PIN required' }, 400);
            }
            if (!isValidPin(newPin)) {
                return jsonResponse({ error: 'PIN must be 4 digits' }, 400);
            }
            user.pinHash = await createPinHash(newPin);
            user.authMethod = 'pin';
        }

        await env.NAUTILUS_DATA.put(`user:${user.id}`, JSON.stringify(user));

        return jsonResponse({ success: true, authMethod: user.authMethod });
    } catch (error) {
        console.error('Change credential error:', error);
        return jsonResponse({ error: 'Failed to change credential' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
