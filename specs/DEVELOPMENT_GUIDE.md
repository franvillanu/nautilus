# Nautilus Development Guide

This guide provides step-by-step instructions for common development tasks in Nautilus. Each guide includes code examples and best practices.

---

## Table of Contents

1. [Adding a New Page](#adding-a-new-page)
2. [Creating a New Modal](#creating-a-new-modal)
3. [Adding a New Data Field](#adding-a-new-data-field)
4. [Implementing a New Filter](#implementing-a-new-filter)
5. [Adding a Custom Dropdown](#adding-a-custom-dropdown)
6. [Working with Colors](#working-with-colors)
7. [Implementing Drag & Drop](#implementing-drag--drop)
8. [Adding a Dashboard Widget](#adding-a-dashboard-widget)
9. [Creating a New View Mode](#creating-a-new-view-mode)
10. [Data Migration](#data-migration)
11. [Working with Attachments](#working-with-attachments)
12. [Adding Keyboard Shortcuts](#adding-keyboard-shortcuts)
13. [Implementing Export/Import](#implementing-export-import)
14. [Performance Optimization](#performance-optimization)
15. [Debugging Tips](#debugging-tips)

---

## Adding a New Page

### Step 1: Add HTML Structure

**Location:** [index.html](../index.html)

```html
<!-- Add to main-content section, after existing pages -->
<div class="page" id="analytics">
    <div class="page-header">
        <h1 class="page-title">Analytics</h1>
        <p class="page-subtitle">View project statistics and insights</p>
    </div>

    <div class="page-content">
        <!-- Your page content here -->
        <div id="analytics-content">
            <!-- Will be populated by renderAnalytics() -->
        </div>
    </div>
</div>
```

### Step 2: Add Navigation Link

**Location:** [index.html](../index.html) - sidebar nav

```html
<nav>
    <!-- Existing nav items -->
    <a href="#analytics" class="nav-item" data-page="analytics">
        <span class="nav-icon">📊</span>
        <span class="nav-text">Analytics</span>
    </a>
</nav>
```

### Step 3: Add Routing Logic

**Location:** [app.js](../app.js) - in `init()` function or hashchange listener

```javascript
// In hashchange listener
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);

    if (hash === 'analytics') {
        showPage('analytics');
        renderAnalytics();
    } else if (hash === 'calendar') {
        showCalendarView();
    } else if (hash.startsWith('project-')) {
        // ... existing code
    } else {
        showPage(hash || 'dashboard');
    }
});
```

### Step 4: Create Render Function

**Location:** [app.js](../app.js) - in RENDER FUNCTIONS section

```javascript
// === RENDER FUNCTIONS ===

function renderAnalytics() {
    const container = document.getElementById('analytics-content');

    // Calculate stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    // Render HTML
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">✓</div>
                <div class="stat-content">
                    <h3 class="stat-value">${completedTasks}</h3>
                    <p class="stat-label">Completed Tasks</p>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">📈</div>
                <div class="stat-content">
                    <h3 class="stat-value">${completionRate}%</h3>
                    <p class="stat-label">Completion Rate</p>
                </div>
            </div>
        </div>
    `;
}
```

### Step 5: Add Styling (Optional)

**Location:** [style.css](../style.css)

```css
/* Analytics page specific styles */
#analytics-content {
    padding: 20px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}
```

### Step 6: Test

1. Navigate to `#analytics` in browser
2. Verify page displays correctly
3. Test navigation between pages
4. Check light/dark mode

---

## Creating a New Modal

### Step 1: Add HTML Structure

**Location:** [index.html](../index.html) - after existing modals

```html
<div id="settings-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Settings</h2>
            <button class="modal-close" onclick="closeModal('settings-modal')">&times;</button>
        </div>

        <div class="modal-body">
            <form id="settings-form">
                <div class="form-group">
                    <label class="form-label" for="user-name">User Name</label>
                    <input
                        type="text"
                        id="user-name"
                        name="userName"
                        class="form-input"
                        placeholder="Enter your name"
                    />
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('settings-modal')">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
```

### Step 2: Create Open Function

**Location:** [app.js](../app.js)

```javascript
function openSettingsModal() {
    const form = document.getElementById('settings-form');

    // Load current settings
    const userName = localStorage.getItem('userName') || '';
    document.getElementById('user-name').value = userName;

    // Show modal
    document.getElementById('settings-modal').classList.add('active');
}
```

### Step 3: Handle Form Submission

**Location:** [app.js](../app.js) - in FORM SUBMISSIONS section

```javascript
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const userName = formData.get('userName');

    try {
        // Save settings
        localStorage.setItem('userName', userName);

        showSuccessNotification('Settings saved successfully');
        closeModal('settings-modal');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showErrorNotification('Failed to save settings');
    }
});
```

### Step 4: Add Trigger Button

**Location:** Wherever you want to open the modal

```html
<button class="btn btn-primary" onclick="openSettingsModal()">
    Settings
</button>
```

### Step 5: Add Click-Outside-to-Close

**Location:** [app.js](../app.js) - if not already present

```javascript
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});
```

---

## Adding a New Data Field

Let's add a `category` field to tasks.

### Step 1: Update Data Structure

**Location:** [app.js](../app.js) - Update createTask or task form submission

```javascript
// When creating a task
const task = {
    id: taskCounter++,
    title: formData.get('title'),
    description: document.getElementById('task-description').innerHTML,
    category: formData.get('category') || 'general',  // 🆕 New field
    projectId: parseInt(formData.get('projectId')) || null,
    priority: formData.get('priority'),
    status: formData.get('status'),
    startDate: formData.get('startDate') || '',
    endDate: formData.get('endDate') || '',
    tags: currentTags.slice(),
    attachments: tempAttachments.slice(),
    createdAt: new Date().toISOString()
};
```

### Step 2: Add Form Field to Modal

**Location:** [index.html](../index.html) - in task-modal form

```html
<div class="form-group">
    <label class="form-label" for="task-category">Category</label>
    <select id="task-category" name="category" class="form-input">
        <option value="general">General</option>
        <option value="development">Development</option>
        <option value="design">Design</option>
        <option value="research">Research</option>
    </select>
</div>
```

### Step 3: Populate Field When Editing

**Location:** [app.js](../app.js) - in `openTaskDetails()`

```javascript
function openTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // ... existing field population

    // 🆕 Populate category
    document.getElementById('task-category').value = task.category || 'general';

    // Show modal
    document.getElementById('task-modal').classList.add('active');
}
```

### Step 4: Update Task When Editing

**Location:** [app.js](../app.js) - in task form submission handler

```javascript
if (editingTaskId) {
    const task = tasks.find(t => t.id === parseInt(editingTaskId));
    if (task) {
        task.title = formData.get('title');
        task.category = formData.get('category') || 'general';  // 🆕
        // ... update other fields
    }
}
```

### Step 5: Display in UI (Optional)

**Location:** [app.js](../app.js) - in render functions

```javascript
function renderTaskCard(task) {
    return `
        <div class="task-card" data-task-id="${task.id}">
            <h4 class="task-title">${task.title}</h4>

            <!-- 🆕 Display category -->
            <div class="task-category">${task.category}</div>

            <!-- ... rest of card -->
        </div>
    `;
}
```

### Step 6: Data Migration

**Location:** [app.js](../app.js) - in `loadDataFromKV()`

```javascript
async function loadDataFromKV() {
    const loadedTasks = await loadData('tasks');
    tasks = loadedTasks || [];

    // Migrate existing tasks to have category field
    let needsSave = false;
    tasks.forEach(task => {
        if (!task.category) {
            task.category = 'general';  // Default value
            needsSave = true;
        }
    });

    // Save if migrations were applied
    if (needsSave && tasks.length > 0) {
        isInitializing = true;
        await saveTasks();
        isInitializing = false;
    }
}
```

---

## Implementing a New Filter

Let's add a filter for task categories.

### Step 1: Update Filter State

**Location:** [app.js](../app.js) - global state

```javascript
let filterState = {
    search: "",
    statuses: new Set(),
    priorities: new Set(),
    projects: new Set(),
    tags: new Set(),
    categories: new Set(),  // 🆕 New filter
    dateFrom: "",
    dateTo: ""
};
```

### Step 2: Add Filter UI

**Location:** [index.html](../index.html) - in filters toolbar

```html
<div class="filters-toolbar">
    <!-- Existing filters -->

    <!-- 🆕 Category filter -->
    <div class="filter-dropdown">
        <button class="filter-button" id="category-filter-btn">
            Category
            <span class="filter-count-badge" id="category-count">0</span>
        </button>
        <div class="filter-panel" id="category-filter-panel">
            <label>
                <input type="checkbox" value="general" onchange="toggleCategoryFilter('general')">
                General
            </label>
            <label>
                <input type="checkbox" value="development" onchange="toggleCategoryFilter('development')">
                Development
            </label>
            <label>
                <input type="checkbox" value="design" onchange="toggleCategoryFilter('design')">
                Design
            </label>
            <label>
                <input type="checkbox" value="research" onchange="toggleCategoryFilter('research')">
                Research
            </label>
        </div>
    </div>
</div>
```

### Step 3: Implement Toggle Function

**Location:** [app.js](../app.js) - in FILTER & SORT section

```javascript
function toggleCategoryFilter(category) {
    if (filterState.categories.has(category)) {
        filterState.categories.delete(category);
    } else {
        filterState.categories.add(category);
    }

    updateFilterBadges();
    renderCurrentView();
}
```

### Step 4: Update Filtering Logic

**Location:** [app.js](../app.js) - in `getFilteredTasks()`

```javascript
function getFilteredTasks() {
    const search = filterState.search.toLowerCase();
    const selStatus = filterState.statuses;
    const selPriority = filterState.priorities;
    const selProjects = filterState.projects;
    const selTags = filterState.tags;
    const selCategories = filterState.categories;  // 🆕

    return tasks.filter((task) => {
        // ... existing filters

        // 🆕 Category filter
        const categoryOK = selCategories.size === 0 || selCategories.has(task.category);

        return searchOK && statusOK && priorityOK && projectOK && tagOK && dateOK && categoryOK;
    });
}
```

### Step 5: Update Filter Badges

**Location:** [app.js](../app.js) - in `updateFilterBadges()`

```javascript
function updateFilterBadges() {
    // ... existing badge updates

    // 🆕 Category badge
    const categoryCount = document.getElementById('category-count');
    categoryCount.textContent = filterState.categories.size;
    categoryCount.style.display = filterState.categories.size > 0 ? 'inline' : 'none';
}
```

### Step 6: Add to Clear Filters

**Location:** [app.js](../app.js) - in `clearAllFilters()`

```javascript
function clearAllFilters() {
    filterState.search = "";
    filterState.statuses.clear();
    filterState.priorities.clear();
    filterState.projects.clear();
    filterState.tags.clear();
    filterState.categories.clear();  // 🆕
    filterState.dateFrom = "";
    filterState.dateTo = "";

    // Reset UI
    document.getElementById('filter-search').value = '';
    document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    updateFilterBadges();
    renderCurrentView();
}
```

### Step 7: Add Filter Chips

**Location:** [app.js](../app.js) - in `renderActiveFilters()`

```javascript
function renderActiveFilters() {
    const container = document.getElementById('active-filters');
    const chips = [];

    // ... existing chips

    // 🆕 Category chips
    filterState.categories.forEach(category => {
        chips.push(`
            <div class="filter-chip" onclick="toggleCategoryFilter('${category}')">
                ${category}
                <span class="chip-remove">×</span>
            </div>
        `);
    });

    container.innerHTML = chips.join('');
    container.style.display = chips.length > 0 ? 'flex' : 'none';
}
```

---

## Adding a Custom Dropdown

Let's create a custom dropdown for selecting task categories.

### Step 1: HTML Structure

**Location:** [index.html](../index.html) - in task modal form

```html
<div class="form-group">
    <label class="form-label">Category</label>

    <div class="category-dropdown" id="category-dropdown">
        <!-- Hidden input stores actual value -->
        <input type="hidden" id="hidden-category" name="category" value="general">

        <!-- Display button -->
        <div class="category-current" id="category-current">
            <span id="category-display">General</span>
            <span class="dropdown-arrow">▼</span>
        </div>

        <!-- Options panel -->
        <div class="dropdown-panel" id="category-panel">
            <div class="dropdown-list">
                <div class="category-option" data-category="general">General</div>
                <div class="category-option" data-category="development">Development</div>
                <div class="category-option" data-category="design">Design</div>
                <div class="category-option" data-category="research">Research</div>
            </div>
        </div>
    </div>
</div>
```

### Step 2: Setup Function

**Location:** [app.js](../app.js) - in EVENT HANDLERS section

```javascript
function setupCategoryDropdown() {
    const dropdown = document.getElementById('category-dropdown');
    const current = document.getElementById('category-current');
    const hiddenInput = document.getElementById('hidden-category');
    const display = document.getElementById('category-display');

    // Toggle dropdown
    current.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');

        // Close other dropdowns
        document.querySelectorAll('.category-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('active');
        });
    });

    // Select option
    dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.category-option');
        if (!option) return;

        const category = option.dataset.category;
        hiddenInput.value = category;
        display.textContent = option.textContent;

        // Close dropdown
        dropdown.classList.remove('active');
    });
}
```

### Step 3: Call Setup in Init

**Location:** [app.js](../app.js) - in `init()`

```javascript
async function init() {
    // ... existing setup

    setupCategoryDropdown();  // 🆕

    // ... rest of init
}
```

### Step 4: Close on Outside Click

**Location:** [app.js](../app.js) - global click handler

```javascript
document.addEventListener('click', (e) => {
    // Close all dropdowns when clicking outside
    if (!e.target.closest('.category-dropdown')) {
        document.querySelectorAll('.category-dropdown').forEach(d => {
            d.classList.remove('active');
        });
    }
});
```

### Step 5: Add Styling

**Location:** [style.css](../style.css)

```css
.category-dropdown {
    position: relative;
}

.category-current {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.category-current:hover {
    border-color: var(--accent-blue);
}

.dropdown-arrow {
    margin-left: 8px;
    font-size: 12px;
    color: var(--text-muted);
    transition: transform 0.2s;
}

.category-dropdown.active .dropdown-arrow {
    transform: rotate(180deg);
}

.dropdown-panel {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: var(--shadow-md);
    z-index: 10;
}

.category-dropdown.active .dropdown-panel {
    display: block;
}

.category-option {
    padding: 10px 12px;
    cursor: pointer;
    transition: background 0.15s;
}

.category-option:hover {
    background: var(--bg-tertiary);
}
```

---

## Working with Colors

### Adding a New Color Palette

**Location:** [app.js](../app.js) - constants section

```javascript
// Existing palettes
const TAG_COLORS = [...];
const PROJECT_COLORS = [...];

// 🆕 New palette for categories
const CATEGORY_COLORS = {
    general: '#6B7280',
    development: '#3B82F6',
    design: '#EC4899',
    research: '#8B5CF6'
};
```

### Using Dynamic Color Allocation

```javascript
let categoryColorMap = {};

function getCategoryColor(category) {
    if (!categoryColorMap[category]) {
        // Allocate from palette
        const palette = Object.values(CATEGORY_COLORS);
        const index = Object.keys(categoryColorMap).length % palette.length;
        categoryColorMap[category] = palette[index];
    }
    return categoryColorMap[category];
}

// Usage in rendering
function renderCategoryBadge(category) {
    const color = getCategoryColor(category);
    return `
        <span class="category-badge" style="background: ${color};">
            ${category}
        </span>
    `;
}
```

### Persisting Color Choices

**Location:** [app.js](../app.js)

```javascript
// Save color map
function saveCategoryColors() {
    localStorage.setItem('categoryColors', JSON.stringify(categoryColorMap));
}

// Load color map
function loadCategoryColors() {
    const saved = localStorage.getItem('categoryColors');
    if (saved) {
        categoryColorMap = JSON.parse(saved);
    }
}

// Call in init()
async function init() {
    // ... existing code
    loadCategoryColors();  // 🆕
}
```

---

## Implementing Drag & Drop

### Making Elements Draggable

**Location:** [app.js](../app.js) - in render function

```javascript
function renderTasks() {
    const container = document.getElementById('kanban-tasks');

    container.innerHTML = tasks.map(task => `
        <div
            class="task-card"
            data-task-id="${task.id}"
            draggable="true"
            ondragstart="handleDragStart(event)"
            ondragend="handleDragEnd(event)"
        >
            <!-- Card content -->
        </div>
    `).join('');
}
```

### Drag Event Handlers

**Location:** [app.js](../app.js)

```javascript
let draggedTaskId = null;
let draggedCards = [];

function handleDragStart(e) {
    const taskId = parseInt(e.target.dataset.taskId);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    e.target.classList.add('dragging');

    // Handle multi-select
    if (selectedCards.has(taskId)) {
        draggedCards = Array.from(selectedCards);
    } else {
        draggedCards = [taskId];
    }
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedCards = [];
}
```

### Drop Zone Setup

**Location:** [app.js](../app.js)

```javascript
function setupDropZones() {
    document.querySelectorAll('.kanban-tasks').forEach(zone => {
        zone.addEventListener('dragover', allowDrop);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('dragleave', handleDragLeave);
    });
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const column = e.currentTarget.closest('.kanban-column');
    const newStatus = column.dataset.status;

    // Update tasks
    draggedCards.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
        }
    });

    // Save and re-render
    saveTasks();
    renderTasks();

    // Clean up
    e.currentTarget.classList.remove('drag-over');
    selectedCards.clear();
}
```

### Multi-Select Support

**Location:** [app.js](../app.js)

```javascript
let selectedCards = new Set();

function handleCardClick(e, taskId) {
    const card = e.currentTarget;

    if (e.shiftKey) {
        // Multi-select
        if (selectedCards.has(taskId)) {
            selectedCards.delete(taskId);
            card.classList.remove('selected');
        } else {
            selectedCards.add(taskId);
            card.classList.add('selected');
        }
    } else {
        // Single select (open details)
        openTaskDetails(taskId);
    }
}
```

---

## Adding a Dashboard Widget

### Step 1: Add HTML Container

**Location:** [index.html](../index.html) - in dashboard page

```html
<div class="page active" id="dashboard">
    <!-- Existing widgets -->

    <!-- 🆕 New widget -->
    <div class="dashboard-widget">
        <div class="widget-header">
            <h3>Upcoming Deadlines</h3>
        </div>
        <div class="widget-content" id="upcoming-deadlines-widget">
            <!-- Populated by renderUpcomingDeadlines() -->
        </div>
    </div>
</div>
```

### Step 2: Create Render Function

**Location:** [app.js](../app.js)

```javascript
function renderUpcomingDeadlines() {
    const container = document.getElementById('upcoming-deadlines-widget');

    // Get tasks with upcoming deadlines (next 7 days)
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = tasks.filter(task => {
        if (!task.endDate || task.status === 'done') return false;

        const dueDate = new Date(task.endDate);
        return dueDate >= today && dueDate <= nextWeek;
    }).sort((a, b) => {
        return new Date(a.endDate) - new Date(b.endDate);
    });

    if (upcoming.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No upcoming deadlines</p>
            </div>
        `;
        return;
    }

    container.innerHTML = upcoming.map(task => {
        const project = projects.find(p => p.id === task.projectId);
        return `
            <div class="deadline-item" onclick="openTaskDetails(${task.id})">
                <div class="deadline-task">
                    <span class="priority-dot ${task.priority}"></span>
                    <span class="deadline-title">${task.title}</span>
                </div>
                <div class="deadline-meta">
                    ${project ? `<span class="deadline-project">${project.name}</span>` : ''}
                    <span class="deadline-date">${toDMYFromISO(task.endDate)}</span>
                </div>
            </div>
        `;
    }).join('');
}
```

### Step 3: Call in Dashboard Render

**Location:** [app.js](../app.js) - when showing dashboard

```javascript
function showDashboard() {
    showPage('dashboard');
    renderDashboardStats();
    renderProjectProgress();
    renderActivityFeed();
    renderUpcomingDeadlines();  // 🆕
}
```

### Step 4: Add Styling

**Location:** [style.css](../style.css)

```css
.dashboard-widget {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
}

.widget-header h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 16px 0;
    color: var(--text-primary);
}

.deadline-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background 0.2s;
}

.deadline-item:hover {
    background: var(--bg-tertiary);
}

.deadline-task {
    display: flex;
    align-items: center;
    gap: 8px;
}

.deadline-title {
    font-weight: 500;
    color: var(--text-primary);
}

.deadline-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: var(--text-muted);
}
```

---

## Data Migration

### Basic Migration Pattern

**Location:** [app.js](../app.js) - in `loadDataFromKV()`

```javascript
async function loadDataFromKV() {
    const loadedTasks = await loadData('tasks');
    tasks = loadedTasks || [];

    let needsSave = false;

    // Migration 1: dueDate → endDate
    tasks.forEach(task => {
        if (task.dueDate && !task.endDate) {
            task.endDate = task.dueDate;
            delete task.dueDate;
            needsSave = true;
        }
    });

    // Migration 2: Add category field
    tasks.forEach(task => {
        if (!task.category) {
            task.category = 'general';
            needsSave = true;
        }
    });

    // Migration 3: Normalize IDs
    tasks.forEach(task => {
        const originalId = task.id;
        task.id = parseInt(task.id, 10);
        if (task.id !== originalId) {
            needsSave = true;
        }
    });

    // Save if any migrations were applied
    if (needsSave && tasks.length > 0) {
        console.log('Applying data migrations...');
        isInitializing = true;  // Prevent double-save
        await saveTasks();
        isInitializing = false;
    }

    // Recalculate counter
    taskCounter = Math.max(...tasks.map(t => t.id || 0), 0) + 1;
}
```

### Version-Based Migration

```javascript
const DATA_VERSION = 2;

async function loadDataFromKV() {
    const data = await loadData('tasks') || { version: 0, tasks: [] };

    // Run migrations based on version
    if (data.version < 1) {
        data.tasks = migrateToV1(data.tasks);
        data.version = 1;
    }

    if (data.version < 2) {
        data.tasks = migrateToV2(data.tasks);
        data.version = 2;
    }

    tasks = data.tasks;

    // Save if version changed
    if (data.version !== DATA_VERSION) {
        await saveData('tasks', { version: DATA_VERSION, tasks });
    }
}

function migrateToV1(tasks) {
    return tasks.map(task => ({
        ...task,
        endDate: task.dueDate || task.endDate,
        dueDate: undefined
    }));
}

function migrateToV2(tasks) {
    return tasks.map(task => ({
        ...task,
        category: task.category || 'general'
    }));
}
```

---

## Working with Attachments

See [app.js:3500-3700](../app.js) for full implementation reference.

### Upload File

```javascript
async function handleFileUpload(file) {
    const MAX_SIZE = 20971520;  // 20 MB

    if (file.size > MAX_SIZE) {
        showErrorNotification('File too large (max 20 MB)');
        return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
        const attachment = {
            type: 'file',
            name: file.name,
            url: e.target.result,  // base64 data URL
            size: file.size,
            uploadedAt: new Date().toISOString()
        };

        tempAttachments.push(attachment);
        renderAttachmentsList();
    };

    reader.readAsDataURL(file);
}
```

### Add URL Link

```javascript
function addUrlAttachment() {
    const url = document.getElementById('attachment-url').value.trim();
    const name = document.getElementById('attachment-name').value.trim() || url;

    if (!url) {
        showErrorNotification('URL is required');
        return;
    }

    // Validate URL format
    try {
        new URL(url);
    } catch {
        showErrorNotification('Invalid URL format');
        return;
    }

    const attachment = {
        type: 'url',
        name: name,
        url: url,
        uploadedAt: new Date().toISOString()
    };

    tempAttachments.push(attachment);
    renderAttachmentsList();

    // Clear inputs
    document.getElementById('attachment-url').value = '';
    document.getElementById('attachment-name').value = '';
}
```

### Display Attachments

```javascript
function renderAttachmentsList() {
    const container = document.getElementById('attachments-list');

    container.innerHTML = tempAttachments.map((att, index) => {
        const icon = att.type === 'file' ? '📎' : '🔗';
        const size = att.size ? ` (${formatFileSize(att.size)})` : '';

        return `
            <div class="attachment-item">
                <span class="attachment-icon">${icon}</span>
                <span class="attachment-name">${att.name}${size}</span>
                <button
                    type="button"
                    class="btn-icon"
                    onclick="removeAttachment(${index})"
                >✕</button>
            </div>
        `;
    }).join('');
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function removeAttachment(index) {
    tempAttachments.splice(index, 1);
    renderAttachmentsList();
}
```

---

## Performance Optimization

### Debouncing Search

```javascript
let searchTimeout;

document.getElementById('filter-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        filterState.search = e.target.value;
        renderCurrentView();
    }, 220);  // 220ms delay
});
```

### Virtual Scrolling (for large lists)

```javascript
function renderVirtualList(items, containerHeight, itemHeight) {
    const container = document.getElementById('list-container');
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const totalHeight = items.length * itemHeight;

    container.style.height = totalHeight + 'px';

    container.addEventListener('scroll', () => {
        const scrollTop = container.scrollTop;
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = startIndex + visibleCount;

        const visibleItems = items.slice(startIndex, endIndex);

        // Render only visible items
        const html = visibleItems.map((item, i) => {
            const actualIndex = startIndex + i;
            const top = actualIndex * itemHeight;

            return `
                <div class="list-item" style="top: ${top}px;">
                    ${item.title}
                </div>
            `;
        }).join('');

        container.querySelector('.list-content').innerHTML = html;
    });
}
```

### Memoization

```javascript
const cache = {};

function getFilteredTasks() {
    const cacheKey = JSON.stringify(filterState);

    if (cache[cacheKey]) {
        return cache[cacheKey];
    }

    const filtered = tasks.filter(/* ... */);
    cache[cacheKey] = filtered;

    return filtered;
}

// Clear cache when tasks change
function saveTasks() {
    cache = {};  // Invalidate cache
    // ... save logic
}
```

---

## Debugging Tips

### Enable Debug Logging

```javascript
const DEBUG = true;

function debugLog(context, ...args) {
    if (DEBUG) {
        console.log(`[${context}]`, ...args);
    }
}

// Usage
debugLog('FILTER', 'Filter state updated:', filterState);
debugLog('RENDER', 'Rendering', tasks.length, 'tasks');
```

### Inspect State

```javascript
// Add to console for debugging
window.debugState = {
    tasks: () => tasks,
    projects: () => projects,
    filterState: () => filterState,
    selectedCards: () => Array.from(selectedCards),
    getTask: (id) => tasks.find(t => t.id === id)
};

// In browser console:
// debugState.tasks()
// debugState.getTask(123)
```

### Performance Profiling

```javascript
function profileRender() {
    console.time('renderTasks');
    renderTasks();
    console.timeEnd('renderTasks');
}

// Or use Performance API
const start = performance.now();
renderTasks();
const end = performance.now();
console.log(`Render took ${end - start}ms`);
```

### Detect Memory Leaks

```javascript
// Monitor event listeners
function countEventListeners(element) {
    const listeners = getEventListeners(element);  // Chrome DevTools only
    console.log('Event listeners:', listeners);
}

// Check for orphaned elements
setInterval(() => {
    const cards = document.querySelectorAll('.task-card');
    console.log('Active task cards:', cards.length);
}, 5000);
```

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0

See also:
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [UI_PATTERNS.md](UI_PATTERNS.md) - Reusable components
- [CODING_CONVENTIONS.md](CODING_CONVENTIONS.md) - Code standards
