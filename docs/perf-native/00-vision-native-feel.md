# Vision: Native-Feel Nautilus

**Purpose:** Provide the why + high-level product intent. This is not the execution plan; the plan lives in `01-plan-native-feel-performance-pwa.md`.

---

## Vision

Nautilus should feel native on mobile and desktop: immediate visual feedback, fluid interactions, and resilience in poor networks or offline.

The fastest app is the one that feels fastest. We will prioritize perceived performance (skeletons + optimistic UI), eliminate wasteful rendering, and add PWA/offline capabilities so repeat visits are instant.

---

## North Star Experience

- Open app → structure appears immediately (skeleton) → real data fills in seamlessly.
- Every interaction feels instant (move, complete, create), with background saves and rollback on failure.
- Page navigation feels smooth (view transitions, reduced motion respected).
- 500+ tasks still scroll at 60fps.
- Offline-first: tasks are usable and synced later.

---

## Architectural Principles

- **Render less:** Only render active page; lazy render on demand.
- **Batch DOM work:** Avoid full rerenders for small updates; patch when possible.
- **Single listeners:** Delegate events at container level.
- **Offline by default:** Cache app shell, queue mutations, sync on reconnect.
- **Respect accessibility:** `prefers-reduced-motion`, contrast, keyboard alternatives.

---

## Tiers (Narrative)

### Tier 1: Fix What’s Broken
- Render only active page.
- Remove double render in routing.
- Cache `isMobile` per render cycle.
- Event delegation instead of per-card listeners.

### Tier 2: Perceived Performance
- Skeleton screens (structure first).
- Optimistic UI for all actions with rollback.
- View Transitions API for page changes.
- Touch gestures (swipe, pull-to-refresh).

### Tier 3: Smart Rendering
- Virtualized lists.
- `content-visibility` for hidden pages.
- Lazy render on navigation.

### Tier 4: Offline & Instant Revisits (PWA)
- Service worker with precache.
- Full offline mode with background sync.
- Add-to-home-screen manifest.

### Tier 5: Polish
- Haptics.
- Reduced motion support.
- Smart prefetching.
- Dark mode transitions.

---

## Source of Truth

- **Execution plan:** `01-plan-native-feel-performance-pwa.md`
- **Current status:** `STATUS.md`
- **Quality gates:** `02-tests-and-quality-gates.md`

