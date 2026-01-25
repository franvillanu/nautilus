# Modularization Plan

**Purpose:** Break 7,941-line app.js into maintainable modules

**Target:** 150-400 lines per module

**Strategy:** Incremental extraction, test after each step

**Date:** 2025-11-17

---

## Current State Analysis

### File Structure
```
app.js (7,941 lines)
├── Imports (1 line)
├── Global State (20 lines)
├── Utility Functions (500+ lines)
├── Data Operations (600+ lines)
├── UI Components (2000+ lines)
├── Event Handlers (3000+ lines)
├── Rendering Functions (1500+ lines)
└── Event Delegation (300 lines)
```

### Problems
- ❌ Hard to navigate (find specific functions)
- ❌ High cognitive load (understand dependencies)
- ❌ Merge conflicts (multiple devs editing same file)
- ❌ Difficult to test (tightly coupled code)
- ❌ Slow IDE performance (large file)

---

## Target Architecture

```
/src
  /core
    state.js              # Global state, counters (50 lines)
    events.js             # Event bus for cross-module communication (80 lines)

  /services
    taskService.js        # Task CRUD operations (200 lines)
    projectService.js     # Project CRUD operations (150 lines)
    storage.js            # KV operations (use existing storage-client.js)

  /ui
    modal.js              # Modal open/close, state management (150 lines)
    notification.js       # Toast notifications (80 lines)
    navigation.js         # Page routing, nav highlighting (100 lines)
    dropdown.js           # Custom dropdowns (status, priority, project) (200 lines)

  /views
    dashboard.js          # renderDashboard(), dashboard logic (300 lines)
    kanban.js             # renderTasks(), setupDragDrop() (400 lines)
    listView.js           # renderListView(), sorting (200 lines)
    calendar.js           # renderCalendar(), month navigation (350 lines)
    projectsView.js       # renderProjects(), expand/collapse (300 lines)

  /components
    taskCard.js           # Task card HTML generation (150 lines)
    filters.js            # Filter UI and getFilteredTasks() (250 lines)
    taskDetails.js        # openTaskDetails(), task modal content (300 lines)

  /utils
    date.js               # formatDate(), date calculations (100 lines)
    colors.js             # getProjectColor(), getTagColor() (80 lines)
    html.js               # escapeHtml(), sanitization (50 lines)
    validation.js         # Form validation helpers (100 lines)

  /config
    constants.js          # Valid statuses, priorities, colors (50 lines)

  main.js                 # Entry point, init(), event delegation (300 lines)
```

**Total Modules:** ~20 files

**Average Size:** ~200 lines/file

**Benefits:**
- ✅ Easy to find code (clear module names)
- ✅ Lower cognitive load (focused modules)
- ✅ Fewer merge conflicts (separate files)
- ✅ Easier to test (isolated functions)
- ✅ Faster IDE (smaller files)

---

## Migration Strategy

### Phase 1: Pure Functions (Week 1)
**Target:** Zero-risk extraction of pure utility functions

**Order:**
1. **utils/html.js** - `escapeHtml()`, `sanitizeInput()`
2. **utils/date.js** - `formatDate()`, date calculations
3. **utils/colors.js** - `getProjectColor()`, `getTagColor()`
4. **config/constants.js** - Status, priority enums

**Risk:** ⚠️ Low (no side effects, no state)

**Testing:** Import in console, call functions, verify output

### Phase 2: Services (Week 2)
**Target:** Extract data operations with minimal state dependencies

**Order:**
1. **services/storage.js** - Wrap storage-client.js, add helpers
2. **services/taskService.js** - `createTask()`, `updateTask()`, `deleteTask()`
3. **services/projectService.js** - `createProject()`, `updateProject()`, `deleteProject()`

**Risk:** ⚠️⚠️ Medium (touches global state)

**Testing:** Create/edit/delete tasks and projects, verify persistence

### Phase 3: UI Utilities (Week 3)
**Target:** Extract UI helpers that don't render full views

**Order:**
1. **ui/notification.js** - `showNotification()`, `showErrorNotification()`
2. **ui/modal.js** - `openModal()`, `closeModal()`, modal state
3. **ui/dropdown.js** - Dropdown setup functions
4. **components/filters.js** - `getFilteredTasks()`, filter UI

