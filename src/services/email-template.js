/**
 * Deadline notification templates (table layout, email-safe).
 * Dark frame hero, pastel sections, white inner tables.
 */

const LAYOUT = {
    background: "#030614",
    container: "#040912",
    heroStart: "#5aa8ff",
    heroEnd: "#2563eb",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textLight: "#f8fafc",
    divider: "#e2e8f0",
    cardWhite: "#ffffff",
    cardBorder: "#e5e7eb",
    accent: "#1d4ed8",
    accentSoft: "#bfdbfe"
};

// used by notifications.js for statusColor
const STATUS_COLORS = {
    todo: "#94a3b8",
    progress: "#a855f7",
    review: "#f97316",
    done: "#16a34a"
};

/**
 * Light pills for priority (works on white cards).
 */
const PRIORITY_BADGE_STYLES = {
    high: {
        bg: "#fee2e2",
        text: "#b91c1c",
        border: "#fecaca"
    },
    medium: {
        bg: "#fef3c7",
        text: "#92400e",
        border: "#fde68a"
    },
    low: {
        bg: "#dcfce7",
        text: "#166534",
        border: "#bbf7d0"
    }
};

/**
 * Light pills for status (also on white).
 */
const STATUS_BADGE_STYLES = {
    todo: {
        bg: "#e5e7eb",
        text: "#111827",
        border: "#d1d5db"
    },
    progress: {
        bg: "#e0e7ff",
        text: "#1e3a8a",
        border: "#c7d2fe"
    },
    review: {
        bg: "#fef3c7",
        text: "#92400e",
        border: "#fde68a"
    },
    done: {
        bg: "#dcfce7",
        text: "#166534",
        border: "#bbf7d0"
    }
};

const SECTION_THEME = {
    day: {
        title: "Due Tomorrow",
        bg: "#fff3d9",
        border: "#facc15",
        text: "#92400e"
    },
    week: {
        title: "One Week Away",
        bg: "#e0f3ff",
        border: "#38bdf8",
        text: "#0f4c81"
    }
};

