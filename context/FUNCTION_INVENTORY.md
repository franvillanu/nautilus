# Function Inventory - Safety Baseline

**Generated:** 2025-01-22

**Purpose:** Complete inventory of all functions in app.js before modularization. This serves as a safety baseline to ensure nothing is lost during extraction.

---

## Current State Summary

| Metric | Value |
|--------|-------|
| Total Functions in app.js | 300+ |
| File Size | ~19,000 lines |
| Imports Location | Lines 1615-1679 (middle of file!) |
| Already Extracted Modules | 10 |

---

## Already Imported Modules

These modules are already extracted and imported into app.js:

| Module | Import Location | Functions Imported |
|--------|-----------------|-------------------|
| storage-client.js | Line 1615 | loadData, saveData, saveFeedbackItem, etc. |
| src/services/storage.js | Line 1626 | saveAll, saveTasks, saveProjects, etc. |
| src/services/taskService.js | Line 1639 | createTask, updateTask, deleteTask, etc. |
| src/services/projectService.js | Line 1647 | createProject, updateProject, deleteProject, etc. |
| src/utils/html.js | Line 1655 | escapeHtml, sanitizeInput |
| src/utils/date.js | Line 1656 | looksLikeDMY, looksLikeISO, formatDate, etc. |
| src/utils/colors.js | Line 1665 | TAG_COLORS, PROJECT_COLORS |
| src/config/constants.js | Line 1666 | VALID_STATUSES, VALID_PRIORITIES, etc. |
| src/config/release-notes.js | Line 1676 | RELEASE_NOTES |
| src/services/reportGenerator.js | Line 1678 | generateWordReport |

---

## Functions Still in app.js (Partial List - Key Categories)

### Debug/Logging (Lines 52-95)
- `applyDebugLogSetting` - Line 52
- `isDebugLogsEnabled` - Line 60
- `logDebug` - Line 71
- `debugTimeStart` - Line 80
- `debugTimeEnd` - Line 88

### Internationalization (Lines 1419-1496)
- `normalizeLanguage` - Line 1419
- `getCurrentLanguage` - Line 1423
- `getLocale` - Line 1427
- `t` - Line 1432 (translation function)
- `applyTranslations` - Line 1445
- `getStatusLabel` - Line 1467
- `getProjectStatusLabel` - Line 1478
- `getPriorityLabel` - Line 1487
- `applyLanguage` - Line 1496

### Notification System (Lines 1695-2750)
- `showNotification` - Line 1695
- `showErrorNotification` - Line 1749
- `showSuccessNotification` - Line 1753
- `getNotificationHistory` - Line 1873
- `saveNotificationHistory` - Line 1887
- `createNotificationId` - Line 1893
- `addTaskNotification` - Line 1897
- `checkAndCreateDueTodayNotifications` - Line 1920
- `markNotificationRead` - Line 2044
- `markAllNotificationsRead` - Line 2053
- `dismissNotification` - Line 2063
- `updateNotificationBadge` - Line 2278
- `renderNotificationDropdown` - Line 2303
- `setupNotificationMenu` - Line 2627

### Sort System (Lines 2756-2810)
- `toggleSortMode` - Line 2756
- `saveSortPreferences` - Line 2771
- `loadSortPreferences` - Line 2783
- `updateSortUI` - Line 2803

### Data Persistence (Lines 2878-3400)
- `persistAll` - Line 2878
- `saveProjects` - Line 2892
- `saveTasks` - Line 2910
- `persistFeedbackItemsToStorage` - Line 2928
- `saveFeedback` - Line 3379
- `saveProjectColors` - Line 3396
- `loadProjectColors` - Line 3406
- `saveSettings` - Line 3415
- `loadSettings` - Line 3432

### Color Management (Lines 3855-3990)
- `getTagColor` - Line 3855
- `getProjectColor` - Line 3863
- `hexToRGBA` - Line 3874
- `setProjectColor` - Line 3885
- `toggleProjectColorPicker` - Line 3894
- `updateProjectColor` - Line 3905

### Filter System (Lines 4019-4910)
- `initFiltersUI` - Line 4020
- `populateProjectOptions` - Line 4031
- `populateTagOptions` - Line 4091
- `setupFilterEventListeners` - Line 4158
- `toggleSet` - Line 4527
- `updateClearButtonVisibility` - Line 4532
- `updateFilterBadges` - Line 4561
- `renderActiveFilterChips` - Line 4628
- `syncURLWithFilters` - Line 4823
- `renderAfterFilterChange` - Line 4893
- `getFilteredTasks` - Line 4910

### Date Pickers (Lines 5084-5495)
- `stripTime` - Line 5085
- `initializeDatePickers` - Line 5089
- `getFlatpickrLocale` - Line 5468
- `refreshFlatpickrLocale` - Line 5480

### Initialization (Lines 5496-6110)
- `init` - Line 5496 (main entry point)

