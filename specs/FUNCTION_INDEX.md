# Function Index - app.js

**Purpose:** Quick reference to locate functions in app.js without reading the entire file (98K tokens).

**Usage:**
1. Find function name and line number in this index
2. Use: `Read app.js offset=[line-50] limit=100` to read just that section
3. Or use: `Grep "function functionName"` then `Edit` to modify

**Last Updated:** 2025-12-09
**File Size:** app.js = 9,667 lines (98,000 tokens)

---

## UI Rendering Functions

| Function | Line | Purpose |
|----------|------|---------|
| `render()` | 2067 | Main render controller |
| `renderDashboard()` | 2079 | Dashboard page rendering |
| `renderTasks()` | 3437 | Task list/card rendering |
| `renderProjects()` | 3245 | Project list rendering |
| `renderListView()` | 2791 | List view rendering |
| `renderMobileCardsPremium()` | 2921 | Mobile task cards |
| `renderMobileProjects()` | 3292 | Mobile project cards |
| `renderCalendar()` | 5997 | Calendar view rendering |
| `renderProjectBars()` | 6167 | Calendar project bars |
| `renderActivityFeed()` | 2199 | Dashboard activity feed |
| `renderAllActivity()` | 2333 | Full activity page |
| `renderInsights()` | 2403 | Dashboard insights |
| `renderFeedback()` | 7507 | Feedback list |
| `renderTags()` | 8892 | Tag chips |
| `renderView()` | 9393 | Projects view switcher |
| `renderActiveFilterChips()` | 863 | Active filter chips |
| `renderTaskHistory()` | 7600 | Task history timeline |
| `renderProjectHistory()` | 7671 | Project history timeline |
| `renderHistoryEntryInline()` | 7720 | History entry inline view |
| `renderChanges()` | 7888 | History change details |
| `renderProjectProgressBars()` | 2152 | Dashboard project progress |

## Modal & UI Control

| Function | Line | Purpose |
|----------|------|---------|
| `openTaskModal()` | 4404 | Open task creation modal |
| `openProjectModal()` | 4375 | Open project creation modal |
| `openTaskDetails()` | 3592 | Open task details view |
| `showProjectDetails()` | 6845 | Open project details view |
| `openSettingsModal()` | 7171 | Open settings modal |
| `closeModal()` | 4558 | Generic modal close |
| `closeTaskModal()` | 4569 | Close task modal |
| `closeDayItemsModal()` | 6736 | Close calendar day view |
| `closeProjectConfirmModal()` | 6756 | Close project delete confirm |
| `closeUnsavedChangesModal()` | 6769 | Close unsaved changes modal |
| `closeFeedbackDeleteModal()` | 7975 | Close feedback delete confirm |
| `showPage()` | 2009 | Navigate between pages |
| `showDayTasks()` | 6630 | Show tasks for calendar day |
| `showRecentActivityPage()` | 2299 | Navigate to activity page |
| `showAllActivity()` | 2289 | Show all activity |
| `showUnsavedChangesModal()` | 6764 | Show unsaved changes warning |
| `showCalendarView()` | 7375 | Navigate to calendar |
| `backToDashboard()` | 2294 | Navigate back to dashboard |
| `backToProjects()` | 7130 | Navigate back to projects |
| `bindOverlayClose()` | 8758 | Bind modal overlay click |

## Form Handling