**Risk:** ⚠️⚠️ Medium (modifies DOM)

**Testing:** Open/close modals, show notifications, filter tasks

### Phase 4: Views (Week 4)
**Target:** Extract rendering functions

**Order:**
1. **views/dashboard.js** - `renderDashboard()`
2. **views/kanban.js** - `renderTasks()`, `setupDragAndDrop()`
3. **views/listView.js** - `renderListView()`, `sortTable()`
4. **views/calendar.js** - `renderCalendar()`, `changeMonth()`
5. **views/projectsView.js** - `renderProjects()`, expand/collapse

**Risk:** ⚠️⚠️⚠️ High (complex dependencies, heavy DOM manipulation)

**Testing:** Navigate to each page, verify rendering, test interactions

### Phase 5: Components (Week 5)
**Target:** Extract reusable component generators

**Order:**
1. **components/taskCard.js** - Task card HTML generation
2. **components/taskDetails.js** - `openTaskDetails()`, task modal

**Risk:** ⚠️⚠️ Medium (used by multiple views)

**Testing:** Verify task cards render, open task details from all views

### Phase 6: Core & Final Integration (Week 6)
**Target:** Extract state management and finalize

**Order:**
1. **core/state.js** - Global variables, getters/setters
2. **core/events.js** - Event bus for cross-module communication
3. **main.js** - Entry point, init(), event delegation
4. **Remove old app.js** - Delete monolithic file

**Risk:** ⚠️⚠️⚠️⚠️ Critical (touches everything)

**Testing:** Full regression test, all features

---

## Detailed Migration Steps

### Step 1: Create Module Structure

```bash
mkdir -p src/core
mkdir -p src/services
mkdir -p src/ui
mkdir -p src/views
mkdir -p src/components
mkdir -p src/utils
mkdir -p src/config
```

### Step 2: Extract First Module (utils/html.js)

**Example:**
```javascript
// src/utils/html.js
/**
 * HTML utility functions
 * Pure functions, no dependencies
 */

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize user input
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
    return escapeHtml(input).trim();
}
```

**Update app.js:**
```javascript
// Add at top of app.js
import { escapeHtml, sanitizeInput } from './src/utils/html.js';

// Remove old escapeHtml function definition
// (search for "function escapeHtml" and delete it)
```

**Test:**
```javascript
// Browser console
import { escapeHtml } from './src/utils/html.js';
console.log(escapeHtml('<script>alert("xss")</script>'));
// Expected: "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
```

### Step 3: Update index.html Script Tag

```html
<!-- Old -->
<script type="module" src="app.js?v=20251108-14"></script>

<!-- New (after all modules extracted) -->
<script type="module" src="src/main.js?v=20251117-01"></script>
```

### Step 4: Run Tests After Each Module

```bash
# 1. Check JavaScript syntax
node --check src/utils/html.js
node --check app.js

# 2. Run validators (in browser console)
await import('./tests/event-delegation-validator.js');
await import('./tests/data-structure-validator.js');

# 3. Critical path test (5 min)
```

---

## Dependency Graph

**Key Dependencies:**

```
State (tasks, projects)
  ↓
Services (taskService, projectService)
  ↓
Components (taskCard, filters)
  ↓
Views (kanban, listView, calendar)
  ↓
UI (modal, notification)
  ↓
Utils (date, colors, html)
```

**Migration Order:** Bottom-up (Utils → UI → Views → Services → State)

**Why:** Minimize breaking changes, test incrementally

---

## Testing Strategy

### After Each Module Extraction

**1. Automated Validators** (30s)
```javascript
await import('./tests/event-delegation-validator.js');
await import('./tests/data-structure-validator.js');
```

**2. Module Import Test** (10s)
```javascript
// Verify module exports work
import * as module from './src/utils/html.js';
console.log(Object.keys(module)); // Should list exported functions
```

**3. Functionality Test** (2 min)
- Test features that use the extracted module
- Example: If extracting taskService, create/edit/delete tasks

**4. Full Critical Path** (5 min) - Run after every 3-4 modules
- Open task from Projects page
- Create new task
- Edit task
- Delete task
- Switch views
- Open task from Calendar

---

## Rollback Plan

### If Module Extraction Breaks Something

