# Modularization Execution Plan - Enhanced

**Purpose:** Detailed execution guide for app.js modularization using Claude Code + Cursor workflow

**Created:** 2025-01-22

**Status:** READY FOR EXECUTION

---

## Test Suite Assessment

### Current Testing Capabilities

| Test Type | Location | Automation Level | Coverage |
|-----------|----------|------------------|----------|
| Event Delegation Validator | [`tests/event-delegation-validator.js`](../../tests/event-delegation-validator.js) | Browser Console | All data-action handlers |
| Data Structure Validator | [`tests/data-structure-validator.js`](../../tests/data-structure-validator.js) | Browser Console | Task/Project schemas |
| Integration Tests | [`test-integration.js`](../../test-integration.js) | Node.js | Service interactions |
| Regression Tests | [`test-regression.js`](../../test-regression.js) | Node.js | Core CRUD operations |
| Task Service Tests | [`test-task-service.js`](../../test-task-service.js) | Node.js | Task operations |
| Project Service Tests | [`test-project-service.js`](../../test-project-service.js) | Node.js | Project operations |

### Test Suite Status: ⚠️ PARTIAL

**What exists:**
- ✅ Unit tests for extracted services (taskService, projectService)
- ✅ Browser-based validators for event delegation and data structures
- ✅ Integration tests for service interactions

**What's missing:**
- ❌ No E2E/UI automation (Playwright/Selenium)
- ❌ No automated test runner in CI
- ❌ Package.json test script is placeholder: `"test": "echo \"Error: no test specified\" && exit 1"`

### Recommendation: Add Smoke Test Script

Before starting Phase 1, create a simple Playwright smoke test:

```javascript
// tests/smoke-test.js (Playwright)
const { test, expect } = require('@playwright/test');

test('Critical path smoke test', async ({ page }) => {
  await page.goto('http://localhost:8787');
  
  // 1. App loads
  await expect(page.locator('#dashboard')).toBeVisible();
  
  // 2. Can navigate to tasks
  await page.click('[data-page="tasks"]');
  await expect(page.locator('#tasks')).toBeVisible();
  
  // 3. Can open task modal
  await page.click('[data-action="openTaskModal"]');
  await expect(page.locator('#task-modal')).toHaveClass(/active/);
  
  // 4. Can create task
  await page.fill('#task-title', 'Smoke Test Task');
  await page.click('#task-form button[type="submit"]');
  
  // 5. Task appears in Kanban
  await expect(page.locator('.task-card:has-text("Smoke Test Task")')).toBeVisible();
});
```

---

## Phase 1: Analysis with Claude Code

### Enhanced Prompt for Machine-Readable Output

Use this exact prompt in Claude Code for structured analysis:

```
Analyze app.js for modularization. I need a structured extraction plan.

Please format your analysis with this exact structure for easy parsing:

## MODULE_CANDIDATES

1. [Module Name] - [Primary purpose]
   - Contains: [function1, function2, ...]
   - Dependencies: [none/minimal/app.js globals]
   - Risk: Low/Medium/High
   - Line Range: [start-end]

## EXTRACTION_PRIORITY

Priority order based on dependency graph (extract bottom-up):

1. [function_name] → [target_module].js
   - Reason: [explanation]
   - Dependencies: [list]
   - Consumers: [list of functions that call this]

2. [function_name] → [target_module].js
   - Reason: [explanation]
   - Dependencies: [list]
   - Consumers: [list]

## CIRCULAR_DEPENDENCY_RISKS

List any function pairs that might create circular imports:
- [functionA] ↔ [functionB]: [mitigation strategy]

## GLOBAL_STATE_USAGE

Functions that access global variables:
- [function_name]: reads [var1, var2], writes [var3]

## RECOMMENDED_FIRST_EXTRACTION

The safest first extraction is: [function_name]
- File: src/[path]/[module].js
- Risk: [Low/Medium/High]
- Test: [how to verify it works]
```

### Expected Output Structure

Claude Code should produce something like:

