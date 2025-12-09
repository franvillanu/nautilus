# Token Usage Crisis Analysis - Nautilus Project

**Date:** 2025-12-09
**Status:** 🔴 CRITICAL - Weekly limits hit due to monolithic architecture

---

## Executive Summary

**CRITICAL FINDING:** The token efficiency protocol in CLAUDE.md is based on **catastrophically incorrect file size estimates**.

- **Estimated**: app.js = 6,000 tokens
- **ACTUAL**: app.js = ~98,000 tokens (**16x larger**)
- **Impact**: A single read of app.js consumes 49% of the entire 200K token budget

## Actual File Sizes

| File | Lines | Size | Est. Tokens | % of Budget |
|------|-------|------|-------------|-------------|
| **app.js** | 9,667 | 392KB | ~98,000 | 49% |
| **style.css** | 9,254 | 224KB | ~56,000 | 28% |
| **index.html** | 1,433 | 82KB | ~20,500 | 10% |
| **TOTAL** | 20,354 | 698KB | **~174,500** | **87%** |

**Reading all 3 main files ONCE = 87% of token budget exhausted**

## Why Token Efficiency Protocol Fails

The CLAUDE.md protocol is well-designed but built on wrong assumptions:

### Token Cost Table (CLAUDE.md vs Reality)

| Operation | CLAUDE.md Est. | ACTUAL Cost | Multiplier |
|-----------|---------------|-------------|------------|
| Read app.js | 6,000 | 98,000 | **16.3x** |
| Read style.css | ~2,000 | 56,000 | **28x** |
| Read index.html | ~2,000 | 20,500 | **10x** |

### Example Failure Scenario

**CLAUDE.md estimates for "Add new filter":**
- Grep "filterState": 50 tokens ✅
- Edit filterState: 100 tokens ✅
- Total estimated: 750 tokens ✅

**Reality if app.js not in cache:**
- Read app.js (required first time): 98,000 tokens ❌
- Grep + Edit: 750 tokens ✅
- **Actual total: 98,750 tokens** (131x over estimate!)

## Root Cause: Monolithic Architecture

The project has **NOT** successfully modularized despite having a src/ directory:

### Partial Modularization Evidence

**✅ Extracted (2,816 lines total):**
- `src/services/taskService.js` - 234 lines
- `src/services/projectService.js` - 182 lines
- `src/services/historyService.js` - 333 lines
- `src/services/reportGenerator.js` - 952 lines
- `src/services/storage.js` - 166 lines
- `src/utils/html.js` - 42 lines
- `src/utils/date.js` - 153 lines
- `src/utils/colors.js` - 51 lines

**❌ Still in app.js (9,667 lines):**
- ~200+ function/const/class declarations
- All UI rendering logic (renderTasks, renderProjects, etc.)
- All event handlers (task forms, project forms, filters)
- All modal management
- All filtering and sorting logic
- Likely duplicate code that should use extracted services

## Token Consumption Math

### Scenario 1: Simple Bug Fix (Best Case)
```
1. Read app.js (first time): 98,000 tokens
2. Grep to find bug: 100 tokens
3. Edit to fix: 200 tokens
Total: 98,300 tokens (49% of budget for ONE bug fix!)
```

### Scenario 2: Add Feature (Typical Case)
```
1. Read app.js: 98,000 tokens
2. Read index.html: 20,500 tokens
3. Read style.css: 56,000 tokens
4. Multiple Greps: 500 tokens
5. Multiple Edits: 1,000 tokens
Total: 176,000 tokens (88% of budget for ONE feature!)
```

### Scenario 3: Multi-Session Reality
```
Session 1: Read files + implement feature = 176,000 tokens
Session 2: CACHE MISS (new session) = Read files again = 174,500 tokens
Result: Can only do 1-2 operations per session before hitting limit
```

## Why Weekly Limits Are Hit

**User report**: "You quickly use the weekly limits"

**Math check:**
- Weekly limit: Likely 1-2M tokens
- Current rate: ~150K-200K per meaningful change
- **Can only do 5-10 changes per week** before hitting limit

This matches user's experience.

## Solutions

### Immediate (Emergency Triage)

1. **Update CLAUDE.md with correct token costs**
   - app.js: 98,000 tokens (not 6,000)
   - style.css: 56,000 tokens (not 2,000)
   - index.html: 20,500 tokens (not 2,000)

2. **Aggressive cache awareness**
   - NEVER re-read files in same session unless absolutely critical
   - Ask user if file changed before re-reading
   - Use offset/limit parameters when reading large files

