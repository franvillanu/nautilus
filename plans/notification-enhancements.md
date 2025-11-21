# Notification Enhancements

**Status:** Completed
**Priority:** High
**Estimated Effort:** Medium (2-8 hours)
**Author:** Codex (AI)
**Date:** 2025-11-20

---

## Summary

Refine the Resend notification system so it respects Tenerife time (09:00 AM), derives recipients from the single-user profile instead of hard-coded constants, visually differentiates reminder windows in the email, and ships a developer script to trigger checks instantly (useful for QA when setting deadlines a week or a day away).

---

## Goals

- Use a shared user profile source for the contact email (default `malambre@ull.edu.es`) while still allowing overrides for testing.
- Compute "today" using a configurable timezone (default `Atlantic/Canary`) so cron runs align with 09:00 Tenerife.
- Update the digest template with distinct colors/visual cues for one-week vs day-before reminders.
- Provide a CLI script that triggers the notification endpoint immediately, enabling QA to confirm 7-day/1-day behavior without waiting for the cron.

---

## Non-Goals

- Multi-user routing or per-task recipient selection.
- Building a UI to edit the profile (still static for now).
- Replacing the scheduled cron setup (script is supplemental for testing/manual triggers).

---

## Implementation Steps

### Phase 1: Recipient + Timezone Foundations
- [x] Introduce `src/config/user.js` with shared name/email constants; hydrate UI header and notification worker from it.
- [x] Update notification worker to default to `USER_PROFILE.email`, but allow `NOTIFICATION_RECIPIENT` env overrides.
- [x] Respect configurable timezone (`NOTIFICATION_TIMEZONE`, default `Atlantic/Canary`) when determining the reference date and scheduling guidance.

### Phase 2: Email Template Polish
- [x] Add palette variants for the week vs day sections and pass metadata from the worker so the digest clearly differentiates them.

### Phase 3: Instant Trigger Script
- [x] Add `scripts/trigger-notifications.js` that calls `/api/notifications` (with token support) and supports dry-run/force flags.
- [x] Document script usage and add `.dev.vars` samples for timezone + endpoint customization.

### Phase 4: Docs & Testing
- [x] Update README/specs with timezone guidance, 09:00 Tenerife cron instructions, and script usage.
- [x] Verify worker + template via `node --check` and run the new script against mock/local data (dry run) to ensure outputs.
---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Timezone math mistakes | Use `Intl.DateTimeFormat` with an explicit timezone helper and cover with manual tests. |
| Script hitting prod accidentally | Require explicit endpoint env var + explain testing steps/dry-run flag. |
| Duplicate sends when running script repeatedly | Keep log logic + optional `force` flag for intentional resends. |

---

## Testing Plan

- Dry-run the worker with mocked env/timezone to ensure new reference date logic matches Canary time.
- Run the CLI script with `--dry-run` to confirm it hits the endpoint and prints digest preview.
- Manual end-to-end test by setting a task end date 7 days ahead, running the script (pointed at dev endpoint), and verifying email/digest output.

---

## Changelog

- **2025-11-20:** Plan drafted (In Progress).
- **2025-11-20:** Completed – timezone-aware worker, palette updates, trigger script, and docs shipped.