| Function | Line | Purpose |
|----------|------|---------|
| `submitTaskForm()` | 4955 | Handle task form submission |
| `setupStatusDropdown()` | 5073 | Initialize status dropdown |
| `handleStatusDropdown()` | 5082 | Handle status selection |
| `setupPriorityDropdown()` | 5174 | Initialize priority dropdown |
| `handlePriorityDropdown()` | 5182 | Handle priority selection |
| `setupProjectDropdown()` | 5283 | Initialize project dropdown |
| `handleProjectDropdown()` | 5292 | Handle project selection |
| `updatePriorityOptions()` | 5245 | Update priority dropdown |
| `updateStatusOptions()` | 5262 | Update status dropdown |
| `populateProjectDropdownOptions()` | 5355 | Populate project options |
| `showProjectDropdownPortal()` | 5381 | Show project dropdown portal |
| `hideProjectDropdownPortal()` | 5477 | Hide project dropdown portal |
| `positionProjectPortal()` | 5456 | Position dropdown portal |
| `handleProjectPortalClose()` | 5493 | Close project portal |
| `handleProjectPortalEsc()` | 5536 | Handle ESC key in portal |
| `captureInitialTaskFormState()` | 8707 | Capture form initial state |
| `hasUnsavedNewTask()` | 8725 | Check for unsaved changes |

## Filter & Search

| Function | Line | Purpose |
|----------|------|---------|
| `getFilteredTasks()` | 1075 | Get filtered task list |
| `initFiltersUI()` | 442 | Initialize filters UI |
| `setupFilterEventListeners()` | 575 | Attach filter event listeners |
| `populateProjectOptions()` | 450 | Populate project filter options |
| `populateTagOptions()` | 509 | Populate tag filter options |
| `updateFilterBadges()` | 843 | Update filter count badges |
| `updateClearButtonVisibility()` | 825 | Show/hide clear filters button |
| `renderAfterFilterChange()` | 1058 | Re-render after filter change |
| `syncURLWithFilters()` | 1006 | Sync filters to URL params |
| `clearAllFilters()` | 9049 | Clear all active filters |
| `filterProjectTasks()` | 9085 | Filter tasks by project |
| `navigateToFilteredTasks()` | 1842 | Navigate to filtered view |
| `applyDashboardFilter()` | 1885 | Apply filter from dashboard |
| `filterProjectPortalList()` | 9185 | Filter project dropdown list |
| `toggleSet()` | 820 | Toggle value in Set filter |

## State Management

| Function | Line | Purpose |
|----------|------|---------|
| `updateTaskField()` | 8573 | Update task field value |
| `updateProjectField()` | 7327 | Update project field value |
| `saveSettings()` | 287 | Save user settings |
| `loadSettings()` | 295 | Load user settings |
| `saveCalendarState()` | 5992 | Save calendar view state |
| `loadCalendarState()` | 5969 | Load calendar view state |
| `saveProjectsViewState()` | 9377 | Save projects view state |
| `loadProjectsViewState()` | 9383 | Load projects view state |
| `updateDashboardStats()` | 2087 | Update dashboard statistics |
| `updateCounts()` | 2693 | Update task counts |
| `updateNewDashboardCounts()` | 2726 | Update new dashboard counts |
| `updateTrendIndicators()` | 2125 | Update trend indicators |
| `updateUserDisplay()` | 7223 | Update user name display |
| `hydrateUserProfile()` | 7244 | Load user profile data |

## Task Operations

| Function | Line | Purpose |
|----------|------|---------|
| `deleteTask()` | 3775 | Delete task |
| `duplicateTask()` | 3803 | Duplicate task |
| `confirmDelete()` | 3855 | Confirm task deletion |
| `closeConfirmModal()` | 3850 | Close delete confirmation |
| `addTag()` | 8803 | Add tag to task |
| `removeTag()` | 8855 | Remove tag from task |
| `addAttachment()` | 8049 | Add file attachment |
| `viewImageLegacy()` | 8239 | View image attachment |
| `convertFileToBase64()` | 8466 | Convert file to base64 |
| `getFileType()` | 8432 | Determine file type |
| `getFileIcon()` | 8455 | Get icon for file type |
| `getMaxFileSize()` | 8441 | Get max size for file type |

## Project Operations

