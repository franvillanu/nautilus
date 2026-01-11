let projects = [];
let tasks = [];
let feedbackItems = [];
let feedbackIndex = [];
let currentFeedbackScreenshotData = "";
let feedbackPendingPage = 1;
let feedbackDonePage = 1;
const FEEDBACK_ITEMS_PER_PAGE = 10;
let projectCounter = 1;
let taskCounter = 1;
let feedbackCounter = 1;
let selectedCards = new Set();
let lastSelectedCardId = null;
let projectToDelete = null;
let tempAttachments = [];
let projectNavigationReferrer = 'projects'; // Track where user came from: 'dashboard', 'projects', or 'calendar'
let calendarNavigationState = null; // { month: number (0-11), year: number } when opening a project from Calendar
let previousPage = ''; // Track previous page for navigation logic (used by showPage)
const APP_VERSION = '2.7.1';
const APP_VERSION_LABEL = `v${APP_VERSION}`;

function clearSelectedCards() {
    selectedCards.clear();
    lastSelectedCardId = null;
    document.querySelectorAll(".task-card.selected").forEach((card) => {
        card.classList.remove("selected");
    });
}

// === Settings ===
let settings = {
    autoSetStartDateOnStatusChange: false, // Auto-set start date when status changes
    autoSetEndDateOnStatusChange: false,   // Auto-set end date when status changes
    enableReviewStatus: true, // Enable/disable "In Review" status column and filter
    calendarIncludeBacklog: false, // Show backlog tasks in calendar views
    historySortOrder: 'newest', // 'newest' (default) or 'oldest' first
    language: 'en', // UI language (default English)
    customWorkspaceLogo: null, // Data URL for custom workspace logo image
    notificationEmail: "", // Back-compat: UI field; authoritative email lives in user profile (auth)
    emailNotificationsEnabled: true,
    emailNotificationsWeekdaysOnly: false,
    emailNotificationsIncludeStartDates: false, // Also notify for start dates (tasks starting today)
    emailNotificationsIncludeBacklog: false, // Include tasks in backlog status in notifications
    emailNotificationTime: "09:00",
    emailNotificationTimeZone: "Atlantic/Canary"
};

const SUPPORTED_LANGUAGES = ['en', 'es'];
const I18N_LOCALES = {
    en: 'en-US',
    es: 'es-ES'
};

const I18N = {
    en: {
        'boot.loading': 'Loading Nautilus',
        'lock.welcome': 'Welcome back',
        'lock.subtitle': 'Enter the access password to continue.',
        'lock.sessionHint': '? Session stays signed-in for 24 hours.',
        'lock.passwordLabel': 'Password',
        'lock.passwordPlaceholder': 'Enter password',
        'lock.unlock': 'Unlock',
        'auth.backToUserLogin': 'Back to User Login',
        'auth.login.title': 'Welcome to Nautilus',
        'auth.login.subtitle': 'Login to access your workspace',
        'auth.login.identifierLabel': 'Username or Email',
        'auth.login.identifierPlaceholder': 'Enter username or email',
        'auth.login.pinLabel': 'PIN (4 digits)',
        'auth.admin.title': 'Admin Access',
        'auth.admin.subtitle': 'Enter master PIN to access admin dashboard',
        'auth.admin.pinLabel': 'Master PIN (4 digits)',
        'auth.setup.title': 'Complete Your Setup',
        'auth.setup.subtitle': 'Personalize your account',
        'auth.setup.usernameLabel': 'Username',
        'auth.setup.usernamePlaceholder': 'e.g., alex',
        'auth.setup.usernameHint': '3-20 characters, lowercase letters and numbers only',
        'auth.setup.displayNameLabel': 'Display Name',
        'auth.setup.displayNamePlaceholder': 'e.g., Alex Morgan',
        'auth.setup.emailLabel': 'Email',
        'auth.setup.emailPlaceholder': 'your.email@example.com',
        'auth.setup.emailHint': 'Required for notifications',
        'auth.setup.newPinLabel': 'New PIN (4 digits)',
        'auth.setup.confirmPinLabel': 'Confirm PIN',
        'auth.setup.next': 'Next',
        'auth.setup.submit': 'Complete Setup',
        'admin.title': 'User Management',
        'admin.signOut': 'Sign Out',
        'admin.usersTitle': 'Users',
        'admin.createUserTitle': 'Create New User',
        'admin.usernameLabel': 'Username',
        'admin.usernamePlaceholder': 'e.g., jdoe',
        'admin.usernameHint': '3-20 characters, lowercase letters and numbers only',
        'admin.displayNameLabel': 'Display Name',
        'admin.displayNamePlaceholder': 'e.g., John Doe',
        'admin.tempPinLabel': 'Temporary PIN (4 digits)',
        'admin.createUserButton': 'Create User',
        'auth.admin.resetPinPrompt': 'Enter new temporary PIN for {userName}:',
        'auth.admin.pinMustBe4Digits': 'PIN must be exactly 4 digits',
        'auth.admin.resetPinFailed': 'Failed to reset PIN',
        'auth.admin.resetPinSuccess': 'PIN reset for {userName}. New temp PIN: {pin}',
        'auth.admin.deleteUserConfirm': 'Are you sure you want to delete user \"{userName}\"? This will also delete all their tasks and projects.',
        'auth.admin.deleteUserFailed': 'Failed to delete user',
        'auth.admin.deleteUserSuccess': 'User \"{userName}\" deleted successfully',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.continue': 'Continue',
        'common.gotIt': 'Got it',
        'common.close': 'Close modal',
        'common.done': 'Done',
        'common.nautilusLogoAlt': 'Nautilus logo',
        'common.devBanner': '⚠️ LOCAL DEV - NOT PRODUCTION ⚠️',
        'common.datePlaceholder': 'dd/mm/yyyy',
        'crop.title': 'Crop Image to Square',
        'crop.instructions': 'Drag to adjust the crop area. The image will be cropped to a square.',
        'crop.apply': 'Crop & Apply',
        'crop.close': 'Close crop modal',
        'dashboard.insights.productivityTitle': 'Productivity Trend',
        'dashboard.insights.productivityDesc': 'Task completion rate increased 23% compared to last month',
        'dashboard.insights.deadlineTitle': 'Deadline Alert',
        'dashboard.insights.deadlineDesc': '3 milestones due within the next 7 days',
        'projects.title': 'Projects',
        'projects.subtitle': 'Manage your projects',
        'projects.searchPlaceholder': '\u{1F50D} Search projects (title or description)',
        'projects.filters.status': 'Status',
        'projects.filters.statusTitle': 'Project Status',
        'projects.status.planning': 'PLANNING',
        'projects.status.active': 'ACTIVE',
        'projects.status.completed': 'COMPLETED',
        'projects.filters.updated': 'Updated',
        'projects.filters.updatedTitle': 'Recently Updated',
        'projects.filters.all': 'All',
        'projects.filters.last5m': 'Last 5 minutes',
        'projects.filters.last30m': 'Last 30 minutes',
        'projects.filters.last24h': 'Last 24 hours',
        'projects.filters.lastWeek': 'Last week',
        'projects.filters.lastMonth': 'Last month',
        'projects.filters.hasTasks': 'Has tasks',
        'projects.filters.noTasks': 'No tasks',
        'projects.filters.tags': 'Tags',
        'projects.filters.tagsTitle': 'Project Tags',
        'projects.filters.clear': 'Clear Filters',
        'projects.noDescription': 'No description',
        'projects.tasksBreakdown': '{total} tasks · {done} done',
        'tasks.card.description': 'Description',
        'projects.card.tasksCount': '{count} tasks',
        'projects.card.percentDone': '{count}% done',
        'projects.sort.label': 'Sort: Status',
        'projects.sort.status': 'Status',
        'projects.sort.name': 'Name',
        'projects.sort.newest': 'Newest',
        'projects.sort.lastUpdated': 'Last Updated',
        'projects.sort.mostTasks': 'Most tasks',
        'projects.sort.percentCompleted': '% Completed',
        'projects.sort.prefix': 'Sort: {label}',
        'projects.sort.help': 'Click the same option again to switch Asc/Desc.',
        'projects.sort.statusLabel': 'Status',
        'projects.sort.nameLabel': 'Name',
        'projects.sort.newestLabel': 'Newest',
        'projects.sort.lastUpdatedLabel': 'Last Updated',
        'projects.sort.mostTasksLabel': 'Most tasks',
        'projects.sort.percentCompletedLabel': '% Completed',
        'projects.newProjectButton': '+ New Project',
        'projects.openDetailsTitle': 'View project details',
        'projects.empty.title': 'No projects yet',
        'projects.empty.subtitle': 'Create your first project',
        'projects.empty.searchTitle': 'No projects found',
        'projects.empty.searchSubtitle': 'Create a new project to get started',
        'projects.empty.filteredTitle': 'No projects matched',
        'projects.modal.createTitle': 'Create New Project',
        'projects.modal.nameLabel': 'Project Name',
        'projects.modal.descriptionLabel': 'Description',
        'projects.modal.startDateLabel': 'Start Date',
        'projects.modal.endDateLabel': 'End Date',
        'projects.modal.tagsLabel': 'Tags',
        'projects.modal.addTagPlaceholder': 'Add tag',
        'projects.modal.createButton': 'Create Project',
        'projects.delete.title': 'Delete Project',
        'projects.delete.body': 'This action cannot be undone. To confirm deletion, type delete below:',
        'projects.delete.deleteTasksLabel': 'Delete all tasks in this project',
        'projects.delete.deleteTasksHint': 'If unchecked, tasks will be unassigned from the project',
        'projects.delete.inputPlaceholder': 'Type delete here',
        'projects.delete.error': 'Type \"delete\" exactly to confirm',
        'projects.duplicate.title': 'Duplicate Project',
        'projects.duplicate.description': 'Create a copy of this project with all its settings.',
        'projects.duplicate.includeTasksLabel': 'Include all tasks from this project',
        'projects.duplicate.taskNamingTitle': 'Task naming:',
        'projects.duplicate.namingNone': 'Keep original names',
        'projects.duplicate.namingPrefix': 'Add prefix:',
        'projects.duplicate.namingSuffix': 'Add suffix:',
        'projects.duplicate.prefixPlaceholder': 'e.g., Copy - ',
        'projects.duplicate.suffixPlaceholder': 'e.g., (Copy)',
        'projects.duplicate.confirm': 'Duplicate Project',
        'projects.duplicate.success': 'Project "{name}" duplicated successfully',
        'projects.duplicate.successWithTasks': 'Project "{name}" and its tasks duplicated successfully',
        'projects.statusInfo.title': 'Project Status Logic',
        'projects.statusInfo.subtitle': 'Project status updates automatically based on task progress',
        'projects.statusInfo.planningTitle': '? Planning',
        'projects.statusInfo.planningDesc': 'All tasks are in \"Backlog\" or \"To Do\" status',
        'projects.statusInfo.activeTitle': '\u{2705} Active',
        'projects.statusInfo.activeDesc': 'At least one task is \"In Progress\" or \"In Review\"',
        'projects.statusInfo.completedTitle': '? Completed',
        'projects.statusInfo.completedDesc': 'All tasks are marked as \"Done\"',
        'projects.backTo.dashboard': '← Back to Dashboard',
        'projects.backTo.calendar': '← Back to Calendar',
        'projects.backTo.projects': '← Back to Projects',
        'projects.details.tab.details': 'Details',
        'projects.details.tab.history': 'History',
        'projects.details.startDate': 'Start Date',
        'projects.details.endDate': 'End Date',
        'projects.details.duration': 'Duration',
        'projects.details.durationDays': '{count} days',
        'projects.details.created': 'Created',
        'projects.details.calendarColor': 'Calendar Color',
        'projects.details.customColor': 'Custom color',
        'projects.details.progressOverview': 'Progress Overview',
        'projects.details.taskProgress': 'Task Progress',
        'projects.details.tasksTitle': 'Tasks ({count})',
        'projects.details.changeHistory': 'Change History',
        'projects.details.noChanges': 'No changes yet for this project',
        'projects.details.noTasksFound': 'No tasks found',
        'projects.details.viewTodo': 'View To Do tasks for this project',
        'projects.details.viewProgress': 'View In Progress tasks for this project',
        'projects.details.viewReview': 'View In Review tasks for this project',
        'projects.details.viewCompleted': 'View Completed tasks for this project',
        'projects.details.viewBacklog': 'View backlog tasks in List view',
        'projects.untitled': 'Untitled Project',
        'tasks.title': 'All Tasks',
        'tasks.subtitle': 'Manage tasks across all projects',
        'tasks.searchPlaceholder': '\u{1F50D} Search tasks (title or description)',
        'tasks.filters.status': 'Status',
        'tasks.filters.statusTitle': 'Status',
        'tasks.status.backlog': 'Backlog',
        'tasks.status.todo': 'To Do',
        'tasks.status.progress': 'In Progress',
        'tasks.status.review': 'In Review',
        'tasks.status.done': 'Done',
        'tasks.filters.tags': 'Tags',
        'tasks.filters.tagsTitle': 'Tags',
        'tasks.filters.priority': 'Priority',
        'tasks.filters.priorityTitle': 'Priority',
        'tasks.priority.high': 'High',
        'tasks.priority.medium': 'Medium',
        'tasks.priority.low': 'Low',
        'tasks.filters.project': 'Project',
        'tasks.filters.projectTitle': 'Project',
        'tasks.filters.selectAll': 'Select / Unselect All',
        'tasks.filters.date': 'Date',
        'tasks.filters.endDate': 'End Date',
        'tasks.filters.startDate': 'Start Date',
        'tasks.filters.dateTitle': 'Quick Date Filters',
        'tasks.filters.endDateTitle': 'End Date Filters',
        'tasks.filters.noDate': 'No End Date',
        'tasks.filters.overdue': 'Overdue',
        'tasks.filters.endToday': 'End Date Today',
        'tasks.filters.endTomorrow': 'End Date Tomorrow',
        'tasks.filters.end7Days': 'End Date in 7 Days',
        'tasks.filters.endThisWeek': 'End Date This Week',
        'tasks.filters.endThisMonth': 'End Date This Month',
        'tasks.filters.startDateTitle': 'Start Date Filters',
        'tasks.filters.noStartDate': 'No Start Date',
        'tasks.filters.alreadyStarted': 'Already Started',
        'tasks.filters.startToday': 'Start Date Today',
        'tasks.filters.startTomorrow': 'Start Date Tomorrow',
        'tasks.filters.start7Days': 'Start Date in 7 Days',
        'tasks.filters.startThisWeek': 'Start Date This Week',
        'tasks.filters.startThisMonth': 'Start Date This Month',
        'tasks.filters.updated': 'Updated',
        'tasks.filters.updatedTitle': 'Recently Updated',
        'tasks.filters.dateFrom': 'Start date',
        'tasks.filters.dateTo': 'End date',
        'tasks.filters.clear': 'Clear Filters',
        'filters.noOtherProjects': 'No other projects',
        'filters.noTags': 'No Tags',
        'filters.noOtherTags': 'No other tags',
        'filters.sheet.title': 'Options',
        'filters.chip.search': 'Search',
        'filters.chip.project': 'Project',
        'filters.chip.tag': 'Tag',
        'filters.chip.date': 'Date',
        'filters.chip.updated': 'Updated',
        'filters.chip.removeAria': 'Remove {label} filter',
        'filters.dateRange.from': 'From',
        'filters.dateRange.until': 'Until',
        'filters.updated.week': 'Week',
        'filters.updated.month': 'Month',
        'tasks.kanban.tipLabel': 'Tip:',
        'tasks.kanban.tipTextBefore': 'In the Kanban Board hold ',
        'tasks.kanban.tipTextAfter': ' (Cmd on Mac) and click to select multiple tasks. Shift-click selects a range, then drag to move them together',
        'tasks.view.kanban': 'Kanban',
        'tasks.view.list': 'List',
        'tasks.view.calendar': 'Calendar',
        'tasks.sort.label': 'Sort: Priority',
        'tasks.sort.orderByPriority': 'Order by Priority',
        'tasks.kanban.showBacklog': 'Show Backlog',
        'tasks.kanban.showProjects': 'Show Projects',
        'tasks.kanban.showNoDate': 'Show \"No Date\"',
        'tasks.addButton': '+ Add Task',
        'tasks.noProject': 'No Project',
        'tasks.projectIndicatorNone': 'No Project - ',
        'tasks.project.selectPlaceholder': 'Select a project',
        'tasks.tags.none': 'No tags',
        'tasks.checklist.toggle': 'Toggle checkbox',
        'tasks.untitled': 'Untitled task',
        'tasks.startDatePrefix': 'Start Date: ',
        'tasks.endDatePrefix': 'End Date: ',
        'tasks.noDate': 'No date',
        'tasks.noDatesSet': 'No dates set',
        'tasks.noEndDate': 'No End Date',
        'tasks.due.yesterday': 'Yesterday',
        'tasks.due.daysOverdue': '{count} days overdue',
        'tasks.due.tomorrow': 'Tomorrow',
        'tasks.openTaskDetails': 'Open task details',
        'tasks.noTasksInProject': 'No tasks in this project',
        'tasks.attachments.open': 'Open',
        'tasks.attachments.none': 'No attachments',
        'tasks.attachments.remove': 'Remove attachment',
        'tasks.attachments.removeTitle': 'Remove',
        'tasks.attachments.removeLink': 'Remove link',
        'tasks.attachments.googleDoc': 'Google Doc',
        'tasks.attachments.googleSheet': 'Google Sheet',
        'tasks.attachments.googleSlides': 'Google Slides',
        'tasks.attachments.googleDriveFile': 'Google Drive File',
        'tasks.attachments.pdf': 'PDF Document',
        'tasks.attachments.word': 'Word Document',
        'tasks.attachments.excel': 'Excel File',
        'tasks.attachments.powerpoint': 'PowerPoint',
        'tasks.empty.epic': 'No tasks yet. Create your first task for this epic.',
        'tasks.backlogQuickTitle': 'Open Backlog tasks in List view',
        'tasks.backlogQuickLabel': 'Backlog',
        'tasks.kanban.columnBacklog': '\u{1F9CA} Backlog',
        'tasks.kanban.columnTodo': '\u{1F4CB} To Do',
        'tasks.kanban.columnProgress': '\u{1F504} In Progress',
        'tasks.kanban.columnReview': '\u{2611}\u{FE0F} In Review',
        'tasks.kanban.columnDone': '\u{2705} Done',
        'tasks.table.task': 'Task',
        'tasks.table.priority': 'Priority',
        'tasks.table.status': 'Status',
        'tasks.table.tags': 'Tags',
        'tasks.table.project': 'Project',
        'tasks.table.startDate': 'Start Date',
        'tasks.table.endDate': 'End Date',
        'tasks.table.updated': 'Updated',
        'tasks.list.count': '{count} results',
        'tasks.modal.editTitle': 'Edit Task',
        'tasks.modal.duplicate': '📄 Duplicate Task',
        'tasks.modal.delete': '🗑️ Delete Task',
        'tasks.modal.tab.general': 'General',
        'tasks.modal.tab.details': 'Details',
        'tasks.modal.tab.history': 'History',
        'tasks.modal.titleLabel': 'Task Title',
        'tasks.modal.attachmentsLabel': 'Attachments',
        'tasks.modal.attachmentsSupported': 'Supported: Images (10MB), PDFs (20MB), Documents (10MB)',
        'tasks.modal.attachmentsDropzoneDefault': 'Drag & drop or click to attach file',
        'tasks.modal.attachmentsDropzoneTap': 'Click to attach file',
        'tasks.modal.linksLabel': 'Links',
        'tasks.modal.attachmentNamePlaceholder': 'Name (optional)',
        'tasks.modal.attachmentUrlPlaceholder': 'URL',
        'tasks.modal.addLink': 'Add Link',
        'tasks.modal.statusLabel': 'Status',
        'tasks.modal.priorityLabel': 'Priority',
        'tasks.modal.tagsLabel': 'Tags',
        'tasks.modal.addTagPlaceholder': 'Add tag',
        'tasks.modal.projectLabel': 'Project',
        'tasks.modal.projectOpenTitle': 'Open project details',
        'tasks.modal.projectSelect': 'Select a project',
        'tasks.modal.submitCreate': 'Create Task',
        'tasks.modal.listBulleted': '• List',
        'tasks.modal.listNumbered': '1. List',
        'tasks.modal.insertDivider': 'Insert horizontal divider',
        'tasks.modal.insertCheckbox': 'Insert checkbox',
        'tasks.history.emptyTitle': 'No Changes Yet',
        'tasks.history.emptySubtitle': 'Changes to this task will appear here',
        'calendar.title': 'Calendar',
        'calendar.today': 'Today',
        'calendar.prevMonth': 'Previous month',
        'calendar.nextMonth': 'Next month',
        'calendar.dayItemsTitle': 'Items for {date}',
        'calendar.dayItemsProjects': 'Projects',
        'calendar.dayItemsTasks': 'Tasks',
        'calendar.dayItems.close': 'Close day items',
        'feedback.title': 'Feedback & Issues',
        'feedback.subtitle': 'Report bugs and suggest features',
        'feedback.saveStatus.saved': 'Saved',
        'feedback.saveStatus.saving': 'Saving...',
        'feedback.saveStatus.error': 'Save failed',
        'feedback.saveStatus.offline': 'Offline',
        'feedback.type.bugLabel': '\u{1F41E} Bug',
        'feedback.type.title': 'Feedback Type',
        'feedback.type.bugOption': '\u{1F41E} Bug',
        'feedback.type.improvementOption': '\u{1F4A1} Improvement',
        'feedback.descriptionPlaceholder': 'Describe the issue or idea. You can paste an image directly into this field.',
        'feedback.descriptionPlaceholderShort': 'Describe the issue or idea.',
        'feedback.screenshotAttachTitle': 'Attach screenshot from device',
        'feedback.screenshotDropzoneTap': '\u{1F4F7} Tap to attach screenshot',
        'feedback.screenshotDropzoneDefault': '\u{1F4F7} Drag & drop or click to attach screenshot',
        'feedback.screenshotPreviewTitle': 'Screenshot attached',
        'feedback.screenshotPreviewSubtitle': 'Will be saved with this feedback',
        'feedback.screenshotRemove': 'Remove',
        'feedback.screenshotPreviewAlt': 'Feedback screenshot preview',
        'feedback.viewScreenshotTitle': 'View screenshot',
        'feedback.pagination.first': 'First page',
        'feedback.pagination.prev': 'Previous page',
        'feedback.pagination.next': 'Next page',
        'feedback.pagination.last': 'Last page',
        'feedback.pagination.showing': 'Showing {start}-{end} of {total}',
        'feedback.pagination.pageOf': 'Page {current} of {total}',
        'feedback.addButton': 'Add',
        'feedback.pendingTitle': '? Pending',
        'feedback.doneTitle': '? Done',
        'feedback.delete.title': 'Delete Feedback',
        'feedback.delete.body': 'Are you sure you want to delete this feedback?',
        'feedback.empty.pending': 'No pending feedback',
        'feedback.empty.done': 'No completed feedback',
        'export.title': 'Export Data',
        'export.body': 'This will download a complete backup of all your tasks, projects, and settings as a JSON file. Are you sure you want to export your data?',
        'export.confirm': 'Export',
        'confirm.deleteTask.title': 'Delete Task',
        'confirm.deleteTask.body': 'This action cannot be undone. To confirm deletion, type delete below:',
        'confirm.deleteTask.inputPlaceholder': 'Type delete here',
        'confirm.deleteTask.error': 'Type \"delete\" exactly to confirm',
        'confirm.unsaved.title': 'Unsaved Changes',
        'confirm.unsaved.body': 'You have unsaved changes. Are you sure you want to close and lose them?',
        'confirm.unsaved.discard': 'Discard Changes',
        'confirm.review.title': 'Disable \"In Review\" Status',
        'error.saveDataFailed': 'Failed to save data. Please try again.',
        'error.saveProjectsFailed': 'Failed to save projects. Please try again.',
        'error.saveTasksFailed': 'Failed to save tasks. Please try again.',
        'error.saveFeedbackFailed': 'Failed to save feedback. Please try again.',
        'error.saveProjectColorsFailed': 'Failed to save project colors.',
        'error.saveTaskFailed': 'Failed to save task. Please try again.',
        'error.saveChangesFailed': 'Failed to save changes. Please try again.',
        'error.saveTaskPositionFailed': 'Failed to save task position. Please try again.',
        'error.saveProjectFailed': 'Failed to save project. Please try again.',
        'error.notLoggedInResetPin': 'You must be logged in to reset your PIN',
        'error.resetPinFailed': 'Failed to reset PIN',
        'success.resetPin': 'PIN reset successfully! You will need to re-login with your new PIN.',
        'error.resetPinError': 'An error occurred while resetting your PIN',
        'error.userNameEmpty': 'User name cannot be empty.',
        'error.saveDisplayNameFailed': 'Could not save display name. Please try again.',
        'error.invalidEmail': 'Please enter a valid email address.',
        'error.saveEmailFailed': 'Could not save email. Please try again.',
        'error.saveAvatarFailed': 'Could not save avatar. Please try again.',
        'success.settingsSaved': 'Settings saved successfully!',
        'error.logoSelectFile': 'Please select an image file for the workspace logo.',
        'error.logoTooLarge': 'Please use an image smaller than 2MB for the workspace logo.',
        'error.imageReadFailed': 'Could not read the selected image.',
        'error.imageLoadFailed': 'Could not load the selected image.',
        'error.logoUploadFailed': 'Error uploading logo: {message}',
        'error.cropInvalid': 'Error: Crop state is invalid.',
        'error.cropTooLarge': 'Cropped image is too large. Please select a smaller area or use a smaller source image.',
        'success.cropApplied': 'Image cropped and applied successfully!',
        'success.logoCroppedApplied': 'Workspace logo cropped and applied successfully!',
        'error.cropFailed': 'Error cropping image: {message}',
        'error.avatarSelectFile': 'Please select an image file for your avatar.',
        'error.avatarTooLarge': 'Please use an image smaller than 2MB for your avatar.',
        'error.avatarUploadFailed': 'Failed to upload avatar. Please try again.',
        'error.endDateBeforeStart': 'End date cannot be before start date',
        'error.startDateAfterEnd': 'Start date cannot be after end date',
        'error.feedbackAttachImage': 'Please attach an image file.',
        'error.feedbackReadImage': 'Could not read the image file. Please try again.',
        'error.feedbackStatusFailed': 'Failed to update feedback status. Please try again.',
        'error.attachmentSaveFailed': 'Failed to save attachment. Please try again.',
        'error.attachmentLoadFailed': 'Failed to load image: {message}',
        'success.fileDownloaded': 'File downloaded!',
        'error.fileDownloadFailed': 'Failed to download file: {message}',
        'success.attachmentDeletedFromStorage': '{name} deleted from storage',
        'error.fileDeleteFailed': 'Failed to delete file from storage',
        'success.attachmentRemoved': 'Attachment removed',
        'error.fileSizeTooLarge': 'File size must be less than {maxMB}MB. Please choose a smaller file.',
        'success.fileUploaded': 'File uploaded successfully!',
        'error.fileUploadFailed': 'Error uploading file: {message}',
        'error.selectFile': 'Please select a file',
        'error.saveTagFailed': 'Failed to save tag. Please try again.',
        'error.removeTagFailed': 'Failed to remove tag. Please try again.',
        'error.openScreenshotFailed': 'Could not open screenshot',
        'history.sort.newest': '↑ Newest First',
        'history.sort.oldest': '↓ Oldest First',
        'history.field.title': 'Title',
        'history.field.name': 'Name',
        'history.field.description': 'Description',
        'history.field.status': 'Status',
        'history.field.priority': 'Priority',
        'history.field.category': 'Category',
        'history.field.startDate': 'Start Date',
        'history.field.endDate': 'End Date',
        'history.field.link': 'Link',
        'history.field.task': 'Link',
        'history.field.projectId': 'Project',
        'history.field.tags': 'Tags',
        'history.field.attachments': 'Attachments',
        'history.action.created': 'Created',
        'history.action.deleted': 'Deleted',
        'history.link.added': 'Added',
        'history.link.removed': 'Removed',
        'history.entity.task': 'task',
        'history.value.empty': 'empty',
        'history.value.none': 'none',
        'history.change.beforeLabel': 'Before:',
        'history.change.afterLabel': 'After:',
        'history.change.notSet': 'Not set',
        'history.change.removed': 'Removed',
        'history.tags.none': 'No tags',
        'history.attachments.none': 'No attachments',
        'history.attachments.countSingle': '{count} file',
        'history.attachments.countPlural': '{count} files',
        'history.project.fallback': 'Project #{id}',
        'history.change.arrow': '→',
        'menu.openMenu': 'Open menu',
        'menu.language': 'Language',
        'menu.darkMode': 'Dark mode',
        'menu.lightMode': 'Light mode',
        'menu.settings': 'Settings',
        'menu.help': 'Help',
        'menu.signOut': 'Sign out',
        'nav.overview': 'Overview',
        'nav.dashboard': 'Dashboard',
        'nav.updates': 'Release notes',
        'nav.calendar': 'Calendar',
        'nav.work': 'Work',
        'nav.projects': 'Projects',
        'nav.allTasks': 'All Tasks',
        'nav.feedback': 'Feedback',
        'updates.title': 'Release notes',
        'updates.subtitle': 'Latest change log for Nautilus',
        'updates.latestLabel': 'Latest release',
        'updates.historyLabel': 'Release log',
        'updates.sections.new': 'New',
        'updates.sections.improvements': 'Improvements',
        'updates.sections.fixes': 'Fixes',
        'updates.empty': 'No release notes yet.',
        'updates.sectionEmpty': 'Nothing listed yet.',
        'updates.historyEmpty': 'No previous releases yet.',
        'notifications.title': 'Notifications',
        'notifications.toggle': 'Notifications',
        'notifications.today': 'Today',
        'notifications.yesterday': 'Yesterday',
        'notifications.clearAll': 'Clear all',
        'notifications.releaseTitle': 'New release',
        'notifications.releaseCta': 'View updates',
        'notifications.releaseMeta': 'Released {date}',
        'notifications.dueTodayTitle': 'Due today',
        'notifications.dueTodayCta': 'View tasks',
        'notifications.dueTodayMetaOne': '{count} task due today',
        'notifications.dueTodayMetaMany': '{count} tasks due today',
        'notifications.dueTodayMore': 'and {count} more tasks',
        'notifications.empty': 'You are all caught up.',
        'settings.title': 'Settings',
        'settings.subtitle': 'Manage your preferences and application settings',
        'settings.section.profile': 'Profile',
        'settings.displayName': 'Display Name',
        'settings.displayNameHint': 'This name is displayed throughout the application',
        'settings.placeholder.displayName': 'Enter your display name',
        'settings.email': 'Email',
        'settings.emailHint': 'Used for your account and deadline notifications',
        'settings.placeholder.email': 'Enter your email',
        'settings.avatar': 'Avatar',
        'settings.avatarHint': 'Upload an image for your avatar (max 2MB). It will be displayed as a circle.',
        'settings.avatarRemoveTitle': 'Remove avatar',
        'settings.workspaceLogo': 'Workspace Logo',
        'settings.workspaceLogoHint': 'Upload a square image to replace the Nautilus logo (max 2MB).',
        'settings.workspaceLogoRemoveTitle': 'Remove custom logo',
        'settings.section.application': 'Application',
        'settings.enableReviewStatus': 'Enable In Review status',
        'settings.enableReviewStatusHint': 'Show or hide the IN REVIEW status column and filter option',
        'settings.enableReviewStatusHintPrefix': 'Show or hide the',
        'settings.enableReviewStatusHintSuffix': 'status column and filter option',
        'settings.calendarIncludeBacklog': 'Show backlog in calendar',
        'settings.calendarIncludeBacklogHint': 'Display backlog tasks in all calendar views',
        'settings.autoStartDate': 'Auto-set start date',
        'settings.autoStartDateHint': 'Automatically set Start Date when task status changes to "In Progress" (if empty)',
        'settings.autoEndDate': 'Auto-set end date',
        'settings.autoEndDateHint': 'Automatically set End Date when task status changes to "Done" (if empty)',
        'settings.historySortOrder': 'History Sort Order',
        'settings.historySortOrderHint': 'Default sort order for task and project history timelines',
        'settings.historySortNewest': 'Newest First',
        'settings.historySortOldest': 'Oldest First',
        'settings.language': 'Language',
        'settings.languageHint': 'Choose the application language',
        'settings.section.notifications': 'Notifications',
        'settings.emailNotifications': 'Email notifications',
        'settings.emailNotificationsHint': 'Enable or disable deadline reminder emails',
        'settings.weekdaysOnly': 'Weekdays only',
        'settings.weekdaysOnlyHint': 'Skip emails on Saturday and Sunday',
        'settings.includeStartDates': 'Notify when tasks start',
        'settings.includeStartDatesHint': 'Send reminders when a task starts (e.g., today)',
        'settings.includeBacklog': 'Include backlog tasks',
        'settings.includeBacklogHint': 'Include backlog tasks in email and in-app notifications',
        'settings.sendTime': 'Send time',
        'settings.sendTimeHint': 'Daily time to send reminders (08:00-18:00, 30-minute increments)',
        'settings.timeZone': 'Time zone',
        'settings.timeZoneHint': 'Keeps the same local time year-round (DST-aware)',
        'settings.timeZone.option.argentina': 'Argentina (Buenos Aires)',
        'settings.timeZone.option.canary': 'Canary Islands (Atlantic/Canary)',
        'settings.timeZone.option.spain': 'Spain mainland (Europe/Madrid)',
        'settings.timeZone.option.utc': 'UTC',
        'settings.section.security': 'Security',
        'settings.pinManagement': 'PIN Management',
        'settings.pinManagementHint': 'Reset your PIN to a new 4-digit code',
        'settings.resetPinButton': 'Reset PIN',
        'settings.section.dataManagement': 'Data Management',
        'settings.exportData': 'Export Data',
        'settings.exportDataHint': 'Download a complete backup of all your tasks, projects, and settings as a JSON file',
        'settings.exportButton': 'Export',
        'settings.cancelButton': 'Cancel',
        'settings.saveButton': 'Save Settings',
        'settings.avatarUploadDefault': 'Drag & drop or click to upload avatar',
        'settings.avatarUploadChange': 'Change avatar',
        'settings.avatarUploadAriaUpload': 'Upload avatar',
        'settings.avatarUploadAriaChange': 'Change avatar',
        'settings.logoUploadDefault': 'Drag & drop or click to upload logo',
        'settings.logoUploadChange': 'Change logo',
        'settings.logoUploadAriaUpload': 'Upload logo',
        'settings.logoUploadAriaChange': 'Change logo',
        'dashboard.title': 'Dashboard',
        'dashboard.hero.activeProjectsLabel': 'Active Projects',
        'dashboard.hero.completionRateLabel': 'Completion Rate',
        'dashboard.hero.projectsTrend': '📈 +2 this month',
        'dashboard.hero.completionTrend': '🎯 Target: 80%',
        'dashboard.projectAnalytics': '📊 Project Analytics',
        'dashboard.period.week': 'Week',
        'dashboard.period.month': 'Month',
        'dashboard.period.quarter': 'Quarter',
        'dashboard.stat.pendingTasks': 'Pending Tasks',
        'dashboard.stat.inProgress': 'In Progress',
        'dashboard.stat.highPriority': 'High Priority',
        'dashboard.stat.overdue': 'Overdue',
        'dashboard.stat.completed': 'Completed',
        'dashboard.stat.projects': 'Projects',
        'dashboard.highPriorityHint': 'High priority tasks due within 7 days (or overdue)',
        'dashboard.projectProgress': '🌊 Project Progress',
        'dashboard.legend.todo': 'To Do',
        'dashboard.legend.progress': 'In Progress',
        'dashboard.legend.review': 'In Review',
        'dashboard.legend.complete': 'Complete',
        'dashboard.viewAll': 'View All',
        'dashboard.quickActions': '⚡ Quick Actions',
        'dashboard.action.generateReport': 'Generate Report',
        'dashboard.action.addTask': 'Add Task',
        'dashboard.action.viewCalendar': 'View Calendar',
        'dashboard.action.newProject': 'New Project',
        'dashboard.recentActivity': '\u{1F504} Recent Activity',
        'dashboard.researchInsights': '🧠 Insights',
        'dashboard.activity.emptyTitle': 'Welcome to your Dashboard!',
        'dashboard.activity.emptySubtitle': 'Start creating projects and tasks to see activity',
        'dashboard.activity.completed': 'Completed "{title}" {projectPart}',
        'dashboard.activity.createdProject': 'Created new project "{project}"',
        'dashboard.activity.addedTask': 'Added new task "{title}" {projectPart}',
        'dashboard.activity.inProject': 'in {project}',
        'dashboard.activity.toProject': 'to {project}',
        'dashboard.activity.recently': 'Recently',
        'dashboard.activity.justNow': 'Just now',
        'dashboard.activity.today': 'Today',
        'dashboard.activity.yesterday': 'Yesterday',
        'dashboard.activity.daysAgoShort': '{count}d ago',
        'dashboard.activity.minuteAgo': '{count} minute ago',
        'dashboard.activity.minutesAgo': '{count} minutes ago',
        'dashboard.activity.hourAgo': '{count} hour ago',
        'dashboard.activity.hoursAgo': '{count} hours ago',
        'dashboard.activity.dayAgo': '{count} day ago',
        'dashboard.activity.daysAgo': '{count} days ago',
        'dashboard.trend.thisWeek': 'this week',
        'dashboard.trend.thisMonth': 'this month',
        'dashboard.trend.thisQuarter': 'this quarter',
        'dashboard.trend.dueTodayOne': '{count} due today',
        'dashboard.trend.dueTodayMany': '{count} due today',
        'dashboard.trend.onTrack': 'On track',
        'dashboard.trend.needsAttention': 'Needs attention',
        'dashboard.trend.allOnTrack': 'All on track',
        'dashboard.trend.criticalOne': '{count} critical',
        'dashboard.trend.criticalMany': '{count} critical',
        'dashboard.trend.completedOne': '{count} completed',
        'dashboard.trend.completedMany': '{count} completed',
        'dashboard.trend.inProgress': 'In progress',
        'dashboard.emptyProjects.title': 'No projects yet',
        'dashboard.emptyProjects.subtitle': 'Create your first project to see progress visualization',
        'dashboard.tasks': 'tasks',
        'dashboard.activity.allTitle': 'All Recent Activity',
        'dashboard.activity.allSubtitle': 'Full history of your recent work',
        'dashboard.activity.backToDashboard': '← Back to Dashboard',
        'dashboard.insights.excellentTitle': 'Excellent Progress',
        'dashboard.insights.excellentDesc': '{percent}% completion rate exceeds target. Great momentum!',
        'dashboard.insights.goodTitle': 'Good Progress',
        'dashboard.insights.goodDesc': '{percent}% completion rate is solid. Consider pushing to reach 80% target.',
        'dashboard.insights.opportunityTitle': 'Progress Opportunity',
        'dashboard.insights.opportunityDesc': '{percent}% completion rate. Focus on completing current tasks to build momentum.',
        'dashboard.insights.actionTitle': 'Action Needed',
        'dashboard.insights.actionDesc': '{percent}% completion rate is low. Break down large tasks and tackle smaller ones first.',
        'dashboard.insights.todayTitle': 'Today\'s Focus',
        'dashboard.insights.todayDescOne': '{count} task is due today. Prioritize it for maximum impact.',
        'dashboard.insights.todayDescMany': '{count} tasks are due today. Prioritize them for maximum impact.',
        'dashboard.insights.overdueTitle': 'Overdue Items',
        'dashboard.insights.overdueDescOne': '{count} overdue task needs attention. Address it to prevent delays.',
        'dashboard.insights.overdueDescMany': '{count} overdue tasks need attention. Address these to prevent delays.',
        'dashboard.insights.highPriorityTitle': 'High Priority Focus',
        'dashboard.insights.highPriorityDescOne': '{count} high-priority task needs immediate attention.',
        'dashboard.insights.highPriorityDescMany': '{count} high-priority tasks need immediate attention.',
        'dashboard.insights.emptyProjectsTitle': 'Empty Projects',
        'dashboard.insights.emptyProjectsDescOne': '{count} project has no tasks yet. Add tasks to track progress.',
        'dashboard.insights.emptyProjectsDescMany': '{count} projects have no tasks yet. Add tasks to track progress.',
        'dashboard.insights.momentumTitle': 'Strong Momentum',
        'dashboard.insights.momentumDescOne': '{count} task completed this week. You\'re in a productive flow!',
        'dashboard.insights.momentumDescMany': '{count} tasks completed this week. You\'re in a productive flow!',
        'dashboard.insights.readyTitle': 'Ready to Start',
        'dashboard.insights.readyDesc': 'Create your first project and add some tasks to begin tracking your progress.',
        'dashboard.insights.caughtUpTitle': 'All Caught Up',
        'dashboard.insights.caughtUpDesc': 'Great work! No urgent items detected. Consider planning your next milestones.'
    },
    es: {
        'boot.loading': 'Cargando Nautilus',
        'lock.welcome': 'Bienvenido de nuevo',
        'lock.subtitle': 'Ingresa la contraseña de acceso para continuar.',
        'lock.sessionHint': '? La sesión permanece iniciada por 24 horas.',
        'lock.passwordLabel': 'Contraseña',
        'lock.passwordPlaceholder': 'Ingresa la contraseña',
        'lock.unlock': 'Desbloquear',
        'auth.backToUserLogin': 'Volver al inicio de sesión',
        'auth.login.title': 'Bienvenido a Nautilus',
        'auth.login.subtitle': 'Inicia sesión para acceder a tu espacio',
        'auth.login.identifierLabel': 'Usuario o correo',
        'auth.login.identifierPlaceholder': 'Ingresa usuario o correo',
        'auth.login.pinLabel': 'PIN (4 dígitos)',
        'auth.admin.title': 'Acceso de administración',
        'auth.admin.subtitle': 'Ingresa el PIN maestro para acceder al panel de administración',
        'auth.admin.pinLabel': 'PIN maestro (4 dígitos)',
        'auth.setup.title': 'Completa tu configuración',
        'auth.setup.subtitle': 'Personaliza tu cuenta',
        'auth.setup.usernameLabel': 'Usuario',
        'auth.setup.usernamePlaceholder': 'p. ej., alex',
        'auth.setup.usernameHint': '3-20 caracteres, solo letras minúsculas y números',
        'auth.setup.displayNameLabel': 'Nombre visible',
        'auth.setup.displayNamePlaceholder': 'p. ej., Alex Morgan',
        'auth.setup.emailLabel': 'Correo electrónico',
        'auth.setup.emailPlaceholder': 'tu.correo@ejemplo.com',
        'auth.setup.emailHint': 'Necesario para notificaciones',
        'auth.setup.newPinLabel': 'Nuevo PIN (4 dígitos)',
        'auth.setup.confirmPinLabel': 'Confirmar PIN',
        'auth.setup.next': 'Siguiente',
        'auth.setup.submit': 'Completar configuración',
        'admin.title': 'Gestión de usuarios',
        'admin.signOut': 'Cerrar sesión',
        'admin.usersTitle': 'Usuarios',
        'admin.createUserTitle': 'Crear nuevo usuario',
        'admin.usernameLabel': 'Usuario',
        'admin.usernamePlaceholder': 'p. ej., jdoe',
        'admin.usernameHint': '3-20 caracteres, solo letras minúsculas y números',
        'admin.displayNameLabel': 'Nombre visible',
        'admin.displayNamePlaceholder': 'p. ej., John Doe',
        'admin.tempPinLabel': 'PIN temporal (4 dígitos)',
        'admin.createUserButton': 'Crear usuario',
        'auth.admin.resetPinPrompt': 'Ingresa un nuevo PIN temporal para {userName}:',
        'auth.admin.pinMustBe4Digits': 'El PIN debe tener exactamente 4 dígitos',
        'auth.admin.resetPinFailed': 'No se pudo restablecer el PIN',
        'auth.admin.resetPinSuccess': 'PIN restablecido para {userName}. Nuevo PIN temporal: {pin}',
        'auth.admin.deleteUserConfirm': '¿Seguro que deseas eliminar al usuario \"{userName}\"? Esto también eliminará todas sus tareas y proyectos.',
        'auth.admin.deleteUserFailed': 'No se pudo eliminar el usuario',
        'auth.admin.deleteUserSuccess': 'Usuario \"{userName}\" eliminado correctamente',
        'common.cancel': 'Cancelar',
        'common.delete': 'Eliminar',
        'common.continue': 'Continuar',
        'common.gotIt': 'Entendido',
        'common.close': 'Cerrar modal',
        'common.done': 'Listo',
        'common.nautilusLogoAlt': 'Logo de Nautilus',
        'common.devBanner': '⚠️ DESARROLLO LOCAL - NO PRODUCCIÓN ⚠️',
        'common.datePlaceholder': 'dd/mm/yyyy',
        'crop.title': 'Recortar imagen a cuadrado',
        'crop.instructions': 'Arrastra para ajustar el área de recorte. La imagen se recortará a un cuadrado.',
        'crop.apply': 'Recortar y aplicar',
        'crop.close': 'Cerrar recorte',
        'dashboard.insights.productivityTitle': 'Tendencia de productividad',
        'dashboard.insights.productivityDesc': 'La tasa de finalización de tareas aumentó un 23% respecto al mes pasado',
        'dashboard.insights.deadlineTitle': 'Alerta de plazos',
        'dashboard.insights.deadlineDesc': '3 hitos vencen en los próximos 7 días',
        'projects.title': 'Proyectos',
        'projects.subtitle': 'Gestiona tus proyectos',
        'projects.searchPlaceholder': '\u{1F50D} Buscar proyectos (título o descripción)',
        'projects.filters.status': 'Estado',
        'projects.filters.statusTitle': 'Estado del proyecto',
        'projects.status.planning': 'PLANIFICACIÓN',
        'projects.status.active': 'ACTIVO',
        'projects.status.completed': 'COMPLETADO',
        'projects.filters.updated': 'Actualizado',
        'projects.filters.updatedTitle': 'Actualizados recientemente',
        'projects.filters.all': 'Todos',
        'projects.filters.last5m': 'Últimos 5 minutos',
        'projects.filters.last30m': 'Últimos 30 minutos',
        'projects.filters.last24h': 'Últimas 24 horas',
        'projects.filters.lastWeek': 'Última semana',
        'projects.filters.lastMonth': 'Último mes',
        'projects.filters.hasTasks': 'Con tareas',
        'projects.filters.noTasks': 'Sin tareas',
        'projects.filters.tags': 'Etiquetas',
        'projects.filters.tagsTitle': 'Etiquetas de proyectos',
        'projects.filters.clear': 'Limpiar filtros',
        'projects.noDescription': 'Sin descripcion',
        'projects.tasksBreakdown': '{total} tareas · {done} hechas',
        'tasks.card.description': 'Descripcion',
        'projects.card.tasksCount': '{count} tareas',
        'projects.card.percentDone': '{count}% hecho',
        'projects.sort.label': 'Ordenar: Estado',
        'projects.sort.status': 'Estado',
        'projects.sort.name': 'Nombre',
        'projects.sort.newest': 'Más reciente',
        'projects.sort.lastUpdated': 'Última actualización',
        'projects.sort.mostTasks': 'Más tareas',
        'projects.sort.percentCompleted': '% completado',
        'projects.sort.prefix': 'Ordenar: {label}',
        'projects.sort.help': 'Repite la misma opción para alternar Asc/Desc.',
        'projects.sort.statusLabel': 'Estado',
        'projects.sort.nameLabel': 'Nombre',
        'projects.sort.newestLabel': 'Más reciente',
        'projects.sort.lastUpdatedLabel': 'Última actualización',
        'projects.sort.mostTasksLabel': 'Más tareas',
        'projects.sort.percentCompletedLabel': '% completado',
        'projects.newProjectButton': '+ Nuevo proyecto',
        'projects.openDetailsTitle': 'Ver detalles del proyecto',
        'projects.empty.title': 'Aún no hay proyectos',
        'projects.empty.subtitle': 'Crea tu primer proyecto',
        'projects.empty.searchTitle': 'No se encontraron proyectos',
        'projects.empty.searchSubtitle': 'Crea un nuevo proyecto para empezar',
        'projects.empty.filteredTitle': 'No hubo coincidencias de proyectos',
        'projects.modal.createTitle': 'Crear nuevo proyecto',
        'projects.modal.nameLabel': 'Nombre del proyecto',
        'projects.modal.descriptionLabel': 'Descripción',
        'projects.modal.startDateLabel': 'Fecha de inicio',
        'projects.modal.endDateLabel': 'Fecha de fin',
        'projects.modal.tagsLabel': 'Etiquetas',
        'projects.modal.addTagPlaceholder': 'Añadir etiqueta',
        'projects.modal.createButton': 'Crear proyecto',
        'projects.delete.title': 'Eliminar proyecto',
        'projects.delete.body': 'Esta acción no se puede deshacer. Para confirmar, escribe delete abajo:',
        'projects.delete.deleteTasksLabel': 'Eliminar todas las tareas de este proyecto',
        'projects.delete.deleteTasksHint': 'Si no se marca, las tareas se desasignarán del proyecto',
        'projects.delete.inputPlaceholder': 'Escribe delete aquí',
        'projects.delete.error': 'Escribe \"delete\" exactamente para confirmar',
        'projects.duplicate.title': 'Duplicar proyecto',
        'projects.duplicate.description': 'Crear una copia de este proyecto con toda su configuración.',
        'projects.duplicate.includeTasksLabel': 'Incluir todas las tareas de este proyecto',
        'projects.duplicate.taskNamingTitle': 'Nomenclatura de tareas:',
        'projects.duplicate.namingNone': 'Mantener nombres originales',
        'projects.duplicate.namingPrefix': 'Agregar prefijo:',
        'projects.duplicate.namingSuffix': 'Agregar sufijo:',
        'projects.duplicate.prefixPlaceholder': 'ej., Copia - ',
        'projects.duplicate.suffixPlaceholder': 'ej., (Copia)',
        'projects.duplicate.confirm': 'Duplicar proyecto',
        'projects.duplicate.success': 'Proyecto "{name}" duplicado exitosamente',
        'projects.duplicate.successWithTasks': 'Proyecto "{name}" y sus tareas duplicados exitosamente',
        'projects.statusInfo.title': 'Lógica del estado del proyecto',
        'projects.statusInfo.subtitle': 'El estado del proyecto se actualiza automáticamente según el progreso de las tareas',
        'projects.statusInfo.planningTitle': '? Planificación',
        'projects.statusInfo.planningDesc': 'Todas las tareas están en \"Backlog\" o \"Por hacer\"',
        'projects.statusInfo.activeTitle': '\u{2705} Activo',
        'projects.statusInfo.activeDesc': 'Al menos una tarea está en \"En progreso\" o \"En revisión\"',
        'projects.statusInfo.completedTitle': '? Completado',
        'projects.statusInfo.completedDesc': 'Todas las tareas están marcadas como \"Hecho\"',
        'projects.backTo.dashboard': '← Volver al panel',
        'projects.backTo.calendar': '← Volver al calendario',
        'projects.backTo.projects': '← Volver a proyectos',
        'projects.details.tab.details': 'Detalles',
        'projects.details.tab.history': 'Historial',
        'projects.details.startDate': 'Fecha de inicio',
        'projects.details.endDate': 'Fecha de fin',
        'projects.details.duration': 'Duración',
        'projects.details.durationDays': '{count} días',
        'projects.details.created': 'Creado',
        'projects.details.calendarColor': 'Color del calendario',
        'projects.details.customColor': 'Color personalizado',
        'projects.details.progressOverview': 'Resumen de progreso',
        'projects.details.taskProgress': 'Progreso de tareas',
        'projects.details.tasksTitle': 'Tareas ({count})',
        'projects.details.changeHistory': 'Historial de cambios',
        'projects.details.noChanges': 'Aún no hay cambios para este proyecto',
        'projects.details.noTasksFound': 'No se encontraron tareas',
        'projects.details.viewTodo': 'Ver tareas Por hacer de este proyecto',
        'projects.details.viewProgress': 'Ver tareas En progreso de este proyecto',
        'projects.details.viewReview': 'Ver tareas En revisión de este proyecto',
        'projects.details.viewCompleted': 'Ver tareas Completadas de este proyecto',
        'projects.details.viewBacklog': 'Ver tareas de backlog en vista de lista',
        'projects.untitled': 'Proyecto sin título',
        'tasks.title': 'Todas las tareas',
        'tasks.subtitle': 'Gestiona tareas de todos los proyectos',
        'tasks.searchPlaceholder': '\u{1F50D} Buscar tareas (título o descripción)',
        'tasks.filters.status': 'Estado',
        'tasks.filters.statusTitle': 'Estado',
        'tasks.status.backlog': 'Backlog',
        'tasks.status.todo': 'Por hacer',
        'tasks.status.progress': 'En progreso',
        'tasks.status.review': 'En revisión',
        'tasks.status.done': 'Hecho',
        'tasks.filters.tags': 'Etiquetas',
        'tasks.filters.tagsTitle': 'Etiquetas',
        'tasks.filters.priority': 'Prioridad',
        'tasks.filters.priorityTitle': 'Prioridad',
        'tasks.priority.high': 'Alta',
        'tasks.priority.medium': 'Media',
        'tasks.priority.low': 'Baja',
        'tasks.filters.project': 'Proyecto',
        'tasks.filters.projectTitle': 'Proyecto',
        'tasks.filters.selectAll': 'Seleccionar / deseleccionar todo',
        'tasks.filters.date': 'Fecha',
        'tasks.filters.endDate': 'Fecha de Fin',
        'tasks.filters.startDate': 'Fecha de Inicio',
        'tasks.filters.dateTitle': 'Filtros rápidos por fecha',
        'tasks.filters.endDateTitle': 'Filtros de Fecha de Fin',
        'tasks.filters.noDate': 'Sin fecha de fin',
        'tasks.filters.overdue': 'Vencidas',
        'tasks.filters.endToday': 'Fecha de fin hoy',
        'tasks.filters.endTomorrow': 'Fecha de fin mañana',
        'tasks.filters.end7Days': 'Fecha de fin en 7 días',
        'tasks.filters.endThisWeek': 'Fecha de fin esta semana',
        'tasks.filters.endThisMonth': 'Fecha de fin este mes',
        'tasks.filters.startDateTitle': 'Filtros de Fecha de Inicio',
        'tasks.filters.noStartDate': 'Sin fecha de inicio',
        'tasks.filters.alreadyStarted': 'Ya comenzó',
        'tasks.filters.startToday': 'Fecha de inicio hoy',
        'tasks.filters.startTomorrow': 'Fecha de inicio mañana',
        'tasks.filters.start7Days': 'Fecha de inicio en 7 días',
        'tasks.filters.startThisWeek': 'Fecha de inicio esta semana',
        'tasks.filters.startThisMonth': 'Fecha de inicio este mes',
        'tasks.filters.updated': 'Actualizado',
        'tasks.filters.updatedTitle': 'Actualizados recientemente',
        'tasks.filters.dateFrom': 'Fecha de inicio',
        'tasks.filters.dateTo': 'Fecha de fin',
        'tasks.filters.clear': 'Limpiar filtros',
        'filters.noOtherProjects': 'No hay otros proyectos',
        'filters.noTags': 'Sin etiquetas',
        'filters.noOtherTags': 'No hay otras etiquetas',
        'filters.sheet.title': 'Opciones',
        'filters.chip.search': 'Búsqueda',
        'filters.chip.project': 'Proyecto',
        'filters.chip.tag': 'Etiqueta',
        'filters.chip.date': 'Fecha',
        'filters.chip.updated': 'Actualizado',
        'filters.chip.removeAria': 'Quitar filtro {label}',
        'filters.dateRange.from': 'Desde',
        'filters.dateRange.until': 'Hasta',
        'filters.updated.week': 'Semana',
        'filters.updated.month': 'Mes',
        'tasks.kanban.tipLabel': 'Consejo:',
        'tasks.kanban.tipTextBefore': 'En el tablero Kanban manten ',
        'tasks.kanban.tipTextAfter': ' (Cmd en Mac) y haz clic para seleccionar varias tareas. Shift + clic selecciona un rango, luego arrastra para moverlas juntas',
        'tasks.view.kanban': 'Kanban',
        'tasks.view.list': 'Lista',
        'tasks.view.calendar': 'Calendario',
        'tasks.sort.label': 'Ordenar: Prioridad',
        'tasks.sort.orderByPriority': 'Ordenar por prioridad',
        'tasks.kanban.showBacklog': 'Mostrar backlog',
        'tasks.kanban.showProjects': 'Mostrar proyectos',
        'tasks.kanban.showNoDate': 'Mostrar \"Sin fecha\"',
        'tasks.addButton': '+ Añadir tarea',
        'tasks.noProject': 'Sin proyecto',
        'tasks.projectIndicatorNone': 'Sin proyecto - ',
        'tasks.project.selectPlaceholder': 'Selecciona un proyecto',
        'tasks.tags.none': 'Sin etiquetas',
        'tasks.checklist.toggle': 'Alternar casilla',
        'tasks.untitled': 'Tarea sin título',
        'tasks.startDatePrefix': 'Fecha de inicio: ',
        'tasks.endDatePrefix': 'Fecha de fin: ',
        'tasks.noDate': 'Sin fecha',
        'tasks.noDatesSet': 'Sin fechas',
        'tasks.noEndDate': 'Sin fecha de fin',
        'tasks.due.yesterday': 'Ayer',
        'tasks.due.daysOverdue': '{count} días de atraso',
        'tasks.due.tomorrow': 'Mañana',
        'tasks.openTaskDetails': 'Abrir detalles de la tarea',
        'tasks.noTasksInProject': 'No hay tareas en este proyecto',
        'tasks.attachments.open': 'Abrir',
        'tasks.attachments.none': 'Sin archivos adjuntos',
        'tasks.attachments.remove': 'Quitar archivo adjunto',
        'tasks.attachments.removeTitle': 'Quitar',
        'tasks.attachments.removeLink': 'Quitar enlace',
        'tasks.attachments.googleDoc': 'Documento de Google',
        'tasks.attachments.googleSheet': 'Hoja de cálculo de Google',
        'tasks.attachments.googleSlides': 'Presentación de Google',
        'tasks.attachments.googleDriveFile': 'Archivo de Google Drive',
        'tasks.attachments.pdf': 'Documento PDF',
        'tasks.attachments.word': 'Documento de Word',
        'tasks.attachments.excel': 'Archivo de Excel',
        'tasks.attachments.powerpoint': 'PowerPoint',
        'tasks.empty.epic': 'Aún no hay tareas. Crea tu primera tarea para este épico.',
        'tasks.backlogQuickTitle': 'Abrir tareas de backlog en vista de lista',
        'tasks.backlogQuickLabel': 'Backlog',
        'tasks.kanban.columnBacklog': '\u{1F9CA} Backlog',
        'tasks.kanban.columnTodo': '\u{1F4CB} Por hacer',
        'tasks.kanban.columnProgress': '\u{1F504} En progreso',
        'tasks.kanban.columnReview': '\u{2611}\u{FE0F} En revisión',
        'tasks.kanban.columnDone': '\u{2705} Hecho',
        'tasks.table.task': 'Tarea',
        'tasks.table.priority': 'Prioridad',
        'tasks.table.status': 'Estado',
        'tasks.table.tags': 'Etiquetas',
        'tasks.table.project': 'Proyecto',
        'tasks.table.startDate': 'Fecha de inicio',
        'tasks.table.endDate': 'Fecha de fin',
        'tasks.table.updated': 'Actualizado',
        'tasks.list.count': '{count} resultados',
        'tasks.modal.editTitle': 'Editar tarea',
        'tasks.modal.duplicate': '📄 Duplicar tarea',
        'tasks.modal.delete': '🗑️ Eliminar tarea',
        'tasks.modal.tab.general': 'General',
        'tasks.modal.tab.details': 'Detalles',
        'tasks.modal.tab.history': 'Historial',
        'tasks.modal.titleLabel': 'Título de la tarea',
        'tasks.modal.attachmentsLabel': 'Adjuntos',
        'tasks.modal.attachmentsSupported': 'Compatible: Imágenes (10MB), PDF (20MB), Documentos (10MB)',
        'tasks.modal.attachmentsDropzoneDefault': 'Arrastra y suelta o haz clic para adjuntar',
        'tasks.modal.attachmentsDropzoneTap': 'Haz clic para adjuntar',
        'tasks.modal.linksLabel': 'Enlaces',
        'tasks.modal.attachmentNamePlaceholder': 'Nombre (opcional)',
        'tasks.modal.attachmentUrlPlaceholder': 'URL',
        'tasks.modal.addLink': 'Agregar enlace',
        'tasks.modal.statusLabel': 'Estado',
        'tasks.modal.priorityLabel': 'Prioridad',
        'tasks.modal.tagsLabel': 'Etiquetas',
        'tasks.modal.addTagPlaceholder': 'Añadir etiqueta',
        'tasks.modal.projectLabel': 'Proyecto',
        'tasks.modal.projectOpenTitle': 'Abrir detalles del proyecto',
        'tasks.modal.projectSelect': 'Selecciona un proyecto',
        'tasks.modal.submitCreate': 'Crear tarea',
        'tasks.modal.listBulleted': '• Lista',
        'tasks.modal.listNumbered': '1. Lista',
        'tasks.modal.insertDivider': 'Insertar separador horizontal',
        'tasks.modal.insertCheckbox': 'Insertar casilla',
        'tasks.history.emptyTitle': 'Aún no hay cambios',
        'tasks.history.emptySubtitle': 'Los cambios en esta tarea aparecerán aquí',
        'calendar.title': 'Calendario',
        'calendar.today': 'Hoy',
        'calendar.prevMonth': 'Mes anterior',
        'calendar.nextMonth': 'Mes siguiente',
        'calendar.dayItemsTitle': 'Elementos para {date}',
        'calendar.dayItemsProjects': 'Proyectos',
        'calendar.dayItemsTasks': 'Tareas',
        'calendar.dayItems.close': 'Cerrar tareas del día',
        'feedback.title': 'Comentarios e incidencias',
        'feedback.subtitle': 'Reporta errores y sugiere funciones',
        'feedback.saveStatus.saved': 'Guardado',
        'feedback.saveStatus.saving': 'Guardando...',
        'feedback.saveStatus.error': 'No se pudo guardar',
        'feedback.saveStatus.offline': 'Sin conexion',
        'feedback.type.bugLabel': '\u{1F41E} Error',
        'feedback.type.title': 'Tipo de comentario',
        'feedback.type.bugOption': '\u{1F41E} Error',
        'feedback.type.improvementOption': '\u{1F4A1} Mejora',
        'feedback.descriptionPlaceholder': 'Describe el problema o la idea. Puedes pegar una imagen directamente en este campo.',
        'feedback.descriptionPlaceholderShort': 'Describe el problema o la idea.',
        'feedback.screenshotAttachTitle': 'Adjuntar captura desde el dispositivo',
        'feedback.screenshotDropzoneTap': '\u{1F4F7} Adjuntar captura',
        'feedback.screenshotDropzoneDefault': '\u{1F4F7} Arrastra o haz clic para adjuntar',
        'feedback.screenshotPreviewTitle': 'Captura adjunta',
        'feedback.screenshotPreviewSubtitle': 'Se guardará con este comentario',
        'feedback.screenshotRemove': 'Eliminar',
        'feedback.screenshotPreviewAlt': 'Vista previa de la captura',
        'feedback.viewScreenshotTitle': 'Ver captura',
        'feedback.pagination.first': 'Primera página',
        'feedback.pagination.prev': 'Página anterior',
        'feedback.pagination.next': 'Página siguiente',
        'feedback.pagination.last': 'Última página',
        'feedback.pagination.showing': 'Mostrando {start}-{end} de {total}',
        'feedback.pagination.pageOf': 'Página {current} de {total}',
        'feedback.addButton': 'Agregar',
        'feedback.pendingTitle': '? Pendiente',
        'feedback.doneTitle': '? Hecho',
        'feedback.delete.title': 'Eliminar comentario',
        'feedback.delete.body': '¿Seguro que deseas eliminar este comentario?',
        'feedback.empty.pending': 'No hay feedback pendiente',
        'feedback.empty.done': 'No hay feedback completado',
        'export.title': 'Exportar datos',
        'export.body': 'Esto descargará una copia completa de todas tus tareas, proyectos y ajustes como un archivo JSON. ¿Seguro que deseas exportar tus datos?',
        'export.confirm': 'Exportar',
        'confirm.deleteTask.title': 'Eliminar tarea',
        'confirm.deleteTask.body': 'Esta acción no se puede deshacer. Para confirmar, escribe delete abajo:',
        'confirm.deleteTask.inputPlaceholder': 'Escribe delete aquí',
        'confirm.deleteTask.error': 'Escribe \"delete\" exactamente para confirmar',
        'confirm.unsaved.title': 'Cambios sin guardar',
        'confirm.unsaved.body': 'Tienes cambios sin guardar. ¿Seguro que quieres cerrar y perderlos?',
        'confirm.unsaved.discard': 'Descartar cambios',
        'confirm.review.title': 'Desactivar estado \"En revisión\"',
        'error.saveDataFailed': 'No se pudieron guardar los datos. Inténtalo de nuevo.',
        'error.saveProjectsFailed': 'No se pudieron guardar los proyectos. Inténtalo de nuevo.',
        'error.saveTasksFailed': 'No se pudieron guardar las tareas. Inténtalo de nuevo.',
        'error.saveFeedbackFailed': 'No se pudo guardar el feedback. Inténtalo de nuevo.',
        'error.saveProjectColorsFailed': 'No se pudieron guardar los colores del proyecto.',
        'error.saveTaskFailed': 'No se pudo guardar la tarea. Inténtalo de nuevo.',
        'error.saveChangesFailed': 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
        'error.saveTaskPositionFailed': 'No se pudo guardar la posición de la tarea. Inténtalo de nuevo.',
        'error.saveProjectFailed': 'No se pudo guardar el proyecto. Inténtalo de nuevo.',
        'error.notLoggedInResetPin': 'Debes iniciar sesión para restablecer tu PIN',
        'error.resetPinFailed': 'No se pudo restablecer el PIN',
        'success.resetPin': '¡PIN restablecido con éxito! Tendrás que iniciar sesión de nuevo con tu nuevo PIN.',
        'error.resetPinError': 'Ocurrió un error al restablecer el PIN',
        'error.userNameEmpty': 'El nombre de usuario no puede estar vacío.',
        'error.saveDisplayNameFailed': 'No se pudo guardar el nombre visible. Inténtalo de nuevo.',
        'error.invalidEmail': 'Por favor, introduce un correo válido.',
        'error.saveEmailFailed': 'No se pudo guardar el correo. Inténtalo de nuevo.',
        'error.saveAvatarFailed': 'No se pudo guardar el avatar. Inténtalo de nuevo.',
        'success.settingsSaved': '¡Ajustes guardados correctamente!',
        'error.logoSelectFile': 'Selecciona un archivo de imagen para el logo del espacio de trabajo.',
        'error.logoTooLarge': 'Usa una imagen menor de 2 MB para el logo del espacio de trabajo.',
        'error.imageReadFailed': 'No se pudo leer la imagen seleccionada.',
        'error.imageLoadFailed': 'No se pudo cargar la imagen seleccionada.',
        'error.logoUploadFailed': 'Error al subir el logo: {message}',
        'error.cropInvalid': 'Error: el estado del recorte no es válido.',
        'error.cropTooLarge': 'La imagen recortada es demasiado grande. Selecciona un área más pequeña o usa una imagen más pequeña.',
        'success.cropApplied': '¡Imagen recortada y aplicada correctamente!',
        'success.logoCroppedApplied': '¡Logo del espacio de trabajo recortado y aplicado correctamente!',
        'error.cropFailed': 'Error al recortar la imagen: {message}',
        'error.avatarSelectFile': 'Selecciona un archivo de imagen para tu avatar.',
        'error.avatarTooLarge': 'Usa una imagen menor de 2 MB para tu avatar.',
        'error.avatarUploadFailed': 'No se pudo subir el avatar. Inténtalo de nuevo.',
        'error.endDateBeforeStart': 'La fecha de fin no puede ser anterior a la fecha de inicio',
        'error.startDateAfterEnd': 'La fecha de inicio no puede ser posterior a la fecha de fin',
        'error.feedbackAttachImage': 'Adjunta un archivo de imagen.',
        'error.feedbackReadImage': 'No se pudo leer la imagen. Inténtalo de nuevo.',
        'error.feedbackStatusFailed': 'No se pudo actualizar el estado del feedback. Inténtalo de nuevo.',
        'error.attachmentSaveFailed': 'No se pudo guardar el adjunto. Inténtalo de nuevo.',
        'error.attachmentLoadFailed': 'No se pudo cargar la imagen: {message}',
        'success.fileDownloaded': '¡Archivo descargado!',
        'error.fileDownloadFailed': 'No se pudo descargar el archivo: {message}',
        'success.attachmentDeletedFromStorage': '{name} eliminado del almacenamiento',
        'error.fileDeleteFailed': 'No se pudo eliminar el archivo del almacenamiento',
        'success.attachmentRemoved': 'Adjunto eliminado',
        'error.fileSizeTooLarge': 'El tamaño del archivo debe ser menor de {maxMB} MB. Elige uno más pequeño.',
        'success.fileUploaded': '¡Archivo subido correctamente!',
        'error.fileUploadFailed': 'Error al subir el archivo: {message}',
        'error.selectFile': 'Selecciona un archivo',
        'error.saveTagFailed': 'No se pudo guardar la etiqueta. Inténtalo de nuevo.',
        'error.removeTagFailed': 'No se pudo eliminar la etiqueta. Inténtalo de nuevo.',
        'error.openScreenshotFailed': 'No se pudo abrir la captura',
        'history.sort.newest': '↑ Más recientes primero',
        'history.sort.oldest': '↓ Más antiguos primero',
        'history.field.title': 'Título',
        'history.field.name': 'Nombre',
        'history.field.description': 'Descripción',
        'history.field.status': 'Estado',
        'history.field.priority': 'Prioridad',
        'history.field.category': 'Categoría',
        'history.field.startDate': 'Fecha de inicio',
        'history.field.endDate': 'Fecha de fin',
        'history.field.link': 'Enlace',
        'history.field.task': 'Enlace',
        'history.field.projectId': 'Proyecto',
        'history.field.tags': 'Etiquetas',
        'history.field.attachments': 'Adjuntos',
        'history.action.created': 'Creado',
        'history.action.deleted': 'Eliminado',
        'history.link.added': 'Agregado',
        'history.link.removed': 'Eliminado',
        'history.entity.task': 'tarea',
        'history.value.empty': 'vacío',
        'history.value.none': 'ninguno',
        'history.change.beforeLabel': 'Antes:',
        'history.change.afterLabel': 'Después:',
        'history.change.notSet': 'Sin establecer',
        'history.change.removed': 'Eliminado',
        'history.tags.none': 'Sin etiquetas',
        'history.attachments.none': 'Sin archivos adjuntos',
        'history.attachments.countSingle': '{count} archivo',
        'history.attachments.countPlural': '{count} archivos',
        'history.project.fallback': 'Proyecto #{id}',
        'history.change.arrow': '→',
        'menu.openMenu': 'Abrir menú',
        'menu.language': 'Idioma',
        'menu.darkMode': 'Modo oscuro',
        'menu.lightMode': 'Modo claro',
        'menu.settings': 'Configuración',
        'menu.help': 'Ayuda',
        'menu.signOut': 'Cerrar sesión',
        'nav.overview': 'Resumen',
        'nav.dashboard': 'Panel',
        'nav.updates': 'Notas de versión',
        'nav.calendar': 'Calendario',
        'nav.work': 'Trabajo',
        'nav.projects': 'Proyectos',
        'nav.allTasks': 'Todas las tareas',
        'nav.feedback': 'Comentarios',
        'updates.title': 'Notas de versión',
        'updates.subtitle': 'Último registro de cambios en Nautilus',
        'updates.latestLabel': 'Ultima version',
        'updates.historyLabel': 'Registro de versiones',
        'updates.sections.new': 'Novedades',
        'updates.sections.improvements': 'Mejoras',
        'updates.sections.fixes': 'Correcciones',
        'updates.empty': 'Todavia no hay notas de version.',
        'updates.sectionEmpty': 'Todavía no hay entradas.',
        'updates.historyEmpty': 'Sin versiones anteriores.',
        'notifications.title': 'Notificaciones',
        'notifications.toggle': 'Notificaciones',
        'notifications.today': 'Hoy',
        'notifications.yesterday': 'Ayer',
        'notifications.clearAll': 'Limpiar todo',
        'notifications.releaseTitle': 'Nueva versión',
        'notifications.releaseCta': 'Ver actualizaciones',
        'notifications.releaseMeta': 'Publicado {date}',
        'notifications.dueTodayTitle': 'Vence hoy',
        'notifications.dueTodayCta': 'Ver tareas',
        'notifications.dueTodayMetaOne': '{count} tarea vence hoy',
        'notifications.dueTodayMetaMany': '{count} tareas vencen hoy',
        'notifications.dueTodayMore': 'y {count} tareas más',
        'notifications.empty': 'Todo al día.',
        'settings.title': 'Configuración',
        'settings.subtitle': 'Administra tus preferencias y la configuración de la aplicación',
        'settings.section.profile': 'Perfil',
        'settings.displayName': 'Nombre para mostrar',
        'settings.displayNameHint': 'Este nombre se muestra en toda la aplicación',
        'settings.placeholder.displayName': 'Escribe tu nombre para mostrar',
        'settings.email': 'Correo electrónico',
        'settings.emailHint': 'Se usa para tu cuenta y notificaciones de vencimiento',
        'settings.placeholder.email': 'Escribe tu correo',
        'settings.avatar': 'Avatar',
        'settings.avatarHint': 'Sube una imagen para tu avatar (máx. 2 MB). Se mostrará en forma circular.',
        'settings.avatarRemoveTitle': 'Eliminar avatar',
        'settings.workspaceLogo': 'Logo del espacio de trabajo',
        'settings.workspaceLogoHint': 'Sube una imagen cuadrada para reemplazar el logo de Nautilus (máx. 2 MB).',
        'settings.workspaceLogoRemoveTitle': 'Eliminar logo personalizado',
        'settings.section.application': 'Aplicación',
        'settings.enableReviewStatus': 'Habilitar estado En revisión',
        'settings.enableReviewStatusHint': 'Muestra u oculta la columna y el filtro de estado EN REVISIÓN',
        'settings.enableReviewStatusHintPrefix': 'Muestra u oculta la columna y el filtro del estado',
        'settings.enableReviewStatusHintSuffix': 'en la vista de tareas',
        'settings.calendarIncludeBacklog': 'Mostrar backlog en calendario',
        'settings.calendarIncludeBacklogHint': 'Muestra tareas en backlog en todas las vistas de calendario',
        'settings.autoStartDate': 'Autocompletar fecha de inicio',
        'settings.autoStartDateHint': 'Establece automáticamente la fecha de inicio cuando la tarea pasa a "En progreso" (si está vacía)',
        'settings.autoEndDate': 'Autocompletar fecha de fin',
        'settings.autoEndDateHint': 'Establece automáticamente la fecha de fin cuando la tarea pasa a "Hecho" (si está vacía)',
        'settings.historySortOrder': 'Orden de historial',
        'settings.historySortOrderHint': 'Orden predeterminado para los historiales de tareas y proyectos',
        'settings.historySortNewest': 'Más reciente primero',
        'settings.historySortOldest': 'Más antiguo primero',
        'settings.language': 'Idioma',
        'settings.languageHint': 'Elige el idioma de la aplicación',
        'settings.section.notifications': 'Notificaciones',
        'settings.emailNotifications': 'Notificaciones por correo',
        'settings.emailNotificationsHint': 'Activa o desactiva los correos de recordatorio de vencimientos',
        'settings.weekdaysOnly': 'Solo días laborables',
        'settings.weekdaysOnlyHint': 'Omitir correos sábado y domingo',
        'settings.includeStartDates': 'Notificar cuando las tareas comienzan',
        'settings.includeStartDatesHint': 'Enviar recordatorios cuando una tarea comienza (ej., hoy)',
        'settings.includeBacklog': 'Incluir tareas en backlog',
        'settings.includeBacklogHint': 'Incluir tareas en backlog en notificaciones por correo y en la app',
        'settings.sendTime': 'Hora de envío',
        'settings.sendTimeHint': 'Hora diaria de envío (08:00-18:00, intervalos de 30 minutos)',
        'settings.timeZone': 'Zona horaria',
        'settings.timeZoneHint': 'Mantiene la misma hora local todo el año (con horario de verano)',
        'settings.timeZone.option.argentina': 'Argentina (Buenos Aires)',
        'settings.timeZone.option.canary': 'Islas Canarias (Atlantic/Canary)',
        'settings.timeZone.option.spain': 'España peninsular (Europe/Madrid)',
        'settings.timeZone.option.utc': 'UTC',
        'settings.section.security': 'Seguridad',
        'settings.pinManagement': 'Gestión de PIN',
        'settings.pinManagementHint': 'Restablece tu PIN a un nuevo código de 4 dígitos',
        'settings.resetPinButton': 'Restablecer PIN',
        'settings.section.dataManagement': 'Gestión de datos',
        'settings.exportData': 'Exportar datos',
        'settings.exportDataHint': 'Descarga una copia de seguridad completa de tus tareas, proyectos y configuración en un archivo JSON',
        'settings.exportButton': 'Exportar',
        'settings.cancelButton': 'Cancelar',
        'settings.saveButton': 'Guardar configuración',
        'settings.avatarUploadDefault': 'Arrastra y suelta o haz clic para subir un avatar',
        'settings.avatarUploadChange': 'Cambiar avatar',
        'settings.avatarUploadAriaUpload': 'Subir avatar',
        'settings.avatarUploadAriaChange': 'Cambiar avatar',
        'settings.logoUploadDefault': 'Arrastra y suelta o haz clic para subir un logo',
        'settings.logoUploadChange': 'Cambiar logo',
        'settings.logoUploadAriaUpload': 'Subir logo',
        'settings.logoUploadAriaChange': 'Cambiar logo',
        'dashboard.title': 'Panel',
        'dashboard.hero.activeProjectsLabel': 'Proyectos activos',
        'dashboard.hero.completionRateLabel': 'Tasa de finalización',
        'dashboard.hero.projectsTrend': '📈 +2 este mes',
        'dashboard.hero.completionTrend': '🎯 Objetivo: 80%',
        'dashboard.projectAnalytics': '📊 Analítica de proyectos',
        'dashboard.period.week': 'Semana',
        'dashboard.period.month': 'Mes',
        'dashboard.period.quarter': 'Trimestre',
        'dashboard.stat.pendingTasks': 'Tareas pendientes',
        'dashboard.stat.inProgress': 'En progreso',
        'dashboard.stat.highPriority': 'Alta prioridad',
        'dashboard.stat.overdue': 'Vencidas',
        'dashboard.stat.completed': 'Completadas',
        'dashboard.stat.projects': 'Proyectos',
        'dashboard.highPriorityHint': 'Tareas de alta prioridad con vencimiento en 7 días (o vencidas)',
        'dashboard.projectProgress': '🌊 Progreso del proyecto',
        'dashboard.legend.todo': 'Por hacer',
        'dashboard.legend.progress': 'En progreso',
        'dashboard.legend.review': 'En revisión',
        'dashboard.legend.complete': 'Completo',
        'dashboard.viewAll': 'Ver todo',
        'dashboard.quickActions': '⚡ Acciones rápidas',
        'dashboard.action.generateReport': 'Generar informe',
        'dashboard.action.addTask': 'Agregar tarea',
        'dashboard.action.viewCalendar': 'Ver calendario',
        'dashboard.action.newProject': 'Nuevo proyecto',
        'dashboard.recentActivity': '\u{1F504} Actividad reciente',
        'dashboard.researchInsights': '🧠 Perspectivas',
        'dashboard.activity.emptyTitle': 'Bienvenido a tu panel',
        'dashboard.activity.emptySubtitle': 'Empieza a crear proyectos y tareas para ver actividad',
        'dashboard.activity.completed': 'Completaste "{title}" {projectPart}',
        'dashboard.activity.createdProject': 'Creaste el nuevo proyecto "{project}"',
        'dashboard.activity.addedTask': 'Agregaste la nueva tarea "{title}" {projectPart}',
        'dashboard.activity.inProject': 'en {project}',
        'dashboard.activity.toProject': 'a {project}',
        'dashboard.activity.recently': 'Recientemente',
        'dashboard.activity.justNow': 'Justo ahora',
        'dashboard.activity.today': 'Hoy',
        'dashboard.activity.yesterday': 'Ayer',
        'dashboard.activity.daysAgoShort': 'hace {count}d',
        'dashboard.activity.minuteAgo': 'hace {count} minuto',
        'dashboard.activity.minutesAgo': 'hace {count} minutos',
        'dashboard.activity.hourAgo': 'hace {count} hora',
        'dashboard.activity.hoursAgo': 'hace {count} horas',
        'dashboard.activity.dayAgo': 'hace {count} día',
        'dashboard.activity.daysAgo': 'hace {count} días',
        'dashboard.trend.thisWeek': 'esta semana',
        'dashboard.trend.thisMonth': 'este mes',
        'dashboard.trend.thisQuarter': 'este trimestre',
        'dashboard.trend.dueTodayOne': '{count} vence hoy',
        'dashboard.trend.dueTodayMany': '{count} vencen hoy',
        'dashboard.trend.onTrack': 'En buen camino',
        'dashboard.trend.needsAttention': 'Necesita atención',
        'dashboard.trend.allOnTrack': 'Todo en buen camino',
        'dashboard.trend.criticalOne': '{count} crítica',
        'dashboard.trend.criticalMany': '{count} críticas',
        'dashboard.trend.completedOne': '{count} completada',
        'dashboard.trend.completedMany': '{count} completadas',
        'dashboard.trend.inProgress': 'En progreso',
        'dashboard.emptyProjects.title': 'Aún no hay proyectos',
        'dashboard.emptyProjects.subtitle': 'Crea tu primer proyecto para ver la visualización de progreso',
        'dashboard.tasks': 'tareas',
        'dashboard.activity.allTitle': 'Toda la actividad reciente',
        'dashboard.activity.allSubtitle': 'Historial completo de tu trabajo reciente',
        'dashboard.activity.backToDashboard': '← Volver al panel',
        'dashboard.insights.excellentTitle': 'Progreso excelente',
        'dashboard.insights.excellentDesc': '{percent}% de finalización supera el objetivo. Gran impulso.',
        'dashboard.insights.goodTitle': 'Buen progreso',
        'dashboard.insights.goodDesc': '{percent}% de finalización es sólido. Intenta llegar al objetivo de 80%.',
        'dashboard.insights.opportunityTitle': 'Oportunidad de progreso',
        'dashboard.insights.opportunityDesc': '{percent}% de finalización. Enfócate en completar tareas actuales para ganar impulso.',
        'dashboard.insights.actionTitle': 'Acción necesaria',
        'dashboard.insights.actionDesc': '{percent}% de finalización es bajo. Divide tareas grandes y empieza con las pequeñas.',
        'dashboard.insights.todayTitle': 'Enfoque de hoy',
        'dashboard.insights.todayDescOne': '{count} tarea vence hoy. Priorízala para mayor impacto.',
        'dashboard.insights.todayDescMany': '{count} tareas vencen hoy. Priorízalas para mayor impacto.',
        'dashboard.insights.overdueTitle': 'Elementos vencidos',
        'dashboard.insights.overdueDescOne': '{count} tarea vencida necesita atención. Atiéndela para evitar retrasos.',
        'dashboard.insights.overdueDescMany': '{count} tareas vencidas necesitan atención. Atiéndelas para evitar retrasos.',
        'dashboard.insights.highPriorityTitle': 'Enfoque de alta prioridad',
        'dashboard.insights.highPriorityDescOne': '{count} tarea de alta prioridad necesita atención inmediata.',
        'dashboard.insights.highPriorityDescMany': '{count} tareas de alta prioridad necesitan atención inmediata.',
        'dashboard.insights.emptyProjectsTitle': 'Proyectos sin tareas',
        'dashboard.insights.emptyProjectsDescOne': '{count} proyecto no tiene tareas aún. Agrega tareas para seguir el progreso.',
        'dashboard.insights.emptyProjectsDescMany': '{count} proyectos no tienen tareas aún. Agrega tareas para seguir el progreso.',
        'dashboard.insights.momentumTitle': 'Buen impulso',
        'dashboard.insights.momentumDescOne': '{count} tarea completada esta semana. Vas en buen ritmo.',
        'dashboard.insights.momentumDescMany': '{count} tareas completadas esta semana. Vas en buen ritmo.',
        'dashboard.insights.readyTitle': 'Listo para empezar',
        'dashboard.insights.readyDesc': 'Crea tu primer proyecto y agrega tareas para comenzar a seguir tu progreso.',
        'dashboard.insights.caughtUpTitle': 'Todo al día',
        'dashboard.insights.caughtUpDesc': 'Buen trabajo. No hay urgencias. Considera planificar tus próximos hitos.'
    }
};


function normalizeLanguage(value) {
    return SUPPORTED_LANGUAGES.includes(value) ? value : 'en';
}

function getCurrentLanguage() {
    return normalizeLanguage(settings.language || 'en');
}

function getLocale() {
    const lang = getCurrentLanguage();
    return I18N_LOCALES[lang] || I18N_LOCALES.en;
}

function t(key, vars) {
    const lang = getCurrentLanguage();
    const dict = I18N[lang] || I18N.en;
    let text = dict[key] || I18N.en[key] || key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) => {
        if (Object.prototype.hasOwnProperty.call(vars, name)) {
            return String(vars[name]);
        }
        return match;
    });
}

function applyTranslations(root = document) {
    const elements = root.querySelectorAll('[data-i18n]');
    elements.forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        const attr = el.getAttribute('data-i18n-attr');
        if (attr) {
            attr.split(',').map((name) => name.trim()).filter(Boolean).forEach((name) => {
                el.setAttribute(name, t(key));
            });
        } else {
            el.textContent = t(key);
        }
    });
}

window.i18n = {
    t,
    applyTranslations,
    getCurrentLanguage
};

function getStatusLabel(status) {
    const map = {
        backlog: t('tasks.status.backlog'),
        todo: t('tasks.status.todo'),
        progress: t('tasks.status.progress'),
        review: t('tasks.status.review'),
        done: t('tasks.status.done')
    };
    return map[status] || STATUS_LABELS[status] || status || '';
}

function getProjectStatusLabel(status) {
    const map = {
        planning: t('projects.status.planning'),
        active: t('projects.status.active'),
        completed: t('projects.status.completed')
    };
    return map[status] || status || '';
}

function getPriorityLabel(priority) {
    const map = {
        high: t('tasks.priority.high'),
        medium: t('tasks.priority.medium'),
        low: t('tasks.priority.low')
    };
    return map[priority] || getPriorityLabel(priority) || priority || '';
}

function applyLanguage() {
    settings.language = getCurrentLanguage();
    document.documentElement.lang = settings.language;
    applyTranslations();
    updateFeedbackPlaceholderForViewport();
    const timeZoneSelect = document.getElementById('email-notification-timezone');
    const timeZoneValue = document.getElementById('email-notification-timezone-value');
    if (timeZoneSelect && timeZoneValue) {
        timeZoneValue.textContent =
            timeZoneSelect.options?.[timeZoneSelect.selectedIndex]?.textContent ||
            timeZoneSelect.value ||
            '';
    }
    const avatarDropzone = document.getElementById('user-avatar-dropzone');
    if (avatarDropzone) {
        avatarDropzone.dataset.defaultText = t('settings.avatarUploadDefault');
        avatarDropzone.dataset.changeText = t('settings.avatarUploadChange');
    }
    const logoDropzone = document.getElementById('workspace-logo-dropzone');
    if (logoDropzone) {
        logoDropzone.dataset.defaultText = t('settings.logoUploadDefault');
        logoDropzone.dataset.changeText = t('settings.logoUploadChange');
    }
    const taskAttachmentDropzone = document.getElementById('attachment-file-dropzone');
    if (taskAttachmentDropzone) {
        const isMobileScreen = window.innerWidth <= 768;
        const attachmentText = isMobileScreen
            ? t('tasks.modal.attachmentsDropzoneTap')
            : t('tasks.modal.attachmentsDropzoneDefault');
        taskAttachmentDropzone.dataset.defaultText = attachmentText;
        const textEl = taskAttachmentDropzone.querySelector('.task-attachment-dropzone-text');
        if (textEl) textEl.textContent = attachmentText;
    }
    const screenshotInput = document.getElementById('feedback-screenshot-url');
    if (screenshotInput) {
        const isMobileScreen = (typeof window.matchMedia === 'function')
            ? window.matchMedia('(max-width: 768px)').matches
            : window.innerWidth <= 768;
        const screenshotDefaultText = isMobileScreen
        ? t('feedback.screenshotDropzoneTap')
        : t('feedback.screenshotDropzoneDefault');
        screenshotInput.dataset.defaultText = screenshotDefaultText;
        if (!screenshotInput.dataset.hasInlineImage) {
            screenshotInput.textContent = screenshotDefaultText;
        }
    }
    updateThemeMenuText();
    refreshUserAvatarSettingsUI();
    document.dispatchEvent(new CustomEvent('refresh-workspace-logo-ui'));
    updateTrendIndicators();
    try { updateSortUI(); } catch (e) {}
    try { updateProjectsUpdatedFilterUI(); } catch (e) {}
    try { updateKanbanUpdatedFilterUI(); } catch (e) {}
    try { refreshProjectsSortLabel(); } catch (e) {}
    renderProjectProgressBars();
    renderActivityFeed();
    renderUpdatesPage();
    updateNotificationState();
    renderInsights();
    try { refreshFlatpickrLocale(); } catch (e) {}
    const activePeriod = document.querySelector('.filter-chip.active')?.dataset?.period || 'week';
    updateDashboardForPeriod(activePeriod);
    const activityPage = document.getElementById('activity-page');
    if (activityPage && activityPage.classList.contains('active')) {
        renderAllActivity();
    }
    // Refresh active pages to ensure all text updates immediately after language change.
    try {
        if (document.getElementById('projects')?.classList.contains('active')) {
            renderProjects();
        }
        if (document.getElementById('tasks')?.classList.contains('active')) {
            renderTasks();
            if (document.getElementById('list-view')?.classList.contains('active')) {
                renderListView();
            }
        }
        if (document.getElementById('calendar')?.classList.contains('active')) {
            renderCalendar();
        }
        if (document.getElementById('feedback')?.classList.contains('active')) {
            renderFeedback();
            updateFeedbackSaveStatus();
        }
    } catch (e) {}
}

let workspaceLogoDraft = {
    hasPendingChange: false,
    dataUrl: null
};

let avatarDraft = {
    hasPendingChange: false,
    dataUrl: null
};

// Workspace logo crop state
let cropState = {
    originalImage: null,        // Image object
    originalDataUrl: null,      // Original data URL
    canvas: null,               // Canvas element
    ctx: null,                  // Canvas context
    selection: {
        x: 0,
        y: 0,
        size: 0                 // Square size
    },
    isDragging: false,
    isResizing: false,
    dragStartX: 0,
    dragStartY: 0,
    activeHandle: null,
    shape: 'square',            // 'square' | 'circle' (UI + output mask)
    outputMimeType: 'image/jpeg',
    outputMaxSize: null,        // number (px) or null
    onApply: null,
    successMessage: null
};

let defaultWorkspaceIconText = null;

import {
    loadData,
    saveData,
    saveFeedbackItem,
    saveFeedbackIndex,
    deleteFeedbackItem as deleteFeedbackItemStorage,
    batchFeedbackOperations
} from "./storage-client.js?v=20260112-storage-client-fix";
import {
    saveAll as saveAllData,
    saveTasks as saveTasksData,
    saveProjects as saveProjectsData,
    saveFeedbackItems as saveFeedbackItemsData,
    saveProjectColors as saveProjectColorsData,
    saveSortState as saveSortStateData,
    loadAll as loadAllData,
    loadSortState as loadSortStateData,
    loadProjectColors as loadProjectColorsData,
    saveSettings as saveSettingsData,
    loadSettings as loadSettingsData
} from "./src/services/storage.js";
import {
    createTask as createTaskService,
    updateTask as updateTaskService,
    updateTaskField as updateTaskFieldService,
    deleteTask as deleteTaskService,
    duplicateTask as duplicateTaskService,
    validateTask
} from "./src/services/taskService.js";
import {
    createProject as createProjectService,
    updateProject as updateProjectService,
    updateProjectField as updateProjectFieldService,
    deleteProject as deleteProjectService,
    getProjectTasks,
    validateProject
} from "./src/services/projectService.js";
import { escapeHtml, sanitizeInput } from "./src/utils/html.js";
import {
    looksLikeDMY,
    looksLikeISO,
    toISOFromDMY,
    toDMYFromISO,
    formatDate,
    formatDatePretty,
    formatActivityDate
} from "./src/utils/date.js";
import { TAG_COLORS, PROJECT_COLORS } from "./src/utils/colors.js";
import {
    VALID_STATUSES,
    VALID_PRIORITIES,
    STATUS_LABELS,
    PRIORITY_LABELS,
    PRIORITY_ORDER,
    STATUS_ORDER,
    PRIORITY_OPTIONS,
    PRIORITY_COLORS
} from "./src/config/constants.js";
import { RELEASE_NOTES } from "./src/config/release-notes.js";
// User profile is now managed by auth.js via window.authSystem
import { generateWordReport } from "./src/services/reportGenerator.js";

// Expose storage functions for historyService
window.saveData = saveData;
window.loadData = loadData;

// Guard to avoid persisting to storage while the app is initializing/loading
let isInitializing = false;

// Track pending save operations to prevent data loss on page unload
// This counter tracks all async save operations in flight. The beforeunload
// listener warns users if they try to close the tab/browser with pending saves.
// Combined with await on all save calls, this provides two layers of protection:
// 1. await prevents in-app navigation before saves complete
// 2. beforeunload warns user before browser/tab close with pending saves
let pendingSaves = 0;

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        background: ${type === 'error' ? 'var(--accent-red)' : type === 'success' ? 'var(--accent-green)' : 'var(--accent-blue)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Debounced project field updates (used to ensure fields like description save even if the DOM is removed before blur/change fires)
const __projectFieldDebounceTimers = new Map();
function debouncedUpdateProjectField(projectId, field, value, options) {
    const opts = options || {};
    const delayMs = Number.isFinite(opts.delayMs) ? opts.delayMs : 500;
    const key = `${projectId}:${field}`;
    const existing = __projectFieldDebounceTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
        __projectFieldDebounceTimers.delete(key);
        updateProjectField(projectId, field, value, opts);
    }, delayMs);
    __projectFieldDebounceTimers.set(key, timer);
}

function flushDebouncedProjectField(projectId, field, value, options) {
    const key = `${projectId}:${field}`;
    const existing = __projectFieldDebounceTimers.get(key);
    if (existing) {
        clearTimeout(existing);
        __projectFieldDebounceTimers.delete(key);
    }
    updateProjectField(projectId, field, value, options || {});
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function validateDateRange() {
    // Validation removed - flatpickr constraints prevent invalid date selection
    // No need to validate or disable buttons since users can't pick invalid dates
    return true;
}

const RELEASE_SEEN_STORAGE_KEY = 'nautilusLastSeenReleaseId';
const DUE_TODAY_SEEN_STORAGE_KEY = 'nautilusDueTodaySeen';
const NOTIFICATION_HISTORY_KEY = 'nautilusNotificationHistory';
const NOTIFICATION_HISTORY_MAX_DAYS = 30;
const NOTIFICATION_STATE_CACHE_TTL = 30000;
const NOTIFICATION_PENDING_SEEN_KEY = 'nautilusNotificationPendingSeen';
const USE_SERVER_NOTIFICATIONS = true;
let notificationStateCache = { timestamp: 0, data: null };
let notificationPendingFlushInFlight = false;

function normalizeReleaseDate(dateStr) {
    if (!dateStr) return 0;
    const normalized = looksLikeDMY(dateStr) ? toISOFromDMY(dateStr) : dateStr;
    const time = Date.parse(normalized);
    return Number.isNaN(time) ? 0 : time;
}

function resolveReleaseText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        const locale = getLocale();
        const lang = locale && locale.startsWith('es') ? 'es' : 'en';
        return value[lang] || value.en || value.es || '';
    }
    return String(value);
}

function getSortedReleaseNotes() {
    const list = Array.isArray(RELEASE_NOTES) ? [...RELEASE_NOTES] : [];
    return list.sort((a, b) => normalizeReleaseDate(b.date) - normalizeReleaseDate(a.date));
}

function getLatestReleaseNote() {
    const list = getSortedReleaseNotes();
    return list[0] || null;
}

function getLastSeenReleaseId() {
    try {
        return localStorage.getItem(RELEASE_SEEN_STORAGE_KEY) || '';
    } catch (e) {
        return '';
    }
}

function setLastSeenReleaseId(releaseId) {
    if (!releaseId) return;
    try {
        localStorage.setItem(RELEASE_SEEN_STORAGE_KEY, releaseId);
    } catch (e) {}
}

function formatReleaseDate(dateStr) {
    if (!dateStr) return '';
    return formatDatePretty(dateStr, getLocale());
}

function normalizeISODate(dateStr) {
    if (!dateStr) return '';
    if (looksLikeISO(dateStr)) return dateStr;
    if (looksLikeDMY(dateStr)) return toISOFromDMY(dateStr);
    return '';
}

function getSeenDueToday() {
    try {
        const raw = localStorage.getItem(DUE_TODAY_SEEN_STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        const today = new Date().toISOString().split('T')[0];
        if (!data || data.date !== today || !Array.isArray(data.ids)) return null;
        return data;
    } catch (e) {
        return null;
    }
}

function setSeenDueToday(taskIds) {
    try {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(
            DUE_TODAY_SEEN_STORAGE_KEY,
            JSON.stringify({ date: today, ids: taskIds || [] })
        );
    } catch (e) {}
}

function getUnseenDueTodayCount(dueToday) {
    if (!dueToday || dueToday.length === 0) return 0;
    const seen = getSeenDueToday();
    if (!seen) return dueToday.length;
    const seenSet = new Set(seen.ids || []);
    return dueToday.filter((task) => !task || !task.id || !seenSet.has(task.id)).length;
}

function getDueTodayTasks() {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter((task) => {
        if (!task || task.status === 'done') return false;
        const due = normalizeISODate(task.endDate || '');
        const start = normalizeISODate(task.startDate || '');
        return (due !== '' && due === today) || (start !== '' && start === today);
    });
}

// ============================================================================
// Notification History System
// ============================================================================

function getNotificationHistory() {
    try {
        const raw = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
        if (!raw) return { notifications: [], lastChecked: null };
        const data = JSON.parse(raw);
        return {
            notifications: Array.isArray(data.notifications) ? data.notifications : [],
            lastChecked: data.lastChecked || null
        };
    } catch (e) {
        return { notifications: [], lastChecked: null };
    }
}

function saveNotificationHistory(history) {
    try {
        localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {}
}

function createNotificationId(type, taskId, date) {
    return `notif_${date}_${type}_${taskId}`;
}

function addTaskNotification(taskId, dueDate) {
    const history = getNotificationHistory();
    const notifId = createNotificationId('task_due', taskId, dueDate);

    // Check if notification already exists
    const exists = history.notifications.some(n => n.id === notifId);
    if (exists) return;

    const notification = {
        id: notifId,
        type: 'task_due',
        taskId: taskId,
        date: dueDate,
        read: false,
        dismissed: false,
        createdAt: new Date().toISOString()
    };

    history.notifications.push(notification);
    saveNotificationHistory(history);
}

// OPTIMIZED: Batch all notification creation to reduce localStorage operations
function checkAndCreateDueTodayNotifications() {
    // Safety check: don't run if tasks array is not initialized
    if (!Array.isArray(tasks) || tasks.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const history = getNotificationHistory();

    // Build a Set of existing notification IDs for fast lookup
    const existingIds = new Set(history.notifications.map(n => n.id));
    const newNotifications = [];

    // Collect tasks starting and due today
    // Check if start date notifications are enabled
    const includeStartDates = settings.emailNotificationsIncludeStartDates !== false;
    const includeBacklog = !!settings.emailNotificationsIncludeBacklog; // Default to false (exclude backlog)

    tasks.forEach(task => {
        if (!task || task.status === 'done' || !task.id) return;

        // Skip backlog tasks unless user has enabled them in settings
        if (task.status === 'backlog' && !includeBacklog) return;

        const start = normalizeISODate(task.startDate || '');
        const due = normalizeISODate(task.endDate || '');

        // Create start notification if starting today (only if setting is enabled)
        if (includeStartDates && start === today) {
            const notifId = createNotificationId('task_starting', task.id, today);
            if (!existingIds.has(notifId)) {
                newNotifications.push({
                    id: notifId,
                    type: 'task_starting',
                    taskId: task.id,
                    date: today,
                    read: false,
                    dismissed: false,
                    createdAt: new Date().toISOString()
                });
            }
        }

        // Create due notification if due today
        if (due === today) {
            const notifId = createNotificationId('task_due', task.id, today);
            if (!existingIds.has(notifId)) {
                newNotifications.push({
                    id: notifId,
                    type: 'task_due',
                    taskId: task.id,
                    date: today,
                    read: false,
                    dismissed: false,
                    createdAt: new Date().toISOString()
                });
            }
        }
    });

    // CATCH-UP: Collect notifications for tasks in past 7 days
    const pastDays = 7;
    for (let i = 1; i <= pastDays; i++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - i);
        const pastDateStr = pastDate.toISOString().split('T')[0];

        tasks.forEach(task => {
            if (!task || task.status === 'done' || !task.id) return;

            const start = normalizeISODate(task.startDate || '');
            const due = normalizeISODate(task.endDate || '');

            // Create past start notification (only if setting is enabled)
            if (includeStartDates && start === pastDateStr) {
                const notifId = createNotificationId('task_starting', task.id, pastDateStr);
                if (!existingIds.has(notifId)) {
                    newNotifications.push({
                        id: notifId,
                        type: 'task_starting',
                        taskId: task.id,
                        date: pastDateStr,
                        read: false,
                        dismissed: false,
                        createdAt: new Date().toISOString()
                    });
                }
            }

            // Create past due notification
            if (due === pastDateStr) {
                const notifId = createNotificationId('task_due', task.id, pastDateStr);
                if (!existingIds.has(notifId)) {
                    newNotifications.push({
                        id: notifId,
                        type: 'task_due',
                        taskId: task.id,
                        date: pastDateStr,
                        read: false,
                        dismissed: false,
                        createdAt: new Date().toISOString()
                    });
                }
            }
        });
    }

    // Only write to localStorage if there are new notifications
    if (newNotifications.length > 0) {
        history.notifications.push(...newNotifications);
    }

    // Update last checked
    history.lastChecked = new Date().toISOString();

    // Single localStorage write instead of multiple
    saveNotificationHistory(history);
}

function markNotificationRead(notificationId) {
    const history = getNotificationHistory();
    const notif = history.notifications.find(n => n.id === notificationId);
    if (notif) {
        notif.read = true;
        saveNotificationHistory(history);
    }
}

function markAllNotificationsRead() {
    const history = getNotificationHistory();
    history.notifications.forEach(n => {
        if (!n.dismissed) {
            n.read = true;
        }
    });
    saveNotificationHistory(history);
}

function dismissNotification(notificationId) {
    const history = getNotificationHistory();
    const notif = history.notifications.find(n => n.id === notificationId);
    if (notif) {
        notif.dismissed = true;
        saveNotificationHistory(history);
    }
}

function dismissNotificationsByDate(date) {
    const history = getNotificationHistory();
    history.notifications.forEach(n => {
        if (n.date === date) {
            n.dismissed = true;
        }
    });
    saveNotificationHistory(history);
}

function dismissAllNotifications() {
    const history = getNotificationHistory();
    history.notifications.forEach(n => {
        n.dismissed = true;
    });
    saveNotificationHistory(history);
}

function cleanupOldNotifications() {
    const history = getNotificationHistory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_HISTORY_MAX_DAYS);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];

    history.notifications = history.notifications.filter(n => {
        return n.date >= cutoffISO;
    });

    saveNotificationHistory(history);
}

function getActiveNotifications() {
    const history = getNotificationHistory();
    return history.notifications.filter(n => !n.dismissed);
}

function getUnreadNotificationCount() {
    const active = getActiveNotifications();
    return active.filter(n => !n.read).length;
}

function getTaskNotificationsByDate() {
    const active = getActiveNotifications();
    const taskNotifs = active.filter(n => n.type === 'task_due' || n.type === 'task_starting');

    // Group by date
    const grouped = new Map();
    taskNotifs.forEach(notif => {
        if (!grouped.has(notif.date)) {
            grouped.set(notif.date, []);
        }
        grouped.get(notif.date).push(notif);
    });

    // Sort dates descending (most recent first)
    const sorted = Array.from(grouped.entries()).sort((a, b) => {
        return b[0].localeCompare(a[0]);
    });

    return sorted;
}

// ============================================================================

function buildNotificationState() {
    // Notification creation happens once at app init, not on every state build
    const latest = getLatestReleaseNote();
    const lastSeen = getLastSeenReleaseId();
    // Release notifications are currently hidden from the dropdown, so suppress their badge.
    const releaseUnseen = false;

    const taskNotificationsByDate = getTaskNotificationsByDate();
    const unreadCount = getUnreadNotificationCount();

    return {
        latest,
        releaseUnseen,
        taskNotificationsByDate,
        unreadCount
    };
}

function getNotificationAuthToken() {
    return window.authSystem?.getAuthToken?.() || localStorage.getItem('authToken');
}

function loadPendingNotificationSeen() {
    const raw = localStorage.getItem(NOTIFICATION_PENDING_SEEN_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.seenAt) return null;
        return parsed;
    } catch (e) {
        return null;
    }
}

function savePendingNotificationSeen(payload) {
    if (!payload || !payload.seenAt) return;
    localStorage.setItem(NOTIFICATION_PENDING_SEEN_KEY, JSON.stringify(payload));
}

function queueNotificationSeen(seenAt, clearAll = false) {
    const existing = loadPendingNotificationSeen();
    if (!existing) {
        savePendingNotificationSeen({ seenAt, clearAll: !!clearAll });
        return;
    }
    const existingTime = new Date(existing.seenAt).getTime();
    const nextTime = new Date(seenAt).getTime();
    const merged = {
        seenAt: Number.isFinite(existingTime) && Number.isFinite(nextTime) && existingTime > nextTime
            ? existing.seenAt
            : seenAt,
        clearAll: !!(existing.clearAll || clearAll)
    };
    savePendingNotificationSeen(merged);
}

async function flushPendingNotificationSeen() {
    if (!USE_SERVER_NOTIFICATIONS || notificationPendingFlushInFlight) return;
    const pending = loadPendingNotificationSeen();
    if (!pending) return;
    const token = getNotificationAuthToken();
    if (!token) return;

    notificationPendingFlushInFlight = true;
    try {
        const payload = {
            seenAt: pending.seenAt,
            clearAll: !!pending.clearAll
        };
        // Include dismissDate if present
        if (pending.dismissDate) {
            payload.dismissDate = pending.dismissDate;
        }

        const response = await fetch('/api/notifications/state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            localStorage.removeItem(NOTIFICATION_PENDING_SEEN_KEY);
        }
    } catch (error) {
        console.warn('[notifications] failed to flush pending seen', error);
    } finally {
        notificationPendingFlushInFlight = false;
    }
}

async function fetchNotificationState({ force = false } = {}) {
    if (USE_SERVER_NOTIFICATIONS) {
        await flushPendingNotificationSeen();
        const now = Date.now();
        if (!force && notificationStateCache.data && (now - notificationStateCache.timestamp) < NOTIFICATION_STATE_CACHE_TTL) {
            return notificationStateCache.data;
        }

        const token = getNotificationAuthToken();
        if (token) {
            try {
                const response = await fetch('/api/notifications/state', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const payload = await response.json();
                    const latest = getLatestReleaseNote();
                    const releaseUnseen = false;
                    const state = {
                        latest,
                        releaseUnseen,
                        taskNotificationsByDate: Array.isArray(payload.taskNotificationsByDate) ? payload.taskNotificationsByDate : [],
                        unreadCount: Number(payload.unreadCount) || 0
                    };
                    notificationStateCache = { timestamp: now, data: state };
                    return state;
                }
            } catch (error) {
                console.warn('[notifications] failed to fetch server state', error);
            }
        }
    }

    return buildNotificationState();
}

function updateNotificationBadge(state = buildNotificationState()) {
    const badge = document.getElementById('notification-count');
    if (!badge) return;
    const releaseCount = state.releaseUnseen && state.latest ? 1 : 0;
    const total = releaseCount + state.unreadCount;
    if (total > 0) {
        badge.textContent = total > 99 ? '99+' : String(total);
        badge.classList.add('is-visible');
    } else {
        badge.textContent = '';
        badge.classList.remove('is-visible');
    }
}

function getRelativeDateLabel(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === today) return t('notifications.today') || 'Today';
    if (dateStr === yesterdayStr) return t('notifications.yesterday') || 'Yesterday';
    return formatDatePretty(dateStr, getLocale());
}

function renderNotificationDropdown(state = buildNotificationState()) {
    const list = document.getElementById('notification-list');
    if (!list) return;
    const sections = [];

    // Release notification - HIDDEN FOR NOW, will add in future
    /*
    if (state.releaseUnseen && state.latest) {
        const release = state.latest;
        const titleParts = [];
        if (release.version) titleParts.push(escapeHtml(release.version));
        const releaseTitle = resolveReleaseText(release.title);
        if (releaseTitle) titleParts.push(escapeHtml(releaseTitle));
        const headline = titleParts.join(' - ');
        const dateLabel = t('notifications.releaseMeta', { date: formatReleaseDate(release.date) });
        const summary = release.summary ? escapeHtml(resolveReleaseText(release.summary)) : '';
        sections.push(`
            <div class="notify-section notify-section--release">
                <div class="notify-section-heading">
                    <div class="notify-section-title">${t('notifications.releaseTitle')}</div>
                    <div class="notify-section-meta">${dateLabel}</div>
                </div>
                <div class="notify-section-body">
                    <div class="notify-section-release-title">${headline}</div>
                    ${summary ? `<div class="notify-section-release-summary">${summary}</div>` : ''}
                </div>
                <div class="notify-section-actions">
                    <button type="button" class="notify-link" data-action="openUpdatesFromNotification">${t('notifications.releaseCta')}</button>
                </div>
            </div>
        `);
    }
    */

    // Task notifications grouped by date
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const taskMap = new Map(tasks.map((task) => [task.id, task]));
    const includeBacklog = !!settings.emailNotificationsIncludeBacklog;

    state.taskNotificationsByDate.forEach(([date, notifications]) => {
        const dateLabel = getRelativeDateLabel(date);

        const startingTasks = notifications
            .filter(notif => notif.type === 'task_starting')
            .map(notif => taskMap.get(notif.taskId))
            .filter(task => task && task.status !== 'done' && (includeBacklog || task.status !== 'backlog'))
            .filter(task => normalizeISODate(task.startDate || '') === date);

        const dueTasks = notifications
            .filter(notif => notif.type === 'task_due')
            .map(notif => taskMap.get(notif.taskId))
            .filter(task => task && task.status !== 'done' && (includeBacklog || task.status !== 'backlog'))
            .filter(task => normalizeISODate(task.endDate || '') === date);

        if (startingTasks.length === 0 && dueTasks.length === 0) return; // Skip if all tasks are completed or filtered out

        // Sort by priority
        const sortTasks = (tasksArr) => [...tasksArr].sort((a, b) => {
            const pa = PRIORITY_ORDER[a.priority || 'low'] || 0;
            const pb = PRIORITY_ORDER[b.priority || 'low'] || 0;
            if (pa !== pb) return pb - pa;
            return String(a.title || '').localeCompare(String(b.title || ''));
        });

        const sortedStartingTasks = sortTasks(startingTasks);
        const sortedDueTasks = sortTasks(dueTasks);

        const renderTaskList = (tasksArr) => {
            return tasksArr.slice(0, 3).map((task) => {
                const project = task.projectId ? projectMap.get(task.projectId) : null;
                const projectName = project ? project.name : '';
                const projectColor = project ? getProjectColor(project.id) : '';
                const priorityKey = (task.priority || 'low').toLowerCase();
                const priorityLabel = ['high', 'medium', 'low'].includes(priorityKey)
                    ? getPriorityLabel(priorityKey)
                    : (priorityKey || '');

                return `
                    <div class="notify-task" data-task-id="${task.id}">
                        <div class="notify-task-header">
                            <div class="notify-task-title">${escapeHtml(task.title || t('tasks.untitled'))}</div>
                            <span class="notify-priority notify-priority--${priorityKey}">${escapeHtml(priorityLabel)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        let taskListHTML = '';
        let totalCount = 0;
        let totalOverflow = 0;

        if (sortedStartingTasks.length > 0) {
            const preview = sortedStartingTasks.slice(0, 3);
            const overflow = Math.max(sortedStartingTasks.length - preview.length, 0);
            totalCount += sortedStartingTasks.length;
            totalOverflow += overflow;
            taskListHTML += `<div class="notify-section-subheader notify-section-subheader--starting">🚀 STARTING <span class="notify-section-count notify-section-count--starting" aria-label="${sortedStartingTasks.length} starting tasks">${sortedStartingTasks.length}</span></div>`;
            taskListHTML += renderTaskList(preview);
            if (overflow > 0) {
                taskListHTML += `<div class="notify-task-overflow">+${overflow} more starting</div>`;
                taskListHTML += `<button type="button" class="notify-link notify-link--starting notify-link--full" data-action="openDueTodayFromNotification" data-date="${date}" data-date-field="startDate">View ${sortedStartingTasks.length} starting</button>`;
            }
        }

        if (sortedDueTasks.length > 0) {
            const preview = sortedDueTasks.slice(0, 3);
            const overflow = Math.max(sortedDueTasks.length - preview.length, 0);
            totalCount += sortedDueTasks.length;
            totalOverflow += overflow;
            if (sortedStartingTasks.length > 0) {
                taskListHTML += `<div style="height: 1px; background: var(--border); margin: 10px 0;"></div>`;
            }
            taskListHTML += `<div class="notify-section-subheader notify-section-subheader--due">🎯 DUE <span class="notify-section-count notify-section-count--due" aria-label="${sortedDueTasks.length} due tasks">${sortedDueTasks.length}</span></div>`;
            taskListHTML += renderTaskList(preview);
            if (overflow > 0) {
                taskListHTML += `<div class="notify-task-overflow">+${overflow} more due</div>`;
                taskListHTML += `<button type="button" class="notify-link notify-link--due notify-link--full" data-action="openDueTodayFromNotification" data-date="${date}" data-date-field="endDate">View ${sortedDueTasks.length} due</button>`;
            }
        }

        const today = new Date().toISOString().split('T')[0];
        const isToday = date === today;

        sections.push(`
            <div class="notify-section notify-section--due" data-date="${date}">
                <div class="notify-section-heading">
                    <div class="notify-section-title">
                        <span class="notify-section-title-text">${dateLabel}</span>
                        ${!isToday ? `<div class="notify-section-title-actions"><button type="button" class="notify-dismiss-btn" data-action="dismissDate" data-date="${date}" aria-label="Dismiss" title="Dismiss">x</button></div>` : ''}
                    </div>
                </div>
                <div class="notify-task-list">
                    ${taskListHTML}
                </div>
            </div>
        `);
    });

    if (sections.length === 0) {
        sections.push(`<div class="notify-empty">${t('notifications.empty')}</div>`);
    }

    list.innerHTML = sections.join('');
}

// Debounced version to prevent excessive updates
let updateNotificationStateTimer = null;
function updateNotificationState({ force = false } = {}) {
    // Clear any pending update
    if (updateNotificationStateTimer) {
        clearTimeout(updateNotificationStateTimer);
    }

    // Debounce by 100ms to batch rapid updates
    updateNotificationStateTimer = setTimeout(async () => {
        const state = await fetchNotificationState({ force });
        updateNotificationBadge(state);
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown && dropdown.classList.contains('active')) {
            renderNotificationDropdown(state);
        }
        updateNotificationStateTimer = null;
    }, 100);
}

// Immediate version for when you need instant update (e.g., opening dropdown)
async function updateNotificationStateImmediate({ force = false } = {}) {
    if (updateNotificationStateTimer) {
        clearTimeout(updateNotificationStateTimer);
        updateNotificationStateTimer = null;
    }
    const state = await fetchNotificationState({ force });
    updateNotificationBadge(state);
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown && dropdown.classList.contains('active')) {
        renderNotificationDropdown(state);
    }
}

async function markNotificationsSeen(state = null, { clearAll = false } = {}) {
    if (state && state.latest && state.latest.id) {
        setLastSeenReleaseId(state.latest.id);
    }
    if (USE_SERVER_NOTIFICATIONS) {
        const seenAt = new Date().toISOString();
        const token = getNotificationAuthToken();
        if (!token) {
            queueNotificationSeen(seenAt, clearAll);
            const cached = state || notificationStateCache.data || buildNotificationState();
            const updatedState = {
                ...cached,
                unreadCount: 0
            };
            notificationStateCache = { timestamp: Date.now(), data: updatedState };
            updateNotificationBadge(updatedState);
            return;
        }
        if (token) {
            try {
                const response = await fetch('/api/notifications/state', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        seenAt,
                        clearAll: !!clearAll
                    })
                });
                if (response.ok) {
                    const cached = state || notificationStateCache.data || buildNotificationState();
                    const updatedState = {
                        ...cached,
                        unreadCount: 0
                    };
                    notificationStateCache = { timestamp: Date.now(), data: updatedState };
                    updateNotificationBadge(updatedState);
                    return;
                }
                queueNotificationSeen(seenAt, clearAll);
            } catch (error) {
                console.warn('[notifications] failed to mark seen', error);
                queueNotificationSeen(new Date().toISOString(), clearAll);
            }
        }
    }

    markAllNotificationsRead();
    const updatedState = buildNotificationState();
    updateNotificationBadge(updatedState);
}

async function dismissNotificationByDate(date) {
    if (USE_SERVER_NOTIFICATIONS) {
        const seenAt = new Date().toISOString();
        const token = getNotificationAuthToken();
        if (!token) {
            // Offline mode - store in pending queue
            savePendingNotificationSeen({ seenAt, dismissDate: date });
            // Immediately update UI to hide the dismissed date
            if (notificationStateCache.data && notificationStateCache.data.taskNotificationsByDate) {
                const updatedState = {
                    ...notificationStateCache.data,
                    taskNotificationsByDate: notificationStateCache.data.taskNotificationsByDate.filter(([d]) => d !== date)
                };
                notificationStateCache = { timestamp: Date.now(), data: updatedState };
                updateNotificationBadge(updatedState);
                renderNotificationDropdown(updatedState);
            }
            return;
        }
        try {
            const response = await fetch('/api/notifications/state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    seenAt,
                    dismissDate: date
                })
            });
            if (response.ok) {
                // Immediately update UI to hide the dismissed date
                if (notificationStateCache.data && notificationStateCache.data.taskNotificationsByDate) {
                    const updatedState = {
                        ...notificationStateCache.data,
                        taskNotificationsByDate: notificationStateCache.data.taskNotificationsByDate.filter(([d]) => d !== date)
                    };
                    notificationStateCache = { timestamp: Date.now(), data: updatedState };
                    updateNotificationBadge(updatedState);
                    renderNotificationDropdown(updatedState);
                }
                return;
            }
            // If failed, queue for later
            savePendingNotificationSeen({ seenAt, dismissDate: date });
        } catch (error) {
            console.warn('[notifications] failed to dismiss date', error);
            savePendingNotificationSeen({ seenAt, dismissDate: date });
        }
    } else {
        // Local storage mode
        dismissNotificationsByDate(date);
        updateNotificationState();
    }
}

function markLatestReleaseSeen() {
    const latest = getLatestReleaseNote();
    if (!latest || !latest.id) return;
    setLastSeenReleaseId(latest.id);
    updateNotificationState();
}

function closeNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    const toggle = document.getElementById('notification-toggle');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
    if (toggle) toggle.classList.remove('active');
    setNotificationScrollLock(false);
}

function setNotificationScrollLock(isLocked) {
    const isMobile = (typeof window.matchMedia === 'function')
        ? window.matchMedia('(max-width: 768px)').matches
        : false;
    if (!isMobile) return;
    document.body.classList.toggle('notify-scroll-lock', !!isLocked);
}

function setupNotificationMenu() {
    const toggle = document.getElementById('notification-toggle');
    const dropdown = document.getElementById('notification-dropdown');
    if (!toggle || !dropdown || toggle.dataset.bound) return;
    toggle.dataset.bound = 'true';

    toggle.addEventListener('click', async (event) => {
        event.stopPropagation();
        const isOpen = dropdown.classList.contains('active');
        if (isOpen) {
            closeNotificationDropdown();
            return;
        }
        closeUserDropdown();
        const state = await fetchNotificationState({ force: true });
        renderNotificationDropdown(state);
        dropdown.classList.add('active');
        toggle.classList.add('active');
        setNotificationScrollLock(true);
        await markNotificationsSeen(state);
    });

    if (!dropdown.dataset.outsideListener) {
        dropdown.dataset.outsideListener = 'true';
        document.addEventListener('click', (event) => {
            if (!dropdown.classList.contains('active')) return;
            const target = event.target;
            if (!target) return;
            if (dropdown.contains(target) || toggle.contains(target)) return;
            closeNotificationDropdown();
        });
    }

    // Event delegation for notification actions
    if (!dropdown.dataset.actionListener) {
        dropdown.dataset.actionListener = 'true';
        dropdown.addEventListener('click', async (event) => {
            const target = event.target;
            if (!target) return;

            // Check if clicking on a task card
            const taskCard = target.closest('.notify-task');
            if (taskCard && taskCard.dataset.taskId) {
                event.preventDefault();
                event.stopPropagation();
                const taskId = parseInt(taskCard.dataset.taskId, 10);
                if (!isNaN(taskId)) {
                    closeNotificationDropdown();
                    openTaskDetails(taskId);
                }
                return;
            }

            const actionBtn = target.closest('[data-action]');
            if (!actionBtn) return;

            event.preventDefault();
            event.stopPropagation();

            const action = actionBtn.dataset.action;
            const date = actionBtn.dataset.date;

            if (action === 'dismissDate' && date) {
                await dismissNotificationByDate(date);
            } else if (action === 'dismissAll') {
                if (USE_SERVER_NOTIFICATIONS) {
                    const currentState = notificationStateCache.data || await fetchNotificationState({ force: true });
                    await markNotificationsSeen(currentState, { clearAll: true });
                    updateNotificationState({ force: true });
                } else {
                    dismissAllNotifications();
                    updateNotificationState();
                }
            } else if (action === 'openUpdatesFromNotification') {
                openUpdatesFromNotification();
            } else if (action === 'openDueTodayFromNotification') {
                if (date) {
                    const dateField = actionBtn.getAttribute('data-date-field') || 'endDate';
                    openDueTodayFromNotification(date, dateField);
                }
            }
        });
    }

    updateNotificationState();
}

function openUpdatesFromNotification() {
    closeNotificationDropdown();
    if (window.location.hash.replace('#', '') === 'updates') {
        showPage('updates');
        return;
    }
    window.location.hash = 'updates';
}

function openDueTodayFromNotification(dateStr, dateField = 'endDate') {
    closeNotificationDropdown();

    // Check if date is today
    const today = new Date().toISOString().split('T')[0];
    const isToday = dateStr === today;
    const includeBacklog = !!settings.emailNotificationsIncludeBacklog;
    const statusList = includeBacklog
        ? 'backlog,todo,progress,review'
        : 'todo,progress,review';

    // Use preset filters for today, date range filters for other dates
    let targetHash;
    if (isToday) {
        const preset = dateField === 'startDate' ? 'start-today' : 'end-today';
        targetHash = `#tasks?view=list&datePreset=${preset}&status=${statusList}`;
    } else {
        // For past/future dates, use date range filter
        targetHash = `#tasks?view=list&dateFrom=${dateStr}&dateTo=${dateStr}&dateField=${dateField}&status=${statusList}`;
    }

    if (window.location.hash === targetHash) {
        showPage('tasks');
        return;
    }
    window.location.hash = targetHash.replace('#', '');
}

// Kanban sort state: 'priority' (default) or 'manual'
let sortMode = 'priority'; // 'priority' or 'manual'
let manualTaskOrder = {}; // { columnName: [taskId, ...] }

// Toggle between priority/manual sorting
function toggleSortMode() {
    // One-way action: enforce priority ordering
    sortMode = 'priority';
    // Clear any manual order so we show true priority ordering
    manualTaskOrder = {};
    const sortBtn = document.getElementById('sort-btn');
    const sortLabel = document.getElementById('sort-label');
    const sortIcon = document.getElementById('sort-icon');
    if (sortBtn) sortBtn.classList.remove('manual');
    if (sortLabel) sortLabel.textContent = t('tasks.sort.orderByPriority');
    if (sortIcon) sortIcon.textContent = '⬆️';
    renderTasks();
    saveSortPreferences();
}

async function saveSortPreferences() {
    try {
        await saveSortStateData(sortMode, manualTaskOrder);
    } catch (e) {
        // Storage client may be unavailable in some environments; fallback to localStorage
        try {
            localStorage.setItem('sortMode', sortMode);
            localStorage.setItem('manualTaskOrder', JSON.stringify(manualTaskOrder));
        } catch (err) {}
    }
}

async function loadSortPreferences() {
    try {
        const { sortMode: savedMode, manualTaskOrder: savedOrder } = await loadSortStateData();
        if (savedMode) sortMode = savedMode;
        if (savedOrder) manualTaskOrder = savedOrder;
    } catch (e) {
        try {
            const lm = localStorage.getItem('sortMode');
            const lo = localStorage.getItem('manualTaskOrder');
            if (lm) sortMode = lm;
            if (lo) manualTaskOrder = JSON.parse(lo);
        } catch (err) {}
    }
    // Normalize/guard persisted values (older versions used 'auto' to mean priority ordering)
    if (sortMode === 'auto' || (sortMode !== 'priority' && sortMode !== 'manual')) {
        sortMode = 'priority';
    }
    updateSortUI();
}

function updateSortUI() {
    const sortToggle = document.getElementById('sort-toggle');
    const sortBtn = document.getElementById('sort-btn');
    const sortLabel = document.getElementById('sort-label');
    const sortIcon = document.getElementById('sort-icon');
    const kanbanUpdatedGroup = document.getElementById('group-kanban-updated');
    if (!sortToggle || !sortBtn) return;
    // Show only when Kanban board is visible
    const kanban = document.querySelector('.kanban-board');
    const isKanban = kanban && !kanban.classList.contains('hidden');
    sortToggle.style.display = isKanban ? 'flex' : 'none';
    const isList = document.getElementById('list-view')?.classList.contains('active');
    const isCalendar = document.getElementById('calendar-view')?.classList.contains('active');
    const showUpdated = isKanban || isList || isCalendar;
    if (kanbanUpdatedGroup) kanbanUpdatedGroup.style.display = showUpdated ? '' : 'none';
    try { updateKanbanUpdatedFilterUI(); } catch (e) {}
    // Keep the button as a static one-time action label (Order by Priority).
    // Manual mode may exist internally (via dragging), but the button UI should not change to "Manual".
    try { sortBtn.classList.remove('manual'); } catch (e) {}
    if (sortLabel) sortLabel.textContent = t('tasks.sort.orderByPriority');
    if (sortIcon) sortIcon.textContent = '⇅';

    // If the currently visible ordering already matches priority ordering, disable the button
    try {
        // Using imported PRIORITY_ORDER
        const statuses = window.kanbanShowBacklog === true
            ? ['backlog', 'todo', 'progress', 'review', 'done']
            : ['todo', 'progress', 'review', 'done'];
        let filtered = typeof getFilteredTasks === 'function' ? getFilteredTasks() : tasks.slice();
        const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
        if (cutoff !== null) {
            filtered = filtered.filter((t) => getTaskUpdatedTime(t) >= cutoff);
        }

        const arraysEqual = (a, b) => {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
            return true;
        };

        let allMatch = true;
        for (const status of statuses) {
            const visibleNodes = Array.from(document.querySelectorAll(`#${status}-tasks .task-card`));
            const visibleIds = visibleNodes.map(n => parseInt(n.dataset.taskId, 10)).filter(n => !Number.isNaN(n));

            const expected = filtered
                .filter(t => t.status === status)
                .slice()
                .sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0))
                .map(t => t.id);

            if (!arraysEqual(visibleIds, expected)) {
                allMatch = false;
                break;
            }
        }

        if (allMatch) {
            sortBtn.disabled = true;
            sortBtn.classList.add('disabled');
            sortBtn.setAttribute('aria-disabled', 'true');
        } else {
            sortBtn.disabled = false;
            sortBtn.classList.remove('disabled');
            sortBtn.removeAttribute('aria-disabled');
        }
    } catch (e) {
        // If anything goes wrong, keep the button enabled
        sortBtn.disabled = false;
        sortBtn.classList.remove('disabled');
    }
}

// Add this near the top of app.js after imports

async function persistAll() {
    if (isInitializing) return;
    pendingSaves++;
    try {
        await saveAllData(tasks, projects, feedbackItems);
    } catch (error) {
        console.error("Error persisting data:", error);
        showErrorNotification(t('error.saveDataFailed'));
        throw error;
    } finally {
        pendingSaves--;
    }
}

async function saveProjects() {
    if (isInitializing) return;
    pendingSaves++;
    try {
        await saveProjectsData(projects);
    } catch (error) {
        console.error("Error saving projects:", error);
        showErrorNotification(t('error.saveProjectsFailed'));
        throw error;
    } finally {
        pendingSaves--;
    }
}

async function saveTasks() {
    if (isInitializing) return;
    pendingSaves++;
    try {
        await saveTasksData(tasks);
    } catch (error) {
        console.error("Error saving tasks:", error);
        showErrorNotification(t('error.saveTasksFailed'));
        throw error;
    } finally {
        pendingSaves--;
    }
}

async function persistFeedbackItemsToStorage() {
    await saveFeedbackItemsData(feedbackItems);
}

let feedbackSaveTimeoutId = null;
let feedbackSaveInProgress = false;
let feedbackSaveNeedsRun = false;
let feedbackRevision = 0;
let feedbackDirty = false;
let feedbackSaveError = false;
let feedbackShowSavedStatus = false;
let feedbackSaveStatusHideTimer = null;
let feedbackSavePendingErrorHandlers = [];
let feedbackSaveNextErrorHandlers = [];
const FEEDBACK_SAVE_DEBOUNCE_MS = 500;
const FEEDBACK_DELTA_QUEUE_KEY = "feedbackDeltaQueue";
const FEEDBACK_LOCALSTORAGE_DEBOUNCE_MS = 1000; // Debounce localStorage writes to reduce blocking
const FEEDBACK_FLUSH_TIMEOUT_MS = 10000; // Reduce timeout from 20s to 10s for faster feedback
const FEEDBACK_MAX_RETRY_ATTEMPTS = 3; // Max retry attempts before giving up
const FEEDBACK_RETRY_DELAY_BASE_MS = 2000; // Base delay for exponential backoff (2s, 4s, 8s)
const FEEDBACK_DEBUG_LOGS = true;
let feedbackDeltaQueue = [];
let feedbackDeltaInProgress = false;
let feedbackDeltaFlushTimer = null;
let feedbackLocalStorageTimer = null;
let feedbackDeltaRetryCount = 0; // Track retry attempts
const feedbackDeltaErrorHandlers = new Map();

function loadFeedbackDeltaQueue() {
    try {
        const raw = localStorage.getItem(FEEDBACK_DELTA_QUEUE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        feedbackDeltaQueue = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        feedbackDeltaQueue = [];
    }
}

function persistFeedbackDeltaQueue() {
    try {
        localStorage.setItem(FEEDBACK_DELTA_QUEUE_KEY, JSON.stringify(feedbackDeltaQueue));
    } catch (e) {}
}

function logFeedbackDebug(message, meta) {
    if (!FEEDBACK_DEBUG_LOGS) return;
    if (meta) {
        console.log(`[feedback-debug] ${message}`, meta);
    } else {
        console.log(`[feedback-debug] ${message}`);
    }
}

function summarizeFeedbackOperations(operations) {
    const summary = {
        total: operations.length,
        add: 0,
        update: 0,
        delete: 0,
        maxScreenshotChars: 0,
        totalScreenshotChars: 0
    };
    for (const op of operations) {
        if (!op || !op.action) continue;
        if (op.action === "add") summary.add++;
        if (op.action === "update") summary.update++;
        if (op.action === "delete") summary.delete++;
        if (op.item && typeof op.item.screenshotUrl === "string") {
            const len = op.item.screenshotUrl.length;
            summary.totalScreenshotChars += len;
            if (len > summary.maxScreenshotChars) summary.maxScreenshotChars = len;
        }
    }
    return summary;
}

/**
 * Debounced version of persistFeedbackDeltaQueue.
 * Reduces localStorage writes from N (every add) to 1 per second max.
 * Improves performance by reducing synchronous blocking operations.
 */
function persistFeedbackDeltaQueueDebounced() {
    if (feedbackLocalStorageTimer) {
        clearTimeout(feedbackLocalStorageTimer);
    }
    feedbackLocalStorageTimer = setTimeout(() => {
        persistFeedbackDeltaQueue();
        feedbackLocalStorageTimer = null;
    }, FEEDBACK_LOCALSTORAGE_DEBOUNCE_MS);
}

function applyFeedbackDeltaToLocal(delta) {
    if (!delta || !delta.action) return;
    if (delta.action === "add" && delta.item) {
        const exists = feedbackItems.some((f) => f && f.id === delta.item.id);
        if (!exists) {
            feedbackItems.unshift(delta.item);
            if (!feedbackIndex.includes(delta.item.id)) {
                feedbackIndex.unshift(delta.item.id);
            }
        }
        return;
    }
    if (delta.action === "update" && delta.item && delta.item.id != null) {
        const idx = feedbackItems.findIndex((f) => f && f.id === delta.item.id);
        if (idx >= 0) {
            feedbackItems[idx] = { ...feedbackItems[idx], ...delta.item };
        }
        return;
    }
    if (delta.action === "delete" && delta.targetId != null) {
        feedbackItems = feedbackItems.filter((f) => !f || f.id !== delta.targetId);
        feedbackIndex = feedbackIndex.filter((id) => id !== delta.targetId);
    }
}

function scheduleFeedbackDeltaFlush(delayMs = 300) {
    if (feedbackDeltaFlushTimer) return;
    feedbackDeltaFlushTimer = setTimeout(() => {
        feedbackDeltaFlushTimer = null;
        flushFeedbackDeltaQueue();
    }, delayMs);
}

function enqueueFeedbackDelta(delta, options = {}) {
    if (!delta || !delta.action) return;
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...delta };
    feedbackDeltaQueue.push(entry);
    persistFeedbackDeltaQueueDebounced(); // Use debounced version to reduce localStorage writes
    markFeedbackDirty();
    updateFeedbackSaveStatus();

    if (typeof options.onError === "function") {
        feedbackDeltaErrorHandlers.set(entry.id, options.onError);
    }

    scheduleFeedbackDeltaFlush();
}

async function flushFeedbackDeltaQueue() {
    if (feedbackDeltaInProgress || feedbackDeltaQueue.length === 0) return;
    if (!navigator.onLine) {
        updateFeedbackSaveStatus();
        return;
    }

    feedbackDeltaInProgress = true;
    pendingSaves++;
    try {
        // Collect all operations from the queue
        const operations = [];
        const queueSnapshot = [...feedbackDeltaQueue];

        for (const entry of queueSnapshot) {
            if (entry.action === "add" && entry.item) {
                operations.push({ action: "add", item: entry.item });
            } else if (entry.action === "update" && entry.item && entry.item.id != null) {
                operations.push({ action: "update", item: entry.item });
            } else if (entry.action === "delete" && entry.targetId != null) {
                operations.push({ action: "delete", id: entry.targetId });
            }
        }

        // Send all operations in a single batch API call with shorter timeout
        if (operations.length > 0) {
            const flushStartedAt = (typeof performance !== "undefined" && performance.now)
                ? performance.now()
                : Date.now();
            const payload = { operations };
            let payloadBytes = null;
            try {
                payloadBytes = JSON.stringify(payload).length;
            } catch (e) {}
            logFeedbackDebug("flush:start", {
                queueLength: feedbackDeltaQueue.length,
                operationCount: operations.length,
                payloadBytes,
                summary: summarizeFeedbackOperations(operations)
            });

            const result = await batchFeedbackOperations(operations, FEEDBACK_FLUSH_TIMEOUT_MS);

            // Update local index from server response
            if (result.success && result.index) {
                feedbackIndex = result.index;
            }

            // Clear the queue and persist (only clear items that were processed)
            feedbackDeltaQueue.splice(0, queueSnapshot.length);
            persistFeedbackDeltaQueue();

            // Reset retry count on success
            feedbackDeltaRetryCount = 0;

            const flushEndedAt = (typeof performance !== "undefined" && performance.now)
                ? performance.now()
                : Date.now();
            logFeedbackDebug("flush:success", {
                durationMs: Math.round(flushEndedAt - flushStartedAt),
                processed: result.processed,
                total: result.total,
                success: result.success,
                indexSize: Array.isArray(result.index) ? result.index.length : null
            });
        }

        markFeedbackSaved();
    } catch (error) {
        console.error('Feedback flush error:', error);
        logFeedbackDebug("flush:error", {
            message: error && error.message ? error.message : String(error),
            name: error && error.name ? error.name : null,
            retryCount: feedbackDeltaRetryCount + 1,
            queueLength: feedbackDeltaQueue.length
        });

        // Increment retry count
        feedbackDeltaRetryCount++;

        // Check if we should retry or give up
        if (feedbackDeltaRetryCount >= FEEDBACK_MAX_RETRY_ATTEMPTS) {
            // Max retries reached - give up and show persistent error
            console.error(`Feedback save failed after ${FEEDBACK_MAX_RETRY_ATTEMPTS} attempts. Queue will be kept for later.`);
            markFeedbackSaveError();
            feedbackDeltaRetryCount = 0; // Reset for next batch

            // Don't clear the queue - keep for manual retry or next app load
        } else {
            // Schedule retry with exponential backoff
            const retryDelay = FEEDBACK_RETRY_DELAY_BASE_MS * Math.pow(2, feedbackDeltaRetryCount - 1);
            console.log(`Feedback save failed. Retrying in ${retryDelay}ms (attempt ${feedbackDeltaRetryCount}/${FEEDBACK_MAX_RETRY_ATTEMPTS})`);
            markFeedbackSaveError();
            logFeedbackDebug("flush:retry-scheduled", {
                retryDelayMs: retryDelay,
                attempt: feedbackDeltaRetryCount,
                maxAttempts: FEEDBACK_MAX_RETRY_ATTEMPTS
            });

            // Schedule retry
            setTimeout(() => {
                flushFeedbackDeltaQueue();
            }, retryDelay);
        }

        // Call error handlers for first failed item
        const failed = feedbackDeltaQueue[0];
        if (failed) {
            const handler = feedbackDeltaErrorHandlers.get(failed.id);
            if (handler) {
                try { handler(error); } catch (e) {}
                feedbackDeltaErrorHandlers.delete(failed.id);
            }
        }
    } finally {
        feedbackDeltaInProgress = false;
        pendingSaves = Math.max(0, pendingSaves - 1);
        updateFeedbackSaveStatus();
    }
}

function clearFeedbackSaveStatusHideTimer() {
    if (feedbackSaveStatusHideTimer !== null) {
        clearTimeout(feedbackSaveStatusHideTimer);
        feedbackSaveStatusHideTimer = null;
    }
}

function hideFeedbackSaveStatusSoon() {
    clearFeedbackSaveStatusHideTimer();
    feedbackSaveStatusHideTimer = setTimeout(() => {
        const statusEl = document.getElementById('feedback-save-status');
        if (!statusEl) return;
        statusEl.classList.add('is-hidden');
        feedbackShowSavedStatus = false;
        const textEl = statusEl.querySelector('.feedback-save-text');
        if (textEl) textEl.textContent = '';
    }, 1600);
}

function updateFeedbackSaveStatus() {
    const statusEl = document.getElementById('feedback-save-status');
    if (!statusEl) return;

    const textEl = statusEl.querySelector('.feedback-save-text') || statusEl;
    let status = 'saved';
    if (feedbackDirty || feedbackDeltaQueue.length > 0) {
        if (!navigator.onLine) {
            status = 'offline';
        } else if (feedbackDeltaInProgress || feedbackDeltaQueue.length > 0 || feedbackSaveInProgress || feedbackSaveTimeoutId !== null) {
            status = 'saving';
        } else if (feedbackSaveError) {
            status = 'error';
        } else {
            status = 'saving';
        }
    }

    const statusKey = {
        saved: 'feedback.saveStatus.saved',
        saving: 'feedback.saveStatus.saving',
        error: 'feedback.saveStatus.error',
        offline: 'feedback.saveStatus.offline'
    }[status];

    textEl.textContent = t(statusKey);
    const shouldShow = status !== 'saved' || feedbackShowSavedStatus;
    statusEl.classList.toggle('is-hidden', !shouldShow);
    statusEl.classList.toggle('is-saving', status === 'saving');
    statusEl.classList.toggle('is-error', status === 'error');
    statusEl.classList.toggle('is-offline', status === 'offline');
    statusEl.classList.toggle('is-saved', status === 'saved');
}

function updateFeedbackPlaceholderForViewport() {
    const input = document.getElementById('feedback-description');
    if (!input) return;
    const isCompact = window.matchMedia('(max-width: 768px)').matches;
    const key = isCompact ? 'feedback.descriptionPlaceholderShort' : 'feedback.descriptionPlaceholder';
    input.setAttribute('placeholder', t(key));
}

function markFeedbackDirty() {
    feedbackDirty = true;
    feedbackSaveError = false;
    clearFeedbackSaveStatusHideTimer();
    updateFeedbackSaveStatus();
}

function markFeedbackSaved() {
    feedbackDirty = false;
    feedbackSaveError = false;
    feedbackShowSavedStatus = true;
    updateFeedbackSaveStatus();
    hideFeedbackSaveStatusSoon();
}

function markFeedbackSaveError() {
    feedbackDirty = true;
    feedbackSaveError = true;
    clearFeedbackSaveStatusHideTimer();
    updateFeedbackSaveStatus();
}

function queueFeedbackSave(options = {}) {
    const delayMs =
        typeof options === 'number'
            ? options
            : (options.delayMs ? options.delayMs : FEEDBACK_SAVE_DEBOUNCE_MS);
    const onError =
        typeof options === 'object' && typeof options.onError === 'function'
            ? options.onError
            : null;

    if (isInitializing) return;
    markFeedbackDirty();

    if (onError) {
        if (feedbackSaveInProgress) {
            feedbackSaveNextErrorHandlers.push(onError);
        } else {
            feedbackSavePendingErrorHandlers.push(onError);
        }
    }

    // If a save is already queued, it will persist the latest state.
    if (feedbackSaveTimeoutId !== null) return;

    // If a save is currently running, queue one more pass afterwards.
    if (feedbackSaveInProgress) {
        feedbackSaveNeedsRun = true;
        return;
    }

    pendingSaves++;
    feedbackSaveTimeoutId = setTimeout(() => {
        feedbackSaveTimeoutId = null;
        flushFeedbackSave();
    }, delayMs);
}

async function flushFeedbackSave() {
    if (feedbackSaveInProgress) {
        feedbackSaveNeedsRun = true;
        return;
    }

    const errorHandlers = feedbackSavePendingErrorHandlers;
    feedbackSavePendingErrorHandlers = [];

    feedbackSaveInProgress = true;
    try {
        await persistFeedbackItemsToStorage();
        markFeedbackSaved();
    } catch (error) {
        console.error("Error saving feedback:", error);
        markFeedbackSaveError();
        showErrorNotification(t('error.saveFeedbackFailed'));
        for (const handler of errorHandlers) {
            try {
                handler(error);
            } catch (e) {
                console.error('Feedback save error handler failed:', e);
            }
        }
    } finally {
        feedbackSaveInProgress = false;
        pendingSaves = Math.max(0, pendingSaves - 1);

        if (feedbackSaveNeedsRun) {
            feedbackSaveNeedsRun = false;
            if (feedbackSaveNextErrorHandlers.length > 0) {
                feedbackSavePendingErrorHandlers.push(...feedbackSaveNextErrorHandlers);
                feedbackSaveNextErrorHandlers = [];
            }
            queueFeedbackSave({ delayMs: 200 });
        }
    }
}

async function saveFeedback() {
    if (isInitializing) return;
    markFeedbackDirty();
    pendingSaves++;
    try {
        await persistFeedbackItemsToStorage();
        markFeedbackSaved();
    } catch (error) {
        console.error("Error saving feedback:", error);
        markFeedbackSaveError();
        showErrorNotification(t('error.saveFeedbackFailed'));
        throw error;
    } finally {
        pendingSaves--;
    }
}

async function saveProjectColors() {
    if (isInitializing) return;
    try {
        await saveProjectColorsData(projectColorMap);
    } catch (error) {
        console.error("Error saving project colors:", error);
        showErrorNotification(t('error.saveProjectColorsFailed'));
    }
}

async function loadProjectColors() {
    try {
        projectColorMap = await loadProjectColorsData();
    } catch (error) {
        console.error("Error loading project colors:", error);
        projectColorMap = {};
    }
}

async function saveSettings() {
    try {
        await saveSettingsData(settings);
    } catch (e) {
        console.error("Error saving settings:", e);
    }

    // Clear dirty state when settings are successfully saved (or attempted)
    window.initialSettingsFormState = null;
    window.settingsFormIsDirty = false;
}

async function loadSettings() {
    try {
        const loadedSettings = await loadSettingsData();
        if (loadedSettings && typeof loadedSettings === "object") {
            settings = { ...settings, ...loadedSettings };
            settings.language = normalizeLanguage(settings.language);
        }
    } catch (e) {
        console.error("Error loading settings:", e);
    }
}

function normalizeHHMM(value) {
    if (!value || typeof value !== "string") return "";
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return "";
    if (hours < 0 || hours > 23) return "";
    if (minutes < 0 || minutes > 59) return "";
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function snapHHMMToStep(hhmm, stepMinutes) {
    const normalized = normalizeHHMM(hhmm);
    if (!normalized) return "";
    const [hoursStr, minutesStr] = normalized.split(":");
    const total = Number(hoursStr) * 60 + Number(minutesStr);
    const step = Number(stepMinutes) || 1;
    const snapped = Math.round(total / step) * step;
    const wrapped = ((snapped % (24 * 60)) + (24 * 60)) % (24 * 60);
    const outHours = Math.floor(wrapped / 60);
    const outMinutes = wrapped % 60;
    return `${String(outHours).padStart(2, "0")}:${String(outMinutes).padStart(2, "0")}`;
}

function hhmmToMinutes(hhmm) {
    const normalized = normalizeHHMM(hhmm);
    if (!normalized) return null;
    const [hoursStr, minutesStr] = normalized.split(":");
    return Number(hoursStr) * 60 + Number(minutesStr);
}

function minutesToHHMM(totalMinutes) {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Number(totalMinutes)));
    const hours = Math.floor(clamped / 60);
    const minutes = clamped % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function clampHHMMToRange(hhmm, startHHMM, endHHMM) {
    const valueMinutes = hhmmToMinutes(hhmm);
    const startMinutes = hhmmToMinutes(startHHMM);
    const endMinutes = hhmmToMinutes(endHHMM);
    if (valueMinutes == null || startMinutes == null || endMinutes == null) return "";
    if (valueMinutes < startMinutes) return startHHMM;
    if (valueMinutes > endMinutes) return endHHMM;
    return hhmm;
}

function isValidEmailAddress(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// ===== Portal-based floating dropdown for notification time =====
let notificationTimePortalEl = null;
let notificationTimePortalAnchor = null;
let notificationTimeZonePortalEl = null;
let notificationTimeZonePortalAnchor = null;

function buildNotificationTimeOptionsHTML(selectedValue) {
    const start = 8 * 60;
    const end = 18 * 60;
    const step = 30;
    const selected = String(selectedValue || "");
    const bits = [];
    for (let minutes = start; minutes <= end; minutes += step) {
        const hhmm = minutesToHHMM(minutes);
        const selectedClass = hhmm === selected ? " selected" : "";
        bits.push(`<div class="time-option${selectedClass}" role="option" data-value="${hhmm}">${hhmm}</div>`);
    }
    return bits.join("");
}

function buildNotificationTimeZoneOptionsHTML(selectEl) {
    if (!selectEl || !selectEl.options) return "";
    const selected = String(selectEl.value || "");
    const bits = [];
    Array.from(selectEl.options).forEach((opt) => {
        const value = String(opt.value || "");
        const label = String(opt.textContent || value);
        const selectedClass = value === selected ? " selected" : "";
        bits.push(`<div class="tz-option${selectedClass}" role="option" data-value="${escapeHtml(value)}">${escapeHtml(label)}</div>`);
    });
    return bits.join("");
}

function showNotificationTimeZonePortal(triggerBtn, selectEl, valueEl) {
    if (!triggerBtn || !selectEl) return;

    if (!notificationTimeZonePortalEl) {
        notificationTimeZonePortalEl = document.createElement("div");
        notificationTimeZonePortalEl.className = "tz-options-portal";
        document.body.appendChild(notificationTimeZonePortalEl);
    }

    notificationTimeZonePortalEl.innerHTML = buildNotificationTimeZoneOptionsHTML(selectEl);
    notificationTimeZonePortalEl.style.display = "block";

    notificationTimeZonePortalAnchor = triggerBtn;
    positionNotificationTimeZonePortal(triggerBtn, notificationTimeZonePortalEl);
    requestAnimationFrame(() => positionNotificationTimeZonePortal(triggerBtn, notificationTimeZonePortalEl));

    triggerBtn.setAttribute("aria-expanded", "true");

    const onClick = (evt) => {
        evt.stopPropagation();
        const opt = evt.target.closest(".tz-option");
        if (!opt) return;
        const value = opt.dataset.value;
        if (!value) return;
        selectEl.value = value;
        if (valueEl) {
            const label = selectEl.options?.[selectEl.selectedIndex]?.textContent || value;
            valueEl.textContent = label;
        }
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        hideNotificationTimeZonePortal();
    };

    notificationTimeZonePortalEl.onclick = onClick;
    setTimeout(() => document.addEventListener("click", handleNotificationTimeZoneOutsideClick, true), 0);
    window.addEventListener("scroll", handleNotificationTimeZoneReposition, true);
    window.addEventListener("resize", handleNotificationTimeZoneReposition, true);
    document.addEventListener("keydown", handleNotificationTimeZoneEsc, true);
}

function hideNotificationTimeZonePortal() {
    if (!notificationTimeZonePortalEl) return;
    notificationTimeZonePortalEl.style.display = "none";
    notificationTimeZonePortalEl.innerHTML = "";
    notificationTimeZonePortalEl.onclick = null;
    if (notificationTimeZonePortalAnchor) {
        notificationTimeZonePortalAnchor.setAttribute("aria-expanded", "false");
    }
    notificationTimeZonePortalAnchor = null;
    document.removeEventListener("click", handleNotificationTimeZoneOutsideClick, true);
    window.removeEventListener("scroll", handleNotificationTimeZoneReposition, true);
    window.removeEventListener("resize", handleNotificationTimeZoneReposition, true);
    document.removeEventListener("keydown", handleNotificationTimeZoneEsc, true);
}

function handleNotificationTimeZoneOutsideClick(evt) {
    const target = evt.target;
    if (!notificationTimeZonePortalEl || notificationTimeZonePortalEl.style.display === "none") return;
    if (notificationTimeZonePortalEl.contains(target)) return;
    if (notificationTimeZonePortalAnchor && notificationTimeZonePortalAnchor.contains(target)) return;
    hideNotificationTimeZonePortal();
}

function handleNotificationTimeZoneReposition() {
    if (!notificationTimeZonePortalAnchor || !notificationTimeZonePortalEl || notificationTimeZonePortalEl.style.display === "none") return;
    positionNotificationTimeZonePortal(notificationTimeZonePortalAnchor, notificationTimeZonePortalEl);
}

function handleNotificationTimeZoneEsc(evt) {
    if (evt.key !== "Escape") return;
    if (!notificationTimeZonePortalEl || notificationTimeZonePortalEl.style.display === "none") return;
    evt.preventDefault();
    hideNotificationTimeZonePortal();
}

function positionNotificationTimeZonePortal(button, portal) {
    const rect = button.getBoundingClientRect();
    portal.style.width = `${rect.width}px`;
    const viewportH = window.innerHeight;
    const portalHeight = Math.min(portal.scrollHeight, 240);
    const spaceBelow = viewportH - rect.bottom;
    const showAbove = spaceBelow < portalHeight + 12;
    const top = showAbove ? Math.max(8, rect.top - portalHeight - 4) : rect.bottom + 4;
    const viewportW = window.innerWidth;
    const portalWidth = portal.getBoundingClientRect().width || rect.width;
    const desiredLeft = rect.left;
    const clampedLeft = Math.min(
        Math.max(8, desiredLeft),
        Math.max(8, viewportW - portalWidth - 8)
    );
    portal.style.left = `${clampedLeft}px`;
    portal.style.top = `${top}px`;
}

function showNotificationTimePortal(triggerBtn, hiddenInput, valueEl) {
    if (!triggerBtn || !hiddenInput) return;

    if (!notificationTimePortalEl) {
        notificationTimePortalEl = document.createElement("div");
        notificationTimePortalEl.className = "time-options-portal";
        document.body.appendChild(notificationTimePortalEl);
    }

    const currentValue = String(hiddenInput.value || "").trim();
    notificationTimePortalEl.innerHTML = buildNotificationTimeOptionsHTML(currentValue);
    notificationTimePortalEl.style.display = "block";

    notificationTimePortalAnchor = triggerBtn;
    positionNotificationTimePortal(triggerBtn, notificationTimePortalEl);
    requestAnimationFrame(() => positionNotificationTimePortal(triggerBtn, notificationTimePortalEl));

    triggerBtn.setAttribute("aria-expanded", "true");

    const onClick = (evt) => {
        evt.stopPropagation();
        const opt = evt.target.closest(".time-option");
        if (!opt) return;
        const value = opt.dataset.value;
        if (!value) return;
        hiddenInput.value = value;
        if (valueEl) valueEl.textContent = value;
        if (window.markSettingsDirtyIfNeeded) window.markSettingsDirtyIfNeeded();
        hideNotificationTimePortal();
    };

    notificationTimePortalEl.addEventListener("click", onClick);
    setTimeout(() => document.addEventListener("click", handleNotificationTimeOutsideClick, true), 0);
    window.addEventListener("scroll", handleNotificationTimeReposition, true);
    window.addEventListener("resize", handleNotificationTimeReposition, true);
    document.addEventListener("keydown", handleNotificationTimeEsc, true);
}

function hideNotificationTimePortal() {
    if (!notificationTimePortalEl) return;
    notificationTimePortalEl.style.display = "none";
    notificationTimePortalEl.innerHTML = "";
    if (notificationTimePortalAnchor) {
        notificationTimePortalAnchor.setAttribute("aria-expanded", "false");
    }
    notificationTimePortalAnchor = null;
    document.removeEventListener("click", handleNotificationTimeOutsideClick, true);
    window.removeEventListener("scroll", handleNotificationTimeReposition, true);
    window.removeEventListener("resize", handleNotificationTimeReposition, true);
    document.removeEventListener("keydown", handleNotificationTimeEsc, true);
}

function handleNotificationTimeOutsideClick(evt) {
    const target = evt.target;
    if (!notificationTimePortalEl || notificationTimePortalEl.style.display === "none") return;
    if (notificationTimePortalEl.contains(target)) return;
    if (notificationTimePortalAnchor && notificationTimePortalAnchor.contains(target)) return;
    hideNotificationTimePortal();
}

function handleNotificationTimeReposition() {
    if (!notificationTimePortalAnchor || !notificationTimePortalEl || notificationTimePortalEl.style.display === "none") return;
    positionNotificationTimePortal(notificationTimePortalAnchor, notificationTimePortalEl);
}

function handleNotificationTimeEsc(evt) {
    if (evt.key !== "Escape") return;
    if (!notificationTimePortalEl || notificationTimePortalEl.style.display === "none") return;
    evt.preventDefault();
    hideNotificationTimePortal();
}

function positionNotificationTimePortal(button, portal) {
    const rect = button.getBoundingClientRect();
    portal.style.width = `${rect.width}px`;
    const viewportH = window.innerHeight;
    const portalHeight = Math.min(portal.scrollHeight, 260);
    const spaceBelow = viewportH - rect.bottom;
    const showAbove = spaceBelow < portalHeight + 12;
    const top = showAbove ? Math.max(8, rect.top - portalHeight - 4) : rect.bottom + 4;
    const viewportW = window.innerWidth;
    const portalWidth = portal.getBoundingClientRect().width || rect.width;
    const desiredLeft = rect.left;
    const clampedLeft = Math.min(
        Math.max(8, desiredLeft),
        Math.max(8, viewportW - portalWidth - 8)
    );
    portal.style.left = `${clampedLeft}px`;
    portal.style.top = `${top}px`;
}

function applyWorkspaceLogo() {
    const iconEl = document.querySelector('.workspace-icon');
    if (!iconEl) return;

    if (defaultWorkspaceIconText === null) {
        defaultWorkspaceIconText = iconEl.textContent || '';
    }

    if (settings.customWorkspaceLogo) {
        iconEl.style.backgroundImage = `url(${settings.customWorkspaceLogo})`;
        iconEl.textContent = '';
    } else {
        iconEl.style.backgroundImage = '';
        iconEl.textContent = defaultWorkspaceIconText;
    }
}

function applyLoadedAllData({ tasks: loadedTasks, projects: loadedProjects, feedbackItems: loadedFeedback } = {}) {
    projects = loadedProjects || [];
    tasks = loadedTasks || [];
    feedbackItems = loadedFeedback || [];
    feedbackIndex = feedbackItems.map((item) => item && item.id).filter((id) => id != null);

    // Normalize IDs to numbers
    projects.forEach(p => {
        if (p && p.id != null) p.id = parseInt(p.id, 10);
        // Migration: Ensure all projects have tags array
        if (!Array.isArray(p.tags)) {
            p.tags = [];
        }
    });
    tasks.forEach(t => {
        if (t) {
            if (t.id != null) t.id = parseInt(t.id, 10);
            if (t.projectId != null && t.projectId !== "null") {
                t.projectId = parseInt(t.projectId, 10);
            } else {
                t.projectId = null;
            }
            // Normalize date fields to strings (older versions may have missing fields)
            if (t.startDate === undefined || t.startDate === null) t.startDate = "";
            if (t.endDate === undefined || t.endDate === null) t.endDate = "";
            if (typeof t.startDate !== "string") t.startDate = String(t.startDate || "");
            if (typeof t.endDate !== "string") t.endDate = String(t.endDate || "");

            // Normalize tags/attachments to arrays
            if (!Array.isArray(t.tags)) {
                if (typeof t.tags === 'string' && t.tags.trim() !== '') {
                    t.tags = t.tags.split(',').map(s => s.trim()).filter(Boolean);
                } else {
                    t.tags = [];
                }
            }
            if (!Array.isArray(t.attachments)) t.attachments = [];

            // Migration: Track whether dates were ever set (used for mobile modal organization).
            // IMPORTANT: We can't use property-existence because we add missing fields during migration.
            if (t.startDateWasEverSet === undefined) t.startDateWasEverSet = t.startDate.trim() !== "";
            if (t.endDateWasEverSet === undefined) t.endDateWasEverSet = t.endDate.trim() !== "";

            // Migration: Convert dueDate to endDate
            if (t.dueDate && !t.endDate) {
                t.endDate = t.dueDate;
                t.endDateWasEverSet = true;
            }
            // Remove dueDate field (no longer used)
            delete t.dueDate;
        }
    });
    feedbackItems.forEach(f => {
        if (f && f.id != null) f.id = parseInt(f.id, 10);
    });

    loadFeedbackDeltaQueue();
    if (feedbackDeltaQueue.length > 0) {
        feedbackDeltaQueue.forEach(applyFeedbackDeltaToLocal);
    }

    // Calculate counters from existing IDs (no need to store separately)
    if (projects.length > 0) {
        projectCounter = Math.max(...projects.map(p => p.id || 0)) + 1;
    } else {
        projectCounter = 1;
    }

    if (tasks.length > 0) {
        taskCounter = Math.max(...tasks.map(t => t.id || 0)) + 1;
    } else {
        taskCounter = 1;
    }

    if (feedbackItems.length > 0) {
        feedbackCounter = Math.max(...feedbackItems.map(f => f.id || 0)) + 1;
    } else {
        feedbackCounter = 1;
    }
}

async function loadDataFromKV() {
    const all = await loadAllData();
    applyLoadedAllData(all);
}


// Color state management (constants imported from utils/colors.js)
let tagColorMap = {}; // Maps tag names to colors
let projectColorMap = {}; // Maps project IDs to custom colors
let colorIndex = 0; // For cycling through tag colors

function getTagColor(tagName) {
    if (!tagColorMap[tagName]) {
        tagColorMap[tagName] = TAG_COLORS[colorIndex % TAG_COLORS.length];
        colorIndex++;
    }
    return tagColorMap[tagName];
}

function getProjectColor(projectId) {
    if (!projectColorMap[projectId]) {
        const usedColors = new Set(Object.values(projectColorMap));
        const availableColors = PROJECT_COLORS.filter(color => !usedColors.has(color));
        projectColorMap[projectId] = availableColors.length > 0
            ? availableColors[0]
            : PROJECT_COLORS[Object.keys(projectColorMap).length % PROJECT_COLORS.length];
    }
    return projectColorMap[projectId];
}

function hexToRGBA(hex = '', alpha = 1) {
    if (!hex) return '';
    const cleaned = hex.replace('#', '').trim();
    const normalized = cleaned.length === 3
        ? cleaned.split('').map((char) => char + char).join('')
        : cleaned;
    if (normalized.length < 6) return '';
    const values = [0, 2, 4].map((offset) => parseInt(normalized.substr(offset, 2), 16) || 0);
    return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
}

function setProjectColor(projectId, color) {
    projectColorMap[projectId] = color;
    saveProjectColors();
    // Refresh calendar if it's active
    if (document.getElementById("calendar-view").classList.contains("active")) {
        renderCalendar();
    }
}

function toggleProjectColorPicker(projectId) {
    const picker = document.getElementById(`color-picker-${projectId}`);
    if (picker) {
        const isVisible = picker.style.display !== 'none';
        // Close all other color pickers
        document.querySelectorAll('.color-picker-dropdown').forEach(p => p.style.display = 'none');
        // Toggle this one
        picker.style.display = isVisible ? 'none' : 'block';
    }
}

function updateProjectColor(projectId, color) {
    setProjectColor(projectId, color);
    // Update the current color display
    const currentColorDiv = document.querySelector(`#color-picker-${projectId}`).previousElementSibling;
    if (currentColorDiv) {
        currentColorDiv.style.backgroundColor = color;
    }
    // Update color picker borders
    const picker = document.getElementById(`color-picker-${projectId}`);
    if (picker) {
        picker.querySelectorAll('.color-option').forEach(option => {
            const optionColor = option.style.backgroundColor;
            const rgbColor = optionColor.replace(/rgb\(|\)|\s/g, '').split(',');
            const hexColor = '#' + rgbColor.map(x => parseInt(x, 10).toString(16).padStart(2, '0')).join('');
            option.style.border = hexColor.toUpperCase() === color.toUpperCase() ? '2px solid white' : '2px solid transparent';
        });

        const customSwatch = picker.querySelector('.custom-color-swatch');
        if (customSwatch) {
            customSwatch.style.border = '2px solid transparent';
        }
    }

    // Refresh project tags to show new color
    const project = projects.find(p => p.id === projectId);
    if (project && project.tags) {
        renderProjectDetailsTags(project.tags, projectId);
    }

    // Refresh projects list to update tag colors in cards
    if (document.getElementById('projects')?.classList.contains('active')) {
        projectsSortedView = null;
        renderProjects();
    }
}

function handleProjectCustomColorChange(projectId, color) {
    if (!color) return;

    setProjectColor(projectId, color);

    const pickerRoot = document.getElementById(`color-picker-${projectId}`);
    if (pickerRoot) {
        const currentColorDiv = pickerRoot.previousElementSibling;
        if (currentColorDiv) {
            currentColorDiv.style.backgroundColor = color;
        }

        const customSwatch = pickerRoot.querySelector('.custom-color-swatch');
        if (customSwatch) {
            customSwatch.style.backgroundColor = color;
        }
    }

    const picker = document.getElementById(`color-picker-${projectId}`);
    if (picker) {
        picker.querySelectorAll('.color-option').forEach(option => {
            option.style.border = '2px solid transparent';
        });
        const customSwatch = picker.querySelector('.custom-color-swatch');
        if (customSwatch) {
            customSwatch.style.border = '2px solid white';
        }
    }

    // Refresh project tags to show new color
    const project = projects.find(p => p.id === projectId);
    if (project && project.tags) {
        renderProjectDetailsTags(project.tags, projectId);
    }

    // Refresh projects list to update tag colors in cards
    if (document.getElementById('projects')?.classList.contains('active')) {
        projectsSortedView = null;
        renderProjects();
    }
}

function openCustomProjectColorPicker(projectId) {
    const input = document.getElementById(`project-color-input-${projectId}`);
    if (!input) return;
    ignoreNextOutsideColorClick = true;
    input.click();
}


// === Global filter state ===
let filterState = {
    search: "",
    statuses: new Set(),
    priorities: new Set(),
    projects: new Set(),
    tags: new Set(),
    datePresets: new Set(), // Quick date filters: overdue, today, tomorrow, week, month (multi-select)
    dateFrom: "",
    dateTo: "",
};

// === Project filter state ===
let projectFilterState = {
    search: "",
    statuses: new Set(), // planning, active, completed
    taskFilter: "", // 'has-tasks', 'no-tasks', or empty
    updatedFilter: "all", // all | 5m | 30m | 24h | week | month
    tags: new Set(), // project tags filter
};

// === Project sort state for ASC/DESC toggle ===
let projectSortState = {
    lastSort: '',
    direction: 'asc' // 'asc' or 'desc'
};

// Initialize filters UI - only call once on page load
let filtersUIInitialized = false;
function initFiltersUI() {
    if (filtersUIInitialized) return; // Prevent duplicate initialization
    filtersUIInitialized = true;

    populateProjectOptions();
    populateTagOptions();
    updateNoDateOptionVisibility();
    setupFilterEventListeners();
}

// Separate function to only update project options
function populateProjectOptions() {
    const ul = document.getElementById("project-options");
    if (ul) {
        // Preserve current selection
        const selected = new Set(filterState.projects);

        ul.innerHTML = "";

        // Add "No Project" option only if there are tasks without assigned projects
        const hasNoProjectTasks = tasks.some(t => !t.projectId);
        if (hasNoProjectTasks) {
            const noProjectLi = document.createElement("li");
            const checked = selected.has('none') ? 'checked' : '';
            noProjectLi.innerHTML = `<label><input type="checkbox" id="proj-none" value="none" data-filter="project" ${checked}> ${t('tasks.noProject')}</label>`;
            ul.appendChild(noProjectLi);
        } else {
            // Ensure state is consistent if 'none' was previously selected
            if (selected.has('none')) {
                filterState.projects.delete('none');
                updateFilterBadges();
            }
        }

        if (projects.length === 0) {
            const li = document.createElement("li");
            li.textContent = t('filters.noOtherProjects');
            li.style.color = "var(--text-muted)";
            li.style.padding = "8px 12px";
            ul.appendChild(li);
        } else {
            // Sort alphabetically by name (case-insensitive)
            projects
              .slice()
              .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }))
              .forEach((p) => {
                const li = document.createElement("li");
                const id = `proj-${p.id}`;
                const checked = selected.has(String(p.id)) ? 'checked' : '';
                li.innerHTML = `<label><input type="checkbox" id="${id}" value="${p.id}" data-filter="project" ${checked}> ${p.name}</label>`;
                ul.appendChild(li);
            });
        }

        // Re-attach change listeners for project checkboxes
        ul.querySelectorAll('input[type="checkbox"][data-filter="project"]').forEach((cb) => {
            cb.addEventListener("change", () => {
                toggleSet(filterState.projects, cb.value, cb.checked);
                updateFilterBadges();
                renderAfterFilterChange();
                const calendarView = document.getElementById("calendar-view");
                if (calendarView) {
                    renderCalendar();
                }
                updateClearButtonVisibility();
            });
        });
    }
}

// Separate function to only update tag options (can be called independently)
function populateTagOptions() {
    const tagUl = document.getElementById("tag-options");
    if (tagUl) {
        // Preserve previously selected tags from state instead of reading DOM
        const currentlySelected = new Set(filterState.tags);

        // Collect all unique tags from all tasks
        const allTags = new Set();
        tasks.forEach(t => {
            if (t.tags && t.tags.length > 0) {
                t.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        tagUl.innerHTML = "";
        
        // Add "No Tags" only if there are tasks without tags
        const hasNoTagTasks = tasks.some(t => !t.tags || t.tags.length === 0);
        if (hasNoTagTasks) {
            const noTagsLi = document.createElement("li");
            const noTagsChecked = currentlySelected.has('none') ? 'checked' : '';
            noTagsLi.innerHTML = `<label><input type="checkbox" id="tag-none" value="none" data-filter="tag" ${noTagsChecked}> ${t('filters.noTags')}</label>`;
            tagUl.appendChild(noTagsLi);
        } else {
            if (currentlySelected.has('none')) {
                filterState.tags.delete('none');
                updateFilterBadges();
            }
        }
        
        if (allTags.size === 0) {
            const li = document.createElement("li");
            li.textContent = t('filters.noOtherTags');
            li.style.color = "var(--text-muted)";
            li.style.padding = "8px 12px";
            tagUl.appendChild(li);
        } else {
            Array.from(allTags).sort().forEach((tag) => {
                const li = document.createElement("li");
                const id = `tag-${tag}`;
                const checked = currentlySelected.has(tag) ? 'checked' : '';
                li.innerHTML = `<label><input type="checkbox" id="${id}" value="${tag}" data-filter="tag" ${checked}> ${tag.toUpperCase()}</label>`;
                tagUl.appendChild(li);
            });
        }
        
        // Re-attach event listeners for new checkboxes
        tagUl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener("change", () => {
                const type = cb.dataset.filter;
                if (type === "tag") toggleSet(filterState.tags, cb.value, cb.checked);
                updateFilterBadges();
                renderAfterFilterChange();
                
                // Same calendar fix as task deletion/creation
                const calendarView = document.getElementById("calendar-view");
                if (calendarView) {
                    renderCalendar();
                }
                
                updateClearButtonVisibility();
            });
        });
    }
}

// Setup event listeners (only call once)
function setupFilterEventListeners() {

    const isMobile =
        !!(window.matchMedia && (
            window.matchMedia("(max-width: 768px)").matches ||
            window.matchMedia("(pointer: coarse)").matches
        ));

    // Show/hide project select-all based on number of projects
    const selectAllProjectRow = document.getElementById("project-select-all");
    if (selectAllProjectRow && selectAllProjectRow.parentElement.parentElement) {
        if (projects.length > 1) {
            selectAllProjectRow.parentElement.parentElement.style.display = 'block';
        } else {
            selectAllProjectRow.parentElement.parentElement.style.display = 'none';
        }
    }

    // Open/close dropdown panels for Status, Priority, Project, Tags, End Date, Start Date
    const groups = [
        document.getElementById("group-status"),
        document.getElementById("group-priority"),
        document.getElementById("group-project"),
        document.getElementById("group-tags"),
        document.getElementById("group-end-date"),
        document.getElementById("group-start-date"),
        document.getElementById("group-kanban-updated"),
        document.getElementById("group-project-status"),
        document.getElementById("group-project-updated"),
        document.getElementById("group-project-tags"),
    ].filter(Boolean);

    const ensureBackdrop = () => {
        let backdrop = document.getElementById("dropdown-backdrop");
        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.id = "dropdown-backdrop";
            backdrop.setAttribute("aria-hidden", "true");
            backdrop.addEventListener("click", () => closeAllPanels());
            document.body.appendChild(backdrop);
        }
        return backdrop;
    };

    const closeAllPanels = () => {
        groups.forEach((g) => g.classList.remove("open"));
        document.body.classList.remove("dropdown-sheet-open");
        const backdrop = document.getElementById("dropdown-backdrop");
        if (backdrop) backdrop.classList.remove("open");
    };

    const enhanceMobilePanel = (g) => {
        const panel = g.querySelector(".dropdown-panel");
        if (!panel) return;

        panel.classList.add("has-sheet-header");

        // Mobile-specific positioning and backdrop
        if (isMobile) {
        // Default to anchored under the trigger; fall back to bottom sheet when space is tight.
        try {
            const rect = g.getBoundingClientRect();
            const margin = 12;
            const gap = 8;
            const vh = window.innerHeight || document.documentElement.clientHeight || 0;
            const availableBelow = Math.max(0, vh - rect.bottom - margin);
            const availableAbove = Math.max(0, rect.top - margin);
            const preferredMax = Math.min(460, Math.floor(vh * 0.6));

            let placeBelow = availableBelow >= 260 || availableBelow >= availableAbove;
            let maxH = Math.min(preferredMax, placeBelow ? availableBelow : availableAbove);
            const useBottomSheet = maxH < 220; // too cramped to be useful when anchored

            panel.classList.toggle("sheet-bottom", useBottomSheet);
            panel.classList.toggle("sheet-anchored", !useBottomSheet);

            if (!useBottomSheet) {
                if (maxH < 240) maxH = Math.min(240, Math.max(0, placeBelow ? availableBelow : availableAbove));
                let top = placeBelow ? rect.bottom + gap : rect.top - gap - maxH;
                top = Math.max(margin, Math.min(top, vh - margin - 140));
                panel.style.setProperty("--sheet-top", `${Math.round(top)}px`);
                panel.style.setProperty("--sheet-maxh", `${Math.round(maxH)}px`);
            } else {
                panel.style.removeProperty("--sheet-top");
                panel.style.removeProperty("--sheet-maxh");
            }
        } catch (e) {
            panel.classList.add("sheet-bottom");
            panel.classList.remove("sheet-anchored");
        }

        ensureBackdrop().classList.add("open");
        document.body.classList.add("dropdown-sheet-open");
        } // End mobile-specific

        if (!panel.querySelector(".dropdown-sheet-header")) {
            const titleText =
                panel.querySelector(".dropdown-section-title")?.textContent?.trim() ||
                g.querySelector(".filter-button")?.textContent?.trim() ||
                t('filters.sheet.title');

            const header = document.createElement("div");
            header.className = "dropdown-sheet-header";

            const handle = document.createElement("div");
            handle.className = "dropdown-sheet-handle";

            const title = document.createElement("div");
            title.className = "dropdown-sheet-title";
            title.textContent = titleText.toUpperCase();

            const done = document.createElement("button");
            done.type = "button";
            done.className = "dropdown-sheet-done";
            done.textContent = t('common.done');
            done.addEventListener("click", () => closeAllPanels());

            header.appendChild(handle);
            header.appendChild(title);
            header.appendChild(done);
            panel.insertBefore(header, panel.firstChild);
        }
    };

    groups.forEach((g) => {
        const btn = g.querySelector(".filter-button");
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = g.classList.contains("open");
            closeAllPanels();
            if (!isOpen) {
                g.classList.add("open");
                enhanceMobilePanel(g);
            }
        });

        // keep panel open when clicking inside (so multiple checks don't close it)
        const panel = g.querySelector(".dropdown-panel");
        if (panel) {
            panel.addEventListener("click", (e) => e.stopPropagation());
        }
    });

    // Clicking anywhere else closes panels
    document.addEventListener("click", () => closeAllPanels());

    // Escape closes panels
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAllPanels();
    });

    // Checkboxes for status, priority, and project (task filters only)
    document.querySelectorAll(
        '.dropdown-panel input[type="checkbox"][data-filter="status"],' +
        '.dropdown-panel input[type="checkbox"][data-filter="priority"],' +
        '.dropdown-panel input[type="checkbox"][data-filter="project"]'
    ).forEach((cb) => {
        cb.addEventListener("change", () => {
            const type = cb.dataset.filter;
            if (type === "status") toggleSet(filterState.statuses, cb.value, cb.checked);
            if (type === "priority") toggleSet(filterState.priorities, cb.value, cb.checked);
            if (type === "project") toggleSet(filterState.projects, cb.value, cb.checked);
            // Tags are handled separately in populateTagOptions()
            updateFilterBadges();
            renderAfterFilterChange();

            // Same calendar fix as task deletion/creation
            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
                renderCalendar();
            }

            updateClearButtonVisibility();
        });
    });

    // Checkboxes for date preset filter (multi-select)
    document.querySelectorAll('input[type="checkbox"][data-filter="date-preset"]').forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const val = checkbox.value;

            if (checkbox.checked) {
                filterState.datePresets.add(val);

                // Clear manual date inputs when any preset is selected
                if (filterState.datePresets.size > 0) {
                    filterState.dateFrom = "";
                    filterState.dateTo = "";
                    const dateFromEl = document.getElementById("filter-date-from");
                    const dateToEl = document.getElementById("filter-date-to");
                    if (dateFromEl) dateFromEl.value = "";
                    if (dateToEl) dateToEl.value = "";
                }
            } else {
                filterState.datePresets.delete(val);
            }

            updateFilterBadges();
            renderAfterFilterChange();

            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
                renderCalendar();
            }

            updateClearButtonVisibility();
        });
    });

    // "Select / Unselect All" for Projects
    const selectAllProject = document.getElementById("project-select-all");
    if (selectAllProject) {
        selectAllProject.addEventListener("change", () => {
            const projectCheckboxes = document.querySelectorAll(
                '.dropdown-panel input[type="checkbox"][data-filter="project"]'
            );
            const allChecked = selectAllProject.checked;
            projectCheckboxes.forEach((cb) => {
                cb.checked = allChecked;
                if (allChecked) {
                    filterState.projects.add(cb.value);
                } else {
                    filterState.projects.delete(cb.value);
                }
            });
            updateFilterBadges();
            renderAfterFilterChange();
            
            // Same calendar fix as task deletion/creation
            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
                renderCalendar();
            }
            
            updateClearButtonVisibility();
        });
    }

    // Search field
    const searchEl = document.getElementById("filter-search");
    if (searchEl) {
        searchEl.addEventListener("input", () => {
            filterState.search = (searchEl.value || "").trim().toLowerCase();
            updateFilterBadges();
            renderAfterFilterChange();
            
            // Same calendar fix as task deletion/creation
            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
                renderCalendar();
            }
            
            updateClearButtonVisibility();
        });
    }

    // Radio for Kanban-only updated-recency filter
    document.querySelectorAll('input[type="radio"][data-filter="kanban-updated"][name="kanban-updated-filter"]').forEach((rb) => {
        rb.addEventListener("change", () => {
            if (!rb.checked) return;
            setKanbanUpdatedFilter(rb.value);
            updateClearButtonVisibility();
        });
    });

    // Date range inputs
    const dateFromEl = document.getElementById("filter-date-from");
    const dateToEl = document.getElementById("filter-date-to");

if (dateFromEl) {
        dateFromEl.addEventListener("change", () => {
            filterState.dateFrom = dateFromEl.value;
updateFilterBadges();
            renderAfterFilterChange();

            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
                renderCalendar();
            }

            updateClearButtonVisibility();
        });
    } else {
        console.error("[Filter] Date From element not found!");
    }

    if (dateToEl) {
        dateToEl.addEventListener("change", () => {
            filterState.dateTo = dateToEl.value;
updateFilterBadges();
            renderAfterFilterChange();

            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
                renderCalendar();
            }

            updateClearButtonVisibility();
        });
    } else {
        console.error("[Filter] Date To element not found!");
    }

    // Clear all filters
    const clearBtn = document.getElementById("btn-clear-filters");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            filterState.search = "";
            filterState.statuses.clear();
            filterState.priorities.clear();
            filterState.projects.clear();
            filterState.tags.clear();
            filterState.datePresets.clear();
            filterState.dateFrom = "";
            filterState.dateTo = "";
            try { setKanbanUpdatedFilter('all', { render: false }); } catch (e) {}

            // Reset UI elements
            document
                .querySelectorAll('.dropdown-panel input[type="checkbox"]')
                .forEach((cb) => (cb.checked = false));

            if (searchEl) searchEl.value = "";

            // Clear date filter inputs and their Flatpickr instances
            if (dateFromEl) {
                dateFromEl.value = "";
                // Clear the Flatpickr display input
                const dateFromWrapper = dateFromEl.closest('.date-input-wrapper');
                if (dateFromWrapper) {
                    const displayInput = dateFromWrapper.querySelector('.date-display');
                    if (displayInput && displayInput._flatpickr) {
                        displayInput._flatpickr.clear();
                    }
                }
            }
            if (dateToEl) {
                dateToEl.value = "";
                // Clear the Flatpickr display input
                const dateToWrapper = dateToEl.closest('.date-input-wrapper');
                if (dateToWrapper) {
                    const displayInput = dateToWrapper.querySelector('.date-display');
                    if (displayInput && displayInput._flatpickr) {
                        displayInput._flatpickr.clear();
                    }
                }
            }

            updateFilterBadges();
            renderAfterFilterChange();
            
            // Same calendar fix as task deletion/creation
            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
                renderCalendar();
            }
            
            updateClearButtonVisibility();
        });
    }

    // First run
    updateFilterBadges();
    renderActiveFilterChips();
    updateKanbanUpdatedFilterUI();
    updateClearButtonVisibility();
    } 

// Helper to toggle an item in a Set
function toggleSet(setObj, val, on) {
    if (on) setObj.add(val);
    else setObj.delete(val);
}

function updateClearButtonVisibility() {
    const btn = document.getElementById("btn-clear-filters");
    if (!btn) return;

    const kanban = document.querySelector('.kanban-board');
    const isKanban = kanban && !kanban.classList.contains('hidden');
    const isList = document.getElementById('list-view')?.classList.contains('active');
    const isCalendar = document.getElementById('calendar-view')?.classList.contains('active');
    const showUpdated = isKanban || isList || isCalendar;
    const hasKanbanUpdated =
        showUpdated &&
        window.kanbanUpdatedFilter &&
        window.kanbanUpdatedFilter !== 'all';

    const hasFilters =
        (filterState.search && filterState.search.trim() !== "") ||
        filterState.statuses.size > 0 ||
        filterState.priorities.size > 0 ||
        filterState.projects.size > 0 ||
        filterState.tags.size > 0 ||
        filterState.datePresets.size > 0 ||
        (filterState.dateFrom && filterState.dateFrom !== "") ||
        (filterState.dateTo && filterState.dateTo !== "") ||
        hasKanbanUpdated;

    btn.style.display = hasFilters ? "inline-flex" : "none";
}

// Update numeric badges for each dropdown
function updateFilterBadges() {
    const b1 = document.getElementById("badge-status");
    const b2 = document.getElementById("badge-priority");
    const b3 = document.getElementById("badge-project");
    const b4 = document.getElementById("badge-tags");
    const bEndDate = document.getElementById("badge-end-date");
    const bStartDate = document.getElementById("badge-start-date");

    // Show count when active, empty when inactive (no more "All")
    if (b1) b1.textContent = filterState.statuses.size === 0 ? "" : filterState.statuses.size;
    if (b2) b2.textContent = filterState.priorities.size === 0 ? "" : filterState.priorities.size;
    if (b3) b3.textContent = filterState.projects.size === 0 ? "" : filterState.projects.size;
    if (b4) b4.textContent = filterState.tags.size === 0 ? "" : filterState.tags.size;

    // Count end date and start date filters separately
    const endDatePresets = ["no-date", "overdue", "end-today", "end-tomorrow", "end-7days", "end-week", "end-month"];
    const startDatePresets = ["no-start-date", "already-started", "start-today", "start-tomorrow", "start-7days", "start-week", "start-month"];

    let endDateCount = 0;
    let startDateCount = 0;

    filterState.datePresets.forEach(preset => {
        if (endDatePresets.includes(preset)) {
            endDateCount++;
        } else if (startDatePresets.includes(preset)) {
            startDateCount++;
        }
    });

    if (bEndDate) bEndDate.textContent = endDateCount === 0 ? "" : endDateCount;
    if (bStartDate) bStartDate.textContent = startDateCount === 0 ? "" : startDateCount;

    // Update active state on filter buttons
    const updateButtonState = (badgeId, isActive) => {
        const badge = document.getElementById(badgeId);
        if (badge) {
            const button = badge.closest('.filter-button');
            if (button) {
                if (isActive) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        }
    };

    updateButtonState("badge-status", filterState.statuses.size > 0);
    updateButtonState("badge-priority", filterState.priorities.size > 0);
    updateButtonState("badge-project", filterState.projects.size > 0);
    updateButtonState("badge-tags", filterState.tags.size > 0);
    updateButtonState("badge-end-date", endDateCount > 0);
    updateButtonState("badge-start-date", startDateCount > 0);

    renderActiveFilterChips();
    updateClearButtonVisibility();
}

// Show active filter "chips" under the toolbar
function renderActiveFilterChips() {
    const wrap = document.getElementById("active-filters");
    if (!wrap) return;
    wrap.innerHTML = "";

    const addChip = (label, value, onRemove, type, rawValue) => {
        const chip = document.createElement("span");
        chip.className = "filter-chip";

        // Add type-specific class for styling
        if (type === "status") {
            chip.classList.add("chip-status");
        } else if (type === "priority") {
            chip.classList.add("chip-priority");
        }

        const text = document.createElement("span");
        text.className = "chip-text";

        // Add colored dot for status chips
        if (type === "status" && rawValue) {
            const dot = document.createElement("span");
            dot.className = `dot ${rawValue}`;
            text.appendChild(dot);
            text.appendChild(document.createTextNode(` ${label}: ${value}`));
        } else {
            text.textContent = `${label}: ${value}`;
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip-remove";
        btn.setAttribute("aria-label", t('filters.chip.removeAria', { label }));
        btn.textContent = "×";
        btn.addEventListener("click", onRemove);

        chip.appendChild(text);
        chip.appendChild(btn);
        wrap.appendChild(chip);
    };

    // Search chip
    if (filterState.search)
        addChip(t('filters.chip.search'), filterState.search, () => {
            filterState.search = "";
            const el = document.getElementById("filter-search");
            if (el) el.value = "";
            updateFilterBadges(); // Ensure badges are updated
            updateClearButtonVisibility(); // Update clear button state
            renderAfterFilterChange();
        });

    // Status chips
    filterState.statuses.forEach((v) =>
        addChip(t('tasks.filters.status'), getStatusLabel(v), () => {
            filterState.statuses.delete(v);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="status"][value="${v}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        }, "status", v)
    );

    // Priority chips
    filterState.priorities.forEach((v) =>
        addChip(t('tasks.filters.priority'), getPriorityLabel(v), () => {
            filterState.priorities.delete(v);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="priority"][value="${v}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        }, "priority", v)
    );

    // Project chips
    filterState.projects.forEach((pid) => {
        const proj = projects.find((p) => p.id.toString() === pid.toString());
        addChip(t('filters.chip.project'), proj ? proj.name : pid, () => {
            filterState.projects.delete(pid);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="project"][value="${pid}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        });
    });

    // Tags chips
    filterState.tags.forEach((tag) =>
        addChip(t('filters.chip.tag'), tag, () => {
            filterState.tags.delete(tag);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="tag"][value="${tag}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        })
    );

    // Date preset chips (one chip per selected preset)
    filterState.datePresets.forEach((preset) => {
        const datePresetLabels = {
            "no-date": t('tasks.filters.noDate'),
            "overdue": t('tasks.filters.overdue'),
            "end-today": t('tasks.filters.endToday'),
            "end-tomorrow": t('tasks.filters.endTomorrow'),
            "end-7days": t('tasks.filters.end7Days'),
            "end-week": t('tasks.filters.endThisWeek'),
            "end-month": t('tasks.filters.endThisMonth'),
            "no-start-date": t('tasks.filters.noStartDate'),
            "already-started": t('tasks.filters.alreadyStarted'),
            "start-today": t('tasks.filters.startToday'),
            "start-tomorrow": t('tasks.filters.startTomorrow'),
            "start-7days": t('tasks.filters.start7Days'),
            "start-week": t('tasks.filters.startThisWeek'),
            "start-month": t('tasks.filters.startThisMonth')
        };
        const label = datePresetLabels[preset] || preset;
        addChip(t('filters.chip.date'), label, () => {
            filterState.datePresets.delete(preset);
            // Uncheck the corresponding checkbox
            const checkbox = document.querySelector(`input[type="checkbox"][data-filter="date-preset"][value="${preset}"]`);
            if (checkbox) checkbox.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        });
    });

    // Kanban/List Updated filter chip (not shown on Calendar)
    try {
        const kanban = document.querySelector('.kanban-board');
        const isKanban = kanban && !kanban.classList.contains('hidden');
        const isList = document.getElementById('list-view')?.classList.contains('active');
        const isCalendar = document.getElementById('calendar-view')?.classList.contains('active');
        const showUpdated = isKanban || isList || isCalendar;
        if (showUpdated && window.kanbanUpdatedFilter && window.kanbanUpdatedFilter !== 'all') {
            addChip(t('filters.chip.updated'), getKanbanUpdatedFilterLabel(window.kanbanUpdatedFilter), () => {
                setKanbanUpdatedFilter('all');
                updateClearButtonVisibility();
            });
        }
    } catch (e) {}

    // Date range chips
    if (filterState.dateFrom || filterState.dateTo) {
        let dateLabel = "";
        if (filterState.dateFrom && filterState.dateTo) {
            dateLabel = `${formatDate(filterState.dateFrom)} - ${formatDate(filterState.dateTo)}`;
        } else if (filterState.dateFrom) {
            dateLabel = `${t('filters.dateRange.from')} ${formatDate(filterState.dateFrom)}`;
        } else if (filterState.dateTo) {
            dateLabel = `${t('filters.dateRange.until')} ${formatDate(filterState.dateTo)}`;
        }
        addChip(t('filters.chip.date'), dateLabel, () => {
            filterState.dateFrom = "";
            filterState.dateTo = "";
            const fromEl = document.getElementById("filter-date-from");
            const toEl = document.getElementById("filter-date-to");

            // Clear date filter inputs and their Flatpickr instances
            if (fromEl) {
                fromEl.value = "";
                const dateFromWrapper = fromEl.closest('.date-input-wrapper');
                if (dateFromWrapper) {
                    const displayInput = dateFromWrapper.querySelector('.date-display');
                    if (displayInput && displayInput._flatpickr) {
                        displayInput._flatpickr.clear();
                    }
                }
            }
            if (toEl) {
                toEl.value = "";
                const dateToWrapper = toEl.closest('.date-input-wrapper');
                if (dateToWrapper) {
                    const displayInput = dateToWrapper.querySelector('.date-display');
                    if (displayInput && displayInput._flatpickr) {
                        displayInput._flatpickr.clear();
                    }
                }
            }

            renderAfterFilterChange();
        });
    }
}

// Sync current filter state to URL for shareable links and browser history
function syncURLWithFilters() {
    const params = new URLSearchParams();

    // Add view parameter (kanban, list, or calendar)
    const isListView = document.getElementById("list-view")?.classList.contains("active");
    const isCalendarView = document.getElementById("calendar-view")?.classList.contains("active");
    if (isListView) {
        params.set("view", "list");
    } else if (isCalendarView) {
        params.set("view", "calendar");
    }
    // Don't add 'kanban' as it's the default

    // Add search query
    if (filterState.search && filterState.search.trim() !== "") {
        params.set("search", filterState.search.trim());
    }

    // Add status filters (comma-separated)
    if (filterState.statuses.size > 0) {
        params.set("status", Array.from(filterState.statuses).join(","));
    }

    // Add priority filters (comma-separated)
    if (filterState.priorities.size > 0) {
        params.set("priority", Array.from(filterState.priorities).join(","));
    }

    // Add project filters (comma-separated)
    if (filterState.projects.size > 0) {
        params.set("project", Array.from(filterState.projects).join(","));
    }

    // Add tag filters (comma-separated)
    if (filterState.tags.size > 0) {
        params.set("tags", Array.from(filterState.tags).join(","));
    }

    // Add date preset filters (comma-separated)
    if (filterState.datePresets.size > 0) {
        params.set("datePreset", Array.from(filterState.datePresets).join(","));
    }

    // Add date range filters
    if (filterState.dateFrom && filterState.dateFrom !== "") {
        params.set("dateFrom", filterState.dateFrom);
        if (filterState.dateField && filterState.dateField !== 'endDate') {
            params.set("dateField", filterState.dateField);
        }
    }
    if (filterState.dateTo && filterState.dateTo !== "") {
        params.set("dateTo", filterState.dateTo);
    }

    // Add updated filter (kanban/list/calendar)
    if (window.kanbanUpdatedFilter && window.kanbanUpdatedFilter !== 'all') {
        params.set("updated", window.kanbanUpdatedFilter);
    }

    // Build new URL
    const queryString = params.toString();
    const newHash = queryString ? `#tasks?${queryString}` : "#tasks";

    // Update URL without triggering hashchange event (prevents infinite loop)
    if (window.location.hash !== newHash) {
        window.history.replaceState(null, "", newHash);
    }
}

// Called whenever filters change
function renderAfterFilterChange() {
    syncURLWithFilters(); // Keep URL in sync with filters
    renderActiveFilterChips(); // Update filter chips display
    renderTasks(); // Kanban

    // Always render list view on mobile (for mobile cards) or when active on desktop
    const isMobile = window.innerWidth <= 768;
    if (isMobile || document.getElementById("list-view").classList.contains("active")) {
        renderListView(); // List (includes mobile cards)
    }

    if (document.getElementById("calendar-view").classList.contains("active")) {
        renderCalendar(); // Calendar
    }
}

// Return filtered tasks array
function getFilteredTasks() {
    const search = filterState.search;
    const selStatus = filterState.statuses;
    const selPri = filterState.priorities;
    const selProj = filterState.projects;
    const selTags = filterState.tags;
    const dateFrom = filterState.dateFrom;
    const dateTo = filterState.dateTo;

return tasks.filter((task) => {
        // Search filter
        const sOK =
            !search ||
            (task.title && task.title.toLowerCase().includes(search)) ||
            (task.description &&
                task.description.toLowerCase().includes(search));

        // Status filter
        const stOK = selStatus.size === 0 || selStatus.has(task.status);

        // Priority filter
        const pOK = selPri.size === 0 || selPri.has(task.priority);

        // Project filter
        const prOK =
            selProj.size === 0 ||
            (task.projectId && selProj.has(task.projectId.toString())) ||
            (!task.projectId && selProj.has("none")); // Handle "No Project" filter

        // Date preset filter (multi-select with OR logic - match ANY selected preset)
        let dOK = true;
        if (filterState.datePresets.size > 0) {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const todayDate = new Date(today + 'T00:00:00');

            // Check if task matches ANY of the selected presets
            dOK = Array.from(filterState.datePresets).some((preset) => {
                switch (preset) {
                    // END DATE FILTERS
                    case "no-date":
                        return !task.endDate || task.endDate === "";

                    case "overdue":
                        return task.endDate && task.endDate < today;

                    case "end-today":
                        return task.endDate === today;

                    case "end-tomorrow":
                        const endTomorrow = new Date(todayDate);
                        endTomorrow.setDate(endTomorrow.getDate() + 1);
                        const endTomorrowStr = endTomorrow.toISOString().split('T')[0];
                        return task.endDate === endTomorrowStr;

                    case "end-7days":
                        // Due exactly in 7 days
                        const endSevenDays = new Date(todayDate);
                        endSevenDays.setDate(endSevenDays.getDate() + 7);
                        const endSevenDaysStr = endSevenDays.toISOString().split('T')[0];
                        return task.endDate === endSevenDaysStr;

                    case "end-week":
                        // Due within the next 7 days (including today)
                        const endWeekEnd = new Date(todayDate);
                        endWeekEnd.setDate(endWeekEnd.getDate() + 7);
                        const endWeekEndStr = endWeekEnd.toISOString().split('T')[0];
                        return task.endDate && task.endDate >= today && task.endDate <= endWeekEndStr;

                    case "end-month":
                        // Due within the next 30 days (including today)
                        const endMonthEnd = new Date(todayDate);
                        endMonthEnd.setDate(endMonthEnd.getDate() + 30);
                        const endMonthEndStr = endMonthEnd.toISOString().split('T')[0];
                        return task.endDate && task.endDate >= today && task.endDate <= endMonthEndStr;

                    // START DATE FILTERS
                    case "no-start-date":
                        return !task.startDate || task.startDate === "";

                    case "already-started":
                        // Start date is in the past and task is not done
                        return task.startDate && task.startDate < today && task.status !== 'done';

                    case "start-today":
                        return task.startDate === today;

                    case "start-tomorrow":
                        const startTomorrow = new Date(todayDate);
                        startTomorrow.setDate(startTomorrow.getDate() + 1);
                        const startTomorrowStr = startTomorrow.toISOString().split('T')[0];
                        return task.startDate === startTomorrowStr;

                    case "start-7days":
                        // Starting exactly in 7 days
                        const startSevenDays = new Date(todayDate);
                        startSevenDays.setDate(startSevenDays.getDate() + 7);
                        const startSevenDaysStr = startSevenDays.toISOString().split('T')[0];
                        return task.startDate === startSevenDaysStr;

                    case "start-week":
                        // Starting within the next 7 days (including today)
                        const startWeekEnd = new Date(todayDate);
                        startWeekEnd.setDate(startWeekEnd.getDate() + 7);
                        const startWeekEndStr = startWeekEnd.toISOString().split('T')[0];
                        return task.startDate && task.startDate >= today && task.startDate <= startWeekEndStr;

                    case "start-month":
                        // Starting within the next 30 days (including today)
                        const startMonthEnd = new Date(todayDate);
                        startMonthEnd.setDate(startMonthEnd.getDate() + 30);
                        const startMonthEndStr = startMonthEnd.toISOString().split('T')[0];
                        return task.startDate && task.startDate >= today && task.startDate <= startMonthEndStr;

                    default:
                        return true;
                }
            });
        }
        // Date range filter - check if task date range overlaps with filter date range
        else if (dateFrom || dateTo) {
            const dateField = filterState.dateField || 'endDate'; // Use startDate or endDate
            const taskDateValue = dateField === 'startDate' ? task.startDate : task.endDate;

            // Task must have the appropriate date field to be filtered by date
            if (!taskDateValue) {
                dOK = false;
            } else {
                // For same date filtering, only check the specified date field
                if (dateFrom && dateTo) {
                    if (dateFrom === dateTo) {
                        // Same date - check only the specified field (startDate or endDate)
                        dOK = taskDateValue === dateTo;
                    } else {
                        // Different dates - use the specified field
                        dOK = taskDateValue >= dateFrom && taskDateValue <= dateTo;
                    }
                } else if (dateFrom) {
                    dOK = taskDateValue >= dateFrom;
                } else if (dateTo) {
                    dOK = taskDateValue <= dateTo;
                }
            }
        }

        // Tag filter
        const tagOK = selTags.size === 0 ||
            (task.tags && task.tags.some(tag => selTags.has(tag))) ||
            (!task.tags || task.tags.length === 0) && selTags.has("none");

        const passesAll = sOK && stOK && pOK && prOK && tagOK && dOK;

        if (dateFrom || dateTo) {
}

        return passesAll;
    });
}

// Strip time to compare only dates
function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function initializeDatePickers() {
  const flatpickrFn = window.flatpickr;
  if (typeof flatpickrFn !== "function") {
    const retry = (initializeDatePickers.__retryCount || 0) + 1;
    initializeDatePickers.__retryCount = retry;
    if (retry <= 50) {
      setTimeout(initializeDatePickers, 100);
    } else {
      console.warn("flatpickr is not available; date pickers disabled");
    }
    return;
  }

  const flatpickrLocale = getFlatpickrLocale();
  const dateConfig = {
    dateFormat: "d/m/Y",
    altInput: false,
    allowInput: true,
    locale: flatpickrLocale,
    disableMobile: true,
  };

  // Helper: mask for dd/mm/yyyy and sync into flatpickr without triggering persistence
  function addDateMask(input, flatpickrInstance) {
    let clearedOnFirstKey = false;

    input.addEventListener("keydown", function (e) {
      if (
        !clearedOnFirstKey &&
        input.value.match(/^\d{2}\/\d{2}\/\d{4}$/) &&
        e.key.length === 1 &&
        /\d/.test(e.key)
      ) {
        input.value = "";
        clearedOnFirstKey = true;
      }
      if (e.key === "Backspace" && input.selectionStart === 0 && input.selectionEnd === 0) {
        input.value = "";
        clearedOnFirstKey = true;
        e.preventDefault();
      }
    });

    input.addEventListener("input", function (e) {
      let value = e.target.value;
      let numbers = value.replace(/\D/g, "");

      let formatted = "";
      if (numbers.length >= 1) {
        let day = numbers.substring(0, 2);
        if (parseInt(day, 10) > 31) day = "31";
        formatted = day;
      }
      if (numbers.length >= 3) {
        let month = numbers.substring(2, 4);
        if (parseInt(month, 10) > 12) month = "12";
        formatted += "/" + month;
      }
      if (numbers.length >= 5) {
        formatted += "/" + numbers.substring(4, 8);
      }

      if (value !== formatted) {
        e.target.value = formatted;
      }

      if (formatted.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [dd, mm, yyyy] = formatted.split("/");
        const dateObj = new Date(+yyyy, +mm - 1, +dd);
        if (flatpickrInstance && flatpickrInstance.config) {
          try {
            flatpickrInstance.__suppressChange = true;
            flatpickrInstance.setDate(dateObj, false);
            setTimeout(() => (flatpickrInstance.__suppressChange = false), 0);
          } catch (e) {}
        }
      }
    });

    input.addEventListener("keypress", function (e) {
      const char = String.fromCharCode(e.which);
      if (!/[\d\/]/.test(char) && e.which !== 8 && e.which !== 46) {
        e.preventDefault();
      }
    });

    input.addEventListener("blur", function () {
      clearedOnFirstKey = false;
    });

    if (flatpickrInstance) {
      flatpickrInstance.config.onChange.push(() => (clearedOnFirstKey = false));
    }
  }

  // Patch flatpickr instance to mark programmatic changes
  function patchProgrammaticGuards(fp) {
    if (fp.__patchedProgrammaticGuards) return;
    fp.__patchedProgrammaticGuards = true;

    const origClear = fp.clear.bind(fp);
    fp.clear = function () {
      fp.__suppressChange = true;
      const res = origClear();
      setTimeout(() => (fp.__suppressChange = false), 0);
      return res;
    };

    const origSetDate = fp.setDate.bind(fp);
    fp.__origSetDate = origSetDate;
    fp.setDate = function (date, triggerChange, ...rest) {
      // Any programmatic set should not persist. Even if triggerChange is true, we guard it.
      fp.__suppressChange = true;
      const res = origSetDate(date, triggerChange, ...rest);
      setTimeout(() => (fp.__suppressChange = false), 0);
      return res;
    };
  }

  function addTodayButton(fp) {
    if (!fp || !fp.calendarContainer) return;

    if (fp.calendarContainer.querySelector('.flatpickr-today-btn')) return;

    const footer = document.createElement('div');
    footer.className = 'flatpickr-today-footer';

    const todayBtn = document.createElement('button');
    todayBtn.type = 'button';
    todayBtn.className = 'flatpickr-today-btn';
    todayBtn.textContent = t('calendar.today') || 'Today';

    todayBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const today = new Date();
      fp.jumpToDate(today);

      // Use the original setDate so onChange behaves like a user selection.
      fp.__suppressChange = false;
      if (typeof fp.__origSetDate === 'function') {
        fp.__origSetDate(today, true);
      } else {
        fp.setDate(today, true);
      }
    });

    footer.appendChild(todayBtn);
    fp.calendarContainer.appendChild(footer);
  }

  // Attach pickers
  document.querySelectorAll('input[type="date"], input.datepicker').forEach((input) => {
    if (input._flatpickrInstance) return;

    if (input.type === "date") {
      // One-time wrap into display input + hidden ISO input
      if (input._wrapped) return;
      input._wrapped = true;

      const wrapper = document.createElement("div");
      wrapper.className = "date-input-wrapper";

      const displayInput = document.createElement("input");
      displayInput.type = "text";
      displayInput.className = "form-input date-display";

      // Set placeholder - all date inputs use the same format
      displayInput.placeholder = t('common.datePlaceholder');
      displayInput.maxLength = "10";

      // Hide original date input and keep ISO value there
      input.style.display = "none";
      input.type = "hidden";

      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      wrapper.appendChild(displayInput);

      const initialISO = input.value && looksLikeISO(input.value) ? input.value : "";
      if (initialISO) {
        displayInput.value = toDMYFromISO(initialISO);
      } else {
        displayInput.value = "";
      }

      const fp = flatpickrFn(displayInput, {
        ...dateConfig,
        defaultDate: initialISO ? new Date(initialISO) : null,
        onReady(_, __, inst) {
          addTodayButton(inst);
        },
        onOpen(_, __, inst) {
          if (!input.value && !inst.selectedDates.length) {
            inst.jumpToDate(new Date());
          }
        },
        onChange: function (selectedDates) {
          const previousValue = input.value || '';
          let iso = "";
          if (selectedDates.length > 0) {
            const d = selectedDates[0];
            iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
              d.getDate()
            ).padStart(2, "0")}`;
          }
          input.value = iso;

          const form = document.getElementById("task-form");
          if (form && (input.name === "startDate" || input.name === "endDate")) {
            const modal = document.querySelector('.modal.active');
            if (modal) {
              const startInput = modal.querySelector('input[name="startDate"]');
              const endInput = modal.querySelector('input[name="endDate"]');

              if (startInput && endInput) {
                const startValue = (startInput.value || '').trim();
                const endValue = (endInput.value || '').trim();

                if (startValue && endValue && endValue < startValue) {
                  input.value = previousValue;
                  if (previousValue) {
                    displayInput._flatpickr.setDate(new Date(previousValue), false);
                  } else {
                    displayInput._flatpickr.clear();
                  }

                  const wrapper = displayInput.closest('.date-input-wrapper');
                  const formGroup = wrapper ? wrapper.closest('.form-group') : null;

                  if (formGroup) {
                    const existingError = formGroup.querySelector('.date-validation-error');
                    if (existingError) existingError.remove();

                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'date-validation-error';
                    errorMsg.style.cssText = 'color: var(--error); font-size: 12px; margin-top: 6px; padding: 8px 12px; background: var(--bg-error, rgba(239, 68, 68, 0.08)); border-left: 3px solid var(--error); border-radius: 4px;';
                    errorMsg.innerHTML = '⚠️ ' + (input.name === "endDate" ? 'End Date cannot be before Start Date' : 'Start Date cannot be after End Date');

                    wrapper.parentNode.insertBefore(errorMsg, wrapper.nextSibling);
                    setTimeout(() => { if (errorMsg.parentElement) errorMsg.remove(); }, 5000);
                  }
                  return;
                } else {
                  const wrapper = displayInput.closest('.date-input-wrapper');
                  const formGroup = wrapper ? wrapper.closest('.form-group') : null;
                  if (formGroup) {
                    const existingError = formGroup.querySelector('.date-validation-error');
                    if (existingError) existingError.remove();
                  }
                }
              }
            }
          }

          // Handle filter date inputs
          if (input.id === "filter-date-from") {
            filterState.dateFrom = iso;
            updateFilterBadges();
            renderAfterFilterChange();
            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
              renderCalendar();
            }
            updateClearButtonVisibility();
            return;
          } else if (input.id === "filter-date-to") {
            filterState.dateTo = iso;
            updateFilterBadges();
            renderAfterFilterChange();
            const calendarView = document.getElementById("calendar-view");
            if (calendarView) {
              renderCalendar();
            }
            updateClearButtonVisibility();
            return;
          }

          // Persist only when:
          // - this field is a task date field (startDate or endDate)
          // - a task is being edited
          // - the change was user-initiated (not programmatic)
          const isEditing = !!(form && form.dataset.editingTaskId);
          const fieldName = input.name;
          const isDateField = fieldName === "startDate" || fieldName === "endDate";
          if (isEditing && isDateField && !fp.__suppressChange) {
            updateTaskField(fieldName, iso);
            return;
          }

          // Handle project date changes (si usan type="date" envueltos)
          if (displayInput.classList.contains('editable-date') && !fp.__suppressChange) {
            // Extraer info del atributo onchange original (método modular)
            const onchangeAttr = displayInput.getAttribute('onchange');
            if (onchangeAttr && onchangeAttr.includes('updateProjectField')) {
              const match = onchangeAttr.match(/updateProjectField\((\d+),\s*['"](\w+)['"]/);
              if (match) {
                const projectId = parseInt(match[1], 10);
                const field = match[2];
                // Llamada directa a la función modular (sin window)
                updateProjectField(projectId, field, displayInput.value);
              }
            }
          }
        },
      });

      patchProgrammaticGuards(fp);
      addDateMask(displayInput, fp);
      input._flatpickrInstance = fp;

      // Add an explicit Clear button for task date fields
      const inTaskForm = !!displayInput.closest('#task-form');
      const isTaskDateField = input.name === 'startDate' || input.name === 'endDate';
      if (inTaskForm && isTaskDateField) {
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = 'Clear';
        clearBtn.style.padding = '6px 10px';
        clearBtn.style.border = '1px solid var(--border)';
        clearBtn.style.background = 'var(--bg-tertiary)';
        clearBtn.style.color = 'var(--text-secondary)';
        clearBtn.style.borderRadius = '6px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.style.flex = '0 0 auto';

        const wrapperNode = displayInput.parentElement;
        if (wrapperNode) {
          wrapperNode.style.display = 'flex';
          wrapperNode.style.gap = '8px';
        }

        wrapperNode.appendChild(clearBtn);
        clearBtn.addEventListener('click', () => {
          displayInput.value = '';
          input.value = '';
          if (fp) {
            fp.__suppressChange = true;
            fp.clear();
            setTimeout(() => (fp.__suppressChange = false), 0);
          }
          const form = document.getElementById('task-form');
          const isEditing = !!(form && form.dataset.editingTaskId);
          if (isEditing) {
            updateTaskField(input.name, '');
          }
        });
      }
    } else {
      // 🌟 CORRECCIÓN AQUI: Plain text inputs with .datepicker (Project Fields)
      input.maxLength = "10";
      const fp = flatpickrFn(input, {
        ...dateConfig,
        defaultDate: null,
        onReady(_, __, inst) {
          addTodayButton(inst);
        },
        onChange: function (selectedDates, dateStr) {
          if (fp.__suppressChange) return;

          // Check if this is a project date field using data attributes
          const projectId = input.dataset.projectId;
          const fieldName = input.dataset.field;

          if (projectId && fieldName) {
            // This is a project date field - call updateProjectField directly
            updateProjectField(parseInt(projectId, 10), fieldName, dateStr);
          }
        },
      });

      patchProgrammaticGuards(fp);
      addDateMask(input, fp);
      input._flatpickrInstance = fp;
    }
  });
}

function getFlatpickrLocale() {
  const lang = getCurrentLanguage();
  const l10n = window.flatpickr?.l10ns;
  let locale = null;
  if (lang === 'es' && l10n?.es) {
    locale = l10n.es;
  } else {
    locale = l10n?.default || l10n?.en || l10n?.es || null;
  }
  return locale ? { ...locale, firstDayOfWeek: 1 } : { firstDayOfWeek: 1 };
}

function refreshFlatpickrLocale() {
  const locale = getFlatpickrLocale();
  document.querySelectorAll('input').forEach((input) => {
    const fp = input._flatpickrInstance;
    if (fp && typeof fp.set === 'function') {
      fp.set('locale', locale);
      if (typeof fp.redraw === 'function') {
        fp.redraw();
      }
    }
  });
}

// Prevent double initialization
let isInitialized = false;

async function init() {
    // Prevent multiple simultaneous initializations
    if (isInitialized) {
        // console.log('[PERF] Init already completed, skipping duplicate call');
        return;
    }
    isInitialized = true;

    // console.time('[PERF] Total Init Time');

    // Don't initialize if not authenticated (auth.js will call this when ready)
    if (!localStorage.getItem('authToken') && !localStorage.getItem('adminToken')) {
        console.log('Waiting for authentication before initializing app...');
        isInitialized = false;
        return;
    }

    // console.time('[PERF] Authentication Check');
    // Progress tracking
    if (typeof updateBootSplashProgress === 'function') {
        updateBootSplashProgress(10); // Starting initialization
    }
    // console.timeEnd('[PERF] Authentication Check');

    // Clear old data before loading new user's data
    // This ensures clean state when switching users
    projects = [];
    tasks = [];
    feedbackItems = [];
    feedbackIndex = [];
    projectCounter = 1;
    taskCounter = 1;

    isInitializing = true;

    if (typeof updateBootSplashProgress === 'function') {
        updateBootSplashProgress(20); // Loading data...
    }

    // console.time('[PERF] Load All Data');
    const allDataPromise = loadAllData();
    const sortStatePromise = loadSortStateData().catch(() => null);
    const projectColorsPromise = loadProjectColorsData().catch(() => ({}));
    const settingsPromise = loadSettingsData().catch(() => ({}));
    const historyPromise = window.historyService?.loadHistory
        ? window.historyService.loadHistory().catch(() => null)
        : Promise.resolve(null);

    const [allData, sortState, loadedProjectColors, loadedSettings] = await Promise.all([
        allDataPromise,
        sortStatePromise,
        projectColorsPromise,
        settingsPromise,
        historyPromise,
    ]);
    // console.timeEnd('[PERF] Load All Data');

    if (typeof updateBootSplashProgress === 'function') {
        updateBootSplashProgress(60); // Data loaded, applying...
    }

    applyLoadedAllData(allData);
    if (feedbackDeltaQueue.length > 0) {
        scheduleFeedbackDeltaFlush(0);
    }

    // Apply sort prefs (keep the same normalization behavior as loadSortPreferences)
    if (sortState && typeof sortState === "object") {
        const savedMode = sortState.sortMode;
        const savedOrder = sortState.manualTaskOrder;
        if (savedMode) sortMode = savedMode;
        if (savedOrder) manualTaskOrder = savedOrder;
    } else {
        try {
            const lm = localStorage.getItem('sortMode');
            const lo = localStorage.getItem('manualTaskOrder');
            if (lm) sortMode = lm;
            if (lo) manualTaskOrder = JSON.parse(lo);
        } catch (err) {}
    }
    // Normalize/guard persisted values (older versions used 'auto' to mean priority ordering)
    if (sortMode === 'auto' || (sortMode !== 'priority' && sortMode !== 'manual')) {
        sortMode = 'priority';
    }
    updateSortUI();

    projectColorMap = loadedProjectColors && typeof loadedProjectColors === "object" ? loadedProjectColors : {};

    if (loadedSettings && typeof loadedSettings === "object") {
        settings = { ...settings, ...loadedSettings };
    }
    settings.language = normalizeLanguage(settings.language);
    applyWorkspaceLogo(); // Apply any custom workspace logo

    // Sync window.enableReviewStatus with settings
    if (typeof settings.enableReviewStatus !== 'undefined') {
        window.enableReviewStatus = settings.enableReviewStatus;
        localStorage.setItem('enableReviewStatus', String(settings.enableReviewStatus));
    }
    applyReviewStatusVisibility(); // Apply review status visibility
    applyBacklogColumnVisibility(); // Apply backlog column visibility

    if (typeof updateBootSplashProgress === 'function') {
        updateBootSplashProgress(75); // Setting up UI...
    }

    // console.time('[PERF] Setup UI');
    // Basic app setup
    setupNavigation();
    setupStatusDropdown();
    setupPriorityDropdown();
    setupProjectDropdown();
    setupUserMenus();
    setupNotificationMenu();
    hydrateUserProfile();
    initializeDatePickers();
    initFiltersUI();
    setupModalTabs();
    applyLanguage();
    // console.timeEnd('[PERF] Setup UI');

    if (typeof updateBootSplashProgress === 'function') {
        updateBootSplashProgress(90); // Rendering...
    }

    // Finished initializing - allow saves again
    isInitializing = false;

    // console.time('[PERF] Initial Rendering');
    // On a full refresh, always start with a clean slate (no persisted filters).
    // This intentionally ignores any hash query params and clears any saved view state.
    filterState.search = "";
    filterState.statuses.clear();
    filterState.priorities.clear();
    filterState.projects.clear();
    filterState.tags.clear();
    filterState.datePresets.clear();
    filterState.dateFrom = "";
    filterState.dateTo = "";

    projectFilterState.search = "";
    projectFilterState.statuses.clear();
    projectFilterState.taskFilter = "";
    projectFilterState.updatedFilter = "all";

    try { localStorage.removeItem('projectsViewState'); } catch (e) {}
    try { localStorage.removeItem('kanbanUpdatedFilter'); } catch (e) {}
    window.kanbanUpdatedFilter = 'all';

    // Allow URL parameters to persist for deep linking and sharing filtered views

    // Check for URL hash
    const hash = window.location.hash.slice(1);
    const validPages = ['dashboard', 'projects', 'tasks', 'updates', 'feedback', 'calendar'];

    // Clear all nav highlights first
    document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));

    if (hash === 'calendar') {
        // Show calendar view directly on initial load
        showCalendarView();
    } else if (hash === 'dashboard/recent_activity') {
        // Handle recent activity subpage
        document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
        showPage('dashboard/recent_activity');
    } else if (hash.startsWith('project-')) {
        // Handle project detail URLs
        const projectId = parseInt(hash.replace('project-', ''));
        document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
        showProjectDetails(projectId);
    } else {
        // Normal page navigation
        const pageToShow = validPages.includes(hash) ? (hash === 'calendar' ? 'tasks' : hash) : 'dashboard';
        const navItem = document.querySelector(`.nav-item[data-page="${pageToShow}"]`);
        if (hash === 'calendar') {
            // Ensure calendar nav is highlighted
            document.querySelector('.nav-item.calendar-nav')?.classList.add('active');
        } else {
            if (navItem) navItem.classList.add("active");
        }
        showPage(pageToShow);
        if (hash === 'calendar') {
            // Switch to calendar sub-view after tasks page mounts
            document.querySelector('.kanban-board')?.classList.add('hidden');
            document.getElementById('list-view')?.classList.remove('active');
            document.getElementById('calendar-view')?.classList.add('active');
            const viewToggle = document.querySelector('.view-toggle');
            if (viewToggle) viewToggle.classList.add('hidden');
            // Hide filters in calendar view
            const globalFilters = document.getElementById('global-filters');
            if (globalFilters) globalFilters.style.display = 'none';
            renderCalendar();
        }
    }

    // Initial rendering
    render();
    // console.timeEnd('[PERF] Initial Rendering');

    // console.time('[PERF] Paint & Finalize');
    // Ensure the first render is actually painted before we claim "ready"
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    // Initialization complete
    if (typeof updateBootSplashProgress === 'function') {
        updateBootSplashProgress(100); // Complete!
    }

    // console.time('[PERF] Initialize Notifications');
    // Initialize notifications ONCE after app is fully loaded
    // This is much faster than running on every notification state build
    if (!USE_SERVER_NOTIFICATIONS) {
        checkAndCreateDueTodayNotifications();
        cleanupOldNotifications();
    }
    // console.timeEnd('[PERF] Initialize Notifications');
    // console.timeEnd('[PERF] Paint & Finalize');

    // console.timeEnd('[PERF] Total Init Time');

    // Route handler function (used for both initial load and hashchange)
    function handleRouting() {
        const hash = window.location.hash.slice(1); // Remove #

        // Parse hash and query parameters
        const [page, queryString] = hash.split('?');
        const params = new URLSearchParams(queryString || '');

        // Skip auth-related hashes (let auth.js handle these)
        if (page === 'login' || page === 'admin-login' || page === 'setup') {
            return;
        }

        // Clear all nav highlights first
        document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));

        if (page === 'dashboard/recent_activity') {
            projectNavigationReferrer = 'projects'; // Reset referrer when leaving project details
            document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
            showPage('dashboard/recent_activity');
            previousPage = page;
        } else if (page.startsWith('project-')) {
            const projectId = parseInt(page.replace('project-', ''));
            document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
            showProjectDetails(projectId);
            previousPage = page;
        } else if (page === 'calendar') {
            projectNavigationReferrer = 'projects'; // Reset referrer when leaving project details
            // Avoid thrashing: highlight and ensure calendar is visible
            document.querySelector('.nav-item.calendar-nav')?.classList.add('active');
            showCalendarView();
            previousPage = page;
        } else if (page === 'tasks') {
            projectNavigationReferrer = 'projects'; // Reset referrer when leaving project details
            document.querySelector('.nav-item[data-page="tasks"]')?.classList.add("active");

            // Apply ALL filters from URL parameters BEFORE showing page

            // Search filter
            if (params.has('search')) {
                filterState.search = (params.get('search') || '').trim().toLowerCase();
            } else {
                filterState.search = '';
            }

            // Status filters
            if (params.has('status')) {
                const statuses = params.get('status').split(',').filter(Boolean);
                filterState.statuses.clear();
                statuses.forEach(s => filterState.statuses.add(s.trim()));
            } else {
                filterState.statuses.clear();
            }

            // Priority filters
            if (params.has('priority')) {
                const priorities = params.get('priority').split(',').filter(Boolean);
                filterState.priorities.clear();
                priorities.forEach(p => filterState.priorities.add(p.trim()));
            } else {
                filterState.priorities.clear();
            }

            // Project filters
            if (params.has('project')) {
                const projectIds = params.get('project').split(',').filter(Boolean);
                filterState.projects.clear();
                projectIds.forEach(id => filterState.projects.add(id.trim()));
            } else {
                filterState.projects.clear();
            }

            // Tag filters
            if (params.has('tags')) {
                const tags = params.get('tags').split(',').filter(Boolean);
                filterState.tags.clear();
                tags.forEach(t => filterState.tags.add(t.trim()));
            } else {
                filterState.tags.clear();
            }

            // Date preset filters
            if (params.has('datePreset')) {
                const datePresetParam = params.get('datePreset') || '';
                const presets = datePresetParam.split(',').filter(Boolean);
                filterState.datePresets.clear();
                presets.forEach(p => filterState.datePresets.add(p.trim()));
                // Clear manual date inputs when preset is set
                filterState.dateFrom = '';
                filterState.dateTo = '';
                filterState.dateField = 'endDate'; // Default to end date
            } else if (params.has('dateFrom') || params.has('dateTo')) {
                const dateFrom = params.get('dateFrom') || '';
                const dateTo = params.get('dateTo') || '';
                filterState.dateFrom = dateFrom;
                filterState.dateTo = dateTo;
                filterState.dateField = params.get('dateField') || 'endDate'; // Use startDate or endDate
                // Clear preset when manual dates are set
                filterState.datePresets.clear();
            } else {
                filterState.datePresets.clear();
                filterState.dateFrom = '';
                filterState.dateTo = '';
                filterState.dateField = 'endDate';
            }

            // Handle updated filter (last 5 minutes, etc.)
            if (params.has('updated')) {
                const updatedValue = params.get('updated');
                const allowed = new Set(['all', '5m', '30m', '24h', 'week', 'month']);
                if (allowed.has(updatedValue)) {
                    try {
                        setKanbanUpdatedFilter(updatedValue, { render: false });
                    } catch (e) {
                        console.error('Failed to set kanbanUpdatedFilter from URL:', e);
                    }
                }
            }

            // Handle view parameter (kanban, list, or calendar)
            if (params.has('view')) {
                const view = params.get('view');
                if (view === 'list' || view === 'kanban' || view === 'calendar') {
                    setTimeout(() => {
                        const viewButtons = document.querySelectorAll('.view-btn');
                        const viewButton = Array.from(viewButtons).find(btn => btn.dataset.view === view);
                        if (viewButton && !viewButton.classList.contains('active')) {
                            viewButton.click();
                        }
                    }, 100);
                }
            }

            // Now show the page (which will render with updated filters and handle view logic)
            showPage('tasks');

            // Update ALL filter UI inputs after page is shown (use setTimeout to ensure DOM is ready)
            setTimeout(() => {
                // Search input - always update to match filterState
                const searchEl = document.getElementById('filter-search');
                if (searchEl) searchEl.value = filterState.search;

                // Status checkboxes
                document.querySelectorAll('input[data-filter="status"]').forEach(cb => {
                    cb.checked = filterState.statuses.has(cb.value);
                });

                // Priority checkboxes
                document.querySelectorAll('input[data-filter="priority"]').forEach(cb => {
                    cb.checked = filterState.priorities.has(cb.value);
                });

                // Project checkboxes
                document.querySelectorAll('input[data-filter="project"]').forEach(cb => {
                    cb.checked = filterState.projects.has(cb.value);
                });

                // Tag checkboxes
                document.querySelectorAll('input[data-filter="tag"]').forEach(cb => {
                    cb.checked = filterState.tags.has(cb.value);
                });

                // Date preset checkboxes
                document.querySelectorAll('input[data-filter="date-preset"]').forEach(cb => {
                    cb.checked = filterState.datePresets.has(cb.value);
                });

                // Date range inputs
                const dateFromEl = document.getElementById('filter-date-from');
                const dateToEl = document.getElementById('filter-date-to');

                if (dateFromEl && filterState.dateFrom) {
                    dateFromEl.value = filterState.dateFrom;
                    const displayInput = dateFromEl.closest('.date-input-wrapper')?.querySelector('.date-display');
                    if (displayInput) displayInput.value = formatDate(filterState.dateFrom);
                }

                if (dateToEl && filterState.dateTo) {
                    dateToEl.value = filterState.dateTo;
                    const displayInput = dateToEl.closest('.date-input-wrapper')?.querySelector('.date-display');
                    if (displayInput) displayInput.value = formatDate(filterState.dateTo);
                }

                // Update filter badges and active chips to reflect URL filters
                updateFilterBadges();
                renderActiveFilterChips();
                updateClearButtonVisibility();
            }, 100);

            previousPage = page;
        } else if (page === 'projects') {
            projectNavigationReferrer = 'projects'; // Reset referrer when leaving project details
            document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");

            // Parse URL parameters for deep linking (similar to Tasks page)
            const urlProjectFilters = {};

            if (params.has('search')) {
                urlProjectFilters.search = params.get('search');
            }

            // Status filter (comma-separated: planning, active, completed)
            if (params.has('status')) {
                const statuses = params.get('status').split(',').filter(Boolean);
                const validStatuses = ['planning', 'active', 'completed'];
                urlProjectFilters.statuses = statuses.filter(s => validStatuses.includes(s.trim()));
            }

            // Chip filter (has-tasks or no-tasks)
            if (params.has('filter')) {
                const filter = params.get('filter');
                const validFilters = ['has-tasks', 'no-tasks'];
                if (validFilters.includes(filter)) {
                    urlProjectFilters.filter = filter;
                }
            }

            if (params.has('sort')) {
                const sort = params.get('sort');
                const validSorts = ['default', 'name', 'created-desc', 'updated-desc', 'tasks-desc', 'completion-desc'];
                if (validSorts.includes(sort)) {
                    urlProjectFilters.sort = sort;
                }
            }

            if (params.has('sortDirection')) {
                const sortDirection = params.get('sortDirection');
                if (sortDirection === 'asc' || sortDirection === 'desc') {
                    urlProjectFilters.sortDirection = sortDirection;
                }
            }

            if (params.has('updatedFilter')) {
                const updatedFilter = params.get('updatedFilter');
                const validUpdatedFilters = ['all', '5m', '30m', '24h', 'week', 'month'];
                if (validUpdatedFilters.includes(updatedFilter)) {
                    urlProjectFilters.updatedFilter = updatedFilter;
                }
            }

            // Store URL filters temporarily for setupProjectsControls to use
            window.urlProjectFilters = urlProjectFilters;

            showPage('projects');
            previousPage = page;
        } else if (page === 'updates') {
            projectNavigationReferrer = 'projects'; // Reset referrer when leaving project details
            document.querySelector('.nav-item[data-page="updates"]')?.classList.add("active");
            showPage('updates');
            previousPage = page;
        } else if (page === 'feedback') {
            projectNavigationReferrer = 'projects'; // Reset referrer when leaving project details
            document.querySelector('.nav-item[data-page="feedback"]')?.classList.add("active");
            showPage('feedback');
            previousPage = page;
        } else if (page === '' || page === 'dashboard') {
            projectNavigationReferrer = 'projects'; // Reset referrer when leaving project details
            document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
            showPage('dashboard');
            previousPage = page || 'dashboard';
        }
    }

    // Handle initial URL on page load
    handleRouting();

    // Add hashchange event listener for URL routing
    window.addEventListener('hashchange', handleRouting);

    // View switching between Kanban, List, and Calendar
    document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
            const button = e.currentTarget;
            button.classList.add("active");

            const view = (button.dataset.view || '').toLowerCase();
            try {
                const backlogBtn = document.getElementById('backlog-quick-btn');
                if (backlogBtn) backlogBtn.style.display = (view === 'kanban') ? 'inline-flex' : 'none';
            } catch (e) {}

            document.querySelector(".kanban-board").classList.add("hidden");
            document.getElementById("list-view").classList.remove("active");
            document.getElementById("calendar-view").classList.remove("active");

            // Restore "All Tasks" title when leaving calendar
            const pageTitle = document.querySelector('#tasks .page-title');
            if (pageTitle) pageTitle.textContent = t('tasks.title');

            if (view === "list") {
                // Show filters in list view
                const globalFilters = document.getElementById('global-filters');
                if (globalFilters) globalFilters.style.display = '';
                document.getElementById("list-view").classList.add("active");
                renderListView();
                updateSortUI();
                // ensure kanban header is in default state
                try{ document.querySelector('.kanban-header')?.classList.remove('calendar-mode'); }catch(e){}
                // Hide kanban settings in list view
                const kanbanSettingsContainer = document.getElementById('kanban-settings-btn')?.parentElement;
                if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = 'none';
                // Update URL to include view parameter
                syncURLWithFilters();
            } else if (view === "kanban") {
                // Show backlog button in kanban view
                const backlogBtn = document.getElementById('backlog-quick-btn');
                if (backlogBtn) backlogBtn.style.display = 'inline-flex';
                // Show filters in kanban view
                const globalFilters = document.getElementById('global-filters');
                if (globalFilters) globalFilters.style.display = '';
                document.querySelector(".kanban-board").classList.remove("hidden");
                renderTasks();
                updateSortUI();
                // ensure kanban header is in default state
                try{ document.querySelector('.kanban-header')?.classList.remove('calendar-mode'); }catch(e){}
                // Show kanban settings in kanban view
                const kanbanSettingsContainer = document.getElementById('kanban-settings-btn')?.parentElement;
                if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = '';
                // Update URL to remove view parameter (kanban is default)
                syncURLWithFilters();
            } else if (view === "calendar") {
                const cal = document.getElementById("calendar-view");
                if (!cal) return;
                // Hide only the backlog quick button in calendar view (keep filters visible)
                const backlogBtn = document.getElementById('backlog-quick-btn');
                if (backlogBtn) backlogBtn.style.display = 'none';
                // Hide kanban settings in calendar view
                const kanbanSettingsContainer = document.getElementById('kanban-settings-btn')?.parentElement;
                if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = 'none';
                // Step 1: mark as preparing and render offscreen
                cal.classList.add('preparing');
                // Ensure grid exists to populate
                renderCalendar();
                // Step 2: after bars are drawn, swap to active and clear preparing
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        // One more draw to be safe
                        renderProjectBars();
                        cal.classList.remove('preparing');
                        cal.classList.add('active');
                        updateSortUI();
                        // Update URL to include view parameter
                        syncURLWithFilters();
                    });
                });
            }
        });
    });

    // Kanban quick access: open Backlog in List view
    try {
        const existing = document.getElementById('backlog-quick-btn');
        const viewToggle = document.querySelector('.kanban-header .view-toggle');
        if (!existing && viewToggle && viewToggle.parentElement) {
            const backlogBtn = document.createElement('button');
            backlogBtn.type = 'button';
            backlogBtn.id = 'backlog-quick-btn';
            backlogBtn.className = 'backlog-quick-btn';
            backlogBtn.title = t('tasks.backlogQuickTitle');
            backlogBtn.textContent = t('tasks.backlogQuickLabel');
            backlogBtn.addEventListener('click', (evt) => {
                evt.preventDefault();
                window.location.hash = '#tasks?view=list&status=backlog';
            });
            viewToggle.insertAdjacentElement('afterend', backlogBtn);

            // Only show in Kanban view
            const activeView = (document.querySelector('.view-btn.active')?.dataset.view || '').trim().toLowerCase();
            backlogBtn.style.display = (activeView === 'kanban') ? 'inline-flex' : 'none';
        }
    } catch (e) {}
    
    // Setup dashboard interactions
    setupDashboardInteractions();
}

function setupDashboardInteractions() {
    // Time filter chips
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            filterChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const period = this.dataset.period;
            updateDashboardForPeriod(period);
        });
    });
    
    // Enhanced stat card interactions
    const statCards = document.querySelectorAll('.enhanced-stat-card');
    statCards.forEach(card => {
        // Hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        // Click to navigate to filtered tasks
        card.addEventListener('click', function() {
            const filterType = this.dataset.filter;
            const filterValue = this.dataset.value;
            
            if (filterType && filterValue) {
                navigateToFilteredTasks(filterType, filterValue);
            }
        });
    });
    
    // Quick action interactions
    const quickActions = document.querySelectorAll('.quick-action');
    quickActions.forEach(action => {
        action.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
}

function navigateToFilteredTasks(filterType, filterValue) {
    // Navigate to tasks page
    window.location.hash = 'tasks';
    
    // Clear all nav highlights and set tasks as active
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const tasksNavItem = document.querySelector('.nav-item[data-page="tasks"]');
    if (tasksNavItem) tasksNavItem.classList.add('active');
    
    // Show tasks page
    showPage('tasks');
    
    // Ensure view toggle is visible
    const viewToggle = document.querySelector('.view-toggle');
    if (viewToggle) viewToggle.classList.remove('hidden');
    
    // Switch to Kanban view
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    const kanbanBtn = document.querySelector('.view-btn:first-child');
    if (kanbanBtn) kanbanBtn.classList.add('active');
    
    // Show kanban, hide list and calendar
    const kanbanBoard = document.querySelector('.kanban-board');
    const listView = document.getElementById('list-view');
    const calendarView = document.getElementById('calendar-view');
    
    if (kanbanBoard) kanbanBoard.classList.remove('hidden');
    if (calendarView) calendarView.classList.remove('active');
    if (listView) listView.classList.remove('active');

    // ensure header returns to default when navigating to filtered Kanban
    try{ document.querySelector('.kanban-header')?.classList.remove('calendar-mode'); }catch(e){}
    
    // Clear existing filters first
    clearAllFilters();
    
    // Apply the specific filter
    setTimeout(() => {
        applyDashboardFilter(filterType, filterValue);
        renderTasks(); // Use renderTasks for Kanban view
    }, 100);
}

function applyDashboardFilter(filterType, filterValue) {
    if (filterType === 'status') {
        // Apply status filter
        filterState.statuses.clear();
        filterState.statuses.add(filterValue);
        
        // Update status filter UI
        const statusCheckboxes = document.querySelectorAll('input[data-filter="status"]');
        statusCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.value === filterValue;
        });
    } else if (filterType === 'priority') {
        // Apply priority filter
        filterState.priorities.clear();
        filterState.priorities.add(filterValue);
        
        // Also exclude completed tasks for priority filters
        filterState.statuses.clear();
        filterState.statuses.add('todo');
        filterState.statuses.add('progress');
        filterState.statuses.add('review');
        
        // Update priority filter UI
        const priorityCheckboxes = document.querySelectorAll('input[data-filter="priority"]');
        priorityCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.value === filterValue;
        });
        
        // Update status checkboxes
        const statusCheckboxes = document.querySelectorAll('input[data-filter="status"]');
        statusCheckboxes.forEach(checkbox => {
            checkbox.checked = ['todo', 'progress', 'review'].includes(checkbox.value);
        });
    } else if (filterType === 'overdue') {
        // Apply overdue filter by setting dateTo to today
        const today = new Date().toISOString().split('T')[0];
        filterState.dateTo = today;

        // Update the date filter inputs
        const dateToEl = document.getElementById('filter-date-to');
        if (dateToEl) {
            dateToEl.value = today;
        }
        
        // Exclude completed tasks
        filterState.statuses.clear();
        filterState.statuses.add('todo');
        filterState.statuses.add('progress');
        filterState.statuses.add('review');
        
        // Update status checkboxes
        const statusCheckboxes = document.querySelectorAll('input[data-filter="status"]');
        statusCheckboxes.forEach(checkbox => {
            checkbox.checked = ['todo', 'progress', 'review'].includes(checkbox.value);
        });
    }
    
    // Update filter badges and render
    updateFilterBadges();
    renderAfterFilterChange();
}

function updateDashboardForPeriod(period) {
    // This function would filter data based on the selected period
    // For now, we'll just update the stats labels to show the period
    const periodLabels = {
        week: t('dashboard.trend.thisWeek'),
        month: t('dashboard.trend.thisMonth'),
        quarter: t('dashboard.trend.thisQuarter')
    };
    
    const label = periodLabels[period] || t('dashboard.trend.thisWeek');
    
    // Update trend text with the selected period
    const progressChange = document.getElementById('progress-change');
    const completedChange = document.getElementById('completed-change');
    
    if (progressChange) {
        progressChange.textContent = `+${Math.max(1, Math.floor(tasks.length * 0.1))} ${label}`;
    }
    if (completedChange) {
        completedChange.textContent = `+${tasks.filter(t => t.status === 'done').length} ${label}`;
    }
    
    // Could add more sophisticated filtering here based on actual dates
}

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", () => {
            const page = item.dataset.page;
            if (page) {
                if (page === 'calendar') {
                    // Calendar nav: do not hard switch to tasks every time; call dedicated handler
                    showCalendarView();
                    // Highlight calendar nav explicitly
                    document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
                    item.classList.add('active');
                    return;
                }

                // CRITICAL: If navigating to Tasks, remove calendar/list active classes FIRST
                if (page === "tasks") {
                    document.getElementById("calendar-view")?.classList.remove("active");
                    document.getElementById("list-view")?.classList.remove("active");
                }

                // Update URL hash for bookmarking
                window.location.hash = page;

                // If navigating to Tasks without query params, clear any in-memory filters first
                // so the first render can't show stale/ghost results.
                if (page === "tasks") {
                    const hash = window.location.hash.slice(1);
                    const [hashPage, queryString] = hash.split("?");
                    const params = new URLSearchParams(queryString || "");
                    if (hashPage === "tasks" && params.toString() === "") {
                        filterState.search = "";
                        filterState.statuses.clear();
                        filterState.priorities.clear();
                        filterState.projects.clear();
                        filterState.tags.clear();
                        filterState.datePresets.clear();
                        filterState.dateFrom = "";
                        filterState.dateTo = "";
                        try { setKanbanUpdatedFilter('all', { render: false }); } catch (e) {}

                        const searchEl = document.getElementById("filter-search");
                        if (searchEl) searchEl.value = "";
                        document
                            .querySelectorAll('#global-filters input[type="checkbox"]')
                            .forEach((cb) => (cb.checked = false));
                    }
                }

                // Clear all nav highlights and set the clicked one
                document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
                item.classList.add("active");

                showPage(page);

                // Show view toggle only for tasks page
                const viewToggle = document.querySelector(".view-toggle");
                if (viewToggle) {
                    if (page === "tasks") {
                        viewToggle.classList.remove("hidden");
                    } else {
                        viewToggle.classList.add("hidden");
                    }
                }
            }
        });
    });
}

function showPage(pageId) {
    // Handle subpages (like dashboard/recent_activity)
    if (pageId.includes('/')) {
        const [mainPage, subPage] = pageId.split('/');
        if (mainPage === 'dashboard' && subPage === 'recent_activity') {
            showRecentActivityPage();
            return;
        }
    }

    // Scroll to top on mobile when switching pages (ensures mobile header is visible)
    if (window.innerWidth <= 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Hide ALL pages including project-details
    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
    document.getElementById("project-details").classList.remove("active");

    // Hide activity page when returning to main dashboard
    const activityPage = document.getElementById('activity-page');
    if (activityPage) activityPage.style.display = 'none';
    const dashboardGrid = document.querySelector('.dashboard-grid');
    if (dashboardGrid) dashboardGrid.style.display = 'grid';
    const insightsCard = document.querySelector('.insights-card');
    if (insightsCard) insightsCard.style.display = '';

    // Restore user menu when exiting project details
    const userMenu = document.querySelector(".user-menu");
    if (userMenu) userMenu.style.display = "";

    // Show the requested page
    document.getElementById(pageId).classList.add("active");

    if (pageId === "dashboard") {
        updateCounts();
        renderDashboard();
    } else if (pageId === "projects") {
        updateCounts();
        // Don't call renderProjects() here - setupProjectsControls() handles initial render with filters applied
        // Initialize projects header controls fresh whenever Projects page is shown
        try {
            populateProjectTagOptions();
            setupProjectsControls();
        } catch (e) { /* ignore */ }
    } else if (pageId === "tasks") {
        updateCounts();

        // Check if URL has a view parameter - if not, default to Kanban
        // This ensures "All Tasks" nav always defaults to Kanban view regardless of previous page
        const hash = window.location.hash.slice(1);
        const [, queryString] = hash.split('?');
        const params = new URLSearchParams(queryString || '');
        const hasViewParam = params.has('view');

        // Always reset to Kanban when no view parameter (e.g., clicking "All Tasks" from nav)
        if (!hasViewParam) {
            document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
            document.querySelector(".view-btn:nth-child(1)").classList.add("active");
            document.querySelector(".kanban-board").classList.remove("hidden");
            document.getElementById("list-view").classList.remove("active");
            document.getElementById("calendar-view").classList.remove("active");
            // Restore "All Tasks" title
            const pageTitle = document.querySelector('#tasks .page-title');
            if (pageTitle) pageTitle.textContent = t('tasks.title');
            // ensure header is in default (kanban) layout so Add Task stays right-aligned
            try{ document.querySelector('.kanban-header')?.classList.remove('calendar-mode'); }catch(e){}
            // Show kanban settings in tasks kanban view
            const kanbanSettingsContainer = document.getElementById('kanban-settings-btn')?.parentElement;
            if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = '';
            // Show backlog button in kanban view
            const backlogBtn = document.getElementById('backlog-quick-btn');
            if (backlogBtn) backlogBtn.style.display = 'inline-flex';
        }

        renderTasks();
        renderListView();
    } else if (pageId === "updates") {
        updateCounts();
        renderUpdatesPage();
        markLatestReleaseSeen();
    } else if (pageId === "feedback") {
        renderFeedback();
    }
}

function render() {
    updateCounts();
    renderDashboard();
    renderProjects();
    renderTasks();
    renderFeedback();
    renderUpdatesPage();
    renderListView();
    if (document.getElementById("calendar-view").classList.contains("active")) {
        renderCalendar();
    }
    renderAppVersionLabel();
}

function renderAppVersionLabel() {
    const label = APP_VERSION_LABEL;
    document.querySelectorAll('.app-version').forEach((el) => (el.textContent = label));
    document.querySelectorAll('.mobile-version').forEach((el) => (el.textContent = label));
}

function renderReleaseSectionList(items) {
    const normalizedItems = (items || []).map((item) => resolveReleaseText(item)).filter(Boolean);
    if (!normalizedItems.length) {
        return `<div class="release-section-empty">${t('updates.sectionEmpty')}</div>`;
    }
    return `
        <ul class="release-list">
            ${normalizedItems.map((item) => `<li><span class="release-point-icon" aria-hidden="true"></span><span>${escapeHtml(item)}</span></li>`).join('')}
        </ul>
    `;
}

function renderUpdatesPage() {
    const container = document.getElementById('updates-content');
    if (!container) return;
    const releases = getSortedReleaseNotes();
    if (releases.length === 0) {
        container.innerHTML = `<div class="updates-empty">${t('updates.empty')}</div>`;
        return;
    }

    const latest = releases[0];
    const history = releases.slice(1);
    const latestTitle = [latest.version, resolveReleaseText(latest.title)].filter(Boolean).join(' - ');
    const latestMeta = t('notifications.releaseMeta', { date: formatReleaseDate(latest.date) });
    const latestSummary = latest.summary ? escapeHtml(resolveReleaseText(latest.summary)) : '';
    const sections = latest.sections || {};
    const sectionDefs = [
        { key: 'new', label: t('updates.sections.new') },
        { key: 'improvements', label: t('updates.sections.improvements') },
        { key: 'fixes', label: t('updates.sections.fixes') }
    ];
    const sectionHtml = sectionDefs.map((def) => {
        const items = sections[def.key] || [];
        return `
            <div class="release-section-card release-section-card--${def.key}">
                <div class="release-section-card-header">
                    <span class="release-section-icon" data-kind="${def.key}" aria-hidden="true"></span>
                    <div>
                        <div class="release-section-title">${def.label}</div>
                    </div>
                </div>
                ${renderReleaseSectionList(items)}
            </div>
        `;
    }).join('');

    const historyHtml = history.length
        ? history.map((release) => {
            const title = [release.version, resolveReleaseText(release.title)].filter(Boolean).join(' - ');
            const meta = formatReleaseDate(release.date);
            const summary = release.summary ? escapeHtml(resolveReleaseText(release.summary)) : '';
            return `
                <div class="release-history-item">
                    <div class="release-history-title">${escapeHtml(title)}</div>
                    <div class="release-history-meta">${meta}</div>
                    ${summary ? `<div class="release-history-summary">${summary}</div>` : ''}
                </div>
            `;
        }).join('')
        : `<div class="release-history-empty">${t('updates.historyEmpty')}</div>`;

    container.innerHTML = `
        <div class="release-notes-stack">
            <article class="release-hero" data-release-id="${latest.id}" aria-label="${t('updates.latestLabel')}">
                <div class="release-hero-top">
                    <span class="release-badge">${t('updates.latestLabel')}</span>
                    <span class="release-hero-meta">${latestMeta}</span>
                </div>
                <div class="release-hero-title">${escapeHtml(latestTitle)}</div>
                ${latestSummary ? `<p class="release-hero-summary">${latestSummary}</p>` : ''}
            </article>
            <div class="release-section-stack">
                ${sectionHtml}
            </div>
            <section class="release-history-block" aria-label="${t('updates.historyLabel')}">
                <div class="release-history-header">
                    <div>
                        <div class="release-history-label">${t('updates.historyLabel')}</div>
                        <div class="release-history-subtitle">${t('updates.subtitle')}</div>
                    </div>
                </div>
                <div class="release-history-list">
                    ${historyHtml}
                </div>
            </section>
        </div>
    `;
}






function renderDashboard() {
    updateDashboardStats();
    renderProjectProgressBars();
    renderActivityFeed();
    renderInsights();
    animateDashboardElements();

    // Add click handler for Projects stat card
    const projectsStatCard = document.getElementById('projects-stat-card');
    if (projectsStatCard) {
        projectsStatCard.onclick = () => {
            window.location.hash = 'projects';
        };
    }
}

function updateDashboardStats() {
    // Hero stats
    const activeProjects = projects.length;
    const activeTasks = tasks.filter(t => t.status !== 'backlog'); // Exclude backlog from statistics
    const completedTasks = activeTasks.filter(t => t.status === 'done').length;
    const totalTasks = activeTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update hero numbers
    document.getElementById('hero-active-projects').textContent = activeProjects;
    document.getElementById('hero-completion-rate').textContent = `${completionRate}%`;

    // Update completion ring
    const circle = document.querySelector('.progress-circle');
    const circumference = 2 * Math.PI * 45; // radius = 45
    const offset = circumference - (completionRate / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    document.getElementById('ring-percentage').textContent = `${completionRate}%`;

    // Enhanced stats (exclude backlog)
    const inProgressTasks = activeTasks.filter(t => t.status === 'progress').length;
    const pendingTasks = activeTasks.filter(t => t.status === 'todo').length;
    const reviewTasks = activeTasks.filter(t => t.status === 'review').length;
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = activeTasks.filter(t => t.endDate && t.endDate < today && t.status !== 'done').length;
    const highPriorityTasks = activeTasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
    const milestones = projects.filter(p => p.endDate).length;
    
    document.getElementById('in-progress-tasks').textContent = inProgressTasks;
    document.getElementById('pending-tasks-new').textContent = pendingTasks;
    document.getElementById('completed-tasks-new').textContent = completedTasks;
    document.getElementById('overdue-tasks').textContent = overdueTasks;
    document.getElementById('high-priority-tasks').textContent = highPriorityTasks;
    document.getElementById('research-milestones').textContent = milestones;
    
    // Update trend indicators with dynamic data
    updateTrendIndicators();
}

function updateTrendIndicators() {
    const thisWeekCompleted = tasks.filter(t => {
        if (t.status !== 'done' || !t.completedDate) return false;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(t.completedDate) > weekAgo;
    }).length;
    
    const dueTodayCount = tasks.filter(t => {
        if (!t.endDate || t.status === 'done') return false;
        const today = new Date().toDateString();
        return new Date(t.endDate).toDateString() === today;
    }).length;
    
    document.getElementById('progress-change').textContent = `+${Math.max(1, Math.floor(tasks.length * 0.1))} ${t('dashboard.trend.thisWeek')}`;
    document.getElementById('pending-change').textContent = dueTodayCount > 0
        ? t(dueTodayCount === 1 ? 'dashboard.trend.dueTodayOne' : 'dashboard.trend.dueTodayMany', { count: dueTodayCount })
        : t('dashboard.trend.onTrack');
    document.getElementById('completed-change').textContent = `+${thisWeekCompleted} ${t('dashboard.trend.thisWeek')}`;
    const today = new Date().toISOString().split('T')[0];
    const overdueCount = tasks.filter(t =>
        t.status !== 'backlog' &&
        t.status !== 'done' &&
        t.endDate &&
        t.endDate < today
    ).length;
    const overdueChangeEl = document.getElementById('overdue-change');
    if (overdueChangeEl) {
        overdueChangeEl.textContent = overdueCount > 0
            ? t('dashboard.trend.needsAttention')
            : t('dashboard.trend.allOnTrack');
        overdueChangeEl.classList.toggle('negative', overdueCount > 0);
        overdueChangeEl.classList.toggle('positive', overdueCount === 0);
        overdueChangeEl.classList.remove('neutral');
    }

    // "Critical" = high-priority tasks due within the next 7 days (including overdue)
    const criticalHighPriority = tasks.filter(t => {
        if (t.status === 'done') return false;
        if (t.priority !== 'high') return false;
        if (!t.endDate) return false;
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const end = new Date(t.endDate);
        const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const diffDays = Math.round((endMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        return diffDays <= 7; // due in <= 7 days, or already overdue
    }).length;
    document.getElementById('priority-change').textContent =
        criticalHighPriority > 0
            ? t(criticalHighPriority === 1 ? 'dashboard.trend.criticalOne' : 'dashboard.trend.criticalMany', { count: criticalHighPriority })
            : t('dashboard.trend.onTrack');
    const completedProjects = projects.filter(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const completedProjectTasks = projectTasks.filter(t => t.status === 'done');
        return projectTasks.length > 0 && completedProjectTasks.length === projectTasks.length;
    }).length;
    document.getElementById('milestones-change').textContent = completedProjects > 0
        ? t(completedProjects === 1 ? 'dashboard.trend.completedOne' : 'dashboard.trend.completedMany', { count: completedProjects })
        : t('dashboard.trend.inProgress');
}

function renderProjectProgressBars() {
    const container = document.getElementById('project-progress-bars');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">🌊</div>
                <div style="font-size: 16px; margin-bottom: 8px;">${t('dashboard.emptyProjects.title')}</div>
                <div style="font-size: 14px;">${t('dashboard.emptyProjects.subtitle')}</div>
            </div>
        `;
        return;
    }
    
    const progressBars = projects.slice(0, 5).map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id && t.status !== 'backlog'); // Exclude backlog
        const completed = projectTasks.filter(t => t.status === 'done').length;
        const inProgress = projectTasks.filter(t => t.status === 'progress').length;
        const review = projectTasks.filter(t => t.status === 'review').length;
        const todo = projectTasks.filter(t => t.status === 'todo').length;
        const total = projectTasks.length;
        
        const completedPercent = total > 0 ? (completed / total) * 100 : 0;
        const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
        const reviewPercent = total > 0 ? (review / total) * 100 : 0;
        const todoPercent = total > 0 ? (todo / total) * 100 : 0;
        
        return `
            <div class="progress-bar-item clickable-project" data-action="showProjectDetails" data-param="${project.id}" style="cursor: pointer; transition: all 0.2s ease;">
                <div class="project-progress-header">
                    <span class="project-name">${project.name}</span>
                    <span class="task-count">${completed}/${total} ${t('dashboard.tasks')}</span>
                </div>
                <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; display: flex;">
                    <div style="background: var(--accent-green); width: ${completedPercent}%; transition: width 0.5s ease;"></div>
                    <div style="background: var(--accent-blue); width: ${inProgressPercent}%; transition: width 0.5s ease;"></div>
                    <div style="background: var(--accent-amber); width: ${reviewPercent}%; transition: width 0.5s ease;"></div>
                    <div style="background: var(--text-muted); width: ${todoPercent}%; transition: width 0.5s ease;"></div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = progressBars;
}

function renderActivityFeed() {
    const container = document.getElementById('activity-feed');
    if (!container) return;
    
    // Create recent activity from tasks and projects
    const activities = [];
    
    // Recent completed tasks
    const recentCompleted = tasks
        .filter(t => t.status === 'done')
        .sort((a, b) => new Date(b.completedDate || b.createdAt || b.createdDate) - new Date(a.completedDate || a.createdAt || a.createdDate))
        .slice(0, 3);
    
    recentCompleted.forEach(task => {
        const project = projects.find(p => p.id === task.projectId);
        const activityDate = task.completedDate || task.createdAt || task.createdDate;
        const projectPart = project ? t('dashboard.activity.inProject', { project: project.name }) : '';
        activities.push({
            type: 'completed',
            text: t('dashboard.activity.completed', { title: task.title, projectPart }).trim(),
            timeText: formatRelativeTime(activityDate),
            date: activityDate,
            icon: '\u{2705}'
        });
    });
    
    // Recent new projects
    const recentProjects = projects
        .sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate))
        .slice(0, 2);
    
    recentProjects.forEach(project => {
        const projectDate = project.createdAt || project.createdDate;
        activities.push({
            type: 'created',
            text: t('dashboard.activity.createdProject', { project: project.name }),
            timeText: formatRelativeTime(projectDate),
            date: projectDate,
            icon: '🚀'
        });
    });
    
    // Recent new tasks
    const recentTasks = tasks
        .filter(t => t.status !== 'done')
        .sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate))
        .slice(0, 2);
    
    recentTasks.forEach(task => {
        const taskDate = task.createdAt || task.createdDate;
        const project = projects.find(p => p.id === task.projectId);
        const projectPart = project ? t('dashboard.activity.toProject', { project: project.name }) : '';
        activities.push({
            type: 'created',
            text: t('dashboard.activity.addedTask', { title: task.title, projectPart }).trim(),
            timeText: formatRelativeTime(taskDate),
            date: taskDate,
            icon: '📝'
        });
    });
    
    // Sort by most recent first using actual dates
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon completed">🌊</div>
                <div class="activity-content">
                    <div class="activity-text">${t('dashboard.activity.emptyTitle')}</div>
                    <div class="activity-time">${t('dashboard.activity.emptySubtitle')}</div>
                </div>
            </div>
        `;
        return;
    }
    
    const activityHTML = activities.slice(0, 4).map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
            </div>
            <div class="activity-date">${formatDashboardActivityDate(activity.date)}</div>
        </div>
    `).join('');
    
    container.innerHTML = activityHTML;
}


function showAllActivity() {
    // Update URL hash to create proper page routing
    window.location.hash = 'dashboard/recent_activity';
}

function backToDashboard() {
    // Navigate back to main dashboard
    window.location.hash = 'dashboard';
}

function showRecentActivityPageLegacy() {
    // Hide all main pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show dashboard page but hide its main content
    document.getElementById('dashboard').classList.add('active');
    document.querySelector('.dashboard-grid').style.display = 'none';
    const insightsCard = document.querySelector('.insights-card');
    if (insightsCard) insightsCard.style.display = 'none';
    
    // Create or show activity page
    let activityPage = document.getElementById('activity-page');
    if (!activityPage) {
        activityPage = document.createElement('div');
        activityPage.id = 'activity-page';
        activityPage.className = 'activity-page';
        activityPage.innerHTML = `
            <div class="activity-page-header">
                <button class="back-btn" data-action="backToDashboard" data-i18n="dashboard.activity.backToDashboard">${t('dashboard.activity.backToDashboard')}</button>
                <h2 data-i18n="dashboard.activity.allTitle">${t('dashboard.activity.allTitle')}</h2>
            </div>
            <div id="all-activity-list" class="all-activity-list"></div>
        `;
        document.querySelector('.dashboard-content').appendChild(activityPage);
    }
    
    activityPage.style.display = 'block';
    renderAllActivity();

    // Ensure the activity view is scrolled into view (important on mobile)
    try {
        activityPage.scrollIntoView({ behavior: 'auto', block: 'start' });
    } catch (e) {
        window.scrollTo(0, 0);
    }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector('.nav-item[data-page="dashboard"]').classList.add('active');
}

function showRecentActivityPage() {
    // Hide all main pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Create or show dedicated activity page as a full page (sibling of dashboard/projects/tasks)
    let activityPage = document.getElementById('activity-page');
    if (!activityPage) {
        activityPage = document.createElement('div');
        activityPage.id = 'activity-page';
        activityPage.className = 'page';
        activityPage.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title" data-i18n="dashboard.activity.allTitle">${t('dashboard.activity.allTitle')}</h1>
                    <p class="page-subtitle" data-i18n="dashboard.activity.allSubtitle">${t('dashboard.activity.allSubtitle')}</p>
                </div>
                <button class="view-all-btn back-btn" data-action="backToDashboard" data-i18n="dashboard.activity.backToDashboard">${t('dashboard.activity.backToDashboard')}</button>
            </div>
            <div class="page-content">
                <div id="all-activity-list" class="all-activity-list"></div>
            </div>
        `;
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(activityPage);
        }
    }

    activityPage.classList.add('active');
    activityPage.style.display = 'flex';
    renderAllActivity();

    // Ensure the activity view is scrolled into view (important on mobile)
    try {
        activityPage.scrollIntoView({ behavior: 'auto', block: 'start' });
    } catch (e) {
        window.scrollTo(0, 0);
    }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector('.nav-item[data-page="dashboard"]').classList.add('active');
}

function renderAllActivity() {
    // Generate all activities (same logic as recent activity but show all)
    const activities = [];
    
    // All completed tasks
    const allCompleted = tasks
        .filter(t => t.status === 'done')
        .sort((a, b) => new Date(b.completedDate || b.createdAt || b.createdDate) - new Date(a.completedDate || a.createdAt || a.createdDate));
    
    allCompleted.forEach(task => {
        const project = projects.find(p => p.id === task.projectId);
        const activityDate = task.completedDate || task.createdAt || task.createdDate;
        const projectPart = project ? t('dashboard.activity.inProject', { project: project.name }) : '';
        activities.push({
            type: 'completed',
            text: t('dashboard.activity.completed', { title: task.title, projectPart }).trim(),
            date: activityDate,
            icon: '\u{2705}'
        });
    });
    
    // All projects
    projects
        .sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate))
        .forEach(project => {
            activities.push({
                type: 'created',
                text: t('dashboard.activity.createdProject', { project: project.name }),
                date: project.createdAt || project.createdDate,
                icon: '🚀'
            });
        });
    
    // All tasks
    tasks
        .sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate))
        .forEach(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projectPart = project ? t('dashboard.activity.toProject', { project: project.name }) : '';
            activities.push({
                type: 'created',
                text: t('dashboard.activity.addedTask', { title: task.title, projectPart }).trim(),
                date: task.createdAt || task.createdDate,
                icon: '📝'
            });
        });
    
    // Sort by most recent
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const container = document.getElementById('all-activity-list');
    if (!container) return;
    
    const activityHTML = activities.map(activity => `
        <div class="activity-item-full">
            <div class="activity-icon ${activity.type}">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
            </div>
            <div class="activity-full-date">${new Date(activity.date).toLocaleDateString(getLocale(), { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</div>
        </div>
    `).join('');
    
    container.innerHTML = activityHTML;
}

function renderInsights() {
    const container = document.getElementById('insights-list');
    if (!container) return;

    const insights = generateInsights();    const insightsHTML = insights.map(insight => `
        <div class="insight-item ${insight.type}">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-desc">${insight.description}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = insightsHTML;
    // Insights count badge removed
}

function generateInsights() {
    const insights = [];
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => t.endDate && t.endDate < today && t.status !== 'done').length;
    const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;
    const todayTasks = tasks.filter(t => {
        if (!t.endDate) return false;
        const today = new Date().toDateString();
        return new Date(t.endDate).toDateString() === today && t.status !== 'done';
    }).length;
    
    // Real task completion insights
    if (totalTasks > 0) {
        const completionRate = (completedTasks / totalTasks) * 100;
        if (completionRate >= 80) {
            insights.push({
                type: 'success',
                icon: '🎯',
                title: t('dashboard.insights.excellentTitle'),
                description: t('dashboard.insights.excellentDesc', { percent: completionRate.toFixed(0) })
            });
        } else if (completionRate >= 60) {
            insights.push({
                type: 'success',
                icon: '📈',
                title: t('dashboard.insights.goodTitle'),
                description: t('dashboard.insights.goodDesc', { percent: completionRate.toFixed(0) })
            });
        } else if (completionRate >= 30) {
            insights.push({
                type: 'warning',
                icon: '⚡',
                title: t('dashboard.insights.opportunityTitle'),
                description: t('dashboard.insights.opportunityDesc', { percent: completionRate.toFixed(0) })
            });
        } else {
            insights.push({
                type: 'priority',
                icon: '🚨',
                title: t('dashboard.insights.actionTitle'),
                description: t('dashboard.insights.actionDesc', { percent: completionRate.toFixed(0) })
            });
        }
    }
    
    // Due today tasks
    if (todayTasks > 0) {
        insights.push({
            type: 'priority',
            icon: '📅',
            title: t('dashboard.insights.todayTitle'),
            description: t(todayTasks === 1 ? 'dashboard.insights.todayDescOne' : 'dashboard.insights.todayDescMany', { count: todayTasks })
        });
    }
    
    // Overdue tasks (only if not already covered by today's tasks)
    if (overdueTasks > 0 && todayTasks === 0) {
        insights.push({
            type: 'warning',
            icon: '⏰',
            title: t('dashboard.insights.overdueTitle'),
            description: t(overdueTasks === 1 ? 'dashboard.insights.overdueDescOne' : 'dashboard.insights.overdueDescMany', { count: overdueTasks })
        });
    }
    
    // High priority tasks
    if (highPriorityTasks > 0) {
        const urgentCount = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
        if (urgentCount > 0) {
            insights.push({
                type: 'priority',
                icon: '🔥',
                title: t('dashboard.insights.highPriorityTitle'),
                description: t(urgentCount === 1 ? 'dashboard.insights.highPriorityDescOne' : 'dashboard.insights.highPriorityDescMany', { count: urgentCount })
            });
        }
    }
    
    // Project insights
    if (projects.length > 1) {
        const projectsWithTasks = projects.filter(p => tasks.some(t => t.projectId === p.id)).length;
        const projectsWithoutTasks = projects.length - projectsWithTasks;
        
        if (projectsWithoutTasks > 0) {
            insights.push({
                type: 'warning',
                icon: '�',
                title: t('dashboard.insights.emptyProjectsTitle'),
                description: t(projectsWithoutTasks === 1 ? 'dashboard.insights.emptyProjectsDescOne' : 'dashboard.insights.emptyProjectsDescMany', { count: projectsWithoutTasks })
            });
        }
    }
    
    // Productivity pattern insights
    if (totalTasks >= 5) {
        const recentlyCompleted = tasks.filter(t => {
            if (t.status !== 'done' || !t.completedDate) return false;
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(t.completedDate) > weekAgo;
        }).length;
        
        if (recentlyCompleted >= 3) {
            insights.push({
                type: 'success',
                icon: '🚀',
                title: t('dashboard.insights.momentumTitle'),
                description: t(recentlyCompleted === 1 ? 'dashboard.insights.momentumDescOne' : 'dashboard.insights.momentumDescMany', { count: recentlyCompleted })
            });
        }
    }
    
    // Default insights for empty state
    if (insights.length === 0) {
        if (totalTasks === 0) {
            insights.push({
                type: 'priority',
                icon: '🌊',
                title: t('dashboard.insights.readyTitle'),
                description: t('dashboard.insights.readyDesc')
            });
        } else {
            insights.push({
                type: 'success',
                icon: '\u{2705}',
                title: t('dashboard.insights.caughtUpTitle'),
                description: t('dashboard.insights.caughtUpDesc')
            });
        }
    }
    
    return insights.slice(0, 3); // Limit to 3 most relevant insights
}

function animateDashboardElements() {
    // Animate stat cards with staggered entrance
    const statCards = document.querySelectorAll('.enhanced-stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Animate hero stats
    const heroCards = document.querySelectorAll('.hero-stat-card');
    heroCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-30px)';
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
        }, index * 200);
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return t('dashboard.activity.recently');
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return t('dashboard.activity.justNow');
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return t(minutes === 1 ? 'dashboard.activity.minuteAgo' : 'dashboard.activity.minutesAgo', { count: minutes });
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return t(hours === 1 ? 'dashboard.activity.hourAgo' : 'dashboard.activity.hoursAgo', { count: hours });
    }
    if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return t(days === 1 ? 'dashboard.activity.dayAgo' : 'dashboard.activity.daysAgo', { count: days });
    }
    return date.toLocaleDateString(getLocale());
}

function formatDashboardActivityDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('dashboard.activity.today');
    if (diffDays === 1) return t('dashboard.activity.yesterday');
    if (diffDays < 7) return t('dashboard.activity.daysAgoShort', { count: diffDays });

    return date.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });
}

// Quick action functions
function signOut() {
    if (window.authSystem && window.authSystem.logout) {
        window.authSystem.logout();
    }
}

// Show export confirmation modal
function exportDashboardData() {
    document.getElementById('export-data-modal').classList.add('active');
}

// Close export confirmation modal
function closeExportDataModal() {
    document.getElementById('export-data-modal').classList.remove('active');
}

// Perform the actual export after confirmation
function confirmExportData() {
    // Close the modal
    closeExportDataModal();

    // Get current user info
    const currentUser = window.authSystem ? window.authSystem.getCurrentUser() : null;

    // Export EVERYTHING - complete backup of all user data
    const completeBackup = {
        // User info
        user: currentUser ? {
            id: currentUser.id,
            username: currentUser.username,
            name: currentUser.name,
            email: currentUser.email
        } : null,

        // Core data
        projects: projects,
        tasks: tasks,
        feedbackItems: feedbackItems,

        // Metadata
        projectColors: projectColorMap,
        sortMode: sortMode,
        manualTaskOrder: manualTaskOrder,
        settings: settings,

        // History (if available)
        history: window.historyService ? window.historyService.getHistory() : [],

        // Counters (for import/restore)
        projectCounter: projectCounter,
        taskCounter: taskCounter,

        // Statistics (for user info)
        statistics: {
            totalProjects: projects.length,
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'done').length,
            completionRate: tasks.length > 0 ? ((tasks.filter(t => t.status === 'done').length / tasks.length) * 100).toFixed(1) : 0,
            feedbackCount: feedbackItems.length
        },

        // Export metadata
        exportDate: new Date().toISOString(),
        exportVersion: '2.0', // Version for tracking export format
        sourceSystem: 'Nautilus Multi-User'
    };

    const dataStr = JSON.stringify(completeBackup, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    // Include username in filename if available
    const username = currentUser?.username || 'user';
    const exportFileDefaultName = `nautilus-complete-backup-${username}-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    // Show success notification
    showNotification('Complete backup exported successfully! All data, settings, and history included.', 'success');
}

async function generateReport() {
    // Show loading notification
    showNotification('Generando reporte...', 'info');

    try {
        // Generate Word document
        const result = await generateWordReport(projects, tasks);

        if (result.success) {
            showNotification(`\u{2705} Reporte generado: ${result.filename}`, 'success');

            // Show summary in console for debugging
            console.log('Report Summary:', {
                activeProjects: result.insights.activeProjectsCount,
                completedTasks: `${result.insights.completedTasks}/${result.insights.totalTasks}`,
                progress: `${result.insights.completionPercent}%`
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('❌ Error al generar el reporte: ' + error.message, 'error');
    }
}

function updateCounts() {
    document.getElementById("projects-count").textContent = projects.length;
    document.getElementById("tasks-count").textContent = tasks.length;
    
    // Legacy dashboard stats (keep for backward compatibility)
    const activeProjectsEl = document.getElementById("active-projects");
    const pendingTasksEl = document.getElementById("pending-tasks");
    const completedTasksEl = document.getElementById("completed-tasks");
    
    if (activeProjectsEl) activeProjectsEl.textContent = projects.length;
    if (pendingTasksEl) pendingTasksEl.textContent = tasks.filter((t) => t.status !== "done").length;
    if (completedTasksEl) completedTasksEl.textContent = tasks.filter((t) => t.status === "done").length;

    // Kanban counts
    const todoCountEl = document.getElementById("todo-count");
    const progressCountEl = document.getElementById("progress-count");
    const reviewCountEl = document.getElementById("review-count");
    const doneCountEl = document.getElementById("done-count");
    
    if (todoCountEl) todoCountEl.textContent = tasks.filter((t) => t.status === "todo").length;
    if (progressCountEl) progressCountEl.textContent = tasks.filter((t) => t.status === "progress").length;
    if (reviewCountEl) reviewCountEl.textContent = tasks.filter((t) => t.status === "review").length;
    if (doneCountEl) doneCountEl.textContent = tasks.filter((t) => t.status === "done").length;
    
    // Feedback count
    const feedbackCount = feedbackItems.filter(f => f.status === 'open').length;
    const feedbackCountEl = document.getElementById("feedback-count");
    if (feedbackCountEl) feedbackCountEl.textContent = feedbackCount;
    
    // Update new dashboard stats if elements exist
    updateNewDashboardCounts();
    updateNotificationState();
}

function updateNewDashboardCounts() {
    // Hero stats
    const heroActiveEl = document.getElementById("hero-active-projects");
    const heroCompletionEl = document.getElementById("hero-completion-rate");
    
    if (heroActiveEl) heroActiveEl.textContent = projects.length;
    
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    if (heroCompletionEl) heroCompletionEl.textContent = `${completionRate}%`;
    
    // Enhanced stats
    const inProgressEl = document.getElementById("in-progress-tasks");
    const pendingNewEl = document.getElementById("pending-tasks-new");
    const completedNewEl = document.getElementById("completed-tasks-new");
    const overdueEl = document.getElementById("overdue-tasks");
    const highPriorityEl = document.getElementById("high-priority-tasks");
    const milestonesEl = document.getElementById("research-milestones");
    
    if (inProgressEl) inProgressEl.textContent = tasks.filter(t => t.status === 'progress').length;
    if (pendingNewEl) pendingNewEl.textContent = tasks.filter(t => t.status === 'todo').length;
    if (completedNewEl) completedNewEl.textContent = completedTasks;
    if (overdueEl) {
        const today = new Date().toISOString().split('T')[0];
        const overdue = tasks.filter(t => t.endDate && t.endDate < today && t.status !== 'done').length;
        overdueEl.textContent = overdue;
    }
    if (highPriorityEl) highPriorityEl.textContent = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
    if (milestonesEl) {
        const completedProjects = projects.filter(p => {
            const projectTasks = tasks.filter(t => t.projectId === p.id);
            const completedProjectTasks = projectTasks.filter(t => t.status === 'done');
            return projectTasks.length > 0 && completedProjectTasks.length === projectTasks.length;
        }).length;
        milestonesEl.textContent = completedProjects;
    }
}

let currentSort = { column: null, direction: "asc" };

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction =
            currentSort.direction === "asc" ? "desc" : "asc";
    } else {
        currentSort.column = column;
        currentSort.direction = "asc";
    }

    document.querySelectorAll(".tasks-table th .sort-indicator").forEach((span) => {
        span.textContent = "↕";
        span.style.opacity = "0.5";
    });

    const indicator = document.getElementById(`sort-${column}`);
    if (indicator) {
        indicator.textContent = currentSort.direction === "asc" ? "↑" : "↓";
        indicator.style.opacity = "1";
    }

    renderListView();
}

function renderListView() {
    const tbody = document.getElementById("tasks-table-body");
    if (!tbody) return;

    let rows = typeof getFilteredTasks === "function" ? getFilteredTasks() : tasks.slice();

    // Apply the Updated recency filter in List too (not Calendar).
    const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
    if (cutoff !== null) {
        rows = rows.filter((t) => getTaskUpdatedTime(t) >= cutoff);
    }
    
    // Priority order for sorting: high=3, medium=2, low=1
    // Using imported PRIORITY_ORDER

    // Sort by priority first (high to low), then by end date (closest first, no date last)
    rows.sort((a, b) => {
        const priorityA = PRIORITY_ORDER[a.priority] || 0;
        const priorityB = PRIORITY_ORDER[b.priority] || 0;

        // Primary sort: priority (high to low)
        if (priorityA !== priorityB) {
            return priorityB - priorityA;
        }

        // Secondary sort: end date (closest first, no date last)
        const dateA = a.endDate ? new Date(a.endDate) : null;
        const dateB = b.endDate ? new Date(b.endDate) : null;

        // Both have dates: sort by date (earliest first)
        if (dateA && dateB) {
            return dateA - dateB;
        }

        // Tasks with dates come before tasks without dates
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;

        // Both have no date: keep original order
        return 0;
    });

    // Sorting
    if (currentSort && currentSort.column) {
        rows.sort((a, b) => {
            let aVal = "", bVal = "";
            switch (currentSort.column) {
                case "title":
                    aVal = (a.title || "").toLowerCase();
                    bVal = (b.title || "").toLowerCase();
                    break;
                case "status": {
                    const order = { backlog: 0, todo: 1, progress: 2, review: 3, done: 4 };
                    aVal = order[a.status] ?? 0;
                    bVal = order[b.status] ?? 0;
                    break;
                }
                case "priority": {
                    const order = { low: 0, medium: 1, high: 2 };
                    aVal = order[a.priority] ?? 0;
                    bVal = order[b.priority] ?? 0;
                    break;
                }
                case "project": {
                    const ap = projects.find((p) => p.id === a.projectId);
                    const bp = projects.find((p) => p.id === b.projectId);
                    aVal = ap ? ap.name.toLowerCase() : "";
                    bVal = bp ? bp.name.toLowerCase() : "";
                    break;
                }
                case "startDate":
                    aVal = a.startDate || "";
                    bVal = b.startDate || "";
                    break;
                case "endDate":
                    aVal = a.endDate || "";
                    bVal = b.endDate || "";
                    break;
                case "updatedAt":
                    aVal = getTaskUpdatedTime(a);
                    bVal = getTaskUpdatedTime(b);
                    break;
            }
            if (aVal < bVal) return currentSort.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return currentSort.direction === "asc" ? 1 : -1;
            return 0;
        });
    }

    const listCountText = t('tasks.list.count', { count: rows.length }) || `${rows.length} results`;
    const listCountEl = document.getElementById('tasks-list-count');
    if (listCountEl) {
        listCountEl.textContent = listCountText;
    }
    const listCountBottomEl = document.getElementById('tasks-list-count-bottom');
    if (listCountBottomEl) {
        listCountBottomEl.textContent = listCountText;
    }

    tbody.innerHTML = rows.map((task) => {
        const statusClass = `status-badge ${task.status}`;
        const proj = projects.find((p) => p.id === task.projectId);
        const projName = proj ? proj.name : t('tasks.noProject');
        const start = task.startDate ? formatDate(task.startDate) : t('tasks.noDate');
        const due = task.endDate ? formatDate(task.endDate) : t('tasks.noDate');
        const updated = formatTaskUpdatedDateTime(task) || "";
        const prText = task.priority ? getPriorityLabel(task.priority) : "";

        const tagsHTML = task.tags && task.tags.length > 0
            ? task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join('')
            : '';

        const projectIndicator = proj
            ? `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(proj.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`
            : '';

        return `
            <tr data-action="openTaskDetails" data-param="${task.id}">
                <td>${projectIndicator}${escapeHtml(task.title || "")}</td>
                <td><span class="priority-badge priority-${task.priority}">${prText}</span></td>
                <td><span class="${statusClass}">${(getStatusLabel(task.status)).toUpperCase()}</span></td>
                <td>${tagsHTML || '<span style="color: var(--text-muted); font-size: 12px;">-</span>'}</td>
                <td>${escapeHtml(projName)}</td>
                <td>${start}</td>
                <td>${due}</td>
                <td>${escapeHtml(updated)}</td>
            </tr>
        `;
    }).join("");

    // Also render mobile cards (shown on mobile, hidden on desktop)
    renderMobileCardsPremium(rows);
}

// ================================
// PREMIUM MOBILE CARDS
// ================================

// Smart date formatter with urgency indication
function getSmartDateInfo(endDate, status = null) {
    if (!endDate) return { text: t('tasks.noEndDate'), class: "", showPrefix: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(endDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        // Only show "overdue" text if task is not done
        if (status === 'done') {
            return { text: formatDate(endDate), class: "", showPrefix: true };
        }
        const daysOverdue = Math.abs(diffDays);
        return {
            text: daysOverdue === 1
                ? t('tasks.due.yesterday')
                : t('tasks.due.daysOverdue', { count: daysOverdue }),
            class: "overdue",
            showPrefix: true
        };
    } else if (diffDays === 1) {
        return { text: t('tasks.due.tomorrow'), class: "soon", showPrefix: true };
    } else {
        // For all other dates (today, future), just show the formatted date
        return { text: formatDate(endDate), class: "", showPrefix: true };
    }
}

// Render premium mobile cards
function renderMobileCardsPremium(tasks) {
    const container = document.getElementById("tasks-list-mobile");
    if (!container) return;

    // Preserve expanded card state across re-renders.
    const expandedIds = new Set(
        Array.from(container.querySelectorAll('.task-card-mobile.expanded'))
            .map(card => parseInt(card.dataset.taskId, 10))
            .filter(Number.isFinite)
    );

    const getDescriptionForMobileCard = (html) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html || "";

        const checkboxRows = Array.from(tempDiv.querySelectorAll(".checkbox-row"));
        const checklistLines = checkboxRows
            .map((row) => {
                const toggle = row.querySelector(".checkbox-toggle");
                const isChecked =
                    toggle?.getAttribute("aria-pressed") === "true" ||
                    toggle?.classList?.contains("checked");
                const text = (row.querySelector(".check-text")?.textContent || "").trim();
                if (!text) return null;
                return `${isChecked ? "✓" : "☐"} ${text}`;
            })
            .filter(Boolean);

        checkboxRows.forEach((row) => row.remove());

        const baseText = (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, " ").trim();
        const checklistText = checklistLines.join("\n").trim();
        if (baseText && checklistText) return `${baseText}\n${checklistText}`;
        return baseText || checklistText;
    };

    // Empty state
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="tasks-list-mobile-empty">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3>${t('projects.details.noTasksFound')}</h3>
                <p>Try adjusting your filters or create a new task</p>
            </div>
        `;
        return;
    }

    // Render cards
    container.innerHTML = tasks.map((task) => {
        const proj = projects.find((p) => p.id === task.projectId);
        const projColor = proj ? getProjectColor(proj.id) : "#999";
        const dateInfo = getSmartDateInfo(task.endDate, task.status);

        const descText = getDescriptionForMobileCard(task.description);

        // Tags
        const tagsHTML = task.tags && task.tags.length > 0
            ? task.tags.map(tag => {
                const tagColor = getTagColor(tag);
                return `<span class="card-tag-premium" style="background:${tagColor}; border-color:${tagColor}; color:#ffffff;">${escapeHtml(tag.toUpperCase())}</span>`;
            }).join('')
            : '';

        // Attachments count
        const attachmentCount = task.attachments && task.attachments.length > 0 ? task.attachments.length : 0;

        return `
            <div class="task-card-mobile" data-priority="${task.priority}" data-task-id="${task.id}">
                <!-- Header (always visible) -->
                <div class="card-header-premium">
                    <div class="card-header-content" data-card-action="toggle">
                        <h3 class="card-title-premium">${escapeHtml(task.title || t('tasks.untitled'))}</h3>
                        <div class="card-meta-premium">
                            <span class="status-badge-mobile ${task.status}">${getStatusLabel(task.status)}</span>
                            ${dateInfo.text ? `<span class="card-date-smart ${dateInfo.class}">${dateInfo.showPrefix ? t('tasks.endDatePrefix') : ''}${dateInfo.text}</span>` : ''}
                        </div>
                    </div>
                    <div class="card-actions-premium">
                        <button class="card-open-btn-premium" data-card-action="open" title="${t('tasks.openTaskDetails')}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                        <svg class="card-chevron-premium" data-card-action="toggle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <!-- Expandable body -->
                <div class="card-body-premium">
                    ${descText ? `
                    <div class="card-description-premium">
                        <div class="card-description-premium-label">${t('tasks.card.description')}</div>
                        <div class="card-description-premium-text">${escapeHtml(descText)}</div>
                    </div>
                    ` : ''}

                    ${tagsHTML ? `
                    <div class="card-tags-premium">${tagsHTML}</div>
                    ` : ''}

                    ${proj ? `
                    <div class="card-project-premium">
                        <span class="card-project-dot-premium" style="background-color: ${projColor};"></span>
                        <span class="card-project-name-premium">${escapeHtml(proj.name)}</span>
                    </div>
                    ` : ''}

                    <div class="card-footer-premium">
                        ${task.startDate ? `
                        <div class="card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>${t('tasks.startDatePrefix')}${formatDate(task.startDate)}</span>
                        </div>
                        ` : ''}
                        ${task.endDate ? `
                        <div class="card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>${t('tasks.endDatePrefix')}${formatDate(task.endDate)}</span>
                        </div>
                        ` : ''}
                        ${attachmentCount > 0 ? `
                        <div class="card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span>${attachmentCount}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join("");

    // Attach event listeners
    attachMobileCardListeners();

    // Restore expanded state after re-render.
    if (expandedIds.size > 0) {
        expandedIds.forEach((id) => {
            const card = container.querySelector(`.task-card-mobile[data-task-id="${id}"]`);
            if (card) card.classList.add('expanded');
        });
    }
}

// Attach event listeners to cards
function attachMobileCardListeners() {
    const cards = document.querySelectorAll('.task-card-mobile');

    cards.forEach(card => {
        const taskId = parseInt(card.dataset.taskId);
        const toggleElements = card.querySelectorAll('[data-card-action="toggle"]');
        const openButton = card.querySelector('[data-card-action="open"]');

        // Toggle expand/collapse on header content or chevron click
        toggleElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();

                // Close other expanded cards for cleaner UX
                document.querySelectorAll('.task-card-mobile.expanded').forEach(otherCard => {
                    if (otherCard !== card) {
                        otherCard.classList.remove('expanded');
                    }
                });

                // Toggle this card
                card.classList.toggle('expanded');
            });
        });

        // Open full modal on button click
        if (openButton) {
            openButton.addEventListener('click', (e) => {
                e.stopPropagation();
                openTaskDetails(taskId);
            });
        }
    });
}

function updateSelectDisplay(selectId) {
    const select = document.getElementById(selectId);
    const display = select.parentElement.querySelector(".select-display");
    const selected = Array.from(select.selectedOptions);
    const hasAll = selected.some((o) => o.hasAttribute("data-all"));

    // Remove/add selection styling
    if (selected.length === 0 || hasAll) {
        display.classList.remove("has-selection");
    } else {
        display.classList.add("has-selection");
    }

    if (selected.length === 0 || hasAll) {
        if (selectId === "filter-status")
            display.textContent = "All Statuses ▼";
        else if (selectId === "filter-priority")
            display.textContent = "All Priorities ▼";
        else if (selectId === "filter-project")
            display.textContent = "All Projects ▼";
    } else if (selected.length === 1) {
        display.textContent = selected[0].textContent + " ▼";
    } else {
        display.textContent = `${selected.length} selected ▼`;
    }
}

function toggleMultiSelect(selectId) {
    const select = document.getElementById(selectId);
    const isActive = select.classList.contains("active");

    // Close all other multi-selects
    document
        .querySelectorAll(".multi-select.active")
        .forEach((s) => s.classList.remove("active"));

    if (!isActive) {
        select.classList.add("active");
        select.focus();
    }
}

// Close multi-selects when clicking outside
document.addEventListener("click", function (e) {
    if (!e.target.closest(".multi-select-wrapper")) {
        document
            .querySelectorAll(".multi-select.active")
            .forEach((s) => s.classList.remove("active"));
    }
});

// Helper function to generate HTML for a single project list item
function generateProjectItemHTML(project) {
    const projectTasks = tasks.filter((t) => t.projectId === project.id);
    const completed = projectTasks.filter((t) => t.status === 'done').length;
    const inProgress = projectTasks.filter((t) => t.status === 'progress').length;
    const review = projectTasks.filter((t) => t.status === 'review').length;
    const todo = projectTasks.filter((t) => t.status === 'todo').length;
    const backlog = projectTasks.filter((t) => t.status === 'backlog').length;
    const total = projectTasks.length;

    const completedPct = total > 0 ? (completed / total) * 100 : 0;
    const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;
    const reviewPct = total > 0 ? (review / total) * 100 : 0;
    const todoPct = total > 0 ? (todo / total) * 100 : 0;
    const backlogPct = total > 0 ? (backlog / total) * 100 : 0;

    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Project color swatch
    const swatchColor = getProjectColor(project.id);

    // Project status
    const projectStatus = getProjectStatus(project.id);

    // Sort tasks by priority (desc) and status (asc)
    // Priority: high (3) → medium (2) → low (1) [DESC]
    // Status: done (1) → progress (2) → review (3) → todo (4) [ASC]
    // Using imported PRIORITY_ORDER
    // Using imported STATUS_ORDER
    const sortedTasks = [...projectTasks].sort((a, b) => {
        // First sort by priority descending (high priority first)
        const aPriority = PRIORITY_ORDER[a.priority || 'low'] || 1;
        const bPriority = PRIORITY_ORDER[b.priority || 'low'] || 1;
        if (aPriority !== bPriority) {
            return bPriority - aPriority; // DESC: high (3) before low (1)
        }
        // Then sort by status ascending (done first, todo last)
        const aStatus = STATUS_ORDER[a.status || 'todo'] || 4;
        const bStatus = STATUS_ORDER[b.status || 'todo'] || 4;
        return aStatus - bStatus; // ASC: done (1) before todo (4)
    });

    // Generate tasks HTML for expanded view
    const tasksHtml = sortedTasks.length > 0
        ? sortedTasks.map(task => {
            const priority = task.priority || 'low';
            // Using imported PRIORITY_LABELS

            // Format dates with badges (same as project dates)
            const hasStartDate = task.startDate && task.startDate !== '';
            const hasEndDate = task.endDate && task.endDate !== '';
            let dateRangeHtml = '';
            if (hasStartDate && hasEndDate) {
                dateRangeHtml = `<span class="date-badge">${formatDatePretty(task.startDate, getLocale())}</span><span class="date-arrow">→</span><span class="date-badge">${formatDatePretty(task.endDate, getLocale())}</span>`;
            } else if (hasEndDate) {
                dateRangeHtml = `<span class="date-badge">${formatDatePretty(task.endDate, getLocale())}</span>`;
            } else if (hasStartDate) {
                dateRangeHtml = `<span class="date-badge">${formatDatePretty(task.startDate, getLocale())}</span>`;
            }

            return `
                <div class="expanded-task-item" data-action="openTaskDetails" data-param="${task.id}" data-stop-propagation="true">
                    <div class="expanded-task-info">
                        <div class="expanded-task-name">${escapeHtml(task.title)}</div>
                        ${(dateRangeHtml || (task.tags && task.tags.length > 0)) ? `
                            <div class="expanded-task-meta">
                                ${task.tags && task.tags.length > 0 ? `
                                    <div class="task-tags">
                                        ${task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join(' ')}
                                    </div>
                                ` : ''}
                                ${dateRangeHtml ? `<div class="expanded-task-dates">${dateRangeHtml}</div>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="expanded-task-priority">
                        <div class="priority-chip priority-${priority}">${getPriorityLabel(priority)}</div>
                    </div>
                    <div class="expanded-task-status-col">
                        <div class="expanded-task-status ${task.status}">${getStatusLabel(task.status)}</div>
                    </div>
                </div>
            `;
        }).join('')
        : `<div class="no-tasks-message">${t('tasks.noTasksInProject')}</div>`;

    return `
        <div class="project-list-item" id="project-item-${project.id}">
            <div class="project-row" data-action="toggleProjectExpand" data-param="${project.id}">
                <div class="project-chevron">▸</div>
                <div class="project-info">
                    <div class="project-swatch" style="background: ${swatchColor};"></div>
                    <div class="project-name-desc">
                        <div class="project-title project-title-link" data-action="showProjectDetails" data-param="${project.id}" data-stop-propagation="true">${escapeHtml(project.name || t('projects.untitled'))}</div>
                        ${project.tags && project.tags.length > 0 ? `
                            <div class="project-tags-row">
                                ${project.tags.map(tag => `<span class="project-tag" style="background-color: ${getProjectColor(project.id)};">${escapeHtml(tag.toUpperCase())}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div class="project-description">${escapeHtml(project.description || t('projects.noDescription'))}</div>
                    </div>
                </div>
                <div class="project-status-col">
                    <span class="project-status-badge ${projectStatus}">${getProjectStatusLabel(projectStatus).toUpperCase()}</span>
                </div>
                <div class="project-progress-col">
                    <div class="progress-bar-wrapper">
                        <div class="progress-segment done" style="width: ${completedPct}%;"></div>
                        <div class="progress-segment progress" style="width: ${inProgressPct}%;"></div>
                        <div class="progress-segment review" style="width: ${reviewPct}%;"></div>
                        <div class="progress-segment todo" style="width: ${todoPct}%;"></div>
                        <div class="progress-segment backlog" style="width: ${backlogPct}%;"></div>
                    </div>
                    <div class="progress-percent">${completionPct}%</div>
                </div>
                <div class="project-tasks-col">
                    <span class="project-tasks-breakdown">${t('projects.tasksBreakdown', { total, done: completed })}</span>
                </div>
                <div class="project-dates-col">
                    <span class="date-badge">${formatDatePretty(project.startDate, getLocale())}</span>
                    <span class="date-arrow">→</span>
                    <span class="date-badge">${formatDatePretty(project.endDate, getLocale())}</span>
                </div>
            </div>
            <div class="project-tasks-expanded">
                <div class="expanded-tasks-container">
                    <div class="expanded-tasks-header">
                        <span>\u{1F4CB} ${t('projects.details.tasksTitle', { count: total })}</span>
                        <button class="add-btn expanded-add-task-btn" type="button" data-action="openTaskModalForProject" data-param="${project.id}" data-stop-propagation="true">${t('tasks.addButton')}</button>
                    </div>
                    ${tasksHtml}
                </div>
            </div>
        </div>
    `;
}

let expandedTaskLayoutRafId = null;
function updateExpandedTaskRowLayouts(root = document) {
    const taskItems = root.querySelectorAll?.('.expanded-task-item') || [];
    taskItems.forEach((item) => {
        // Skip hidden items (collapsed project)
        if (item.offsetParent === null) return;

        item.classList.remove('expanded-task-item--stacked');

        const meta = item.querySelector('.expanded-task-meta');
        if (!meta) return;

        const tags = meta.querySelector('.task-tags');
        const dates = meta.querySelector('.expanded-task-dates');

        const overflows = (el) => el && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1;

        const shouldStack =
            overflows(item) ||
            overflows(meta) ||
            overflows(tags) ||
            overflows(dates);

        if (shouldStack) item.classList.add('expanded-task-item--stacked');
    });
}

function scheduleExpandedTaskRowLayoutUpdate(root = document) {
    if (expandedTaskLayoutRafId !== null) cancelAnimationFrame(expandedTaskLayoutRafId);
    expandedTaskLayoutRafId = requestAnimationFrame(() => {
        expandedTaskLayoutRafId = null;
        updateExpandedTaskRowLayouts(root);
    });
}

function renderProjects() {
const container = document.getElementById("projects-list");
    if (projects.length === 0) {
        container.innerHTML =
            `<div class="empty-state"><h3>${t('projects.empty.title')}</h3><p>${t('projects.empty.subtitle')}</p></div>`;
        // Also clear mobile container if it exists
        const mobileContainer = document.getElementById("projects-list-mobile");
        if (mobileContainer) mobileContainer.innerHTML = '';
        return;
    }

    // Save expanded state before re-rendering
    const expandedProjects = new Set();
    container.querySelectorAll('.project-list-item.expanded').forEach(item => {
        const projectId = item.id.replace('project-item-', '');
        expandedProjects.add(projectId);
    });
// Use sorted view if active, otherwise use full projects array
    const projectsToRender = projectsSortedView || projects;
// Re-render
    container.innerHTML = projectsToRender.map(generateProjectItemHTML).join("");
// Restore expanded state
    expandedProjects.forEach(projectId => {
        const item = document.getElementById(`project-item-${projectId}`);
        if (item) {
            item.classList.add('expanded');
} else {
}
    });

    // Render mobile cards
    renderMobileProjects(projectsToRender);

    scheduleExpandedTaskRowLayoutUpdate(container);
}

function toggleProjectExpand(projectId) {
    const item = document.getElementById(`project-item-${projectId}`);
    if (item) {
        item.classList.toggle('expanded');
        scheduleExpandedTaskRowLayoutUpdate(item);
    }
}
// Make function globally accessible for inline onclick handlers
window.toggleProjectExpand = toggleProjectExpand;

// ================================
// MOBILE PROJECT CARDS
// ================================

function renderMobileProjects(projects) {
    const container = document.getElementById("projects-list-mobile");
    if (!container) return;

    if (projects.length === 0) {
        container.innerHTML = `
            <div class="projects-list-mobile-empty">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3>${t('projects.empty.searchTitle')}</h3>
                <p>${t('projects.empty.searchSubtitle')}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = projects.map((project) => {
        const projectTasks = tasks.filter((t) => t.projectId === project.id);
        const completed = projectTasks.filter((t) => t.status === 'done').length;
        const inProgress = projectTasks.filter((t) => t.status === 'progress').length;
        const review = projectTasks.filter((t) => t.status === 'review').length;
        const todo = projectTasks.filter((t) => t.status === 'todo').length;
        const backlog = projectTasks.filter((t) => t.status === 'backlog').length;
        const total = projectTasks.length;
        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

        const swatchColor = getProjectColor(project.id);
        const projectStatus = getProjectStatus(project.id);

        return `
            <div class="project-card-mobile" data-project-id="${project.id}">
                <!-- Header (always visible) -->
                <div class="project-card-header-premium">
                    <div class="project-card-header-content" data-card-action="toggle">
                        <div class="project-card-title-row">
                            <span class="project-swatch-mobile" style="background: ${swatchColor};"></span>
                            <h3 class="project-card-title-premium">${escapeHtml(project.name || "Untitled Project")}</h3>
                        </div>
                        <div class="project-card-meta-premium">
                            <span class="project-status-badge-mobile ${projectStatus}">${projectStatus}</span>
                            <span class="project-card-tasks-count">${t('projects.card.tasksCount', { count: total })}</span>
                            ${completionPct > 0 ? `<span class="project-card-completion">${t('projects.card.percentDone', { count: completionPct })}</span>` : ''}
                        </div>
                    </div>
                    <div class="project-card-actions-premium">
                        <button class="project-card-open-btn-premium" data-action="showProjectDetails" data-param="${project.id}" title="${t('projects.openDetailsTitle')}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                        <svg class="project-card-chevron-premium" data-card-action="toggle" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <!-- Expandable body -->
                <div class="project-card-body-premium">
                    ${project.tags && project.tags.length > 0 ? `
                    <div class="project-card-tags-premium" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                        ${project.tags.map(tag => `<span style="background-color: ${getProjectColor(project.id)}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join('')}
                    </div>
                    ` : ''}

                    ${project.description ? `
                    <div class="project-card-description-premium">
                        <div class="project-card-description-label">${t('tasks.card.description')}</div>
                        <div class="project-card-description-text">${escapeHtml(project.description)}</div>
                    </div>
                    ` : ''}

                    <div class="project-card-footer-premium">
                        ${project.startDate ? `
                        <div class="project-card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>${t('projects.details.startDate')}: ${formatDate(project.startDate)}</span>
                        </div>
                        ` : ''}
                        ${project.endDate ? `
                        <div class="project-card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>${t('tasks.endDatePrefix')}${formatDate(project.endDate)}</span>
                        </div>
                        ` : ''}
                    </div>

                    ${total > 0 ? `
                    <div class="project-card-progress-premium">
                        <div class="project-card-progress-label">${t('projects.details.taskProgress')}</div>
                        <div class="project-card-progress-bar">
                            <div class="progress-segment done" style="width: ${(completed/total)*100}%;"></div>
                            <div class="progress-segment progress" style="width: ${(inProgress/total)*100}%;"></div>
                            <div class="progress-segment review" style="width: ${(review/total)*100}%;"></div>
                            <div class="progress-segment todo" style="width: ${(todo/total)*100}%;"></div>
                            <div class="progress-segment backlog" style="width: ${(backlog/total)*100}%;"></div>
                        </div>
                        <div class="project-card-breakdown">
                            ${completed > 0 ? `<span class="breakdown-item done">${completed} ${t('tasks.status.done')}</span>` : ''}
                            ${inProgress > 0 ? `<span class="breakdown-item progress">${inProgress} ${t('tasks.status.progress')}</span>` : ''}
                            ${review > 0 ? `<span class="breakdown-item review">${review} ${t('tasks.status.review')}</span>` : ''}
                            ${todo > 0 ? `<span class="breakdown-item todo">${todo} ${t('tasks.status.todo')}</span>` : ''}
                            ${backlog > 0 ? `<span class="breakdown-item backlog">${backlog} ${t('tasks.status.backlog')}</span>` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join("");

    // Attach event listeners
    attachMobileProjectCardListeners();
}

function attachMobileProjectCardListeners() {
    const cards = document.querySelectorAll('.project-card-mobile');

    cards.forEach(card => {
        const projectId = parseInt(card.dataset.projectId);
        const toggleElements = card.querySelectorAll('[data-card-action="toggle"]');
        const openButton = card.querySelector('[data-action="showProjectDetails"]');

        // Toggle expand/collapse on header content or chevron click
        toggleElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();

                // Close other expanded cards for cleaner UX
                document.querySelectorAll('.project-card-mobile.expanded').forEach(otherCard => {
                    if (otherCard !== card) {
                        otherCard.classList.remove('expanded');
                    }
                });

                // Toggle this card
                card.classList.toggle('expanded');
            });
        });

        // Open project details on button click
        if (openButton) {
            openButton.addEventListener('click', (e) => {
                e.stopPropagation();
                showProjectDetails(projectId);
            });
        }
    });
}

function renderTasks() {
    const byStatus = { backlog: [], todo: [], progress: [], review: [], done: [] };
    const source =
        typeof getFilteredTasks === "function"
            ? getFilteredTasks()
            : tasks.slice();

    const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
    const sourceForKanban = cutoff === null
        ? source
        : source.filter((t) => getTaskUpdatedTime(t) >= cutoff);

    // Priority order for sorting: high=3, medium=2, low=1
    // Using imported PRIORITY_ORDER

    sourceForKanban.forEach((t) => {
        // Exclude BACKLOG status from kanban rendering unless Show Backlog is enabled
        if (t.status === 'backlog' && window.kanbanShowBacklog !== true) return;
        if (byStatus[t.status]) byStatus[t.status].push(t);
    });
    
    // Sort each status column according to sortMode
    Object.keys(byStatus).forEach(status => {
        if (sortMode === 'manual' && manualTaskOrder && manualTaskOrder[status]) {
            const orderMap = new Map(manualTaskOrder[status].map((id, idx) => [id, idx]));
            byStatus[status].sort((a, b) => {
                const oa = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
                const ob = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
                if (oa !== ob) return oa - ob;
                // fallback to priority
                const pa = PRIORITY_ORDER[a.priority] || 0;
                const pb = PRIORITY_ORDER[b.priority] || 0;
                return pb - pa;
            });
        } else {
            byStatus[status].sort((a, b) => {
                const priorityA = PRIORITY_ORDER[a.priority] || 0;
                const priorityB = PRIORITY_ORDER[b.priority] || 0;
                return priorityB - priorityA;
            });
        }
    });

    const cols = {
        backlog: document.getElementById("backlog-tasks"),
        todo: document.getElementById("todo-tasks"),
        progress: document.getElementById("progress-tasks"),
        review: document.getElementById("review-tasks"),
        done: document.getElementById("done-tasks"),
    };

    // Update counts
    const cBacklog = document.getElementById("backlog-count");
    const cTodo = document.getElementById("todo-count");
    const cProg = document.getElementById("progress-count");
    const cRev = document.getElementById("review-count");
    const cDone = document.getElementById("done-count");
    if (cBacklog) cBacklog.textContent = byStatus.backlog.length;
    if (cTodo) cTodo.textContent = byStatus.todo.length;
    if (cProg) cProg.textContent = byStatus.progress.length;
    if (cRev) cRev.textContent = byStatus.review.length;
    if (cDone) cDone.textContent = byStatus.done.length;

    // Render cards
    ["backlog", "todo", "progress", "review", "done"].forEach((status) => {
        const wrap = cols[status];
        if (!wrap) return;

        wrap.innerHTML = byStatus[status]
            .map((task) => {
                const proj = projects.find((p) => p.id === task.projectId);
                const projName = proj ? proj.name : t('tasks.noProject');
                const dueText = task.endDate ? formatDate(task.endDate) : t('tasks.noDate');

                // Calculate date urgency with glassmorphic chip design
                let dueHTML;
                if (task.endDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(task.endDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const diffTime = dueDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	                    let bgColor, textColor, borderColor, icon = '', iconColor = '', textDecoration = 'none';
	                    if (task.status === "done") {
	                        // Completed tasks: no urgency styling, keep it subtle.
	                        bgColor = 'rgba(148, 163, 184, 0.12)';
	                        textColor = '#94a3b8';
	                        borderColor = 'rgba(148, 163, 184, 0.25)';
	                        textDecoration = 'none';
	                    } else if (diffDays < 0) {
                        // Overdue - orange/yellow warning (past deadline)
                        bgColor = 'rgba(249, 115, 22, 0.2)';
                        textColor = '#fb923c';
                        borderColor = 'rgba(249, 115, 22, 0.4)';
                        icon = '⚠ ';
                        iconColor = '#f97316';
                    } else if (diffDays <= 7) {
                        // Within 1 week - brighter purple/violet (approaching soon)
                        bgColor = 'rgba(192, 132, 252, 0.25)';
                        textColor = '#c084fc';
                        borderColor = 'rgba(192, 132, 252, 0.5)';
                    } else {
                        // Normal - blue glassmorphic
                        bgColor = 'rgba(59, 130, 246, 0.15)';
                        textColor = '#93c5fd';
                        borderColor = 'rgba(59, 130, 246, 0.3)';
                    }

                    dueHTML = `<span style="
                        background: ${bgColor};
                        backdrop-filter: blur(8px);
                        -webkit-backdrop-filter: blur(8px);
                        color: ${textColor};
                        border: 1px solid ${borderColor};
                        padding: 4px 10px;
                        border-radius: 12px;
                        font-size: 12px;
	                        font-weight: 500;
	                        display: inline-flex;
	                        align-items: center;
	                        gap: 4px;
	                        text-decoration: ${textDecoration};
	                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	                    ">${icon ? `<span style="color: ${iconColor};">${icon}</span>` : ''}${escapeHtml(dueText)}</span>`;
                } else {
                    // Only show t('tasks.noDate') if the setting is enabled
                    dueHTML = window.kanbanShowNoDate !== false
                        ? `<span style="color: var(--text-muted); font-size: 12px;">${dueText}</span>`
                        : '';
                }
                // 🔥 CHECK IF THIS CARD IS SELECTED
                const isSelected = selectedCards.has(task.id);
                const selectedClass = isSelected ? ' selected' : '';

                const projectIndicator = proj
                    ? `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(proj.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`
                    : '';

                // Combine tags and date in the same flex row - always show date even if t('tasks.noDate')
                const tagsAndDateHTML = `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 12px;">
                    ${task.tags && task.tags.length > 0 ? task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join('') : ''}
                    <span style="margin-left: auto;">${dueHTML}</span>
                </div>`;

                return `
                    <div class="task-card${selectedClass}" draggable="true" data-task-id="${task.id}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                            <div class="task-title" style="flex: 1;">${projectIndicator}${escapeHtml(task.title || "")}</div>
                            <div class="task-priority priority-${task.priority}" style="flex-shrink: 0;">${getPriorityLabel(task.priority || "").toUpperCase()}</div>
                        </div>
                        ${window.kanbanShowProjects !== false ? `
                        <div style="margin-top:8px; font-size:12px;">
                            ${proj ? 
                                `<span style="background-color: ${getProjectColor(proj.id)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(proj.name)}">${escapeHtml(proj.name)}</span>` :
                                `<span style="color: var(--text-muted);">${t('tasks.noProject')}</span>`
                            }
                        </div>
                        ` : ''}
                        ${tagsAndDateHTML}
                    </div>
                `;
            })
            .join("");
        });
        
    setupDragAndDrop();
    updateSortUI();
}


// Dynamically reorganize Details fields based on which are filled (mobile only)
// SIMPLIFIED LOGIC:
// - Start/End Date: If task was EVER created with dates, they ALWAYS stay in General (even if cleared)
// - Tags/Links: Move between General (filled) and Details (empty) dynamically
function reorganizeMobileTaskFields() {
    if (window.innerWidth > 768) return; // Desktop only

    const modal = document.getElementById("task-modal");
    if (!modal) return;

    const form = modal.querySelector("#task-form");
    const editingTaskId = form?.dataset.editingTaskId;

    // Only reorganize when editing existing task
    if (!editingTaskId) return;

    // Check if dates were INITIALLY set when modal opened (stored as data attributes)
    // This prevents dates from moving back to Details when cleared
    const startDateWasEverSet = modal.dataset.initialStartDate === 'true';
    const endDateWasEverSet = modal.dataset.initialEndDate === 'true';

    // Check current values for Tags and Links (these move dynamically)
    // Use task data when editing, temp arrays when creating.
    let hasTags = false;
    let hasLinks = false;

    if (editingTaskId) {
        const editingTask = tasks.find(t => t.id === parseInt(editingTaskId, 10));
        if (editingTask) {
            hasTags = Array.isArray(editingTask.tags) && editingTask.tags.length > 0;
            hasLinks = Array.isArray(editingTask.attachments) && editingTask.attachments.some(att =>
                att.type === 'link' || (att.url && att.type !== 'file')
            );
        }
    } else {
        hasTags = Array.isArray(window.tempTags) && window.tempTags.length > 0;
        hasLinks = Array.isArray(tempAttachments) && tempAttachments.some(att =>
            att.type === 'link' || (att.url && att.type !== 'file')
        );
    }

    // Get form groups
    const tagInput = modal.querySelector('#tag-input');
    const tagsGroup = tagInput ? tagInput.closest('.form-group') : null;

    const startDateInputs = modal.querySelectorAll('input[name="startDate"]');
    let startDateGroup = null;
    for (const input of startDateInputs) {
        const group = input.closest('.form-group');
        if (group) {
            startDateGroup = group;
            break;
        }
    }

    const endDateInputs = modal.querySelectorAll('input[name="endDate"]');
    let endDateGroup = null;
    for (const input of endDateInputs) {
        const group = input.closest('.form-group');
        if (group) {
            endDateGroup = group;
            break;
        }
    }

    const linksList = modal.querySelector('#attachments-links-list');
    const linksGroup = linksList ? linksList.closest('.form-group') : null;

    // Reorganize based on filled state
    // TAGS: Move dynamically based on current value
    if (tagsGroup) {
        if (hasTags) {
            tagsGroup.classList.remove('mobile-details-field');
            tagsGroup.classList.add('mobile-general-field');
        } else {
            tagsGroup.classList.remove('mobile-general-field');
            tagsGroup.classList.add('mobile-details-field');
        }
    }

    // START DATE: Once set, ALWAYS stay in General (even if cleared)
    if (startDateGroup) {
        if (startDateWasEverSet) {
            startDateGroup.classList.remove('mobile-details-field');
            startDateGroup.classList.add('mobile-general-field');
        } else {
            startDateGroup.classList.remove('mobile-general-field');
            startDateGroup.classList.add('mobile-details-field');
        }
    }

    // END DATE: Once set, ALWAYS stay in General (even if cleared)
    if (endDateGroup) {
        if (endDateWasEverSet) {
            endDateGroup.classList.remove('mobile-details-field');
            endDateGroup.classList.add('mobile-general-field');
        } else {
            endDateGroup.classList.remove('mobile-general-field');
            endDateGroup.classList.add('mobile-details-field');
        }
    }

    // LINKS: Move dynamically based on current value
    if (linksGroup) {
        if (hasLinks) {
            linksGroup.classList.remove('mobile-details-field');
            linksGroup.classList.add('mobile-general-field');
        } else {
            linksGroup.classList.remove('mobile-general-field');
            linksGroup.classList.add('mobile-details-field');
        }
    }

    // Update Details tab visibility
    // Only hide Details tab when BOTH Tags AND Links are filled
    // Dates don't affect this since they stay in General regardless
    const detailsTab = modal.querySelector('.modal-tab[data-tab="details"]');
    const allDynamicFieldsFilled = hasTags && hasLinks;

    console.log('\u{1F504} Reorganizing fields:', {
        hasTags,
        hasLinks,
        startDateWasEverSet,
        endDateWasEverSet,
        hideDetailsTab: allDynamicFieldsFilled
    });

    if (detailsTab) {
        if (allDynamicFieldsFilled) {
            console.log('\u{2705} Hiding Details tab - Tags and Links both filled');
            detailsTab.classList.add('hide-details-tab');
        } else {
            console.log('👁️ Showing Details tab - some dynamic fields empty');
            detailsTab.classList.remove('hide-details-tab');
        }
    }
}

// Task navigation context for navigating between tasks in a project
let currentTaskNavigationContext = null;

function openTaskDetails(taskId, navigationContext = null) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById("task-modal");
    if (!modal) return;

    // Store navigation context if provided
    currentTaskNavigationContext = navigationContext;

    // Reset tabs to General tab
    const generalTab = modal.querySelector('.modal-tab[data-tab="general"]');
    const detailsTab = modal.querySelector('.modal-tab[data-tab="details"]');
    const historyTab = modal.querySelector('.modal-tab[data-tab="history"]');
    const generalContent = modal.querySelector('#task-details-tab');
    const historyContent = modal.querySelector('#task-history-tab');

    // Activate General tab (both desktop and mobile)
    if (generalTab) generalTab.classList.add('active');
    if (detailsTab) detailsTab.classList.remove('active');
    if (historyTab) historyTab.classList.remove('active');
    if (generalContent) generalContent.classList.add('active');
    if (historyContent) historyContent.classList.remove('active');

    // Remove mobile tab state
    document.body.classList.remove('mobile-tab-details-active');

    // Show History tab for editing existing tasks
    if (historyTab) historyTab.style.display = '';

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.minHeight = '';
        modalContent.style.maxHeight = '';
    }

    // Title
    const titleEl = modal.querySelector("h2");
    if (titleEl) titleEl.textContent = "Edit Task";

    // Show ❌ and ⋯ in edit mode
    const closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) closeBtn.style.display = "inline-block";
    const optionsBtn = modal.querySelector("#task-options-btn");
    if (optionsBtn) optionsBtn.style.display = "inline-block";

    // Hide footer with "Create Task"
    const footer = modal.querySelector("#task-footer");
    if (footer) footer.style.display = "none";

    // Project dropdown (custom dropdown)
    populateProjectDropdownOptions();
    const hiddenProject = modal.querySelector("#hidden-project");
    const projectCurrentBtn = modal.querySelector("#project-current");
    if (hiddenProject && projectCurrentBtn) {
        hiddenProject.value = task.projectId || "";
        const projectTextSpan = projectCurrentBtn.querySelector(".project-text");
        if (projectTextSpan) {
            if (task.projectId) {
                const project = projects.find(p => p.id === task.projectId);
                if (project) {
                    const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(project.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
                    projectTextSpan.innerHTML = colorSquare + escapeHtml(project.name);
                } else {
                    projectTextSpan.textContent = t('tasks.project.selectPlaceholder');
                }
            } else {
                projectTextSpan.textContent = t('tasks.project.selectPlaceholder');
            }
        }
        updateTaskProjectOpenBtn(task.projectId || "");
    }

    // Title/description
    const titleInput = modal.querySelector('#task-form input[name="title"]');
    if (titleInput) titleInput.value = task.title || "";

    const descEditor = modal.querySelector("#task-description-editor");
    // Note: innerHTML used intentionally for rich text editing with contenteditable
    // Task descriptions support HTML formatting (bold, lists, links, etc.)
    if (descEditor) descEditor.innerHTML = task.description || "";
    const descHidden = modal.querySelector("#task-description-hidden");
    if (descHidden) descHidden.value = task.description || "";

    // Priority
    const hiddenPriority = modal.querySelector("#hidden-priority");
    if (hiddenPriority) hiddenPriority.value = task.priority || "medium";
    const priorityCurrentBtn = modal.querySelector("#priority-current");
    if (priorityCurrentBtn) {
        const priority = task.priority || "medium";
        // Using imported PRIORITY_LABELS
        priorityCurrentBtn.innerHTML = `<span class="priority-dot ${priority}"></span> ${getPriorityLabel(priority)} <span class="dropdown-arrow">▼</span>`;
        updatePriorityOptions(priority);
    }

    // Status
    const hiddenStatus = modal.querySelector("#hidden-status");
    if (hiddenStatus) hiddenStatus.value = task.status || "todo";
  const currentBtn = modal.querySelector("#status-current");
  if (currentBtn) {
    const statusBadge = currentBtn.querySelector(".status-badge");
    if (statusBadge) {
      statusBadge.className = "status-badge " + (task.status || "todo");
      statusBadge.textContent = getStatusLabel(task.status || "todo");
    }
    updateStatusOptions(task.status || "todo");
  }

    // Prepare date values from task
    let startIso = "";
    if (typeof task.startDate === "string") {
        if (looksLikeISO(task.startDate)) startIso = task.startDate;
        else if (looksLikeDMY(task.startDate)) startIso = toISOFromDMY(task.startDate);
    }

    let endIso = "";
    if (typeof task.endDate === "string") {
        if (looksLikeISO(task.endDate)) endIso = task.endDate;
        else if (looksLikeDMY(task.endDate)) endIso = toISOFromDMY(task.endDate);
    }

    // Get input references
    const startInput = modal.querySelector('#task-form input[name="startDate"]');
    const endInput = modal.querySelector('#task-form input[name="endDate"]');

    // Check if flatpickr is already initialized (to avoid flicker when navigating)
    // Flatpickr is attached to the display input, not the hidden input
    const startWrapper = startInput ? startInput.parentElement : null;
    const endWrapper = endInput ? endInput.parentElement : null;
    const startDisplayInput = startWrapper && startWrapper.classList.contains('date-input-wrapper')
        ? startWrapper.querySelector('input.date-display') : null;
    const endDisplayInput = endWrapper && endWrapper.classList.contains('date-input-wrapper')
        ? endWrapper.querySelector('input.date-display') : null;

    const startDateAlreadyWrapped = startDisplayInput && startDisplayInput._flatpickr;
    const endDateAlreadyWrapped = endDisplayInput && endDisplayInput._flatpickr;

    // If flatpickr is already initialized, just update the values (no flicker)
    if (startDateAlreadyWrapped && endDateAlreadyWrapped) {
        // Update values directly through flatpickr API (attached to display inputs)
        if (startDisplayInput && startDisplayInput._flatpickr) {
            // Set hidden input value first (critical for validation)
            startInput.value = startIso || '';
            if (startIso) {
                startDisplayInput._flatpickr.setDate(new Date(startIso), false);
            } else {
                startDisplayInput._flatpickr.clear();
            }
        }
        if (endDisplayInput && endDisplayInput._flatpickr) {
            // Set hidden input value first (critical for validation)
            endInput.value = endIso || '';
            if (endIso) {
                endDisplayInput._flatpickr.setDate(new Date(endIso), false);
            } else {
                endDisplayInput._flatpickr.clear();
            }
        }
    } else {
        // First time opening or flatpickr not initialized - do full reset
        const dateInputs = modal.querySelectorAll('input[name="startDate"], input[name="endDate"]');
        dateInputs.forEach(input => {
            if (input._flatpickrInstance) {
                input._flatpickrInstance.destroy();
                input._flatpickrInstance = null;
            }
            input._wrapped = false;

            // Remove wrapper if it exists
            const wrapper = input.closest('.date-input-wrapper');
            if (wrapper) {
                const parent = wrapper.parentNode;
                parent.insertBefore(input, wrapper);
                wrapper.remove();
            }

            // Restore to type="date"
            input.type = "date";
            input.style.display = "";
        });
    }

    // Editing ID
    const form = modal.querySelector("#task-form");
    if (form) form.dataset.editingTaskId = String(taskId);

    renderAttachments(task.attachments || []);
    renderTags(task.tags || []);

    // MOBILE: Dynamic field organization - move filled Details fields to General
    // Only applies when editing existing task (not creating new)
    if (window.innerWidth <= 768 && taskId) {
        const hasTags = Array.isArray(task.tags) && task.tags.length > 0;
        const hasStartDate = typeof task.startDate === 'string' && task.startDate.trim() !== '';
        const hasEndDate = typeof task.endDate === 'string' && task.endDate.trim() !== '';
        const hasLinks = Array.isArray(task.attachments) && task.attachments.some(att =>
            att.type === 'link' || (att.url && att.type !== 'file')
        );

        // Store initial date state - dates stay in General if they were ever set (even if cleared later)
        // NOTE: Don't use property-existence because we add empty fields during migration.
        const startDateWasEverSet = !!task.startDateWasEverSet || hasStartDate;
        const endDateWasEverSet = !!task.endDateWasEverSet || hasEndDate;
        modal.dataset.initialStartDate = startDateWasEverSet ? 'true' : 'false';
        modal.dataset.initialEndDate = endDateWasEverSet ? 'true' : 'false';

        // Get form groups for Details fields (using parent traversal instead of :has())
        const tagInput = modal.querySelector('#tag-input');
        const tagsGroup = tagInput ? tagInput.closest('.form-group') : null;

        const startDateInputs = modal.querySelectorAll('input[name="startDate"]');
        let startDateGroup = null;
        for (const input of startDateInputs) {
            const group = input.closest('.form-group');
            if (group && group.classList.contains('mobile-details-field')) {
                startDateGroup = group;
                break;
            }
        }

        const endDateInputs = modal.querySelectorAll('input[name="endDate"]');
        let endDateGroup = null;
        for (const input of endDateInputs) {
            const group = input.closest('.form-group');
            if (group && group.classList.contains('mobile-details-field')) {
                endDateGroup = group;
                break;
            }
        }

        const linksList = modal.querySelector('#attachments-links-list');
        const linksGroup = linksList ? linksList.closest('.form-group') : null;

        // Move filled fields to General, keep empty in Details
        if (tagsGroup) {
            if (hasTags) {
                tagsGroup.classList.remove('mobile-details-field');
                tagsGroup.classList.add('mobile-general-field');
            } else {
                tagsGroup.classList.remove('mobile-general-field');
                tagsGroup.classList.add('mobile-details-field');
            }
        }

        if (startDateGroup) {
            if (startDateWasEverSet) {
                startDateGroup.classList.remove('mobile-details-field');
                startDateGroup.classList.add('mobile-general-field');
            } else {
                startDateGroup.classList.remove('mobile-general-field');
                startDateGroup.classList.add('mobile-details-field');
            }
        }

        if (endDateGroup) {
            if (endDateWasEverSet) {
                endDateGroup.classList.remove('mobile-details-field');
                endDateGroup.classList.add('mobile-general-field');
            } else {
                endDateGroup.classList.remove('mobile-general-field');
                endDateGroup.classList.add('mobile-details-field');
            }
        }

        if (linksGroup) {
            if (hasLinks) {
                linksGroup.classList.remove('mobile-details-field');
                linksGroup.classList.add('mobile-general-field');
            } else {
                linksGroup.classList.remove('mobile-general-field');
                linksGroup.classList.add('mobile-details-field');
            }
        }

        // Hide Details tab only if Tags AND Links are filled (dates don't matter, they stay in General)
        const allDetailsFilled = hasTags && hasLinks;
        console.log('\u{1F50D} Details Tab Logic:', {
            hasTags,
            hasStartDate,
            hasEndDate,
            hasLinks,
            allDetailsFilled,
            tags: task.tags,
            startDate: task.startDate,
            endDate: task.endDate,
            attachments: task.attachments
        });
        if (detailsTab) {
            if (allDetailsFilled) {
                console.log('\u{2705} Hiding Details tab - all fields filled');
                detailsTab.classList.add('hide-details-tab');
            } else {
                console.log('👁️ Showing Details tab - some fields empty');
                detailsTab.classList.remove('hide-details-tab');
            }
        }
    }

    // CRITICAL: Make modal visible FIRST (mobile browsers require visible inputs to accept values)
    modal.classList.add("active");

    // Update navigation buttons based on context
    updateTaskNavigationButtons();

    // Use setTimeout to ensure modal is rendered and visible before setting date values
    setTimeout(() => {
        // Only do full initialization if not already wrapped (reduces flicker)
        if (!startDateAlreadyWrapped || !endDateAlreadyWrapped) {
            // Set values BEFORE wrapping (now that modal is visible)
            if (startInput) startInput.value = startIso || "";
            if (endInput) endInput.value = endIso || "";

            // Initialize date pickers (creates wrappers)
            initializeDatePickers();
        }

        // ALWAYS update display values after wrapping (critical for both first load and navigation)
        if (startInput) {
            const wrapper = startInput.parentElement;
            if (wrapper && wrapper.classList.contains('date-input-wrapper')) {
                const displayInput = wrapper.querySelector('input.date-display');
                if (displayInput) {
                    // Set hidden input value (critical for validation)
                    startInput.value = startIso || '';

                    // Update flatpickr instance (attached to display input)
                    if (displayInput._flatpickr) {
                        if (startIso) {
                            displayInput._flatpickr.setDate(new Date(startIso), false);
                        } else {
                            displayInput._flatpickr.clear();
                        }
                    }
                }
            }
        }

        if (endInput) {
            const wrapper = endInput.parentElement;
            if (wrapper && wrapper.classList.contains('date-input-wrapper')) {
                const displayInput = wrapper.querySelector('input.date-display');
                if (displayInput) {
                    // Set hidden input value (critical for validation)
                    endInput.value = endIso || '';

                    // Update flatpickr instance (attached to display input)
                    if (displayInput._flatpickr) {
                        if (endIso) {
                            displayInput._flatpickr.setDate(new Date(endIso), false);
                        } else {
                            displayInput._flatpickr.clear();
                        }
                    }
                }
            }
        }
    }, 0);

    // Add event listeners for real-time field reorganization
    setTimeout(() => {
        const dateInputsForListeners = modal.querySelectorAll('input[name="startDate"], input[name="endDate"]');
        dateInputsForListeners.forEach(input => {
            // Remove any existing listeners to prevent duplicates
            input.removeEventListener('change', reorganizeMobileTaskFields);
            // Add new listeners for the hidden input
            input.addEventListener('change', reorganizeMobileTaskFields);
        });
    }, 50);

    // Reset scroll position AFTER modal is active and rendered
    setTimeout(() => {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    }, 0);
}


function deleteTask() {
    const taskId = document.getElementById("task-form").dataset.editingTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === parseInt(taskId));
    if (!task) return;

    // Show custom confirmation modal
    document.getElementById("confirm-modal").classList.add("active");
    const confirmInput = document.getElementById("confirm-input");
    confirmInput.value = "";
    confirmInput.focus();

    // Auto-convert to lowercase as user types for better UX
    const lowercaseHandler = function(e) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toLowerCase();
        e.target.setSelectionRange(start, end);
    };
    confirmInput.addEventListener('input', lowercaseHandler);

    // Add keyboard support for task delete modal
    document.addEventListener('keydown', function(e) {
        const confirmModal = document.getElementById('confirm-modal');
        if (!confirmModal || !confirmModal.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            e.preventDefault();
            closeConfirmModal();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            confirmDelete();
        }
    });  
}

// Duplicate the currently open task in the task modal
async function duplicateTask() {
    const form = document.getElementById("task-form");
    const editingTaskId = form?.dataset.editingTaskId;
    if (!editingTaskId) return;

    // Use task service to duplicate task
    const result = duplicateTaskService(parseInt(editingTaskId, 10), tasks, taskCounter);
    if (!result.task) return;

    // Update global state
    tasks = result.tasks;
    taskCounter = result.taskCounter;
    const cloned = result.task;

    // Mark project as updated and record project history when a task is duplicated into a project
    if (cloned && cloned.projectId) {
        touchProjectUpdatedAt(cloned.projectId);
        recordProjectTaskLinkChange(cloned.projectId, 'added', cloned);
        saveProjects().catch(() => {});
    }

    // Close options menu to avoid overlaying issues
    const menu = document.getElementById("options-menu");
    if (menu) menu.style.display = "none";

    // Close the task modal immediately after duplicating
    closeModal("task-modal");

    // Sync date filter option visibility
    populateProjectOptions();
    populateTagOptions();
    updateNoDateOptionVisibility();

    // Update UI immediately (optimistic update)
    const inProjectDetails = document.getElementById("project-details").classList.contains("active");
    if (inProjectDetails && cloned.projectId) {
        showProjectDetails(cloned.projectId);
    } else {
        render();
    }

    // Refresh calendar if present
    const calendarView = document.getElementById("calendar-view");
    if (calendarView) {
        renderCalendar();
    }

    updateCounts();

    // Save in background (don't block UI)
    saveTasks().catch(err => {
        console.error('Failed to save duplicated task:', err);
        showErrorNotification(t('error.saveTaskFailed'));
    });

    // Optionally, open the duplicated task for quick edits
    // openTaskDetails(cloned.id);
}

function closeConfirmModal() {
    document.getElementById("confirm-modal").classList.remove("active");
    document.getElementById("confirm-error").classList.remove("show");
}

async function confirmDelete() {
    const input = document.getElementById("confirm-input");
    const errorMsg = document.getElementById("confirm-error");
    const confirmText = input.value;

    if (confirmText === "delete") {
        const taskId = document.getElementById("task-form").dataset.editingTaskId;

        // Use task service to delete task
        const result = deleteTaskService(parseInt(taskId, 10), tasks);
        if (!result.task) return;

        // Record history for task deletion
        if (window.historyService) {
            window.historyService.recordTaskDeleted(result.task);
        }

        const wasInProjectDetails = result.task && result.projectId &&
            document.getElementById("project-details").classList.contains("active");
        const projectId = result.projectId;

        // Update global tasks array
        tasks = result.tasks;

        // Mark project as updated and record project history when task is removed from a project
        if (projectId) {
            touchProjectUpdatedAt(projectId);
            recordProjectTaskLinkChange(projectId, 'removed', result.task);
            saveProjects().catch(() => {});
        }

        // Close modals and update UI immediately (optimistic update)
        closeConfirmModal();
        closeModal("task-modal");

        // Keep filter dropdowns in sync with removed task data
        populateProjectOptions();
        populateTagOptions();
        updateNoDateOptionVisibility();

        // If we were viewing project details, refresh them immediately
        if (wasInProjectDetails && projectId) {
            showProjectDetails(projectId);
        } else {
            // Otherwise refresh the main views immediately
            render();
        }

        // Always refresh calendar if it exists
        const calendarView = document.getElementById("calendar-view");
        if (calendarView) {
            renderCalendar();
        }

        updateCounts();

        // Save in background (don't block UI)
        saveTasks().catch(err => {
            console.error('Failed to save task deletion:', err);
            showErrorNotification(t('error.saveChangesFailed'));
        });
    } else {
        errorMsg.classList.add('show');
        input.focus();
    }
}

function setupDragAndDrop() {
    let draggedTaskIds = [];
    let draggedFromStatus = null;
    let dragOverCard = null;
    let isSingleDrag = true;
    let dragPlaceholder = null;

    // Auto-scroll while dragging when near edges
    let autoScrollTimer = null;
    const SCROLL_ZONE = 80;
    const SCROLL_SPEED = 20;
    
    function getScrollableAncestor(el) {
        let node = el;
        while (node && node !== document.body) {
            const style = getComputedStyle(node);
            const overflowY = style.overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && node.scrollHeight > node.clientHeight) {
                return node;
            }
            node = node.parentElement;
        }
        return window;
    }

    function startAutoScroll(direction, container) {
        stopAutoScroll();
        autoScrollTimer = setInterval(() => {
            try {
                if (container === window) {
                    window.scrollBy({ top: direction === 'down' ? SCROLL_SPEED : -SCROLL_SPEED, left: 0 });
                } else {
                    container.scrollTop += direction === 'down' ? SCROLL_SPEED : -SCROLL_SPEED;
                }
            } catch (err) {}
        }, 50);
    }

    function stopAutoScroll() {
        if (autoScrollTimer) {
            clearInterval(autoScrollTimer);
            autoScrollTimer = null;
        }
    }

    // 🔥 GET FRESH CARDS EVERY TIME
    const taskCards = document.querySelectorAll(".task-card");

    taskCards.forEach((card) => {
        card.addEventListener("dragstart", (e) => {
            const taskId = parseInt(card.dataset.taskId);
            const taskObj = tasks.find(t => t.id === taskId);
            draggedFromStatus = taskObj ? taskObj.status : null;

            if (selectedCards.has(taskId)) {
                draggedTaskIds = Array.from(selectedCards);
            } else {
                draggedTaskIds = [taskId];
            }
            isSingleDrag = draggedTaskIds.length === 1;

            card.classList.add('dragging');
            card.style.opacity = "0.5";

            // Create placeholder with the SAME height as the dragged card
            dragPlaceholder = document.createElement('div');
            dragPlaceholder.className = 'drag-placeholder active';
            dragPlaceholder.setAttribute('aria-hidden', 'true');
            const cardHeight = card.offsetHeight;
            dragPlaceholder.style.height = cardHeight + 'px';
            dragPlaceholder.style.margin = '8px 0';
            dragPlaceholder.style.opacity = '1';

            document.querySelectorAll(".kanban-column").forEach((col) => {
                col.style.backgroundColor = "var(--bg-tertiary)";
                col.style.border = "2px dashed var(--accent-blue)";
            });

            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', String(taskId)); } catch (err) {}
        });

        card.addEventListener("dragend", (e) => {
            card.classList.remove('dragging');
            card.style.opacity = "1";
            draggedTaskIds = [];
            draggedFromStatus = null;
            dragOverCard = null;
            isSingleDrag = true;

            // Remove placeholder
            try { 
                if (dragPlaceholder && dragPlaceholder.parentNode) {
                    dragPlaceholder.parentNode.removeChild(dragPlaceholder);
                }
            } catch (err) {}
            dragPlaceholder = null;

            document.querySelectorAll(".kanban-column").forEach((col) => {
                col.style.backgroundColor = "";
                col.style.border = "";
                col.classList.remove('drag-over');
            });

            document.querySelectorAll(".task-card").forEach((c) => {
                c.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            stopAutoScroll();
        });

        card.addEventListener('dragover', (e) => {
            if (draggedTaskIds.length === 0) return;
            e.preventDefault();
            
            const thisId = parseInt(card.dataset.taskId, 10);
            if (draggedTaskIds.includes(thisId)) return;
            
            const rect = card.getBoundingClientRect();
            const mouseY = e.clientY;
            const midpoint = rect.top + rect.height / 2;
            const isTop = mouseY < midpoint;
            
            dragOverCard = { card, isTop };
        });

        card.addEventListener('dragleave', (e) => {
            if (dragOverCard && dragOverCard.card === card) {
                dragOverCard = null;
            }
        });

        // 🔥 CLICK HANDLER - This is where selection happens
        card.addEventListener("click", (e) => {
            const taskId = parseInt(card.dataset.taskId, 10);

            if (isNaN(taskId)) return;

            const isToggleClick = e.ctrlKey || e.metaKey;
            const isRangeClick = e.shiftKey;

            if (isRangeClick) {
                e.preventDefault();
                e.stopPropagation();

                const column = card.closest('.kanban-column');
                const scope = column || document;
                const cardsInScope = Array.from(scope.querySelectorAll('.task-card'));
                let anchorCard = null;

                if (Number.isInteger(lastSelectedCardId)) {
                    anchorCard = cardsInScope.find((c) => parseInt(c.dataset.taskId, 10) === lastSelectedCardId);
                }
                if (!anchorCard) {
                    anchorCard = cardsInScope.find((c) => selectedCards.has(parseInt(c.dataset.taskId, 10))) || card;
                }

                const startIndex = cardsInScope.indexOf(anchorCard);
                const endIndex = cardsInScope.indexOf(card);

                if (!isToggleClick) {
                    clearSelectedCards();
                }

                if (startIndex === -1 || endIndex === -1) {
                    card.classList.add('selected');
                    selectedCards.add(taskId);
                    lastSelectedCardId = taskId;
                    return;
                }

                const from = Math.min(startIndex, endIndex);
                const to = Math.max(startIndex, endIndex);
                for (let i = from; i <= to; i++) {
                    const rangeCard = cardsInScope[i];
                    const rangeId = parseInt(rangeCard.dataset.taskId, 10);
                    if (isNaN(rangeId)) continue;
                    rangeCard.classList.add('selected');
                    selectedCards.add(rangeId);
                }

                lastSelectedCardId = taskId;
                return;
            }

            if (isToggleClick) {
                e.preventDefault();
                e.stopPropagation();

                card.classList.toggle('selected');

                if (card.classList.contains('selected')) {
                    selectedCards.add(taskId);
                } else {
                    selectedCards.delete(taskId);
                }

                lastSelectedCardId = taskId;
                return;
            }

            // Normal click opens task details
            openTaskDetails(taskId);
        });
    });

    const columns = document.querySelectorAll(".kanban-column");
    const statusMap = ["backlog", "todo", "progress", "review", "done"];

    columns.forEach((column, index) => {
        column.addEventListener("dragover", (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
            column.style.backgroundColor = "var(--hover-bg)";
            
            if (!dragPlaceholder) return;
            
            // ⭐ KEY FIX: Get the actual tasks container, not the column wrapper
            const tasksContainer = column.querySelector('[id$="-tasks"]');
            if (!tasksContainer) return;
            
            // Get all non-dragging cards in this container
            const cards = Array.from(tasksContainer.querySelectorAll('.task-card:not(.dragging)'));
            const mouseY = e.clientY;
            
            // Remove placeholder from current position
            if (dragPlaceholder.parentNode) {
                dragPlaceholder.remove();
            }
            
            if (cards.length === 0) {
                // Empty column - append to tasks container
                tasksContainer.appendChild(dragPlaceholder);
            } else {
                // Find where to insert based on mouse position
                let insertBeforeCard = null;
                
                for (const card of cards) {
                    const rect = card.getBoundingClientRect();
                    const cardMiddle = rect.top + (rect.height / 2);
                    
                    if (mouseY < cardMiddle) {
                        insertBeforeCard = card;
                        break;
                    }
                }
                
                if (insertBeforeCard) {
                    tasksContainer.insertBefore(dragPlaceholder, insertBeforeCard);
                } else {
                    // Mouse is below all cards
                    tasksContainer.appendChild(dragPlaceholder);
                }
            }

            // Auto-scroll logic
            try {
                const scrollContainer = getScrollableAncestor(column);
                const y = e.clientY;
                const topDist = y;
                const bottomDist = window.innerHeight - y;
                if (topDist < SCROLL_ZONE) startAutoScroll('up', scrollContainer);
                else if (bottomDist < SCROLL_ZONE) startAutoScroll('down', scrollContainer);
                else stopAutoScroll();
            } catch (err) { stopAutoScroll(); }
        });

        column.addEventListener("dragleave", (e) => {
            if (!column.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
                column.style.backgroundColor = "var(--bg-tertiary)";
            }
        });

        column.addEventListener("drop", async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            column.style.backgroundColor = "var(--bg-tertiary)";

            if (draggedTaskIds.length === 0) return;

            const newStatus = statusMap[index];
            
            // ⭐ KEY FIX: Use the tasks container to get accurate position
            const tasksContainer = column.querySelector('[id$="-tasks"]');
            if (!tasksContainer) return;

            // Single-card drag: treat as reorder (enable manual mode)
            if (isSingleDrag) {
                // Ensure manual sorting mode is initialized from priority ordering when needed
                if (sortMode !== 'manual') {
                    sortMode = 'manual';
                    ['backlog','todo','progress','review','done'].forEach(st => {
                        // Using imported PRIORITY_ORDER
                        manualTaskOrder[st] = tasks
                            .filter(t => t.status === st)
                            .slice()
                            .sort((a,b) => (PRIORITY_ORDER[b.priority]||0) - (PRIORITY_ORDER[a.priority]||0))
                            .map(t => t.id);
                    });
                    updateSortUI();
                    saveSortPreferences();
                }

                // Remove dragged ids from any existing manual orders to avoid duplicates
                Object.keys(manualTaskOrder).forEach(st => {
                    if (!Array.isArray(manualTaskOrder[st])) return;
                    manualTaskOrder[st] = manualTaskOrder[st].filter(id => !draggedTaskIds.includes(id));
                });

                // Build the canonical ordered list of IDs for the destination column (excluding dragged cards)
                // Using imported PRIORITY_ORDER
                const currentColumnTasks = tasks.filter(t => t.status === newStatus && !draggedTaskIds.includes(t.id));

                let orderedIds;
                if (Array.isArray(manualTaskOrder[newStatus]) && manualTaskOrder[newStatus].length) {
                    const presentIds = new Set(currentColumnTasks.map(t => t.id));
                    orderedIds = manualTaskOrder[newStatus].filter(id => presentIds.has(id));

                    const missing = currentColumnTasks
                        .filter(t => !orderedIds.includes(t.id))
                        .slice()
                        .sort((a,b) => (PRIORITY_ORDER[b.priority]||0) - (PRIORITY_ORDER[a.priority]||0))
                        .map(t => t.id);
                    orderedIds = orderedIds.concat(missing);
                } else {
                    orderedIds = currentColumnTasks
                        .slice()
                        .sort((a,b) => (PRIORITY_ORDER[b.priority]||0) - (PRIORITY_ORDER[a.priority]||0))
                        .map(t => t.id);
                }

                // ⭐ CRITICAL FIX: Find insertion position based on placeholder location in DOM
                let insertIndex = orderedIds.length; // Default: append at end

                if (dragPlaceholder && dragPlaceholder.parentNode === tasksContainer) {
                    // Get all cards currently in the DOM (in visual order)
                    const cardsInDOM = Array.from(tasksContainer.querySelectorAll('.task-card:not(.dragging)'));
                    
                    // Find where the placeholder is in relation to visible cards
                    let placeholderIndex = -1;
                    const children = Array.from(tasksContainer.children);
                    
                    for (let i = 0; i < children.length; i++) {
                        if (children[i] === dragPlaceholder) {
                            placeholderIndex = i;
                            break;
                        }
                    }
                    
                    if (placeholderIndex !== -1) {
                        // Count how many cards are BEFORE the placeholder
                        let cardsBefore = 0;
                        for (let i = 0; i < placeholderIndex; i++) {
                            if (children[i].classList && children[i].classList.contains('task-card')) {
                                cardsBefore++;
                            }
                        }
                        
                        // The insertion index should be at this position
                        insertIndex = cardsBefore;
                    }
                }

                // Insert the dragged card at the calculated position
                orderedIds.splice(insertIndex, 0, ...draggedTaskIds);
                manualTaskOrder[newStatus] = orderedIds;

                draggedTaskIds.forEach(id => {
                    const t = tasks.find(x => x.id === id);
                    if (t) {
                        const statusChanged = t.status !== newStatus;
                        if (statusChanged) {
                            // Store old state for history
                            const oldTaskCopy = JSON.parse(JSON.stringify(t));

                            t.status = newStatus;
                            t.updatedAt = new Date().toISOString();

                            // Auto-set dates when status changes (if setting is enabled)
                            if (settings.autoSetStartDateOnStatusChange || settings.autoSetEndDateOnStatusChange) {
                                const today = new Date().toISOString().split('T')[0];
                                if (settings.autoSetStartDateOnStatusChange && newStatus === 'progress' && !t.startDate) {
                                    t.startDate = today;
                                }
                                if (settings.autoSetEndDateOnStatusChange && newStatus === 'done' && !t.endDate) {
                                    t.endDate = today;
                                }
                            }

                            // Set completedDate when marked as done
                            if (newStatus === 'done' && !t.completedDate) {
                                t.completedDate = new Date().toISOString();
                            }

                            // Record history for drag and drop changes
                            if (window.historyService) {
                                window.historyService.recordTaskUpdated(oldTaskCopy, t);
                            }
                        }
                    }
                });

                saveSortPreferences();
                clearSelectedCards();
                render(); // Update UI immediately for instant drag feedback
                const calendarView = document.getElementById("calendar-view");
                if (calendarView) renderCalendar();
                try { if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder); } catch (err) {}
                dragPlaceholder = null;
                stopAutoScroll();

                // Save in background after UI updates
                saveTasks().catch(error => {
                    console.error('Failed to save drag-and-drop changes:', error);
                    showErrorNotification(t('error.saveTaskPositionFailed'));
                });
            } else {
                // Multi-drag - same fix applies
                if (sortMode !== 'manual') {
                    sortMode = 'manual';
                    ['backlog','todo','progress','review','done'].forEach(st => {
                        // Using imported PRIORITY_ORDER
                        manualTaskOrder[st] = tasks
                            .filter(t => t.status === st)
                            .slice()
                            .sort((a,b) => (PRIORITY_ORDER[b.priority]||0) - (PRIORITY_ORDER[a.priority]||0))
                            .map(t => t.id);
                    });
                    updateSortUI();
                    saveSortPreferences();
                }

                Object.keys(manualTaskOrder).forEach(st => {
                    if (!Array.isArray(manualTaskOrder[st])) return;
                    manualTaskOrder[st] = manualTaskOrder[st].filter(id => !draggedTaskIds.includes(id));
                });

                // Using imported PRIORITY_ORDER
                const currentColumnTasks = tasks.filter(t => t.status === newStatus && !draggedTaskIds.includes(t.id));

                let orderedIds;
                if (Array.isArray(manualTaskOrder[newStatus]) && manualTaskOrder[newStatus].length) {
                    const presentIds = new Set(currentColumnTasks.map(t => t.id));
                    orderedIds = manualTaskOrder[newStatus].filter(id => presentIds.has(id));

                    const missing = currentColumnTasks
                        .filter(t => !orderedIds.includes(t.id))
                        .slice()
                        .sort((a,b) => (PRIORITY_ORDER[b.priority]||0) - (PRIORITY_ORDER[a.priority]||0))
                        .map(t => t.id);
                    orderedIds = orderedIds.concat(missing);
                } else {
                    orderedIds = currentColumnTasks
                        .slice()
                        .sort((a,b) => (PRIORITY_ORDER[b.priority]||0) - (PRIORITY_ORDER[a.priority]||0))
                        .map(t => t.id);
                }

                // ⭐ SAME FIX for multi-drag
                let insertIndex = orderedIds.length;

                if (dragPlaceholder && dragPlaceholder.parentNode === tasksContainer) {
                    const children = Array.from(tasksContainer.children);
                    let placeholderIndex = children.indexOf(dragPlaceholder);
                    
                    if (placeholderIndex !== -1) {
                        let cardsBefore = 0;
                        for (let i = 0; i < placeholderIndex; i++) {
                            if (children[i].classList && children[i].classList.contains('task-card')) {
                                cardsBefore++;
                            }
                        }
                        insertIndex = cardsBefore;
                    }
                }

                orderedIds.splice(insertIndex, 0, ...draggedTaskIds);
                manualTaskOrder[newStatus] = orderedIds;

                draggedTaskIds.forEach(id => {
                    const t = tasks.find(x => x.id === id);
                    if (t) {
                        const statusChanged = t.status !== newStatus;
                        if (statusChanged) {
                            // Store old state for history
                            const oldTaskCopy = JSON.parse(JSON.stringify(t));

                            t.status = newStatus;
                            t.updatedAt = new Date().toISOString();

                            // Auto-set dates when status changes (if setting is enabled)
                            if (settings.autoSetStartDateOnStatusChange || settings.autoSetEndDateOnStatusChange) {
                                const today = new Date().toISOString().split('T')[0];
                                if (settings.autoSetStartDateOnStatusChange && newStatus === 'progress' && !t.startDate) {
                                    t.startDate = today;
                                }
                                if (settings.autoSetEndDateOnStatusChange && newStatus === 'done' && !t.endDate) {
                                    t.endDate = today;
                                }
                            }

                            // Set completedDate when marked as done
                            if (newStatus === 'done' && !t.completedDate) {
                                t.completedDate = new Date().toISOString();
                            }

                            // Record history for drag and drop changes
                            if (window.historyService) {
                                window.historyService.recordTaskUpdated(oldTaskCopy, t);
                            }
                        }
                    }
                });

                saveSortPreferences();
                clearSelectedCards();
                render(); // Update UI immediately for instant drag feedback
                const calendarView = document.getElementById("calendar-view");
                if (calendarView) renderCalendar();
                try { if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder); } catch (err) {}
                dragPlaceholder = null;
                stopAutoScroll();

                // Save in background after UI updates
                saveTasks().catch(error => {
                    console.error('Failed to save drag-and-drop changes:', error);
                    showErrorNotification(t('error.saveTaskPositionFailed'));
                });
            }
        });
    });

    document.addEventListener('dragend', () => stopAutoScroll());
}


function openProjectModal() {
    const modal = document.getElementById("project-modal");

    // Clear temp project tags for new project
    window.tempProjectTags = [];
    renderProjectTags([]);

    // Clear editingProjectId since this is a new project
    document.getElementById('project-form').dataset.editingProjectId = '';

    // CRITICAL: Make modal visible FIRST (mobile browsers require visible inputs to accept values)
    modal.classList.add("active");

    // Use setTimeout to ensure modal is rendered and visible before setting date values
    setTimeout(() => {
        // Clear start date (allow user to optionally set it)
        document.querySelector('#project-form input[name="startDate"]').value = '';

        // Clear any existing flatpickr instances first
        const dateInputs = document.querySelectorAll('#project-modal input[type="date"]');
        dateInputs.forEach(input => {
            if (input._flatpickrInstance) {
                input._flatpickrInstance.destroy();
                input._flatpickrInstance = null;
                input._wrapped = false;
            }
        });

        // Initialize date pickers AFTER modal is visible and values are set
        initializeDatePickers();
    }, 150);

    // Reset scroll position AFTER modal is active and rendered
    setTimeout(() => {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    }, 0);
}

// Task navigation functions
function updateTaskNavigationButtons() {
    const prevBtn = document.getElementById('task-nav-prev');
    const nextBtn = document.getElementById('task-nav-next');

    if (!prevBtn || !nextBtn) return;

    if (!currentTaskNavigationContext) {
        // No navigation context - hide buttons
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
    }

    const { taskIds, currentIndex } = currentTaskNavigationContext;

    // Show buttons
    prevBtn.style.display = 'flex';
    nextBtn.style.display = 'flex';

    // Enable/disable based on position
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= taskIds.length - 1;
}

function navigateToTask(direction) {
    if (!currentTaskNavigationContext) return;

    const { taskIds, currentIndex, projectId } = currentTaskNavigationContext;
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex < 0 || newIndex >= taskIds.length) return;

    const newTaskId = taskIds[newIndex];

    // Create new navigation context with updated index
    const newContext = {
        projectId,
        taskIds,
        currentIndex: newIndex
    };

    // Open task with new context
    openTaskDetails(newTaskId, newContext);
}

function navigateToPreviousTask() {
    navigateToTask('prev');
}

function navigateToNextTask() {
    navigateToTask('next');
}

// Initialize task navigation event listeners (once)
if (!window.taskNavigationInitialized) {
    window.taskNavigationInitialized = true;

    document.addEventListener('DOMContentLoaded', () => {
        const prevBtn = document.getElementById('task-nav-prev');
        const nextBtn = document.getElementById('task-nav-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToPreviousTask();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToNextTask();
            });
        }

        // Keyboard shortcuts for task navigation
        document.addEventListener('keydown', (e) => {
            // Only handle if task modal is active
            const taskModal = document.getElementById('task-modal');
            if (!taskModal || !taskModal.classList.contains('active')) return;

            // Only handle if we have navigation context
            if (!currentTaskNavigationContext) return;

            // Ignore if user is typing in an input/textarea/contenteditable
            const target = e.target;
            if (target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable) {
                return;
            }

            // Left arrow = previous task
            if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                navigateToPreviousTask();
            }

            // Right arrow = next task
            if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                navigateToNextTask();
            }
        });
    });
}

function openTaskModal() {
    const modal = document.getElementById("task-modal");
    if (!modal) return;

    // Clear navigation context when opening new task modal
    currentTaskNavigationContext = null;

    // Reset tabs to General tab
    const generalTab = modal.querySelector('.modal-tab[data-tab="general"]');
    const detailsTab = modal.querySelector('.modal-tab[data-tab="details"]');
    const historyTab = modal.querySelector('.modal-tab[data-tab="history"]');
    const generalContent = modal.querySelector('#task-details-tab');
    const historyContent = modal.querySelector('#task-history-tab');

    // Activate General tab (both desktop and mobile)
    if (generalTab) generalTab.classList.add('active');
    if (detailsTab) detailsTab.classList.remove('active');
    if (historyTab) historyTab.classList.remove('active');
    if (generalContent) generalContent.classList.add('active');
    if (historyContent) historyContent.classList.remove('active');

    // Remove mobile tab state
    document.body.classList.remove('mobile-tab-details-active');

    // Hide History tab for new tasks (no history yet)
    if (historyTab) historyTab.style.display = 'none';

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.minHeight = '';
        modalContent.style.maxHeight = '';
    }

    // Re-initialize date pickers for task modal
    setTimeout(() => {
        // CRITICAL: Query by name, not type, since wrapped inputs become type="hidden"
        const dateInputs = modal.querySelectorAll('input[name="startDate"], input[name="endDate"]');
        dateInputs.forEach(input => {
            if (input._flatpickrInstance) {
                input._flatpickrInstance.destroy();
                input._flatpickrInstance = null;
            }
            input._wrapped = false;

            // Remove wrapper if it exists
            const wrapper = input.closest('.date-input-wrapper');
            if (wrapper) {
                const parent = wrapper.parentNode;
                parent.insertBefore(input, wrapper);
                wrapper.remove();
            }

            // Restore to type="date"
            input.type = "date";
            input.style.display = "";
        });
        initializeDatePickers();
    }, 150);

    // Title
    const titleEl = modal.querySelector("h2");
    if (titleEl) titleEl.textContent = "Create New Task";

    // Hide ❌ and ⋯ in create mode
    const closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) closeBtn.style.display = "none";

    const optionsBtn = modal.querySelector("#task-options-btn");
    if (optionsBtn) optionsBtn.style.display = "none";

    // Show footer with "Create Task"
    const footer = modal.querySelector("#task-footer");
    if (footer) footer.style.display = "flex";

    // DEBUG: Log modal dimensions
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content');
        const modalBody = modal.querySelector('.modal-body');
        const modalFooter = modal.querySelector('.modal-footer');

        if (modalContent && modalFooter) {
            const contentRect = modalContent.getBoundingClientRect();
            const footerRect = modalFooter.getBoundingClientRect();
            const contentStyle = window.getComputedStyle(modalContent);
            const footerStyle = window.getComputedStyle(modalFooter);

            console.log('=== MODAL DEBUG ===');
            console.log('Viewport:', window.innerWidth, 'x', window.innerHeight);
            console.log('Zoom:', window.devicePixelRatio * 100 + '%');
            console.log('');
            console.log('MODAL-CONTENT:');
            console.log('  Position:', contentRect.top.toFixed(1), 'to', contentRect.bottom.toFixed(1));
            console.log('  Height:', contentRect.height.toFixed(1), '/', contentStyle.height, '/', contentStyle.maxHeight);
            console.log('  Padding:', contentStyle.padding);
            console.log('  Display:', contentStyle.display);
            console.log('  Overflow:', contentStyle.overflow);
            console.log('');
            console.log('MODAL-FOOTER:');
            console.log('  Position:', footerRect.top.toFixed(1), 'to', footerRect.bottom.toFixed(1));
            console.log('  Height:', footerRect.height.toFixed(1));
            console.log('  Flex-shrink:', footerStyle.flexShrink);
            console.log('  Padding:', footerStyle.padding);
            console.log('');
            const overflow = footerRect.bottom - contentRect.bottom;
            if (overflow > 1) {
                console.error('❌ FOOTER OVERFLOW:', overflow.toFixed(1) + 'px OUTSIDE modal-content');
            } else {
                console.log('\u{2705} Footer is inside modal-content');
            }
            console.log('==================');
        }
    }, 100);

    // Reset editing mode and clear fields
    const form = modal.querySelector("#task-form");
    if (form) {
        delete form.dataset.editingTaskId;
        form.reset(); // This properly clears all form fields when opening
    }

    // Clear additional fields that might not be cleared by form.reset()
    const descEditor = modal.querySelector("#task-description-editor");
    if (descEditor) descEditor.innerHTML = "";

    const descHidden = modal.querySelector("#task-description-hidden");
    if (descHidden) descHidden.value = "";

    // Reset custom Project field to default (no project)
    const hiddenProject = modal.querySelector('#hidden-project');
    if (hiddenProject) hiddenProject.value = "";
    const projectCurrentBtn = modal.querySelector('#project-current .project-text');
    if (projectCurrentBtn) projectCurrentBtn.textContent = t('tasks.project.selectPlaceholder');
    updateTaskProjectOpenBtn('');
    // Ensure floating portal is closed if it was open
    if (typeof hideProjectDropdownPortal === 'function') hideProjectDropdownPortal();

    // Reset priority
    const hiddenPriority = modal.querySelector("#hidden-priority");
    if (hiddenPriority) hiddenPriority.value = "medium";
    const priorityCurrentBtn = modal.querySelector("#priority-current");
    if (priorityCurrentBtn) {
        priorityCurrentBtn.innerHTML = `<span class="priority-dot medium"></span> ${getPriorityLabel("medium")} <span class="dropdown-arrow">▼</span>`;
        updatePriorityOptions("medium");
    }

    // Reset status (default for new tasks)
    const hiddenStatus = modal.querySelector("#hidden-status");
    if (hiddenStatus) hiddenStatus.value = "backlog";

    const currentBtn = modal.querySelector("#status-current");
    if (currentBtn) {
        const statusBadge = currentBtn.querySelector(".status-badge");
        if (statusBadge) {
            statusBadge.className = "status-badge backlog";
            statusBadge.textContent = getStatusLabel("backlog");
        }
    }

    // Clear attachments and tags
    tempAttachments = [];
    window.tempTags = [];
    filterState.tags.clear();
    renderAttachments([]);
    renderTags([]);

    // MOBILE: Reset field organization for new task - all Details fields should be in Details tab
    if (window.innerWidth <= 768) {
        // Clear initial date state for new tasks - dates start in Details
        modal.dataset.initialStartDate = 'false';
        modal.dataset.initialEndDate = 'false';

        const tagsGroup = modal.querySelector('.form-group:has(#tag-input)');
        const startDateGroup = modal.querySelector('.form-group:has([name="startDate"])');
        const endDateGroup = modal.querySelector('.form-group:has([name="endDate"])');
        const linksGroup = modal.querySelector('.form-group:has(#attachments-links-list)');

        // Ensure all Details fields are in Details tab for new tasks
        if (tagsGroup) {
            tagsGroup.classList.remove('mobile-general-field');
            tagsGroup.classList.add('mobile-details-field');
        }
        if (startDateGroup) {
            startDateGroup.classList.remove('mobile-general-field');
            startDateGroup.classList.add('mobile-details-field');
        }
        if (endDateGroup) {
            endDateGroup.classList.remove('mobile-general-field');
            endDateGroup.classList.add('mobile-details-field');
        }
        if (linksGroup) {
            linksGroup.classList.remove('mobile-general-field');
            linksGroup.classList.add('mobile-details-field');
        }

        // Show Details tab for new tasks
        if (detailsTab) {
            detailsTab.classList.remove('hide-details-tab');
        }
    }

    // Explicitly clear date pickers to prevent dirty form state
    const hiddenStart = modal.querySelector('#task-form input[name="startDate"]');
    if (hiddenStart) {
        const fp = hiddenStart._flatpickrInstance;
        if (fp) {
            fp.clear();
            fp.jumpToDate(new Date());
        }
        hiddenStart.value = "";
        const displayStart = hiddenStart.parentElement
            ? hiddenStart.parentElement.querySelector("input.date-display")
            : null;
        if (displayStart) displayStart.value = "";
    }

    const hiddenEnd = modal.querySelector('#task-form input[name="endDate"]');
    if (hiddenEnd) {
        const fp = hiddenEnd._flatpickrInstance;
        if (fp) {
            fp.clear();
            fp.jumpToDate(new Date());
        }
        hiddenEnd.value = "";
        const displayEnd = hiddenEnd.parentElement
            ? hiddenEnd.parentElement.querySelector("input.date-display")
            : null;
        if (displayEnd) displayEnd.value = "";
    }

    modal.classList.add("active");

    // Reset scroll position AFTER modal is active and rendered
    setTimeout(() => {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    }, 0);

    setTimeout(() => {
        initializeDatePickers();
        // Capture initial state after all defaults are set
        captureInitialTaskFormState();
    }, 100);

}



function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // If closing settings modal and there are unsaved changes, show confirmation instead
    if (modalId === 'settings-modal' && window.settingsFormIsDirty) {
        showUnsavedChangesModal(modalId);
        return;
    }

    modal.classList.remove("active");

    // Close any floating portals associated with Settings
    if (modalId === 'settings-modal') {
        if (typeof hideNotificationTimePortal === 'function') hideNotificationTimePortal();
        if (typeof hideNotificationTimeZonePortal === 'function') hideNotificationTimeZonePortal();
    }

    // Clear any task-modal height pinning used for History tab stability
    if (modalId === 'task-modal') {
        try {
            const content = modal.querySelector('.modal-content');
            if (content) content.style.minHeight = '';
        } catch (e) {}
    }

    // Only reset forms when manually closing (not after successful submission)
    // This prevents clearing user input after task creation
    if (modalId === "project-modal") {
        document.getElementById("project-form").reset();
    }
}

// Separate function for manually closing task modal with reset
function closeTaskModal() {
    // If there are unsaved fields in NEW task, show confirmation instead
    if (hasUnsavedNewTask && hasUnsavedNewTask()) {
        showUnsavedChangesModal('task-modal');
        return;
    }

    // For existing tasks, persist latest description (including checkboxes) before closing
    const form = document.getElementById("task-form");
    if (form && form.dataset.editingTaskId) {
        const descEditor = form.querySelector('#task-description-editor');
        if (descEditor) {
            updateTaskField('description', descEditor.innerHTML);
        }
    }

    if (form) {
        form.reset();
        delete form.dataset.editingTaskId;

        // Reset status dropdown to default (keep in sync with create-mode defaults)
        const statusBadge = document.querySelector("#status-current .status-badge");
        if (statusBadge) {
            statusBadge.className = "status-badge backlog";
            statusBadge.textContent = getStatusLabel("backlog");
        }
        const hiddenStatus = document.getElementById("hidden-status");
        if (hiddenStatus) hiddenStatus.value = "backlog";

        // Reset priority dropdown to default
        const priorityCurrentBtn = document.querySelector("#priority-current");
        if (priorityCurrentBtn) {
            priorityCurrentBtn.innerHTML = `<span class="priority-dot medium"></span> ${getPriorityLabel("medium")} <span class="dropdown-arrow">▼</span>`;
        }
        const hiddenPriority = document.getElementById("hidden-priority");
        if (hiddenPriority) hiddenPriority.value = "medium";
    }

    // Clear initial state tracking
    initialTaskFormState = null;

    // Clear navigation context
    currentTaskNavigationContext = null;

    closeModal("task-modal");
}

document
    .getElementById("project-form")
    .addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Get tags from temp storage or empty array
        const tags = window.tempProjectTags || [];

        // Use project service to create project
        const result = createProjectService({
            name: formData.get("name"),
            description: formData.get("description"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            tags: tags
        }, projects, projectCounter);

        projects = result.projects;
        projectCounter = result.projectCounter;
        const project = result.project;

        // Record history for project creation
        if (window.historyService) {
            window.historyService.recordProjectCreated(project);
        }

        // Close modal and update UI immediately (optimistic update)
        closeModal("project-modal");
        e.target.reset();

        // Clear temp tags
        window.tempProjectTags = [];

        // Clear sorted view cache to force refresh with new project
        projectsSortedView = null;

        // Navigate to projects page and show the new project immediately
        window.location.hash = 'projects';
        showPage('projects');
        render(); // Refresh the projects list immediately

        // Save in background (don't block UI)
        saveProjects().catch(err => {
            console.error('Failed to save project:', err);
            showErrorNotification(t('error.saveProjectFailed'));
        });
    });

// Reset PIN handler
function resetPINFlow() {
    // Create a modal for PIN reset - ask for current PIN and new PIN
    const resetPinModal = document.createElement('div');
    resetPinModal.className = 'modal active';
    resetPinModal.id = 'reset-pin-modal-temp';
    resetPinModal.innerHTML = `
        <div class="modal-content reset-pin-modal-content">
            <div class="reset-pin-modal-inner">
                <div class="reset-pin-header">
                    <div>
                        <h2 class="reset-pin-title">Reset PIN</h2>
                        <p class="reset-pin-description">Verify your current PIN to set a new one</p>
                    </div>
                </div>
                
                <form id="reset-pin-form" class="reset-pin-form">
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">Current PIN</label>
                        <input
                            type="password"
                            id="current-pin-input"
                            maxlength="4"
                            placeholder="••••"
                            class="reset-pin-input"
                            inputmode="numeric"
                            autocomplete="off"
                            required
                        />
                        <div id="current-pin-error" class="reset-pin-error" style="display: none;"></div>
                    </div>

                    <div class="reset-pin-actions">
                        <button type="button" class="reset-pin-btn reset-pin-btn-cancel" onclick="document.getElementById('reset-pin-modal-temp').remove()">
                            Cancel
                        </button>
                        <button type="submit" class="reset-pin-btn reset-pin-btn-primary">
                            Continue
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(resetPinModal);
    
    // Add form handler
    document.getElementById('reset-pin-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const currentPin = document.getElementById('current-pin-input').value.trim();
        const errorEl = document.getElementById('current-pin-error');

        // Clear previous errors
        errorEl.style.display = 'none';
        errorEl.textContent = '';

        if (!currentPin || currentPin.length !== 4) {
            errorEl.textContent = 'PIN must be 4 digits';
            errorEl.style.display = 'block';
            return;
        }

        if (!/^\d{4}$/.test(currentPin)) {
            errorEl.textContent = 'PIN must contain only digits';
            errorEl.style.display = 'block';
            return;
        }

        // Remove current modal and show new PIN entry
        document.getElementById('reset-pin-modal-temp').remove();
        showNewPinEntry(currentPin);
    });
    
    document.getElementById('current-pin-input').focus();
}

function showNewPinEntry(currentPin) {
    const newPinModal = document.createElement('div');
    newPinModal.className = 'modal active';
    newPinModal.id = 'new-pin-modal-temp';
    newPinModal.innerHTML = `
        <div class="modal-content reset-pin-modal-content">
            <div class="reset-pin-modal-inner">
                <div class="reset-pin-header">
                    <div>
                        <h2 class="reset-pin-title">Set New PIN</h2>
                        <p class="reset-pin-description">Create your new 4-digit PIN</p>
                    </div>
                </div>
                
                <form id="new-pin-form" class="reset-pin-form">
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">New PIN</label>
                        <input 
                            type="password" 
                            id="new-pin-input" 
                            maxlength="4" 
                            placeholder="••••"
                            class="reset-pin-input"
                            inputmode="numeric"
                            autocomplete="off"
                            required
                        />
                    </div>
                    
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">Confirm PIN</label>
                        <input
                            type="password"
                            id="confirm-pin-input"
                            maxlength="4"
                            placeholder="••••"
                            class="reset-pin-input"
                            inputmode="numeric"
                            autocomplete="off"
                            required
                        />
                        <div id="new-pin-error" class="reset-pin-error" style="display: none;"></div>
                    </div>

                    <div class="reset-pin-actions">
                        <button type="button" class="reset-pin-btn reset-pin-btn-cancel" onclick="document.getElementById('new-pin-modal-temp').remove()">
                            Cancel
                        </button>
                        <button type="submit" class="reset-pin-btn reset-pin-btn-primary">
                            Reset PIN
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(newPinModal);
    
    document.getElementById('new-pin-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const newPin = document.getElementById('new-pin-input').value.trim();
        const confirmPin = document.getElementById('confirm-pin-input').value.trim();
        const errorEl = document.getElementById('new-pin-error');

        // Clear previous errors
        errorEl.style.display = 'none';
        errorEl.textContent = '';

        if (!newPin || newPin.length !== 4) {
            errorEl.textContent = 'New PIN must be 4 digits';
            errorEl.style.display = 'block';
            return;
        }

        if (!/^\d{4}$/.test(newPin)) {
            errorEl.textContent = 'PIN must contain only digits';
            errorEl.style.display = 'block';
            return;
        }

        if (newPin !== confirmPin) {
            errorEl.textContent = 'PINs do not match';
            errorEl.style.display = 'block';
            return;
        }

        // Call the API to reset the PIN
        submitPINReset(currentPin, newPin);
    });
    
    document.getElementById('new-pin-input').focus();
}

async function submitPINReset(currentPin, newPin) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showErrorNotification(t('error.notLoggedInResetPin'));
            return;
        }
        
        const response = await fetch('/api/auth/change-pin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPin: currentPin,
                newPin: newPin
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showErrorNotification(data.error || t('error.resetPinFailed'));
            return;
        }
        
        // Remove modal
        const modal = document.getElementById('new-pin-modal-temp');
        if (modal) modal.remove();
        
        showSuccessNotification(t('success.resetPin'));
        
        // Optional: redirect to login after a delay
        setTimeout(() => {
            window.location.hash = '';
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('PIN reset error:', error);
        showErrorNotification(t('error.resetPinError'));
    }
}

  document
      .getElementById("settings-form")
      .addEventListener("submit", async function (e) {
        e.preventDefault();

        // If nothing has changed, ignore submit
        const saveBtn = this.querySelector('.settings-btn-save');
        if (saveBtn && saveBtn.disabled && !window.settingsFormIsDirty) {
            return;
        }
        
        // Save display name to KV-backed user record (persists across sign-out)
        const newName = document.getElementById('user-name').value.trim();
        if (!newName) {
            showErrorNotification(t('error.userNameEmpty'));
            return; // prevent closing modal if name is empty
        }

        try {
            const token = window.authSystem?.getAuthToken?.() || localStorage.getItem('authToken');
            if (!token) throw new Error('Missing auth token');

            const resp = await fetch('/api/auth/change-name', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newName })
            });

            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                throw new Error(data.error || 'Failed to update display name');
            }

            // Update in-memory user + UI immediately
            const currentUser = window.authSystem?.getCurrentUser?.();
            if (currentUser) currentUser.name = data.name || newName;
            updateUserDisplay(data.name || newName, window.authSystem?.getCurrentUser?.()?.avatarDataUrl);
        } catch (err) {
            console.error('Failed to save display name:', err);
            showErrorNotification(t('error.saveDisplayNameFailed'));
            return;
        }

        // Save email to KV-backed user record (authoritative for notification delivery)
        const emailInput = document.getElementById('user-email');
        const newEmail = String(emailInput?.value || '').trim().toLowerCase();
        if (!newEmail || !isValidEmailAddress(newEmail)) {
            showErrorNotification(t('error.invalidEmail'));
            return;
        }

        try {
            const currentUser = window.authSystem?.getCurrentUser?.();
            const currentEmail = String(currentUser?.email || '').trim().toLowerCase();

            if (newEmail && newEmail !== currentEmail) {
                const token = window.authSystem?.getAuthToken?.() || localStorage.getItem('authToken');
                if (!token) throw new Error('Missing auth token');

                const resp = await fetch('/api/auth/change-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ newEmail })
                });

                const data = await resp.json().catch(() => ({}));
                if (!resp.ok) {
                    throw new Error(data.error || 'Failed to update email');
                }

                // Update in-memory user + UI immediately
                if (currentUser) currentUser.email = data.email || newEmail;
                document.querySelectorAll('.user-email').forEach(el => {
                    if (el) el.textContent = data.email || newEmail;
                });
            }
        } catch (err) {
            console.error('Failed to save email:', err);
            showErrorNotification(t('error.saveEmailFailed'));
            return;
        }

        // Save avatar to KV-backed user record
        try {
            if (avatarDraft.hasPendingChange) {
                const token = window.authSystem?.getAuthToken?.() || localStorage.getItem('authToken');
                if (!token) throw new Error('Missing auth token');

                const resp = await fetch('/api/auth/change-avatar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ avatarDataUrl: avatarDraft.dataUrl || null })
                });

                const data = await resp.json().catch(() => ({}));
                if (!resp.ok) {
                    throw new Error(data.error || 'Failed to update avatar');
                }

                const currentUser = window.authSystem?.getCurrentUser?.();
                if (currentUser) currentUser.avatarDataUrl = data.avatarDataUrl || null;
                applyUserAvatarToHeader();
                refreshUserAvatarSettingsUI();

                avatarDraft.hasPendingChange = false;
                avatarDraft.dataUrl = null;
            }
        } catch (err) {
            console.error('Failed to save avatar:', err);
            showErrorNotification(t('error.saveAvatarFailed'));
            return;
        }

        // Save application settings
        const autoStartToggle = document.getElementById('auto-start-date-toggle');
        const autoEndToggle = document.getElementById('auto-end-date-toggle');
        const enableReviewStatusToggle = document.getElementById('enable-review-status-toggle');
        const calendarIncludeBacklogToggle = document.getElementById('calendar-include-backlog-toggle');
        const historySortOrderSelect = document.getElementById('history-sort-order');
        const languageSelect = document.getElementById('language-select');

        settings.autoSetStartDateOnStatusChange = !!autoStartToggle?.checked;
        settings.autoSetEndDateOnStatusChange = !!autoEndToggle?.checked;

        // Check if disabling IN REVIEW status with existing review tasks
        const wasEnabled = window.enableReviewStatus;
        const willBeEnabled = !!enableReviewStatusToggle?.checked;

        if (wasEnabled && !willBeEnabled) {
            // User is trying to disable IN REVIEW - check for existing review tasks
            const reviewTasks = tasks.filter(t => t.status === 'review');

            if (reviewTasks.length > 0) {
                // Show custom modal with task list
                const taskListContainer = document.getElementById('review-status-task-list');
                const displayTasks = reviewTasks.slice(0, 5);
                const hasMore = reviewTasks.length > 5;

                const taskListHTML = `
                    <div style="
                        color: var(--text-primary);
                        font-size: 14px;
                        line-height: 1.6;
                        margin-bottom: 16px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-wrap: wrap;
                    ">
                        <span style="color: var(--text-secondary);">You have</span>
                        <span style="
                            color: var(--text-primary);
                            font-weight: 600;
                            font-size: 16px;
                        ">${reviewTasks.length}</span>
                        <span style="color: var(--text-secondary);">${reviewTasks.length === 1 ? 'task' : 'tasks'} with</span>
                        <span class="status-badge review" style="
                            display: inline-flex;
                            align-items: center;
                            padding: 4px 10px;
                            border-radius: 6px;
                            font-size: 11px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        ">IN REVIEW</span>
                        <span style="color: var(--text-secondary);">status</span>
                    </div>
                    <div style="margin: 20px 0;">
                        ${displayTasks.map(t => `
                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                padding: 8px 0;
                                color: var(--text-primary);
                                font-size: 14px;
                            ">
                                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0; color: var(--accent-green);">
                                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                    <path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${escapeHtml(t.title)}
                                </span>
                            </div>
                        `).join('')}
                        ${hasMore ? `
                            <div style="
                                margin-top: 12px;
                                padding-top: 12px;
                                border-top: 1px solid var(--border-color);
                            ">
                                <button type="button" style="
                                    background: none;
                                    border: none;
                                    color: var(--accent-blue);
                                    text-decoration: none;
                                    font-size: 13px;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 6px;
                                    cursor: pointer;
                                    padding: 0;
                                    font-family: inherit;
                                " onclick="
                                    const baseUrl = window.location.href.split('#')[0];
                                    const url = baseUrl + '#tasks?status=review&view=list';
                                    window.open(url, '_blank');
                                ">
                                    <span>View all ${reviewTasks.length} tasks in List view</span>
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0;">
                                        <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div style="
                        color: var(--text-primary);
                        font-size: 14px;
                        line-height: 1.6;
                        margin-top: 20px;
                        padding: 16px;
                        background: var(--bg-tertiary);
                        border-radius: 8px;
                        border-left: 3px solid var(--accent-blue);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-wrap: wrap;
                    ">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0; color: var(--accent-blue);">
                            <path d="M8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" stroke="currentColor" stroke-width="1.5"/>
                            <path d="M8 5V8L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        <span style="color: var(--text-secondary);">These tasks will be moved to</span>
                        <span class="status-badge progress" style="
                            display: inline-flex;
                            align-items: center;
                            padding: 4px 10px;
                            border-radius: 6px;
                            font-size: 11px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        ">IN PROGRESS</span>
                    </div>
                `;
                taskListContainer.innerHTML = taskListHTML;

                // Store tasks to migrate and toggle reference for later
                window.pendingReviewTaskMigration = reviewTasks;
                window.pendingReviewStatusToggle = enableReviewStatusToggle;

                // Show modal and exit early - will continue in confirmDisableReviewStatus
                document.getElementById('review-status-confirm-modal').classList.add('active');
                return;
            }
        }

        settings.enableReviewStatus = willBeEnabled;
        settings.calendarIncludeBacklog = !!calendarIncludeBacklogToggle?.checked;
        settings.historySortOrder = historySortOrderSelect.value;
        settings.language = normalizeLanguage(languageSelect?.value || 'en');

        // Update global variable and localStorage
        window.enableReviewStatus = settings.enableReviewStatus;
        localStorage.setItem('enableReviewStatus', String(settings.enableReviewStatus));

        // Apply review status visibility
        applyReviewStatusVisibility();
        applyLanguage();
        
          settings.notificationEmail = newEmail;

          const emailNotificationsEnabledToggle = document.getElementById('email-notifications-enabled');
          const emailNotificationsWeekdaysOnlyToggle = document.getElementById('email-notifications-weekdays-only');
          const emailNotificationsIncludeStartDatesToggle = document.getElementById('email-notifications-include-start-dates');
          const emailNotificationsIncludeBacklogToggle = document.getElementById('email-notifications-include-backlog');
          const emailNotificationTimeInput = document.getElementById('email-notification-time');
          const emailNotificationTimeZoneSelect = document.getElementById('email-notification-timezone');

          settings.emailNotificationsEnabled = !!emailNotificationsEnabledToggle?.checked;
          settings.emailNotificationsWeekdaysOnly = !!emailNotificationsWeekdaysOnlyToggle?.checked;
          settings.emailNotificationsIncludeStartDates = !!emailNotificationsIncludeStartDatesToggle?.checked;
          settings.emailNotificationsIncludeBacklog = !!emailNotificationsIncludeBacklogToggle?.checked;
          const snappedTime = snapHHMMToStep(
              normalizeHHMM(emailNotificationTimeInput?.value) || "09:00",
              30
          );
          settings.emailNotificationTime =
              clampHHMMToRange(snappedTime || "09:00", "08:00", "18:00") || "09:00";
          settings.emailNotificationTimeZone = String(
              emailNotificationTimeZoneSelect?.value || "Atlantic/Canary"
          );

          if (emailNotificationTimeInput) {
              emailNotificationTimeInput.value = settings.emailNotificationTime;
          }

          if (workspaceLogoDraft.hasPendingChange) {
              settings.customWorkspaceLogo = workspaceLogoDraft.dataUrl || null;
          }
  
          saveSettings();
          applyWorkspaceLogo();

          // Refresh notification state to reflect new settings (e.g., backlog filter changes)
          updateNotificationState({ force: true });

          // Refresh calendar if it's currently active (to apply backlog filter changes)
          const calendarView = document.getElementById('calendar-view');
          if (calendarView && calendarView.classList.contains('active')) {
              renderCalendar();
          }

          workspaceLogoDraft.hasPendingChange = false;
          workspaceLogoDraft.dataUrl = null;

          // Also update the display in the user menu
          const userEmailEl = document.querySelector('.user-email');
          if (userEmailEl) userEmailEl.textContent = newEmail;

          showSuccessNotification(t('success.settingsSaved'));
          // Mark form as clean and close
          window.initialSettingsFormState = null;
          window.settingsFormIsDirty = false;
          if (saveBtn) {
              saveBtn.classList.remove('dirty');
              saveBtn.disabled = true;
          }
          closeModal('settings-modal');
      });

  function refreshUserAvatarSettingsUI() {
      const preview = document.getElementById('user-avatar-preview');
      const clearButton = document.getElementById('user-avatar-clear-btn');
      const dropzone = document.getElementById('user-avatar-dropzone');
      const row = preview?.closest?.('.user-avatar-input-row') || dropzone?.closest?.('.user-avatar-input-row') || null;

      const currentUser = window.authSystem?.getCurrentUser?.();
      const effectiveAvatar = avatarDraft.hasPendingChange
          ? avatarDraft.dataUrl
          : (currentUser?.avatarDataUrl || null);
      const hasAvatar = !!effectiveAvatar;

      if (preview && clearButton) {
          if (effectiveAvatar) {
              preview.style.display = 'block';
              preview.style.backgroundImage = `url(${effectiveAvatar})`;
              clearButton.style.display = 'inline-flex';
          } else {
              preview.style.display = 'none';
              preview.style.backgroundImage = '';
              clearButton.style.display = 'none';
          }
      }

      if (dropzone) {
          const uploadAria = t('settings.avatarUploadAriaUpload');
          const changeAria = t('settings.avatarUploadAriaChange');
          dropzone.setAttribute('aria-label', hasAvatar ? changeAria : uploadAria);

          const textEl = dropzone.querySelector('.workspace-logo-dropzone-text');
          if (textEl) {
              const defaultText = dropzone.dataset.defaultText || t('settings.avatarUploadDefault');
              const changeText = dropzone.dataset.changeText || t('settings.avatarUploadChange');
              textEl.textContent = hasAvatar ? changeText : defaultText;
          }

          // Make the dropzone more compact once an avatar exists.
          dropzone.style.minHeight = hasAvatar ? '40px' : '48px';
          dropzone.style.padding = hasAvatar ? '10px 12px' : '12px 16px';
      }

      if (row) {
          row.classList.toggle('has-avatar', hasAvatar);
      }
  }

  function applyUserAvatarToHeader() {
      const currentUser = window.authSystem?.getCurrentUser?.();
      if (!currentUser) return;
      updateUserDisplay(currentUser.name, currentUser.avatarDataUrl || null);
  }

  function setupWorkspaceLogoControls() {
      const dropzone = document.getElementById('workspace-logo-dropzone');
      const fileInput = document.getElementById('workspace-logo-input');
      const clearButton = document.getElementById('workspace-logo-clear-btn');
      const preview = document.getElementById('workspace-logo-preview');

      if (!dropzone || !fileInput) return;

      const defaultText = t('settings.logoUploadDefault');

      dropzone.dataset.defaultText = defaultText;

      function setDropzoneText(text) {
          dropzone.innerHTML = '';
          const textEl = document.createElement('span');
          textEl.className = 'workspace-logo-dropzone-text';
          textEl.textContent = text;
          dropzone.appendChild(textEl);
      }

      function applyDropzoneBaseStyles(el) {
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.gap = '10px';
          el.style.padding = '12px 16px';
          el.style.textAlign = 'center';
          el.style.cursor = 'pointer';
          el.style.userSelect = 'none';
          el.style.minHeight = '48px';
          el.style.border = '2px dashed var(--border)';
          el.style.borderRadius = '10px';
          el.style.background = 'var(--bg-tertiary)';
          el.style.boxShadow = 'none';
          el.style.color = 'var(--text-muted)';
          el.style.fontWeight = '500';
          el.style.transition = 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease';
      }

      function setDropzoneDragoverStyles(el, isActive) {
          if (isActive) {
              el.style.borderColor = 'var(--accent-blue)';
              el.style.background = 'rgba(59, 130, 246, 0.08)';
              el.style.boxShadow = '0 0 0 1px var(--accent-blue)';
          } else {
              el.style.border = '2px dashed var(--border)';
              el.style.background = 'var(--bg-tertiary)';
              el.style.boxShadow = 'none';
          }
      }

      function refreshWorkspaceLogoUI() {
          if (!preview || !clearButton) return;

          const row = preview.closest('.workspace-logo-input-row') || dropzone?.closest?.('.workspace-logo-input-row') || null;
          const effectiveLogo = workspaceLogoDraft.hasPendingChange
              ? workspaceLogoDraft.dataUrl
              : settings.customWorkspaceLogo;
          const hasLogo = !!effectiveLogo;

          if (effectiveLogo) {
              preview.style.display = 'block';
              preview.style.backgroundImage = `url(${effectiveLogo})`;
              clearButton.style.display = 'inline-flex';
          } else {
              preview.style.display = 'none';
              preview.style.backgroundImage = '';
              clearButton.style.display = 'none';
          }

          if (dropzone) {
              const uploadAria = t('settings.logoUploadAriaUpload');
              const changeAria = t('settings.logoUploadAriaChange');
              dropzone.setAttribute('aria-label', hasLogo ? changeAria : uploadAria);
              const defaultText = dropzone.dataset.defaultText || t('settings.logoUploadDefault');
              const changeText = dropzone.dataset.changeText || t('settings.logoUploadChange');
              if (dropzone.getAttribute('aria-busy') !== 'true' && !dropzone.classList.contains('workspace-logo-uploading')) {
                  setDropzoneText(hasLogo ? changeText : defaultText);
              }

              dropzone.style.minHeight = hasLogo ? '40px' : '48px';
              dropzone.style.padding = hasLogo ? '10px 12px' : '12px 16px';
          }

          if (row) {
              row.classList.toggle('has-logo', hasLogo);
          }
      }

      async function handleWorkspaceLogoFile(file, event) {
          if (!file) return;
          if (event) {
              event.preventDefault();
              event.stopPropagation();
          }

          if (!file.type.startsWith('image/')) {
              showErrorNotification(t('error.logoSelectFile'));
              return;
          }

          const maxSizeBytes = 2048 * 1024; // 2MB limit for workspace logo
          if (file.size > maxSizeBytes) {
              showErrorNotification(t('error.logoTooLarge'));
              return;
          }

          const defaultText = dropzone.dataset.defaultText || t('settings.logoUploadDefault');

          try {
              // Show uploading state
              dropzone.innerHTML = '';
              const textEl = document.createElement('span');
              textEl.className = 'workspace-logo-dropzone-text';
              textEl.textContent = `Uploading ${file.name}...`;
              dropzone.appendChild(textEl);
              dropzone.classList.add('workspace-logo-uploading');
              dropzone.setAttribute('aria-busy', 'true');

              const reader = new FileReader();
              reader.onload = function (event) {
                  const dataUrl = event.target && event.target.result;
                  if (!dataUrl) {
                      showErrorNotification(t('error.imageReadFailed'));
                      setDropzoneText(defaultText);
                      dropzone.classList.remove('workspace-logo-uploading');
                      dropzone.removeAttribute('aria-busy');
                      return;
                  }

                  const img = new Image();
                  img.onload = function () {
                      // Always open crop modal for user to adjust
                      openCropModal(dataUrl, img);
                      setDropzoneText(defaultText);
                      dropzone.classList.remove('workspace-logo-uploading');
                      dropzone.removeAttribute('aria-busy');
                  };
                  img.onerror = function () {
                      showErrorNotification(t('error.imageLoadFailed'));
                      setDropzoneText(defaultText);
                      dropzone.classList.remove('workspace-logo-uploading');
                      dropzone.removeAttribute('aria-busy');
                  };
                  img.src = dataUrl;
              };
              reader.onerror = function () {
                  showErrorNotification(t('error.imageReadFailed'));
                  setDropzoneText(defaultText);
                  dropzone.classList.remove('workspace-logo-uploading');
                  dropzone.removeAttribute('aria-busy');
              };

              reader.readAsDataURL(file);
          } catch (error) {
              showErrorNotification(t('error.logoUploadFailed', { message: error.message }));
              setDropzoneText(defaultText);
              dropzone.classList.remove('workspace-logo-uploading');
              dropzone.removeAttribute('aria-busy');
          }
      }

      // Initialize dropzone styles and text
      applyDropzoneBaseStyles(dropzone);
      setDropzoneText(defaultText);

      // Initialize preview UI
      refreshWorkspaceLogoUI();

      let dragDepth = 0;

      // Drag & Drop event handlers
      dropzone.addEventListener('dragenter', function(e) {
          e.preventDefault();
          dragDepth += 1;
          dropzone.classList.add('workspace-logo-dragover');
          setDropzoneDragoverStyles(dropzone, true);
      });

      dropzone.addEventListener('dragover', function(e) {
          e.preventDefault();
          dropzone.classList.add('workspace-logo-dragover');
          setDropzoneDragoverStyles(dropzone, true);
      });

      dropzone.addEventListener('dragleave', function(e) {
          e.preventDefault();
          dragDepth = Math.max(0, dragDepth - 1);
          if (dragDepth === 0) {
              dropzone.classList.remove('workspace-logo-dragover');
              setDropzoneDragoverStyles(dropzone, false);
          }
      });

      dropzone.addEventListener('drop', function(e) {
          dragDepth = 0;
          dropzone.classList.remove('workspace-logo-dragover');
          setDropzoneDragoverStyles(dropzone, false);
          const files = e.dataTransfer && e.dataTransfer.files;
          if (files && files.length > 0) {
              handleWorkspaceLogoFile(files[0], e);
          }
      });

      dropzone.addEventListener('dragend', function() {
          dragDepth = 0;
          dropzone.classList.remove('workspace-logo-dragover');
          setDropzoneDragoverStyles(dropzone, false);
      });

      // Paste support
      dropzone.addEventListener('paste', function(e) {
          if (!e.clipboardData) return;
          const files = e.clipboardData.files;
          if (files && files.length > 0) {
              handleWorkspaceLogoFile(files[0], e);
          }
      });

      // Click to upload
      dropzone.addEventListener('click', function() {
          fileInput.click();
      });

      // Keyboard accessibility
      dropzone.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInput.click();
          }
      });

      // File input change handler
      fileInput.addEventListener('change', function(e) {
          const files = e.target.files;
          if (files && files.length > 0) {
              handleWorkspaceLogoFile(files[0], e);
          }
          fileInput.value = '';
      });

      // Clear button handler
      if (clearButton) {
          clearButton.addEventListener('click', function (e) {
              e.preventDefault();
              workspaceLogoDraft.hasPendingChange = true;
              workspaceLogoDraft.dataUrl = null;
              if (fileInput) {
                  fileInput.value = '';
              }
              refreshWorkspaceLogoUI();
              if (window.markSettingsDirtyIfNeeded) {
                  window.markSettingsDirtyIfNeeded();
              }
          });
      }

      // Listen for refresh events from external code (like openSettingsModal)
      document.addEventListener('refresh-workspace-logo-ui', () => {
          refreshWorkspaceLogoUI();
      });

      // ============================================
      // Workspace Logo Crop Modal Functions
      // ============================================

  function openCropModal(dataUrl, image, options = null) {
      const modal = document.getElementById('workspace-logo-crop-modal');
      const canvas = document.getElementById('crop-canvas');
      const ctx = canvas.getContext('2d');
      const titleEl = document.getElementById('crop-modal-title');
      const instructionsEl = modal?.querySelector('.crop-instructions');

      // Store state
      cropState.originalImage = image;
      cropState.originalDataUrl = dataUrl;
      cropState.canvas = canvas;
      cropState.ctx = ctx;
      cropState.onApply = options?.onApply || null;
      cropState.successMessage = options?.successMessage || null;
      cropState.shape = options?.shape || 'square';
      cropState.outputMimeType = options?.outputMimeType || 'image/jpeg';
      cropState.outputMaxSize = typeof options?.outputMaxSize === 'number' ? options.outputMaxSize : null;

      if (titleEl) titleEl.textContent = options?.title || 'Crop Image to Square';
      if (instructionsEl && options?.instructions) instructionsEl.textContent = options.instructions;

      // Add accessibility
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'crop-modal-title');

      // Show modal first so layout is measurable
      modal.classList.add('active');

      // Next frame: draw and position selection after layout settles
      requestAnimationFrame(() => {
          // Calculate canvas size (fit to container, maintain aspect ratio)
          const containerMaxWidth = 600;
          const containerMaxHeight = window.innerHeight * 0.6;

          let displayWidth = image.width;
          let displayHeight = image.height;

          if (displayWidth > containerMaxWidth || displayHeight > containerMaxHeight) {
              const scale = Math.min(
                  containerMaxWidth / displayWidth,
                  containerMaxHeight / displayHeight
              );
              displayWidth = Math.floor(displayWidth * scale);
              displayHeight = Math.floor(displayHeight * scale);
          }

          canvas.width = displayWidth;
          canvas.height = displayHeight;

          // Draw image on canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, displayWidth, displayHeight);

          // Initialize selection (centered square, 80% of smallest dimension)
          const minDimension = Math.min(displayWidth, displayHeight);
          const initialSize = Math.floor(minDimension * 0.8);

          cropState.selection = {
              x: Math.floor((displayWidth - initialSize) / 2),
              y: Math.floor((displayHeight - initialSize) / 2),
              size: initialSize
          };

          // Setup event listeners
          setupCropEventListeners();

          // Double RAF to ensure canvas layout is complete before positioning overlay
          requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                  updateCropSelection();
              });
          });
      });
  }

  function closeCropModal() {
      const modal = document.getElementById('workspace-logo-crop-modal');
      modal.classList.remove('active');

      // Cleanup event listeners
      removeCropEventListeners();

      // Reset state
      cropState = {
          originalImage: null,
          originalDataUrl: null,
          canvas: null,
          ctx: null,
          selection: { x: 0, y: 0, size: 0 },
          isDragging: false,
          isResizing: false,
          dragStartX: 0,
          dragStartY: 0,
          activeHandle: null,
          shape: 'square',
          outputMimeType: 'image/jpeg',
          outputMaxSize: null,
          onApply: null,
          successMessage: null
      };
  }

  function updateCropSelection() {
      const selection = document.getElementById('crop-selection');
      const canvas = cropState.canvas;
      if (!canvas || !selection) return;

      selection.dataset.shape = cropState.shape || 'square';

      const canvasRect = canvas.getBoundingClientRect();
      const container = canvas.closest('.crop-canvas-container') || canvas.parentElement;
      const containerRect = container ? container.getBoundingClientRect() : canvasRect;
      const offsetX = canvasRect.left - containerRect.left;
      const offsetY = canvasRect.top - containerRect.top;

      // Use a uniform scale factor so the overlay matches what the user sees.
      // (CSS keeps aspect ratio, but rounding can make X/Y slightly differ.)
      const uniformScale = canvas.width / canvasRect.width;

      // Position selection div (in screen pixels)
      const displayX = cropState.selection.x / uniformScale;
      const displayY = cropState.selection.y / uniformScale;
      const displaySize = cropState.selection.size / uniformScale;

      selection.style.left = `${offsetX + displayX}px`;
      selection.style.top = `${offsetY + displayY}px`;
      selection.style.width = `${displaySize}px`;
      selection.style.height = `${displaySize}px`;

      // Update info display
      updateCropInfo();
  }

  function updateCropInfo() {
      const dimensionsEl = document.getElementById('crop-dimensions');
      const sizeEl = document.getElementById('crop-size-estimate');
      if (!dimensionsEl || !sizeEl) return;

      // Calculate actual pixel dimensions (in original image)
      const canvas = cropState.canvas;
      const image = cropState.originalImage;
      if (!canvas || !image) return;

      const selectionEl = document.getElementById('crop-selection');
      const canvasRect = canvas.getBoundingClientRect();
      const selectionRect = selectionEl?.getBoundingClientRect?.();

      // Derive the output size from what the user actually sees (DOM rects),
      // so the preview and saved crop match even if CSS rounding makes scales differ.
      let actualSize = 0;
      if (selectionRect && canvasRect.width > 0 && canvasRect.height > 0) {
          const scaleX = image.width / canvasRect.width;
          const scaleY = image.height / canvasRect.height;
          const cropSizeX = selectionRect.width * scaleX;
          const cropSizeY = selectionRect.height * scaleY;
          actualSize = Math.max(1, Math.floor(Math.min(cropSizeX, cropSizeY)));
      } else {
          const scale = image.width / canvas.width;
          actualSize = Math.max(1, Math.floor(cropState.selection.size * scale));
      }

      dimensionsEl.textContent = `${actualSize} × ${actualSize} px`;

      // Estimate file size (rough approximation: 3 bytes per pixel for JPEG)
      const estimatedBytes = actualSize * actualSize * 3;
      const estimatedKB = Math.floor(estimatedBytes / 1024);

      sizeEl.textContent = `~${estimatedKB} KB`;

      // Warning colors
      const maxSizeKB = 2048; // 2MB limit
      sizeEl.classList.remove('size-warning', 'size-error');

      if (estimatedKB > maxSizeKB) {
          sizeEl.classList.add('size-error');
      } else if (estimatedKB > maxSizeKB * 0.8) {
          sizeEl.classList.add('size-warning');
      }
  }

  async function applyCrop() {
      try {
          const canvas = cropState.canvas;
          const image = cropState.originalImage;
          const selection = cropState.selection;

          if (!canvas || !image) {
              showErrorNotification(t('error.cropInvalid'));
              return;
          }

          // Derive crop from the rendered selection rect (not just stored state),
          // ensuring the saved output matches the on-screen selection exactly.
          const canvasRect = canvas.getBoundingClientRect();
          const selectionEl = document.getElementById('crop-selection');
          const selectionRect = selectionEl?.getBoundingClientRect?.();

          let cropX = 0;
          let cropY = 0;
          let cropSize = 0;

          if (selectionRect && canvasRect.width > 0 && canvasRect.height > 0) {
              const centerXRatio =
                  (selectionRect.left + selectionRect.width / 2 - canvasRect.left) / canvasRect.width;
              const centerYRatio =
                  (selectionRect.top + selectionRect.height / 2 - canvasRect.top) / canvasRect.height;

              const centerXOrig = centerXRatio * image.width;
              const centerYOrig = centerYRatio * image.height;

              const cropSizeX = selectionRect.width / canvasRect.width * image.width;
              const cropSizeY = selectionRect.height / canvasRect.height * image.height;
              cropSize = Math.max(1, Math.floor(Math.min(cropSizeX, cropSizeY)));

              cropX = Math.floor(centerXOrig - cropSize / 2);
              cropY = Math.floor(centerYOrig - cropSize / 2);
          } else {
              // Fallback: use stored state mapping
              const scaleX = image.width / canvas.width;
              const scaleY = image.height / canvas.height;
              cropSize = Math.max(1, Math.floor(selection.size * Math.min(scaleX, scaleY)));
              cropX = Math.floor(selection.x * scaleX);
              cropY = Math.floor(selection.y * scaleY);
          }

          cropX = Math.max(0, Math.min(cropX, image.width - cropSize));
          cropY = Math.max(0, Math.min(cropY, image.height - cropSize));

          const maxSizeBytes = 2048 * 1024; // 2MB limit
          const maxAttempts = 6;

          const renderOutputDataUrl = (targetSize, quality) => {
              const outCanvas = document.createElement('canvas');
              outCanvas.width = targetSize;
              outCanvas.height = targetSize;
              const outCtx = outCanvas.getContext('2d');

              if (!outCtx) {
                  throw new Error('Canvas context unavailable');
              }

              const shape = cropState.shape || 'square';
              if (shape === 'circle') {
                  outCtx.clearRect(0, 0, targetSize, targetSize);
                  outCtx.save();
                  outCtx.beginPath();
                  outCtx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
                  outCtx.closePath();
                  outCtx.clip();
              }

              outCtx.drawImage(
                  image,
                  cropX, cropY, cropSize, cropSize,  // Source rectangle
                  0, 0, targetSize, targetSize        // Destination rectangle
              );

              if (shape === 'circle') {
                  outCtx.restore();
              }

              const mimeType = cropState.outputMimeType || (shape === 'circle' ? 'image/png' : 'image/jpeg');
              if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
                  return outCanvas.toDataURL(mimeType, quality);
              }
              return outCanvas.toDataURL(mimeType);
          };

          let targetSize = cropState.outputMaxSize ? Math.min(cropSize, cropState.outputMaxSize) : cropSize;
          targetSize = Math.max(50, Math.floor(targetSize));

          let attempts = 0;
          let quality = 0.92;
          let croppedDataUrl = renderOutputDataUrl(targetSize, quality);

          while (croppedDataUrl.length > maxSizeBytes * 1.37 && attempts < maxAttempts) {
              const shape = cropState.shape || 'square';
              const mimeType = cropState.outputMimeType || (shape === 'circle' ? 'image/png' : 'image/jpeg');

              if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
                  quality = Math.max(0.5, quality - 0.1);
              } else {
                  targetSize = Math.floor(targetSize * 0.85);
              }

              croppedDataUrl = renderOutputDataUrl(targetSize, quality);
              attempts++;
          }

          if (croppedDataUrl.length > maxSizeBytes * 1.37) {
              showErrorNotification(t('error.cropTooLarge'));
              return;
          }

          if (typeof cropState.onApply === 'function') {
              cropState.onApply(croppedDataUrl);
              if (window.markSettingsDirtyIfNeeded) {
                  window.markSettingsDirtyIfNeeded();
              }
              closeCropModal();
              showSuccessNotification(cropState.successMessage || t('success.cropApplied'));
          } else {
              // Back-compat: Update workspace logo draft
              workspaceLogoDraft.hasPendingChange = true;
              workspaceLogoDraft.dataUrl = croppedDataUrl;

              // Refresh UI
              refreshWorkspaceLogoUI();
              if (window.markSettingsDirtyIfNeeded) {
                  window.markSettingsDirtyIfNeeded();
              }

              // Close modal
              closeCropModal();

              // Success notification
              showSuccessNotification(t('success.logoCroppedApplied'));
          }

      } catch (error) {
          showErrorNotification(t('error.cropFailed', { message: error.message }));
          console.error('Crop error:', error);
      }
  }

  function setupUserAvatarControls() {
      const dropzone = document.getElementById('user-avatar-dropzone');
      const fileInput = document.getElementById('user-avatar-input');
      const clearButton = document.getElementById('user-avatar-clear-btn');

      if (!dropzone || !fileInput) return;

      const defaultText = t('settings.avatarUploadDefault');

      dropzone.dataset.defaultText = defaultText;
      dropzone.dataset.changeText = t('settings.avatarUploadChange');

      function setDropzoneText(text) {
          dropzone.innerHTML = '';
          const textEl = document.createElement('span');
          textEl.className = 'workspace-logo-dropzone-text';
          textEl.textContent = text;
          dropzone.appendChild(textEl);
      }

      function applyDropzoneBaseStyles(el) {
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.gap = '10px';
          el.style.padding = '12px 16px';
          el.style.textAlign = 'center';
          el.style.cursor = 'pointer';
          el.style.userSelect = 'none';
          el.style.minHeight = '48px';
          el.style.border = '2px dashed var(--border)';
          el.style.borderRadius = '10px';
          el.style.background = 'var(--bg-tertiary)';
          el.style.boxShadow = 'none';
          el.style.color = 'var(--text-muted)';
          el.style.fontWeight = '500';
          el.style.transition = 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease';
      }

      function setDropzoneDragoverStyles(el, isActive) {
          if (isActive) {
              el.style.borderColor = 'var(--accent-blue)';
              el.style.background = 'rgba(59, 130, 246, 0.08)';
              el.style.boxShadow = '0 0 0 1px var(--accent-blue)';
          } else {
              el.style.border = '2px dashed var(--border)';
              el.style.background = 'var(--bg-tertiary)';
              el.style.boxShadow = 'none';
          }
      }

      async function handleAvatarFile(file, event) {
          if (!file) return;
          if (event) {
              event.preventDefault();
              event.stopPropagation();
          }

          if (!file.type.startsWith('image/')) {
              showErrorNotification(t('error.avatarSelectFile'));
              return;
          }

          const maxSizeBytes = 2048 * 1024; // 2MB limit for avatar
          if (file.size > maxSizeBytes) {
              showErrorNotification(t('error.avatarTooLarge'));
              return;
          }

          const defaultText = dropzone.dataset.defaultText || t('settings.avatarUploadDefault');

          try {
              dropzone.innerHTML = '';
              const textEl = document.createElement('span');
              textEl.className = 'workspace-logo-dropzone-text';
              textEl.textContent = `Uploading ${file.name}...`;
              dropzone.appendChild(textEl);
              dropzone.setAttribute('aria-busy', 'true');

              const reader = new FileReader();
              const dataUrl = await new Promise((resolve, reject) => {
                  reader.onload = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
              });

              const img = new Image();
              img.onload = () => {
                  openCropModal(dataUrl, img, {
                      title: 'Crop Avatar',
                      instructions: 'Drag to adjust the crop area. Your avatar will be displayed as a circle.',
                      shape: 'circle',
                      outputMimeType: 'image/png',
                      outputMaxSize: 512,
                      successMessage: 'Avatar cropped and applied successfully!',
                      onApply: (croppedDataUrl) => {
                          avatarDraft.hasPendingChange = true;
                          avatarDraft.dataUrl = croppedDataUrl;
                          refreshUserAvatarSettingsUI();
                      }
                  });
              };
              img.onerror = () => {
                  showErrorNotification(t('error.imageLoadFailed'));
              };
              img.src = dataUrl;
          } catch (err) {
              console.error('Avatar upload error:', err);
              showErrorNotification(t('error.avatarUploadFailed'));
          } finally {
              dropzone.setAttribute('aria-busy', 'false');
              setDropzoneText(defaultText);
          }
      }

      applyDropzoneBaseStyles(dropzone);
      setDropzoneText(defaultText);

      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInput.click();
          }
      });

      fileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          handleAvatarFile(file, e);
          fileInput.value = '';
      });

      dropzone.addEventListener('dragenter', (e) => {
          e.preventDefault();
          setDropzoneDragoverStyles(dropzone, true);
      });
      dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          setDropzoneDragoverStyles(dropzone, true);
      });
      dropzone.addEventListener('dragleave', (e) => {
          e.preventDefault();
          setDropzoneDragoverStyles(dropzone, false);
      });
      dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          setDropzoneDragoverStyles(dropzone, false);
          const file = e.dataTransfer?.files?.[0];
          handleAvatarFile(file, e);
      });

      if (clearButton && !clearButton.__avatarClearBound) {
          clearButton.__avatarClearBound = true;
          clearButton.addEventListener('click', () => {
              avatarDraft.hasPendingChange = true;
              avatarDraft.dataUrl = null;
              refreshUserAvatarSettingsUI();
              if (window.markSettingsDirtyIfNeeded) {
                  window.markSettingsDirtyIfNeeded();
              }
          });
      }

      refreshUserAvatarSettingsUI();
  }

  function setupCropEventListeners() {
      const selection = document.getElementById('crop-selection');
      const handles = document.querySelectorAll('.crop-handle');

      // Mouse down on selection (start drag)
      if (selection) {
          selection.addEventListener('mousedown', onSelectionMouseDown);
          selection.addEventListener('touchstart', onSelectionTouchStart);
      }

      // Mouse down on handles (start resize)
      handles.forEach(handle => {
          handle.addEventListener('mousedown', onHandleMouseDown);
          handle.addEventListener('touchstart', onHandleTouchStart);
      });

      // Global mouse move and up
      document.addEventListener('mousemove', onDocumentMouseMove);
      document.addEventListener('mouseup', onDocumentMouseUp);
      document.addEventListener('touchmove', onDocumentTouchMove);
      document.addEventListener('touchend', onDocumentTouchEnd);
      document.addEventListener('keydown', onCropModalKeyDown);
  }

  function removeCropEventListeners() {
      const selection = document.getElementById('crop-selection');
      const handles = document.querySelectorAll('.crop-handle');

      if (selection) {
          selection.removeEventListener('mousedown', onSelectionMouseDown);
          selection.removeEventListener('touchstart', onSelectionTouchStart);
      }

      handles.forEach(handle => {
          handle.removeEventListener('mousedown', onHandleMouseDown);
          handle.removeEventListener('touchstart', onHandleTouchStart);
      });

      document.removeEventListener('mousemove', onDocumentMouseMove);
      document.removeEventListener('mouseup', onDocumentMouseUp);
      document.removeEventListener('touchmove', onDocumentTouchMove);
      document.removeEventListener('touchend', onDocumentTouchEnd);
      document.removeEventListener('keydown', onCropModalKeyDown);
  }

  function onSelectionMouseDown(e) {
      if (e.target.classList.contains('crop-handle')) return;

      e.preventDefault();
      e.stopPropagation();

      cropState.isDragging = true;
      cropState.dragStartX = e.clientX;
      cropState.dragStartY = e.clientY;
  }

  function onHandleMouseDown(e) {
      e.preventDefault();
      e.stopPropagation();

      cropState.isResizing = true;
      cropState.dragStartX = e.clientX;
      cropState.dragStartY = e.clientY;

      // Determine which handle
      if (e.target.classList.contains('crop-handle-nw')) {
          cropState.activeHandle = 'nw';
      } else if (e.target.classList.contains('crop-handle-ne')) {
          cropState.activeHandle = 'ne';
      } else if (e.target.classList.contains('crop-handle-sw')) {
          cropState.activeHandle = 'sw';
      } else if (e.target.classList.contains('crop-handle-se')) {
          cropState.activeHandle = 'se';
      }
  }

  function onDocumentMouseMove(e) {
      if (!cropState.isDragging && !cropState.isResizing) return;

      e.preventDefault();

      const canvas = cropState.canvas;
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const uniformScale = canvas.width / canvasRect.width;

      const deltaX = (e.clientX - cropState.dragStartX) * uniformScale;
      const deltaY = (e.clientY - cropState.dragStartY) * uniformScale;

      if (cropState.isDragging) {
          // Move selection
          let newX = cropState.selection.x + deltaX;
          let newY = cropState.selection.y + deltaY;

          // Constrain to canvas bounds
          newX = Math.max(0, Math.min(newX, canvas.width - cropState.selection.size));
          newY = Math.max(0, Math.min(newY, canvas.height - cropState.selection.size));

          cropState.selection.x = newX;
          cropState.selection.y = newY;

      } else if (cropState.isResizing) {
          // Resize selection (maintain square, intuitive handle directions)
          const dominant = (a, b) => (Math.abs(a) > Math.abs(b) ? a : b);
          const minSize = 50;

          const current = cropState.selection;
          let fixedX = 0;
          let fixedY = 0;
          let resizeDelta = 0;
          let maxSize = 0;

          switch (cropState.activeHandle) {
              case 'se':
                  resizeDelta = dominant(deltaX, deltaY);
                  fixedX = current.x;
                  fixedY = current.y;
                  maxSize = Math.min(canvas.width - fixedX, canvas.height - fixedY);
                  break;
              case 'nw':
                  resizeDelta = dominant(-deltaX, -deltaY);
                  fixedX = current.x + current.size;
                  fixedY = current.y + current.size;
                  maxSize = Math.min(fixedX, fixedY);
                  break;
              case 'ne':
                  resizeDelta = dominant(deltaX, -deltaY);
                  fixedX = current.x;
                  fixedY = current.y + current.size;
                  maxSize = Math.min(canvas.width - fixedX, fixedY);
                  break;
              case 'sw':
                  resizeDelta = dominant(-deltaX, deltaY);
                  fixedX = current.x + current.size;
                  fixedY = current.y;
                  maxSize = Math.min(fixedX, canvas.height - fixedY);
                  break;
          }

          let newSize = current.size + resizeDelta;
          newSize = Math.max(minSize, Math.min(newSize, maxSize));

          let newX = current.x;
          let newY = current.y;

          switch (cropState.activeHandle) {
              case 'se':
                  newX = fixedX;
                  newY = fixedY;
                  break;
              case 'nw':
                  newX = fixedX - newSize;
                  newY = fixedY - newSize;
                  break;
              case 'ne':
                  newX = fixedX;
                  newY = fixedY - newSize;
                  break;
              case 'sw':
                  newX = fixedX - newSize;
                  newY = fixedY;
                  break;
          }

          cropState.selection.size = newSize;
          cropState.selection.x = newX;
          cropState.selection.y = newY;
      }

      updateCropSelection();

      cropState.dragStartX = e.clientX;
      cropState.dragStartY = e.clientY;
  }

  function onDocumentMouseUp(e) {
      if (cropState.isDragging || cropState.isResizing) {
          e.preventDefault();
          cropState.isDragging = false;
          cropState.isResizing = false;
          cropState.activeHandle = null;
      }
  }

  function onSelectionTouchStart(e) {
      if (e.target.classList.contains('crop-handle')) return;

      e.preventDefault();

      const touch = e.touches[0];
      cropState.isDragging = true;
      cropState.dragStartX = touch.clientX;
      cropState.dragStartY = touch.clientY;
  }

  function onHandleTouchStart(e) {
      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      cropState.isResizing = true;
      cropState.dragStartX = touch.clientX;
      cropState.dragStartY = touch.clientY;

      // Determine handle (same as mouse)
      if (e.target.classList.contains('crop-handle-nw')) {
          cropState.activeHandle = 'nw';
      } else if (e.target.classList.contains('crop-handle-ne')) {
          cropState.activeHandle = 'ne';
      } else if (e.target.classList.contains('crop-handle-sw')) {
          cropState.activeHandle = 'sw';
      } else if (e.target.classList.contains('crop-handle-se')) {
          cropState.activeHandle = 'se';
      }
  }

  function onDocumentTouchMove(e) {
      if (!cropState.isDragging && !cropState.isResizing) return;

      e.preventDefault();

      const touch = e.touches[0];

      // Reuse mouse move logic with touch coordinates
      const fakeEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => {}
      };

      onDocumentMouseMove(fakeEvent);
  }

  function onDocumentTouchEnd(e) {
      if (cropState.isDragging || cropState.isResizing) {
          e.preventDefault();
          cropState.isDragging = false;
          cropState.isResizing = false;
          cropState.activeHandle = null;
      }
  }

  function onCropModalKeyDown(e) {
      if (e.key === 'Escape') {
          closeCropModal();
      }
  }

      // Expose crop functions globally for onclick handlers in HTML
      window.openCropModal = openCropModal;
      window.closeCropModal = closeCropModal;
      window.applyCrop = applyCrop;

      // Initialize avatar controls (shares crop modal)
      setupUserAvatarControls();
  }

  setupWorkspaceLogoControls();

// Expose functions for auth.js to call
window.initializeApp = init;
window.setupUserMenus = setupUserMenus;

// Auth.js will call init() when ready, no need for DOMContentLoaded listener

// Prevent data loss when user closes tab/browser with pending saves
window.addEventListener('beforeunload', (e) => {
    // Flush any pending localStorage writes for feedback queue
    if (feedbackLocalStorageTimer) {
        clearTimeout(feedbackLocalStorageTimer);
        persistFeedbackDeltaQueue(); // Immediate write on page close
    }

    if (pendingSaves > 0) {
        // Show browser warning dialog
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// --- Save-on-blur behavior for title and description (tasks/projects) ---
// Attach handlers after the DOM is ready. We only persist to storage when
// the user blurs the field (or closes the modal) to avoid per-keystroke saves.
document.addEventListener('DOMContentLoaded', function () {
    const taskModal = document.getElementById('task-modal');
    if (!taskModal) return;

    // Title input inside the task modal
    const titleInput = taskModal.querySelector('#task-form input[name="title"]');
    if (titleInput) {
        titleInput.addEventListener('blur', function (e) {
            const form = taskModal.querySelector('#task-form');
            if (form && form.dataset.editingTaskId) {
                updateTaskField('title', e.target.value);
            }
        });
    }

    // Description editor: keep hidden field in sync on input but only persist on blur
    const descEditor = taskModal.querySelector('#task-description-editor');
    const descHidden = taskModal.querySelector('#task-description-hidden');
    if (descEditor && descHidden) {
        let originalDescriptionHTML = '';

        descEditor.addEventListener('focus', function () {
            // Store original value when user starts editing
            originalDescriptionHTML = descEditor.innerHTML;
        });

        descEditor.addEventListener('input', function () {
            descHidden.value = descEditor.innerHTML;
        });

        descEditor.addEventListener('blur', function () {
            const form = taskModal.querySelector('#task-form');
            if (form && form.dataset.editingTaskId) {
                // Only persist if description actually changed
                if (descEditor.innerHTML !== originalDescriptionHTML) {
                    updateTaskField('description', descEditor.innerHTML);
                }
            }
        });
    }

    // Modal close now relies on blur events for persistence
    // Title and description are already persisted via their respective event handlers
});

// Track first outside click after opening native color picker
let ignoreNextOutsideColorClick = false;

// Close color pickers when clicking outside
document.addEventListener("click", function(e) {
    if (!e.target.closest('.color-picker-container')) {
        if (ignoreNextOutsideColorClick) {
            ignoreNextOutsideColorClick = false;
            return;
        }
        document.querySelectorAll('.color-picker-dropdown').forEach(picker => {
            picker.style.display = 'none';
        });
    }
});

async function submitTaskForm() {
const form = document.getElementById("task-form");
    const editingTaskId = form.dataset.editingTaskId;
const title = form.querySelector('input[name="title"]').value;
    let description = document.getElementById("task-description-hidden").value;
    description = autoLinkifyDescription(description);
    // Read projectId from hidden input (custom dropdown), fallback to a select if present
    const projectIdRaw = (form.querySelector('input[name="projectId"]').value ||
                         (form.querySelector('select[name="projectId"]') ? form.querySelector('select[name="projectId"]').value : ""));

    const status = document.getElementById("hidden-status").value || "backlog";
    const priority = form.querySelector('#hidden-priority').value || "medium";

    const startRaw = (form.querySelector('input[name="startDate"]')?.value || '').trim();
    const startISO = startRaw === '' ? '' : startRaw;

    const endRaw = (form.querySelector('input[name="endDate"]')?.value || '').trim();
    const endISO = endRaw === '' ? '' : endRaw;

    // Date range validation removed - flatpickr constraints prevent invalid selections

    if (editingTaskId) {
        // Capture old task state for history tracking
        const oldTask = tasks.find(t => t.id === parseInt(editingTaskId, 10));
        const oldTaskCopy = oldTask ? JSON.parse(JSON.stringify(oldTask)) : null;

const result = updateTaskService(parseInt(editingTaskId, 10), {title, description, projectId: projectIdRaw, startDate: startISO, endDate: endISO, priority, status}, tasks);
        if (result.task) {
            // Record history for task update
            if (window.historyService && oldTaskCopy) {
                window.historyService.recordTaskUpdated(oldTaskCopy, result.task);
            }

const oldProjectId = result.oldProjectId;
            tasks = result.tasks;
            const t = result.task;

            // If the task moved between projects, mark projects as updated and record project history
            if (oldProjectId !== t.projectId) {
                if (oldProjectId) {
                    touchProjectUpdatedAt(oldProjectId);
                    recordProjectTaskLinkChange(oldProjectId, 'removed', t);
                }
                if (t.projectId) {
                    touchProjectUpdatedAt(t.projectId);
                    recordProjectTaskLinkChange(t.projectId, 'added', t);
                }
                saveProjects().catch(() => {});
            }

// Close modal and update UI immediately (optimistic update)
            closeModal("task-modal");

// Refresh the appropriate view immediately
            if (document.getElementById("project-details").classList.contains("active")) {
const displayedProjectId = oldProjectId || t.projectId;
                if (displayedProjectId) {
                    showProjectDetails(displayedProjectId);
                }
            } else if (document.getElementById("projects").classList.contains("active")) {
                // Clear sorted view cache to force refresh with updated task
                projectsSortedView = null;
                // Refresh projects list view while preserving expanded state
                renderProjects();
                updateCounts();
            }

            // Save in background (don't block UI)
            saveTasks().catch(err => {
                console.error('Failed to save task:', err);
                showErrorNotification(t('error.saveChangesFailed'));
            });
        } else {
}
    } else {
const result = createTaskService({title, description, projectId: projectIdRaw, startDate: startISO, endDate: endISO, priority, status, tags: window.tempTags ? [...window.tempTags] : []}, tasks, taskCounter, tempAttachments);
        tasks = result.tasks;
        taskCounter = result.taskCounter;
        const newTask = result.task;
        tempAttachments = [];
        window.tempTags = [];

        // Record history for task creation
        if (window.historyService) {
            window.historyService.recordTaskCreated(newTask);
        }

        // Mark project as updated and record project history when task is added to a project
        if (newTask && newTask.projectId) {
            touchProjectUpdatedAt(newTask.projectId);
            recordProjectTaskLinkChange(newTask.projectId, 'added', newTask);
            saveProjects().catch(() => {});
        }

        // Keep filter dropdowns in sync with new task data
        populateProjectOptions();
        populateTagOptions();
        updateNoDateOptionVisibility();

        // Close modal and update UI immediately (optimistic update)
        closeModal("task-modal");

        // Refresh the appropriate view immediately
        if (newTask.projectId && document.getElementById("project-details").classList.contains("active")) {
            showProjectDetails(newTask.projectId);
            updateCounts();
        } else if (document.getElementById("projects").classList.contains("active")) {
            // Clear sorted view cache to force refresh with new task
            projectsSortedView = null;
            renderProjects();
            updateCounts();
        }

        // Save in background (don't block UI)
        saveTasks().catch(err => {
            console.error('Failed to save task:', err);
            showErrorNotification(t('error.saveChangesFailed'));
        });
    }

    // Fallback for other views - close modal and update UI immediately
    closeModal("task-modal");
    render();

    // Always refresh calendar if it exists
    const calendarView = document.getElementById("calendar-view");
    if (calendarView) {
        renderCalendar();
    }
    renderActivityFeed();

    // Save in background (don't block UI)
    saveTasks().catch(err => {
        console.error('Failed to save task:', err);
        showErrorNotification(t('error.saveChangesFailed'));
    });
}


// Keep enter-to-submit working
document.getElementById("task-form").addEventListener("submit", function (e) {
    e.preventDefault();
    e.stopPropagation();
    submitTaskForm();
});

function setupStatusDropdown() {
    // Only set up once by checking if already initialized
    if (document.body.hasAttribute("data-status-dropdown-initialized")) {
        return;
    }
    document.body.setAttribute("data-status-dropdown-initialized", "true");
    document.addEventListener("click", handleStatusDropdown);
}

function handleStatusDropdown(e) {
    // Handle options button clicks FIRST
    if (e.target.closest("#task-options-btn")) {
        e.preventDefault();
        e.stopPropagation();
        const menu = document.getElementById("options-menu");
        if (menu) {
            menu.style.display =
                menu.style.display === "block" ? "none" : "block";
        }
        return;
    }

    // Close options menu when clicking outside
    const menu = document.getElementById("options-menu");
    if (
        menu &&
        !e.target.closest("#task-options-btn") &&
        !e.target.closest("#options-menu")
    ) {
        menu.style.display = "none";
    }

    // Handle status button clicks
    if (e.target.closest("#status-current")) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = e.target.closest(".status-dropdown");
        const isActive = dropdown.classList.contains("active");

        // Close all dropdowns first
        document
            .querySelectorAll(".status-dropdown.active")
            .forEach((d) => d.classList.remove("active"));

        // Toggle this one if it wasn't active
        if (!isActive) {
            dropdown.classList.add("active");
            // Update options to show only unselected
            const hiddenStatus = document.getElementById("hidden-status");
            if (hiddenStatus) {
                updateStatusOptions(hiddenStatus.value);
            }
        }
        return;
    }

    // Handle status option clicks
    if (e.target.closest(".status-option")) {
        e.preventDefault();
        e.stopPropagation();
        const option = e.target.closest(".status-option");
        const status = option.dataset.status;
        const statusBadge = option.querySelector(".status-badge");
        const statusText = statusBadge.textContent.trim();

        // Update display
        const currentBtn = document.getElementById("status-current");
        const hiddenStatus = document.getElementById("hidden-status");

        if (currentBtn && hiddenStatus) {
            const currentBadge = currentBtn.querySelector(".status-badge");
            if (currentBadge) {
                currentBadge.className = `status-badge ${status}`;
                currentBadge.textContent = statusText;
            }
            hiddenStatus.value = status;
            updateTaskField('status', status);

        }

        // Close dropdown
        const dropdown = option.closest(".status-dropdown");
        if (dropdown) dropdown.classList.remove("active");
        
        // Update options for next time (after dropdown closes)
        setTimeout(() => updateStatusOptions(status), 100);
        return;
    }

    // Close dropdown when clicking outside
    const activeDropdowns = document.querySelectorAll(
        ".status-dropdown.active"
    );
    activeDropdowns.forEach((dropdown) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });
}


function setupPriorityDropdown() {
    if (document.body.hasAttribute("data-priority-dropdown-initialized")) {
        return;
    }
    document.body.setAttribute("data-priority-dropdown-initialized", "true");
    document.addEventListener("click", handlePriorityDropdown);
}

function handlePriorityDropdown(e) {
    // Handle priority button clicks
    if (e.target.closest("#priority-current")) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = e.target.closest(".priority-dropdown");
        const isActive = dropdown.classList.contains("active");

        // Close all dropdowns first
        document
            .querySelectorAll(".priority-dropdown.active")
            .forEach((d) => d.classList.remove("active"));

        // Toggle this one if it wasn't active
        if (!isActive) {
            dropdown.classList.add("active");
            // Update options to show only unselected
            const hiddenPriority = document.getElementById("hidden-priority");
            if (hiddenPriority) {
                updatePriorityOptions(hiddenPriority.value);
            }
        }
        return;
    }

    // Handle priority option clicks
    if (e.target.closest(".priority-option")) {
        e.preventDefault();
        e.stopPropagation();
        const option = e.target.closest(".priority-option");
        const priority = option.dataset.priority;
        const priorityText = option.textContent.trim();

        // Update display
        const currentBtn = document.getElementById("priority-current");
        const hiddenPriority = document.getElementById("hidden-priority");

        if (currentBtn && hiddenPriority) {
            currentBtn.innerHTML = `<span class="priority-dot ${priority}"></span> ${priorityText} <span class="dropdown-arrow">▼</span>`;
            hiddenPriority.value = priority;
            updateTaskField('priority', priority);
        }

        // Close dropdown
        const dropdown = option.closest(".priority-dropdown");
        if (dropdown) dropdown.classList.remove("active");
        
        // Update options for next time (after dropdown closes)
        setTimeout(() => updatePriorityOptions(priority), 100);
        return;
    }

    // Close dropdown when clicking outside
    const activePriorityDropdowns = document.querySelectorAll(
        ".priority-dropdown.active"
    );
    activePriorityDropdowns.forEach((dropdown) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });
}

function updatePriorityOptions(selectedPriority) {
    const priorityOptions = document.getElementById("priority-options");
    if (!priorityOptions) return;
    
    // Using imported PRIORITY_OPTIONS
    const allPriorities = PRIORITY_OPTIONS.map((priority) => ({
        ...priority,
        label: getPriorityLabel(priority.value)
    }));
    
    // Show only unselected priorities
    const availableOptions = allPriorities.filter(p => p.value !== selectedPriority);
    
    priorityOptions.innerHTML = availableOptions.map(priority => 
        `<div class="priority-option" data-priority="${priority.value}">
            <span class="priority-dot ${priority.value}"></span> ${priority.label}
        </div>`
    ).join("");
}

function updateStatusOptions(selectedStatus) {
    const statusOptions = document.getElementById("status-options");
    if (!statusOptions) return;

    const allStatuses = [
        { value: "backlog", label: getStatusLabel("backlog") },
        { value: "todo", label: getStatusLabel("todo") },
        { value: "progress", label: getStatusLabel("progress") },
        { value: "review", label: getStatusLabel("review") },
        { value: "done", label: getStatusLabel("done") }
    ];

    // Filter out disabled statuses (e.g., review status when disabled)
    let enabledStatuses = allStatuses;
    if (window.enableReviewStatus === false) {
        enabledStatuses = allStatuses.filter(s => s.value !== "review");
    }

    // Show only unselected statuses
    const availableOptions = enabledStatuses.filter(s => s.value !== selectedStatus);

    statusOptions.innerHTML = availableOptions.map(status =>
        `<div class="status-option" data-status="${status.value}">
            <span class="status-badge ${status.value}">${status.label}</span>
        </div>`
    ).join("");
}

function setupProjectDropdown() {
    // Only set up once by checking if already initialized
    if (document.body.hasAttribute("data-project-dropdown-initialized")) {
        return;
    }
    document.body.setAttribute("data-project-dropdown-initialized", "true");
    document.addEventListener("click", handleProjectDropdown);
}

function handleProjectDropdown(e) {
    // Handle project button clicks
    if (e.target.closest("#project-current")) {
        e.preventDefault();
        e.stopPropagation();
    const dropdown = e.target.closest(".project-dropdown");
        const isActive = dropdown.classList.contains("active");

        // Close all dropdowns first
        document
            .querySelectorAll(".project-dropdown.active")
            .forEach((d) => d.classList.remove("active"));

        // Toggle this one if it wasn't active
        if (!isActive) {
            dropdown.classList.add("active");
            // Populate options when opening into this dropdown's options container
            showProjectDropdownPortal(dropdown);
        }
        return;
    }

    // Handle project option clicks
    if (e.target.closest(".project-option")) {
        e.preventDefault();
        e.stopPropagation();
        const option = e.target.closest(".project-option");
        const projectId = option.dataset.projectId;
        const projectText = option.textContent.trim();

        // Update display
    const currentBtn = document.getElementById("project-current");
    const hiddenProject = document.getElementById("hidden-project");

        if (currentBtn && hiddenProject) {
            const projectTextSpan = currentBtn.querySelector(".project-text");
            if (projectTextSpan) {
                if (projectId) {
                    const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(parseInt(projectId))}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
                    projectTextSpan.innerHTML = colorSquare + escapeHtml(projectText);
                } else {
                    projectTextSpan.textContent = projectText;
                }
            }
            hiddenProject.value = projectId;
            updateTaskField('projectId', projectId);
            updateTaskProjectOpenBtn(projectId);
        }

        // Close dropdown
        const dropdown = option.closest(".project-dropdown");
        if (dropdown) dropdown.classList.remove("active");
        hideProjectDropdownPortal();
        return;
    }

    // Close dropdown when clicking outside
    const activeDropdowns = document.querySelectorAll(".project-dropdown.active");
    if (activeDropdowns.length > 0 && !e.target.closest(".project-dropdown")) {
        activeDropdowns.forEach((d) => d.classList.remove("active"));
        hideProjectDropdownPortal();
    }
}

function updateTaskProjectOpenBtn(projectId) {
    const btn = document.getElementById('task-project-open-btn');
    if (!btn) return;
    btn.style.display = projectId ? 'inline-flex' : 'none';
}

function openSelectedProjectFromTask() {
    const hiddenProject = document.getElementById('hidden-project');
    if (!hiddenProject || !hiddenProject.value) return;
    const projectId = parseInt(hiddenProject.value, 10);
    if (!projectId) return;
    // Close task modal before navigating
    closeModal('task-modal');
    showProjectDetails(projectId, 'projects');
}

function populateProjectDropdownOptions(dropdownEl) {
    const projectOptions = dropdownEl ? dropdownEl.querySelector('.project-options') : null;
    const hiddenProject = document.getElementById('hidden-project');
    const selectedId = hiddenProject ? (hiddenProject.value || '') : '';
    // Only include the clear option when a specific project is selected
    let optionsHTML = selectedId ? `<div class="project-option" data-project-id="">${t('tasks.project.selectPlaceholder')}</div>` : '';
    if (projects && projects.length > 0) {
        optionsHTML += projects
            .slice()
            .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }))
            .filter(project => selectedId === '' || String(project.id) !== String(selectedId))
            .map(project => {
                const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(project.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
                return `<div class="project-option" data-project-id="${project.id}">${colorSquare}${escapeHtml(project.name)}</div>`;
            })
            .join("");
    }
    if (projectOptions) projectOptions.innerHTML = optionsHTML;
    return optionsHTML;
}

// ===== Portal-based floating dropdown =====
let projectPortalEl = null;
let projectPortalAnchor = null;
let projectPortalScrollParents = [];

function showProjectDropdownPortal(dropdownEl) {
    // Ensure local options have the correct items for keyboard nav fallback
    const optionsHTML = populateProjectDropdownOptions(dropdownEl) || '';

    // Create portal container if needed
    if (!projectPortalEl) {
        projectPortalEl = document.createElement('div');
        projectPortalEl.className = 'project-options-portal';
        document.body.appendChild(projectPortalEl);
    }
    // Build portal with search input and options container
    projectPortalEl.innerHTML = `
        <div class="project-portal-search">
            <input type="text" class="form-input" id="project-portal-search-input" placeholder="Search projects..." autocomplete="off" />
        </div>
        <div class="project-portal-options">${optionsHTML}</div>
    `;
    projectPortalEl.style.display = 'block';

    // Anchor is the trigger button
    const button = dropdownEl.querySelector('#project-current');
    projectPortalAnchor = button;
    positionProjectPortal(button, projectPortalEl);
    // Re-position on next frame to account for fonts/scrollbar layout
    requestAnimationFrame(() => positionProjectPortal(button, projectPortalEl));

    // Delegate clicks within portal to original handler
    projectPortalEl.addEventListener('click', (evt) => {
        evt.stopPropagation();
        const opt = evt.target.closest('.project-option');
        if (!opt) return;
        // Simulate selection using existing logic
        const projectId = opt.dataset.projectId;
        const projectText = opt.textContent.trim();
        const currentBtn = document.getElementById('project-current');
        const hiddenProject = document.getElementById('hidden-project');
        if (currentBtn && hiddenProject) {
            const projectTextSpan = currentBtn.querySelector('.project-text');
            if (projectTextSpan) {
                if (projectId) {
                    const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(parseInt(projectId))}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
                    projectTextSpan.innerHTML = colorSquare + escapeHtml(projectText);
                } else {
                    projectTextSpan.textContent = projectText;
                }
            }
            hiddenProject.value = projectId;
            updateTaskField('projectId', projectId);
            updateTaskProjectOpenBtn(projectId);
        }
        const dd = button.closest('.project-dropdown');
        if (dd) dd.classList.remove('active');
        hideProjectDropdownPortal();
    }, { once: true });

    // Live filtering
    const searchInput = projectPortalEl.querySelector('#project-portal-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterProjectPortalList(searchInput.value));
        // Autofocus for quick typing
        setTimeout(() => searchInput.focus(), 0);
    }

    // Close behaviors
    window.addEventListener('scroll', handleProjectPortalClose, true);
    window.addEventListener('resize', handleProjectPortalClose, true);
    document.addEventListener('keydown', handleProjectPortalEsc, true);

    // Hide inline options to avoid duplicate rendering underneath
    const inlineOptions = dropdownEl.querySelector('.project-options');
    if (inlineOptions) inlineOptions.style.display = 'none';

    // Listen to scroll on any scrollable ancestor (modal columns, body, etc.)
    attachScrollListeners(button);
}

function positionProjectPortal(button, portal) {
    const rect = button.getBoundingClientRect();
    // Match width to trigger
    portal.style.width = `${rect.width}px`;
    // Prefer below; if not enough space, flip above
    const viewportH = window.innerHeight;
    const portalHeight = Math.min(portal.scrollHeight, 200); // matches CSS max-height
    const spaceBelow = viewportH - rect.bottom;
    const showAbove = spaceBelow < portalHeight + 12; // small buffer
    const top = showAbove ? Math.max(8, rect.top - portalHeight - 4) : rect.bottom + 4;
    const viewportW = window.innerWidth;
    const portalWidth = portal.getBoundingClientRect().width || rect.width;
    const desiredLeft = rect.left;
    const clampedLeft = Math.min(
        Math.max(8, desiredLeft),
        Math.max(8, viewportW - portalWidth - 8)
    );
    portal.style.left = `${clampedLeft}px`;
    portal.style.top = `${top}px`;
}

function hideProjectDropdownPortal() {
    if (projectPortalEl) {
        projectPortalEl.style.display = 'none';
        projectPortalEl.innerHTML = '';
    }
    // Restore inline options visibility
    document.querySelectorAll('.project-dropdown .project-options').forEach(el => {
        el.style.display = '';
    });
    window.removeEventListener('scroll', handleProjectPortalClose, true);
    window.removeEventListener('resize', handleProjectPortalClose, true);
    document.removeEventListener('keydown', handleProjectPortalEsc, true);
    projectPortalAnchor = null;
    detachScrollListeners();
}

function handleProjectPortalClose() {
    if (!projectPortalAnchor || !projectPortalEl || projectPortalEl.style.display === 'none') return;
    // Reposition on scroll/resize if still open and anchor exists
    if (document.querySelector('.project-dropdown.active')) {
        positionProjectPortal(projectPortalAnchor, projectPortalEl);
    } else {
        hideProjectDropdownPortal();
    }
}

function attachScrollListeners(anchor) {
    detachScrollListeners();
    projectPortalScrollParents = getScrollableAncestors(anchor);
    projectPortalScrollParents.forEach(el => {
        el.addEventListener('scroll', handleProjectPortalClose, { capture: true, passive: true });
    });
}

function detachScrollListeners() {
    if (!projectPortalScrollParents || projectPortalScrollParents.length === 0) return;
    projectPortalScrollParents.forEach(el => {
        el.removeEventListener('scroll', handleProjectPortalClose, { capture: true });
    });
    projectPortalScrollParents = [];
}

function getScrollableAncestors(el) {
    const result = [];
    let node = el.parentElement;
    while (node && node !== document.body) {
        const style = getComputedStyle(node);
        const isScrollableY = /(auto|scroll|overlay)/.test(style.overflowY);
        if (isScrollableY && node.scrollHeight > node.clientHeight) {
            result.push(node);
        }
        node = node.parentElement;
    }
    // Always include documentElement and body scroll contexts
    result.push(document.documentElement);
    result.push(document.body);
    return result;
}

function handleProjectPortalEsc(e) {
    if (e.key === 'Escape') {
        hideProjectDropdownPortal();
        document.querySelectorAll('.project-dropdown.active').forEach(d => d.classList.remove('active'));
    }
}

function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById("description-editor").focus();
}

function insertHeading(level) {
    document.execCommand("formatBlock", false, level);
    document.getElementById("description-editor").focus();
}

function insertDivider() {
    document.execCommand("insertHTML", false, "<hr>");
    document.getElementById("description-editor").focus();
}

function formatTaskText(command) {
    document.execCommand(command, false, null);
    document.getElementById("task-description-editor").focus();
}

function insertTaskHeading(level) {
    document.execCommand("formatBlock", false, level);
    document.getElementById("task-description-editor").focus();
}

function insertTaskDivider() {
    const editor = document.getElementById('task-description-editor');
    if (!editor) return;
    const sel = window.getSelection();
    let inserted = false;
    if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const checkText = container.nodeType === 1 ? container.closest?.('.check-text') : container.parentElement?.closest?.('.check-text');
        if (checkText && editor.contains(checkText)) {
            // If inside a checklist, insert the divider as a separate block after the checkbox row
            const row = checkText.closest('.checkbox-row');
            if (row && row.parentNode) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = '<div class="divider-row"><hr></div><div><br></div>';
                const newNode = wrapper.firstChild;
                row.parentNode.insertBefore(newNode, row.nextSibling);
                // place caret after the divider
                const r = document.createRange();
                const nxt = newNode.nextSibling;
                if (nxt) {
                    r.setStart(nxt, 0);
                    r.collapse(true);
                } else {
                    r.selectNodeContents(editor);
                    r.collapse(false);
                }
                sel.removeAllRanges();
                sel.addRange(r);
                editor.focus();
                editor.dispatchEvent(new Event('input'));
                inserted = true;
            }
        }
    }
    if (!inserted) {
        // Fallback: insert a block-wrapped hr to avoid inline collisions
        document.execCommand('insertHTML', false, '<div class="divider-row"><hr></div><div><br></div>');
        document.getElementById('task-description-editor').focus();
    }
}

// Insert a single-row checkbox (no text) into the description editor
function insertCheckbox() {
    const editor = document.getElementById('task-description-editor');
    if (!editor) return;
    const id = 'chk-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    // make the row itself editable so users can select/delete the row; keep the toggle button non-editable
    // include variant-1 class for the award-winning blue style
    // NOTE: do NOT append an extra <div><br></div> here — that produced stray blank blocks when inserting
    // in between existing rows. We only insert the checkbox row itself and move the caret into it.
    const html = `<div class=\"checkbox-row\" data-id=\"${id}\" contenteditable=\"false\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"${t('tasks.checklist.toggle')}\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\"></div></div>`;
    try {
        document.execCommand('insertHTML', false, html);
    } catch (e) {
        // fallback
        editor.insertAdjacentHTML('beforeend', html);
    }
    // Move caret into the editable .check-text so user can type immediately
    setTimeout(() => {
        const el = editor.querySelector(`[data-id=\"${id}\"] .check-text`);
        if (el) {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(true);
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(range);
            el.focus();
        }
        editor.dispatchEvent(new Event('input'));
    }, 10);
}

// Auto-link plain URLs in description HTML
function autoLinkifyDescription(html) {
    if (!html) return html;

    const container = document.createElement('div');
    container.innerHTML = html;

    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node || !node.nodeValue) continue;
        const parentEl = node.parentElement;
        if (parentEl && parentEl.closest('a')) continue;
        urlRegex.lastIndex = 0;
        if (!urlRegex.test(node.nodeValue)) continue;
        textNodes.push(node);
    }

    textNodes.forEach(node => {
        const text = node.nodeValue;
        let lastIndex = 0;
        urlRegex.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let match;

        while ((match = urlRegex.exec(text)) !== null) {
            const url = match[0];
            if (match.index > lastIndex) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }
            const a = document.createElement('a');
            a.href = url;
            a.textContent = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            frag.appendChild(a);
            lastIndex = match.index + url.length;
        }

        if (lastIndex < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        if (node.parentNode) {
            node.parentNode.replaceChild(frag, node);
        }
    });

    return container.innerHTML;
}

// Update the description hidden field when content changes
document.addEventListener("DOMContentLoaded", function () {
    const taskEditor = document.getElementById("task-description-editor");
    const taskHiddenField = document.getElementById("task-description-hidden");

    if (taskEditor && taskHiddenField) {
        // Legacy behavior: preserve any literal '✔' characters inside checkbox buttons

        taskEditor.addEventListener("input", function () {
            taskHiddenField.value = taskEditor.innerHTML;
        });

        // If the user pastes an image into the description editor, treat it as an attachment
        // (same UX as feedback screenshot paste) instead of inserting a giant inline <img>.
        taskEditor.addEventListener("paste", function (e) {
            if (!e.clipboardData) return;
            const file = Array.from(e.clipboardData.files || [])[0];
            if (!file || !file.type || !file.type.startsWith("image/")) return;

            e.preventDefault();
            e.stopPropagation();

            const dropzone = document.getElementById("attachment-file-dropzone");
            if (typeof uploadTaskAttachmentFile === "function") {
                uploadTaskAttachmentFile(file, dropzone).catch((err) => {
                    console.error("Failed to upload pasted image as attachment:", err);
                });
            }
        });
         
        // Enhanced key handling inside the editor:
        // - Enter inside a .check-text moves the caret to the next line (like ArrowDown)
        // - Backspace/Delete when at edges will remove the checkbox row
        taskEditor.addEventListener('keydown', function (e) {
            const sel = window.getSelection();

            // If the user presses Backspace/Delete, we may need to handle checkbox
            // rows specially. However, if the user has a multi-element selection
            // (for example Select All) we should let the browser perform the
            // default deletion rather than intercepting it.
            if ((e.key === 'Backspace' || e.key === 'Delete') && sel && sel.rangeCount) {
                try {
                    const r0 = sel.getRangeAt(0);
                    // If the selection spans multiple containers, let the browser
                    // handle deletion (this fixes Select All + Delete/Backspace).
                    if (!r0.collapsed && r0.startContainer !== r0.endContainer) {
                        return;
                    }
                    if (!r0.collapsed) {
                        // Compute top-level child nodes that the selection spans and remove
                        // any `.checkbox-row` children between them. This works even when
                        // non-editable nodes aren't directly part of the selection.
                        const children = Array.from(taskEditor.childNodes);
                        function topLevel(node) {
                            let n = node.nodeType === 3 ? node.parentElement : node;
                            while (n && n.parentElement !== taskEditor) n = n.parentElement;
                            return n;
                        }
                        const startNode = topLevel(r0.startContainer);
                        const endNode = topLevel(r0.endContainer);
                        let startIdx = children.indexOf(startNode);
                        let endIdx = children.indexOf(endNode);
                        if (startIdx === -1) startIdx = 0;
                        if (endIdx === -1) endIdx = children.length - 1;
                        const lo = Math.min(startIdx, endIdx);
                        const hi = Math.max(startIdx, endIdx);
                        let removed = false;
                        for (let i = lo; i <= hi; i++) {
                            const node = children[i];
                            if (node && node.classList && node.classList.contains('checkbox-row')) {
                                const next = node.nextSibling;
                                node.parentNode.removeChild(node);
                                if (next && next.nodeType === 1 && next.tagName.toLowerCase() === 'div' && next.innerHTML.trim() === '<br>') {
                                    next.parentNode.removeChild(next);
                                }
                                removed = true;
                            }
                        }
                        if (removed) {
                            e.preventDefault();
                            taskEditor.dispatchEvent(new Event('input'));
                            return;
                        }
                    } else {
                        // Collapsed selection: if caret is not inside a .check-text and the user
                        // presses Backspace while the caret is at the start of a node located
                        // immediately after a checkbox row, move the caret into the previous
                        // .check-text at its end so the user can continue to backspace through
                        // the text and then delete the checkbox normally.
                        const container = r0.startContainer;
                        const checkText = container.nodeType === 1 ? container.closest?.('.check-text') : container.parentElement?.closest?.('.check-text');
                        if (!checkText && e.key === 'Backspace') {
                            const node = container.nodeType === 3 ? container.parentElement : container;
                            if (node) {
                                const atStart = (container.nodeType === 3) ? r0.startOffset === 0 : r0.startOffset === 0;
                                if (atStart) {
                                    let prev = node.previousSibling;
                                    while (prev && prev.nodeType !== 1) prev = prev.previousSibling;
                                    if (prev && prev.classList && prev.classList.contains('checkbox-row')) {
                                        e.preventDefault();
                                        const txt = prev.querySelector('.check-text');
                                        if (txt) {
                                            if (!txt.firstChild) txt.appendChild(document.createTextNode(''));
                                            const textNode = txt.firstChild.nodeType === 3 ? txt.firstChild : txt.firstChild;
                                            const pos = textNode.nodeType === 3 ? textNode.length : (txt.textContent ? txt.textContent.length : 0);
                                            const newRange = document.createRange();
                                            try {
                                                newRange.setStart(textNode, pos);
                                            } catch (e2) {
                                                newRange.selectNodeContents(txt);
                                                newRange.collapse(false);
                                            }
                                            newRange.collapse(true);
                                            sel.removeAllRanges();
                                            sel.addRange(newRange);
                                            txt.focus();
                                            taskEditor.dispatchEvent(new Event('input'));
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (err) {
                    // ignore and fall through to default behavior
                }
            }
            if (e.key === 'Enter') {
                if (!sel || !sel.rangeCount) {
                    e.stopPropagation();
                    return;
                }
                const range = sel.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const checkText = container.nodeType === 1 ? container.closest?.('.check-text') : container.parentElement?.closest?.('.check-text');
                if (checkText && taskEditor.contains(checkText)) {
                    // Confluence-like behavior for checklists:
                    // - Enter at the end of a checklist row -> create a new checklist row below and move caret into it
                    // - Enter on an empty checklist row -> remove the checklist and convert it to a normal paragraph (blank div)
                    // - Otherwise (Enter inside text) insert a line-break inside the check-text
                    e.preventDefault();
                    const row = checkText.closest('.checkbox-row');
                    if (!row) return;
                    // Compute text before/after caret inside the checkText
                    const range = sel.getRangeAt(0);
                    const beforeRange = range.cloneRange();
                    beforeRange.selectNodeContents(checkText);
                    beforeRange.setEnd(range.startContainer, range.startOffset);
                    const beforeText = beforeRange.toString();
                    const afterRange = range.cloneRange();
                    afterRange.selectNodeContents(checkText);
                    afterRange.setStart(range.endContainer, range.endOffset);
                    const afterText = afterRange.toString();

                    // If the checklist is completely empty -> replace with a paragraph
                    if (beforeText.length === 0 && afterText.length === 0) {
                        const p = document.createElement('div');
                        p.innerHTML = '<br>';
                        row.parentNode.replaceChild(p, row);
                        const r = document.createRange();
                        r.setStart(p, 0);
                        r.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(r);
                        taskEditor.focus();
                        taskEditor.dispatchEvent(new Event('input'));
                        return;
                    }

                    // If caret is at the end of the text -> create a new checkbox row below
                    if (afterText.length === 0) {
                        const id2 = 'chk-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                        const wrapper = document.createElement('div');
                        wrapper.innerHTML = `<div class=\"checkbox-row\" data-id=\"${id2}\" contenteditable=\"false\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"${t('tasks.checklist.toggle')}\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\"></div></div>`;
                        const newRow = wrapper.firstChild;
                        if (row && row.parentNode) {
                            row.parentNode.insertBefore(newRow, row.nextSibling);
                            const el = newRow.querySelector('.check-text');
                            const r = document.createRange();
                            r.selectNodeContents(el);
                            r.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(r);
                            el.focus();
                            taskEditor.dispatchEvent(new Event('input'));
                        }
                        return;
                    }

                    // Otherwise, insert an inline line-break inside the check-text
                    document.execCommand('insertHTML', false, '<br><br>');
                    taskEditor.dispatchEvent(new Event('input'));
                    return;
                }
                // Not in a check-text: prevent event from bubbling to the form
                e.stopPropagation();
                return;
            }

            if ((e.key === 'Backspace' || e.key === 'Delete') && sel && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const checkText = container.nodeType === 1 ? container.closest?.('.check-text') : container.parentElement?.closest?.('.check-text');
                // Logging for checkbox key handling (Backspace/Delete inside checklist rows)
                console.log('[checkbox-editor] keydown', {
                    key: e.key,
                    collapsed: range.collapsed,
                    containerNodeType: container.nodeType,
                    containerTag: container.nodeType === 1 ? container.tagName : null,
                    isInCheckText: !!checkText
                });
                if (checkText && taskEditor.contains(checkText)) {
                    // Backspace at start -> remove the row
                    const row = checkText.closest('.checkbox-row');
                    if (!row) return;
                    // Create a clone range to inspect text before/after caret within checkText
                    const beforeRange = range.cloneRange();
                    beforeRange.selectNodeContents(checkText);
                    beforeRange.setEnd(range.startContainer, range.startOffset);
                    const beforeText = beforeRange.toString();
                    const afterRange = range.cloneRange();
                    afterRange.selectNodeContents(checkText);
                    afterRange.setStart(range.endContainer, range.endOffset);
                    const afterText = afterRange.toString();

                    if (e.key === 'Backspace' && beforeText.length === 0) {
                        e.preventDefault();
                        console.log('[checkbox-editor] Backspace at start of checkbox row', {
                            beforeText,
                            afterText
                        });
                        // Capture siblings before removing the row
                        let prev = row.previousSibling;
                        let next = row.nextSibling;
                        // Walk back to the previous element sibling (skip whitespace text nodes)
                        while (prev && prev.nodeType !== 1) prev = prev.previousSibling;
                        row.parentNode.removeChild(row);
                        // remove an immediately following empty <div><br></div> if present
                        if (next && next.nodeType === 1 && next.tagName.toLowerCase() === 'div' && next.innerHTML.trim() === '<br>') {
                            next.parentNode.removeChild(next);
                        }
                        const newSel = window.getSelection();
                        const r = document.createRange();
                        let focusNode = null;
                        // Prefer moving caret to the end of the previous checkbox row's text, if any
                        let placed = false;
                        if (prev && prev.classList && prev.classList.contains('checkbox-row')) {
                            const prevText = prev.querySelector('.check-text');
                            if (prevText) {
                                if (!prevText.firstChild) prevText.appendChild(document.createTextNode(''));
                                const textNode = prevText.firstChild.nodeType === 3 ? prevText.firstChild : prevText.firstChild;
                                const pos = textNode.nodeType === 3 ? textNode.length : (prevText.textContent ? prevText.textContent.length : 0);
                                try {
                                    r.setStart(textNode, pos);
                                } catch (e2) {
                                    r.selectNodeContents(prevText);
                                }
                                r.collapse(false);
                                placed = true;
                                focusNode = prevText;
                                console.log('[checkbox-editor] caret moved to previous checkbox row');
                            }
                        }
                        if (!placed) {
                            // Fallback: place caret at start of the next block (skipping non-elements) or end of editor
                            while (next && next.nodeType !== 1) next = next.nextSibling;
                            if (next && next.parentNode) {
                                r.setStart(next, 0);
                                r.collapse(true);
                            } else {
                                r.selectNodeContents(taskEditor);
                                r.collapse(false);
                            }
                            console.log('[checkbox-editor] caret fallback placement', { hasNext: !!next });
                        }
                        newSel.removeAllRanges();
                        newSel.addRange(r);
                        // Focus the most relevant editable node so the browser doesn't move
                        // the caret back to the top of the editor.
                        if (focusNode && typeof focusNode.focus === 'function') {
                            focusNode.focus();
                        } else {
                            taskEditor.focus();
                        }
                        // Log final caret location AFTER focus, to match what the user sees.
                        {
                            const anchor = newSel.anchorNode;
                            console.log('[checkbox-editor] final caret location', {
                                nodeType: anchor ? anchor.nodeType : null,
                                tag: anchor && anchor.nodeType === 1 ? anchor.tagName : null,
                                textSnippet: anchor && anchor.textContent ? anchor.textContent.slice(0, 30) : null,
                                insideCheckboxRow: !!(anchor && anchor.parentElement && anchor.parentElement.closest('.checkbox-row'))
                            });
                        }
                        taskEditor.dispatchEvent(new Event('input'));
                        return;
                    }

                    if (e.key === 'Delete' && afterText.length === 0) {
                        e.preventDefault();
                        const next = row.nextSibling;
                        row.parentNode.removeChild(row);
                        if (next && next.nodeType === 1 && next.tagName.toLowerCase() === 'div' && next.innerHTML.trim() === '<br>') {
                            next.parentNode.removeChild(next);
                        }
                        const newSel = window.getSelection();
                        const r = document.createRange();
                        if (next) {
                            r.setStart(next, 0);
                            r.collapse(true);
                        } else {
                            r.selectNodeContents(taskEditor);
                            r.collapse(false);
                        }
                        newSel.removeAllRanges();
                        newSel.addRange(r);
                        taskEditor.focus();
                        taskEditor.dispatchEvent(new Event('input'));
                        return;
                    }
                }
            }
        });
        // Delegated click handler for checkbox toggles (non-destructive)
        taskEditor.addEventListener('click', function (e) {
            const btn = e.target.closest('.checkbox-toggle');
            if (!btn) return;
            // toggle state
            const pressed = btn.getAttribute('aria-pressed') === 'true';
            btn.setAttribute('aria-pressed', String(!pressed));
            btn.classList.toggle('checked', !pressed);
            // reflect accessible text (simple checkmark)
            btn.innerText = !pressed ? '✔' : '';
            taskEditor.dispatchEvent(new Event('input'));
        });
    }
    // Enable clickable links inside the task description editor
    const taskEditorForLinks = document.getElementById('task-description-editor');
    if (taskEditorForLinks) {
        taskEditorForLinks.addEventListener('click', function (e) {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href) return;
            const sel = window.getSelection();
            if (sel && sel.toString()) return;
            e.preventDefault();
            e.stopPropagation();
            window.open(href, '_blank', 'noopener,noreferrer');
        });
    }

    // Prevent Enter key in attachment fields from submitting form
    const attachmentUrl = document.getElementById('attachment-url');
    const attachmentName = document.getElementById('attachment-name');
    
    if (attachmentUrl) {
        attachmentUrl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addAttachment();
            }
        });
    }
    
    if (attachmentName) {
        attachmentName.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addAttachment();
            }
        });
    }

    // Attach toolbar checklist button
    const checklistBtn = document.getElementById('checklist-btn');
    if (checklistBtn) {
        checklistBtn.addEventListener('click', function () {
            const editor = document.getElementById('task-description-editor');
            // If the caret is currently inside a .check-text, behave like Enter
            const sel = window.getSelection();
            const insideHandled = handleChecklistEnter(editor);
            if (!insideHandled) {
                // Not inside a checklist -> insert a new checkbox row
                insertCheckbox();
            }
        });
    }

    // Tag input Enter key support
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
        tagInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
            }
        });
    }

    // Existing feedback input code
    const feedbackInput = document.getElementById('feedback-description');
    if (feedbackInput) {
        const desktopPlaceholder = feedbackInput.getAttribute('placeholder') || '';
        const mobilePlaceholder = 'Describe the issue or idea.';
        const resolveIsMobile = () => {
            if (typeof window.matchMedia === 'function') {
                return window.matchMedia('(max-width: 768px)').matches;
            }
            return window.innerWidth <= 768;
        };
        const applyFeedbackPlaceholder = () => {
            feedbackInput.placeholder = resolveIsMobile() ? mobilePlaceholder : desktopPlaceholder;
        };

        applyFeedbackPlaceholder();
        if (typeof window.matchMedia === 'function') {
            const mq = window.matchMedia('(max-width: 768px)');
            if (typeof mq.addEventListener === 'function') mq.addEventListener('change', applyFeedbackPlaceholder);
            else if (typeof mq.addListener === 'function') mq.addListener(applyFeedbackPlaceholder);
        }

        feedbackInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addFeedbackItem();
            }
        });
    }
});


function loadCalendarState() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return { currentMonth, currentYear };
}

const calendarState = loadCalendarState();
let currentMonth = calendarState.currentMonth;
let currentYear = calendarState.currentYear;

// Save calendar state to localStorage
function saveCalendarState() {
localStorage.setItem('calendarMonth', currentMonth.toString());
    localStorage.setItem('calendarYear', currentYear.toString());
}

function capitalizeFirst(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCalendarDayNames(locale) {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const baseDate = new Date(2024, 0, 1); // Monday
    return Array.from({ length: 7 }, (_, idx) => {
        const label = formatter.format(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + idx));
        return capitalizeFirst(label);
    });
}

function formatCalendarMonthYear(locale, year, month) {
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    return capitalizeFirst(formatter.format(new Date(year, month, 1)));
}

function renderCalendar() {
    const locale = getLocale();
    const dayNames = getCalendarDayNames(locale);

    // Update month/year display
    document.getElementById("calendar-month-year").textContent =
        formatCalendarMonthYear(locale, currentYear, currentMonth);

    // Calculate first day and number of days
    // Adjust so Monday = 0, Tuesday = 1, ..., Sunday = 6
    let firstDay = new Date(currentYear, currentMonth, 1).getDay();
    firstDay = (firstDay + 6) % 7; // Convert Sunday=0 to Sunday=6, Monday=1 to Monday=0, etc.
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Build calendar grid
    let calendarHTML = "";

    // Add day headers
    dayNames.forEach((day, idx) => {
        const isWeekend = idx >= 5; // Sat/Sun (Mon=0 ... Sun=6)
        calendarHTML += `<div class="calendar-day-header${isWeekend ? ' weekend' : ''}">${day}</div>`;
    });

    // Track cell index to mark week rows (0-based across day cells)
    let cellIndex = 0;

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const row = Math.floor(cellIndex / 7);
        calendarHTML += `<div class="calendar-day other-month" data-row="${row}">
                    <div class="calendar-day-number">${day}</div>
                    <div class="project-spacer" style="height:0px;"></div>
                </div>`;
        cellIndex++;
    }

    // Add current month's days
    const today = new Date();
    const isCurrentMonth =
        today.getMonth() === currentMonth &&
        today.getFullYear() === currentYear;
    const todayDate = today.getDate();

    // UX: only show "Today" button when user has left the current month (mobile + desktop)
    try {
        const isMobile = typeof window.matchMedia === 'function'
            ? window.matchMedia('(max-width: 768px)').matches
            : window.innerWidth <= 768;

        // Mobile: header button
        if (isMobile) {
            document.querySelectorAll('.calendar-today-btn--header').forEach((btn) => {
                btn.style.display = isCurrentMonth ? 'none' : 'inline-flex';
            });
        }

        // Desktop: nav button
        if (!isMobile) {
            document.querySelectorAll('.calendar-today-btn--nav').forEach((btn) => {
                btn.style.display = isCurrentMonth ? 'none' : 'inline-flex';
            });
        }
    } catch (e) {}

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
            2,
            "0"
        )}-${String(day).padStart(2, "0")}`;
        const isToday = isCurrentMonth && day === todayDate;
        const isWeekend = (cellIndex % 7) >= 5; // Sat/Sun columns

        // Tasks and projects are rendered via the overlay bars (desktop-style) to avoid duplicates.
        let tasksHTML = "";

        // Get filtered project IDs (same logic as in renderProjectBars)
        const filteredProjectIds = filterState.projects.size > 0 
            ? Array.from(filterState.projects).map(id => parseInt(id, 10))
            : projects.map(p => p.id);

        // Count how many FILTERED projects overlap this day
        const overlappingProjects = projects.filter((project) => {
            // Check if project matches filter
            if (!filteredProjectIds.includes(project.id)) return false;
            
            const startDate = new Date(project.startDate);
            const endDate = project.endDate
                ? new Date(project.endDate)
                : new Date(project.startDate);
            const currentDate = new Date(dateStr);
            return currentDate >= startDate && currentDate <= endDate;
        }).length;

        // Build the day cell with a spacer that will be sized after project bars are computed
        const row = Math.floor(cellIndex / 7);
        const hasProjects = overlappingProjects > 0;
        calendarHTML += `
                    <div class="calendar-day ${isToday ? "today" : ""}${isWeekend ? " weekend" : ""}" data-row="${row}" data-action="showDayTasks" data-param="${dateStr}" data-has-project="${hasProjects}">
                        <div class="calendar-day-number">${day}</div>
                        <div class="project-spacer" style="height:0px;"></div>
                        <div class="tasks-container">${tasksHTML}</div>
                    </div>
                `;
        cellIndex++;
    }

    // Add next month's leading days
    const totalCells = firstDay + daysInMonth;
    const cellsNeeded = Math.ceil(totalCells / 7) * 7;
    const nextMonthDays = cellsNeeded - totalCells;

    for (let day = 1; day <= nextMonthDays; day++) {
        const row = Math.floor(cellIndex / 7);
        calendarHTML += `<div class="calendar-day other-month" data-row="${row}">
                    <div class="calendar-day-number">${day}</div>
                    <div class="project-spacer" style="height:0px;"></div>
                </div>`;
        cellIndex++;
    }

document.getElementById("calendar-grid").innerHTML = calendarHTML;
    const overlay = document.getElementById('project-overlay');
    if (overlay) overlay.style.opacity = '0';
    // Use double-RAF to wait for layout/paint before measuring positions
    requestAnimationFrame(() => {
requestAnimationFrame(() => {
renderProjectBars();
            // renderProjectBars handles showing the overlay
        });
    });
}

// Track retry attempts to prevent infinite loops
let renderProjectBarsRetries = 0;
const MAX_RENDER_RETRIES = 20; // Max 1 second of retries (20 * 50ms)

function renderProjectBars() {
    try {
const overlay = document.getElementById("project-overlay");
        if (!overlay) {
            console.error('[ProjectBars] No overlay element found!');
            renderProjectBarsRetries = 0;
            return;
        }

    // Completely clear overlay
overlay.innerHTML = "";
    overlay.style.opacity = '0';

    const calendarGrid = document.getElementById("calendar-grid");
    if (!calendarGrid) {
        console.error('[ProjectBars] No calendar grid found!');
        renderProjectBarsRetries = 0;
        return;
    }

    // Check if calendar view is actually visible. Treat "preparing" like active so the
    // calendar can finish its initial render before we flip it on-screen.
    const calendarView = document.getElementById("calendar-view");
    const calendarVisible = calendarView && (
        calendarView.classList.contains('active') ||
        calendarView.classList.contains('preparing')
    );
    if (!calendarVisible) {
renderProjectBarsRetries = 0;
        return;
    }

    // Force multiple reflows to ensure layout is fully calculated
    const h = calendarGrid.offsetHeight;
    const w = calendarGrid.offsetWidth;
// Force another reflow after a tick
    const allDayElements = Array.from(
        calendarGrid.querySelectorAll(".calendar-day")
    );
if (allDayElements.length === 0) {
        if (renderProjectBarsRetries < MAX_RENDER_RETRIES) {
            console.warn('[ProjectBars] No day elements found, retrying in 100ms...');
            renderProjectBarsRetries++;
            setTimeout(renderProjectBars, 100);
            return;
        } else {
            console.error('[ProjectBars] Max retries reached, giving up');
            renderProjectBarsRetries = 0;
            return;
        }
    }

    // Validate that elements have actual dimensions
    const firstDayRect = allDayElements[0].getBoundingClientRect();
if (firstDayRect.width === 0 || firstDayRect.height === 0) {
        if (renderProjectBarsRetries < MAX_RENDER_RETRIES) {
            console.warn('[ProjectBars] Elements not ready (zero dimensions), retrying in 50ms...', { firstDayRect });
            renderProjectBarsRetries++;
            setTimeout(renderProjectBars, 50);
            return;
        } else {
            console.error('[ProjectBars] Max retries reached, giving up');
            renderProjectBarsRetries = 0;
            return;
        }
    }

    // Reset retry counter on success
    renderProjectBarsRetries = 0;

    const currentMonthDays = allDayElements
        .map((el, index) => ({
            element: el,
            index,
            gridIndex: index, // Original index in 42-cell grid
            day: parseInt(el.querySelector(".calendar-day-number").textContent),
            isOtherMonth: el.classList.contains("other-month"),
        }))
        .filter((item) => !item.isOtherMonth);

    // Get filtered project IDs
    const filteredProjectIds = filterState.projects.size > 0 
        ? Array.from(filterState.projects).map(id => parseInt(id, 10))
        : projects.map(p => p.id);

    // Only render filtered projects
    const filteredProjects = projects.filter(p => filteredProjectIds.includes(p.id));

    // Stable ordering so stacking doesn't change across week rows
    const projectRank = new Map();
    filteredProjects
        .slice()
        .sort((a, b) => {
            const aStart = a.startDate || '';
            const bStart = b.startDate || '';
            if (aStart !== bStart) return aStart.localeCompare(bStart);
            const aEnd = (a.endDate || a.startDate || '');
            const bEnd = (b.endDate || b.startDate || '');
            if (aEnd !== bEnd) return aEnd.localeCompare(bEnd);
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            if (aName !== bName) return aName.localeCompare(bName);
            return (a.id || 0) - (b.id || 0);
        })
        .forEach((p, idx) => projectRank.set(p.id, idx));

    // Get first and last day of current month (for chevron detection)
    const firstDayOfMonthIndex = currentMonthDays.length > 0 ? currentMonthDays[0].gridIndex : -1;
    const lastDayOfMonthIndex = currentMonthDays.length > 0 ? currentMonthDays[currentMonthDays.length - 1].gridIndex : -1;

    // Prepare per-row segments map for packing (both projects and tasks)
    const projectSegmentsByRow = new Map(); // rowIndex -> [ { startIndex, endIndex, project } ]
    const taskSegmentsByRow = new Map(); // rowIndex -> [ { startIndex, endIndex, task } ]

    // Process projects
    filteredProjects.forEach((project) => {
        const [startYear, startMonth, startDay] = project.startDate
            .split("-")
            .map((n) => parseInt(n));
        const startDate = new Date(startYear, startMonth - 1, startDay); // month is 0-based

        const [endYear, endMonth, endDay] = (
            project.endDate || project.startDate
        )
            .split("-")
            .map((n) => parseInt(n));
        const endDate = new Date(endYear, endMonth - 1, endDay);
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);

        if (startDate <= monthEnd && endDate >= monthStart) {
            const calStartDate =
                startDate < monthStart ? monthStart : startDate;
            const calEndDate = endDate > monthEnd ? monthEnd : endDate;

            const startDay = calStartDate.getDate();
            const endDay = calEndDate.getDate();

            // Find the correct day elements using our mapped array
            const startDayInfo = currentMonthDays.find((d) => d.day === startDay);
            const endDayInfo = currentMonthDays.find((d) => d.day === endDay);

            if (!startDayInfo || !endDayInfo) return;

            const startIndex = startDayInfo.gridIndex;
            const endIndex = endDayInfo.gridIndex;

            // Split into week row segments and store for later packing
            let cursor = startIndex;
            while (cursor <= endIndex) {
                const rowStart = Math.floor(cursor / 7) * 7;
                const rowEnd = Math.min(rowStart + 6, endIndex);
                const segStart = Math.max(cursor, rowStart);
                const segEnd = rowEnd;
                const row = Math.floor(segStart / 7);
                if (!projectSegmentsByRow.has(row)) projectSegmentsByRow.set(row, []);
                projectSegmentsByRow.get(row).push({ startIndex: segStart, endIndex: segEnd, project });
                cursor = rowEnd + 1;
            }
        }
    });

    // Process tasks with endDate or startDate
    // Show tasks that have endDate OR startDate (at least one date must exist)
    const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
    const baseTasks = typeof getFilteredTasks === 'function' ? getFilteredTasks() : tasks.slice();
    const updatedFilteredTasks = cutoff === null
        ? baseTasks
        : baseTasks.filter((t) => getTaskUpdatedTime(t) >= cutoff);

    // Filter out backlog tasks if setting is disabled
    const includeBacklog = !!settings.calendarIncludeBacklog;
    const tasksToShow = includeBacklog
        ? updatedFilteredTasks
        : updatedFilteredTasks.filter((task) => task.status !== 'backlog');

    const filteredTasks = tasksToShow.filter(task => {
        // Must have at least one valid date (startDate or endDate)
        const hasEndDate = task.endDate && task.endDate.length === 10 && task.endDate.includes('-');
        const hasStartDate = task.startDate && task.startDate.length === 10 && task.startDate.includes('-');
        return hasEndDate || hasStartDate;
    });

    const taskRank = new Map();
    const taskStartKey = (t) =>
        (t.startDate && t.startDate.length === 10 && t.startDate.includes('-')) ? t.startDate : (t.endDate || '');
    filteredTasks
        .slice()
        .sort((a, b) => {
            const as = taskStartKey(a);
            const bs = taskStartKey(b);
            if (as !== bs) return as.localeCompare(bs);
            const ae = a.endDate || '';
            const be = b.endDate || '';
            if (ae !== be) return ae.localeCompare(be);
            const at = (a.title || '').toLowerCase();
            const bt = (b.title || '').toLowerCase();
            if (at !== bt) return at.localeCompare(bt);
            return (a.id || 0) - (b.id || 0);
        })
        .forEach((t, idx) => taskRank.set(t.id, idx));

    filteredTasks.forEach((task) => {
        // Handle tasks with different date configurations
        // Tasks can have: both dates, only startDate, or only endDate
        let startDate, endDate;
        const hasValidStartDate = task.startDate && task.startDate.length === 10 && task.startDate.includes('-');
        const hasValidEndDate = task.endDate && task.endDate.length === 10 && task.endDate.includes('-');

        // Determine startDate
        if (hasValidStartDate) {
            const [startYear, startMonth, startDay] = task.startDate
                .split("-")
                .map((n) => parseInt(n));
            startDate = new Date(startYear, startMonth - 1, startDay);
        } else if (hasValidEndDate) {
            // No valid startDate: use endDate as startDate for single-day bar
            const [endYear, endMonth, endDay] = task.endDate
                .split("-")
                .map((n) => parseInt(n));
            startDate = new Date(endYear, endMonth - 1, endDay);
        } else {
            // No valid dates - skip this task
            return;
        }

        // Determine endDate
        if (hasValidEndDate) {
            const [endYear, endMonth, endDay] = task.endDate
                .split("-")
                .map((n) => parseInt(n));
            endDate = new Date(endYear, endMonth - 1, endDay);
        } else if (hasValidStartDate) {
            // No valid endDate: use startDate as endDate for single-day bar
            endDate = startDate;
        } else {
            // No valid dates - skip this task
            return;
        }
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);

        if (startDate <= monthEnd && endDate >= monthStart) {
            const calStartDate =
                startDate < monthStart ? monthStart : startDate;
            const calEndDate = endDate > monthEnd ? monthEnd : endDate;

            const startDay = calStartDate.getDate();
            const endDay = calEndDate.getDate();

            const startDayInfo = currentMonthDays.find((d) => d.day === startDay);
            const endDayInfo = currentMonthDays.find((d) => d.day === endDay);

            if (!startDayInfo || !endDayInfo) return;

            const startIndex = startDayInfo.gridIndex;
            const endIndex = endDayInfo.gridIndex;

            // Split into week row segments
            let cursor = startIndex;
            while (cursor <= endIndex) {
                const rowStart = Math.floor(cursor / 7) * 7;
                const rowEnd = Math.min(rowStart + 6, endIndex);
                const segStart = Math.max(cursor, rowStart);
                const segEnd = rowEnd;
                const row = Math.floor(segStart / 7);
                if (!taskSegmentsByRow.has(row)) taskSegmentsByRow.set(row, []);
                taskSegmentsByRow.get(row).push({ startIndex: segStart, endIndex: segEnd, task });
                cursor = rowEnd + 1;
            }
        }
    });

    // Layout constants (vertical measurement anchored to the project-spacer for consistency across views)
    const projectHeight = 18;
    const projectSpacing = 3;
    const taskHeight = 20;
    const taskSpacing = 4;

    // Force one more reflow before critical measurements
    const h2 = calendarGrid.offsetHeight;
// For each row, pack segments into tracks and render, then set spacer heights
    const gridRect = calendarGrid.getBoundingClientRect();
const rowMaxTracks = new Map();

    // Render project bars
    projectSegmentsByRow.forEach((segments, row) => {
        // Sort by stable rank so stacking order doesn't vary by week
        segments.sort((a, b) =>
            (projectRank.get(a.project.id) ?? 0) - (projectRank.get(b.project.id) ?? 0) ||
            a.startIndex - b.startIndex ||
            a.endIndex - b.endIndex
        );
        const trackEnds = []; // endIndex per track
        // Assign track for each segment
        segments.forEach(seg => {
            let track = trackEnds.findIndex(end => seg.startIndex > end);
            if (track === -1) {
                track = trackEnds.length;
                trackEnds.push(seg.endIndex);
            } else {
                trackEnds[track] = seg.endIndex;
            }
            seg.track = track; // annotate
        });

        // Render segments with computed track positions
        segments.forEach(seg => {
            const startEl = allDayElements[seg.startIndex];
            const endEl = allDayElements[seg.endIndex];
            if (!startEl || !endEl) return;
            const startRect = startEl.getBoundingClientRect();
            const endRect = endEl.getBoundingClientRect();

            const bar = document.createElement("div");
            bar.className = "project-bar";
            bar.style.position = "absolute";
            const inset = 6; // match visual padding from cell edges
            let left = (startRect.left - gridRect.left) + inset;
            let width = (endRect.right - startRect.left) - (inset * 2);
            // Clamp within grid bounds to avoid overflow in embedded contexts
            if (left < 0) {
                width += left;
                left = 0;
            }
            if (left + width > gridRect.width) {
                width = Math.max(0, gridRect.width - left);
            }
            width = Math.max(0, width);
            bar.style.left = left + "px";
            bar.style.width = width + "px";

            // Anchor to the project-spacer inside the day cell rather than hardcoded offsets
            const spacerEl = startEl.querySelector('.project-spacer');
            const anchorTop = (spacerEl ? spacerEl.getBoundingClientRect().top : startRect.top) - gridRect.top;
            bar.style.top = (anchorTop + (seg.track * (projectHeight + projectSpacing))) + "px";
            bar.style.height = projectHeight + "px";

            const projectColor = getProjectColor(seg.project.id);
            bar.style.background = `linear-gradient(90deg, ${projectColor}, ${projectColor}dd)`;
            bar.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)";
            bar.style.fontWeight = "600";
            bar.style.color = "white";
            bar.style.padding = "1px 6px";
            bar.style.fontSize = "10px";
            bar.style.display = "flex";
            bar.style.alignItems = "center";
            bar.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
            bar.style.pointerEvents = "auto";
            bar.style.cursor = "pointer";
            bar.style.zIndex = "10";
            bar.style.whiteSpace = "nowrap";
            bar.style.overflow = "hidden";
            bar.style.textOverflow = "ellipsis";

            // Check if project extends beyond visible month - use string comparison for reliability
            const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const monthEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

            const projectStartStr = seg.project.startDate;
            const projectEndStr = seg.project.endDate || seg.project.startDate;

            // ONLY show chevron at month boundaries, NOT between weeks
            const continuesLeft = projectStartStr < monthStartStr && seg.startIndex === firstDayOfMonthIndex;
            const continuesRight = projectEndStr > monthEndStr && seg.endIndex === lastDayOfMonthIndex;

            // Add classes for arrow indicators ONLY at month boundaries
            if (continuesLeft) bar.classList.add('continues-left');
            if (continuesRight) bar.classList.add('continues-right');

            // Adjust border-radius based on continuation
            bar.style.borderTopLeftRadius = continuesLeft ? "0" : "6px";
            bar.style.borderBottomLeftRadius = continuesLeft ? "0" : "6px";
            bar.style.borderTopRightRadius = continuesRight ? "0" : "6px";
            bar.style.borderBottomRightRadius = continuesRight ? "0" : "6px";
            bar.textContent = seg.project.name;

            bar.onclick = (e) => {
                e.stopPropagation();
                showProjectDetails(seg.project.id, 'calendar', { month: currentMonth, year: currentYear });
            };

            overlay.appendChild(bar);
        });

        // Record max tracks for row (projects only for now)
        if (!rowMaxTracks.has(row)) {
            rowMaxTracks.set(row, { projectTracks: 0, taskTracks: 0 });
        }
        rowMaxTracks.get(row).projectTracks = trackEnds.length;
    });

    // Render task bars (below project bars)
    taskSegmentsByRow.forEach((segments, row) => {
        // Sort by stable rank so stacking order doesn't vary by week
        segments.sort((a, b) =>
            (taskRank.get(a.task.id) ?? 0) - (taskRank.get(b.task.id) ?? 0) ||
            a.startIndex - b.startIndex ||
            a.endIndex - b.endIndex
        );
        const trackEnds = []; // endIndex per track
        // Assign track for each segment
        segments.forEach(seg => {
            let track = trackEnds.findIndex(end => seg.startIndex > end);
            if (track === -1) {
                track = trackEnds.length;
                trackEnds.push(seg.endIndex);
            } else {
                trackEnds[track] = seg.endIndex;
            }
            seg.track = track; // annotate
        });

        // Render segments with computed track positions
        segments.forEach(seg => {
            // Determine date configuration early
            const hasValidStartDate = seg.task.startDate && seg.task.startDate.length === 10 && seg.task.startDate.includes('-');
            const hasValidEndDate = seg.task.endDate && seg.task.endDate.length === 10 && seg.task.endDate.includes('-');
            
            const startEl = allDayElements[seg.startIndex];
            const endEl = allDayElements[seg.endIndex];
            if (!startEl || !endEl) return;
            const startRect = startEl.getBoundingClientRect();
            const endRect = endEl.getBoundingClientRect();

            const bar = document.createElement("div");
            bar.className = "task-bar";
            bar.style.position = "absolute";
            const inset = 6; // match visual padding from cell edges
            let left = (startRect.left - gridRect.left) + inset;
            let width = (endRect.right - startRect.left) - (inset * 2);
            // Clamp within grid bounds
            if (left < 0) {
                width += left;
                left = 0;
            }
            if (left + width > gridRect.width) {
                width = Math.max(0, gridRect.width - left);
            }
            width = Math.max(0, width);
            bar.style.left = left + "px";
            bar.style.width = width + "px";

            // Anchor to the project-spacer, offset by project bars height
            const spacerEl = startEl.querySelector('.project-spacer');
            const anchorTop = (spacerEl ? spacerEl.getBoundingClientRect().top : startRect.top) - gridRect.top;
            const projectTracksCount = rowMaxTracks.get(row)?.projectTracks || 0;
            const projectsHeight = projectTracksCount * (projectHeight + projectSpacing);
            const gapBetweenProjectsAndTasks = projectTracksCount > 0 ? 6 : 0; // Add 6px gap if there are projects
            bar.style.top = (anchorTop + projectsHeight + gapBetweenProjectsAndTasks + (seg.track * (taskHeight + taskSpacing))) + "px";
            bar.style.height = taskHeight + "px";

            // Task color based on priority - for left border and text
            const borderColor = PRIORITY_COLORS[seg.task.priority] || "var(--accent-blue)"; // Default blue

            // Style with theme-aware colors - better contrast for dark mode
            const isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";
            bar.style.background = isDarkTheme ? "#3a4050" : "#e8e8e8";
            bar.style.border = isDarkTheme ? "1px solid #4a5060" : "1px solid #d0d0d0";
            
            // Apply left/right borders based on date configuration
            // Only startDate: strong left border
            // Only endDate: strong right border
            // Both dates: strong left and right borders
            if (hasValidStartDate) {
                bar.style.borderLeftWidth = "5px";
                bar.style.borderLeftColor = borderColor;
            } else {
                bar.style.borderLeftWidth = "1px";
            }
            
            if (hasValidEndDate) {
                bar.style.borderRightWidth = "5px";
                bar.style.borderRightColor = borderColor;
            } else {
                bar.style.borderRightWidth = "1px";
            }
            
            bar.style.color = "var(--text-primary)";
            bar.style.padding = "2px 6px";
            bar.style.fontSize = "11px";
            bar.style.fontWeight = "500";
            bar.style.display = "flex";
            bar.style.alignItems = "center";
            bar.style.boxShadow = "var(--shadow-sm)";
            bar.style.pointerEvents = "auto";
            bar.style.cursor = "pointer";
            bar.style.zIndex = "11"; // Above project bars
            bar.style.whiteSpace = "nowrap";
            bar.style.overflow = "hidden";
            bar.style.textOverflow = "ellipsis";

            // Check if task extends beyond visible month - use string comparison for reliability
            const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const monthEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

            // Determine actual task start and end date strings
            const taskStartStr = hasValidStartDate ? seg.task.startDate : seg.task.endDate;
            const taskEndStr = hasValidEndDate ? seg.task.endDate : seg.task.startDate;

            // ONLY show chevron at month boundaries, NOT between weeks
            const continuesLeft = taskStartStr < monthStartStr && seg.startIndex === firstDayOfMonthIndex;
            const continuesRight = taskEndStr > monthEndStr && seg.endIndex === lastDayOfMonthIndex;

            // Add classes for arrow indicators ONLY at month boundaries
            if (continuesLeft) bar.classList.add('continues-left');
            if (continuesRight) bar.classList.add('continues-right');
            
            // Add classes for date configuration styling
            if (hasValidStartDate) bar.classList.add('has-start-date');
            if (hasValidEndDate) bar.classList.add('has-end-date');

            // Adjust border-radius based on continuation
            bar.style.borderTopLeftRadius = continuesLeft ? "0" : "4px";
            bar.style.borderBottomLeftRadius = continuesLeft ? "0" : "4px";
            bar.style.borderTopRightRadius = continuesRight ? "0" : "4px";
            bar.style.borderBottomRightRadius = continuesRight ? "0" : "4px";
            bar.textContent = seg.task.title;

            bar.onclick = (e) => {
                e.stopPropagation();
                openTaskDetails(seg.task.id);
            };

            overlay.appendChild(bar);
        });

        // Record max tracks for row (tasks)
        if (!rowMaxTracks.has(row)) {
            rowMaxTracks.set(row, { projectTracks: 0, taskTracks: 0 });
        }
        rowMaxTracks.get(row).taskTracks = trackEnds.length;
    });

    // Set spacer height per row so inline tasks start below project and task bars
    const spacers = calendarGrid.querySelectorAll('.calendar-day .project-spacer');
    const spacerByRow = new Map();
    spacers.forEach(sp => {
        const row = parseInt(sp.closest('.calendar-day').dataset.row, 10);
        const trackInfo = rowMaxTracks.get(row) || { projectTracks: 0, taskTracks: 0 };
        const projectTracksHeight = trackInfo.projectTracks > 0 ? (trackInfo.projectTracks * (projectHeight + projectSpacing)) : 0;
        const taskTracksHeight = trackInfo.taskTracks > 0 ? (trackInfo.taskTracks * (taskHeight + taskSpacing)) : 0;
        const gapBetweenProjectsAndTasks = (trackInfo.projectTracks > 0 && trackInfo.taskTracks > 0) ? 6 : 0;
        const reserved = projectTracksHeight + taskTracksHeight + gapBetweenProjectsAndTasks + (trackInfo.projectTracks > 0 || trackInfo.taskTracks > 0 ? 4 : 0);
        sp.style.height = reserved + 'px';
        spacerByRow.set(row, reserved);
    });

        // Show overlay after rendering complete
overlay.style.opacity = '1';
    } catch (error) {
        console.error('[ProjectBars] Error rendering project/task bars:', error);
        // Don't let rendering errors break the app
    }
}

function animateCalendarMonthChange(delta) {
    changeMonth(delta);
}

function setupCalendarSwipeNavigation() {
    const stage = document.querySelector('.calendar-stage');
    if (!stage || stage.dataset.swipeReady === 'true') return;
    stage.dataset.swipeReady = 'true';

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let swiping = false;

    stage.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
        swiping = false;
    }, { passive: true });

    stage.addEventListener('touchmove', (e) => {
        if (!tracking) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (!swiping) {
            if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
                swiping = true;
            } else if (Math.abs(dy) > 12) {
                tracking = false;
            }
        }

        if (swiping) {
            e.preventDefault();
        }
    }, { passive: false });

    stage.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        if (!swiping) return;

        const touch = e.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

        const delta = dx < 0 ? 1 : -1;
        animateCalendarMonthChange(delta);
    }, { passive: true });

    stage.addEventListener('touchcancel', () => {
        tracking = false;
        swiping = false;
    }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
    setupCalendarSwipeNavigation();
});

function changeMonth(delta) {
currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
saveCalendarState();
    renderCalendar();

    // Same calendar fix as task deletion/creation (ensure proper refresh)
    // This double-render is CRITICAL - it allows layout to settle between renders
    const calendarView = document.getElementById("calendar-view");
    if (calendarView) {
renderCalendar();
    }
}

function goToToday() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    saveCalendarState();
    renderCalendar();

    // Same calendar fix as task deletion/creation (ensure proper refresh)
    const calendarView = document.getElementById("calendar-view");
    if (calendarView) {
        renderCalendar();
    }
}

function getProjectStatus(projectId) {
    const projectTasks = tasks.filter(t => t.projectId === projectId);

    if (projectTasks.length === 0) {
        return "planning";
    }

    const allDone = projectTasks.every(t => t.status === "done");
    const allNotStarted = projectTasks.every(t => t.status === "backlog" || t.status === "todo");
    const hasInProgress = projectTasks.some(t => t.status === "progress" || t.status === "review");

    if (allDone) {
        return "completed";
    } else if (allNotStarted) {
        return "planning";
    } else if (hasInProgress) {
        return "active";
    }

    // Mixed state: some done, some not started, but none in progress/review
    return "active";
}

function showDayTasks(dateStr) {
    const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
    const baseTasks = typeof getFilteredTasks === 'function' ? getFilteredTasks() : tasks.slice();
    const updatedFilteredTasks = cutoff === null
        ? baseTasks
        : baseTasks.filter((t) => getTaskUpdatedTime(t) >= cutoff);

    // Show tasks that either end on this date OR span across this date
    let dayTasks = updatedFilteredTasks.filter((task) => {
        if (task.startDate && task.endDate) {
            // Task with date range - check if it overlaps this day
            return dateStr >= task.startDate && dateStr <= task.endDate;
        } else if (task.endDate) {
            // Task with only end date - show on end date
            return task.endDate === dateStr;
        } else if (task.startDate) {
            // Task with only start date - show on start date
            return task.startDate === dateStr;
        }
        return false;
    });

    // Filter out backlog tasks if setting is disabled
    const includeBacklog = !!settings.calendarIncludeBacklog;
    if (!includeBacklog) {
        dayTasks = dayTasks.filter((task) => task.status !== 'backlog');
    }

    // Sort tasks by priority (high to low)
    // Using imported PRIORITY_ORDER
    dayTasks.sort((a, b) => {
        const priorityA = PRIORITY_ORDER[a.priority] || 0;
        const priorityB = PRIORITY_ORDER[b.priority] || 0;
        return priorityB - priorityA;
    });
    const dayProjects = projects.filter((project) => {
        const startDate = new Date(project.startDate);
        const endDate = project.endDate
            ? new Date(project.endDate)
            : new Date(project.startDate);
        const currentDate = new Date(dateStr);
        return currentDate >= startDate && currentDate <= endDate;
    });

    if (dayTasks.length === 0 && dayProjects.length === 0) {
        // Show custom styled confirmation modal
        const message = `No tasks or projects for ${formatDate(dateStr)}. Would you like to create a new task?`;
        document.getElementById('calendar-create-message').textContent = message;
        document.getElementById('calendar-create-modal').classList.add('active');
        // Store the date for use when confirmed
        window.pendingCalendarDate = dateStr;
        return;
    }

    // Show custom modal
    const modal = document.getElementById('day-items-modal');
    const title = document.getElementById('day-items-modal-title');
    const body = document.getElementById('day-items-modal-body');

    title.textContent = t('calendar.dayItemsTitle', { date: formatDate(dateStr) });

    let html = '';

    // Projects section
    if (dayProjects.length > 0) {
        html += '<div class="day-items-section">';
        html += `<div class="day-items-section-title">\u{1F4CA} ${t('calendar.dayItemsProjects')}</div>`;
        dayProjects.forEach(project => {
            const projectStatus = getProjectStatus(project.id);
            html += `
                <div class="day-item" data-action="closeDayItemsAndShowProject" data-param="${project.id}">
                    <div class="day-item-title">${escapeHtml(project.name)}</div>
                    <div class="day-item-meta" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                        <span>${formatDate(project.startDate)} - ${formatDate(project.endDate)}</span>
                        <span class="project-status-badge ${projectStatus}">${getProjectStatusLabel(projectStatus).toUpperCase()}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    // Tasks section
    if (dayTasks.length > 0) {
        html += '<div class="day-items-section">';
        html += `<div class="day-items-section-title">\u{2705} ${t('calendar.dayItemsTasks')}</div>`;
        dayTasks.forEach(task => {
            let projectIndicator = "";
            if (task.projectId) {
                const project = projects.find(p => p.id === task.projectId);
                if (project) {
                    const projectColor = getProjectColor(task.projectId);
                    projectIndicator = `<span class="project-indicator" style="background-color: ${projectColor}; color: white; padding: 1px 6px; border-radius: 8px; font-size: 10px; margin-right: 6px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); font-weight: 600;">${escapeHtml(project.name)}</span>`;
                } else {
                    // Project not found - show plain text like in Kanban  
                    projectIndicator = t('tasks.projectIndicatorNone');
                }
            } else {
                // No project assigned - show plain text like in Kanban
                projectIndicator = t('tasks.projectIndicatorNone');
            }
            
            // Create status badge instead of text
            const statusBadge = `<span class="status-badge ${task.status}" style="padding: 2px 8px; font-size: 10px; font-weight: 600;">${getStatusLabel(task.status)}</span>`;
            
            const priorityLabel = getPriorityLabel(task.priority || '').toUpperCase();
            html += `
                <div class="day-item" data-action="closeDayItemsAndOpenTask" data-param="${task.id}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div class="day-item-title" style="flex: 1; min-width: 0;">${escapeHtml(task.title)}</div>
                        <div class="day-item-meta" style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;"><span class="task-priority priority-${task.priority}">${priorityLabel}</span>${statusBadge}</div>
                    </div>
                    <div style="margin-top: 8px; font-size: 11px;">${projectIndicator}</div>
                </div>
            `;
        });
        html += '</div>';
    }

    body.innerHTML = html;
    modal.classList.add('active');
}

function closeDayItemsModal() {
    document.getElementById('day-items-modal').classList.remove('active');
}

function closeDayItemsModalOnBackdrop(event) {
    // Event delegation sets `event.currentTarget` to `document`, so we must compare against the modal backdrop node.
    const modal = document.getElementById('day-items-modal');
    if (!modal) return;
    if (event.target === modal) closeDayItemsModal();
}

// Add keyboard support for closing day items modal
document.addEventListener('keydown', function(e) {
    const dayModal = document.getElementById('day-items-modal');
    if (dayModal && dayModal.classList.contains('active') && e.key === 'Escape') {
        e.preventDefault();
        closeDayItemsModal();
    }
});

function closeProjectConfirmModal() {
    document.getElementById('project-confirm-modal').classList.remove('active');
    document.getElementById('delete-tasks-checkbox').checked = false;
    document.getElementById("project-confirm-error").classList.remove("show");
    projectToDelete = null;
}

// Unsaved changes modal functions
function showUnsavedChangesModal(modalId) {
    window.pendingModalToClose = modalId;
    document.getElementById('unsaved-changes-modal').classList.add('active');
}

function closeUnsavedChangesModal() {
    document.getElementById('unsaved-changes-modal').classList.remove('active');
}

function confirmDiscardChanges() {
    const targetModal = window.pendingModalToClose || 'task-modal';
    closeUnsavedChangesModal();

    // Clear initial state tracking when discarding changes
    if (targetModal === 'task-modal') {
        initialTaskFormState = null;
    } else if (targetModal === 'settings-modal') {
        window.initialSettingsFormState = null;
        window.settingsFormIsDirty = false;
        const settingsForm = document.getElementById('settings-form');
        const saveBtn = settingsForm?.querySelector('.settings-btn-save');
        if (saveBtn) {
            saveBtn.classList.remove('dirty');
            saveBtn.disabled = true;
        }
    }

    window.pendingModalToClose = null;
    closeModal(targetModal);
}

function closeReviewStatusConfirmModal() {
    document.getElementById('review-status-confirm-modal').classList.remove('active');
    // Reset toggle to enabled if user cancelled
    if (window.pendingReviewStatusToggle) {
        window.pendingReviewStatusToggle.checked = true;
        window.pendingReviewStatusToggle.dispatchEvent(new Event('change', { bubbles: true }));
        if (typeof window.markSettingsDirtyIfNeeded === 'function') {
            window.markSettingsDirtyIfNeeded();
        }
    }
    window.pendingReviewTaskMigration = null;
    window.pendingReviewStatusToggle = null;
}

async function confirmDisableReviewStatus() {
    // CRITICAL: Save tasks to local variable BEFORE closing modal (which clears pendingReviewTaskMigration)
    const tasksToMigrate = window.pendingReviewTaskMigration ? [...window.pendingReviewTaskMigration] : [];

    closeReviewStatusConfirmModal();

    // Migrate all review tasks to progress - find by ID to ensure we update the actual global tasks
    if (tasksToMigrate && tasksToMigrate.length > 0) {
        const taskIds = tasksToMigrate.map(t => t.id);

        // Update tasks in the global tasks array
        tasks.forEach(task => {
            if (taskIds.includes(task.id)) {
                task.status = 'progress';
            }
        });

        // Save tasks immediately
        await saveTasks();
    }

    // Continue with saving settings
    const enableReviewStatusToggle = document.getElementById('enable-review-status-toggle');
    if (enableReviewStatusToggle) {
        // Ensure checkbox is unchecked to match the new state
        enableReviewStatusToggle.checked = false;

        // Update global variable and localStorage
        window.enableReviewStatus = false;
        localStorage.setItem('enableReviewStatus', 'false');

        // Update settings object
        settings.enableReviewStatus = false;
        await saveSettings();

        // Apply review status visibility (hides review column)
        applyReviewStatusVisibility();

        // Force immediate kanban refresh to show migrated tasks
        renderTasks();
    }

    // Mark form as clean and close settings modal
    const saveBtn = document.getElementById('save-settings-btn');
    window.initialSettingsFormState = null;
    window.settingsFormIsDirty = false;
    if (saveBtn) {
        saveBtn.classList.remove('dirty');
        saveBtn.disabled = true;
    }

    closeModal('settings-modal');
    showSuccessNotification(t('success.settingsSaved'));
}

// Calendar create task modal functions
function closeCalendarCreateModal() {
    document.getElementById('calendar-create-modal').classList.remove('active');
    window.pendingCalendarDate = null;
}

function confirmCreateTask() {
    const dateStr = window.pendingCalendarDate;
    closeCalendarCreateModal();
    if (dateStr) {
        openTaskModal();
        // Wait for flatpickr to initialize, then set the date using its API
        setTimeout(() => {
            const modal = document.getElementById('task-modal');
            if (!modal) return;

            const endInput = modal.querySelector('#task-form input[name="endDate"]');
            if (!endInput) return;

            // Find the display input (flatpickr is attached to it)
            const wrapper = endInput.closest('.date-input-wrapper');
            if (!wrapper) return;

            const displayInput = wrapper.querySelector('.date-display');
            if (!displayInput || !displayInput._flatpickr) return;

            // Set the hidden input value (ISO format)
            endInput.value = dateStr;

            // Set the display input using flatpickr API
            displayInput._flatpickr.setDate(new Date(dateStr), false);
        }, 100);
    }
}

// Calendar modal backdrop click handler
document.addEventListener('DOMContentLoaded', function() {
    const calendarModal = document.getElementById('calendar-create-modal');
    if (calendarModal) {
        calendarModal.addEventListener('click', function(event) {
            // Close modal if clicking on the backdrop (not the content)
            if (event.target === calendarModal) {
                closeCalendarCreateModal();
            }
        });
    }
});

async function confirmProjectDelete() {
  const input = document.getElementById('project-confirm-input');
  const errorMsg = document.getElementById("project-confirm-error");
  const confirmText = input.value;
  const deleteTasksCheckbox = document.getElementById('delete-tasks-checkbox');

  if (confirmText !== 'delete') {
    errorMsg.classList.add('show');
    input.focus();
    return;
  }

  const projectIdNum = parseInt(projectToDelete, 10);

  // Capture project for history tracking before deletion
  const projectToRecord = projects.find(p => p.id === projectIdNum);

  // Use project service to delete project
  const deleteTasks = deleteTasksCheckbox.checked;

  if (deleteTasks) {
    // Delete all tasks associated with project
    tasks = tasks.filter(t => t.projectId !== projectIdNum);
  }

  // Delete project (and clear task associations if not deleting tasks)
  const result = deleteProjectService(projectIdNum, projects, tasks, !deleteTasks);
  projects = result.projects;

  // Record history for project deletion
  if (window.historyService && projectToRecord) {
    window.historyService.recordProjectDeleted(projectToRecord);
  }

  // Update tasks if associations were cleared (not deleted)
  if (!deleteTasks && result.tasks) {
    tasks = result.tasks;
  }

  // Close modal and update UI immediately (optimistic update)
  closeProjectConfirmModal();

  // Clear sorted view cache to force refresh without deleted project
  projectsSortedView = null;

  // Navigate to projects page and refresh display immediately
  window.location.hash = "#projects";
  showPage("projects");
  render();

  // Save in background (don't block UI)
  Promise.all([
    saveProjects().catch(err => {
      console.error('Failed to save projects:', err);
      showErrorNotification(t('error.saveChangesFailed'));
    }),
    deleteTasks ? saveTasks().catch(err => {
      console.error('Failed to save tasks:', err);
      showErrorNotification(t('error.saveChangesFailed'));
    }) : Promise.resolve()
  ]);

}


function showProjectDetails(projectId, referrer, context) {
    // Only update navigation context if explicitly provided (prevents routing handler from overwriting)
    if (referrer !== undefined) {
        projectNavigationReferrer = referrer;
        if (referrer === 'calendar') {
            const month = context && Number.isInteger(context.month) ? context.month : currentMonth;
            const year = context && Number.isInteger(context.year) ? context.year : currentYear;
            calendarNavigationState = { month, year };
        }
    } else if (!projectNavigationReferrer) {
        // If no referrer stored yet, default to 'projects'
        projectNavigationReferrer = 'projects';
    }
    // Otherwise keep the existing referrer value

    // Update URL hash
    window.location.hash = `project-${projectId}`;

    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // Scroll to top on mobile when showing project details
    if (window.innerWidth <= 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Hide ALL pages first, then show project details
    document
        .querySelectorAll(".page")
        .forEach((page) => page.classList.remove("active"));
    document.getElementById("project-details").classList.add("active");
    
    // Hide user menu in project details view
    const userMenu = document.querySelector(".user-menu");
    if (userMenu) userMenu.style.display = "none";

    // Calculate project stats
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    const completedTasks = projectTasks.filter((t) => t.status === "done");
    const inProgressTasks = projectTasks.filter((t) => t.status === "progress");
    const reviewTasks = projectTasks.filter((t) => t.status === "review");
    const todoTasks = projectTasks.filter((t) => t.status === "todo");
    const backlogTasks = projectTasks.filter((t) => t.status === "backlog");

    const completionPercentage =
        projectTasks.length > 0
            ? Math.round((completedTasks.length / projectTasks.length) * 100)
            : 0;

    // Calculate project status based on task statuses
    let projectStatus = "planning"; // default

    if (projectTasks.length === 0) {
        projectStatus = "planning";
    } else {
        const allDone = projectTasks.every(t => t.status === "done");
        const allTodo = projectTasks.every(t => t.status === "todo");
        const hasInProgress = projectTasks.some(t => t.status === "progress" || t.status === "review");
        
        if (allDone) {
            projectStatus = "completed";
        } else if (allTodo) {
            projectStatus = "planning";
        } else if (hasInProgress || (!allTodo && !allDone)) {
            projectStatus = "active";
        }
    }

	    // Calculate duration
	    const startDate = project.startDate ? new Date(project.startDate) : null;
	    const endDate = project.endDate ? new Date(project.endDate) : new Date();
	    const durationDays =
	        startDate && Number.isFinite(startDate.getTime()) && Number.isFinite(endDate.getTime())
	            ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
	            : null;
    const durationText = Number.isFinite(durationDays)
        ? t('projects.details.durationDays', { count: durationDays })
        : "-";

    // Render project details
    const detailsHTML = `
        <div class="project-details-header">
                    <div class="project-details-title">
                        <span id="project-title-display" data-action="editProjectTitle" data-param="${projectId}" data-param2="${escapeHtml(project.name).replace(/'/g, '&#39;')}" style="font-size: 32px; font-weight: 700; color: var(--text-primary); cursor: pointer;">${escapeHtml(project.name)}</span>
                        <div id="project-title-edit" style="display: none;">
                            <input type="text" id="project-title-input" class="editable-project-title" value="${escapeHtml(project.name)}" style="font-size: 32px; font-weight: 700;">
                            <button class="title-edit-btn confirm" data-action="saveProjectTitle" data-param="${projectId}">✓</button>
                            <button class="title-edit-btn cancel" data-action="cancelProjectTitle">✕</button>
                        </div>
                        <span class="project-status-badge ${projectStatus}" data-action="showStatusInfoModal">${getProjectStatusLabel(projectStatus).toUpperCase()}</span>
                        <button class="back-btn" data-action="${projectNavigationReferrer === 'dashboard' ? 'backToDashboard' : (projectNavigationReferrer === 'calendar' ? 'backToCalendar' : 'backToProjects')}" style="padding: 8px 12px; font-size: 14px; display: flex; align-items: center; gap: 6px; margin-left: 12px;">${projectNavigationReferrer === 'dashboard' ? t('projects.backTo.dashboard') : (projectNavigationReferrer === 'calendar' ? t('projects.backTo.calendar') : t('projects.backTo.projects'))}</button>
                        <div style="margin-left: auto; position: relative;">
                            <button type="button" class="options-btn" id="project-options-btn" data-action="toggleProjectMenu" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;padding:4px;line-height:1;">⋯</button>
                            <div class="options-menu" id="project-options-menu" style="position:absolute;top:calc(100% + 8px);right:0;display:none;">
                                <button type="button" class="duplicate-btn" data-action="handleDuplicateProject" data-param="${projectId}" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:none;border:none;color:var(--text-primary);cursor:pointer;font-size:14px;width:100%;text-align:left;border-radius:4px;">📋 ${t('projects.duplicate.title')}</button>
                                <button type="button" class="delete-btn" data-action="handleDeleteProject" data-param="${projectId}">🗑️ ${t('projects.delete.title')}</button>
                            </div>
                        </div>
	                    </div>

	                    <div class="modal-tabs project-details-tabs">
	                        <button type="button" class="modal-tab active" data-tab="details">${t('projects.details.tab.details')}</button>
	                        <button type="button" class="modal-tab" data-tab="history">${t('projects.details.tab.history')}</button>
	                    </div>

	                    <div class="modal-tab-content active" id="project-details-tab">
		                    <div class="project-details-description">
		                        <textarea class="editable-description" id="project-description-editor">${project.description || ""}</textarea>
		                    </div>
                    <div class="project-timeline">
                        <div class="timeline-item">
                            <div class="timeline-label">${t('projects.details.startDate')}</div>
                            <input type="text" class="form-input date-display editable-date datepicker"
                                placeholder="dd/mm/yyyy" maxLength="10"
                                value="${project.startDate ? formatDate(project.startDate) : ''}"
                                data-project-id="${projectId}" data-field="startDate">
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-label">${t('projects.details.endDate')}</div>
                                <input type="text" class="form-input date-display editable-date datepicker"
                                    placeholder="dd/mm/yyyy" maxLength="10"
                                    value="${project.endDate ? formatDate(project.endDate) : ''}"
                                    data-project-id="${projectId}" data-field="endDate">
                        </div>
	                        <div class="timeline-item">
	                            <div class="timeline-label">${t('projects.details.duration')}</div>
	                            <div class="timeline-value">${durationText}</div>
	                        </div>
                        <div class="timeline-item">
                            <div class="timeline-label">${t('projects.details.created')}</div>
                            <div class="timeline-value">${formatDate(
                                project.createdAt?.split("T")[0]
                            )}</div>
                        </div>
                        <div class="timeline-item" style="position: relative;">
                            <div class="timeline-label">${t('projects.details.calendarColor')}</div>
                            <div class="color-picker-container" style="position: relative;">
                                <div class="current-color" 
                                     style="background-color: ${getProjectColor(projectId)}; width: 20px; height: 20px; border-radius: 4px; border: 2px solid var(--border-color); cursor: pointer; display: inline-block;"
                                     data-action="toggleProjectColorPicker" data-param="${projectId}">
                                </div>
                                <div class="color-picker-dropdown" id="color-picker-${projectId}" style="display: none; position: absolute; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; margin-top: 4px; z-index: 1000; left: 0; top: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                    <div class="color-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                                        ${PROJECT_COLORS.map(color => `
                                            <div class="color-option" 
                                                 style="width: 24px; height: 24px; background-color: ${color}; border-radius: 4px; cursor: pointer; border: 2px solid ${color === getProjectColor(projectId) ? 'white' : 'transparent'};"
                                                 data-action="updateProjectColor" data-param="${projectId}" data-param2="${color}">
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="color-picker-custom" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; gap: 8px; position: relative;">
                                        <span style="font-size: 12px; color: var(--text-muted);">${t('projects.details.customColor')}</span>
                                        <div 
                                            class="custom-color-swatch" 
                                            data-action="openCustomProjectColorPicker" 
                                            data-param="${projectId}"
                                            style="width: 24px; height: 24px; background-color: ${getProjectColor(projectId)}; border-radius: 4px; cursor: pointer; border: 2px solid transparent; box-sizing: border-box;">
                                        </div>
	                                        <input 
	                                            type="color" 
	                                            id="project-color-input-${projectId}"
	                                            class="project-color-input" 
	                                            data-project-id="${projectId}"
	                                            value="${getProjectColor(projectId)}"
	                                            style="position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0;">
	                                    </div>
	                                </div>
	                            </div>
	                        </div>
	                        <div class="timeline-item" style="grid-column: 1 / -1;">
	                            <div class="timeline-label">${t('projects.modal.tagsLabel')}</div>
	                            <div style="margin-top: 8px;">
	                                <div id="project-details-tags-display" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; min-height: 28px;"></div>
	                                <div style="display: flex; gap: 8px;">
	                                    <input type="text" id="project-details-tag-input" class="form-input" placeholder="${t('projects.modal.addTagPlaceholder')}" style="flex: 1;">
	                                    <button type="button" class="btn-secondary" data-action="addProjectDetailsTag" data-param="${projectId}">+</button>
	                                </div>
	                            </div>
	                        </div>
	                    </div>

	                    <div class="project-progress-section">
                    <div class="progress-header">
                        <div class="progress-title">${t('projects.details.progressOverview')}</div>
                        <div class="progress-percentage">${completionPercentage}%</div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${completionPercentage}%"></div>
                    </div>
                    <div class="progress-stats">
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="backlog" title="${t('projects.details.viewBacklog')}">
                            <div class="progress-stat-number" style="color: var(--text-muted);">${
                                backlogTasks.length
                            }</div>
                            <div class="progress-stat-label">${t('tasks.status.backlog')}</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="todo" title="${t('projects.details.viewTodo')}">
                            <div class="progress-stat-number" style="color: var(--text-muted);">${
                                todoTasks.length
                            }</div>
                            <div class="progress-stat-label">${t('tasks.status.todo')}</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="progress" title="${t('projects.details.viewProgress')}">
                            <div class="progress-stat-number" style="color: var(--accent-blue);">${
                                inProgressTasks.length
                            }</div>
                            <div class="progress-stat-label">${t('tasks.status.progress')}</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="review" title="${t('projects.details.viewReview')}">
                            <div class="progress-stat-number" style="color: var(--accent-amber);">${
                                reviewTasks.length
                            }</div>
                            <div class="progress-stat-label">${t('tasks.status.review')}</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="done" title="${t('projects.details.viewCompleted')}">
                            <div class="progress-stat-number" style="color: var(--accent-green);">${
                                completedTasks.length
                            }</div>
                            <div class="progress-stat-label">${t('tasks.status.done')}</div>
                        </div>
                    </div>
                </div>
                
                <div class="project-tasks-section">
                    <div class="section-header">
                        <div class="section-title">${t('projects.details.tasksTitle', { count: projectTasks.length })}</div>
                        <button class="add-btn" data-action="openTaskModalForProject" data-param="${projectId}">${t('tasks.addButton')}</button>
                    </div>
                    <div id="project-tasks-list">
                        ${
                            projectTasks.length === 0
                                ? `<div class="empty-state">${t('tasks.empty.epic')}</div>`
                                : projectTasks
                                      .sort((a, b) => {
                                          // Using imported PRIORITY_ORDER
                                          const priorityA = PRIORITY_ORDER[a.priority] || 1;
                                          const priorityB = PRIORITY_ORDER[b.priority] || 1;
                                          return priorityB - priorityA; // Sort high to low
                                      })
                                      .map(
                                          (task) => `
                                        <div class="project-task-item" data-action="openTaskDetails" data-param="${task.id}">
                                            <div class="project-task-info">
                                                <div class="project-task-title">${task.title}</div>
                                                <div class="project-task-meta">${
                                                    task.endDate
                                                        ? `${t('tasks.endDatePrefix')}${formatDate(task.endDate)}`
                                                        : t('tasks.noDatesSet')
                                                }</div>
                                                ${task.tags && task.tags.length > 0 ? `
                                                    <div class="task-tags" style="margin-top: 4px;">
                                                        ${task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join(' ')}
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <div class="project-task-priority">
                                                <div class="task-priority priority-${task.priority}"><span class="priority-dot ${task.priority}"></span> ${getPriorityLabel(task.priority)}</div>
                                            </div>
                                            <div class="project-task-status-col">
                                                <div class="status-badge ${task.status}">
                                                    ${getStatusLabel(task.status)}
                                                </div>
                                            </div>
                                        </div>
                            `
                                      )
                                      .join("")
                        }
                    </div>
                </div>

                </div>

	                <div class="modal-tab-content" id="project-history-tab">
	                    <div class="project-history-section">
                    <div class="section-header">
                        <div class="section-title">📜 ${t('projects.details.changeHistory')}</div>
                    </div>
                    <div class="history-timeline-inline" id="project-history-timeline-${projectId}">
                        <!-- Timeline will be populated by JavaScript -->
                    </div>
                    <div class="history-empty-inline" id="project-history-empty-${projectId}" style="display: none;">
                        <div style="font-size: 36px; margin-bottom: 12px; opacity: 0.3;">📜</div>
                        <p style="color: var(--text-muted); text-align: center;">${t('projects.details.noChanges')}</p>
                    </div>
	                    </div>
	                </div>
	        </div>
	            `;

	    document.getElementById("project-details-content").innerHTML = detailsHTML;

        // Ensure project description persists reliably (avoid inline handlers getting skipped)
        const descEl = document.getElementById("project-description-editor");
        if (descEl) {
            const saveNow = () => updateProjectField(projectId, 'description', descEl.value, { render: false });
            const saveDebounced = typeof debounce === 'function' ? debounce(saveNow, 500) : saveNow;
            descEl.addEventListener('input', saveDebounced);
            descEl.addEventListener('blur', saveNow);
        }
	    setupProjectDetailsTabs(projectId);

    const customColorInput = document.getElementById(`project-color-input-${projectId}`);
    if (customColorInput) {
        customColorInput.addEventListener('change', (e) => {
            handleProjectCustomColorChange(projectId, e.target.value);
        });
    }

    // Re-initialize date pickers for project details
	    setTimeout(() => {
	        // Clear any existing flatpickr instances first
	        document.querySelectorAll('input.datepicker').forEach(input => {
	            if (input._flatpickrInstance) {
	                input._flatpickrInstance.destroy();
	                delete input._flatpickrInstance;
	            }
	        });
		        // Then initialize new ones - specifically target project detail datepickers
		        initializeDatePickers();
		    }, 50);

    // Render project tags in details view
    renderProjectDetailsTags(project.tags || [], projectId);

    // Project tag input Enter key support
    const projectTagInput = document.getElementById('project-details-tag-input');
    if (projectTagInput) {
        // Remove any existing listener to prevent duplicates
        projectTagInput.replaceWith(projectTagInput.cloneNode(true));
        const newInput = document.getElementById('project-details-tag-input');
        newInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addProjectDetailsTag(projectId);
            }
        });
    }
		}

	function setupProjectDetailsTabs(projectId) {
	    const container = document.getElementById("project-details-content");
	    if (!container) return;

	    const tabsContainer = container.querySelector(".project-details-tabs");
	    if (!tabsContainer) return;

	    const detailsTab = container.querySelector("#project-details-tab");
	    const historyTab = container.querySelector("#project-history-tab");
	    if (!detailsTab || !historyTab) return;

	    const setActive = (tabName) => {
	        tabsContainer.querySelectorAll(".modal-tab").forEach((tab) => tab.classList.remove("active"));
	        container.querySelectorAll(".modal-tab-content").forEach((content) => content.classList.remove("active"));

	        const nextTab = tabsContainer.querySelector(`.modal-tab[data-tab="${tabName}"]`);
	        if (nextTab) nextTab.classList.add("active");

	        if (tabName === "history") {
	            historyTab.classList.add("active");
	            renderProjectHistory(projectId);

	            const historyContainer = historyTab.querySelector(".project-history-section");
	            if (historyContainer) historyContainer.scrollTop = 0;
	        } else {
	            detailsTab.classList.add("active");
	        }
	    };

	    tabsContainer.querySelectorAll(".modal-tab").forEach((tab) => {
	        tab.addEventListener("click", () => {
	            setActive(tab.dataset.tab);
	        });
	    });

	    setActive("details");
	}

function handleDeleteProject(projectId) {
    projectToDelete = projectId;
    deleteProject();
}

function deleteProject() {
    const projectId = projectToDelete;
    if (!projectId) return;
    
    // Check if project has tasks
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const checkbox = document.getElementById('delete-tasks-checkbox');
    
    // Find the parent div that contains the checkbox label and description
    const checkboxContainer = checkbox ? checkbox.closest('div[style*="margin: 16px"]') : null;
    
    if (checkboxContainer) {
        if (projectTasks.length === 0) {
            // Hide entire checkbox section if no tasks
            checkboxContainer.style.display = 'none';
        } else {
            // Show checkbox section if tasks exist
            checkboxContainer.style.display = 'block';
        }
    }
    
    document.getElementById('project-confirm-modal').classList.add('active');
    const projectConfirmInput = document.getElementById('project-confirm-input');
    projectConfirmInput.value = '';
    projectConfirmInput.focus();

    // Auto-convert to lowercase as user types for better UX
    const projectLowercaseHandler = function(e) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toLowerCase();
        e.target.setSelectionRange(start, end);
    };
    projectConfirmInput.addEventListener('input', projectLowercaseHandler);

    // Add keyboard support for project delete modal
    document.addEventListener('keydown', function(e) {
        const projectConfirmModal = document.getElementById('project-confirm-modal');
        if (!projectConfirmModal || !projectConfirmModal.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            e.preventDefault();
            closeProjectConfirmModal();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            confirmProjectDelete();
        }
    });

}

// Project duplication
let projectToDuplicate = null;

function handleDuplicateProject(projectId) {
    projectToDuplicate = projectId;
    const modal = document.getElementById('project-duplicate-modal');
    const project = projects.find(p => p.id === projectId);

    if (!project) return;

    // Check if project has tasks
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const includeTasksCheckbox = document.getElementById('duplicate-tasks-checkbox');
    const taskNamingOptions = document.getElementById('task-naming-options');

    // Show/hide task naming options based on whether tasks exist
    if (projectTasks.length === 0) {
        if (includeTasksCheckbox) {
            includeTasksCheckbox.checked = false;
            includeTasksCheckbox.disabled = true;
        }
        if (taskNamingOptions) taskNamingOptions.style.display = 'none';
    } else {
        if (includeTasksCheckbox) {
            includeTasksCheckbox.checked = true;
            includeTasksCheckbox.disabled = false;
        }
        if (taskNamingOptions) taskNamingOptions.style.display = 'block';
    }

    // Reset task naming options
    const noneRadio = document.querySelector('input[name="task-naming"][value="none"]');
    if (noneRadio) noneRadio.checked = true;

    const prefixInput = document.getElementById('task-prefix-input');
    const suffixInput = document.getElementById('task-suffix-input');
    if (prefixInput) {
        prefixInput.value = '';
        prefixInput.disabled = true;
    }
    if (suffixInput) {
        suffixInput.value = '';
        suffixInput.disabled = true;
    }

    // Show modal
    modal.classList.add('active');

    // Set up event listeners for checkbox and radio buttons
    if (includeTasksCheckbox) {
        includeTasksCheckbox.addEventListener('change', function() {
            if (taskNamingOptions) {
                taskNamingOptions.style.display = this.checked ? 'block' : 'none';
            }
        });
    }

    // Radio button event listeners
    const radios = document.querySelectorAll('input[name="task-naming"]');
    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (prefixInput) prefixInput.disabled = this.value !== 'prefix';
            if (suffixInput) suffixInput.disabled = this.value !== 'suffix';

            // Focus the enabled input
            if (this.value === 'prefix' && prefixInput) {
                setTimeout(() => prefixInput.focus(), 100);
            } else if (this.value === 'suffix' && suffixInput) {
                setTimeout(() => suffixInput.focus(), 100);
            }
        });
    });
}

function closeDuplicateProjectModal() {
    const modal = document.getElementById('project-duplicate-modal');
    modal.classList.remove('active');
    projectToDuplicate = null;
}

async function confirmDuplicateProject() {
    const projectId = projectToDuplicate;
    if (!projectId) return;

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const includeTasksCheckbox = document.getElementById('duplicate-tasks-checkbox');
    const includeTasks = includeTasksCheckbox && includeTasksCheckbox.checked;

    // Get task naming options
    let taskNameTransform = (name) => name; // Default: keep original

    if (includeTasks) {
        const namingMode = document.querySelector('input[name="task-naming"]:checked')?.value || 'none';

        if (namingMode === 'prefix') {
            const prefix = document.getElementById('task-prefix-input')?.value || '';
            if (prefix) {
                taskNameTransform = (name) => `${prefix}${name}`;
            }
        } else if (namingMode === 'suffix') {
            const suffix = document.getElementById('task-suffix-input')?.value || '';
            if (suffix) {
                taskNameTransform = (name) => `${name}${suffix}`;
            }
        }
    }

    // Create new project (add "Copy - " prefix to project name)
    const newProject = {
        id: projectCounter,
        name: `Copy - ${project.name}`,
        description: project.description || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        tags: project.tags ? [...project.tags] : [],
        createdAt: new Date().toISOString()
    };

    projectCounter++;
    projects.push(newProject);

    // Duplicate tasks if requested
    if (includeTasks) {
        const projectTasks = tasks.filter(t => t.projectId === projectId);

        projectTasks.forEach(task => {
            const newTask = {
                ...task,
                id: taskCounter,
                title: taskNameTransform(task.title),
                projectId: newProject.id,
                createdAt: new Date().toISOString(),
                // Deep copy arrays
                tags: task.tags ? [...task.tags] : [],
                attachments: task.attachments ? JSON.parse(JSON.stringify(task.attachments)) : []
            };

            taskCounter++;
            tasks.push(newTask);
        });
    }

    // Record history
    if (window.historyService) {
        window.historyService.recordProjectCreated(newProject);
    }

    // Close modal
    closeDuplicateProjectModal();

    // Clear cache and update UI
    projectsSortedView = null;

    // Show success notification
    showSuccessNotification(
        includeTasks
            ? t('projects.duplicate.successWithTasks', { name: newProject.name })
            : t('projects.duplicate.success', { name: newProject.name })
    );

    // Save in background
    Promise.all([
        saveProjects().catch(err => {
            console.error('Failed to save projects:', err);
            showErrorNotification(t('error.saveChangesFailed'));
        }),
        includeTasks ? saveTasks().catch(err => {
            console.error('Failed to save tasks:', err);
            showErrorNotification(t('error.saveChangesFailed'));
        }) : Promise.resolve()
    ]);

    // Navigate to the new project
    showProjectDetails(newProject.id, 'projects');
}

function backToProjects() {
    // Hide project details
    document.getElementById("project-details").classList.remove("active");

    // Show user menu again when leaving project details
    const userMenu = document.querySelector(".user-menu");
    if (userMenu) userMenu.style.display = "block";

    // Use the standard page switching mechanism
    // Ensure the URL reflects the projects route so users can bookmark/share
    try { window.location.hash = "#projects"; } catch (e) { /* ignore */ }
    showPage("projects");

    // Update sidebar navigation
    document
        .querySelectorAll(".nav-item")
        .forEach((nav) => nav.classList.remove("active"));
    document
        .querySelector('.nav-item[data-page="projects"]')
        .classList.add("active");

    // Refresh projects list to show any changes made in project details
    renderProjects();
}

function backToCalendar() {
    // Hide project details
    document.getElementById("project-details").classList.remove("active");

    // Show user menu again when leaving project details
    const userMenu = document.querySelector(".user-menu");
    if (userMenu) userMenu.style.display = "block";

    // Restore the calendar month/year the user came from (if known)
    if (calendarNavigationState && Number.isInteger(calendarNavigationState.month) && Number.isInteger(calendarNavigationState.year)) {
        currentMonth = calendarNavigationState.month;
        currentYear = calendarNavigationState.year;
        try { saveCalendarState(); } catch (e) {}
    }

    // Return to calendar and force a full render (month/year may have changed while in details)
    showCalendarView();
    renderCalendar();
}

function openTaskModalForProject(projectId) {
    openTaskModal();
    // Pre-select the project in the custom dropdown (only for this open)
    const modal = document.getElementById('task-modal');
    const hiddenProject = modal.querySelector('#hidden-project');
    const projectTextSpan = modal.querySelector('#project-current .project-text');
    const proj = projects.find(p => String(p.id) === String(projectId));
    if (hiddenProject) hiddenProject.value = String(projectId || '');
    if (projectTextSpan && proj) {
        const colorSquare = `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(proj.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`;
        projectTextSpan.innerHTML = colorSquare + escapeHtml(proj.name);
    }
    // Close any portal that might be lingering
    if (typeof hideProjectDropdownPortal === 'function') hideProjectDropdownPortal();

    // Recapture initial state after setting project
    setTimeout(() => captureInitialTaskFormState(), 150);
}

function openSettingsModal() {
      const modal = document.getElementById('settings-modal');
      if (!modal) return;
  
      const form = modal.querySelector('#settings-form');
      const userNameInput = form.querySelector('#user-name');
      const autoStartToggle = form.querySelector('#auto-start-date-toggle');
      const autoEndToggle = form.querySelector('#auto-end-date-toggle');
      const enableReviewStatusToggle = form.querySelector('#enable-review-status-toggle');
      const calendarIncludeBacklogToggle = form.querySelector('#calendar-include-backlog-toggle');
      const historySortOrderSelect = form.querySelector('#history-sort-order');
      const languageSelect = form.querySelector('#language-select');

    // Populate user name from authenticated user (KV-backed)
    const currentUser = window.authSystem?.getCurrentUser();
    userNameInput.value = currentUser?.name || '';
  
      const emailInput = form.querySelector('#user-email');
      emailInput.value = currentUser?.email || settings.notificationEmail || '';

      const emailEnabledToggle = form.querySelector('#email-notifications-enabled');
      const emailWeekdaysOnlyToggle = form.querySelector('#email-notifications-weekdays-only');
      const emailIncludeStartDatesToggle = form.querySelector('#email-notifications-include-start-dates');
      const emailIncludeBacklogToggle = form.querySelector('#email-notifications-include-backlog');
      const emailTimeInput = form.querySelector('#email-notification-time');
      const emailTimeTrigger = form.querySelector('#email-notification-time-trigger');
      const emailTimeValueEl = form.querySelector('#email-notification-time-value');
      const emailTimeZoneSelect = form.querySelector('#email-notification-timezone');
      const emailTimeZoneTrigger = form.querySelector('#email-notification-timezone-trigger');
      const emailTimeZoneValueEl = form.querySelector('#email-notification-timezone-value');
      const emailDetails = form.querySelector('#email-notification-details');

      if (emailEnabledToggle) {
          emailEnabledToggle.checked = settings.emailNotificationsEnabled !== false;
      }
      if (emailWeekdaysOnlyToggle) {
          emailWeekdaysOnlyToggle.checked = !!settings.emailNotificationsWeekdaysOnly;
      }
      if (emailIncludeStartDatesToggle) {
          emailIncludeStartDatesToggle.checked = !!settings.emailNotificationsIncludeStartDates;
      }
      if (emailIncludeBacklogToggle) {
          emailIncludeBacklogToggle.checked = !!settings.emailNotificationsIncludeBacklog;
      }
      if (emailTimeInput) {
          const snapped = snapHHMMToStep(
              normalizeHHMM(settings.emailNotificationTime) || "09:00",
              30
          );
          emailTimeInput.value = clampHHMMToRange(snapped || "09:00", "08:00", "18:00") || "09:00";
          if (emailTimeValueEl) emailTimeValueEl.textContent = emailTimeInput.value;
      }
      if (emailTimeZoneSelect) {
          emailTimeZoneSelect.value = String(settings.emailNotificationTimeZone || "Atlantic/Canary");
          if (emailTimeZoneValueEl) {
              emailTimeZoneValueEl.textContent =
                  emailTimeZoneSelect.options?.[emailTimeZoneSelect.selectedIndex]?.textContent ||
                  emailTimeZoneSelect.value ||
                  '';
          }
      }

      const applyEmailNotificationInputState = () => {
          const enabled = !!emailEnabledToggle?.checked;
          if (emailDetails) {
              emailDetails.classList.toggle('is-collapsed', !enabled);
              emailDetails.setAttribute('aria-hidden', enabled ? 'false' : 'true');
          }
          if (emailWeekdaysOnlyToggle) emailWeekdaysOnlyToggle.disabled = !enabled;
          if (emailIncludeStartDatesToggle) emailIncludeStartDatesToggle.disabled = !enabled;
          if (emailTimeInput) emailTimeInput.disabled = !enabled;
          if (emailTimeTrigger) emailTimeTrigger.disabled = !enabled;
          if (emailTimeZoneSelect) emailTimeZoneSelect.disabled = !enabled;
          if (emailTimeZoneTrigger) emailTimeZoneTrigger.disabled = !enabled;
      };
      applyEmailNotificationInputState();
  
      // Populate application settings
      if (autoStartToggle) autoStartToggle.checked = !!settings.autoSetStartDateOnStatusChange;
      if (autoEndToggle) autoEndToggle.checked = !!settings.autoSetEndDateOnStatusChange;
      if (enableReviewStatusToggle) enableReviewStatusToggle.checked = !!settings.enableReviewStatus;
      if (calendarIncludeBacklogToggle) calendarIncludeBacklogToggle.checked = !!settings.calendarIncludeBacklog;
      historySortOrderSelect.value = settings.historySortOrder;
      if (languageSelect) languageSelect.value = getCurrentLanguage();

      const logoFileInput = form.querySelector('#workspace-logo-input');
      if (logoFileInput) {
          logoFileInput.value = '';
      }

      // Reset any unsaved draft and refresh logo preview/clear button based on persisted settings
      workspaceLogoDraft.hasPendingChange = false;
      workspaceLogoDraft.dataUrl = null;
      avatarDraft.hasPendingChange = false;
      avatarDraft.dataUrl = null;
      const logoPreview = form.querySelector('#workspace-logo-preview');
      const clearButton = form.querySelector('#workspace-logo-clear-btn');
      if (logoPreview && clearButton) {
          if (settings.customWorkspaceLogo) {
              logoPreview.style.display = 'block';
              logoPreview.style.backgroundImage = `url(${settings.customWorkspaceLogo})`;
              clearButton.style.display = 'inline-flex';
          } else {
              logoPreview.style.display = 'none';
              logoPreview.style.backgroundImage = '';
              clearButton.style.display = 'none';
          }
      }

      // Also refresh workspace logo UI to update dropzone text ("Change logo" vs default)
      // Note: setupWorkspaceLogoControls has its own refreshWorkspaceLogoUI function in its scope
      // So we trigger it indirectly by dispatching an event or calling it directly if available
      const refreshLogoEvent = new CustomEvent('refresh-workspace-logo-ui');
      document.dispatchEvent(refreshLogoEvent);

      const avatarFileInput = form.querySelector('#user-avatar-input');
      if (avatarFileInput) {
          avatarFileInput.value = '';
      }
      refreshUserAvatarSettingsUI();

      // Capture initial settings form state for dirty-checking
      window.initialSettingsFormState = {
          userName: userNameInput.value || '',
          notificationEmail: emailInput.value || '',
          emailNotificationsEnabled: !!(emailEnabledToggle?.checked),
          emailNotificationsWeekdaysOnly: !!(emailWeekdaysOnlyToggle?.checked),
          emailNotificationsIncludeStartDates: !!(emailIncludeStartDatesToggle?.checked),
          emailNotificationsIncludeBacklog: !!(emailIncludeBacklogToggle?.checked),
          emailNotificationTime: emailTimeInput?.value || '',
          emailNotificationTimeZone: emailTimeZoneSelect?.value || '',
          autoSetStartDateOnStatusChange: !!settings.autoSetStartDateOnStatusChange,
          autoSetEndDateOnStatusChange: !!settings.autoSetEndDateOnStatusChange,
          enableReviewStatus: !!settings.enableReviewStatus,
          calendarIncludeBacklog: !!(calendarIncludeBacklogToggle?.checked),
          historySortOrder: settings.historySortOrder || 'newest',
          language: getCurrentLanguage(),
          logoState: settings.customWorkspaceLogo ? 'logo-set' : 'logo-none',
          avatarState: (window.authSystem?.getCurrentUser?.()?.avatarDataUrl ? 'avatar-set' : 'avatar-none')
      };

      // Reset save button dirty state
      const saveBtn = form.querySelector('.settings-btn-save');
      if (saveBtn) {
          saveBtn.classList.remove('dirty');
          saveBtn.disabled = true;
      }

      // Bind change listeners once to track dirtiness
      if (!form.__settingsDirtyBound) {
          form.__settingsDirtyBound = true;

          const markDirtyIfNeeded = () => {
              if (!window.initialSettingsFormState) return;

              const currentLogoState = workspaceLogoDraft.hasPendingChange
                  ? 'draft-changed'
                  : (settings.customWorkspaceLogo ? 'logo-set' : 'logo-none');

              const currentAvatarState = avatarDraft.hasPendingChange
                  ? 'draft-changed'
                  : (window.authSystem?.getCurrentUser?.()?.avatarDataUrl ? 'avatar-set' : 'avatar-none');

              const current = {
                  userName: userNameInput.value || '',
                  notificationEmail: emailInput.value || '',
                  emailNotificationsEnabled: !!(emailEnabledToggle?.checked),
                  emailNotificationsWeekdaysOnly: !!(emailWeekdaysOnlyToggle?.checked),
                  emailNotificationsIncludeStartDates: !!(emailIncludeStartDatesToggle?.checked),
                  emailNotificationsIncludeBacklog: !!(emailIncludeBacklogToggle?.checked),
                  emailNotificationTime: emailTimeInput?.value || '',
                  emailNotificationTimeZone: emailTimeZoneSelect?.value || '',
                  autoSetStartDateOnStatusChange: !!autoStartToggle?.checked,
                  autoSetEndDateOnStatusChange: !!autoEndToggle?.checked,
                  enableReviewStatus: !!enableReviewStatusToggle?.checked,
                  calendarIncludeBacklog: !!(calendarIncludeBacklogToggle?.checked),
                  historySortOrder: historySortOrderSelect.value,
                  language: languageSelect?.value || getCurrentLanguage(),
                  logoState: currentLogoState,
                  avatarState: currentAvatarState
              };

              const isDirty =
                  current.userName !== window.initialSettingsFormState.userName ||
                  current.notificationEmail !== window.initialSettingsFormState.notificationEmail ||
                  current.emailNotificationsEnabled !== window.initialSettingsFormState.emailNotificationsEnabled ||
                  current.emailNotificationsWeekdaysOnly !== window.initialSettingsFormState.emailNotificationsWeekdaysOnly ||
                  current.emailNotificationsIncludeBacklog !== window.initialSettingsFormState.emailNotificationsIncludeBacklog ||
                  current.emailNotificationsIncludeStartDates !== window.initialSettingsFormState.emailNotificationsIncludeStartDates ||
                  current.emailNotificationTime !== window.initialSettingsFormState.emailNotificationTime ||
                  current.emailNotificationTimeZone !== window.initialSettingsFormState.emailNotificationTimeZone ||
                  current.autoSetStartDateOnStatusChange !== window.initialSettingsFormState.autoSetStartDateOnStatusChange ||
                  current.autoSetEndDateOnStatusChange !== window.initialSettingsFormState.autoSetEndDateOnStatusChange ||
                  current.enableReviewStatus !== window.initialSettingsFormState.enableReviewStatus ||
                  current.calendarIncludeBacklog !== window.initialSettingsFormState.calendarIncludeBacklog ||
                  current.historySortOrder !== window.initialSettingsFormState.historySortOrder ||
                  current.language !== window.initialSettingsFormState.language ||
                  current.logoState !== window.initialSettingsFormState.logoState ||
                  current.avatarState !== window.initialSettingsFormState.avatarState;

              if (saveBtn) {
                  if (isDirty) {
                      saveBtn.classList.add('dirty');
                      saveBtn.disabled = false;
                  } else {
                      saveBtn.classList.remove('dirty');
                      saveBtn.disabled = true;
                  }
              }

              window.settingsFormIsDirty = isDirty;
          };

          // Expose for logo controls to call after async updates
          window.markSettingsDirtyIfNeeded = markDirtyIfNeeded;

          // Listen to relevant inputs
          [userNameInput, emailInput, emailEnabledToggle, emailWeekdaysOnlyToggle, emailIncludeBacklogToggle, emailIncludeStartDatesToggle, emailTimeInput, emailTimeZoneSelect, autoStartToggle, autoEndToggle, enableReviewStatusToggle, calendarIncludeBacklogToggle, historySortOrderSelect, languageSelect, logoFileInput, avatarFileInput]
              .filter(Boolean)
              .forEach(el => {
                  el.addEventListener('change', markDirtyIfNeeded);
                  if (el.tagName === 'INPUT' && el.type === 'text' || el.type === 'email') {
                      el.addEventListener('input', markDirtyIfNeeded);
                  }
              });

          if (emailEnabledToggle && !emailEnabledToggle.__emailInputsBound) {
              emailEnabledToggle.__emailInputsBound = true;
              emailEnabledToggle.addEventListener('change', () => {
                  applyEmailNotificationInputState();
              });
          }

          if (emailTimeTrigger && !emailTimeTrigger.__notificationTimeBound) {
              emailTimeTrigger.__notificationTimeBound = true;
              emailTimeTrigger.addEventListener('click', (evt) => {
                  evt.preventDefault();
                  evt.stopPropagation();
                  const enabled = !!emailEnabledToggle?.checked;
                  if (!enabled) return;
                  const isOpen = notificationTimePortalEl && notificationTimePortalEl.style.display !== 'none';
                  if (isOpen) {
                      hideNotificationTimePortal();
                      return;
                  }
                  showNotificationTimePortal(emailTimeTrigger, emailTimeInput, emailTimeValueEl);
              });
          }

          if (emailTimeZoneTrigger && emailTimeZoneSelect && !emailTimeZoneTrigger.__notificationTimeZoneBound) {
              emailTimeZoneTrigger.__notificationTimeZoneBound = true;
              emailTimeZoneTrigger.addEventListener('click', (evt) => {
                  evt.preventDefault();
                  evt.stopPropagation();
                  const enabled = !!emailEnabledToggle?.checked;
                  if (!enabled) return;
                  const isOpen = notificationTimeZonePortalEl && notificationTimeZonePortalEl.style.display !== 'none';
                  if (isOpen) {
                      hideNotificationTimeZonePortal();
                      return;
                  }
                  showNotificationTimeZonePortal(emailTimeZoneTrigger, emailTimeZoneSelect, emailTimeZoneValueEl);
              });
          }

          if (emailTimeZoneSelect && emailTimeZoneValueEl && !emailTimeZoneSelect.__timezoneValueBound) {
              emailTimeZoneSelect.__timezoneValueBound = true;
              emailTimeZoneSelect.addEventListener('change', () => {
                  emailTimeZoneValueEl.textContent =
                      emailTimeZoneSelect.options?.[emailTimeZoneSelect.selectedIndex]?.textContent ||
                      emailTimeZoneSelect.value ||
                      '';
              });
          }
  }
  
      modal.classList.add('active');

      // Always reset scroll position to top when opening settings
      const body = modal.querySelector('.settings-modal-body');
      if (body) body.scrollTop = 0;
    
    // Add reset PIN button event listener (only once using delegation)
    const resetPinBtn = modal.querySelector('#reset-pin-btn');
    if (resetPinBtn && !resetPinBtn.dataset.listenerAttached) {
        resetPinBtn.dataset.listenerAttached = 'true';
        resetPinBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetPINFlow();
        });
    }
}

// Simplified user menu setup
function closeUserDropdown() {
    const dropdown = document.getElementById("shared-user-dropdown");
    if (dropdown) {
        dropdown.classList.remove("active");
    }
}

function setupUserMenus() {
    const avatar = document.getElementById("shared-user-avatar");
    const dropdown = document.getElementById("shared-user-dropdown");

    if (avatar && dropdown) {
        // Remove any existing listener by cloning and replacing
        const newAvatar = avatar.cloneNode(true);
        avatar.parentNode.replaceChild(newAvatar, avatar);

        // Add fresh listener
        newAvatar.addEventListener("click", function (e) {
            e.stopPropagation();
            closeNotificationDropdown();
            dropdown.classList.toggle("active");
        });
    }
}

function updateUserDisplay(name, avatarDataUrl) {
    const nameEl = document.querySelector(".user-name");
    const avatarEl = document.getElementById("shared-user-avatar");

    if (nameEl) nameEl.textContent = name;
    
    // Update avatar initials
    if (avatarEl) {
        const parts = name.split(" ").filter(Boolean);
        let initials = "NL";
        if (parts.length > 0) {
            if (parts.length === 1) {
                initials = parts[0].slice(0, 2).toUpperCase();
            } else {
                initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
        }

        if (avatarDataUrl) {
            avatarEl.classList.add('has-image');
            avatarEl.style.backgroundImage = `url(${avatarDataUrl})`;
            avatarEl.textContent = '';
        } else {
            avatarEl.classList.remove('has-image');
            avatarEl.style.backgroundImage = '';
            avatarEl.textContent = initials;
        }
    }
}

function hydrateUserProfile() {
    // Get current user from auth system
    const currentUser = window.authSystem?.getCurrentUser();
    if (!currentUser) return; // Not logged in yet

    updateUserDisplay(currentUser.name, currentUser.avatarDataUrl);

    const emailEl = document.querySelector(".user-email");
    if (emailEl) emailEl.textContent = currentUser.email || currentUser.username;
}

function normalizeTaskModalAttachmentUI() {
    const addLinkBtn = document.querySelector('#task-modal [data-action="addAttachment"]');
    if (addLinkBtn) addLinkBtn.textContent = t('tasks.modal.addLink');
}

// Close dropdown when clicking outside
document.addEventListener("click", function (event) {
    const clickedInUserMenu = event.target.closest(".user-menu");
    if (!clickedInUserMenu) {
        closeUserDropdown();
    }
    const clickedInNotifyMenu = event.target.closest(".notify-menu");
    if (!clickedInNotifyMenu) {
        closeNotificationDropdown();
    }
});

function updateLogos() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const logoSrc = isDark ? "Nautilus_logo.png" : "Nautilus_logo_light.png";

    // Update all logo images (regular logos and boot splash logos)
    document.querySelectorAll('img.logo, img[class*="boot-logo"]').forEach(logo => {
        logo.src = logoSrc;
    });
}

function updateThemeMenuText() {
    const themeText = document.getElementById("theme-text");
    if (!themeText) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    themeText.textContent = isDark ? t('menu.lightMode') : t('menu.darkMode');
}

function toggleTheme() {
    const root = document.documentElement;

    if (root.getAttribute("data-theme") === "dark") {
        root.removeAttribute("data-theme");
        localStorage.setItem("theme", "light");
    } else {
        root.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
    }

    updateThemeMenuText();

    // Update logos for the new theme
    updateLogos();

    // Refresh calendar bars to update colors for new theme
    if (typeof reflowCalendarBars === 'function') {
        reflowCalendarBars();
    }
}

// Load saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
}
updateThemeMenuText();

// Set correct logos on initial page load
updateLogos();


// Resizable sidebar functionality
let isResizing = false;

document.querySelector(".resizer").addEventListener("mousedown", function (e) {
    isResizing = true;
    this.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    e.preventDefault();
});

document.addEventListener("mousemove", function (e) {
    if (!isResizing) return;

    const sidebar = document.querySelector(".sidebar");
    const newWidth = e.clientX;

    if (newWidth >= 200 && newWidth <= 500) {
        sidebar.style.width = newWidth + "px";
    }
});

document.addEventListener("mouseup", function () {
    if (isResizing) {
        isResizing = false;
        document.querySelector(".resizer").classList.remove("dragging");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }
});

function updateProjectField(projectId, field, value, options) {
    const opts = options || {};
    const shouldRender = opts.render !== false;

    // 1. CORRECCIÓN DE FORMATO: Convertir fecha de dd/mm/yyyy a yyyy-mm-dd
    let updatedValue = value;
    if (field === 'startDate' || field === 'endDate') {
        // Si el valor parece una fecha dd/mm/yyyy, la convertimos a ISO para guardarla
        if (looksLikeDMY(value)) {
            updatedValue = toISOFromDMY(value);
        }
    }

    // Capture old project state for history tracking
    const oldProject = projects.find(p => p.id === projectId);
    const oldProjectCopy = oldProject ? JSON.parse(JSON.stringify(oldProject)) : null;

    // Avoid unnecessary rerenders/saves when the value didn't actually change
    if (oldProject) {
        const prev = oldProject[field];
        const prevStr = typeof prev === 'string' ? prev : (prev || '');
        const nextStr = typeof updatedValue === 'string' ? updatedValue : (updatedValue || '');
        if (prevStr === nextStr) return;
    }

    // Use project service to update field
    const result = updateProjectFieldService(projectId, field, updatedValue, projects);

    if (result.project) {
        projects = result.projects;
        const project = result.project;

        // Set updatedAt timestamp
        project.updatedAt = new Date().toISOString();

        // Clear sorted view cache to force refresh with updated project
        projectsSortedView = null;

        // Record history for project update
        if (window.historyService && oldProjectCopy) {
            window.historyService.recordProjectUpdated(oldProjectCopy, project);
        }

        // Update UI immediately (optimistic update)
        if (shouldRender) showProjectDetails(projectId);

        // Always refresh calendar bars if the calendar is visible (date changes affect layout)
        if (document.getElementById('calendar-view')?.classList.contains('active')) {
            reflowCalendarBars();
        }

        // Save in background (don't block UI)
        saveProjects().catch(err => {
            console.error('Failed to save project field:', err);
            showErrorNotification(t('error.saveChangesFailed'));
        });
    }
}

// Expose for any inline handlers (HTML attribute callbacks run in global scope even when app.js is a module)
window.updateProjectField = updateProjectField;
window.debouncedUpdateProjectField = typeof debouncedUpdateProjectField === 'function' ? debouncedUpdateProjectField : undefined;
window.flushDebouncedProjectField = typeof flushDebouncedProjectField === 'function' ? flushDebouncedProjectField : undefined;

// Re-render calendar if the view is active, used after date changes
function maybeRefreshCalendar() {
    const calendarActive = document.getElementById('calendar-view')?.classList.contains('active');
    if (calendarActive) {
        // Re-render to recompute rows/tracks and spacer heights
        renderCalendar();
    }
}

function showCalendarView() {
    // Track whether we're already on the calendar sub-view
    const alreadyOnCalendar =
        document.getElementById('tasks')?.classList.contains('active') &&
        document.getElementById('calendar-view')?.classList.contains('active');

    // Update URL hash to calendar for bookmarking (avoid redundant hashchange)
    if (window.location.hash !== '#calendar') {
        window.location.hash = 'calendar';
    }

    // Only switch page if not already on tasks page
    if (!document.getElementById('tasks')?.classList.contains('active')) {
        showPage("tasks");
    }

    // Keep Calendar highlighted in sidebar (not All Tasks)
    document
        .querySelectorAll(".nav-item")
        .forEach((nav) => nav.classList.remove("active"));
    document.querySelector(".nav-item.calendar-nav").classList.add("active");

    // Hide the view toggle when accessing from Calendar nav
    const viewToggle = document.querySelector(".view-toggle");
    if (viewToggle) viewToggle.classList.add("hidden");

    // Hide kanban settings in calendar view
    const kanbanSettingsContainer = document.getElementById('kanban-settings-btn')?.parentElement;
    if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = 'none';

    // Hide backlog button in calendar view (only show in Kanban)
    const backlogBtn = document.getElementById('backlog-quick-btn');
    if (backlogBtn) backlogBtn.style.display = 'none';

    // Hide other views and show calendar (idempotent)
    const kanban = document.querySelector(".kanban-board");
    const list = document.getElementById("list-view");
    const calendar = document.getElementById("calendar-view");
    if (kanban && !kanban.classList.contains('hidden')) kanban.classList.add('hidden');
    if (list && list.classList.contains('active')) list.classList.remove('active');
    if (calendar && !calendar.classList.contains('active')) calendar.classList.add('active');

    // mark header so the Add Task button aligns left like in Projects
    try{ document.querySelector('.kanban-header')?.classList.add('calendar-mode'); }catch(e){}

    // Update page title to "Calendar" on desktop
    const pageTitle = document.querySelector('#tasks .page-title');
    if (pageTitle) pageTitle.textContent = 'Calendar';

    // If we were already on calendar, just reflow bars to avoid flicker
    if (alreadyOnCalendar) {
        reflowCalendarBars();
    } else {
        renderCalendar();
    }
    // Make sure UI chrome (sort toggle) reflects the calendar state
    try { updateSortUI(); } catch (e) {}
}

// Lightweight refresh that only recomputes and draws project bars/spacers
function reflowCalendarBars() {
    if (!document.getElementById('calendar-view')?.classList.contains('active')) return;
    requestAnimationFrame(() => requestAnimationFrame(renderProjectBars));
}


function migrateDatesToISO() {
    let touched = false;

    tasks.forEach((t) => {
        if (t.startDate && looksLikeDMY(t.startDate)) {
            t.startDate = toISOFromDMY(t.startDate);
            touched = true;
        }
        if (t.endDate && looksLikeDMY(t.endDate)) {
            t.endDate = toISOFromDMY(t.endDate);
            touched = true;
        }
    });

    projects.forEach((p) => {
        if (p.startDate && looksLikeDMY(p.startDate)) {
            p.startDate = toISOFromDMY(p.startDate);
            touched = true;
        }
        if (p.endDate && looksLikeDMY(p.endDate)) {
            p.endDate = toISOFromDMY(p.endDate);
            touched = true;
        }
    });

    if (touched) persistAll();
}

async function addFeedbackItem() {
    const typeRadio = document.querySelector('input[name="feedback-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'bug';
    const description = document.getElementById('feedback-description').value.trim();
    const screenshotUrl = currentFeedbackScreenshotData || '';

    if (!description) return;

    const item = {
        id: feedbackCounter++,
        type: type,
        description: description,
        screenshotUrl: screenshotUrl,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'open'
    };

    feedbackItems.unshift(item);
    feedbackIndex.unshift(item.id);
    feedbackRevision++;
    document.getElementById('feedback-description').value = '';
    clearFeedbackScreenshot();

    // Update UI immediately (optimistic update)
    updateCounts();
    renderFeedback();

    // Save in background (delta + queued)
    enqueueFeedbackDelta({ action: 'add', item });
}


// Add enter key support for feedback and initialize screenshot attachments
document.addEventListener('DOMContentLoaded', function() {
    // Initialize feedback type dropdown
    const feedbackTypeBtn = document.getElementById('feedback-type-btn');
    const feedbackTypeGroup = document.getElementById('feedback-type-group');
    const feedbackTypeLabel = document.getElementById('feedback-type-label');

    updateFeedbackSaveStatus();
    window.addEventListener('online', () => {
        updateFeedbackSaveStatus();
        scheduleFeedbackDeltaFlush(0);
    });
    window.addEventListener('offline', updateFeedbackSaveStatus);

    if (feedbackTypeBtn && feedbackTypeGroup) {
        feedbackTypeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            feedbackTypeGroup.classList.toggle('open');
        });

        const typeRadios = document.querySelectorAll('input[name="feedback-type"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const labelMap = {
                    bug: t('feedback.type.bugLabel'),
                    idea: t('feedback.type.improvementOption')
                };
                const selectedLabel = labelMap[this.value] || this.closest('label').textContent.trim();
                feedbackTypeLabel.textContent = selectedLabel;
                feedbackTypeGroup.classList.remove('open');
            });
        });

        document.addEventListener('click', function(e) {
            if (!feedbackTypeGroup.contains(e.target)) {
                feedbackTypeGroup.classList.remove('open');
            }
        });
    }

    const feedbackInput = document.getElementById('feedback-description');
    if (feedbackInput) {
        feedbackInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addFeedbackItem();
            }
        });

        // Allow pasting images directly into the feedback description
        feedbackInput.addEventListener('paste', function(e) {
            if (!e.clipboardData) return;
            const file = Array.from(e.clipboardData.files || [])[0];
            if (file && file.type && file.type.startsWith('image/')) {
                e.preventDefault();
                handleFeedbackImageFile(file);
            }
        });
    }

    const screenshotInput = document.getElementById('feedback-screenshot-url');
    const screenshotFileInput = document.getElementById('feedback-screenshot-file');
    const screenshotButton = document.getElementById('feedback-screenshot-upload');

    const isMobileScreen = (typeof window.matchMedia === 'function')
        ? window.matchMedia('(max-width: 768px)').matches
        : window.innerWidth <= 768;
    const screenshotDefaultText = isMobileScreen
        ? t('feedback.screenshotDropzoneTap')
        : t('feedback.screenshotDropzoneDefault');

    if (screenshotInput) {
        screenshotInput.textContent = screenshotDefaultText;
        screenshotInput.classList.add('feedback-screenshot-dropzone');
        screenshotInput.dataset.defaultText = screenshotDefaultText;
    }

    let screenshotPreview = document.getElementById('feedback-screenshot-preview');
    if (!screenshotPreview) {
        const feedbackBar = document.querySelector('#feedback .feedback-input-bar');
        if (feedbackBar && feedbackBar.parentNode) {
            screenshotPreview = document.createElement('div');
            screenshotPreview.id = 'feedback-screenshot-preview';
            feedbackBar.parentNode.insertBefore(screenshotPreview, feedbackBar.nextSibling);
        }
    }

    function handleDropOrPasteFileList(fileList, event) {
        if (!fileList || fileList.length === 0) return;
        const file = fileList[0];
        if (!file.type || !file.type.startsWith('image/')) {
            if (typeof showErrorNotification === 'function') {
                showErrorNotification(t('error.feedbackAttachImage'));
            }
            return;
        }
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        handleFeedbackImageFile(file);
    }

    if (screenshotInput) {
        // Drag-and-drop support on the screenshot field
        screenshotInput.addEventListener('dragover', function(e) {
            e.preventDefault();
            screenshotInput.classList.add('feedback-screenshot-dragover');
        });

        screenshotInput.addEventListener('dragleave', function(e) {
            e.preventDefault();
            screenshotInput.classList.remove('feedback-screenshot-dragover');
        });

        screenshotInput.addEventListener('drop', function(e) {
            screenshotInput.classList.remove('feedback-screenshot-dragover');
            const files = e.dataTransfer && e.dataTransfer.files;
            handleDropOrPasteFileList(files, e);
        });

        // Paste images into the screenshot field
        screenshotInput.addEventListener('paste', function(e) {
            if (!e.clipboardData) return;
            const files = e.clipboardData.files;
            if (files && files.length > 0) {
                handleDropOrPasteFileList(files, e);
            }
        });

        // Click / keyboard to open file picker
        screenshotInput.addEventListener('click', function() {
            if (screenshotFileInput) {
                screenshotFileInput.click();
            }
        });
        screenshotInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (screenshotFileInput) {
                    screenshotFileInput.click();
                }
            }
        });
    }

    if (screenshotButton) {
        // Hide legacy separate button, the dropzone now handles click
        screenshotButton.style.display = 'none';
    }

    if (screenshotFileInput) {
        screenshotFileInput.addEventListener('change', function(e) {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleDropOrPasteFileList(files, e);
            }
            // Reset so selecting the same file again will still fire change
            screenshotFileInput.value = '';
        });
    }
});

function handleFeedbackImageFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        const dataUrl = ev.target && ev.target.result;
        if (!dataUrl) return;
        currentFeedbackScreenshotData = dataUrl;

        const screenshotInput = document.getElementById('feedback-screenshot-url');
        if (screenshotInput && screenshotInput.dataset) {
            screenshotInput.dataset.hasInlineImage = 'true';
        }

        const preview = document.getElementById('feedback-screenshot-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="feedback-screenshot-preview-card">
                    <div class="feedback-screenshot-thumb">
                        <img src="${dataUrl}" alt="${t('feedback.screenshotPreviewAlt')}">
                    </div>
                    <div class="feedback-screenshot-meta">
                        <div class="feedback-screenshot-title">${t('feedback.screenshotPreviewTitle')}</div>
                        <div class="feedback-screenshot-subtitle">${t('feedback.screenshotPreviewSubtitle')}</div>
                    </div>
                    <button type="button" class="feedback-screenshot-remove">${t('feedback.screenshotRemove')}</button>
                </div>
            `;

            preview.style.display = 'flex';

            const thumb = preview.querySelector('.feedback-screenshot-thumb');
            if (thumb && typeof viewImageLegacy === 'function') {
                thumb.onclick = function() {
                    viewImageLegacy(dataUrl, 'Feedback Screenshot');
                };
            }

            const removeBtn = preview.querySelector('.feedback-screenshot-remove');
            if (removeBtn) {
                removeBtn.onclick = function(e) {
                    e.preventDefault();
                    clearFeedbackScreenshot();
                };
            }
        }
    };
    reader.onerror = function() {
        if (typeof showErrorNotification === 'function') {
            showErrorNotification(t('error.feedbackReadImage'));
        }
    };
    reader.readAsDataURL(file);
}

function clearFeedbackScreenshot() {
    currentFeedbackScreenshotData = "";
    const screenshotInput = document.getElementById('feedback-screenshot-url');
    if (screenshotInput) {
        const defaultText = screenshotInput.dataset.defaultText || t('feedback.screenshotDropzoneDefault');
        screenshotInput.textContent = defaultText;
        if (screenshotInput.dataset) {
            delete screenshotInput.dataset.hasInlineImage;
        }
    }
    const preview = document.getElementById('feedback-screenshot-preview');
    if (preview) {
        preview.innerHTML = '';
        preview.style.display = 'none';
    }
}



function toggleFeedbackItem(id) {
    const item = feedbackItems.find(f => f.id === id);
    if (!item) return;

    // Store old state for rollback
    const oldStatus = item.status;
    const changeRevision = ++feedbackRevision;

    // Optimistic update: change state immediately
    item.status = item.status === 'open' ? 'done' : 'open';
    updateCounts();
    renderFeedback(); // Update UI instantly - lightweight feedback-only render

    // Save in background (delta + queued)
    enqueueFeedbackDelta(
        { action: 'update', item: { id: item.id, status: item.status } },
        {
            onError: () => {
                // Only rollback if nothing else changed after this action.
                if (feedbackRevision !== changeRevision) return;
                item.status = oldStatus;
                updateCounts();
                renderFeedback();
                showErrorNotification(t('error.feedbackStatusFailed'));
            }
        }
    );
}

function renderFeedback() {
    const pendingContainer = document.getElementById('feedback-list-pending');
    const doneContainer = document.getElementById('feedback-list-done');
    if (!pendingContainer || !doneContainer) return;

    const typeIcons = {
        bug: '\u{1F41E}',
        improvement: '\u{1F4A1}',
        // Legacy values for backward compatibility
        feature: '\u{1F4A1}',
        idea: '\u{1F4A1}'
    };

    const pendingItems = feedbackItems.filter(f => f.status === 'open');
    const doneItems = feedbackItems.filter(f => f.status === 'done');

    // Pagination calculations for pending items
    const pendingTotalPages = Math.ceil(pendingItems.length / FEEDBACK_ITEMS_PER_PAGE);
    if (feedbackPendingPage > pendingTotalPages && pendingTotalPages > 0) {
        feedbackPendingPage = pendingTotalPages;
    }
    const pendingStartIndex = (feedbackPendingPage - 1) * FEEDBACK_ITEMS_PER_PAGE;
    const pendingEndIndex = pendingStartIndex + FEEDBACK_ITEMS_PER_PAGE;
    const pendingPageItems = pendingItems.slice(pendingStartIndex, pendingEndIndex);

    // Pagination calculations for done items
    const doneTotalPages = Math.ceil(doneItems.length / FEEDBACK_ITEMS_PER_PAGE);
    if (feedbackDonePage > doneTotalPages && doneTotalPages > 0) {
        feedbackDonePage = doneTotalPages;
    }
    const doneStartIndex = (feedbackDonePage - 1) * FEEDBACK_ITEMS_PER_PAGE;
    const doneEndIndex = doneStartIndex + FEEDBACK_ITEMS_PER_PAGE;
    const donePageItems = doneItems.slice(doneStartIndex, doneEndIndex);

    // Render pending items
    if (pendingItems.length === 0) {
        pendingContainer.innerHTML = `<div class="empty-state" style="padding: 20px;"><p>${t('feedback.empty.pending')}</p></div>`;
    } else {
        pendingContainer.innerHTML = pendingPageItems.map(item => `
            <div class="feedback-item ${item.status === 'done' ? 'done' : ''}">
                <input type="checkbox" class="feedback-checkbox"
                       data-feedback-id="${item.id}"
                       ${item.status === 'done' ? 'checked' : ''}>
                <span class="feedback-type-icon">${typeIcons[item.type] || '\u{1F4A1}'}</span>
                ${item.screenshotUrl ? `<button type="button" class="feedback-screenshot-link" data-action="viewFeedbackScreenshot" data-param="${encodeURIComponent(item.screenshotUrl)}" title="${t('feedback.viewScreenshotTitle')}">\u{1F5BC}\u{FE0F}</button>` : ''}
                <div class="feedback-description">${escapeHtml(item.description)}</div>
                <div class="feedback-date">${formatDate(item.createdAt)}</div>
                <button class="feedback-delete-btn" data-action="deleteFeedbackItemWithStop" data-param="${item.id}">❌</button>
            </div>
        `).join('');
    }

    // Render pagination controls for pending items
    renderFeedbackPagination('pending', pendingItems.length, pendingTotalPages, feedbackPendingPage);

    // Render done items
    if (doneItems.length === 0) {
        doneContainer.innerHTML = `<div class="empty-state" style="padding: 20px;"><p>${t('feedback.empty.done')}</p></div>`;
    } else {
        doneContainer.innerHTML = donePageItems.map(item => `
            <div class="feedback-item done">
                <input type="checkbox" class="feedback-checkbox"
                       data-feedback-id="${item.id}"
                       checked>
                <span class="feedback-type-icon">${typeIcons[item.type] || '\u{1F4A1}'}</span>
                ${item.screenshotUrl ? `<button type="button" class="feedback-screenshot-link" data-action="viewFeedbackScreenshot" data-param="${encodeURIComponent(item.screenshotUrl)}" title="${t('feedback.viewScreenshotTitle')}">\u{1F5BC}\u{FE0F}</button>` : ''}
                <div class="feedback-description">${escapeHtml(item.description)}</div>
                <div class="feedback-date">${formatDate(item.createdAt)}</div>
                <button class="feedback-delete-btn" data-action="deleteFeedbackItemWithStop" data-param="${item.id}">❌</button>
            </div>
        `).join('');
    }

    // Render pagination controls for done items
    renderFeedbackPagination('done', doneItems.length, doneTotalPages, feedbackDonePage);
}

function renderFeedbackPagination(section, totalItems, totalPages, currentPage) {
    const containerId = section === 'pending' ? 'feedback-pagination-pending' : 'feedback-pagination-done';
    const container = document.getElementById(containerId);
    if (!container) return;

    // Hide pagination if there's only one page or no items
    if (totalPages <= 1) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    const startItem = (currentPage - 1) * FEEDBACK_ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * FEEDBACK_ITEMS_PER_PAGE, totalItems);

    let paginationHTML = `
        <div class="feedback-pagination-info">
            ${t('feedback.pagination.showing', { start: startItem, end: endItem, total: totalItems })}
        </div>
        <div class="feedback-pagination-controls">
            <button
                class="feedback-pagination-btn"
                onclick="changeFeedbackPage('${section}', 1)"
                ${currentPage === 1 ? 'disabled' : ''}
                title="${t('feedback.pagination.first')}">
                &laquo;
            </button>
            <button
                class="feedback-pagination-btn"
                onclick="changeFeedbackPage('${section}', ${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}
                title="${t('feedback.pagination.prev')}">
                &lsaquo;
            </button>
            <span class="feedback-pagination-page">
                ${t('feedback.pagination.pageOf', { current: currentPage, total: totalPages })}
            </span>
            <button
                class="feedback-pagination-btn"
                onclick="changeFeedbackPage('${section}', ${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}
                title="${t('feedback.pagination.next')}">
                &rsaquo;
            </button>
            <button
                class="feedback-pagination-btn"
                onclick="changeFeedbackPage('${section}', ${totalPages})"
                ${currentPage === totalPages ? 'disabled' : ''}
                title="${t('feedback.pagination.last')}">
                &raquo;
            </button>
        </div>
    `;

    container.innerHTML = paginationHTML;
}

function changeFeedbackPage(section, newPage) {
    const scrollContainer = document.querySelector('#feedback .page-content');
    const activeEl = document.activeElement;
    const wasPaginationClick = !!(activeEl && activeEl.classList && activeEl.classList.contains('feedback-pagination-btn'));
    const wasNearBottom = !!(scrollContainer && (scrollContainer.scrollHeight - (scrollContainer.scrollTop + scrollContainer.clientHeight) < 80));

    if (section === 'pending') {
        feedbackPendingPage = newPage;
    } else {
        feedbackDonePage = newPage;
    }
    renderFeedback();

    // Keep pagination usable when switching between short/long pages.
    // If the user was at (or near) the bottom, anchor them back to the pagination controls.
    const paginationId = section === 'pending' ? 'feedback-pagination-pending' : 'feedback-pagination-done';
    const sectionId = section === 'pending' ? 'feedback-list-pending' : 'feedback-list-done';
    const targetId = (wasPaginationClick || wasNearBottom) ? paginationId : sectionId;
    const target = document.getElementById(targetId);
    if (target) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: targetId === paginationId ? 'end' : 'start'
                });
            });
        });
    }
}

// Expose to window for onclick handlers
window.changeFeedbackPage = changeFeedbackPage;

// === History Rendering - Inline for Tasks and Projects ===

// Modal tab switching
function setupModalTabs() {
    document.querySelectorAll('.modal-content .modal-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            const modalContent = e.target.closest('.modal-content');
            if (!modalContent) return;

            // Preserve the current task modal size when switching to History (desktop),
            // so the modal doesn't shrink just because History has less content.
            try {
                const isTaskModal = !!modalContent.closest('#task-modal');
                if (isTaskModal) {
                    const footer = modalContent.querySelector('#task-footer');
                    const inEditMode = footer && window.getComputedStyle(footer).display === 'none';
                    if (inEditMode) {
                        if (tabName === 'history') {
                            const h = Math.round(modalContent.getBoundingClientRect().height);
                            if (h > 0) {
                                modalContent.style.minHeight = `${h}px`;
                                modalContent.style.maxHeight = `${h}px`;
                            }
                        } else if (tabName === 'general' || tabName === 'details') {
                            modalContent.style.minHeight = '';
                            modalContent.style.maxHeight = '';
                        }
                    }
                }
            } catch (err) {}

            // Update tab buttons
            modalContent.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            // Mobile: Handle General/Details tab switching (on same content)
            if (tabName === 'general' || tabName === 'details') {
                // Both tabs show the same content (task-details-tab with different fields visible)
                const taskDetailsTab = modalContent.querySelector('#task-details-tab');
                const taskHistoryTab = modalContent.querySelector('#task-history-tab');

                // Only handle mobile tab switching if we have history tab (means modal is open)
                if (taskDetailsTab && taskHistoryTab) {
                    // Make sure details tab is active
                    modalContent.querySelectorAll('.modal-tab-content').forEach(content => {
                        content.classList.remove('active');
                    });
                    taskDetailsTab.classList.add('active');

                    // Toggle body class to show/hide appropriate fields
                    if (tabName === 'details') {
                        document.body.classList.add('mobile-tab-details-active');
                    } else {
                        document.body.classList.remove('mobile-tab-details-active');
                    }
                    return; // Don't run the rest of the tab switching logic
                }
            }

            // Remove mobile tab class when switching to History
            document.body.classList.remove('mobile-tab-details-active');

            // Update tab content
            modalContent.querySelectorAll('.modal-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const targetTab = modalContent.querySelector(`#task-${tabName}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');

                // If switching to history tab, render the history and reset scroll
                if (tabName === 'history') {
                    const form = document.getElementById('task-form');
                    const editingTaskId = form?.dataset.editingTaskId;
                    if (editingTaskId) {
                        renderTaskHistory(parseInt(editingTaskId));
                    }

                    // Reset scroll to top when switching to history tab
                    const historyContainer = document.querySelector('.task-history-container');
                    if (historyContainer) {
                        historyContainer.scrollTop = 0;
                    }
                }
            }
        });
    });
}

// Render history for a specific task
function renderTaskHistory(taskId) {
    if (!window.historyService) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let history = window.historyService.getEntityHistory('task', taskId);
    const timeline = document.getElementById('task-history-timeline');
    const emptyState = document.getElementById('task-history-empty');

    if (!timeline) return;

    if (history.length === 0) {
        timeline.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.style.flexDirection = 'column';
            emptyState.style.alignItems = 'center';
            emptyState.style.padding = '48px 20px';
        }
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Apply sort order based on settings
    if (settings.historySortOrder === 'oldest') {
        history = [...history].reverse();
    }

    // Add sort toggle button if not already present
    let sortButton = document.getElementById('history-sort-toggle');
    if (!sortButton) {
        const historyContainer = timeline.parentElement;
        sortButton = document.createElement('button');
        sortButton.id = 'history-sort-toggle';
        sortButton.className = 'history-sort-toggle';
        sortButton.innerHTML = settings.historySortOrder === 'newest' ? t('history.sort.newest') : t('history.sort.oldest');
        sortButton.onclick = () => toggleHistorySortOrder('task', taskId);
        historyContainer.insertBefore(sortButton, timeline);
    } else {
        sortButton.innerHTML = settings.historySortOrder === 'newest' ? t('history.sort.newest') : t('history.sort.oldest');
    }

    // Render history entries
    timeline.innerHTML = history.map(entry => renderHistoryEntryInline(entry)).join('');
}

// Toggle history sort order
function toggleHistorySortOrder(entityType, entityId) {
    settings.historySortOrder = settings.historySortOrder === 'newest' ? 'oldest' : 'newest';
    saveSettings();

    // Re-render based on entity type
    if (entityType === 'task' && entityId) {
        renderTaskHistory(entityId);
    } else if (entityType === 'project' && entityId) {
        renderProjectHistory(entityId);
    } else {
        // Fallback: try to detect context
        const form = document.getElementById('task-form');
        const editingTaskId = form?.dataset.editingTaskId;
        if (editingTaskId) {
            renderTaskHistory(parseInt(editingTaskId));
        }

        const projectDetailsEl = document.getElementById('project-details');
        if (projectDetailsEl && projectDetailsEl.classList.contains('active')) {
            const projectIdMatch = projectDetailsEl.innerHTML.match(/renderProjectHistory\((\d+)\)/);
            if (projectIdMatch) {
                renderProjectHistory(parseInt(projectIdMatch[1]));
            }
        }
    }
}

// Render history for a specific project
function renderProjectHistory(projectId) {
    if (!window.historyService) return;

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    let history = window.historyService.getEntityHistory('project', projectId);
    const timeline = document.getElementById(`project-history-timeline-${projectId}`);
    const emptyState = document.getElementById(`project-history-empty-${projectId}`);

    if (!timeline) return;

    if (history.length === 0) {
        timeline.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.style.flexDirection = 'column';
            emptyState.style.alignItems = 'center';
            emptyState.style.padding = '48px 20px';
        }
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Apply sort order based on settings
    if (settings.historySortOrder === 'oldest') {
        history = [...history].reverse();
    }

    // Add sort toggle button if not already present
    let sortButton = document.getElementById(`project-history-sort-toggle-${projectId}`);
    if (!sortButton) {
        const historyContainer = timeline.parentElement;
        sortButton = document.createElement('button');
        sortButton.id = `project-history-sort-toggle-${projectId}`;
        sortButton.className = 'history-sort-toggle';
        sortButton.innerHTML = settings.historySortOrder === 'newest' ? t('history.sort.newest') : t('history.sort.oldest');
        sortButton.onclick = () => toggleHistorySortOrder('project', projectId);
        historyContainer.insertBefore(sortButton, timeline);
    } else {
        sortButton.innerHTML = settings.historySortOrder === 'newest' ? t('history.sort.newest') : t('history.sort.oldest');
    }

    // Render history entries
    timeline.innerHTML = history.map(entry => renderHistoryEntryInline(entry)).join('');
}

// Render a single history entry (inline version - simplified)
function renderHistoryEntryInline(entry) {
    const actionIcons = {
        created: '✨',
        updated: '',
        deleted: '🗑️'
    };

    const actionColors = {
        created: 'var(--accent-green)',
        updated: 'var(--text-secondary)',
        deleted: 'var(--accent-red)'
    };

    const time = new Date(entry.timestamp).toLocaleString(getLocale(), {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const changes = Object.entries(entry.changes);
    const changeCount = changes.length;

    // Get summary of changes for display
    const fieldLabels = {
        title: t('history.field.title'),
        name: t('history.field.name'),
        description: t('history.field.description'),
        status: t('history.field.status'),
        priority: t('history.field.priority'),
        category: t('history.field.category'),
        startDate: t('history.field.startDate'),
        endDate: t('history.field.endDate'),
        link: t('history.field.link'),
        task: t('history.field.task'),
        projectId: t('history.field.projectId'),
        tags: t('history.field.tags'),
        attachments: t('history.field.attachments')
    };

    return `
        <div class="history-entry-inline">
            <div class="history-entry-header-inline">
                ${actionIcons[entry.action] ? `<span class="history-action-icon" style="color: ${actionColors[entry.action]};">${actionIcons[entry.action]}</span>` : ''}
                ${entry.action === 'created' || entry.action === 'deleted' ? `<span class="history-action-label-inline" style="color: ${actionColors[entry.action]};">${entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}</span>` : ''}
                <span class="history-time-inline">${time}</span>
            </div>

            ${changeCount > 0 ? `
                <div class="history-changes-compact">
                    ${changes.map(([field, { before, after }]) => {
                        const label = fieldLabels[field] || field;

                        if (field === 'link' || field === 'task') {
                            const action = after && typeof after === 'object' ? after.action : '';
                            const entity = (after && typeof after === 'object' ? after.entity : null) || 'task';
                            const title = after && typeof after === 'object' ? (after.title || after.id || t('tasks.table.task')) : String(after);
                            const icon = action === 'removed' ? '❌' : '➕';
                            const verb = action === 'removed' ? t('history.link.removed') : t('history.link.added');
                            const entityLabel = entity === 'task' ? t('history.entity.task') : entity;
                            const message = `${icon} ${verb} ${entityLabel} \"${title}\"`;
                            return `
                                <div class="history-change-compact history-change-compact--single">
                                    <span class="change-field-label">${label}:</span>
                                    <span class="change-after-compact">${escapeHtml(message)}</span>
                                </div>
                            `;
                        }

                        // Special handling for description - show full diff
                        if (field === 'description') {
                            const oldText = before ? before.replace(/<[^>]*>/g, '').trim() : '';
                            const newText = after ? after.replace(/<[^>]*>/g, '').trim() : '';

                            return `
                                <div class="history-change-description">
                                    <div class="change-field-label">${label}:</div>
                                    <div class="description-diff">
                                        ${oldText ? `<div class="description-before"><s>${escapeHtml(oldText)}</s></div>` : `<div class="description-before"><em style="opacity: 0.6;">${t('history.value.empty')}</em></div>`}
                                        ${newText ? `<div class="description-after">${escapeHtml(newText)}</div>` : `<div class="description-after"><em style="opacity: 0.6;">${t('history.value.empty')}</em></div>`}
                                    </div>
                                </div>
                            `;
                        }

                        // Standard handling for other fields
                        const beforeValue = formatChangeValueCompact(field, before, true);
                        const afterValue = formatChangeValueCompact(field, after, false);

                        return `
                            <div class="history-change-compact">
                                <span class="change-field-label">${label}:</span>
                                ${beforeValue !== null ? `<span class="change-before-compact">${beforeValue}</span>` : '<span class="change-null">—</span>'}
                                <span class="change-arrow-compact">${t('history.change.arrow')}</span>
                                ${afterValue !== null ? `<span class="change-after-compact">${afterValue}</span>` : '<span class="change-null">—</span>'}
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Compact format for inline display
function formatChangeValueCompact(field, value, isBeforeValue = false) {
    if (value === null || value === undefined) return null;
    if (value === '') return `<em style="opacity: 0.7;">${t('history.value.empty')}</em>`;

    // Special formatting for different field types
    if (field === 'startDate' || field === 'endDate') {
        const dateStr = formatDate(value);
        return isBeforeValue ? `<span style="opacity: 0.7;">${dateStr}</span>` : dateStr;
    }

    if (field === 'link' || field === 'task') {
        const action = value && typeof value === 'object' ? value.action : '';
        const entity = (value && typeof value === 'object' ? value.entity : null) || 'task';
        const title = value && typeof value === 'object' ? (value.title || value.id || t('tasks.table.task')) : String(value);
        const icon = action === 'removed' ? '❌' : '➕';
        const verb = action === 'removed' ? t('history.link.removed') : t('history.link.added');
        const entityLabel = entity === 'task' ? t('history.entity.task') : entity;
        const text = `${icon} ${verb} ${entityLabel} \"${title}\"`;
        return isBeforeValue ? `<span style="opacity: 0.7;">${escapeHtml(text)}</span>` : escapeHtml(text);
    }

    if (field === 'status') {
        // Use status badge with proper color - NO opacity
        const statusLabel = (getStatusLabel(value)).toUpperCase();
        const statusColors = {
            backlog: '#4B5563',
            todo: '#186f95',
            progress: 'var(--accent-blue)',
            review: 'var(--accent-amber)',
            done: 'var(--accent-green)'
        };
        const bgColor = statusColors[value] || '#4B5563';
        return `<span style="background: ${bgColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 600; text-transform: uppercase;">${escapeHtml(statusLabel)}</span>`;
    }

    if (field === 'priority') {
        // Use priority label with proper color - NO opacity
        const priorityLabel = getPriorityLabel(value);
        const priorityColor = PRIORITY_COLORS[value] || 'var(--text-secondary)';
        return `<span style="color: ${priorityColor}; font-weight: 600; font-size: 12px;">●</span> <span style="font-weight: 500;">${escapeHtml(priorityLabel)}</span>`;
    }

    if (field === 'projectId') {
        if (!value) return `<em style="opacity: 0.7;">${t('tasks.noProject')}</em>`;
        const project = projects.find(p => p.id === value);
        const projectName = project ? escapeHtml(project.name) : `#${value}`;
        return isBeforeValue ? `<span style="opacity: 0.7;">${projectName}</span>` : projectName;
    }

    if (field === 'tags') {
        // NO opacity for tags
        if (!Array.isArray(value) || value.length === 0) return `<em style="opacity: 0.7;">${t('history.value.none')}</em>`;
        return value.slice(0, 2).map(tag => {
            const tagColor = getTagColor(tag);
            return `<span style="background-color: ${tagColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`;
        }).join(' ') + (value.length > 2 ? ' ...' : '');
    }

    if (field === 'attachments') {
        if (!Array.isArray(value) || value.length === 0) return `<em style="opacity: 0.7;">${t('history.value.none')}</em>`;
        const attachStr = value.length === 1
            ? t('history.attachments.countSingle', { count: value.length })
            : t('history.attachments.countPlural', { count: value.length });
        return isBeforeValue ? `<span style="opacity: 0.7;">${attachStr}</span>` : attachStr;
    }

    if (field === 'description') {
        const text = value.replace(/<[^>]*>/g, '').trim();
        const shortText = text.length > 50 ? escapeHtml(text.substring(0, 50)) + '...' : escapeHtml(text) || `<em>${t('history.value.empty')}</em>`;
        return isBeforeValue ? `<span style="opacity: 0.7;">${shortText}</span>` : shortText;
    }

    // Default text fields - apply opacity for before values
    const escapedValue = escapeHtml(String(value));
    return isBeforeValue ? `<span style="opacity: 0.7;">${escapedValue}</span>` : escapedValue;
}

function toggleHistoryEntryInline(entryId) {
    const details = document.getElementById(`history-details-inline-${entryId}`);
    const btn = document.querySelector(`[data-action="toggleHistoryEntryInline"][data-param="${entryId}"]`);
    const icon = btn?.querySelector('.expand-icon-inline');

    if (details) {
        const isVisible = details.style.display !== 'none';
        details.style.display = isVisible ? 'none' : 'block';
        if (icon) {
            icon.textContent = isVisible ? '▼' : '▲';
        }
    }
}

// === Helper Functions for History Rendering ===

function renderChanges(changes) {
    const fieldLabels = {
        title: t('history.field.title'),
        name: t('history.field.name'),
        description: t('history.field.description'),
        status: t('history.field.status'),
        priority: t('history.field.priority'),
        category: t('history.field.category'),
        startDate: t('history.field.startDate'),
        endDate: t('history.field.endDate'),
        projectId: t('history.field.projectId'),
        tags: t('history.field.tags'),
        attachments: t('history.field.attachments')
    };

    return Object.entries(changes).map(([field, { before, after }]) => {
        const label = fieldLabels[field] || field;
        const beforeValue = formatChangeValue(field, before);
        const afterValue = formatChangeValue(field, after);

        return `
            <div class="history-change">
                <div class="history-change-field">${label}</div>
                <div class="history-change-values">
                    <div class="history-change-before">
                        ${beforeValue !== null ? `<span class="change-label">${t('history.change.beforeLabel')}</span> ${beforeValue}` : `<span class="change-label-null">${t('history.change.notSet')}</span>`}
                    </div>
                    <div class="history-change-arrow">${t('history.change.arrow')}</div>
                    <div class="history-change-after">
                        ${afterValue !== null ? `<span class="change-label">${t('history.change.afterLabel')}</span> ${afterValue}` : `<span class="change-label-null">${t('history.change.removed')}</span>`}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function formatChangeValue(field, value) {
    if (value === null || value === undefined) return null;
    if (value === '') return `<em style="color: var(--text-muted);">${t('history.value.empty')}</em>`;

    if (field === 'link' || field === 'task') {
        const action = value && typeof value === 'object' ? value.action : '';
        const entity = (value && typeof value === 'object' ? value.entity : null) || 'task';
        const title = value && typeof value === 'object' ? (value.title || value.id || t('tasks.table.task')) : String(value);
        const icon = action === 'removed' ? '❌' : '➕';
        const verb = action === 'removed' ? t('history.link.removed') : t('history.link.added');
        const entityLabel = entity === 'task' ? t('history.entity.task') : entity;
        return escapeHtml(`${icon} ${verb} ${entityLabel} \"${title}\"`);
    }

    // Special formatting for different field types
    if (field === 'startDate' || field === 'endDate') {
        return formatDate(value);
    }

    if (field === 'projectId') {
        if (!value) return `<em style="color: var(--text-muted);">${t('tasks.noProject')}</em>`;
        const project = projects.find(p => p.id === value);
        return project ? escapeHtml(project.name) : t('history.project.fallback', { id: value });
    }

    if (field === 'tags') {
        if (!Array.isArray(value) || value.length === 0) {
            return `<em style="color: var(--text-muted);">${t('history.tags.none')}</em>`;
        }
        return value.map(tag => `<span class="history-tag">${escapeHtml(tag)}</span>`).join(' ');
    }

    if (field === 'attachments') {
        if (!Array.isArray(value) || value.length === 0) {
            return `<em style="color: var(--text-muted);">${t('history.attachments.none')}</em>`;
        }
        return value.length === 1
            ? t('history.attachments.countSingle', { count: value.length })
            : t('history.attachments.countPlural', { count: value.length });
    }

    if (field === 'description') {
        // Strip HTML tags and truncate
        const text = value.replace(/<[^>]*>/g, '').trim();
        if (text.length > 100) {
            return escapeHtml(text.substring(0, 100)) + '...';
        }
        return escapeHtml(text) || `<em style="color: var(--text-muted);">${t('history.value.empty')}</em>`;
    }

    return escapeHtml(String(value));
}

// Old History page functions removed - now using inline history in modals

let feedbackItemToDelete = null;

function deleteFeedbackItem(id) {
    feedbackItemToDelete = id;
    document.getElementById('feedback-delete-modal').classList.add('active');
}

function closeFeedbackDeleteModal() {
    document.getElementById('feedback-delete-modal').classList.remove('active');
    feedbackItemToDelete = null;
}

async function confirmFeedbackDelete() {
    if (feedbackItemToDelete !== null) {
        const deleteId = feedbackItemToDelete;
        feedbackItems = feedbackItems.filter(f => f.id !== feedbackItemToDelete);
        feedbackIndex = feedbackIndex.filter((id) => id !== deleteId);
        feedbackRevision++;

        // Close modal and update UI immediately (optimistic update)
        closeFeedbackDeleteModal();
        updateCounts();
        renderFeedback();

        // Save in background (delta + queued)
        enqueueFeedbackDelta({ action: 'delete', targetId: deleteId });
    }
}

// Delegated event listener for feedback checkboxes
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('feedback-checkbox')) {
        const feedbackId = parseInt(e.target.dataset.feedbackId, 10);
        if (feedbackId) {
            toggleFeedbackItem(feedbackId);
        }
    }
});

function editProjectTitle(projectId, currentName) {
    document.getElementById('project-title-display').style.display = 'none';
    document.getElementById('project-title-edit').style.display = 'flex';
    document.getElementById('project-title-input').focus();
    document.getElementById('project-title-input').select();
}

function saveProjectTitle(projectId) {
    const newTitle = document.getElementById('project-title-input').value.trim();
    if (newTitle) {
        updateProjectField(projectId, 'name', newTitle);
    } else {
        cancelProjectTitle();
    }
}

function cancelProjectTitle() {
    document.getElementById('project-title-display').style.display = 'inline';
    document.getElementById('project-title-edit').style.display = 'none';
}

function dismissKanbanTip() {
    document.getElementById('kanban-tip').style.display = 'none';
    localStorage.setItem('kanban-tip-dismissed', 'true');
}

function toggleProjectMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('project-options-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

// Close project menu when clicking outside
document.addEventListener('click', function(e) {
    const menu = document.getElementById('project-options-menu');
    if (menu && !e.target.closest('#project-options-btn') && !e.target.closest('#project-options-menu')) {
        menu.style.display = 'none';
    }
});

// Check on page load if tip was dismissed
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('kanban-tip-dismissed') === 'true') {
        const tip = document.getElementById('kanban-tip');
        if (tip) tip.style.display = 'none';
    }
});

async function addAttachment() {
    const urlInput = document.getElementById('attachment-url');
    const nameInput = document.getElementById('attachment-name');
    const url = urlInput.value.trim();
    
    if (!url) {
        urlInput.style.border = '2px solid var(--accent-red, #ef4444)';
        urlInput.placeholder = 'URL is required';
        urlInput.focus();
        
        // Reset border after 2 seconds
        setTimeout(() => {
            urlInput.style.border = '';
            urlInput.placeholder = 'Paste link (Drive, Dropbox, etc.)';
        }, 2000);
        return;
    }
    
    // Reset any error styling
    urlInput.style.border = '';
    
    const taskId = document.getElementById('task-form').dataset.editingTaskId;
    
    // Use custom name if provided, otherwise auto-detect
    let name = nameInput.value.trim() || 'Attachment';
    let icon = '📁';
    
    if (!nameInput.value.trim()) {
        // Only auto-detect if no custom name provided
        try {
            const urlObj = new URL(url);
            let path = urlObj.pathname.toLowerCase();

            if (urlObj.hostname.includes("docs.google.com")) {
                if (path.includes("/document/")) {
                    name = t('tasks.attachments.googleDoc');
                    icon = "📄";
                } else if (path.includes("/spreadsheets/")) {
                    name = t('tasks.attachments.googleSheet');
                    icon = "📊";
                } else if (path.includes("/presentation/")) {
                    name = t('tasks.attachments.googleSlides');
                    icon = "📑";
                } else {
                    name = t('tasks.attachments.googleDriveFile');
                    icon = "🗂️";
                }
            } else if (urlObj.hostname.includes("drive.google.com")) {
                name = t('tasks.attachments.googleDriveFile');
                icon = "🗂️";
            } else if (path.endsWith(".pdf")) {
                name = path.split("/").pop() || t('tasks.attachments.pdf');
                icon = "📕";
            } else if (path.endsWith(".doc") || path.endsWith(".docx")) {
                name = path.split("/").pop() || t('tasks.attachments.word');
                icon = "📝";
            } else if (path.endsWith(".xls") || path.endsWith(".xlsx")) {
                name = path.split("/").pop() || t('tasks.attachments.excel');
                icon = "📊";
            } else if (path.endsWith(".ppt") || path.endsWith(".pptx")) {
                name = path.split("/").pop() || t('tasks.attachments.powerpoint');
                icon = "📑";
            } else {
                let lastPart = path.split("/").pop();
                name = lastPart && lastPart.length > 0 ? lastPart : urlObj.hostname;
                icon = "📁";
            }
        } catch (e) {
            name = url.substring(0, 30);
            icon = "📁";
        }
    }

    // Use a consistent icon for URL attachments
    icon = '🌐';
    const attachment = { name, icon, type: 'link', url, addedAt: new Date().toISOString() };

    if (taskId) {
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (!task) return;
        if (!task.attachments) task.attachments = [];
        task.attachments.push(attachment);
        renderAttachments(task.attachments);

        // Reorganize mobile fields after attachment addition
        reorganizeMobileTaskFields();

        // Save in background
        saveTasks().catch(error => {
            console.error('Failed to save attachment:', error);
            showErrorNotification(t('error.attachmentSaveFailed'));
        });
    } else {
        tempAttachments.push(attachment);
        renderAttachments(tempAttachments);
    }
    
    urlInput.value = '';
    nameInput.value = '';
}

async function renderAttachments(attachments) {
    const filesContainer = document.getElementById('attachments-files-list');
    const linksContainer = document.getElementById('attachments-links-list');

    if (filesContainer && linksContainer) {
        await renderAttachmentsSeparated(attachments, filesContainer, linksContainer);
        return;
    }

    const container = document.getElementById('attachments-list');
    if (!container) return;

    if (!attachments || attachments.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; padding: 8px 0;">${t('tasks.attachments.none')}</div>`;
        return;
    }

    const getUrlHost = (rawUrl) => {
        if (!rawUrl) return '';
        try {
            const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
            const url = new URL(hasScheme ? rawUrl : `https://${rawUrl}`);
            return (url.host || rawUrl).replace(/^www\./, '');
        } catch {
            return rawUrl;
        }
    };

    // First render with placeholders
    container.innerHTML = attachments.map((att, index) => {
        const sizeInKB = att.size ? Math.round(att.size / 1024) : 0;
        const sizeText = sizeInKB > 1024 ? `${(sizeInKB/1024).toFixed(1)} MB` : `${sizeInKB} KB`;

        // New file system (with fileKey)
        if (att.type === 'file' && att.fileKey) {
            const isImage = att.fileType === 'image';
            // Show placeholder, will load image if it's an image
            const thumbnailHtml = `<div id="thumbnail-${att.fileKey}" class="attachment-thumb" aria-hidden="true">${att.icon}</div>`;
            const primaryAction = isImage ? 'viewFile' : 'downloadFileAttachment';
            const primaryParams = isImage
                ? `data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.fileType}"`
                : `data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.mimeType}"`;

            return `
                <div class="attachment-item">
                    <button type="button" class="attachment-link" data-action="${primaryAction}" ${primaryParams}>
                        ${thumbnailHtml}
                        <span class="attachment-name">${escapeHtml(att.name)} <span class="attachment-meta">&middot; ${sizeText}</span></span>
                    </button>
                    <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t('tasks.attachments.remove')}" title="${t('tasks.attachments.removeTitle')}">&times;</button>
                </div>
            `;
        }

        // Legacy: Old inline Base64 images (backward compatibility) - still show thumbnail since data is already in memory
        else if (att.type === 'image' && att.data) {
            return `
                <div class="attachment-item">
                    <button type="button" class="attachment-link" data-action="viewImageLegacy" data-param="${att.data}" data-param2="${escapeHtml(att.name)}">
                        <span class="attachment-thumb" aria-hidden="true"><img src="${att.data}" alt=""></span>
                        <span class="attachment-name">${escapeHtml(att.name)} <span class="attachment-meta">&middot; ${sizeText}</span></span>
                    </button>
                    <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t('tasks.attachments.remove')}" title="${t('tasks.attachments.removeTitle')}">&times;</button>
                </div>
            `;
        }

        // URL attachment
        else {
            return `
                <div class="attachment-item" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
                    <div style="width: 40px; height: 40px; background: transparent; border-radius: 0; display: flex; align-items: center; justify-content: center; font-size: 25px; line-height: 1;">🌐</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: none;">${escapeHtml(att.url)}</div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button type="button" data-action="openUrlAttachment" data-param="${encodeURIComponent(att.url)}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">${t('tasks.attachments.open')}</button>
                        <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t('tasks.attachments.removeLink')}" title="${t('tasks.attachments.removeTitle')}">&times;</button>
                    </div>
                </div>
            `;
        }
    }).join('');

    // Load image thumbnails asynchronously
    for (const att of attachments) {
        if (att.type === 'file' && att.fileKey && att.fileType === 'image') {
            try {
                const base64Data = await downloadFile(att.fileKey);
                const thumbnailEl = document.getElementById(`thumbnail-${att.fileKey}`);
                if (thumbnailEl && base64Data) {
                    thumbnailEl.innerHTML = `<img src="${base64Data}" alt="${escapeHtml(att.name)}">`;
                }
            } catch (error) {
                console.error('Failed to load thumbnail:', error);
                // Keep showing icon on error
            }
        }
    }
}

async function renderAttachmentsSeparated(attachments, filesContainer, linksContainer) {
    if (!filesContainer || !linksContainer) return;

    const indexed = (attachments || []).map((att, index) => ({ att, index }));

    const fileItems = indexed.filter(({ att }) => {
        if (!att) return false;
        if (att.type === 'file') return true;
        if (att.fileKey) return true;
        if (att.type === 'image' && att.data) return true;
        return false;
    });

    const linkItems = indexed.filter(({ att }) => {
        if (!att) return false;
        if (att.type === 'link') return true;
        if (att.url && att.type !== 'file') return true; // backward compat for old link objects
        return false;
    });

    const getUrlHost = (rawUrl) => {
        if (!rawUrl) return '';
        try {
            const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
            const url = new URL(hasScheme ? rawUrl : `https://${rawUrl}`);
            return (url.host || rawUrl).replace(/^www\./, '');
        } catch {
            return rawUrl;
        }
    };

    const fileRows = fileItems.map(({ att, index }) => {
        const sizeInKB = att.size ? Math.round(att.size / 1024) : 0;
        const sizeText = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;

        if (att.type === 'file' && att.fileKey) {
            const isImage = att.fileType === 'image';
            const thumbnailHtml = `<div id="thumbnail-${att.fileKey}" class="attachment-thumb" aria-hidden="true">${att.icon}</div>`;
            const primaryAction = isImage ? 'viewFile' : 'downloadFileAttachment';
            const primaryParams = isImage
                ? `data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.fileType}"`
                : `data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.mimeType}"`;

            return `
                <div class="attachment-item">
                    <button type="button" class="attachment-link" data-action="${primaryAction}" ${primaryParams}>
                        ${thumbnailHtml}
                        <span class="attachment-name">${escapeHtml(att.name)} <span class="attachment-meta">&middot; ${sizeText}</span></span>
                    </button>
                    <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t('tasks.attachments.remove')}" title="${t('tasks.attachments.removeTitle')}">&times;</button>
                </div>
            `;
        }

        if (att.type === 'image' && att.data) {
            return `
                <div class="attachment-item">
                    <button type="button" class="attachment-link" data-action="viewImageLegacy" data-param="${att.data}" data-param2="${escapeHtml(att.name)}">
                        <span class="attachment-thumb" aria-hidden="true"><img src="${att.data}" alt=""></span>
                        <span class="attachment-name">${escapeHtml(att.name)} <span class="attachment-meta">&middot; ${sizeText}</span></span>
                    </button>
                    <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t('tasks.attachments.remove')}" title="${t('tasks.attachments.removeTitle')}">&times;</button>
                </div>
            `;
        }

        return '';
    }).filter(Boolean).join('');

    const linkRows = linkItems.map(({ att, index }) => `
        <div class="attachment-item" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
            <div style="width: 40px; height: 40px; background: transparent; border-radius: 0; display: flex; align-items: center; justify-content: center; font-size: 25px; line-height: 1;">🌐</div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: none;">${escapeHtml(att.url)}</div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" data-action="openUrlAttachment" data-param="${encodeURIComponent(att.url)}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">${t('tasks.attachments.open')}</button>
                <button type="button" class="attachment-remove" data-action="removeAttachment" data-param="${index}" aria-label="${t('tasks.attachments.removeLink')}" title="${t('tasks.attachments.removeTitle')}">&times;</button>
            </div>
        </div>
    `).join('');

    const hasAny = Boolean(fileRows) || Boolean(linkRows);
    if (!hasAny) {
        filesContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; padding: 8px 0;">${t('tasks.attachments.none')}</div>`;
        linksContainer.innerHTML = '';
    } else {
        filesContainer.innerHTML = fileRows || '';
        linksContainer.innerHTML = linkRows || '';
    }

    // Load image thumbnails asynchronously (fileKey images)
    for (const att of attachments || []) {
        if (att && att.type === 'file' && att.fileKey && att.fileType === 'image') {
            try {
                const base64Data = await downloadFile(att.fileKey);
                const thumbnailEl = document.getElementById(`thumbnail-${att.fileKey}`);
                if (thumbnailEl && base64Data) {
                    thumbnailEl.innerHTML = `<img src="${base64Data}" alt="${escapeHtml(att.name)}">`;
                }
            } catch (error) {
                console.error('Failed to load thumbnail:', error);
            }
        }
    }
}

async function viewFile(fileKey, fileName, fileType) {
    if (fileType !== 'image') return; // Only images can be viewed inline

    try {
        const base64Data = await downloadFile(fileKey);
        viewImageLegacy(base64Data, fileName);
    } catch (error) {
        showErrorNotification(t('error.attachmentLoadFailed', { message: error.message }));
    }
}

function viewImageLegacy(base64Data, imageName) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;

    modal.innerHTML = `
        <div style="max-width: 90%; max-height: 90%; display: flex; flex-direction: column; align-items: center;">
            <div style="color: white; padding: 16px; font-size: 18px; background: rgba(0,0,0,0.5); border-radius: 8px 8px 0 0; width: 100%; text-align: center;">
                ${escapeHtml(imageName)}
            </div>
            <img src="${base64Data}" alt="${escapeHtml(imageName)}" style="max-width: 100%; max-height: calc(90vh - 60px); object-fit: contain; border-radius: 0 0 8px 8px;">
        </div>
    `;

    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

  async function downloadFileAttachment(fileKey, fileName, mimeType) {
    try {
        const base64Data = await downloadFile(fileKey);

        // Convert Base64 to blob and trigger download
        const base64Response = await fetch(base64Data);
        const blob = await base64Response.blob();

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccessNotification(t('success.fileDownloaded'));
    } catch (error) {
        showErrorNotification(t('error.fileDownloadFailed', { message: error.message }));
    }
}

async function removeAttachment(index) {
    const taskId = document.getElementById('task-form').dataset.editingTaskId;

    if (taskId) {
        // Removing from existing task
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (!task || !task.attachments) return;

        const attachment = task.attachments[index];

        // Delete file from NAUTILUS_FILES KV if it's a file attachment
        if (attachment.type === 'file' && attachment.fileKey) {
            try {
                await deleteFile(attachment.fileKey);
                showSuccessNotification(t('success.attachmentDeletedFromStorage', { name: attachment.name }));
            } catch (error) {
                console.error('Failed to delete file from storage:', error);
                showErrorNotification(t('error.fileDeleteFailed'));
                return; // Don't remove from task if storage deletion failed
            }
        } else {
            showSuccessNotification(t('success.attachmentRemoved'));
        }

        task.attachments.splice(index, 1);

        // Update UI immediately (optimistic update)
        renderAttachments(task.attachments);

        // Reorganize mobile fields after attachment removal
        reorganizeMobileTaskFields();

        // Save in background (don't block UI)
        saveTasks().catch(err => {
            console.error('Failed to save attachment removal:', err);
            showErrorNotification(t('error.saveChangesFailed'));
        });
    } else {
        // Removing from staged attachments
        const attachment = tempAttachments[index];

        // Delete file from NAUTILUS_FILES KV if it's a file attachment
        if (attachment.type === 'file' && attachment.fileKey) {
            try {
                await deleteFile(attachment.fileKey);
                showSuccessNotification(t('success.attachmentDeletedFromStorage', { name: attachment.name }));
            } catch (error) {
                console.error('Failed to delete file from storage:', error);
                showErrorNotification(t('error.fileDeleteFailed'));
                return; // Don't remove from staging if storage deletion failed
            }
        } else {
            showSuccessNotification(t('success.attachmentRemoved'));
        }

        tempAttachments.splice(index, 1);
        renderAttachments(tempAttachments);
    }
}

function initTaskAttachmentDropzone() {
    const dropzone = document.getElementById('attachment-file-dropzone');
    const fileInput = document.getElementById('attachment-file');
    if (!dropzone || !fileInput) return;

    const isMobileScreen = window.innerWidth <= 768;
    const defaultText = isMobileScreen
        ? t('tasks.modal.attachmentsDropzoneTap')
        : t('tasks.modal.attachmentsDropzoneDefault');

    dropzone.dataset.defaultText = defaultText;

    function setDropzoneText(text) {
        dropzone.innerHTML = '';
        const textEl = document.createElement('span');
        textEl.className = 'task-attachment-dropzone-text';
        textEl.textContent = text;
        dropzone.appendChild(textEl);
    }

    function applyDropzoneBaseStyles(el) {
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.gap = '10px';
        el.style.padding = '12px 16px';
        el.style.textAlign = 'center';
        el.style.cursor = 'pointer';
        el.style.userSelect = 'none';
        el.style.minHeight = '48px';
        el.style.border = '2px dashed var(--border)';
        el.style.borderRadius = '10px';
        el.style.background = 'var(--bg-tertiary)';
        el.style.boxShadow = 'none';
        el.style.color = 'var(--text-muted)';
        el.style.fontWeight = '500';
        el.style.transition = 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease';
    }

    function setDropzoneDragoverStyles(el, isActive) {
        if (isActive) {
            // Use same vibrant blue as feedback dropzone
            el.style.borderColor = 'var(--accent-blue)';
            el.style.background = 'rgba(59, 130, 246, 0.08)';
            el.style.boxShadow = '0 0 0 1px var(--accent-blue)';
        } else {
            el.style.border = '2px dashed var(--border)';
            el.style.background = 'var(--bg-tertiary)';
            el.style.boxShadow = 'none';
        }
    }

    applyDropzoneBaseStyles(dropzone);
    setDropzoneText(defaultText);

    async function handleDropOrPasteFileList(fileList, event) {
        if (!fileList || fileList.length === 0) return;
        const file = fileList[0];
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        await uploadTaskAttachmentFile(file, dropzone);
    }

    let dragDepth = 0;

    dropzone.addEventListener('dragenter', function(e) {
        e.preventDefault();
        dragDepth += 1;
        dropzone.classList.add('task-attachment-dragover');
        setDropzoneDragoverStyles(dropzone, true);
    });

    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('task-attachment-dragover');
        setDropzoneDragoverStyles(dropzone, true);
    });

    dropzone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) {
            dropzone.classList.remove('task-attachment-dragover');
            setDropzoneDragoverStyles(dropzone, false);
        }
    });

    dropzone.addEventListener('drop', function(e) {
        dragDepth = 0;
        dropzone.classList.remove('task-attachment-dragover');
        setDropzoneDragoverStyles(dropzone, false);
        handleDropOrPasteFileList(e.dataTransfer && e.dataTransfer.files, e);
    });

    dropzone.addEventListener('dragend', function() {
        dragDepth = 0;
        dropzone.classList.remove('task-attachment-dragover');
        setDropzoneDragoverStyles(dropzone, false);
    });

    dropzone.addEventListener('paste', function(e) {
        if (!e.clipboardData) return;
        const files = e.clipboardData.files;
        if (files && files.length > 0) {
            handleDropOrPasteFileList(files, e);
        }
    });

    dropzone.addEventListener('click', function() {
        fileInput.click();
    });

    dropzone.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleDropOrPasteFileList(files, e);
        }
        fileInput.value = '';
    });
}

document.addEventListener('DOMContentLoaded', initTaskAttachmentDropzone);

async function uploadTaskAttachmentFile(file, uiEl) {
    if (!file) return;

    const fileType = getFileType(file.type || '', file.name || '');
    const maxSize = getMaxFileSize(fileType);

    if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        showErrorNotification(t('error.fileSizeTooLarge', { maxMB }));
        return;
    }

    const isButton = uiEl && uiEl.tagName === 'BUTTON';
    const originalText = isButton ? (uiEl.textContent || '📁 Upload File') : null;
    const defaultText = !isButton
        ? (uiEl?.dataset?.defaultText || t('tasks.modal.attachmentsDropzoneDefault'))
        : null;

    try {
        if (uiEl) {
            if (isButton) {
                uiEl.textContent = '⏳ Uploading...';
                uiEl.disabled = true;
            } else {
                uiEl.innerHTML = '';
                const textEl = document.createElement('span');
                textEl.className = 'task-attachment-dropzone-text';
                textEl.textContent = `Uploading ${file.name}...`;
                uiEl.appendChild(textEl);
                uiEl.classList.add('task-attachment-uploading');
                uiEl.setAttribute('aria-busy', 'true');
            }
        }

        const base64 = await convertFileToBase64(file);
        const fileKey = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await uploadFile(fileKey, base64);

        const attachment = {
            name: file.name,
            icon: getFileIcon(fileType),
            type: 'file',
            fileType: fileType,
            fileKey: fileKey,
            mimeType: file.type,
            size: file.size,
            addedAt: new Date().toISOString()
        };

        const taskId = document.getElementById('task-form').dataset.editingTaskId;

        if (taskId) {
            const task = tasks.find(t => t.id === parseInt(taskId));
            if (!task) return;
            if (!task.attachments) task.attachments = [];
            task.attachments.push(attachment);

            // Update UI immediately (optimistic update)
            renderAttachments(task.attachments);

            // Save in background (don't block UI)
            saveTasks().catch(err => {
                console.error('Failed to save attachment:', err);
                showErrorNotification(t('error.attachmentSaveFailed'));
            });
        } else {
            tempAttachments.push(attachment);
            renderAttachments(tempAttachments);
        }

        showSuccessNotification(t('success.fileUploaded'));

    } catch (error) {
        showErrorNotification(t('error.fileUploadFailed', { message: error.message }));
    } finally {
        if (uiEl) {
            if (isButton) {
                uiEl.textContent = originalText;
                uiEl.disabled = false;
            } else {
                uiEl.innerHTML = '';
                const textEl = document.createElement('span');
                textEl.className = 'task-attachment-dropzone-text';
                textEl.textContent = defaultText;
                uiEl.appendChild(textEl);
                uiEl.classList.remove('task-attachment-uploading');
                uiEl.removeAttribute('aria-busy');
            }
        }
    }
}

async function addFileAttachment(event) {
    const fileInput = document.getElementById('attachment-file');
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!file) {
        showErrorNotification(t('error.selectFile'));
        return;
    }

    const uiEl =
        document.getElementById('attachment-file-dropzone') ||
        event?.target ||
        null;

    await uploadTaskAttachmentFile(file, uiEl);

    if (fileInput) fileInput.value = '';
}

function getFileType(mimeType, filename) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (mimeType.includes('spreadsheet') || filename.match(/\.(xlsx?|csv)$/i)) return 'spreadsheet';
    if (mimeType.includes('document') || mimeType.includes('word') || filename.match(/\.docx?$/i)) return 'document';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || filename.match(/\.pptx?$/i)) return 'presentation';
    return 'file';
}

function getMaxFileSize(fileType) {
    switch (fileType) {
        case 'pdf':
            return 20 * 1024 * 1024; // 20MB for PDFs
        case 'image':
        case 'spreadsheet':
        case 'document':
        case 'presentation':
            return 10 * 1024 * 1024; // 10MB for others
        default:
            return 10 * 1024 * 1024; // 10MB default
    }
}

function getFileIcon(fileType) {
    switch (fileType) {
        case 'image': return '\u{1F5BC}\u{FE0F}';
        case 'pdf': return '📄';
        case 'spreadsheet': return '📊';
        case 'document': return '📝';
        case 'presentation': return '📊';
        default: return '🗂️';
    }
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

async function uploadFile(fileKey, base64Data) {
    const response = await fetch(`/api/files?key=${encodeURIComponent(fileKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: base64Data
    });

    if (!response.ok) {
        // Try to parse JSON error response for better error messages
        let errorMessage = `Failed to upload file: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.message) {
                errorMessage = errorData.message;
            }
            if (errorData.troubleshooting) {
                errorMessage += '\n\nTroubleshooting: ' + errorData.troubleshooting;
            }
        } catch (e) {
            // If JSON parsing fails, use default error message
        }
        throw new Error(errorMessage);
    }
}

async function downloadFile(fileKey) {
    const response = await fetch(`/api/files?key=${encodeURIComponent(fileKey)}`);

    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    return await response.text();
}

async function deleteFile(fileKey) {
    const response = await fetch(`/api/files?key=${encodeURIComponent(fileKey)}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
    }
}

// Expose file attachment functions to window for onclick handlers
window.addFileAttachment = addFileAttachment;
window.viewFile = viewFile;
      window.viewImageLegacy = viewImageLegacy;
window.downloadFileAttachment = downloadFileAttachment;
window.removeAttachment = removeAttachment;

// Kanban Settings
window.kanbanShowBacklog = localStorage.getItem('kanbanShowBacklog') === 'true'; // disabled by default
window.kanbanShowProjects = localStorage.getItem('kanbanShowProjects') !== 'false';
window.kanbanShowNoDate = localStorage.getItem('kanbanShowNoDate') !== 'false';
window.kanbanUpdatedFilter = localStorage.getItem('kanbanUpdatedFilter') || 'all'; // all | 5m | 30m | 24h | week | month

// Status Settings
window.enableReviewStatus = localStorage.getItem('enableReviewStatus') === 'true'; // disabled by default

function getKanbanUpdatedFilterLabel(value) {
    switch (value) {
        case '5m': return '5m';
        case '30m': return '30m';
        case '24h': return '24h';
        case 'week': return t('filters.updated.week');
        case 'month': return t('filters.updated.month');
        case 'all':
        default:
            return '';
    }
}

function updateKanbanGridColumns() {
    const kanbanBoard = document.querySelector('.kanban-board');
    if (!kanbanBoard) return;

    // Count visible columns
    let visibleColumns = 3; // todo, progress, done (always visible)

    if (window.kanbanShowBacklog === true) visibleColumns++;
    if (window.enableReviewStatus !== false) visibleColumns++;

    kanbanBoard.style.gridTemplateColumns = `repeat(${visibleColumns}, 1fr)`;
}

function applyReviewStatusVisibility() {
    const enabled = window.enableReviewStatus !== false;

    // Show/hide IN REVIEW kanban column
    const reviewColumn = document.getElementById('kanban-column-review');
    if (reviewColumn) {
        reviewColumn.style.display = enabled ? '' : 'none';
    }

    // Show/hide IN REVIEW filter option
    const reviewFilter = document.getElementById('filter-status-review');
    if (reviewFilter) {
        reviewFilter.style.display = enabled ? '' : 'none';
    }

    // Update grid columns
    updateKanbanGridColumns();

    // If disabled, clear any active review status filter
    if (!enabled && filterState.statuses.has('review')) {
        filterState.statuses.delete('review');
        applyFilters();
    }
}

function applyBacklogColumnVisibility() {
    const enabled = window.kanbanShowBacklog === true;

    // Show/hide BACKLOG kanban column
    const backlogColumn = document.getElementById('kanban-column-backlog');
    if (backlogColumn) {
        backlogColumn.style.display = enabled ? '' : 'none';
    }

    // Update grid columns
    updateKanbanGridColumns();
}

function touchProjectUpdatedAt(projectId) {
    const pid = projectId ? parseInt(projectId, 10) : null;
    if (!pid) return null;
    const project = projects.find(p => p.id === pid);
    if (!project) return null;
    project.updatedAt = new Date().toISOString();
    return project;
}

function recordProjectTaskLinkChange(projectId, action, task) {
    if (!window.historyService) return;
    const pid = projectId ? parseInt(projectId, 10) : null;
    if (!pid) return;
    const project = projects.find(p => p.id === pid);
    if (!project) return;
    if (action === 'added' && window.historyService.recordProjectTaskAdded) {
        window.historyService.recordProjectTaskAdded(project, task);
    } else if (action === 'removed' && window.historyService.recordProjectTaskRemoved) {
        window.historyService.recordProjectTaskRemoved(project, task);
    }
}

function getKanbanUpdatedCutoffTime(value) {
    const now = Date.now();
    switch (value) {
        case '5m': return now - 5 * 60 * 1000;
        case '30m': return now - 30 * 60 * 1000;
        case '24h': return now - 24 * 60 * 60 * 1000;
        case 'week': return now - 7 * 24 * 60 * 60 * 1000;
        case 'month': return now - 30 * 24 * 60 * 60 * 1000;
        case 'all':
        default:
            return null;
    }
}

function getTaskUpdatedTime(task) {
    const raw = (task && (task.updatedAt || task.createdAt || task.createdDate)) || "";
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? time : 0;
}

function formatTaskUpdatedDateTime(task) {
    const raw = (task && (task.updatedAt || task.createdAt || task.createdDate)) || "";
    const d = new Date(raw);
    const t = d.getTime();
    if (!Number.isFinite(t) || t === 0) return "";
    try {
        return d.toLocaleString(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    } catch (e) {
        return d.toISOString().slice(0, 16).replace("T", " ");
    }
}

function sanitizeKanbanUpdatedFilterButtonLabel() {
    const btn = document.getElementById('btn-filter-kanban-updated');
    if (!btn) return;
    const badge = btn.querySelector('#badge-kanban-updated');
    if (!badge) return;

    // Rebuild the button label to avoid any stray/unrecognized glyphs in the HTML.
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    btn.appendChild(document.createTextNode(`${t('tasks.filters.updated')} `));
    btn.appendChild(badge);
    btn.appendChild(document.createTextNode(' '));
    const arrow = document.createElement('span');
    arrow.className = 'filter-arrow';
    arrow.textContent = '▼';
    btn.appendChild(arrow);
}

function updateKanbanUpdatedFilterUI() {
    try { sanitizeKanbanUpdatedFilterButtonLabel(); } catch (e) {}
    const badge = document.getElementById('badge-kanban-updated');
    if (badge) {
        badge.textContent = getKanbanUpdatedFilterLabel(window.kanbanUpdatedFilter);

        // Update active state
        const button = badge.closest('.filter-button');
        if (button) {
            if (window.kanbanUpdatedFilter !== 'all') {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }

    try {
        document
            .querySelectorAll('input[type="radio"][data-filter="kanban-updated"][name="kanban-updated-filter"]')
            .forEach((rb) => {
                rb.checked = rb.value === window.kanbanUpdatedFilter;
            });
    } catch (e) {}
}

function setKanbanUpdatedFilter(value, options = { render: true }) {
    const allowed = new Set(['all', '5m', '30m', '24h', 'week', 'month']);
    const normalized = allowed.has(value) ? value : (value === 'today' ? '24h' : 'all');

    window.kanbanUpdatedFilter = normalized;
    try { localStorage.setItem('kanbanUpdatedFilter', normalized); } catch (e) {}

    updateKanbanUpdatedFilterUI();
    try { renderActiveFilterChips(); } catch (e) {}

    // Sync updated filter to URL for shareable links
    try { syncURLWithFilters(); } catch (e) {}

    if (options && options.render === false) return;

    // Re-render whichever tasks view is currently active (never forces sorting).
    const isKanban = !document.querySelector('.kanban-board')?.classList.contains('hidden');
    const isList = document.getElementById('list-view')?.classList.contains('active');
    const isCalendar = document.getElementById('calendar-view')?.classList.contains('active');
    if (isKanban) renderTasks();
    if (isList || window.innerWidth <= 768) renderListView();
    if (isCalendar) renderCalendar();
}

function toggleKanbanSettings(event) {
    event.stopPropagation();
    const panel = document.getElementById('kanban-settings-panel');
    const isActive = panel.classList.contains('active');

    if (isActive) {
        panel.classList.remove('active');
    } else {
        panel.classList.add('active');
        // Load current state
        document.getElementById('kanban-show-backlog').checked = window.kanbanShowBacklog === true;
        document.getElementById('kanban-show-projects').checked = window.kanbanShowProjects !== false;
        document.getElementById('kanban-show-no-date').checked = window.kanbanShowNoDate !== false;
    }
}

function toggleKanbanBacklog() {
    const checkbox = document.getElementById('kanban-show-backlog');
    window.kanbanShowBacklog = checkbox.checked;
    localStorage.setItem('kanbanShowBacklog', checkbox.checked);

    // Show/hide backlog column
    const backlogColumn = document.getElementById('kanban-column-backlog');
    if (backlogColumn) {
        backlogColumn.style.display = checkbox.checked ? '' : 'none';
    }

    // Update kanban grid columns
    updateKanbanGridColumns();

    renderTasks();
}

function toggleKanbanProjects() {
    const checkbox = document.getElementById('kanban-show-projects');
    window.kanbanShowProjects = checkbox.checked;
    localStorage.setItem('kanbanShowProjects', checkbox.checked);
    renderTasks();
}

function toggleKanbanNoDate() {
    const checkbox = document.getElementById('kanban-show-no-date');
    window.kanbanShowNoDate = checkbox.checked;
    localStorage.setItem('kanbanShowNoDate', checkbox.checked);
    renderTasks();
}

window.toggleKanbanSettings = toggleKanbanSettings;
window.toggleKanbanBacklog = toggleKanbanBacklog;
window.toggleKanbanProjects = toggleKanbanProjects;
window.toggleKanbanNoDate = toggleKanbanNoDate;

// Close settings panel when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('kanban-settings-panel');
    const btn = document.getElementById('kanban-settings-btn');
    if (panel && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        panel.classList.remove('active');
    }
});

async function updateTaskField(field, value) {
  const form = document.getElementById('task-form');
  const taskId = form?.dataset.editingTaskId;
  if (!taskId) return;

  // Capture old task state for history tracking
  const oldTask = tasks.find(t => t.id === parseInt(taskId, 10));
  const oldTaskCopy = oldTask ? JSON.parse(JSON.stringify(oldTask)) : null;

  // Use task service to update field
  const normalizedValue = field === 'description' ? autoLinkifyDescription(value) : value;

  // Avoid unnecessary background rerenders when the value didn't actually change
  if (oldTask) {
    const prev = oldTask[field];
    let isSame = false;

    if (field === 'projectId') {
      const nextProjectId =
        normalizedValue === '' || normalizedValue === null || typeof normalizedValue === 'undefined'
          ? null
          : parseInt(normalizedValue, 10);
      const prevProjectId = typeof oldTask.projectId === 'number' ? oldTask.projectId : null;
      isSame = (Number.isNaN(nextProjectId) ? null : nextProjectId) === prevProjectId;
    } else {
      const prevStr = typeof prev === 'string' ? prev : (prev || '');
      const nextStr = typeof normalizedValue === 'string' ? normalizedValue : (normalizedValue || '');
      isSame = prevStr === nextStr;
    }

    if (isSame) return;
  }

  const result = updateTaskFieldService(parseInt(taskId, 10), field, normalizedValue, tasks, settings);
  if (!result.task) return;

  // Record history for field update
  if (window.historyService && oldTaskCopy) {
    window.historyService.recordTaskUpdated(oldTaskCopy, result.task);
  }

  // Capture the project the detail view is currently showing this task under
  const prevProjectId = result.oldProjectId;

  // Update global tasks array
  tasks = result.tasks;
  const task = result.task;

  // Project-related changes can affect presence of "No Project" option
  if (field === 'projectId') {
    populateProjectOptions();
    const newProjectId = task.projectId;
    if (prevProjectId !== newProjectId) {
        if (prevProjectId) {
            touchProjectUpdatedAt(prevProjectId);
            recordProjectTaskLinkChange(prevProjectId, 'removed', task);
        }
        if (newProjectId) {
            touchProjectUpdatedAt(newProjectId);
            recordProjectTaskLinkChange(newProjectId, 'added', task);
        }
        saveProjects().catch(() => {});
    }
  }

    if (field === 'endDate') {
        // Toggle "No Date" option visibility on end date changes
        updateNoDateOptionVisibility();
    }

  // Save in background (non-blocking for instant UX)
  // This is safe because updateTaskField is triggered by blur events
  saveTasks().catch(error => {
    console.error('Failed to save task field update:', error);
    showErrorNotification(t('error.saveChangesFailed'));
  });

  // Check if we're in project details view
  const isInProjectDetails = document.getElementById("project-details").classList.contains("active");
    // Calendar refresh for fields that affect date/project placement
    const affectsPlacement =
      field === 'startDate' ||
      field === 'endDate' ||
      field === 'projectId' ||
      field === 'status' ||
      field === 'priority' ||
      field === 'title' ||
      field === 'tags';

    if (affectsPlacement) {
        reflowCalendarBars();
    }

    // For fields like description, updating data is enough; avoid repainting background views.
    if (!affectsPlacement) return;

    if (isInProjectDetails) {
        // Special handling when changing the project from within a project's view
        if (field === 'projectId') {
            const newProjectId = task.projectId; // after update
            if (!newProjectId) {
                // Cleared to "No Project" -> stay on current project and refresh it so the task disappears
                if (prevProjectId) {
                    showProjectDetails(prevProjectId);
                    return;
                }
            } else if (prevProjectId !== newProjectId) {
                // Moved to a different project -> navigate to the new project's details
                showProjectDetails(newProjectId);
                return;
            } else {
                // Still in the same project -> refresh current project view
                showProjectDetails(newProjectId);
                return;
            }
        } else {
            // For other field updates while viewing project details, refresh the current project
            const currentProjectId = prevProjectId
                || (window.location.hash && window.location.hash.startsWith('#project-')
                        ? parseInt(window.location.hash.replace('#project-',''), 10)
                        : null);
            if (currentProjectId) {
                showProjectDetails(currentProjectId);
                return;
            }
        }
    } else {
    // Otherwise refresh the main views
    renderTasks();
    // Always render list view on mobile (for mobile cards) or when active on desktop
    const isMobile = window.innerWidth <= 768;
    if (isMobile || document.getElementById('list-view').classList.contains('active')) renderListView();
    if (document.getElementById('projects').classList.contains('active')) {
        // Clear sorted view cache to force refresh with updated task data
        projectsSortedView = null;
        renderProjects();
        updateCounts();
    }
  }

  // Refresh date fields in UI if status change auto-filled them
  // Use setTimeout to ensure this happens after any rendering completes
  if (field === 'status' && (settings.autoSetStartDateOnStatusChange || settings.autoSetEndDateOnStatusChange)) {
    setTimeout(() => {
      const formNow = document.getElementById('task-form');
      if (!formNow) return; // Form might have closed

      const startDateInput = formNow.querySelector('input[name="startDate"]');
      const endDateInput = formNow.querySelector('input[name="endDate"]');

      // Update Start Date using Flatpickr API
      if (startDateInput && task.startDate) {
        const fpStart = startDateInput._flatpickrInstance;
        if (fpStart) {
          fpStart.setDate(new Date(task.startDate), false);
        }
        startDateInput.value = task.startDate;

        // Also update display input if it exists
        const displayStart = startDateInput.parentElement?.querySelector("input.date-display");
        if (displayStart) {
          displayStart.value = toDMYFromISO(task.startDate);
        }
      }

      // Update End Date using Flatpickr API
      if (endDateInput && task.endDate) {
        const fpEnd = endDateInput._flatpickrInstance;
        if (fpEnd) {
          fpEnd.setDate(new Date(task.endDate), false);
        }
        endDateInput.value = task.endDate;

        // Also update display input if it exists
        const displayEnd = endDateInput.parentElement?.querySelector("input.date-display");
        if (displayEnd) {
          displayEnd.value = toDMYFromISO(task.endDate);
        }
      }
    }, 50);
  }
}

// === Click outside to close task/project modals (keep ESC intact) ===

// Store initial form state to detect actual changes (not just default values)
let initialTaskFormState = null;

// Capture initial form state after defaults are set
function captureInitialTaskFormState() {
  const form = document.getElementById('task-form');
  if (!form) return;

  initialTaskFormState = {
    title: form.querySelector('input[name="title"]')?.value.trim() || "",
    description: document.getElementById('task-description-hidden')?.value.trim() || "",
    projectId: form.querySelector('input[name="projectId"]')?.value || form.querySelector('select[name="projectId"]')?.value || "",
    startDate: form.querySelector('input[name="startDate"]')?.value || "",
    endDate: form.querySelector('input[name="endDate"]')?.value || "",
    priority: form.querySelector('#hidden-priority')?.value || "medium",
    status: form.querySelector('#hidden-status')?.value || "backlog",
    tags: window.tempTags ? [...window.tempTags] : [],
    attachments: tempAttachments ? tempAttachments.length : 0
  };
}

// Detect unsaved data in NEW (not editing) task
function hasUnsavedNewTask() {
  const form = document.getElementById('task-form');
  if (!form) return false;
  if (form.dataset.editingTaskId) return false;
  if (!initialTaskFormState) return false; // No initial state captured

  const currentState = {
    title: form.querySelector('input[name="title"]')?.value.trim() || "",
    description: document.getElementById('task-description-hidden')?.value.trim() || "",
    projectId: form.querySelector('input[name="projectId"]')?.value || form.querySelector('select[name="projectId"]')?.value || "",
    startDate: form.querySelector('input[name="startDate"]')?.value || "",
    endDate: form.querySelector('input[name="endDate"]')?.value || "",
    priority: form.querySelector('#hidden-priority')?.value || "medium",
    status: form.querySelector('#hidden-status')?.value || "backlog",
    tags: window.tempTags ? [...window.tempTags] : [],
    attachments: tempAttachments ? tempAttachments.length : 0
  };

  // Compare current state with initial state
  return (
    currentState.title !== initialTaskFormState.title ||
    currentState.description !== initialTaskFormState.description ||
    currentState.projectId !== initialTaskFormState.projectId ||
    currentState.startDate !== initialTaskFormState.startDate ||
    currentState.endDate !== initialTaskFormState.endDate ||
    currentState.priority !== initialTaskFormState.priority ||
    currentState.status !== initialTaskFormState.status ||
    currentState.tags.length !== initialTaskFormState.tags.length ||
    currentState.attachments !== initialTaskFormState.attachments
  );
}

// Attach click-outside behavior to specific modals
function bindOverlayClose(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal || modal.__overlayBound) return;
  modal.__overlayBound = true;

  modal.addEventListener('pointerdown', e => {
    modal.__downOnOverlay = (e.target === modal);
  });

  modal.addEventListener('click', e => {
    const releasedOnOverlay = (e.target === modal);
    const startedOnOverlay = !!modal.__downOnOverlay;
    modal.__downOnOverlay = false;
    if (!releasedOnOverlay || !startedOnOverlay) return;

    // If closing an existing task via overlay, persist description first
    if (modalId === 'task-modal') {
      const form = document.getElementById('task-form');
      if (form && form.dataset.editingTaskId) {
        const descEditor = form.querySelector('#task-description-editor');
        if (descEditor) {
          updateTaskField('description', descEditor.innerHTML);
        }
      }
    }

    if (modalId === 'task-modal' && hasUnsavedNewTask()) {
      // Show custom unsaved changes modal
      showUnsavedChangesModal(modalId);
      return;
    }
    closeModal(modalId);
  });
}

// Bind to your existing modals
document.addEventListener('DOMContentLoaded', () => {
  bindOverlayClose('task-modal');
  bindOverlayClose('project-modal');
  bindOverlayClose('settings-modal');
});

// === ESC key close (existing behavior retained) ===
document.addEventListener('keydown', async e => {
  if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(m => {
            if (m.id === 'task-modal') {
                if (hasUnsavedNewTask()) {
                    showUnsavedChangesModal('task-modal');
                } else {
                    // Persist description for editing tasks before closing via ESC
                    const form = document.getElementById('task-form');
                    if (form && form.dataset.editingTaskId) {
                        const descEditor = form.querySelector('#task-description-editor');
                        if (descEditor) {
                            updateTaskField('description', descEditor.innerHTML);
                        }
                    }
                    closeModal(m.id);
                }
            } else {
                if (m.id === 'settings-modal' && window.settingsFormIsDirty) {
                    showUnsavedChangesModal('settings-modal');
                } else {
                    closeModal(m.id);
                }
            }
        });
  }

  // N key to toggle notifications
  if (e.key === 'n' || e.key === 'N') {
    // Don't trigger if user is typing in an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }

    e.preventDefault();
    const dropdown = document.getElementById('notification-dropdown');
    const toggle = document.getElementById('notification-toggle');
    if (!dropdown || !toggle) return;

    const isOpen = dropdown.classList.contains('active');
    if (isOpen) {
      closeNotificationDropdown();
    } else {
      closeUserDropdown();
      const state = await fetchNotificationState({ force: true });
      renderNotificationDropdown(state);
      dropdown.classList.add('active');
      toggle.classList.add('active');
      await markNotificationsSeen(state);
    }
  }
});


async function addTag() {
    const input = document.getElementById('tag-input');
    const tagName = input.value.trim().toLowerCase();
    
    if (!tagName) {
        input.style.border = '2px solid var(--accent-red, #ef4444)';
        setTimeout(() => { input.style.border = ''; }, 2000);
        return;
    }
    
    const taskId = document.getElementById('task-form').dataset.editingTaskId;
    
    if (taskId) {
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (!task) return;
        if (!task.tags) task.tags = [];
        if (task.tags.includes(tagName)) {
            input.value = '';
            return; // Already exists
        }

        // Store old state for history
        const oldTaskCopy = JSON.parse(JSON.stringify(task));

        task.tags = [...task.tags, tagName];
        renderTags(task.tags);

        // Reorganize mobile fields after tag addition
        reorganizeMobileTaskFields();

        // Record history
        if (window.historyService) {
            window.historyService.recordTaskUpdated(oldTaskCopy, task);
        }

        // Refresh views if in project details
        const isInProjectDetails = document.getElementById("project-details").classList.contains("active");
        if (isInProjectDetails && task.projectId) {
            showProjectDetails(task.projectId);
        } else {
            // Refresh Kanban view immediately
            renderTasks();

            const isMobile = window.innerWidth <= 768;
            if (isMobile || document.getElementById('list-view').classList.contains('active')) {
                renderListView();
            }
            if (document.getElementById('projects').classList.contains('active')) {
                // Clear sorted view cache to force refresh with updated tags
                projectsSortedView = null;
                renderProjects();
            }
        }

        populateTagOptions(); // Refresh tag dropdown only
        updateNoDateOptionVisibility();

        // Save in background
        saveTasks().catch(error => {
            console.error('Failed to save tag addition:', error);
            showErrorNotification(t('error.saveTagFailed'));
        });
    } else {
        // Creating new task - use temp array
        if (!window.tempTags) window.tempTags = [];
        if (window.tempTags.includes(tagName)) {
            input.value = '';
            return;
        }
        window.tempTags = [...window.tempTags, tagName];
        renderTags(window.tempTags);
    }
    
    input.value = '';
}

async function removeTag(tagName) {
    const taskId = document.getElementById('task-form').dataset.editingTaskId;

    if (taskId) {
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (!task || !task.tags) return;

        // Store old state for history
        const oldTaskCopy = JSON.parse(JSON.stringify(task));

        task.tags = task.tags.filter(t => t !== tagName);
        renderTags(task.tags);

        // Reorganize mobile fields after tag removal
        reorganizeMobileTaskFields();

        // Record history
        if (window.historyService) {
            window.historyService.recordTaskUpdated(oldTaskCopy, task);
        }

        // Save in background
        saveTasks().catch(error => {
            console.error('Failed to save tag removal:', error);
            showErrorNotification(t('error.removeTagFailed'));
        });

        // Refresh views if in project details
        const isInProjectDetails = document.getElementById("project-details").classList.contains("active");
        if (isInProjectDetails && task.projectId) {
            showProjectDetails(task.projectId);
        } else {
            renderTasks();
            const isMobile = window.innerWidth <= 768;
            if (isMobile || document.getElementById('list-view').classList.contains('active')) {
                renderListView();
            }
            if (document.getElementById('projects').classList.contains('active')) {
                // Clear sorted view cache to force refresh with updated tags
                projectsSortedView = null;
                renderProjects();
            }
        }

        populateTagOptions(); // Refresh tag dropdown only
    updateNoDateOptionVisibility();
    } else {
        if (!window.tempTags) window.tempTags = [];
        window.tempTags = window.tempTags.filter(t => t !== tagName);
        renderTags(window.tempTags);
    }
}

function renderTags(tags) {
    const container = document.getElementById('tags-display');
    if (!tags || tags.length === 0) {
        container.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">${t('tasks.tags.none')}</span>`;
        return;
    }

    // Detect mobile for smaller tag sizes
    const isMobile = window.innerWidth <= 768;
    const padding = isMobile ? '3px 6px' : '4px 8px';
    const fontSize = isMobile ? '11px' : '12px';
    const gap = isMobile ? '4px' : '4px';
    const buttonSize = isMobile ? '12px' : '14px';

    const lineHeight = isMobile ? '1.2' : '1.4';

    container.innerHTML = tags.map(tag => {
        const color = getTagColor(tag);
        return `
            <span class="task-tag" style="background-color: ${color}; color: white; padding: ${padding}; border-radius: 4px; font-size: ${fontSize}; display: inline-flex; align-items: center; gap: ${gap}; line-height: ${lineHeight};">
                ${escapeHtml(tag.toUpperCase())}
                <button type="button" data-action="removeTag" data-param="${escapeHtml(tag)}" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: ${buttonSize}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: auto;">×</button>
            </span>
        `;
    }).join('');
}

// === Project Tag Management ===
async function addProjectTag() {
    const input = document.getElementById('project-tag-input');
    const tagName = input.value.trim().toLowerCase();

    if (!tagName) {
        input.style.border = '2px solid var(--accent-red, #ef4444)';
        setTimeout(() => { input.style.border = ''; }, 2000);
        return;
    }

    const projectId = document.getElementById('project-form').dataset.editingProjectId;

    if (projectId) {
        const project = projects.find(p => p.id === parseInt(projectId));
        if (!project) return;
        if (!project.tags) project.tags = [];
        if (project.tags.includes(tagName)) {
            input.value = '';
            return; // Already exists
        }

        project.tags = [...project.tags, tagName];
        renderProjectTags(project.tags);

        // Clear sorted view cache to force refresh
        projectsSortedView = null;
        renderProjects();

        // Refresh tag dropdown
        populateProjectTagOptions();

        // Save in background
        saveProjects().catch(error => {
            console.error('Failed to save project tag addition:', error);
            showErrorNotification(t('error.saveTagFailed'));
        });
    } else {
        // Creating new project - use temp array
        if (!window.tempProjectTags) window.tempProjectTags = [];
        if (window.tempProjectTags.includes(tagName)) {
            input.value = '';
            return;
        }
        window.tempProjectTags = [...window.tempProjectTags, tagName];
        renderProjectTags(window.tempProjectTags);
    }

    input.value = '';
}

async function removeProjectTag(tagName) {
    const projectId = document.getElementById('project-form').dataset.editingProjectId;

    if (projectId) {
        const project = projects.find(p => p.id === parseInt(projectId));
        if (!project || !project.tags) return;

        project.tags = project.tags.filter(t => t !== tagName);
        renderProjectTags(project.tags);

        // Clear sorted view cache to force refresh
        projectsSortedView = null;
        renderProjects();

        // Refresh tag dropdown
        populateProjectTagOptions();

        // Save in background
        saveProjects().catch(error => {
            console.error('Failed to save project tag removal:', error);
            showErrorNotification(t('error.saveTagFailed'));
        });
    } else {
        // Creating new project - remove from temp array
        if (!window.tempProjectTags) return;
        window.tempProjectTags = window.tempProjectTags.filter(t => t !== tagName);
        renderProjectTags(window.tempProjectTags);
    }
}

function renderProjectTags(tags) {
    const container = document.getElementById('project-tags-display');
    if (!tags || tags.length === 0) {
        container.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">${t('tasks.tags.none')}</span>`;
        return;
    }

    // Get project color from editingProjectId or use default gray for new projects
    const projectId = document.getElementById('project-form')?.dataset.editingProjectId;
    const color = projectId ? getProjectColor(parseInt(projectId)) : '#6b7280';

    // Detect mobile for smaller tag sizes
    const isMobile = window.innerWidth <= 768;
    const padding = isMobile ? '3px 6px' : '4px 8px';
    const fontSize = isMobile ? '11px' : '12px';
    const gap = isMobile ? '4px' : '4px';
    const buttonSize = isMobile ? '12px' : '14px';
    const lineHeight = isMobile ? '1.2' : '1.4';

    container.innerHTML = tags.map(tag => {
        return `
            <span class="task-tag" style="background-color: ${color}; color: white; padding: ${padding}; border-radius: 4px; font-size: ${fontSize}; display: inline-flex; align-items: center; gap: ${gap}; line-height: ${lineHeight};">
                ${escapeHtml(tag.toUpperCase())}
                <button type="button" data-action="removeProjectTag" data-param="${escapeHtml(tag)}" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: ${buttonSize}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: auto;">×</button>
            </span>
        `;
    }).join('');
}

// === Project Details Tags Management ===
function renderProjectDetailsTags(tags, projectId) {
    const container = document.getElementById('project-details-tags-display');
    if (!container) return;

    if (!tags || tags.length === 0) {
        container.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">${t('tasks.tags.none')}</span>`;
        return;
    }

    // Use project color for all tags (or default gray if no projectId)
    const color = projectId ? getProjectColor(projectId) : '#6b7280';

    // Detect mobile for smaller tag sizes
    const isMobile = window.innerWidth <= 768;
    const padding = isMobile ? '3px 6px' : '4px 8px';
    const fontSize = isMobile ? '11px' : '12px';
    const gap = isMobile ? '4px' : '4px';
    const buttonSize = isMobile ? '12px' : '14px';
    const lineHeight = isMobile ? '1.2' : '1.4';

    container.innerHTML = tags.map(tag => {
        return `
            <span class="task-tag" style="background-color: ${color}; color: white; padding: ${padding}; border-radius: 4px; font-size: ${fontSize}; display: inline-flex; align-items: center; gap: ${gap}; line-height: ${lineHeight};">
                ${escapeHtml(tag.toUpperCase())}
                <button type="button" data-action="removeProjectDetailsTag" data-param="${escapeHtml(tag)}" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin: 0; font-size: ${buttonSize}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: auto;">×</button>
            </span>
        `;
    }).join('');
}

async function addProjectDetailsTag(projectId) {
    const input = document.getElementById('project-details-tag-input');
    if (!input) return;

    const tagName = input.value.trim().toLowerCase();

    if (!tagName) {
        input.style.border = '2px solid var(--accent-red, #ef4444)';
        setTimeout(() => { input.style.border = ''; }, 2000);
        return;
    }

    const project = projects.find(p => p.id === parseInt(projectId));
    if (!project) return;

    if (!project.tags) project.tags = [];
    if (project.tags.includes(tagName)) {
        input.value = '';
        return; // Already exists
    }

    project.tags = [...project.tags, tagName];
    renderProjectDetailsTags(project.tags, projectId);

    // Clear sorted view cache to force refresh
    projectsSortedView = null;
    renderProjects();

    // Refresh tag dropdown
    populateProjectTagOptions();

    // Save in background
    saveProjects().catch(error => {
        console.error('Failed to save project tag addition:', error);
        showErrorNotification(t('error.saveTagFailed'));
    });

    input.value = '';
}

async function removeProjectDetailsTag(tagName) {
    // Get project ID from the current project details view
    const titleDisplay = document.getElementById('project-title-display');
    if (!titleDisplay) return;

    const projectId = parseInt(titleDisplay.dataset.param);
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.tags) return;

    project.tags = project.tags.filter(t => t !== tagName);
    renderProjectDetailsTags(project.tags, projectId);

    // Clear sorted view cache to force refresh
    projectsSortedView = null;
    renderProjects();

    // Refresh tag dropdown
    populateProjectTagOptions();

    // Save in background
    saveProjects().catch(error => {
        console.error('Failed to save project tag removal:', error);
        showErrorNotification(t('error.saveTagFailed'));
    });
}


// === Event Delegation System ===
// Centralized click handler - replaces all inline onclick handlers
document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const param = target.dataset.param;
    const param2 = target.dataset.param2;

    // Action map - all functions that were previously in onclick handlers
    const actions = {
        // Theme & UI
        'toggleTheme': () => toggleTheme(),
        'showCalendarView': () => showCalendarView(),
        'toggleKanbanSettings': () => toggleKanbanSettings(event),

        // Modals
        'openProjectModal': () => openProjectModal(),
        'openTaskModal': () => openTaskModal(),
        'openSettingsModal': () => openSettingsModal(),
        'openTaskModalForProject': () => openTaskModalForProject(parseInt(param)),
        'openSelectedProjectFromTask': () => openSelectedProjectFromTask(),
        'closeModal': () => closeModal(param),
        'closeTaskModal': () => closeTaskModal(),
        'closeConfirmModal': () => closeConfirmModal(),
        'closeFeedbackDeleteModal': () => closeFeedbackDeleteModal(),
        'closeProjectConfirmModal': () => closeProjectConfirmModal(),
        'closeUnsavedChangesModal': () => closeUnsavedChangesModal(),
        'closeDayItemsModal': () => closeDayItemsModal(),
        'closeDayItemsModalOnBackdrop': () => closeDayItemsModalOnBackdrop(event),

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
                        openTaskDetails(taskId, navContext);
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
                            openTaskDetails(taskId, navContext);
                            return;
                        }
                    }
                }
            }

            // Default: open without navigation context
            openTaskDetails(taskId);
        },
        'deleteTask': () => deleteTask(),
        'duplicateTask': () => duplicateTask(),
        'confirmDelete': () => confirmDelete(),

        // Project operations
        'showProjectDetails': () => {
            if (target.dataset.stopPropagation) event.stopPropagation();
            const isDashboard = document.getElementById('dashboard').classList.contains('active');
            const referrer = isDashboard ? 'dashboard' : 'projects';
            showProjectDetails(parseInt(param), referrer);
        },
        'toggleProjectExpand': () => toggleProjectExpand(parseInt(param)),
        'toggleProjectMenu': () => toggleProjectMenu(event),
        'editProjectTitle': () => editProjectTitle(parseInt(param), param2),
        'saveProjectTitle': () => saveProjectTitle(parseInt(param)),
        'cancelProjectTitle': () => cancelProjectTitle(),
        'handleDeleteProject': () => handleDeleteProject(parseInt(param)),
        'handleDuplicateProject': () => handleDuplicateProject(parseInt(param)),
        'toggleProjectColorPicker': () => toggleProjectColorPicker(parseInt(param)),
        'updateProjectColor': () => updateProjectColor(parseInt(param), param2),
        'openCustomProjectColorPicker': () => openCustomProjectColorPicker(parseInt(param)),
        'navigateToProjectStatus': () => navigateToProjectStatus(parseInt(param), param2),
        'deleteProject': () => deleteProject(),
        'confirmProjectDelete': () => confirmProjectDelete(),
        'closeDuplicateProjectModal': () => closeDuplicateProjectModal(),
        'confirmDuplicateProject': () => confirmDuplicateProject(),

        // Feedback operations
        'addFeedbackItem': () => addFeedbackItem(),
        'deleteFeedbackItem': () => deleteFeedbackItem(parseInt(param)),
        'confirmFeedbackDelete': () => confirmFeedbackDelete(),

        // History operations
        'toggleHistoryEntry': () => toggleHistoryEntry(parseInt(param)),
        'toggleHistoryEntryInline': () => toggleHistoryEntryInline(parseInt(param)),

        // Formatting
        'formatTaskText': () => formatTaskText(param),
        'insertTaskHeading': () => insertTaskHeading(param),
        'insertTaskDivider': () => insertTaskDivider(),

        // Sorting & filtering
        'sortTable': () => sortTable(param),
        'toggleSortMode': () => toggleSortMode(),

        // Calendar
        'changeMonth': () => animateCalendarMonthChange(parseInt(param)),
        'goToToday': () => goToToday(),
        'showDayTasks': () => showDayTasks(param),

        // Attachments & tags
        'addAttachment': () => addAttachment(),
        'addFileAttachment': () => addFileAttachment(event),
        'addTag': () => addTag(),
        'removeTag': () => removeTag(param),
        'addProjectTag': () => addProjectTag(),
        'removeProjectTag': () => removeProjectTag(param),
        'addProjectDetailsTag': () => addProjectDetailsTag(param),
        'removeProjectDetailsTag': () => removeProjectDetailsTag(param),
        'removeAttachment': () => { removeAttachment(parseInt(param)); event.preventDefault(); },
        'openUrlAttachment': () => {
            if (!param) return;
            try {
                const href = decodeURIComponent(param);
                window.open(href, '_blank', 'noopener,noreferrer');
            } catch (e) {
                console.error('Failed to open URL attachment:', e);
            }
        },
        'downloadFileAttachment': () => downloadFileAttachment(param, param2, target.dataset.param3),
        'viewFile': () => viewFile(param, param2, target.dataset.param3),
      'viewImageLegacy': () => viewImageLegacy(param, param2),
      'viewFeedbackScreenshot': () => {
          if (!param) return;
          try {
              const decoded = decodeURIComponent(param);
              const src = decoded;
              const title = 'Feedback Screenshot';
              viewImageLegacy(src, title);
          } catch (e) {
              console.error('Failed to open feedback screenshot', e);
              showErrorNotification && showErrorNotification(t('error.openScreenshotFailed'));
          }
      },

        // Navigation
        'backToProjects': () => backToProjects(),
        'showAllActivity': () => showAllActivity(),
        'backToDashboard': () => backToDashboard(),
        'backToCalendar': () => backToCalendar(),
        'openUpdatesFromNotification': () => openUpdatesFromNotification(),
        'openDueTodayFromNotification': () => openDueTodayFromNotification(),

        // Other
        'dismissKanbanTip': () => dismissKanbanTip(),
        'confirmDiscardChanges': () => confirmDiscardChanges(),
        'closeReviewStatusConfirmModal': () => closeReviewStatusConfirmModal(),
        'confirmDisableReviewStatus': () => confirmDisableReviewStatus(),
        'closeCalendarCreateModal': () => closeCalendarCreateModal(),
        'confirmCreateTask': () => confirmCreateTask(),
        'signOut': () => signOut(),
        'exportDashboardData': () => exportDashboardData(),
        'closeExportDataModal': () => closeExportDataModal(),
        'confirmExportData': () => confirmExportData(),
        'generateReport': () => generateReport(),
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
                closeModal(param);
            }
        },

        // Combined actions
        'closeDayItemsAndOpenTask': () => {
            closeDayItemsModal();
            openTaskDetails(parseInt(param));
        },
        'closeDayItemsAndShowProject': () => {
            closeDayItemsModal();
            showProjectDetails(parseInt(param), 'calendar', { month: currentMonth, year: currentYear });
        },
        'deleteFeedbackItemWithStop': () => {
            deleteFeedbackItem(parseInt(param));
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
function clearAllFilters() {
    // Clear all filter states
    filterState.statuses.clear();
    filterState.priorities.clear();
    filterState.projects.clear();
    filterState.tags.clear();
    filterState.search = '';
    filterState.datePresets.clear();
    filterState.dateFrom = '';
    filterState.dateTo = '';

    // Clear search input
    const searchInput = document.getElementById('filter-search');
    if (searchInput) searchInput.value = '';

    // Clear date inputs
    const dueDateInput = document.getElementById('filter-due-date');
    const createdDateInput = document.getElementById('filter-created-date');
    if (dueDateInput) dueDateInput.value = '';
    if (createdDateInput) createdDateInput.value = '';

    // Clear date filter dropdown
    const dateFilterGlobal = document.getElementById('filter-date-global');
    if (dateFilterGlobal) dateFilterGlobal.value = '';

    // Uncheck all filter checkboxes
    const allCheckboxes = document.querySelectorAll('#global-filters input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // Update UI and sync URL (this calls updateFilterBadges, renderActiveFilterChips, syncURLWithFilters, and re-renders)
    renderAfterFilterChange();
}

// Super simple approach - just apply filters directly
function filterProjectTasks(projectId, status) {
    // Go to tasks page
    showPage('tasks');
    window.location.hash = 'tasks';
    
    // Set nav active
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const tasksNav = document.querySelector('.nav-item[data-page="tasks"]');
    if (tasksNav) tasksNav.classList.add('active');
    
    // Clear all filters
    filterState.statuses.clear();
    filterState.priorities.clear();
    filterState.projects.clear();
    filterState.tags.clear();
    filterState.dateFrom = '';
    filterState.dateTo = '';
    filterState.search = '';
    const searchEl = document.getElementById('filter-search');
    if (searchEl) searchEl.value = '';
    
    // Set the filters we want
    filterState.statuses.add(status);
    filterState.projects.add(projectId.toString());
    
    // Update UI
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll(`input[data-filter="status"][value="${status}"]`).forEach(cb => cb.checked = true);
    document.querySelectorAll(`input[data-filter="project"][value="${projectId}"]`).forEach(cb => cb.checked = true);
    
    // Show list view
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    const listBtn = document.querySelector('.view-btn:nth-child(2)');
    if (listBtn) listBtn.classList.add('active');
    
    const kanban = document.querySelector('.kanban-board');
    const list = document.getElementById('list-view');
    if (kanban) kanban.classList.add('hidden');
    if (list) list.classList.add('active');
    
    // Update display
    updateFilterBadges();
    renderListView();
}

window.filterProjectTasks = filterProjectTasks;

function navigateToProjectStatus(projectId, status) {
    // Use existing dashboard function and add project filter
    navigateToFilteredTasks('status', status);
    
    // Add project filter after the status filter is applied
    setTimeout(() => {
        // Ensure view toggle is visible
        const viewToggle = document.querySelector('.view-toggle');
        if (viewToggle) viewToggle.classList.remove('hidden');
        
        filterState.projects.add(projectId.toString());
        const projectCheckbox = document.querySelector(`input[data-filter="project"][value="${projectId}"]`);
        if (projectCheckbox) projectCheckbox.checked = true;
        updateFilterBadges();
        renderTasks(); // Re-render with both filters
    }, 200);
}

window.navigateToProjectStatus = navigateToProjectStatus;

function navigateToAllTasks() {
    // Navigate to tasks page
    window.location.hash = 'tasks';
    
    // Clear all nav highlights and set tasks as active
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const tasksNavItem = document.querySelector('.nav-item[data-page="tasks"]');
    if (tasksNavItem) tasksNavItem.classList.add('active');
    
    // Show tasks page
    showPage('tasks');
    
    // Switch to list view
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    const listViewBtn = document.querySelector('.view-btn[onclick*="list"], .view-btn:nth-child(2)');
    if (listViewBtn) listViewBtn.classList.add('active');
    
    // Hide kanban and calendar, show list view
    const kanbanBoard = document.querySelector('.kanban-board');
    const listView = document.getElementById('list-view');
    const calendarView = document.getElementById('calendar-view');
    
    if (kanbanBoard) kanbanBoard.classList.add('hidden');
    if (calendarView) calendarView.classList.remove('active');
    if (listView) listView.classList.add('active');
    
    // Clear any existing filters to show all tasks
    clearAllFilters();
    
    // Render the list view
    setTimeout(() => {
        renderListView();
    }, 100);
}

function filterProjectPortalList(query) {
    const container = projectPortalEl && projectPortalEl.querySelector('.project-portal-options');
    if (!container) return;
    const hiddenProject = document.getElementById('hidden-project');
    const selectedId = hiddenProject ? (hiddenProject.value || '') : '';
    const q = (query || '').toLowerCase();
    let items = '';
    if (selectedId) {
        items += `<div class="project-option" data-project-id="">${t('tasks.project.selectPlaceholder')}</div>`;
    }
    items += projects
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
        .filter(p => selectedId === '' || String(p.id) !== String(selectedId))
        .filter(p => !q || (p.name || '').toLowerCase().includes(q))
        .map(p => `<div class="project-option" data-project-id="${p.id}">${p.name}</div>`)
        .join('');
    container.innerHTML = items;
}

// Toggle visibility of the "No Date" option depending on tasks data
function updateNoDateOptionVisibility() {
    const sel = document.getElementById('filter-date-global');
    if (!sel) return;
    const noDateOpt = Array.from(sel.options).find(o => o.value === 'no-date');
    if (!noDateOpt) return;
    const hasNoDateTasks = tasks.some(t => !t.endDate);
    noDateOpt.style.display = hasNoDateTasks ? '' : 'none';
    // If user had selected 'no-date' but it's not applicable anymore, clear it
    // updateNoDateOptionVisibility function no longer needed with new date range filter
}

// Lightweight non-destructive sort for Projects view
let projectsSortedView = null;

// Update project status filter badge
function updateProjectStatusBadge() {
    const badge = document.getElementById('badge-project-status');
    if (!badge) return;
    const count = projectFilterState.statuses.size;
    badge.textContent = count === 0 ? '' : count;

    // Update button active state
    const button = badge.closest('.filter-button');
    if (button) {
        if (count > 0) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
}

function updateProjectTagsBadge() {
    const badge = document.getElementById('badge-project-tags');
    if (!badge) return;
    const count = projectFilterState.tags.size;
    badge.textContent = count === 0 ? '' : count;

    // Update button active state
    const button = badge.closest('.filter-button');
    if (button) {
        if (count > 0) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
}

function populateProjectTagOptions() {
    const tagUl = document.getElementById("project-tags-options");
    if (!tagUl) return;

    // Preserve previously selected tags from state
    const currentlySelected = new Set(projectFilterState.tags);

    // Collect all unique tags from all projects
    const allTags = new Set();
    projects.forEach(p => {
        if (p.tags && p.tags.length > 0) {
            p.tags.forEach(tag => allTags.add(tag));
        }
    });

    tagUl.innerHTML = "";

    if (allTags.size === 0) {
        const li = document.createElement("li");
        li.textContent = t('filters.noOtherTags');
        li.style.color = "var(--text-muted)";
        li.style.padding = "8px 12px";
        tagUl.appendChild(li);
    } else {
        Array.from(allTags).sort().forEach((tag) => {
            const li = document.createElement("li");
            const id = `project-tag-${tag}`;
            const checked = currentlySelected.has(tag) ? 'checked' : '';
            li.innerHTML = `<label><input type="checkbox" id="${id}" value="${tag}" data-filter="project-tags" ${checked}> ${tag.toUpperCase()}</label>`;
            tagUl.appendChild(li);
        });
    }

    // Re-attach event listeners for new checkboxes
    tagUl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener("change", () => {
            if (cb.checked) {
                projectFilterState.tags.add(cb.value);
            } else {
                projectFilterState.tags.delete(cb.value);
            }
            updateProjectTagsBadge();
            applyProjectFilters();
        });
    });
}

function getProjectUpdatedFilterLabel(value) {
    switch (value) {
        case '5m': return '5m';
        case '30m': return '30m';
        case '24h': return '24h';
        case 'week': return t('filters.updated.week');
        case 'month': return t('filters.updated.month');
        case 'all':
        default:
            return '';
    }
}

function getProjectsUpdatedCutoffTime(value) {
    const now = Date.now();
    switch (value) {
        case '5m': return now - 5 * 60 * 1000;
        case '30m': return now - 30 * 60 * 1000;
        case '24h': return now - 24 * 60 * 60 * 1000;
        case 'week': return now - 7 * 24 * 60 * 60 * 1000;
        case 'month': return now - 30 * 24 * 60 * 60 * 1000;
        case 'all':
        default:
            return null;
    }
}

function getProjectUpdatedTime(project) {
    const raw = (project && (project.updatedAt || project.createdAt)) || "";
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? time : 0;
}

function updateProjectsUpdatedFilterUI() {
    const badge = document.getElementById('badge-project-updated');
    if (badge) {
        badge.textContent = getProjectUpdatedFilterLabel(projectFilterState.updatedFilter);

        // Update button active state
        const button = badge.closest('.filter-button');
        if (button) {
            if (projectFilterState.updatedFilter !== 'all') {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }
    try {
        document
            .querySelectorAll('input[type="radio"][data-filter="project-updated"][name="project-updated-filter"]')
            .forEach((rb) => {
                rb.checked = rb.value === projectFilterState.updatedFilter;
            });
    } catch (e) {}
}

function renderProjectsActiveFilterChips() {
    const wrap = document.getElementById('projects-active-filters');
    if (!wrap) return;
    wrap.innerHTML = '';

    const addChip = (label, value, onRemove) => {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        const text = document.createElement('span');
        text.className = 'chip-text';
        text.textContent = value != null && value !== '' ? `${label}: ${value}` : label;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-remove';
        btn.setAttribute('aria-label', t('filters.chip.removeAria', { label }));
        btn.textContent = 'x';
        btn.addEventListener('click', onRemove);

        chip.appendChild(text);
        chip.appendChild(btn);
        wrap.appendChild(chip);
    };

    // Search chip
    if (projectFilterState.search) {
        addChip(t('filters.chip.search'), projectFilterState.search, () => {
            projectFilterState.search = '';
            const el = document.getElementById('projects-search');
            if (el) el.value = '';
            const cur = loadProjectsViewState() || {};
            saveProjectsViewState({ ...cur, search: '' });
            applyProjectFilters();
        });
    }

    // Status chips
    projectFilterState.statuses.forEach((v) => {
        addChip(t('projects.filters.status'), getProjectStatusLabel(v), () => {
            projectFilterState.statuses.delete(v);
            const cb = document.querySelector(`input[type="checkbox"][data-filter="project-status"][value="${v}"]`);
            if (cb) cb.checked = false;
            updateProjectStatusBadge();
            applyProjectFilters();
        });
    });

    // Updated chip
    if (projectFilterState.updatedFilter && projectFilterState.updatedFilter !== 'all') {
        addChip(t('filters.chip.updated'), getProjectUpdatedFilterLabel(projectFilterState.updatedFilter), () => {
            projectFilterState.updatedFilter = 'all';
            updateProjectsUpdatedFilterUI();
            const cur = loadProjectsViewState() || {};
            saveProjectsViewState({ ...cur, updatedFilter: 'all' });
            applyProjectFilters();
        });
    }

    // Task filter chip
    if (projectFilterState.taskFilter === 'has-tasks' || projectFilterState.taskFilter === 'no-tasks') {
        const label = projectFilterState.taskFilter === 'has-tasks'
            ? t('projects.filters.hasTasks')
            : t('projects.filters.noTasks');
        addChip(label, '', () => {
            projectFilterState.taskFilter = '';
            document
                .querySelectorAll('#projects .projects-filters .pf-chip')
                .forEach((c) => c.classList.remove('active'));
            const cur = loadProjectsViewState() || {};
            saveProjectsViewState({ ...cur, filter: '' });
            applyProjectFilters();
        });
    }

    // Tags chips
    projectFilterState.tags.forEach((tag) => {
        addChip(t('projects.filters.tags'), tag.toUpperCase(), () => {
            projectFilterState.tags.delete(tag);
            const cb = document.querySelector(`input[type="checkbox"][data-filter="project-tags"][value="${tag}"]`);
            if (cb) cb.checked = false;
            updateProjectTagsBadge();
            applyProjectFilters();
        });
    });
}

// Apply all project filters
function applyProjectFilters() {
    let filtered = projects.slice();

    // Apply status filter
    if (projectFilterState.statuses.size > 0) {
        filtered = filtered.filter(p => {
            const status = getProjectStatus(p.id);
            return projectFilterState.statuses.has(status);
        });
    }

    // Apply task filter
    if (projectFilterState.taskFilter === 'has-tasks') {
        filtered = filtered.filter(p => tasks.some(t => t.projectId === p.id));
    } else if (projectFilterState.taskFilter === 'no-tasks') {
        filtered = filtered.filter(p => !tasks.some(t => t.projectId === p.id));
    }

    // Apply tags filter
    if (projectFilterState.tags.size > 0) {
        filtered = filtered.filter(p => {
            if (!p.tags || p.tags.length === 0) return false;
            return Array.from(projectFilterState.tags).some(tag => p.tags.includes(tag));
        });
    }

    // Apply updated recency filter
    if (projectFilterState.updatedFilter && projectFilterState.updatedFilter !== 'all') {
        const cutoff = getProjectsUpdatedCutoffTime(projectFilterState.updatedFilter);
        if (cutoff != null) {
            filtered = filtered.filter(p => getProjectUpdatedTime(p) >= cutoff);
        }
    }

    // Apply search filter
    if (projectFilterState.search) {
        const q = projectFilterState.search.toLowerCase();
        filtered = filtered.filter(p => ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q));
    }

    // Apply current sort if any
    const saved = loadProjectsViewState() || { search: '', filter: '', sort: 'default', sortDirection: 'asc', updatedFilter: 'all' };
    if (saved.sort && saved.sort !== 'default') {
        applyProjectsSort(saved.sort, filtered);
    } else {
        // Default sort by status
        applyProjectsSort('default', filtered);
    }

    updateProjectsClearButtonVisibility();
    try { renderProjectsActiveFilterChips(); } catch (e) {}
}

/**
 * applyProjectsSort(value, base)
 * value: sort key (same as before)
 * base: optional array of projects to sort (e.g., filtered view). If omitted, use full projects array.
 */
function applyProjectsSort(value, base) {
    // Use provided base or full projects, but do not mutate original arrays
    const view = (base && Array.isArray(base) ? base.slice() : projects.slice());
    const direction = projectSortState.direction;
    const isDesc = direction === 'desc';
    const normalizedValue = (value === 'name-asc' || value === 'name-desc') ? 'name' : value;

    if (!normalizedValue || normalizedValue === 'default') {
        // Sort by status: active, planning, completed (or reversed)
        const statusOrder = { 'active': 0, 'planning': 1, 'completed': 2 };
        view.sort((a, b) => {
            const statusA = getProjectStatus(a.id);
            const statusB = getProjectStatus(b.id);
            const result = (statusOrder[statusA] || 999) - (statusOrder[statusB] || 999);
            return isDesc ? -result : result;
        });
        projectsSortedView = view;
        renderView(view);
        return;
    }

    if (normalizedValue === 'name') {
        view.sort((a,b) => {
            const result = (a.name||'').localeCompare(b.name||'');
            return isDesc ? -result : result;
        });
    } else if (normalizedValue === 'created-desc') {
        view.sort((a,b) => {
            const result = new Date(b.createdAt) - new Date(a.createdAt);
            return isDesc ? -result : result;
        });
    } else if (normalizedValue === 'updated-desc') {
        view.sort((a,b) => {
            const aDate = new Date(a.updatedAt || a.createdAt);
            const bDate = new Date(b.updatedAt || b.createdAt);
            const result = bDate - aDate;
            return isDesc ? -result : result;
        });
    } else if (normalizedValue === 'tasks-desc') {
        view.sort((a,b) => {
            const result = (tasks.filter(t=>t.projectId===b.id).length) - (tasks.filter(t=>t.projectId===a.id).length);
            return isDesc ? -result : result;
        });
    } else if (normalizedValue === 'completion-desc') {
        // Sort by completion percentage
        view.sort((a,b) => {
            const aTotal = tasks.filter(t => t.projectId === a.id).length;
            const aDone = tasks.filter(t => t.projectId === a.id && t.status === 'done').length;
            const aPercent = aTotal > 0 ? (aDone / aTotal) * 100 : 0;

            const bTotal = tasks.filter(t => t.projectId === b.id).length;
            const bDone = tasks.filter(t => t.projectId === b.id && t.status === 'done').length;
            const bPercent = bTotal > 0 ? (bDone / bTotal) * 100 : 0;

            const result = bPercent - aPercent;
            return isDesc ? -result : result;
        });
    }

    projectsSortedView = view;
    // Render the view without changing the source
    const container = document.getElementById('projects-list');
    if (!container) return;

    // Save expanded state before re-rendering
    const expandedProjects = new Set();
    container.querySelectorAll('.project-list-item.expanded').forEach(item => {
        const projectId = item.id.replace('project-item-', '');
        expandedProjects.add(projectId);
    });

    // Re-render
    container.innerHTML = projectsSortedView.map(generateProjectItemHTML).join('');

    // Restore expanded state
    expandedProjects.forEach(projectId => {
        const item = document.getElementById(`project-item-${projectId}`);
        if (item) {
            item.classList.add('expanded');
        }
    });

    renderMobileProjects(projectsSortedView);
    scheduleExpandedTaskRowLayoutUpdate(container);
}

function getProjectSortLabel(sortKey) {
    const map = {
        'default': t('projects.sort.statusLabel'),
        'name': t('projects.sort.nameLabel'),
        'name-asc': t('projects.sort.nameLabel'),
        'name-desc': t('projects.sort.nameLabel'),
        'created-desc': t('projects.sort.newestLabel'),
        'updated-desc': t('projects.sort.lastUpdatedLabel'),
        'tasks-desc': t('projects.sort.mostTasksLabel'),
        'completion-desc': t('projects.sort.percentCompletedLabel')
    };
    return map[sortKey] || sortKey;
}

function refreshProjectsSortLabel() {
    const sortLabel = document.getElementById('projects-sort-label');
    if (!sortLabel) return;
    const sortKey = projectSortState?.lastSort || 'default';
    const baseLabel = getProjectSortLabel(sortKey);
    const directionIndicator = projectSortState?.direction === 'asc' ? 'asc' : 'desc';
    sortLabel.textContent = t('projects.sort.prefix', { label: baseLabel, direction: directionIndicator });
    const arrow = document.querySelector('#projects-sort-btn .sort-label-arrow');
    if (arrow) setProjectsSortArrow(arrow, directionIndicator);
    try { updateProjectsSortOptionsUI(); } catch (e) {}
}

function setProjectsSortArrow(el, direction) {
    if (!el) return;
    el.classList.toggle('is-up', direction === 'asc');
    el.classList.toggle('is-down', direction !== 'asc');
    el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20 L6 14 H10 V4 H14 V14 H18 Z" fill="currentColor"/></svg>';
}

function applyProjectsSortSelection(sortKey, { toggleDirection = false } = {}) {
    const nextSortKey = sortKey || 'default';
    const sameSort = projectSortState.lastSort === nextSortKey;
    if (toggleDirection || sameSort) {
        projectSortState.direction = projectSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        projectSortState.direction = 'asc';
    }
    projectSortState.lastSort = nextSortKey;
    refreshProjectsSortLabel();
    try { updateProjectsSortOptionsUI(); } catch (e) {}

    const saved = loadProjectsViewState() || { search: '', filter: '', sort: 'default' };
    saveProjectsViewState({ ...saved, sort: nextSortKey, sortDirection: projectSortState.direction });
    applyProjectFilters();
}

function updateProjectsSortOptionsUI() {
    const panel = document.getElementById('projects-sort-panel');
    if (!panel) return;
    const current = projectSortState?.lastSort || 'default';
    const directionIndicator = projectSortState?.direction === 'asc' ? 'asc' : 'desc';
    panel.querySelectorAll('.projects-sort-option').forEach(opt => {
        const isActive = opt.dataset.sort === current;
        opt.classList.toggle('is-active', isActive);
        let indicator = opt.querySelector('.sort-option-indicator');
        if (!indicator) {
            indicator = document.createElement('button');
            indicator.type = 'button';
            indicator.className = 'sort-option-indicator';
            indicator.setAttribute('aria-label', t('projects.sort.help'));
            opt.appendChild(indicator);
        }
        if (isActive) {
            setProjectsSortArrow(indicator, directionIndicator);
        }
        indicator.style.visibility = isActive ? 'visible' : 'hidden';
    });
}
// Hook up the select after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Sort button + panel handlers
    const sortBtn = document.getElementById('projects-sort-btn');
    const sortPanel = document.getElementById('projects-sort-panel');
    const sortLabel = document.getElementById('projects-sort-label');
    if (sortBtn && sortPanel) {
        sortBtn.addEventListener('click', (e) => {
            if (e.target.closest('.sort-label-arrow')) {
                e.preventDefault();
                e.stopPropagation();
                applyProjectsSortSelection(projectSortState?.lastSort || 'default', { toggleDirection: true });
                return;
            }
            const open = sortBtn.getAttribute('aria-expanded') === 'true';
            const willOpen = !open;
            sortBtn.setAttribute('aria-expanded', String(willOpen));
            if (willOpen) {
                sortPanel.setAttribute('aria-hidden', 'false');
                sortPanel.removeAttribute('inert');
            } else {
                if (sortPanel.contains(document.activeElement)) {
                    sortBtn.focus();
                }
                sortPanel.setAttribute('aria-hidden', 'true');
                sortPanel.setAttribute('inert', '');
            }
            try { updateProjectsSortOptionsUI(); } catch (e) {}
            e.stopPropagation();
        });
        // Clicking an option
        // If there are duplicate panels (from previous DOM states), select carefully
        const panel = document.getElementById('projects-sort-panel');
        if (!panel) return;
        panel.querySelectorAll('.projects-sort-option').forEach(opt => {
            opt.addEventListener('click', (ev) => {
                const sortKey = opt.dataset.sort || 'default';
                const clickedIndicator = ev.target && ev.target.classList && ev.target.classList.contains('sort-option-indicator');
                applyProjectsSortSelection(sortKey, { toggleDirection: clickedIndicator || projectSortState.lastSort === sortKey });

                if (!clickedIndicator) {
                    sortBtn.setAttribute('aria-expanded', 'false');
                    if (sortPanel.contains(document.activeElement)) {
                        sortBtn.focus();
                    }
                    sortPanel.setAttribute('aria-hidden', 'true');
                    sortPanel.setAttribute('inert', '');
                } else {
                    sortPanel.removeAttribute('inert');
                    ev.stopPropagation();
                }
            });
        });

        // Close panel on outside click
        document.addEventListener('click', () => {
            sortBtn.setAttribute('aria-expanded', 'false');
            if (sortPanel.contains(document.activeElement)) {
                sortBtn.focus();
            }
            sortPanel.setAttribute('aria-hidden', 'true');
            sortPanel.setAttribute('inert', '');
        });
    }

    // Project status filter (open/close handled by setupFilterEventListeners)
    const statusFilterGroup = document.getElementById('group-project-status');
    if (statusFilterGroup) {
        const checkboxes = statusFilterGroup.querySelectorAll('input[type="checkbox"][data-filter="project-status"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) projectFilterState.statuses.add(cb.value);
                else projectFilterState.statuses.delete(cb.value);
                updateProjectStatusBadge();
                applyProjectFilters();
                // Sync URL with new status filter
                syncURLWithProjectFilters();
            });
        });
    }

    // Projects search
    const search = document.getElementById('projects-search');
    if (search) {
        search.addEventListener('input', debounce((e) => {
            projectFilterState.search = (e.target.value || '').trim();
            applyProjectFilters();
            const cur = loadProjectsViewState() || {};
            saveProjectsViewState({ ...cur, search: e.target.value });
        }, 220));
    }

    // Task filter chips (has-tasks, no-tasks)
    const chips = Array.from(document.querySelectorAll('.pf-chip'));
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const v = chip.dataset.filter;

            // Toggle chip
            if (chip.classList.contains('active')) {
                chip.classList.remove('active');
                projectFilterState.taskFilter = '';
            } else {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                projectFilterState.taskFilter = v;
            }

            applyProjectFilters();
            const cur = loadProjectsViewState() || {};
            saveProjectsViewState({ ...cur, filter: projectFilterState.taskFilter || '' });
        });
    });

    // Clear filters button
    const clearBtn = document.getElementById('btn-clear-projects');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearProjectFilters);
    }

    // Ensure visibility is synced at start
    updateProjectsClearButtonVisibility();
});

// Expose clearProjectFilters to window for potential external use
window.clearProjectFilters = clearProjectFilters;

// --- Utilities: debounce and persistence for Projects view state ---
function debounce(fn, wait) {
    let t = null;
    return function(...args) {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Sync current project filter state to URL for shareable links and browser history
function syncURLWithProjectFilters() {
    const params = new URLSearchParams();
    const state = loadProjectsViewState() || {};

    // Add search query (from projectFilterState for real-time updates)
    const searchValue = projectFilterState.search || state.search;
    if (searchValue && searchValue.trim() !== "") {
        params.set("search", searchValue.trim());
    }

    // Add status filter (from projectFilterState - comma-separated)
    if (projectFilterState.statuses.size > 0) {
        params.set("status", Array.from(projectFilterState.statuses).join(","));
    }

    // Add chip filter (has-tasks or no-tasks)
    const chipFilter = projectFilterState.taskFilter || state.filter;
    if (chipFilter && ['has-tasks', 'no-tasks'].includes(chipFilter)) {
        params.set("filter", chipFilter);
    }

    // Add sort
    if (state.sort && state.sort !== 'default') {
        params.set("sort", state.sort);
    }

    // Add sort direction (only if not default)
    if (state.sortDirection && state.sortDirection !== 'asc') {
        params.set("sortDirection", state.sortDirection);
    }

    // Add updated filter (from projectFilterState for real-time updates)
    const updatedFilter = projectFilterState.updatedFilter || state.updatedFilter;
    if (updatedFilter && updatedFilter !== 'all') {
        params.set("updatedFilter", updatedFilter);
    }

    // Build new URL
    const queryString = params.toString();
    const newHash = queryString ? `#projects?${queryString}` : "#projects";

    // Update URL without triggering hashchange event (prevents infinite loop)
    if (window.location.hash !== newHash) {
        window.history.replaceState(null, "", newHash);
    }
}

function saveProjectsViewState(state) {
    try {
        localStorage.setItem('projectsViewState', JSON.stringify(state));
        // Sync URL with the new state
        syncURLWithProjectFilters();
    } catch (e) {}
}

function loadProjectsViewState() {
    try {
        const raw = localStorage.getItem('projectsViewState');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;

        // Normalize legacy/invalid values so UI doesn't show "Clear Filters" when nothing is applied.
        // `filter: "clear"` used to be treated as a sentinel; treat it as "no filter".
        if (parsed.filter === 'clear') parsed.filter = '';
        if (parsed.filter && parsed.filter !== 'has-tasks' && parsed.filter !== 'no-tasks') parsed.filter = '';
        if (parsed.updatedFilter == null) parsed.updatedFilter = 'all';
        if (parsed.updatedFilter && typeof parsed.updatedFilter === 'string') {
            const allowed = new Set(['all', '5m', '30m', '24h', 'week', 'month']);
            if (!allowed.has(parsed.updatedFilter)) parsed.updatedFilter = 'all';
        }

        return parsed;
    } catch (e) { return null; }
}


// Helper: render a view array of projects (used by search/chips)
function renderView(view) {
    const container = document.getElementById('projects-list');
    if (!container) return;
    if (!view || view.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>${t('projects.empty.filteredTitle')}</h3></div>`;
        renderMobileProjects([]);
        return;
    }

    // Save expanded state before re-rendering
    const expandedProjects = new Set();
    container.querySelectorAll('.project-list-item.expanded').forEach(item => {
        const projectId = item.id.replace('project-item-', '');
        expandedProjects.add(projectId);
    });

    // Re-render with new list layout
    container.innerHTML = view.map(generateProjectItemHTML).join('');

    // Restore expanded state
    expandedProjects.forEach(projectId => {
        const item = document.getElementById(`project-item-${projectId}`);
        if (item) {
            item.classList.add('expanded');
        }
    });

    renderMobileProjects(view);
}

// Initialize and persist project header controls
function setupProjectsControls() {
    const sel = document.getElementById('projects-sort');
    const sortBtn = document.getElementById('projects-sort-btn');
    const sortLabel = document.getElementById('projects-sort-label');
    const search = document.getElementById('projects-search');
    const chips = Array.from(document.querySelectorAll('.pf-chip'));

    // Load saved state from localStorage
    const saved = loadProjectsViewState() || { search: '', filter: '', sort: 'default', sortDirection: 'asc', updatedFilter: 'all' };

    // Merge with URL parameters (URL params take priority for deep linking)
    const urlFilters = window.urlProjectFilters || {};
    const mergedState = {
        search: urlFilters.search !== undefined ? urlFilters.search : saved.search,
        filter: urlFilters.filter !== undefined ? urlFilters.filter : saved.filter,
        sort: urlFilters.sort !== undefined ? urlFilters.sort : saved.sort,
        sortDirection: urlFilters.sortDirection !== undefined ? urlFilters.sortDirection : saved.sortDirection,
        updatedFilter: urlFilters.updatedFilter !== undefined ? urlFilters.updatedFilter : saved.updatedFilter
    };

    // Sanitize merged task filter value (prevents phantom "Clear Filters" on refresh)
    if (mergedState.filter === 'clear') mergedState.filter = '';
    if (mergedState.filter && mergedState.filter !== 'has-tasks' && mergedState.filter !== 'no-tasks') {
        mergedState.filter = '';
    }

    // Apply status filters from URL (if present)
    if (urlFilters.statuses && Array.isArray(urlFilters.statuses) && urlFilters.statuses.length > 0) {
        projectFilterState.statuses.clear();
        urlFilters.statuses.forEach(status => projectFilterState.statuses.add(status));

        // Update checkbox UI
        const statusCheckboxes = document.querySelectorAll('input[type="checkbox"][data-filter="project-status"]');
        statusCheckboxes.forEach(cb => {
            cb.checked = projectFilterState.statuses.has(cb.value);
        });
        updateProjectStatusBadge();
    }

    // Apply search to projectFilterState
    if (mergedState.search) {
        projectFilterState.search = mergedState.search;
    }

    // Apply chip filter to projectFilterState
    if (mergedState.filter) {
        projectFilterState.taskFilter = mergedState.filter;
    }

    // Clear URL filters after reading them (one-time use for deep linking)
    window.urlProjectFilters = null;

    // Restore sort state (normalize legacy name sort keys)
    let restoredSort = mergedState.sort || 'default';
    let restoredDirection = mergedState.sortDirection || 'asc';
    if (restoredSort === 'name-asc') {
        restoredSort = 'name';
        restoredDirection = 'asc';
    } else if (restoredSort === 'name-desc') {
        restoredSort = 'name';
        restoredDirection = 'desc';
    }
    projectSortState.lastSort = restoredSort;
    projectSortState.direction = restoredDirection;

    // Apply merged search value to the input (don't render yet)
    if (search) search.value = mergedState.search || '';

    // Apply merged chip selection only if it maps to an existing chip (has-tasks or no-tasks only)
    if (chips && chips.length) {
        chips.forEach(c => c.classList.remove('active'));
        if (mergedState.filter && ['has-tasks','no-tasks'].includes(mergedState.filter)) {
            const activeChip = chips.find(c => c.dataset.filter === mergedState.filter);
            if (activeChip) activeChip.classList.add('active');
        }
    }

    // Prepare initial base according to filters, then apply merged sort and render
    let initialBase = projectsSortedView && projectsSortedView.length ? projectsSortedView.slice() : projects.slice();

    // Filter by search
    if (search && search.value && search.value.trim() !== '') {
        const q = search.value.trim().toLowerCase();
        initialBase = initialBase.filter(p => ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q));
    }

    // Filter by status (from projectFilterState.statuses)
    if (projectFilterState.statuses.size > 0) {
        initialBase = initialBase.filter(p => {
            const status = getProjectStatus(p.id);
            return projectFilterState.statuses.has(status);
        });
    }

    // Filter by chip selection (has-tasks or no-tasks)
    const chipFilter = mergedState.filter || projectFilterState.taskFilter;
    if (chipFilter === 'has-tasks') {
        initialBase = initialBase.filter(p => tasks.some(t => t.projectId === p.id));
    } else if (chipFilter === 'no-tasks') {
        initialBase = initialBase.filter(p => !tasks.some(t => t.projectId === p.id));
    }

    // Filter by updated recency (restored from localStorage/URL)
    if (mergedState.updatedFilter && mergedState.updatedFilter !== 'all') {
        const cutoff = getProjectsUpdatedCutoffTime(mergedState.updatedFilter);
        if (cutoff != null) {
            initialBase = initialBase.filter(p => getProjectUpdatedTime(p) >= cutoff);
        }
    }

    // Apply merged sort label with direction indicator
    if (sortBtn) {
        const sortKey = mergedState.sort || 'default';
        const baseLabel = getProjectSortLabel(sortKey);
        const directionIndicator = projectSortState.direction === 'asc' ? 'asc' : 'desc';
        const labelText = t('projects.sort.prefix', { label: baseLabel, direction: directionIndicator });
        if (sortLabel) sortLabel.textContent = labelText;
        const arrow = document.querySelector('#projects-sort-btn .sort-label-arrow');
        if (arrow) setProjectsSortArrow(arrow, directionIndicator);
    }

    // Restore updated filter state + UI
    {
        const allowed = new Set(['all', '5m', '30m', '24h', 'week', 'month']);
        const normalized = allowed.has(mergedState.updatedFilter) ? mergedState.updatedFilter : 'all';
        projectFilterState.updatedFilter = normalized;
        updateProjectsUpdatedFilterUI();
        try { renderProjectsActiveFilterChips(); } catch (e) {}

        document
            .querySelectorAll('input[type="radio"][data-filter="project-updated"][name="project-updated-filter"]')
            .forEach((rb) => {
                if (rb.__projectUpdatedBound) return;
                rb.__projectUpdatedBound = true;
                rb.addEventListener('change', () => {
                    if (!rb.checked) return;
                    projectFilterState.updatedFilter = allowed.has(rb.value) ? rb.value : 'all';
                    updateProjectsUpdatedFilterUI();
                    applyProjectFilters();
                    const cur = loadProjectsViewState() || mergedState;
                    saveProjectsViewState({ ...cur, updatedFilter: projectFilterState.updatedFilter });
                    updateProjectsClearButtonVisibility();
                });
            });
    }

    // Finally apply saved sort to the initial base and render
    const selSort = projectSortState.lastSort || 'default';
    applyProjectsSort(selSort, initialBase);

    // Event listeners are set up once in DOMContentLoaded - no need to add duplicates here

    // Ensure visibility is synced after setup
    updateProjectsClearButtonVisibility();
}

// Show/hide the Projects-specific Clear button when a projects filter/search is active
function updateProjectsClearButtonVisibility() {
    const btn = document.getElementById('btn-clear-projects');
    if (!btn) return;
    const hasSearch = projectFilterState.search && projectFilterState.search.trim() !== '';
    const hasStatusFilter = projectFilterState.statuses.size > 0;
    const hasTaskFilter = projectFilterState.taskFilter !== '';
    const hasUpdatedFilter = projectFilterState.updatedFilter && projectFilterState.updatedFilter !== 'all';
    const hasTagsFilter = projectFilterState.tags.size > 0;
    const shouldShow = hasSearch || hasStatusFilter || hasTaskFilter || hasUpdatedFilter || hasTagsFilter;
    btn.style.display = shouldShow ? 'inline-flex' : 'none';
}

// Clear all project filters
function clearProjectFilters() {
    projectFilterState.search = '';
    projectFilterState.statuses.clear();
    projectFilterState.taskFilter = '';
    projectFilterState.updatedFilter = 'all';
    projectFilterState.tags.clear();

    // Clear UI
    const searchEl = document.getElementById('projects-search');
    if (searchEl) searchEl.value = '';

    const chips = Array.from(document.querySelectorAll('.pf-chip'));
    chips.forEach(c => c.classList.remove('active'));

    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-filter="project-status"]');
    checkboxes.forEach(cb => cb.checked = false);

    const tagCheckboxes = document.querySelectorAll('input[type="checkbox"][data-filter="project-tags"]');
    tagCheckboxes.forEach(cb => cb.checked = false);

    document
        .querySelectorAll('input[type="radio"][data-filter="project-updated"][name="project-updated-filter"]')
        .forEach(rb => rb.checked = rb.value === 'all');
    updateProjectsUpdatedFilterUI();

    updateProjectStatusBadge();
    updateProjectTagsBadge();
    applyProjectFilters();
}

// Handle Enter-like behavior for checklist rows. This centralizes the logic so
// both the Enter key and the toolbar button can perform the same action.
function handleChecklistEnter(editor) {
    if (!editor) return false;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const checkText = container.nodeType === 1 ? container.closest?.('.check-text') : container.parentElement?.closest?.('.check-text');
    if (!checkText || !editor.contains(checkText)) return false;

    // Prevent default action is the caller's responsibility; here we perform changes
    const row = checkText.closest('.checkbox-row');
    if (!row) return false;

    // Compute text before/after caret inside the checkText
    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(checkText);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const beforeText = beforeRange.toString();
    const afterRange = range.cloneRange();
    afterRange.selectNodeContents(checkText);
    afterRange.setStart(range.endContainer, range.endOffset);
    const afterText = afterRange.toString();

    // If the checklist is completely empty -> replace with a paragraph
    if (beforeText.length === 0 && afterText.length === 0) {
        const p = document.createElement('div');
        p.innerHTML = '<br>';
        row.parentNode.replaceChild(p, row);
        const r = document.createRange();
        r.setStart(p, 0);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        editor.focus();
        editor.dispatchEvent(new Event('input'));
        return true;
    }

    // If caret is at the end of the text -> create a new checkbox row below
    if (afterText.length === 0) {
        const id2 = 'chk-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div class=\"checkbox-row\" data-id=\"${id2}\" contenteditable=\"false\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"${t('tasks.checklist.toggle')}\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\"></div></div>`;
        const newRow = wrapper.firstChild;
        if (row && row.parentNode) {
            row.parentNode.insertBefore(newRow, row.nextSibling);
            const el = newRow.querySelector('.check-text');
            const r = document.createRange();
            r.selectNodeContents(el);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
            el.focus();
            editor.dispatchEvent(new Event('input'));
        }
        return true;
    }

    // Otherwise, insert an inline line-break inside the check-text
    document.execCommand('insertHTML', false, '<br><br>');
    editor.dispatchEvent(new Event('input'));
    return true;
}

// ================================
// MOBILE NAVIGATION
// ================================

// Initialize mobile navigation
function initMobileNav() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (!hamburgerBtn || !sidebar || !overlay) return;

    // Toggle sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    }

    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Hamburger button click
    hamburgerBtn.addEventListener('click', toggleSidebar);

    // Overlay click
    overlay.addEventListener('click', closeSidebar);

    // Close sidebar when clicking nav items
    const navItems = sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    // Close sidebar on window resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
} else {
    initMobileNav();
}

window.addEventListener('resize', () => {
    scheduleExpandedTaskRowLayoutUpdate();
});




































