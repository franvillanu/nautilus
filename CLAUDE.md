# Claude Configuration for Nautilus

**Purpose:** Token-efficient development protocols and git workflow for Claude AI assistant.

**Target:** 10x token reduction (25,500 → 2,550 tokens per 10 operations)

## Role Profiles (Auto-Select) - Mandatory
If no role is specified, pick the best fit based on the request:
- Architect: planning, design, interfaces, risks, scope clarification.
- Implementer: code changes, feature work, bug fixes, tests.
- Reviewer: review diffs, find issues, give verdict.
- QA: test strategy, edge cases, fixtures, validation.

See `.sdd/README.md` for usage and templates.

### Architect: plan only — no auto-implement
When acting as **Architect** (or when user says "act as architect"):
- **Plan and propose only.** Produce design, options, recommendations. Do **not** write code or apply file changes.
- **Offer options when several exist** (e.g. "I recommend A because …"). Then stop. Do not implement.
- **Do not automatically switch to Implementer.** Stay in Architect mode until the user explicitly approves implementation.
- **Implementation only after explicit approval.** User must say e.g. "implement this", "go ahead", "approved". Until then, no edits, writes, or implementation commands.

See `.sdd/roles/architect.md` for the full role.

---

## Table of Contents

1. [**REGISTRY SYSTEM - MANDATORY FIRST STEP**](#registry-system---mandatory-first-step)
2. [**OPERATION PROTOCOLS - Token-Efficient Patterns**](#operation-protocols---token-efficient-patterns)
3. [Token Efficiency Protocol](#token-efficiency-protocol)
4. [Git Workflow](#git-workflow)
5. [Project Context](#project-context)
6. [Task Execution Protocol](#task-execution-protocol)
7. [Quality Assurance Protocol](#quality-assurance-protocol)
8. [Common Operations](#common-operations)
9. [Error Recovery](#error-recovery)

---

## REGISTRY SYSTEM - MANDATORY FIRST STEP

⚠️ **CRITICAL: READ THIS FIRST ON EVERY SESSION** ⚠️

**Problem Solved**: The monolithic architecture (app.js = 98K tokens, style.css = 56K tokens, index.html = 20.5K tokens) was causing massive token waste and breaking the budget on simple changes.

**Previous Solution Attempted**: Modularization (breaking files into smaller pieces)
**Result**: FAILED - AI would forget dependencies across files, change desktop CSS but forget mobile CSS, edit 1 file and miss 4 related files. More files = MORE tokens + MORE errors.

**Current Solution**: Keep monolithic files + Add precision navigation registries

---

### HOTSPOT INDEX (READ FIRST FOR RECURRING UI WORK)

**Location**: [specs/HOTSPOTS.md](specs/HOTSPOTS.md)

**Purpose**: A tiny, high-signal list of the top recurring UI targets (kept under ~200 lines).

**Rule**: If the request matches a hotspot, use the pointers there first. Only fall back to registries if needed.

---

### PAIRED SURFACES CHECKLIST (PREVENT "DESKTOP ONLY" FIXES)

**Location**: [specs/PAIRED_SURFACES.md](specs/PAIRED_SURFACES.md)

**Purpose**: Enforce desktop + mobile + theme + i18n checks per component.

---

### LOCAL SNIPPET EXTRACTION (LOWEST TOKEN PATH)

**Script**: [scripts/extract-snippet.ps1](scripts/extract-snippet.ps1)

**Purpose**: Extract 30-80 lines around a match so edits stay tiny.

**Usage**:
```
./scripts/extract-snippet.ps1 -File index.html -Pattern "group-start-date" -Before 20 -After 20
```

**Rule**: When a snippet is provided, return a unified diff only.

---

### RECURRING COUNTERS (TINY, NO LOG SPRAWL)

**Location**: [specs/RECURRING_COUNTERS.json](specs/RECURRING_COUNTERS.json)

**Rule**: Only increment a key when a change exceeds the token threshold AND matches an existing category.

---

### THE THREE REGISTRIES (Read These, Not Code!)

#### 1. FUNCTION_REGISTRY.md (Instead of Reading app.js)

**Location**: [specs/FUNCTION_REGISTRY.md](specs/FUNCTION_REGISTRY.md)

**Purpose**: Maps every function in app.js with:
- Exact line numbers
- Function signatures and parameters
- Dependencies (what it reads/writes)
- Common edit patterns
- Direct Edit instructions

**Token Savings**: 98,000 tokens (reading app.js) → 5,000 tokens (registry) = **19.6x reduction**

**When to Use**: EVERY TIME you need to modify app.js functionality

**Example**:
```
❌ OLD WAY (98,000 tokens):
1. Read app.js entirely
2. Find renderTasks() function
3. Edit it

✅ NEW WAY (200 tokens):
1. Open FUNCTION_REGISTRY.md (cached after first read)
2. Find "renderTasks()" entry → Line 3437-3734
3. Edit app.js at line 3437 directly
```

---

#### 2. CSS_REGISTRY_VERIFIED.md (Instead of Reading style.css)

**Location**: [specs/CSS_REGISTRY_VERIFIED.md](specs/CSS_REGISTRY_VERIFIED.md)

**Purpose**: Maps every CSS component with:
- Desktop section line numbers (100% VERIFIED)
- Mobile section line numbers (100% VERIFIED + LINKED!)
- Edit patterns for both
- Common mistakes to avoid

**Token Savings**: 90,000 tokens (reading style.css) → 500 tokens (registry) = **180x reduction**

**CRITICAL FEATURE**: Links desktop and mobile sections together so you NEVER forget to update both

**When to Use**: EVERY TIME you need to modify CSS

**Example**:
```
❌ OLD WAY that caused problems (180,000+ tokens):
1. Read style.css (90,000 tokens)
2. Change .task-card hover in desktop section
3. Forget mobile section exists
4. User reports mobile broken
5. Read style.css again (90,000 tokens)
6. Fix mobile section
Total: 180,000 tokens + frustrated user

✅ NEW WAY (400 tokens):
1. Open CSS_REGISTRY_VERIFIED.md (cached)
2. Find "Task Card" entry
3. See: Desktop (lines 6629-6708) + Mobile (lines 4164-4227)
4. Edit style.css lines 6629-6708 (200 tokens)
5. Edit style.css lines 4164-4227 (200 tokens)
6. Done - both versions updated simultaneously
Total: 400 tokens + happy user
```

---

#### 3. HTML_REGISTRY_VERIFIED.md (Instead of Reading index.html)

**Location**: [specs/HTML_REGISTRY_VERIFIED.md](specs/HTML_REGISTRY_VERIFIED.md)

**Purpose**: Maps every HTML section with:
- Page line numbers
- Modal line numbers
- Component locations
- Edit patterns

**Token Savings**: 20,500 tokens (reading index.html) → 300 tokens (registry) = **68x reduction**

**When to Use**: EVERY TIME you need to modify HTML structure

**Example**:
```
❌ OLD WAY (20,500 tokens):
1. Read index.html entirely
2. Find task modal form
3. Add new field

✅ NEW WAY (200 tokens):
1. Open HTML_REGISTRY.md (cached)
2. Find "Task Modal" entry → Lines 660-850
3. Edit index.html at line 700 to add field
```

---

### MANDATORY WORKFLOW

**BEFORE touching any code, follow this sequence:**

#### Step 0: Check HOTSPOTS First

```
If the request matches a hotspot:
1. Use the exact pointers in specs/HOTSPOTS.md
2. Read only the minimal snippet needed
3. Then edit
```

#### Step 1: Identify File Type

```
Task involves:
- JavaScript function? → Use FUNCTION_REGISTRY.md
- CSS styling? → Use CSS_REGISTRY.md
- HTML structure? → Use HTML_REGISTRY.md
```

#### Step 2: Consult Registry FIRST

```
NEVER use Read/Grep on main files without checking registry first!

✅ CORRECT:
1. Open appropriate registry
2. Find component/function
3. Get line numbers
4. Edit directly

❌ WRONG:
1. Grep for function in app.js
2. Read app.js with offset/limit
3. Edit
(This is still better than reading full file, but registry is even faster!)
```

#### Step 3: Edit Directly

```
Use Edit tool with exact line numbers from registry

Example:
Edit app.js at line 3437 (from FUNCTION_REGISTRY)
Edit style.css at lines 801-1200 AND 9401-9700 (from CSS_REGISTRY)
Edit index.html at line 700 (from HTML_REGISTRY)
```

---

### REGISTRY-FIRST PROTOCOL

**MANDATORY CHECKLIST - Use this on EVERY task:**

- [ ] **Did I check the appropriate registry FIRST?**
- [ ] **Did I check specs/HOTSPOTS.md for a matching recurring target?**
- [ ] **Did I get exact line numbers from registry?**
- [ ] **If editing CSS, did I check BOTH desktop AND mobile sections?**
- [ ] **Did I apply specs/PAIRED_SURFACES.md rules (theme + i18n + multi-view)?**
- [ ] **Did I edit directly without reading the main file?**

**If you answered NO to any of these, STOP and start over with the registry.**

---

### TOKEN COMPARISON (Real Examples)

#### Example 1: Fix Bug in renderTasks()

| Method | Steps | Tokens | Notes |
|--------|-------|--------|-------|
| **Read Full File** | Read app.js → Edit | 98,000 | Session killer |
| **Grep + Offset** | Grep → Read offset → Edit | 2,500 | Better, but still expensive |
| **Registry (NEW)** | FUNCTION_REGISTRY → Edit | 200 | **12.5x faster than Grep!** |

#### Example 2: Change Task Card Styling (Desktop + Mobile)

| Method | Steps | Tokens | Notes |
|--------|-------|--------|-------|
| **Read + Forget Mobile** | Read CSS → Edit desktop → Bug report → Read CSS → Edit mobile | 112,000 | Causes bugs + wastes tokens |
| **Grep + Offset Both** | Grep desktop → Edit → Grep mobile → Edit | 1,000 | Better, but requires remembering mobile |
| **Registry (NEW)** | CSS_REGISTRY → Edit both | 400 | **280x faster! Auto-reminds about mobile** |

#### Example 3: Add New Form Field to Task Modal

| Method | Steps | Tokens | Notes |
|--------|-------|--------|-------|
| **Read Everything** | Read index.html → Read app.js → Edit both | 118,500 | Budget destroyer |
| **Grep + Offset** | Multiple Greps → Multiple Reads → Edits | 8,000 | Better, but complex |
| **Registry (NEW)** | HTML_REGISTRY + FUNCTION_REGISTRY → Edit | 1,500 | **79x faster! Step-by-step pattern provided** |

---

### AVERAGE SESSION IMPACT

**Before Registries** (typical 10-operation session):
- Read app.js twice: 196,000 tokens → Session exceeded budget ❌
- User hits limit, must start new session
- Cost: €90/month for frequent overruns

**After Registries** (same 10-operation session):
- Use registries: ~5,000 tokens per session ✅
- 39 sessions possible per month (vs 2 sessions before)
- Cost: Stays within Pro subscription budget

**Savings: €85/month** (95% cost reduction)

---

### WHEN REGISTRIES MIGHT BE OUTDATED

Registries are accurate as of 2026-01-11. Update them when:

1. **Major refactor**: Large code reorganization
2. **Function moved**: Line numbers changed significantly
3. **New function added**: Not yet in registry

**How to update**:
```bash
# Find new line number
Grep "function newFunction" in app.js

# Update registry
Edit FUNCTION_REGISTRY.md with new entry
```

**Frequency**: Registries should stay accurate for weeks/months. Code structure doesn't change that often.

---

### LEARNING CURVE

**First Session with Registries**: Slight learning curve (~500 extra tokens to understand registries)

**Every Session After**: Massive savings (registries cached, direct edits)

**Break-even**: After 1 session
**ROI**: 50-100x token reduction ongoing

---

## OPERATION PROTOCOLS - Token-Efficient Patterns

⚠️ **CRITICAL: These protocols are MANDATORY for all code operations**

**Problem Solved**: Even with registries, the Edit tool requires reading files before editing. Without specific protocols, "small edits" like swapping two HTML elements consumed 22,000 tokens (11% of budget). These protocols reduce that to 3,000-4,000 tokens (1.5-2% of budget).

**Key Constraint**: Edit tool REQUIRES file read before editing. We cannot edit blind.

**Solution**: Operation-specific patterns that minimize read scope using grep-based boundary finding.

---

### PROTOCOL SELECTION DECISION TREE

**Before ANY code operation, identify the pattern:**

```
What am I doing?
├─ Reordering HTML elements? → Protocol 1
├─ Changing CSS property values? → Protocol 2
├─ Adding form field? → Protocol 3
├─ Modifying JavaScript function logic? → Protocol 4
├─ Adding new component? → Protocol 5
├─ Swapping CSS classes? → Protocol 6
└─ Other structural change? → Protocol 7 (Surgical Multi-Edit)
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
- None of the above? -> Protocol 7 (Surgical Multi-Edit)
```

### PROTOCOL 1: Reordering HTML Elements

**Use When**: Swapping, moving, or reorganizing existing HTML blocks (e.g., swap filter order, move nav items)

**Token Budget**: 3,000-4,000 tokens (vs 22,000 without protocol)

**Steps**:

1. **Use Registry to Locate Parent Section** (~0 tokens, cached)
   ```
   Example: "Swap start date and end date filters"
   → Open HTML_REGISTRY_VERIFIED.md
   → Find: Task Filters section (lines 914-1041)
   → Note: End date filter (976-992), Start date filter (994-1010)
   ```

2. **Grep for Boundary Markers** (~100-200 tokens)
   ```bash
   # Find exact boundaries of elements to swap
   grep -n "group-end-date" index.html
   grep -n "group-start-date" index.html
   ```
   Result: Confirms line ranges from registry

3. **Read MINIMAL Context** (~2,000-3,000 tokens)
   ```
   # Read ONLY the section containing both elements + small buffer
   Read index.html offset=970 limit=50
   # This reads ~45 lines instead of 2,175 lines (48x smaller)
   ```

4. **Execute Surgical Edit** (~500 tokens)
   ```
   # Copy exact blocks from read output
   # Edit tool with precise old_string (element 1 + element 2 in old order)
   # and new_string (element 2 + element 1 in new order)
   ```

**Example - Filter Swap**:
```
Task: Swap end date and start date filters (left/right order)

Registry Check:
- End date filter: lines 976-992 (17 lines)
- Start date filter: lines 994-1010 (17 lines)

Grep Verification: (100 tokens)
grep -n "group-end-date\|group-start-date" index.html

Read Context: (2,500 tokens)
Read index.html offset=970 limit=50

Edit: (500 tokens)
- old_string: [17 lines end-date filter] + [17 lines start-date filter]
- new_string: [17 lines start-date filter] + [17 lines end-date filter]

Total: 3,100 tokens ✅ (vs 22,000 tokens without protocol)
```

**Token Breakdown**:
- Registry consultation: 0 (cached)
- Grep verification: 100-200
- Minimal read: 2,000-3,000
- Edit operation: 500-1,000
- **Total: 3,000-4,000 tokens**

---

### PROTOCOL 2: Changing CSS Property Values

**Use When**: Modifying existing CSS properties (colors, sizes, spacing) without structural changes

**Token Budget**: 1,200-1,500 tokens

**Steps**:

1. **Use Registry to Locate Component** (~0 tokens, cached)
   ```
   Example: "Change task card hover color"
   → Open CSS_REGISTRY_VERIFIED.md
   → Find: Task Card - Desktop (6629-6708), Mobile (4164-4227)
   ```

2. **Grep for Exact Rule** (~100-200 tokens)
   ```bash
   # Find exact line of property to change
   grep -n "\.task-card:hover" style.css
   grep -n "\.task-card-mobile:hover" style.css
   ```

3. **Read ONLY Rule Block** (~500-800 tokens)
   ```
   # Read just the rule block, not the entire component
   Read style.css offset=6640 limit=10
   Read style.css offset=4220 limit=10
   ```

4. **Execute Precise Edit** (~300-400 tokens each)
   ```
   Edit desktop hover rule
   Edit mobile hover rule
   ```

**Example - Hover Color Change**:
```
Task: Change task card hover background to #f0f0f0

Registry Check:
- Desktop: lines 6640-6644
- Mobile: lines 4222-4227

Grep: (100 tokens)
grep -n "task-card:hover\|task-card-mobile" style.css

Read Both Rules: (800 tokens)
Read style.css offset=6640 limit=10
Read style.css offset=4220 limit=10

Edit Both: (600 tokens)
Edit .task-card:hover { background: #f0f0f0; }
Edit .task-card-mobile:hover { background: #f0f0f0; }

Total: 1,500 tokens ✅
```

---

### PROTOCOL 3: Adding Form Field

**Use When**: Adding input, select, textarea, or toggle to existing form

**Token Budget**: 2,000-3,000 tokens

**Steps**:

1. **Use Registries for All Locations** (~0 tokens, cached)
   ```
   Example: "Add category field to task form"
   → HTML_REGISTRY: Task Modal form (lines 1380-1550)
   → FUNCTION_REGISTRY: submitTaskForm() (line 11366)
   → FUNCTION_REGISTRY: openTaskModal() (line 9278)
   ```

2. **Grep for Insertion Points** (~200 tokens)
   ```bash
   # Find where to add field in form
   grep -n "task-description\|task-priority" index.html

   # Find where to add field processing
   grep -n "submitTaskForm\|openTaskModal" app.js
   ```

3. **Read Minimal Context for Each** (~1,500 tokens)
   ```
   Read index.html offset=1450 limit=30  # Form field area
   Read app.js offset=11400 limit=40     # submitTaskForm
   Read app.js offset=9320 limit=30      # openTaskModal
   ```

4. **Execute Three Edits** (~800 tokens)
   ```
   Edit index.html - Add <div class="form-group"> for category
   Edit app.js submitTaskForm - Add category: form.category.value
   Edit app.js openTaskModal - Add populate category field
   ```

**Token Breakdown**:
- Registry: 0 (cached)
- Grep: 200
- Reads: 1,500
- Edits: 800
- **Total: 2,500 tokens**

---

### PROTOCOL 4: Modifying JavaScript Function Logic

**Use When**: Fixing bugs, changing logic, updating function behavior (NOT adding new functions)

**Token Budget**: 1,500-2,500 tokens

**Steps**:

1. **Use FUNCTION_REGISTRY** (~0 tokens, cached)
   ```
   Example: "Fix sorting logic in renderTasks()"
   → FUNCTION_REGISTRY: renderTasks() line 7736-7850 (114 lines)
   ```

2. **Grep for Function Boundary** (~100 tokens)
   ```bash
   grep -n "function renderTasks\|^}" app.js | head -20
   # Verify start/end lines
   ```

3. **Read Function + Small Context** (~1,500-2,000 tokens)
   ```
   # Read function + 20 lines before/after for context
   Read app.js offset=7716 limit=150
   ```

4. **Edit Function** (~300-500 tokens)
   ```
   Edit specific logic block within function
   ```

**Example - Sort Fix**:
```
Task: Fix task sorting to prioritize high priority

Registry: renderTasks() at line 7736

Grep Verify: (100 tokens)
grep -n "function renderTasks" app.js

Read Function: (1,800 tokens)
Read app.js offset=7716 limit=150

Edit Sort Logic: (400 tokens)
Change sorting comparison in renderTasks

Total: 2,300 tokens ✅
```

---

### PROTOCOL 5: Adding New Component (HTML + CSS + JS)

**Use When**: Creating new UI component that requires HTML structure, styling, and JavaScript

**Token Budget**: 4,000-6,000 tokens

**Steps**:

1. **Use All Three Registries** (~0 tokens, cached)
   ```
   Example: "Add category filter dropdown"
   → HTML_REGISTRY: Filters section (914-1041)
   → CSS_REGISTRY: Filter buttons (8402-8523 desktop, 10660-10756 mobile)
   → FUNCTION_REGISTRY: updateFilterBadges() (line varies)
   ```

2. **Grep for Insertion Patterns** (~300 tokens)
   ```bash
   # Find similar components to copy pattern
   grep -n "filter-group\|filter-button" index.html
   grep -n "\.filter-button\|\.filter-group" style.css
   grep -n "updateFilterBadges\|getFilteredTasks" app.js
   ```

3. **Read Three Context Areas** (~3,000 tokens)
   ```
   Read index.html offset=1000 limit=50  # Filter area
   Read style.css offset=8400 limit=60   # Desktop styles
   Read app.js offset=[filterFunction] limit=80
   ```

4. **Execute Three Edits** (~1,500 tokens)
   ```
   Edit index.html - Add filter group HTML
   Edit style.css - Add filter button styles (desktop + mobile)
   Edit app.js - Add filter logic
   ```

**Token Breakdown**:
- Registries: 0
- Grep patterns: 300
- Reads: 3,000
- Edits: 1,500
- **Total: 4,800 tokens**

---

### PROTOCOL 6: Swapping CSS Class Names

**Use When**: Renaming classes, changing class assignments, replacing class references

**Token Budget**: 1,000-1,500 tokens

**Steps**:

1. **Grep for ALL Occurrences** (~200 tokens)
   ```bash
   # Find every instance of class in CSS and HTML
   grep -n "\.old-class-name\|old-class-name" style.css
   grep -n "old-class-name" index.html
   grep -n "old-class-name" app.js
   ```

2. **Count Occurrences** (~0 tokens)
   ```
   If <= 3 occurrences per file: Use targeted reads
   If > 3 occurrences per file: Use replace_all flag in Edit tool
   ```

3. **Targeted Approach** (~800-1,000 tokens)
   ```
   Read small sections around each occurrence
   Edit each location individually
   ```

4. **OR Replace All Approach** (~300 tokens)
   ```
   Read nothing (Edit tool will handle)
   Edit with replace_all=true flag
   ```

**Example - Class Rename**:
```
Task: Rename .task-priority to .task-priority-badge

Grep Count: (200 tokens)
grep -c "task-priority" style.css → Result: 8 occurrences
grep -c "task-priority" index.html → Result: 4 occurrences

Approach: Replace all (fewer tokens for many occurrences)

Edit CSS: (150 tokens)
Edit style.css replace_all=true
old: .task-priority
new: .task-priority-badge

Edit HTML: (150 tokens)
Edit index.html replace_all=true
old: task-priority
new: task-priority-badge

Total: 500 tokens ✅ (no reads needed!)
```

---

### PROTOCOL 7: Surgical Multi-Edit (Complex Structural Changes)

**Use When**: Complex changes requiring multiple coordinated edits (e.g., extract function, refactor component)

**Token Budget**: 5,000-8,000 tokens (still better than reading full files)

**Strategy**: Break into smallest possible atomic edits

**Steps**:

1. **Map All Touch Points with Registry + Grep** (~500 tokens)
   ```bash
   # Identify EVERY location that needs changing
   Use registries to get general areas
   Use grep to find exact lines
   Document all touch points before starting
   ```

2. **Read Each Touch Point Minimally** (~3,000-4,000 tokens)
   ```
   Read offset/limit for each area separately
   Keep reads as small as possible (20-50 lines each)
   ```

3. **Execute Edits in Logical Order** (~2,000-3,000 tokens)
   ```
   Edit in dependency order:
   1. Data structures first
   2. Functions that write data
   3. Functions that read data
   4. UI components last
   ```

4. **Verify Each Edit Before Next** (~0 tokens)
   ```
   Check edit succeeded before moving to next
   If edit fails, re-read that section only
   ```

**Example - Extract Service**:
```
Task: Extract task CRUD operations to separate service

Map Touch Points: (500 tokens)
Registry + Grep to find:
- All task creation code
- All task update code
- All task deletion code
- All task read code

Read Each Area: (4,000 tokens)
Read app.js offset=X limit=50 (8 different sections)

Execute 8 Edits: (2,500 tokens)
Create new service file + update 7 call sites

Total: 7,000 tokens ✅ (vs 196,000 reading app.js twice)
```

---

### PROTOCOL 8: Deleting Existing Component/Section

**Use When**: Removing a UI block or feature (HTML + CSS + JS cleanup)

**Token Budget**: 2,500-4,000 tokens

**Steps**:

1. **Use Registries to Map Touch Points** (~0 tokens, cached)
   - HTML_REGISTRY: section location
   - CSS_REGISTRY: desktop + mobile styles
   - FUNCTION_REGISTRY: handlers or logic

2. **Grep for All References** (~200-400 tokens)
   ```bash
   grep -n "unique-id|unique-class|feature-name" index.html
   grep -n "unique-class|feature-name" style.css
   grep -n "unique-id|feature-name" app.js
   ```

3. **Read Minimal Context** (~1,500-2,000 tokens)
   ```
   Read index.html offset=... limit=...
   Read style.css offset=... limit=...
   Read app.js offset=... limit=...
   ```

4. **Delete in Dependency Order** (~600-800 tokens)
   - Remove HTML block
   - Remove CSS rules (desktop + mobile)
   - Remove JS logic (listeners, mappings, defaults)

5. **Confirm No Leftovers** (~100 tokens)
   ```bash
   grep -n "unique-id|unique-class|feature-name" index.html style.css app.js
   ```

---

### PROTOCOL 9: Duplicate/Clone Existing Component

**Use When**: Copying an existing block and making small changes

**Token Budget**: 3,000-4,500 tokens

**Steps**:

1. **Use Registries to Locate Source** (~0 tokens, cached)
2. **Grep for Source Markers** (~200 tokens)
   ```bash
   grep -n "source-id|source-class" index.html
   ```
3. **Read Minimal Context** (~1,500-2,000 tokens)
   ```
   Read index.html offset=... limit=...
   ```
4. **Duplicate and Adjust** (~800-1,200 tokens)
   - Copy the block
   - Update ids, names, labels
   - If JS hooks are needed, update app.js using Protocol 4
5. **Reuse CSS Where Possible** (~0-300 tokens)
   - Prefer existing classes
   - Only add new CSS if strictly needed

---

### PROTOCOL 10: Editing User-Facing Text/Copy

**Use When**: Changing labels, placeholders, button text, or help text

**Token Budget**: 600-1,200 tokens

**Steps**:

1. **Grep for Exact String** (~50-150 tokens)
   ```bash
   grep -n -F "Exact text here" index.html
   ```
2. **If Multiple Matches, Narrow** (~50-150 tokens)
   ```bash
   grep -n -F "Exact text here" index.html
   grep -n -F "Exact text here" app.js
   ```
3. **Read Minimal Context** (~200-400 tokens)
   ```
   Read index.html offset=... limit=10
   ```
4. **Edit Only the String** (~200-400 tokens)
   - Use replace_all if the same text is intentionally repeated

---

### PROTOCOL 11: Renaming IDs or Data Attributes

**Use When**: Renaming `id=`, `data-*`, or `aria-*` targets referenced in HTML/CSS/JS

**Token Budget**: 1,000-2,000 tokens

**Steps**:

1. **Grep Across HTML/CSS/JS** (~200-400 tokens)
   ```bash
   grep -n "old-id" index.html
   grep -n "#old-id|\\[data-old\\]" style.css
   grep -n "old-id" app.js
   ```
2. **Choose Targeted vs replace_all** (~0 tokens)
   - If <= 3 occurrences per file: targeted reads
   - If many occurrences: replace_all=true
3. **Read Minimal Context** (~400-800 tokens)
   ```
   Read index.html offset=... limit=15
   Read app.js offset=... limit=20
   ```
4. **Update All Coupled Attributes** (~300-500 tokens)
   - id + label[for]
   - aria-controls / aria-labelledby
   - querySelector/getElementById targets

---

### PROTOCOL 12: Updating CSS Variables/Theme Tokens

**Use When**: Adjusting :root variables or theme colors

**Token Budget**: 800-1,500 tokens

**Steps**:

1. **Use CSS Registry for :root** (~0 tokens, cached)
2. **Grep for Variable Name** (~100 tokens)
   ```bash
   grep -n ":root" style.css
   grep -n "--accent-blue" style.css
   ```
3. **Read Minimal Context** (~300-500 tokens)
   ```
   Read style.css offset=1 limit=40
   ```
4. **Edit Variable Values** (~300-500 tokens)
5. **If Renaming Variables, Use Protocol 11** (~0 tokens)

---

### Debug Logging Toggle (MANDATORY)

When adding logs, they must be gated by the Settings toggle.

**Rules:**
- Setting key: `settings.debugLogsEnabled` (default `false`)
- Mirror to localStorage: `debugLogsEnabled` (string `"true"`/`"false"`)
- Client logs only when enabled; avoid logging raw payloads or screenshots
- Server logs only when request header `X-Debug-Logs: 1` is present (pass `X-Request-Id` for correlation)

---

### PROTOCOL ENFORCEMENT CHECKLIST

**Before EVERY code operation, verify:**

- [ ] **Did I select the correct protocol?** (Reorder? CSS change? Add field? etc.)
- [ ] **Did I check specs/HOTSPOTS.md for a matching recurring target?**
- [ ] **Did I consult the appropriate registry FIRST?**
- [ ] **Did I use grep to find exact boundaries/patterns?**
- [ ] **Did I read the MINIMUM necessary context?** (offset/limit, not full file)
- [ ] **Am I using Edit tool correctly?** (precise old_string/new_string, not huge blocks)
- [ ] **For CSS: Did I check BOTH desktop AND mobile?**
- [ ] **⚠️ THEME COMPATIBILITY: Did I use theme variables (var(--text-primary), var(--bg-card), etc.) instead of hardcoded colors (white, black, #fff)?**
- [ ] **Did I apply specs/PAIRED_SURFACES.md (theme + i18n + multi-view)?**
- [ ] **If renaming IDs/data attributes, did I update all coupled selectors (labels, aria, JS)?**
- [ ] **For multi-file changes: Did I map ALL touch points before starting?**

**If you answered NO to any, STOP and restart with correct protocol.**

---

### PROTOCOL SUCCESS METRICS

**Target Token Usage by Operation Type:**

| Operation Type | Protocol | Target Tokens | Max Acceptable | % of Budget |
|----------------|----------|---------------|----------------|-------------|
| **Reorder HTML** | Protocol 1 | 3,000-4,000 | 5,000 | 2% |
| **CSS Property** | Protocol 2 | 1,200-1,500 | 2,000 | 0.75% |
| **Add Form Field** | Protocol 3 | 2,000-3,000 | 4,000 | 1.5% |
| **Edit Function** | Protocol 4 | 1,500-2,500 | 3,500 | 1.25% |
| **New Component** | Protocol 5 | 4,000-6,000 | 8,000 | 3% |
| **Swap Classes** | Protocol 6 | 1,000-1,500 | 2,500 | 0.75% |
| **Delete Component** | Protocol 8 | 2,500-4,000 | 5,000 | 2% |
| **Duplicate Component** | Protocol 9 | 3,000-4,500 | 6,000 | 2.5% |
| **Edit Text/Copy** | Protocol 10 | 600-1,200 | 1,500 | 0.5% |
| **Rename IDs/Data** | Protocol 11 | 1,000-2,000 | 2,500 | 0.75% |
| **Update CSS Variables** | Protocol 12 | 800-1,500 | 2,000 | 0.75% |
| **Complex Multi** | Protocol 7 | 5,000-8,000 | 10,000 | 4% |

**If you exceed "Max Acceptable", you did NOT follow the protocol correctly.**

---

### COMMON PROTOCOL MISTAKES TO AVOID

❌ **Mistake 1: Reading full section when you only need one element**
```
Bad: Read index.html offset=914 limit=127 (all filters)
Good: Read index.html offset=976 limit=35 (just two filters to swap)
Savings: 3x fewer tokens
```

❌ **Mistake 2: Using massive old_string/new_string in Edit**
```
Bad: old_string = 70 lines, new_string = 70 lines
Good: old_string = 17 lines (element 1) + 17 lines (element 2)
Savings: 2x fewer tokens
```

❌ **Mistake 3: Reading file multiple times**
```
Bad: Read for element A, Edit, Read again for element B, Edit
Good: Read ONCE with both elements, Edit both from same read
Savings: Eliminates redundant read
```

❌ **Mistake 4: Forgetting to grep first**
```
Bad: Read large section hoping to find element
Good: Grep to confirm exact location, then read precise section
Savings: Prevents reading wrong section
```

❌ **Mistake 5: Not using replace_all for repeated changes**
```
Bad: Read + Edit same class name 8 times individually
Good: Edit replace_all=true once
Savings: 10x fewer tokens
```

---

? **Mistake 6: Renaming IDs without updating coupled references**
```
Bad: Change id in HTML only
Good: Update id + label[for] + aria + JS selectors
Savings: Prevents rework + extra reads
```

### PROTOCOL DECISION FLOWCHART

```
User Request
    ↓
Is this a known operation type?
    ├─ Yes → Select Protocol 1-7
    │         ↓
    │   Follow protocol steps exactly
    │         ↓
    │   Verify token usage < target
    │         ↓
    │   Done ✅
    │
    └─ No → Protocol 7 (Surgical Multi-Edit)
              ↓
        Break into smallest atomic operations
              ↓
        Apply appropriate protocol to each piece
              ↓
        Done ✅
```

---

Note: Protocols 8-12 are additional known operation types. Use them before Protocol 7 fallback.

### LEARNING FROM PAST FAILURES

**Case Study: Filter Swap (January 2026)**

**Request**: Swap start date and end date filters (left to right)

**Expected**: 3-4% of tokens (6,000-8,000 tokens)

**What Happened (WITHOUT Protocol)**:
- Read index.html offset=975 limit=70 → 6,000 tokens
- Edit with 70-line old_string + 70-line new_string → 16,000 tokens
- **Total: 22,000 tokens (11% of budget) ❌**

**What SHOULD Have Happened (WITH Protocol 1)**:
- Registry lookup → 0 tokens (cached)
- Grep verification → 100 tokens
- Read offset=970 limit=50 → 2,500 tokens
- Edit with precise 17+17 line blocks → 500 tokens
- **Total: 3,100 tokens (1.5% of budget) ✅**

**Lesson**: Following Protocol 1 exactly would have saved 18,900 tokens (7x reduction)

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
- ✅ **FIRST: Check FUNCTION_REGISTRY / CSS_REGISTRY / HTML_REGISTRY** before any file operations
- ✅ Use Edit with line numbers from registry (fastest method)
- ✅ If editing CSS: Check BOTH desktop AND mobile sections in CSS_REGISTRY
- ✅ Only use Grep if registry entry doesn't exist (then update registry)
- ✅ Reference specs documents for architecture/patterns
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

### ⚠️ MANDATORY PRE-FLIGHT CHECKLIST (HARD GATE) ⚠️

**🚫 DO NOT PROCEED WITH ANY CODE CHANGES UNTIL THIS IS COMPLETE**

**Before ANY file edits, writes, or code operations:**

1. **Check Current Branch** (MANDATORY FIRST STEP)
   ```bash
   git branch --show-current
   ```

2. **If on `main` → CREATE BRANCH IMMEDIATELY** (DO NOT SKIP)
   ```bash
   git checkout -b fix/descriptive-name
   # OR
   git checkout -b feature/descriptive-name
   # OR
   git checkout -b refactor/descriptive-name
   ```

3. **Push Empty Branch Immediately** (Optional but recommended)
   ```bash
   git push -u origin fix/descriptive-name
   ```
   **Why:** Ensures branch exists even if session ends unexpectedly

**If you are on `main` and have NOT created a branch yet:**
- ❌ **STOP** - Do not make any code changes
- ✅ **Create branch FIRST**, then proceed with changes

**This is a HARD GATE - no exceptions.**

---

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

**Use HEREDOC for multi-line messages (Bash/Linux):**
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

**⚠️ PowerShell/Windows: Use newline escapes instead of HEREDOC:**
```powershell
git commit -m "Add category filter to tasks`n`n- Added category dropdown`n- Implemented filter logic`n- Updated UI patterns`n`n🤖 Generated with Claude Code`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

**Note:** The `update-dev-vars.js` script error during git operations is harmless (it's a git hook that fails but doesn't block git). The script will be fixed separately.

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
- [docs/guides/VISUAL_GUIDELINES.md](docs/guides/VISUAL_GUIDELINES.md) - Colors, typography, spacing, accessibility

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

### Step 0: Architect vs Implementer

**If user said "act as architect" or you are in Architect role:**
- Produce a plan only (scope, design, options, recommendations). Do **not** execute implementation.
- Do not run Edit/Write commands or implementation-related terminal commands. Wait for explicit user approval (e.g. "implement this", "go ahead", "approved") before any implementation.

**If Implementer (or user approved implementation):** proceed with Steps 0.5–4 below.

### Step 0.5: ⚠️ BRANCH GATE (MANDATORY AFTER APPROVAL) ⚠️

**After user approves implementation (e.g., "yes go for C", "implement this", "go ahead"):**

**BEFORE making ANY code changes:**
1. Check current branch: `git branch --show-current`
2. **If on `main` → CREATE BRANCH IMMEDIATELY**
   ```bash
   git checkout -b fix/descriptive-name
   ```
3. **Push empty branch** (optional but recommended):
   ```bash
   git push -u origin fix/descriptive-name
   ```

**Only AFTER branch is created and pushed, proceed with code changes.**

**This gate prevents forgetting to branch when switching from Architect to Implementer mode.**

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
- [ ] Visual quality meets standards (docs/guides/VISUAL_GUIDELINES.md)
- [ ] **⚠️ THEME COMPATIBILITY: All colors use theme variables (var(--text-primary), var(--bg-card), etc.) - NO hardcoded colors (white, black, #fff, #000)**
- [ ] Data migration included if needed
- [ ] Error handling included
- [ ] Works in light AND dark mode (tested or verified via theme variables)
- [ ] **⚠️ BUNDLE VERSIONS: If `npm run build` was executed, index.html bundle version hashes are committed**

### Step 5: Bump Version Strings (CRITICAL!)

⚠️ **MANDATORY BEFORE EVERY COMMIT TO PRODUCTION**

Because of the `_headers` file, CSS and JS are cached for **1 YEAR** by Cloudflare based on the URL.

**⚠️ CRITICAL WORKFLOW: Before creating PR or merging:**
1. **ALWAYS run `git status`** to check for uncommitted files
2. **If `npm run build` was executed**, `index.html` will be modified with new bundle hashes
3. **COMMIT `index.html` immediately** - never leave it uncommitted
4. **Double-check before PR**: `git status` should show "nothing to commit, working tree clean"
5. **After PR is merged**: Delete the feature branch to avoid confusion

**Why this matters:**
- Uncommitted files are NOT included in the PR
- If PR is merged with missing files, the branch can't be safely deleted
- Missing bundle version updates cause production cache issues
- Confusion about what's in main vs. what's in the branch

#### 5a. Main Files (index.html references)

**If you change app.js or style.css, you MUST bump the version string in index.html:**

```html
<!-- BEFORE committing changes to app.js -->
<script src="app.js?v=20260109-backlog-notifications"></script>

<!-- BEFORE committing changes to style.css -->
<link rel="stylesheet" href="style.css?v=20260109-project-tags">
```

**After `npm run build`, the build script automatically updates these hashes in index.html. You MUST commit this change!**

#### 5b. Module Imports (ALSO CRITICAL!)

**If you change `storage-client.js`, you MUST bump version strings in BOTH import locations:**

```javascript
// app.js (around line 1623)
} from "./storage-client.js?v=20260116-feature-name";

// src/services/storage.js (around line 15)
} from "../../storage-client.js?v=20260116-feature-name";
```

⚠️ **Both files MUST use the SAME version string** to ensure consistency.

**Why module imports need versions too:**
- `storage-client.js` is imported by multiple files
- Browser/CDN caches the module URL separately from the importing file
- If you add new exports to `storage-client.js` but don't bump the import version:
  - Old cached `storage-client.js` is served
  - Error: `does not provide an export named 'newFunction'`
  - App breaks in production even though code is correct locally

#### Version Format & Rules

**Version format:** `YYYYMMDD-feature-name`

**Why this matters:**
- Same URL = Cloudflare serves cached version (for 1 YEAR!)
- Users get OLD code even after deployment
- Features appear "broken" (missing translations, broken logic)
- Hard refreshes don't help (it's CDN cache, not browser cache)

**When to bump:**
- ✅ ANY change to app.js → bump in index.html
- ✅ ANY change to style.css → bump in index.html
- ✅ ANY change to storage-client.js → bump in BOTH app.js AND src/services/storage.js
- ✅ Even minor bug fixes
- ✅ Even small CSS tweaks

**If you forget:** Users will see old code for up to 1 year!

### Step 6: Commit

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
- Bumped app.js and style.css versions

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
git push
```

**⚠️ PRE-PR CHECKLIST (MANDATORY):**
```bash
# 1. Check for uncommitted files
git status
# Should show: "nothing to commit, working tree clean"

# 2. If npm run build was executed, commit index.html
# (Build script auto-updates bundle version hashes)
git add index.html
git commit -m "Update bundle version hashes"
git push

# 3. Final verification
git status
# Must be clean before creating PR!
```

**Respond to user:**
```
✅ Category field added to tasks.

Changes:
- Task schema updated
- UI components created
- Data migration included
- Bundle versions updated (if build was run)

Branch `feature/add-task-field` pushed.
✅ Pre-PR check: All files committed, working tree clean.
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
- `tests/test-[feature-name].js` (e.g., `tests/test-task-service.js`)
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
node tests/test-[feature-name].js
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

### 6. Add New Setting

⚠️ **CRITICAL CHECKLIST - ALL STEPS MANDATORY**

When adding any new setting (toggle, select, input), you MUST complete ALL of these steps. Missing ANY step will break the settings form.

#### Step 1: Add Default Value
```javascript
// app.js - DEFAULT_SETTINGS object (~line 30-43)
const DEFAULT_SETTINGS = {
    // ... existing settings
    newSettingName: defaultValue, // Add your new setting with default value
};
```

#### Step 2: Add Translations
```javascript
// app.js - I18N_TRANSLATIONS.en (~line 50-600)
'settings.newSettingLabel': 'Setting Label',
'settings.newSettingHint': 'Explanation of what this setting does',

// app.js - I18N_TRANSLATIONS.es (~line 650-1250)
'settings.newSettingLabel': 'Etiqueta de configuración',
'settings.newSettingHint': 'Explicación de lo que hace esta configuración',
```

#### Step 3: Add HTML Toggle/Input
```html
<!-- index.html - Settings modal (~line 1900-2000) -->
<div class="settings-field settings-field-toggle">
    <div class="settings-field-label">
        <label class="field-label" for="new-setting-id" data-i18n="settings.newSettingLabel">Setting Label</label>
        <p class="field-hint" data-i18n="settings.newSettingHint">Explanation here</p>
    </div>
    <div class="settings-field-input">
        <div class="premium-toggle">
            <input type="checkbox" id="new-setting-id" name="newSettingName">
            <label for="new-setting-id"></label>
        </div>
    </div>
</div>
```

#### Step 4: Read Setting Value (on modal open)
```javascript
// app.js - openSettings() function (~line 14070-14100)
const newSettingToggle = form.querySelector('#new-setting-id');
// ...
if (newSettingToggle) {
    newSettingToggle.checked = !!settings.newSettingName;
}
```

#### Step 5: Save Setting Value (on save button click)
```javascript
// app.js - saveSettings() function (~line 9740-9760)
const newSettingToggle = document.getElementById('new-setting-id');
// ...
settings.newSettingName = !!newSettingToggle?.checked;
```

#### Step 6: Initial Form State (for dirty detection)
```javascript
// app.js - openSettings() - Capture initial state (~line 14177-14193)
window.initialSettingsFormState = {
    // ... existing settings
    newSettingName: !!(newSettingToggle?.checked),
};
```

#### Step 7: Current Form State (for dirty detection)
```javascript
// app.js - markDirtyIfNeeded() - Current state (~line 14217-14233)
const current = {
    // ... existing settings
    newSettingName: !!(newSettingToggle?.checked),
};
```

#### Step 8: Dirty Detection Logic
```javascript
// app.js - markDirtyIfNeeded() - isDirty check (~line 14235-14250)
const isDirty =
    // ... existing comparisons
    current.newSettingName !== window.initialSettingsFormState.newSettingName ||
    // ... rest of comparisons
```

#### Step 9: **CRITICAL** - Add Change Event Listener
```javascript
// app.js - openSettings() - Listen to relevant inputs (~line 14269)
// Add your toggle to this array:
[userNameInput, emailInput, ..., newSettingToggle, ...]
    .filter(Boolean)
    .forEach(el => {
        el.addEventListener('change', markDirtyIfNeeded);
    });
```

**This is the step that is most commonly forgotten! Without this, the form will NOT become dirty when the toggle changes, and the Save button will remain disabled.**

#### Step 10: Implement Setting Logic
Apply the setting value in your application logic where needed.

---

**Example: emailNotificationsIncludeBacklog**

1. Default: `emailNotificationsIncludeBacklog: false` (line 41)
2. Translations: English + Spanish (lines 576-577, 1221-1222)
3. HTML: Toggle in notifications section (index.html 1944-1955)
4. Read value: `emailIncludeBacklogToggle.checked = !!settings.emailNotificationsIncludeBacklog` (line 14097-14099)
5. Save value: `settings.emailNotificationsIncludeBacklog = !!emailIncludeBacklogToggle?.checked` (line 9751)
6. Initial state: `emailNotificationsIncludeBacklog: !!(emailIncludeBacklogToggle?.checked)` (line 14183)
7. Current state: `emailNotificationsIncludeBacklog: !!(emailIncludeBacklogToggle?.checked)` (line 14223)
8. Dirty check: `current.emailNotificationsIncludeBacklog !== window.initialSettingsFormState.emailNotificationsIncludeBacklog` (line 14240)
9. **Event listener**: Added `emailIncludeBacklogToggle` to array (line 14269)
10. Logic: Filter backlog tasks in notifications (app.js line 1846, functions/api/notifications.js line 284)

**Total Steps: 10/10 ✅**

**If you miss Step 9, the form will NOT work properly!**

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

### ⚠️ Branch–Commit–Push Protocol (MANDATORY)

**Whenever you make file changes:**

1. **If on `main`** → Create a new branch **before or immediately after** making changes.
2. **Commit** all changes to that branch (never commit directly to `main`).
3. **Push** the branch to `origin` before ending the session.

```bash
git branch --show-current
# If main:
git checkout -b fix/foo  # or feature/bar, chore/baz, etc.
# ... make changes ...
git add .
git commit -m "fix: description"
git push -u origin fix/foo
```

**Rule:** No uncommitted changes left on `main`. No pushing to `main`. User creates PR and merges via GitHub.

---

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

### Git Rules (Branch–Commit–Push Protocol)
1. ✅ Check branch first (step 0)
2. ✅ If on main → create new branch before/as soon as you make changes
3. ✅ Commit to branch only; push branch immediately
4. ❌ Never commit to main; never merge to main (user creates PR)

### File Locations
- Specs: `specs/`
- Templates: `templates/`
- Plans: `docs/plans/`
- Config: `CLAUDE.md`, `CODEX.md`
- Visuals: `docs/guides/VISUAL_GUIDELINES.md`

---

**Last Updated:** 2026-01-11
**Version:** 2.0.0
**Target Efficiency:** 50-100x token reduction achieved (vs v1.0), 95% cost reduction

**v2.0.0 Changes (MAJOR UPDATE):**
- **Added REGISTRY SYSTEM** - Precision navigation for monolithic architecture
- **FUNCTION_REGISTRY.md** - Maps all app.js functions with line numbers (19.6x faster)
- **CSS_REGISTRY.md** - Links desktop + mobile CSS sections (112x faster, prevents bugs)
- **HTML_REGISTRY.md** - Maps all HTML sections and modals (68x faster)
- **Mandatory registry-first protocol** - Use registries before any file operations
- **Solves "forgot mobile" problem** - CSS_REGISTRY auto-reminds about mobile sections
- **Validated monolithic approach** - Modularization failed with AI, keeping monolithic + registries
- **Average session cost: €2-3** (down from €90/month overruns)

**v1.1.0 Changes:**
- Added comprehensive Quality Assurance Protocol
- Defined when to offer testing (50+ lines, 3+ files, new modules)
- Added test templates and QA report templates
- Integrated testing into git workflow

See also:
- [CODEX.md](CODEX.md) - ChatGPT/GitHub Copilot configuration
- [specs/](specs/) - Comprehensive specs documentation
- [docs/plans/README.md](docs/plans/README.md) - Implementation planning framework
