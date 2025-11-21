# Nautilus Architecture Specification

## Overview

Nautilus is a single-page application (SPA) for project and task management built with vanilla JavaScript, deployed on Cloudflare Workers with KV storage for data persistence.

---

## Technology Stack

### Frontend

| Technology | Version/Source | Purpose |
|------------|---------------|---------|
| **JavaScript** | ES6+ | Core application logic |
| **HTML5** | - | Semantic markup, single-page structure |
| **CSS3** | - | Styling with CSS Variables for theming |
| **flatpickr** | CDN (latest) | Date picker library |

**Key Characteristics:**
- **No build step** - All code runs directly in browser
- **No framework** - Vanilla JavaScript for full control
- **No npm dependencies** in production - Libraries loaded via CDN
- **ES6+ features** - Async/await, arrow functions, template literals, destructuring

### Backend

| Technology | Purpose |
|------------|---------|
| **Cloudflare Workers** | Serverless compute platform |
| **Cloudflare KV** | Key-value storage (two namespaces) |
| **Wrangler** | CLI for deployment and local development |
| **Resend API** | Transactional email delivery for deadline digests |

**KV Namespaces:**
- `NAUTILUS_DATA` - Stores projects, tasks, feedbackItems (JSON)
- `NAUTILUS_FILES` - Stores file attachments (binary/text)
- `notificationLog` entry within `NAUTILUS_DATA` stores reminder history per task (prevents duplicate sends)

### Notification Worker

- `functions/api/notifications.js` powers automated deadline emails.
- Trigger via HTTP (`POST /api/notifications`) or Cloudflare Scheduled Functions.
- Uses environment variables: `RESEND_API_KEY`, `RESEND_FROM`, `NOTIFICATION_RECIPIENT`, `APP_BASE_URL`, optional `NOTIFICATION_TOKEN`, and `NOTIFICATION_TIMEZONE` (defaults to `Atlantic/Canary`, i.e., Tenerife).
- Renders HTML + text emails with `src/services/email-template.js`.
- Persists reminder timestamps under `notificationLog` to ensure each task only triggers once for the 7-day and 1-day windows.
- CLI helper `scripts/trigger-notifications.js` can hit the endpoint immediately (dry-run/force flags) for QA or manual runs.

### Development Tools

| Tool | Purpose |
|------|---------|
| **Wrangler** | Cloudflare Workers CLI for deployment |
| **Git** | Version control |
| **Node.js** | Development scripts (optional) |

---

## Project Structure

```
Nautilus/
├── index.html                    # Main SPA entry point (55 KB)
├── app.js                        # Core application logic (334 KB, 7,864 lines)
├── style.css                     # All styling (119 KB)
├── storage-client.js             # KV storage abstraction layer
├── restore-data.js               # Data restoration utilities
├── wrangler.toml                 # Cloudflare Workers configuration
│
├── lock/                         # Password protection system
│   ├── lock.js                   # Unlock logic, 24-hour session
│   ├── style.css                 # Lock screen styling
│   └── easter/                   # Easter egg images
│       └── *.jpg
│
├── functions/                    # Cloudflare Workers serverless functions
│   └── api/
│       ├── storage.js            # NAUTILUS_DATA KV operations
│       └── files.js              # NAUTILUS_FILES KV operations
│
├── scripts/
│   └── update-dev-vars.js        # Development utilities
│
├── backups/                      # Local data backup directory
│
├── specs/                        # 🆕 SDD Documentation
│   ├── ARCHITECTURE.md           # This file
│   ├── UI_PATTERNS.md            # Component patterns
│   ├── CODING_CONVENTIONS.md     # Code style guide
│   └── DEVELOPMENT_GUIDE.md      # How-to guides
│
├── plans/                        # 🆕 Implementation plans
│   ├── README.md                 # Planning framework
│   └── example-*.md              # Templates
│
├── templates/                    # 🆕 Code templates
│   └── page-template.html        # New page starter
│
├── CLAUDE.md                     # 🆕 AI assistant configuration
├── CODEX.md                      # 🆕 ChatGPT/Copilot configuration
├── VISUAL_GUIDELINES.md          # 🆕 Visual quality standards
└── README.md                     # Project overview
```

