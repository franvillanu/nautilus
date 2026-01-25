# Manual Testing Priority Guide - Phase 2 Service Extraction

**Purpose:** Identify critical UI components requiring manual testing before merge
**Context:** All 278 automated tests passed (149 service + 53 integration + 33 state + 43 additional)
**Risk Level:** Medium - Services work perfectly in isolation, but UI integration needs verification

---

## 🔴 CRITICAL PRIORITY (Must Test Before Merge)

### 1. Task-Project Association Flow ⚠️ HIGHEST RISK

**Why Critical:** Complex interaction between two services through UI

**Test Scenario A: Assign Task to Project**
```
Steps:
1. Open existing task (or create new)
2. Click project dropdown in task modal
3. Select a project from dropdown
4. Save task
5. Close modal
6. Reopen same task

Expected:
✅ Project dropdown shows selected project
✅ Task appears in project details when viewing that project
✅ Data persists after page reload

Failure Mode:
❌ Task shows "No Project" despite assignment
❌ Dropdown doesn't reflect selection
❌ Task not visible in project details
```

**Test Scenario B: Remove Task from Project**
```
Steps:
1. Open task assigned to project
2. Click project dropdown
3. Select "No Project"
4. Save task
5. View original project details

Expected:
✅ Task no longer appears in project task list
✅ Task shows "No Project" in modal
✅ Change persists after reload

Failure Mode:
❌ Task still shows in project
❌ projectId not cleared in database
```

**Integration Points Tested:**
- createTaskService() with projectId
- updateTaskService() with projectId change
- showProjectDetails() refresh
- Project dropdown population

---

### 2. Project Deletion with Tasks ⚠️ HIGHEST RISK

**Why Critical:** Data integrity - could orphan tasks or delete them unintentionally

**Test Scenario A: Delete Project, Keep Tasks**
```
Steps:
1. Create project with 3 tasks
2. Go to project details
3. Click delete project button
4. UNCHECK "Also delete all tasks"
5. Type "delete"
6. Confirm deletion
7. Go to Tasks page

Expected:
✅ Project deleted from projects list
✅ All 3 tasks still exist
✅ Tasks show "No Project" in their details
✅ Tasks' projectId = null in storage

Failure Mode:
❌ Tasks disappeared (deleted by mistake)
❌ Tasks still show old project name
❌ Tasks have orphaned projectId (points to deleted project)
```

**Test Scenario B: Delete Project, Delete Tasks**
```
Steps:
1. Create project with 3 tasks
2. Go to project details
3. Click delete project
4. CHECK "Also delete all tasks"
5. Type "delete"
6. Confirm

Expected:
✅ Project deleted
✅ All 3 tasks deleted
✅ Tasks removed from all views (list, kanban, calendar)
✅ No orphaned data

Failure Mode:
❌ Tasks still exist
❌ Tasks show in UI but broken
```

**Integration Points Tested:**
- deleteProjectService() with clearTaskAssociations flag
- confirmProjectDelete() logic
- Manual task deletion before project deletion
- View refresh after deletion

---

### 3. Task Duplication with Project ⚠️ HIGH RISK

**Why Critical:** Verifies projectId is correctly copied

**Test Scenario:**
```
Steps:
1. Create task assigned to Project A
2. Open task details
3. Click options menu (⋮)
4. Click "Duplicate Task"
5. Check duplicated task

Expected:
✅ Duplicated task has "Copy" prefix
✅ Duplicated task assigned to same Project A
✅ Both tasks appear in Project A's task list
✅ New task has new ID

Failure Mode:
❌ Duplicated task has no project (projectId lost)
❌ Duplicated task points to wrong project
❌ Original task gets modified
```

**Integration Points Tested:**
- duplicateTaskService()
- Project association preservation
- showProjectDetails() includes both tasks

---

### 4. View Refresh After Operations ⚠️ HIGH RISK

**Why Critical:** UI might not update to reflect service changes

**Test Scenario A: Create Task in Project Details**
```
Steps:
1. View Project A details
2. Click "Add Task" in project view
3. Create task (already assigned to Project A)
4. Save

Expected:
✅ New task immediately appears in project task list
✅ Task count updates
✅ No need to reload page

Failure Mode:
❌ Task created but not visible until refresh
❌ Project appears empty
```

