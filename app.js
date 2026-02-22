// Performance: Track when app.js starts parsing
const APP_JS_PARSE_START = typeof performance !== 'undefined' ? performance.now() : Date.now();
const PERF_MARKS_SEEN = new Set();
if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    performance.mark('app_start');
    PERF_MARKS_SEEN.add('app_start');
}

let isMobileCache = null;
let isMobileCacheRaf = 0;
function computeIsMobile() {
    if (typeof window.matchMedia === 'function') {
        return window.matchMedia('(max-width: 768px)').matches || window.matchMedia('(pointer: coarse)').matches;
    }
    return window.innerWidth <= 768;
}

function getIsMobileCached() {
    if (isMobileCache === null) {
        isMobileCache = computeIsMobile();
        if (!isMobileCacheRaf && typeof requestAnimationFrame === 'function') {
            isMobileCacheRaf = requestAnimationFrame(() => {
                isMobileCache = null;
                isMobileCacheRaf = 0;
            });
        }
    }
    return isMobileCache;
}

const APP_VERSION = '2.7.1';
const APP_VERSION_LABEL = `v${APP_VERSION}`;

// Bridge appState getters/setters to current module-scope state.
function bindAppState() {
    const bindings = {
        projects: () => projects,
        tasks: () => tasks,
        feedbackItems: () => feedbackItems,
        projectCounter: () => projectCounter,
        taskCounter: () => taskCounter,
        feedbackCounter: () => feedbackCounter,
        dependencies: () => dependencies,
        projectsSortedView: () => projectsSortedView,
        selectedCards: () => selectedCards,
        lastSelectedCardId: () => lastSelectedCardId,
        projectToDelete: () => projectToDelete,
        tempAttachments: () => tempAttachments,
        massEditState: () => massEditState,
        projectNavigationReferrer: () => projectNavigationReferrer,
        calendarNavigationState: () => calendarNavigationState,
        previousPage: () => previousPage,
        currentFeedbackScreenshotData: () => currentFeedbackScreenshotData,
        feedbackPendingPage: () => feedbackPendingPage,
        feedbackDonePage: () => feedbackDonePage,
        settings: () => settings
    };

    Object.entries(bindings).forEach(([key, getter]) => {
        Object.defineProperty(appState, key, {
            get: getter,
            set: (val) => {
                switch (key) {
                    case 'projects': projects = val; break;
                    case 'tasks': tasks = val; break;
                    case 'feedbackItems': feedbackItems = val; break;
                    case 'feedbackIndex': feedbackIndex = val; break;
                    case 'projectCounter': projectCounter = val; break;
                    case 'taskCounter': taskCounter = val; break;
                    case 'feedbackCounter': feedbackCounter = val; break;
                    case 'dependencies': dependencies = val; break;
                    case 'projectsSortedView': projectsSortedView = val; break;
                    case 'selectedCards': selectedCards = val; break;
                    case 'lastSelectedCardId': lastSelectedCardId = val; break;
                    case 'projectToDelete': projectToDelete = val; break;
                    case 'tempAttachments': tempAttachments = val; break;
                    case 'massEditState': massEditState = val; break;
                    case 'projectNavigationReferrer': projectNavigationReferrer = val; break;
                    case 'calendarNavigationState': calendarNavigationState = val; break;
                    case 'previousPage': previousPage = val; break;
                    case 'currentFeedbackScreenshotData': currentFeedbackScreenshotData = val; break;
                    case 'feedbackPendingPage': feedbackPendingPage = val; break;
                    case 'feedbackDonePage': feedbackDonePage = val; break;
                    case 'settings': settings = val; break;
                }
            },
            configurable: true,
            enumerable: true
        });
    });
}
bindAppState();

function clearSelectedCards() {
    appState.selectedCards.clear();
    appState.lastSelectedCardId = null;
    document.querySelectorAll(".task-card.selected").forEach((card) => {
        card.classList.remove("selected");
    });
}

// settings now bound via appState.settings

// Debug utilities imported from src/utils/debug.js

const SUPPORTED_LANGUAGES = ['en', 'es'];

// I18N translations loaded from separate module for better code splitting
import { I18N_LOCALES, I18N } from './src/config/i18n.js';

// Note: I18N block moved to src/config/i18n.js (1314 lines extracted)
// This reduces app.js parsing time significantly

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
        backlog: t('projects.status.backlog'),
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
        const isMobileScreen = getIsMobileCached();
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
            : getIsMobileCached();
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
} from "./storage-client.js";
import {
    saveAll as saveAllData,
    saveTasks as saveTasksData,
    saveProjects as saveProjectsData,
    saveFeedbackItems as saveFeedbackItemsData,
    saveSingleFeedbackItem,
    updateSingleFeedbackItem,
    deleteSingleFeedbackItem,
    saveProjectColors as saveProjectColorsData,
    saveSortState as saveSortStateData,
    loadAll as loadAllData,
    loadSortState as loadSortStateData,
    loadProjectColors as loadProjectColorsData,
    saveSettings as saveSettingsData,
    loadSettings as loadSettingsData,
    saveTemplates as saveTemplatesData,
    loadTemplates as loadTemplatesData
} from "./src/services/storage.js?v=20260220-project-templates";
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
import {
    addDependency,
    removeDependency,
    removeDependenciesForTask,
    getPrerequisites,
    getDependents,
    isTaskBlocked,
    serializeDependencies,
    deserializeDependencies
} from "./src/services/dependencyService.js";
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
import { TAG_COLORS, PROJECT_COLORS, hexToRGBA } from "./src/utils/colors.js";
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
// NOTE: generateWordReport is dynamically imported in generateReport() to avoid blocking load
import {
    applyDebugLogSetting,
    isDebugLogsEnabled,
    logDebug,
    logPerformanceMilestone,
    debugTimeStart,
    debugTimeEnd
} from "./src/utils/debug.js";
import {
    showNotification,
    showErrorNotification,
    showSuccessNotification
} from "./src/ui/notification.js";
import {
    convertFileToBase64,
    uploadFile,
    downloadFile,
    deleteFile
} from "./src/utils/file.js";
import { isValidEmailAddress } from "./src/utils/validation.js";
import { capitalizeFirst } from "./src/utils/string.js";
import {
    getCalendarDayNames,
    formatCalendarMonthYear,
    stripTime
} from "./src/utils/date.js";
import {
    normalizeHHMM,
    snapHHMMToStep,
    hhmmToMinutes,
    minutesToHHMM,
    clampHHMMToRange,
    getKanbanUpdatedCutoffTime,
    getTaskUpdatedTime,
    formatTaskUpdatedDateTime
} from "./src/utils/time.js";
import {
    debounce,
    toggleSet
} from "./src/utils/functional.js";
import {
    filterTasks,
    getTodayISO,
    matchesSearch,
    matchesStatus,
    matchesPriority,
    matchesProject,
    matchesTags,
    matchesAnyDatePreset,
    matchesDateRange
} from "./src/utils/filterPredicates.js";
import {
    calculateDashboardStats,
    calculateTrendIndicators,
    calculateProjectProgress,
    generateActivityFeed,
    generateAllActivity,
    generateInsightsData,
    getRelativeTimeInfo,
    generateProgressBarsHTML,
    generateActivityFeedHTML
} from "./src/views/dashboard.js";
import {
    groupTasksByStatus,
    sortGroupedTasks,
    getStatusCounts,
    prepareKanbanData,
    generateKanbanColumnHTML
} from "./src/views/kanban.js";
import {
    sortTasksByPriorityAndDate,
    sortTasksByColumn,
    calculateSmartDateInfo,
    prepareListViewData,
    generateListViewHTML
} from "./src/views/listView.js";
import {
    calculateCalendarGrid,
    generateCalendarDays,
    formatDateISO,
    countOverlappingProjects,
    getTasksForDate,
    calculateMonthNavigation,
    isCurrentMonth as isCurrentMonthFn,
    prepareCalendarData,
    generateCalendarGridHTML
} from "./src/views/calendar.js";
import {
    calculateProjectTaskStats,
    calculateCompletionPercentage,
    determineProjectStatus,
    sortProjects as sortProjectsFn,
    filterProjectsBySearch,
    filterProjectsByStatus,
    prepareProjectsViewData,
    generateProjectItemHTML as generateProjectItemHTMLModule,
    generateProjectsListHTML
} from "./src/views/projectsView.js";
import {
    calculateMobileFieldPlacement,
    shouldHideDetailsTab,
    generateTagsDisplayHTML,
    getInitialDateState,
    calculateTaskNavigation
} from "./src/components/taskDetails.js";
import { setupEventDelegation } from "./src/core/events.js";
import { appState } from "./src/core/state.js";
import {
    initializeTaskDescriptionEditor,
    focusTaskDescriptionEditor,
    getTaskDescriptionHTML,
    setTaskDescriptionHTML,
    clearTaskDescriptionEditor,
    runTaskDescriptionCommand,
    insertTaskDescriptionHeading,
    insertTaskDescriptionDivider,
    insertTaskDescriptionChecklist
} from "./src/editor/descriptionEditor.js";

const APP_JS_IMPORTS_READY = typeof performance !== 'undefined' ? performance.now() : Date.now();
const APP_JS_NAV_START = (typeof window !== 'undefined' && typeof window.__pageLoadStart === 'number')
    ? window.__pageLoadStart
    : APP_JS_PARSE_START;
logPerformanceMilestone('app-js-executed', {
    sinceNavStartMs: Math.round(APP_JS_IMPORTS_READY - APP_JS_NAV_START)
});

try {
    window.addEventListener('resize', debounce(() => { isMobileCache = null; }, 150));
    window.addEventListener('orientationchange', () => { isMobileCache = null; });
} catch (e) {}

const PERF_DEBUG_QUERY_KEY = 'debugPerf';
let perfDebugForced = false;

function isPerfDebugQueryEnabled() {
    try {
        const url = new URL(window.location.href);
        const value = url.searchParams.get(PERF_DEBUG_QUERY_KEY);
        return value === '1' || value === 'true';
    } catch (e) {
        return false;
    }
}

function markPerfOnce(label, meta) {
    if (PERF_MARKS_SEEN.has(label)) return;
    PERF_MARKS_SEEN.add(label);
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
        performance.mark(label);
    }
    logPerformanceMilestone(label, meta);
}

// ==== CORE STATE BINDINGS ====
let projects = [];
let tasks = [];
let feedbackItems = [];
let projectCounter = 1;
let taskCounter = 1;
let feedbackCounter = 1;
let dependencies = {}; // Task dependency graph: { taskId: [prerequisiteTaskIds] }
let projectsSortedView = null;
let selectedCards = new Set();
let lastSelectedCardId = null;
let projectToDelete = null;
let tempAttachments = [];
let currentImageGallery = []; // image attachments for current task, used by gallery viewer
// Mass Edit state
let massEditState = {
    selectedTaskIds: new Set(),  // Set of selected task IDs
    lastSelectedId: null,         // For shift-click range selection
    isToolbarVisible: false,      // Toolbar visibility
    pendingChanges: []            // Array of queued changes (multiple fields)
};
let projectNavigationReferrer = 'projects';
let calendarNavigationState = null;
let previousPage = '';
let currentFeedbackScreenshotData = "";
let feedbackPendingPage = 1;
let feedbackDonePage = 1;
const FEEDBACK_ITEMS_PER_PAGE = 10;
const FEEDBACK_CACHE_KEY = "feedbackItemsCache:v1";
// settings defaults
let settings = {
    autoSetStartDateOnStatusChange: false,
    autoSetEndDateOnStatusChange: false,
    enableReviewStatus: true,
    calendarIncludeBacklog: false,
    debugLogsEnabled: false,
    historySortOrder: 'newest',
    language: 'en',
    customWorkspaceLogo: null,
    notificationEmail: "",
    emailNotificationsEnabled: true,
    emailNotificationsWeekdaysOnly: false,
    emailNotificationsIncludeStartDates: false,
    emailNotificationsIncludeBacklog: false,
    emailNotificationTime: "09:00",
    emailNotificationTimeZone: (() => {
        // Detect browser timezone and match to available options
        try {
            const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Available timezone options in the select
            const availableTimezones = [
                "America/Argentina/Buenos_Aires",
                "Atlantic/Canary",
                "Europe/Madrid",
                "UTC"
            ];
            // If browser timezone matches an available option, use it
            if (availableTimezones.includes(browserTz)) {
                return browserTz;
            }
        } catch (e) {
            // Fallback if timezone detection fails
        }
        // Default fallback
        return "Atlantic/Canary";
    })()
};

if (isPerfDebugQueryEnabled()) {
    perfDebugForced = true;
    settings.debugLogsEnabled = true;
    applyDebugLogSetting(true);
}

// keep appState in sync via accessors (live bindings)
[
    'projects',
    'tasks',
    'feedbackItems',
    'projectCounter',
    'taskCounter',
    'feedbackCounter',
    'dependencies',
    'projectsSortedView',
    'selectedCards',
    'lastSelectedCardId',
    'projectToDelete',
    'tempAttachments',
    'projectNavigationReferrer',
    'calendarNavigationState',
    'previousPage',
    'currentFeedbackScreenshotData',
    'feedbackPendingPage',
    'feedbackDonePage',
    'settings'
].forEach((key) => {
    Object.defineProperty(appState, key, {
        get: () => {
            // Explicit getters (eval doesn't work with bundling)
            switch (key) {
                case 'projects': return projects;
                case 'tasks': return tasks;
                case 'feedbackItems': return feedbackItems;
                case 'projectCounter': return projectCounter;
                case 'taskCounter': return taskCounter;
                case 'feedbackCounter': return feedbackCounter;
                case 'dependencies': return dependencies;
                case 'projectsSortedView': return projectsSortedView;
                case 'selectedCards': return selectedCards;
                case 'lastSelectedCardId': return lastSelectedCardId;
                case 'projectToDelete': return projectToDelete;
                case 'tempAttachments': return tempAttachments;
                case 'projectNavigationReferrer': return projectNavigationReferrer;
                case 'calendarNavigationState': return calendarNavigationState;
                case 'previousPage': return previousPage;
                case 'currentFeedbackScreenshotData': return currentFeedbackScreenshotData;
                case 'feedbackPendingPage': return feedbackPendingPage;
                case 'feedbackDonePage': return feedbackDonePage;
                case 'settings': return settings;
            }
        },
        set: (val) => {
            switch (key) {
                case 'projects': projects = val; break;
                case 'tasks': tasks = val; break;
                case 'feedbackItems': feedbackItems = val; break;
                case 'projectCounter': projectCounter = val; break;
                case 'taskCounter': taskCounter = val; break;
                case 'feedbackCounter': feedbackCounter = val; break;
                case 'dependencies': dependencies = val; break;
                case 'projectsSortedView': projectsSortedView = val; break;
                case 'selectedCards': selectedCards = val; break;
                case 'lastSelectedCardId': lastSelectedCardId = val; break;
                case 'projectToDelete': projectToDelete = val; break;
                case 'tempAttachments': tempAttachments = val; break;
                case 'projectNavigationReferrer': projectNavigationReferrer = val; break;
                case 'calendarNavigationState': calendarNavigationState = val; break;
                case 'previousPage': previousPage = val; break;
                case 'currentFeedbackScreenshotData': currentFeedbackScreenshotData = val; break;
                case 'feedbackPendingPage': feedbackPendingPage = val; break;
                case 'feedbackDonePage': feedbackDonePage = val; break;
                case 'settings': settings = val; break;
            }
        },
        configurable: true,
        enumerable: true
    });
});

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

// Notification functions imported from src/ui/notification.js

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

    const notifyTimer = debugTimeStart("notifications", "create-due-today", {
        taskCount: tasks.length
    });
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
    debugTimeEnd("notifications", notifyTimer, {
        newCount: newNotifications.length,
        totalCount: history.notifications.length
    });
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
    const cleanupTimer = debugTimeStart("notifications", "cleanup");
    const history = getNotificationHistory();
    const beforeCount = history.notifications.length;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_HISTORY_MAX_DAYS);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];

    history.notifications = history.notifications.filter(n => {
        return n.date >= cutoffISO;
    });

    saveNotificationHistory(history);
    debugTimeEnd("notifications", cleanupTimer, {
        beforeCount,
        afterCount: history.notifications.length
    });
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
    const stateTimer = debugTimeStart("notifications", "build-state");
    // Notification creation happens once at app init, not on every state build
    const latest = getLatestReleaseNote();
    const lastSeen = getLastSeenReleaseId();
    // Release notifications are currently hidden from the dropdown, so suppress their badge.
    const releaseUnseen = false;

    const taskNotificationsByDate = getTaskNotificationsByDate();
    const unreadCount = getUnreadNotificationCount();

    const state = {
        latest,
        releaseUnseen,
        taskNotificationsByDate,
        unreadCount
    };
    debugTimeEnd("notifications", stateTimer, {
        unreadCount,
        taskGroups: taskNotificationsByDate.length
    });
    return state;
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
    const renderTimer = debugTimeStart("notifications", "render-dropdown", {
        taskGroups: state.taskNotificationsByDate.length,
        unreadCount: state.unreadCount
    });
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
    debugTimeEnd("notifications", renderTimer, {
        sections: sections.length,
        taskGroups: state.taskNotificationsByDate.length
    });
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
    const timer = debugTimeStart("storage", "save-projects", { projectCount: projects.length });
    let success = false;
    try {
        await saveProjectsData(projects);
        success = true;
    } catch (error) {
        console.error("Error saving projects:", error);
        showErrorNotification(t('error.saveProjectsFailed'));
        throw error;
    } finally {
        debugTimeEnd("storage", timer, { success, projectCount: projects.length });
        pendingSaves--;
    }
}

async function saveTasks() {
    if (isInitializing) return;
    pendingSaves++;
    const timer = debugTimeStart("storage", "save-tasks", { taskCount: tasks.length });
    let success = false;
    try {
        await saveTasksData(tasks);
        success = true;
    } catch (error) {
        const msg = error?.message ?? String(error);
        const stack = error?.stack;
        console.error("[Storage] Save tasks failed:", msg);
        if (stack) console.error("[Storage] Stack:", stack);
        showErrorNotification(t('error.saveTasksFailed'));
        throw error;
    } finally {
        debugTimeEnd("storage", timer, { success, taskCount: tasks.length });
        pendingSaves--;
    }
}

// Feedback cache helper (used by D1 individual operations for instant persistence)
function persistFeedbackCache() {
    try {
        localStorage.setItem(FEEDBACK_CACHE_KEY, JSON.stringify(feedbackItems));
    } catch (e) {}
}

function updateFeedbackPlaceholderForViewport() {
    const input = document.getElementById('feedback-description');
    if (!input) return;
    const isCompact = window.matchMedia('(max-width: 768px)').matches;
    const key = isCompact ? 'feedback.descriptionPlaceholderShort' : 'feedback.descriptionPlaceholder';
    input.setAttribute('placeholder', t(key));
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
    const timer = debugTimeStart("settings", "save");
    let success = false;
    try {
        await saveSettingsData(settings);
        success = true;
    } catch (e) {
        console.error("Error saving settings:", e);
    } finally {
        debugTimeEnd("settings", timer, { success });
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
    applyDebugLogSetting(settings.debugLogsEnabled);
}

// Time utilities imported from src/utils/time.js
// isValidEmailAddress imported from src/utils/validation.js

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
        if (f && f.id != null) f.id = String(f.id); // D1 stores IDs as TEXT; keep as string throughout
    });

    // Delta queue removed - using simple direct save

    persistFeedbackCache();

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
        // Parse IDs as integers (handle both string and number IDs, and strip .0 from floats)
        feedbackCounter = Math.max(...feedbackItems.map(f => parseInt(f.id) || 0)) + 1;
    } else {
        feedbackCounter = 1;
    }
}

async function loadDataFromKV() {
    // Load fresh data directly (no SWR caching)
    const all = await loadAllData({
        feedback: {
            limitPending: FEEDBACK_ITEMS_PER_PAGE,
            limitDone: FEEDBACK_ITEMS_PER_PAGE,
            cacheKey: FEEDBACK_CACHE_KEY
        }
    });
    applyLoadedAllData(all);
}


// Project templates state
let templates = [];

// Color state management (constants imported from utils/colors.js)
let tagColorMap = {}; // Maps tag names to colors
let projectColorMap = {}; // Maps project IDs to custom colors

// Simple string hash function for consistent color assignment
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

function getTagColor(tagName) {
    if (!tagColorMap[tagName]) {
        // Use hash of tag name to get consistent color index
        const hash = hashString(tagName.toLowerCase());
        tagColorMap[tagName] = TAG_COLORS[hash % TAG_COLORS.length];
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
        appState.projectsSortedView = null;
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
        appState.projectsSortedView = null;
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
    statusExcludeMode: false, // true = exclude selected statuses; false = include only selected
    priorities: new Set(),
    priorityExcludeMode: false,
    projects: new Set(),
    projectExcludeMode: false,
    tags: new Set(),
    tagExcludeMode: false,
    datePresets: new Set(), // Quick date filters: overdue, today, tomorrow, week, month (multi-select)
    dateFrom: "",
    dateTo: "",
    taskIds: new Set(), // Email notification filter - only set via URL, not UI
    linkTypes: new Set(), // Link type filters: blocks, is_blocked_by, relates_to, has_web_links, no_links
};

// === Project filter state ===
let projectFilterState = {
    search: "",
    statuses: new Set(), // planning, active, completed
    statusExcludeMode: false, // true = exclude selected statuses; false = include only selected
    taskFilter: "", // 'has-tasks', 'no-tasks', or empty
    updatedFilter: "all", // all | 5m | 30m | 24h | week | month
    tags: new Set(), // project tags filter
    tagExcludeMode: false, // true = exclude selected tags; false = include only selected
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

        // Clear tag filter search when repopulating so list shows all
        const tagSearchInput = document.getElementById("tag-filter-search-input");
        if (tagSearchInput) {
            tagSearchInput.value = "";
            filterTagOptions("");
        }
    }
}

function filterTagOptions(query) {
    const tagUl = document.getElementById("tag-options");
    if (!tagUl) return;
    const q = (query || "").toLowerCase().trim();
    tagUl.querySelectorAll("li").forEach((li) => {
        const text = (li.textContent || "").toLowerCase();
        const match = !q || text.includes(q);
        li.style.display = match ? "" : "none";
    });
}

function filterProjectOptions(query) {
    const projectUl = document.getElementById("project-options");
    if (!projectUl) return;
    const q = (query || "").toLowerCase().trim();
    projectUl.querySelectorAll("li").forEach((li) => {
        const text = (li.textContent || "").toLowerCase();
        const match = !q || text.includes(q);
        li.style.display = match ? "" : "none";
    });
}

// Populate and show custom tag autocomplete dropdown
function showTagAutocomplete(query) {
    const dropdown = document.getElementById("tag-autocomplete-dropdown");
    if (!dropdown) return;
    
    // Collect all unique tags from all tasks
    const allTags = new Set();
    tasks.forEach(t => {
        if (t.tags && t.tags.length > 0) {
            t.tags.forEach(tag => allTags.add(tag));
        }
    });
    
    // Filter tags based on query
    const q = query.toLowerCase().trim();
    const matchingTags = Array.from(allTags)
        .filter(tag => tag.toLowerCase().includes(q))
        .sort();
    
    // Clear dropdown
    dropdown.innerHTML = "";
    
    if (matchingTags.length === 0 || !q) {
        dropdown.style.display = "none";
        return;
    }
    
    // Populate dropdown with matching tags as colored badges
    matchingTags.forEach(tag => {
        const item = document.createElement("div");
        item.className = "tag-autocomplete-item";
        
        // Create colored badge
        const badge = document.createElement("span");
        badge.style.backgroundColor = getTagColor(tag);
        badge.style.color = "white";
        badge.style.padding = "4px 10px";
        badge.style.borderRadius = "4px";
        badge.style.fontSize = "12px";
        badge.style.fontWeight = "500";
        badge.textContent = tag.toUpperCase();
        
        item.appendChild(badge);
        
        item.addEventListener("click", async () => {
            // Add tag directly without needing to type and press +
            const taskId = document.getElementById('task-form').dataset.editingTaskId;
            
            if (taskId) {
                const task = tasks.find(t => t.id === parseInt(taskId));
                if (!task) return;
                if (!task.tags) task.tags = [];
                if (task.tags.includes(tag)) {
                    dropdown.style.display = "none";
                    return; // Already exists
                }

                // Store old state for history
                const oldTaskCopy = JSON.parse(JSON.stringify(task));

                task.tags = [...task.tags, tag];
                renderTags(task.tags);

                // Record history
                if (window.historyService) {
                    window.historyService.recordTaskUpdated(oldTaskCopy, task);
                }

                // Save
                populateTagOptions();
                updateNoDateOptionVisibility();
                await saveTasks();
            }
            
            // Clear input and hide dropdown
            const tagInput = document.getElementById("tag-input");
            if (tagInput) tagInput.value = "";
            dropdown.style.display = "none";
        });
        
        dropdown.appendChild(item);
    });
    
    dropdown.style.display = "block";
}

function hideTagAutocomplete() {
    const dropdown = document.getElementById("tag-autocomplete-dropdown");
    if (dropdown) {
        // Small delay to allow click events to fire
        setTimeout(() => {
            dropdown.style.display = "none";
        }, 150);
    }
}

// Setup tag autocomplete event listeners
let tagAutocompleteListenersSetup = false;
function setupTagAutocompleteListeners() {
    if (tagAutocompleteListenersSetup) return;
    tagAutocompleteListenersSetup = true;
    
    const tagInput = document.getElementById("tag-input");
    if (!tagInput) return;
    
    // Show autocomplete on input
    tagInput.addEventListener("input", (e) => {
        showTagAutocomplete(e.target.value);
    });
    
    // Hide autocomplete on blur
    tagInput.addEventListener("blur", () => {
        hideTagAutocomplete();
    });
    
    // Hide autocomplete on Escape
    tagInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            hideTagAutocomplete();
        }
    });
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
        document.getElementById("group-links"),
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
                if (g.id === "group-status" && typeof applyBacklogFilterVisibility === "function") {
                    try { applyBacklogFilterVisibility(); } catch (err) {}
                }
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

    // Checkboxes for status, priority, project, and link-type (task filters only)
    document.querySelectorAll(
        '.dropdown-panel input[type="checkbox"][data-filter="status"],' +
        '.dropdown-panel input[type="checkbox"][data-filter="priority"],' +
        '.dropdown-panel input[type="checkbox"][data-filter="project"],' +
        '.dropdown-panel input[type="checkbox"][data-filter="link-type"]'
    ).forEach((cb) => {
        cb.addEventListener("change", () => {
            const type = cb.dataset.filter;
            if (type === "status") toggleSet(filterState.statuses, cb.value, cb.checked);
            if (type === "priority") toggleSet(filterState.priorities, cb.value, cb.checked);
            if (type === "project") toggleSet(filterState.projects, cb.value, cb.checked);
            if (type === "link-type") toggleSet(filterState.linkTypes, cb.value, cb.checked);
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

    // Tag filter search (same pattern as project portal search)
    const tagFilterSearchInput = document.getElementById("tag-filter-search-input");
    if (tagFilterSearchInput) {
        tagFilterSearchInput.addEventListener("input", () => filterTagOptions(tagFilterSearchInput.value));
    }

    // Project filter search
    const projectFilterSearchInput = document.getElementById("project-filter-search-input");
    if (projectFilterSearchInput) {
        projectFilterSearchInput.addEventListener("input", () => filterProjectOptions(projectFilterSearchInput.value));
    }

    // Filter Include / Exclude toggles (Status, Priority, Tags, Project)
    document.querySelectorAll(".filter-mode-toggle").forEach((toggle) => {
        const filterType = toggle.dataset.filterType;
        const includeBtn = toggle.querySelector('.filter-mode-btn[data-mode="include"]');
        const excludeBtn = toggle.querySelector('.filter-mode-btn[data-mode="exclude"]');
        
        if (includeBtn) {
            includeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                // Map filterType to filterState key (tags -> tag)
                const stateKey = filterType === "tags" ? "tag" : filterType;
                const excludeModeKey = `${stateKey}ExcludeMode`;
                if (filterState[excludeModeKey]) {
                    filterState[excludeModeKey] = false;
                    updateFilterModeUI(filterType);
                    updateFilterBadges();
                    renderAfterFilterChange();
                    const cal = document.getElementById("calendar-view");
                    if (cal) renderCalendar();
                    updateClearButtonVisibility();
                }
            });
        }
        if (excludeBtn) {
            excludeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                // Map filterType to filterState key (tags -> tag)
                const stateKey = filterType === "tags" ? "tag" : filterType;
                const excludeModeKey = `${stateKey}ExcludeMode`;
                if (!filterState[excludeModeKey]) {
                    filterState[excludeModeKey] = true;
                    updateFilterModeUI(filterType);
                    updateFilterBadges();
                    renderAfterFilterChange();
                    const cal = document.getElementById("calendar-view");
                    if (cal) renderCalendar();
                    updateClearButtonVisibility();
                }
            });
        }
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
        searchEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                searchEl.blur();
            }
        });
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
            filterState.statusExcludeMode = false;
            filterState.priorities.clear();
            filterState.priorityExcludeMode = false;
            filterState.projects.clear();
            filterState.projectExcludeMode = false;
            filterState.tags.clear();
            filterState.tagExcludeMode = false;
            filterState.linkTypes.clear();
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

function syncFilterCheckboxesFromState(filterType) {
    // Map filterType to data-filter attribute (tags -> tag)
    const dataFilterAttr = filterType === "tags" ? "tag" : filterType;
    document.querySelectorAll(`input[type="checkbox"][data-filter="${dataFilterAttr}"]`).forEach((cb) => {
        const filterSet = filterState[filterType === "status" ? "statuses" : 
                          filterType === "priority" ? "priorities" :
                          filterType === "project" ? "projects" : "tags"];
        cb.checked = filterSet.has(cb.value);
    });
}

function updateFilterModeUI(filterType) {
    const toggle = document.querySelector(`.filter-mode-toggle[data-filter-type="${filterType}"]`);
    if (!toggle) return;
    // Map filterType to filterState key (tags -> tag)
    const stateKey = filterType === "tags" ? "tag" : filterType;
    const excludeModeKey = `${stateKey}ExcludeMode`;
    const excludeMode = filterState[excludeModeKey] || false;
    const includeBtn = toggle.querySelector('.filter-mode-btn[data-mode="include"]');
    const excludeBtn = toggle.querySelector('.filter-mode-btn[data-mode="exclude"]');
    if (includeBtn) includeBtn.classList.toggle("active", !excludeMode);
    if (excludeBtn) excludeBtn.classList.toggle("active", !!excludeMode);
    syncFilterCheckboxesFromState(filterType);
}

function updateAllFilterModeUI() {
    ["status", "priority", "tags", "project"].forEach(type => updateFilterModeUI(type));
}

// Update project filter mode UI (include/exclude toggle)
function updateProjectFilterModeUI(filterType) {
    const toggle = document.querySelector(`.filter-mode-toggle[data-filter-type="${filterType}"]`);
    if (!toggle) return;
    
    let excludeMode = false;
    if (filterType === 'project-status') {
        excludeMode = projectFilterState.statusExcludeMode || false;
    } else if (filterType === 'project-tags') {
        excludeMode = projectFilterState.tagExcludeMode || false;
    }
    
    const includeBtn = toggle.querySelector('.filter-mode-btn[data-mode="include"]');
    const excludeBtn = toggle.querySelector('.filter-mode-btn[data-mode="exclude"]');
    if (includeBtn) includeBtn.classList.toggle("active", !excludeMode);
    if (excludeBtn) excludeBtn.classList.toggle("active", !!excludeMode);
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
        filterState.linkTypes.size > 0 ||
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
    const bLinks = document.getElementById("badge-links");

    // Show count when active, empty when inactive (no more "All")
    if (b1) b1.textContent = filterState.statuses.size === 0 ? "" : filterState.statuses.size;
    if (b2) b2.textContent = filterState.priorities.size === 0 ? "" : filterState.priorities.size;
    if (b3) b3.textContent = filterState.projects.size === 0 ? "" : filterState.projects.size;
    if (b4) b4.textContent = filterState.tags.size === 0 ? "" : filterState.tags.size;
    if (bLinks) bLinks.textContent = filterState.linkTypes.size === 0 ? "" : filterState.linkTypes.size;

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
    updateButtonState("badge-links", filterState.linkTypes.size > 0);

    updateAllFilterModeUI();
    renderActiveFilterChips();
    updateClearButtonVisibility();
    logDebug("filters", "badges", {
        statusCount: filterState.statuses.size,
        priorityCount: filterState.priorities.size,
        projectCount: filterState.projects.size,
        tagCount: filterState.tags.size,
        endDateCount,
        startDateCount,
        linkTypesCount: filterState.linkTypes.size
    });
}