**File Size Reference:**
- `index.html` - 55,591 bytes (single-page structure)
- `app.js` - 333,849 bytes, 7,864 lines (all application logic)
- `style.css` - 119,308 bytes (all styling, responsive, dark mode)

---

## Data Architecture

### Core Data Structures

#### Projects
```javascript
{
    id: number,                    // Auto-incremented from projectCounter
    name: string,                  // Required, displayed as title
    description: string,           // Optional, supports plain text
    startDate: string,             // ISO format YYYY-MM-DD, required
    endDate: string,               // ISO format YYYY-MM-DD, optional
    createdAt: string              // ISO timestamp for sorting
}
```

#### Tasks
```javascript
{
    id: number,                    // Auto-incremented from taskCounter
    title: string,                 // Required, main display text
    description: string,           // HTML content from rich editor
    projectId: number | null,      // References project.id or null
    priority: 'low' | 'medium' | 'high',  // Default: 'medium'
    status: 'todo' | 'progress' | 'review' | 'done',  // Default: 'todo'
    startDate: string,             // ISO format, optional
    endDate: string,               // ISO format, optional (replaces deprecated dueDate)
    tags: string[],                // Array of tag names
    attachments: Attachment[],     // Files and URLs
    createdAt: string              // ISO timestamp
}
```

#### Attachment Structure
```javascript
{
    type: 'file' | 'url',
    name: string,                  // Display name
    url: string,                   // File URL or external URL
    size?: number,                 // File size in bytes (files only)
    uploadedAt: string             // ISO timestamp
}
```

#### Feedback
```javascript
{
    id: number,                    // Auto-incremented
    type: string,                  // Feedback category
    message: string,               // User feedback content
    createdAt: string              // ISO timestamp
}
```

#### Notification Log
```javascript
{
    tasks: {
        [taskId: string]: {
            week?: 'YYYY-MM-DD',    // Last date 7-day reminder sent
            day?: 'YYYY-MM-DD'      // Last date 1-day reminder sent
        }
    }
}

// Timezone
const NOTIFICATION_TIMEZONE = 'Atlantic/Canary'; // Configurable; aligns cron to 09:00 Tenerife
```

### Global State Management

```javascript
// Core data arrays
let projects = [];                 // All projects
let tasks = [];                    // All tasks
let feedbackItems = [];            // User feedback

// ID counters (auto-increment)
let projectCounter = 1;
let taskCounter = 1;
let feedbackCounter = 1;

// UI state
let selectedCards = new Set();     // Multi-select in Kanban
let tempAttachments = [];          // Staging for new attachments

// Filter state
let filterState = {
    search: "",                    // Text search
    statuses: new Set(),           // Selected status values
    priorities: new Set(),         // Selected priority values
    projects: new Set(),           // Selected project IDs or 'none'
    tags: new Set(),               // Selected tag names or 'none'
    dateFrom: "",                  // YYYY-MM-DD
    dateTo: ""                     // YYYY-MM-DD
};

// Sort state
let sortMode = 'priority';         // 'priority' or 'manual'
let manualOrder = [];              // Task IDs in manual order

// Color mappings
let projectColorMap = {};          // projectId -> color hex
let tagColorMap = {};              // tagName -> color hex

// Lifecycle flag
let isInitializing = false;        // Prevents saves during load
```

---

## Data Flow

### Application Lifecycle

