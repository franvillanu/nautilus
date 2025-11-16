# Implementation Plans

This directory contains implementation plans for features and major changes to Nautilus.

---

## Purpose

Implementation plans help:
- ✅ Think through features before coding
- ✅ Identify dependencies and edge cases
- ✅ Maintain consistent approach across features
- ✅ Document decision-making process
- ✅ Provide clear steps for AI assistants or team members

---

## When to Create a Plan

**Create a plan for:**
- New features (e.g., adding analytics page, export functionality)
- Major refactors (e.g., restructuring data model, migrating to new storage)
- Complex bug fixes affecting multiple files
- Breaking changes
- Features requiring data migration

**Skip the plan for:**
- Simple bug fixes (1-2 line changes)
- UI tweaks (color changes, spacing adjustments)
- Adding new options to existing dropdowns
- Documentation updates

---

## Plan Template

Use this structure for all implementation plans:

```markdown
# Feature Name

**Status:** [Planning | In Progress | Completed | Cancelled]
**Priority:** [High | Medium | Low]
**Estimated Effort:** [Small (< 2 hours) | Medium (2-8 hours) | Large (> 8 hours)]
**Author:** Your Name
**Date:** YYYY-MM-DD

---

## Summary

Brief 2-3 sentence description of what this feature does and why it's needed.

---

## Goals

- Primary goal 1
- Primary goal 2
- Secondary goal (nice-to-have)

---

## Non-Goals

- What this feature explicitly will NOT do
- Scope boundaries

---

## User Stories

**As a** [user role]
**I want** [goal]
**So that** [benefit]

Example:
**As a** project manager
**I want** to filter tasks by category
**So that** I can focus on specific types of work

---

## Design

### Data Model Changes

```javascript
// Current structure
{
    id: number,
    title: string
}

// New structure
{
    id: number,
    title: string,
    category: string  // 🆕 New field
}
```

### UI Changes

- Add dropdown to task modal
- Add filter button to toolbar
- Add category badge to task cards

### API Changes

- Storage: Category field persists in tasks array
- No new endpoints needed

---

## Implementation Steps

### Phase 1: Data Layer
- [ ] Add category field to task data structure
- [ ] Update task creation logic
- [ ] Add data migration for existing tasks
- [ ] Test data persistence

### Phase 2: UI Components
- [ ] Create category dropdown component
- [ ] Add category field to task modal
- [ ] Display category in task cards
- [ ] Add category badges

### Phase 3: Filtering
- [ ] Update filterState to include categories
- [ ] Add category filter UI
- [ ] Implement filtering logic
- [ ] Add filter chips

### Phase 4: Polish
- [ ] Test in light and dark mode
- [ ] Add keyboard shortcuts (optional)
- [ ] Update documentation
- [ ] Code review

---

## Files to Modify

| File | Changes | Lines |
|------|---------|-------|
| app.js | Add category field, filtering logic | ~50 |
| index.html | Add dropdown, filter UI | ~30 |
| style.css | Category dropdown styles | ~20 |
| specs/ARCHITECTURE.md | Update data structure docs | ~10 |

---

## Edge Cases

- **What if category is empty?** → Default to "general"
- **What if user deletes category that's in use?** → Keep category value, mark as "archived"
- **What about existing tasks?** → Migration sets category to "general"

---

## Testing Plan

- [ ] Create task with category
- [ ] Edit task category
- [ ] Filter by single category
- [ ] Filter by multiple categories
- [ ] Clear filters
- [ ] Test with no tasks
- [ ] Test with 100+ tasks
- [ ] Test dark mode
- [ ] Test mobile view
- [ ] Test data persistence

---

## Dependencies

- None (self-contained feature)

**Blocked by:**
- N/A

**Blocks:**
- Future: Category-based reporting

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration fails | High | Add rollback logic, test on backup data first |
| Performance with many categories | Medium | Limit to 20 categories, use Set for filtering |
| User confusion about categories | Low | Add help text, provide sensible defaults |

---

## Alternatives Considered

### Option 1: Tags instead of categories
**Pros:** More flexible, already have tag system
**Cons:** Too much flexibility, harder to filter
**Decision:** Categories are more structured, better for this use case

### Option 2: Project-based categories
**Pros:** Category per project
**Cons:** More complex, harder to filter across projects
**Decision:** Global categories simpler

---

## Success Metrics

- Users can create tasks with categories
- Filtering by category works reliably
- No performance degradation with 500+ tasks
- Zero data loss during migration

---

## Future Enhancements

- Category icons/colors
- Category-based views (like project view)
- Category analytics
- Custom categories per user

---

## Notes

- Consider integrating with project colors
- May want to make categories configurable in settings
- Keep UI simple - don't overwhelm users with options

---

## Changelog

**2025-11-16:** Plan created
**YYYY-MM-DD:** Implementation started
**YYYY-MM-DD:** Feature completed
```

