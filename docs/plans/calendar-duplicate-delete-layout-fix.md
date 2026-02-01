# Calendar Layout Break on Duplicate/Delete – Architect Analysis

**Status**: Design / Plan only – no implementation  
**Date**: 2026-01-31  
**Issue**: Duplicating or deleting a task from the calendar view corrupts the calendar layout: task bars overlap, lines no longer align with days, and vertical distribution is wrong.

---

## 1. Scope

### Goals
- Understand how the calendar organizes tasks and projects into lanes
- Identify why duplicate and delete break the layout
- Propose a fix that restores correct distribution

### Non-goals
- Changing the calendar data model or bar-rendering algorithm
- Fixing other calendar bugs
- Mobile-only behavior (unless directly related)

---

## 2. How the Calendar Works

### 2.1 Render Flow

```
renderCalendar()
  ├── prepareCalendarData()           // Computes which tasks/projects overlap which days
  ├── generateCalendarGridHTML()      // Creates day cells + project-spacer divs (height:0)
  ├── calendar-grid.innerHTML = ...   // Replaces grid DOM
  └── double requestAnimationFrame
        └── renderProjectBars()       // Measures, positions bars, sets spacer heights
```

### 2.2 Layout Mechanism (renderProjectBars)

1. **Measure**: Uses `getBoundingClientRect()` on `.calendar-day` and `.project-spacer` to get positions
2. **Segment**: Splits projects/tasks into week rows; assigns tracks (lanes) per row to avoid overlap
3. **Position bars**: Computes `left`, `width`, `top` from day cell rects; anchors to `project-spacer`
4. **Set spacer heights**: At the end, sets each row’s `project-spacer` height based on tracks

### 2.3 Critical Dependencies

- `allDayElements` – `.calendar-day` cells from the grid
- `currentMonthDays` – current month cells only (filters out other-month)
- `gridRect` – `calendarGrid.getBoundingClientRect()` for coordinate space
- `spacerEl` – `.project-spacer` inside each day for vertical anchor
- `rowMaxTracks` – per-row track counts used for spacer height

### 2.4 Retry Logic

If day elements are missing or have zero dimensions, `renderProjectBars` retries up to 20 times (50–100ms intervals) before giving up.

---

## 3. What Triggers Refresh

| Action           | Code Path                                                                 | Calendar Refresh                                  |
|------------------|---------------------------------------------------------------------------|---------------------------------------------------|
| **Month change** | `changeMonth()`                                                           | `renderCalendar()` **twice** (explicit double)    |
| **Go to Today**  | `goToToday()`                                                             | `renderCalendar()` **twice** (explicit double)    |
| **Duplicate**    | `duplicateTask()`                                                         | `renderActivePageOnly({ calendarImmediate })` → **once** |
| **Delete**       | `confirmDelete()`                                                         | `render()` + `renderCalendar()` → **once**        |
| **Filter change**| Filter listeners                                                          | `renderAfterFilterChange()` → `renderCalendar()` **once** |

---

## 4. Root Cause Hypothesis

`changeMonth` and `goToToday` both use a double-render and comment that it is “CRITICAL – it allows layout to settle between renders.”

Duplicate and delete only trigger a single render. That suggests:

- **Hypothesis**: A single render is not enough for layout to settle when the task set changes. The first pass may run before:
  - The grid has finished layout
  - Fonts/images have loaded
  - Previous overlay state is fully cleared
  - The browser has applied layout changes from sibling views (kanban/list)

- **Corroboration**: `renderActivePageOnly` for tasks also calls `renderTasks()` (kanban) and possibly `renderListView()`. Those run before the calendar and can change DOM/layout. `renderProjectBars` then measures the grid. If layout is still changing, measurements can be wrong.

---

## 5. Proposed Design

### Option A: Double-Render for Duplicate/Delete (Recommended)

Apply the same pattern as `changeMonth` / `goToToday` when duplicating or deleting from the calendar:

- **Duplicate** (when on calendar): After `renderActivePageOnly`, call `renderCalendar()` again.
- **Delete** (when on calendar): After the current `renderCalendar()` call, call it again.

**Pros**: Matches known working behavior, minimal change, low risk  
**Cons**: Extra work on duplicate/delete, but already used elsewhere

### Option B: Defer Calendar Render to Next Frame

Use a single render, but defer it so other views finish first:

- After duplicate/delete, `requestAnimationFrame(() => renderCalendar())` (or `queueMicrotask`).
- Optionally add a second RAF before `renderProjectBars` inside `renderCalendar` (some RAF usage already exists).

**Pros**: One logical render, possible layout settling  
**Cons**: May not fully replicate the effect of a second full render

### Option C: Unify All Calendar Refresh Paths

Introduce a helper, e.g. `refreshCalendar(options)`, that:

- Always performs the double-render when `options.forceSettle` is true.
- Is used by `changeMonth`, `goToToday`, duplicate, delete, and any future paths that change tasks.

**Pros**: Single source of truth, easier to maintain  
**Cons**: Slightly larger refactor

---

## 6. Recommended Implementation Plan

**Recommended**: Option A (double-render for duplicate/delete).

### Step 1: Duplicate task

In `duplicateTask()`, when `isCalendarActive`:

```text
renderActivePageOnly({ calendarChanged: true, calendarImmediate: true });
if (isCalendarActive) {
  renderCalendar();  // Second render – layout settle
}
```

### Step 2: Delete task

In `confirmDelete()`, after the current `renderCalendar()` call:

```text
if (calendarView?.classList.contains('active')) {
  renderCalendar();
  renderCalendar();  // Double-render for layout settle
}
```

Or refactor to a shared helper and call it from both duplicate and delete.

### Step 3: Test

- Duplicate a task from the calendar and confirm layout stays correct.
- Delete a task from the calendar and confirm layout stays correct.
- Ensure month navigation and “Today” still behave as before.

---

## 7. Edge Cases & Risks

| Risk                   | Mitigation                                 |
|------------------------|--------------------------------------------|
| Performance (2× render)| Double-render only when calendar is active |
| Race with modal        | No modal close; keep existing UX           |
| Retry logic conflict   | `renderProjectBars` retries are unchanged  |

---

## 8. Acceptance Checklist

- [ ] Duplicating a task from the calendar view keeps correct bar positions and lanes
- [ ] Deleting a task from the calendar view keeps correct bar positions and lanes
- [ ] Month change and “Today” continue to work
- [ ] No new layout corruption in other views
- [ ] No performance regression when calendar is not visible

---

## 9. References

- `app.js`: `renderCalendar` ~12085, `renderProjectBars` ~12155
- `app.js`: `changeMonth` ~12789 (double-render)
- `app.js`: `confirmDelete` ~7961
- `app.js`: `duplicateTask` ~7888
- `src/views/calendar.js`: grid and day HTML generation