**Option 1: Quick Fix**
```bash
# Fix the module
# Commit fix
git add src/utils/html.js
git commit -m "Fix: Correct escapeHtml export"
```

**Option 2: Revert Module**
```bash
# Revert last commit
git revert HEAD
# Put function back in app.js
# Continue with next module
```

**Option 3: Pause & Investigate**
```bash
# Commit work-in-progress
git add .
git commit -m "WIP: Extracting utils/html.js - investigating issue"
# Debug, fix, resume
```

---

## Common Issues & Solutions

### Issue 1: Circular Dependencies

**Symptom:** `Cannot access 'X' before initialization`

**Solution:**
- Identify circular import
- Extract shared code to a new module
- Use dependency injection

**Example:**
```javascript
// Bad: Circular dependency
// taskService.js imports projectService.js
// projectService.js imports taskService.js

// Good: Shared utilities
// Extract common code to src/utils/shared.js
// Both import from shared.js
```

### Issue 2: Global State Access

**Symptom:** `tasks is not defined`

**Solution:**
- Pass state as parameters
- Or import from core/state.js

**Example:**
```javascript
// Before (global access)
function createTask(title) {
    tasks.push({ id: taskCounter++, title });
}

// After (parameter)
export function createTask(tasks, title, taskCounter) {
    return { id: taskCounter, title };
}

// Or (import state)
import { getTasks, getTaskCounter } from '../core/state.js';
export function createTask(title) {
    const tasks = getTasks();
    const id = getTaskCounter();
    return { id, title };
}
```

### Issue 3: Event Delegation Not Working

**Symptom:** Click handlers don't fire after modularization

**Solution:**
- Ensure event delegation setup runs after DOM load
- Check action handlers are registered in actions map

**Example:**
```javascript
// In main.js, ensure this runs:
document.addEventListener('DOMContentLoaded', () => {
    setupEventDelegation();
});
```

---

## Success Criteria

### Module Extraction Complete When:
- ✅ Module is <400 lines
- ✅ Clear single responsibility
- ✅ All exports documented with JSDoc
- ✅ Imports at top, exports at bottom
- ✅ No global variable access (except state.js)
- ✅ Tests pass (automated + manual)
- ✅ No console errors
- ✅ Original functionality works

### Full Modularization Complete When:
- ✅ app.js deleted
- ✅ All code in src/ modules
- ✅ main.js is entry point (<400 lines)
- ✅ All tests pass
- ✅ No regression in functionality
- ✅ Documentation updated (ARCHITECTURE.md)

---

## Timeline

**Total Estimated Time:** 6 weeks

| Phase | Duration | Modules | Risk |
|-------|----------|---------|------|
| Phase 1: Pure Functions | Week 1 | 4 modules | Low |
| Phase 2: Services | Week 2 | 3 modules | Medium |
| Phase 3: UI Utilities | Week 3 | 4 modules | Medium |
| Phase 4: Views | Week 4 | 5 modules | High |
| Phase 5: Components | Week 5 | 2 modules | Medium |
| Phase 6: Core & Integration | Week 6 | 3 modules | Critical |

**Note:** Can be accelerated if working full-time on this

---

## Documentation Updates

### After Modularization, Update:

1. **specs/ARCHITECTURE.md**
   - Document new module structure
   - Update data flow diagrams
   - List all modules with responsibilities

2. **specs/DEVELOPMENT_GUIDE.md**
   - Add "Working with Modules" section
   - Update file paths in examples
   - Document import patterns

3. **specs/CODING_CONVENTIONS.md**
   - Add module conventions
   - Document export patterns
   - File naming standards

4. **README.md**
   - Update project structure
   - Update setup instructions

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create tracking issues** (one per phase)
3. **Start with Phase 1** (utils/html.js)
4. **Test after each module**
5. **Commit incrementally**
6. **Update docs as we go**

---

**Last Updated:** 2025-11-17
**Version:** 1.0.0
**Status:** DRAFT (awaiting approval)

See also:
- [ARCHITECTURE.md](../../specs/ARCHITECTURE.md) - Current architecture
- [TESTING_GUIDE.md](../../specs/TESTING_GUIDE.md) - Testing procedures
- [DEVELOPMENT_GUIDE.md](../../specs/DEVELOPMENT_GUIDE.md) - Development workflow