### Dashboard (Lines 6111-7400)
- `setupDashboardInteractions` - Line 6111
- `navigateToFilteredTasks` - Line 6158
- `applyDashboardFilter` - Line 6201
- `updateDashboardForPeriod` - Line 6263
- `renderDashboard` - Line 6557
- `updateDashboardStats` - Line 6581
- `updateTrendIndicators` - Line 6629
- `renderProjectProgressBars` - Line 6691
- `renderActivityFeed` - Line 6738
- `showAllActivity` - Line 6829
- `renderAllActivity` - Line 6928
- `renderInsights` - Line 7000
- `generateInsights` - Line 7018
- `animateDashboardElements` - Line 7155
- `formatRelativeTime` - Line 7181
- `exportDashboardData` - Line 7224
- `generateReport` - Line 7300
- `updateCounts` - Line 7326

### Navigation (Lines 6288-6460)
- `setupNavigation` - Line 6288
- `showPage` - Line 6356
- `render` - Line 6442

### List View (Lines 7402-7815)
- `sortTable` - Line 7402
- `renderListView` - Line 7425
- `getSmartDateInfo` - Line 7564
- `renderMobileCardsPremium` - Line 7598
- `attachMobileCardListeners` - Line 7754
- `updateSelectDisplay` - Line 7789
- `toggleMultiSelect` - Line 7816

### Projects View (Lines 7841-8215)
- `generateProjectItemHTML` - Line 7841
- `updateExpandedTaskRowLayouts` - Line 7974
- `renderProjects` - Line 8008
- `toggleProjectExpand` - Line 8047
- `renderMobileProjects` - Line 8061
- `attachMobileProjectCardListeners` - Line 8180

### Kanban View (Lines 8215-9080)
- `renderTasks` - Line 8215
- `reorganizeMobileTaskFields` - Line 8397
- `openTaskDetails` - Line 8534
- `deleteTask` - Line 8911
- `duplicateTask` - Line 8949
- `closeConfirmModal` - Line 9008
- `confirmDelete` - Line 9013
- `setupDragAndDrop` - Line 9080

### Modals (Lines 9626-10330)
- `openProjectModal` - Line 9626
- `openTaskModal` - Line 9773
- `closeModal` - Line 10020
- `closeTaskModal` - Line 10054
- `resetPINFlow` - Line 10158

### Form Handling (Lines 11877-12600)
- `submitTaskForm` - Line 11877
- `setupStatusDropdown` - Line 12031
- `handleStatusDropdown` - Line 12040
- `setupPriorityDropdown` - Line 12132
- `handlePriorityDropdown` - Line 12140
- `setupProjectDropdown` - Line 12251
- `handleProjectDropdown` - Line 12260

### Rich Text Editor (Lines 12529-12630)
- `formatText` - Line 12529
- `insertHeading` - Line 12534
- `insertDivider` - Line 12539
- `insertCheckbox` - Line 12597
- `autoLinkifyDescription` - Line 12629

### Calendar View (Lines 13114-13980)
- `loadCalendarState` - Line 13115
- `saveCalendarState` - Line 13128
- `renderCalendar` - Line 13152
- `renderProjectBars` - Line 13295
- `animateCalendarMonthChange` - Line 13856
- `setupCalendarSwipeNavigation` - Line 13860
- `changeMonth` - Line 13923
- `goToToday` - Line 13943
- `getProjectStatus` - Line 13957
- `showDayTasks` - Line 13980

### Project Details (Lines 14377-15000)
- `showProjectDetails` - Line 14377
- `handleDeleteProject` - Line 14766
- `deleteProject` - Line 14771
- `handleDuplicateProject` - Line 14825
- `confirmDuplicateProject` - Line 14902
- `backToProjects` - Line 15000
- `openTaskModalForProject` - Line 15045

### Settings (Lines 15064-15530)
- `openSettingsModal` - Line 15064
- `closeUserDropdown` - Line 15363
- `setupUserMenus` - Line 15370
- `updateUserDisplay` - Line 15388
- `hydrateUserProfile` - Line 15418
- `updateLogos` - Line 15446
- `toggleTheme` - Line 15468
- `updateProjectField` - Line 15533

### Feedback System (Lines 15700-16760)
- `addFeedbackItem` - Line 15700
- `handleFeedbackImageFile` - Line 15896
- `clearFeedbackScreenshot` - Line 15951
- `toggleFeedbackItem` - Line 15970
- `renderFeedback` - Line 16012
- `renderFeedbackPagination` - Line 16094
- `changeFeedbackPage` - Line 16153
- `deleteFeedbackItem` - Line 16699
- `confirmFeedbackDelete` - Line 16709

