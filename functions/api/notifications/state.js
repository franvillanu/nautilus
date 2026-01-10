import { verifyRequest } from '../../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../../utils/secrets.js';
import { looksLikeDMY, looksLikeISO, toISOFromDMY } from '../../../src/utils/date.js';

const DEFAULT_TIMEZONE = 'Atlantic/Canary';
const WINDOW_DAYS = 7;

function safeJsonParse(text, fallback) {
    if (!text || text === 'null') return fallback;
    try {
        return JSON.parse(text);
    } catch (e) {
        return fallback;
    }
}

function coerceTimeZone(candidate, fallback) {
    if (!candidate) return fallback;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
        return candidate;
    } catch (error) {
        return fallback;
    }
}

function getISODateInTimeZone(date, timeZone) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

function normalizeISODate(dateStr) {
    if (!dateStr) return '';
    const raw = String(dateStr).trim();
    if (looksLikeISO(raw)) return raw;
    if (looksLikeDMY(raw)) return toISOFromDMY(raw);
    return '';
}

function buildNotificationList(tasks, settings, timeZone) {
    const includeStartDates = settings.emailNotificationsIncludeStartDates !== false;
    const includeBacklog = !!settings.emailNotificationsIncludeBacklog;
    const today = new Date();

    const dateWindow = new Set();
    for (let i = 0; i <= WINDOW_DAYS; i += 1) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        dateWindow.add(getISODateInTimeZone(date, timeZone));
    }

    const notifications = [];
    for (const task of tasks) {
        if (!task || !task.id) continue;
        if (task.status === 'done') continue;
        if (task.status === 'backlog' && !includeBacklog) continue;

        const startISO = normalizeISODate(task.startDate || '');
        const dueISO = normalizeISODate(task.endDate || '');

        if (includeStartDates && startISO && dateWindow.has(startISO)) {
            notifications.push({
                id: `task_starting:${task.id}:${startISO}`,
                type: 'task_starting',
                taskId: task.id,
                date: startISO
            });
        }

        if (dueISO && dateWindow.has(dueISO)) {
            notifications.push({
                id: `task_due:${task.id}:${dueISO}`,
                type: 'task_due',
                taskId: task.id,
                date: dueISO
            });
        }
    }

    const grouped = new Map();
    notifications.forEach((notif) => {
        if (!grouped.has(notif.date)) {
            grouped.set(notif.date, []);
        }
        grouped.get(notif.date).push(notif);
    });

    return Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function countUnread(taskNotificationsByDate, lastSeenDateISO) {
    let count = 0;
    for (const [date, notifs] of taskNotificationsByDate) {
        if (!lastSeenDateISO || date > lastSeenDateISO) {
            count += notifs.length;
        }
    }
    return count;
}

export async function onRequest(context) {
    const { request, env } = context;
    try {
        const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload || !payload.userId) {
            return new Response('Unauthorized', { status: 401 });
        }

        const userId = payload.userId;
        const lastSeenKey = `user:${userId}:notifications:lastSeen`;
        const clearedKey = `user:${userId}:notifications:clearedAt`;

        if (request.method === 'POST') {
            let body = {};
            try {
                body = await request.json();
            } catch (e) {
                body = {};
            }
            const seenAt = body.seenAt || new Date().toISOString();
            await env.NAUTILUS_DATA.put(lastSeenKey, seenAt);
            if (body.clearAll) {
                await env.NAUTILUS_DATA.put(clearedKey, seenAt);
            }
            return new Response(JSON.stringify({ lastSeen: seenAt, unreadCount: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405 });
        }

        const [tasksRaw, settingsRaw, lastSeenRaw, clearedRaw] = await Promise.all([
            env.NAUTILUS_DATA.get(`user:${userId}:tasks`),
            env.NAUTILUS_DATA.get(`user:${userId}:settings`),
            env.NAUTILUS_DATA.get(lastSeenKey),
            env.NAUTILUS_DATA.get(clearedKey)
        ]);

        const tasks = safeJsonParse(tasksRaw, []);
        const settings = safeJsonParse(settingsRaw, {});
        const fallbackTimeZone = env.NOTIFICATION_TIMEZONE || DEFAULT_TIMEZONE;
        const timeZone = coerceTimeZone(settings.emailNotificationTimeZone || fallbackTimeZone, fallbackTimeZone);

        let taskNotificationsByDate = buildNotificationList(tasks, settings, timeZone);
        if (clearedRaw) {
            const clearedDateISO = getISODateInTimeZone(new Date(clearedRaw), timeZone);
            taskNotificationsByDate = taskNotificationsByDate.filter(([date]) => date > clearedDateISO);
        }
        const lastSeenDateISO = lastSeenRaw ? getISODateInTimeZone(new Date(lastSeenRaw), timeZone) : null;
        const unreadCount = countUnread(taskNotificationsByDate, lastSeenDateISO);

        return new Response(JSON.stringify({
            taskNotificationsByDate,
            unreadCount,
            lastSeen: lastSeenRaw || null,
            timeZone,
            generatedAt: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