```
1. Page Load
   └─> DOMContentLoaded event
       └─> init()
           ├─> isInitializing = true
           ├─> loadDataFromKV()              // Fetch from Cloudflare KV
           │   ├─> Load projects, tasks, feedback
           │   ├─> Normalize IDs to numbers
           │   ├─> Migrate deprecated fields (dueDate → endDate)
           │   └─> Recalculate counters
           ├─> loadSortPreferences()
           ├─> loadProjectColors()
           ├─> Create demo data if empty
           ├─> Setup UI systems
           │   ├─> setupNavigation()
           │   ├─> setupStatusDropdown()
           │   ├─> setupPriorityDropdown()
           │   ├─> setupProjectDropdown()
           │   ├─> initializeDatePickers()
           │   └─> initFiltersUI()
           ├─> isInitializing = false
           ├─> Route based on URL hash
           └─> render()                      // Initial UI render

2. User Interaction
   └─> Event (click, input, drag, etc.)
       └─> Event Handler
           ├─> Update global state (projects/tasks/filterState)
           ├─> Call save function (saveTasks/saveProjects)
           │   └─> storage-client.js
           │       └─> POST /api/storage
           │           └─> Cloudflare KV write
           └─> Call render function
               └─> Update DOM

3. Navigation
   └─> User clicks nav item or hash changes
       └─> showPage(pageId)
           ├─> Hide all .page elements
           ├─> Show selected .page
           ├─> Update nav highlight
           └─> Call page-specific render
               ├─> renderTasks()
               ├─> renderProjects()
               ├─> renderCalendar()
               └─> etc.
```

### Data Persistence Flow

```
User Action → Update State → Save to KV → Render UI

Example: Edit Task
1. User edits field in modal
2. On blur: updateTaskField(fieldName, value)
3. Find task by ID in tasks array
4. Update field: task[fieldName] = value
5. saveTasks()
   └─> storage-client.js: saveData("tasks", tasks)
       └─> POST /api/storage?key=tasks
           └─> Cloudflare KV: NAUTILUS_DATA.put("tasks", JSON.stringify(tasks))
6. closeModal()
7. renderTasks() or current view render
```

### Storage API Interaction

**Save Data:**
```javascript
// storage-client.js
async function saveData(key, value) {
    const response = await fetch(`/api/storage?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value)
    });
    return response.ok;
}
```

**Load Data:**
```javascript
// storage-client.js
async function loadData(key) {
    const response = await fetch(`/api/storage?key=${key}`);
    const text = await response.text();
    if (text === "null") return null;
    return JSON.parse(text);
}
```

---

## View System

### Page Routing (Hash-Based)

Nautilus uses a simple hash-based routing system:

```javascript
// Navigation via hash
window.location.hash = '#tasks';        // Navigate to tasks page
window.location.hash = '#calendar';     // Navigate to calendar
window.location.hash = '#project-123';  // Navigate to project details

// Hash change listener
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash === 'calendar') showCalendarView();
    else if (hash.startsWith('project-')) {
        const projectId = parseInt(hash.split('-')[1]);
        showProjectDetails(projectId);
    } else {
        showPage(hash || 'dashboard');
    }
});
```

### Page Structure

All pages use the `.page` class and are toggled via `.active`:

```html
<div class="page active" id="dashboard">...</div>
<div class="page" id="projects">...</div>
<div class="page" id="tasks">...</div>
<div class="page" id="feedback">...</div>
```

**Page Switching:**
```javascript
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active");
    });

    // Show selected page
    document.getElementById(pageId).classList.add("active");

    // Update nav highlight
    document.querySelectorAll(".nav-item").forEach(n => {
        n.classList.remove("active");
    });
    document.querySelector(`[data-page="${pageId}"]`)?.classList.add("active");
}
```

### View Modes (Tasks Page)

The tasks page supports three view modes:

1. **Kanban** - Drag-and-drop board (default)
2. **List** - Sortable table view
3. **Calendar** - Month calendar with task bars

**View Switching:**
```javascript
document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const view = e.target.textContent.toLowerCase();
        if (view === "kanban") renderTasks();
        else if (view === "list") renderListView();
        else if (view === "calendar") renderCalendar();
    });
});
```

---

## Component Architecture

### Modal System

**Structure:**
```html
<div id="task-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Create Task</h2>
            <button onclick="closeModal('task-modal')">&times;</button>
        </div>
        <form id="task-form">
            <!-- Form fields -->
        </form>
    </div>
