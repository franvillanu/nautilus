# Tests & Quality Gates

**Purpose:** Define the minimum quality bar for every phase. These gates apply to both desktop and mobile.

---

## Definition of Done (All Phases)

- No regressions in core flows (see below).
- Performance numbers captured in `04-benchmarks.md`.
- Playwright tests added/updated for any UI behavior change.
- Manual smoke checklist executed (`smoke-checklist.md`).
- No new long tasks (>50ms) on critical interactions (drag, navigation, create).

---

## Core Flows to Protect

### Desktop
- App loads to last visited view.
- Navigate Dashboard ⇄ Kanban ⇄ Calendar without blank states.
- Create task, edit task, move task, complete task.
- Search/filter (if present) and state persists after refresh.
- Hard reload does not lose data (cache-first rules respected).

### Mobile
- Cold load on 4G and slow profiles shows skeleton quickly.
- Touch scroll does not jank in Kanban.
- Drag/move card behaves (or long-press drag if required).
- Swipe actions (when added) behave and can be undone.
- Add to Home Screen launches full screen.
- Offline open + create/move tasks queues and later syncs.

---

## Playwright Test Packs

Place under `tests/e2e`.

Run locally:
```
npm run test:e2e
```

- `tests/smoke.spec.ts` (fast, always in CI)
- `tests/mobile.spec.ts` (emulated mobile viewport)
- `tests/offline.spec.ts` (SW + offline)
- `tests/perf-smoke.spec.ts` (basic budgets + traces, not strict)

Suggested coverage:
- Skeleton appears quickly on cold load.
- Optimistic UI updates before network completes.
- View transition called when supported.
- Virtual list renders bounded number of items.
- Offline queue flushes on reconnect.

---

## Manual Smoke Checklist

See `smoke-checklist.md` for the step list. Run it on:
- Desktop Chrome + Firefox
- Mobile Safari + Chrome (real device if possible)
- One slow network throttle case

---

## Perf Budgets (Initial)

- Mobile cold load TTI: ≤ 1.2s
- Warm load (SW): ≤ 0.35s
- Interaction latency P95: ≤ 100ms
- Scroll/drag FPS: ≥ 55 on 500-task dataset

Store measurements in `04-benchmarks.md`.
