import { buildDeadlineEmail, buildDeadlineText, EmailTemplateColors } from "../../src/services/email-template.js";
import { looksLikeDMY, looksLikeISO, toISOFromDMY, formatDatePretty } from "../../src/utils/date.js";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../src/config/constants.js";
import { USER_PROFILE } from "../../src/config/user.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const LOG_KEY = "notificationLog";
const PRIORITY_COLORS = {
    high: "#f97316",
    medium: "#0ea5e9",
    low: "#22c55e"
};
const REMINDER_WINDOWS = {
    today: { offset: 0, label: "Today", sectionTitle: "Starting Today" },
    week: { offset: 7, label: "In 7 days", sectionTitle: "One Week Away" },
    day: { offset: 1, label: "Tomorrow", sectionTitle: "Due Tomorrow" }
};
const DEFAULT_TIMEZONE = "Atlantic/Canary";

/**
 * Cloudflare Pages Function entry point
 */
export async function onRequest(context) {
    try {
        const { request, env } = context;
        enforceTokenIfNeeded(request, env);

        const url = new URL(request.url);
        const preview = url.searchParams.get("preview"); // "html" or "text"
        const forceSend = url.searchParams.get("force") === "1";
        const filterUsername = url.searchParams.get("username"); // Filter by specific username

        // Auto-detect base URL from request origin
        const requestOrigin = url.origin; // e.g., http://localhost:8787 or https://nautilus-dky.pages.dev

        let now = new Date();
        if (url.searchParams.has("now")) {
            const override = new Date(url.searchParams.get("now"));
            if (!Number.isNaN(override.getTime())) {
                now = override;
            }
        }

        // If preview is requested we always run in dryRun mode
        const isDryRun =
            !!preview ||
            request.method === "GET" ||
            url.searchParams.get("dryRun") === "1";

        const result = await runNotificationJob(env, {
            dryRun: isDryRun,
            now,
            force: forceSend,
            baseUrl: requestOrigin, // Pass the detected origin
            username: filterUsername // Pass username filter
        });

        // Special preview responses so you can see the email without sending it
        if (preview === "html") {
            const html = result.previewHtml || "<p>No HTML preview available.</p>";
            return new Response(html, {
                status: 200,
                headers: {
                    "Content-Type": "text/html; charset=utf-8"
                }
            });
        }
        if (preview === "text") {
            const text = result.previewText || "No text preview available.";
            return new Response(text, {
                status: 200,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        // Default JSON response
        return jsonResponse(result, 200);
    } catch (error) {
        console.error("[notifications] error", error);
        return jsonResponse(
            { error: error.message || "Unexpected error" },
            error.status || 500
        );
    }
}

/**
 * Process deadline notifications (main logic)
 * @param {Env} env
 * @param {{dryRun?: boolean, now?: Date, force?: boolean, baseUrl?: string, username?: string}} options
 */
async function processNotifications(env, { dryRun = false, now = new Date(), force = false, baseUrl = null, username = null } = {}) {
    // Fetch all users
    const userListJson = await env.NAUTILUS_DATA.get('admin:userlist');
    let userIds = userListJson ? JSON.parse(userListJson) : [];

    if (userIds.length === 0) {
        return {
            dryRun,
            sent: false,
            message: "No users found in the system."
        };
    }

    // Filter by username if provided
    if (username) {
        const filteredIds = [];
        for (const userId of userIds) {
            const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
            if (userJson) {
                const user = JSON.parse(userJson);
                if (user.username === username) {
                    filteredIds.push(userId);
                    break;
                }
            }
        }
        if (filteredIds.length === 0) {
            return {
                dryRun,
                sent: false,
                message: `No user found with username "${username}".`
            };
        }
        userIds = filteredIds;
    }

    const defaultTimeZone = env.NOTIFICATION_TIMEZONE || DEFAULT_TIMEZONE;
    const runTimeZone = coerceTimeZone(defaultTimeZone, DEFAULT_TIMEZONE);
    const referenceDate = getTimezoneISODate(now, runTimeZone);
    const finalBaseUrl = normalizeBaseUrl(
        baseUrl || env.APP_BASE_URL || env.PUBLIC_BASE_URL || "https://nautilus.app"
    );

    // Process notifications for each user
    const results = [];

    for (const userId of userIds) {
        if (!userId) continue;

        const userResult = await processUserNotifications(env, userId, {
            dryRun,
            now,
            force,
            defaultTimeZone,
            baseUrl: finalBaseUrl
        });

        if (userResult) {
            results.push(userResult);
        }
    }

    // Aggregate results
    const totalSent = results.filter(r => r.sent).length;
    const totalUsers = results.length;
    const totalTasks = results.reduce((sum, r) => sum + (r.totals?.today || 0) + (r.totals?.week || 0) + (r.totals?.day || 0), 0);

    // For preview mode, use the first user who actually has tasks
    const firstUserWithTasks = results.find(r =>
        (r.totals?.today || 0) + (r.totals?.week || 0) + (r.totals?.day || 0) > 0
    );
    const previewHtml = firstUserWithTasks?.previewHtml || results[0]?.previewHtml;
    const previewText = firstUserWithTasks?.previewText || results[0]?.previewText;

    return {
        dryRun,
        sent: totalSent > 0,
        referenceDate,
        timeZone: runTimeZone,
        defaultTimeZone,
        usersProcessed: totalUsers,
        emailsSent: totalSent,
        totalTasks,
        userResults: results,
        previewHtml,
        previewText,
        message: dryRun
            ? `Dry run: Would send ${totalSent} emails to ${totalUsers} users about ${totalTasks} tasks`
            : `Sent ${totalSent} emails to ${totalUsers} users about ${totalTasks} tasks`
    };
}

/**
 * Process notifications for a single user
 * @param {Env} env
 * @param {string} userId
 * @param {{dryRun: boolean, now: Date, force: boolean, defaultTimeZone: string, baseUrl: string}} options
 */
async function processUserNotifications(env, userId, { dryRun, now, force, defaultTimeZone, baseUrl }) {
    // Fetch user profile
    const userJson = await env.NAUTILUS_DATA.get(`user:${userId}`);
    if (!userJson) return null;

    const user = JSON.parse(userJson);

    // Skip users without email configured
    if (!user.email || user.email.trim() === '') {
        return {
            userId,
            username: user.username,
            sent: false,
            message: "No email configured for user"
        };
    }

    // Check per-user notification settings (stored by the app under user:<id>:settings)
    const settingsRaw = await env.NAUTILUS_DATA.get(`user:${userId}:settings`);
    const settings = safeJsonParse(settingsRaw, {});

    const emailNotificationsEnabled = settings.emailNotificationsEnabled !== false;
    if (!emailNotificationsEnabled) {
        return {
            userId,
            username: user.username,
            email: user.email,
            sent: false,
            message: "Email notifications disabled by user settings"
        };
    }

    const weekdaysOnly = !!settings.emailNotificationsWeekdaysOnly;
    const includeStartDates = !!settings.emailNotificationsIncludeStartDates;
    const includeBacklog = !!settings.emailNotificationsIncludeBacklog;

    const requestedTimeZone = String(settings.emailNotificationTimeZone || defaultTimeZone || DEFAULT_TIMEZONE);
    const timeZone = coerceTimeZone(requestedTimeZone, defaultTimeZone || DEFAULT_TIMEZONE);
    const scheduledTime = normalizeHHMM(settings.emailNotificationTime) || "09:00";

    // Get current time in user's timezone and round to nearest cron slot (handles jitter)
    // Cron runs */30 (every 30 min), but may execute at 14:01 instead of 14:00
    const actualTimeHHMM = getTimezoneHHMM(now, timeZone);
    const runTimeHHMM = roundToNearestCronSlot(actualTimeHHMM, 30);

    const ignoreSchedule = dryRun || force;
    if (!ignoreSchedule && weekdaysOnly && isWeekend(now, timeZone)) {
        return {
            userId,
            username: user.username,
            email: user.email,
            sent: false,
            message: `Weekdays-only enabled; skipping weekend (${timeZone})`
        };
    }
    if (!ignoreSchedule && runTimeHHMM !== scheduledTime) {
        return {
            userId,
            username: user.username,
            email: user.email,
            sent: false,
            message: `Not scheduled time (actual: ${actualTimeHHMM} → rounded: ${runTimeHHMM} ${timeZone}; scheduled: ${scheduledTime})`
        };
    }

    const referenceDate = getTimezoneISODate(now, timeZone);

    // Fetch user's tasks, projects, and notification log
    const [tasksRaw, projectsRaw, logRaw] = await Promise.all([
        env.NAUTILUS_DATA.get(`user:${userId}:tasks`),
        env.NAUTILUS_DATA.get(`user:${userId}:projects`),
        env.NAUTILUS_DATA.get(`user:${userId}:${LOG_KEY}`)
    ]);

    const tasks = safeJsonParse(tasksRaw, []);
    const projects = safeJsonParse(projectsRaw, []);
    const log = ensureLogStructure(safeJsonParse(logRaw, { tasks: {} }));

    const projectMap = buildProjectMap(projects);

    const grouped = {
        today: [],
        week: [],
        day: []
    };
    const nextLog = cloneLog(log);

    tasks.forEach(task => {
        if (!task) return;
        if (String(task.status || "").toLowerCase() === "done") return;

        // Skip backlog tasks unless user has enabled them in settings
        if (String(task.status || "").toLowerCase() === "backlog" && !includeBacklog) return;

        // Check end date (due date) - existing logic
        if (task.endDate) {
            const isoDate = normalizeDate(task.endDate);
            if (isoDate) {
                const diff = daysUntil(referenceDate, isoDate);
                const windowKey =
                    diff === REMINDER_WINDOWS.week.offset
                        ? "week"
                        : diff === REMINDER_WINDOWS.day.offset
                            ? "day"
                            : null;

                if (windowKey && (force || shouldNotify(log, task.id, windowKey, referenceDate))) {
                    const formattedTask = formatTaskForEmail(task, {
                        isoDate,
                        projectMap,
                        windowKey,
                        baseUrl
                    });
                    grouped[windowKey].push(formattedTask);
                    markLogged(nextLog, task.id, windowKey, referenceDate);
                }
            }
        }

        // Check start date (if setting is enabled) - new logic
        if (includeStartDates && task.startDate) {
            const isoDate = normalizeDate(task.startDate);
            if (isoDate) {
                const diff = daysUntil(referenceDate, isoDate);

                // Only notify for tasks starting today (diff = 0)
                if (diff === REMINDER_WINDOWS.today.offset) {
                    const windowKey = "today";

                    // Use a different log key for start dates to avoid conflicts with end dates
                    const startLogKey = `start_${windowKey}`;

                    if (force || shouldNotify(log, task.id, startLogKey, referenceDate)) {
                        const formattedTask = formatTaskForEmail(task, {
                            isoDate,
                            projectMap,
                            windowKey,
                            baseUrl
                        });
                        grouped[windowKey].push(formattedTask);
                        markLogged(nextLog, task.id, startLogKey, referenceDate);
                    }
                }
            }
        }
    });

    // Sort tasks for nicer presentation (due date then priority)
    Object.values(grouped).forEach(list => {
        list.sort((a, b) => {
            if (a.dueISO === b.dueISO) {
                return priorityRank(b.priority) - priorityRank(a.priority);
            }
            return a.dueISO.localeCompare(b.dueISO);
        });
    });

    const totals = {
        today: grouped.today.length,
        week: grouped.week.length,
        day: grouped.day.length
    };
    const totalCount = totals.today + totals.week + totals.day;

    // Always generate HTML/text for preview, even if no tasks
    const html = buildDeadlineEmail({
        weekAheadTasks: grouped.week,
        dayAheadTasks: grouped.day,
        startingTodayTasks: grouped.today,
        referenceDate,
        baseUrl,
        timeZoneLabel: timeZone
    });
    const text = buildDeadlineText({
        weekAheadTasks: grouped.week,
        dayAheadTasks: grouped.day,
        startingTodayTasks: grouped.today,
        referenceDate,
        baseUrl,
        timeZoneLabel: timeZone
    });

    if (totalCount === 0) {
        return {
            userId,
            username: user.username,
            email: user.email,
            sent: false,
            totals,
            previewHtml: html,
            previewText: text,
            message: "No tasks matched the notification windows."
        };
    }

    if (dryRun) {
        return {
            userId,
            username: user.username,
            email: user.email,
            sent: false,
            totals,
            previewHtml: html,
            previewText: text,
            message: `Would send email about ${totalCount} task${totalCount === 1 ? "" : "s"}`
        };
    }

    // Send email to this specific user
    await sendEmail(env, {
        to: user.email,
        subject: `Nautilus · ${totalCount} upcoming task${totalCount === 1 ? "" : "s"}`,
        html,
        text
    });

    // Save notification log for this user
    await env.NAUTILUS_DATA.put(`user:${userId}:${LOG_KEY}`, JSON.stringify(nextLog));

    return {
        userId,
        username: user.username,
        email: user.email,
        sent: true,
        totals,
        message: `Notification sent about ${totalCount} task${totalCount === 1 ? "" : "s"}`
    };
}

/**
 * Reusable entry point (useful for tests or scheduled triggers)
 * @param {Env} env
 * @param {{dryRun?: boolean, now?: Date, force?: boolean}} options
 */
export async function runNotificationJob(env, options) {
    return processNotifications(env, options);
}

async function sendEmail(env, { to, subject, html, text }) {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error("RESEND_API_KEY is not configured");
    }

    const from =
        env.RESEND_FROM || "Nautilus Notifications <notifications@nautilus.app>";

    if (!to || to.trim() === '') {
        throw new Error("No email recipient provided");
    }

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

function enforceTokenIfNeeded(request, env) {
    const requiredToken = env.NOTIFICATION_TOKEN;
    if (!requiredToken) return;

    const url = new URL(request.url);
    const provided =
        request.headers.get("x-notification-token") ||
        url.searchParams.get("token");
    if (provided !== requiredToken) {
        const err = new Error("Unauthorized");
        err.status = 401;
        throw err;
    }
}

function formatTaskForEmail(task, { isoDate, projectMap, windowKey, baseUrl }) {
    const priority = String(task.priority || "medium").toLowerCase();
    const status = String(task.status || "todo").toLowerCase();
    const project = task.projectId ? projectMap.get(task.projectId) : null;
    const tags = Array.isArray(task.tags) ? task.tags.slice(0, 6) : [];
    const attachmentsCount = Array.isArray(task.attachments)
        ? task.attachments.length
        : 0;

    return {
        id: task.id,
        title: task.title || "Untitled task",
        projectName: project ? project.name : "General Task",
        priority,
        priorityLabel: PRIORITY_LABELS[priority] || "Medium",
        priorityColor: PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium,
        status,
        statusLabel: STATUS_LABELS[status] || "To Do",
        statusColor:
            EmailTemplateColors.STATUS_COLORS[status] ||
            EmailTemplateColors.STATUS_COLORS.todo,
        dueISO: isoDate,
        duePretty: formatDatePretty(isoDate),
        dueRelativeLabel: REMINDER_WINDOWS[windowKey].label,
        descriptionSnippet: extractSnippet(task.description),
        tags,
        link: buildTaskLink(baseUrl, task.id),
        attachmentsCount
    };
}

function extractSnippet(html = "", limit = 180) {
    if (!html) return "";
    const stripped = html
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!stripped) return "";
    return stripped.length > limit
        ? `${stripped.slice(0, limit - 3)}...`
        : stripped;
}

function buildProjectMap(projects) {
    const map = new Map();
    (projects || []).forEach(project => {
        if (!project || project.id == null) return;
        map.set(project.id, project);
    });
    return map;
}

function shouldNotify(log, taskId, windowKey, runDate) {
    const id = String(taskId);
    if (!log.tasks[id]) return true;
    return log.tasks[id][windowKey] !== runDate;
}

function markLogged(log, taskId, windowKey, runDate) {
    const id = String(taskId);
    if (!log.tasks[id]) {
        log.tasks[id] = {};
    }
    log.tasks[id][windowKey] = runDate;
}

function normalizeDate(value) {
    if (!value || typeof value !== "string") return "";
    if (looksLikeISO(value)) return value;
    if (looksLikeDMY(value)) return toISOFromDMY(value);
    return "";
}

function daysUntil(referenceISO, isoDate) {
    const reference = new Date(`${referenceISO}T00:00:00Z`);
    const target = new Date(`${isoDate}T00:00:00Z`);
    const diff = target.getTime() - reference.getTime();
    return Math.round(diff / DAY_IN_MS);
}

function getTimezoneISODate(date, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    const parts = formatter.formatToParts(date);
    const year =
        parts.find(p => p.type === "year")?.value ||
        String(date.getUTCFullYear());
    const month =
        parts.find(p => p.type === "month")?.value ||
        String(date.getUTCMonth() + 1).padStart(2, "0");
    const day =
        parts.find(p => p.type === "day")?.value ||
        String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function coerceTimeZone(timeZone, fallback) {
    const candidate = String(timeZone || "").trim();
    if (!candidate) return fallback;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date(0));
        return candidate;
    } catch (error) {
        console.warn("[notifications] invalid timezone", { timeZone: candidate, fallback, error });
        return fallback;
    }
}

function getTimezoneHHMM(date, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const hour = parts.find(p => p.type === "hour")?.value;
    const minute = parts.find(p => p.type === "minute")?.value;
    if (!hour || !minute) return "";
    return `${hour}:${minute}`;
}

/**
 * Rounds HH:MM to nearest cron slot to handle cron jitter
 * For cron every 30 min (runs at :00 and :30):
 *   14:01 → 14:00
 *   14:15 → 14:00
 *   14:31 → 14:30
 *   14:59 → 14:30
 *
 * @param {string} hhmmString - Time in HH:MM format
 * @param {number} slotMinutes - Cron interval (30 for every 30min, 15 for every 15min)
 * @returns {string} Rounded time in HH:MM format
 */
function roundToNearestCronSlot(hhmmString, slotMinutes = 30) {
    const match = hhmmString.match(/^(\d{2}):(\d{2})$/);
    if (!match) return hhmmString;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    // Round down to nearest slot
    const roundedMinutes = Math.floor(minutes / slotMinutes) * slotMinutes;

    const hh = String(hours).padStart(2, '0');
    const mm = String(roundedMinutes).padStart(2, '0');

    return `${hh}:${mm}`;
}

function normalizeHHMM(value) {
    if (!value || typeof value !== "string") return "";
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return "";
    if (hours < 0 || hours > 23) return "";
    if (minutes < 0 || minutes > 59) return "";
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function isWeekend(date, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "short"
    });
    const weekday = formatter.format(date);
    return weekday === "Sat" || weekday === "Sun";
}

function ensureLogStructure(log) {
    if (!log || typeof log !== "object") {
        return { tasks: {} };
    }
    if (!log.tasks || typeof log.tasks !== "object") {
        log.tasks = {};
    }
    return log;
}

function safeJsonParse(raw, fallback) {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn("[notifications] Failed to parse JSON", error);
        return fallback;
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            "Content-Type": "application/json"
        }
    });
}

function parseRecipients(value) {
    if (!value) return [];
    return value
        .split(",")
        .map(email => email.trim())
        .filter(Boolean);
}

function buildTaskLink(baseUrl, taskId) {
    if (!taskId) return `${baseUrl}#tasks`;
    return `${baseUrl}#tasks?highlight=${encodeURIComponent(taskId)}`;
}

function normalizeBaseUrl(url) {
    if (!url) return "https://nautilus.app/";
    return url.endsWith("/") ? url : `${url}/`;
}

function cloneLog(value) {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

function priorityRank(priority) {
    switch (priority) {
        case "high":
            return 3;
        case "medium":
            return 2;
        case "low":
        default:
            return 1;
    }
}