</div>
```

**Lifecycle:**
```javascript
// Open for new item
function openTaskModal() {
    document.getElementById('task-form').reset();
    delete document.getElementById('task-form').dataset.editingTaskId;
    document.getElementById('task-modal').classList.add('active');
}

// Open for editing
function openTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId);
    populateFormFields(task);
    document.getElementById('task-form').dataset.editingTaskId = taskId;
    document.getElementById('task-modal').classList.add('active');
}

// Submit
document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const editingId = e.target.dataset.editingTaskId;

    if (editingId) {
        updateTask(parseInt(editingId));
    } else {
        createTask();
    }

    closeModal('task-modal');
    renderTasks();
});

// Close
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
```

### Custom Dropdowns

Nautilus uses custom dropdowns (not HTML `<select>`) for status, priority, and project selection.

**Structure:**
```html
<div class="status-dropdown" id="status-dropdown">
    <input type="hidden" id="hidden-status" name="status" value="todo">
    <div class="status-current" id="status-current">
        <span class="status-badge todo">To Do</span>
        <span class="dropdown-arrow">▼</span>
    </div>
    <div class="dropdown-panel" id="status-panel">
        <div class="dropdown-list">
            <div class="status-option" data-status="todo">
                <span class="status-badge todo">To Do</span>
            </div>
            <!-- More options -->
        </div>
    </div>
</div>
```

**Behavior:**
```javascript
function handleStatusDropdown(e) {
    // Toggle dropdown
    if (e.target.closest("#status-current")) {
        const dropdown = e.target.closest(".status-dropdown");
        dropdown.classList.toggle("active");
    }

    // Select option
    if (e.target.closest(".status-option")) {
        const status = e.target.closest(".status-option").dataset.status;
        document.getElementById("hidden-status").value = status;
        updateStatusDisplay(status);
        document.querySelector(".status-dropdown").classList.remove("active");
    }
}

document.addEventListener("click", (e) => {
    // Close on outside click
    if (!e.target.closest(".status-dropdown")) {
        document.querySelector(".status-dropdown")?.classList.remove("active");
    }
});
```

### Notification System

**Implementation:**
```javascript
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Error notification shorthand
function showErrorNotification(message) {
    showNotification(message, 'error');
}
```

**Types:**
- `info` - General information (blue)
- `success` - Success confirmation (green)
- `error` - Error message (red)

---

## Feature Systems

### Filtering System

**Filter State:**
```javascript
filterState = {
    search: "",                    // Free text search
    statuses: new Set(),           // e.g., Set(['todo', 'progress'])
    priorities: new Set(),         // e.g., Set(['high'])
    projects: new Set(),           // e.g., Set([1, 'none'])
    tags: new Set(),               // e.g., Set(['urgent', 'none'])
    dateFrom: "",                  // YYYY-MM-DD
    dateTo: ""                     // YYYY-MM-DD
};
```

**Filtering Logic:**
```javascript
function getFilteredTasks() {
    const search = filterState.search.toLowerCase();
    const selStatus = filterState.statuses;
    const selPriority = filterState.priorities;
    const selProjects = filterState.projects;
    const selTags = filterState.tags;
    const dateFrom = filterState.dateFrom;
    const dateTo = filterState.dateTo;

    return tasks.filter((task) => {
        // Search filter
        const searchOK = !search ||
            task.title.toLowerCase().includes(search) ||
            task.description.toLowerCase().includes(search);

        // Status filter
        const statusOK = selStatus.size === 0 || selStatus.has(task.status);

        // Priority filter
        const priorityOK = selPriority.size === 0 || selPriority.has(task.priority);

        // Project filter
        let projectOK = selProjects.size === 0;
        if (!projectOK) {
            if (selProjects.has('none') && !task.projectId) projectOK = true;
            else if (selProjects.has(task.projectId)) projectOK = true;
        }

        // Tag filter (similar logic)
        // Date range filter (check if task dates overlap)

        return searchOK && statusOK && priorityOK && projectOK && tagOK && dateOK;
    });
}
```

### Sorting System

**Priority-Based Sort:**
```javascript
const priorityOrder = { high: 0, medium: 1, low: 2 };

