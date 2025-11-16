# Nautilus UI Patterns

This document defines reusable UI patterns and components used throughout Nautilus. All patterns include working code examples from the codebase.

---

## Table of Contents

1. [Modal Pattern](#modal-pattern)
2. [Custom Dropdown Pattern](#custom-dropdown-pattern)
3. [Card Components](#card-components)
4. [Form Patterns](#form-patterns)
5. [Button Patterns](#button-patterns)
6. [Badge Components](#badge-components)
7. [Tag System](#tag-system)
8. [Notification System](#notification-system)
9. [Table Patterns](#table-patterns)
10. [Drag & Drop (Kanban)](#drag--drop-kanban)
11. [Calendar View](#calendar-view)
12. [Filter System](#filter-system)
13. [Attachment Display](#attachment-display)
14. [Empty States](#empty-states)

---

## Modal Pattern

### Structure

```html
<div id="task-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Create Task</h2>
            <button class="modal-close" onclick="closeModal('task-modal')">&times;</button>
        </div>
        <div class="modal-body">
            <form id="task-form">
                <!-- Form content -->
            </form>
        </div>
    </div>
</div>
```

### CSS

```css
.modal {
    display: none;                     /* Hidden by default */
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);   /* Backdrop */
    z-index: 1000;
    align-items: center;
    justify-content: center;
}

.modal.active {
    display: flex;                     /* Show when active */
}

.modal-content {
    background: var(--bg-card);
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    max-width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border);
}

.modal-close {
    background: none;
    border: none;
    font-size: 28px;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
}

.modal-body {
    padding: 20px;
}
```

### JavaScript

```javascript
// Open modal (new item)
function openTaskModal() {
    const form = document.getElementById('task-form');
    form.reset();
    delete form.dataset.editingTaskId;

    // Update header
    document.querySelector('#task-modal h2').textContent = 'Create Task';

    // Show modal
    document.getElementById('task-modal').classList.add('active');
}

// Open modal (edit mode)
function openTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const form = document.getElementById('task-form');
    form.dataset.editingTaskId = taskId;

    // Populate form fields
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').innerHTML = task.description;
    document.getElementById('hidden-status').value = task.status;
    document.getElementById('hidden-priority').value = task.priority;
    // ... more fields

    // Update header
    document.querySelector('#task-modal h2').textContent = 'Edit Task';

    // Show modal
    document.getElementById('task-modal').classList.add('active');
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');

    // Optional: Reset form
    const form = modal.querySelector('form');
    if (form) form.reset();
}

// Click outside to close
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});
```

### Usage

```javascript
// Open for new item
openTaskModal();

// Open for editing
openTaskDetails(123);

// Close programmatically
closeModal('task-modal');
```

---

## Custom Dropdown Pattern

Nautilus uses custom dropdowns instead of HTML `<select>` for better styling control.

### Structure

```html
<div class="status-dropdown" id="status-dropdown">
    <!-- Hidden input holds actual value -->
    <input type="hidden" id="hidden-status" name="status" value="todo">

    <!-- Display button -->
    <div class="status-current" id="status-current">
        <span class="status-badge todo">To Do</span>
        <span class="dropdown-arrow">▼</span>
    </div>

    <!-- Options panel -->
    <div class="dropdown-panel" id="status-panel">
        <div class="dropdown-list">
            <div class="status-option" data-status="todo">
                <span class="status-badge todo">To Do</span>
            </div>
            <div class="status-option" data-status="progress">
                <span class="status-badge progress">In Progress</span>
            </div>
            <div class="status-option" data-status="review">
                <span class="status-badge review">Review</span>
            </div>
            <div class="status-option" data-status="done">
                <span class="status-badge done">Done</span>
            </div>
        </div>
    </div>
</div>
```

### CSS

```css
.status-dropdown {
    position: relative;
    width: 100%;
}

.status-current {
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

.status-current:hover {
    border-color: var(--accent-blue);
}

.dropdown-arrow {
    margin-left: 8px;
    font-size: 12px;
    color: var(--text-muted);
    transition: transform 0.2s;
}

.status-dropdown.active .dropdown-arrow {
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

.status-dropdown.active .dropdown-panel {
    display: block;
}

.dropdown-list {
    max-height: 240px;
    overflow-y: auto;
}

.status-option {
    padding: 10px 12px;
    cursor: pointer;
    transition: background 0.15s;
}

.status-option:hover {
    background: var(--bg-tertiary);
}

.status-option:first-child {
    border-radius: 6px 6px 0 0;
}

.status-option:last-child {
    border-radius: 0 0 6px 6px;
}
```

### JavaScript

```javascript
function setupStatusDropdown() {
    const dropdown = document.getElementById('status-dropdown');
    const current = document.getElementById('status-current');
    const hiddenInput = document.getElementById('hidden-status');

    // Toggle dropdown
    current.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');

        // Close other dropdowns
        document.querySelectorAll('.status-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('active');
        });
    });

    // Select option
    dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.status-option');
        if (!option) return;

        const status = option.dataset.status;
        hiddenInput.value = status;

        // Update display
        current.querySelector('.status-badge').className = `status-badge ${status}`;
        current.querySelector('.status-badge').textContent =
            statusLabels[status];

        // Close dropdown
        dropdown.classList.remove('active');
    });
}

// Close all dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.status-dropdown')) {
        document.querySelectorAll('.status-dropdown').forEach(d => {
            d.classList.remove('active');
        });
    }
});

// Constants for labels
const statusLabels = {
    todo: 'To Do',
    progress: 'In Progress',
    review: 'Review',
    done: 'Done'
};
```

### Variations

**Priority Dropdown:**
```html
<div class="priority-dropdown">
    <input type="hidden" id="hidden-priority" name="priority" value="medium">
    <div class="priority-current">
        <span class="priority-dot medium"></span>
        <span>Medium</span>
        <span class="dropdown-arrow">▼</span>
    </div>
    <div class="dropdown-panel">
        <div class="priority-option" data-priority="high">
            <span class="priority-dot high"></span>
            <span>High</span>
        </div>
        <div class="priority-option" data-priority="medium">
            <span class="priority-dot medium"></span>
            <span>Medium</span>
        </div>
        <div class="priority-option" data-priority="low">
            <span class="priority-dot low"></span>
            <span>Low</span>
        </div>
    </div>
</div>
```

**Project Dropdown (with colors):**
```html
<div class="project-dropdown">
    <input type="hidden" id="hidden-project" name="projectId" value="">
    <div class="project-current">
        <span class="project-color-dot" style="background: #6C5CE7;"></span>
        <span>Select Project</span>
        <span class="dropdown-arrow">▼</span>
    </div>
    <div class="dropdown-panel">
        <div class="project-option" data-project="">
            <span>No Project</span>
        </div>
        <!-- Dynamically populated -->
    </div>
</div>
```

---

## Card Components

### Task Card (Kanban)

```html
<div class="task-card" data-task-id="123" draggable="true">
    <div class="task-card-header">
        <h4 class="task-title">Fix login bug</h4>
        <span class="priority-dot high"></span>
    </div>

    <div class="task-meta">
        <div class="task-tags">
            <span class="tag-badge" style="background: #dc2626;">urgent</span>
            <span class="tag-badge" style="background: #0284c7;">frontend</span>
        </div>

        <div class="task-dates">
            <span class="task-date">15/11/2025</span>
        </div>

        <div class="task-project" style="color: #6C5CE7;">
            <span class="project-dot" style="background: #6C5CE7;"></span>
            Website Redesign
        </div>
    </div>
</div>
```

### CSS

```css
.task-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
}

.task-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent-blue);
}

.task-card.dragging {
    opacity: 0.5;
}

.task-card.selected {
    border-color: var(--accent-blue);
    background: var(--bg-tertiary);
}

.task-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
}

.task-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
    line-height: 1.4;
}

.task-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.task-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.task-date {
    font-size: 12px;
    color: var(--text-muted);
}

.task-project {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
}

.project-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}
```

### Project Card

```html
<div class="project-card">
    <div class="project-header">
        <div class="project-color-swatch" style="background: #6C5CE7;"></div>
        <div class="project-info">
            <h3 class="project-name">Website Redesign</h3>
            <p class="project-description">Complete overhaul of company website</p>
        </div>
        <div class="project-actions">
            <button onclick="editProject(123)">✏️</button>
            <button onclick="deleteProject(123)">🗑️</button>
        </div>
    </div>

    <div class="project-stats">
        <div class="project-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 65%;"></div>
            </div>
            <span class="progress-text">65% Complete</span>
        </div>

        <div class="task-breakdown">
            <span class="status-count todo">3 To Do</span>
            <span class="status-count progress">2 In Progress</span>
            <span class="status-count review">1 Review</span>
            <span class="status-count done">7 Done</span>
        </div>
    </div>

    <div class="project-dates">
        <span>01/10/2025 - 31/12/2025</span>
    </div>
</div>
```

### Dashboard Stat Card

```html
<div class="stat-card">
    <div class="stat-icon">
        📊
    </div>
    <div class="stat-content">
        <h3 class="stat-value">12</h3>
        <p class="stat-label">Active Projects</p>
    </div>
</div>
```

```css
.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.2s;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.stat-icon {
    font-size: 32px;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: 12px;
}

.stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 4px 0;
}

.stat-label {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
}
```

---

## Form Patterns

### Form Group (Standard Layout)

```html
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
        placeholder="Enter task title"
        required
    />
</div>
```

### CSS

```css
.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 6px;
}

.required {
    color: var(--accent-red);
}

.form-input,
.form-textarea {
    width: 100%;
    padding: 10px 12px;
    font-size: 14px;
    color: var(--text-primary);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    transition: all 0.2s;
    font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-textarea {
    min-height: 100px;
    resize: vertical;
}

.form-input::placeholder,
.form-textarea::placeholder {
    color: var(--text-muted);
}
```

### Rich Text Editor

```html
<div class="form-group">
    <label class="form-label">Description</label>

    <!-- Toolbar -->
    <div class="editor-toolbar">
        <button type="button" class="editor-btn" data-command="bold">
            <strong>B</strong>
        </button>
        <button type="button" class="editor-btn" data-command="italic">
            <em>I</em>
        </button>
        <button type="button" class="editor-btn" data-command="underline">
            <u>U</u>
        </button>
        <div class="toolbar-divider"></div>
        <button type="button" class="editor-btn" data-command="insertUnorderedList">
            • List
        </button>
        <button type="button" class="editor-btn" data-command="insertOrderedList">
            1. List
        </button>
        <div class="toolbar-divider"></div>
        <button type="button" class="editor-btn" data-command="formatBlock" data-value="h1">
            H1
        </button>
        <button type="button" class="editor-btn" data-command="formatBlock" data-value="h2">
            H2
        </button>
        <button type="button" class="editor-btn" data-command="formatBlock" data-value="h3">
            H3
        </button>
        <div class="toolbar-divider"></div>
        <button type="button" class="editor-btn" data-command="insertHorizontalRule">
            ―
        </button>
        <button type="button" class="editor-btn" onclick="insertChecklist()">
            ☑ Checklist
        </button>
    </div>

    <!-- Editable area -->
    <div
        id="task-description"
        class="editor-content"
        contenteditable="true"
        data-placeholder="Enter task description..."
    ></div>
</div>
```

```javascript
// Setup toolbar
document.querySelectorAll('.editor-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.dataset.command;
        const value = btn.dataset.value;

        document.execCommand(command, false, value);

        // Return focus to editor
        document.getElementById('task-description').focus();
    });
});

// Insert checklist
function insertChecklist() {
    const editor = document.getElementById('task-description');
    const checkboxRow = document.createElement('div');
    checkboxRow.className = 'checkbox-row';
    checkboxRow.innerHTML = `
        <input type="checkbox" class="checkbox-toggle">
        <span class="check-text" contenteditable="true">Checklist item</span>
    `;
    editor.appendChild(checkboxRow);
}

// Handle checkbox changes
document.getElementById('task-description').addEventListener('change', (e) => {
    if (e.target.classList.contains('checkbox-toggle')) {
        const row = e.target.closest('.checkbox-row');
        row.classList.toggle('completed', e.target.checked);
    }
});
```

### Date Picker (flatpickr)

```html
<div class="form-group">
    <label class="form-label" for="task-start-date">Start Date</label>
    <input
        type="text"
        id="task-start-date"
        name="startDate"
        class="form-input date-picker"
        placeholder="DD/MM/YYYY"
    />
</div>
```

```javascript
function initializeDatePickers() {
    flatpickr('.date-picker', {
        dateFormat: 'd/m/Y',           // Display format
        altFormat: 'Y-m-d',            // ISO format for backend
        allowInput: true,
        locale: {
            firstDayOfWeek: 1          // Monday
        }
    });
}
```

---

## Button Patterns

### Primary Button

```html
<button class="btn btn-primary" onclick="submitForm()">
    Create Task
</button>
```

### Secondary Button

```html
<button class="btn btn-secondary" onclick="closeModal()">
    Cancel
</button>
```

### Danger Button

```html
<button class="btn btn-danger" onclick="deleteTask()">
    Delete
</button>
```

### Icon Button

```html
<button class="btn-icon" onclick="toggleTheme()">
    🌙
</button>
```

### CSS

```css
.btn {
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
}

.btn-primary {
    background: var(--accent-blue);
    color: white;
}

.btn-primary:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
}

.btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border);
}

.btn-secondary:hover {
    background: var(--bg-secondary);
}

.btn-danger {
    background: var(--accent-red);
    color: white;
}

.btn-danger:hover {
    background: #dc2626;
}

.btn-icon {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: background 0.2s;
}

.btn-icon:hover {
    background: var(--bg-tertiary);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

---

## Badge Components

### Status Badge

```html
<span class="status-badge todo">To Do</span>
<span class="status-badge progress">In Progress</span>
<span class="status-badge review">Review</span>
<span class="status-badge done">Done</span>
```

```css
.status-badge {
    display: inline-block;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 12px;
    text-transform: capitalize;
}

.status-badge.todo {
    background: var(--accent-amber);
    color: white;
}

.status-badge.progress {
    background: var(--accent-blue);
    color: white;
}

.status-badge.review {
    background: var(--accent-amber);
    color: white;
}

.status-badge.done {
    background: var(--accent-green);
    color: white;
}
```

### Priority Dot

```html
<span class="priority-dot high"></span>
<span class="priority-dot medium"></span>
<span class="priority-dot low"></span>
```

```css
.priority-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.priority-dot.high {
    background: var(--accent-red);
}

.priority-dot.medium {
    background: var(--accent-amber);
}

.priority-dot.low {
    background: var(--accent-green);
}
```

### Tag Badge

```html
<span class="tag-badge" style="background: #dc2626;">urgent</span>
```

```css
.tag-badge {
    display: inline-block;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 4px;
    color: white;
}
```

---

## Tag System

### Tag Input

```html
<div class="form-group">
    <label class="form-label">Tags</label>
    <div class="tag-input-container">
        <div class="tag-list" id="tag-list">
            <!-- Dynamically added tags -->
        </div>
        <div class="tag-input-row">
            <input
                type="text"
                id="tag-input"
                class="form-input"
                placeholder="Add tag..."
            />
            <button type="button" class="btn btn-secondary" onclick="addTag()">
                Add
            </button>
        </div>
    </div>
</div>
```

### JavaScript

```javascript
let currentTags = [];

function addTag() {
    const input = document.getElementById('tag-input');
    const tagName = input.value.trim().toLowerCase();

    if (!tagName || currentTags.includes(tagName)) return;

    currentTags.push(tagName);
    renderTags();
    input.value = '';
}

function removeTag(tagName) {
    currentTags = currentTags.filter(t => t !== tagName);
    renderTags();
}

function renderTags() {
    const container = document.getElementById('tag-list');
    container.innerHTML = currentTags.map(tag => {
        const color = getTagColor(tag);
        return `
            <div class="tag-item" style="background: ${color};">
                <span>${tag}</span>
                <button
                    type="button"
                    class="tag-remove"
                    onclick="removeTag('${tag}')"
                >&times;</button>
            </div>
        `;
    }).join('');
}
```

```css
.tag-input-container {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    background: var(--bg-card);
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
}

.tag-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 4px;
    color: white;
    font-size: 12px;
}

.tag-remove {
    background: none;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.tag-input-row {
    display: flex;
    gap: 8px;
}
```

---

## Notification System

### Implementation

```javascript
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    return icons[type] || icons.info;
}

// Shorthand functions
function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showSuccessNotification(message) {
    showNotification(message, 'success');
}
```

### CSS

```css
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    min-width: 300px;
    max-width: 500px;
    padding: 16px;
    background: var(--bg-card);
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    z-index: 9999;
    opacity: 0;
    transform: translateX(400px);
    transition: all 0.3s ease;
}

.notification.show {
    opacity: 1;
    transform: translateX(0);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.notification-icon {
    font-size: 20px;
    flex-shrink: 0;
}

.notification-message {
    font-size: 14px;
    color: var(--text-primary);
}

.notification-success {
    border-left: 4px solid var(--accent-green);
}

.notification-success .notification-icon {
    color: var(--accent-green);
}

.notification-error {
    border-left: 4px solid var(--accent-red);
}

.notification-error .notification-icon {
    color: var(--accent-red);
}

.notification-info {
    border-left: 4px solid var(--accent-blue);
}

.notification-info .notification-icon {
    color: var(--accent-blue);
}

.notification-warning {
    border-left: 4px solid var(--accent-amber);
}

.notification-warning .notification-icon {
    color: var(--accent-amber);
}
```

### Usage

```javascript
// Success
showSuccessNotification('Task created successfully!');

// Error
showErrorNotification('Failed to save task');

// Info
showNotification('Auto-saved at ' + new Date().toLocaleTimeString(), 'info');

// Warning
showNotification('You have 3 overdue tasks', 'warning');
```

---

## Table Patterns

### Sortable Table (List View)

```html
<div class="table-container">
    <table class="task-table">
        <thead>
            <tr>
                <th onclick="sortTable('title')">
                    Task <span class="sort-indicator">↕</span>
                </th>
                <th onclick="sortTable('priority')">
                    Priority <span class="sort-indicator">↕</span>
                </th>
                <th onclick="sortTable('status')">
                    Status <span class="sort-indicator">↕</span>
                </th>
                <th>Tags</th>
                <th onclick="sortTable('project')">
                    Project <span class="sort-indicator">↕</span>
                </th>
                <th onclick="sortTable('endDate')">
                    Due Date <span class="sort-indicator">↕</span>
                </th>
            </tr>
        </thead>
        <tbody id="task-table-body">
            <!-- Rows dynamically populated -->
        </tbody>
    </table>
</div>
```

### JavaScript

```javascript
let currentSort = { column: null, direction: 'asc' };

function sortTable(column) {
    // Toggle direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    // Update indicators
    document.querySelectorAll('.sort-indicator').forEach(ind => {
        ind.textContent = '↕';
    });

    const indicator = event.target.querySelector('.sort-indicator');
    indicator.textContent = currentSort.direction === 'asc' ? '↑' : '↓';

    // Re-render with sorted data
    renderListView();
}

function renderListView() {
    const filtered = getFilteredTasks();

    // Sort
    if (currentSort.column) {
        filtered.sort((a, b) => {
            let aVal = a[currentSort.column];
            let bVal = b[currentSort.column];

            // Handle special cases
            if (currentSort.column === 'project') {
                const projectA = projects.find(p => p.id === a.projectId);
                const projectB = projects.find(p => p.id === b.projectId);
                aVal = projectA?.name || '';
                bVal = projectB?.name || '';
            }

            const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            return currentSort.direction === 'asc' ? comparison : -comparison;
        });
    }

    // Render rows
    const tbody = document.getElementById('task-table-body');
    tbody.innerHTML = filtered.map(task => {
        const project = projects.find(p => p.id === task.projectId);
        return `
            <tr onclick="openTaskDetails(${task.id})">
                <td>${task.title}</td>
                <td>
                    <span class="priority-dot ${task.priority}"></span>
                    ${task.priority}
                </td>
                <td>
                    <span class="status-badge ${task.status}">
                        ${statusLabels[task.status]}
                    </span>
                </td>
                <td>
                    ${task.tags.map(tag => `
                        <span class="tag-badge" style="background: ${getTagColor(tag)};">
                            ${tag}
                        </span>
                    `).join('')}
                </td>
                <td>
                    ${project ? `
                        <span style="color: ${getProjectColor(project.id)};">
                            <span class="project-dot" style="background: ${getProjectColor(project.id)};"></span>
                            ${project.name}
                        </span>
                    ` : '—'}
                </td>
                <td>${task.endDate ? toDMYFromISO(task.endDate) : '—'}</td>
            </tr>
        `;
    }).join('');
}
```

### CSS

```css
.table-container {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 8px;
}

.task-table {
    width: 100%;
    border-collapse: collapse;
}

.task-table th {
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-weight: 600;
    text-align: left;
    padding: 12px 16px;
    border-bottom: 2px solid var(--border);
    cursor: pointer;
    user-select: none;
}

.task-table th:hover {
    background: var(--bg-tertiary);
}

.sort-indicator {
    margin-left: 4px;
    color: var(--text-muted);
    font-size: 12px;
}

.task-table tbody tr {
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s;
}

.task-table tbody tr:hover {
    background: var(--bg-tertiary);
}

.task-table td {
    padding: 12px 16px;
    color: var(--text-primary);
}
```

---

## Drag & Drop (Kanban)

See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md#implementing-drag--drop) for full implementation details.

### Basic Structure

```html
<div class="kanban-column" data-status="todo">
    <div class="kanban-header">
        <h3>To Do</h3>
        <span class="task-count">5</span>
    </div>
    <div class="kanban-tasks" ondragover="allowDrop(event)" ondrop="handleDrop(event)">
        <!-- Task cards here -->
    </div>
</div>
```

### Drag Events

```javascript
// Make cards draggable
card.draggable = true;
card.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    e.target.classList.add('dragging');

    // Handle multi-select
    if (selectedCards.has(task.id)) {
        draggedCards = Array.from(selectedCards);
    } else {
        draggedCards = [task.id];
    }
});

card.addEventListener('dragend', (e) => {
    e.target.classList.remove('dragging');
});

// Drop zone
function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const column = e.currentTarget.closest('.kanban-column');
    const newStatus = column.dataset.status;

    draggedCards.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (task) task.status = newStatus;
    });

    saveTasks();
    renderTasks();
    e.currentTarget.classList.remove('drag-over');
}
```

---

## Filter System

See full implementation in [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md#working-with-filters).

### Filter Toolbar

```html
<div class="filters-toolbar">
    <input
        type="text"
        id="filter-search"
        class="filter-search"
        placeholder="Search tasks..."
    />

    <button class="filter-button" onclick="toggleFilter('status')">
        Status <span class="filter-count-badge">2</span>
    </button>

    <button class="filter-button" onclick="toggleFilter('priority')">
        Priority <span class="filter-count-badge">1</span>
    </button>

    <button class="clear-filters-btn" onclick="clearAllFilters()">
        Clear All
    </button>
</div>

<div class="active-filters" id="active-filters">
    <!-- Filter chips dynamically added -->
</div>
```

### Filter Chips

```javascript
function renderActiveFilters() {
    const container = document.getElementById('active-filters');
    const chips = [];

    // Status chips
    filterState.statuses.forEach(status => {
        chips.push(`
            <div class="filter-chip" onclick="removeStatusFilter('${status}')">
                <span class="status-badge ${status}">${statusLabels[status]}</span>
                <span class="chip-remove">×</span>
            </div>
        `);
    });

    // Priority chips
    filterState.priorities.forEach(priority => {
        chips.push(`
            <div class="filter-chip" onclick="removePriorityFilter('${priority}')">
                <span class="priority-dot ${priority}"></span>
                ${priority}
                <span class="chip-remove">×</span>
            </div>
        `);
    });

    container.innerHTML = chips.join('');
    container.style.display = chips.length > 0 ? 'flex' : 'none';
}
```

---

## Empty States

```html
<div class="empty-state">
    <div class="empty-icon">📋</div>
    <h3 class="empty-title">No tasks yet</h3>
    <p class="empty-description">
        Create your first task to get started
    </p>
    <button class="btn btn-primary" onclick="openTaskModal()">
        Create Task
    </button>
</div>
```

```css
.empty-state {
    text-align: center;
    padding: 60px 20px;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
}

.empty-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
}

.empty-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 24px 0;
}
```

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0

See also:
- [CODING_CONVENTIONS.md](CODING_CONVENTIONS.md) - Code style guide
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Step-by-step implementation guides
- [VISUAL_GUIDELINES.md](../VISUAL_GUIDELINES.md) - Visual design standards
