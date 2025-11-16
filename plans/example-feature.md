# Add Task Categories Feature

**Status:** Planning
**Priority:** Medium
**Estimated Effort:** Medium (4-6 hours)
**Author:** AI Assistant
**Date:** 2025-11-16

---

## Summary

Add a category system to tasks, allowing users to classify tasks by type (e.g., Development, Design, Research, General). Users can assign one category per task and filter tasks by category.

---

## Goals

**Primary:**
- Users can assign a category to each task
- Users can filter tasks by category
- Categories persist across sessions
- Existing tasks get default category

**Secondary (Nice-to-Have):**
- Category colors/icons
- Custom categories in settings
- Category-based analytics

---

## Non-Goals

- Multiple categories per task (tags already exist for this)
- Category hierarchies (e.g., parent/child categories)
- Category-specific permissions
- Per-project categories

---

## User Stories

**As a** developer
**I want** to categorize my tasks by type (coding, meetings, documentation)
**So that** I can filter and focus on specific types of work

**As a** project manager
**I want** to see all design-related tasks across projects
**So that** I can plan design sprints

**As a** researcher
**I want** to separate research tasks from implementation tasks
**So that** I can allocate time appropriately

---

## Design

### Data Model Changes

**Current Task Structure:**
```javascript
{
    id: number,
    title: string,
    description: string,
    projectId: number | null,
    priority: 'low' | 'medium' | 'high',
    status: 'todo' | 'progress' | 'review' | 'done',
    startDate: string,
    endDate: string,
    tags: string[],
    attachments: object[],
    createdAt: string
}
```

**New Task Structure:**
```javascript
{
    id: number,
    title: string,
    description: string,
    category: string,         // 🆕 NEW: 'general' | 'development' | 'design' | 'research' | ...
    projectId: number | null,
    priority: 'low' | 'medium' | 'high',
    status: 'todo' | 'progress' | 'review' | 'done',
    startDate: string,
    endDate: string,
    tags: string[],
    attachments: object[],
    createdAt: string
}
```

**New Filter State:**
```javascript
let filterState = {
    search: "",
    statuses: new Set(),
    priorities: new Set(),
    projects: new Set(),
    tags: new Set(),
    categories: new Set(),    // 🆕 NEW
    dateFrom: "",
    dateTo: ""
};
```

### UI Changes

**1. Task Modal - Add Category Dropdown:**
```html
<div class="form-group">
    <label class="form-label">Category</label>
    <div class="category-dropdown">
        <input type="hidden" name="category" value="general">
        <div class="category-current">
            <span>General</span>
            <span class="dropdown-arrow">▼</span>
        </div>
        <div class="dropdown-panel">
            <div class="category-option" data-category="general">General</div>
            <div class="category-option" data-category="development">Development</div>
            <div class="category-option" data-category="design">Design</div>
            <div class="category-option" data-category="research">Research</div>
        </div>
    </div>
</div>
```

**2. Filters Toolbar - Add Category Filter:**
```html
<button class="filter-button" onclick="toggleCategoryFilter()">
    Category
    <span class="filter-count-badge">0</span>
</button>
```

**3. Task Cards - Display Category:**
```html
<div class="task-meta">
    <span class="category-badge">Development</span>
    <!-- existing meta items -->
</div>
```

### API Changes

- **Storage:** No new endpoints needed - category stored in tasks array
- **Migration:** Existing tasks get `category: 'general'`

---

## Implementation Steps

### Phase 1: Data Layer (1 hour)

- [x] Add category field to task creation in `app.js`
- [x] Default to `'general'` if not specified
- [x] Update task form submission handler
- [x] Add data migration in `loadDataFromKV()`
  - Check if task.category exists
  - If not, set to 'general'
  - Save migrated data

**Files:** `app.js` (~30 lines)

### Phase 2: UI Components (2 hours)

- [ ] Create category dropdown in task modal (`index.html`)
- [ ] Add dropdown styling (`style.css`)
- [ ] Implement `setupCategoryDropdown()` in `app.js`
  - Toggle on click
  - Select option
  - Update hidden input
- [ ] Populate category when editing task
- [ ] Display category badge in task cards
- [ ] Add category badge styling

**Files:** `index.html` (~40 lines), `style.css` (~50 lines), `app.js` (~60 lines)

### Phase 3: Filtering (1.5 hours)

- [ ] Add `categories` Set to `filterState`
- [ ] Create category filter UI in filters toolbar
- [ ] Implement `toggleCategoryFilter(category)` function
- [ ] Update `getFilteredTasks()` to include category logic
- [ ] Update `updateFilterBadges()` for category count
- [ ] Add to `clearAllFilters()`
- [ ] Render active filter chips for categories

**Files:** `index.html` (~30 lines), `app.js` (~40 lines)

### Phase 4: Polish & Testing (1.5 hours)

- [ ] Test category assignment in new tasks
- [ ] Test category editing
- [ ] Test category filtering (single and multiple)
- [ ] Test data migration with existing tasks
- [ ] Test in dark mode
- [ ] Test on mobile
- [ ] Update documentation
  - Add to `specs/ARCHITECTURE.md`
  - Add to `specs/DEVELOPMENT_GUIDE.md`
- [ ] Code review

---

## Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `app.js` | Add category field, filtering, dropdown setup | ~130 |
| `index.html` | Category dropdown, filter button | ~70 |
| `style.css` | Dropdown and badge styles | ~50 |
| `specs/ARCHITECTURE.md` | Update task data structure | ~10 |
| `specs/DEVELOPMENT_GUIDE.md` | Add category example | ~20 |

