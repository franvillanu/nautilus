// functions/api/auth/auth-method.js
// Returns the user's authentication method (pin or password)
// No auth required - used pre-login to determine which UI to show

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const url = new URL(request.url);
        const identifier = url.searchParams.get('identifier');

        if (!identifier) {
            return jsonResponse({ authMethod: 'pin' });
        }

        const normalizedId = identifier.toLowerCase().trim();

        // Find user by username or email
        let userId;
        if (normalizedId.includes('@')) {
            userId = await env.NAUTILUS_DATA.get(`user:email:${normalizedId}`);
        } else {
            userId = await env.NAUTILUS_DATA.get(`user:username:${normalizedId}`);
        }

        if (!userId) {
            // Don't reveal whether user exists - return default
            return jsonResponse({ authMethod: 'pin' });
        }

        const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
        if (!userJson) {
            return jsonResponse({ authMethod: 'pin' });
        }

        const user = JSON.parse(userJson);
        return jsonResponse({ authMethod: user.authMethod || 'pin' });
    } catch (error) {
        console.error('Auth method lookup error:', error);
        return jsonResponse({ authMethod: 'pin' });
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