// Show active filter "chips" under the toolbar
function renderActiveFilterChips() {
    const wrap = document.getElementById("active-filters");
    if (!wrap) return;
    const chipsTimer = debugTimeStart("filters", "chips");
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

    // Status chips (label = "Status" or "Excluding" when exclude mode)
    const statusChipLabel = filterState.statusExcludeMode ? t('tasks.filters.excluding') : t('tasks.filters.status');
    filterState.statuses.forEach((v) =>
        addChip(statusChipLabel, getStatusLabel(v), () => {
            filterState.statuses.delete(v);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="status"][value="${v}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        }, "status", v)
    );

    // Priority chips (label = "Priority" or "Excluding" when exclude mode)
    const priorityChipLabel = filterState.priorityExcludeMode ? t('tasks.filters.excluding') : t('tasks.filters.priority');
    filterState.priorities.forEach((v) =>
        addChip(priorityChipLabel, getPriorityLabel(v), () => {
            filterState.priorities.delete(v);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="priority"][value="${v}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        }, "priority", v)
    );

    // Project chips (label = "Project" or "Excluding" when exclude mode)
    const projectChipLabel = filterState.projectExcludeMode ? t('tasks.filters.excluding') : t('filters.chip.project');
    filterState.projects.forEach((pid) => {
        const proj = projects.find((p) => p.id.toString() === pid.toString());
        addChip(projectChipLabel, proj ? proj.name : pid, () => {
            filterState.projects.delete(pid);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="project"][value="${pid}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        });
    });

    // Tags chips (label = "Tag" or "Excluding" when exclude mode)
    const tagChipLabel = filterState.tagExcludeMode ? t('tasks.filters.excluding') : t('filters.chip.tag');
    filterState.tags.forEach((tag) =>
        addChip(tagChipLabel, tag, () => {
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

    // Task IDs chip (from email notifications) - special read-only filter
    if (filterState.taskIds && filterState.taskIds.size > 0) {
        const taskCount = filterState.taskIds.size;
        addChip(t('filters.chip.emailTasks'), `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`, () => {
            filterState.taskIds = new Set();
            // Navigate to tasks without taskIds to clear the filter
            window.history.replaceState(null, '', '#tasks');
            renderAfterFilterChange();
        });
    }

    // Link types chips
    const linkTypeLabels = {
        'blocks': t('tasks.filters.blocksOthers'),
        'is_blocked_by': t('tasks.filters.isBlockedByOthers'),
        'relates_to': t('tasks.filters.relatesTo'),
        'has_web_links': t('tasks.filters.hasWebLinks'),
        'no_links': t('tasks.filters.noLinks')
    };
    filterState.linkTypes.forEach((linkType) => {
        addChip(t('tasks.filters.links'), linkTypeLabels[linkType] || linkType, () => {
            filterState.linkTypes.delete(linkType);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="link-type"][value="${linkType}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        });
    });

    debugTimeEnd("filters", chipsTimer, { chipCount: wrap.children.length });
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
        if (filterState.statusExcludeMode) params.set("statusExclude", "1");
    }

    // Add priority filters (comma-separated)
    if (filterState.priorities.size > 0) {
        params.set("priority", Array.from(filterState.priorities).join(","));
        if (filterState.priorityExcludeMode) params.set("priorityExclude", "1");
    }

    // Add project filters (comma-separated)
    if (filterState.projects.size > 0) {
        params.set("project", Array.from(filterState.projects).join(","));
        if (filterState.projectExcludeMode) params.set("projectExclude", "1");
    }

    // Add tag filters (comma-separated)
    if (filterState.tags.size > 0) {
        params.set("tags", Array.from(filterState.tags).join(","));
        if (filterState.tagExcludeMode) params.set("tagExclude", "1");
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

    // Add link type filters (comma-separated)
    if (filterState.linkTypes.size > 0) {
        params.set("links", Array.from(filterState.linkTypes).join(","));
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
    const isMobile = getIsMobileCached();
    if (isMobile || document.getElementById("list-view").classList.contains("active")) {
        renderListView(); // List (includes mobile cards)
    }

    if (document.getElementById("calendar-view").classList.contains("active")) {
        renderCalendar(); // Calendar
    }
}

// Return filtered tasks array
// Uses filterTasks from src/utils/filterPredicates.js for pure filtering logic
function getFilteredTasks() {
    const filterTimer = debugTimeStart("filters", "tasks", {
        totalTasks: tasks.length,
        hasSearch: !!filterState.search,
        statusCount: filterState.statuses.size,
        priorityCount: filterState.priorities.size,
        projectCount: filterState.projects.size,
        tagCount: filterState.tags.size,
        datePresetCount: filterState.datePresets.size,
        hasDateRange: !!(filterState.dateFrom || filterState.dateTo)
    });

    // Use the pure filterTasks function from filterPredicates module
    const filtered = filterTasks(tasks, {
        search: filterState.search,
        statuses: filterState.statuses,
        statusExcludeMode: filterState.statusExcludeMode,
        priorities: filterState.priorities,
        priorityExcludeMode: filterState.priorityExcludeMode,
        projects: filterState.projects,
        projectExcludeMode: filterState.projectExcludeMode,
        tags: filterState.tags,
        tagExcludeMode: filterState.tagExcludeMode,
        datePresets: filterState.datePresets,
        dateFrom: filterState.dateFrom,
        dateTo: filterState.dateTo,
        dateField: filterState.dateField || 'endDate',
        taskIds: filterState.taskIds, // Email notification filter
        linkTypes: filterState.linkTypes, // Link type filter
        dependencies: dependencies // For link type filtering
    });

    debugTimeEnd("filters", filterTimer, {
        totalTasks: tasks.length,
        filteredCount: filtered.length
    });
    return filtered;
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

      // Add clear button for project creation modal date fields
      const inProjectModal = !!displayInput.closest('#project-modal');
      const isProjectModalDateField = input.name === 'startDate' || input.name === 'endDate';
      if (inProjectModal && isProjectModalDateField) {
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = t('common.clear');
        clearBtn.className = 'btn-secondary';
        clearBtn.style.cssText = 'padding: 0 10px; align-self: stretch; flex-shrink: 0; font-size: 13px;';

        const wrapperNode = displayInput.parentElement;
        if (wrapperNode) {
          wrapperNode.style.display = 'flex';
          wrapperNode.style.gap = '8px';
          wrapperNode.style.alignItems = 'stretch';
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
            // Save without re-rendering the panel (avoids flicker); update duration in-place
            updateProjectField(parseInt(projectId, 10), fieldName, dateStr, { render: false });
            refreshProjectDurationUI(parseInt(projectId, 10));
          }
        },
      });

      patchProgrammaticGuards(fp);
      addDateMask(input, fp);
      input._flatpickrInstance = fp;

      // Add clear button for project details panel date fields (only once — guard against re-init)
      const detailProjectId = input.dataset.projectId;
      const detailFieldName = input.dataset.field;
      if (detailProjectId && detailFieldName && !input.closest('.project-date-wrapper')) {
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = t('common.clear');
        clearBtn.className = 'btn-secondary';
        clearBtn.style.cssText = 'padding: 0 10px; align-self: stretch; flex-shrink: 0; font-size: 13px;';

        const dateWrapper = document.createElement('div');
        dateWrapper.className = 'project-date-wrapper';
        dateWrapper.style.cssText = 'display: flex; gap: 6px; align-items: stretch; flex: 1;';
        input.parentNode.insertBefore(dateWrapper, input);
        dateWrapper.appendChild(input);
        dateWrapper.appendChild(clearBtn);

        // Use input._flatpickrInstance dynamically so the handler works after re-init
        clearBtn.addEventListener('click', () => {
          input.value = '';
          const fpInst = input._flatpickrInstance;
          if (fpInst) {
            fpInst.__suppressChange = true;
            fpInst.clear();
            setTimeout(() => { if (input._flatpickrInstance) input._flatpickrInstance.__suppressChange = false; }, 0);
          }
          // Save without re-rendering (avoids flicker); update duration in-place
          updateProjectField(parseInt(input.dataset.projectId, 10), input.dataset.field, '', { render: false });
          refreshProjectDurationUI(parseInt(input.dataset.projectId, 10));
        });
      }
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

// Update only the duration text in the project details panel (no full re-render)
function refreshProjectDurationUI(projectId) {
    const durationEl = document.getElementById('project-duration-value');
    if (!durationEl) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const startDate = project.startDate ? new Date(project.startDate) : null;
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const durationDays =
        startDate && endDate && Number.isFinite(startDate.getTime()) && Number.isFinite(endDate.getTime())
            ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
            : null;
    durationEl.textContent = Number.isFinite(durationDays)
        ? t('projects.details.durationDays', { count: durationDays })
        : '-';
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

let lastDataFingerprint = null;
let lastCalendarFingerprint = null;
let calendarRenderDebounceId = null;

function getMaxUpdatedTime(items, getTimeFn) {
    let maxTime = 0;
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
        const time = getTimeFn ? getTimeFn(item) : Date.parse(item?.updatedAt || item?.createdAt || item?.createdDate || "") || 0;
        if (Number.isFinite(time) && time > maxTime) maxTime = time;
    }
    return maxTime;
}

function getIdSum(items) {
    let sum = 0;
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
        const id = Number(item?.id);
        if (!Number.isNaN(id)) sum += id;
    }
    return sum;
}

function buildDataFingerprint(data) {
    const t = Array.isArray(data?.tasks) ? data.tasks : [];
    const p = Array.isArray(data?.projects) ? data.projects : [];
    const f = Array.isArray(data?.feedbackItems) ? data.feedbackItems : [];
    const tMax = getMaxUpdatedTime(t, typeof getTaskUpdatedTime === "function" ? getTaskUpdatedTime : null);
    const pMax = getMaxUpdatedTime(p, (proj) => Date.parse(proj?.updatedAt || proj?.createdAt || "") || 0);
    const fMax = getMaxUpdatedTime(f, (fb) => Date.parse(fb?.updatedAt || fb?.createdAt || fb?.createdDate || "") || 0);
    return `t:${t.length}:${tMax}:${getIdSum(t)}|p:${p.length}:${pMax}:${getIdSum(p)}|f:${f.length}:${fMax}:${getIdSum(f)}`;
}

function buildCalendarFingerprint(sourceTasks = tasks, sourceProjects = projects) {
    const includeBacklog = !!settings.calendarIncludeBacklog;
    const projectFilter = filterState?.projects;
    const filteredProjectIds = projectFilter && projectFilter.size > 0
        ? new Set(Array.from(projectFilter).map((id) => parseInt(id, 10)))
        : null;

    let hash = 0;
    let count = 0;
    const list = Array.isArray(sourceTasks) ? sourceTasks : [];
    for (const task of list) {
        if (!task) continue;
        if (!includeBacklog && task.status === 'backlog') continue;
        if (filteredProjectIds && !filteredProjectIds.has(Number(task.projectId))) continue;
        const start = task.startDate || "";
        const end = task.endDate || "";
        const hasStart = typeof start === 'string' && start.length === 10 && start.includes('-');
        const hasEnd = typeof end === 'string' && end.length === 10 && end.includes('-');
        if (!hasStart && !hasEnd) continue;

        count++;
        const id = Number(task.id) || 0;
        const status = task.status ? String(task.status) : "";
        const proj = Number(task.projectId) || 0;
        const title = task.title ? String(task.title) : "";
        const updated = Date.parse(task.updatedAt || task.createdAt || task.createdDate || "") || 0;
        hash = ((hash * 31) + id + proj + updated) | 0;
        for (let i = 0; i < start.length; i++) hash = ((hash * 31) + start.charCodeAt(i)) | 0;
        for (let i = 0; i < end.length; i++) hash = ((hash * 31) + end.charCodeAt(i)) | 0;
        for (let i = 0; i < status.length; i++) hash = ((hash * 31) + status.charCodeAt(i)) | 0;
        for (let i = 0; i < title.length; i++) hash = ((hash * 31) + title.charCodeAt(i)) | 0;
    }

    const projectList = Array.isArray(sourceProjects) ? sourceProjects : [];
    let projectHash = 0;
    let projectCount = 0;
    for (const project of projectList) {
        if (!project) continue;
        if (filteredProjectIds && !filteredProjectIds.has(Number(project.id))) continue;
        projectCount++;
        const pid = Number(project.id) || 0;
        const name = project.name ? String(project.name) : "";
        const startDate = project.startDate ? String(project.startDate) : "";
        const endDate = project.endDate ? String(project.endDate) : "";
        const updatedAt = Date.parse(project.updatedAt || project.createdAt || "") || 0;
        projectHash = ((projectHash * 31) + pid + updatedAt) | 0;
        for (let i = 0; i < name.length; i++) projectHash = ((projectHash * 31) + name.charCodeAt(i)) | 0;
        for (let i = 0; i < startDate.length; i++) projectHash = ((projectHash * 31) + startDate.charCodeAt(i)) | 0;
        for (let i = 0; i < endDate.length; i++) projectHash = ((projectHash * 31) + endDate.charCodeAt(i)) | 0;
    }

    return `m:${currentYear}-${currentMonth + 1}|b:${includeBacklog ? 1 : 0}|pf:${filteredProjectIds ? filteredProjectIds.size : 0}|c:${count}|h:${hash}|pc:${projectCount}|ph:${projectHash}`;
}

function scheduleCalendarRenderDebounced(delayMs = 500) {
    if (calendarRenderDebounceId !== null) {
        clearTimeout(calendarRenderDebounceId);
    }
    calendarRenderDebounceId = setTimeout(() => {
        calendarRenderDebounceId = null;
        renderCalendar();
        lastCalendarFingerprint = buildCalendarFingerprint();
    }, delayMs);
}

function renderWithoutCalendar() {
    updateCounts();
    renderDashboard();
    renderProjects();
    renderTasks();
    renderFeedback();
    renderUpdatesPage();
    renderListView();
    renderAppVersionLabel();
}

function getActivePageId() {
    const active = document.querySelector('.page.active');
    return active ? active.id : null;
}

function applyInitialRouteShell() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const validPages = ['dashboard', 'projects', 'tasks', 'updates', 'feedback', 'calendar'];
    let pageToShow = 'dashboard';

    if (hash === 'dashboard/recent_activity') {
        pageToShow = 'dashboard';
    } else if (hash.startsWith('project-')) {
        pageToShow = 'projects';
    } else if (validPages.includes(hash)) {
        pageToShow = hash === 'calendar' ? 'tasks' : hash;
    } else {
        return;
    }

    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
    document.getElementById(pageToShow)?.classList.add("active");
    document.getElementById("project-details")?.classList.remove("active");

    document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
    if (hash === 'calendar') {
        document.querySelector('.nav-item.calendar-nav')?.classList.add('active');
    } else {
        document.querySelector(`.nav-item[data-page="${pageToShow}"]`)?.classList.add("active");
    }
}

function renderActivePageOnly(options = {}) {
    const calendarChanged = !!options.calendarChanged;
    const calendarImmediate = !!options.calendarImmediate;
    updateCounts();
    renderAppVersionLabel();

    const activeId = getActivePageId();
    if (activeId === "dashboard") {
        renderDashboard();
        return;
    }
    if (activeId === "projects") {
        renderProjects();
        return;
    }
    if (activeId === "tasks") {
        try { applyBacklogFilterVisibility(); } catch (e) {}
        const kanbanBoard = document.querySelector(".kanban-board");
        if (kanbanBoard && !kanbanBoard.classList.contains("hidden")) {
            renderTasks();
        }
        if (getIsMobileCached() || document.getElementById("list-view")?.classList.contains("active")) {
            renderListView();
        }
        if (document.getElementById("calendar-view")?.classList.contains("active")) {
            if (calendarChanged || calendarImmediate) {
                if (calendarImmediate) {
                    if (calendarRenderDebounceId !== null) {
                        clearTimeout(calendarRenderDebounceId);
                        calendarRenderDebounceId = null;
                    }
                    renderCalendar();
                    lastCalendarFingerprint = buildCalendarFingerprint();
                } else {
                    logPerformanceMilestone('calendar-refresh-debounced', { reason: 'data-changed' });
                    scheduleCalendarRenderDebounced(500);
                }
            } else {
                logPerformanceMilestone('calendar-refresh-skipped', { reason: 'fingerprint-match' });
            }
        }
        return;
    }
    if (activeId === "updates") {
        renderUpdatesPage();
        return;
    }
    if (activeId === "feedback") {
        renderFeedback();
    }

    const projectDetailsView = document.getElementById("project-details");
    if (projectDetailsView && projectDetailsView.classList.contains("active")) {
        const hash = window.location.hash.slice(1);
        if (hash.startsWith('project-')) {
            const projectId = parseInt(hash.replace('project-', ''), 10);
            if (!Number.isNaN(projectId)) {
                showProjectDetails(projectId);
            }
        }
    }
}

// Prevent double initialization
let isInitialized = false;

export async function init(options = {}) {
    // Prevent multiple simultaneous initializations
    if (isInitialized) {
        // console.log('[PERF] Init already completed, skipping duplicate call');
        return;
    }
    isInitialized = true;
    const skipCache = !!options.skipCache;
    logPerformanceMilestone('init-start', {
        hasAuth: !!localStorage.getItem('authToken'),
        hasAdmin: !!localStorage.getItem('adminToken')
    });
    const initTimer = debugTimeStart("init", "init", {
        hasAuth: !!localStorage.getItem('authToken'),
        hasAdmin: !!localStorage.getItem('adminToken')
    });

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
    projectCounter = 1;
    taskCounter = 1;

    isInitializing = true;

    if (typeof updateBootSplashProgress === 'function') {
        updateBootSplashProgress(20); // Loading data...
    }

    // Pre-apply the route shell to avoid dashboard flash on deep links (e.g. /tasks).
    // Rendering still waits for data load, but the correct page is visible immediately.
    applyInitialRouteShell();
    markPerfOnce('first_skeleton_paint', { reason: 'route-shell' });

    // console.time('[PERF] Load All Data');
    // Load fresh data directly (no SWR caching - simpler and avoids stale data bugs)
    const handleAllDataRefresh = (fresh) => {
        if (!fresh) return;
        const nextFingerprint = buildDataFingerprint(fresh);
        const currentFingerprint = buildDataFingerprint({ tasks, projects, feedbackItems });
        if (nextFingerprint === currentFingerprint) return;

        applyLoadedAllData(fresh);
        // Delta queue removed - saves happen on change

        const nextCalendarFingerprint = buildCalendarFingerprint(fresh.tasks || tasks, fresh.projects || projects);
        const calendarChanged = lastCalendarFingerprint && nextCalendarFingerprint !== lastCalendarFingerprint;
        lastDataFingerprint = nextFingerprint;
        lastCalendarFingerprint = nextCalendarFingerprint;
        renderActivePageOnly({ calendarChanged });
    };

    const allDataPromise = loadAllData({
        preferCache: !skipCache,
        onRefresh: skipCache ? null : handleAllDataRefresh,
        feedback: {
            limitPending: FEEDBACK_ITEMS_PER_PAGE,
            limitDone: FEEDBACK_ITEMS_PER_PAGE,
            cacheKey: FEEDBACK_CACHE_KEY,
            preferCache: !skipCache
        }
    });
    const sortStatePromise = loadSortStateData().catch(() => null);
    const projectColorsPromise = loadProjectColorsData().catch(() => ({}));
    const settingsPromise = loadSettingsData().catch(() => ({}));
    const dependenciesPromise = loadData("dependencies").then(data => deserializeDependencies(data)).catch(() => ({}));
    const historyPromise = window.historyService?.loadHistory
        ? window.historyService.loadHistory().catch(() => null)
        : Promise.resolve(null);

    const loadTimer = debugTimeStart("init", "load-data");

    // Apply cached data ASAP so the UI isn't blank while other async loads finish.
    const allData = await allDataPromise;
    if (typeof updateBootSplashProgress === 'function') {
        updateBootSplashProgress(50); // Cached data ready (if available)
    }
    applyLoadedAllData(allData);
    // Delta queue removed - saves happen on change
    // Fast render from cached data so the UI isn't empty while other async loads finish.
    renderActivePageOnly();

    const [sortState, loadedProjectColors, loadedSettings, loadedDependencies] = await Promise.all([
        sortStatePromise,
        projectColorsPromise,
        settingsPromise,
        dependenciesPromise,
        historyPromise,
    ]);
    debugTimeEnd("init", loadTimer, {
        taskCount: allData?.tasks?.length || 0,
        projectCount: allData?.projects?.length || 0,
        feedbackCount: allData?.feedbackItems?.length || 0
    });
    logPerformanceMilestone('init-data-loaded', {
        taskCount: allData?.tasks?.length || 0,
        projectCount: allData?.projects?.length || 0,
        feedbackCount: allData?.feedbackItems?.length || 0
    });
    // console.timeEnd('[PERF] Load All Data');

    if (typeof updateBootSplashProgress === 'function') {
        updateBootSplashProgress(60); // Data loaded, applying...
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
    
    // Load dependencies
    if (loadedDependencies && typeof loadedDependencies === "object") {
        dependencies = loadedDependencies;
    }
    
    settings.language = normalizeLanguage(settings.language);
    applyDebugLogSetting(settings.debugLogsEnabled);
    if (perfDebugForced) {
        settings.debugLogsEnabled = true;
        applyDebugLogSetting(true);
    }
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
    logPerformanceMilestone('init-ui-ready');
    // console.timeEnd('[PERF] Setup UI');

    // Load templates in background (non-blocking)
    loadTemplatesData().then(loaded => {
        templates = loaded;
        renderTemplateDropdown();
    }).catch(err => console.error("Error loading templates:", err));

    setupTemplateDropdown();

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
        // Just show the page without rendering - routing below handles the first render
        document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
        document.getElementById(pageToShow).classList.add("active");
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

    // Initial rendering is handled by routing below.
    // console.timeEnd('[PERF] Initial Rendering');

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
    logPerformanceMilestone('init-notifications-ready');
    // console.timeEnd('[PERF] Initialize Notifications');
    // console.timeEnd('[PERF] Paint & Finalize');

    // console.timeEnd('[PERF] Total Init Time');
    debugTimeEnd("init", initTimer, {
        taskCount: tasks.length,
        projectCount: projects.length,
        feedbackCount: feedbackItems.length,
        pendingSaves
    });
    logPerformanceMilestone('init-complete', {
        taskCount: tasks.length,
        projectCount: projects.length,
        feedbackCount: feedbackItems.length
    });
    markPerfOnce('interactive_ready', {
        taskCount: tasks.length,
        projectCount: projects.length
    });

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
        } else if (page.startsWith('task-')) {
            const taskId = parseInt(page.replace('task-', ''));
            document.querySelector('.nav-item[data-page="tasks"]')?.classList.add("active");
            showPage('tasks');
            const task = tasks.find(t => t.id === taskId);
            if (task) openTaskDetails(taskId);
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
                filterState.statusExcludeMode = params.get('statusExclude') === '1';
            } else {
                filterState.statuses.clear();
                filterState.statusExcludeMode = false;
            }

            // Priority filters
            if (params.has('priority')) {
                const priorities = params.get('priority').split(',').filter(Boolean);
                filterState.priorities.clear();
                priorities.forEach(p => filterState.priorities.add(p.trim()));
                filterState.priorityExcludeMode = params.get('priorityExclude') === '1';
            } else {
                filterState.priorities.clear();
                filterState.priorityExcludeMode = false;
            }

            // Project filters
            if (params.has('project')) {
                const projectIds = params.get('project').split(',').filter(Boolean);
                filterState.projects.clear();
                projectIds.forEach(id => filterState.projects.add(id.trim()));
                filterState.projectExcludeMode = params.get('projectExclude') === '1';
            } else {
                filterState.projects.clear();
                filterState.projectExcludeMode = false;
            }

            // Tag filters
            if (params.has('tags')) {
                const tags = params.get('tags').split(',').filter(Boolean);
                filterState.tags.clear();
                tags.forEach(t => filterState.tags.add(t.trim()));
                filterState.tagExcludeMode = params.get('tagExclude') === '1';
            } else {
                filterState.tags.clear();
                filterState.tagExcludeMode = false;
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

            // Task IDs filter (from email notifications) - only via URL, not UI
            // This filter shows only the specified task IDs, bypassing other filters
            if (params.has('taskIds')) {
                const taskIdsParam = params.get('taskIds') || '';
                const ids = taskIdsParam.split(',').filter(Boolean).map(id => id.trim());
                filterState.taskIds = new Set(ids);
            } else {
                filterState.taskIds = new Set();
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

            // Handle links filter (blocks, is_blocked_by, relates_to, has_web_links, no_links)
            if (params.has('links')) {
                const linksParam = params.get('links') || '';
                const allowedLinks = new Set(['blocks', 'is_blocked_by', 'relates_to', 'has_web_links', 'no_links']);
                const links = linksParam.split(',').filter(Boolean).map(l => l.trim()).filter(l => allowedLinks.has(l));
                filterState.linkTypes = new Set(links);
                // Sync checkboxes
                document.querySelectorAll('[data-filter="link-type"]').forEach(cb => {
                    cb.checked = filterState.linkTypes.has(cb.value);
                });
            } else {
                filterState.linkTypes = new Set();
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

                // Link type checkboxes
                document.querySelectorAll('input[data-filter="link-type"]').forEach(cb => {
                    cb.checked = filterState.linkTypes.has(cb.value);
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
                updateAllFilterModeUI();
                updateFilterBadges();
                renderActiveFilterChips();
                updateClearButtonVisibility();

                // Auto-open task modal if task= param is present (e.g. after refresh)
                if (params.has('task')) {
                    const taskIdToOpen = parseInt(params.get('task'));
                    const taskToOpen = tasks.find(t => t.id === taskIdToOpen);
                    if (taskToOpen) openTaskDetails(taskIdToOpen);
                }
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
                const validStatuses = ['backlog', 'planning', 'active', 'completed'];
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

    markPerfOnce('first_contentful_page_ready', {
        page: document.querySelector('.page.active')?.id || 'unknown'
    });
    lastDataFingerprint = buildDataFingerprint({ tasks, projects, feedbackItems });
    lastCalendarFingerprint = buildCalendarFingerprint(tasks, projects);
    markPerfOnce('init-render-complete');

    // Ensure the first render is actually painted before we claim "ready"
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    markPerfOnce('init-first-paint');

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
                try { applyBacklogFilterVisibility(); } catch (e) {}
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
                try { applyBacklogFilterVisibility(); } catch (e) {}
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
                        try { applyBacklogFilterVisibility(); } catch (e) {}
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

    // Completion ring click handlers - navigate to tasks/projects pages
    const tasksCompletionRing = document.getElementById('tasks-completion-ring');
    if (tasksCompletionRing) {
        tasksCompletionRing.addEventListener('click', function() {
            window.location.hash = 'tasks';
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            const tasksNavItem = document.querySelector('.nav-item[data-page="tasks"]');
            if (tasksNavItem) tasksNavItem.classList.add('active');
            showPage('tasks');
        });
    }

    const projectsCompletionRing = document.getElementById('projects-completion-ring');
    if (projectsCompletionRing) {
        projectsCompletionRing.addEventListener('click', function() {
            window.location.hash = 'projects';
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            const projectsNavItem = document.querySelector('.nav-item[data-page="projects"]');
            if (projectsNavItem) projectsNavItem.classList.add('active');
            showPage('projects');
        });
    }
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
        filterState.statusExcludeMode = false;
        filterState.priorityExcludeMode = false;
        filterState.projectExcludeMode = false;
        filterState.tagExcludeMode = false;
        
        // Update status filter UI
        const statusCheckboxes = document.querySelectorAll('input[data-filter="status"]');
        statusCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.value === filterValue;
        });
    } else if (filterType === 'priority') {
        // Apply priority filter
        filterState.priorities.clear();
        filterState.priorities.add(filterValue);
        filterState.priorityExcludeMode = false;
        filterState.projectExcludeMode = false;
        filterState.tagExcludeMode = false;
        
        // Also exclude completed tasks for priority filters
        filterState.statuses.clear();
        filterState.statuses.add('todo');
        filterState.statuses.add('progress');
        filterState.statuses.add('review');
        filterState.statusExcludeMode = false;
        
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
        filterState.statusExcludeMode = false;
        filterState.priorityExcludeMode = false;
        filterState.projectExcludeMode = false;
        filterState.tagExcludeMode = false;
        
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
    if (getIsMobileCached()) {
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
        // Only render if not already rendered during initialization
        // This prevents duplicate renders when handleRouting() is called right after renderWithoutCalendar()
        // dashboardRendered is set to true after the first render completes
        if (!dashboardRendered) {
            renderDashboard();
        } else {
            // Reset flag so future navigations can render (e.g., coming back from another page)
            dashboardRendered = false;
        }
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

let renderCallsThisTick = 0;
let renderResetScheduled = false;
let renderExtraCallLogged = false;

function trackRenderCall() {
    renderCallsThisTick += 1;
    if (renderCallsThisTick > 1 && !renderExtraCallLogged && isDebugLogsEnabled()) {
        renderExtraCallLogged = true;
        console.warn('[perf] render called multiple times in the same tick', new Error().stack);
    }
    if (!renderResetScheduled) {
        renderResetScheduled = true;
        queueMicrotask(() => {
            renderCallsThisTick = 0;
            renderResetScheduled = false;
        });
    }
}

function render() {
    trackRenderCall();
    renderActivePageOnly();
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






// Track if dashboard has been rendered to prevent duplicate renders
let dashboardRendered = false;
let dashboardRenderInProgress = false;

function renderDashboard() {
    // Prevent duplicate renders during initialization
    if (dashboardRenderInProgress) {
        return;
    }
    
    dashboardRenderInProgress = true;
    const renderTimer = debugTimeStart("render", "dashboard", {
        taskCount: tasks.length,
        projectCount: projects.length
    });
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
    debugTimeEnd("render", renderTimer, {
        taskCount: tasks.length,
        projectCount: projects.length
    });
    dashboardRenderInProgress = false;
}

function updateDashboardStats() {
    const statsTimer = debugTimeStart("render", "dashboard-stats", {
        taskCount: tasks.length,
        projectCount: projects.length
    });
    
    // Use pure function from dashboard module for calculations
    const stats = calculateDashboardStats(tasks, projects);

    // Update hero numbers
    document.getElementById('hero-active-projects').textContent = stats.activeProjects;
    
    // Update tasks completion ring (percentage only inside circle - no redundant number)
    const tasksCircle = document.querySelector('.tasks-progress-circle');
    if (tasksCircle) {
        const circumference = 2 * Math.PI * 45; // radius = 45
        const offset = circumference - (stats.tasksCompletionRate / 100) * circumference;
        tasksCircle.style.strokeDashoffset = offset;
    }
    const tasksRingPercentage = document.getElementById('tasks-ring-percentage');
    if (tasksRingPercentage) {
        tasksRingPercentage.textContent = `${stats.tasksCompletionRate}%`;
    }
    const tasksCompletionCount = document.getElementById('tasks-completion-count');
    if (tasksCompletionCount) {
        const numerator = tasksCompletionCount.querySelector('.count-numerator');
        const denominator = tasksCompletionCount.querySelector('.count-denominator');
        if (numerator) numerator.textContent = stats.completedTasks;
        if (denominator) denominator.textContent = stats.totalTasks;
    }
    
    // Update projects completion ring (percentage only inside circle - no redundant number)
    const projectsCircle = document.querySelector('.projects-progress-circle');
    if (projectsCircle) {
        const circumference = 2 * Math.PI * 45; // radius = 45
        const offset = circumference - (stats.projectsCompletionRate / 100) * circumference;
        projectsCircle.style.strokeDashoffset = offset;
    }
    const projectsRingPercentage = document.getElementById('projects-ring-percentage');
    if (projectsRingPercentage) {
        projectsRingPercentage.textContent = `${stats.projectsCompletionRate}%`;
    }
    const projectsCompletionCount = document.getElementById('projects-completion-count');
    if (projectsCompletionCount) {
        const numerator = projectsCompletionCount.querySelector('.count-numerator');
        const denominator = projectsCompletionCount.querySelector('.count-denominator');
        if (numerator) numerator.textContent = stats.completedProjects;
        if (denominator) denominator.textContent = stats.totalProjectsWithTasks;
    }

    // Update enhanced stats
    document.getElementById('in-progress-tasks').textContent = stats.inProgressTasks;
    document.getElementById('pending-tasks-new').textContent = stats.pendingTasks;
    document.getElementById('completed-tasks-new').textContent = stats.completedTasks;
    document.getElementById('overdue-tasks').textContent = stats.overdueTasks;
    document.getElementById('high-priority-tasks').textContent = stats.highPriorityTasks;
    document.getElementById('research-milestones').textContent = stats.milestones;
    
    // Update trend indicators with dynamic data
    updateTrendIndicators();
    debugTimeEnd("render", statsTimer, {
        activeProjects: stats.activeProjects,
        totalTasks: stats.totalTasks,
        tasksCompletionRate: stats.tasksCompletionRate,
        projectsCompletionRate: stats.projectsCompletionRate
    });
}

function updateTrendIndicators() {
    // Use pure function from dashboard module for calculations
    const trends = calculateTrendIndicators(tasks, projects);
    
    document.getElementById('progress-change').textContent = `+${trends.progressChange} ${t('dashboard.trend.thisWeek')}`;
    document.getElementById('pending-change').textContent = trends.dueTodayCount > 0
        ? t(trends.dueTodayCount === 1 ? 'dashboard.trend.dueTodayOne' : 'dashboard.trend.dueTodayMany', { count: trends.dueTodayCount })
        : t('dashboard.trend.onTrack');
    document.getElementById('completed-change').textContent = `+${trends.thisWeekCompleted} ${t('dashboard.trend.thisWeek')}`;
    
    const overdueChangeEl = document.getElementById('overdue-change');
    if (overdueChangeEl) {
        overdueChangeEl.textContent = trends.overdueCount > 0
            ? t('dashboard.trend.needsAttention')
            : t('dashboard.trend.allOnTrack');
        overdueChangeEl.classList.toggle('negative', trends.overdueCount > 0);
        overdueChangeEl.classList.toggle('positive', trends.overdueCount === 0);
        overdueChangeEl.classList.remove('neutral');
    }

    document.getElementById('priority-change').textContent =
        trends.criticalHighPriority > 0
            ? t(trends.criticalHighPriority === 1 ? 'dashboard.trend.criticalOne' : 'dashboard.trend.criticalMany', { count: trends.criticalHighPriority })
            : t('dashboard.trend.onTrack');
    document.getElementById('milestones-change').textContent = trends.completedProjects > 0
        ? t(trends.completedProjects === 1 ? 'dashboard.trend.completedOne' : 'dashboard.trend.completedMany', { count: trends.completedProjects })
        : t('dashboard.trend.inProgress');
}

function renderProjectProgressBars() {
    const container = document.getElementById('project-progress-bars');
    if (!container) return;

    const activeProjects = projects.filter((project) => getProjectStatus(project.id) === 'active');

    if (activeProjects.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">🌊</div>
                <div style="font-size: 16px; margin-bottom: 8px;">${t('dashboard.emptyProjects.title')}</div>
                <div style="font-size: 14px;">${t('dashboard.emptyProjects.subtitle')}</div>
            </div>
        `;
        return;
    }
    
    // Use pure function from dashboard module for calculations
    const projectProgressData = calculateProjectProgress(activeProjects, tasks, 5);

    // Use module function for HTML generation
    container.innerHTML = generateProgressBarsHTML(projectProgressData, {
        tasksLabel: t('dashboard.tasks')
    });
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
    
    // Use module function for HTML generation
    container.innerHTML = generateActivityFeedHTML(activities.slice(0, 4), formatDashboardActivityDate);
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
            completionRate: tasks.length > 0 ? ((tasks.filter(t => t.status === 'done').length / tasks.length) * 100).toFixed(1) : 0
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

// Import Data Functions
let importFileData = null;

function openImportDataModal() {
    const modal = document.getElementById('import-data-modal');
    modal.classList.add('active');
    
    // Reset state
    importFileData = null;
    document.getElementById('import-file-input').value = '';
    document.getElementById('import-confirm-input').value = '';
    document.getElementById('import-confirm-error').classList.remove('show');
    document.getElementById('import-preview').style.display = 'none';
    
    // Find elements that need HTML rendering BEFORE applyTranslations runs
    const warningBodyEl = modal.querySelector('[data-i18n="import.warningBody"]');
    const confirmTextEl = modal.querySelector('[data-i18n="import.confirmText"]');
    
    // Temporarily remove data-i18n so applyTranslations skips them
    if (warningBodyEl) warningBodyEl.removeAttribute('data-i18n');
    if (confirmTextEl) confirmTextEl.removeAttribute('data-i18n');
    
    // Apply translations for elements that don't need HTML rendering
    applyTranslations(modal);
    
    // Now set HTML content for elements that need HTML rendering
    if (warningBodyEl) {
        warningBodyEl.innerHTML = t('import.warningBody');
    }
    
    if (confirmTextEl) {
        confirmTextEl.innerHTML = t('import.confirmText');
    }
    
    // Setup drag-and-drop dropzone
    const dropzone = document.getElementById('import-file-dropzone');
    const fileInput = document.getElementById('import-file-input');
    const dropzoneText = dropzone.querySelector('.import-dropzone-text');
    
    // Update dropzone text
    if (dropzoneText) {
        dropzoneText.textContent = t('import.dropzoneDefault');
    }
    
    // Click to open file picker
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });
    
    // File input change handler
    fileInput.addEventListener('change', handleImportFileSelect, { once: true });
    
    // Drag and drop handlers
    let dragDepth = 0;
    
    dropzone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragDepth++;
        dropzone.classList.add('import-dropzone-dragover');
        dropzone.style.borderColor = 'var(--accent-blue)';
        dropzone.style.background = 'var(--hover-bg)';
    });
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('import-dropzone-dragover');
        dropzone.style.borderColor = 'var(--accent-blue)';
        dropzone.style.background = 'var(--hover-bg)';
    });
    
    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) {
            dropzone.classList.remove('import-dropzone-dragover');
            dropzone.style.borderColor = 'var(--border-primary)';
            dropzone.style.background = 'var(--bg-secondary)';
        }
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDepth = 0;
        dropzone.classList.remove('import-dropzone-dragover');
        dropzone.style.borderColor = 'var(--border-primary)';
        dropzone.style.background = 'var(--bg-secondary)';
        
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.json') || file.type === 'application/json') {
                handleImportFileFromDrop(file, dropzoneText);
            } else {
                showErrorNotification(t('import.errorInvalidFile'));
            }
        }
    });
    
    dropzone.addEventListener('dragend', () => {
        dragDepth = 0;
        dropzone.classList.remove('import-dropzone-dragover');
        dropzone.style.borderColor = 'var(--border-primary)';
        dropzone.style.background = 'var(--bg-secondary)';
    });
    
    // Setup lowercase handler for confirm input
    const confirmInput = document.getElementById('import-confirm-input');
    const lowercaseHandler = function(e) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toLowerCase();
        e.target.setSelectionRange(start, end);
    };
    confirmInput.addEventListener('input', lowercaseHandler);
    
    // Handle Enter key
    confirmInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmImportData();
        }
    }, { once: true });
    
    confirmInput.focus();
}

function closeImportDataModal() {
    const modal = document.getElementById('import-data-modal');
    modal.classList.remove('active');
    
    // Reset state
    importFileData = null;
    const fileInput = document.getElementById('import-file-input');
    fileInput.value = '';
    
    // Reset dropzone text
    updateImportDropzoneText(null);
    const dropzone = document.getElementById('import-file-dropzone');
    if (dropzone) {
        dropzone.classList.remove('import-dropzone-dragover');
        dropzone.style.borderColor = 'var(--border-primary)';
        dropzone.style.background = 'var(--bg-secondary)';
    }
    
    // Clone input to remove event listeners
    const confirmInput = document.getElementById('import-confirm-input');
    const newInput = confirmInput.cloneNode(true);
    confirmInput.parentNode.replaceChild(newInput, confirmInput);
    
    document.getElementById('import-confirm-error').classList.remove('show');
    document.getElementById('import-preview').style.display = 'none';
}

function handleImportFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        importFileData = null;
        document.getElementById('import-preview').style.display = 'none';
        updateImportDropzoneText(null);
        return;
    }
    
    handleImportFileFromDrop(file);
}

function handleImportFileFromDrop(file, dropzoneTextEl = null) {
    if (!file) {
        importFileData = null;
        document.getElementById('import-preview').style.display = 'none';
        updateImportDropzoneText(null);
        return;
    }
    
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        showErrorNotification(t('import.errorInvalidFile'));
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) fileInput.value = '';
        importFileData = null;
        document.getElementById('import-preview').style.display = 'none';
        updateImportDropzoneText(null);
        return;
    }
    
    // Update dropzone text to show filename
    updateImportDropzoneText(file.name, dropzoneTextEl);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            
            // Validate JSON structure
            if (!validateImportData(jsonData)) {
                showErrorNotification(t('import.errorInvalidFormat'));
                const fileInput = document.getElementById('import-file-input');
                if (fileInput) fileInput.value = '';
                importFileData = null;
                document.getElementById('import-preview').style.display = 'none';
                updateImportDropzoneText(null);
                return;
            }
            
            // Store valid data
            importFileData = jsonData;
            
            // Show preview
            showImportPreview(jsonData);
        } catch (error) {
            console.error('Import file parse error:', error);
            showErrorNotification(t('import.errorParseFailed'));
            const fileInput = document.getElementById('import-file-input');
            if (fileInput) fileInput.value = '';
            importFileData = null;
            document.getElementById('import-preview').style.display = 'none';
            updateImportDropzoneText(null);
        }
    };
    
    reader.onerror = function() {
        showErrorNotification(t('import.errorReadFailed'));
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) fileInput.value = '';
        importFileData = null;
        document.getElementById('import-preview').style.display = 'none';
        updateImportDropzoneText(null);
    };
    
    reader.readAsText(file);
}

function updateImportDropzoneText(filename, dropzoneTextEl = null) {
    const dropzone = document.getElementById('import-file-dropzone');
    if (!dropzone) return;
    
    const textEl = dropzoneTextEl || dropzone.querySelector('.import-dropzone-text');
    if (!textEl) return;
    
    if (filename) {
        textEl.textContent = filename;
        textEl.style.fontWeight = '500';
        textEl.style.color = 'var(--text-primary)';
    } else {
        textEl.textContent = t('import.dropzoneDefault');
        textEl.style.fontWeight = 'normal';
        textEl.style.color = 'var(--text-secondary)';
    }
}

function validateImportData(data) {
    // Must be an object
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    // Must have tasks and projects arrays (at minimum)
    if (!Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
        return false;
    }
    
    // Validate tasks structure (basic check)
    for (const task of data.tasks) {
        if (!task || typeof task !== 'object' || !task.id || !task.title) {
            return false;
        }
    }
    
    // Validate projects structure (basic check)
    for (const project of data.projects) {
        if (!project || typeof project !== 'object' || !project.id || !project.name) {
            return false;
        }
    }
    
    return true;
}

function showImportPreview(data) {
    const previewEl = document.getElementById('import-preview');
    const contentEl = document.getElementById('import-preview-content');
    
    const stats = {
        projects: data.projects?.length || 0,
        tasks: data.tasks?.length || 0,
        exportDate: data.exportDate || 'Unknown',
        exportVersion: data.exportVersion || 'Unknown'
    };
    
    contentEl.innerHTML = `
        <div style="margin-bottom: 8px;">
            <strong>${stats.projects}</strong> ${stats.projects === 1 ? 'project' : 'projects'}
        </div>
        <div style="margin-bottom: 8px;">
            <strong>${stats.tasks}</strong> ${stats.tasks === 1 ? 'task' : 'tasks'}
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-primary); color: var(--text-muted); font-size: 12px;">
            Exported: ${new Date(stats.exportDate).toLocaleDateString()} (v${stats.exportVersion})
        </div>
    `;
    
    previewEl.style.display = 'block';
}

async function confirmImportData() {
    const input = document.getElementById('import-confirm-input');
    const errorMsg = document.getElementById('import-confirm-error');
    const confirmText = input.value.trim().toLowerCase();
    
    if (confirmText !== 'import') {
        errorMsg.classList.add('show');
        input.focus();
        return;
    }
    
    if (!importFileData) {
        showErrorNotification(t('import.errorNoFile'));
        return;
    }
    
    // Validate one more time
    if (!validateImportData(importFileData)) {
        showErrorNotification(t('import.errorInvalidFormat'));
        return;
    }
    
    try {
        // Show loading notification
        showNotification(t('import.processing'), 'info');
        
        // REPLACE all data (not merge!)
        const importedData = importFileData;
        
        // Replace tasks
        if (Array.isArray(importedData.tasks)) {
            tasks = importedData.tasks;
            // Update task counter if provided
            if (importedData.taskCounter && typeof importedData.taskCounter === 'number') {
                taskCounter = importedData.taskCounter;
            } else {
                // Calculate max ID if counter not provided
                const maxTaskId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id || 0)) : 0;
                taskCounter = maxTaskId + 1;
            }
        }
        
        // Replace projects
        if (Array.isArray(importedData.projects)) {
            projects = importedData.projects;
            // Update project counter if provided
            if (importedData.projectCounter && typeof importedData.projectCounter === 'number') {
                projectCounter = importedData.projectCounter;
            } else {
                // Calculate max ID if counter not provided
                const maxProjectId = projects.length > 0 ? Math.max(...projects.map(p => p.id || 0)) : 0;
                projectCounter = maxProjectId + 1;
            }
        }
        
        // Replace project colors if provided
        if (importedData.projectColors && typeof importedData.projectColors === 'object') {
            projectColorMap = importedData.projectColors;
        }
        
        // Replace sort mode if provided
        if (importedData.sortMode) {
            sortMode = importedData.sortMode;
        }
        
        // Replace manual task order if provided
        if (importedData.manualTaskOrder && typeof importedData.manualTaskOrder === 'object') {
            manualTaskOrder = importedData.manualTaskOrder;
        }
        
        // Replace settings if provided (but be careful - don't overwrite critical settings)
        if (importedData.settings && typeof importedData.settings === 'object') {
            // Merge settings carefully - keep some current settings like language, theme
            const currentLanguage = settings.language;
            const currentTheme = document.documentElement.getAttribute('data-theme');
            
            settings = {
                ...settings,
                ...importedData.settings
            };
            
            // Restore critical settings
            settings.language = currentLanguage;
            if (currentTheme) {
                document.documentElement.setAttribute('data-theme', currentTheme);
            }
        }
        
        // Import history if available (optional - historyService may not have importHistory method)
        if (importedData.history && window.historyService && Array.isArray(importedData.history)) {
            try {
                if (typeof window.historyService.importHistory === 'function') {
                    window.historyService.importHistory(importedData.history);
                } else {
                    console.warn('History import not available - historyService.importHistory not found');
                }
            } catch (err) {
                console.warn('Failed to import history:', err);
            }
        }
        
        // Save all imported data
        await Promise.all([
            saveTasks().catch(err => {
                console.error('Failed to save imported tasks:', err);
                throw new Error('Failed to save tasks');
            }),
            saveProjects().catch(err => {
                console.error('Failed to save imported projects:', err);
                throw new Error('Failed to save projects');
            }),
            saveSettings().catch(err => {
                console.error('Failed to save imported settings:', err);
                // Don't throw - settings save failure is less critical
            })
        ]);
        
        // Save project colors if changed
        if (importedData.projectColors) {
            try {
                await saveProjectColors();
            } catch (err) {
                console.warn('Failed to save project colors:', err);
            }
        }
        
        // Close modal
        closeImportDataModal();
        
        // Show success notification
        showSuccessNotification(t('import.success'));
        
        // Refresh UI
        render();
        
        // Navigate to dashboard to show imported data
        window.location.hash = '#dashboard';
        showPage('dashboard');
        
    } catch (error) {
        console.error('Import error:', error);
        showErrorNotification(t('import.errorFailed') + ': ' + (error.message || 'Unknown error'));
    }
}

async function generateReport() {
    // Show loading notification
    showNotification('Generando reporte...', 'info');

    try {
        // Dynamic import to avoid blocking app load (docx library is ~500KB from CDN)
        const { generateWordReport } = await import('./src/services/reportGenerator.js');
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

    updateNotificationState();
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

    const source = typeof getFilteredTasks === "function" ? getFilteredTasks() : tasks.slice();
    const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);

    // Detect single-project filter for drag-and-drop ordering
    const isSingleProject = filterState.projects && filterState.projects.size === 1;
    const singleProjectId = isSingleProject ? [...filterState.projects][0] : null;

    // Use list view module for filtering and sorting
    const listData = prepareListViewData(source, {
        currentSort: isSingleProject ? null : currentSort, // Disable column sort when manual ordering
        projects: projects,
        updatedCutoff: cutoff,
        getTaskUpdatedTime: getTaskUpdatedTime
    });

    let rows = listData.tasks;

    // In single-project mode, sort by projectOrder if any task has it
    const hasManualOrder = isSingleProject && rows.some(t => typeof t.projectOrder === 'number');
    if (hasManualOrder) {
        rows = [...rows].sort((a, b) => {
            const ao = typeof a.projectOrder === 'number' ? a.projectOrder : 9999;
            const bo = typeof b.projectOrder === 'number' ? b.projectOrder : 9999;
            return ao - bo;
        });
    }

    // Show/hide drag handle column header
    const dragTh = document.getElementById('list-drag-th');
    if (dragTh) dragTh.style.display = isSingleProject ? '' : 'none';

    // Show/hide Auto-sort button
    syncListViewAutoSortBtn(singleProjectId, isSingleProject, hasManualOrder);

    const listCountText = t('tasks.list.count', { count: rows.length }) || `${rows.length} results`;
    const listCountEl = document.getElementById('tasks-list-count');
    if (listCountEl) {
        listCountEl.textContent = listCountText;
    }
    const listCountBottomEl = document.getElementById('tasks-list-count-bottom');
    if (listCountBottomEl) {
        listCountBottomEl.textContent = listCountText;
    }

    if (tbody) {
        // Use module function for HTML generation
        const helpers = {
            escapeHtml,
            formatDate,
            getTagColor,
            getProjectColor,
            getPriorityLabel,
            getStatusLabel,
            formatTaskUpdatedDateTime,
            projects,
            noProjectText: t('tasks.noProject'),
            noDateText: t('tasks.noDate'),
            showDragHandle: isSingleProject
        };
        tbody.innerHTML = generateListViewHTML(rows, helpers);
    }

    // Set up drag-and-drop when single project is filtered
    if (isSingleProject && singleProjectId !== null) {
        setupListViewDragDrop(singleProjectId);
    }

    // Also render mobile cards (shown on mobile, hidden on desktop)
    renderMobileCardsPremium(rows);

    // Update mass edit UI to reflect current selection state
    updateMassEditUI();

    // Initialize field button click listeners (once)
    initMassEditFieldButtons();
}

function setupListViewDragDrop(projectId) {
    const tbody = document.getElementById('tasks-table-body');
    if (!tbody) return;

    let draggingViaHandle = false;
    let dragSrc = null;

    const getRows = () => [...tbody.querySelectorAll('tr.task-row[data-task-id]')];

    // Keep dropping reliable even when pointer is between rows.
    if (tbody.dataset.listDragFallback !== '1') {
        tbody.addEventListener('dragover', (e) => { e.preventDefault(); });
        tbody.dataset.listDragFallback = '1';
    }

    getRows().forEach(row => {
        const handle = row.querySelector('.list-drag-handle');
        if (handle) {
            handle.addEventListener('mousedown', () => { draggingViaHandle = true; });
            handle.addEventListener('touchstart', () => { draggingViaHandle = true; }, { passive: true });
            handle.addEventListener('click', (e) => e.stopPropagation());
        }

        row.addEventListener('dragstart', (e) => {
            if (!draggingViaHandle) { e.preventDefault(); return; }
            dragSrc = row;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', row.dataset.taskId);
            setTimeout(() => row.classList.add('dragging'), 0);
        });

        row.addEventListener('dragend', () => {
            draggingViaHandle = false;
            dragSrc?.classList.remove('dragging');
            getRows().forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
            dragSrc = null;
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!dragSrc || row === dragSrc) return;
            const mid = row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
            getRows().forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
            row.classList.add(e.clientY < mid ? 'drag-over-top' : 'drag-over-bottom');
        });

        row.addEventListener('dragleave', (e) => {
            if (!row.contains(e.relatedTarget)) {
                row.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });

        row.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!dragSrc || row === dragSrc) return;
            const before = row.classList.contains('drag-over-top');
            row.classList.remove('drag-over-top', 'drag-over-bottom');
            if (before) {
                tbody.insertBefore(dragSrc, row);
            } else {
                tbody.insertBefore(dragSrc, row.nextSibling);
            }
            // Persist new order and re-render so Auto-sort button appears
            getRows().forEach((el, idx) => {
                const task = tasks.find(t => t.id === parseInt(el.dataset.taskId, 10));
                if (task) task.projectOrder = idx;
            });
            saveTasks();
            syncListViewAutoSortBtn(projectId, true, true);
        });
    });
}

function resetListViewTaskOrder(projectId) {
    tasks.forEach(task => {
        if (task.projectId === projectId) {
            delete task.projectOrder;
        }
    });
    saveTasks();
    renderListView();
}

function syncListViewAutoSortBtn(projectId, isSingleProject = false, hasManualOrder = null) {
    const resetBtn = document.getElementById('list-view-reset-sort-btn');
    if (!resetBtn) return;

    const projectIdNum = Number(projectId);
    const validProject = Number.isInteger(projectIdNum);
    const manualOrderActive = typeof hasManualOrder === 'boolean'
        ? hasManualOrder
        : (validProject && tasks.some(task => task.projectId === projectIdNum && typeof task.projectOrder === 'number'));

    if (isSingleProject && validProject && manualOrderActive) {
        resetBtn.style.display = '';
        resetBtn.dataset.param = String(projectIdNum);
        resetBtn.title = t('projects.details.resetSortTitle') || 'Reset to automatic sort by priority';
        resetBtn.textContent = `↕ ${t('projects.details.resetSort') || 'Auto-sort'}`;
        return;
    }

    resetBtn.style.display = 'none';
}

/**
 * Initializes click listeners for mass edit field buttons (status, priority, etc.)
 * Only adds listeners once to avoid duplicates
 */
let massEditFieldButtonsInitialized = false;
function initMassEditFieldButtons() {
    if (massEditFieldButtonsInitialized) return;
    massEditFieldButtonsInitialized = true;
    
    const fieldButtons = [
        { id: 'mass-edit-status-btn', field: 'status' },
        { id: 'mass-edit-priority-btn', field: 'priority' },
        { id: 'mass-edit-dates-btn', field: 'dates' },
        { id: 'mass-edit-project-btn', field: 'project' },
        { id: 'mass-edit-tags-btn', field: 'tags' }
    ];
    
    fieldButtons.forEach(({ id, field }) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openMassEditPopover(field, btn);
            });
        }
    });

    // Add delete button handler
    const deleteBtn = document.getElementById('mass-edit-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            massDelete();
        });
    }
}

// ================================
// MASS EDIT FUNCTIONALITY
// ================================

/**
 * Toggles selection of a task (handles Ctrl/Cmd and Shift modifiers)
 */
function toggleTaskSelection(taskId, event) {
    const isShiftHeld = event?.shiftKey;
    const isCtrlOrCmdHeld = event?.ctrlKey || event?.metaKey;

    if (isShiftHeld && massEditState.lastSelectedId !== null) {
        // Shift-click: Select range
        selectTaskRange(massEditState.lastSelectedId, taskId);
    } else if (isCtrlOrCmdHeld) {
        // Ctrl/Cmd-click: Toggle individual
        if (massEditState.selectedTaskIds.has(taskId)) {
            massEditState.selectedTaskIds.delete(taskId);
        } else {
            massEditState.selectedTaskIds.add(taskId);
            massEditState.lastSelectedId = taskId;
        }
    } else {
        // Regular click: Toggle individual
        if (massEditState.selectedTaskIds.has(taskId)) {
            massEditState.selectedTaskIds.delete(taskId);
            if (massEditState.lastSelectedId === taskId) {
                massEditState.lastSelectedId = null;
            }
        } else {
            massEditState.selectedTaskIds.add(taskId);
            massEditState.lastSelectedId = taskId;
        }
    }

    updateMassEditUI();
}

/**
 * Selects range of tasks between two IDs (for Shift-click)
 * Uses getVisibleTasks() so range only includes tasks actually shown (incl. Updated filter)
 */
function selectTaskRange(startId, endId) {
    const visibleTasks = getVisibleTasks();
    const startIndex = visibleTasks.findIndex(t => t.id === startId);
    const endIndex = visibleTasks.findIndex(t => t.id === endId);

    if (startIndex === -1 || endIndex === -1) return;

    const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

    for (let i = from; i <= to; i++) {
        massEditState.selectedTaskIds.add(visibleTasks[i].id);
    }

    massEditState.lastSelectedId = endId;
}

/**
 * Gets truly visible tasks (applies ALL filters including Updated filter)
 * This is the authoritative source for what tasks are actually visible in list view
 */
function getVisibleTasks() {
    let filtered = getFilteredTasks();
    
    // CRITICAL: Also apply the "Updated" filter (kanbanUpdatedFilter)
    // This filter is NOT in filterState, it's a separate global
    const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
    if (cutoff !== null) {
        filtered = filtered.filter(t => getTaskUpdatedTime(t) >= cutoff);
    }
    
    return filtered;
}

/**
 * Selects all filtered tasks
 */
function selectAllFilteredTasks() {
    // Use getVisibleTasks() to include ALL filters (including Updated filter)
    const visibleTasks = getVisibleTasks();
    
    // CRITICAL: Clear any selections that are no longer visible
    // Then select only the currently visible tasks
    massEditState.selectedTaskIds.clear();
    visibleTasks.forEach(task => massEditState.selectedTaskIds.add(task.id));
    
    if (visibleTasks.length > 0) {
        massEditState.lastSelectedId = visibleTasks[0].id;
    }
    updateMassEditUI();
}

/**
 * Clears all selected tasks
 */
function clearMassEditSelection() {
    massEditState.selectedTaskIds.clear();
    massEditState.lastSelectedId = null;
    massEditState.pendingChanges = [];
    updateMassEditUI();
    updatePendingChangesUI();
}

/**
 * Updates the mass edit UI (toolbar, checkboxes, row highlights)
 */
function updateMassEditUI() {
    // Use getVisibleTasks() to include ALL filters (including Updated filter)
    const visibleTasks = getVisibleTasks();
    const totalVisible = visibleTasks.length;
    
    // CRITICAL FIX: Only count selected tasks that are CURRENTLY VISIBLE
    // This prevents showing "13 selected" when only 3 tasks are visible after filtering
    const visibleSelectedIds = new Set();
    visibleTasks.forEach(task => {
        if (massEditState.selectedTaskIds.has(task.id)) {
            visibleSelectedIds.add(task.id);
        }
    });
    const selectedCount = visibleSelectedIds.size;

    // Update toolbar visibility - only show if there are VISIBLE selected tasks
    const toolbar = document.getElementById('mass-edit-toolbar');
    if (toolbar) {
        toolbar.style.display = selectedCount > 0 ? 'flex' : 'none';
    }

    // Update count text - show count of VISIBLE selected tasks
    const countText = document.getElementById('mass-edit-count');
    if (countText) {
        countText.textContent = t('tasks.massEdit.selected', {
            count: selectedCount,
            total: totalVisible
        });
    }

    // Update "select all" checkbox state
    const selectAllCheckbox = document.getElementById('mass-edit-select-all');
    if (selectAllCheckbox) {
        if (selectedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedCount === totalVisible) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    // Update table header checkbox
    const tableSelectAll = document.getElementById('table-select-all');
    if (tableSelectAll) {
        const visibleSelectedCount = visibleTasks.filter(t => 
            massEditState.selectedTaskIds.has(t.id)
        ).length;

        if (visibleSelectedCount === 0) {
            tableSelectAll.checked = false;
            tableSelectAll.indeterminate = false;
        } else if (visibleSelectedCount === totalVisible) {
            tableSelectAll.checked = true;
            tableSelectAll.indeterminate = false;
        } else {
            tableSelectAll.checked = false;
            tableSelectAll.indeterminate = true;
        }
    }

    // Update individual row checkboxes and highlighting
    const tbody = document.getElementById('tasks-table-body');
    if (tbody) {
        const rows = tbody.querySelectorAll('tr[data-task-id]');
        rows.forEach(row => {
            const taskId = parseInt(row.dataset.taskId, 10);
            const checkbox = row.querySelector('.task-select-checkbox');
            const isSelected = massEditState.selectedTaskIds.has(taskId);

            if (checkbox) {
                checkbox.checked = isSelected;
            }

            if (isSelected) {
                row.classList.add('mass-edit-selected');
            } else {
                row.classList.remove('mass-edit-selected');
            }
        });
    }

    // Also update pending changes UI
    updatePendingChangesUI();
}

/**
 * Opens mass edit popover for a specific field
 */
function openMassEditPopover(field, buttonElement) {
    // Close any existing popover
    closeMassEditPopover();

    const popover = createMassEditPopover(field);
    document.body.appendChild(popover);

    // Position popover below button
    const buttonRect = buttonElement.getBoundingClientRect();
    popover.style.left = `${buttonRect.left}px`;
    popover.style.top = `${buttonRect.bottom + 8}px`;

    // Adjust if off-screen
    const popoverRect = popover.getBoundingClientRect();
    if (popoverRect.right > window.innerWidth) {
        popover.style.left = `${window.innerWidth - popoverRect.width - 20}px`;
    }
    if (popoverRect.bottom > window.innerHeight) {
        popover.style.top = `${buttonRect.top - popoverRect.height - 8}px`;
    }

    // Store current field
    popover.dataset.field = field;

    // RESTORE PREVIOUS SELECTION: Check if there's a pending change for this field
    const pendingChange = massEditState.pendingChanges.find(c => c.field === field);
    if (pendingChange) {
        if (field === 'status' && pendingChange.value) {
            const radio = popover.querySelector(`input[name="mass-edit-status"][value="${pendingChange.value}"]`);
            if (radio) radio.checked = true;
        } else if (field === 'priority' && pendingChange.value) {
            const radio = popover.querySelector(`input[name="mass-edit-priority"][value="${pendingChange.value}"]`);
            if (radio) radio.checked = true;
        } else if (field === 'project' && pendingChange.value !== undefined) {
            const val = pendingChange.value === null ? 'none' : pendingChange.value;
            const radio = popover.querySelector(`input[name="mass-edit-project"][value="${val}"]`);
            if (radio) radio.checked = true;
        } else if (field === 'dates') {
            // Values will be set after Flatpickr initialization below
        } else if (field === 'tags' && pendingChange.tags && pendingChange.tags.length > 0) {
            const modeRadio = popover.querySelector(`input[name="mass-edit-tags-mode"][value="${pendingChange.mode}"]`);
            if (modeRadio) {
                modeRadio.checked = true;
                const modeOptions = popover.querySelectorAll('.mass-edit-tags-mode-option');
                modeOptions.forEach(opt => opt.classList.remove('active'));
                modeRadio.closest('.mass-edit-tags-mode-option')?.classList.add('active');
            }
            const tagsList = popover.querySelector('#mass-edit-tags-list');
            if (tagsList) {
                tagsList.innerHTML = '';
                pendingChange.tags.forEach(tagName => {
                    const tagColor = getTagColor(tagName);
                    const tagItem = document.createElement('div');
                    tagItem.className = 'mass-edit-tag-item';
                    tagItem.dataset.tagName = tagName;
                    tagItem.style.background = tagColor;
                    tagItem.innerHTML = `<span>${escapeHtml(tagName.toUpperCase())}</span><button class="mass-edit-tag-remove">×</button>`;
                    tagItem.querySelector('.mass-edit-tag-remove').addEventListener('click', () => {
                        tagItem.remove();
                        const existingTag = Array.from(popover.querySelectorAll('.mass-edit-existing-tag')).find(el => el.dataset.tag === tagName);
                        if (existingTag) existingTag.classList.remove('selected');
                        updateMassEditPopoverButtonStates(popover);
                    });
                    tagsList.appendChild(tagItem);
                });
                pendingChange.tags.forEach(tagName => {
                    const existingTag = Array.from(popover.querySelectorAll('.mass-edit-existing-tag')).find(el => el.dataset.tag === tagName);
                    if (existingTag) existingTag.classList.add('selected');
                });
            }
        }
    }

    // Initialize Flatpickr for date fields
    if (field === 'dates') {
        const flatpickrFn = window.flatpickr;
        if (typeof flatpickrFn === 'function') {
            const flatpickrLocale = getFlatpickrLocale();
            const dateConfig = {
                dateFormat: 'd/m/Y',
                locale: flatpickrLocale,
                allowInput: true,
                disableMobile: true
            };

            const startInput = popover.querySelector('#mass-edit-start-date');
            const endInput = popover.querySelector('#mass-edit-end-date');

            // Helper: add date mask for auto-slashes (dd/mm/yyyy)
            const addMassEditDateMask = (input, fp) => {
                input.addEventListener('input', (e) => {
                    let value = e.target.value;
                    let numbers = value.replace(/\D/g, '');
                    let formatted = '';
                    if (numbers.length >= 1) {
                        let day = numbers.substring(0, 2);
                        if (parseInt(day, 10) > 31) day = '31';
                        formatted = day;
                    }
                    if (numbers.length >= 3) {
                        let month = numbers.substring(2, 4);
                        if (parseInt(month, 10) > 12) month = '12';
                        formatted += '/' + month;
                    }
                    if (numbers.length >= 5) {
                        formatted += '/' + numbers.substring(4, 8);
                    }
                    if (value !== formatted) {
                        e.target.value = formatted;
                    }
                    // Sync to flatpickr and ISO value
                    if (formatted.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                        const [dd, mm, yyyy] = formatted.split('/');
                        const dateObj = new Date(+yyyy, +mm - 1, +dd);
                        if (fp) fp.setDate(dateObj, false);
                        input.dataset.isoValue = `${yyyy}-${mm}-${dd}`;
                    }
                });
            };

            if (startInput) {
                const fpStart = flatpickrFn(startInput, {
                    ...dateConfig,
                    defaultDate: pendingChange?.startDate ? new Date(pendingChange.startDate) : null,
                    onChange: (selectedDates) => {
                        if (selectedDates.length > 0) {
                            const d = selectedDates[0];
                            startInput.dataset.isoValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        } else {
                            startInput.dataset.isoValue = '';
                        }
                    }
                });
                addMassEditDateMask(startInput, fpStart);
                if (pendingChange?.startDate) {
                    startInput.dataset.isoValue = pendingChange.startDate;
                }
            }

            if (endInput) {
                const fpEnd = flatpickrFn(endInput, {
                    ...dateConfig,
                    defaultDate: pendingChange?.endDate ? new Date(pendingChange.endDate) : null,
                    onChange: (selectedDates) => {
                        if (selectedDates.length > 0) {
                            const d = selectedDates[0];
                            endInput.dataset.isoValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        } else {
                            endInput.dataset.isoValue = '';
                        }
                    }
                });
                addMassEditDateMask(endInput, fpEnd);
                if (pendingChange?.endDate) {
                    endInput.dataset.isoValue = pendingChange.endDate;
                }
            }
        }
    }

    // Store initial form state (Apply disabled until user changes selection)
    popover.dataset.initialStateJson = getPopoverFormState(popover);
    updateMassEditPopoverButtonStates(popover);
    // Re-run after paint to ensure disabled state sticks (handles any DOM timing edge cases)
    requestAnimationFrame(() => updateMassEditPopoverButtonStates(popover));
}

/**
 * Creates the HTML for a mass edit popover based on field type
 */
function createMassEditPopover(field) {
    const popover = document.createElement('div');
    popover.id = 'mass-edit-popover';
    popover.className = 'mass-edit-popover';
    popover.dataset.field = field;  // set immediately so checkPopoverHasSelection works

    let bodyHTML = '';

    if (field === 'status') {
        bodyHTML = `
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-status" value="backlog" id="mass-status-backlog">
                <label for="mass-status-backlog" class="mass-edit-option-label">
                    <span class="status-badge backlog">${t('tasks.status.backlog')}</span>
                </label>
            </div>
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-status" value="todo" id="mass-status-todo">
                <label for="mass-status-todo" class="mass-edit-option-label">
                    <span class="status-badge todo">${t('tasks.status.todo')}</span>
                </label>
            </div>
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-status" value="progress" id="mass-status-progress">
                <label for="mass-status-progress" class="mass-edit-option-label">
                    <span class="status-badge progress">${t('tasks.status.progress')}</span>
                </label>
            </div>
            ${settings.enableReviewStatus ? `
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-status" value="review" id="mass-status-review">
                <label for="mass-status-review" class="mass-edit-option-label">
                    <span class="status-badge review">${t('tasks.status.review')}</span>
                </label>
            </div>
            ` : ''}
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-status" value="done" id="mass-status-done">
                <label for="mass-status-done" class="mass-edit-option-label">
                    <span class="status-badge done">${t('tasks.status.done')}</span>
                </label>
            </div>
        `;
    } else if (field === 'priority') {
        bodyHTML = `
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-priority" value="high" id="mass-priority-high">
                <label for="mass-priority-high" class="mass-edit-option-label">
                    <span class="priority-pill priority-high">HIGH</span>
                </label>
            </div>
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-priority" value="medium" id="mass-priority-medium">
                <label for="mass-priority-medium" class="mass-edit-option-label">
                    <span class="priority-pill priority-medium">MEDIUM</span>
                </label>
            </div>
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-priority" value="low" id="mass-priority-low">
                <label for="mass-priority-low" class="mass-edit-option-label">
                    <span class="priority-pill priority-low">LOW</span>
                </label>
            </div>
        `;
    } else if (field === 'dates') {
        bodyHTML = `
            <div class="mass-edit-date-group">
                <label class="mass-edit-date-label" for="mass-edit-start-date">
                    ${t('tasks.massEdit.startDate')}
                </label>
                <input type="text" id="mass-edit-start-date" class="mass-edit-date-input" placeholder="dd/mm/yyyy" autocomplete="off">
            </div>
            <div class="mass-edit-date-group">
                <label class="mass-edit-date-label" for="mass-edit-end-date">
                    ${t('tasks.massEdit.endDate')}
                </label>
                <input type="text" id="mass-edit-end-date" class="mass-edit-date-input" placeholder="dd/mm/yyyy" autocomplete="off">
            </div>
        `;
    } else if (field === 'project') {
        const projectOptions = projects.map(proj => `
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-project" value="${proj.id}" id="mass-project-${proj.id}">
                <label for="mass-project-${proj.id}" class="mass-edit-option-label">
                    <span class="project-dot" style="background: ${getProjectColor(proj.id)};"></span>
                    ${escapeHtml(proj.name)}
                </label>
            </div>
        `).join('');

        bodyHTML = `
            <div class="mass-edit-option">
                <input type="radio" name="mass-edit-project" value="none" id="mass-project-none">
                <label for="mass-project-none" class="mass-edit-option-label">
                    ${t('tasks.noProject')}
                </label>
            </div>
            ${projectOptions}
        `;
    } else if (field === 'tags') {
        // Get all unique tags from selected tasks
        const visibleTasks = getVisibleTasks();
        const selectedTasks = visibleTasks.filter(task => massEditState.selectedTaskIds.has(task.id));
        const existingTagsSet = new Set();
        selectedTasks.forEach(task => {
            if (task.tags && Array.isArray(task.tags)) {
                task.tags.forEach(tag => existingTagsSet.add(tag));
            }
        });
        const existingTags = [...existingTagsSet].sort();

        const existingTagsHTML = existingTags.length > 0
            ? existingTags.map(tag => `
                <div class="mass-edit-existing-tag" data-tag="${escapeHtml(tag)}">
                    <span class="tag-badge" style="background: ${getTagColor(tag)};">${escapeHtml(tag.toUpperCase())}</span>
                </div>
            `).join('')
            : `<div class="mass-edit-no-tags">${t('tasks.massEdit.tags.noExisting') || 'No existing tags'}</div>`;

        bodyHTML = `
            <div class="mass-edit-tags-mode">
                <div class="mass-edit-tags-mode-option active" data-mode="add">
                    <input type="radio" name="mass-edit-tags-mode" value="add" id="mass-tags-mode-add" checked>
                    <label for="mass-tags-mode-add" class="mass-edit-option-label">
                        ${t('tasks.massEdit.tags.add')}
                    </label>
                </div>
                <div class="mass-edit-tags-mode-option" data-mode="replace">
                    <input type="radio" name="mass-edit-tags-mode" value="replace" id="mass-tags-mode-replace">
                    <label for="mass-tags-mode-replace" class="mass-edit-option-label">
                        ${t('tasks.massEdit.tags.replace')}
                    </label>
                </div>
                <div class="mass-edit-tags-mode-option" data-mode="remove">
                    <input type="radio" name="mass-edit-tags-mode" value="remove" id="mass-tags-mode-remove">
                    <label for="mass-tags-mode-remove" class="mass-edit-option-label">
                        ${t('tasks.massEdit.tags.remove')}
                    </label>
                </div>
            </div>
            <div class="mass-edit-existing-tags-section">
                <div class="mass-edit-existing-tags-label">Click to select:</div>
                <div class="mass-edit-existing-tags" id="mass-edit-existing-tags">
                    ${existingTagsHTML}
                </div>
            </div>
            <div class="mass-edit-tags-input">
                <input type="text" id="mass-edit-tag-input" placeholder="Add tag">
                <button class="btn btn-secondary" id="mass-edit-add-tag-btn">Add</button>
            </div>
            <div class="mass-edit-selected-label">Selected:</div>
            <div class="mass-edit-tags-list" id="mass-edit-tags-list"></div>
        `;
    }

    popover.innerHTML = `
        <div class="mass-edit-popover-header">
            <h3 class="mass-edit-popover-title">${getMassEditPopoverTitle(field)}</h3>
            <button type="button" class="mass-edit-popover-done">${t('common.done')}</button>
        </div>
        <div class="mass-edit-popover-body">
            ${bodyHTML}
        </div>
        <div class="mass-edit-popover-footer">
            <button class="btn btn-outline" id="mass-edit-popover-clear-btn" disabled>Clear</button>
            <button class="btn btn-primary" id="mass-edit-apply-btn" data-action="applyMassEdit" disabled>${t('tasks.massEdit.apply')}</button>
        </div>
    `;

    // Setup Clear and Apply buttons
    const clearBtn = popover.querySelector('#mass-edit-popover-clear-btn');
    const applyBtn = popover.querySelector('#mass-edit-apply-btn');

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearMassEditPopover();
            updateMassEditPopoverButtonStates(popover);
        });
    }

    // Done button closes popover
    const doneBtn = popover.querySelector('.mass-edit-popover-done');
    if (doneBtn) {
        doneBtn.addEventListener('click', () => closeMassEditPopover());
    }

    // Listen for changes in popover to update button states (no timeouts)
    popover.addEventListener('change', () => updateMassEditPopoverButtonStates(popover));
    popover.addEventListener('click', () => updateMassEditPopoverButtonStates(popover));

    // Make entire row clickable for all radio options (status, priority, project)
    const massEditOptions = popover.querySelectorAll('.mass-edit-option');
    massEditOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            // Avoid double-triggering if radio was clicked directly
            if (e.target.tagName === 'INPUT') return;
            const radio = option.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });

    // Setup tag mode switching
    if (field === 'tags') {
        const modeOptions = popover.querySelectorAll('.mass-edit-tags-mode-option');
        modeOptions.forEach(option => {
            option.addEventListener('click', () => {
                modeOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                option.querySelector('input').checked = true;
            });
        });

        // Setup add tag button
        const addTagBtn = popover.querySelector('#mass-edit-add-tag-btn');
        const tagInput = popover.querySelector('#mass-edit-tag-input');
        addTagBtn.addEventListener('click', () => {
            const tagName = tagInput.value.trim().toLowerCase();
            if (!tagName) return;

            const tagsList = popover.querySelector('#mass-edit-tags-list');
            const existingTags = Array.from(tagsList.querySelectorAll('.mass-edit-tag-item'))
                .map(el => el.dataset.tagName);

            if (!existingTags.includes(tagName)) {
                const tagColor = getTagColor(tagName);
                const tagItem = document.createElement('div');
                tagItem.className = 'mass-edit-tag-item';
                tagItem.dataset.tagName = tagName;
                tagItem.style.background = tagColor;
                tagItem.innerHTML = `
                    <span>${escapeHtml(tagName.toUpperCase())}</span>
                    <button class="mass-edit-tag-remove" onclick="this.parentElement.remove()">×</button>
                `;
                tagsList.appendChild(tagItem);
                tagInput.value = '';
            }
        });

        // Enter key to add tag
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTagBtn.click();
            }
        });

        // Click-to-select existing tags
        const existingTagsContainer = popover.querySelector('#mass-edit-existing-tags');
        if (existingTagsContainer) {
            existingTagsContainer.addEventListener('click', (e) => {
                const tagEl = e.target.closest('.mass-edit-existing-tag');
                if (!tagEl) return;

                const tagName = tagEl.dataset.tag;
                if (!tagName) return;

                // Toggle selection state
                tagEl.classList.toggle('selected');

                const tagsList = popover.querySelector('#mass-edit-tags-list');
                const existingSelected = Array.from(tagsList.querySelectorAll('.mass-edit-tag-item'))
                    .map(el => el.dataset.tagName);

                if (tagEl.classList.contains('selected')) {
                    // Add to selected list if not already there
                    if (!existingSelected.includes(tagName)) {
                        const tagColor = getTagColor(tagName);
                        const tagItem = document.createElement('div');
                        tagItem.className = 'mass-edit-tag-item';
                        tagItem.dataset.tagName = tagName;
                        tagItem.style.background = tagColor;
                        tagItem.innerHTML = `
                            <span>${escapeHtml(tagName.toUpperCase())}</span>
                            <button class="mass-edit-tag-remove">×</button>
                        `;
                        tagItem.querySelector('.mass-edit-tag-remove').addEventListener('click', () => {
                            tagItem.remove();
                            tagEl.classList.remove('selected');
                        });
                        tagsList.appendChild(tagItem);
                    }
                } else {
                    // Remove from selected list (iterate to avoid CSS selector injection from tagName)
                    const toRemove = Array.from(tagsList.querySelectorAll('.mass-edit-tag-item'))
                        .find(el => el.dataset.tagName === tagName);
                    if (toRemove) toRemove.remove();
                }
            });
        }
    }

    return popover;
}

/**
 * Gets the popover title for each field
 */
function getMassEditPopoverTitle(field) {
    const count = massEditState.selectedTaskIds.size;
    const fieldTitles = {
        'status': `${t('tasks.massEdit.status')} (${count} tasks)`,
        'priority': `${t('tasks.massEdit.priority')} (${count} tasks)`,
        'dates': `${t('tasks.massEdit.dates')} (${count} tasks)`,
        'project': `${t('tasks.massEdit.project')} (${count} tasks)`,
        'tags': `${t('tasks.massEdit.tags')} (${count} tasks)`
    };
    return fieldTitles[field] || '';
}

/**
 * Closes the mass edit popover
 */
function closeMassEditPopover() {
    const popover = document.getElementById('mass-edit-popover');
    if (popover) {
        popover.remove();
    }
}

function checkPopoverHasSelection(popover) {
    if (!popover) return false;

    const field = popover.dataset.field;
    if (!field) return false;

    // Field-specific: only count the actual value inputs, never mode/structure radios
    if (field === 'status') {
        return !!popover.querySelector('input[name="mass-edit-status"]:checked');
    }
    if (field === 'priority') {
        return !!popover.querySelector('input[name="mass-edit-priority"]:checked');
    }
    if (field === 'project') {
        return popover.querySelector('input[name="mass-edit-project"]:checked') != null;
    }
    if (field === 'dates') {
        const start = document.getElementById('mass-edit-start-date')?.dataset?.isoValue ?? '';
        const end = document.getElementById('mass-edit-end-date')?.dataset?.isoValue ?? '';
        return !!(start || end);
    }
    if (field === 'tags') {
        const selectedTags = popover.querySelectorAll('.mass-edit-tag-item');
        if (selectedTags.length > 0) return true;
        const selectedExisting = popover.querySelectorAll('.mass-edit-existing-tag.selected');
        return selectedExisting.length > 0;
    }

    return false;
}

/**
 * Updates Clear and Apply button states in the mass edit popover.
 * Clear: disabled when no selection; enabled when there is a selection.
 * Apply: disabled by default. Enabled ONLY when (1) a selection exists AND (2) it differs from baseline.
 *        Baseline = what was already queued when we opened, or empty if fresh.
 */
function updateMassEditPopoverButtonStates(popover) {
    if (!popover) return;
    const clearBtn = popover.querySelector('#mass-edit-popover-clear-btn');
    const applyBtn = popover.querySelector('#mass-edit-apply-btn');
    const hasSelection = checkPopoverHasSelection(popover);
    if (clearBtn) clearBtn.disabled = !hasSelection;
    const baselineJson = popover.dataset.initialStateJson ?? '';
    const currentJson = getPopoverFormState(popover);
    const selectionDiffersFromBaseline = (currentJson !== baselineJson);
    const applyEnabled = hasSelection && selectionDiffersFromBaseline;
    if (applyBtn) {
        if (applyEnabled) {
            applyBtn.removeAttribute('disabled');
            applyBtn.disabled = false;
            applyBtn.setAttribute('aria-disabled', 'false');
        } else {
            applyBtn.setAttribute('disabled', '');
            applyBtn.disabled = true;
            applyBtn.setAttribute('aria-disabled', 'true');
        }
    }
}

/** Serializes popover form state for comparison (Apply enabled only when user changes selection) */
function getPopoverFormState(popover) {
    if (!popover) return '';
    const field = popover.dataset.field;
    if (field === 'status') {
        return popover.querySelector('input[name="mass-edit-status"]:checked')?.value ?? '';
    }
    if (field === 'priority') {
        return popover.querySelector('input[name="mass-edit-priority"]:checked')?.value ?? '';
    }
    if (field === 'project') {
        const r = popover.querySelector('input[name="mass-edit-project"]:checked')?.value;
        return r === undefined ? '' : String(r);
    }
    if (field === 'dates') {
        const s = document.getElementById('mass-edit-start-date')?.dataset?.isoValue ?? '';
        const e = document.getElementById('mass-edit-end-date')?.dataset?.isoValue ?? '';
        return `${s}|${e}`;
    }
    if (field === 'tags') {
        const mode = popover.querySelector('input[name="mass-edit-tags-mode"]:checked')?.value ?? '';
        const tags = Array.from(popover.querySelectorAll('#mass-edit-tags-list .mass-edit-tag-item'))
            .map(el => el.dataset.tagName).sort().join(',');
        const existing = Array.from(popover.querySelectorAll('.mass-edit-existing-tag.selected'))
            .map(el => el.dataset.tag).sort().join(',');
        return `${mode}|${tags}|${existing}`;
    }
    return '';
}

function clearMassEditPopover() {
    const popover = document.getElementById('mass-edit-popover');
    if (!popover) return;

    const field = popover.dataset.field;

    // Unqueue this field from pending changes and refresh toolbar UI
    massEditState.pendingChanges = massEditState.pendingChanges.filter(c => c.field !== field);
    updatePendingChangesUI();

    // Clear radio selections
    const radios = popover.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => radio.checked = false);

    // Clear date inputs
    const dateInputs = popover.querySelectorAll('.mass-edit-date-input');
    dateInputs.forEach(input => {
        input.value = '';
        input.dataset.isoValue = '';
        if (input._flatpickr) input._flatpickr.clear();
    });

    // Clear tags selection
    const tagsList = popover.querySelector('#mass-edit-tags-list');
    if (tagsList) tagsList.innerHTML = '';

    const existingTags = popover.querySelectorAll('.mass-edit-existing-tag');
    existingTags.forEach(tag => tag.classList.remove('selected'));

    const tagInput = popover.querySelector('#mass-edit-tag-input');
    if (tagInput) tagInput.value = '';

    // Reset mode options visual state
    const modeOptions = popover.querySelectorAll('.mass-edit-tags-mode-option');
    modeOptions.forEach((opt, i) => {
        opt.classList.toggle('active', i === 0);
        const radio = opt.querySelector('input[type="radio"]');
        if (radio) radio.checked = (i === 0);
    });

    // Reset initial state so Apply stays disabled until user selects again
    popover.dataset.initialStateJson = getPopoverFormState(popover);
}

/**
 * Prepares mass edit changes and opens confirmation modal
 */
/**
 * Queues a mass edit change (called when user clicks Apply in popover)
 * This doesn't save immediately - changes are applied when "Apply Changes" is clicked
 */
function queueMassEditChange() {
    const popover = document.getElementById('mass-edit-popover');
    if (!popover) return;

    // Guard: Apply only valid when (1) selection exists and (2) differs from baseline (already queued)
    const hasSelection = checkPopoverHasSelection(popover);
    const baselineJson = popover.dataset.initialStateJson ?? '';
    const currentJson = getPopoverFormState(popover);
    const selectionDiffersFromBaseline = (currentJson !== baselineJson);
    if (!hasSelection || !selectionDiffersFromBaseline) {
        showNotification(t('tasks.massEdit.selectFirst'), 'info');
        return;
    }

    const field = popover.dataset.field;
    let change = null;

    if (field === 'status') {
        const selectedValue = popover.querySelector('input[name="mass-edit-status"]:checked')?.value;
        if (!selectedValue) {
            showNotification(t('tasks.massEdit.selectFirst'), 'info');
            return;
        }
        change = { field: 'status', value: selectedValue };
    } else if (field === 'priority') {
        const selectedValue = popover.querySelector('input[name="mass-edit-priority"]:checked')?.value;
        if (!selectedValue) {
            showNotification(t('tasks.massEdit.selectFirst'), 'info');
            return;
        }
        change = { field: 'priority', value: selectedValue };
    } else if (field === 'dates') {
        const startInput = document.getElementById('mass-edit-start-date');
        const endInput = document.getElementById('mass-edit-end-date');
        // Read ISO value from Flatpickr's onChange handler (stored in dataset)
        const startDate = startInput?.dataset.isoValue || null;
        const endDate = endInput?.dataset.isoValue || null;

        if (!startDate && !endDate) {
            showNotification(t('tasks.massEdit.selectFirst'), 'info');
            return;
        }

        change = { field: 'dates', startDate, endDate };
    } else if (field === 'project') {
        const selectedValue = popover.querySelector('input[name="mass-edit-project"]:checked')?.value;
        if (selectedValue === undefined) {
            showNotification(t('tasks.massEdit.selectFirst'), 'info');
            return;
        }
        const projectId = selectedValue === 'none' ? null : parseInt(selectedValue, 10);
        change = { field: 'project', value: projectId };
    } else if (field === 'tags') {
        const mode = popover.querySelector('input[name="mass-edit-tags-mode"]:checked')?.value;
        const tagElements = popover.querySelectorAll('#mass-edit-tags-list .mass-edit-tag-item');
        const tags = Array.from(tagElements).map(el => el.dataset.tagName);

        if (tags.length === 0) {
            showNotification(t('tasks.massEdit.selectFirst'), 'info');
            return;
        }

        change = { field: 'tags', mode, tags };
    }

    if (!change) return;

    // Remove any existing change for the same field (replace with new one)
    massEditState.pendingChanges = massEditState.pendingChanges.filter(c => c.field !== field);
    
    // Add the new change
    massEditState.pendingChanges.push(change);

    // Close popover
    closeMassEditPopover();

    // Update UI to show pending state
    updatePendingChangesUI();

    // Show feedback
    showNotification(t('tasks.massEdit.changeQueued'), 'info');
}

/**
 * Updates the pending changes UI (indicator and button state)
 */
function updatePendingChangesUI() {
    const pendingEl = document.getElementById('mass-edit-pending');
    const pendingCountEl = document.getElementById('mass-edit-pending-count');
    const applyAllBtn = document.getElementById('mass-edit-apply-all-btn');
    
    const count = massEditState.pendingChanges.length;
    const hasSelection = massEditState.selectedTaskIds.size > 0;
    
    // Update pending indicator
    if (pendingEl && pendingCountEl) {
        if (count > 0) {
            pendingEl.style.display = 'flex';
            pendingCountEl.textContent = count;
        } else {
            pendingEl.style.display = 'none';
        }
    }
    
    // Update Apply Changes button
    if (applyAllBtn) {
        applyAllBtn.disabled = !(count > 0 && hasSelection);
    }
    
    // Update field buttons to show which have pending changes
    const fieldButtons = {
        'status': document.getElementById('mass-edit-status-btn'),
        'priority': document.getElementById('mass-edit-priority-btn'),
        'dates': document.getElementById('mass-edit-dates-btn'),
        'project': document.getElementById('mass-edit-project-btn'),
        'tags': document.getElementById('mass-edit-tags-btn')
    };
    
    const pendingFields = new Set(massEditState.pendingChanges.map(c => c.field));
    
    Object.entries(fieldButtons).forEach(([field, btn]) => {
        if (btn) {
            if (pendingFields.has(field)) {
                btn.classList.add('has-pending');
            } else {
                btn.classList.remove('has-pending');
            }
        }
    });
}

/**
 * Shows confirmation modal with summary of all queued changes
 */
function applyAllMassEditChanges() {
    const changes = massEditState.pendingChanges;
    if (changes.length === 0) {
        return;
    }

    // CRITICAL: Only work with VISIBLE selected tasks (includes Updated filter)
    const visibleTasks = getVisibleTasks();
    const visibleSelectedIds = visibleTasks
        .filter(task => massEditState.selectedTaskIds.has(task.id))
        .map(task => task.id);
    
    if (visibleSelectedIds.length === 0) {
        return;
    }

    // Show confirmation modal with all changes
    showMassEditConfirmation(changes);
}

// Keep the old function for backwards compatibility (confirmation modal flow)
function prepareMassEditConfirmation() {
    // This function is now replaced by queueMassEditChange
    // but kept for any legacy references
    queueMassEditChange();
}

/**
 * Shows confirmation modal with summary of ALL queued changes
 */
function showMassEditConfirmation(changesArray) {
    const modal = document.getElementById('mass-edit-confirm-modal');
    const summaryEl = document.getElementById('mass-edit-confirm-summary');
    const changesEl = document.getElementById('mass-edit-confirm-changes');
    const applyBtn = document.getElementById('mass-edit-confirm-apply-btn');

    // Get selected tasks
    const visibleTasks = getVisibleTasks();
    const selectedTasks = visibleTasks.filter(task => massEditState.selectedTaskIds.has(task.id));
    const count = selectedTasks.length;

    // Summary
    summaryEl.textContent = t('tasks.massEdit.confirm.summary', { count }).replace(/:\s*$/, '.');

    // Helper: get original value or "Various"
    const getOriginal = (field, getVal, getLabel) => {
        const vals = selectedTasks.map(t => getVal(t));
        const uniq = [...new Set(vals)];
        if (uniq.length === 1) {
            return getLabel(uniq[0]);
        }
        return '<span class="mass-edit-various">Various</span>';
    };

    // Build changes as simple visual rows
    let changesHTML = '';

    changesArray.forEach(change => {
        if (change.field === 'status') {
            const toLabel = getStatusLabel(change.value);
            // Get unique original statuses
            const originalStatuses = [...new Set(selectedTasks.map(t => t.status))];
            const fromHTML = originalStatuses.length === 1
                ? `<span class="status-badge ${originalStatuses[0]}">${getStatusLabel(originalStatuses[0])}</span>`
                : `<span class="mass-edit-multiple">${t('tasks.massEdit.multiple')}</span>`;
            changesHTML += `
                <div class="mass-edit-visual-row">
                    <span class="mass-edit-row-label">${t('tasks.massEdit.status')}</span>
                    <span class="mass-edit-row-from">${fromHTML}</span>
                    <span class="mass-edit-row-arrow">→</span>
                    <span class="mass-edit-row-to"><span class="status-badge ${change.value}">${toLabel}</span></span>
                </div>
            `;
        } else if (change.field === 'priority') {
            const toLabel = getPriorityLabel(change.value).toUpperCase();
            // Get unique original priorities
            const originalPriorities = [...new Set(selectedTasks.map(t => t.priority))];
            const fromHTML = originalPriorities.length === 1
                ? `<span class="priority-pill priority-${originalPriorities[0]}">${getPriorityLabel(originalPriorities[0]).toUpperCase()}</span>`
                : `<span class="mass-edit-multiple">${t('tasks.massEdit.multiple')}</span>`;
            changesHTML += `
                <div class="mass-edit-visual-row">
                    <span class="mass-edit-row-label">${t('tasks.massEdit.priority')}</span>
                    <span class="mass-edit-row-from">${fromHTML}</span>
                    <span class="mass-edit-row-arrow">→</span>
                    <span class="mass-edit-row-to"><span class="priority-pill priority-${change.value}">${toLabel}</span></span>
                </div>
            `;
        } else if (change.field === 'dates') {
            const noDateLabel = t('tasks.noDate') || 'No Date';
            if (change.startDate) {
                // Get unique start dates from selected tasks
                const originalStartDates = [...new Set(selectedTasks.map(task => task.startDate || ''))];
                let fromHTML;
                if (originalStartDates.length === 1) {
                    fromHTML = originalStartDates[0] ? formatDate(originalStartDates[0]) : `<span class="mass-edit-multiple">${noDateLabel}</span>`;
                } else {
                    fromHTML = `<span class="mass-edit-multiple">${t('tasks.massEdit.multiple')}</span>`;
                }
                changesHTML += `
                    <div class="mass-edit-visual-row">
                        <span class="mass-edit-row-label">${t('tasks.massEdit.startDate')}</span>
                        <span class="mass-edit-row-from">${fromHTML}</span>
                        <span class="mass-edit-row-arrow">→</span>
                        <span class="mass-edit-row-to">${formatDate(change.startDate)}</span>
                    </div>
                `;
            }
            if (change.endDate) {
                // Get unique end dates from selected tasks
                const originalEndDates = [...new Set(selectedTasks.map(task => task.endDate || ''))];
                let fromHTML;
                if (originalEndDates.length === 1) {
                    fromHTML = originalEndDates[0] ? formatDate(originalEndDates[0]) : `<span class="mass-edit-multiple">${noDateLabel}</span>`;
                } else {
                    fromHTML = `<span class="mass-edit-multiple">${t('tasks.massEdit.multiple')}</span>`;
                }
                changesHTML += `
                    <div class="mass-edit-visual-row">
                        <span class="mass-edit-row-label">${t('tasks.massEdit.endDate')}</span>
                        <span class="mass-edit-row-from">${fromHTML}</span>
                        <span class="mass-edit-row-arrow">→</span>
                        <span class="mass-edit-row-to">${formatDate(change.endDate)}</span>
                    </div>
                `;
            }
        } else if (change.field === 'project') {
            const toName = change.value === null ? t('tasks.noProject') : (projects.find(p => p.id === change.value)?.name || '');
            const noProjectLabel = t('tasks.noProject');
            const fromNames = selectedTasks.map(task => {
                if (!task.projectId) return noProjectLabel;
                const p = projects.find(pr => pr.id === task.projectId);
                return p ? p.name : '';
            });
            const uniqFrom = [...new Set(fromNames)];
            const fromHTML = uniqFrom.length === 1 && uniqFrom[0] ? escapeHtml(uniqFrom[0]) : '<span class="mass-edit-various">Various</span>';
            changesHTML += `
                <div class="mass-edit-visual-row">
                    <span class="mass-edit-row-label">${t('tasks.massEdit.project')}</span>
                    <span class="mass-edit-row-from">${fromHTML}</span>
                    <span class="mass-edit-row-arrow">→</span>
                    <span class="mass-edit-row-to">${escapeHtml(toName)}</span>
                </div>
            `;
        } else if (change.field === 'tags') {
            const modeLabel = {
                'add': t('tasks.massEdit.tags.add'),
                'replace': t('tasks.massEdit.tags.replace'),
                'remove': t('tasks.massEdit.tags.remove')
            }[change.mode];
            const tagsHTML = change.tags.map(tag =>
                `<span class="tag-badge" style="background: ${getTagColor(tag)}; font-size: 10px; padding: 2px 6px;">${escapeHtml(tag.toUpperCase())}</span>`
            ).join(' ');
            changesHTML += `
                <div class="mass-edit-visual-row">
                    <span class="mass-edit-row-label">${modeLabel}</span>
                    <span class="mass-edit-row-from"></span>
                    <span class="mass-edit-row-arrow"></span>
                    <span class="mass-edit-row-to">${tagsHTML}</span>
                </div>
            `;
        }
    });

    changesEl.innerHTML = changesHTML;

    // Button text
    const applyBtnText = applyBtn.querySelector('[data-i18n]');
    if (applyBtnText) {
        applyBtnText.textContent = t('tasks.massEdit.confirm.confirm');
    }

    modal.style.display = '';
    modal.classList.add('active');
}

/**
 * Closes mass edit confirmation modal
 */
function closeMassEditConfirm() {
    const modal = document.getElementById('mass-edit-confirm-modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function closeMassEditConfirmOnBackdrop(e) {
    // Only close if clicking directly on the backdrop (not on modal content)
    if (e.target.id === 'mass-edit-confirm-modal') {
        closeMassEditConfirm();
    }
}

/**
 * Applies confirmed mass edit changes (handles array of changes)
 */
async function applyMassEditConfirmed() {
    console.log('[Mass Edit] applyMassEditConfirmed() called');
    const changes = massEditState.pendingChanges;
    if (!changes || changes.length === 0) {
        console.warn('[Mass Edit] No pending changes, exiting');
        return;
    }

    // CRITICAL: Only apply to VISIBLE selected tasks (includes Updated filter)
    const visibleTasks = getVisibleTasks();
    const visibleSelectedIds = visibleTasks
        .filter(task => massEditState.selectedTaskIds.has(task.id))
        .map(task => task.id);
    
    const count = visibleSelectedIds.length;
    console.log('[Mass Edit] Starting mass edit:', { count, changes });

    // Add loading state
    const applyBtn = document.getElementById('mass-edit-confirm-apply-btn');
    const originalBtnText = applyBtn ? applyBtn.innerHTML : '';
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="spinner"></span> ' + (t('common.updating') || 'Updating...');
    }

    try {
        // Only use visible selected IDs (already filtered above)
        const validIds = visibleSelectedIds;

        // Apply ALL changes to each task
        validIds.forEach(taskId => {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            const oldTask = { ...task, tags: [...(task.tags || [])] };

            // Apply each queued change
            changes.forEach(change => {
                if (change.field === 'status') {
                    task.status = change.value;
                } else if (change.field === 'priority') {
                    task.priority = change.value;
                } else if (change.field === 'dates') {
                    if (change.startDate) {
                        task.startDate = change.startDate;
                    }
                    if (change.endDate) {
                        task.endDate = change.endDate;
                    }
                } else if (change.field === 'project') {
                    task.projectId = change.value;
                } else if (change.field === 'tags') {
                    const oldTags = [...(task.tags || [])];
                    
                    if (change.mode === 'add') {
                        const newTags = new Set([...oldTags, ...change.tags]);
                        task.tags = Array.from(newTags);
                    } else if (change.mode === 'replace') {
                        task.tags = [...change.tags];
                    } else if (change.mode === 'remove') {
                        task.tags = oldTags.filter(tag => !change.tags.includes(tag));
                    }
                }
            });

            // Update timestamp
            task.updatedAt = new Date().toISOString();

            // Record history
            if (window.historyService) {
                window.historyService.recordTaskUpdated(oldTask, task);
            }
        });

        // Save to storage
        console.log('[Mass Edit] Calling saveTasks()...');
        await saveTasks();
        console.log('[Mass Edit] saveTasks() completed successfully');

        // Show success notification
        showNotification(t('tasks.massEdit.success', { count: validIds.length }), 'success');

        // Close modal
        closeMassEditConfirm();

        // Clear pending changes and selection
        massEditState.pendingChanges = [];
        clearMassEditSelection();

        // Re-render views
        renderTasks();
        renderListView();

        // Update projects view if active
        if (document.getElementById('projects')?.classList.contains('active')) {
            renderProjects();
        }

    } catch (error) {
        const msg = error?.message ?? String(error);
        const stack = error?.stack;
        const cause = error?.cause;
        console.error('[Mass Edit] Save failed:', msg);
        if (stack) console.error('[Mass Edit] Stack:', stack);
        if (cause) console.error('[Mass Edit] Cause:', cause?.message ?? cause);
        showNotification(t('error.saveChangesFailed'), 'error');
    } finally {
        // Restore button state
        if (applyBtn) {
            applyBtn.disabled = false;
            applyBtn.innerHTML = originalBtnText;
        }
    }
}

// ================================
// END MASS EDIT FUNCTIONALITY
// ================================

/**
 * Show mass delete confirmation modal
 */
function massDelete() {
    const visibleTasks = getVisibleTasks();
    const visibleSelectedTasks = visibleTasks
        .filter(task => massEditState.selectedTaskIds.has(task.id));
    
    const count = visibleSelectedTasks.length;
    
    if (count === 0) {
        showNotification('No tasks selected', 'warning');
        return;
    }

    // Show confirmation modal
    const modal = document.getElementById('mass-delete-confirm-modal');
    const message = document.getElementById('mass-delete-message');
    const taskList = document.getElementById('mass-delete-task-list');
    const input = document.getElementById('mass-delete-confirm-input');
    const errorMsg = document.getElementById('mass-delete-confirm-error');
    
    if (message) {
        message.innerHTML = `You are about to delete <strong>${count} task(s)</strong>:`;
    }
    
    // Build task list summary
    if (taskList) {
        const taskItems = visibleSelectedTasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projectName = project ? project.name : 'No Project';
            const statusLabel = getStatusLabel(task.status);
            const priorityLabel = getPriorityLabel(task.priority);
            
            return `
                <div style="padding: 8px; margin-bottom: 6px; background: var(--bg-card); border-radius: 4px; border-left: 3px solid ${project ? getProjectColor(project.id) : 'var(--border)'};">
                    <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(task.title || 'Untitled')}</div>
                    <div style="display: flex; gap: 8px; font-size: 11px; color: var(--text-secondary);">
                        <span>${escapeHtml(projectName)}</span>
                        <span>•</span>
                        <span>${escapeHtml(statusLabel)}</span>
                        <span>•</span>
                        <span>${escapeHtml(priorityLabel)}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        taskList.innerHTML = taskItems;
    }
    
    if (input) {
        input.value = '';
    }
    
    if (errorMsg) {
        errorMsg.classList.remove('show');
    }
    
    if (modal) {
        modal.classList.add('active');
        // Focus input after modal is visible
        setTimeout(() => input && input.focus(), 100);
    }

    // Auto-convert to lowercase as user types
    const lowercaseHandler = function(e) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toLowerCase();
        e.target.setSelectionRange(start, end);
    };
    input.addEventListener('input', lowercaseHandler);

    // Keyboard support
    const keyHandler = function(e) {
        const modal = document.getElementById('mass-delete-confirm-modal');
        if (!modal || !modal.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            e.preventDefault();
            closeMassDeleteConfirmModal();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            confirmMassDelete();
        }
    };
    document.addEventListener('keydown', keyHandler);
}

/**
 * Close mass delete confirmation modal
 */
function closeMassDeleteConfirmModal() {
    const modal = document.getElementById('mass-delete-confirm-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Confirm and execute mass delete
 */
async function confirmMassDelete() {
    const input = document.getElementById('mass-delete-confirm-input');
    const errorMsg = document.getElementById('mass-delete-confirm-error');
    const confirmText = input.value;

    if (confirmText !== 'delete') {
        errorMsg.classList.add('show');
        input.focus();
        return;
    }

    const visibleTasks = getVisibleTasks();
    const visibleSelectedIds = visibleTasks
        .filter(task => massEditState.selectedTaskIds.has(task.id))
        .map(task => task.id);
    
    const count = visibleSelectedIds.length;

    // Delete each selected task
    visibleSelectedIds.forEach(taskId => {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const task = tasks[taskIndex];
            
            // Record history before deletion
            if (window.historyService) {
                window.historyService.recordTaskDeleted(task);
            }
            
            // Remove from tasks array
            tasks.splice(taskIndex, 1);
            
            // Remove all dependencies involving this task
            const depResult = removeDependenciesForTask(taskId, dependencies);
            dependencies = depResult.dependencies;
        }
    });

    // Close modal
    closeMassDeleteConfirmModal();

    // Clear selection
    clearMassEditSelection();

    // Update UI immediately
    render();
    updateCounts();

    // Refresh calendar if exists
    const calendarView = document.getElementById('calendar-view');
    if (calendarView) {
        renderCalendar();
        if (calendarView.classList.contains('active')) {
            renderCalendar();
        }
    }

    // Save in background
    saveTasks().catch(err => {
        console.error('Failed to save task deletion:', err);
        showErrorNotification('Failed to save changes');
    });
    
    // Save dependencies in background
    saveData("dependencies", serializeDependencies(dependencies)).catch(err => {
        console.error('Failed to save dependency cleanup:', err);
    });

    showNotification(`${count} task(s) deleted successfully`, 'success');
}


// ================================
// PREMIUM MOBILE CARDS
// ================================

// Smart date formatter with urgency indication
// Uses calculateSmartDateInfo from listView module for pure calculation
function getSmartDateInfo(endDate, status = null) {
    const info = calculateSmartDateInfo(endDate, status);
    
    if (!info.hasDate) {
        return { text: t('tasks.noEndDate'), class: "", showPrefix: false };
    }
    
    // Apply translations based on urgency
    let text;
    switch (info.urgency) {
        case 'overdue':
            text = info.daysOverdue === 1
                ? t('tasks.due.yesterday')
                : t('tasks.due.daysOverdue', { count: info.daysOverdue });
            break;
        case 'tomorrow':
            text = t('tasks.due.tomorrow');
            break;
        default:
            text = formatDate(endDate);
    }
    
    return { text, class: info.class, showPrefix: info.showPrefix };
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

        // Parse TipTap task lists and legacy checklist formats
        const taskListItems = Array.from(
            tempDiv.querySelectorAll('ul[data-type="taskList"] > li[data-checked]')
        );
        const cbItems = Array.from(tempDiv.querySelectorAll(".cb-item"));
        const legacyRows = Array.from(tempDiv.querySelectorAll(".checkbox-row"));
        const checklistLines = [];
        taskListItems.forEach((item) => {
            const isChecked = item.getAttribute("data-checked") === "true";
            const text = (item.textContent || "").replace(/\s+/g, " ").trim();
            if (text) checklistLines.push(`${isChecked ? "✓" : "☐"} ${text}`);
        });
        cbItems.forEach((item) => {
            const isChecked = item.getAttribute("data-checked") === "true";
            const text = (item.textContent || "").trim();
            if (text) checklistLines.push(`${isChecked ? "✓" : "☐"} ${text}`);
        });
        legacyRows.forEach((row) => {
            const toggle = row.querySelector(".checkbox-toggle");
            const isChecked =
                toggle?.getAttribute("aria-pressed") === "true" ||
                toggle?.classList?.contains("checked");
            const text = (row.querySelector(".check-text")?.textContent || "").trim();
            if (text) checklistLines.push(`${isChecked ? "✓" : "☐"} ${text}`);
        });

        Array.from(tempDiv.querySelectorAll('ul[data-type="taskList"]')).forEach((list) => list.remove());
        cbItems.forEach((item) => item.remove());
        legacyRows.forEach((row) => row.remove());

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

        const doneClass = task.status === 'done' ? ' is-done' : '';

        return `
            <div class="task-card-mobile${doneClass}" data-priority="${task.priority}" data-task-id="${task.id}">
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
// Uses module function with helper dependencies
function generateProjectItemHTML(project) {
    const helpers = {
        escapeHtml,
        formatDatePretty,
        getProjectColor,
        getProjectStatus,
        getProjectStatusLabel,
        getTagColor,
        getPriorityLabel,
        getStatusLabel,
        getLocale,
        t
    };
    return generateProjectItemHTMLModule(project, tasks, helpers);
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
    const renderTimer = debugTimeStart("render", "projects", { projectCount: projects.length });
    const container = document.getElementById("projects-list");
    if (projects.length === 0) {
        container.innerHTML =
            `<div class="empty-state"><h3>${t('projects.empty.title')}</h3><p>${t('projects.empty.subtitle')}</p></div>`;
        // Also clear mobile container if it exists
        const mobileContainer = document.getElementById("projects-list-mobile");
        if (mobileContainer) mobileContainer.innerHTML = '';
        debugTimeEnd("render", renderTimer, { projectCount: projects.length, rendered: 0 });
        return;
    }

    // Save expanded state before re-rendering
    const expandedProjects = new Set();
    container.querySelectorAll('.project-list-item.expanded').forEach(item => {
        const projectId = item.id.replace('project-item-', '');
        expandedProjects.add(projectId);
    });
// Use sorted view if active, otherwise use full projects array
    const projectsToRender = appState.projectsSortedView || projects;
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
    setupExpandedProjectsDragDrop();
    debugTimeEnd("render", renderTimer, { projectCount: projects.length, rendered: projectsToRender.length });
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
                            <span class="project-status-badge-mobile ${projectStatus}">${getProjectStatusLabel(projectStatus)}</span>
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
    const renderTimer = debugTimeStart("render", "tasks", { taskCount: tasks.length });
    const source =
        typeof getFilteredTasks === "function"
            ? getFilteredTasks()
            : tasks.slice();

    const cutoff = getKanbanUpdatedCutoffTime(window.kanbanUpdatedFilter);
    
    // Use kanban module for grouping and sorting
    const kanbanData = prepareKanbanData(source, {
        showBacklog: window.kanbanShowBacklog === true,
        sortMode: sortMode,
        manualTaskOrder: manualTaskOrder,
        updatedCutoff: cutoff,
        getTaskUpdatedTime: getTaskUpdatedTime
    });
    
    const byStatus = kanbanData.byStatus;
    const sourceForKanban = kanbanData.totalFiltered;

    const cols = {
        backlog: document.getElementById("backlog-tasks"),
        todo: document.getElementById("todo-tasks"),
        progress: document.getElementById("progress-tasks"),
        review: document.getElementById("review-tasks"),
        done: document.getElementById("done-tasks"),
    };

    // Update counts using kanban module data
    const counts = kanbanData.counts;
    const cBacklog = document.getElementById("backlog-count");
    const cTodo = document.getElementById("todo-count");
    const cProg = document.getElementById("progress-count");
    const cRev = document.getElementById("review-count");
    const cDone = document.getElementById("done-count");
    if (cBacklog) cBacklog.textContent = counts.backlog;
    if (cTodo) cTodo.textContent = counts.todo;
    if (cProg) cProg.textContent = counts.progress;
    if (cRev) cRev.textContent = counts.review;
    if (cDone) cDone.textContent = counts.done;

    // Render cards using module function
    const cardHelpers = {
        escapeHtml,
        formatDate,
        getProjectColor,
        getTagColor,
        getPriorityLabel,
        projects,
        selectedCards: appState.selectedCards,
        showProjects: window.kanbanShowProjects !== false,
        showNoDate: window.kanbanShowNoDate !== false,
        noProjectText: t('tasks.noProject'),
        noDateText: t('tasks.noDate')
    };

    ["backlog", "todo", "progress", "review", "done"].forEach((status) => {
        const wrap = cols[status];
        if (!wrap) return;
        wrap.innerHTML = generateKanbanColumnHTML(byStatus[status], cardHelpers);
    });
        
    setupDragAndDrop();
    updateSortUI();
    
    // Initialize mass edit listeners after render (list view specific)
    initializeMassEditListeners();
    
    debugTimeEnd("render", renderTimer, {
        taskCount: tasks.length,
        filteredCount: source.length,
        kanbanCount: sourceForKanban
    });
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
    const startDateWasEverSet = modal.dataset.initialStartDate === 'true';
    const endDateWasEverSet = modal.dataset.initialEndDate === 'true';

    // Get task data for calculation
    let taskData = null;
    if (editingTaskId) {
        taskData = tasks.find(t => t.id === parseInt(editingTaskId, 10));
    }
    if (!taskData) {
        // Fallback to temp data when creating
        taskData = {
            tags: window.tempTags || [],
            attachments: tempAttachments || []
        };
    }

    // Calculate field placement using pure function
    const fieldState = calculateMobileFieldPlacement(taskData, {
        startDateWasEverSet,
        endDateWasEverSet
    });

    // Get form groups for DOM manipulation
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

    // Apply field placement from calculation
    if (tagsGroup) {
        tagsGroup.classList.toggle('mobile-general-field', fieldState.tagsInGeneral);
        tagsGroup.classList.toggle('mobile-details-field', !fieldState.tagsInGeneral);
    }

    if (startDateGroup) {
        startDateGroup.classList.toggle('mobile-general-field', fieldState.startDateInGeneral);
        startDateGroup.classList.toggle('mobile-details-field', !fieldState.startDateInGeneral);
    }

    if (endDateGroup) {
        endDateGroup.classList.toggle('mobile-general-field', fieldState.endDateInGeneral);
        endDateGroup.classList.toggle('mobile-details-field', !fieldState.endDateInGeneral);
    }

    if (linksGroup) {
        linksGroup.classList.toggle('mobile-general-field', fieldState.linksInGeneral);
        linksGroup.classList.toggle('mobile-details-field', !fieldState.linksInGeneral);
    }

    // Update Details tab visibility using pure function
    const detailsTab = modal.querySelector('.modal-tab[data-tab="details"]');
    const hideDetailsTab = shouldHideDetailsTab(fieldState);

    console.log('\u{1F504} Reorganizing fields:', {
        ...fieldState,
        hideDetailsTab
    });

    if (detailsTab) {
        if (hideDetailsTab) {
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

// URL to restore when the task modal is closed (preserves filter state)
let taskModalReturnHash = null;

// Strip task= param from a hash string
function hashWithoutTaskParam(hash) {
    const bare = hash.startsWith('#') ? hash.slice(1) : hash;
    const [page, qs] = bare.split('?');
    const params = new URLSearchParams(qs || '');
    params.delete('task');
    const newQs = params.toString();
    return '#' + page + (newQs ? '?' + newQs : '');
}

function openTaskDetails(taskId, navigationContext = null) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Preserve existing filters: save return hash (without any stale task= param),
    // then append task={id} to the current URL so refresh re-opens this task.
    const currentHash = window.location.hash || '#tasks';
    const baseHash = currentHash.startsWith('#task-')
        ? '#tasks'                          // came from a clean permalink — return to bare tasks
        : hashWithoutTaskParam(currentHash); // strip any stale task= from filter URL
    taskModalReturnHash = baseHash;
    // Add task= to the base URL (preserving all other params)
    const [basePage, baseQs] = baseHash.slice(1).split('?');
    const baseParams = new URLSearchParams(baseQs || '');
    baseParams.set('task', taskId);
    window.history.replaceState(null, '', '#' + basePage + '?' + baseParams.toString());

    const modal = document.getElementById("task-modal");
    if (!modal) return;

    // Setup tag autocomplete listeners
    setupTagAutocompleteListeners();

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

    setTaskDescriptionHTML(task.description || "");
    const descHidden = modal.querySelector("#task-description-hidden");
    if (descHidden) descHidden.value = getTaskDescriptionHTML();

    // Priority
    const hiddenPriority = modal.querySelector("#hidden-priority");
    if (hiddenPriority) hiddenPriority.value = task.priority || "medium";
    const priorityCurrentBtn = modal.querySelector("#priority-current");
    if (priorityCurrentBtn) {
        const priority = task.priority || "medium";
        const priorityLabel = getPriorityLabel(priority).toUpperCase();
        priorityCurrentBtn.innerHTML = `<span class="priority-pill priority-${priority}">${priorityLabel}</span> <span class="dropdown-arrow">▼</span>`;
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

    // Reset link type dropdown to "relates to"
    const linkTypeValue = modal.querySelector("#link-type-value");
    if (linkTypeValue) linkTypeValue.value = "relates_to";
    const linkTypeLabel = modal.querySelector("#link-type-label");
    if (linkTypeLabel) linkTypeLabel.setAttribute('data-i18n', 'tasks.links.relatesTo');
    if (linkTypeLabel) linkTypeLabel.textContent = t('tasks.links.relatesTo');
    // Hide web link inputs, show task search
    const webLinkInputs = modal.querySelector("#web-link-inputs");
    const taskLinkSearch = modal.querySelector("#task-link-search");
    if (webLinkInputs) webLinkInputs.style.display = "none";
    if (taskLinkSearch) taskLinkSearch.style.display = "block";

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

    // Clear tag input field when opening task details
    const tagInput = modal.querySelector("#tag-input");
    if (tagInput) tagInput.value = "";

    // MOBILE: Dynamic field organization - move filled Details fields to General
    // Only applies when editing existing task (not creating new)
    if (getIsMobileCached() && taskId) {
        const hasTags = Array.isArray(task.tags) && task.tags.length > 0;
        const hasStartDate = typeof task.startDate === 'string' && task.startDate.trim() !== '';
        const hasEndDate = typeof task.endDate === 'string' && task.endDate.trim() !== '';
        const hasLinks = (
            (Array.isArray(task.attachments) && task.attachments.some(att =>
                att.type === 'link' || (att.url && att.type !== 'file')
            )) ||
            (Array.isArray(task.links) && task.links.length > 0)
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

// Copy a shareable permalink for the currently open task to the clipboard
function copyTaskLink() {
    const form = document.getElementById("task-form");
    const editingTaskId = form?.dataset.editingTaskId;
    if (!editingTaskId) return;
    const url = `${window.location.origin}${window.location.pathname}#task-${editingTaskId}`;
    navigator.clipboard.writeText(url).then(() => {
        showNotification(t('tasks.modal.linkCopied'), 'success');
    }).catch(() => {
        showNotification(url, 'info'); // fallback: show the URL itself
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

    // Sync date filter option visibility
    populateProjectOptions();
    populateTagOptions();
    updateNoDateOptionVisibility();

    // Update UI: use immediate calendar render when on calendar (avoids debounce breaking layout)
    const inProjectDetails = document.getElementById("project-details").classList.contains("active");
    const isCalendarActive = document.getElementById("calendar-view")?.classList.contains("active");
    if (inProjectDetails && cloned.projectId) {
        showProjectDetails(cloned.projectId);
    }
    renderActivePageOnly({
        calendarChanged: true,
        calendarImmediate: !!isCalendarActive
    });
    // Double-render when on calendar (layout settle - same as changeMonth/goToToday)
    if (isCalendarActive) {
        renderCalendar();
    }

    updateCounts();

    // Save in background (don't block UI)
    saveTasks().catch(err => {
        console.error('Failed to save duplicated task:', err);
        showErrorNotification(t('error.saveTaskFailed'));
    });

    // Show the duplicated task in the modal (user expects to see/edit the copy)
    openTaskDetails(cloned.id);
}

function closeConfirmModal() {
    document.getElementById("confirm-modal").classList.remove("active");
    document.getElementById("confirm-error").classList.remove("show");
}

function showStatusInfoModal() {
    const modal = document.getElementById('status-info-modal');
    if (modal) modal.classList.add('active');
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

        // Remove all dependencies involving this task
        const depResult = removeDependenciesForTask(parseInt(taskId, 10), dependencies);
        dependencies = depResult.dependencies;

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

        // Always refresh calendar if it exists (double-render when active for layout settle)
        const calendarView = document.getElementById("calendar-view");
        if (calendarView) {
            renderCalendar();
            if (calendarView.classList.contains("active")) {
                renderCalendar();
            }
        }

        updateCounts();

        // Save in background (don't block UI)
        saveTasks().catch(err => {
            console.error('Failed to save task deletion:', err);
            showErrorNotification(t('error.saveChangesFailed'));
        });
        
        // Save dependencies in background
        saveData("dependencies", serializeDependencies(dependencies)).catch(err => {
            console.error('Failed to save dependency cleanup:', err);
        });
    } else {
        errorMsg.classList.add('show');
        input.focus();
    }
}

// ============================================================================
// Dependency Management Handlers
// ============================================================================

/**
 * Add a dependency relationship between tasks
 * @param {number} dependentTaskId - Task that depends on another
 * @param {number} prerequisiteTaskId - Task that must be completed first
 */
async function handleAddDependency(dependentTaskId, prerequisiteTaskId) {
    const result = addDependency(dependentTaskId, prerequisiteTaskId, dependencies, tasks);
    
    if (result.error) {
        showErrorNotification(result.error);
        return false;
    }
    
    // Update dependencies state
    dependencies = result.dependencies;
    
    // Persist to storage
    try {
        await saveData("dependencies", serializeDependencies(dependencies));
        showSuccessNotification(t('dependencies.added'));
        return true;
    } catch (error) {
        console.error('Failed to save dependency:', error);
        showErrorNotification(t('error.saveChangesFailed'));
        return false;
    }
}

/**
 * Remove a dependency relationship between tasks
 * @param {number} dependentTaskId - Task that depends on another
 * @param {number} prerequisiteTaskId - Task to remove as prerequisite
 */
async function handleRemoveDependency(dependentTaskId, prerequisiteTaskId) {
    const result = removeDependency(dependentTaskId, prerequisiteTaskId, dependencies);
    
    // Update dependencies state
    dependencies = result.dependencies;
    
    // Persist to storage
    try {
        await saveData("dependencies", serializeDependencies(dependencies));
        showSuccessNotification(t('dependencies.removed'));
        return true;
    } catch (error) {
        console.error('Failed to save dependency removal:', error);
        showErrorNotification(t('error.saveChangesFailed'));
        return false;
    }
}

/**
 * Add a task relationship (uses existing dependencies system for depends_on)
 * @param {number} sourceTaskId - Source task ID
 * @param {number} targetTaskId - Target task ID
 * @param {string} linkType - Type of relationship
 */
async function addTaskRelationship(sourceTaskId, targetTaskId, linkType) {
    // Validate inputs
    if (!sourceTaskId || !targetTaskId) {
        showErrorNotification(t('error.invalidTaskIds'));
        return false;
    }
    
    if (sourceTaskId === targetTaskId) {
        showErrorNotification(t('error.cannotLinkToSelf'));
        return false;
    }
    
    const sourceTask = tasks.find(t => t.id === sourceTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    
    if (!sourceTask || !targetTask) {
        showErrorNotification(t('error.taskNotFound'));
        return false;
    }
    
    if (linkType === 'depends_on') {
        // depends_on uses the existing dependencies system
        const success = await handleAddDependency(sourceTaskId, targetTaskId);
        if (success) {
            renderDependenciesInModal(sourceTask);
        }
        return success;
    } else if (linkType === 'blocks' || linkType === 'is_blocked_by' || linkType === 'relates_to') {
        // Initialize task links arrays if they don't exist
        if (!sourceTask.links) {
            sourceTask.links = [];
        }
        if (!targetTask.links) {
            targetTask.links = [];
        }
        
        // Check if link already exists
        const existingLink = sourceTask.links.find(
            link => link.taskId === targetTaskId && link.type === linkType
        );
        
        if (existingLink) {
            showErrorNotification(t('error.linkAlreadyExists'));
            return false;
        }
        
        // Determine the reciprocal link type
        let reciprocalType;
        if (linkType === 'blocks') {
            reciprocalType = 'is_blocked_by';
        } else if (linkType === 'is_blocked_by') {
            reciprocalType = 'blocks';
        } else if (linkType === 'relates_to') {
            reciprocalType = 'relates_to';
        }
        
        // Add the link from source to target
        sourceTask.links.push({
            type: linkType,
            taskId: targetTaskId,
            createdAt: new Date().toISOString()
        });
        
        // Add the reciprocal link from target to source
        const existingReciprocalLink = targetTask.links.find(
            link => link.taskId === sourceTaskId && link.type === reciprocalType
        );
        
        if (!existingReciprocalLink) {
            targetTask.links.push({
                type: reciprocalType,
                taskId: sourceTaskId,
                createdAt: new Date().toISOString()
            });
        }
        
        // Save tasks
        await saveTasks();

        // Record history for both tasks
        if (window.historyService) {
            const linkTypeLabels = { blocks: 'tasks.links.blocks', is_blocked_by: 'tasks.links.isBlockedBy', relates_to: 'tasks.links.relatesTo' };
            const linkLabel = t(linkTypeLabels[linkType] || 'tasks.links.relatesTo');
            window.historyService.recordHistory('task', sourceTaskId, sourceTask.title || 'Task', 'updated', {
                link: { before: null, after: { action: 'added', entity: 'task', id: targetTaskId, title: targetTask.title, linkType: linkLabel } }
            });
            window.historyService.recordHistory('task', targetTaskId, targetTask.title || 'Task', 'updated', {
                link: { before: null, after: { action: 'added', entity: 'task', id: sourceTaskId, title: sourceTask.title, linkType: linkLabel } }
            });
        }

        // Refresh the task modal to show the new link
        renderDependenciesInModal(sourceTask);

        showSuccessNotification(t('success.linkAdded'));
        return true;
    } else {
        showErrorNotification(`Relationship type "${linkType}" not yet implemented`);
        return false;
    }
}

function setupDragAndDrop() {
    let draggedTaskIds = [];
    let draggedFromStatus = null;
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

    function cleanupDragStyles() {
        document.querySelectorAll(".kanban-column").forEach((col) => {
            col.style.backgroundColor = "";
            col.style.border = "";
            col.classList.remove('drag-over');
        });
        document.querySelectorAll(".task-card").forEach((c) => {
            c.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
            c.style.opacity = "";
        });
    }

    const kanbanBoard = document.querySelector(".kanban-board");
    if (!kanbanBoard) return;
    if (kanbanBoard.dataset.dragDelegation === "1") return;
    kanbanBoard.dataset.dragDelegation = "1";

    const resolveStatusFromColumn = (column) => {
        const tasksContainer = column?.querySelector('[id$="-tasks"]');
        const id = tasksContainer?.id || '';
        return id ? id.replace('-tasks', '') : null;
    };

    kanbanBoard.addEventListener("dragstart", (e) => {
        const card = e.target.closest(".task-card");
        if (!card || !kanbanBoard.contains(card)) return;

        const taskId = parseInt(card.dataset.taskId, 10);
        if (Number.isNaN(taskId)) return;
        const taskObj = tasks.find(t => t.id === taskId);
        draggedFromStatus = taskObj ? taskObj.status : null;

        if (appState.selectedCards.has(taskId)) {
            draggedTaskIds = Array.from(appState.selectedCards);
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

    kanbanBoard.addEventListener("dragend", (e) => {
        draggedTaskIds = [];
        draggedFromStatus = null;
        isSingleDrag = true;

        // Remove placeholder
        try {
            if (dragPlaceholder && dragPlaceholder.parentNode) {
                dragPlaceholder.parentNode.removeChild(dragPlaceholder);
            }
        } catch (err) {}
        dragPlaceholder = null;

        cleanupDragStyles();
        stopAutoScroll();
    });

    // 🔥 CLICK HANDLER - This is where selection happens
    kanbanBoard.addEventListener("click", (e) => {
        const card = e.target.closest(".task-card");
        if (!card || !kanbanBoard.contains(card)) return;
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

            if (Number.isInteger(appState.lastSelectedCardId)) {
                anchorCard = cardsInScope.find((c) => parseInt(c.dataset.taskId, 10) === appState.lastSelectedCardId);
            }
            if (!anchorCard) {
                anchorCard = cardsInScope.find((c) => appState.selectedCards.has(parseInt(c.dataset.taskId, 10))) || card;
            }

            const startIndex = cardsInScope.indexOf(anchorCard);
            const endIndex = cardsInScope.indexOf(card);

            if (!isToggleClick) {
                clearSelectedCards();
            }

            if (startIndex === -1 || endIndex === -1) {
                card.classList.add('selected');
                appState.selectedCards.add(taskId);
                appState.lastSelectedCardId = taskId;
                return;
            }

            const from = Math.min(startIndex, endIndex);
            const to = Math.max(startIndex, endIndex);
            for (let i = from; i <= to; i++) {
                const rangeCard = cardsInScope[i];
                const rangeId = parseInt(rangeCard.dataset.taskId, 10);
                if (isNaN(rangeId)) continue;
                rangeCard.classList.add('selected');
                appState.selectedCards.add(rangeId);
            }

            appState.lastSelectedCardId = taskId;
            return;
        }

        if (isToggleClick) {
            e.preventDefault();
            e.stopPropagation();

            card.classList.toggle('selected');

            if (card.classList.contains('selected')) {
                appState.selectedCards.add(taskId);
            } else {
                appState.selectedCards.delete(taskId);
            }

            appState.lastSelectedCardId = taskId;
            return;
        }

        // Normal click opens task details
        openTaskDetails(taskId);
    });

    const columns = document.querySelectorAll(".kanban-column");

    columns.forEach((column) => {
        column.addEventListener("dragover", (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
            column.style.backgroundColor = "var(--hover-bg)";
            
            if (!dragPlaceholder) return;
            
            // ⭐ KEY FIX: Get the actual tasks container, not the column wrapper
            const tasksContainer = column.querySelector('[id$="-tasks"]');
            if (!tasksContainer) return;
            const newStatus = resolveStatusFromColumn(column);
            if (!newStatus) return;
            
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
            cleanupDragStyles();

            if (draggedTaskIds.length === 0) return;

            const newStatus = resolveStatusFromColumn(column);
            if (!newStatus) return;
            
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
                cleanupDragStyles(); // Must run AFTER render() since columns persist in DOM
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
                cleanupDragStyles(); // Must run AFTER render() since columns persist in DOM
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

    // Setup tag autocomplete listeners
    setupTagAutocompleteListeners();

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
    clearTaskDescriptionEditor();

    // Clear tag input field
    const tagInput = modal.querySelector("#tag-input");
    if (tagInput) tagInput.value = "";

    const descHidden = modal.querySelector("#task-description-hidden");
    if (descHidden) descHidden.value = getTaskDescriptionHTML();

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
        const priorityLabel = getPriorityLabel("medium").toUpperCase();
        priorityCurrentBtn.innerHTML = `<span class="priority-pill priority-medium">${priorityLabel}</span> <span class="dropdown-arrow">▼</span>`;
        updatePriorityOptions("medium");
    }

    // Reset link type dropdown to "relates to"
    const linkTypeValue = modal.querySelector("#link-type-value");
    if (linkTypeValue) linkTypeValue.value = "relates_to";
    const linkTypeLabel = modal.querySelector("#link-type-label");
    if (linkTypeLabel) linkTypeLabel.setAttribute('data-i18n', 'tasks.links.relatesTo');
    if (linkTypeLabel) linkTypeLabel.textContent = t('tasks.links.relatesTo');
    // Hide web link inputs, show task search
    const webLinkInputs = modal.querySelector("#web-link-inputs");
    const taskLinkSearch = modal.querySelector("#task-link-search");
    if (webLinkInputs) webLinkInputs.style.display = "none";
    if (taskLinkSearch) taskLinkSearch.style.display = "block";

    // Reset status (default for new tasks). Kanban + column hidden → To Do; else Backlog (plan: backlog-ux-golden-standard)
    const activeId = typeof getActivePageId === 'function' ? getActivePageId() : null;
    const kanbanBoard = document.querySelector('.kanban-board');
    const isKanban = kanbanBoard && !kanbanBoard.classList.contains('hidden');
    const defaultStatus = (activeId === 'tasks' && isKanban && window.kanbanShowBacklog !== true) ? 'todo' : 'backlog';

    const hiddenStatus = modal.querySelector("#hidden-status");
    if (hiddenStatus) hiddenStatus.value = defaultStatus;

    const currentBtn = modal.querySelector("#status-current");
    if (currentBtn) {
        const statusBadge = currentBtn.querySelector(".status-badge");
        if (statusBadge) {
            statusBadge.className = "status-badge " + defaultStatus;
            statusBadge.textContent = getStatusLabel(defaultStatus);
        }
    }

    // Clear attachments and tags
    tempAttachments = [];
    window.tempTags = [];
    filterState.tags.clear();
    renderAttachments([]);
    renderTags([]);

    // MOBILE: Reset field organization for new task - all Details fields should be in Details tab
    if (getIsMobileCached()) {
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

    // Call specific close functions for modals that need cleanup
    if (modalId === 'import-data-modal') {
        closeImportDataModal();
        return;
    }
    if (modalId === 'delete-account-modal') {
        closeDeleteAccountModal();
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
        updateTaskField('description', getTaskDescriptionHTML());
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
            const priorityLabel = getPriorityLabel("medium").toUpperCase();
            priorityCurrentBtn.innerHTML = `<span class="priority-pill priority-medium">${priorityLabel}</span> <span class="dropdown-arrow">▼</span>`;
        }
        const hiddenPriority = document.getElementById("hidden-priority");
        if (hiddenPriority) hiddenPriority.value = "medium";
    }

    // Clear initial state tracking
    initialTaskFormState = null;

    // Clear navigation context
    currentTaskNavigationContext = null;

    // Restore URL to the view the user came from (preserving filters)
    if (taskModalReturnHash) {
        window.history.replaceState(null, '', taskModalReturnHash);
        taskModalReturnHash = null;
    }

    closeModal("task-modal");
}

document
    .getElementById("project-form")
    .addEventListener("submit", function (e) {
        e.preventDefault();
        const submitTimer = debugTimeStart("projects", "submit", {
            projectCount: projects.length,
            tagCount: (window.tempProjectTags || []).length
        });
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

        // Apply template tasks if a template was selected
        const templateSelect = document.getElementById('project-template-select');
        const selectedTemplateId = templateSelect ? templateSelect.value : '';
        if (selectedTemplateId) {
            const tpl = templates.find(t => t.id === selectedTemplateId);
            if (tpl) {
                // Build task name transform from naming section
                const namingMode = document.getElementById('project-task-naming-mode')?.value || 'none';
                let taskNameTransform = (name) => name;
                if (namingMode === 'prefix') {
                    const prefix = document.getElementById('project-task-prefix-input')?.value || '';
                    if (prefix) taskNameTransform = (name) => `${prefix}${name}`;
                } else if (namingMode === 'suffix') {
                    const suffix = document.getElementById('project-task-suffix-input')?.value || '';
                    if (suffix) taskNameTransform = (name) => `${name}${suffix}`;
                }

                // Apply template tasks
                if (tpl.tasks && tpl.tasks.length > 0) {
                    tpl.tasks.forEach(tplTask => {
                        const taskResult = createTaskService({
                            title: taskNameTransform(tplTask.title),
                            description: tplTask.description,
                            priority: tplTask.priority,
                            status: 'backlog',
                            tags: Array.isArray(tplTask.tags) ? [...tplTask.tags] : [],
                            projectId: project.id,
                            startDate: '',
                            endDate: ''
                        }, tasks, taskCounter);
                        tasks = taskResult.tasks;
                        taskCounter = taskResult.taskCounter;
                    });
                }
                // Apply template project tags (merge with any user-entered tags)
                if (Array.isArray(tpl.tags) && tpl.tags.length > 0) {
                    const existingTags = Array.isArray(project.tags) ? project.tags : [];
                    project.tags = [...new Set([...existingTags, ...tpl.tags])];
                }
            }
            // Reset dropdown
            if (templateSelect) templateSelect.value = '';
        }

        // Record history for project creation
        if (window.historyService) {
            window.historyService.recordProjectCreated(project);
        }

        // Close modal and update UI immediately (optimistic update)
        closeModal("project-modal");
        e.target.reset();

        // Clear temp tags
        window.tempProjectTags = [];

        // Reset template dropdown label
        setSelectedTemplate('', t('projects.modal.templateNone'));

        // Clear sorted view cache to force refresh with new project
        appState.projectsSortedView = null;

        // Navigate to projects page and show the new project immediately
        window.location.hash = 'projects';
        showPage('projects');
        render(); // Refresh the projects list immediately

        // Save in background (don't block UI)
        saveProjects().catch(err => {
            console.error('Failed to save project:', err);
            showErrorNotification(t('error.saveProjectFailed'));
        });
        if (selectedTemplateId) {
            saveTasks().catch(err => console.error('Failed to save template tasks:', err));
        }
        debugTimeEnd("projects", submitTimer, {
            projectCount: projects.length
        });
    });

// Full-screen overlay shown after credential changes, then signs out
function showCredentialChangeOverlay(message) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:var(--bg-primary);opacity:0;transition:opacity 0.3s;';
    overlay.innerHTML = `
        <div style="text-align:center;max-width:360px;padding:32px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 style="margin:0 0 8px;color:var(--text-primary);font-size:20px;font-weight:600;">${message}</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:14px;">Signing out&hellip;</p>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    setTimeout(() => {
        if (window.authSystem?.logout) window.authSystem.logout();
        else location.reload();
    }, 1500);
}

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
        closeSettings();
        showCredentialChangeOverlay(t('success.resetPin'));
        
    } catch (error) {
        console.error('PIN reset error:', error);
        showErrorNotification(t('error.resetPinError'));
    }
}

// Change password flow (for users already on password auth)
function changePasswordFlow() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'change-password-modal-temp';
    modal.innerHTML = `
        <div class="modal-content reset-pin-modal-content">
            <div class="reset-pin-modal-inner">
                <div class="reset-pin-header">
                    <div>
                        <h2 class="reset-pin-title">${t('settings.changePassword.title')}</h2>
                    </div>
                </div>
                <form id="change-password-form" class="reset-pin-form">
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">${t('settings.changePassword.currentLabel')}</label>
                        <input type="password" id="change-pw-current" class="reset-pin-input" autocomplete="current-password" required />
                        <div id="change-pw-error" class="reset-pin-error" style="display: none;"></div>
                    </div>
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">${t('settings.changePassword.newLabel')}</label>
                        <input type="password" id="change-pw-new" class="reset-pin-input" autocomplete="new-password" placeholder="${t('auth.setup.newPasswordPlaceholder')}" required />
                    </div>
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">${t('settings.changePassword.confirmLabel')}</label>
                        <input type="password" id="change-pw-confirm" class="reset-pin-input" autocomplete="new-password" required />
                        <div id="change-pw-new-error" class="reset-pin-error" style="display: none;"></div>
                    </div>
                    <div class="reset-pin-actions">
                        <button type="button" class="reset-pin-btn reset-pin-btn-cancel" onclick="document.getElementById('change-password-modal-temp').remove()">${t('common.cancel')}</button>
                        <button type="submit" class="reset-pin-btn reset-pin-btn-primary">${t('settings.changePasswordButton')}</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.applyPasswordToggles) window.applyPasswordToggles(modal);

    document.getElementById('change-password-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const currentPw = document.getElementById('change-pw-current').value;
        const newPw = document.getElementById('change-pw-new').value;
        const confirmPw = document.getElementById('change-pw-confirm').value;
        const errorEl = document.getElementById('change-pw-error');
        const newErrorEl = document.getElementById('change-pw-new-error');
        errorEl.style.display = 'none';
        newErrorEl.style.display = 'none';

        if (!currentPw) {
            errorEl.textContent = t('settings.switchAuth.verifyCurrentPassword');
            errorEl.style.display = 'block';
            return;
        }
        // Client-side password validation
        const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!pwRegex.test(newPw)) {
            newErrorEl.textContent = t('auth.setup.passwordRequirements');
            newErrorEl.style.display = 'block';
            return;
        }
        if (newPw !== confirmPw) {
            newErrorEl.textContent = 'Passwords do not match';
            newErrorEl.style.display = 'block';
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/auth/change-credential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw, newAuthMethod: 'password' })
            });
            const data = await response.json();
            if (!response.ok) {
                errorEl.textContent = data.error || 'Failed to change password';
                errorEl.style.display = 'block';
                return;
            }
            document.getElementById('change-password-modal-temp').remove();
            closeModal('settings-modal');
            showCredentialChangeOverlay(t('settings.changePassword.success'));
        } catch (err) {
            console.error('Change password error:', err);
            errorEl.textContent = 'An error occurred';
            errorEl.style.display = 'block';
        }
    });
    document.getElementById('change-pw-current').focus();
}

// Switch authentication method flow (PIN→Password or Password→PIN)
function switchAuthMethodFlow() {
    const cu = window.authSystem?.getCurrentUser?.();
    const currentMethod = cu?.authMethod || 'pin';
    const targetMethod = currentMethod === 'pin' ? 'password' : 'pin';

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'switch-auth-modal-temp';

    const verifyLabel = currentMethod === 'pin'
        ? t('settings.switchAuth.verifyCurrentPin')
        : t('settings.switchAuth.verifyCurrentPassword');

    // Build new credential fields based on target
    let newCredentialFields = '';
    if (targetMethod === 'password') {
        newCredentialFields = `
            <div class="reset-pin-field">
                <label class="reset-pin-label">${t('settings.switchAuth.enterNewPassword')}</label>
                <input type="password" id="switch-new-credential" class="reset-pin-input" autocomplete="new-password" placeholder="${t('auth.setup.newPasswordPlaceholder')}" required />
            </div>
            <div class="reset-pin-field">
                <label class="reset-pin-label">${t('settings.switchAuth.confirmNewPassword')}</label>
                <input type="password" id="switch-confirm-credential" class="reset-pin-input" autocomplete="new-password" required />
                <div id="switch-new-error" class="reset-pin-error" style="display: none;"></div>
            </div>`;
    } else {
        newCredentialFields = `
            <div class="reset-pin-field">
                <label class="reset-pin-label">${t('settings.switchAuth.enterNewPin')}</label>
                <input type="password" id="switch-new-credential" class="reset-pin-input" maxlength="4" inputmode="numeric" autocomplete="off" placeholder="••••" required />
            </div>
            <div class="reset-pin-field">
                <label class="reset-pin-label">${t('settings.switchAuth.confirmNewPin')}</label>
                <input type="password" id="switch-confirm-credential" class="reset-pin-input" maxlength="4" inputmode="numeric" autocomplete="off" placeholder="••••" required />
                <div id="switch-new-error" class="reset-pin-error" style="display: none;"></div>
            </div>`;
    }

    modal.innerHTML = `
        <div class="modal-content reset-pin-modal-content">
            <div class="reset-pin-modal-inner">
                <div class="reset-pin-header">
                    <div>
                        <h2 class="reset-pin-title">${t('settings.switchAuth.title')}</h2>
                    </div>
                </div>
                <form id="switch-auth-form" class="reset-pin-form">
                    <div class="reset-pin-field">
                        <label class="reset-pin-label">${verifyLabel}</label>
                        <input type="${currentMethod === 'pin' ? 'password' : 'password'}" id="switch-current-credential" class="reset-pin-input"
                            ${currentMethod === 'pin' ? 'maxlength="4" inputmode="numeric" autocomplete="off" placeholder="••••"' : 'autocomplete="current-password"'} required />
                        <div id="switch-current-error" class="reset-pin-error" style="display: none;"></div>
                    </div>
                    ${newCredentialFields}
                    <div class="reset-pin-actions">
                        <button type="button" class="reset-pin-btn reset-pin-btn-cancel" onclick="document.getElementById('switch-auth-modal-temp').remove()">${t('common.cancel')}</button>
                        <button type="submit" class="reset-pin-btn reset-pin-btn-primary">${t('common.continue')}</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.applyPasswordToggles) window.applyPasswordToggles(modal);

    document.getElementById('switch-auth-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const currentCred = document.getElementById('switch-current-credential').value.trim();
        const newCred = document.getElementById('switch-new-credential').value.trim();
        const confirmCred = document.getElementById('switch-confirm-credential').value.trim();
        const currentErrorEl = document.getElementById('switch-current-error');
        const newErrorEl = document.getElementById('switch-new-error');
        currentErrorEl.style.display = 'none';
        newErrorEl.style.display = 'none';

        // Validate current credential
        if (!currentCred) {
            currentErrorEl.textContent = verifyLabel;
            currentErrorEl.style.display = 'block';
            return;
        }
        if (currentMethod === 'pin' && !/^\d{4}$/.test(currentCred)) {
            currentErrorEl.textContent = 'PIN must be 4 digits';
            currentErrorEl.style.display = 'block';
            return;
        }

        // Validate new credential
        if (targetMethod === 'password') {
            const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!pwRegex.test(newCred)) {
                newErrorEl.textContent = t('auth.setup.passwordRequirements');
                newErrorEl.style.display = 'block';
                return;
            }
        } else {
            if (!/^\d{4}$/.test(newCred)) {
                newErrorEl.textContent = 'PIN must be 4 digits';
                newErrorEl.style.display = 'block';
                return;
            }
        }
        if (newCred !== confirmCred) {
            newErrorEl.textContent = targetMethod === 'password' ? 'Passwords do not match' : 'PINs do not match';
            newErrorEl.style.display = 'block';
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const body = { newAuthMethod: targetMethod };
            if (currentMethod === 'pin') body.currentPin = currentCred;
            else body.currentPassword = currentCred;
            if (targetMethod === 'password') body.newPassword = newCred;
            else body.newPin = newCred;

            const response = await fetch('/api/auth/change-credential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) {
                currentErrorEl.textContent = data.error || 'Failed to switch authentication method';
                currentErrorEl.style.display = 'block';
                return;
            }
            document.getElementById('switch-auth-modal-temp').remove();
            closeModal('settings-modal');
            showCredentialChangeOverlay(targetMethod === 'password'
                ? t('settings.switchAuth.successPassword')
                : t('settings.switchAuth.successPin'));
        } catch (err) {
            console.error('Switch auth method error:', err);
            currentErrorEl.textContent = 'An error occurred';
            currentErrorEl.style.display = 'block';
        }
    });
    document.getElementById('switch-current-credential').focus();
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
        const debugLogsToggle = document.getElementById('debug-logs-toggle');
        const historySortOrderSelect = document.getElementById('history-sort-order');
        const languageSelect = document.getElementById('language-select');

        settings.autoSetStartDateOnStatusChange = !!autoStartToggle?.checked;
        settings.autoSetEndDateOnStatusChange = !!autoEndToggle?.checked;
        settings.debugLogsEnabled = !!debugLogsToggle?.checked;
        applyDebugLogSetting(settings.debugLogsEnabled);

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

    // Description editor blur persistence is handled by TipTap hooks.

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
    const submitTimer = debugTimeStart("tasks", "submit", {
        editing: !!editingTaskId,
        taskCount: tasks.length
    });
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
                appState.projectsSortedView = null;
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
            appState.projectsSortedView = null;
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
    debugTimeEnd("tasks", submitTimer, {
        taskCount: tasks.length,
        projectCount: projects.length
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

    // Handle link type dropdown clicks (EXACT same pattern as status dropdown)
    if (e.target.closest("#link-type-current")) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = e.target.closest(".link-type-dropdown");
        const isActive = dropdown.classList.contains("active");

        // Close all dropdowns first
        document.querySelectorAll(".status-dropdown.active, .priority-dropdown.active, .link-type-dropdown.active")
            .forEach((d) => d.classList.remove("active"));

        // Toggle this one if it wasn't active
        if (!isActive) {
            dropdown.classList.add("active");
        }
        return;
    }

    // Handle link type option clicks
    if (e.target.closest(".link-type-option")) {
        e.preventDefault();
        e.stopPropagation();
        const option = e.target.closest(".link-type-option");
        const linkType = option.dataset.linkType;
        const linkTypeText = option.querySelector("span").textContent.trim();

        // Update display
        const currentBtn = document.getElementById("link-type-current");
        const linkTypeValue = document.getElementById("link-type-value");
        const linkTypeLabel = document.getElementById("link-type-label");
        const webLinkInputs = document.getElementById("web-link-inputs");
        const taskLinkSearch = document.getElementById("task-link-search");
        const taskSearchResults = document.getElementById("task-search-results");

        if (currentBtn && linkTypeValue && linkTypeLabel) {
            linkTypeLabel.textContent = linkTypeText;
            linkTypeValue.value = linkType;

            // Switch inputs based on selection
            if (linkType === 'web_link') {
                webLinkInputs.style.display = 'flex';
                taskLinkSearch.style.display = 'none';
                taskSearchResults.style.display = 'none';
                taskLinkSearch.value = '';
            } else {
                webLinkInputs.style.display = 'none';
                taskLinkSearch.style.display = 'block';
                taskLinkSearch.focus();
            }
        }

        // Close dropdown
        const dropdown = e.target.closest(".link-type-dropdown");
        if (dropdown) dropdown.classList.remove("active");
        return;
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
            const priorityLabel = priorityText.toUpperCase();
            currentBtn.innerHTML = `<span class="priority-pill priority-${priority}">${priorityLabel}</span> <span class="dropdown-arrow">▼</span>`;
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
            <span class="priority-pill priority-${priority.value}">${priority.label.toUpperCase()}</span>
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
    runTaskDescriptionCommand(command);
    focusTaskDescriptionEditor();
}

function insertTaskHeading(level) {
    insertTaskDescriptionHeading(level);
    focusTaskDescriptionEditor();
}

function insertTaskDivider() {
    insertTaskDescriptionDivider();
    focusTaskDescriptionEditor();
}

function insertTaskChecklist() {
    insertTaskDescriptionChecklist();
    focusTaskDescriptionEditor();
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

// Initialize task description editor and shared modal input handlers.
document.addEventListener("DOMContentLoaded", function () {
    const taskForm = document.getElementById("task-form");
    const taskHiddenField = document.getElementById("task-description-hidden");
    let originalDescriptionHTML = "";

    initializeTaskDescriptionEditor({
        placeholder: "",
        onFocus: (html) => {
            originalDescriptionHTML = html;
        },
        onUpdate: (html) => {
            if (taskHiddenField) taskHiddenField.value = html;
        },
        onBlur: (html) => {
            if (taskHiddenField) taskHiddenField.value = html;
            if (taskForm && taskForm.dataset.editingTaskId && html !== originalDescriptionHTML) {
                updateTaskField("description", html);
            }
        }
    });

    const taskEditor = document.getElementById("task-description-editor");
    if (taskEditor) {
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

        // Keep link clicks inside the editor opening in a separate tab.
        taskEditor.addEventListener("click", function (e) {
            const link = e.target.closest("a");
            if (!link) return;
            const href = link.getAttribute("href");
            if (!href) return;
            const sel = window.getSelection();
            if (sel && sel.toString()) return;
            e.preventDefault();
            e.stopPropagation();
            window.open(href, "_blank", "noopener,noreferrer");
        });
    }

    // Task search with live results for link type dropdown
    const taskLinkSearch = document.getElementById('task-link-search');
    const taskSearchResults = document.getElementById('task-search-results');
    
    if (taskLinkSearch && taskSearchResults) {
        taskLinkSearch.addEventListener('input', function(e) {
            const searchTerm = e.target.value.trim().toLowerCase();
            const currentTaskId = parseInt(document.getElementById('task-form')?.dataset.editingTaskId);
            const currentTask = tasks.find(t => t.id === currentTaskId);
            const linkTypeValue = document.getElementById('link-type-value');
            const currentLinkType = linkTypeValue ? linkTypeValue.value : 'relates_to';
            
            if (searchTerm.length < 2) {
                taskSearchResults.style.display = 'none';
                taskSearchResults.innerHTML = '';
                return;
            }
            
            // Get already linked task IDs for the current link type
            const alreadyLinkedIds = new Set();
            if (currentTask && currentTask.links && Array.isArray(currentTask.links)) {
                currentTask.links.forEach(link => {
                    if (link.type === currentLinkType) {
                        alreadyLinkedIds.add(link.taskId);
                    }
                });
            }
            
            const matchingTasks = tasks.filter(task => {
                if (task.id === currentTaskId) return false;
                if (alreadyLinkedIds.has(task.id)) return false; // Filter out already linked tasks
                return task.title.toLowerCase().includes(searchTerm);
            }).slice(0, 10);
            
            if (matchingTasks.length === 0) {
                taskSearchResults.style.display = 'none';
                return;
            }
            
            taskSearchResults.style.display = 'block';
            taskSearchResults.innerHTML = matchingTasks.map(task => `
                <div class="task-search-result" data-task-id="${task.id}" style="padding: 10px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.15s;">
                    <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">Task #${task.id}: ${escapeHtml(task.title)}</div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                        <span class="status-badge ${task.status}">${escapeHtml(task.status)}</span>
                    </div>
                </div>
            `).join('');
            
            // Add click handlers
            taskSearchResults.querySelectorAll('.task-search-result').forEach(item => {
                item.addEventListener('mouseenter', function() {
                    this.style.background = 'var(--bg-tertiary)';
                });
                item.addEventListener('mouseleave', function() {
                    this.style.background = '';
                });
                item.addEventListener('click', async function() {
                    const targetId = parseInt(this.dataset.taskId);
                    const linkTypeValue = document.getElementById('link-type-value');
                    const linkType = linkTypeValue ? linkTypeValue.value : 'depends_on';
                    await addTaskRelationship(currentTaskId, targetId, linkType);
                    taskLinkSearch.value = '';
                    taskSearchResults.style.display = 'none';
                });
            });
        });
        
        taskLinkSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Select first result if available
                const firstResult = taskSearchResults.querySelector('.task-search-result');
                if (firstResult) firstResult.click();
            }
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
            return getIsMobileCached();
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

// capitalizeFirst, getCalendarDayNames, formatCalendarMonthYear imported from src/utils/string.js and src/utils/date.js

function renderCalendar() {
    const renderTimer = debugTimeStart("render", "calendar", {
        taskCount: tasks.length,
        month: currentMonth + 1,
        year: currentYear
    });
    const locale = getLocale();
    const dayNames = getCalendarDayNames(locale);
    const today = new Date();

    // Update month/year display
    document.getElementById("calendar-month-year").textContent =
        formatCalendarMonthYear(locale, currentYear, currentMonth);

    // Get filtered project IDs
    const filteredProjectIds = filterState.projects.size > 0
        ? new Set(Array.from(filterState.projects).map(id => parseInt(id, 10)))
        : null;

    // Use module to prepare calendar data
    const calendarData = prepareCalendarData(currentYear, currentMonth, {
        tasks: tasks,
        projects: projects,
        filteredProjectIds: filteredProjectIds,
        searchText: filterState.search || '',
        includeBacklog: !!settings.calendarIncludeBacklog,
        today: today
    });

    const isCurrentMonthNow = calendarData.isCurrentMonth;

    // UX: only show "Today" button when user has left the current month (mobile + desktop)
    try {
        const isMobile = typeof window.matchMedia === 'function'
            ? window.matchMedia('(max-width: 768px)').matches
            : getIsMobileCached();

        // Mobile: header button
        if (isMobile) {
            document.querySelectorAll('.calendar-today-btn--header').forEach((btn) => {
                btn.style.display = isCurrentMonthNow ? 'none' : 'inline-flex';
            });
        }

        // Desktop: nav button
        if (!isMobile) {
            document.querySelectorAll('.calendar-today-btn--nav').forEach((btn) => {
                btn.style.display = isCurrentMonthNow ? 'none' : 'inline-flex';
            });
        }
    } catch (e) {}

    // Use module function for HTML generation
    const calendarHTML = generateCalendarGridHTML(calendarData, dayNames);

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
    const renderTimer = debugTimeStart("render", "projectBars", {
        taskCount: tasks.length,
        projectCount: projects.length
    });
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

    const searchText = (filterState.search || '').toLowerCase();

    // Only render filtered projects (also apply search text filter)
    const filteredProjects = projects.filter(p =>
        filteredProjectIds.includes(p.id) &&
        (!searchText || (p.name || '').toLowerCase().includes(searchText))
    );

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
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filteredTasks
        .slice()
        .sort((a, b) => {
            const ap = priorityOrder[a.priority] ?? 3;
            const bp = priorityOrder[b.priority] ?? 3;
            if (ap !== bp) return ap - bp;
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
                const isFirstSegment = segStart === startIndex;
                const isLastSegment = segEnd === endIndex;
                taskSegmentsByRow.get(row).push({ startIndex: segStart, endIndex: segEnd, task, isFirstSegment, isLastSegment });
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
            if (getProjectStatus(seg.project.id) === 'completed') {
                bar.classList.add('completed');
            }
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

            // Extend bar to cell edge on continuation side
            if (continuesLeft) {
                width += left - (startRect.left - gridRect.left);
                left = startRect.left - gridRect.left;
            }
            if (continuesRight) {
                width = (endRect.right - gridRect.left) - left;
            }
            bar.style.left = left + "px";
            bar.style.width = width + "px";

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

            // Add detached chevron arrows for month continuation
            const chevronSize = projectHeight;
            const chevronGap = 3;
            if (continuesLeft) {
                const chev = document.createElement('div');
                chev.className = 'continues-chevron continues-chevron-left';
                chev.style.position = 'absolute';
                chev.style.top = bar.style.top;
                chev.style.height = chevronSize + 'px';
                chev.style.width = (chevronSize * 0.6) + 'px';
                chev.style.left = (left - chevronSize * 0.6 - chevronGap) + 'px';
                chev.style.background = projectColor;
                chev.style.clipPath = 'polygon(100% 0%, 40% 50%, 100% 100%, 60% 100%, 0% 50%, 60% 0%)';
                chev.style.pointerEvents = 'none';
                chev.style.zIndex = '9';
                overlay.appendChild(chev);
            }
            if (continuesRight) {
                const chev = document.createElement('div');
                chev.className = 'continues-chevron continues-chevron-right';
                chev.style.position = 'absolute';
                chev.style.top = bar.style.top;
                chev.style.height = chevronSize + 'px';
                chev.style.width = (chevronSize * 0.6) + 'px';
                chev.style.left = (left + width + chevronGap) + 'px';
                chev.style.background = projectColor;
                chev.style.clipPath = 'polygon(0% 0%, 40% 0%, 100% 50%, 40% 100%, 0% 100%, 60% 50%)';
                chev.style.pointerEvents = 'none';
                chev.style.zIndex = '9';
                overlay.appendChild(chev);
            }
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
            if (seg.task.status === 'done') {
                bar.classList.add('done');
            }
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

            // Apply left/right borders based on date configuration
            // Only show colored borders on the actual first/last segment
            // so multi-row tasks don't repeat the pattern on every row
            if (hasValidStartDate && seg.isFirstSegment) {
                bar.style.borderLeftWidth = "5px";
                bar.style.borderLeftColor = borderColor;
            } else {
                bar.style.borderLeftWidth = "1px";
                bar.style.borderLeftColor = "#4a5060";
            }

            if (hasValidEndDate && seg.isLastSegment) {
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

            // Extend bar to cell edge on continuation side
            if (continuesLeft) {
                width += left - (startRect.left - gridRect.left);
                left = startRect.left - gridRect.left;
                bar.style.left = left + "px";
                bar.style.width = width + "px";
            }
            if (continuesRight) {
                width = (endRect.right - gridRect.left) - left;
                bar.style.left = left + "px";
                bar.style.width = width + "px";
            }

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

            // Add detached chevron arrows for month continuation
            const chevronSize = taskHeight;
            const chevronGap = 3;
            if (continuesLeft) {
                const chev = document.createElement('div');
                chev.className = 'continues-chevron continues-chevron-left';
                chev.style.position = 'absolute';
                chev.style.top = bar.style.top;
                chev.style.height = chevronSize + 'px';
                chev.style.width = (chevronSize * 0.6) + 'px';
                chev.style.left = (left - chevronSize * 0.6 - chevronGap) + 'px';
                chev.style.background = borderColor;
                chev.style.opacity = '0.45';
                chev.style.clipPath = 'polygon(100% 0%, 100% 100%, 0% 50%)';
                chev.style.pointerEvents = 'none';
                chev.style.zIndex = '10';
                overlay.appendChild(chev);
            }
            if (continuesRight) {
                const chev = document.createElement('div');
                chev.className = 'continues-chevron continues-chevron-right';
                chev.style.position = 'absolute';
                chev.style.top = bar.style.top;
                chev.style.height = chevronSize + 'px';
                chev.style.width = (chevronSize * 0.6) + 'px';
                chev.style.left = (left + width + chevronGap) + 'px';
                chev.style.background = borderColor;
                chev.style.opacity = '0.45';
                chev.style.clipPath = 'polygon(0% 0%, 0% 100%, 100% 50%)';
                chev.style.pointerEvents = 'none';
                chev.style.zIndex = '10';
                overlay.appendChild(chev);
            }
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
    debugTimeEnd("render", renderTimer, {
        taskCount: tasks.length,
        projectCount: projects.length
    });
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
    // Use calendar module for month navigation calculation
    const nav = calculateMonthNavigation(currentYear, currentMonth, delta);
    currentYear = nav.year;
    currentMonth = nav.month;
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
        return "backlog";
    }

    const allDone = projectTasks.every(t => t.status === "done");
    const hasInProgress = projectTasks.some(t => t.status === "progress" || t.status === "review");
    const hasTodo = projectTasks.some(t => t.status === "todo");
    const allBacklog = projectTasks.every(t => t.status === "backlog");

    if (allDone) {
        return "completed";
    } else if (hasInProgress) {
        return "active";
    }

    if (hasTodo) {
        return "planning";
    }

    if (allBacklog) {
        return "backlog";
    }

    // Mixed backlog/done without in-progress/review still counts as planning
    return "planning";
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

    // Store the date for use by "Add Task" button
    window.dayItemsModalDate = dateStr;

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

function addTaskFromDayItemsModal() {
    const dateStr = window.dayItemsModalDate;
    closeDayItemsModal();
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
    window.dayItemsModalDate = null;
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

// Account deletion functions
function openDeleteAccountModal() {
    const modal = document.getElementById('delete-account-modal');
    modal.classList.add('active');
    
    // Find elements that need HTML rendering BEFORE applyTranslations runs
    const warningEl = modal.querySelector('[data-i18n="settings.deleteAccount.warning"]');
    const confirmTextEl = modal.querySelector('[data-i18n="settings.deleteAccount.confirmText"]');
    
    // Temporarily remove data-i18n so applyTranslations skips them
    if (warningEl) warningEl.removeAttribute('data-i18n');
    if (confirmTextEl) confirmTextEl.removeAttribute('data-i18n');
    
    // Apply translations for elements that don't need HTML rendering
    applyTranslations(modal);
    
    // Now set HTML content for elements that need HTML rendering
    if (warningEl) {
        warningEl.innerHTML = t('settings.deleteAccount.warning');
    }
    
    if (confirmTextEl) {
        confirmTextEl.innerHTML = t('settings.deleteAccount.confirmText');
    }
    
    const confirmInput = document.getElementById('delete-account-confirm-input');
    confirmInput.value = '';
    confirmInput.focus();
    
    // Auto-convert to lowercase as user types for better UX
    const lowercaseHandler = function(e) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toLowerCase();
        e.target.setSelectionRange(start, end);
    };
    confirmInput.addEventListener('input', lowercaseHandler);
    
    // Clear error message
    document.getElementById('delete-account-confirm-error').classList.remove('show');
    
    // Handle Enter key
    confirmInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmDeleteAccount();
        }
    }, { once: true });
}

function closeDeleteAccountModal() {
    const modal = document.getElementById('delete-account-modal');
    modal.classList.remove('active');
    const confirmInput = document.getElementById('delete-account-confirm-input');
    confirmInput.value = '';
    document.getElementById('delete-account-confirm-error').classList.remove('show');
    
    // Remove lowercase handler to prevent duplicate listeners
    // (Handler will be re-added when modal opens again)
    const newInput = confirmInput.cloneNode(true);
    confirmInput.parentNode.replaceChild(newInput, confirmInput);
}

async function confirmDeleteAccount() {
    const input = document.getElementById('delete-account-confirm-input');
    const errorMsg = document.getElementById('delete-account-confirm-error');
    const confirmText = input.value.trim().toLowerCase();
    
    if (confirmText !== 'delete') {
        errorMsg.classList.add('show');
        input.focus();
        return;
    }
    
    // Get auth token
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        showErrorNotification(t('error.unauthorized'));
        closeDeleteAccountModal();
        return;
    }
    
    try {
        // Call API to delete account
        const response = await fetch('/api/auth/delete-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showErrorNotification(data.error || t('error.deleteAccountFailed'));
            return;
        }
        
        // Account deleted successfully
        // Clear all local data
        localStorage.clear();
        sessionStorage.clear();
        
        // Close modal
        closeDeleteAccountModal();
        
        // Show success message briefly, then redirect to login
        showSuccessNotification(t('settings.deleteAccount.success'));
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '/auth.html';
        }, 1500);
        
    } catch (error) {
        console.error('Delete account error:', error);
        showErrorNotification(t('error.deleteAccountFailed'));
    }
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
  appState.projectsSortedView = null;

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
    const detailsTimer = debugTimeStart("projects", "details", {
        projectId
    });
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
    if (!project) {
        debugTimeEnd("projects", detailsTimer, { projectId, found: false });
        return;
    }

    // Scroll to top on mobile when showing project details
    if (getIsMobileCached()) {
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
    const projectStatus = getProjectStatus(projectId);

	    // Calculate duration — only when both dates are set
	    const startDate = project.startDate ? new Date(project.startDate) : null;
	    const endDate = project.endDate ? new Date(project.endDate) : null;
	    const durationDays =
	        startDate && endDate && Number.isFinite(startDate.getTime()) && Number.isFinite(endDate.getTime())
	            ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
	            : null;
    const durationText = Number.isFinite(durationDays)
        ? t('projects.details.durationDays', { count: durationDays })
        : "-";

    // Pre-compute manual order flag so it can be used in both the header button and sort logic
    const hasManualOrder = projectTasks.some(t => typeof t.projectOrder === 'number');

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
                                <button type="button" class="duplicate-btn" data-action="handleDuplicateProject" data-param="${projectId}">📋 ${t('projects.duplicate.title')}</button>
                                <button type="button" class="template-btn" data-action="openSaveAsTemplateModal" data-param="${projectId}">🗂️ ${t('projects.template.saveAsTemplate')}</button>
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
	                            <div class="timeline-value" id="project-duration-value">${durationText}</div>
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
                        <div style="display: flex; gap: 8px; align-items: center;">
                            ${hasManualOrder ? `<button class="add-btn auto-sort-btn" data-action="resetProjectTaskOrder" data-param="${projectId}" title="${t('projects.details.resetSortTitle')}">↕ ${t('projects.details.resetSort')}</button>` : ''}
                            ${projectTasks.length > 0 ? `<button class="add-btn" data-action="navigateToProjectTasksList" data-param="${projectId}" title="${t('projects.details.viewInList')}" style="background: var(--bg-tertiary); color: var(--text-secondary);">${t('projects.details.viewInListBtn')}</button>` : ''}
                            <button class="add-btn" data-action="openTaskModalForProject" data-param="${projectId}">${t('tasks.addButton')}</button>
                        </div>
                    </div>
                    <div id="project-tasks-list">
                        ${
                            projectTasks.length === 0
                                ? `<div class="empty-state">${t('tasks.empty.epic')}</div>`
                                : (() => {
                                            return [...projectTasks].sort((a, b) => {
                                                if (hasManualOrder) {
                                                    const ao = typeof a.projectOrder === 'number' ? a.projectOrder : 9999;
                                                    const bo = typeof b.projectOrder === 'number' ? b.projectOrder : 9999;
                                                    if (ao !== bo) return ao - bo;
                                                }
                                                return (PRIORITY_ORDER[b.priority] || 1) - (PRIORITY_ORDER[a.priority] || 1);
                                            }).map((task) => `
                                        <div class="project-task-item" draggable="true" data-task-id="${task.id}" data-action="openTaskDetails" data-param="${task.id}">
                                            <div class="drag-handle" title="Drag to reorder">⠿</div>
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
                                                <div class="task-priority priority-${task.priority}">${getPriorityLabel(task.priority).toUpperCase()}</div>
                                            </div>
                                            <div class="project-task-status-col">
                                                <div class="status-badge ${task.status}">
                                                    ${getStatusLabel(task.status)}
                                                </div>
                                            </div>
                                        </div>
                            `
                                            ).join("");
                                        })()
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
    setupProjectTasksDragDrop(projectId);

    debugTimeEnd("projects", detailsTimer, {
        projectId,
        taskCount: projectTasks.length,
        completionPercentage
    });
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

function setupProjectTasksDragDrop(projectId) {
    const list = document.getElementById('project-tasks-list');
    if (!list) return;

    let draggingViaHandle = false;
    let dragSrc = null;

    const getItems = () => [...list.querySelectorAll('.project-task-item[data-task-id]')];

    // Keep dropping reliable even when pointer is between cards.
    list.addEventListener('dragover', (e) => { e.preventDefault(); });

    getItems().forEach(item => {
        const handle = item.querySelector('.drag-handle');

        // Only start drag when initiated from the handle
        if (handle) {
            handle.addEventListener('mousedown', () => { draggingViaHandle = true; });
            handle.addEventListener('touchstart', () => { draggingViaHandle = true; }, { passive: true });
            // Prevent handle tap from opening the task
            handle.addEventListener('click', (e) => e.stopPropagation());
        }

        item.addEventListener('dragstart', (e) => {
            if (!draggingViaHandle) { e.preventDefault(); return; }
            dragSrc = item;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.taskId);
            // Defer class add so the ghost image renders normally
            setTimeout(() => item.classList.add('dragging'), 0);
        });

        item.addEventListener('dragend', () => {
            draggingViaHandle = false;
            dragSrc?.classList.remove('dragging');
            getItems().forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
            dragSrc = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!dragSrc || item === dragSrc) return;
            const mid = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
            getItems().forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
            item.classList.add(e.clientY < mid ? 'drag-over-top' : 'drag-over-bottom');
        });

        item.addEventListener('dragleave', (e) => {
            // Only clear if leaving the item entirely (not entering a child)
            if (!item.contains(e.relatedTarget)) {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!dragSrc || item === dragSrc) return;
            const before = item.classList.contains('drag-over-top');
            item.classList.remove('drag-over-top', 'drag-over-bottom');
            if (before) {
                list.insertBefore(dragSrc, item);
            } else {
                list.insertBefore(dragSrc, item.nextSibling);
            }
            // Persist new order to task objects and save, then re-render
            // so the ↕ Auto-sort button appears/disappears correctly
            getItems().forEach((el, idx) => {
                const task = tasks.find(t => t.id === parseInt(el.dataset.taskId, 10));
                if (task) task.projectOrder = idx;
            });
            saveTasks();
            syncProjectDetailsAutoSortBtn(projectId);
        });
    });
}

function resetProjectTaskOrder(projectId) {
    tasks.forEach(task => {
        if (task.projectId === projectId) {
            delete task.projectOrder;
        }
    });
    saveTasks();
    showProjectDetails(projectId);
}

function syncProjectDetailsAutoSortBtn(projectId) {
    const section = document.querySelector('.project-tasks-section');
    if (!section) return;

    const actions = section.querySelector('.section-header > div:last-child');
    if (!actions) return;

    const existing = actions.querySelector('[data-action="resetProjectTaskOrder"]');
    const hasManualOrder = tasks.some(task => task.projectId === projectId && typeof task.projectOrder === 'number');

    if (hasManualOrder && !existing) {
        const btn = document.createElement('button');
        btn.className = 'add-btn auto-sort-btn';
        btn.dataset.action = 'resetProjectTaskOrder';
        btn.dataset.param = String(projectId);
        btn.title = t('projects.details.resetSortTitle') || '';
        btn.textContent = `↕ ${t('projects.details.resetSort') || 'Auto-sort'}`;

        const beforeBtn =
            actions.querySelector('[data-action="navigateToProjectTasksList"]') ||
            actions.querySelector('[data-action="openTaskModalForProject"]');
        if (beforeBtn) {
            actions.insertBefore(btn, beforeBtn);
        } else {
            actions.appendChild(btn);
        }
    } else if (!hasManualOrder && existing) {
        existing.remove();
    }
}

function resetExpandedProjectTaskOrder(projectId) {
    tasks.forEach(task => {
        if (task.projectId === projectId) {
            delete task.projectOrder;
        }
    });
    saveTasks();
    renderProjects();
}

function setupExpandedProjectsDragDrop() {
    const projectItems = document.querySelectorAll('.project-list-item[id^="project-item-"]');
    projectItems.forEach(projectItem => {
        const projectId = parseInt(projectItem.id.replace('project-item-', ''), 10);
        const container = projectItem.querySelector('.expanded-tasks-container');
        if (!container) return;

        let draggingViaHandle = false;
        let dragSrc = null;

        const getItems = () => [...container.querySelectorAll('.expanded-task-item[data-task-id]')];

        // Fallback: ensure dragover on container always allows drop
        container.addEventListener('dragover', (e) => { e.preventDefault(); });

        getItems().forEach(item => {
            const handle = item.querySelector('.expanded-drag-handle');
            if (handle) {
                handle.addEventListener('mousedown', () => { draggingViaHandle = true; });
                handle.addEventListener('touchstart', () => { draggingViaHandle = true; }, { passive: true });
                handle.addEventListener('click', (e) => e.stopPropagation());
            }

            item.addEventListener('dragstart', (e) => {
                if (!draggingViaHandle) { e.preventDefault(); return; }
                dragSrc = item;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.taskId);
                setTimeout(() => item.classList.add('dragging'), 0);
            });

            item.addEventListener('dragend', () => {
                draggingViaHandle = false;
                dragSrc?.classList.remove('dragging');
                getItems().forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
                dragSrc = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!dragSrc || item === dragSrc) return;
                const mid = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
                getItems().forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
                item.classList.add(e.clientY < mid ? 'drag-over-top' : 'drag-over-bottom');
            });

            item.addEventListener('dragleave', (e) => {
                if (!item.contains(e.relatedTarget)) {
                    item.classList.remove('drag-over-top', 'drag-over-bottom');
                }
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!dragSrc || item === dragSrc) return;
                const before = item.classList.contains('drag-over-top');
                item.classList.remove('drag-over-top', 'drag-over-bottom');
                if (before) {
                    container.insertBefore(dragSrc, item);
                } else {
                    container.insertBefore(dragSrc, item.nextSibling);
                }
                getItems().forEach((el, idx) => {
                    const task = tasks.find(t => t.id === parseInt(el.dataset.taskId, 10));
                    if (task) task.projectOrder = idx;
                });
                saveTasks();
                // Surgically update the Auto-sort button — avoids re-rendering the DOM
                // mid-drag which breaks subsequent drag operations.
                syncExpandedAutoSortBtn(projectId, container);
            });
        });
    });
}

/**
 * Show or hide the Auto-sort button inside an expanded project header
 * without triggering a full renderProjects() re-render.
 */
function syncExpandedAutoSortBtn(projectId, container) {
    const header = container.querySelector('.expanded-tasks-header');
    if (!header) return;
    const btnGroup = header.querySelector('div:last-child');
    if (!btnGroup) return;
    const existing = btnGroup.querySelector('[data-action="resetExpandedProjectTaskOrder"]');
    const hasManualOrder = tasks.some(task => task.projectId === projectId && typeof task.projectOrder === 'number');
    if (hasManualOrder && !existing) {
        const btn = document.createElement('button');
        btn.className = 'add-btn expanded-add-task-btn auto-sort-btn';
        btn.type = 'button';
        btn.dataset.action = 'resetExpandedProjectTaskOrder';
        btn.dataset.param = String(projectId);
        btn.dataset.stopPropagation = 'true';
        btn.title = t('projects.details.resetSortTitle') || '';
        btn.textContent = `↕ ${t('projects.details.resetSort') || 'Auto-sort'}`;
        btnGroup.insertBefore(btn, btnGroup.firstChild);
    } else if (!hasManualOrder && existing) {
        existing.remove();
    }
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

// ─── Project Templates ───────────────────────────────────────────────────────

async function saveTemplatesStorage() {
    try {
        await saveTemplatesData(templates);
    } catch (error) {
        console.error("Error saving templates:", error);
        showErrorNotification(t('error.saveDataFailed'));
        throw error;
    }
}

let templateSourceProjectId = null;

function openSaveAsTemplateModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Close the project options menu before opening the modal
    const optionsMenu = document.getElementById('project-options-menu');
    if (optionsMenu) optionsMenu.style.display = 'none';

    templateSourceProjectId = projectId;
    const modal = document.getElementById('save-as-template-modal');
    if (!modal) return;

    // Pre-fill name from project
    const nameInput = modal.querySelector('#template-name-input');
    if (nameInput) nameInput.value = project.name;

    // Show task count
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const includeCheckbox = modal.querySelector('#template-include-tasks');
    const taskCountSpan = modal.querySelector('#template-task-count');
    if (taskCountSpan) taskCountSpan.textContent = projectTasks.length;
    if (includeCheckbox) {
        includeCheckbox.checked = projectTasks.length > 0;
        includeCheckbox.disabled = projectTasks.length === 0;
    }

    modal.style.display = 'flex';
    if (nameInput) {
        nameInput.focus();
        nameInput.select();
    }
}

function closeSaveAsTemplateModal() {
    const modal = document.getElementById('save-as-template-modal');
    if (modal) modal.style.display = 'none';
    templateSourceProjectId = null;
}

function confirmSaveAsTemplate() {
    const modal = document.getElementById('save-as-template-modal');
    if (!modal || templateSourceProjectId === null) return;

    const nameInput = modal.querySelector('#template-name-input');
    const includeCheckbox = modal.querySelector('#template-include-tasks');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
        if (nameInput) nameInput.focus();
        return;
    }

    const project = projects.find(p => p.id === templateSourceProjectId);
    if (!project) return;

    const includeTasks = includeCheckbox ? includeCheckbox.checked : false;
    const projectTasks = includeTasks
        ? tasks
            .filter(t => t.projectId === templateSourceProjectId)
            .map(t => ({
                title: t.title || '',
                description: t.description || '',
                priority: t.priority || 'medium',
                status: 'backlog',
                tags: Array.isArray(t.tags) ? [...t.tags] : []
            }))
        : [];

    const template = {
        id: String(Date.now()),
        name,
        description: project.description || '',
        tags: Array.isArray(project.tags) ? [...project.tags] : [],
        tasks: projectTasks,
        createdAt: new Date().toISOString()
    };

    templates = [...templates, template];
    closeSaveAsTemplateModal();
    renderTemplateDropdown();

    saveTemplatesStorage().catch(() => {});
    showSuccessNotification(t('projects.template.savedSuccess'));
}

function deleteTemplateById(templateId) {
    templates = templates.filter(tpl => tpl.id !== templateId);
    renderTemplateDropdown();
    saveTemplatesStorage().catch(() => {});
    showSuccessNotification(t('projects.template.deletedSuccess'));
}

let templateToDelete = null;

function openDeleteTemplateModal(templateId) {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    templateToDelete = templateId;
    const body = document.getElementById('delete-template-body');
    if (body) {
        const taskCount = tpl.tasks ? tpl.tasks.length : 0;
        body.textContent = `"${tpl.name}" and its ${taskCount} task${taskCount !== 1 ? 's' : ''} will be permanently removed.`;
    }
    const modal = document.getElementById('delete-template-modal');
    if (modal) modal.style.display = 'flex';
}

function closeDeleteTemplateModal() {
    const modal = document.getElementById('delete-template-modal');
    if (modal) modal.style.display = 'none';
    templateToDelete = null;
}

function confirmDeleteTemplate() {
    if (!templateToDelete) return;
    deleteTemplateById(templateToDelete);
    closeDeleteTemplateModal();
}

let templateToRename = null;

function openRenameTemplateModal(templateId) {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    templateToRename = templateId;
    const modal = document.getElementById('rename-template-modal');
    if (!modal) return;
    const nameInput = modal.querySelector('#rename-template-input');
    if (nameInput) {
        nameInput.value = tpl.name;
    }
    modal.style.display = 'flex';
    if (nameInput) { nameInput.focus(); nameInput.select(); }
}

function closeRenameTemplateModal() {
    const modal = document.getElementById('rename-template-modal');
    if (modal) modal.style.display = 'none';
    templateToRename = null;
}

function confirmRenameTemplate() {
    if (!templateToRename) return;
    const modal = document.getElementById('rename-template-modal');
    const nameInput = modal ? modal.querySelector('#rename-template-input') : null;
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) { if (nameInput) nameInput.focus(); return; }
    templates = templates.map(tpl =>
        tpl.id === templateToRename ? { ...tpl, name } : tpl
    );
    closeRenameTemplateModal();
    renderTemplateDropdown();
    saveTemplatesStorage().catch(() => {});
    showSuccessNotification(t('projects.template.renamedSuccess'));
}

function renderTemplateDropdown() {
    // Show/hide template section
    const templateSection = document.getElementById('project-template-section');
    if (templateSection) {
        templateSection.style.display = templates.length > 0 ? 'block' : 'none';
    }

    const panel = document.getElementById('template-dropdown-panel');
    if (!panel) return;

    const hiddenInput = document.getElementById('project-template-select');
    const currentId = hiddenInput ? hiddenInput.value : '';

    panel.innerHTML = '';

    // "None" row
    const noneRow = document.createElement('div');
    noneRow.className = 'template-dropdown-row' + (!currentId ? ' selected' : '');
    noneRow.innerHTML = `<span class="template-row-name">${t('projects.modal.templateNone')}</span>`;
    noneRow.addEventListener('click', () => setSelectedTemplate('', t('projects.modal.templateNone')));
    panel.appendChild(noneRow);

    // Template rows
    templates.forEach(tpl => {
        const row = document.createElement('div');
        row.className = 'template-dropdown-row' + (currentId === tpl.id ? ' selected' : '');
        const taskCount = tpl.tasks.length;
        row.innerHTML = `
            <span class="template-row-name">${escapeHtml(tpl.name)}</span>
            <span class="template-row-count">${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}</span>
            <div class="template-row-actions">
                <button type="button" class="template-row-btn template-row-rename" title="${t('projects.template.renameButton')}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button type="button" class="template-row-btn template-row-delete" title="Delete">✕</button>
            </div>
        `;
        // Clicking name/count selects the template
        row.querySelector('.template-row-name').addEventListener('click', () => setSelectedTemplate(tpl.id, tpl.name));
        row.querySelector('.template-row-count').addEventListener('click', () => setSelectedTemplate(tpl.id, tpl.name));
        // Rename
        row.querySelector('.template-row-rename').addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('template-dropdown');
            if (dropdown) dropdown.classList.remove('active');
            openRenameTemplateModal(tpl.id);
        });
        // Delete
        row.querySelector('.template-row-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('template-dropdown');
            if (dropdown) dropdown.classList.remove('active');
            openDeleteTemplateModal(tpl.id);
        });
        panel.appendChild(row);
    });
}

function setSelectedTemplate(id, name) {
    const hiddenInput = document.getElementById('project-template-select');
    if (hiddenInput) hiddenInput.value = id;
    const label = document.getElementById('template-dropdown-label');
    if (label) label.textContent = name;
    const dropdown = document.getElementById('template-dropdown');
    if (dropdown) dropdown.classList.remove('active');
    renderTemplateDropdown();

    // Show/hide task naming section based on template selection
    const namingSection = document.getElementById('project-template-naming');
    if (namingSection) {
        const hasTemplate = !!id;
        namingSection.style.display = hasTemplate ? 'block' : 'none';

        if (hasTemplate) {
            // Reset to "Original" each time a template is chosen
            const modeInput = document.getElementById('project-task-naming-mode');
            const prefixInput = document.getElementById('project-task-prefix-input');
            const suffixInput = document.getElementById('project-task-suffix-input');
            if (modeInput) modeInput.value = 'none';
            if (prefixInput) { prefixInput.value = ''; prefixInput.style.display = 'none'; }
            if (suffixInput) { suffixInput.value = ''; suffixInput.style.display = 'none'; }
            namingSection.querySelectorAll('.naming-seg-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === 'none');
            });

            if (!namingSection._listenersAttached) {
                namingSection._listenersAttached = true;
                namingSection.querySelectorAll('.naming-seg-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const val = btn.dataset.value;
                        if (modeInput) modeInput.value = val;
                        namingSection.querySelectorAll('.naming-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
                        if (prefixInput) prefixInput.style.display = val === 'prefix' ? 'block' : 'none';
                        if (suffixInput) suffixInput.style.display = val === 'suffix' ? 'block' : 'none';
                        if (val === 'prefix' && prefixInput) setTimeout(() => prefixInput.focus(), 50);
                        else if (val === 'suffix' && suffixInput) setTimeout(() => suffixInput.focus(), 50);
                    });
                });
            }
        }
    }
}

function setupTemplateDropdown() {
    const trigger = document.getElementById('template-dropdown-trigger');
    if (!trigger || trigger._templateSetup) return;
    trigger._templateSetup = true;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        renderTemplateDropdown(); // refresh before opening
        const dropdown = document.getElementById('template-dropdown');
        if (dropdown) dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#template-dropdown')) {
            const dropdown = document.getElementById('template-dropdown');
            if (dropdown) dropdown.classList.remove('active');
        }
    });
}

// ─── Project Duplication ──────────────────────────────────────────────────────

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
                status: 'backlog', // Reset to backlog (initial state) when duplicating
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
    appState.projectsSortedView = null;

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
      const debugLogsToggle = form.querySelector('#debug-logs-toggle');
      const historySortOrderSelect = form.querySelector('#history-sort-order');
      const languageSelect = form.querySelector('#language-select');

    // Populate user name from authenticated user (KV-backed)
    const currentUser = window.authSystem?.getCurrentUser();
    userNameInput.value = currentUser?.name || '';

      // Update security section based on auth method
      const userAuthMethod = currentUser?.authMethod || 'pin';
      const authMethodDisplay = document.getElementById('current-auth-method-display');
      const switchAuthText = document.getElementById('switch-auth-method-text');
      const changeCredLabel = document.getElementById('change-credential-label');
      const changeCredHint = document.getElementById('change-credential-hint');
      const changeCredBtnText = document.getElementById('change-credential-btn-text');
      if (userAuthMethod === 'password') {
          if (authMethodDisplay) {
              authMethodDisplay.textContent = t('settings.authMethodHintPassword');
              authMethodDisplay.setAttribute('data-i18n', 'settings.authMethodHintPassword');
          }
          if (switchAuthText) {
              switchAuthText.textContent = t('settings.switchToPin');
              switchAuthText.setAttribute('data-i18n', 'settings.switchToPin');
          }
          if (changeCredLabel) {
              changeCredLabel.textContent = t('settings.passwordManagement');
              changeCredLabel.setAttribute('data-i18n', 'settings.passwordManagement');
          }
          if (changeCredHint) {
              changeCredHint.textContent = t('settings.passwordManagementHint');
              changeCredHint.setAttribute('data-i18n', 'settings.passwordManagementHint');
          }
          if (changeCredBtnText) {
              changeCredBtnText.textContent = t('settings.changePasswordButton');
              changeCredBtnText.setAttribute('data-i18n', 'settings.changePasswordButton');
          }
      } else {
          if (authMethodDisplay) {
              authMethodDisplay.textContent = t('settings.authMethodHintPin');
              authMethodDisplay.setAttribute('data-i18n', 'settings.authMethodHintPin');
          }
          if (switchAuthText) {
              switchAuthText.textContent = t('settings.switchToPassword');
              switchAuthText.setAttribute('data-i18n', 'settings.switchToPassword');
          }
          if (changeCredLabel) {
              changeCredLabel.textContent = t('settings.pinManagement');
              changeCredLabel.setAttribute('data-i18n', 'settings.pinManagement');
          }
          if (changeCredHint) {
              changeCredHint.textContent = t('settings.pinManagementHint');
              changeCredHint.setAttribute('data-i18n', 'settings.pinManagementHint');
          }
          if (changeCredBtnText) {
              changeCredBtnText.textContent = t('settings.resetPinButton');
              changeCredBtnText.setAttribute('data-i18n', 'settings.resetPinButton');
          }
      }

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
          // If no timezone is set, detect from browser
          let timezoneToUse = settings.emailNotificationTimeZone;
          if (!timezoneToUse) {
              try {
                  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const availableTimezones = [
                      "America/Argentina/Buenos_Aires",
                      "Atlantic/Canary",
                      "Europe/Madrid",
                      "UTC"
                  ];
                  if (availableTimezones.includes(browserTz)) {
                      timezoneToUse = browserTz;
                  } else {
                      timezoneToUse = "Atlantic/Canary";
                  }
              } catch (e) {
                  timezoneToUse = "Atlantic/Canary";
              }
          }
          
          emailTimeZoneSelect.value = String(timezoneToUse);
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
      if (debugLogsToggle) debugLogsToggle.checked = !!settings.debugLogsEnabled;
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
          debugLogsEnabled: !!(debugLogsToggle?.checked),
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
                  debugLogsEnabled: !!(debugLogsToggle?.checked),
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
                  current.debugLogsEnabled !== window.initialSettingsFormState.debugLogsEnabled ||
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
          [userNameInput, emailInput, emailEnabledToggle, emailWeekdaysOnlyToggle, emailIncludeBacklogToggle, emailIncludeStartDatesToggle, emailTimeInput, emailTimeZoneSelect, autoStartToggle, autoEndToggle, enableReviewStatusToggle, calendarIncludeBacklogToggle, debugLogsToggle, historySortOrderSelect, languageSelect, logoFileInput, avatarFileInput]
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
    
    // Add reset PIN / change password button event listener (dynamic based on auth method)
    const resetPinBtn = modal.querySelector('#reset-pin-btn');
    if (resetPinBtn && !resetPinBtn.dataset.listenerAttached) {
        resetPinBtn.dataset.listenerAttached = 'true';
        resetPinBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const cu = window.authSystem?.getCurrentUser?.();
            const method = cu?.authMethod || 'pin';
            if (method === 'password') {
                changePasswordFlow();
            } else {
                resetPINFlow();
            }
        });
    }

    // Add switch auth method button handler
    const switchAuthBtn = modal.querySelector('#switch-auth-method-btn');
    if (switchAuthBtn && !switchAuthBtn.dataset.listenerAttached) {
        switchAuthBtn.dataset.listenerAttached = 'true';
        switchAuthBtn.addEventListener('click', function(e) {
            e.preventDefault();
            switchAuthMethodFlow();
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

        // Close dropdown when clicking on any dropdown item (except disabled ones)
        dropdown.addEventListener("click", function (e) {
            const item = e.target.closest(".dropdown-item:not(.disabled)");
            if (item) {
                closeUserDropdown();
            }
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
    // EXCLUDE lock/auth screen logos - they always have dark backgrounds and need white-text logo
    document.querySelectorAll('img.logo, img[class*="boot-logo"]').forEach(logo => {
        // Skip logos inside lock screens or auth overlays (they always use white-text logo)
        if (logo.closest('.overlay') || logo.closest('.auth-overlay')) {
            return;
        }
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
        localStorage.setItem('sidebarWidth', newWidth);
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
        appState.projectsSortedView = null;

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

let feedbackSubmitInProgress = false;

async function addFeedbackItem() {
    // Prevent duplicate submissions (double-click, multiple enter key presses)
    if (feedbackSubmitInProgress) {
        logDebug('feedback', 'Submission already in progress, ignoring duplicate call');
        return;
    }
    
    feedbackSubmitInProgress = true;
    logDebug('feedback', 'addFeedbackItem called');
    const typeRadio = document.querySelector('input[name="feedback-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'bug';
    const description = document.getElementById('feedback-description').value.trim();
    const screenshotData = currentFeedbackScreenshotData || '';

    if (!description) {
        feedbackSubmitInProgress = false;
        return;
    }

    const itemId = String(feedbackCounter++); // Convert to string immediately for D1 TEXT column
    logDebug('feedback', 'Generated ID:', { itemId });
    
    const item = {
        id: itemId,
        type: type,
        description: description,
        screenshotUrl: screenshotData ? 'uploading' : '', // Show icon immediately if screenshot exists
        createdAt: new Date().toISOString(),
        status: 'open'
    };

    // Add to array immediately (optimistic update)
    feedbackItems.unshift(item);
    
    // Clear input immediately for instant feedback
    document.getElementById('feedback-description').value = '';
    clearFeedbackScreenshot();

    // Reset to page 1 for pending items so new item is visible immediately
    feedbackPendingPage = 1;

    // Update UI INSTANTLY - no delays, no debouncing
    updateCounts();
    renderFeedback();

    // Cache immediately for instant persistence
    persistFeedbackCache();
    logDebug('feedback', 'UI updated, starting async operations');
    
    // Reset flag to allow next submission
    feedbackSubmitInProgress = false;

    // Upload screenshot in background (non-blocking)
    if (screenshotData) {
        logDebug('feedback', 'Uploading screenshot to KV...');
        const uploadStart = Date.now();
        fetch('/api/feedback-screenshot', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                feedbackId: itemId,
                data: screenshotData
            })
        })
        .then(response => {
            logDebug('feedback', 'Screenshot upload completed', { durationMs: Date.now() - uploadStart });
            if (response.ok) {
                return response.json();
            }
            throw new Error('Screenshot upload failed');
        })
        .then(result => {
            logDebug('feedback', 'Screenshot uploaded', { screenshotId: result.screenshotId });
            // Update item with screenshot ID
            item.screenshotUrl = result.screenshotId;
            persistFeedbackCache();
            
            // Re-render to show screenshot icon
            renderFeedback();
            
            // Save to D1 with screenshot
            logDebug('feedback', 'Saving to D1 with screenshot...');
            return saveSingleFeedbackItem(item);
        })
        .catch(error => {
            console.error('[Feedback] Screenshot upload failed:', error);
            // Save without screenshot
            logDebug('feedback', 'Saving to D1 without screenshot...');
            return saveSingleFeedbackItem(item);
        })
        .then(() => {
            logDebug('feedback', 'D1 save completed');
        })
        .catch(error => {
            console.error('[Feedback] Failed to save feedback item:', error);
            // Rollback on failure
            feedbackItems = feedbackItems.filter(f => f.id !== item.id);
            updateCounts();
            renderFeedback();
            persistFeedbackCache();
            showErrorNotification(t('error.saveFeedbackFailed'));
        });
    } else {
        // No screenshot - save immediately
        logDebug('feedback', 'No screenshot, saving to D1...');
        saveSingleFeedbackItem(item).catch((error) => {
            console.error('[Feedback] Failed to save feedback item:', error);
            // Rollback on failure
            feedbackItems = feedbackItems.filter(f => f.id !== item.id);
            updateCounts();
            renderFeedback();
            persistFeedbackCache();
            showErrorNotification(t('error.saveFeedbackFailed'));
        });
    }

    // Scroll to top of pending section on mobile for instant visibility
    if (getIsMobileCached()) {
        requestAnimationFrame(() => {
            const pendingContainer = document.getElementById('feedback-list-pending');
            if (pendingContainer) {
                pendingContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
}


// Add enter key support for feedback and initialize screenshot attachments
document.addEventListener('DOMContentLoaded', function() {
    // Initialize feedback type dropdown
    const feedbackTypeBtn = document.getElementById('feedback-type-btn');
    const feedbackTypeGroup = document.getElementById('feedback-type-group');
    const feedbackTypeLabel = document.getElementById('feedback-type-label');

    // Online/offline listeners removed - D1 individual operations handle connectivity automatically

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
        : getIsMobileCached();
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
    const oldResolvedAt = item.resolvedAt;

    // Optimistic update: change state immediately
    if (item.status === 'open') {
        item.status = 'done';
        item.resolvedAt = new Date().toISOString();
    } else {
        item.status = 'open';
        delete item.resolvedAt;
    }
    item.updatedAt = new Date().toISOString();
    
    // Update UI INSTANTLY - no delays
    updateCounts();
    renderFeedback();
    
    // Cache immediately for instant persistence
    persistFeedbackCache();

    // Update ONLY this item in D1 (not the entire array)
    updateSingleFeedbackItem(item).catch((error) => {
        console.error('Failed to update feedback item:', error);
        // Rollback on persistent failure
        item.status = oldStatus;
        if (oldResolvedAt) {
            item.resolvedAt = oldResolvedAt;
        } else {
            delete item.resolvedAt;
        }
        updateCounts();
        renderFeedback();
        persistFeedbackCache();
        showErrorNotification(t('error.feedbackStatusFailed'));
    });
}

function renderFeedback() {
    // Only render if feedback page is active (guarantee UI updates)
    const feedbackPage = document.getElementById('feedback');
    if (!feedbackPage || !feedbackPage.classList.contains('active')) {
        // Page not active - UI will update when page becomes active
        return;
    }

    const pendingContainer = document.getElementById('feedback-list-pending');
    const doneContainer = document.getElementById('feedback-list-done');
    if (!pendingContainer || !doneContainer) {
        // Containers don't exist yet - will render when page loads
        return;
    }

    const typeIcons = {
        bug: '\u{1F41E}',
        improvement: '\u{1F4A1}',
        // Legacy values for backward compatibility
        feature: '\u{1F4A1}',
        idea: '\u{1F4A1}'
    };

    // Filter and sort: pending by updatedAt||createdAt (newest first), done by resolvedAt (newest first)
    // Optimized: Use single pass filter for better performance on mobile
    const pendingItems = [];
    const doneItems = [];
    for (const f of feedbackItems) {
        if (f.status === 'open') {
            pendingItems.push(f);
        } else {
            doneItems.push(f);
        }
    }
    // Pending: sort strictly by original creation time so un-marking a done item
    // always returns it to its original position, never jumps to the top.
    // Items with missing createdAt fall to the bottom (0).
    pendingItems.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
    });
    // Done: sort by when the item was last resolved (newest resolve on top).
    // Falls back to createdAt for items missing resolvedAt.
    doneItems.sort((a, b) => {
        const ta = a.resolvedAt ? new Date(a.resolvedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tb = b.resolvedAt ? new Date(b.resolvedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return tb - ta;
    });

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

    // Render pending items - use DocumentFragment for better performance on mobile
    if (pendingItems.length === 0) {
        pendingContainer.innerHTML = `<div class="empty-state" style="padding: 20px;"><p>${t('feedback.empty.pending')}</p></div>`;
    } else {
        // Direct innerHTML assignment is fastest for instant rendering
        pendingContainer.innerHTML = pendingPageItems.map(item => `
            <div class="feedback-item ${item.status === 'done' ? 'done' : ''}">
                <input type="checkbox" class="feedback-checkbox"
                       data-feedback-id="${item.id}"
                       ${item.status === 'done' ? 'checked' : ''}>
                <span class="feedback-type-icon">${typeIcons[item.type] || '\u{1F4A1}'}</span>
                ${item.screenshotUrl && item.screenshotUrl !== 'uploading' ? `<button type="button" class="feedback-screenshot-link" data-action="viewFeedbackScreenshot" data-param="${encodeURIComponent(item.screenshotUrl)}" title="${t('feedback.viewScreenshotTitle')}">\u{1F5BC}\u{FE0F}</button>` : ''}
                ${item.screenshotUrl === 'uploading' ? `<span class="feedback-screenshot-uploading" title="Uploading...">\u{23F3}</span>` : ''}
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
                ${item.screenshotUrl && item.screenshotUrl !== 'uploading' ? `<button type="button" class="feedback-screenshot-link" data-action="viewFeedbackScreenshot" data-param="${encodeURIComponent(item.screenshotUrl)}" title="${t('feedback.viewScreenshotTitle')}">\u{1F5BC}\u{FE0F}</button>` : ''}
                ${item.screenshotUrl === 'uploading' ? `<span class="feedback-screenshot-uploading" title="Uploading...">\u{23F3}</span>` : ''}
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

    // Skip ghost 'updated' entries where all changes net to zero visible difference
    if (entry.action === 'updated') {
        const hasVisible = changeCount > 0 && changes.some(([field, { before, after }]) => {
            if (field === 'attachments') {
                const ba = Array.isArray(before) ? before : [];
                const aa = Array.isArray(after) ? after : [];
                const bk = new Set(ba.map(a => a.fileKey || a.url || a.name));
                const ak = new Set(aa.map(a => a.fileKey || a.url || a.name));
                return aa.some(a => !bk.has(a.fileKey || a.url || a.name)) || ba.some(a => !ak.has(a.fileKey || a.url || a.name));
            }
            if (field === 'tags') {
                const bs = new Set(Array.isArray(before) ? before : []);
                const as2 = Array.isArray(after) ? after : [];
                return as2.some(t => !bs.has(t)) || (Array.isArray(before) ? before : []).some(t => !(new Set(as2)).has(t));
            }
            return true;
        });
        if (!hasVisible) return '';
    }

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

            ${changeCount > 0 ? (() => {
                const renderedChanges = changes.map(([field, { before, after }]) => {
                        const label = fieldLabels[field] || field;

                        if (field === 'link' || field === 'task') {
                            const action = after && typeof after === 'object' ? after.action : '';
                            const title = after && typeof after === 'object' ? (after.title || after.id || t('tasks.table.task')) : String(after);
                            const linkType = after && typeof after === 'object' ? after.linkType : null;
                            const isRemoved = action === 'removed';
                            const emoji = isRemoved ? '❌' : '➕';
                            const typeLabel = linkType || (after && typeof after === 'object' && after.entity === 'project' ? t('history.entity.project') : t('history.entity.task'));
                            return `
                                <div class="history-change-compact history-change-compact--single">
                                    <span class="change-field-label">${label}:</span>
                                    <span>${emoji} ${isRemoved ? t('history.link.removed') : t('history.link.added')} <span style="opacity:0.7;margin-right:4px;">${escapeHtml(typeLabel)}</span>"${escapeHtml(title)}"</span>
                                </div>
                            `;
                        }

                        // Tags: show only added/removed tag names
                        if (field === 'tags') {
                            const beforeArr = Array.isArray(before) ? before : [];
                            const afterArr = Array.isArray(after) ? after : [];
                            const beforeSet = new Set(beforeArr);
                            const afterSet = new Set(afterArr);
                            const added = afterArr.filter(tag => !beforeSet.has(tag));
                            const removed = beforeArr.filter(tag => !afterSet.has(tag));
                            if (!added.length && !removed.length) return '';
                            const lines = [
                                ...added.map(tag => {
                                    const tagColor = getTagColor(tag);
                                    return `➕ ${t('history.link.added')} <span style="background-color:${tagColor};color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:500;margin-left:6px;">${escapeHtml(tag.toUpperCase())}</span>`;
                                }),
                                ...removed.map(tag => {
                                    const tagColor = getTagColor(tag);
                                    return `❌ ${t('history.link.removed')} <span style="background-color:${tagColor};color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:500;opacity:0.6;margin-left:6px;">${escapeHtml(tag.toUpperCase())}</span>`;
                                })
                            ].join('<br>');
                            return `
                                <div class="history-change-compact history-change-compact--single">
                                    <span class="change-field-label">${label}:</span>
                                    <span style="line-height:2;">${lines}</span>
                                </div>
                            `;
                        }

                        // Attachments: show only added/removed filenames
                        if (field === 'attachments') {
                            const beforeArr = Array.isArray(before) ? before : [];
                            const afterArr = Array.isArray(after) ? after : [];
                            const beforeKeys = new Set(beforeArr.map(a => a.fileKey || a.url || a.name));
                            const afterKeys = new Set(afterArr.map(a => a.fileKey || a.url || a.name));
                            const added = afterArr.filter(a => !beforeKeys.has(a.fileKey || a.url || a.name));
                            const removed = beforeArr.filter(a => !afterKeys.has(a.fileKey || a.url || a.name));
                            if (!added.length && !removed.length) return '';
                            const lines = [
                                ...added.map(a => `➕ ${t('history.link.added')} ${escapeHtml(a.name)}`),
                                ...removed.map(a => `❌ ${t('history.link.removed')} ${escapeHtml(a.name)}`)
                            ].join('<br>');
                            return `
                                <div class="history-change-compact history-change-compact--single">
                                    <span class="change-field-label">${label}:</span>
                                    <span style="line-height:1.7;">${lines}</span>
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
                }).filter(s => s.trim() !== '');
                if (!renderedChanges.length) return '';
                return `<div class="history-changes-compact">${renderedChanges.join('')}</div>`;
            })() : ''}
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
        const title = value && typeof value === 'object' ? (value.title || value.id || t('tasks.table.task')) : String(value);
        const linkType = value && typeof value === 'object' ? value.linkType : null;
        const entity = (value && typeof value === 'object' ? value.entity : null) || 'task';
        const isRemoved = action === 'removed';
        const emoji = isRemoved ? '❌' : '➕';
        const typeLabel = linkType || (entity === 'project' ? t('history.entity.project') : t('history.entity.task'));
        return `${emoji} <span style="opacity:0.7;margin-right:4px;">${escapeHtml(typeLabel)}</span>"${escapeHtml(title)}"`;
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
        // Use priority badge with proper colors - use border-radius: 6px to match priority-pill
        const priorityLabel = getPriorityLabel(value).toUpperCase();
        const priorityStyles = {
            high: 'background: rgba(239, 68, 68, 0.2); color: #ef4444;',
            medium: 'background: rgba(245, 158, 11, 0.2); color: #f59e0b;',
            low: 'background: rgba(16, 185, 129, 0.2); color: #10b981;'
        };
        const style = priorityStyles[value] || 'background: rgba(107, 114, 128, 0.2); color: #6b7280;';
        return `<span style="${style} padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${escapeHtml(priorityLabel)}</span>`;
    }

    if (field === 'projectId') {
        if (!value) return `<em style="opacity: 0.7;">${t('tasks.noProject')}</em>`;
        const project = projects.find(p => p.id === value);
        const projectName = project ? escapeHtml(project.name) : `#${value}`;
        return isBeforeValue ? `<span style="opacity: 0.7;">${projectName}</span>` : projectName;
    }

    if (field === 'tags') {
        // NO opacity for tags - show ALL tags, no truncation
        if (!Array.isArray(value) || value.length === 0) return `<em style="opacity: 0.7;">${t('history.value.none')}</em>`;
        return value.map(tag => {
            const tagColor = getTagColor(tag);
            return `<span style="background-color: ${tagColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`;
        }).join(' ');
    }

    if (field === 'attachments') {
        if (!Array.isArray(value) || value.length === 0) return `<em style="opacity: 0.7;">${t('history.value.none')}</em>`;
        const names = value.map(att => escapeHtml(att.name || '?')).join(', ');
        return isBeforeValue ? `<span style="opacity: 0.7;">${names}</span>` : names;
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

        // Tags: show only the diff (added/removed tags), not full lists
        if (field === 'tags') {
            const beforeArr = Array.isArray(before) ? before : [];
            const afterArr = Array.isArray(after) ? after : [];
            const beforeSet = new Set(beforeArr);
            const afterSet = new Set(afterArr);
            const added = afterArr.filter(tag => !beforeSet.has(tag));
            const removed = beforeArr.filter(tag => !afterSet.has(tag));
            if (!added.length && !removed.length) return '';
            const lines = [
                ...added.map(tag => {
                    const tagColor = getTagColor(tag);
                    return `➕ ${t('history.link.added')} <span style="background-color:${tagColor};color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:500;">${escapeHtml(tag.toUpperCase())}</span>`;
                }),
                ...removed.map(tag => {
                    const tagColor = getTagColor(tag);
                    return `❌ ${t('history.link.removed')} <span style="background-color:${tagColor};color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:500;opacity:0.6;">${escapeHtml(tag.toUpperCase())}</span>`;
                })
            ].join('<br>');
            return `
                <div class="history-change">
                    <div class="history-change-field">${label}</div>
                    <div class="history-change-values" style="display:block;">
                        <div style="line-height:2;">${lines}</div>
                    </div>
                </div>
            `;
        }

        // Attachments: show only the diff (added/removed filenames), not full lists
        if (field === 'attachments') {
            const beforeArr = Array.isArray(before) ? before : [];
            const afterArr = Array.isArray(after) ? after : [];
            const beforeNames = new Set(beforeArr.map(a => a.name));
            const afterNames = new Set(afterArr.map(a => a.name));
            const added = afterArr.filter(a => !beforeNames.has(a.name));
            const removed = beforeArr.filter(a => !afterNames.has(a.name));
            if (!added.length && !removed.length) return '';
            const lines = [
                ...added.map(a => `➕ ${t('history.link.added')} ${escapeHtml(a.name)}`),
                ...removed.map(a => `❌ ${t('history.link.removed')} ${escapeHtml(a.name)}`)
            ].join('<br>');
            return `
                <div class="history-change">
                    <div class="history-change-field">${label}</div>
                    <div class="history-change-values" style="display:block;">
                        <div style="line-height:1.7;">${lines}</div>
                    </div>
                </div>
            `;
        }

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
        const title = value && typeof value === 'object' ? (value.title || value.id || t('tasks.table.task')) : String(value);
        const linkType = value && typeof value === 'object' ? value.linkType : null;
        const entity = (value && typeof value === 'object' ? value.entity : null) || 'task';
        const isRemoved = action === 'removed';
        const emoji = isRemoved ? '❌' : '➕';
        const typeLabel = linkType || (entity === 'project' ? t('history.entity.project') : t('history.entity.task'));
        return `${emoji} <span style="opacity:0.7;margin-right:4px;">${escapeHtml(typeLabel)}</span>"${escapeHtml(title)}"`;
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
        return value.map(att => escapeHtml(att.name || '?')).join(', ');
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
        const deletedItem = feedbackItems.find(f => f.id === deleteId);
        
        // Remove from array immediately (optimistic update)
        feedbackItems = feedbackItems.filter(f => f.id !== deleteId);

        // Close modal and update UI INSTANTLY
        closeFeedbackDeleteModal();
        updateCounts();
        renderFeedback();
        
        // Cache immediately for instant persistence
        persistFeedbackCache();

        // Delete ONLY this item from D1 (not save entire array)
        deleteSingleFeedbackItem(deleteId).catch((error) => {
            console.error('Failed to delete feedback item:', error);
            // Rollback on failure
            if (deletedItem) {
                feedbackItems.push(deletedItem);
                updateCounts();
                renderFeedback();
                persistFeedbackCache();
            }
            showErrorNotification(t('error.deleteFeedbackFailed'));
        });
    }
}

// Delegated click handler for feedback checkbox only
document.addEventListener('click', function(e) {
    const checkbox = e.target.closest('.feedback-checkbox');
    if (checkbox) {
        const feedbackId = checkbox.dataset.feedbackId; // Keep as string to match D1 TEXT IDs
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
        const oldTaskCopy = JSON.parse(JSON.stringify(task));
        task.attachments.push(attachment);
        if (window.historyService) {
            window.historyService.recordTaskUpdated(oldTaskCopy, task);
        }
        renderAttachments(task.attachments);

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
    }).sort((a, b) => {
        // Sort file attachments alphabetically by name
        const nameA = a.att.name || '';
        const nameB = b.att.name || '';
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    const linkItems = indexed.filter(({ att }) => {
        if (!att) return false;
        if (att.type === 'link') return true;
        if (att.url && att.type !== 'file') return true; // backward compat for old link objects
        return false;
    }).sort((a, b) => {
        // Sort web links alphabetically by name
        const nameA = a.att.name || '';
        const nameB = b.att.name || '';
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
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

    // Build gallery of image attachments (same sorted order as fileItems)
    currentImageGallery = fileItems
        .map(({ att }) => att)
        .filter(att =>
            (att.type === 'file' && att.fileKey && att.fileType === 'image') ||
            (att.type === 'image' && att.data)
        );

    const fileRows = fileItems.map(({ att, index }) => {
        const sizeInKB = att.size ? Math.round(att.size / 1024) : 0;
        const sizeText = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;

        if (att.type === 'file' && att.fileKey) {
            const isImage = att.fileType === 'image';
            const thumbnailHtml = `<div id="thumbnail-${att.fileKey}" class="attachment-thumb" aria-hidden="true">${att.icon}</div>`;
            const primaryAction = isImage ? 'viewFile' : 'downloadFileAttachment';
            const galleryIndex = isImage ? currentImageGallery.indexOf(att) : -1;
            const primaryParams = isImage
                ? `data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.fileType}" data-param4="${galleryIndex}"`
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
            const galleryIndex = currentImageGallery.indexOf(att);
            return `
                <div class="attachment-item">
                    <button type="button" class="attachment-link" data-action="viewImageLegacy" data-param="${att.data}" data-param2="${escapeHtml(att.name)}" data-param3="${galleryIndex}">
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
        <div class="attachment-item" style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
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

    // Get dependencies and other links for current task
    const taskForm = document.getElementById('task-form');
    const currentTaskId = taskForm ? parseInt(taskForm.dataset.editingTaskId) : null;
    let dependencyRows = '';
    let taskLinkRows = '';
    
    if (currentTaskId) {
        const currentTask = tasks.find(t => t.id === currentTaskId);
        
        // Render dependencies (depends_on) - sorted alphabetically by task title
        const prerequisites = getPrerequisites(currentTaskId, dependencies);
        const sortedPrerequisites = [...prerequisites].sort((a, b) => {
            const taskA = tasks.find(t => t.id === a);
            const taskB = tasks.find(t => t.id === b);
            if (!taskA || !taskB) return 0;
            return taskA.title.localeCompare(taskB.title, undefined, { sensitivity: 'base' });
        });
        
        dependencyRows = sortedPrerequisites.map(prereqId => {
            const prereqTask = tasks.find(t => t.id === prereqId);
            if (!prereqTask) return '';
            
            return `
                <div class="attachment-item" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; margin-bottom: 6px; border: 1px solid var(--border); min-height: 0;">
                    <div style="width: 24px; height: 24px; background: transparent; border-radius: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; flex-shrink: 0;">🔗</div>
                    <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;">
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; flex: 1; min-width: 0;">
                            depends on → Task #${prereqTask.id}: ${escapeHtml(prereqTask.title)}
                        </div>
                        <span class="priority-pill priority-${prereqTask.priority}" style="flex-shrink: 0; font-size: 10px; padding: 3px 8px; min-width: 60px; text-align: center; height: 22px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;">${prereqTask.priority.toUpperCase()}</span>
                        <span class="status-badge ${prereqTask.status}" style="flex-shrink: 0; font-size: 10px; min-width: 85px; text-align: center; height: 22px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; padding: 3px 8px;">${getStatusLabel(prereqTask.status).toUpperCase()}</span>
                    </div>
                    <div style="display: flex; gap: 2px; align-items: center; flex-shrink: 0;">
                        <button type="button" data-action="openTaskDetails" data-param="${prereqTask.id}" data-stop-propagation="true" class="link-open-btn" title="Open task" aria-label="Open task">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </button>
                        <button type="button" class="attachment-remove link-remove-btn" data-action="removeDependency" data-param="${prereqId}" aria-label="Remove dependency" title="Remove dependency">&times;</button>
                    </div>
                </div>
            `;
        }).filter(Boolean).join('');
        
        // Render other task links (blocks, is_blocked_by, relates_to)
        // GROUPED BY TYPE for better space efficiency
        if (currentTask && currentTask.links && Array.isArray(currentTask.links)) {
            // Group links by type
            const groupedLinks = {
                'blocks': [],
                'is_blocked_by': [],
                'relates_to': []
            };
            
            currentTask.links.forEach(link => {
                const linkedTask = tasks.find(t => t.id === link.taskId);
                if (linkedTask) {
                    groupedLinks[link.type]?.push({ link, linkedTask });
                }
            });
            
            const linkTypeLabels = {
                'blocks': t('tasks.links.blocks'),
                'is_blocked_by': t('tasks.links.isBlockedBy'),
                'relates_to': t('tasks.links.relatesTo')
            };
            
            // Render each group (sorted: blocks, is_blocked_by, relates_to)
            const linkTypeOrder = ['blocks', 'is_blocked_by', 'relates_to'];
            taskLinkRows = linkTypeOrder
                .filter(type => groupedLinks[type] && groupedLinks[type].length > 0)
                .map(type => {
                    const items = groupedLinks[type];
                    
                    // Sort items alphabetically by task title within each group
                    const sortedItems = [...items].sort((a, b) => {
                        return a.linkedTask.title.localeCompare(b.linkedTask.title, undefined, { sensitivity: 'base' });
                    });
                    
                    const groupHeader = `
                        <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 6px 0; padding: 0 4px;">
                            ${linkTypeLabels[type]} (${items.length})
                        </div>
                    `;
                    
                    const groupItems = sortedItems.map(({ link, linkedTask }, linkIndex) => {
                        // Find actual index in original links array for removal
                        const actualIndex = currentTask.links.findIndex(l => l.taskId === linkedTask.id && l.type === type);
                        
                        return `
                            <div class="attachment-item" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; margin-bottom: 6px; border: 1px solid var(--border); min-height: 0;">
                                <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; flex: 1; min-width: 0;">
                                    #${linkedTask.id} · ${escapeHtml(linkedTask.title)}
                                </div>
                                <span class="priority-pill priority-${linkedTask.priority}" style="flex-shrink: 0; font-size: 10px; padding: 3px 8px; width: 60px; text-align: center; height: 22px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; line-height: 1;">${linkedTask.priority.toUpperCase()}</span>
                                <span class="status-badge ${linkedTask.status}" style="flex-shrink: 0; font-size: 10px; width: 90px; text-align: center; height: 22px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; padding: 3px 8px; line-height: 1;">${getStatusLabel(linkedTask.status).toUpperCase()}</span>
                                <div style="display: flex; gap: 2px; align-items: center; flex-shrink: 0;">
                                    <button type="button" data-action="openTaskDetails" data-param="${linkedTask.id}" data-stop-propagation="true" class="link-open-btn" title="Open task" aria-label="Open task">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                            <polyline points="15 3 21 3 21 9"></polyline>
                                            <line x1="10" y1="14" x2="21" y2="3"></line>
                                        </svg>
                                    </button>
                                    <button type="button" class="attachment-remove link-remove-btn" data-action="removeTaskLink" data-param="${currentTaskId}" data-param2="${actualIndex}" aria-label="Remove link" title="Remove link">&times;</button>
                                </div>
                            </div>
                        `;
                    }).join('');
                    
                    return groupHeader + groupItems;
                }).join('');
        }
    }

    const hasAny = Boolean(fileRows) || Boolean(linkRows) || Boolean(dependencyRows) || Boolean(taskLinkRows);
    if (!hasAny) {
        filesContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; padding: 8px 0;">${t('tasks.attachments.none')}</div>`;
        linksContainer.innerHTML = '';
    } else {
        filesContainer.innerHTML = fileRows || '';
        linksContainer.innerHTML = linkRows + dependencyRows + taskLinkRows;
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

function renderDependenciesInModal(task) {
    const filesContainer = document.getElementById('attachments-files-list');
    const linksContainer = document.getElementById('attachments-links-list');
    
    if (filesContainer && linksContainer) {
        renderAttachmentsSeparated(task.attachments || [], filesContainer, linksContainer);
    }
}

async function viewFile(fileKey, fileName, fileType, galleryIndex) {
    if (fileType !== 'image') return; // Only images can be viewed inline

    const gIdx = galleryIndex !== undefined && galleryIndex !== null && galleryIndex !== '' ? parseInt(galleryIndex) : -1;
    if (gIdx >= 0 && currentImageGallery.length > 0) {
        openImageGallery(gIdx);
        return;
    }

    try {
        const base64Data = await downloadFile(fileKey);
        viewImageLegacy(base64Data, fileName);
    } catch (error) {
        showErrorNotification(t('error.attachmentLoadFailed', { message: error.message }));
    }
}

function viewImageLegacy(base64Data, imageName, galleryIndex) {
    const gIdx = galleryIndex !== undefined && galleryIndex !== null && galleryIndex !== '' ? parseInt(galleryIndex) : -1;
    if (gIdx >= 0 && currentImageGallery.length > 0) {
        openImageGallery(gIdx);
        return;
    }

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

async function openImageGallery(startIndex) {
    const images = currentImageGallery;
    if (!images || !images.length) return;

    let idx = Math.max(0, Math.min(startIndex, images.length - 1));
    const multi = images.length > 1;
    const showDots = multi && images.length <= 15;

    // SVG chevrons — clean paths, no selectable text
    const svgPrev = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;display:block;"><polyline points="15 18 9 12 15 6"/></svg>`;
    const svgNext = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;display:block;"><polyline points="9 18 15 12 9 6"/></svg>`;
    // Close X as SVG too
    const svgClose = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;display:block;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    const navBtnBase = `user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;border:none;background:none;cursor:pointer;width:52px;height:52px;display:flex;align-items:center;justify-content:center;transition:transform 0.2s ease,opacity 0.2s ease;flex-shrink:0;outline:none;opacity:0.65;`;

    // Dots: button has generous touch padding, tiny visual inner span — prevents mobile browser inflating the hit target visually
    const dotsHtml = showDots
        ? `<div class="gal-dots" style="display:flex;justify-content:center;align-items:center;padding:12px 0 4px;flex-shrink:0;user-select:none;-webkit-user-select:none;">
            ${images.map((_, i) => `<button class="gal-dot" data-i="${i}" style="padding:6px;background:none;border:none;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;-webkit-tap-highlight-color:transparent;line-height:0;"><span style="display:block;width:6px;height:6px;border-radius:50%;pointer-events:none;background:rgba(255,255,255,${i === idx ? '0.9' : '0.28'});transform:scale(${i === idx ? '1.3' : '1'});transition:background 0.2s,transform 0.2s;"></span></button>`).join('')}
           </div>`
        : '';

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10000;user-select:none;-webkit-user-select:none;`;

    overlay.innerHTML = `
        <div style="width:100%;max-width:1200px;height:95vh;display:flex;flex-direction:column;box-sizing:border-box;padding:0 12px;">
            <div style="display:flex;align-items:center;gap:12px;padding:10px 4px 10px;flex-shrink:0;">
                <span class="gal-title" style="flex:1;color:rgba(255,255,255,0.8);font-size:13px;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;user-select:none;"></span>
                <span class="gal-counter" style="color:rgba(255,255,255,0.35);font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums;user-select:none;"></span>
                <button class="gal-close" style="${navBtnBase}color:rgba(255,255,255,0.5);" title="Close">${svgClose}</button>
            </div>
            <div style="flex:1;display:flex;align-items:center;gap:8px;overflow:hidden;min-height:0;">
                <button class="gal-prev" style="${navBtnBase}color:rgba(255,255,255,0.85);">${svgPrev}</button>
                <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;height:100%;">
                    <img class="gal-img" src="" alt="" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;transition:opacity 0.15s;user-select:none;-webkit-user-select:none;-webkit-user-drag:none;">
                </div>
                <button class="gal-next" style="${navBtnBase}color:rgba(255,255,255,0.85);">${svgNext}</button>
            </div>
            ${dotsHtml}
        </div>
    `;

    const titleEl = overlay.querySelector('.gal-title');
    const counterEl = overlay.querySelector('.gal-counter');
    const imgEl = overlay.querySelector('.gal-img');
    const closeBtn = overlay.querySelector('.gal-close');
    const prevBtn = overlay.querySelector('.gal-prev');
    const nextBtn = overlay.querySelector('.gal-next');
    const dotsContainer = overlay.querySelector('.gal-dots');

    function setNavState(i) {
        const atFirst = i === 0;
        const atLast = i === images.length - 1;
        prevBtn.style.opacity = (!multi || atFirst) ? '0.2' : '0.65';
        prevBtn.style.cursor = (!multi || atFirst) ? 'default' : 'pointer';
        prevBtn.style.pointerEvents = (!multi || atFirst) ? 'none' : 'auto';
        nextBtn.style.opacity = (!multi || atLast) ? '0.2' : '0.65';
        nextBtn.style.cursor = (!multi || atLast) ? 'default' : 'pointer';
        nextBtn.style.pointerEvents = (!multi || atLast) ? 'none' : 'auto';
    }

    function updateDots(i) {
        if (!dotsContainer) return;
        dotsContainer.querySelectorAll('.gal-dot').forEach((dot, di) => {
            const active = di === i;
            const span = dot.querySelector('span');
            if (span) {
                span.style.background = active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.28)';
                span.style.transform = active ? 'scale(1.3)' : 'scale(1)';
            }
        });
    }

    async function loadImage(i) {
        const att = images[i];
        titleEl.textContent = att.name;
        counterEl.textContent = multi ? `${i + 1} / ${images.length}` : '';
        setNavState(i);
        updateDots(i);
        imgEl.style.opacity = '0.3';
        try {
            if (att.type === 'file' && att.fileKey) {
                imgEl.src = await downloadFile(att.fileKey);
            } else {
                imgEl.src = att.data;
            }
            imgEl.alt = att.name;
        } catch (err) {
            console.error('Gallery: failed to load image', err);
        }
        imgEl.style.opacity = '1';
    }

    function navigate(delta) {
        const newIdx = idx + delta;
        if (newIdx >= 0 && newIdx < images.length) {
            idx = newIdx;
            loadImage(idx);
        }
    }

    function close() {
        overlay.remove();
        document.removeEventListener('keydown', keyHandler);
    }

    function keyHandler(e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
        else if (e.key === 'Escape') close();
    }

    // Touch swipe support
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    const SWIPE_THRESHOLD = 50;
    const SWIPE_ANGLE_MAX = 35; // degrees — reject mostly-vertical drags

    imgEl.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
        imgEl.style.transition = 'none';
    }, { passive: true });

    imgEl.addEventListener('touchmove', (e) => {
        if (!isSwiping || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
        // Only follow horizontal drags
        if (angle < SWIPE_ANGLE_MAX || angle > (180 - SWIPE_ANGLE_MAX)) {
            imgEl.style.transform = `translateX(${dx * 0.4}px)`;
        }
    }, { passive: true });

    imgEl.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        isSwiping = false;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
        const isHorizontal = angle < SWIPE_ANGLE_MAX || angle > (180 - SWIPE_ANGLE_MAX);
        imgEl.style.transition = 'transform 0.25s ease, opacity 0.15s';
        imgEl.style.transform = 'translateX(0)';
        if (isHorizontal && Math.abs(dx) >= SWIPE_THRESHOLD) {
            navigate(dx < 0 ? 1 : -1);
        }
    }, { passive: true });

    // Hover: directional nudge + opacity lift. Chevron slides toward its direction.
    prevBtn.addEventListener('mouseenter', () => { prevBtn.style.transform = 'translateX(-5px)'; prevBtn.style.opacity = '1'; });
    prevBtn.addEventListener('mouseleave', () => { prevBtn.style.transform = 'translateX(0)'; prevBtn.style.opacity = prevBtn.style.pointerEvents === 'none' ? '0.2' : '0.65'; });
    nextBtn.addEventListener('mouseenter', () => { nextBtn.style.transform = 'translateX(5px)'; nextBtn.style.opacity = '1'; });
    nextBtn.addEventListener('mouseleave', () => { nextBtn.style.transform = 'translateX(0)'; nextBtn.style.opacity = nextBtn.style.pointerEvents === 'none' ? '0.2' : '0.65'; });
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.opacity = '1'; closeBtn.style.transform = 'scale(1.2)'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.opacity = '0.65'; closeBtn.style.transform = 'scale(1)'; });

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });

    if (dotsContainer) {
        dotsContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            const dot = e.target.closest('.gal-dot');
            if (dot) { const i = parseInt(dot.dataset.i); if (i !== idx) { idx = i; loadImage(idx); } }
        });
    }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', keyHandler);

    document.body.appendChild(overlay);
    loadImage(idx);
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

        const oldTaskCopy = JSON.parse(JSON.stringify(task));
        task.attachments.splice(index, 1);
        if (window.historyService) {
            window.historyService.recordTaskUpdated(oldTaskCopy, task);
        }

        // Update UI immediately (optimistic update)
        renderAttachments(task.attachments);

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

async function removeDependencyUI(prerequisiteTaskId) {
    const taskForm = document.getElementById('task-form');
    const currentTaskId = taskForm ? parseInt(taskForm.dataset.editingTaskId) : null;
    
    if (!currentTaskId) return;
    
    const success = await handleRemoveDependency(currentTaskId, prerequisiteTaskId);
    
    if (success) {
        // Refresh the dependencies display
        const task = tasks.find(t => t.id === currentTaskId);
        if (task) {
            renderDependenciesInModal(task);
        }
    }
}

async function removeTaskLink(taskId, linkIndex) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.links || !task.links[linkIndex]) {
        showErrorNotification(t('error.linkNotFound'));
        return;
    }
    
    const link = task.links[linkIndex];
    const linkedTask = tasks.find(t => t.id === link.taskId);
    
    // Remove the link from the source task
    task.links.splice(linkIndex, 1);
    
    // Remove the reciprocal link from the target task
    if (linkedTask && linkedTask.links) {
        // Determine the reciprocal link type
        let reciprocalType;
        if (link.type === 'blocks') {
            reciprocalType = 'is_blocked_by';
        } else if (link.type === 'is_blocked_by') {
            reciprocalType = 'blocks';
        } else if (link.type === 'relates_to') {
            reciprocalType = 'relates_to';
        }
        
        // Find and remove the reciprocal link
        const reciprocalIndex = linkedTask.links.findIndex(
            l => l.taskId === taskId && l.type === reciprocalType
        );
        
        if (reciprocalIndex !== -1) {
            linkedTask.links.splice(reciprocalIndex, 1);
        }
    }
    
    // Record history for both tasks
    if (window.historyService) {
        const linkTypeLabels = { blocks: 'tasks.links.blocks', is_blocked_by: 'tasks.links.isBlockedBy', relates_to: 'tasks.links.relatesTo' };
        const linkLabel = t(linkTypeLabels[link.type] || 'tasks.links.relatesTo');
        window.historyService.recordHistory('task', taskId, task.title || 'Task', 'updated', {
            link: { before: null, after: { action: 'removed', entity: 'task', id: link.taskId, title: linkedTask ? linkedTask.title : `#${link.taskId}`, linkType: linkLabel } }
        });
        if (linkedTask) {
            window.historyService.recordHistory('task', linkedTask.id, linkedTask.title || 'Task', 'updated', {
                link: { before: null, after: { action: 'removed', entity: 'task', id: taskId, title: task.title, linkType: linkLabel } }
            });
        }
    }

    // Save tasks
    await saveTasks();

    // Refresh the task modal
    renderDependenciesInModal(task);

    showSuccessNotification(t('success.linkRemoved'));
}

function initTaskAttachmentDropzone() {
    const dropzone = document.getElementById('attachment-file-dropzone');
    const fileInput = document.getElementById('attachment-file');
    if (!dropzone || !fileInput) return;

    const isMobileScreen = getIsMobileCached();
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

    const MAX_ATTACHMENTS_PER_UPLOAD = 10;

    async function handleDropOrPasteFileList(fileList, event) {
        if (!fileList || fileList.length === 0) return;
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        // Capture files into plain array immediately (DataTransfer files become invalid after sync handler returns)
        const files = Array.from(fileList);

        // Block entirely if too many files - don't upload any
        if (files.length > MAX_ATTACHMENTS_PER_UPLOAD) {
            const message = t('error.tooManyFiles', { max: MAX_ATTACHMENTS_PER_UPLOAD });
            showAttachmentErrorGlobal(message);
            return;
        }

        // Clear any previous error
        clearAttachmentErrorGlobal();

        for (const file of files) {
            await uploadTaskAttachmentFile(file, dropzone);
        }
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
    if (!file) return null;

    const fileType = getFileType(file.type || '', file.name || '');
    const maxSize = getMaxFileSize(fileType);

    if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        showErrorNotification(t('error.fileSizeTooLarge', { maxMB }));
        return null;
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
            if (!task) return null;
            if (!task.attachments) task.attachments = [];
            const oldTaskCopy = JSON.parse(JSON.stringify(task));
            task.attachments.push(attachment);
            if (window.historyService) {
                window.historyService.recordTaskUpdated(oldTaskCopy, task);
            }

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
        return attachment;

    } catch (error) {
        showErrorNotification(t('error.fileUploadFailed', { message: error.message }));
        return null;
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
    // Capture files into plain array immediately (FileList becomes invalid after input reset)
    const allFiles = fileInput && fileInput.files ? Array.from(fileInput.files) : [];

    if (allFiles.length === 0) {
        showErrorNotification(t('error.selectFile'));
        return;
    }

    const MAX_FILES = 10;
    // Block entirely if too many files - don't upload any
    if (allFiles.length > MAX_FILES) {
        const message = t('error.tooManyFiles', { max: MAX_FILES });
        showAttachmentErrorGlobal(message);
        if (fileInput) fileInput.value = '';
        return;
    }

    // Clear any previous error
    clearAttachmentErrorGlobal();

    const uiEl =
        document.getElementById('attachment-file-dropzone') ||
        event?.target ||
        null;

    for (const file of allFiles) {
        await uploadTaskAttachmentFile(file, uiEl);
    }

    if (fileInput) fileInput.value = '';
}

/**
 * Show an error message in the attachment modal (global helper)
 * @param {string} message - The error message to display
 */
function showAttachmentErrorGlobal(message) {
    let errorEl = document.getElementById('attachment-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'attachment-error';
        errorEl.className = 'form-error';
        const dropzoneEl = document.getElementById('attachment-file-dropzone');
        dropzoneEl?.parentNode?.insertBefore(errorEl, dropzoneEl.nextSibling);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorEl) errorEl.style.display = 'none';
    }, 5000);
}

/**
 * Clear the attachment error message (global helper)
 */
function clearAttachmentErrorGlobal() {
    const errorEl = document.getElementById('attachment-error');
    if (errorEl) errorEl.style.display = 'none';
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

// File utility functions imported from src/utils/file.js

// Expose file attachment functions to window for onclick handlers
window.addFileAttachment = addFileAttachment;
window.viewFile = viewFile;
window.viewImageLegacy = viewImageLegacy;
window.openImageGallery = openImageGallery;
window.downloadFileAttachment = downloadFileAttachment;
window.removeAttachment = removeAttachment;
window.removeDependency = removeDependencyUI;
window.removeTaskLink = removeTaskLink;

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
        updateFilterBadges();
        renderAfterFilterChange();
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

    applyBacklogFilterVisibility();
}

/**
 * When Tasks + Kanban + Backlog column hidden: hide Backlog in Status filter,
 * clear it from filter state, and refresh. Otherwise show Backlog option.
 * Mobile always uses list view (CSS), so Backlog must stay visible in filter.
 * (Plan: docs/plans/backlog-ux-golden-standard.md)
 */
function applyBacklogFilterVisibility() {
    const activeId = typeof getActivePageId === 'function' ? getActivePageId() : null;
    const kanbanBoard = document.querySelector('.kanban-board');
    const isKanban = kanbanBoard && !kanbanBoard.classList.contains('hidden');
    const isMobile = typeof getIsMobileCached === 'function' ? getIsMobileCached() : true;
    const hideBacklog = activeId === 'tasks' && isKanban && !isMobile && window.kanbanShowBacklog !== true;

    const backlogLi = document.getElementById('filter-status-backlog');
    if (backlogLi) {
        backlogLi.style.display = hideBacklog ? 'none' : '';
    }

    if (hideBacklog && filterState.statuses.has('backlog')) {
        filterState.statuses.delete('backlog');
        const cb = document.querySelector('input[data-filter="status"][value="backlog"]');
        if (cb) cb.checked = false;
        updateFilterBadges();
        renderAfterFilterChange();
    }
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
    if (isList || getIsMobileCached()) renderListView();
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

    // Hide Backlog in filter when column OFF, clear from filter and refresh (plan: backlog-ux-golden-standard)
    applyBacklogFilterVisibility();

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
    const isMobile = getIsMobileCached();
    if (isMobile || document.getElementById('list-view').classList.contains('active')) renderListView();
    if (document.getElementById('projects').classList.contains('active')) {
        // Clear sorted view cache to force refresh with updated task data
        appState.projectsSortedView = null;
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
        updateTaskField('description', getTaskDescriptionHTML());
      }
    }

    if (modalId === 'task-modal' && hasUnsavedNewTask()) {
      // Show custom unsaved changes modal
      showUnsavedChangesModal(modalId);
      return;
    }
    if (modalId === 'task-modal') {
      closeTaskModal();
    } else {
      closeModal(modalId);
    }
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
                        updateTaskField('description', getTaskDescriptionHTML());
                    }
                    closeTaskModal();
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

            const isMobile = getIsMobileCached();
            if (isMobile || document.getElementById('list-view').classList.contains('active')) {
                renderListView();
            }
            if (document.getElementById('projects').classList.contains('active')) {
                // Clear sorted view cache to force refresh with updated tags
                appState.projectsSortedView = null;
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
            const isMobile = getIsMobileCached();
            if (isMobile || document.getElementById('list-view').classList.contains('active')) {
                renderListView();
            }
            if (document.getElementById('projects').classList.contains('active')) {
                // Clear sorted view cache to force refresh with updated tags
                appState.projectsSortedView = null;
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
    const isMobile = getIsMobileCached();

    container.innerHTML = generateTagsDisplayHTML(tags, {
        isMobile,
        getTagColor,
        escapeHtml,
        noTagsText: t('tasks.tags.none')
    });
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
        appState.projectsSortedView = null;
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
        appState.projectsSortedView = null;
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
    const isMobile = getIsMobileCached();
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
    const isMobile = getIsMobileCached();
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
    appState.projectsSortedView = null;
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
    appState.projectsSortedView = null;
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
export function initializeEventDelegation() {
    setupEventDelegation({
        toggleTheme,
        showCalendarView,
        toggleKanbanSettings,
        openProjectModal,
        openTaskModal,
        closeUserDropdown,
        openSettingsModal,
        openTaskModalForProject,
        openSelectedProjectFromTask,
        closeModal,
        closeTaskModal,
        closeConfirmModal,
        closeFeedbackDeleteModal,
        closeProjectConfirmModal,
        closeUnsavedChangesModal,
        openDeleteAccountModal,
        closeDeleteAccountModal,
        confirmDeleteAccount,
        closeDayItemsModal,
        closeDayItemsModalOnBackdrop,
        openTaskDetails,
        deleteTask,
        duplicateTask,
        copyTaskLink,
        confirmDelete,
        showProjectDetails,
        toggleProjectExpand,
        toggleProjectMenu,
        editProjectTitle,
        saveProjectTitle,
        cancelProjectTitle,
        handleDeleteProject,
        resetProjectTaskOrder,
        resetListViewTaskOrder,
        resetExpandedProjectTaskOrder,
        handleDuplicateProject,
        toggleProjectColorPicker,
        updateProjectColor,
        openCustomProjectColorPicker,
        navigateToProjectStatus,
        navigateToProjectTasksList,
        deleteProject,
        confirmProjectDelete,
        closeDuplicateProjectModal,
        confirmDuplicateProject,
        openSaveAsTemplateModal,
        closeSaveAsTemplateModal,
        confirmSaveAsTemplate,
        deleteTemplateById,
        openDeleteTemplateModal,
        closeDeleteTemplateModal,
        confirmDeleteTemplate,
        openRenameTemplateModal,
        closeRenameTemplateModal,
        confirmRenameTemplate,
        addFeedbackItem,
        deleteFeedbackItem,
        confirmFeedbackDelete,
        toggleHistoryEntryInline,
        formatTaskText,
        insertTaskHeading,
        insertTaskDivider,
        insertTaskChecklist,
        sortTable,
        toggleSortMode,
        animateCalendarMonthChange,
        goToToday,
        showDayTasks,
        addAttachment,
        addFileAttachment,
        addTag,
        removeTag,
        addProjectTag,
        removeProjectTag,
        addProjectDetailsTag,
        removeProjectDetailsTag,
        removeAttachment,
        removeDependency,
        removeTaskLink,
        downloadFileAttachment,
        viewFile,
        viewImageLegacy,
        openImageGallery,
        showErrorNotification,
        t,
        backToProjects,
        showAllActivity,
        backToDashboard,
        backToCalendar,
        openUpdatesFromNotification,
        openDueTodayFromNotification,
        dismissKanbanTip,
        confirmDiscardChanges,
        closeReviewStatusConfirmModal,
        confirmDisableReviewStatus,
        closeCalendarCreateModal,
        confirmCreateTask,
        addTaskFromDayItemsModal,
        signOut,
        exportDashboardData,
        closeExportDataModal,
        confirmExportData,
        openImportDataModal,
        closeImportDataModal,
        confirmImportData,
        generateReport,
        getCurrentMonth: () => currentMonth,
        getCurrentYear: () => currentYear,
        showStatusInfoModal,
        // Mass Edit functions
        toggleTaskSelection,
        closeMassEditPopover,
        clearMassEditPopover,
        queueMassEditChange,
        applyAllMassEditChanges,
        closeMassEditConfirm,
        closeMassEditConfirmOnBackdrop,
        applyMassEditConfirmed,
        closeMassDeleteConfirmModal,
        confirmMassDelete
    });
}

// === Mass Edit Event Listeners ===
let massEditListenersInitialized = false;

export function initializeMassEditListeners() {
    // Prevent duplicate event listeners
    if (massEditListenersInitialized) return;
    massEditListenersInitialized = true;

    // Select all checkbox in toolbar
    const massEditSelectAll = document.getElementById('mass-edit-select-all');
    if (massEditSelectAll) {
        massEditSelectAll.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectAllFilteredTasks();
            } else {
                clearMassEditSelection();
            }
        });
    }

    // Table header checkbox
    const tableSelectAll = document.getElementById('table-select-all');
    if (tableSelectAll) {
        tableSelectAll.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectAllFilteredTasks();
            } else {
                clearMassEditSelection();
            }
        });
    }

    // Clear button
    const clearBtn = document.getElementById('mass-edit-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => clearMassEditSelection());
    }

    // Field buttons (Status, Priority, Dates, Project, Tags)
    ['status', 'priority', 'dates', 'project', 'tags'].forEach(field => {
        const btn = document.getElementById(`mass-edit-${field}-btn`);
        if (btn) {
            btn.addEventListener('click', (e) => {
                openMassEditPopover(field, e.target);
            });
        }
    });

    // Close popover when clicking outside
    document.addEventListener('click', (e) => {
        const popover = document.getElementById('mass-edit-popover');
        if (!popover) return;

        const isPopoverClick = popover.contains(e.target);
        const isFieldButtonClick = e.target.closest('.mass-edit-btn');

        if (!isPopoverClick && !isFieldButtonClick) {
            closeMassEditPopover();
        }
    });

    // Close popover on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const popover = document.getElementById('mass-edit-popover');
            if (popover && popover.style.display !== 'none') {
                closeMassEditPopover();
            }
        }
    });
}

function clearAllFilters() {
    // Clear all filter states
    filterState.statuses.clear();
    filterState.statusExcludeMode = false;
    filterState.priorities.clear();
    filterState.priorityExcludeMode = false;
    filterState.projects.clear();
    filterState.projectExcludeMode = false;
    filterState.tags.clear();
    filterState.tagExcludeMode = false;
    filterState.linkTypes.clear();
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

function navigateToProjectTasksList(projectId) {
    window.location.hash = `tasks?view=list&project=${projectId}`;
}

window.navigateToProjectTasksList = navigateToProjectTasksList;

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

    // Status chips (label = "Status" or "Excluding" when exclude mode)
    const statusChipLabel = projectFilterState.statusExcludeMode ? t('tasks.filters.excluding') : t('projects.filters.status');
    projectFilterState.statuses.forEach((v) => {
        addChip(statusChipLabel, getProjectStatusLabel(v), () => {
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

    // Tags chips (label = "Tags" or "Excluding" when exclude mode)
    const tagsChipLabel = projectFilterState.tagExcludeMode ? t('tasks.filters.excluding') : t('projects.filters.tags');
    projectFilterState.tags.forEach((tag) => {
        addChip(tagsChipLabel, tag.toUpperCase(), () => {
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
    const filterTimer = debugTimeStart("filters", "projects", {
        totalProjects: projects.length,
        statusCount: projectFilterState.statuses.size,
        tagCount: projectFilterState.tags.size,
        taskFilter: projectFilterState.taskFilter || "",
        updatedFilter: projectFilterState.updatedFilter || "all",
        hasSearch: !!projectFilterState.search
    });
    let filtered = projects.slice();

    // Apply status filter (with exclude mode support)
    if (projectFilterState.statuses.size > 0) {
        filtered = filtered.filter(p => {
            const status = getProjectStatus(p.id);
            const matches = projectFilterState.statuses.has(status);
            return projectFilterState.statusExcludeMode ? !matches : matches;
        });
    }

    // Apply task filter
    if (projectFilterState.taskFilter === 'has-tasks') {
        filtered = filtered.filter(p => tasks.some(t => t.projectId === p.id));
    } else if (projectFilterState.taskFilter === 'no-tasks') {
        filtered = filtered.filter(p => !tasks.some(t => t.projectId === p.id));
    }

    // Apply tags filter (with exclude mode support)
    if (projectFilterState.tags.size > 0) {
        filtered = filtered.filter(p => {
            const hasTags = p.tags && p.tags.length > 0;
            const matches = hasTags && Array.from(projectFilterState.tags).some(tag => p.tags.includes(tag));
            return projectFilterState.tagExcludeMode ? !matches : matches;
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
    debugTimeEnd("filters", filterTimer, {
        totalProjects: projects.length,
        filteredCount: filtered.length
    });
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
        const statusOrder = { 'active': 0, 'planning': 1, 'backlog': 2, 'completed': 3 };
        view.sort((a, b) => {
            const statusA = getProjectStatus(a.id);
            const statusB = getProjectStatus(b.id);
            const result = (statusOrder[statusA] || 999) - (statusOrder[statusB] || 999);
            return isDesc ? -result : result;
        });
        appState.projectsSortedView = view;
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

    appState.projectsSortedView = view;
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
    container.innerHTML = appState.projectsSortedView.map(generateProjectItemHTML).join('');

    // Restore expanded state
    expandedProjects.forEach(projectId => {
        const item = document.getElementById(`project-item-${projectId}`);
        if (item) {
            item.classList.add('expanded');
        }
    });

    renderMobileProjects(appState.projectsSortedView);
    scheduleExpandedTaskRowLayoutUpdate(container);
    setupExpandedProjectsDragDrop();
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

        // Add include/exclude toggle handlers for project status
        const statusToggle = statusFilterGroup.querySelector('.filter-mode-toggle[data-filter-type="project-status"]');
        if (statusToggle) {
            const includeBtn = statusToggle.querySelector('.filter-mode-btn[data-mode="include"]');
            const excludeBtn = statusToggle.querySelector('.filter-mode-btn[data-mode="exclude"]');
            
            if (includeBtn) {
                includeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (projectFilterState.statusExcludeMode) {
                        projectFilterState.statusExcludeMode = false;
                        updateProjectFilterModeUI('project-status');
                        applyProjectFilters();
                    }
                });
            }
            if (excludeBtn) {
                excludeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!projectFilterState.statusExcludeMode) {
                        projectFilterState.statusExcludeMode = true;
                        updateProjectFilterModeUI('project-status');
                        applyProjectFilters();
                    }
                });
            }
        }
    }

    // Project tags filter
    const tagsFilterGroup = document.getElementById('group-project-tags');
    if (tagsFilterGroup) {
        // Add include/exclude toggle handlers for project tags
        const tagsToggle = tagsFilterGroup.querySelector('.filter-mode-toggle[data-filter-type="project-tags"]');
        if (tagsToggle) {
            const includeBtn = tagsToggle.querySelector('.filter-mode-btn[data-mode="include"]');
            const excludeBtn = tagsToggle.querySelector('.filter-mode-btn[data-mode="exclude"]');
            
            if (includeBtn) {
                includeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (projectFilterState.tagExcludeMode) {
                        projectFilterState.tagExcludeMode = false;
                        updateProjectFilterModeUI('project-tags');
                        applyProjectFilters();
                    }
                });
            }
            if (excludeBtn) {
                excludeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!projectFilterState.tagExcludeMode) {
                        projectFilterState.tagExcludeMode = true;
                        updateProjectFilterModeUI('project-tags');
                        applyProjectFilters();
                    }
                });
            }
        }
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
    scheduleExpandedTaskRowLayoutUpdate(container);
    setupExpandedProjectsDragDrop();
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
    let initialBase = appState.projectsSortedView && appState.projectsSortedView.length ? appState.projectsSortedView.slice() : projects.slice();

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
            if (getIsMobileCached()) {
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

// ================================
// DESKTOP SIDEBAR COLLAPSE
// ================================

function initDesktopSidebarToggle() {
    // Mobile has its own slide-in sidebar — this toggle is desktop only
    if (window.innerWidth <= 768) return;

    const sidebar = document.querySelector('.sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');

    if (!sidebar || !collapseBtn) return;

    const ICON_RAIL_WIDTH = 52;   // px — icon-only mode
    const TRANSITION_MS = 260;

    function collapseSidebar() {
        // Save expanded width (skip if already in icon-rail mode)
        const currentWidth = sidebar.getBoundingClientRect().width;
        if (currentWidth > ICON_RAIL_WIDTH + 10) {
            localStorage.setItem('sidebarWidth', Math.round(currentWidth));
        }
        // Hide text FIRST (instant), then animate width — no squishing
        sidebar.classList.add('collapsed');
        sidebar.classList.add('animating');
        sidebar.style.width = ICON_RAIL_WIDTH + 'px';
        localStorage.setItem('sidebarCollapsed', 'true');
        setTimeout(() => sidebar.classList.remove('animating'), TRANSITION_MS);
    }

    function expandSidebar() {
        const savedWidth = parseInt(localStorage.getItem('sidebarWidth'), 10) || 280;
        // Pin sidebar's direct children at the target width so they don't reflow
        // as the sidebar grows. overflow:hidden on .sidebar creates a smooth
        // wipe-reveal — content is already in its final layout, just clipped.
        const children = Array.from(sidebar.children);
        children.forEach(el => {
            el.style.width = savedWidth + 'px';
            el.style.minWidth = savedWidth + 'px';
        });
        sidebar.classList.add('animating');
        sidebar.classList.remove('collapsed'); // switch to full layout immediately — no end-of-animation pop
        sidebar.style.width = savedWidth + 'px';
        localStorage.setItem('sidebarCollapsed', 'false');
        setTimeout(() => {
            sidebar.classList.remove('animating');
            children.forEach(el => {
                el.style.width = '';
                el.style.minWidth = '';
            });
        }, TRANSITION_MS);
    }

    // Single button acts as toggle
    collapseBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('collapsed')) {
            expandSidebar();
        } else {
            collapseSidebar();
        }
    });

    // Restore saved state on load — no animation (instant)
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.style.width = ICON_RAIL_WIDTH + 'px';
        sidebar.classList.add('collapsed');
    } else {
        const savedWidth = parseInt(localStorage.getItem('sidebarWidth'), 10);
        if (savedWidth) sidebar.style.width = savedWidth + 'px';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDesktopSidebarToggle);
} else {
    initDesktopSidebarToggle();
}

window.addEventListener('resize', () => {
    scheduleExpandedTaskRowLayoutUpdate();
});























