/**
 * Event delegation system
 *
 * Centralized click handler for all data-action elements.
 *
 * @module core/events
 */

export function setupEventDelegation(deps) {
    document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const param = target.dataset.param;
        const param2 = target.dataset.param2;

        // Action map - all functions that were previously in onclick handlers
        const actions = {
            // Theme & UI
            'toggleTheme': () => deps.toggleTheme(),
            'showCalendarView': () => deps.showCalendarView(),
            'toggleKanbanSettings': () => deps.toggleKanbanSettings(event),

            // Modals
            'openProjectModal': () => deps.openProjectModal(),
            'openTaskModal': () => deps.openTaskModal(),
            'openSettingsModal': () => { deps.closeUserDropdown(); deps.openSettingsModal(); },
            'openTaskModalForProject': () => deps.openTaskModalForProject(parseInt(param)),
            'openSelectedProjectFromTask': () => deps.openSelectedProjectFromTask(),
            'closeModal': () => deps.closeModal(param),
            'closeTaskModal': () => deps.closeTaskModal(),
            'closeConfirmModal': () => deps.closeConfirmModal(),
            'closeFeedbackDeleteModal': () => deps.closeFeedbackDeleteModal(),
            'closeProjectConfirmModal': () => deps.closeProjectConfirmModal(),
            'closeUnsavedChangesModal': () => deps.closeUnsavedChangesModal(),
            'closeDayItemsModal': () => deps.closeDayItemsModal(),
            'closeDayItemsModalOnBackdrop': () => deps.closeDayItemsModalOnBackdrop(event),

            // Task operations
            'openTaskDetails': () => {
                if (target.dataset.stopPropagation) event.stopPropagation();
                const taskId = parseInt(param);

                // Check if we're opening from project details page
                const projectTasksList = target.closest('#project-tasks-list');
                if (projectTasksList) {
                    // We're in project details - build navigation context
                    const projectDetailsPage = document.getElementById('project-details');
                    if (projectDetailsPage && projectDetailsPage.classList.contains('active')) {
                        // Get all task items in order
                        const taskItems = Array.from(projectTasksList.querySelectorAll('.project-task-item[data-param]'));
                        const taskIds = taskItems.map(item => parseInt(item.dataset.param));
                        const currentIndex = taskIds.indexOf(taskId);

                        if (currentIndex !== -1 && taskIds.length > 1) {
                            // Find project ID from URL
                            const hash = window.location.hash;
                            const projectIdMatch = hash.match(/project-(\d+)/);
                            const projectId = projectIdMatch ? parseInt(projectIdMatch[1]) : null;

                            const navContext = {
                                projectId,
                                taskIds,
                                currentIndex
                            };
                            deps.openTaskDetails(taskId, navContext);
                            return;
                        }
                    }
                }

                // Check if we're opening from expanded project card on Projects page
                const expandedTaskItem = target.closest('.expanded-task-item');
                if (expandedTaskItem) {
                    // Try mobile structure first (.project-card-mobile)
                    let projectCard = expandedTaskItem.closest('.project-card-mobile');
                    let projectId = null;

                    if (projectCard) {
                        projectId = parseInt(projectCard.dataset.projectId);
                    } else {
                        // Try desktop structure (.project-list-item)
                        const projectListItem = expandedTaskItem.closest('.project-list-item');
                        if (projectListItem && projectListItem.id) {
                            // Extract project ID from id="project-item-123"
                            const match = projectListItem.id.match(/project-item-(\d+)/);
                            if (match) {
                                projectId = parseInt(match[1]);
                            }
                        }
                    }

                    if (projectId) {
                        // Get all task items in this expanded project in order
                        const taskContainer = expandedTaskItem.closest('.expanded-tasks-container');
                        if (taskContainer) {
                            const taskItems = Array.from(taskContainer.querySelectorAll('.expanded-task-item[data-param]'));
                            const taskIds = taskItems.map(item => parseInt(item.dataset.param));
                            const currentIndex = taskIds.indexOf(taskId);

                            if (currentIndex !== -1 && taskIds.length > 1) {
                                const navContext = {
                                    projectId,
                                    taskIds,
                                    currentIndex
                                };
                                deps.openTaskDetails(taskId, navContext);
                                return;
                            }
                        }
                    }
                }

                // Default: open without navigation context
                deps.openTaskDetails(taskId);
            },
            'deleteTask': () => deps.deleteTask(),
            'duplicateTask': () => deps.duplicateTask(),
            'confirmDelete': () => deps.confirmDelete(),

            // Project operations
            'showProjectDetails': () => {
                if (target.dataset.stopPropagation) event.stopPropagation();
                const isDashboard = document.getElementById('dashboard').classList.contains('active');
                const referrer = isDashboard ? 'dashboard' : 'projects';
                deps.showProjectDetails(parseInt(param), referrer);
            },
            'toggleProjectExpand': () => deps.toggleProjectExpand(parseInt(param)),
            'toggleProjectMenu': () => deps.toggleProjectMenu(event),
            'editProjectTitle': () => deps.editProjectTitle(parseInt(param), param2),
            'saveProjectTitle': () => deps.saveProjectTitle(parseInt(param)),
            'cancelProjectTitle': () => deps.cancelProjectTitle(),
            'handleDeleteProject': () => deps.handleDeleteProject(parseInt(param)),
            'handleDuplicateProject': () => deps.handleDuplicateProject(parseInt(param)),
            'toggleProjectColorPicker': () => deps.toggleProjectColorPicker(parseInt(param)),
            'updateProjectColor': () => deps.updateProjectColor(parseInt(param), param2),
            'openCustomProjectColorPicker': () => deps.openCustomProjectColorPicker(parseInt(param)),
            'navigateToProjectStatus': () => deps.navigateToProjectStatus(parseInt(param), param2),
            'deleteProject': () => deps.deleteProject(),
            'confirmProjectDelete': () => deps.confirmProjectDelete(),
            'closeDuplicateProjectModal': () => deps.closeDuplicateProjectModal(),
            'confirmDuplicateProject': () => deps.confirmDuplicateProject(),

            // Feedback operations
            'addFeedbackItem': () => deps.addFeedbackItem(),
            'deleteFeedbackItem': () => deps.deleteFeedbackItem(parseInt(param)),
            'confirmFeedbackDelete': () => deps.confirmFeedbackDelete(),

            // History operations
            'toggleHistoryEntryInline': () => deps.toggleHistoryEntryInline(parseInt(param)),

            // Formatting
            'formatTaskText': () => deps.formatTaskText(param),
            'insertTaskHeading': () => deps.insertTaskHeading(param),
            'insertTaskDivider': () => deps.insertTaskDivider(),

            // Sorting & filtering
            'sortTable': () => deps.sortTable(param),
            'toggleSortMode': () => deps.toggleSortMode(),

            // Calendar
            'changeMonth': () => deps.animateCalendarMonthChange(parseInt(param)),
            'goToToday': () => deps.goToToday(),
            'showDayTasks': () => deps.showDayTasks(param),

            // Attachments & tags
            'addAttachment': () => deps.addAttachment(),
            'addFileAttachment': () => deps.addFileAttachment(event),
            'addTag': () => deps.addTag(),
            'removeTag': () => deps.removeTag(param),
            'addProjectTag': () => deps.addProjectTag(),
            'removeProjectTag': () => deps.removeProjectTag(param),
            'addProjectDetailsTag': () => deps.addProjectDetailsTag(param),
            'removeProjectDetailsTag': () => deps.removeProjectDetailsTag(param),
            'removeAttachment': () => { deps.removeAttachment(parseInt(param)); event.preventDefault(); },
            'openUrlAttachment': () => {
                if (!param) return;
                try {
                    const href = decodeURIComponent(param);
                    window.open(href, '_blank', 'noopener,noreferrer');
                } catch (e) {
                    console.error('Failed to open URL attachment:', e);
                }
            },
            'downloadFileAttachment': () => deps.downloadFileAttachment(param, param2, target.dataset.param3),
            'viewFile': () => deps.viewFile(param, param2, target.dataset.param3),
            'viewImageLegacy': () => deps.viewImageLegacy(param, param2),
            'viewFeedbackScreenshot': () => {
                if (!param) return;
                try {
                    const decoded = decodeURIComponent(param);
                    const src = decoded;
                    const title = 'Feedback Screenshot';
                    deps.viewImageLegacy(src, title);
                } catch (e) {
                    console.error('Failed to open feedback screenshot', e);
                    deps.showErrorNotification && deps.showErrorNotification(deps.t('error.openScreenshotFailed'));
                }
            },

            // Navigation
            'backToProjects': () => deps.backToProjects(),
            'showAllActivity': () => deps.showAllActivity(),
            'backToDashboard': () => deps.backToDashboard(),
            'backToCalendar': () => deps.backToCalendar(),
            'openUpdatesFromNotification': () => deps.openUpdatesFromNotification(),
            'openDueTodayFromNotification': () => deps.openDueTodayFromNotification(),

            // Other
            'dismissKanbanTip': () => deps.dismissKanbanTip(),
            'confirmDiscardChanges': () => deps.confirmDiscardChanges(),
            'closeReviewStatusConfirmModal': () => deps.closeReviewStatusConfirmModal(),
            'confirmDisableReviewStatus': () => deps.confirmDisableReviewStatus(),
            'closeCalendarCreateModal': () => deps.closeCalendarCreateModal(),
            'confirmCreateTask': () => deps.confirmCreateTask(),
            'addTaskFromDayItemsModal': () => deps.addTaskFromDayItemsModal(),
            'signOut': () => deps.signOut(),
            'exportDashboardData': () => deps.exportDashboardData(),
            'closeExportDataModal': () => deps.closeExportDataModal(),
            'confirmExportData': () => deps.confirmExportData(),
            'generateReport': () => deps.generateReport(),
            'showStatusInfoModal': () => {
                event.stopPropagation();
                document.getElementById('status-info-modal').classList.add('active');
            },

            // Special case: stopPropagation
            'stopPropagation': () => event.stopPropagation(),

            // Special case: close modal only if backdrop is clicked
            'closeModalOnBackdrop': () => {
                // target is the element with data-action (the modal backdrop)
                // event.target is the actual clicked element
                if (event.target === target) {
                    deps.closeModal(param);
                }
            },

            // Combined actions
            'closeDayItemsAndOpenTask': () => {
                deps.closeDayItemsModal();
                deps.openTaskDetails(parseInt(param));
            },
            'closeDayItemsAndShowProject': () => {
                deps.closeDayItemsModal();
                deps.showProjectDetails(parseInt(param), 'calendar', {
                    month: deps.getCurrentMonth(),
                    year: deps.getCurrentYear()
                });
            },
            'deleteFeedbackItemWithStop': () => {
                deps.deleteFeedbackItem(parseInt(param));
                event.stopPropagation();
            },
        };

        // Execute the action if it exists
        if (actions[action]) {
            actions[action]();
        } else {
            console.warn(`No handler found for action: ${action}`);
        }
    });
}
