# Updates Page + Notifications

## Context
- Repo: Nautilus
- Area: UI/UX, navigation, notifications
- Why now: Users need a minimal release notes view plus a top-bar bell for new releases and due-today tasks.

## Goal
- What should change: Add a clean Updates page (latest + history) and a notification bell that surfaces new releases and tasks due today with a badge count.

## Non-goals
- What must NOT change: Existing task/project behavior, data storage format, or email notification settings.

## Current behavior
- Describe current behavior and where it is implemented: There is no release notes page or notification bell. Tasks due today only appear in dashboard insights and filters.

## Desired behavior
- Describe desired behavior precisely:
  - A new Updates page shows the latest release and a short history, each split into New, Improvements, and Fixes.
  - The top bar shows a bell with a badge count for unseen releases plus due-today task count.
  - Opening Updates marks the latest release as seen.
  - Notifications list includes the latest release and a due-today section with task details and a link to the filtered tasks view.

## Acceptance criteria
- [ ] "Updates" appears in the sidebar and renders release notes from a config list.
- [ ] Bell shows a badge only when there are unseen releases and/or due-today tasks.
- [ ] "View updates" and "View tasks" actions route correctly.
- [ ] Latest release becomes "seen" once Updates is opened.
- [ ] UI matches Nautilus minimal styling and works in light/dark modes.

## Constraints
- Performance: Notification updates must be cheap (no heavy recompute per render).
- Security/privacy: Do not expose user data beyond task titles already visible.
- Packaging/release: No new dependencies; release data lives in repo.

## Notes / links
- Related issues/PRs: N/A
- Relevant files: index.html, style.css, app.js, src/config/release-notes.js

## Release workflow
- Initial version is `2.7.0` so the UI shows `v2.7.0` in the top-left and mobile header.
- Every future release must update `src/config/release-notes.js` with a new entry that fills `id`, `version`, `title`, `date`, `summary`, and nested `sections` for `new`, `improvements`, and `fixes`.
- Use localized text objects for release copy (`{ en, es }`) in `title`, `summary`, and each section item so the updates page and notification copy stay bilingual before shipping.
- Keep the `APP_VERSION`/`APP_VERSION_LABEL` constants in `app.js` in sync with the latest release note so the badge reflects the rollout, and mark the release as seen when the user visits the Updates page (already wired through `markLatestReleaseSeen`).
- When the team says “complete changelog we are done,” treat that as the signal to finalize and publish the most recent release note entry, including any QA sign-off.