| Function | Line | Purpose |
|----------|------|---------|
| `deleteProject()` | 7089 | Delete project |
| `handleDeleteProject()` | 7084 | Handle project deletion |
| `confirmDiscardChanges()` | 6774 | Confirm discard project changes |
| `editProjectTitle()` | 7999 | Edit project title inline |
| `saveProjectTitle()` | 8006 | Save project title |
| `cancelProjectTitle()` | 8015 | Cancel title edit |
| `toggleProjectExpand()` | 3279 | Expand/collapse project |
| `toggleProjectMenu()` | 8025 | Toggle project menu |
| `openTaskModalForProject()` | 7152 | Open task modal for project |
| `getProjectStatus()` | 6608 | Get project status |
| `setProjectColor()` | 387 | Set project color |
| `getProjectColor()` | 376 | Get project color |
| `toggleProjectColorPicker()` | 396 | Toggle color picker |
| `updateProjectColor()` | 407 | Update project color |
| `applyProjectsSort()` | 9225 | Apply projects sorting |
| `updateProjectsClearButtonVisibility()` | 9534 | Update clear button visibility |

## Navigation & Routing

| Function | Line | Purpose |
|----------|------|---------|
| `setupNavigation()` | 1972 | Initialize navigation |
| `navigateToAllTasks()` | 9150 | Navigate to all tasks |
| `navigateToProjectStatus()` | 9130 | Navigate to project status view |

## Dashboard Functions

| Function | Line | Purpose |
|----------|------|---------|
| `setupDashboardInteractions()` | 1795 | Initialize dashboard interactions |
| `updateDashboardForPeriod()` | 1947 | Update dashboard for time period |
| `generateInsights()` | 2421 | Generate dashboard insights |
| `animateDashboardElements()` | 2558 | Animate dashboard on load |
| `exportDashboardData()` | 2604 | Export dashboard data |

## Calendar Functions

| Function | Line | Purpose |
|----------|------|---------|
| `changeMonth()` | 6574 | Navigate calendar months |
| `goToToday()` | 6594 | Jump to today in calendar |
| `maybeRefreshCalendar()` | 7367 | Conditionally refresh calendar |
| `reflowCalendarBars()` | 7425 | Reflow calendar project bars |
| `initializeDatePickers()` | 1201 | Initialize date picker inputs |

## Drag & Drop

| Function | Line | Purpose |
|----------|------|---------|
| `setupDragAndDrop()` | 3907 | Initialize drag and drop |

## Sorting

| Function | Line | Purpose |
|----------|------|---------|
| `sortTable()` | 2768 | Sort task table |
| `toggleSortMode()` | 118 | Toggle sort mode |
| `updateSortUI()` | 161 | Update sort UI |
| `toggleHistorySortOrder()` | 7649 | Toggle history sort order |

## Text Formatting

| Function | Line | Purpose |
|----------|------|---------|
| `formatText()` | 5543 | Format text (bold, italic, etc.) |
| `insertHeading()` | 5548 | Insert heading |
| `insertDivider()` | 5553 | Insert divider |
| `formatTaskText()` | 5558 | Format task text |
| `insertTaskHeading()` | 5563 | Insert task heading |
| `insertTaskDivider()` | 5568 | Insert task divider |
| `insertCheckbox()` | 5611 | Insert checkbox |
| `handleChecklistEnter()` | 9548 | Handle enter in checklist |

## UI Components

| Function | Line | Purpose |
|----------|------|---------|
| `showNotification()` | 77 | Show notification toast |
| `showErrorNotification()` | 105 | Show error notification |
| `showSuccessNotification()` | 109 | Show success notification |
| `setupModalTabs()` | 7561 | Initialize modal tabs |
| `setupProjectsControls()` | 9421 | Initialize project controls |
| `setupUserMenus()` | 7206 | Initialize user menus |
| `initMobileNav()` | 9617 | Initialize mobile navigation |

## Theme & Display

| Function | Line | Purpose |
|----------|------|---------|
| `toggleTheme()` | 7266 | Toggle light/dark theme |
| `updateSelectDisplay()` | 3073 | Update select display |
| `toggleMultiSelect()` | 3100 | Toggle multi-select |
| `updateNoDateOptionVisibility()` | 9206 | Update no-date option visibility |

