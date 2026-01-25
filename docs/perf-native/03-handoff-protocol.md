# Handoff Protocol (Multi-AI Safe)

**Purpose:** Prevent drift and collisions across multiple AI assistants.

---

## Branch Naming

- `phase-0-native-feel/<topic>`
- `phase-1-native-feel/<topic>`
- `phase-2-native-feel/<topic>`
- `phase-3-native-feel/<topic>`
- `phase-4-native-feel/<topic>`
- `phase-5-native-feel/<topic>`

---

## PR Requirements (Every PR)

- State which phase checklist items are completed.
- Update `STATUS.md` with:
  - Current phase
  - What’s merged
  - What’s next
  - Latest benchmark numbers
  - PR link(s)
- Include before/after perf numbers (even if minimal).
- List tests run + commands.
- Note any new flags/config toggles.

---

## Code Changes Protocol

- Follow CODEX.md registry workflow before touching `app.js`, `style.css`, or `index.html`.
- Update registries (FUNCTION/CSS/HTML) if line numbers change.
- For CSS changes, update both desktop + mobile sections (see `specs/CSS_REGISTRY_VERIFIED.md`).

---

## Debug/Instrumentation Rules

- Debug logs must be gated by `settings.debugLogsEnabled` and localStorage mirror.
- Avoid logging raw payloads or user data.
- Log only what is required to track performance regressions.

---

## Communication Notes

Each handoff should include:
- What changed (1-2 sentences).
- What was skipped or deferred.
- Any open questions or blockers.