**Test Scenario B: Update Task Status in Kanban**
```
Steps:
1. Open task from kanban "To Do" column
2. Change status to "Done"
3. Save
4. Check kanban view

Expected:
✅ Task immediately moves to "Done" column
✅ "To Do" column count decreases
✅ "Done" column count increases

Failure Mode:
❌ Task stays in old column
❌ Task disappears
❌ Counts don't update
```

**Integration Points Tested:**
- render() called after operations
- showProjectDetails() refresh
- Kanban column updates
- Calendar reflow

---

## 🟠 HIGH PRIORITY (Test Before Production)

### 5. Counter Incrementation ⚠️ DATA INTEGRITY

**Why Important:** Duplicate IDs would corrupt data

**Test Scenario:**
```
Steps:
1. Create 3 tasks (IDs should be 1, 2, 3)
2. Create 2 projects (IDs should be 1, 2)
3. Delete task 2
4. Create new task
5. Create new project
6. Reload page
7. Create another task

Expected:
✅ New task ID is 4 (not 2, not reused)
✅ New project ID is 3 (not 2)
✅ After reload, next IDs are 5 and 4
✅ No duplicate IDs ever

Failure Mode:
❌ ID reused after deletion
❌ Two tasks with same ID
❌ Counter resets to 1 after reload
```

**Integration Points Tested:**
- taskCounter/projectCounter persistence
- Counter never decreases
- loadAllData() restores counters correctly

---

### 6. Calendar View Integration 🗓️ UI REFRESH

**Why Important:** Calendar bars must update after date/project changes

**Test Scenario:**
```
Steps:
1. Go to Calendar view
2. Create project with dates 2025-01-01 to 2025-01-31
3. Create task with same dates, assign to project
4. Update project end date to 2025-02-28
5. Update task dates via quick edit
6. Delete project

Expected:
✅ Project bar appears immediately after creation
✅ Task bar appears in calendar
✅ Bars update when dates change
✅ Bars removed when project/task deleted
✅ reflowCalendarBars() called automatically

Failure Mode:
❌ Bars don't appear until reload
❌ Old bars remain after deletion
❌ Bars overlap incorrectly
```

**Integration Points Tested:**
- updateProjectFieldService() date changes
- Calendar refresh triggers
- reflowCalendarBars()

---

### 7. Filter/Dropdown Updates 🔽 UI SYNC

**Why Important:** Dropdowns must reflect current data

**Test Scenario:**
```
Steps:
1. Create Project A
2. Open task modal
3. Check project dropdown (should show Project A)
4. Close modal
5. Delete Project A
6. Open task modal again
7. Check project dropdown

Expected:
✅ Project A appears in dropdown after creation
✅ Project A removed from dropdown after deletion
✅ populateProjectOptions() called after changes

Failure Mode:
❌ Deleted projects still in dropdown
❌ New projects missing from dropdown
❌ "No Project" option doesn't appear when needed
```

**Integration Points Tested:**
- populateProjectOptions() after CRUD
- Dropdown state synchronization

---

## 🟡 MEDIUM PRIORITY (Nice to Verify)

### 8. Multiple Rapid Operations ⚡ STRESS TEST

**Test Scenario:**
```
Steps:
1. Create 5 tasks rapidly (click, type, save, repeat)
2. Assign all to same project
3. Duplicate each task
4. Move half to different project
5. Delete original project

Expected:
✅ All operations complete without errors
✅ No race conditions
✅ State remains consistent
✅ All UI updates correctly

Failure Mode:
❌ Some tasks missing
❌ Duplicate IDs
❌ UI freezes
```

---

### 9. Date Conversion (DMY ↔ ISO) 📅 DATA FORMAT

**Test Scenario:**
```
Steps:
1. Create project with dates
2. Use project details inline edit for dates
3. Enter date in DD/MM/YYYY format (if picker allows)
4. Save
5. Reopen project details

Expected:
✅ Date displayed correctly
✅ Date stored as ISO (YYYY-MM-DD) in storage
✅ DMY converted to ISO automatically

Failure Mode:
❌ Date stored in wrong format
❌ Date becomes invalid
```

---

### 10. Data Persistence 💾 STORAGE

