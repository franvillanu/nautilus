# Codex Configuration for Nautilus

**Purpose:** GitHub Copilot and ChatGPT configuration for Nautilus development.

**Use Case:** When Claude token limits hit, switch to ChatGPT/Copilot using this config.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Specs-Driven Development](#specs-driven-development)
3. [Code Patterns](#code-patterns)
4. [Git Workflow](#git-workflow)
5. [Common Tasks](#common-tasks)

---

## Project Overview

**Nautilus** is a task and project management SPA built with vanilla JavaScript.

### Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Cloudflare Workers + KV storage
- **No frameworks, no build step** - runs directly in browser
- **Libraries:** flatpickr (date picker, CDN)

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| [app.js](app.js) | All application logic | 7,864 |
| [index.html](index.html) | Single-page HTML structure | - |
| [style.css](style.css) | All styling, responsive, dark mode | - |
| [storage-client.js](storage-client.js) | KV storage abstraction | - |
| [lock/lock.js](lock/lock.js) | Password protection | - |

### Project Structure

```
Nautilus/
├── app.js                    # Core logic
├── index.html                # SPA structure
├── style.css                 # All styles
├── storage-client.js         # Storage API
├── lock/                     # Password system
├── functions/api/            # Cloudflare Workers
├── specs/                    # 📚 Read these first!
│   ├── ARCHITECTURE.md
│   ├── UI_PATTERNS.md
│   ├── CODING_CONVENTIONS.md
│   └── DEVELOPMENT_GUIDE.md
├── plans/                    # Implementation plans
├── templates/                # Code templates
├── CLAUDE.md                 # Claude AI config
├── CODEX.md                  # This file
├── VISUAL_GUIDELINES.md      # Design standards
└── README.md
```

---

## Specs-Driven Development

### Rule #1: Read Specs Before Code

**ALWAYS check specs first:**

| Task | Spec File | Contains |
|------|-----------|----------|
| Understand architecture | [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) | Data structures, tech stack, data flow |
| Find UI component | [specs/UI_PATTERNS.md](specs/UI_PATTERNS.md) | Modals, dropdowns, cards, forms, tables |
| Learn code style | [specs/CODING_CONVENTIONS.md](specs/CODING_CONVENTIONS.md) | Naming, formatting, best practices |
| Implement feature | [specs/DEVELOPMENT_GUIDE.md](specs/DEVELOPMENT_GUIDE.md) | Step-by-step guides with code examples |
| Design UI | [VISUAL_GUIDELINES.md](VISUAL_GUIDELINES.md) | Colors, typography, spacing, accessibility |

**Why Specs-First?**
- ✅ Faster than reading code
- ✅ Shows intended patterns
- ✅ Includes working examples
- ✅ Prevents inconsistencies

### Quick Spec Lookup

**Q:** "How do I add a new page?"
**A:** [specs/DEVELOPMENT_GUIDE.md#adding-a-new-page](specs/DEVELOPMENT_GUIDE.md#adding-a-new-page)

**Q:** "What's the task data structure?"
**A:** [specs/ARCHITECTURE.md#core-data-structures](specs/ARCHITECTURE.md#core-data-structures)

**Q:** "How do modals work?"
**A:** [specs/UI_PATTERNS.md#modal-pattern](specs/UI_PATTERNS.md#modal-pattern)

**Q:** "What naming convention for functions?"
**A:** [specs/CODING_CONVENTIONS.md#functions](specs/CODING_CONVENTIONS.md#functions)

**Q:** "What colors to use?"
**A:** [VISUAL_GUIDELINES.md#color-system](VISUAL_GUIDELINES.md#color-system)

---

## Code Patterns

### Data Structures (Reference)

**Task:**
```javascript
{
    id: number,                       // Auto-increment
    title: string,                    // Required
    description: string,              // HTML content
    projectId: number | null,
    priority: 'low' | 'medium' | 'high',
    status: 'todo' | 'progress' | 'review' | 'done',
    startDate: string,                // ISO: YYYY-MM-DD
    endDate: string,                  // ISO: YYYY-MM-DD
    tags: string[],
    attachments: object[],
    createdAt: string                 // ISO timestamp
}
```

**Project:**
```javascript
{
    id: number,
    name: string,
    description: string,
    startDate: string,                // Required
    endDate: string,                  // Optional
    createdAt: string
}
```

### Naming Conventions

| Pattern | Example | Usage |
|---------|---------|-------|
| `show*` | `showPage()` | Display/make visible |
| `open*` | `openTaskModal()` | Open modal/dialog |
| `close*` | `closeModal()` | Close modal |
| `toggle*` | `toggleTheme()` | Switch state |
| `render*` | `renderTasks()` | DOM rendering |
| `get*` | `getFilteredTasks()` | Retrieve computed values |
| `update*` | `updateFilterBadges()` | Refresh UI |
| `handle*` | `handleDrop()` | Event handler |
| `save*` | `saveTasks()` | Persist to storage |

**Variables:** camelCase (`currentUser`, `isInitializing`)
**Constants:** UPPER_SNAKE_CASE (`TAG_COLORS`, `MAX_FILE_SIZE`)
**CSS Classes:** lowercase-with-hyphens (`task-card`, `status-badge`)

### Common Patterns

**Modal Pattern:**
```javascript
function openTaskModal() {
    document.getElementById('task-form').reset();
    document.getElementById('task-modal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
```

**Custom Dropdown:**
```javascript
// Toggle
dropdown.addEventListener('click', (e) => {
    dropdown.classList.toggle('active');
});

// Select option
option.addEventListener('click', (e) => {
    hiddenInput.value = option.dataset.value;
    display.textContent = option.textContent;
    dropdown.classList.remove('active');
});
```

**Filtering:**
```javascript
function getFilteredTasks() {
    return tasks.filter(task => {
        const searchOK = !search || task.title.includes(search);
        const statusOK = !selectedStatuses.size || selectedStatuses.has(task.status);
        return searchOK && statusOK;
    });
}
```

**Async Save:**
```javascript
async function saveTasks() {
    if (isInitializing) return;  // Prevent save during load

    try {
        await saveData('tasks', tasks);
    } catch (error) {
        console.error('Save failed:', error);
        showErrorNotification('Failed to save tasks');
    }
}
```

### Code Organization (app.js)

```javascript
// === GLOBAL STATE ===
let projects = [];
let tasks = [];

// === CONSTANTS ===
const TAG_COLORS = [...];

// === UTILITY FUNCTIONS ===
function getFilteredTasks() { }

// === RENDER FUNCTIONS ===
function renderTasks() { }

// === EVENT HANDLERS ===
function setupNavigation() { }

// === DATA PERSISTENCE ===
async function saveTasks() { }

// === INITIALIZATION ===
async function init() { }
```

---

## Git Workflow

### Branch-Based Development

**Never commit directly to main.** Always use feature branches.

### Step 0: Check Branch

```bash
git branch --show-current
```

If on `main`, create branch:

```bash
git checkout -b feature/descriptive-name
```

### Standard Workflow

**1. Create Branch:**
```bash
git checkout -b feature/add-category-filter
```

**2. Push Branch Immediately:**
```bash
git push -u origin feature/add-category-filter
```

**3. Make Changes & Commit:**
```bash
git add .
git commit -m "Add category filter

- Added category field to tasks
- Created dropdown component
- Implemented filter logic"

git push
```

**4. Create Pull Request (via GitHub UI)**

**5. Review & Merge (via GitHub UI)**

### Commit Message Format

```
Short summary (50 chars or less)

Detailed explanation:
- Bullet point 1
- Bullet point 2

Co-Authored-By: AI Assistant <noreply@example.com>
```

### Branch Naming

| Type | Prefix | Example |
|------|--------|---------|
| Feature | `feature/` | `feature/category-filter` |
| Bug Fix | `fix/` | `fix/date-picker-bug` |
| Refactor | `refactor/` | `refactor/modal-system` |
| Docs | `docs/` | `docs/api-guide` |
| Chore | `chore/` | `chore/update-deps` |

### Pre-Commit Hook

A git hook prevents accidental commits to main:

```bash
# .git/hooks/pre-commit
if [ "$(git branch --show-current)" = "main" ]; then
    echo "❌ ERROR: Direct commits to main not allowed"
    exit 1
fi
```

---

## Common Tasks

### 1. Add New Page

**Spec:** [specs/DEVELOPMENT_GUIDE.md#adding-a-new-page](specs/DEVELOPMENT_GUIDE.md#adding-a-new-page)

**Steps:**
1. Add HTML in [index.html](index.html) - new `.page` div
2. Add nav link in sidebar
3. Add routing in `hashchange` listener (app.js)
4. Create `render{PageName}()` function
5. Add CSS if needed

**Example:**
```html
<!-- index.html -->
<div class="page" id="analytics">
    <div class="page-header">
        <h1>Analytics</h1>
    </div>
    <div class="page-content" id="analytics-content"></div>
</div>
```

```javascript
// app.js
function renderAnalytics() {
    const container = document.getElementById('analytics-content');
    container.innerHTML = `<div class="stats-grid">...</div>`;
}
```

### 2. Add New Filter

**Spec:** [specs/DEVELOPMENT_GUIDE.md#implementing-a-new-filter](specs/DEVELOPMENT_GUIDE.md#implementing-a-new-filter)

**Steps:**
1. Update `filterState` object (app.js)
2. Add filter UI in [index.html](index.html)
3. Create toggle function
4. Update `getFilteredTasks()` logic
5. Update `updateFilterBadges()`
6. Add to `clearAllFilters()`

### 3. Add New Data Field

**Spec:** [specs/DEVELOPMENT_GUIDE.md#adding-a-new-data-field](specs/DEVELOPMENT_GUIDE.md#adding-a-new-data-field)

**Steps:**
1. Update data structure (task/project creation)
2. Add form field to modal
3. Populate field when editing
4. Update task when saving
5. Display in UI (optional)
6. Add data migration

### 4. Create New Modal

**Spec:** [specs/DEVELOPMENT_GUIDE.md#creating-a-new-modal](specs/DEVELOPMENT_GUIDE.md#creating-a-new-modal)

**Steps:**
1. Add HTML structure in [index.html](index.html)
2. Create `open{Modal}()` function
3. Create `close{Modal}()` function
4. Add form submission handler
5. Add trigger button

### 5. Fix Bug

**Process:**
1. Locate function using grep/search
2. Understand current logic
3. Implement fix following conventions
4. Test in both light and dark mode
5. Add error handling if needed

---

## Design Standards (Quick Ref)

### Colors

Use CSS variables:

```css
var(--bg-primary)      /* Page background */
var(--bg-card)         /* Card backgrounds */
var(--text-primary)    /* Main text */
var(--text-muted)      /* Secondary text */
var(--accent-blue)     /* Primary actions */
var(--accent-green)    /* Success */
var(--accent-red)      /* Error, high priority */
```

### Typography

- **Page Title:** 28px, weight 700
- **Section Title:** 20px, weight 600
- **Body:** 14px, weight 400
- **Caption:** 12px, weight 500

### Spacing

Use multiples of 4px:

- **xs:** 4px (tight spacing)
- **sm:** 8px (small gaps)
- **md:** 16px (standard)
- **lg:** 20px (large gaps)
- **xl:** 24px (extra large)
- **2xl:** 32px (section breaks)

### Buttons

```css
.btn-primary {
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    background: var(--accent-blue);
    color: white;
}
```

### Cards

```css
.card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
```

---

## Best Practices

### Code Quality

✅ **DO:**
- Use CSS variables for all colors
- Follow naming conventions
- Add error handling for async operations
- Show user notifications for actions
- Validate input data
- Test in light and dark mode
- Keep functions under 50 lines
- Comment complex logic

❌ **DON'T:**
- Hardcode colors
- Use `var` (use `const`/`let`)
- Commit directly to main
- Skip error handling
- Forget to test dark mode
- Re-read files unnecessarily
- Create 200-line functions

### Performance

✅ **DO:**
- Use `isInitializing` flag to prevent saves during load
- Debounce search input
- Batch DOM updates
- Use event delegation for dynamic elements

❌ **DON'T:**
- Call save on every keystroke
- Read files multiple times
- Create event listeners in loops
- Manipulate DOM in loops

### Git

✅ **DO:**
- Create feature branches
- Push branch early
- Write descriptive commit messages
- Create PRs for review

❌ **DON'T:**
- Commit to main
- Use generic commit messages ("fix stuff")
- Force push to main
- Skip code review

---

## Getting Help

### Documentation

1. **Check specs first:** [specs/](specs/)
2. **Visual guidelines:** [VISUAL_GUIDELINES.md](VISUAL_GUIDELINES.md)
3. **This file:** [CODEX.md](CODEX.md)
4. **Claude config:** [CLAUDE.md](CLAUDE.md)

### Code Examples

- All patterns: [specs/UI_PATTERNS.md](specs/UI_PATTERNS.md)
- All guides: [specs/DEVELOPMENT_GUIDE.md](specs/DEVELOPMENT_GUIDE.md)
- Existing code: Search in [app.js](app.js) for similar functionality

### Common Questions

**Q: How do I add X?**
A: Check [specs/DEVELOPMENT_GUIDE.md](specs/DEVELOPMENT_GUIDE.md) for step-by-step guide

**Q: What's the pattern for Y?**
A: Check [specs/UI_PATTERNS.md](specs/UI_PATTERNS.md) for component examples

**Q: What colors should I use?**
A: Check [VISUAL_GUIDELINES.md#color-system](VISUAL_GUIDELINES.md#color-system)

**Q: How should I name this function?**
A: Check [specs/CODING_CONVENTIONS.md#functions](specs/CODING_CONVENTIONS.md#functions)

---

## Quick Reference

### File Locations

```
specs/ARCHITECTURE.md          # Tech stack, data flow
specs/UI_PATTERNS.md           # Component examples
specs/CODING_CONVENTIONS.md    # Code style
specs/DEVELOPMENT_GUIDE.md     # How-to guides
VISUAL_GUIDELINES.md           # Design standards
CLAUDE.md                      # Claude AI config
CODEX.md                       # This file
templates/page-template.html   # New page starter
plans/README.md                # Planning framework
```

### Key Files to Know

- [app.js](app.js) - All logic (7,864 lines)
- [index.html](index.html) - HTML structure
- [style.css](style.css) - All styles
- [storage-client.js](storage-client.js) - Storage API

### Git Commands

```bash
# Check branch
git branch --show-current

# Create branch
git checkout -b feature/name

# Push branch
git push -u origin feature/name

# Commit
git add .
git commit -m "Message"
git push
```

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0

**Use this config when:**
- Claude token limits hit
- Using GitHub Copilot
- Using ChatGPT for code generation
- Need quick reference for Nautilus patterns

**Remember:** Specs-first, branch-based workflow, follow conventions!
