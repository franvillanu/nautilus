// functions/api/auth/request-reset.js
// Sends a credential reset email with a time-limited token
// No auth required

import { signJwt } from '../../../utils/jwt.js';
import { requireJwtSecret } from '../../../utils/secrets.js';
import { buildPasswordResetEmail, buildPasswordResetText } from '../../../src/services/email-template.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRET = requireJwtSecret(env);

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { email } = await request.json();

        if (!email || !isValidEmail(email)) {
            // Generic success to prevent enumeration
            return jsonResponse({ success: true, message: 'Reset link sent.' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Look up user by email
        const userId = await env.NAUTILUS_DATA.get(`user:email:${normalizedEmail}`);

        if (!userId) {
            // Don't reveal whether user exists
            return jsonResponse({ success: true, message: 'Reset link sent.' });
        }

        const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
        if (!userJson) {
            return jsonResponse({ success: true, message: 'Reset link sent.' });
        }

        const user = JSON.parse(userJson);

        // Generate a unique token ID for replay prevention
        const jti = crypto.randomUUID();

        // Generate reset token (1 hour expiry)
        const resetToken = await signJwt({
            userId: user.id,
            email: normalizedEmail,
            type: 'credential-reset',
            jti
        }, JWT_SECRET, 3600); // 1 hour

        // Build reset URL
        const origin = new URL(request.url).origin;
        const resetUrl = `${origin}/#reset?token=${encodeURIComponent(resetToken)}`;

        // Detect language from user's stored settings, fallback to Accept-Language header
        const settingsRaw = await env.NAUTILUS_DATA.get(`user:${userId}:settings`);
        const userSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
        let lang = userSettings.language || '';
        if (!['en', 'es'].includes(lang)) {
            const acceptLang = request.headers.get('Accept-Language') || '';
            lang = acceptLang.toLowerCase().startsWith('es') ? 'es' : 'en';
        }

        // Build email content
        const userName = user.name || user.username;
        const html = buildPasswordResetEmail({ resetUrl, userName, lang });
        const text = buildPasswordResetText({ resetUrl, userName, lang });

        // Send email via Resend
        const subjects = { en: 'Reset Your Nautilus Credential', es: 'Restablece tu credencial de Nautilus' };
        await sendEmail(env, {
            to: normalizedEmail,
            subject: subjects[lang] || subjects.en,
            html,
            text
        });

        return jsonResponse({ success: true, message: 'Reset link sent.' });
    } catch (error) {
        console.error('Request reset error:', error);
        // Still return success to prevent enumeration via timing
        return jsonResponse({ success: true, message: 'Reset link sent.' });
    }
}

async function sendEmail(env, { to, subject, html, text }) {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('RESEND_API_KEY is not configured');
    }

    const from = env.RESEND_FROM || 'Nautilus <notifications@nautilus.app>';

    if (!to || to.trim() === '') {
        throw new Error('No email recipient provided');
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to, subject, html, text })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errorText}`);
    }

    return response.json();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
