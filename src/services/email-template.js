/**
 * Deadline notification email templates
 * Minimalistic, clean design with excellent readability
 * Mobile-responsive table layout
 */

const LAYOUT = {
    background: "#f0f9ff",
    container: "#ffffff",
    hero: "#2b3d79",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    textTertiary: "#94a3b8",
    textLight: "#ffffff",
    divider: "#e5e7eb",
    cardBg: "#f8fafc",
    cardBorder: "#e5e7eb",
    accent: "#2b3d79",
    accentLight: "#cffafe"
};

// used by notifications.js for statusColor
const STATUS_COLORS = {
    todo: "#94a3b8",
    progress: "#a855f7",
    review: "#f97316",
    done: "#16a34a"
};

/**
 * Minimalistic badge styles with subtle colors
 */
const PRIORITY_BADGE_STYLES = {
    high: {
        bg: "#fef2f2",
        text: "#dc2626",
        border: "#fecaca"
    },
    medium: {
        bg: "#fefce8",
        text: "#ca8a04",
        border: "#fef08a"
    },
    low: {
        bg: "#f0fdf4",
        text: "#16a34a",
        border: "#bbf7d0"
    }
};

/**
 * Clean status badge styles
 */
const STATUS_BADGE_STYLES = {
    todo: {
        bg: "#f8fafc",
        text: "#475569",
        border: "#e2e8f0"
    },
    progress: {
        bg: "#eff6ff",
        text: "#2563eb",
        border: "#dbeafe"
    },
    review: {
        bg: "#fef3c7",
        text: "#d97706",
        border: "#fde68a"
    },
    done: {
        bg: "#f0fdf4",
        text: "#16a34a",
        border: "#bbf7d0"
    }
};

const SECTION_THEME = {
    today: {
        title: "Starting Today",
        bg: "#f0fdf4",
        border: "#22c55e",
        text: "#166534"
    },
    day: {
        title: "Due Tomorrow",
        bg: "#fffbeb",
        border: "#fbbf24",
        text: "#92400e"
    },
    week: {
        title: "One Week Away",
        bg: "#eff6ff",
        border: "#60a5fa",
        text: "#1e40af"
    }
};