```
## MODULE_CANDIDATES

1. html-utils - HTML escaping and sanitization
   - Contains: escapeHtml, sanitizeInput
   - Dependencies: none
   - Risk: Low
   - Line Range: 245-280

2. date-utils - Date formatting and calculations
   - Contains: formatDate, formatDateRange, getRelativeDate, isOverdue
   - Dependencies: none
   - Risk: Low
   - Line Range: 282-380

## EXTRACTION_PRIORITY

1. escapeHtml → src/utils/html.js
   - Reason: Pure function, zero dependencies, used everywhere
   - Dependencies: none
   - Consumers: renderTasks, renderProjects, openTaskDetails, ~40 more

2. formatDate → src/utils/date.js
   - Reason: Pure function, no state access
   - Dependencies: none
   - Consumers: renderCalendar, renderTasks, task cards
```

---

## Phase 2: Extraction with Cursor

### Method 1: Cursor Agent Mode (Recommended)

1. Enable Agent Mode in Cursor settings
2. Use `@workspace` to reference entire project
3. Prompt:

```
@workspace Extract the following functions from app.js to src/utils/html.js:
- escapeHtml (lines 245-260)
- sanitizeInput (lines 262-275)

Requirements:
1. Create src/utils/html.js with ES6 exports
2. Add JSDoc comments to each function
3. Add import statement at top of app.js
4. Remove the original function definitions from app.js
5. Verify no other references need updating

After extraction, tell me:
- What import statement was added
- What lines were removed
- Any other files that might need the import
```

### Method 2: Cursor Right-Click Refactor

For simple extractions:
1. Highlight the target function in app.js
2. Right-click → "Extract to module"
3. Specify target path: `src/utils/html.js`
4. Let Cursor handle import/export

### Post-Extraction Verification Prompt

After each extraction, ask Cursor:

```
@workspace Are there any other references to escapeHtml that need updating?
Check for:
1. Direct calls: escapeHtml(
2. String references: "escapeHtml"
3. Dynamic calls: window["escapeHtml"] or this["escapeHtml"]
```

---

## Phase 3: Context Tracking

### Create Refactor Phase Tracker

Create this file to track progress:

**File:** `docs/archive/context/CURRENT_REFACTOR_PHASE.md`

```markdown
# Current Refactor Phase

**Last Updated:** [DATE]
**Current Phase:** 1 - Pure Functions
**Status:** In Progress

## Completed Extractions

| Function | Source | Target | Date | Verified |
|----------|--------|--------|------|----------|
| escapeHtml | app.js:245 | src/utils/html.js | 2025-01-22 | ✅ |
| sanitizeInput | app.js:262 | src/utils/html.js | 2025-01-22 | ✅ |

## Pending Extractions (This Phase)

| Function | Source | Target | Risk | Blocker |
|----------|--------|--------|------|---------|
| formatDate | app.js:282 | src/utils/date.js | Low | None |
| getProjectColor | app.js:390 | src/utils/colors.js | Low | None |

## Known Issues

- None currently

## Rollback Points

- Git commit before Phase 1: [commit hash]
- Git commit after html.js extraction: [commit hash]

## Next Steps

1. Extract formatDate to src/utils/date.js
2. Run validators
3. Test calendar view (heavy date usage)
```

---

## Risk Mitigation Checklist

### Before Each Extraction

- [ ] Git commit current state with descriptive message
- [ ] Note the exact line numbers being extracted
- [ ] Identify all consumers of the function (use grep)

### During Extraction

- [ ] Verify export syntax is correct (`export function` or `export { }`)
- [ ] Verify import path is correct (relative from app.js)
- [ ] Check for `this` context issues (arrow vs regular functions)

### After Each Extraction

Run this checklist:

```bash
# 1. Check for remaining references
grep -r "functionName" app.js

# 2. Check for addEventListener bindings
grep -r "addEventListener.*functionName" .

# 3. Check for IIFE patterns that might be broken
grep -r "function.*functionName" app.js

# 4. Syntax check
node --check app.js
node --check src/utils/html.js

# 5. Browser validation
# Open app, run in console:
await import('./tests/event-delegation-validator.js');
await import('./tests/data-structure-validator.js');
```

