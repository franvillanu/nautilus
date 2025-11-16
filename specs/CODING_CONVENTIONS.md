# Nautilus Coding Conventions

This document defines coding standards and best practices for the Nautilus project. Following these conventions ensures consistency, maintainability, and quality across the codebase.

---

## Table of Contents

1. [JavaScript Conventions](#javascript-conventions)
2. [HTML Conventions](#html-conventions)
3. [CSS Conventions](#css-conventions)
4. [Naming Conventions](#naming-conventions)
5. [Code Organization](#code-organization)
6. [Comment Guidelines](#comment-guidelines)
7. [Error Handling](#error-handling)
8. [Data Handling](#data-handling)
9. [Performance Best Practices](#performance-best-practices)
10. [Security Guidelines](#security-guidelines)

---

## JavaScript Conventions

### General Rules

**Use ES6+ Features:**
```javascript
// ✅ Good - Use const/let
const maxTasks = 100;
let currentFilter = '';

// ❌ Bad - Don't use var
var maxTasks = 100;

// ✅ Good - Use arrow functions
tasks.filter(t => t.status === 'done');

// ❌ Bad - Unnecessary function keyword for simple cases
tasks.filter(function(t) { return t.status === 'done'; });

// ✅ Good - Use template literals
const message = `Task "${task.title}" created successfully`;

// ❌ Bad - String concatenation
const message = 'Task "' + task.title + '" created successfully';

// ✅ Good - Use destructuring
const { id, title, status } = task;

// ❌ Bad
const id = task.id;
const title = task.title;
const status = task.status;
```

### Variable Declarations

**Use const by default, let when reassignment is needed:**
```javascript
// ✅ Good
const projects = [];              // Won't be reassigned (array contents can change)
let filterState = {};             // May be reassigned
const MAX_FILE_SIZE = 20971520;   // Constant value

// ❌ Bad
let projects = [];                // Implies it might be reassigned
const filterState = {};           // Misleading if it gets reassigned
```

### Function Declarations

**Use function declarations for top-level functions, arrow functions for callbacks:**
```javascript
// ✅ Good - Function declaration for named functions
function renderTasks() {
    const filtered = tasks.filter(t => t.status !== 'archived');
    // ...
}

// ✅ Good - Arrow function for callbacks
document.getElementById('btn').addEventListener('click', (e) => {
    e.preventDefault();
    handleClick();
});

// ✅ Good - Arrow function for array methods
const highPriority = tasks.filter(t => t.priority === 'high');

// ❌ Bad - Arrow function for top-level named function
const renderTasks = () => {
    // ...
};
```

### Async/Await

**Prefer async/await over raw promises:**
```javascript
// ✅ Good
async function loadTasks() {
    try {
        const data = await loadData('tasks');
        tasks = data || [];
    } catch (error) {
        console.error('Failed to load tasks:', error);
        showErrorNotification('Failed to load tasks');
    }
}

// ❌ Bad
function loadTasks() {
    return loadData('tasks')
        .then(data => {
            tasks = data || [];
        })
        .catch(error => {
            console.error('Failed to load tasks:', error);
            showErrorNotification('Failed to load tasks');
        });
}
```

### Equality Checks

**Use strict equality:**
```javascript
// ✅ Good
if (task.status === 'done') { }
if (task.projectId !== null) { }

// ❌ Bad
if (task.status == 'done') { }
if (task.projectId != null) { }
```

### Truthiness Checks

**Be explicit about what you're checking:**
```javascript
// ✅ Good - Explicit checks
if (task.title.length > 0) { }
if (task.tags.length > 0) { }
if (task.projectId !== null) { }

// ⚠️ Acceptable - Truthiness for existence
if (task.description) { }
if (projects.length) { }

// ❌ Bad - Implicit coercion can cause bugs
if (task.priority) { }  // Fails for priority === 0
```

---

## HTML Conventions

### Structure

**Use semantic HTML:**
```html
<!-- ✅ Good -->
<header class="page-header">
    <h1>Dashboard</h1>
    <nav>
        <a href="#dashboard">Dashboard</a>
    </nav>
</header>

<main class="page-content">
    <section class="stats-section">
        <article class="stat-card">...</article>
    </section>
</main>

<!-- ❌ Bad -->
<div class="page-header">
    <div class="title">Dashboard</div>
    <div class="nav">
        <span onclick="navigate('dashboard')">Dashboard</span>
    </div>
</div>
```

### Attributes

**Order attributes consistently:**
```html
<!-- Order: id, class, data-*, other attributes, event handlers -->
<button
    id="submit-btn"
    class="btn btn-primary"
    data-task-id="123"
    type="button"
    onclick="submitForm()"
>
    Submit
</button>
```

**Use data attributes for JavaScript hooks:**
```html
<!-- ✅ Good -->
<div class="task-card" data-task-id="123" data-status="todo">

<!-- ❌ Bad - Don't rely on classes for data -->
<div class="task-card task-123 todo">
```

### Forms

**Use proper form structure:**
```html
<!-- ✅ Good -->
<form id="task-form">
    <div class="form-group">
        <label class="form-label" for="task-title">
            Task Title
            <span class="required">*</span>
        </label>
        <input
            type="text"
            id="task-title"
            name="title"
            class="form-input"
            required
        />
    </div>
    <button type="submit" class="btn btn-primary">Submit</button>
</form>

<!-- ❌ Bad - Missing labels, unclear structure -->
<div id="task-form">
    <input id="task-title" />
    <div onclick="submitForm()">Submit</div>
</div>
```

---

## CSS Conventions

### Naming (BEM-inspired)

**Use block__element--modifier pattern:**
```css
/* Block */
.task-card { }

/* Element */
.task-card__header { }
.task-card__title { }
.task-card__meta { }

/* Modifier */
.task-card--dragging { }
.task-card--selected { }

/* Combined */
.task-card__title--highlighted { }
```

**Actual Nautilus pattern (simplified BEM):**
```css
/* Block */
.task-card { }

/* Element (single dash, not double) */
.task-card-header { }
.task-card-title { }
.task-card-meta { }

/* State (class on same element) */
.task-card.dragging { }
.task-card.selected { }
```

### CSS Variables

**Use CSS variables for theming:**
```css
/* ✅ Good - Use variables */
.task-card {
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border);
}

/* ❌ Bad - Hardcoded values */
.task-card {
    background: #ffffff;
    color: #111827;
    border: 1px solid #cbd5e1;
}
```

### Selectors

**Keep specificity low:**
```css
/* ✅ Good - Low specificity */
.task-card { }
.task-card-title { }
.status-badge { }

/* ⚠️ Acceptable - For specific overrides */
.kanban-column .task-card { }
.modal.active { }

/* ❌ Bad - Overly specific */
div.page#tasks .kanban-board .kanban-column div.task-card { }
```

**Avoid IDs in CSS:**
```css
/* ✅ Good */
.task-modal { }

/* ❌ Bad */
#task-modal { }
```

### Property Order

**Group related properties:**
```css
.task-card {
    /* Positioning */
    position: relative;
    z-index: 1;

    /* Box model */
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 12px;
    margin-bottom: 8px;

    /* Visual */
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: var(--shadow-sm);

    /* Typography */
    font-size: 14px;
    color: var(--text-primary);

    /* Misc */
    cursor: pointer;
    transition: all 0.2s;
}
```

### Responsive Design

**Mobile-first approach:**
```css
/* ✅ Good - Mobile first */
.stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

@media (min-width: 768px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 1024px) {
    .stats-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

/* ❌ Bad - Desktop first */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 1024px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
```

---

## Naming Conventions

### Variables

**Use camelCase:**
```javascript
// ✅ Good
let currentUser = {};
let isInitializing = false;
let projectCounter = 1;
let filterState = {};

// ❌ Bad
let CurrentUser = {};
let is_initializing = false;
let project_counter = 1;
```

### Constants

**Use UPPER_SNAKE_CASE:**
```javascript
// ✅ Good
const MAX_FILE_SIZE = 20971520;
const SESSION_MS = 24 * 60 * 60 * 1000;
const TAG_COLORS = [...];
const PROJECT_COLORS = [...];

// ❌ Bad
const maxFileSize = 20971520;
const sessionMs = 24 * 60 * 60 * 1000;
```

### Functions

**Use camelCase with verb prefixes:**

| Prefix | Meaning | Example |
|--------|---------|---------|
| `get` | Retrieve value | `getFilteredTasks()`, `getProjectColor()` |
| `set` | Set value | `setProjectColor(id, color)` |
| `is/has` | Boolean check | `isInitializing`, `hasOverdueTasks()` |
| `show/hide` | Display control | `showPage()`, `hideModal()` |
| `open/close` | Modal/dialog control | `openTaskModal()`, `closeModal()` |
| `toggle` | Switch state | `toggleTheme()`, `toggleFilter()` |
| `render` | DOM rendering | `renderTasks()`, `renderProjects()` |
| `update` | Refresh UI | `updateCounts()`, `updateFilterBadges()` |
| `handle` | Event handler | `handleStatusDropdown()`, `handleDrop()` |
| `setup` | Initialization | `setupNavigation()`, `setupFilters()` |
| `save/load` | Persistence | `saveTasks()`, `loadDataFromKV()` |
| `populate` | Fill with data | `populateProjectOptions()` |

```javascript
// ✅ Good - Clear intent
function getFilteredTasks() { }
function renderTasks() { }
function handleStatusChange() { }
function toggleTheme() { }
function saveProjects() { }

// ❌ Bad - Unclear intent
function tasks() { }
function doRender() { }
function status() { }
function theme() { }
function projects() { }
```

### CSS Classes

**Use lowercase with hyphens:**
```css
/* ✅ Good */
.task-card { }
.status-badge { }
.priority-dot { }
.form-group { }

/* ❌ Bad */
.taskCard { }
.StatusBadge { }
.priority_dot { }
.formgroup { }
```

### HTML IDs

**Use lowercase with hyphens:**
```html
<!-- ✅ Good -->
<div id="task-modal">
<input id="task-title">
<button id="submit-btn">

<!-- ❌ Bad -->
<div id="taskModal">
<input id="taskTitle">
<button id="submitBtn">
```

### File Names

**Use lowercase with hyphens:**
```
✅ Good
app.js
storage-client.js
restore-data.js

❌ Bad
App.js
storageClient.js
restore_data.js
```

---

## Code Organization

### File Structure (app.js)

**Organize code in logical sections:**
```javascript
// === GLOBAL STATE ===
let projects = [];
let tasks = [];
let filterState = {};

// === CONSTANTS ===
const TAG_COLORS = [...];
const PROJECT_COLORS = [...];
const statusLabels = {...};

// === UTILITY FUNCTIONS ===
function getFilteredTasks() { }
function stripTime(dateStr) { }
function debounce(fn, delay) { }

// === NOTIFICATION SYSTEM ===
function showNotification(message, type) { }
function showErrorNotification(message) { }

// === FILTER & SORT ===
function initFiltersUI() { }
function updateFilterBadges() { }

// === RENDER FUNCTIONS ===
function renderTasks() { }
function renderProjects() { }
function renderCalendar() { }

// === EVENT HANDLERS ===
function setupNavigation() { }
function setupStatusDropdown() { }

// === FORM SUBMISSIONS ===
document.getElementById('task-form').addEventListener('submit', ...);
document.getElementById('project-form').addEventListener('submit', ...);

// === DATA PERSISTENCE ===
async function saveTasks() { }
async function saveProjects() { }
async function loadDataFromKV() { }

// === INITIALIZATION ===
async function init() { }
document.addEventListener('DOMContentLoaded', init);
```

### Function Length

**Keep functions focused and short:**
```javascript
// ✅ Good - Single responsibility
function getHighPriorityTasks() {
    return tasks.filter(t => t.priority === 'high');
}

function renderHighPriorityTasks() {
    const highPriorityTasks = getHighPriorityTasks();
    // Render logic
}

// ❌ Bad - Too long, multiple responsibilities
function doEverything() {
    const filtered = tasks.filter(t => t.priority === 'high');
    const container = document.getElementById('container');
    container.innerHTML = '';
    filtered.forEach(task => {
        // 50 lines of rendering logic
    });
    // 30 lines of event handler setup
    // 20 lines of data processing
}
```

**Maximum recommended length:**
- Simple functions: 10-20 lines
- Complex rendering: 50-100 lines (consider breaking down)
- Event handlers: 30-50 lines

### DRY Principle

**Don't Repeat Yourself:**
```javascript
// ✅ Good - Reusable function
function getTaskById(id) {
    return tasks.find(t => t.id === id);
}

function editTask(id) {
    const task = getTaskById(id);
    // ...
}

function deleteTask(id) {
    const task = getTaskById(id);
    // ...
}

// ❌ Bad - Repeated logic
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    // ...
}

function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    // ...
}
```

---

## Comment Guidelines

### When to Comment

**DO comment:**
- Complex algorithms or business logic
- Non-obvious workarounds
- TODOs and FIXMEs
- Section separators in long files
- Regular expressions
- Magic numbers

**DON'T comment:**
- Obvious code
- Bad code (refactor it instead)
- Commented-out code (use git)

### Comment Style

**Single-line comments:**
```javascript
// ✅ Good - Explains why
// Skip save during initialization to prevent race conditions
if (isInitializing) return;

// ❌ Bad - States the obvious
// Check if isInitializing
if (isInitializing) return;
```

**Multi-line comments:**
```javascript
/**
 * Migrates tasks from old dueDate field to new startDate/endDate fields.
 * This ensures backward compatibility with data created before v2.0.
 */
function migrateDateFields() {
    // ...
}
```

**Section separators:**
```javascript
// === FILTER SYSTEM ===

function initFiltersUI() { }
function updateFilterBadges() { }

// === COLOR MANAGEMENT ===

function getProjectColor() { }
function getTagColor() { }
```

**TODOs:**
```javascript
// TODO: Add debouncing to prevent excessive saves
// FIXME: Date picker doesn't reset properly on modal close
// HACK: Workaround for Safari contenteditable bug
// NOTE: This must run after DOM is fully loaded
```

### JSDoc (Optional)

**For complex functions:**
```javascript
/**
 * Filters tasks based on current filter state
 * @returns {Array} Filtered task objects
 */
function getFilteredTasks() {
    // ...
}

/**
 * Updates a specific field of a task
 * @param {number} taskId - ID of the task to update
 * @param {string} field - Field name to update
 * @param {*} value - New value for the field
 */
function updateTaskField(taskId, field, value) {
    // ...
}
```

---

## Error Handling

### Try-Catch Blocks

**Use for async operations and critical code:**
```javascript
// ✅ Good
async function saveTasks() {
    if (isInitializing) return;

    try {
        await saveData('tasks', tasks);
    } catch (error) {
        console.error('Failed to save tasks:', error);
        showErrorNotification('Failed to save tasks');
        throw error;  // Re-throw if caller needs to handle
    }
}
```

### User-Facing Errors

**Always show notifications for user actions:**
```javascript
// ✅ Good
async function deleteTask(taskId) {
    try {
        tasks = tasks.filter(t => t.id !== taskId);
        await saveTasks();
        showSuccessNotification('Task deleted successfully');
        renderTasks();
    } catch (error) {
        console.error('Delete failed:', error);
        showErrorNotification('Failed to delete task');
        // Don't update UI if save failed
    }
}
```

### Defensive Programming

**Check inputs and state:**
```javascript
// ✅ Good
function openTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
        console.error(`Task ${taskId} not found`);
        showErrorNotification('Task not found');
        return;
    }

    // Proceed with valid task
}

// ❌ Bad
function openTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId);
    // Will throw if task is undefined
    document.getElementById('task-title').value = task.title;
}
```

### Logging

**Use appropriate log levels:**
```javascript
// Info - General information
console.log('Tasks loaded:', tasks.length);

// Debug - Detailed debugging (can be removed in production)
console.log('[DEBUG] Filter state:', filterState);

// Warning - Potential issues
console.warn('Task has no due date:', task);

// Error - Errors that need attention
console.error('Failed to load tasks:', error);
```

---

## Data Handling

### Data Validation

**Validate before saving:**
```javascript
// ✅ Good
function createTask(formData) {
    // Validate required fields
    if (!formData.title || formData.title.trim() === '') {
        showErrorNotification('Task title is required');
        return;
    }

    // Validate data types
    if (formData.priority && !['low', 'medium', 'high'].includes(formData.priority)) {
        formData.priority = 'medium';  // Default
    }

    // Create task
    const task = {
        id: taskCounter++,
        title: formData.title.trim(),
        description: formData.description || '',
        priority: formData.priority || 'medium',
        status: formData.status || 'todo',
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    saveTasks();
}
```

### ID Management

**Auto-increment IDs:**
```javascript
// ✅ Good - Consistent ID generation
const task = {
    id: taskCounter++,
    // ...
};
tasks.push(task);

// ❌ Bad - Manual ID management
const task = {
    id: tasks.length + 1,  // Breaks if tasks are deleted
    // ...
};
```

### Date Handling

**Use ISO format for storage, display format for UI:**
```javascript
// ✅ Good
// Storage: ISO format (YYYY-MM-DD)
task.startDate = "2025-11-16";

// Display: DMY format (DD/MM/YYYY)
const displayDate = toDMYFromISO(task.startDate);  // "16/11/2025"

// ❌ Bad - Inconsistent formats
task.startDate = "16/11/2025";  // Hard to sort, parse
```

### Data Migrations

**Handle deprecated fields:**
```javascript
// ✅ Good - Migrate old data
async function loadDataFromKV() {
    const loadedTasks = await loadData('tasks');
    tasks = loadedTasks || [];

    // Migrate dueDate → endDate
    tasks.forEach(task => {
        if (task.dueDate && !task.endDate) {
            task.endDate = task.dueDate;
        }
        delete task.dueDate;

        // Ensure new fields exist
        if (!task.startDate) task.startDate = "";
        if (!task.endDate) task.endDate = "";

        // Normalize IDs to numbers
        task.id = parseInt(task.id, 10);
    });

    // Persist migrations
    if (loadedTasks && loadedTasks.length > 0) {
        await saveTasks();
    }
}
```

---

## Performance Best Practices

### Avoid Redundant Operations

**Use guard flags:**
```javascript
// ✅ Good - Prevent saves during initialization
let isInitializing = false;

async function saveTasks() {
    if (isInitializing) return;  // Skip during load
    await saveData('tasks', tasks);
}

async function init() {
    isInitializing = true;
    await loadDataFromKV();
    isInitializing = false;  // Now saves are allowed
}
```

### Debounce Expensive Operations

**Debounce search input:**
```javascript
// ✅ Good
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        filterState.search = e.target.value;
        renderTasks();
    }, 220);
});

// ❌ Bad - Triggers on every keystroke
searchInput.addEventListener('input', (e) => {
    filterState.search = e.target.value;
    renderTasks();  // Expensive!
});
```

### Event Delegation

**Use for dynamic elements:**
```javascript
// ✅ Good - Single listener on parent
document.getElementById('kanban-board').addEventListener('click', (e) => {
    const card = e.target.closest('.task-card');
    if (card) {
        const taskId = parseInt(card.dataset.taskId);
        openTaskDetails(taskId);
    }
});

// ❌ Bad - Listener on every card
cards.forEach(card => {
    card.addEventListener('click', () => {
        const taskId = parseInt(card.dataset.taskId);
        openTaskDetails(taskId);
    });
});
```

### Minimize DOM Manipulation

**Batch updates:**
```javascript
// ✅ Good - Single innerHTML update
function renderTasks() {
    const container = document.getElementById('kanban-tasks');
    const html = tasks.map(task => createTaskCardHTML(task)).join('');
    container.innerHTML = html;
}

// ❌ Bad - Multiple DOM insertions
function renderTasks() {
    const container = document.getElementById('kanban-tasks');
    tasks.forEach(task => {
        const card = document.createElement('div');
        // ... build card
        container.appendChild(card);  // DOM update on each iteration
    });
}
```

---

## Security Guidelines

### Input Sanitization

**Escape user input in HTML:**
```javascript
// ✅ Good - Escape special characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderTaskTitle(task) {
    return `<h3>${escapeHtml(task.title)}</h3>`;
}

// ⚠️ Acceptable - Using textContent (auto-escapes)
titleElement.textContent = task.title;

// ❌ Bad - XSS vulnerability
titleElement.innerHTML = task.title;
```

### Avoid eval()

**Never use eval or Function constructor:**
```javascript
// ❌ Bad - Security risk
eval(userInput);
new Function(userInput)();
```

### localStorage Security

**Don't store sensitive data:**
```javascript
// ❌ Bad
localStorage.setItem('password', userPassword);
localStorage.setItem('apiKey', secretKey);

// ✅ Good - Only store non-sensitive data
localStorage.setItem('theme', 'dark');
localStorage.setItem('nautilus_unlocked_at', timestamp);
```

### File Upload Validation

**Validate file types and sizes:**
```javascript
// ✅ Good
function handleFileUpload(file) {
    const MAX_SIZE = 20971520;  // 20 MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

    if (file.size > MAX_SIZE) {
        showErrorNotification('File too large (max 20 MB)');
        return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        showErrorNotification('File type not allowed');
        return;
    }

    // Proceed with upload
}
```

---

## Code Review Checklist

Before submitting code, verify:

- [ ] Follows naming conventions (camelCase, UPPER_SNAKE_CASE)
- [ ] Uses const/let appropriately
- [ ] Includes error handling for async operations
- [ ] Shows user-facing notifications for actions
- [ ] Validates input data
- [ ] Avoids XSS vulnerabilities
- [ ] Uses CSS variables instead of hardcoded colors
- [ ] Includes comments for complex logic
- [ ] No console.log statements left in production code (use proper logging)
- [ ] Functions have single responsibility
- [ ] Code is DRY (no unnecessary repetition)
- [ ] IDs are managed via counters, not manual assignment
- [ ] Dates use ISO format for storage
- [ ] isInitializing flag prevents race conditions
- [ ] Event listeners are cleaned up if needed
- [ ] Mobile-responsive (if UI changes)
- [ ] Tested in light and dark mode
- [ ] No hardcoded magic numbers (use named constants)

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0

See also:
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
- [UI_PATTERNS.md](UI_PATTERNS.md) - Reusable UI components
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Step-by-step guides
