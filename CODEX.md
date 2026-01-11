# Codex Configuration for Nautilus

**Purpose:** GitHub Copilot and ChatGPT configuration for Nautilus development.

**Use Case:** When Claude token limits hit, switch to ChatGPT/Copilot using this config.

**Agent Protocol:** This file is the repo's agent instruction source (equivalent to `AGENTS.md`).

---

## Table of Contents

1. [**🚀 REGISTRY SYSTEM - READ THIS FIRST**](#registry-system---read-this-first)
2. [**⚡ OPERATION PROTOCOLS - Token-Efficient Patterns**](#operation-protocols---token-efficient-patterns)
3. [Project Overview](#project-overview)
4. [Specs-Driven Development](#specs-driven-development)
5. [Code Patterns](#code-patterns)
6. [Git Workflow](#git-workflow)
7. [Common Tasks](#common-tasks)

---

## REGISTRY SYSTEM - READ THIS FIRST

⚠️ **CRITICAL: This applies to ChatGPT, Copilot, and ALL AI assistants**

### The Problem

Nautilus uses monolithic architecture:
- **app.js**: 19,389 lines (~150,000 tokens to read)
- **style.css**: 14,697 lines (~90,000 tokens to read)
- **index.html**: 2,175 lines (~20,000 tokens to read)

**Reading these files kills your context window and costs money.**

---

### The Solution: Hotspots + Registries

#### Hotspot Index (read FIRST for recurring UI work)

**Location**: [specs/HOTSPOTS.md](specs/HOTSPOTS.md)

If the request matches a hotspot, use those pointers first. Only fall back to registries if needed.

#### Paired Surfaces (prevent "desktop only" fixes)

**Location**: [specs/PAIRED_SURFACES.md](specs/PAIRED_SURFACES.md)

Always check desktop + mobile + theme + i18n for UI changes.

#### Local Snippet Extraction (lowest token path)

**Script**: [scripts/extract-snippet.ps1](scripts/extract-snippet.ps1)

Use it to paste only 30-80 lines to the AI and request a unified diff.

#### Recurring Counters (tiny, no log sprawl)

**Location**: [specs/RECURRING_COUNTERS.json](specs/RECURRING_COUNTERS.json)

Only increment a key when a change exceeds the token threshold AND matches an existing category.

---

### The Solution: THREE REGISTRIES

#### 1. [specs/FUNCTION_REGISTRY.md](specs/FUNCTION_REGISTRY.md)

**Use instead of reading app.js**

Contains:
- 56 most frequently edited functions (out of 371 total)
- Exact line numbers (100% verified)
- Function signatures
- Dependencies
- Edit patterns

**Savings**: 150,000 tokens → 1,000 tokens = **150x faster**

**Example**:
```
❌ Wrong: Read app.js to find renderTasks()
✅ Right: Check FUNCTION_REGISTRY → Line 7736 → Edit directly
```

---

#### 2. [specs/CSS_REGISTRY_VERIFIED.md](specs/CSS_REGISTRY_VERIFIED.md)

**Use instead of reading style.css**

Contains:
- All component styles with line numbers (100% VERIFIED)
- **Desktop AND mobile sections linked together**
- Prevents "forgot mobile" bugs

**Savings**: 90,000 tokens → 400 tokens = **225x faster**

**Example**:
```
❌ Wrong: Read style.css → Change desktop → Forget mobile → Bug
✅ Right: Check CSS_REGISTRY_VERIFIED → Change desktop (lines 6629-6708) AND mobile (lines 4164-4227)
```

---

#### 3. [specs/HTML_REGISTRY_VERIFIED.md](specs/HTML_REGISTRY_VERIFIED.md)

**Use instead of reading index.html**

Contains:
- All pages, modals, sections with line numbers (100% VERIFIED)
- Quick navigation to any HTML component

**Savings**: 20,000 tokens → 200 tokens = **100x faster**

---

### MANDATORY WORKFLOW FOR ALL AIs

**BEFORE touching any code:**

```
Step 0: Check specs/HOTSPOTS.md for a matching recurring target

Step 1: Identify file type
  - JavaScript? -> specs/FUNCTION_REGISTRY.md
  - CSS? -> specs/CSS_REGISTRY_VERIFIED.md
  - HTML? -> specs/HTML_REGISTRY_VERIFIED.md

Step 2: Open registry, find component, get line number

Step 3: Edit directly at that line

NEVER read main files without checking hotspots/registry first!
```

---

### Special Rule for CSS (CRITICAL!)

**ALWAYS edit BOTH desktop AND mobile sections!**

CSS_REGISTRY_VERIFIED links them together:
```
Component: Task Card
- Desktop: Lines 6629-6700
- Mobile: Lines 4164-4230

→ Edit BOTH sections every time
→ This prevents bugs user experienced before
```

---

### ChatGPT-Specific Instructions

When user switches to you from Claude (due to Claude token limits):

1. **Start by reading:**
   - [specs/FUNCTION_REGISTRY.md](specs/FUNCTION_REGISTRY.md)
   - [specs/CSS_REGISTRY_VERIFIED.md](specs/CSS_REGISTRY_VERIFIED.md)
   - [specs/HTML_REGISTRY_VERIFIED.md](specs/HTML_REGISTRY_VERIFIED.md)

2. **Use registries for ALL edits** (don't read main files)

3. **If editing CSS:** Check BOTH desktop and mobile sections

4. **If registry is outdated:**
   ```bash
   # Find new line number
   grep -n "function newFunction" app.js

   # Update appropriate registry
   Edit specs/FUNCTION_REGISTRY.md (or CSS/HTML_REGISTRY_VERIFIED.md)
   ```

5. **Follow the same Git Workflow** (see below)

---

### Token Budget Impact

**Before Registries** (typical session):
- Read app.js: 150,000 tokens
- Read style.css: 90,000 tokens
- Total: 240,000 tokens = Budget exceeded ❌

**After Registries** (same session):
- Use registries: ~5,000 tokens total
- Stay within budget ✅

**Savings: 98% token reduction**

---

### Why This Matters for Fran

- **Cost**: €90/month → €20/month (stays in Pro budget)
- **Efficiency**: 2 operations/session → 39 operations/session
- **Use Case**: Affordable for helping wife's marine biologist friends 🐋
- **AI switching**: Can now switch between Claude/ChatGPT without re-reading files

---

## OPERATION PROTOCOLS - Token-Efficient Patterns

⚠️ **MANDATORY: Use these protocols for ALL code operations**

**Problem**: Even with registries, small edits like swapping two HTML elements consumed 22,000 tokens (11% of budget). These protocols reduce that to 3,000-4,000 tokens (1.5-2%).

**Solution**: Operation-specific patterns that minimize file reads using grep-based boundary finding.

---

### PROTOCOL SELECTION

**Before ANY code operation, identify the pattern:**

```
What am I doing?
├─ Reordering HTML elements? → Protocol 1
├─ Changing CSS property values? → Protocol 2
├─ Adding form field? → Protocol 3
├─ Modifying JavaScript function? → Protocol 4
├─ Adding new component? → Protocol 5
├─ Swapping CSS classes? → Protocol 6
└─ Other structural change? → Protocol 7
```

---

Expanded selection list (ASCII):
```
What am I doing?
- Reordering HTML elements? -> Protocol 1
- Changing CSS property values? -> Protocol 2
- Adding form field? -> Protocol 3
- Modifying JavaScript function logic? -> Protocol 4
- Adding new component? -> Protocol 5
- Swapping CSS classes? -> Protocol 6
- Deleting component/section? -> Protocol 8
- Duplicating/cloning component? -> Protocol 9
- Editing user-facing text/copy? -> Protocol 10
- Renaming IDs/data-attributes? -> Protocol 11
- Updating CSS variables/theme tokens? -> Protocol 12
- None of the above? -> Protocol 7
```

---

### Paired Surfaces (MANDATORY)

Before any UI/CSS change, follow [specs/PAIRED_SURFACES.md](specs/PAIRED_SURFACES.md).

### PROTOCOL 1: Reordering HTML Elements

**Token Budget**: 3,000-4,000 tokens

**Steps**:
1. **Registry**: Get parent section line numbers (~0 tokens, cached)
2. **Grep**: Verify exact boundaries (~100-200 tokens)
3. **Read**: Minimal context with offset/limit (~2,000-3,000 tokens)
4. **Edit**: Precise old_string/new_string (~500 tokens)

**Example**:
```
Task: Swap end date and start date filters

Registry: End date (976-992), Start date (994-1010)
Grep: grep -n "group-end-date\|group-start-date" index.html
Read: Read index.html offset=970 limit=50
Edit: Swap the two 17-line blocks

Total: 3,100 tokens ✅ (vs 22,000 without protocol)
```

---

### PROTOCOL 2: Changing CSS Property Values

**Token Budget**: 1,200-1,500 tokens

**Steps**:
1. **Registry**: Get component line numbers for desktop + mobile
2. **Grep**: Find exact rule (~100-200 tokens)
3. **Read**: Only rule blocks (~500-800 tokens)
4. **Edit**: Change property values (~600 tokens)

**CRITICAL**: Always edit BOTH desktop AND mobile sections!

---

### PROTOCOL 3: Adding Form Field

**Token Budget**: 2,000-3,000 tokens

**Steps**:
1. **Registries**: HTML + function locations (3 places to edit)
2. **Grep**: Find insertion points (~200 tokens)
3. **Read**: Minimal context for each location (~1,500 tokens)
4. **Edit**: Add field HTML + processing code (~800 tokens)

---

### PROTOCOL 4: Modifying JavaScript Function

**Token Budget**: 1,500-2,500 tokens

**Steps**:
1. **FUNCTION_REGISTRY**: Get function line number
2. **Grep**: Verify function boundaries (~100 tokens)
3. **Read**: Function + small context (~1,500-2,000 tokens)
4. **Edit**: Change logic (~300-500 tokens)

---

### PROTOCOL 5: Adding New Component

**Token Budget**: 4,000-6,000 tokens

**Steps**:
1. **All Registries**: HTML + CSS + JS locations
2. **Grep**: Find similar patterns to copy (~300 tokens)
3. **Read**: Three context areas (~3,000 tokens)
4. **Edit**: HTML + CSS (desktop+mobile) + JS (~1,500 tokens)

---

### PROTOCOL 6: Swapping CSS Class Names

**Token Budget**: 1,000-1,500 tokens (or 500 with replace_all)

**Steps**:
1. **Grep**: Find all occurrences (~200 tokens)
2. **Count**: If >3 occurrences, use replace_all flag
3. **Edit**: Use replace_all=true to rename all at once (~300 tokens)

**Pro tip**: replace_all requires NO file reads! Saves massive tokens.

---

### PROTOCOL 7: Complex Multi-Edit

**Token Budget**: 5,000-8,000 tokens

**Steps**:
1. **Map**: Registry + Grep all touch points (~500 tokens)
2. **Read**: Each area minimally (~3,000-4,000 tokens)
3. **Edit**: In dependency order (~2,000-3,000 tokens)
4. **Verify**: Check each edit before next

---

### PROTOCOL 8: Deleting Component/Section

**Token Budget**: 2,500-4,000 tokens

**Steps**:
1. **Registries**: Map HTML/CSS/JS touch points
2. **Grep**: Find all references
3. **Read**: Minimal context for each file
4. **Edit**: Delete HTML, CSS (desktop+mobile), JS logic
5. **Grep**: Confirm zero references remain

---

### PROTOCOL 9: Duplicate/Clone Component

**Token Budget**: 3,000-4,500 tokens

**Steps**:
1. **Registries**: Locate source block
2. **Grep**: Find source markers
3. **Read**: Minimal context
4. **Edit**: Duplicate block, update ids/labels
5. **JS Hooks**: Update app.js via Protocol 4 if needed

---

### PROTOCOL 10: Edit Text/Copy

**Token Budget**: 600-1,200 tokens

**Steps**:
1. **Grep -F**: Find exact string
2. **Narrow**: If multiple matches, target file
3. **Read**: 5-10 lines of context
4. **Edit**: Change string (replace_all if repeated)

---

### PROTOCOL 11: Rename IDs/Data Attributes

**Token Budget**: 1,000-2,000 tokens

**Steps**:
1. **Grep**: Find old id/data in HTML/CSS/JS
2. **Choose**: Targeted reads or replace_all
3. **Edit**: Update id + label[for] + aria + selectors

---

### PROTOCOL 12: Update CSS Variables/Theme Tokens

**Token Budget**: 800-1,500 tokens

**Steps**:
1. **Registry**: Locate :root variables
2. **Grep**: Find variable name
3. **Read**: Minimal context
4. **Edit**: Update values (renames use Protocol 11)

---

### Debug Logging Toggle (MANDATORY)

When adding logs, they must be gated by the Settings toggle.

**Rules:**
- Setting key: `settings.debugLogsEnabled` (default `false`)
- Mirror to localStorage: `debugLogsEnabled` (string `"true"`/`"false"`)
- Client logs only when enabled; avoid logging raw payloads or screenshots
- Server logs only when request header `X-Debug-Logs: 1` is present (pass `X-Request-Id` for correlation)

---

### PROTOCOL CHECKLIST

**Before EVERY operation:**

- [ ] Selected correct protocol?
- [ ] Checked specs/HOTSPOTS.md for a matching recurring target?
- [ ] Checked registry FIRST?
- [ ] Used grep for exact locations?
- [ ] Reading MINIMUM context? (offset/limit, not full file)
- [ ] For CSS: Editing BOTH desktop AND mobile?
- [ ] Applied specs/PAIRED_SURFACES.md (theme + i18n + multi-view)?
- [ ] If renaming IDs/data attributes, did I update labels/aria/JS selectors?

**If NO to any: STOP and restart with correct protocol.**

---

### TARGET TOKEN USAGE

| Operation | Protocol | Target | Max | % Budget |
|-----------|----------|--------|-----|----------|
| Reorder HTML | 1 | 3,000-4,000 | 5,000 | 2% |
| CSS Property | 2 | 1,200-1,500 | 2,000 | 0.75% |
| Add Form Field | 3 | 2,000-3,000 | 4,000 | 1.5% |
| Edit Function | 4 | 1,500-2,500 | 3,500 | 1.25% |
| New Component | 5 | 4,000-6,000 | 8,000 | 3% |
| Swap Classes | 6 | 1,000-1,500 | 2,500 | 0.75% |
| Delete Component | 8 | 2,500-4,000 | 5,000 | 2% |
| Duplicate Component | 9 | 3,000-4,500 | 6,000 | 2.5% |
| Edit Text/Copy | 10 | 600-1,200 | 1,500 | 0.5% |
| Rename IDs/Data | 11 | 1,000-2,000 | 2,500 | 0.75% |
| Update CSS Variables | 12 | 800-1,500 | 2,000 | 0.75% |
| Complex Multi | 7 | 5,000-8,000 | 10,000 | 4% |

**If you exceed "Max": You did NOT follow the protocol correctly.**

---

### COMMON MISTAKES TO AVOID

❌ **Reading full section when you only need one element**
- Bad: Read 127 lines (all filters)
- Good: Read 35 lines (just two filters to swap)

❌ **Using massive old_string/new_string**
- Bad: 70 lines + 70 lines
- Good: 17 lines + 17 lines

❌ **Reading file multiple times**
- Bad: Read → Edit → Read again → Edit
- Good: Read ONCE with both elements → Edit both

❌ **Not using replace_all for repeated changes**
- Bad: Read + Edit 8 times individually
- Good: Edit replace_all=true once (no reads!)

---

### REAL EXAMPLE: Filter Swap Failure

**What Happened (WITHOUT Protocol)**:
- Read 70 lines → 6,000 tokens
- Edit 70+70 lines → 16,000 tokens
- **Total: 22,000 tokens (11% budget) ❌**

**What SHOULD Have Happened (WITH Protocol 1)**:
- Registry lookup → 0 tokens
- Grep verify → 100 tokens
- Read 50 lines → 2,500 tokens
- Edit 17+17 lines → 500 tokens
- **Total: 3,100 tokens (1.5% budget) ✅**

**Lesson**: Protocol saved 18,900 tokens (7x reduction)

---

## Project Overview

**Nautilus** is a task and project management SPA built with vanilla JavaScript.

### Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Cloudflare Workers + KV storage
- **No frameworks, no build step** - runs directly in browser
- **Libraries:** flatpickr (date picker, CDN)

### Key Files

| File | Purpose | Lines | Tokens (if read) |
|------|---------|-------|------------------|
| [app.js](app.js) | All application logic | 19,389 | ~150,000 |
| [index.html](index.html) | Single-page HTML structure | 2,175 | ~20,000 |
| [style.css](style.css) | All styling, responsive, dark mode | 14,697 | ~90,000 |
| [storage-client.js](storage-client.js) | KV storage abstraction | ~200 | ~1,500 |
| [lock/lock.js](lock/lock.js) | Password protection | ~300 | ~2,000 |

⚠️ **DO NOT read app.js, style.css, or index.html directly!** Use the registries in `specs/` folder instead.

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

### Role Profiles (Auto-Select) - Mandatory
When no role is specified, choose the best fit based on the request:
- Architect: planning, design, interfaces, risks, scope clarification.
- Implementer: code changes, feature work, bug fixes, tests.
- Reviewer: review diffs, find issues, give verdict.
- QA: test strategy, edge cases, fixtures, validation.

See `.sdd/README.md` for usage and templates.

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

### UI Icon Preference

- Never use the `📎` (paperclip) icon in the UI.

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

**3. Make Changes**

⚠️ **CRITICAL: Before committing, if you changed app.js or style.css, MUST bump version in index.html!**

Due to `_headers` file, JS/CSS are cached for **1 YEAR** by Cloudflare. Same URL = cached version served!

```html
<!-- If you changed app.js, update this line in index.html: -->
<script src="app.js?v=YYYYMMDD-feature-name"></script>

<!-- If you changed style.css, update this line in index.html: -->
<link rel="stylesheet" href="style.css?v=YYYYMMDD-feature-name">
```

**Format:** `YYYYMMDD-feature-name` (e.g., `20260109-backlog-notifications`)

**If you forget:** Users will see OLD code for up to 1 year! Features will appear broken!

**4. Commit Changes:**
```bash
git add .
git commit -m "Add category filter

- Added category field to tasks
- Created dropdown component
- Implemented filter logic
- Bumped app.js version to 20260109-category-filter"

git push
```

**5. Create Pull Request (via GitHub UI)**

**6. Review & Merge (via GitHub UI)**

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

