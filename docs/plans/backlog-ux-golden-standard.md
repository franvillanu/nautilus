# Backlog UX/UI — Approved Product Decisions

**Status:** Planning  
**Priority:** High  
**Type:** Architecture / product spec  
**Author:** Architect  
**Date:** 2026-01-25  

---

## Architect Role

**Plan only. No code changes** unless you explicitly approve implementation. The architect proposes and documents decisions; implementation happens only after you agree and request it.

---

## Summary

**Kanban is the only special case.** Behaviour depends solely on whether the **Backlog column** is shown or hidden (Show Backlog toggle). Everywhere else (List, Calendar, Dashboard, Project details, etc.) works the same: Backlog is always available in the Status filter, and new tasks default to **Backlog**.

1. **Filter:** When **Kanban** + **Backlog column hidden** → hide Backlog in the Status filter; user cannot select it. When column is **ON**, or in List/Calendar, Backlog can be selected as usual.
2. **Default status:** When adding a new task **from Kanban** + **Backlog column hidden** → default status **To Do**. When column is **ON**, or from any other entry point → default **Backlog** (everywhere else).

---

## Approved Rules

| # | When | Then |
|---|------|------|
| **1** | **Kanban** view + **Backlog column hidden** (Show Backlog = OFF) | **Hide** Backlog in the Status filter; user cannot select it. On toggle OFF, clear Backlog from filter and refresh. |
| **2** | **Kanban** + **Backlog column hidden** + user adds new task | Default status = **To Do**. |
| **1′** | **Kanban** + **Backlog column ON**, or **List / Calendar / other** | Backlog in filter, selectable. New task default = **Backlog** (same as everywhere else). |

---

## Scope

- **Kanban with column OFF:** Special behaviour (hide Backlog in filter, default new task To Do).
- **Kanban with column ON:** Normal — Backlog selectable, new task default Backlog.
- **List, Calendar, Dashboard, Project details, etc.:** Always normal — Backlog selectable, new task default Backlog.

---

## Resolved: Filter State and Quick Button

**1. Active filter when Backlog column is hidden**

If the user has “Status: Backlog” selected and then **turns OFF** “Show Backlog”: **refresh** and correct the filter state. Clear Backlog from the active filter so we’re never “filtered by Backlog” with no column.

**2. “Backlog” quick button**

**Stays as-is.** Always visible; links to List + `status=backlog`. Escape hatch to view backlog. No hide/disable.

**3. Presets**

There are **no** status presets (e.g. “Active”, “Not Done”) in the current code. All preset-related wording has been removed from this plan.

---

## What Stays Unchanged

- “Show Backlog” toggle and Backlog column visibility logic.
- Default status **Backlog** when creating from List, Calendar, Dashboard, Project details, or from Kanban **with** Backlog column ON.
- **Backlog quick button:** unchanged; always links to List + `status=backlog`.
- Data model, URLs, existing filters.

---

## Success Criteria

- [ ] Kanban + Backlog column **hidden**: Backlog cannot be selected in the Status filter.
- [ ] When user turns OFF “Show Backlog”: refresh and fix filter state (clear Backlog from filter).
- [ ] Kanban + column **hidden** + new task from Kanban → default status **To Do**.
- [ ] Kanban + column **ON**, or any other context → new task default **Backlog**.
- [ ] Backlog quick button unchanged; always links to List + `status=backlog`.

---

## References

- [HOTSPOTS](../../specs/HOTSPOTS.md) — `ui.kanban_board`, `ui.filters.task_toolbar`
- Current: `toggleKanbanBacklog`, `applyBacklogColumnVisibility`, Status filter UI, `openTaskModal` / `submitTaskForm` (default status)

---

## Changelog

**2026-01-25:** Replaced prior proposal with approved product decisions (filter hide + Kanban default To Do). Architect role disclaimer.

**2026-01-25:** Resolved: (1) On toggle OFF, refresh and fix filter state. (2) Backlog quick button stays as-is. (3) Removed all preset references (“Active”, “Not Done”) — feature not in code.

**2026-01-25:** Clarified: Kanban is the only special case. When Backlog column **ON**, everything normal (Backlog selectable, new task default Backlog). Default To Do only when Kanban + column **hidden**.
