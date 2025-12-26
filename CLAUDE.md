# Claude Configuration for Nautilus

**Purpose:** Token-efficient development protocols and git workflow for Claude AI assistant.

**Target:** 10x token reduction (25,500 → 2,550 tokens per 10 operations)

---

## Table of Contents

1. [Token Efficiency Protocol](#token-efficiency-protocol)
2. [Git Workflow](#git-workflow)
3. [Project Context](#project-context)
4. [Task Execution Protocol](#task-execution-protocol)
5. [Quality Assurance Protocol](#quality-assurance-protocol)
6. [Common Operations](#common-operations)
7. [Error Recovery](#error-recovery)

---

## Token Efficiency Protocol

### Core Principle

**NEVER RE-READ CACHED FILES.** If a file has been read in this session, reference it from cache.

### Token Cost Table

⚠️ **CRITICAL: Updated 2025-12-09 with actual measured costs**

| Operation | Tokens | % of Budget | When to Use |
|-----------|--------|-------------|-------------|
| **Read app.js** | ~98,000 | 49% | ⚠️ AVOID! Use Grep + offset/limit instead |
| **Read style.css** | ~56,000 | 28% | ⚠️ AVOID! Use Grep + offset/limit instead |
| **Read index.html** | ~20,500 | 10% | ⚠️ First time only, or confirmed changes |
| **Read ALL 3 main files** | ~174,500 | 87% | 🚫 NEVER do this! Session killer |
| **Read with offset/limit** | ~1,000-5,000 | 0.5-2.5% | ✅ Preferred for large files |
| **Grep search** | ~50-200 | <0.1% | ✅ Always use to locate code first |
| **Glob pattern** | ~30-100 | <0.1% | ✅ Locate files by pattern |
| **Edit** | ~100-300 | <0.2% | ✅ Modify existing code (preferred) |
| **Write** | ~1,000-6,000 | 0.5-3% | Create new files or complete rewrites |
| **Task agent** | ~500-2,000 | 0.2-1% | Complex multi-step exploration |
| **Read specs** | ~1,000-3,000 | 0.5-1.5% | ✅ Preferred over reading code |

**Key Insight:** Reading app.js ONCE consumes 49% of your entire session budget!

### Information Theory Principles

**1. Context Caching**
- First read of app.js = VERY expensive (98,000 tokens = 49% of budget!)
- First read of style.css = expensive (56,000 tokens = 28% of budget)
- Cache hit = nearly free (but lost between sessions)
- **Rule:** Read once, reference many times - OR better yet, use Grep + offset/limit

**2. Semantic Chunking**
- Don't read entire files to find one function (app.js = 98K tokens!)
- Use Grep to locate, then Read with offset/limit or Edit in place
- Example: `Grep: "function renderTasks"` → `Read app.js offset=1200 limit=50` → `Edit: renderTasks() body`
- Savings: 98,000 tokens → 5,000 tokens (19x reduction)

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

⚠️ **CRITICAL UPDATE: Realistic costs based on actual file sizes (Dec 2025)**

**Scenario 1: Add new filter**
- ❌ Inefficient (naive): Read app.js (98,000) + Read index.html (20,500) + Write app.js (98,000) = **216,500 tokens** (108% of budget! ⚠️)
- ❌ Inefficient (typical): Read app.js (98,000) + Edit filterState (200) + Edit index.html (200) = **98,400 tokens** (49% of budget)
- ✅ Efficient: Grep "filterState" (100) + Edit app.js filterState block (200) + Grep "filters-toolbar" (100) + Edit index.html (200) = **600 tokens**
- **Savings: 164x reduction vs typical, 360x vs naive**

**Scenario 2: Fix bug in renderTasks()**
- ❌ Inefficient: Read app.js (98,000) + Write app.js (98,000) = **196,000 tokens** (98% of budget! Session killer!)
- ⚠️ Less bad: Read app.js (98,000) + Edit renderTasks() (300) = **98,300 tokens** (49% of budget)
- ✅ Efficient: Grep "function renderTasks" (100) + Read app.js offset=1200 limit=50 (2,000) + Edit renderTasks() (300) = **2,400 tokens**
- ✅ Best: Check specs/FUNCTION_INDEX.md for line number + Read offset/limit + Edit = **2,400 tokens**
- **Savings: 41x reduction vs less bad, 82x vs fully inefficient**

**Scenario 3: Understand project structure**
- ❌ Inefficient: Read app.js (98,000) + Read index.html (20,500) + Read style.css (56,000) = **174,500 tokens** (87% of budget!)
- ✅ Efficient: Read specs/ARCHITECTURE.md (1,200) = **1,200 tokens** (0.6% of budget)
- **Savings: 145x reduction**

**Scenario 4: NEW - Working across sessions (multi-day feature)**
- ❌ Without modularization:
  - Session 1: Read all files (174,500) + work (10,000) = 184,500 tokens
  - Session 2: Cache lost, read files again (174,500) + work (10,000) = 184,500 tokens
  - **Total: 369,000 tokens for 2 sessions**
- ✅ With specs + Grep + offset/limit:
  - Session 1: Read specs (3,000) + Grep/offset reads (10,000) + work (10,000) = 23,000 tokens
  - Session 2: Read specs (3,000) + Grep/offset reads (10,000) + work (10,000) = 23,000 tokens
  - **Total: 46,000 tokens for 2 sessions**
  - **Savings: 8x reduction, enables 8x more operations per week**

### Token Efficiency Checklist

Before each operation, ask:

1. **Have I read this file in this session?**
   - If yes → Use cache, don't re-read
   - If no → Proceed to step 2

2. **Do I need the whole file?**
   - If LARGE FILE (app.js, style.css) → 🚫 NEVER read whole file!
   - Use Grep to locate + Read with offset/limit
   - If small file (<100 lines) → Read it (first time only)
   - Check specs/FUNCTION_INDEX.md for line numbers first

3. **Can I use offset/limit instead of full read?**
   - For app.js (98K tokens) → Use Read offset/limit (2K tokens) = **49x savings**
   - For style.css (56K tokens) → Use Read offset/limit (2K tokens) = **28x savings**
   - Example: `Read app.js offset=1200 limit=50` instead of `Read app.js`

4. **Am I modifying existing code?**
   - If yes → Use Edit (not Write)
   - If no → Use Write for new files

5. **Is this info in specs?**
   - If yes → Reference specs (don't read code)
   - If no → Proceed with code operation

6. **Can I batch operations?**
   - If yes → Combine tool calls in single message
   - If no → Execute sequentially

### Critical Technique: Using Read with Offset/Limit

⚠️ **THIS IS THE #1 TOKEN-SAVING TECHNIQUE**

**The Problem:**
- Reading app.js fully = 98,000 tokens (49% of budget)
- Reading style.css fully = 56,000 tokens (28% of budget)
- **One full read can kill your entire session**

**The Solution: Targeted Reads with offset/limit**

Instead of reading entire files, read only the section you need:

```javascript
// ❌ BAD: Full file read
Read app.js  // 98,000 tokens

// ✅ GOOD: Targeted read
Read app.js offset=3400 limit=150  // 2,000 tokens
// Savings: 49x reduction!
```

**How to find the right offset:**

**Method 1: Use specs/FUNCTION_INDEX.md (FASTEST)**
```
1. Open specs/FUNCTION_INDEX.md
2. Find function: "renderTasks() - line 3437"
3. Read app.js offset=3400 limit=200
```

**Method 2: Use Grep first**
```
1. Grep "function renderTasks" in app.js
   → Returns: "line 3437: function renderTasks() {"
2. Read app.js offset=3400 limit=200
   (offset = line number - 50 for context)
```

**Offset/Limit Best Practices:**

| Need | Offset Calculation | Limit | Example |
|------|-------------------|-------|---------|
| **Single function** | line - 50 | 150 | offset=3400 limit=150 |
| **Function + context** | line - 100 | 250 | offset=3350 limit=250 |
| **Large function** | line - 50 | 300 | offset=3400 limit=300 |
| **Multiple functions** | first_line - 100 | 500 | offset=3300 limit=500 |
| **Section exploration** | line - 200 | 600 | offset=3200 limit=600 |

**Real Example:**

```
Task: Fix bug in submitTaskForm()

❌ Inefficient (98K tokens):
1. Read app.js

✅ Efficient (2.5K tokens):
1. Check specs/FUNCTION_INDEX.md
   → submitTaskForm() is at line 4955
2. Read app.js offset=4900 limit=150
3. Edit the function

Savings: 39x reduction
```

**When offset/limit is REQUIRED:**

- ✅ Any operation on app.js (9,667 lines)
- ✅ Any operation on style.css (9,254 lines)
- ✅ Any operation on index.html (1,433 lines)
- ✅ Files over 500 lines
- ⚠️ Optional for files under 200 lines
- ❌ Not needed for specs files (already optimized)

**Token Budget Impact:**

| Approach | app.js Tokens | style.css Tokens | Total | % of Budget |
|----------|---------------|------------------|-------|-------------|
| **Full reads** | 98,000 | 56,000 | 154,000 | 77% |
| **Offset/limit** | 2,000 | 2,000 | 4,000 | 2% |
| **Savings** | **49x** | **28x** | **38.5x** | **75% saved** |

**This technique alone saves 75% of typical token usage!**

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

⚠️ **CRITICAL - NEVER Blame Caching Without Verification:**

**BEFORE claiming a fix is complete or blaming browser caching:**

1. **Search for ALL related patterns** that could cause the same issue
   - Use Grep to find all variations (e.g., `.progress.*:hover`, `.project.*:hover`)
   - Don't just fix one instance and assume it's done
   - Check both desktop and mobile CSS sections

2. **Verify changes are actually in the file**
   - Use Read to confirm the fix is present
   - Don't assume edits worked without verification

3. **ONLY suggest caching if:**
   - ✅ You have verified ALL related code is fixed
   - ✅ You have confirmed changes are in the file
   - ✅ You have searched for similar patterns and fixed them all

**DON'T:**
- ❌ Fix one CSS class and claim "it's caching" when others remain
- ❌ Assume your fix worked without verification
- ❌ Blame the user's browser when you didn't do a thorough search

**This wastes user time and erodes trust.**

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

## Quality Assurance Protocol

### When to Offer Comprehensive Testing

**ALWAYS offer comprehensive QA testing BEFORE committing when:**

1. **Changes affect multiple files** (3+ files modified)
2. **Changes exceed 50 lines** in a single file
3. **New service layer or module created** (architecture change)
4. **CRUD operations modified** (create, read, update, delete)
5. **Data flow refactored** (state management, persistence)
6. **Critical user flows touched** (task/project creation, deletion, updates)
7. **Integration points changed** (function calls between modules)
8. **User explicitly requests testing** ("make sure it works", "test this")

**Format for offering testing:**
```
I've completed the implementation. Before committing, I can run comprehensive
QA tests to verify:
- Unit tests for all new/modified functions
- Integration tests for module connections
- Edge case handling
- Data integrity validation

Would you like me to run the full test suite? (Recommended for changes this size)
```

### Testing Protocol

#### Step 1: Create Test Plan

**Document what will be tested:**
- List all modified functions
- List all integration points
- List edge cases to cover
- List data integrity checks

#### Step 2: Write Automated Tests

**Create test file with naming convention:**
- `test-[feature-name].js` (e.g., `test-task-service.js`)
- Use ES6 modules for consistency
- Include assertion helpers
- Test both success and failure paths

**Minimum test categories:**
```javascript
// 1. Unit Tests - Individual functions
// 2. Integration Tests - Function interactions
// 3. Edge Cases - Null, undefined, invalid inputs
// 4. Data Integrity - Immutability, references
// 5. Error Handling - Non-existent items, validation
```

#### Step 3: Run Tests

**Execute and report results:**
```bash
node test-[feature-name].js
```

**Report format:**
```
=== TEST SUMMARY ===
Total Tests: X
✅ Passed: X
❌ Failed: X
```

#### Step 4: Verify Integration Points

**Check all integration points in main codebase:**
- Use Grep to find all function calls
- Verify parameters passed correctly
- Verify return values handled correctly
- Verify global state updated correctly
- Verify imports/exports correct

**Document integration points:**
```
✅ functionName() - Location: file.js:123
   - Parameters: correct
   - Return handling: correct
   - State updates: correct
```

#### Step 5: Create QA Report

**Generate comprehensive QA report:**
- Test results summary
- Integration verification
- Code quality checks
- Manual testing checklist for user
- Risk assessment
- Files changed

**Save as:** `QA-REPORT.md` (committed with changes)

#### Step 6: Commit with QA Evidence

**Commit message should include:**
- What was tested
- Test results (X/X passed)
- Integration points verified
- QA report location

**Example:**
```bash
git commit -m "Extract task service with comprehensive QA

Implementation:
- Created taskService.js with CRUD operations
- Updated app.js integration points

QA Testing:
- 73/73 automated tests passed
- 5 integration points verified
- See QA-REPORT.md for details

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Test Coverage Requirements

**Minimum coverage for any change:**

| Change Type | Required Tests |
|-------------|---------------|
| **New function** | 5+ tests (success, failure, edge cases) |
| **Modified function** | 3+ tests (verify old behavior + new behavior) |
| **New module/service** | 20+ tests (comprehensive coverage) |
| **Integration change** | Verify all call sites |
| **Data structure change** | Migration + validation tests |

### Automated Test Template

**Use this template for test files:**

```javascript
// test-[feature].js
import { functionName } from './path/to/module.js';

let testsPassed = 0;
let testsFailed = 0;
const errors = [];

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        console.log(`✅ PASS: ${message}`);
    } else {
        testsFailed++;
        errors.push(message);
        console.log(`❌ FAIL: ${message}`);
    }
}

console.log('\n=== [FEATURE] TEST SUITE ===\n');

// Test 1: Basic functionality
console.log('--- Test 1: Basic Functionality ---');
const result = functionName(validInput);
assert(result !== null, 'Function returns result');
assert(result.expected === 'value', 'Result has expected value');

// Test 2: Edge case - null input
console.log('\n--- Test 2: Null Input ---');
const result2 = functionName(null);
assert(result2 === null, 'Handles null input gracefully');

// ... more tests ...

// Final Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);

if (testsFailed > 0) {
    console.log('\n=== FAILED TESTS ===');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    process.exit(1);
} else {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    process.exit(0);
}
```

### Manual Testing Checklist Template

**Always provide user with manual testing checklist:**

```markdown
## Manual Testing Checklist

Please verify these scenarios in the browser:

### [Feature Area 1]
- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3

### [Feature Area 2]
- [ ] Test case 1
- [ ] Test case 2

### Edge Cases
- [ ] Test with empty data
- [ ] Test with maximum data
- [ ] Test error conditions
```

### QA Report Template

**Generate this report for significant changes:**

```markdown
# QA Test Report - [Feature Name]

**Date:** YYYY-MM-DD
**Tester:** Claude (Senior QA Mode)
**Feature:** [Description]
**Status:** ✅ PASS / ❌ FAIL

---

## Test Summary

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Unit Tests | X | X | X |
| Integration | X | X | X |
| Edge Cases | X | X | X |
| **TOTAL** | **X** | **X** | **X** |

## Integration Points Verified

✅ **functionName()** - Location: file.js:123
- Parameters: correct
- Return handling: correct
- State updates: correct

## Code Quality Checks

- [ ] Syntax validation passed
- [ ] Imports/exports correct
- [ ] No mutations detected
- [ ] Error handling present

## Manual Testing Required

[List of manual test cases for user]

## Risk Assessment

- Low Risk: [areas]
- Medium Risk: [areas]
- High Risk: [areas]

## Recommendation

[READY FOR MERGE / NEEDS FIXES / NEEDS MANUAL TESTING]
```

### Token Budget for Testing

**Allocate tokens appropriately:**

| Testing Activity | Estimated Tokens | When to Use |
|------------------|------------------|-------------|
| **Test file creation** | 3,000-5,000 | Always for new modules |
| **Test execution** | 500-1,000 | Always |
| **Integration verification** | 1,000-2,000 | Always |
| **QA report** | 2,000-3,000 | Significant changes |
| **Total QA overhead** | ~6,000-11,000 | Budget for this |

**Token justification:**
- Testing prevents costly debugging later
- One test session < 10 debugging sessions
- QA report saves user manual verification time
- Automated tests are reusable

### When NOT to Do Full QA

**Skip comprehensive QA for:**
- Single-line changes (typo fixes)
- Comment additions
- Documentation updates
- Configuration changes (gitignore, etc.)
- UI-only changes (CSS styling)

**But always offer basic verification:**
```
Change applied. I've verified:
- Syntax is valid
- No obvious errors introduced

Would you like me to test this more thoroughly?
```

### QA Workflow Example

**User:** "Extract task service to separate module"

**AI Response (BEFORE starting):**
```
I'll extract the task service to a separate module. This is a significant
refactoring affecting multiple files.

After implementation, I'll run comprehensive QA including:
- Automated unit tests for all CRUD operations
- Integration tests for app.js call sites
- Edge case testing (null, invalid inputs)
- Data integrity verification
- QA report generation

Proceeding with extraction...
```

**AI Response (AFTER implementation):**
```
✅ Task service extracted to src/services/taskService.js

Before committing, running comprehensive QA tests...

[Runs tests]

=== TEST RESULTS ===
73/73 tests passed ✅

Integration points verified:
✅ submitTaskForm() - app.js:4193
✅ updateTaskField() - app.js:7252
✅ confirmDelete() - app.js:3412
✅ duplicateTask() - app.js:3357

QA Report: QA-REPORT.md

Manual testing checklist provided in report.
Ready to commit? Or would you like to review the test results first?
```

### Integration with Git Workflow

**QA should happen BEFORE git commit:**

```bash
# 1. Implement feature
[Code changes...]

# 2. RUN QA (before commit)
node test-feature.js
# Verify all tests pass

# 3. THEN commit with QA evidence
git add .
git commit -m "Feature with QA
- Implementation: [details]
- QA: X/X tests passed
- See QA-REPORT.md"

# 4. Push
git push
```

### Proactive Testing Reminders

**AI should remind itself:**

Before each commit, check:
- [ ] Did I modify 50+ lines? → Offer QA
- [ ] Did I create a new module? → Offer QA
- [ ] Did I change CRUD operations? → Offer QA
- [ ] Did I refactor data flow? → Offer QA
- [ ] Did user ask for testing? → Offer QA

**If YES to any: Proactively offer comprehensive testing BEFORE committing.**

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

**Last Updated:** 2025-11-26
**Version:** 1.1.0
**Target Efficiency:** 10x token reduction achieved

**v1.1.0 Changes:**
- Added comprehensive Quality Assurance Protocol
- Defined when to offer testing (50+ lines, 3+ files, new modules)
- Added test templates and QA report templates
- Integrated testing into git workflow

See also:
- [CODEX.md](CODEX.md) - ChatGPT/GitHub Copilot configuration
- [specs/](specs/) - Comprehensive specs documentation
- [plans/README.md](plans/README.md) - Implementation planning framework