export function buildDeadlineEmail({
    weekAheadTasks = [],
    dayAheadTasks = [],
    startingTodayTasks = [],
    referenceDate,
    baseUrl,              // still used in the text version
    timeZoneLabel = "UTC"
}) {
    const total = weekAheadTasks.length + dayAheadTasks.length + startingTodayTasks.length;
    const dueTomorrow = dayAheadTasks.length;
    const dueWeek = weekAheadTasks.length;
    const startingToday = startingTodayTasks.length;
    const dateLabel = formatDate(referenceDate);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no" />
  <title>Nautilus Deadline Digest</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
    .hero-title {font-size: 28px !important;}
  </style>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background: ${LAYOUT.background};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      padding: 40px 16px;
      background: ${LAYOUT.background};
    }
    .container {
      max-width: 680px;
      width: 100%;
      margin: 0 auto;
      border-radius: 12px;
      overflow: hidden;
      background: ${LAYOUT.container};
      border: 1px solid ${LAYOUT.divider};
    }
    .hero {
      padding: 48px 40px;
      background: ${LAYOUT.hero};
      color: ${LAYOUT.textLight};
    }
    .hero-pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 16px;
      background: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.9);
    }
    .hero-title {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }
    .hero-sub {
      margin: 12px 0 0;
      font-size: 14px;
      color: rgba(255,255,255,0.7);
      font-weight: 400;
    }
    .hero-cta {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 24px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.15);
      color: ${LAYOUT.textLight} !important;
      font-weight: 500;
      font-size: 14px;
      text-decoration: none !important;
      border: 1px solid rgba(255, 255, 255, 0.25);
      transition: all 0.2s;
    }
    .hero-cta:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.4);
    }
    .body {
      padding: 32px 40px 40px;
      background: ${LAYOUT.container};
    }
    .summary {
      margin: 0 0 24px 0;
      color: ${LAYOUT.textSecondary};
      font-size: 15px;
      line-height: 1.6;
      font-weight: 400;
    }
    .summary strong {
      color: ${LAYOUT.textPrimary};
      font-weight: 600;
    }

    /* Section wrapper */
    .section {
      border-radius: 8px;
      border: 1px solid;
      padding: 0;
      margin-bottom: 20px;
      overflow: hidden;
    }

    /* Section header */
    .section-header {
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .section-title-link {
      text-decoration: none;
    }
    .section-title {
      margin: 0;
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 600;
    }
    .section-count {
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    /* Inner panel with table */
    .section-inner {
      background: ${LAYOUT.container};
      border-top: 1px solid ${LAYOUT.divider};
      padding: 0;
    }

    /* Task table */
    .task-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      background: ${LAYOUT.container};
    }
    .task-table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${LAYOUT.textTertiary};
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 1px solid ${LAYOUT.divider};
      background: ${LAYOUT.cardBg};
    }
    .task-table td {
      padding: 16px;
      font-size: 14px;
      color: ${LAYOUT.textPrimary};
      border-bottom: 1px solid ${LAYOUT.divider};
      vertical-align: top;
      word-wrap: break-word;
    }
    .task-table tr:last-child td {
      border-bottom: none;
    }

    .task-main-title {
      font-weight: 500;
      margin: 0 0 4px 0;
      font-size: 14px;
    }
    .task-project {
      margin: 0 0 4px 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${LAYOUT.textTertiary};
      font-weight: 500;
    }

    .task-due-main {
      font-size: 13px;
      font-weight: 400;
      margin-bottom: 0;
      color: ${LAYOUT.textSecondary};
    }

    /* Badges - minimalistic */
    .badge {
      display: inline-block;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: 1px solid;
      line-height: 1.2;
      white-space: nowrap;
    }
    .badge + .badge {
      margin-left: 4px;
    }

    .status-badge {
      font-size: 10px;
      padding: 4px 10px;
      letter-spacing: 0.04em;
    }

    .chip-row {
      margin-top: 6px;
    }
    .chip {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: ${LAYOUT.textSecondary};
      background: ${LAYOUT.cardBg};
      border: 1px solid ${LAYOUT.divider};
      margin-right: 4px;
      margin-bottom: 4px;
    }

    .footer {
      padding: 24px 40px;
      color: ${LAYOUT.textSecondary};
      font-size: 13px;
      line-height: 1.6;
      background: ${LAYOUT.cardBg};
      border-top: 1px solid ${LAYOUT.divider};
    }

    @media (max-width: 640px) {
      .wrapper {
        padding: 24px 16px !important;
      }

      .container {
        border-radius: 8px !important;
      }

      .hero {
        padding: 32px 24px !important;
      }

      .hero-title {
        font-size: 22px !important;
      }

      .hero-sub {
        font-size: 13px !important;
      }

      .hero-cta {
        display: block !important;
        text-align: center !important;
        padding: 12px 20px !important;
      }

      .body {
        padding: 24px 20px !important;
      }

      .summary {
        font-size: 14px !important;
        margin-bottom: 20px !important;
      }

      .footer {
        padding: 20px 24px !important;
        font-size: 12px !important;
      }

      .section {
        margin-bottom: 16px !important;
      }

      .section-header {
        padding: 10px 12px !important;
      }

      .section-title {
        font-size: 11px !important;
      }

      .section-count {
        font-size: 11px !important;
      }

      /* Mobile table - stack layout */
      .task-table thead {
        display: none !important;
      }

      .task-table tbody,
      .task-table tr,
      .task-table td {
        display: block !important;
        width: 100% !important;
      }

      .task-table tr {
        margin: 0 !important;
        padding: 16px !important;
        border-bottom: 1px solid ${LAYOUT.divider} !important;
      }

      .task-table tr:last-child {
        border-bottom: none !important;
      }

      .task-table td {
        padding: 0 0 12px 0 !important;
        border: none !important;
      }

      .task-table td:last-child {
        padding-bottom: 0 !important;
      }

      .task-project {
        font-size: 10px !important;
      }

      .task-main-title {
        font-size: 14px !important;
        margin-bottom: 10px !important;
      }

      .task-due-main {
        font-size: 13px !important;
        margin-bottom: 8px !important;
      }

      .task-table td:nth-child(2)::before {
        content: "Due: ";
        font-size: 11px;
        color: ${LAYOUT.textTertiary};
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-right: 4px;
      }

      .task-table td:nth-child(3)::before {
        content: "Priority: ";
        font-size: 11px;
        color: ${LAYOUT.textTertiary};
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        display: block;
        margin-bottom: 6px;
      }

      .task-table td:nth-child(4)::before {
        content: "Status: ";
        font-size: 11px;
        color: ${LAYOUT.textTertiary};
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        display: block;
        margin-bottom: 6px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="hero">
        <div class="hero-pill">Nautilus • Deadline radar</div>
        <h1 class="hero-title">${escapeHtml(total === 1 ? "1 task needs attention" : `${total} tasks need attention`)}</h1>
        <p class="hero-sub">Triggered on ${escapeHtml(dateLabel)} • ${escapeHtml(timeZoneLabel)}</p>
        <a class="hero-cta" href="${baseUrl}#tasks?status=todo,progress,review">Open Nautilus workspace</a>
      </div>
      <div class="body">
        ${renderSummary(total, dueTomorrow, dueWeek, startingToday)}
        ${renderSection("today", startingTodayTasks, baseUrl, referenceDate)}
        ${renderSection("day", dayAheadTasks, baseUrl, referenceDate)}
        ${renderSection("week", weekAheadTasks, baseUrl, referenceDate)}
      </div>
      <div class="footer">
        You're receiving this notification because you have tasks ending soon. Deadlines are evaluated using the ${escapeHtml(timeZoneLabel)} timezone.
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildDeadlineText({
    weekAheadTasks = [],
    dayAheadTasks = [],
    startingTodayTasks = [],
    referenceDate,
    baseUrl,
    timeZoneLabel = "UTC"
}) {
    const lines = [];
    const title = `Nautilus Deadline Alert - ${formatDate(referenceDate)} (${timeZoneLabel})`;
    lines.push(title, "");
    if (startingTodayTasks.length) {
        lines.push("Starting Today:");
        startingTodayTasks.forEach(task => lines.push(plainTaskRow(task)));
        lines.push("");
    }
    if (dayAheadTasks.length) {
        lines.push("Due Tomorrow:");
        dayAheadTasks.forEach(task => lines.push(plainTaskRow(task)));
        lines.push("");
    }
    if (weekAheadTasks.length) {
        lines.push("In 7 Days:");
        weekAheadTasks.forEach(task => lines.push(plainTaskRow(task)));
        lines.push("");
    }
    lines.push(`Open Nautilus: ${baseUrl}#tasks?status=todo,progress,review`);
    return lines.join("\n");
}

function renderSummary(total, dueTomorrow, dueWeek, startingToday) {
    const bits = [`<strong>${total}</strong> task${total === 1 ? "" : "s"} require attention.`];
    if (startingToday) bits.push(`<br>• <strong>${startingToday}</strong> starting today.`);
    if (dueTomorrow) bits.push(`<br>• <strong>${dueTomorrow}</strong> due tomorrow.`);
    if (dueWeek) bits.push(`<br>• <strong>${dueWeek}</strong> finishing in seven days.`);
    return `<p class="summary">${bits.join("")}</p>`;
}

function renderSection(kind, tasks, baseUrl, referenceDate) {
    if (!tasks || tasks.length === 0) return "";
    const theme = SECTION_THEME[kind];

    // Use preset-based filter URLs, exclude "done" tasks
    const presetParam = kind === "today" ? "today" : kind === "day" ? "tomorrow" : "7days";
    const filterUrl = `${baseUrl}#tasks?datePreset=${presetParam}&status=todo,progress,review`;

    return `
      <div class="section" style="background:${theme.bg};border-color:${theme.border};">
        <div class="section-header">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
            <tr>
              <td align="left" valign="baseline" style="padding:0;">
                <a href="${filterUrl}" class="section-title-link" style="color:${theme.text};text-decoration:none;">
                  <p class="section-title" style="color:${theme.text};margin:0;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;font-weight:700;">${theme.title}</p>
                </a>
              </td>
              <td align="right" valign="baseline" style="padding:0;text-align:right;">
                <a href="${filterUrl}" style="text-decoration:none;">
                  <span class="section-count" style="font-size:12px;color:#475569;white-space:nowrap;">${tasks.length} task${tasks.length === 1 ? "" : "s"}</span>
                </a>
              </td>
            </tr>
          </table>
        </div>
        <div class="section-inner">
          <table class="task-table" role="presentation" cellpadding="0" cellspacing="0">
            <thead>
              <tr>
                <th align="left">Task</th>
                <th align="left">Due</th>
                <th align="left">Priority</th>
                <th align="left">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(renderTaskRow).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
}

function renderTaskRow(task) {
    const tags = task.tags && task.tags.length
        ? `<div class="chip-row">${task.tags
            .slice(0, 4)
            .map(tag => `<span class="chip">${escapeHtml(tag)}</span>`)
            .join("")}</div>`
        : "";

    // Only show project name if task actually belongs to a project
    const projectLabel = task.projectName && task.projectName !== "General Task"
        ? `<p class="task-project">${escapeHtml(task.projectName)}</p>`
        : "";

    return `
      <tr>
        <td>
          ${projectLabel}
          <p class="task-main-title">${escapeHtml(task.title)}</p>
          ${tags}
        </td>
        <td>
          <div class="task-due-main">${escapeHtml(task.duePretty)}</div>
        </td>
        <td>
          ${renderPriorityBadge(task.priority, task.priorityLabel)}
        </td>
        <td>
          ${renderStatusBadge(task.status, task.statusLabel)}
        </td>
      </tr>
    `;
}

function renderPriorityBadge(priority, label) {
    const style = PRIORITY_BADGE_STYLES[priority] || PRIORITY_BADGE_STYLES.medium;
    return `<span class="badge" style="background:${style.bg};color:${style.text};border-color:${style.border};">${escapeHtml(label)}</span>`;
}

function renderStatusBadge(status, label) {
    const style = STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.todo;
    return `<span class="badge status-badge" style="background:${style.bg};color:${style.text};border-color:${style.border};">${escapeHtml(label)}</span>`;
}

function plainTaskRow(task) {
    return [
        `• ${task.title}`,
        task.projectName ? `(${task.projectName})` : "",
        `Priority: ${task.priorityLabel}`,
        `Status: ${task.statusLabel}`,
        `Due: ${task.duePretty} (${task.dueRelativeLabel})`
    ].filter(Boolean).join(" ");
}

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00Z");
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
    });
}

function escapeHtml(str = "") {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function addDays(dateString, days) {
    const date = new Date(dateString + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + days);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// exported for notifications.js
export const EmailTemplateColors = { STATUS_COLORS };
