// functions/api/auth/reset-credential.js
// Consumes a reset token and sets a new PIN or password
// No auth required (token is self-authenticating)

import { verifyJwt } from '../../../utils/jwt.js';
import { createPinHash, isValidPin } from '../../../utils/pin.js';
import { createPasswordHash, isValidPassword } from '../../../utils/password.js';
import { getJwtSecretsForVerify } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { token, newPin, newPassword, authMethod } = await request.json();

        if (!token) {
            return jsonResponse({ error: 'Reset token required' }, 400);
        }

        // Verify reset token (try all secrets for rotation support)
        let payload = null;
        const secrets = Array.isArray(JWT_SECRETS_FOR_VERIFY) ? JWT_SECRETS_FOR_VERIFY : [JWT_SECRETS_FOR_VERIFY];
        for (const secret of secrets) {
            if (!secret) continue;
            payload = await verifyJwt(token, secret);
            if (payload) break;
        }

        if (!payload) {
            return jsonResponse({ error: 'Invalid or expired reset token' }, 401);
        }

        // Verify token type
        if (payload.type !== 'credential-reset') {
            return jsonResponse({ error: 'Invalid token type' }, 401);
        }

        // Check if token has already been used (replay prevention)
        if (payload.jti) {
            const usedKey = `reset-token-used:${payload.jti}`;
            const alreadyUsed = await env.NAUTILUS_DATA.get(usedKey);
            if (alreadyUsed) {
                return jsonResponse({ error: 'Reset token has already been used' }, 401);
            }
        }

        // Get user record
        const userJson = await env.NAUTILUS_DATA.get(`user:${payload.userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        const user = JSON.parse(userJson);

        // Determine target auth method
        const targetMethod = authMethod || 'password';

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
        } else if (targetMethod === 'pin') {
            if (!newPin) {
                return jsonResponse({ error: 'New PIN required' }, 400);
            }
            if (!isValidPin(newPin)) {
                return jsonResponse({ error: 'PIN must be 4 digits' }, 400);
            }
            user.pinHash = await createPinHash(newPin);
            user.authMethod = 'pin';
        } else {
            return jsonResponse({ error: 'Invalid auth method' }, 400);
        }

        // Save updated user
        await env.NAUTILUS_DATA.put(`user:${user.id}`, JSON.stringify(user));

        // Mark token as used (TTL = 1 hour to match token expiry)
        if (payload.jti) {
            await env.NAUTILUS_DATA.put(
                `reset-token-used:${payload.jti}`,
                'true',
                { expirationTtl: 3600 }
            );
        }

        return jsonResponse({ success: true, authMethod: user.authMethod });
    } catch (error) {
        console.error('Reset credential error:', error);
        return jsonResponse({ error: 'Failed to reset credential' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