**Total estimated lines:** ~280

---

## Edge Cases

| Case | Handling |
|------|----------|
| **Task created without category** | Default to `'general'` |
| **Existing tasks (migration)** | Set `category: 'general'` for all |
| **Category dropdown empty selection** | Not possible - always has selection |
| **Filter by non-existent category** | No results (expected behavior) |
| **Task card display without category** | Show "General" badge |
| **100+ tasks with categories** | Use Set for O(1) filtering |

---

## Testing Plan

**Unit Tests (Manual):**

1. **Create Task:**
   - [ ] Create task with category "Development"
   - [ ] Verify task.category === 'development'
   - [ ] Verify category saved to storage

2. **Edit Task:**
   - [ ] Open existing task
   - [ ] Verify category dropdown shows correct value
   - [ ] Change category to "Design"
   - [ ] Save and verify update

3. **Filter:**
   - [ ] Filter by single category
   - [ ] Verify only matching tasks shown
   - [ ] Filter by multiple categories
   - [ ] Verify OR logic (any match shows)
   - [ ] Clear filter
   - [ ] Verify all tasks shown

4. **Migration:**
   - [ ] Load app with old tasks (no category field)
   - [ ] Verify all tasks get category: 'general'
   - [ ] Verify migration saves to storage

5. **UI/UX:**
   - [ ] Category dropdown toggles on click
   - [ ] Dropdown closes on selection
   - [ ] Dropdown closes on outside click
   - [ ] Category badge displays correctly
   - [ ] Filter button shows count
   - [ ] Active filter chips render
   - [ ] Dark mode works
   - [ ] Mobile responsive

**Performance Tests:**

- [ ] Test with 0 tasks
- [ ] Test with 10 tasks
- [ ] Test with 100 tasks
- [ ] Test with 500 tasks
- [ ] Filtering should complete < 100ms

**Browser Tests:**

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

---

## Dependencies

**Required:**
- None (self-contained feature)

**Optional:**
- Could integrate with project colors (future enhancement)

**Blocked By:**
- N/A

**Blocks:**
- Future: Category-based analytics dashboard
- Future: Category icons/colors

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Data migration fails** | High | Low | Add try-catch, test on backup data first, add rollback |
| **Performance degrades with many categories** | Medium | Low | Limit to 20 categories max, use Set for filtering |
| **UI clutter in task modal** | Low | Medium | Keep UI minimal, use dropdown (not all buttons) |
| **Users confused about category vs tags** | Low | Medium | Add help text explaining difference |

---

## Alternatives Considered

### Option 1: Use Tags Instead

**Pros:**
- Already have tag system
- More flexible (multiple per task)
- No new code needed

**Cons:**
- Too flexible - users create inconsistent tags
- Harder to filter (many variations of same concept)
- No structure or guidance

**Decision:** ❌ Rejected - Categories provide structure

### Option 2: Project-Level Categories

**Pros:**
- Categories scoped to project
- More granular control

**Cons:**
- Can't filter across projects
- More complex UI
- Harder to understand

**Decision:** ❌ Rejected - Global categories simpler

### Option 3: Hierarchical Categories

**Pros:**
- More organization (parent/child)
- Scalable to many categories

**Cons:**
- Much more complex
- Overkill for current needs
- Harder UI

**Decision:** ❌ Rejected - Flat list is sufficient

### Option 4: Selected Approach (Flat Categories)

**Pros:**
- Simple to implement
- Easy to understand
- Works across projects
- Provides structure

**Cons:**
- Limited flexibility vs tags
- Can't have multiple categories per task

**Decision:** ✅ **Selected** - Best balance of simplicity and utility

---

## Success Metrics

**Functional:**
- [x] Users can assign category to task
- [ ] Users can filter by category
- [ ] Existing tasks migrated successfully
- [ ] Zero data loss

**Performance:**
- [ ] Category dropdown loads < 50ms
- [ ] Filtering completes < 100ms (500 tasks)
- [ ] No UI lag when selecting category

**Quality:**
- [ ] Works in light and dark mode
- [ ] Mobile responsive
- [ ] Follows coding conventions
- [ ] Matches visual guidelines

---

## Future Enhancements

**Phase 2 (Future):**
- Custom categories (user-defined)
- Category colors/icons
- Category-based analytics
- Category in project view
- Export by category

**Phase 3 (Future):**
- Category templates (presets for common workflows)
- Category time tracking
- Category-based reporting

---

## Notes

**Design Decisions:**
- Used dropdown instead of buttons to save space
- Defaulted to "General" to avoid empty state
- Chose 4 initial categories based on common use cases
- Kept category separate from tags to maintain structure

**Implementation Notes:**
- Migration is one-time, runs on first load after update
- Category filter uses Set for O(1) lookup (same as other filters)
- Dropdown follows same pattern as status/priority dropdowns

**Deferred:**
- Category customization (settings page needed first)
- Category icons (emoji support varies across systems)
- Multi-category (tags already handle this)

---

## Changelog

**2025-11-16:**
- Plan created
- Data model defined
- Implementation steps outlined
- Testing plan created

**YYYY-MM-DD:**
- [Status updates go here as work progresses]

---

**Next Steps:**

1. Review this plan
2. Create feature branch: `git checkout -b feature/add-task-categories`
3. Start Phase 1: Data Layer
4. Check off steps as completed
5. Update status to "In Progress"