function sortTasksByPriority(tasksToSort) {
    return tasksToSort.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.id - b.id; // Fallback to ID
    });
}
```

**Manual Sort:**
```javascript
let manualOrder = [3, 1, 5, 2, 4];  // Array of task IDs in order

function sortTasksManually(tasksToSort) {
    return tasksToSort.sort((a, b) => {
        const indexA = manualOrder.indexOf(a.id);
        const indexB = manualOrder.indexOf(b.id);

        if (indexA === -1 && indexB === -1) return a.id - b.id;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
}
```

### Color Management

**Constants:**
```javascript
const PROJECT_COLORS = [
    '#6C5CE7', '#3742FA', '#E84393', '#00B894', '#0984E3',
    '#00CEC9', '#E17055', '#9B59B6', '#2F3542', '#FF3838',
    '#6C5B7B', '#C44569', '#F8B500', '#5758BB', '#74B9FF'
];

const TAG_COLORS = [
    '#dc2626', '#ea580c', '#b45309', '#ca8a04', '#16a34a',
    '#059669', '#0ea5a4', '#0284c7', '#0369a1', '#4338ca',
    '#7c3aed', '#6b21a8', '#be185d', '#e11d48', '#065f46',
    '#334155'
];
```

**Color Allocation:**
```javascript
function getProjectColor(projectId) {
    if (!projectColorMap[projectId]) {
        // Find next available color
        const usedColors = new Set(Object.values(projectColorMap));
        const availableColors = PROJECT_COLORS.filter(c => !usedColors.has(c));
        projectColorMap[projectId] = availableColors[0] || PROJECT_COLORS[0];
    }
    return projectColorMap[projectId];
}

function getTagColor(tagName) {
    if (!tagColorMap[tagName]) {
        const keys = Object.keys(tagColorMap);
        const index = keys.length % TAG_COLORS.length;
        tagColorMap[tagName] = TAG_COLORS[index];
    }
    return tagColorMap[tagName];
}
```

---

## Deployment Architecture

### Cloudflare Workers

**Configuration (wrangler.toml):**
```toml
name = "nautilus"
main = "functions/api/storage.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "NAUTILUS_DATA"
id = "..."

[[kv_namespaces]]
binding = "NAUTILUS_FILES"
id = "..."
```

**Storage Endpoint (functions/api/storage.js):**
```javascript
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (request.method === 'GET') {
        const value = await env.NAUTILUS_DATA.get(key);
        return new Response(value || "null", {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (request.method === 'POST') {
        const data = await request.text();
        await env.NAUTILUS_DATA.put(key, data);
        return new Response('OK');
    }
}
```

**Files Endpoint (functions/api/files.js):**
```javascript
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (request.method === 'GET') {
        const file = await env.NAUTILUS_FILES.get(key);
        return new Response(file);
    }

    if (request.method === 'POST') {
        const data = await request.text();
        await env.NAUTILUS_FILES.put(key, data);
        return new Response('OK');
    }

    if (request.method === 'DELETE') {
        await env.NAUTILUS_FILES.delete(key);
        return new Response('OK');
    }
}
```

### Deployment Commands

```bash
# Deploy to production
wrangler publish

# Deploy to preview
wrangler publish --env preview

# Local development
wrangler dev

# View logs
wrangler tail
```

---

## Performance Considerations

### Optimization Patterns

1. **Lazy Rendering**
   - Only render visible view (Kanban/List/Calendar)
   - Don't re-render on state changes that don't affect current view

2. **Debounced Search**
   ```javascript
   let searchTimeout;
   searchInput.addEventListener('input', (e) => {
       clearTimeout(searchTimeout);
       searchTimeout = setTimeout(() => {
           filterState.search = e.target.value;
           renderCurrentView();
       }, 220);
   });
   ```

3. **Guard Flags**
   - `isInitializing` prevents saves during load
   - Prevents infinite loops and unnecessary API calls

4. **Event Delegation**
   - Single listener on parent instead of many on children
   - Used for dynamic elements (task cards, dropdown options)

5. **requestAnimationFrame for Calendar**
   ```javascript
   function renderCalendar() {
       requestAnimationFrame(() => {
           // Heavy DOM manipulation
       });
   }
   ```

### Token Efficiency for AI

See [CLAUDE.md](../CLAUDE.md) for detailed token efficiency protocols when working with this codebase.

---

## Security Considerations

### Lock System

**Password Protection:**
- Single shared password: `'uniocean'` (case-insensitive)
- 24-hour session stored in localStorage
- Lock overlay blocks all UI until unlocked

**Implementation (lock/lock.js):**
```javascript
const PASSWORD = 'uniocean';
const SESSION_MS = 24 * 60 * 60 * 1000; // 24 hours

function checkSession() {
    const unlockedAt = localStorage.getItem('nautilus_unlocked_at');
    if (unlockedAt) {
        const elapsed = Date.now() - parseInt(unlockedAt);
        if (elapsed < SESSION_MS) {
            hideOverlay();
            return true;
        }
    }
    return false;
}

function unlock(inputPassword) {
    if (inputPassword.toLowerCase() === PASSWORD) {
        localStorage.setItem('nautilus_unlocked_at', Date.now().toString());
        hideOverlay();
    } else {
        showError();
    }
}
```

### Data Security

- **No sensitive data encryption** - Lock is access control only
- **No authentication** - Single shared password
- **No user accounts** - Single-user application
- **Client-side only** - All data visible in browser

**Recommendations for Production:**
- Add proper authentication (OAuth, JWT)
- Encrypt sensitive data at rest
- Implement rate limiting on Workers
- Add CORS restrictions
- Use environment variables for secrets

---

## Browser Compatibility

**Minimum Requirements:**
- ES6+ support (async/await, arrow functions, const/let, template literals)
- localStorage API
- CSS Grid and Flexbox
- CSS Variables (custom properties)
- Fetch API
- contenteditable attribute

**Tested Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Known Issues:**
- `contenteditable` behavior varies across browsers
- Date picker (flatpickr) requires JavaScript enabled
- No mobile app wrapper (PWA capabilities not implemented)

---

## Migration Notes

### Deprecated Fields

**Task.dueDate → Task.endDate**
```javascript
// Migration logic in loadDataFromKV()
tasks.forEach(task => {
    if (task.dueDate && !task.endDate) {
        task.endDate = task.dueDate;
    }
    delete task.dueDate;

    // Ensure new fields exist
    if (task.startDate === undefined) task.startDate = "";
    if (task.endDate === undefined) task.endDate = "";
});
```

### Data Version Management

Currently no explicit versioning. Future versions should:
1. Add `dataVersion` field to root of each stored array
2. Implement migration functions keyed by version
3. Run migrations sequentially on load

```javascript
// Proposed pattern
const CURRENT_DATA_VERSION = 2;
const migrations = {
    1: (data) => { /* dueDate → endDate */ },
    2: (data) => { /* future migration */ }
};

function migrateData(data, fromVersion, toVersion) {
    for (let v = fromVersion + 1; v <= toVersion; v++) {
        data = migrations[v](data);
    }
    return data;
}
```

---

## Appendix: Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| [index.html](../index.html) | - | Single-page app structure, all HTML |
| [app.js](../app.js) | 7,864 | All application logic, event handlers, rendering |
| [style.css](../style.css) | - | All styling, responsive design, dark mode |
| [storage-client.js](../storage-client.js) | - | KV storage abstraction (save/load) |
| [lock/lock.js](../lock/lock.js) | - | Password protection, session management |
| [functions/api/storage.js](../functions/api/storage.js) | - | Cloudflare Worker for data storage |
| [functions/api/files.js](../functions/api/files.js) | - | Cloudflare Worker for file storage |

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0
