import { verifyRequest } from '../../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../../utils/secrets.js';

const ALLOWED_KEYS = new Set([
  'tasks',
  'projects',
  'feedbackItems',
  'projectColors',
  'sortMode',
  'manualTaskOrder',
  'settings',
  'history',
]);

function toKeyList(rawKeys) {
  if (!rawKeys) return [];
  return String(rawKeys)
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .filter((k) => ALLOWED_KEYS.has(k));
}

function scopeKey(userId, key) {
  return key === 'feedbackItems' ? 'global:feedbackItems' : `user:${userId}:${key}`;
}

function safeJsonParse(text) {
  if (!text || text === 'null') return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

    // Verify authentication
    const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
    if (!payload || !payload.userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const keys = toKeyList(url.searchParams.get('keys'));
    if (keys.length === 0) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = payload.userId;
    const pairs = await Promise.all(
      keys.map(async (key) => {
        const scopedKey = scopeKey(userId, key);
        const stored = await env.NAUTILUS_DATA.get(scopedKey);
        return [key, safeJsonParse(stored)];
      })
    );

    return new Response(JSON.stringify(Object.fromEntries(pairs)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response('Error: ' + (err.message || err.toString()), { status: 500 });
  }
}
