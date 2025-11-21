# Task Deadline Email Notifications

**Status:** Completed
**Priority:** High
**Estimated Effort:** Medium (2-8 hours)
**Author:** Codex (AI)
**Date:** 2025-11-20

---

## Summary

Automate deadline reminders by running a Cloudflare Worker that scans stored tasks daily, detects ones that end in seven days or one day, and sends beautifully formatted Resend emails to malambre@ull.edu.es. Notifications must highlight key task context (project, status, priority, timing, links) so researchers can act quickly without opening Nautilus.

---

## Goals

- Load persisted task data from KV and evaluate deadlines relative to the current UTC day.
- Deliver Resend emails the moment a task is one week away and again the day before the end date, skipping completed tasks.
- Produce polished HTML email sections grouped by reminder type with essential metadata and action cues.
- Avoid duplicate sends by tracking notification history per task per reminder window.

---

## Non-Goals

- No UI changes in Nautilus (emails are backend-only).
- No per-user notification preferences (single hardcoded recipient for now).
- No SMS/push or additional channels beyond email.

---

## User Stories

**As a** research lead monitoring deadlines
**I want** an automatic daily email summarizing tasks due soon
**So that** I can intervene before work slips, without manually checking the app.

---

## Design

### Data Model Changes

- Add a new KV key `notificationLog` shaped as:
```json
{
  "tasks": {
    "<taskId>": {
      "7": "2025-11-20",   // YYYY-MM-DD when 7-day reminder was sent
      "1": "2025-11-26"
    }
  }
}
```
- Updated whenever we successfully send a reminder so repeated worker runs stay idempotent.

### Backend Logic

1. **Notification Function (`functions/api/notifications.js`):**
   - Invoked daily via Cloudflare Scheduled Functions or any external cron hitting `/api/notifications`.
   - Fetches `tasks`, `projects`, and `notificationLog` from `NAUTILUS_DATA`.
   - Normalizes task end dates (supports ISO + fallback to DMY via shared date util helpers copied server-side).
   - Filters to tasks with valid end dates, status !== `done`, and difference of 7 or 1 days.
   - Deduplicates referencing `notificationLog` before enqueueing email sections.
   - Persists updated log after sending.

2. **Resend integration:**
   - New helper `sendEmail` builds request to `https://api.resend.com/emails` using `RESEND_API_KEY` secret + `RESEND_FROM` (configurable fallback `notifications@nautilus.app`).
   - Payload includes both HTML and text fallback summarizing tasks.

3. **Email template builder:**
   - Utility (e.g., `src/services/email-template.js` shared via import in worker) that receives grouped task arrays and returns styled HTML with accent colors consistent with VISUAL_GUIDELINES: hero banner, grouped cards, CTA linking to Nautilus, and badges for priority/status/dates.
   - Provide plain-text fallback string for deliverability.

### Configuration

- Add secrets: `RESEND_API_KEY`, `RESEND_FROM` (optional) via Wrangler env + `.dev.vars` example comment.
- Update README/specs Architecture with new cron worker description and env requirements.

---

## Implementation Steps

### Phase 1: Planning & Config
- [x] Create new notification function scaffold with shared entry (`runNotificationJob`) and helper stubs.
- [x] Update `wrangler.toml` with cron reminder + env var documentation (`RESEND_API_KEY` et al.).
- [x] Document env variables in README + `.dev.vars` sample comment.

### Phase 2: Data + Filtering Logic
- [x] Build helper to load tasks/log from KV, normalize dates (import or reimplement formatting logic).
- [x] Implement difference calculation and grouping for 7-day vs 1-day reminders, skipping completed/invalid tasks.
- [x] Extend log persistence to mark reminders once sent per date to maintain idempotency.

### Phase 3: Email Delivery Layer
- [x] Implement Resend API client (`sendResendEmail`) with HTML + text support and error handling.
- [x] Create rich HTML template function (hero, grouped cards, badges, timeline) that ingests grouped tasks + context.
- [x] Compose notification payload and send only if at least one reminder group has tasks.

### Phase 4: Testing & Validation
- [x] Add script/command examples for invoking the worker locally (e.g., curl dry run).
- [x] Manually run worker locally with mock data to verify grouping, log update, and template output (console snapshots).
- [x] Update plan status + docs once verified.

---

## Files to Modify

| File | Changes | Lines |
|------|---------|-------|
| `wrangler.toml` | Add cron trigger + env var reference comments | ~10 |
| `functions/api/notifications.js` | Notification function: task fetch, filtering, email send, log save | ~250 |
| `src/services/email-template.js` (new) | Shareable HTML/text builders for notifications, consistent styling tokens | ~120 |
| `README.md` | Document email notification worker + env setup | ~15 |
| `.dev.vars` | Add commented example entries for Resend secrets | ~4 |
| `specs/ARCHITECTURE.md` | Note cron worker + new KV key | ~12 |

---

## Edge Cases

- **No tasks to notify:** Worker exits gracefully without hitting Resend.
- **Missing/invalid dates:** Task skipped with console warning, no crash.
- **Completed tasks:** Never included even if deadline matches.
- **Multiple tasks same project:** Template groups by reminder type but keeps per-task rows.
- **API failure:** Log not updated; errors logged to console + thrown for observability.

---

## Testing Plan

- [ ] Run worker locally with mocked `env` to ensure tasks 7/1 days away produce HTML and text.
- [ ] Simulate duplicate run same day; verify `notificationLog` prevents repeated emails.
- [ ] Force Resend failure (mock 401) to confirm errors bubble and log not mutated.
- [ ] Validate README instructions and `.dev.vars` entries render correctly.

---

## Dependencies

- Resend API availability + API key.
- Cloudflare Cron Triggers (requires Wrangler deploy with trigger support).

**Blocked by:** None.

**Blocks:** Future user-specific notification preferences.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cron fails silently | Medium | Log errors + consider Wrangler alerting; keep logic idempotent |
| Resend API downtime | Medium | Retry once before failing; log details |
| Tasks stored w/ DMY dates | Low | Normalize using existing utils fallback |
| Email seen as spam | Low | Provide text fallback + consistent sender |

---

## Alternatives Considered

1. **Client-side reminders:** Browser would have to be open; not reliable for teams.
2. **KV webhooks via third-party scheduler:** Adds dependency and still needs worker for Resend call.
3. **SendGrid/Mailgun:** Resend chosen for simplicity + user direction.

---

## Success Metrics

- Daily job runs without errors.
- Each task generates at most one 7-day and one 1-day email per cycle.
- Emails display priority/project/date info clearly (per design review feedback).

---

## Future Enhancements

- User-specific recipients + preferences stored per project.
- Digest customization (per project digest, attachments, etc.).
- Include direct task deep links and ICS attachments.

---

## Notes

- Worker will rely on UTC; future iteration can add timezone offset support once user settings exist.
- Consider storing `RESEND_FROM_NAME` later for personalization.

---

## Changelog

- **2025-11-20:** Plan drafted (status In Progress).
- **2025-11-20:** Implementation complete; docs + dry-run verification done.