3. **Expand specs to replace code reads**
   - Document ALL major functions in specs
   - Include code examples in specs
   - Reference specs instead of reading app.js

### Short-term (1-2 weeks)

4. **Complete the modularization started in src/**
   - Move ALL functions out of app.js into services
   - Extract UI rendering to src/ui/
   - Extract event handlers to src/handlers/
   - Extract form logic to src/forms/
   - Target: Reduce app.js from 9,667 lines to <1,000 lines
   - Result: app.js becomes thin orchestration layer (~10K tokens instead of 98K)

5. **Split style.css into modules**
   - components/buttons.css
   - components/modals.css
   - layout/grid.css
   - themes/colors.css
   - Target: No single CSS file over 50KB

6. **Extract HTML templates**
   - Move modal templates to separate files
   - Load dynamically only when needed
   - Reduces index.html from 82KB to ~20KB

### Long-term (Architectural)

7. **Migrate to ES modules with build step**
   - Allows true code splitting
   - Import only what's needed per operation
   - Tree-shaking reduces token costs
   - Example: Fix bug in taskService.js = only read that 234-line file (~2K tokens)

8. **Component-based architecture**
   ```
   src/
     components/
       TaskCard/
         TaskCard.js (200 lines = 2K tokens)
         TaskCard.css (100 lines = 1K tokens)
         TaskCard.html (50 lines = 500 tokens)
     services/
       taskService.js (300 lines = 3K tokens)
   ```
   - Fix bug in TaskCard = 6,500 tokens (vs 98,000 now!)
   - **15x token reduction**

## Recommended Action Plan

### Phase 1: Emergency (This week)
- [ ] Update CLAUDE.md token estimates to reality
- [ ] Create detailed function index in specs (map function → file:line)
- [ ] Never re-read app.js unless confirmed changed
- [ ] Use Read offset/limit for targeted reads

### Phase 2: Quick Wins (Next 2 weeks)
- [ ] Split style.css into 8-10 component files
- [ ] Extract UI rendering from app.js to src/ui/
- [ ] Extract event handlers to src/handlers/
- [ ] Extract form logic to src/forms/
- [ ] Update specs with ALL extracted modules

### Phase 3: Structural (Month 2)
- [ ] Reduce app.js to <1,000 lines (orchestration only)
- [ ] Component-based file organization
- [ ] Consider build tooling for true code splitting
- [ ] Implement lazy loading for modules

## Expected Results

### After Phase 1:
- Understand true costs, avoid re-reads
- Use targeted reads with offset/limit
- **20-30% token reduction**

### After Phase 2:
- Read specific service files (2-5K) instead of app.js (98K)
- Read specific CSS modules (3-8K) instead of style.css (56K)
- **60-70% token reduction**

### After Phase 3:
- Typical operation: 5K-15K tokens (vs 150K-200K now)
- **85-90% token reduction**
- Can do 50+ operations per week instead of 5-10

## Comparison to CLAUDE.md Goals

| Metric | CLAUDE.md Target | Current Reality | After Phase 2 | After Phase 3 |
|--------|------------------|-----------------|---------------|---------------|
| Tokens per op | 2,550 | 150,000 | 30,000 | 10,000 |
| Operations per session | 78 | 1-2 | 5-8 | 15-20 |
| Weekly operations | ~500 | 5-10 | 30-50 | 100+ |
| Weekly limit hit | Never | Always ❌ | Rarely | Never ✅ |

**CLAUDE.md target of 2,550 tokens is achievable, but ONLY after aggressive modularization.**

---

## Implementation Notes

### File Size Monitoring

Add to CI/CD or pre-commit hooks:
```bash
# Warn if any file exceeds token budget limits
if [ $(wc -l < app.js) -gt 2000 ]; then
  echo "WARNING: app.js exceeds 2000 lines (target for modular architecture)"
fi
```

### Modularization Checklist

When extracting code from app.js:
- [ ] Identify cohesive function groups
- [ ] Create new module file in appropriate src/ subdirectory
- [ ] Move functions with dependencies
- [ ] Update imports in app.js
- [ ] Test functionality
- [ ] Update specs documentation
- [ ] Commit with clear message

### CSS Split Strategy

Priority order (highest token savings first):
1. Pages (tasks.css, projects.css) - ~30% of file
2. Components (modals.css, cards.css) - ~25% of file
3. Layout (grid.css, containers.css) - ~20% of file
4. Themes (light.css, dark.css) - ~10% of file
5. Base (reset.css, variables.css) - ~15% of file

---

**Next Steps:** See TOKEN-USAGE-ACTION-PLAN.md for immediate actions