export function buildDeadlineEmail({
    weekAheadTasks = [],
    dayAheadTasks = [],
    referenceDate,
    baseUrl,              // still used in the text version
    timeZoneLabel = "UTC"
}) {
    const total = weekAheadTasks.length + dayAheadTasks.length;
    const dueTomorrow = dayAheadTasks.length;
    const dueWeek = weekAheadTasks.length;
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
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .wrapper {
      padding: 16px 0 24px;
      background: radial-gradient(circle at top, rgba(90,168,255,0.35), ${LAYOUT.background} 65%);
    }
    .container {
      max-width: 840px;
      width: 100%;
      margin: 0 auto;
      border-radius: 28px;
      overflow: hidden;
      background: ${LAYOUT.container};
      box-shadow: 0 30px 70px rgba(2,6,23,0.8);
      border: 1px solid rgba(59,130,246,0.15);
    }
    .hero {
      padding: 32px 34px;
      background: linear-gradient(135deg, ${LAYOUT.heroStart}, ${LAYOUT.heroEnd});
      color: ${LAYOUT.textLight};
    }
    .hero-pill {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 11px;
      margin-bottom: 18px;
      background: rgba(15,23,42,0.18);
    }
    .hero-title {
      margin: 0;
      font-size: 30px;
      letter-spacing: -0.02em;
    }
    .hero-sub {
      margin: 10px 0 0;
      font-size: 14px;
      color: rgba(248,250,252,0.85);
    }
    .hero-cta {
      display: inline-flex;
      align-items: center;
      margin-top: 22px;
      padding: 12px 24px;
      border-radius: 999px;
      background: rgba(0,0,0,0.35);
      color: #ffffff !important;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-decoration: none !important;
      border: 1px solid rgba(255,255,255,0.45);
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15);
    }
    .body {
      padding: 24px 28px 30px;
      background: ${LAYOUT.cardWhite};
    }
    .summary {
      margin: 0 0 18px 0;
      color: ${LAYOUT.textSecondary};
      font-size: 14px;
      line-height: 1.6;
    }
    .summary strong {
      color: ${LAYOUT.textPrimary};
    }

    /* Section wrapper */
    .section {
      border-radius: 18px;
      border: 1px solid;
      padding: 0;
      margin-bottom: 16px;
    }

    /* Colored band that holds "Due tomorrow / X tasks" */
    .section-header {
      padding: 10px 16px 6px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }
    .section-title {
      margin: 0;
      font-size: 13px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .section-count {
      font-size: 12px;
      color: ${LAYOUT.textSecondary};
      white-space: nowrap;
    }

    /* White inner panel with table */
    .section-inner {
      background: ${LAYOUT.cardWhite};
      border-radius: 0 0 18px 18px;
      border-top: 1px solid rgba(148,163,184,0.35);
      padding: 8px 10px 10px;
    }

    /* Task table */
    .task-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      margin-top: 4px;
      background: #ffffff;
    }
    .task-table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9ca3af;
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .task-table td {
      padding: 8px 8px;
      font-size: 13px;
      color: ${LAYOUT.textPrimary};
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
      word-wrap: break-word;
    }

    .task-main-title {
      font-weight: 600;
      margin: 0 0 2px 0;
    }
    .task-project {
      margin: 0 0 2px 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${LAYOUT.textSecondary};
    }

    .task-due-main {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 2px;
    }

    /* Pills – base */
    .badge {
      display: inline-block;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border: 1px solid transparent;
      line-height: 1.2;
      white-space: nowrap;
    }
    .badge + .badge {
      margin-left: 4px;
    }

    /* Status pills: slightly smaller so "IN PROGRESS" fits nicely */
    .status-badge {
      font-size: 10px;
      padding: 3px 10px;
      letter-spacing: 0.06em;
    }

    .chip-row {
      margin-top: 4px;
    }
    .chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #374151;
      background: rgba(15,23,42,0.03);
      border: 1px solid rgba(148,163,184,0.6);
      margin-right: 4px;
      margin-bottom: 4px;
    }

    .footer {
      padding: 18px 32px 28px;
      color: rgba(248,250,252,0.72);
      font-size: 12px;
      background: ${LAYOUT.container};
      border-top: 1px solid rgba(255,255,255,0.08);
    }

    @media (max-width: 640px) {
      /* Mobile container adjustments */
      .wrapper {
        padding: 12px 0 !important;
      }

      .container {
        border-radius: 16px !important;
        margin: 0 8px !important;
      }

      /* Hero mobile optimizations */
      .hero {
        padding: 24px 20px !important;
      }

      .hero-title {
        font-size: 24px !important;
        line-height: 1.2 !important;
      }

      .hero-sub {
        font-size: 13px !important;
      }

      .hero-cta {
        display: block !important;
        text-align: center !important;
        padding: 14px 20px !important;
        font-size: 15px !important;
      }

      /* Body spacing */
      .body {
        padding: 20px 16px !important;
      }

      .footer {
        padding: 16px 20px !important;
        font-size: 11px !important;
        line-height: 1.5 !important;
      }

      /* Section adjustments */
      .section {
        border-radius: 12px !important;
        margin-bottom: 12px !important;
      }

      .section-header {
        padding: 8px 12px 6px !important;
        flex-wrap: wrap !important;
      }

      .section-title {
        font-size: 11px !important;
        letter-spacing: 0.12em !important;
      }

      .section-count {
        font-size: 11px !important;
      }

      .section-inner {
        padding: 6px 8px 8px !important;
        border-radius: 0 0 12px 12px !important;
      }

      /* MOBILE: Convert table to card layout */
      .task-table {
        border: 0 !important;
      }

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
        margin-bottom: 12px !important;
        background: #fafafa !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 10px !important;
        padding: 12px !important;
        overflow: hidden !important;
      }

      .task-table td {
        padding: 0 0 8px 0 !important;
        border: none !important;
        font-size: 13px !important;
      }

      .task-table td:last-child {
        padding-bottom: 0 !important;
      }

      /* Mobile task card layout */
      .task-project {
        font-size: 10px !important;
        margin-bottom: 4px !important;
      }

      .task-main-title {
        font-size: 15px !important;
        margin-bottom: 8px !important;
        line-height: 1.3 !important;
      }

      .task-due-main {
        font-size: 13px !important;
        margin-bottom: 6px !important;
        color: #64748b !important;
      }

      /* Add labels for mobile */
      .task-table td:nth-child(2)::before {
        content: "📅 ";
        font-size: 12px;
      }

      .task-table td:nth-child(3)::before {
        content: "Priority: ";
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: block;
        margin-bottom: 4px;
      }

      .task-table td:nth-child(4)::before {
        content: "Status: ";
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: block;
        margin-bottom: 4px;
      }

      /* Badges mobile sizing */
      .badge {
        font-size: 10px !important;
        padding: 4px 10px !important;
        display: inline-block !important;
      }

      .status-badge {
        font-size: 9px !important;
        padding: 4px 9px !important;
      }

      /* Tags/chips mobile */
      .chip {
        font-size: 9px !important;
        padding: 3px 8px !important;
        margin: 2px 4px 2px 0 !important;
      }

      .chip-row {
        margin-top: 6px !important;
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
        <a class="hero-cta" href="${baseUrl}#tasks">Open Nautilus workspace</a>
      </div>
      <div class="body">
        ${renderSummary(total, dueTomorrow, dueWeek)}
        ${renderSection("day", dayAheadTasks)}
        ${renderSection("week", weekAheadTasks)}
      </div>
      <div class="footer">
        You are receiving this message because you are the Nautilus deadline notification contact. Deadlines are evaluated using the ${escapeHtml(timeZoneLabel)} schedule.
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildDeadlineText({
    weekAheadTasks = [],
    dayAheadTasks = [],
    referenceDate,
    baseUrl,
    timeZoneLabel = "UTC"
}) {
    const lines = [];
    const title = `Nautilus Deadline Alert - ${formatDate(referenceDate)} (${timeZoneLabel})`;
    lines.push(title, "");
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
    lines.push(`Open Nautilus: ${baseUrl}#tasks`);
    return lines.join("\n");
}

function renderSummary(total, dueTomorrow, dueWeek) {
    const bits = [`<strong>${total}</strong> task${total === 1 ? "" : "s"} require attention.`];
    if (dueTomorrow) bits.push(`<br>• <strong>${dueTomorrow}</strong> due tomorrow.`);
    if (dueWeek) bits.push(`<br>• <strong>${dueWeek}</strong> finishing in seven days.`);
    return `<p class="summary">${bits.join("")}</p>`;
}

function renderSection(kind, tasks) {
    if (!tasks || tasks.length === 0) return "";
    const theme = SECTION_THEME[kind];
    return `
      <div class="section" style="background:${theme.bg};border-color:${theme.border};">
        <div class="section-header">
          <p class="section-title" style="color:${theme.text};">${theme.title}</p>
          <span class="section-count">${tasks.length} task${tasks.length === 1 ? "" : "s"}</span>
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

    return `
      <tr>
        <td>
          <p class="task-project">${escapeHtml(task.projectName || "General Task")}</p>
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

// exported for notifications.js
export const EmailTemplateColors = { STATUS_COLORS };
