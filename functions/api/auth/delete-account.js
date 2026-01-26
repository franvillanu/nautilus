// functions/api/auth/delete-account.js
import { verifyRequest } from '../../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // Verify user auth (not admin - users delete their own account)
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload || !payload.userId) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const userId = payload.userId;

        // Get user record to verify it exists
        const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
        if (!userJson) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        const user = JSON.parse(userJson);

        // Send confirmation email BEFORE deleting account (so we have the email address)
        if (user.email && user.email.trim() !== '') {
            try {
                await sendAccountDeletionEmail(env, {
                    to: user.email,
                    userName: user.name || user.username
                });
            } catch (emailError) {
                // Log email error but don't fail account deletion
                console.error('Failed to send account deletion email:', emailError);
                // Continue with account deletion even if email fails
            }
        }

        // Delete all user data
        await env.NAUTILUS_DATA.delete(`user:${userId}`);
        await env.NAUTILUS_DATA.delete(`user:${userId}:tasks`);
        await env.NAUTILUS_DATA.delete(`user:${userId}:projects`);
        await env.NAUTILUS_DATA.delete(`user:username:${user.username.toLowerCase()}`);
        if (user.email) {
            await env.NAUTILUS_DATA.delete(`user:email:${user.email.toLowerCase()}`);
        }

        // Remove from user list (if exists)
        const userListJson = await env.NAUTILUS_DATA.get('admin:userlist');
        if (userListJson) {
            const userList = JSON.parse(userListJson);
            const filtered = userList.filter(id => id !== userId);
            await env.NAUTILUS_DATA.put('admin:userlist', JSON.stringify(filtered));
        }

        return jsonResponse({ success: true });
    } catch (error) {
        console.error('Delete account error:', error);
        return jsonResponse({ error: 'Failed to delete account' }, 500);
    }
}

/**
 * Send account deletion confirmation email
 */
async function sendAccountDeletionEmail(env, { to, userName }) {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error("RESEND_API_KEY is not configured");
    }

    const from = env.RESEND_FROM || "Nautilus Notifications <notifications@nautilus.app>";

    const subject = "Your Nautilus account has been deleted";
    
    const html = buildAccountDeletionEmailHTML(userName);
    const text = buildAccountDeletionEmailText(userName);

    const payload = {
        from,
        to: to,
        subject,
        html,
        text
    };

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errorText}`);
    }

    return response.json();
}

/**
 * Build HTML email template for account deletion confirmation
 */
function buildAccountDeletionEmailHTML(userName) {
    const displayName = userName || 'User';
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deleted</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f9ff; line-height: 1.6;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; background-color: #f0f9ff; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background-color: #2b3d79; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Account Deleted</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #0f172a; font-size: 16px;">
                                Hello ${escapeHtml(displayName)},
                            </p>
                            
                            <p style="margin: 0 0 20px; color: #0f172a; font-size: 16px;">
                                This email confirms that your Nautilus account has been permanently deleted on ${currentDate}.
                            </p>
                            
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                                    ⚠️ All your data has been permanently removed:
                                </p>
                                <ul style="margin: 12px 0 0 20px; color: #991b1b; font-size: 14px; padding: 0;">
                                    <li>All tasks</li>
                                    <li>All projects</li>
                                    <li>All account settings and preferences</li>
                                </ul>
                            </div>
                            
                            <p style="margin: 24px 0 0; color: #64748b; font-size: 14px;">
                                This action cannot be undone. If you did not request this deletion, please contact support immediately.
                            </p>
                            
                            <p style="margin: 32px 0 0; color: #64748b; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
                                Thank you for using Nautilus.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                This is an automated message. Please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Build plain text email for account deletion confirmation
 */
function buildAccountDeletionEmailText(userName) {
    const displayName = userName || 'User';
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    return `
Account Deleted

Hello ${displayName},

This email confirms that your Nautilus account has been permanently deleted on ${currentDate}.

⚠️ All your data has been permanently removed:
- All tasks
- All projects
- All account settings and preferences

This action cannot be undone. If you did not request this deletion, please contact support immediately.

Thank you for using Nautilus.

---
This is an automated message. Please do not reply to this email.
    `.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
