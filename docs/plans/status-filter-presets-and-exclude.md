# Status Filter: Quick Presets + Exclude Mode

**Feature:** One-click "Not Done" / "Active" / "In Progress" presets, plus Include/Exclude toggle for status filters.

---

## Test Plan (manual)

### 1. Quick presets (include mode)

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Go to Tasks, open Status dropdown | Presets: [Active] [Not Done] [In Progress]; toggle Include \| Exclude; checkboxes below |
| 1.2 | Click **Active** | Statuses = To Do, In Progress, In Review (no Backlog, no Done). Only those tasks shown. Active button highlighted. |
| 1.3 | Click **Not Done** | Statuses = Backlog, To Do, In Progress, In Review. All non-Done tasks. Not Done highlighted. |
| 1.4 | Click **In Progress** | Statuses = In Progress only. In Progress highlighted. |
| 1.5 | With **Active** applied, uncheck "In Review" | Preset highlight clears. List = To Do + In Progress only. |
| 1.6 | Clear filters | All presets inactive, no status filter, all tasks shown. |

### 2. Exclude mode

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Select **Exclude**, check **Done** only | All tasks except Done. Chip: "Excluding: Done". |
| 2.2 | Also check **Backlog** | Exclude Done + Backlog. Chips: "Excluding: Done", "Excluding: Backlog". |
| 2.3 | Remove "Excluding: Done" chip | Only Backlog excluded. |
| 2.4 | Switch to **Include**, check Done | Only Done tasks. |
| 2.5 | Clear filters | Exclude off, no status filter. |

### 3. URL sync

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Apply **Not Done** | URL has `#tasks?status=backlog,todo,progress,review` (no statusExclude). |
| 3.2 | Apply **Exclude** + Done only | URL has `status=done&statusExclude=1`. |
| 3.3 | Reload with `#tasks?status=done&statusExclude=1` | Exclude mode on, Done excluded, correct list. |
| 3.4 | Open `#tasks?status=todo,progress` | Include mode, only To Do + In Progress. |

### 4. Review status off

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Set `window.enableReviewStatus = false`, refresh | Review hidden in Status dropdown and Kanban. |
| 4.2 | Click **Active** | Statuses = To Do, In Progress only (no Review). |
| 4.3 | Click **Not Done** | Backlog, To Do, In Progress (no Review). |

### 5. Regression

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | No status filter, switch Kanban ↔ List ↔ Calendar | Same tasks in all views. |
| 5.2 | Apply preset, switch view | Filter preserved. |
| 5.3 | Dashboard "In progress" / "Pending" etc. → Tasks | Existing dashboard→tasks filter still works. |
| 5.4 | Priority filter (excludes done) | Still applies status = todo, progress, review. |

---

## Implementation Summary

- **filterState:** `statusExcludeMode: boolean`.
- **filterPredicates:** `matchesStatus(task, statuses, excludeMode)`; `filterTasks` accepts `statusExcludeMode`.
- **UI:** Presets (Active, Not Done, In Progress) + Include/Exclude toggle in Status dropdown; chips show "Excluding" when exclude mode.
- **URL:** `statusExclude=1` when true; parsed on load.
- **Clear filters / Apply dashboard filter:** Reset exclude mode when clearing or applying dashboard filters.

**Files changed:** `app.js`, `src/utils/filterPredicates.js`, `index.html`, `style.css`, `src/config/i18n.js`.
