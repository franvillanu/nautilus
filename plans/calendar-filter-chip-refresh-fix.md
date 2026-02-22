# Calendar Filter Chip Refresh Fix

## Problem Description

When a user filters by priority (or any other filter) on the Calendar view, a filter chip is created. When the user clicks the "x" to clear that chip, the calendar gets wrongly refreshed and collapses, losing the proper distribution of tasks in the layout.

## Root Cause Analysis

The calendar layout collapses when clearing filter chips because **`renderAfterFilterChange()` only calls `renderCalendar()` once**, but the calendar requires a **double-render** to properly settle the layout.

### Code Flow

1. **Chip removal handler** (`app.js:3433-3441`):
   ```javascript
   addChip(priorityChipLabel, getPriorityLabel(v), () => {
       filterState.priorities.delete(v);
       // ...
       updateFilterBadges();
       renderAfterFilterChange();  // <-- Calls this
   }, "priority", v)
   ```

2. **`renderAfterFilterChange()`** (`app.js:3672-3687`):
   ```javascript
   function renderAfterFilterChange() {
       syncURLWithFilters();
       renderActiveFilterChips();
       renderTasks();
       // ...
       if (document.getElementById("calendar-view").classList.contains("active")) {
           renderCalendar(); // <-- ONLY ONE RENDER - THE BUG
       }
   }
   ```

3. **The double-render pattern is used elsewhere** for layout stability:
   - `changeMonth()` - "This double-render is CRITICAL - it allows layout to settle between renders"
   - `goToToday()`
   - `confirmDelete()` - "double-render when active for layout settle"
   - `duplicateTask()` - "Double-render when on calendar"

### Why Double-Render is Needed

The `renderProjectBars()` function relies on `getBoundingClientRect()` measurements from DOM elements. The first render creates the calendar grid HTML, but layout measurements aren't accurate until after the browser has performed layout. The second render ensures proper positioning of project/task bars.

## Solution

Add a double-render pattern to `renderAfterFilterChange()` when the calendar is active, matching the pattern used in `changeMonth()`, `goToToday()`, `confirmDelete()`, and `duplicateTask()`.

### Code Change

**File:** `app.js`

**Location:** `renderAfterFilterChange()` function (around line 3672)

**Before:**
```javascript
function renderAfterFilterChange() {
    syncURLWithFilters(); // Keep URL in sync with filters
    renderActiveFilterChips(); // Update filter chips display
    renderTasks(); // Kanban

    // Always render list view on mobile (for mobile cards) or when active on desktop
    const isMobile = getIsMobileCached();
    if (isMobile || document.getElementById("list-view").classList.contains("active")) {
        renderListView(); // List (includes mobile cards)
    }

    if (document.getElementById("calendar-view").classList.contains("active")) {
        renderCalendar(); // Calendar
    }
}
```

**After:**
```javascript
function renderAfterFilterChange() {
    syncURLWithFilters(); // Keep URL in sync with filters
    renderActiveFilterChips(); // Update filter chips display
    renderTasks(); // Kanban

    // Always render list view on mobile (for mobile cards) or when active on desktop
    const isMobile = getIsMobileCached();
    if (isMobile || document.getElementById("list-view").classList.contains("active")) {
        renderListView(); // List (includes mobile cards)
    }

    const calendarView = document.getElementById("calendar-view");
    if (calendarView && calendarView.classList.contains("active")) {
        renderCalendar(); // Calendar - first render
        
        // Double-render when on calendar (layout settle - same as changeMonth/goToToday)
        // This is CRITICAL - it allows layout to settle between renders
        renderCalendar(); // Calendar - second render for proper bar positioning
    }
}
```

## Implementation Checklist

- [x] Modify `renderAfterFilterChange()` to use double-render pattern for calendar
- [ ] Test clearing priority filter chips on calendar view
- [ ] Test clearing status filter chips on calendar view
- [ ] Test clearing project filter chips on calendar view
- [ ] Test clearing tag filter chips on calendar view
- [ ] Test clearing date filter chips on calendar view
- [ ] Verify no performance regression (double-render is only on filter change, not continuous)

## Implementation Status

**IMPLEMENTED** - The fix has been applied to `app.js` in the `renderAfterFilterChange()` function.

## Related Code Locations

- `renderAfterFilterChange()` - `app.js:3672-3687`
- `renderCalendar()` - `app.js:14223-14288`
- `renderProjectBars()` - `app.js:14294-14952`
- `changeMonth()` - `app.js:15021-15035` (reference for double-render pattern)
- `goToToday()` - `app.js:15037-15049` (reference for double-render pattern)
- `confirmDelete()` - `app.js:9919-9926` (reference for double-render pattern)
- `duplicateTask()` - `app.js:9840-9843` (reference for double-render pattern)

## Risk Assessment

**Low Risk** - This change follows an established pattern already used in multiple places in the codebase. The double-render pattern is well-documented and understood as necessary for proper calendar layout.