### If Something Breaks

**Quick Recovery:**
```bash
# Revert last commit
git revert HEAD

# Or restore specific file
git checkout HEAD~1 -- app.js
```

---

## Tool-Specific Tips

### Claude Code Best Practices

1. **Use "Analyze this codebase"** feature for initial overview
2. **Request extraction templates** - boilerplate with JSDoc:
   ```
   Generate a module template for src/utils/date.js with:
   - JSDoc header describing the module
   - Placeholder exports for: formatDate, formatDateRange, isOverdue
   - Type annotations in JSDoc format
   ```
3. **Ask for dependency visualization:**
   ```
   Create a Mermaid diagram showing the dependency relationships
   between these functions: [list functions]
   ```

### Cursor Best Practices

1. **Enable Agent Mode** for multi-file operations
2. **Use `@workspace`** in chat to reference entire project
3. **Use `@file`** to reference specific files: `@file:app.js`
4. **After extraction, always ask:**
   ```
   Are there any other references to these functions that need updating?
   ```
5. **For complex extractions, use staged approach:**
   ```
   Step 1: Create the new module file with exports
   Step 2: Add import to app.js (don't remove originals yet)
   Step 3: Test that imports work
   Step 4: Remove original definitions
   ```

---

## Execution Sequence

### Day 1: Setup & Analysis

1. **Create git branch:**
   ```bash
   git checkout -b refactor/modularization
   ```

2. **Create context directory:**
   ```bash
   mkdir -p context
   ```

3. **Run Claude Code analysis** with enhanced prompt above

4. **Create tracking file:** `docs/archive/context/CURRENT_REFACTOR_PHASE.md`

5. **Review and validate** Claude's extraction priority

### Day 2-3: Phase 1 Extractions

1. **Extract html.js** (lowest risk)
2. **Validate** with browser tests
3. **Commit**
4. **Extract date.js**
5. **Validate** with calendar view test
6. **Commit**
7. **Extract colors.js**
8. **Validate**
9. **Commit**
10. **Extract constants.js**
11. **Full validation** (all validators + manual critical path)
12. **Commit with tag:** `git tag phase1-complete`

### Day 4+: Continue Phases

Follow same pattern for each phase in [`MODULARIZATION_PLAN.md`](./MODULARIZATION_PLAN.md)

---

## Success Metrics

### Per-Extraction Success

- [ ] Module file created with correct exports
- [ ] Import added to app.js
- [ ] Original code removed from app.js
- [ ] No console errors
- [ ] Validators pass
- [ ] Feature using the function works

### Per-Phase Success

- [ ] All planned extractions complete
- [ ] app.js reduced by expected line count
- [ ] All tests pass
- [ ] No regression in functionality
- [ ] Git tagged with phase marker

### Final Success

- [ ] app.js deleted or reduced to <500 lines
- [ ] All code in src/ modules
- [ ] main.js is entry point
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Team can navigate codebase easily

---

## Quick Reference Commands

```bash
# Start dev server
npm run dev

# Check JS syntax
node --check app.js
node --check src/utils/html.js

# Search for function usage
grep -rn "functionName" --include="*.js" .

# Git operations
git status
git diff app.js
git add -p  # Interactive staging
git commit -m "refactor: extract escapeHtml to src/utils/html.js"

# Run tests (Node.js)
node test-regression.js
node test-integration.js
```

---

**Ready to execute Phase 1!**

See also:
- [`MODULARIZATION_PLAN.md`](./MODULARIZATION_PLAN.md) - Full plan with all phases
- [`../../specs/ARCHITECTURE.md`](../../specs/ARCHITECTURE.md) - Current architecture
- [`../../specs/TESTING_GUIDE.md`](../../specs/TESTING_GUIDE.md) - Testing procedures
- [`../../CLAUDE.md`](../../CLAUDE.md) - AI assistant configuration
