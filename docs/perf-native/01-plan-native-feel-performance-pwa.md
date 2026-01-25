# Native-Feel Performance & PWA Rollout

**Status:** Planning
**Priority:** High
**Estimated Effort:** Large (> 8 hours across multiple sprints)
**Author:** Codex (ChatGPT)
**Date:** 2026-01-25

---

## Summary

Deliver a mobile-first, native-feeling Nautilus by tightening render pipeline, improving perceived performance, scaling rendering for 500+ tasks, and adding offline/PWA capabilities. Phased to let multiple AIs own slices without stepping on each other.

---

## Goals

- Cut mobile initial render time by 50-70% by rendering only the active page and eliminating duplicate work.
- Make every interaction feel instant via skeletons, optimistic UI, view transitions, and touch gestures on both mobile and desktop (mouse/trackpad parity).
- Support 500+ tasks at 60fps with virtualized lists and lazy page rendering.
- Ship offline-ready PWA: precache, background sync, add-to-home-screen, instant revisits.
- Add polish: haptics, prefers-reduced-motion, dark-mode transition, predictive prefetching.

## Non-Goals

- No backend schema changes; storage-client APIs remain intact.
- No design system overhaul; reuse existing tokens/components per VISUAL_GUIDELINES.md.
- No new 3rd-party frameworks; stick to vanilla JS + existing stack.

## User Stories

- As a mobile user on a slow network, I want the board to appear immediately (skeleton) and become interactive within 1s so I don’t bounce.
- As a mobile user offline (subway/airplane), I want to view, create, and move tasks; changes should sync automatically when online.
- As a desktop power user with 500+ tasks, I want scrolling and dragging to stay 60fps.
- As a visually sensitive user, I want animations disabled when prefers-reduced-motion is enabled.

---

## Architecture & Design Notes

- **Pages:** Render only active page; cache DOM per page after first load; apply `content-visibility` on inactive pages with `contain-intrinsic-size` to avoid layout shifts.
- **Responsiveness:** All features must work on both `.page.desktop` and `.page.mobile` surfaces (see specs/PAIRED_SURFACES.md).
- **Event model:** Single delegated listeners per surface (board, lists) to avoid per-card listeners.
- **Optimistic layer:** Local mutations staged, persisted asynchronously; rollback handler for failures.
- **SW:** Precache app shell (HTML, CSS, JS, icons); runtime cache for API/storage calls; background sync if supported; manual retry fallback.
- **Metrics hooks:** `performance.mark`/`measure` around init, first paint, first interaction; lightweight logging gated by `settings.debugLogsEnabled`.

---

## Phased Plan (checklists)

### Phase 0: Baseline & Guardrails
- [ ] Add perf marks: `init_start`, `router_ready`, `first_paint`, `first_interaction` (mobile + desktop).
- [ ] Add lightweight perf dashboard in dev mode (toggle via `settings.debugLogsEnabled`).
- [ ] Define perf budgets: mobile TTI ≤ 1.2s on cold load; interaction latency ≤ 100ms; scroll FPS ≥ 55.
- [ ] Add feature flags/toggles for: skeletons, optimistic moves, view transitions, virtual scroll, SW.

**Exit criteria:** Budgets documented; toggles wired; perf marks visible in DevTools.

### Phase 1: Fix What’s Broken (Week 1)
- [x] Render only active page (router caches others, hides via `content-visibility` / `hidden`).
- [x] Remove double render: ensure `handleRouting()` renders once per navigation.
- [x] Cache `isMobile` per render frame; invalidate on resize/orientation change with debounce.
- [x] Event delegation: single board listener for drag/drop/click; remove per-card listeners.
- [ ] Regression pass desktop + mobile (light/dark).

**Exit criteria:** Initial mobile render time reduced by 50-70%; listener count on board < 10; zero double renders observed in logs.

### Phase 2: Perceived Performance (Feel Instant)
- [x] Skeleton screens per page (Kanban, Dashboard, List, Calendar): CSS tokens only, shimmer optional respecting `prefers-reduced-motion`. *(Implemented 2026-01-25)*
- [x] Show skeleton immediately after route change; morph into data once ready. *(Implemented 2026-01-25)*
- [x] Optimistic UI: task create/edit/move/delete apply DOM update instantly; enqueue async save; rollback on failure with toast. *(Cache-first saves implemented 2026-01-25)*
- [x] View Transitions API for page changes; fallback to fade when unsupported. *(Implemented 2026-01-25)*
- [ ] Touch gestures: swipe right = complete, left = delete (with confirm), pull-to-refresh on mobile; desktop keeps click/drag parity.

**Exit criteria:** Perceived latency for move < 50ms; navigation animates smoothly; gestures work on touch devices without breaking mouse users.

### Phase 3: Smart Rendering (Scale to 500+ tasks)
- [ ] Virtual scrolling for task lists/columns (reuse DOM nodes; buffer above/below viewport).
- [ ] `content-visibility` + `contain-intrinsic-size` on inactive pages/sections.
- [ ] Lazy first render per page; retain cached DOM for revisits.
- [ ] Smart prefetch: when on Dashboard, prefetch Kanban data + next-likely route; throttle to avoid over-fetch.