---

## Example Plans

See [example-feature.md](example-feature.md) for a complete example of a feature plan.

---

## Plan Lifecycle

### 1. Planning Phase

**Create plan:**
```bash
# Create new plan file
touch plans/add-category-filter.md

# Copy template from plans/example-feature.md
# Fill in sections
```

**Review plan:**
- Does it address the user need?
- Are dependencies identified?
- Are edge cases covered?
- Is scope reasonable?

### 2. Implementation Phase

**Update status:**
```markdown
**Status:** In Progress
```

**Check off steps as you complete them:**
```markdown
- [x] Add category field to task data structure
- [x] Update task creation logic
- [ ] Add data migration
```

### 3. Completion Phase

**Update status:**
```markdown
**Status:** Completed
```

**Add notes:**
```markdown
## Notes

- Implemented as planned
- Added 15 categories by default
- Migration took 0.5s for 200 tasks
```

### 4. Maintenance

**Update if scope changes:**
- Add new sections as needed
- Document decisions made during implementation
- Note any deviations from original plan

---

## Tips for Good Plans

### Be Specific

❌ **Bad:** "Add filtering"
✅ **Good:** "Add category filter with dropdown UI and Set-based filtering logic"

### Think Through Edge Cases

❌ **Bad:** No edge cases section
✅ **Good:** "What if category is deleted? What about existing tasks?"

### Break Down Steps

❌ **Bad:** "Implement feature"
✅ **Good:**
- Phase 1: Data layer
- Phase 2: UI components
- Phase 3: Filtering logic
- Phase 4: Polish & test

### Document Decisions

❌ **Bad:** Just implement without explanation
✅ **Good:** "Chose categories over tags because users need structure"

### Test Thoroughly

❌ **Bad:** No testing plan
✅ **Good:** Specific test cases covering normal use, edge cases, performance

---

## Integration with SDD

**Before implementing:**
1. Create plan (this directory)
2. Review specs ([specs/](../specs/))
3. Check conventions ([specs/CODING_CONVENTIONS.md](../specs/CODING_CONVENTIONS.md))

**During implementation:**
1. Follow plan steps
2. Reference specs for patterns
3. Update plan if scope changes

**After implementation:**
1. Mark plan complete
2. Update specs if new patterns added
3. Add to development guide if reusable

---

## Quick Start

**Create new plan:**

```bash
# 1. Create file
touch plans/your-feature-name.md

# 2. Copy template structure (from example-feature.md)

# 3. Fill in:
#    - Summary (what & why)
#    - Goals (what you're building)
#    - Steps (how you'll build it)
#    - Testing (how you'll verify)

# 4. Review plan

# 5. Start implementing
```

**Use existing plan:**

```bash
# 1. Read plan
# 2. Follow implementation steps
# 3. Check off completed steps
# 4. Update status when done
```

---

## Plan Organization

**File naming:**
- `add-category-filter.md` - Adding new feature
- `fix-date-filter-bug.md` - Fixing bug
- `refactor-modal-system.md` - Refactoring
- `migrate-to-v2-storage.md` - Migration

**Archive completed plans:**
```
plans/
├── README.md
├── example-feature.md
├── active/
│   └── add-analytics-page.md
└── completed/
    └── add-category-filter.md
```

---

## Collaboration

**For team members:**
1. Read plan before reviewing PR
2. Verify implementation matches plan
3. Note any deviations

**For AI assistants:**
1. Read plan before implementing
2. Follow steps exactly
3. Update plan if issues found
4. Mark steps complete as you go

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0

See also:
- [example-feature.md](example-feature.md) - Complete example plan
- [../specs/DEVELOPMENT_GUIDE.md](../specs/DEVELOPMENT_GUIDE.md) - Implementation guides
- [../CLAUDE.md](../CLAUDE.md) - AI assistant workflow