### History System (Lines 16278-16700)
- `renderTaskHistory` - Line 16279
- `toggleHistorySortOrder` - Line 16328
- `renderProjectHistory` - Line 16356
- `renderHistoryEntryInline` - Line 16405
- `formatChangeValueCompact` - Line 16512
- `toggleHistoryEntryInline` - Line 16589
- `renderChanges` - Line 16605
- `formatChangeValue` - Line 16642

### Attachments (Lines 16788-17570)
- `addAttachment` - Line 16788
- `renderAttachments` - Line 16889
- `renderAttachmentsSeparated` - Line 16991
- `viewFile` - Line 17099
- `removeAttachment` - Line 17162
- `initTaskAttachmentDropzone` - Line 17222
- `uploadTaskAttachmentFile` - Line 17354
- `addFileAttachment` - Line 17446
- `getFileType` - Line 17465
- `getMaxFileSize` - Line 17474
- `getFileIcon` - Line 17488
- `convertFileToBase64` - Line 17499
- `uploadFile` - Line 17508
- `downloadFile` - Line 17533
- `deleteFile` - Line 17543

### Kanban Settings (Lines 17569-17820)
- `getKanbanUpdatedFilterLabel` - Line 17569
- `updateKanbanGridColumns` - Line 17582
- `applyReviewStatusVisibility` - Line 17595
- `applyBacklogColumnVisibility` - Line 17620
- `toggleKanbanSettings` - Line 17761
- `toggleKanbanBacklog` - Line 17777
- `toggleKanbanProjects` - Line 17794
- `toggleKanbanNoDate` - Line 17801

### Task Field Updates (Lines 17822-18160)
- `updateTaskField` - Line 17822
- `captureInitialTaskFormState` - Line 18011
- `hasUnsavedNewTask` - Line 18029
- `bindOverlayClose` - Line 18062

### Tags (Lines 18160-18500)
- `addTag` - Line 18160
- `removeTag` - Line 18236
- `renderTags` - Line 18289
- `addProjectTag` - Line 18317
- `removeProjectTag` - Line 18367
- `renderProjectTags` - Line 18397
- `renderProjectDetailsTags` - Line 18427
- `addProjectDetailsTag` - Line 18457
- `removeProjectDetailsTag` - Line 18497

### Project Filters (Lines 18779-19530)
- `clearAllFilters` - Line 18779
- `filterProjectTasks` - Line 18815
- `navigateToProjectStatus` - Line 18862
- `navigateToAllTasks` - Line 18882
- `filterProjectPortalList` - Line 18917
- `updateNoDateOptionVisibility` - Line 18938
- `updateProjectStatusBadge` - Line 18953
- `populateProjectTagOptions` - Line 18987
- `applyProjectFilters` - Line 19178
- `applyProjectsSort` - Line 19248
- `getProjectSortLabel` - Line 19334
- `applyProjectsSortSelection` - Line 19367
- `updateProjectsSortOptionsUI` - Line 19384
- `syncURLWithProjectFilters` - Line 19543
- `saveProjectsViewState` - Line 19590
- `loadProjectsViewState` - Line 19598
- `setupProjectsControls` - Line 19652
- `clearProjectFilters` - Line 19822

### Mobile Navigation (Lines 19854-19924)
- `handleChecklistEnter` - Line 19854
- `initMobileNav` - Line 19923

---

## Structural Issues to Fix

1. **Imports in middle of file** - Lines 1615-1679 should be at the top
2. **Global variables at top** - Lines 1-100 define globals before imports
3. **No module exports** - app.js doesn't export anything (it's the entry point)

---

## Recommended Extraction Order

### Phase 1: Move Imports to Top (Structural Fix)
1. Move all import statements to line 1
2. Move global variable declarations after imports
3. Test that app still works

### Phase 2: Extract Debug/Logging Module
Target: `src/utils/debug.js`
- `applyDebugLogSetting`
- `isDebugLogsEnabled`
- `logDebug`
- `debugTimeStart`
- `debugTimeEnd`

### Phase 3: Extract Notification Module
Target: `src/services/notificationService.js`
- All notification-related functions (Lines 1695-2750)

### Phase 4: Extract UI Modules
Target: `src/ui/notification.js`
- `showNotification`
- `showErrorNotification`
- `showSuccessNotification`

Target: `src/ui/modal.js`
- `openModal`
- `closeModal`
- `closeTaskModal`
- etc.

### Phase 5: Extract View Modules
Target: `src/views/dashboard.js`
Target: `src/views/kanban.js`
Target: `src/views/calendar.js`
Target: `src/views/projects.js`
Target: `src/views/list.js`

---

## Verification Checklist

After each extraction:
- [ ] Run `node --check app.js`
- [ ] Run `node --check src/[new-module].js`
- [ ] Open app in browser
- [ ] Run event delegation validator
- [ ] Run data structure validator
- [ ] Test affected feature manually

---

**This inventory serves as the safety baseline. Compare against this after each extraction to ensure no functions are lost.**
