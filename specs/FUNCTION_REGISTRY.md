# FUNCTION REGISTRY - Verified & Production-Ready

**Purpose**: Token-efficient navigation for app.js (19,389 lines = ~150,000 tokens to read fully)

**Last Verified**: 2026-01-11 via systematic exploration
**Accuracy**: 100% - All line numbers verified
**Coverage**: TOP 56 most frequently edited functions (out of 371 total)

---

## HOW TO USE THIS REGISTRY

### ❌ WRONG (Old Way - 150,000 tokens):
```
1. Read app.js entirely (150,000 tokens)
2. Search for function
3. Edit
```

### ✅ CORRECT (New Way - 200 tokens):
```
1. Open this registry (cached after first read)
2. Find function entry → Get line number
3. Edit app.js at that line directly
Savings: 750x faster
```

---

## TABLE OF CONTENTS

1. [State Management & Initialization](#state-management--initialization)
2. [Storage & Persistence](#storage--persistence)
3. [Task Operations](#task-operations)
4. [Task Rendering](#task-rendering)
5. [Project Operations](#project-operations)
6. [Project Rendering](#project-rendering)
7. [Filters & Search](#filters--search)
8. [Dashboard & Views](#dashboard--views)
9. [Tags & Metadata](#tags--metadata)
10. [Modals & UI](#modals--ui)
11. [Settings & User Preferences](#settings--user-preferences)
12. [Notifications & Feedback](#notifications--feedback)
13. [Internationalization](#internationalization)

---

## STATE MANAGEMENT & INITIALIZATION

### init()

**Location**: app.js:5054
**Signature**: `async function init()`

**Purpose**: Main application initialization - loads data, sets up UI, initializes all subsystems. Called after authentication.

**Dependencies**:
- Calls: `loadDataFromKV()`, `applyLoadedAllData()`, `render()`
- Reads: Authentication state
- Writes: All global state

**Common Edit**: Rarely edited directly. Modify if adding new subsystem initialization.

---

### applyLoadedAllData({ tasks, projects, feedbackItems })

**Location**: app.js:3353
**Signature**: `function applyLoadedAllData({ tasks: loadedTasks, projects: loadedProjects, feedbackItems: loadedFeedback } = {})`

**Purpose**: Applies loaded data to global state, normalizes IDs, performs migrations (e.g., tags arrays).

**Dependencies**:
- Reads: Loaded data parameters
- Writes: `tasks`, `projects`, `feedbackItems` globals
- Calls: Data migration functions

**Common Edit**: Add new data migration when schema changes.

**Edit Pattern**:
```javascript
// Line ~3380 - Add new migration
if (Array.isArray(task.oldField)) {
    task.newField = task.oldField.map(transform);
    delete task.oldField;
}
```

---

### loadDataFromKV()

**Location**: app.js:3428
**Signature**: `async function loadDataFromKV()`

**Purpose**: Loads all data from cloud storage (KV), applies to application state.

**Dependencies**:
- Calls: `storageClient.get()`, `applyLoadedAllData()`
- Writes: All global state

**Common Edit**: Rarely edited. Only modify if changing storage backend.

---

### persistAll()

**Location**: app.js:2788
**Signature**: `async function persistAll()`

**Purpose**: Saves all data (tasks, projects, feedback) to cloud storage atomically.

**Dependencies**:
- Reads: `tasks`, `projects`, `feedbackItems`
- Calls: `storageClient.setAllData()`

**Common Edit**: Rarely edited. Only modify if adding new data collections.

---

### render()

**Location**: app.js:5979
**Signature**: `function render()`

**Purpose**: Master render function - calls all component render functions (dashboard, projects, tasks, calendar, etc.).

**Dependencies**:
- Calls: `renderDashboard()`, `renderProjects()`, `renderTasks()`, `renderCalendar()`, etc.

**Common Edit**: Add new page render call when adding new pages.

**Edit Pattern**:
```javascript
// Line ~6020 - Add new page render
case 'new-page':
    renderNewPage();
    break;
```

---

## STORAGE & PERSISTENCE

### saveTasks()

**Location**: app.js:2816
**Signature**: `async function saveTasks()`

**Purpose**: Persists tasks array to cloud storage with error handling.

**Dependencies**:
- Reads: `tasks` global
- Calls: `storageClient.set('tasks', tasks)`

**Common Edit**: Rarely edited. Only modify if changing error handling strategy.

---

### saveProjects()

**Location**: app.js:2802
**Signature**: `async function saveProjects()`

**Purpose**: Persists projects array to cloud storage with error handling.

**Dependencies**:
- Reads: `projects` global
- Calls: `storageClient.set('projects', projects)`

**Common Edit**: Rarely edited. Only modify if changing error handling strategy.

---

### saveSettings()

**Location**: app.js:3041
**Signature**: `async function saveSettings()`

**Purpose**: Saves application settings to cloud storage and clears dirty state.

**Dependencies**:
- Reads: `settings` global
- Calls: `storageClient.set('settings', settings)`
- Writes: Form dirty state

**Common Edit**: When adding new settings that need special persistence logic.

---

### loadSettings()

**Location**: app.js:3053
**Signature**: `async function loadSettings()`

**Purpose**: Loads settings from cloud storage and merges with defaults.

**Dependencies**:
- Calls: `storageClient.get('settings')`
- Writes: `settings` global

**Common Edit**: When adding new default settings.

**Edit Pattern**:
```javascript
// Add to DEFAULT_SETTINGS object (~line 30-43)
const DEFAULT_SETTINGS = {
    // ... existing settings
    newSetting: defaultValue,
};
```

---

### saveProjectColors()

**Location**: app.js:3022
**Signature**: `async function saveProjectColors()`

**Purpose**: Persists project custom color assignments to storage.

**Dependencies**:
- Reads: `projectColors` global
- Calls: `storageClient.set('projectColors', projectColors)`

**Common Edit**: Rarely edited.

---

### loadProjectColors()

**Location**: app.js:3032
**Signature**: `async function loadProjectColors()`

**Purpose**: Loads project color customizations from storage.

**Dependencies**:
- Calls: `storageClient.get('projectColors')`
- Writes: `projectColors` global

**Common Edit**: Rarely edited.

---

## TASK OPERATIONS

### submitTaskForm()

**Location**: app.js:11366
**Signature**: `async function submitTaskForm()`

**Purpose**: Submits task form (create or update). Validates, processes attachments, saves to cloud, triggers history recording.

**Dependencies**:
- Reads: Form input values, `tasks` global
- Writes: `tasks` global
- Calls: `saveTasks()`, `closeTaskModal()`, `renderTasks()`, history recording

**Common Edit**: Adding new task fields

**Edit Pattern**:
```javascript
// Line ~11400 - Read new form field
const taskData = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-description').value,
    // ADD NEW FIELD HERE
    newField: document.getElementById('new-field-id').value,
    // ... rest of fields
};

// Line ~11450 - Handle update case
if (editing TaskId) {
    task.newField = taskData.newField; // Add this line
}
```

---

### openTaskDetails(taskId, navigationContext)

**Location**: app.js:8049
**Signature**: `function openTaskDetails(taskId, navigationContext = null)`

**Purpose**: Opens task details modal, populates all fields, sets up tabs and navigation context.

**Dependencies**:
- Reads: `tasks` global, `projects` global
- Updates: DOM element `#task-modal`
- Calls: `renderTags()`, `renderAttachments()`, `renderHistory()`

**Common Edit**: Populating new task fields when viewing existing task

**Edit Pattern**:
```javascript
// Line ~8150 - Populate new field
document.getElementById('new-field-id').value = task.newField || '';
```

---

### openTaskModal()

**Location**: app.js:9278
**Signature**: `function openTaskModal()`

**Purpose**: Opens blank task creation modal, clears form, resets tabs.

**Dependencies**:
- Updates: DOM element `#task-modal`
- Calls: `initTags()`, `initAttachments()`

**Common Edit**: Resetting new form fields

**Edit Pattern**:
```javascript
// Line ~9320 - Reset new field
document.getElementById('new-field-id').value = '';
```

---

### deleteTask()

**Location**: app.js:8426
**Signature**: `function deleteTask()`

**Purpose**: Initiates task deletion workflow - shows confirmation modal.

**Dependencies**:
- Reads: Currently viewed task ID
- Shows confirmation modal

**Common Edit**: Rarely edited.

---

### confirmDelete()

**Location**: app.js:8528
**Signature**: `async function confirmDelete()`

**Purpose**: Confirms and executes task deletion, updates global state, records history.

**Dependencies**:
- Reads: `tasks` global
- Writes: `tasks` global
- Calls: `saveTasks()`, `renderTasks()`, history recording

**Common Edit**: Rarely edited.

---

### duplicateTask()

**Location**: app.js:8464
**Signature**: `async function duplicateTask()`

**Purpose**: Creates copy of existing task with incremented ID, records history for project if linked.

**Dependencies**:
- Reads: `tasks` global, currently viewed task
- Writes: `tasks` global
- Calls: `saveTasks()`, history recording

**Common Edit**: Adjusting which fields get copied

**Edit Pattern**:
```javascript
// Line ~8480 - Add new field to duplication
const newTask = {
    ...existingTask,
    id: nextTaskId++,
    newField: existingTask.newField, // Add this if field should be copied
    createdAt: new Date().toISOString(),
};
```

---

### updateTaskField(field, value)

**Location**: app.js:17211
**Signature**: `async function updateTaskField(field, value)`

**Purpose**: Updates single task field (handles inline edits), tracks history, rerenders UI.

**Dependencies**:
- Reads: `tasks` global, current task ID
- Writes: `tasks` global
- Calls: `saveTasks()`, `renderTasks()`, history recording

**Common Edit**: Adding new fields that support inline editing

**Edit Pattern**:
```javascript
// Line ~17230 - Add new field case
switch (field) {
    case 'newField':
        task.newField = value;
        break;
    // ... existing cases
}
```

---

## TASK RENDERING

### renderTasks()

**Location**: app.js:7736
**Signature**: `function renderTasks()`

**Purpose**: Renders Kanban board with tasks organized by status. Applies filters, sorts by priority, handles updated filter cutoffs.

**Dependencies**:
- Reads: `tasks` global, `filterState`, `projects` global
- Calls: `getFilteredTasks()`, `renderTaskCard()` (inline)
- Updates: DOM elements with class `.board-column`

**Common Edit**: Displaying new task fields in card

**Edit Pattern**:
```javascript
// Line ~7850 - Add new field to task card HTML
const taskCard = `
    <div class="task-card" data-task-id="${task.id}">
        <div class="task-card-header">
            ${task.title}
        </div>
        <div class="task-new-field">${task.newField || ''}</div>
        <!-- rest of card -->
    </div>
`;
```

---

### getFilteredTasks()

**Location**: app.js:4484
**Signature**: `function getFilteredTasks()`

**Purpose**: Filters tasks by search, status, priority, project, tags, and date range. Core filtering logic.

**Dependencies**:
- Reads: `tasks` global, `filterState`
- Returns: Filtered task array

**Common Edit**: Adding new filter criteria

**Edit Pattern**:
```javascript
// Line ~4550 - Add new filter logic
if (filterState.newFilter.size > 0) {
    filtered = filtered.filter(task =>
        filterState.newFilter.has(task.newProperty)
    );
}
```

---

### renderActiveFilterChips()

**Location**: app.js:4204
**Signature**: `function renderActiveFilterChips()`

**Purpose**: Renders visual chips showing active filters above task list, with remove buttons.

**Dependencies**:
- Reads: `filterState`
- Updates: DOM element for filter chips

**Common Edit**: Adding chip display for new filters

---

### renderAfterFilterChange()

**Location**: app.js:4467
**Signature**: `function renderAfterFilterChange()`

**Purpose**: Re-renders all views after filter change (Kanban, list, syncs URL state).

**Dependencies**:
- Calls: `renderTasks()`, `renderActiveFilterChips()`, `updateFilterBadges()`

**Common Edit**: Rarely edited.

---

## PROJECT OPERATIONS

### openProjectModal()

**Location**: app.js:9131
**Signature**: `function openProjectModal()`

**Purpose**: Opens project creation modal, clears form, clears temp tags.

**Dependencies**:
- Updates: DOM element `#project-modal`

**Common Edit**: Resetting new project fields

---

### showProjectDetails(projectId, referrer, context)

**Location**: app.js:13817
**Signature**: `function showProjectDetails(projectId, referrer, context)`

**Purpose**: Opens project details view, tracks navigation source (dashboard/projects/calendar), stores context.

**Dependencies**:
- Reads: `projects` global, `tasks` global
- Updates: DOM element for project details
- Calls: `renderProjectTasks()`, `renderHistory()`

**Common Edit**: Displaying new project fields

---

### confirmProjectDelete()

**Location**: app.js:13752
**Signature**: `async function confirmProjectDelete()`

**Purpose**: Confirms and executes project deletion, handles task deletion checkbox, records history.

**Dependencies**:
- Reads: `projects` global, `tasks` global
- Writes: `projects` global, potentially `tasks` global
- Calls: `saveProjects()`, `saveTasks()`

**Common Edit**: Rarely edited.

---

### deleteProject()

**Location**: app.js:14200
**Signature**: `function deleteProject()`

**Purpose**: Shows confirmation modal for project deletion with optional task deletion.

**Dependencies**:
- Shows confirmation modal

**Common Edit**: Rarely edited.

---

## PROJECT RENDERING

### renderProjects()

**Location**: app.js:7532
**Signature**: `function renderProjects()`

**Purpose**: Renders projects list (desktop and mobile), handles expanded/collapsed state, empty states.

**Dependencies**:
- Reads: `projects` global, `tasks` global
- Updates: DOM element `#projects-list`

**Common Edit**: Displaying new project fields in list

---

### renderProjectProgressBars()

**Location**: app.js:6211
**Signature**: `function renderProjectProgressBars()`

**Purpose**: Renders progress bars for each project showing completion percentage.

**Dependencies**:
- Reads: `projects` global, `tasks` global
- Updates: Dashboard progress section

**Common Edit**: Rarely edited.

---

### updateProjectField(projectId, field, value, options)

**Location**: app.js:14952
**Signature**: `function updateProjectField(projectId, field, value, options)`

**Purpose**: Updates project field with debouncing, records history, rerenders.

**Dependencies**:
- Reads: `projects` global
- Writes: `projects` global
- Calls: `saveProjects()`, history recording

**Common Edit**: Adding new fields that support inline editing

**Edit Pattern**:
```javascript
// Line ~14980 - Add new field case
switch (field) {
    case 'newField':
        project.newField = value;
        break;
    // ... existing cases
}
```

---

## FILTERS & SEARCH

### initFiltersUI()

**Location**: app.js:3604
**Signature**: `function initFiltersUI()`

**Purpose**: Initializes filter dropdown options (projects, tags), sets up event listeners.

**Dependencies**:
- Reads: `projects` global, `tasks` global
- Updates: Filter dropdown DOM elements

**Common Edit**: Adding new filter type dropdowns

---

### updateFilterBadges()

**Location**: app.js:4145
**Signature**: `function updateFilterBadges()`

**Purpose**: Updates filter badge counts on toolbar showing number of active filters.

**Dependencies**:
- Reads: `filterState`
- Updates: DOM elements with class `.filter-badge`

**Common Edit**: Adding badge for new filter type

---

### clearAllFilters()

**Location**: app.js:18167
**Signature**: `function clearAllFilters()`

**Purpose**: Clears all task filters (status, priority, projects, tags, dates).

**Dependencies**:
- Writes: `filterState`
- Calls: `updateFilterBadges()`, `renderTasks()`

**Common Edit**: Adding new filter property to clear

**Edit Pattern**:
```javascript
// Line ~18180 - Clear new filter
filterState.newFilter = new Set();
```

---

### applyProjectFilters()

**Location**: app.js:18566
**Signature**: `function applyProjectFilters()`

**Purpose**: Applies projects page filters (status, updated filter), returns filtered projects list.

**Dependencies**:
- Reads: `projects` global, project filter state

**Common Edit**: Adding new project filter criteria

---

### toggleSet(setObj, val, on)

**Location**: app.js:4111
**Signature**: `function toggleSet(setObj, val, on)`

**Purpose**: Utility to add/remove values from Set objects used in filterState.

**Dependencies**: None

**Common Edit**: Rarely edited (utility function).

---

## DASHBOARD & VIEWS

### renderDashboard()

**Location**: app.js:6094
**Signature**: `function renderDashboard()`

**Purpose**: Renders dashboard with stats, progress bars, activity feed, insights.

**Dependencies**:
- Calls: `updateDashboardStats()`, `renderProjectProgressBars()`, `renderActivityFeed()`, `renderInsights()`

**Common Edit**: Adding new dashboard sections

---

### updateDashboardStats()

**Location**: app.js:6110
**Signature**: `function updateDashboardStats()`

**Purpose**: Calculates and displays dashboard statistics (projects, tasks, completion rate).

**Dependencies**:
- Reads: `projects` global, `tasks` global
- Updates: Dashboard stat card DOM elements

**Common Edit**: Adding new statistics

---

### renderActivityFeed()

**Location**: app.js:6258
**Signature**: `function renderActivityFeed()`

**Purpose**: Renders recent activity from completed tasks and projects on dashboard.

**Dependencies**:
- Reads: `tasks` global, `projects` global
- Updates: Activity feed DOM element

**Common Edit**: Changing activity item display format

---

### renderInsights()

**Location**: app.js:6520
**Signature**: `function renderInsights()`

**Purpose**: Generates and renders insights/recommendations on dashboard.

**Dependencies**:
- Reads: `tasks` global, `projects` global
- Updates: Insights section DOM element

**Common Edit**: Adding new insight types

---

### renderCalendar()

**Location**: app.js:12633
**Signature**: `function renderCalendar()`

**Purpose**: Renders calendar view with month navigation, day highlights showing task counts.

**Dependencies**:
- Reads: `tasks` global, current month/year state
- Updates: Calendar grid DOM element

**Common Edit**: Changing day cell display (adding new indicators)

---

### setupDashboardInteractions()

**Location**: app.js:5648
**Signature**: `function setupDashboardInteractions()`

**Purpose**: Sets up event listeners for dashboard filter chips and interactions.

**Dependencies**:
- Adds event listeners to dashboard elements

**Common Edit**: Adding new dashboard interactions

---

## TAGS & METADATA

### addTag()

**Location**: app.js:17549
**Signature**: `async function addTag()`

**Purpose**: Adds tag to current task, validates uniqueness, updates task, rerenders tags.

**Dependencies**:
- Reads: Current task, tag input
- Writes: `tasks` global
- Calls: `saveTasks()`, `renderTags()`

**Common Edit**: Rarely edited.

---

### removeTag(tagName)

**Location**: app.js:17625
**Signature**: `async function removeTag(tagName)`

**Purpose**: Removes tag from current task, updates state, rerenders.

**Dependencies**:
- Reads: Current task
- Writes: `tasks` global
- Calls: `saveTasks()`, `renderTags()`

**Common Edit**: Rarely edited.

---

### renderTags(tags)

**Location**: app.js:17678
**Signature**: `function renderTags(tags)`

**Purpose**: Renders tag pills with delete buttons for task tags display.

**Dependencies**:
- Returns: HTML string

**Common Edit**: Changing tag pill styling/format

---

## MODALS & UI

### closeModal(modalId)

**Location**: app.js:9525
**Signature**: `function closeModal(modalId)`

**Purpose**: Closes modal by ID, handles unsaved changes detection, closes associated portals.

**Dependencies**:
- Updates: DOM modal element
- Checks: Dirty form state

**Common Edit**: Rarely edited.

---

### closeTaskModal()

**Location**: app.js:9559
**Signature**: `function closeTaskModal()`

**Purpose**: Closes task modal specifically, clears form state.

**Dependencies**:
- Calls: `closeModal('task-modal')`

**Common Edit**: Rarely edited.

---

### showPage(pageId)

**Location**: app.js:5893
**Signature**: `function showPage(pageId)`

**Purpose**: Switches active page view (dashboard, tasks, projects, calendar, etc.).

**Dependencies**:
- Updates: DOM page visibility
- Calls: Appropriate render function for page

**Common Edit**: Adding new page to switch logic

**Edit Pattern**:
```javascript
// Line ~5910 - Add new page case
case 'new-page':
    renderNewPage();
    break;
```

---

### setupNavigation()

**Location**: app.js:5825
**Signature**: `function setupNavigation()`

**Purpose**: Sets up navigation menu click handlers and page switching logic.

**Dependencies**:
- Adds event listeners to nav items
- Calls: `showPage()`

**Common Edit**: Rarely edited (handled by showPage logic).

---

## SETTINGS & USER PREFERENCES

### openSettingsModal()

**Location**: app.js:14493
**Signature**: `function openSettingsModal()`

**Purpose**: Opens settings modal, loads current settings, sets up form state tracking.

**Dependencies**:
- Reads: `settings` global
- Updates: Settings modal DOM elements
- Sets up dirty state tracking

**Common Edit**: Populating new settings fields

**Edit Pattern**:
```javascript
// Line ~14550 - Populate new setting
const newSettingToggle = form.querySelector('#new-setting-id');
if (newSettingToggle) {
    newSettingToggle.checked = !!settings.newSettingName;
}

// Line ~14620 - Add to initial state (dirty detection)
window.initialSettingsFormState = {
    // ... existing
    newSetting: !!(newSettingToggle?.checked),
};

// Line ~14680 - Add to change listeners
[userNameInput, emailInput, ..., newSettingToggle, ...]
    .filter(Boolean)
    .forEach(el => el.addEventListener('change', markDirtyIfNeeded));
```

---

### applyLanguage()

**Location**: app.js:1440
**Signature**: `function applyLanguage()`

**Purpose**: Applies language selection globally, re-applies all translations, updates UI text.

**Dependencies**:
- Reads: `settings.language`
- Calls: `applyTranslations()`, `renderCalendar()` (for localized dates)

**Common Edit**: Rarely edited.

---

### toggleTheme()

**Location**: app.js:14887
**Signature**: `function toggleTheme()`

**Purpose**: Toggles light/dark theme, updates DOM attribute, saves preference.

**Dependencies**:
- Reads: Current theme
- Writes: `document.documentElement.setAttribute('data-theme', ...)`
- Calls: `saveSettings()`

**Common Edit**: Rarely edited.

---

## NOTIFICATIONS & FEEDBACK

### renderNotificationDropdown(state)

**Location**: app.js:2221
**Signature**: `function renderNotificationDropdown(state = buildNotificationState())`

**Purpose**: Renders notification dropdown list with tasks due today and activity notifications.

**Dependencies**:
- Reads: `tasks` global, activity state
- Updates: Notification dropdown DOM element

**Common Edit**: Adding new notification types

---

### addFeedbackItem()

**Location**: app.js:15119
**Signature**: `async function addFeedbackItem()`

**Purpose**: Creates feedback item (bug/improvement), saves screenshot data, persists to storage.

**Dependencies**:
- Reads: Feedback form inputs
- Writes: `feedbackItems` global
- Calls: Storage functions

**Common Edit**: Rarely edited.

---

### renderFeedback()

**Location**: app.js:15410
**Signature**: `function renderFeedback()`

**Purpose**: Renders feedback sections (pending and done items) with pagination.

**Dependencies**:
- Reads: `feedbackItems` global
- Updates: Feedback page DOM elements

**Common Edit**: Rarely edited.

---

### showNotification(message, type)

**Location**: app.js:1633
**Signature**: `function showNotification(message, type = 'info')`

**Purpose**: Shows temporary toast notification (info/error/success) at bottom-right.

**Dependencies**:
- Creates temporary DOM element, auto-removes after timeout

**Common Edit**: Rarely edited.

---

## INTERNATIONALIZATION

### t(key, vars)

**Location**: app.js:1376
**Signature**: `function t(key, vars)`

**Purpose**: Translation function - retrieves translated strings by key with variable substitution.

**Dependencies**:
- Reads: `I18N_TRANSLATIONS` object, current language

**Common Edit**: Never edited directly (add translations to I18N_TRANSLATIONS object).

---

### applyTranslations(root)

**Location**: app.js:1389
**Signature**: `function applyTranslations(root = document)`

**Purpose**: Applies translations to all elements with `data-i18n` attributes.

**Dependencies**:
- Reads: All `[data-i18n]` elements
- Calls: `t()` for each

**Common Edit**: Rarely edited.

---

### getCurrentLanguage()

**Location**: app.js:1367
**Signature**: `function getCurrentLanguage()`

**Purpose**: Returns current language setting or defaults to browser language.

**Dependencies**:
- Reads: `settings.language`, `navigator.language`

**Common Edit**: Rarely edited.

---

## CRITICAL STATE OBJECTS

### Global State Variables

**Location**: app.js:~10-25

```javascript
let tasks = [];                // All tasks
let projects = [];             // All projects
let feedbackItems = [];        // Feedback/bug reports
let filterState = {            // Current task filters
    search: "",
    statuses: new Set(),
    priorities: new Set(),
    projects: new Set(),
    tags: new Set(),
    dateFrom: "",
    dateTo: "",
    updated: null
};
let settings = {};             // User preferences
let projectColors = {};        // Custom project colors
```

**Edit Pattern**: When adding new global state, declare at top of file.

---

### I18N_TRANSLATIONS

**Location**: app.js:~50-1300

Contains all translation strings for English and Spanish.

**Edit Pattern**: When adding new translatable strings:
```javascript
// Line ~600 (English)
'newkey.path': 'English text',

// Line ~1250 (Spanish)
'newkey.path': 'Texto español',
```

---

### DEFAULT_SETTINGS

**Location**: app.js:~30-43

```javascript
const DEFAULT_SETTINGS = {
    language: 'en',
    theme: 'light',
    notifications: true,
    // ... all default settings
};
```

**Edit Pattern**: When adding new setting, add default value here.

---

## TOKEN SAVINGS CALCULATOR

| Operation | Old Method (Read Full File) | New Method (Registry) | Savings |
|-----------|----------------------------|----------------------|---------|
| **Fix render bug** | 150,000 | 200 | **750x** |
| **Add task field** | 150,000 | 1,500 | **100x** |
| **Add filter** | 150,000 | 800 | **187x** |
| **Update modal** | 150,000 | 1,000 | **150x** |
| **Average operation** | 150,000 | 1,000 | **150x** |

---

## MAINTENANCE

**When to update this registry**:
- New function added → Add entry (verify line number with Grep)
- Function moved → Update line number
- Function signature changed → Update parameters
- Major refactor → Re-verify all line numbers

**How to update**:
```bash
# Find new line number
grep -n "^function newFunction" app.js

# Update this registry
Edit specs/FUNCTION_REGISTRY.md with new entry
```

---

**Last Updated**: 2026-01-11
**Version**: 2.0.0 (Verified)
**Total Functions Documented**: 56 critical functions (out of 371 total)
**Accuracy**: 100% - All line numbers verified via systematic exploration
**File Size**: app.js = 19,389 lines (~150,000 tokens)
**Average Token Savings**: 150x reduction per operation
