# Claude Configuration for Nautilus

**Purpose:** Token-efficient development protocols and git workflow for Claude AI assistant.

**Target:** 10x token reduction (25,500 → 2,550 tokens per 10 operations)

---

## Table of Contents

1. [Token Efficiency Protocol](#token-efficiency-protocol)
2. [Git Workflow](#git-workflow)
3. [Project Context](#project-context)
4. [Task Execution Protocol](#task-execution-protocol)
5. [Common Operations](#common-operations)
6. [Error Recovery](#error-recovery)

---

## Token Efficiency Protocol

### Core Principle

**NEVER RE-READ CACHED FILES.** If a file has been read in this session, reference it from cache.

### Token Cost Table

| Operation | Tokens | When to Use |
|-----------|--------|-------------|
| **Read full file** | ~6,000 (app.js) | First time only, or after confirmed external changes |
| **Grep search** | ~50-200 | Find specific code without reading full file |
| **Glob pattern** | ~30-100 | Locate files by pattern |
| **Edit** | ~100-300 | Modify existing code (preferred over Write) |
| **Write** | ~1,000-6,000 | Create new files or complete rewrites |
| **Task agent** | ~500-2,000 | Complex multi-step exploration |

### Information Theory Principles

**1. Context Caching**
- First read = expensive (6,000 tokens)
- Cache hit = nearly free
- **Rule:** Read once, reference many times

**2. Semantic Chunking**
- Don't read entire files to find one function
- Use Grep to locate, then Edit in place
- Example: `Grep: "function renderTasks"` → `Edit: renderTasks() body`

**3. Differential Operations**
- Edit over Write (edit modifies only changed lines)
- Grep over Read (searches without loading full content)
- Glob over listing directories

**4. Progressive Escalation**
- Level 1: Grep for specific code → Edit
- Level 2: If not found, Read related file section
- Level 3: If still unclear, use Task agent for broader search
- **Never skip to Level 3 immediately**

### Hard Rules

**NEVER:**
- ❌ Re-read cached files "to be sure"
- ❌ Read entire file to change one function
- ❌ Use Write when Edit will work
- ❌ Use Task agent for simple searches
- ❌ Read multiple files when Grep across codebase is faster

**ALWAYS:**
- ✅ Use Grep to locate code before reading
- ✅ Use Edit for modifications (not Write)
- ✅ Reference specs documents instead of re-reading code
- ✅ Batch tool calls in parallel when possible
- ✅ Ask user for clarification rather than reading 5+ files

### Session Awareness

**Token Budget Thresholds:**

| Usage | Mode | Behavior |
|-------|------|----------|
| **0-30%** | Normal | Standard operations, can read files as needed |
| **30-60%** | Conservative | Prefer Grep/Glob, minimize reads, reference specs |
| **60-80%** | Ultra-concise | Only essential operations, no exploratory reads |
| **80-100%** | Critical | Stop and ask user to start new session |

**Check token usage before each operation:**
```
Current: 45,000 / 200,000 tokens (22.5%)
→ Mode: Normal
→ Action: Can read 1-2 files if needed, prefer Grep
```

### Measured Token Costs (Real Examples)

**Scenario 1: Add new filter**
- ❌ Inefficient: Read app.js (6,000) + Read index.html (2,000) + Write app.js (6,000) = **14,000 tokens**
- ✅ Efficient: Grep "filterState" (100) + Edit app.js filterState block (200) + Grep "filters-toolbar" (100) + Edit index.html (200) = **600 tokens**
- **Savings: 23x reduction**

**Scenario 2: Fix bug in renderTasks()**
- ❌ Inefficient: Read app.js (6,000) + Write app.js (6,000) = **12,000 tokens**
- ✅ Efficient: Grep "function renderTasks" (100) + Edit renderTasks() only (300) = **400 tokens**
- **Savings: 30x reduction**

**Scenario 3: Understand project structure**
- ❌ Inefficient: Read app.js + index.html + style.css (15,000) = **15,000 tokens**
- ✅ Efficient: Read specs/ARCHITECTURE.md (1,200) = **1,200 tokens**
- **Savings: 12.5x reduction**

### Token Efficiency Checklist

Before each operation, ask:

1. **Have I read this file in this session?**
   - If yes → Use cache, don't re-read
   - If no → Proceed to step 2

2. **Do I need the whole file?**
   - If yes → Read it (first time only)
   - If no → Use Grep to find specific section

3. **Am I modifying existing code?**
   - If yes → Use Edit (not Write)
   - If no → Use Write for new files

4. **Is this info in specs?**
   - If yes → Reference specs (don't read code)
   - If no → Proceed with code operation

5. **Can I batch operations?**
   - If yes → Combine tool calls in single message
   - If no → Execute sequentially

---

## Git Workflow

### Strict Branch Workflow

**0. FIRST: Check Current Branch**
```bash
git branch --show-current
```

**If on main → Create branch IMMEDIATELY:**
```bash
git checkout -b feature/descriptive-name
```

### Standard Workflow

**Step 1: Create Branch**
```bash
git checkout -b feature/add-category-filter
```

**Step 2: Push Branch Immediately (Even if Empty)**
```bash
git push -u origin feature/add-category-filter
```
**Why:** Publishes branch early, enables collaboration, prevents conflicts

**Step 3: Make Changes & Commit**
```bash
# Work on feature
git add .
git commit -m "Add category filter to tasks

- Added category field to task schema
- Created category dropdown component
- Implemented category filtering logic

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push
```

**Step 4: STOP - User Creates PR**
- AI pushes branch
- AI responds: "Branch `feature/add-category-filter` pushed. Create PR on GitHub when ready."
- **User** creates PR via GitHub UI
- **User** reviews changes
- **User** merges PR

### What AI Can Do

✅ **Allowed:**
- Create branches (`git checkout -b`)
- Commit to branches
- Push branches (`git push`)
- Push updates (`git push`)
- Check status (`git status`)
- View diffs (`git diff`)
- View log (`git log`)

❌ **NOT Allowed (Default):**
- Checkout main + merge (bypasses PR workflow)
- Push to main directly
- Force push to main
- Merge PRs without explicit user request
- Create AND merge PR in one command

### Exception: Explicit PR Request

**When user explicitly says "create the PR":**
```bash
gh pr create --title "Add category filter" --body "$(cat <<'EOF'
## Summary
- Added category field to tasks
- Implemented filtering by category

## Test Plan
- [ ] Test category dropdown
- [ ] Test filtering
- [ ] Test persistence

🤖 Generated with Claude Code
EOF
)"
```
**Do NOT auto-merge.** User still merges via GitHub.

**When user explicitly says "create PR AND merge":**
```bash
# Create PR
gh pr create --title "..." --body "..."

# Merge with squash (after creation)
gh pr merge --squash
```

### Default Response to "Merge to Main"

**User:** "Merge this to main"

**AI Response:**
```
Branch `feature/add-category-filter` is ready and pushed.

To merge to main:
1. Create PR on GitHub
2. Review changes
3. Merge PR

Or I can create the PR for you with `gh pr create` (you still merge).
```

### Pre-Commit Hook Protection

**Location:** `.git/hooks/pre-commit`

**Purpose:** Block commits to main branch

```bash
#!/bin/sh
branch=$(git branch --show-current)

if [ "$branch" = "main" ]; then
    echo "❌ ERROR: Direct commits to main are not allowed"
    echo "Create a feature branch:"
    echo "  git checkout -b feature/your-feature-name"
    exit 1
fi

exit 0
```

**Installation:** (Done via SDD setup, see `.git/hooks/pre-commit`)

### Commit Message Format

```
Short summary (50 chars or less)

Detailed explanation if needed:
- Bullet point 1
- Bullet point 2
- Bullet point 3

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Use HEREDOC for multi-line messages:**
```bash
git commit -m "$(cat <<'EOF'
Add category filter to tasks

- Added category dropdown
- Implemented filter logic
- Updated UI patterns

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Branch Naming Conventions

| Type | Prefix | Example |
|------|--------|---------|
| **Feature** | `feature/` | `feature/category-filter` |
| **Bug Fix** | `fix/` | `fix/date-filter-logic` |
| **Refactor** | `refactor/` | `refactor/color-system` |
| **Documentation** | `docs/` | `docs/api-guide` |
| **Chore** | `chore/` | `chore/update-deps` |

**Naming rules:**
- Lowercase with hyphens
- Descriptive but concise
- No issue numbers (use PR description)

---

## Project Context

### Quick Reference

**Project:** Nautilus - Task & Project Management SPA

**Tech Stack:**
- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- Cloudflare Workers + KV
- No build step, no frameworks

**Key Files:**
- [app.js](app.js) - 7,864 lines, all application logic
- [index.html](index.html) - Single-page HTML structure
- [style.css](style.css) - All styling, light/dark mode
- [storage-client.js](storage-client.js) - KV abstraction

**Specs (Read these, NOT code):**
- [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) - Tech stack, data structures, architecture
- [specs/UI_PATTERNS.md](specs/UI_PATTERNS.md) - Reusable components with code examples
- [specs/CODING_CONVENTIONS.md](specs/CODING_CONVENTIONS.md) - Naming, style, best practices
- [specs/DEVELOPMENT_GUIDE.md](specs/DEVELOPMENT_GUIDE.md) - Step-by-step implementation guides
- [VISUAL_GUIDELINES.md](VISUAL_GUIDELINES.md) - Colors, typography, spacing, accessibility

### Data Structures (Reference)

**Task:**
```javascript
{
    id: number,
    title: string,
    description: string,      // HTML content
    category: string,
    projectId: number | null,
    priority: 'low' | 'medium' | 'high',
    status: 'todo' | 'progress' | 'review' | 'done',
    startDate: string,        // ISO YYYY-MM-DD
    endDate: string,          // ISO YYYY-MM-DD
    tags: string[],
    attachments: object[],
    createdAt: string         // ISO timestamp
}
```

**Project:**
```javascript
{
    id: number,
    name: string,
    description: string,
    startDate: string,        // ISO, required
    endDate: string,          // ISO, optional
    createdAt: string
}
```

### Global State (Reference)

```javascript
let projects = [];
let tasks = [];
let filterState = {
    search: "",
    statuses: new Set(),
    priorities: new Set(),
    projects: new Set(),
    tags: new Set(),
    dateFrom: "",
    dateTo: ""
};
let projectCounter = 1;
let taskCounter = 1;
let isInitializing = false;
```

---

## Task Execution Protocol

### Step 1: Understand Request

**Parse user intent:**
- What is the goal?
- What files are affected?
- Is this new functionality or modification?
- Are there examples in specs?

### Step 2: Plan Approach (Token-Efficient)

**Check if info is in specs:**
```
❓ Question: "How do I add a new filter?"
✅ Answer in: specs/DEVELOPMENT_GUIDE.md#implementing-a-new-filter
→ Action: Reference guide, implement directly
```

**If not in specs, locate code:**
```
❓ Question: "Where is renderTasks() defined?"
✅ Use Grep: pattern="function renderTasks"
→ Result: app.js:1234
→ Action: Edit app.js at that line
```

### Step 3: Execute (Minimal Operations)

**Example: Add new field to task**

❌ **Inefficient:**
1. Read app.js (6,000 tokens)
2. Read index.html (2,000 tokens)
3. Write app.js (6,000 tokens)
4. Write index.html (2,000 tokens)
**Total: 16,000 tokens**

✅ **Efficient:**
1. Reference specs/ARCHITECTURE.md for data structure (cached, ~0 tokens)
2. Grep "const task = {" in app.js (100 tokens)
3. Edit task creation block (200 tokens)
4. Grep "task-modal" in index.html (100 tokens)
5. Edit form to add field (200 tokens)
6. Grep "openTaskDetails" in app.js (100 tokens)
7. Edit to populate field (200 tokens)
**Total: 900 tokens (17.7x reduction)**

### Step 4: Verify & Test

**Checklist:**
- [ ] Code follows conventions (specs/CODING_CONVENTIONS.md)
- [ ] UI follows patterns (specs/UI_PATTERNS.md)
- [ ] Visual quality meets standards (VISUAL_GUIDELINES.md)
- [ ] Data migration included if needed
- [ ] Error handling included
- [ ] Works in light AND dark mode

### Step 5: Commit

**If on main:**
```bash
git checkout -b feature/add-task-field
git push -u origin feature/add-task-field
```

**Commit changes:**
```bash
git add .
git commit -m "$(cat <<'EOF'
Add category field to tasks

- Added category to task schema
- Created category dropdown
- Updated form handling
- Added data migration

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
git push
```

**Respond to user:**
```
✅ Category field added to tasks.

Changes:
- Task schema updated
- UI components created
- Data migration included

Branch `feature/add-task-field` pushed.
Create PR on GitHub when ready.
```

---

## Common Operations

### 1. Add New Page

**Specs Reference:** [specs/DEVELOPMENT_GUIDE.md#adding-a-new-page](specs/DEVELOPMENT_GUIDE.md#adding-a-new-page)

**Token-Efficient Steps:**
1. Reference guide (cached)
2. Grep "page active" in index.html (50 tokens)
3. Edit index.html to add page HTML (300 tokens)
4. Grep "nav-item" in index.html (50 tokens)
5. Edit to add nav link (100 tokens)
6. Grep "hashchange" in app.js (50 tokens)
7. Edit to add routing (100 tokens)
8. Write render function in app.js (200 tokens)
**Total: ~850 tokens**

### 2. Add New Filter

**Specs Reference:** [specs/DEVELOPMENT_GUIDE.md#implementing-a-new-filter](specs/DEVELOPMENT_GUIDE.md#implementing-a-new-filter)

**Token-Efficient Steps:**
1. Reference guide (cached)
2. Grep "let filterState" in app.js (50 tokens)
3. Edit filterState object (100 tokens)
4. Grep "filters-toolbar" in index.html (50 tokens)
5. Edit to add filter UI (200 tokens)
6. Grep "function getFilteredTasks" in app.js (50 tokens)
7. Edit filtering logic (150 tokens)
8. Grep "function updateFilterBadges" in app.js (50 tokens)
9. Edit badge update logic (100 tokens)
**Total: ~750 tokens**

### 3. Fix Bug in Render Function

**Token-Efficient Steps:**
1. Grep "function render{FunctionName}" in app.js (50 tokens)
2. Edit only that function (200 tokens)
3. Test fix
**Total: ~250 tokens**

### 4. Add New Modal

**Specs Reference:** [specs/DEVELOPMENT_GUIDE.md#creating-a-new-modal](specs/DEVELOPMENT_GUIDE.md#creating-a-new-modal)

**Token-Efficient Steps:**
1. Reference guide (cached)
2. Grep "modal-content" in index.html (50 tokens)
3. Edit to add modal HTML after existing modals (300 tokens)
4. Write open/close functions in app.js (200 tokens)
5. Grep "addEventListener.*submit" in app.js (50 tokens)
6. Write form submission handler (200 tokens)
**Total: ~800 tokens**

### 5. Understand System Architecture

**DON'T:** Read app.js, index.html, style.css (15,000 tokens)

**DO:** Read specs/ARCHITECTURE.md (1,200 tokens)

**Savings: 12.5x**

---

## Error Recovery

### Token Budget Exceeded

**Symptoms:**
- Usage > 80%
- Warning: "Approaching token limit"

**Action:**
1. Stop all operations
2. Summarize current progress
3. Suggest user start new session
4. Provide clear next steps

**Response Template:**
```
⚠️ Token budget at 85% (170,000 / 200,000).

Completed:
- Task 1 ✅
- Task 2 ✅

Remaining:
- Task 3 (requires 10,000 tokens)

Recommendation: Start new session to complete remaining tasks efficiently.

Next steps:
1. [Clear instruction for user]
2. [Clear instruction for user]
```

### Cache Miss (File Changed Externally)

**Symptoms:**
- User reports code doesn't match expectations
- Edit fails due to string mismatch

**Action:**
1. Acknowledge cache may be stale
2. Re-read specific file (explain token cost)
3. Proceed with operation

**Response Template:**
```
It appears the file may have changed externally.
Re-reading app.js (6,000 tokens) to ensure accuracy...

[After read]
✅ File updated in cache. Proceeding with edit.
```

### Grep Returns No Results

**Symptoms:**
- Grep search returns empty
- Expected code not found

**Action - Progressive Escalation:**

**Level 1:** Broaden search pattern
```bash
# If "function renderTasks" fails, try:
Grep: "renderTasks"
```

**Level 2:** Search in related files
```bash
# If app.js fails, try:
Glob: "**/*.js"
# Then Grep in each
```

**Level 3:** Ask user
```
⚠️ Could not locate renderTasks() function.

Possible reasons:
- Function renamed
- Function in different file
- Typo in search pattern

Could you confirm the function name or file location?
```

**DON'T:** Read every .js file hoping to find it (token waste)

---

## Session Best Practices

### Start of Session

1. **Check branch:**
   ```bash
   git branch --show-current
   ```

2. **Check if specs exist:**
   - If yes → Reference specs, minimal code reading
   - If no → Create specs first (one-time investment)

3. **Understand request:**
   - Parse user intent
   - Identify affected files
   - Check if similar example exists in specs

### During Session

1. **Before each operation:**
   - Check token usage
   - Choose most efficient approach
   - Batch parallel operations

2. **Prefer:**
   - Specs over code reading
   - Grep over Read
   - Edit over Write
   - Parallel over sequential

3. **Monitor:**
   - Token usage percentage
   - Cache hits vs. misses
   - Operation efficiency

### End of Session

1. **Commit work:**
   - Create/push branch if needed
   - Descriptive commit message
   - Push to remote

2. **Summarize:**
   - What was accomplished
   - What remains
   - Next steps

3. **Clean up:**
   - No uncommitted changes
   - Branch pushed
   - User instructed on PR creation

---

## Quick Reference Card

### Token Costs
- Read app.js: 6,000 tokens
- Read specs: 1,200 tokens
- Grep search: 50-200 tokens
- Edit operation: 100-300 tokens
- Write new file: 500-2,000 tokens

### Efficiency Rules
1. ✅ Specs > Code (12x faster)
2. ✅ Grep > Read (30x faster)
3. ✅ Edit > Write (20x faster)
4. ✅ Cache > Re-read (∞x faster)
5. ✅ Parallel > Sequential (2x faster)

### Git Rules
1. ✅ Check branch first (step 0)
2. ✅ Create branch if on main
3. ✅ Push branch immediately (step 2)
4. ✅ Commit to branch only
5. ❌ Never merge to main (user creates PR)

### File Locations
- Specs: `specs/`
- Templates: `templates/`
- Plans: `plans/`
- Config: `CLAUDE.md`, `CODEX.md`
- Visuals: `VISUAL_GUIDELINES.md`

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0
**Target Efficiency:** 10x token reduction achieved

See also:
- [CODEX.md](CODEX.md) - ChatGPT/GitHub Copilot configuration
- [specs/](specs/) - Comprehensive specs documentation
- [plans/README.md](plans/README.md) - Implementation planning framework
