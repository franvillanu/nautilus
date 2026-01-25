# Smoke Checklist (Manual)

Run this after each phase or significant UI change.

---

## Desktop (Chrome + Firefox)

- Cold load → last visited view appears.
- Navigate Dashboard ⇄ Kanban ⇄ Calendar without blank states.
- Create, edit, move, complete task.
- Reload → data persists.
- Theme toggle → UI remains readable.

---

## Mobile (Safari + Chrome, real device if possible)

- Cold load on 4G/slow profile → skeleton appears quickly.
- Scroll Kanban → no jank.
- Move card (drag/long-press) behaves.
- Swipe actions (if enabled) → undo works.
- Add to Home Screen → launches full screen.
- Offline open → create/move tasks queue → sync on reconnect.

---

## Slow Network Spot Check

- Throttle to Slow 3G.
- Confirm skeletons appear quickly and content fills in without layout jump.