**Exit criteria:** 500-task board keeps ≥55fps scroll/drag on mobile mid-tier device; memory stable (no runaway nodes); prefetching does not block UI.

### Phase 4: Offline & Instant Revisits (PWA)
- [ ] Add `manifest.webmanifest` with icons/splash (light/dark), start_url, display `standalone`.
- [ ] Service Worker: precache app shell (HTML, CSS, JS, fonts, icons); cache-first for static; stale-while-revalidate for data.
- [ ] Offline queue for mutations (create/move/edit/delete); replay on reconnect; surface sync status badge.
- [ ] Background Sync where available; manual retry button when not.
- [ ] Add-to-Home-Screen affordance; verify standalone launch without browser chrome.
- [ ] Bump cache-busting query (`?v=YYYYMMDD-name`) on `app.js`/`style.css` per CODEX.md.

**Exit criteria:** Cold revisit loads from SW in <300ms; app usable fully offline; actions sync automatically when back online; lighthouse PWA audit passes.

### Phase 5: Polish (Native Feel)
- [ ] Haptics: vibrate on complete/move (guarded by capability + reduced-motion).
- [ ] Respect `prefers-reduced-motion`: disable shimmers/transitions/haptics when enabled.
- [ ] Dark-mode transition: 150-250ms cross-fade; ensure text contrast stays AA.
- [ ] Microcopy & icons for gestures; ensure keyboard/pointer alternatives exist.
- [ ] QA sweep: RTL/i18n surfaces if present, light/dark, desktop/mobile.

**Exit criteria:** UX parity mobile/desktop; accessibility checks pass; no regressions in existing shortcuts/workflows.

---

## Files to Touch (expected)

- `app.js` (routing, render pipeline, event delegation, optimistic layer, virtual scroll helper, gesture handlers, perf marks)
- `index.html` (skeleton containers, manifest link, SW registration hook, version bumps)
- `style.css` (skeleton styles, transitions, touch affordances, content-visibility, reduced-motion, dark-mode animation)
- `manifest.webmanifest` (new)
- `sw.js` (new)
- `templates/` (add skeleton fragments if useful)
- `specs/` (update DEVELOPMENT_GUIDE and FUNCTION_REGISTRY entries touched)
- `tests/e2e/` (new: Playwright/Cypress-style scripts for smoke + offline)

---

## Testing & Validation Plan

- **Automated (proposed):**
  - `tests/e2e/native-feel.spec.ts` (Playwright):
    - Cold load mobile viewport → assert skeleton appears <100ms; real data replaces skeleton.
    - Drag card across columns → card moves instantly; after network mock failure rollback occurs.
    - Navigation Dashboard→Kanban uses view transition (check DOM `document.startViewTransition` stub called or fallback class applied).
    - Virtual scroll renders ≤30 cards in DOM when list has 500 tasks.
    - Offline mode: go offline → create + move tasks → go online → queue flushes; data persists after reload.
    - PWA: install prompt appears; standalone launch loads from cache with no network.
  - `tests/e2e/accessibility.spec.ts`: prefers-reduced-motion disables animations; gesture alternatives via buttons/keyboard.

- **Manual smoke checklist (per phase):**
  - Mobile Safari/Chrome: load, navigate, drag, swipe, pull-to-refresh.
  - Desktop Chrome/Firefox: drag/drop, keyboard shortcuts, theme toggle.
  - Light/Dark mode pair; RTL if enabled.
  - Throttle network to Slow 3G for perceived perf checks; offline toggle.

---

## Risks & Mitigations

- **Gesture conflicts** (scroll vs swipe): use direction thresholds; allow cancel; keep click/drag path unchanged on desktop.
- **Rollback complexity**: centralize optimistic queue with clear failure UI; log when `settings.debugLogsEnabled`.
- **SW cache staleness**: version assets per CODEX.md; add `skipWaiting` + `clients.claim` after confirmation modal in dev.
- **Virtual scroll edge cases**: ensure correct heights with `contain-intrinsic-size`; fall back to full render if measurement fails.

---

## Success Metrics

- Mobile cold load TTI ≤ 1.2s; repeat visit ≤ 0.35s (SW).
- Interaction latency (drag/drop, tap) ≤ 100ms P95.
- Scroll/drag FPS ≥ 55 on 500-task board (mid-tier Android/iPhone).
- Offline: 100% task ops succeed after reconnection in test suite.
- Lighthouse PWA score ≥ 90.

---

## Handoff Notes for Multiple AIs

- Keep this file updated with phase status and checked items.
- Each phase → separate branch/PR; label `phase-X-native-feel`.
- Update registries (FUNCTION/CSS/HTML) when touching app.js/style.css/index.html to avoid future context bloat.
- Record perf numbers in PR description (before/after) to track gains.

---

## Open Questions

- Do we prefer vanilla SW or Workbox-lite helpers? (default: vanilla to minimize bundle.)
- Which gesture library (if any) is allowed? (default: minimal custom to keep size low.)
- Are there existing Playwright/Cypress deps we should align to, or add fresh?