## Utilities

| Function | Line | Purpose |
|----------|------|---------|
| `getTagColor()` | 368 | Get tag color |
| `generateProjectItemHTML()` | 3125 | Generate project item HTML |
| `stripTime()` | 1197 | Strip time from date |
| `formatRelativeTime()` | 2584 | Format relative time string |
| `formatChangeValue()` | 7925 | Format history change value |
| `formatChangeValueCompact()` | 7809 | Format change value compact |
| `getSmartDateInfo()` | 2891 | Get smart date info |
| `debounce()` | 9369 | Debounce function calls |
| `getScrollableAncestors()` | 5519 | Get scrollable ancestor elements |
| `attachScrollListeners()` | 5503 | Attach scroll listeners |
| `detachScrollListeners()` | 5511 | Detach scroll listeners |

## Event Listeners

| Function | Line | Purpose |
|----------|------|---------|
| `attachMobileCardListeners()` | 3038 | Attach mobile card event listeners |
| `attachMobileProjectCardListeners()` | 3402 | Attach mobile project card listeners |
| `closeDayItemsModalOnBackdrop()` | 6740 | Close modal on backdrop click |

## Feedback System

| Function | Line | Purpose |
|----------|------|---------|
| `addFeedbackItem()` | 7459 | Add feedback item |
| `toggleFeedbackItem()` | 7498 | Toggle feedback item |
| `deleteFeedbackItem()` | 7970 | Delete feedback item |
| `confirmFeedbackDelete()` | 7980 | Confirm feedback deletion |

## Kanban View

| Function | Line | Purpose |
|----------|------|---------|
| `toggleKanbanSettings()` | 8531 | Toggle kanban settings |
| `toggleKanbanProjects()` | 8546 | Toggle kanban projects filter |
| `toggleKanbanNoDate()` | 8553 | Toggle kanban no-date filter |
| `dismissKanbanTip()` | 8020 | Dismiss kanban tip |

## History

| Function | Line | Purpose |
|----------|------|---------|
| `toggleHistoryEntryInline()` | 7872 | Toggle history entry expansion |

## Authentication

| Function | Line | Purpose |
|----------|------|---------|
| `signOut()` | 2598 | Sign out user |
| `resetPINFlow()` | 4641 | Reset PIN flow |
| `showNewPinEntry()` | 4717 | Show new PIN entry |

## Data Migration

| Function | Line | Purpose |
|----------|------|---------|
| `migrateDatesToISO()` | 7431 | Migrate dates to ISO format |

---

## How to Use This Index

### Example 1: Fix bug in renderTasks()

**Bad way (98K tokens):**
```
Read app.js
Edit renderTasks()
```

**Good way (2.5K tokens):**
```
1. Check this index: renderTasks() is at line 3437
2. Read app.js offset=3400 limit=150
3. Edit the specific function
```
**Savings: 39x reduction**

### Example 2: Modify task submission

**Bad way (98K tokens):**
```
Read app.js
Find submitTaskForm
Edit submitTaskForm
```

**Good way (2.5K tokens):**
```
1. Check this index: submitTaskForm() is at line 4955
2. Read app.js offset=4900 limit=150
3. Edit the function
```
**Savings: 39x reduction**

### Example 3: Add new filter type

**Best way (600 tokens):**
```
1. Grep "function getFilteredTasks" (100 tokens)
2. Read app.js offset=1050 limit=200 (2,000 tokens)
3. Edit the filtering logic (300 tokens)
```

---

## Maintenance

**When to update this index:**
- After adding new functions to app.js
- After major refactoring
- When line numbers shift significantly (>100 lines)

**Quick update command:**
```bash
grep -n "^function " app.js > /tmp/functions.txt
# Then manually categorize and update this file
```

---

**Version:** 1.0
**Last Updated:** 2025-12-09
**Functions Indexed:** 177
**Coverage:** ~200 total functions in app.js