**Test Scenario:**
```
Steps:
1. Create 2 projects with tasks
2. Assign some tasks to projects
3. Reload page (F5)
4. Check all data

Expected:
✅ All projects persist
✅ All tasks persist
✅ Task-project associations persist
✅ Counters persist (next task/project uses correct ID)

Failure Mode:
❌ Data lost after reload
❌ Associations broken
❌ Counters reset
```

---

## 🟢 LOW PRIORITY (If Time Permits)

### 11. Error Messages 🚨 UX

**Test Scenario:**
```
Try to:
- Delete project without typing "delete"
- Create task with no title
- Update project with invalid dates

Expected:
✅ Clear error messages
✅ No crashes
```

---

### 12. Keyboard Navigation ⌨️ ACCESSIBILITY

**Test Scenario:**
```
Steps:
1. Use Tab to navigate task modal
2. Press Enter to save
3. Press Escape to close

Expected:
✅ All interactive elements reachable
✅ Focus visible
✅ Keyboard shortcuts work
```

---

## Testing Checklist Summary

**Before Merge (30 mins):**
- [ ] Task-Project association (assign + remove)
- [ ] Delete project with "keep tasks" option
- [ ] Delete project with "delete tasks" option
- [ ] Duplicate task with project
- [ ] View refresh (project details, kanban, list)
- [ ] Counter incrementation (no duplicate IDs)

**Before Production (1 hour):**
- [ ] Calendar view integration
- [ ] Filter dropdown updates
- [ ] Multiple rapid operations
- [ ] Date conversion
- [ ] Data persistence (reload page)

**If Time Permits:**
- [ ] Error messages
- [ ] Keyboard navigation

---

## Quick Smoke Test (5 mins)

**Fastest way to catch critical bugs:**

```
1. Create project "Test Project"
2. Create 3 tasks, assign to "Test Project"
3. View "Test Project" details → should show 3 tasks
4. Duplicate one task → should show 4 tasks
5. Delete "Test Project" (keep tasks)
6. Check Tasks page → 4 tasks, all show "No Project"
7. Reload page → 4 tasks still there

If all pass → likely safe to merge
If any fail → critical bug detected
```

---

## What Automated Tests Already Verified

✅ **You DON'T need to manually test:**
- Service logic (createTask, updateTask, etc.)
- Data immutability
- Counter incrementation logic
- Task-project association at service level
- Project deletion logic
- Field validation
- Date conversion in services
- State consistency rules
- Null/undefined handling
- Edge cases (empty arrays, large numbers)

**Only test UI integration and view refresh logic manually.**

---

## Recommended Testing Order

### Phase 1: Critical (15 mins)
1. Task-project association flow (5 mins)
2. Delete project with tasks (5 mins)
3. View refresh verification (5 mins)

### Phase 2: Important (15 mins)
4. Task duplication with project (3 mins)
5. Counter incrementation check (5 mins)
6. Calendar integration (5 mins)
7. Dropdown updates (2 mins)

### Phase 3: Nice to Have (10 mins)
8. Data persistence (reload) (5 mins)
9. Rapid operations (3 mins)
10. Error messages (2 mins)

**Total: 40 minutes for comprehensive manual testing**

---

## Bug Reporting Template

If you find issues, report using this format:

```
**Test:** [Name of test scenario]
**Steps:**
1. Step 1
2. Step 2

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Severity:** Critical / High / Medium / Low
**Screenshot:** [If applicable]
**Console Errors:** [Check browser console]
```

---

## Confidence Level

Based on automated test coverage:

| Component | Automated | Manual Needed | Confidence |
|-----------|-----------|---------------|------------|
| Service Logic | ✅ 100% | ❌ 0% | 🟢 High |
| Data Integrity | ✅ 100% | ❌ 0% | 🟢 High |
| State Consistency | ✅ 100% | ❌ 0% | 🟢 High |
| UI Integration | ❌ 0% | ⚠️ 100% | 🟡 Medium |
| View Refresh | ❌ 0% | ⚠️ 100% | 🟡 Medium |
| Calendar Updates | ❌ 0% | ⚠️ 100% | 🟡 Medium |

**Overall Confidence:** 🟢 High (pending manual UI verification)

**Recommendation:** Services are solid. Focus manual testing on UI refresh and view synchronization.

---

**Last Updated:** 2025-11-26
**Total Automated Tests:** 278/278 PASSED
**Estimated Manual Testing Time:** 40 minutes (comprehensive) / 5 minutes (smoke test)
