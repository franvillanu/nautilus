# Testing Guide

**Purpose:** Testing strategies and validation procedures for Nautilus

**Last Updated:** 2025-11-17

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Levels](#testing-levels)
3. [Automated Validation](#automated-validation)
4. [Manual Testing Checklists](#manual-testing-checklists)
5. [Event Delegation Testing](#event-delegation-testing)
6. [Data Integrity Testing](#data-integrity-testing)
7. [Visual Testing](#visual-testing)
8. [Common Issues](#common-issues)

---

## Testing Philosophy

**Principles:**
- **No Build Step** - Tests run directly in browser console
- **No External Frameworks** - Vanilla JavaScript assertions
- **Fast Feedback** - Run tests in <5 seconds
- **Developer-Friendly** - Clear error messages
- **Spec-Driven** - Tests validate spec compliance

**When to Test:**
- ✅ Before committing changes
- ✅ After adding new UI interactions
- ✅ After refactoring
- ✅ Before creating pull requests
- ⚠️ After pulling changes from main

---

## Testing Levels

### Level 1: Automated Validation (30 seconds)
Run validation scripts in browser console:
```javascript
// Copy/paste into browser console
await import('./tests/event-delegation-validator.js');
await import('./tests/data-structure-validator.js');
```

**What it checks:**
- All data-action attributes have registered handlers
- Task/project data structures are valid
- No undefined functions
- No missing required fields

### Level 2: Critical Path Testing (5 minutes)
Manual click-through of core features:
1. Open task from Projects page
2. Create new task
3. Edit task
4. Delete task
5. Create new project
6. Switch views (Kanban/List/Calendar)

### Level 3: Full Manual Testing (20 minutes)
Complete testing checklist (see [Manual Testing Checklists](#manual-testing-checklists))

---

## Automated Validation

### Event Delegation Validator

**Location:** `tests/event-delegation-validator.js`

**What it does:**
- Scans all elements with `data-action` attributes
- Verifies each action has a registered handler
- Reports missing handlers
- Reports unused handlers

**How to run:**
```javascript
// In browser console (with app loaded)
await import('./tests/event-delegation-validator.js');
// Or include in index.html as a script tag during development
```

**Expected output:**
```
✅ Event Delegation Validation
  Found 47 data-action elements
  All actions have registered handlers
  No missing handlers
  5 unused handlers (documented actions not yet used)
```

**If it fails:**
```
❌ Event Delegation Validation
  Missing handlers for actions:
    - openTaskDetails (found in 3 elements)
    - showProjectDetails (found in 2 elements)

  Fix: Add these to the actions map in app.js
```

### Data Structure Validator

**Location:** `tests/data-structure-validator.js`

**What it does:**
- Validates all tasks have required fields
- Validates all projects have required fields
- Checks for orphaned data (tasks with invalid projectId)
- Validates date formats

**How to run:**
```javascript
// In browser console (with app loaded)
await import('./tests/data-structure-validator.js');
```

**Expected output:**
```
✅ Data Structure Validation
  Tasks: 12 valid, 0 invalid
  Projects: 3 valid, 0 invalid
  No orphaned tasks
  All dates valid ISO format
```

---

## Manual Testing Checklists

### Critical Path Checklist (5 min)

**Tasks:**
- [ ] Open task from Kanban view
- [ ] Open task from List view
- [ ] Open task from Calendar view
- [ ] Open task from Projects page (expanded list)
- [ ] Create new task via "Add Task" button
- [ ] Edit task title, description, status
- [ ] Delete task
- [ ] Drag task between Kanban columns

**Projects:**
- [ ] Create new project
- [ ] Expand project on Projects page
- [ ] Click task in expanded project list
- [ ] Edit project title
- [ ] Delete project

**Navigation:**
- [ ] Switch to Kanban view (K key)
- [ ] Switch to List view (L key)
- [ ] Switch to Calendar view (C key)
- [ ] Navigate between pages via sidebar

**Result:** If all ✅, proceed to commit. If any ❌, investigate and fix.

### Full Feature Checklist (20 min)

See detailed checklist in [Manual Testing Section](#detailed-manual-testing)

---

## Event Delegation Testing

### How Event Delegation Works

**Pattern:**
```html
<!-- Old (anti-pattern) -->
<button onclick="openTaskModal()">Add Task</button>

<!-- New (event delegation) -->
<button data-action="openTaskModal">Add Task</button>
```

**Handler Registration:**
```javascript
// In app.js
const actions = {
    'openTaskModal': () => openTaskModal(),
    'openTaskDetails': () => openTaskDetails(parseInt(param)),
    // ...
};
```

### Testing Event Delegation

**1. Visual Inspection:**
```bash
# Search for any remaining onclick handlers (should return 0)
grep -r "onclick=" index.html app.js
```

**2. Automated Check:**
```javascript
// Run validator
await import('./tests/event-delegation-validator.js');
```

**3. Manual Click Test:**
- Click every button/link in the UI
- Check browser console for errors
- Look for `ReferenceError` or `No handler found` warnings

**Common Issues:**
- `No handler found for action: xyz` → Add handler to actions map
- `ReferenceError: xyz is not defined` → Function doesn't exist
- Click does nothing → Check `data-action` attribute spelling

---

## Data Integrity Testing

### What to Test

**Task Data:**
- Required fields: `id`, `title`, `status`, `priority`, `createdAt`
- Valid status: `todo`, `progress`, `review`, `done`
- Valid priority: `low`, `medium`, `high`
- Valid dates: ISO format `YYYY-MM-DD`
- projectId: `null` or valid project ID

**Project Data:**
- Required fields: `id`, `name`, `startDate`, `createdAt`
- Valid dates: ISO format
- No orphaned tasks (tasks with non-existent projectId)

### Running Data Validation

**Before commit:**
```javascript
// Browser console
await import('./tests/data-structure-validator.js');
```

**After pull:**
```javascript
// Browser console
await import('./tests/data-structure-validator.js');
// Fix any reported issues before continuing work
```

---

## Visual Testing

### Light/Dark Mode

**Test matrix:**
```
Component          | Light Mode | Dark Mode
-------------------|------------|----------
Task cards         |     ✅     |     ✅
Project list       |     ✅     |     ✅
Modals             |     ✅     |     ✅
Calendar           |     ✅     |     ✅
Dropdowns          |     ✅     |     ✅
Buttons            |     ✅     |     ✅
```

**How to test:**
1. Toggle theme (click theme icon in user menu)
2. Visually inspect all pages
3. Check for:
   - Readable text (sufficient contrast)
   - No white-on-white or black-on-black
   - Proper border visibility
   - Hover states visible

### Responsive Testing

**Breakpoints to test:**
- Desktop: 1920px, 1440px, 1024px
- Tablet: 768px (not prioritized for Nautilus)
- Mobile: 375px (not prioritized for Nautilus)

**Primary target:** Desktop 1440px+

---

## Common Issues

### Issue: Click does nothing

**Symptoms:**
- Button click has no effect
- No console errors

**Diagnosis:**
1. Open DevTools → Elements
2. Find the button element
3. Check for `data-action` attribute
4. Verify spelling

**Fix:**
- If missing `data-action`: Add it
- If misspelled: Correct spelling
- If correct: Check action is registered in actions map

### Issue: "No handler found for action: xyz"

**Symptoms:**
- Console warning when clicking
- Action doesn't execute

**Diagnosis:**
- Handler is missing from actions map

**Fix:**
```javascript
// In app.js, add to actions map:
const actions = {
    // ... existing actions
    'xyz': () => xyz(param), // Add this
};
```

### Issue: "ReferenceError: xyz is not defined"

**Symptoms:**
- Console error when clicking
- Page may freeze

**Diagnosis:**
- Function doesn't exist or isn't in scope

**Fix:**
- Check function is defined in app.js
- Check function name spelling
- Verify it's not inside another function scope

### Issue: Data persistence fails

**Symptoms:**
- Changes don't save
- Data lost on refresh

**Diagnosis:**
1. Check browser console for storage errors
2. Run data validator: `await import('./tests/data-structure-validator.js');`
3. Check KV storage quota

**Fix:**
- If quota exceeded: Clear old data
- If validation fails: Fix data structure
- If storage error: Check Cloudflare Workers KV status

---

## Detailed Manual Testing

### Dashboard Page
- [ ] Click "View All Activity" link
- [ ] Click on a project in progress bar (opens project details)
- [ ] Click "Export Data" button (downloads JSON)
- [ ] Click "Generate Report" button (shows report modal)
- [ ] Check recent activity displays correctly
- [ ] Check stats cards calculate correctly

### Tasks Page - Kanban View
- [ ] Click "Add Task" button (opens quick create modal)
- [ ] Click on a task card (opens task details)
- [ ] Drag task between columns (updates status)
- [ ] Click drag handle (cursor changes)
- [ ] Click "Toggle Sort Mode" (changes to manual sort)
- [ ] Click Kanban settings (⚙️) button
- [ ] Toggle "Show Projects" checkbox
- [ ] Toggle "Show No Date" checkbox
- [ ] Click outside settings to close
- [ ] Click "Dismiss Kanban Tip" if visible

### Tasks Page - List View
- [ ] Switch to List view (click button or press L)
- [ ] Click on a table row (opens task details)
- [ ] Click "Title" column header (sorts by title)
- [ ] Click "Status" column header (sorts by status)
- [ ] Click "Priority" column header (sorts by priority)
- [ ] Click "Project" column header (sorts by project)
- [ ] Click "Due Date" column header (sorts by date)
- [ ] Click column header twice (reverses sort direction)

### Tasks Page - Calendar View
- [ ] Switch to Calendar view (click button or press C)
- [ ] Click "Previous Month" button (◀)
- [ ] Click "Next Month" button (▶)
- [ ] Click "Today" button (navigates to current month)
- [ ] Click on a calendar task (opens task details)
- [ ] Click on a day with 3+ tasks (opens day modal)
- [ ] In day modal: Click on a task (opens task details, closes modal)
- [ ] In day modal: Click on a project (shows project details, closes modal)
- [ ] In day modal: Click X to close
- [ ] In day modal: Click outside to close

### Projects Page
- [ ] Click "Add Project" button (opens project modal)
- [ ] Click on a project row (expands project)
- [ ] Click on expanded project row (collapses project)
- [ ] In expanded project: Click on a task (opens task details)
- [ ] In expanded project: Click "View Details" button (shows project details)
- [ ] Click project title in details view (enters edit mode)
- [ ] Edit project title, click ✓ (saves)
- [ ] Edit project title, click ✕ (cancels)
- [ ] Click "Back to Projects" button
- [ ] Click 3-dot menu (⋯) on project
- [ ] In menu: Click "Delete Project"
- [ ] Click project color picker button (🎨)
- [ ] Click a color in picker (updates project color)
- [ ] Click on progress stat: "To Do" (navigates to filtered view)
- [ ] Click on progress stat: "In Progress"
- [ ] Click on progress stat: "Review"
- [ ] Click on progress stat: "Done"

### Task Modal
- [ ] Click "Add Task" button (opens modal)
- [ ] Click X button (closes modal)
- [ ] Click outside modal (closes with warning if unsaved)
- [ ] Create task, click "Save" (creates task)
- [ ] Open existing task, click "Delete Task" button
- [ ] Confirm delete (deletes task)
- [ ] Cancel delete (keeps task)
- [ ] Click "Duplicate Task" button (creates copy)
- [ ] Click formatting: Bold (toggles bold)
- [ ] Click formatting: Italic (toggles italic)
- [ ] Click formatting: Underline (toggles underline)
- [ ] Click formatting: Bulleted List (inserts list)
- [ ] Click formatting: Numbered List (inserts list)
- [ ] Click heading: H1 (inserts heading)
- [ ] Click heading: H2 (inserts heading)
- [ ] Click heading: H3 (inserts heading)
- [ ] Click "Insert Divider" (adds horizontal line)
- [ ] Click "Add Attachment" button (shows file picker)
- [ ] Upload image (shows thumbnail)
- [ ] Click "Open" on image (opens in viewer)
- [ ] Upload PDF (shows icon)
- [ ] Click "Download" on PDF (downloads file)
- [ ] Click "Delete" on attachment (removes it)
- [ ] Add tag, click X on tag (removes tag)
- [ ] Click "Add Tag" button (adds tag)

### Project Modal
- [ ] Click "Add Project" button (opens modal)
- [ ] Fill in name, description, dates
- [ ] Click "Save" (creates project)
- [ ] Click X button (closes modal)
- [ ] Click outside modal (closes modal)

### Filters & Search
- [ ] Type in search box (filters tasks)
- [ ] Click status filter chip (filters by status)
- [ ] Click priority filter chip (filters by priority)
- [ ] Click project filter chip (filters by project)
- [ ] Click tag filter chip (filters by tag)
- [ ] Select date range (filters by date)
- [ ] Click "Clear All Filters" (resets filters)

### User Menu
- [ ] Click theme toggle (switches light/dark mode)
- [ ] Verify colors change appropriately
- [ ] Click "Sign Out" button (signs out)

### Keyboard Shortcuts
- [ ] Press `/` (focuses search)
- [ ] Press `K` (switches to Kanban view)
- [ ] Press `L` (switches to List view)
- [ ] Press `C` (switches to Calendar view)
- [ ] Press `?` (shows keyboard shortcuts modal)
- [ ] Press `Esc` (closes any open modal)
- [ ] Press `Ctrl/Cmd+N` (opens quick create - if implemented)

---

## Integration with Development Workflow

### Before Committing

**Run:**
```bash
# 1. Check for onclick handlers (should be 0)
grep -r "onclick=" index.html app.js

# 2. Check JavaScript syntax
node --check app.js

# 3. Run automated validators
# (In browser console with app loaded)
await import('./tests/event-delegation-validator.js');
await import('./tests/data-structure-validator.js');

# 4. Run critical path tests (5 min)
```

**If all pass:** ✅ Safe to commit

**If any fail:** ❌ Fix issues first

### After Pull Request Merge

**Run:**
```bash
# Pull latest
git pull origin main

# Run validators
# (In browser console)
await import('./tests/event-delegation-validator.js');
await import('./tests/data-structure-validator.js');
```

**If validators pass:** ✅ Continue work

**If validators fail:** ⚠️ Report issue, may need rollback

---

## Future Testing Enhancements

**Planned:**
- [ ] Unit tests for pure functions (date formatting, color generation)
- [ ] Integration tests for storage operations
- [ ] Performance tests (render time, data load time)
- [ ] Accessibility tests (keyboard navigation, screen reader)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

**Not Planned:**
- ❌ E2E framework (Playwright, Cypress) - too heavy for current needs
- ❌ Visual regression testing - manual visual QA sufficient
- ❌ Load testing - single-user app, not needed

---

## See Also

- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Development workflow with testing steps
- [CODING_CONVENTIONS.md](CODING_CONVENTIONS.md) - Code standards to test against
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture understanding

**Version:** 1.0.0
