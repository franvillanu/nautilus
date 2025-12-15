let projects = [];
let tasks = [];
let feedbackItems = [];
let currentFeedbackScreenshotData = "";
let projectCounter = 1;
let taskCounter = 1;
let feedbackCounter = 1;
let selectedCards = new Set();
let projectToDelete = null;
let tempAttachments = [];

// === Settings ===
let settings = {
    autoSetStartDateOnStatusChange: false, // Auto-set start date when status changes
    autoSetEndDateOnStatusChange: false,   // Auto-set end date when status changes
    historySortOrder: 'newest', // 'newest' (default) or 'oldest' first
    customWorkspaceLogo: null // Data URL for custom workspace logo image
};

let workspaceLogoDraft = {
    hasPendingChange: false,
    dataUrl: null
};

let defaultWorkspaceIconText = null;

import { loadData, saveData } from "./storage-client.js";
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
// User profile is now managed by auth.js via window.authSystem
import { generateWordReport } from "./src/services/reportGenerator.js";

// Expose storage functions for historyService
window.saveData = saveData;
window.loadData = loadData;

// Guard to avoid persisting to storage while the app is initializing/loading
let isInitializing = false;

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

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showSuccessNotification(message) {
    showNotification(message, 'success');
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
    if (sortLabel) sortLabel.textContent = 'Sort: Priority';
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
    if (!sortToggle || !sortBtn) return;
    // Show only when Kanban board is visible
    const kanban = document.querySelector('.kanban-board');
    const isKanban = kanban && !kanban.classList.contains('hidden');
    sortToggle.style.display = isKanban ? 'flex' : 'none';
    // Keep the button as a static one-time action label (Order by Priority).
    // Manual mode may exist internally (via dragging), but the button UI should not change to "Manual".
    try { sortBtn.classList.remove('manual'); } catch (e) {}
    if (sortLabel) sortLabel.textContent = 'Order by Priority';
    if (sortIcon) sortIcon.textContent = '⇅';

    // If the currently visible ordering already matches priority ordering, disable the button
    try {
        // Using imported PRIORITY_ORDER
        const statuses = ['todo', 'progress', 'review', 'done'];
        const filtered = typeof getFilteredTasks === 'function' ? getFilteredTasks() : tasks.slice();

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
    try {
        await saveAllData(tasks, projects, feedbackItems);
    } catch (error) {
        console.error("Error persisting data:", error);
        showErrorNotification("Failed to save data. Please try again.");
        throw error;
    }
}

async function saveProjects() {
    if (isInitializing) return;
    try {
        await saveProjectsData(projects);
    } catch (error) {
        console.error("Error saving projects:", error);
        showErrorNotification("Failed to save projects. Please try again.");
        throw error;
    }
}

async function saveTasks() {
    if (isInitializing) return;
    try {
        await saveTasksData(tasks);
    } catch (error) {
        console.error("Error saving tasks:", error);
        showErrorNotification("Failed to save tasks. Please try again.");
        throw error;
    }
}

async function saveFeedback() {
    if (isInitializing) return;
    try {
        await saveFeedbackItemsData(feedbackItems);
    } catch (error) {
        console.error("Error saving feedback:", error);
        showErrorNotification("Failed to save feedback. Please try again.");
        throw error;
    }
}

async function saveProjectColors() {
    if (isInitializing) return;
    try {
        await saveProjectColorsData(projectColorMap);
    } catch (error) {
        console.error("Error saving project colors:", error);
        showErrorNotification("Failed to save project colors.");
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
        }
    } catch (e) {
        console.error("Error loading settings:", e);
    }
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

async function loadDataFromKV() {
    const { tasks: loadedTasks, projects: loadedProjects, feedbackItems: loadedFeedback } = await loadAllData();

    projects = loadedProjects || [];
    tasks = loadedTasks || [];
    feedbackItems = loadedFeedback || [];

    // Normalize IDs to numbers
    projects.forEach(p => {
        if (p && p.id != null) p.id = parseInt(p.id, 10);
    });
    tasks.forEach(t => {
        if (t) {
            if (t.id != null) t.id = parseInt(t.id, 10);
            if (t.projectId != null && t.projectId !== "null") {
                t.projectId = parseInt(t.projectId, 10);
            } else {
                t.projectId = null;
            }
            // Migration: Add startDate and endDate fields if missing
            if (t.startDate === undefined) t.startDate = "";
            if (t.endDate === undefined) t.endDate = "";

            // Migration: Convert dueDate to endDate
            if (t.dueDate && !t.endDate) {
                t.endDate = t.dueDate;
            }
            // Remove dueDate field (no longer used)
            delete t.dueDate;
        }
    });
    feedbackItems.forEach(f => {
        if (f && f.id != null) f.id = parseInt(f.id, 10);
    });

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
            noProjectLi.innerHTML = `<label><input type="checkbox" id="proj-none" value="none" data-filter="project" ${checked}> No Project</label>`;
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
            li.textContent = "No other projects";
            li.style.color = "var(--text-muted)";
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
            noTagsLi.innerHTML = `<label><input type="checkbox" id="tag-none" value="none" data-filter="tag" ${noTagsChecked}> No Tags</label>`;
            tagUl.appendChild(noTagsLi);
        } else {
            if (currentlySelected.has('none')) {
                filterState.tags.delete('none');
                updateFilterBadges();
            }
        }
        
        if (allTags.size === 0) {
            const li = document.createElement("li");
            li.textContent = "No other tags";
            li.style.color = "var(--text-muted)";
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

    // Show/hide project select-all based on number of projects
    const selectAllProjectRow = document.getElementById("project-select-all");
    if (selectAllProjectRow && selectAllProjectRow.parentElement.parentElement) {
        if (projects.length > 1) {
            selectAllProjectRow.parentElement.parentElement.style.display = 'block';
        } else {
            selectAllProjectRow.parentElement.parentElement.style.display = 'none';
        }
    }

    // Open/close dropdown panels for Status, Priority, Project, Tags, Date Preset
    const groups = [
        document.getElementById("group-status"),
        document.getElementById("group-priority"),
        document.getElementById("group-project"),
        document.getElementById("group-tags"),
        document.getElementById("group-date-preset"),
    ].filter(Boolean);

    groups.forEach((g) => {
        const btn = g.querySelector(".filter-button");
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = g.classList.contains("open");
            groups.forEach((x) => x.classList.remove("open"));
            if (!isOpen) g.classList.add("open");
        });

        // keep panel open when clicking inside (so multiple checks don't close it)
        const panel = g.querySelector(".dropdown-panel");
        if (panel) {
            panel.addEventListener("click", (e) => e.stopPropagation());
        }
    });

    // Clicking anywhere else closes panels
    document.addEventListener("click", () =>
        groups.forEach((g) => g.classList.remove("open"))
    );

    // Checkboxes for status, priority, project, and tags
    document.querySelectorAll('.dropdown-panel input[type="checkbox"]').forEach((cb) => {
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

    const hasFilters =
        (filterState.search && filterState.search.trim() !== "") ||
        filterState.statuses.size > 0 ||
        filterState.priorities.size > 0 ||
        filterState.projects.size > 0 ||
        filterState.tags.size > 0 ||
        filterState.datePresets.size > 0 ||
        (filterState.dateFrom && filterState.dateFrom !== "") ||
        (filterState.dateTo && filterState.dateTo !== "");

    btn.style.display = hasFilters ? "inline-flex" : "none";
}

// Update numeric badges for each dropdown
function updateFilterBadges() {
    const b1 = document.getElementById("badge-status");
    const b2 = document.getElementById("badge-priority");
    const b3 = document.getElementById("badge-project");
    const b4 = document.getElementById("badge-tags");
    const bDate = document.getElementById("badge-date-preset");

    if (b1) b1.textContent = filterState.statuses.size === 0 ? "All" : filterState.statuses.size;
    if (b2) b2.textContent = filterState.priorities.size === 0 ? "All" : filterState.priorities.size;
    if (b3) b3.textContent = filterState.projects.size === 0 ? "All" : filterState.projects.size;
    if (b4) b4.textContent = filterState.tags.size === 0 ? "All" : filterState.tags.size;

    // Date preset badge - show count like other filters
    if (bDate) bDate.textContent = filterState.datePresets.size === 0 ? "All" : filterState.datePresets.size;

    renderActiveFilterChips();
    updateClearButtonVisibility();
}

// Show active filter "chips" under the toolbar
function renderActiveFilterChips() {
    const wrap = document.getElementById("active-filters");
    if (!wrap) return;
    wrap.innerHTML = "";

    const addChip = (label, value, onRemove) => {
        const chip = document.createElement("span");
        chip.className = "filter-chip";
        chip.innerHTML = `${label}: ${value} <button class="chip-remove" aria-label="Remove">×</button>`;
        chip.querySelector("button").addEventListener("click", onRemove);
        wrap.appendChild(chip);
    };

    // Search chip
    if (filterState.search)
        addChip("Search", filterState.search, () => {
            filterState.search = "";
            const el = document.getElementById("filter-search");
            if (el) el.value = "";
            updateFilterBadges(); // Ensure badges are updated
            updateClearButtonVisibility(); // Update clear button state
            renderAfterFilterChange();
        });

    // Status chips
    filterState.statuses.forEach((v) =>
        addChip("Status", STATUS_LABELS[v] || v, () => {
            filterState.statuses.delete(v);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="status"][value="${v}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        })
    );

    // Priority chips
    filterState.priorities.forEach((v) =>
        addChip("Priority", v, () => {
            filterState.priorities.delete(v);
            const cb = document.querySelector(
                `input[type="checkbox"][data-filter="priority"][value="${v}"]`
            );
            if (cb) cb.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        })
    );

    // Project chips
    filterState.projects.forEach((pid) => {
        const proj = projects.find((p) => p.id.toString() === pid.toString());
        addChip("Project", proj ? proj.name : pid, () => {
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
        addChip("Tag", tag, () => {
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
            "no-date": "No Due Date",
            "overdue": "Overdue",
            "today": "Due Today",
            "tomorrow": "Due Tomorrow",
            "7days": "Due in 7 Days",
            "week": "Due This Week",
            "month": "Due This Month"
        };
        const label = datePresetLabels[preset] || preset;
        addChip("Date", label, () => {
            filterState.datePresets.delete(preset);
            // Uncheck the corresponding checkbox
            const checkbox = document.querySelector(`input[type="checkbox"][data-filter="date-preset"][value="${preset}"]`);
            if (checkbox) checkbox.checked = false;
            updateFilterBadges();
            renderAfterFilterChange();
        });
    });

    // Date range chips
    if (filterState.dateFrom || filterState.dateTo) {
        let dateLabel = "";
        if (filterState.dateFrom && filterState.dateTo) {
            dateLabel = `${formatDate(filterState.dateFrom)} - ${formatDate(filterState.dateTo)}`;
        } else if (filterState.dateFrom) {
            dateLabel = `From ${formatDate(filterState.dateFrom)}`;
        } else if (filterState.dateTo) {
            dateLabel = `Until ${formatDate(filterState.dateTo)}`;
        }
        addChip("Date", dateLabel, () => {
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
    }
    if (filterState.dateTo && filterState.dateTo !== "") {
        params.set("dateTo", filterState.dateTo);
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
                    case "no-date":
                        return !task.endDate || task.endDate === "";

                    case "overdue":
                        return task.endDate && task.endDate < today;

                    case "today":
                        return task.endDate === today;

                    case "tomorrow":
                        const tomorrow = new Date(todayDate);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const tomorrowStr = tomorrow.toISOString().split('T')[0];
                        return task.endDate === tomorrowStr;

                    case "7days":
                        // Due exactly in 7 days
                        const sevenDays = new Date(todayDate);
                        sevenDays.setDate(sevenDays.getDate() + 7);
                        const sevenDaysStr = sevenDays.toISOString().split('T')[0];
                        return task.endDate === sevenDaysStr;

                    case "week":
                        // Due within the next 7 days (including today)
                        const weekEnd = new Date(todayDate);
                        weekEnd.setDate(weekEnd.getDate() + 7);
                        const weekEndStr = weekEnd.toISOString().split('T')[0];
                        return task.endDate && task.endDate >= today && task.endDate <= weekEndStr;

                    case "month":
                        // Due within the next 30 days (including today)
                        const monthEnd = new Date(todayDate);
                        monthEnd.setDate(monthEnd.getDate() + 30);
                        const monthEndStr = monthEnd.toISOString().split('T')[0];
                        return task.endDate && task.endDate >= today && task.endDate <= monthEndStr;

                    default:
                        return true;
                }
            });
        }
        // Date range filter - check if task date range overlaps with filter date range
        else if (dateFrom || dateTo) {
// Task must have at least an end date to be filtered by date
            if (!task.endDate) {
                dOK = false;
} else {
                const taskStart = task.startDate || task.endDate; // Use endDate as start if no startDate
                const taskEnd = task.endDate;

                // Check if task date range is within filter date range
                if (dateFrom && dateTo) {
                    if (dateFrom === dateTo) {
                        // Same date - treat as "due on this date" (only check end date)
                        dOK = taskEnd === dateTo;
} else {
                        // Different dates - task must be completely within the range
                        dOK = taskStart >= dateFrom && taskEnd <= dateTo;
}
                } else if (dateFrom) {
                    // Only "from" date - task must start on or after this date
                    dOK = taskStart >= dateFrom;
} else if (dateTo) {
                    // Only "to" date - task must end on or before this date
                    dOK = taskEnd <= dateTo;
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
  const dateConfig = {
    dateFormat: "d/m/Y",
    altInput: false,
    allowInput: true,
    locale: { firstDayOfWeek: 1 },
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
    fp.setDate = function (date, triggerChange, ...rest) {
      // Any programmatic set should not persist. Even if triggerChange is true, we guard it.
      fp.__suppressChange = true;
      const res = origSetDate(date, triggerChange, ...rest);
      setTimeout(() => (fp.__suppressChange = false), 0);
      return res;
    };
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
      displayInput.placeholder = "dd/mm/yyyy";
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

      const fp = flatpickr(displayInput, {
        ...dateConfig,
        defaultDate: initialISO ? new Date(initialISO) : null,
        onOpen(_, __, inst) {
          if (!input.value && !inst.selectedDates.length) {
            inst.jumpToDate(new Date());
          }
        },
        onChange: function (selectedDates) {
          // Sync hidden ISO value
          let iso = "";
          if (selectedDates.length > 0) {
            const d = selectedDates[0];
            iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
              d.getDate()
            ).padStart(2, "0")}`;
          }
          input.value = iso;

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
          const form = document.getElementById("task-form");
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
      const fp = flatpickr(input, {
        ...dateConfig,
        defaultDate: null,
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

async function init() {
    // Don't initialize if not authenticated (auth.js will call this when ready)
    if (!localStorage.getItem('authToken') && !localStorage.getItem('adminToken')) {
        console.log('Waiting for authentication before initializing app...');
        return;
    }

    // Clear old data before loading new user's data
    // This ensures clean state when switching users
    projects = [];
    tasks = [];
    feedbackItems = [];
    projectCounter = 1;
    taskCounter = 1;

    isInitializing = true;
    await loadDataFromKV();
    await loadSortPreferences(); // load saved sort mode and manual order
    await loadProjectColors(); // Load project color preferences
    await loadSettings(); // Load app settings (history sort order, etc.)
    applyWorkspaceLogo(); // Apply any custom workspace logo

    // Load history
    if (window.historyService) {
        await window.historyService.loadHistory();
    }

    // Basic app setup
    setupNavigation();
    setupStatusDropdown();
    setupPriorityDropdown();
    setupProjectDropdown();
    setupUserMenus();
    hydrateUserProfile();
    initializeDatePickers();
    initFiltersUI();
    setupModalTabs();

    // Finished initializing — allow saves again
    isInitializing = false;


    // Check for URL hash
    const hash = window.location.hash.slice(1);
    const validPages = ['dashboard', 'projects', 'tasks', 'feedback', 'calendar'];

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
            renderCalendar();
        }
    }

    // Initial rendering
    render();

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
            document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
            showPage('dashboard/recent_activity');
        } else if (page.startsWith('project-')) {
            const projectId = parseInt(page.replace('project-', ''));
            document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
            showProjectDetails(projectId);
        } else if (page === 'calendar') {
            // Avoid thrashing: highlight and ensure calendar is visible
            document.querySelector('.nav-item.calendar-nav')?.classList.add('active');
            showCalendarView();
        } else if (page === 'tasks') {
            document.querySelector('.nav-item[data-page="tasks"]')?.classList.add("active");

            // Apply ALL filters from URL parameters BEFORE showing page

            // Search filter
            if (params.has('search')) {
                filterState.search = params.get('search') || '';
            }

            // Status filters
            if (params.has('status')) {
                const statuses = params.get('status').split(',').filter(Boolean);
                filterState.statuses.clear();
                statuses.forEach(s => filterState.statuses.add(s.trim()));
            }

            // Priority filters
            if (params.has('priority')) {
                const priorities = params.get('priority').split(',').filter(Boolean);
                filterState.priorities.clear();
                priorities.forEach(p => filterState.priorities.add(p.trim()));
            }

            // Project filters
            if (params.has('project')) {
                const projectIds = params.get('project').split(',').filter(Boolean);
                filterState.projects.clear();
                projectIds.forEach(id => filterState.projects.add(id.trim()));
            }

            // Tag filters
            if (params.has('tags')) {
                const tags = params.get('tags').split(',').filter(Boolean);
                filterState.tags.clear();
                tags.forEach(t => filterState.tags.add(t.trim()));
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
            } else if (params.has('dateFrom') || params.has('dateTo')) {
                const dateFrom = params.get('dateFrom') || '';
                const dateTo = params.get('dateTo') || '';
                filterState.dateFrom = dateFrom;
                filterState.dateTo = dateTo;
                // Clear preset when manual dates are set
                filterState.datePresets.clear();
            }

            // Now show the page (which will render with updated filters)
            showPage('tasks');

            // Update ALL filter UI inputs after page is shown (use setTimeout to ensure DOM is ready)
            setTimeout(() => {
                // Search input
                if (params.has('search')) {
                    const searchEl = document.getElementById('filter-search');
                    if (searchEl) searchEl.value = filterState.search;
                }

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
        } else if (page === 'projects') {
            document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
            showPage('projects');
        } else if (page === 'feedback') {
            document.querySelector('.nav-item[data-page="feedback"]')?.classList.add("active");
            showPage('feedback');
        } else if (page === '' || page === 'dashboard') {
            document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
            showPage('dashboard');
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
            e.target.classList.add("active");

            const view = e.target.textContent.toLowerCase();

            document.querySelector(".kanban-board").classList.add("hidden");
            document.getElementById("list-view").classList.remove("active");
            document.getElementById("calendar-view").classList.remove("active");

            if (view === "list") {
                document.getElementById("list-view").classList.add("active");
                renderListView();
                updateSortUI();
                // ensure kanban header is in default state
                try{ document.querySelector('.kanban-header')?.classList.remove('calendar-mode'); }catch(e){}
                // Hide kanban settings in list view
                const kanbanSettingsContainer = document.getElementById('kanban-settings-btn')?.parentElement;
                if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = 'none';
            } else if (view === "kanban") {
                document.querySelector(".kanban-board").classList.remove("hidden");
                renderTasks();
                updateSortUI();
                // ensure kanban header is in default state
                try{ document.querySelector('.kanban-header')?.classList.remove('calendar-mode'); }catch(e){}
                // Show kanban settings in kanban view
                const kanbanSettingsContainer = document.getElementById('kanban-settings-btn')?.parentElement;
                if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = '';
            } else if (view === "calendar") {
                const cal = document.getElementById("calendar-view");
                if (!cal) return;
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
                    });
                });
            }
        });
    });
    
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
        week: 'this week',
        month: 'this month', 
        quarter: 'this quarter'
    };
    
    const label = periodLabels[period] || 'this week';
    
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

                // Update URL hash for bookmarking
                window.location.hash = page;

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
        renderProjects();
        // Initialize projects header controls fresh whenever Projects page is shown
        try { setupProjectsControls(); } catch (e) { /* ignore */ }
    } else if (pageId === "tasks") {
        updateCounts();
        renderTasks();
        renderListView();

        // Only reset to Kanban if NOT coming from calendar hash
        if (window.location.hash !== '#calendar') {
            document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
            document.querySelector(".view-btn:nth-child(1)").classList.add("active");
            document.querySelector(".kanban-board").classList.remove("hidden");
            document.getElementById("list-view").classList.remove("active");
            document.getElementById("calendar-view").classList.remove("active");
                // ensure header is in default (kanban) layout so Add Task stays right-aligned
                try{ document.querySelector('.kanban-header')?.classList.remove('calendar-mode'); }catch(e){}
                // Show kanban settings in tasks kanban view
                const kanbanSettingsContainer = document.getElementById('kanban-settings-btn')?.parentElement;
                if (kanbanSettingsContainer) kanbanSettingsContainer.style.display = '';
        }
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
    renderListView();
    if (document.getElementById("calendar-view").classList.contains("active")) {
        renderCalendar();
    }
}

function renderDashboard() {
    updateDashboardStats();
    renderProjectProgressBars();
    renderActivityFeed();
    renderInsights();
    animateDashboardElements();
}

function updateDashboardStats() {
    // Hero stats
    const activeProjects = projects.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length;
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
    
    // Enhanced stats
    const inProgressTasks = tasks.filter(t => t.status === 'progress').length;
    const pendingTasks = tasks.filter(t => t.status === 'todo').length;
    const reviewTasks = tasks.filter(t => t.status === 'review').length;
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => t.endDate && t.endDate < today && t.status !== 'done').length;
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
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
    
    document.getElementById('progress-change').textContent = `+${Math.max(1, Math.floor(tasks.length * 0.1))} this week`;
    document.getElementById('pending-change').textContent = dueTodayCount > 0 ? `${dueTodayCount} due today` : 'On track';
    document.getElementById('completed-change').textContent = `+${thisWeekCompleted} this week`;
    document.getElementById('overdue-change').textContent = document.getElementById('overdue-tasks').textContent > 0 ? 'Needs attention' : 'All on track';

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
        criticalHighPriority > 0 ? `${criticalHighPriority} critical` : 'On track';
    const completedProjects = projects.filter(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const completedProjectTasks = projectTasks.filter(t => t.status === 'done');
        return projectTasks.length > 0 && completedProjectTasks.length === projectTasks.length;
    }).length;
    document.getElementById('milestones-change').textContent = completedProjects > 0 ? `${completedProjects} completed` : 'In progress';
}

function renderProjectProgressBars() {
    const container = document.getElementById('project-progress-bars');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">🌊</div>
                <div style="font-size: 16px; margin-bottom: 8px;">No research waves yet</div>
                <div style="font-size: 14px;">Create your first project to see progress visualization</div>
            </div>
        `;
        return;
    }
    
    const progressBars = projects.slice(0, 5).map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
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
            <div class="progress-bar-item clickable-project" data-action="showProjectDetails" data-param="${project.id}" style="margin-bottom: 20px; cursor: pointer; transition: all 0.2s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600; color: var(--text-primary);">${project.name}</span>
                    <span style="font-size: 12px; color: var(--text-muted);">${completed}/${total} tasks</span>
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
        activities.push({
            type: 'completed',
            text: `Completed "${task.title}" ${project ? `in ${project.name}` : ''}`,
            timeText: formatRelativeTime(activityDate),
            date: activityDate,
            icon: '✅'
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
            text: `Created new research project "${project.name}"`,
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
        activities.push({
            type: 'created',
            text: `Added new task "${task.title}" ${project ? `to ${project.name}` : ''}`,
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
                    <div class="activity-text">Welcome to your Research Dashboard!</div>
                    <div class="activity-time">Start creating projects and tasks to see activity</div>
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
                <div class="activity-time">${activity.timeText || 'Recently'}</div>
            </div>
            <div class="activity-date">${formatActivityDate(activity.date)}</div>
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
                <button class="back-btn" data-action="backToDashboard">← Back to Dashboard</button>
                <h2>All Recent Activity</h2>
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
                    <h1 class="page-title">All Recent Activity</h1>
                    <p class="page-subtitle">Full history of your recent work</p>
                </div>
                <button class="view-all-btn back-btn" data-action="backToDashboard">← Back to Dashboard</button>
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
        activities.push({
            type: 'completed',
            text: `Completed "${task.title}" ${project ? `in ${project.name}` : ''}`,
            date: activityDate,
            icon: '✅'
        });
    });
    
    // All projects
    projects
        .sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate))
        .forEach(project => {
            activities.push({
                type: 'created',
                text: `Created new research project "${project.name}"`,
                date: project.createdAt || project.createdDate,
                icon: '🚀'
            });
        });
    
    // All tasks
    tasks
        .sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate))
        .forEach(task => {
            const project = projects.find(p => p.id === task.projectId);
            activities.push({
                type: 'created',
                text: `Added new task "${task.title}" ${project ? `to ${project.name}` : ''}`,
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
            <div class="activity-full-date">${new Date(activity.date).toLocaleDateString('en-US', { 
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
                title: 'Excellent Progress',
                description: `${completionRate.toFixed(0)}% completion rate exceeds research standards. Great momentum!`
            });
        } else if (completionRate >= 60) {
            insights.push({
                type: 'success',
                icon: '📈',
                title: 'Good Progress',
                description: `${completionRate.toFixed(0)}% completion rate is solid. Consider pushing to reach 80% target.`
            });
        } else if (completionRate >= 30) {
            insights.push({
                type: 'warning',
                icon: '⚡',
                title: 'Progress Opportunity',
                description: `${completionRate.toFixed(0)}% completion rate. Focus on completing current tasks to build momentum.`
            });
        } else {
            insights.push({
                type: 'priority',
                icon: '🚨',
                title: 'Action Needed',
                description: `${completionRate.toFixed(0)}% completion rate is low. Break down large tasks and tackle smaller ones first.`
            });
        }
    }
    
    // Due today tasks
    if (todayTasks > 0) {
        insights.push({
            type: 'priority',
            icon: '📅',
            title: 'Today\'s Focus',
            description: `${todayTasks} task${todayTasks > 1 ? 's are' : ' is'} due today. Prioritize these for maximum impact.`
        });
    }
    
    // Overdue tasks (only if not already covered by today's tasks)
    if (overdueTasks > 0 && todayTasks === 0) {
        insights.push({
            type: 'warning',
            icon: '⏰',
            title: 'Overdue Items',
            description: `${overdueTasks} overdue task${overdueTasks > 1 ? 's need' : ' needs'} attention. Address these to prevent delays.`
        });
    }
    
    // High priority tasks
    if (highPriorityTasks > 0) {
        const urgentCount = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
        if (urgentCount > 0) {
            insights.push({
                type: 'priority',
                icon: '🔥',
                title: 'High Priority Focus',
                description: `${urgentCount} high-priority task${urgentCount > 1 ? 's need' : ' needs'} immediate attention.`
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
                title: 'Empty Projects',
                description: `${projectsWithoutTasks} project${projectsWithoutTasks > 1 ? 's have' : ' has'} no tasks yet. Add tasks to track progress.`
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
                title: 'Strong Momentum',
                description: `${recentlyCompleted} tasks completed this week. You\'re in a productive flow!`
            });
        }
    }
    
    // Default insights for empty state
    if (insights.length === 0) {
        if (totalTasks === 0) {
            insights.push({
                type: 'priority',
                icon: '🌊',
                title: 'Ready to Start',
                description: 'Create your first project and add some tasks to begin tracking your research progress.'
            });
        } else {
            insights.push({
                type: 'success',
                icon: '✅',
                title: 'All Caught Up',
                description: 'Great work! No urgent items detected. Consider planning your next research milestones.'
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
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
}

// Quick action functions
function signOut() {
    if (window.authSystem && window.authSystem.logout) {
        window.authSystem.logout();
    }
}

function exportDashboardData() {
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
            showNotification(`✅ Reporte generado: ${result.filename}`, 'success');

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

    document.querySelectorAll(".tasks-table th span").forEach((span) => {
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
                    const order = { todo: 0, progress: 1, review: 2, done: 3 };
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
            }
            if (aVal < bVal) return currentSort.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return currentSort.direction === "asc" ? 1 : -1;
            return 0;
        });
    }

    tbody.innerHTML = rows.map((t) => {
        const statusClass = `task-status-badge ${t.status}`;
        const proj = projects.find((p) => p.id === t.projectId);
        const projName = proj ? proj.name : "No Project";
        const start = t.startDate ? formatDate(t.startDate) : "No date";
        const due = t.endDate ? formatDate(t.endDate) : "No date";
        const prText = t.priority ? t.priority[0].toUpperCase() + t.priority.slice(1) : "";

        const tagsHTML = t.tags && t.tags.length > 0
            ? t.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join('')
            : '';

        const projectIndicator = proj
            ? `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${getProjectColor(proj.id)}; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>`
            : '';

        return `
            <tr data-action="openTaskDetails" data-param="${t.id}">
                <td>${projectIndicator}${escapeHtml(t.title || "")}</td>
                <td><span class="priority-badge priority-${t.priority}">${prText}</span></td>
                <td><span class="${statusClass}"><span class="status-dot ${t.status}"></span>${STATUS_LABELS[t.status] || ""}</span></td>
                <td>${tagsHTML || '<span style="color: var(--text-muted); font-size: 12px;">—</span>'}</td>
                <td>${escapeHtml(projName)}</td>
                <td>${start}</td>
                <td>${due}</td>
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
function getSmartDateInfo(endDate) {
    if (!endDate) return { text: "No due date", class: "" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(endDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);
        return {
            text: daysOverdue === 1 ? "Yesterday" : `${daysOverdue} days overdue`,
            class: "overdue"
        };
    } else if (diffDays === 0) {
        return { text: "Today", class: "today" };
    } else if (diffDays === 1) {
        return { text: "Tomorrow", class: "soon" };
    } else if (diffDays <= 7) {
        return { text: `In ${diffDays} days`, class: "soon" };
    } else {
        return { text: formatDate(endDate), class: "" };
    }
}

// Render premium mobile cards
function renderMobileCardsPremium(tasks) {
    const container = document.getElementById("tasks-list-mobile");
    if (!container) return;

    // Empty state
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="tasks-list-mobile-empty">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3>No tasks found</h3>
                <p>Try adjusting your filters or create a new task</p>
            </div>
        `;
        return;
    }

    // Render cards
    container.innerHTML = tasks.map((task) => {
        const proj = projects.find((p) => p.id === task.projectId);
        const projColor = proj ? getProjectColor(proj.id) : "#999";
        const dateInfo = getSmartDateInfo(task.endDate);

        // Strip HTML from description
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = task.description || '';
        const descText = (tempDiv.textContent || tempDiv.innerText || '').trim();

        // Tags
        const tagsHTML = task.tags && task.tags.length > 0
            ? task.tags.map(tag => `<span class="card-tag-premium">${escapeHtml(tag)}</span>`).join('')
            : '';

        // Attachments count
        const attachmentCount = task.attachments && task.attachments.length > 0 ? task.attachments.length : 0;

        return `
            <div class="task-card-mobile" data-priority="${task.priority}" data-task-id="${task.id}">
                <!-- Header (always visible) -->
                <div class="card-header-premium">
                    <div class="card-header-content" data-card-action="toggle">
                        <h3 class="card-title-premium">${escapeHtml(task.title || "Untitled Task")}</h3>
                        <div class="card-meta-premium">
                            <span class="status-dot-premium ${task.status}"></span>
                            <span>${STATUS_LABELS[task.status] || ""}</span>
                            ${dateInfo.text ? `<span class="card-date-smart ${dateInfo.class}">• ${dateInfo.text}</span>` : ''}
                        </div>
                    </div>
                    <div class="card-actions-premium">
                        <button class="card-open-btn-premium" data-card-action="open" title="Open task details">
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
                        <div class="card-description-premium-label">Description</div>
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
                            <span>Start: ${formatDate(task.startDate)}</span>
                        </div>
                        ` : ''}
                        ${task.endDate ? `
                        <div class="card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>End: ${formatDate(task.endDate)}</span>
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
    const total = projectTasks.length;

    const completedPct = total > 0 ? (completed / total) * 100 : 0;
    const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;
    const reviewPct = total > 0 ? (review / total) * 100 : 0;
    const todoPct = total > 0 ? (todo / total) * 100 : 0;

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
                dateRangeHtml = `<span class="date-badge">${formatDatePretty(task.startDate)}</span><span class="date-arrow">→</span><span class="date-badge">${formatDatePretty(task.endDate)}</span>`;
            } else if (hasEndDate) {
                dateRangeHtml = `<span class="date-badge">${formatDatePretty(task.endDate)}</span>`;
            } else if (hasStartDate) {
                dateRangeHtml = `<span class="date-badge">${formatDatePretty(task.startDate)}</span>`;
            }

            return `
                <div class="expanded-task-item" data-action="openTaskDetails" data-param="${task.id}" data-stop-propagation="true">
                    <div class="expanded-task-name">${escapeHtml(task.title)}</div>
                    <div class="expanded-task-dates">${dateRangeHtml}</div>
                    <div class="expanded-task-priority">
                        <div class="priority-chip priority-${priority}">${PRIORITY_LABELS[priority]}</div>
                    </div>
                    <div class="expanded-task-status-col">
                        <div class="expanded-task-status ${task.status}">${STATUS_LABELS[task.status] || task.status}</div>
                    </div>
                </div>
            `;
        }).join('')
        : '<div class="no-tasks-message">No tasks in this project</div>';

    return `
        <div class="project-list-item" id="project-item-${project.id}">
            <div class="project-row" data-action="toggleProjectExpand" data-param="${project.id}">
                <div class="project-chevron">▸</div>
                <div class="project-info">
                    <div class="project-swatch" style="background: ${swatchColor};"></div>
                    <div class="project-name-desc">
                        <div class="project-title-row">
                            <div class="project-title">${escapeHtml(project.name || 'Untitled Project')}</div>
                            <button class="btn-view-details" data-action="showProjectDetails" data-param="${project.id}" data-stop-propagation="true">View Details</button>
                        </div>
                        <div class="project-description">${escapeHtml(project.description || 'No description')}</div>
                    </div>
                </div>
                <div class="project-status-col">
                    <span class="project-status-badge ${projectStatus}">${projectStatus.toUpperCase()}</span>
                </div>
                <div class="project-progress-col">
                    <div class="progress-bar-wrapper">
                        <div class="progress-segment done" style="width: ${completedPct}%;"></div>
                        <div class="progress-segment progress" style="width: ${inProgressPct}%;"></div>
                        <div class="progress-segment review" style="width: ${reviewPct}%;"></div>
                        <div class="progress-segment todo" style="width: ${todoPct}%;"></div>
                    </div>
                    <div class="progress-percent">${completionPct}%</div>
                </div>
                <div class="project-tasks-col">
                    <span class="project-tasks-count">${total}</span>
                    <span class="project-tasks-breakdown">tasks · ${completed} done</span>
                </div>
                <div class="project-dates-col">
                    <span class="date-badge">${formatDatePretty(project.startDate)}</span>
                    <span class="date-arrow">→</span>
                    <span class="date-badge">${formatDatePretty(project.endDate)}</span>
                </div>
            </div>
            <div class="project-tasks-expanded">
                <div class="expanded-tasks-container">
                    <div class="expanded-tasks-header">
                        <span>📋 Tasks (${total})</span>
                        <button class="add-btn expanded-add-task-btn" type="button" data-action="openTaskModalForProject" data-param="${project.id}" data-stop-propagation="true">+ Add Task</button>
                    </div>
                    ${tasksHtml}
                </div>
            </div>
        </div>
    `;
}

function renderProjects() {
const container = document.getElementById("projects-list");
    if (projects.length === 0) {
        container.innerHTML =
            '<div class="empty-state"><h3>No projects yet</h3><p>Create your first project</p></div>';
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
}

function toggleProjectExpand(projectId) {
    const item = document.getElementById(`project-item-${projectId}`);
    if (item) {
        item.classList.toggle('expanded');
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
                <h3>No projects found</h3>
                <p>Create a new project to get started</p>
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
                            <span class="project-card-tasks-count">• ${total} task${total !== 1 ? 's' : ''}</span>
                            ${completionPct > 0 ? `<span class="project-card-completion">• ${completionPct}% done</span>` : ''}
                        </div>
                    </div>
                    <div class="project-card-actions-premium">
                        <button class="project-card-open-btn-premium" data-action="showProjectDetails" data-param="${project.id}" title="View project details">
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
                    ${project.description ? `
                    <div class="project-card-description-premium">
                        <div class="project-card-description-label">Description</div>
                        <div class="project-card-description-text">${escapeHtml(project.description)}</div>
                    </div>
                    ` : ''}

                    <div class="project-card-footer-premium">
                        ${project.startDate ? `
                        <div class="project-card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Start: ${formatDate(project.startDate)}</span>
                        </div>
                        ` : ''}
                        ${project.endDate ? `
                        <div class="project-card-meta-item-premium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>End: ${formatDate(project.endDate)}</span>
                        </div>
                        ` : ''}
                    </div>

                    ${total > 0 ? `
                    <div class="project-card-progress-premium">
                        <div class="project-card-progress-label">Task Progress</div>
                        <div class="project-card-progress-bar">
                            <div class="progress-segment done" style="width: ${(completed/total)*100}%;"></div>
                            <div class="progress-segment progress" style="width: ${(inProgress/total)*100}%;"></div>
                            <div class="progress-segment review" style="width: ${(review/total)*100}%;"></div>
                            <div class="progress-segment todo" style="width: ${(todo/total)*100}%;"></div>
                        </div>
                        <div class="project-card-breakdown">
                            ${completed > 0 ? `<span class="breakdown-item done">${completed} done</span>` : ''}
                            ${inProgress > 0 ? `<span class="breakdown-item progress">${inProgress} in progress</span>` : ''}
                            ${review > 0 ? `<span class="breakdown-item review">${review} in review</span>` : ''}
                            ${todo > 0 ? `<span class="breakdown-item todo">${todo} to do</span>` : ''}
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
    const byStatus = { todo: [], progress: [], review: [], done: [] };
    const source =
        typeof getFilteredTasks === "function"
            ? getFilteredTasks()
            : tasks.slice();

    // Priority order for sorting: high=3, medium=2, low=1
    // Using imported PRIORITY_ORDER
    
    source.forEach((t) => {
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
        todo: document.getElementById("todo-tasks"),
        progress: document.getElementById("progress-tasks"),
        review: document.getElementById("review-tasks"),
        done: document.getElementById("done-tasks"),
    };

    // Update counts
    const cTodo = document.getElementById("todo-count");
    const cProg = document.getElementById("progress-count");
    const cRev = document.getElementById("review-count");
    const cDone = document.getElementById("done-count");
    if (cTodo) cTodo.textContent = byStatus.todo.length;
    if (cProg) cProg.textContent = byStatus.progress.length;
    if (cRev) cRev.textContent = byStatus.review.length;
    if (cDone) cDone.textContent = byStatus.done.length;

    // Render cards
    ["todo", "progress", "review", "done"].forEach((status) => {
        const wrap = cols[status];
        if (!wrap) return;

        wrap.innerHTML = byStatus[status]
            .map((task) => {
                const proj = projects.find((p) => p.id === task.projectId);
                const projName = proj ? proj.name : "No Project";
                const dueText = task.endDate ? formatDate(task.endDate) : "No date";

                // Calculate date urgency with glassmorphic chip design
                let dueHTML;
                if (task.endDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(task.endDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const diffTime = dueDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    let bgColor, textColor, borderColor, icon = '', iconColor = '';
                    if (diffDays < 0) {
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
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    ">${icon ? `<span style="color: ${iconColor};">${icon}</span>` : ''}${escapeHtml(dueText)}</span>`;
                } else {
                    // Only show "No date" if the setting is enabled
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

                // Combine tags and date in the same flex row - always show date even if "No date"
                const tagsAndDateHTML = `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 12px;">
                    ${task.tags && task.tags.length > 0 ? task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join('') : ''}
                    <span style="margin-left: auto;">${dueHTML}</span>
                </div>`;

                return `
                    <div class="task-card${selectedClass}" draggable="true" data-task-id="${task.id}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                            <div class="task-title" style="flex: 1;">${projectIndicator}${escapeHtml(task.title || "")}</div>
                            <div class="task-priority priority-${task.priority}" style="flex-shrink: 0;">${(task.priority || "").toUpperCase()}</div>
                        </div>
                        ${window.kanbanShowProjects !== false ? `
                        <div style="margin-top:8px; font-size:12px;">
                            ${proj ?
                                `<span style="background-color: ${getProjectColor(proj.id)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(proj.name)}">${escapeHtml(proj.name)}</span>` :
                                `<span style="color: var(--text-muted);">No Project</span>`
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


function openTaskDetails(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById("task-modal");
    if (!modal) return;

    // Reset tabs to Details tab
    const detailsTab = modal.querySelector('.modal-tab[data-tab="details"]');
    const historyTab = modal.querySelector('.modal-tab[data-tab="history"]');
    const detailsContent = modal.querySelector('#task-details-tab');
    const historyContent = modal.querySelector('#task-history-tab');

    if (detailsTab) detailsTab.classList.add('active');
    if (historyTab) historyTab.classList.remove('active');
    if (detailsContent) detailsContent.classList.add('active');
    if (historyContent) historyContent.classList.remove('active');

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
                    projectTextSpan.textContent = "Select a project";
                }
            } else {
                projectTextSpan.textContent = "Select a project";
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
        priorityCurrentBtn.innerHTML = `<span class="priority-dot ${priority}"></span> ${PRIORITY_LABELS[priority]} <span class="dropdown-arrow">▼</span>`;
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
      statusBadge.textContent = STATUS_LABELS[task.status] || "To Do";
    }
    updateStatusOptions(task.status || "todo");
  }

    // Reset and re-initialize date pickers for task modal
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

    // Editing ID
    const form = modal.querySelector("#task-form");
    if (form) form.dataset.editingTaskId = String(taskId);

    renderAttachments(task.attachments || []);
    renderTags(task.tags || []);

    // CRITICAL: Make modal visible FIRST (mobile browsers require visible inputs to accept values)
    modal.classList.add("active");

    // Use setTimeout to ensure modal is rendered and visible before setting date values
    setTimeout(() => {
        // Set values BEFORE wrapping (now that modal is visible)
        if (startInput) startInput.value = startIso || "";
        if (endInput) endInput.value = endIso || "";

        // Initialize date pickers (creates wrappers)
        initializeDatePickers();

        // FORCE display values after wrapping (critical for mobile)
        if (startInput) {
            const wrapper = startInput.parentElement;
            if (wrapper && wrapper.classList.contains('date-input-wrapper')) {
                const displayInput = wrapper.querySelector('input.date-display');
                if (displayInput && startIso) {
                    displayInput.value = toDMYFromISO(startIso);
                }
            }
            if (startInput._flatpickrInstance && startIso) {
                startInput._flatpickrInstance.setDate(new Date(startIso), false);
            }
        }

        if (endInput) {
            const wrapper = endInput.parentElement;
            if (wrapper && wrapper.classList.contains('date-input-wrapper')) {
                const displayInput = wrapper.querySelector('input.date-display');
                if (displayInput && endIso) {
                    displayInput.value = toDMYFromISO(endIso);
                }
            }
            if (endInput._flatpickrInstance && endIso) {
                endInput._flatpickrInstance.setDate(new Date(endIso), false);
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
    document.getElementById("confirm-input").value = "";
    document.getElementById("confirm-input").focus();

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
function duplicateTask() {
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
    saveTasks();

    // Close options menu to avoid overlaying issues
    const menu = document.getElementById("options-menu");
    if (menu) menu.style.display = "none";

    // Close the task modal after duplicating (non-destructive to other flows)
    closeModal("task-modal");

    // Sync date filter option visibility
    populateProjectOptions();
    populateTagOptions();
    updateNoDateOptionVisibility();

    // If viewing project details of the same project, refresh that view; otherwise do standard refresh
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

    // Optionally, open the duplicated task for quick edits
    // openTaskDetails(cloned.id);
}

function closeConfirmModal() {
    document.getElementById("confirm-modal").classList.remove("active");
    document.getElementById("confirm-error").classList.remove("show");
}

function confirmDelete() {
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
        saveTasks();
        closeConfirmModal();
        closeModal("task-modal");
    // Keep filter dropdowns in sync with removed task data
    populateProjectOptions();
    populateTagOptions();
    updateNoDateOptionVisibility();

        // If we were viewing project details, refresh them
        if (wasInProjectDetails && projectId) {
            showProjectDetails(projectId);
        } else {
            // Otherwise refresh the main views
            render(); // Use the same render call as task creation
        }
        
        // Always refresh calendar if it exists (same as task creation)
        const calendarView = document.getElementById("calendar-view");
        if (calendarView) {
            renderCalendar();
        }
        
        updateCounts();
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
            
            if (e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle selected class
                card.classList.toggle('selected');
                
                // Update selectedCards Set
                if (card.classList.contains('selected')) {
                    selectedCards.add(taskId);
                } else {
                    selectedCards.delete(taskId);
                }
            } else {
                // Normal click opens task details
                if (!isNaN(taskId)) openTaskDetails(taskId);
            }
        });
    });

    const columns = document.querySelectorAll(".kanban-column");
    const statusMap = ["todo", "progress", "review", "done"];

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

        column.addEventListener("drop", (e) => {
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
                    ['todo','progress','review','done'].forEach(st => {
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
                        // Store old state for history
                        const oldTaskCopy = JSON.parse(JSON.stringify(t));

                        t.status = newStatus;

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
                });

                saveSortPreferences();
                selectedCards.clear();
                saveTasks();
                render();
                const calendarView = document.getElementById("calendar-view");
                if (calendarView) renderCalendar();
                try { if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder); } catch (err) {}
                dragPlaceholder = null;
                stopAutoScroll();
            } else {
                // Multi-drag - same fix applies
                if (sortMode !== 'manual') {
                    sortMode = 'manual';
                    ['todo','progress','review','done'].forEach(st => {
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
                        // Store old state for history
                        const oldTaskCopy = JSON.parse(JSON.stringify(t));

                        t.status = newStatus;

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
                });

                saveSortPreferences();
                selectedCards.clear();
                saveTasks();
                render();
                const calendarView = document.getElementById("calendar-view");
                if (calendarView) renderCalendar();
                try { if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder); } catch (err) {}
                dragPlaceholder = null;
                stopAutoScroll();
            }
        });
    });

    document.addEventListener('dragend', () => stopAutoScroll());
}


function openProjectModal() {
    const modal = document.getElementById("project-modal");

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

function openTaskModal() {
    const modal = document.getElementById("task-modal");
    if (!modal) return;

    // Reset tabs to Details tab
    const detailsTab = modal.querySelector('.modal-tab[data-tab="details"]');
    const historyTab = modal.querySelector('.modal-tab[data-tab="history"]');
    const detailsContent = modal.querySelector('#task-details-tab');
    const historyContent = modal.querySelector('#task-history-tab');

    if (detailsTab) detailsTab.classList.add('active');
    if (historyTab) historyTab.classList.remove('active');
    if (detailsContent) detailsContent.classList.add('active');
    if (historyContent) historyContent.classList.remove('active');

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
                console.log('✅ Footer is inside modal-content');
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
    if (projectCurrentBtn) projectCurrentBtn.textContent = 'Select a project';
    updateTaskProjectOpenBtn('');
    // Ensure floating portal is closed if it was open
    if (typeof hideProjectDropdownPortal === 'function') hideProjectDropdownPortal();

    // Reset priority
    const hiddenPriority = modal.querySelector("#hidden-priority");
    if (hiddenPriority) hiddenPriority.value = "medium";
    const priorityCurrentBtn = modal.querySelector("#priority-current");
    if (priorityCurrentBtn) {
        priorityCurrentBtn.innerHTML = `<span class="priority-dot medium"></span> Medium <span class="dropdown-arrow">▼</span>`;
        updatePriorityOptions("medium");
    }

    // Reset status
    const hiddenStatus = modal.querySelector("#hidden-status");
    if (hiddenStatus) hiddenStatus.value = "todo";

    const currentBtn = modal.querySelector("#status-current");
    if (currentBtn) {
        const statusBadge = currentBtn.querySelector(".status-badge");
        if (statusBadge) {
            statusBadge.className = "status-badge todo";
            statusBadge.textContent = "To Do";
        }
    }

    // Clear attachments and tags
    tempAttachments = [];
    window.tempTags = [];
    filterState.tags.clear();
    renderAttachments([]);
    renderTags([]);

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

        // Reset status dropdown to default
        const statusBadge = document.querySelector("#status-current .status-badge");
        if (statusBadge) {
            statusBadge.className = "status-badge todo";
            statusBadge.textContent = "To Do";
        }
        const hiddenStatus = document.getElementById("hidden-status");
        if (hiddenStatus) hiddenStatus.value = "todo";

        // Reset priority dropdown to default
        const priorityCurrentBtn = document.querySelector("#priority-current");
        if (priorityCurrentBtn) {
            priorityCurrentBtn.innerHTML = `<span class="priority-dot medium"></span> Medium <span class="dropdown-arrow">▼</span>`;
        }
        const hiddenPriority = document.getElementById("hidden-priority");
        if (hiddenPriority) hiddenPriority.value = "medium";
    }

    // Clear initial state tracking
    initialTaskFormState = null;

    closeModal("task-modal");
}

document
    .getElementById("project-form")
    .addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Use project service to create project
        const result = createProjectService({
            name: formData.get("name"),
            description: formData.get("description"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate")
        }, projects, projectCounter);

        projects = result.projects;
        projectCounter = result.projectCounter;
        const project = result.project;

        // Record history for project creation
        if (window.historyService) {
            window.historyService.recordProjectCreated(project);
        }

        saveProjects();  // This saves the incremented counter
        closeModal("project-modal");
        e.target.reset();

        // Clear sorted view cache to force refresh with new project
        projectsSortedView = null;

        // Always navigate to projects page and show the new project
        window.location.hash = 'projects';
        showPage('projects');
        render(); // Refresh the projects list
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
            showErrorNotification('You must be logged in to reset your PIN');
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
            showErrorNotification(data.error || 'Failed to reset PIN');
            return;
        }
        
        // Remove modal
        const modal = document.getElementById('new-pin-modal-temp');
        if (modal) modal.remove();
        
        showSuccessNotification('PIN reset successfully! You will need to re-login with your new PIN.');
        
        // Optional: redirect to login after a delay
        setTimeout(() => {
            window.location.hash = '';
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('PIN reset error:', error);
        showErrorNotification('An error occurred while resetting your PIN');
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
            showErrorNotification('User name cannot be empty.');
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
            updateUserDisplay(data.name || newName);
        } catch (err) {
            console.error('Failed to save display name:', err);
            showErrorNotification('Could not save display name. Please try again.');
            return;
        }

        // Save application settings
        const autoStartToggle = document.getElementById('auto-start-date-toggle');
        const autoEndToggle = document.getElementById('auto-end-date-toggle');
        const historySortOrderSelect = document.getElementById('history-sort-order');
        
        settings.autoSetStartDateOnStatusChange = !!autoStartToggle?.checked;
        settings.autoSetEndDateOnStatusChange = !!autoEndToggle?.checked;
        settings.historySortOrder = historySortOrderSelect.value;
        
          const emailInput = document.getElementById('user-email');
          settings.notificationEmail = emailInput.value.trim();

          if (workspaceLogoDraft.hasPendingChange) {
              settings.customWorkspaceLogo = workspaceLogoDraft.dataUrl || null;
          }
  
          saveSettings();
          applyWorkspaceLogo();

          workspaceLogoDraft.hasPendingChange = false;
          workspaceLogoDraft.dataUrl = null;
  
          // Also update the display in the user menu
          const userEmailEl = document.querySelector('.user-email');
          if (userEmailEl) userEmailEl.textContent = settings.notificationEmail;
  
          showSuccessNotification('Settings saved successfully!');
          // Mark form as clean and close
          window.initialSettingsFormState = null;
          window.settingsFormIsDirty = false;
          if (saveBtn) {
              saveBtn.classList.remove('dirty');
              saveBtn.disabled = true;
          }
          closeModal('settings-modal');
      });

  function setupWorkspaceLogoControls() {
      const fileInput = document.getElementById('workspace-logo-input');
      const clearButton = document.getElementById('workspace-logo-clear-btn');
      const preview = document.getElementById('workspace-logo-preview');

      function refreshWorkspaceLogoUI() {
          if (!preview || !clearButton) return;

          const effectiveLogo = workspaceLogoDraft.hasPendingChange
              ? workspaceLogoDraft.dataUrl
              : settings.customWorkspaceLogo;

          if (effectiveLogo) {
              preview.style.display = 'block';
              preview.style.backgroundImage = `url(${effectiveLogo})`;
              clearButton.style.display = 'inline-flex';
          } else {
              preview.style.display = 'none';
              preview.style.backgroundImage = '';
              clearButton.style.display = 'none';
          }
      }

      // Initialize UI based on current settings when controls are wired
      refreshWorkspaceLogoUI();

      if (fileInput) {
          fileInput.addEventListener('change', function (e) {
              const file = e.target.files && e.target.files[0];
              if (!file) return;

              if (!file.type.startsWith('image/')) {
                  showErrorNotification('Please select an image file for the workspace logo.');
                  fileInput.value = '';
                  return;
              }

              const maxSizeBytes = 512 * 1024; // 512KB safety limit for localStorage
              if (file.size > maxSizeBytes) {
                  showErrorNotification('Please use an image smaller than 512KB for the workspace logo.');
                  fileInput.value = '';
                  return;
              }

              const reader = new FileReader();
              reader.onload = function (event) {
                  const dataUrl = event.target && event.target.result;
                  if (!dataUrl) {
                      showErrorNotification('Could not read the selected image.');
                      fileInput.value = '';
                      return;
                  }

                  const img = new Image();
                  img.onload = function () {
                      if (img.width !== img.height) {
                          showErrorNotification('Please upload a square image (same width and height) for the workspace logo.');
                          fileInput.value = '';
                          return;
                      }

                      workspaceLogoDraft.hasPendingChange = true;
                      workspaceLogoDraft.dataUrl = dataUrl;
                      refreshWorkspaceLogoUI();
                      if (window.markSettingsDirtyIfNeeded) {
                          window.markSettingsDirtyIfNeeded();
                      }
                  };
                  img.onerror = function () {
                      showErrorNotification('Could not load the selected image.');
                      fileInput.value = '';
                  };
                  img.src = dataUrl;
              };
              reader.onerror = function () {
                  showErrorNotification('Could not read the selected image.');
                  fileInput.value = '';
              };

              reader.readAsDataURL(file);
          });
      }

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
  }

  setupWorkspaceLogoControls();

// Expose functions for auth.js to call
window.initializeApp = init;
window.setupUserMenus = setupUserMenus;

// Try to init on DOMContentLoaded (will only work if already authenticated)
document.addEventListener("DOMContentLoaded", init);

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

function submitTaskForm() {
const form = document.getElementById("task-form");
    const editingTaskId = form.dataset.editingTaskId;
const title = form.querySelector('input[name="title"]').value;
    let description = document.getElementById("task-description-hidden").value;
    description = autoLinkifyDescription(description);
    // Read projectId from hidden input (custom dropdown), fallback to a select if present
    const projectIdRaw = (form.querySelector('input[name="projectId"]').value ||
                         (form.querySelector('select[name="projectId"]') ? form.querySelector('select[name="projectId"]').value : ""));

    const status = document.getElementById("hidden-status").value || "todo";
    const priority = form.querySelector('#hidden-priority').value || "medium";

    const startRaw = (form.querySelector('input[name="startDate"]')?.value || '').trim();
    const startISO = startRaw === '' ? '' : startRaw;

    const endRaw = (form.querySelector('input[name="endDate"]')?.value || '').trim();
    const endISO = endRaw === '' ? '' : endRaw;

    // Validate date range
    if (startISO && endISO && endISO < startISO) {
        showErrorNotification("End date cannot be before start date");
        return;
    }

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

// Save changes first
            saveTasks();
            closeModal("task-modal");

            // Debugging: Check which view is active
            const projectDetailsActive = document.getElementById("project-details")?.classList.contains("active");
            const projectsActive = document.getElementById("projects")?.classList.contains("active");
// Refresh the appropriate view
            if (document.getElementById("project-details").classList.contains("active")) {
const displayedProjectId = oldProjectId || t.projectId;
                if (displayedProjectId) {
                    showProjectDetails(displayedProjectId);
                    return;
                }
            } else if (document.getElementById("projects").classList.contains("active")) {
// Refresh projects list view while preserving expanded state
                renderProjects();
                updateCounts();
return;
            } else {
}
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

        // Keep filter dropdowns in sync with new task data
        populateProjectOptions();
        populateTagOptions();
        updateNoDateOptionVisibility();

        // Save and close modal
        saveTasks();
        closeModal("task-modal");

        // Refresh the appropriate view
        if (newTask.projectId && document.getElementById("project-details").classList.contains("active")) {
            showProjectDetails(newTask.projectId);
            updateCounts();
            return;
        } else if (document.getElementById("projects").classList.contains("active")) {
            renderProjects();
            updateCounts();
            return;
        }
    }

    // Fallback for other views
    saveTasks();
    closeModal("task-modal");
    render();

    // Always refresh calendar if it exists
    const calendarView = document.getElementById("calendar-view");
    if (calendarView) {
        renderCalendar();
    }
    renderActivityFeed();
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
    const allPriorities = PRIORITY_OPTIONS;
    
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
        { value: "todo", label: "To Do" },
        { value: "progress", label: "In Progress" },
        { value: "review", label: "In Review" },
        { value: "done", label: "Done" }
    ];
    
    // Show only unselected statuses
    const availableOptions = allStatuses.filter(s => s.value !== selectedStatus);
    
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
    showProjectDetails(projectId);
}

function populateProjectDropdownOptions(dropdownEl) {
    const projectOptions = dropdownEl ? dropdownEl.querySelector('.project-options') : null;
    const hiddenProject = document.getElementById('hidden-project');
    const selectedId = hiddenProject ? (hiddenProject.value || '') : '';
    // Only include the clear option when a specific project is selected
    let optionsHTML = selectedId ? '<div class="project-option" data-project-id="">Select a project</div>' : '';
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
    const html = `<div class=\"checkbox-row\" data-id=\"${id}\" contenteditable=\"false\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\"></div></div>`;
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
                        wrapper.innerHTML = `<div class=\"checkbox-row\" data-id=\"${id2}\" contenteditable=\"false\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\"></div></div>`;
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

function renderCalendar() {
const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Update month/year display
    document.getElementById(
        "calendar-month-year"
    ).textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Calculate first day and number of days
    // Adjust so Monday = 0, Tuesday = 1, ..., Sunday = 6
    let firstDay = new Date(currentYear, currentMonth, 1).getDay();
    firstDay = (firstDay + 6) % 7; // Convert Sunday=0 to Sunday=6, Monday=1 to Monday=0, etc.
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Build calendar grid
    let calendarHTML = "";

    // Add day headers
    dayNames.forEach((day) => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
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

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
            2,
            "0"
        )}-${String(day).padStart(2, "0")}`;
        // All tasks now show as bars in the overlay, no inline chips
        const dayTasks = [];
        
        // Sort tasks by priority (high to low)
        // Using imported PRIORITY_ORDER
        dayTasks.sort((a, b) => {
            const priorityA = PRIORITY_ORDER[a.priority] || 0;
            const priorityB = PRIORITY_ORDER[b.priority] || 0;
            return priorityB - priorityA;
        });

        // Find projects that span this date
        const dayProjects = projects.filter((project) => {
            const startDate = new Date(project.startDate);
            const endDate = project.endDate
                ? new Date(project.endDate)
                : new Date(project.startDate);
            const currentDate = new Date(dateStr);
            return currentDate >= startDate && currentDate <= endDate;
        });

        const isToday = isCurrentMonth && day === todayDate;

        let tasksHTML = "";
        let projectsHTML = "";
        const maxVisible = 3; // Show 3 tasks by default, +X more for 4+

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

        // Add tasks (reduced number)
        dayTasks.slice(0, maxVisible).forEach((task) => {
            tasksHTML += `
                        <div class="calendar-task priority-${task.priority} ${
                task.status === "done" ? "done" : ""
            }"
                            data-action="openTaskDetails"
                            data-param="${task.id}"
                            data-stop-propagation="true">
                            ${task.title}
                        </div>
                    `;
        });

        if (dayTasks.length > maxVisible) {
            tasksHTML += `<div class="calendar-more">+${
                dayTasks.length - maxVisible
            } more</div>`;
        }

        // Build the day cell with a spacer that will be sized after project bars are computed
        const row = Math.floor(cellIndex / 7);
        calendarHTML += `
                    <div class="calendar-day ${isToday ? "today" : ""}" data-row="${row}" data-action="showDayTasks" data-param="${dateStr}">
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

    // Process tasks with endDate (with or without startDate)
    // Golden rule: Only show tasks with endDate. If startDate is missing, treat as single-day bar.
    const filteredTasks = getFilteredTasks().filter(task =>
        task.endDate &&
        task.endDate.length === 10 &&
        task.endDate.includes('-')
    );

    filteredTasks.forEach((task) => {
        // If startDate is missing or invalid, use endDate as both start and end (single-day bar)
        let startDate, endDate;

        if (task.startDate && task.startDate.length === 10 && task.startDate.includes('-')) {
            const [startYear, startMonth, startDay] = task.startDate
                .split("-")
                .map((n) => parseInt(n));
            startDate = new Date(startYear, startMonth - 1, startDay);
        } else {
            // No valid startDate: use endDate as startDate for single-day bar
            const [endYear, endMonth, endDay] = task.endDate
                .split("-")
                .map((n) => parseInt(n));
            startDate = new Date(endYear, endMonth - 1, endDay);
        }

        const [endYear, endMonth, endDay] = task.endDate
            .split("-")
            .map((n) => parseInt(n));
        endDate = new Date(endYear, endMonth - 1, endDay);
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
        // Sort by start index for greedy packing
        segments.sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
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
            const left = startRect.left - gridRect.left;
            let width = endRect.right - startRect.left;
            // Clamp within grid bounds to avoid overflow in embedded contexts
            if (left + width > gridRect.width) {
                width = Math.max(0, gridRect.width - left);
            }
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

            // Rounded corners for left/right edges of the overall project (not just the segment)
            const isProjectStartInView = seg.startIndex % 7 === Math.floor(seg.startIndex / 7) * 7 &&
                seg.project.startDate >= `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01` ? false : true;
            // Simpler: always round both ends of the month-constrained project at row edges
            bar.style.borderTopLeftRadius = "6px";
            bar.style.borderBottomLeftRadius = "6px";
            bar.style.borderTopRightRadius = "6px";
            bar.style.borderBottomRightRadius = "6px";
            bar.textContent = seg.project.name;

            bar.onclick = (e) => {
                e.stopPropagation();
                showProjectDetails(seg.project.id);
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
        // Sort by start index for greedy packing
        segments.sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
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
            bar.className = "task-bar";
            bar.style.position = "absolute";
            const left = startRect.left - gridRect.left;
            let width = endRect.right - startRect.left;
            // Clamp within grid bounds
            if (left + width > gridRect.width) {
                width = Math.max(0, gridRect.width - left);
            }
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
            bar.style.borderLeft = `5px solid ${borderColor}`;
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
            bar.style.borderRadius = "4px";
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
    const allTodo = projectTasks.every(t => t.status === "todo");
    const hasInProgress = projectTasks.some(t => t.status === "progress" || t.status === "review");
    
    if (allDone) {
        return "completed";
    } else if (allTodo) {
        return "planning";
    } else if (hasInProgress || (!allTodo && !allDone)) {
        return "active";
    }
    
    return "planning";
}

function showDayTasks(dateStr) {
    // Show tasks that either end on this date OR span across this date
    const dayTasks = tasks.filter((task) => {
        if (task.startDate && task.endDate) {
            // Task with date range - check if it overlaps this day
            return dateStr >= task.startDate && dateStr <= task.endDate;
        } else if (task.endDate) {
            // Task with only end date - show on end date
            return task.endDate === dateStr;
        }
        return false;
    });
    
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
        const confirmCreate = confirm(
            `No tasks or projects for ${formatDate(dateStr)}. Create a new task?`
        );
        if (confirmCreate) {
            openTaskModal();
            document.querySelector('#task-form input[name="endDate"]').value = toDMYFromISO(dateStr);
        }
        return;
    }

    // Show custom modal
    const modal = document.getElementById('day-items-modal');
    const title = document.getElementById('day-items-modal-title');
    const body = document.getElementById('day-items-modal-body');

    title.textContent = `Items for ${formatDate(dateStr)}`;

    let html = '';

    // Projects section
    if (dayProjects.length > 0) {
        html += '<div class="day-items-section">';
        html += '<div class="day-items-section-title">📊 Projects</div>';
        dayProjects.forEach(project => {
            const projectStatus = getProjectStatus(project.id);
            html += `
                <div class="day-item" data-action="closeDayItemsAndShowProject" data-param="${project.id}">
                    <div class="day-item-title">${escapeHtml(project.name)}</div>
                    <div class="day-item-meta" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                        <span>${formatDate(project.startDate)} - ${formatDate(project.endDate)}</span>
                        <span class="project-status-badge ${projectStatus}">${projectStatus.toUpperCase()}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    // Tasks section
    if (dayTasks.length > 0) {
        html += '<div class="day-items-section">';
        html += '<div class="day-items-section-title">✅ Tasks</div>';
        dayTasks.forEach(task => {
            let projectIndicator = "";
            if (task.projectId) {
                const project = projects.find(p => p.id === task.projectId);
                if (project) {
                    const projectColor = getProjectColor(task.projectId);
                    projectIndicator = `<span class="project-indicator" style="background-color: ${projectColor}; color: white; padding: 1px 6px; border-radius: 8px; font-size: 10px; margin-right: 6px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); font-weight: 600;">${escapeHtml(project.name)}</span>`;
                } else {
                    // Project not found - show plain text like in Kanban  
                    projectIndicator = "No Project - ";
                }
            } else {
                // No project assigned - show plain text like in Kanban
                projectIndicator = "No Project - ";
            }
            
            // Create status badge instead of text
            const statusBadge = `<span class="status-badge ${task.status}" style="padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">${STATUS_LABELS[task.status] || task.status}</span>`;
            
            html += `
                <div class="day-item" data-action="closeDayItemsAndOpenTask" data-param="${task.id}">
                    <div class="day-item-title">${escapeHtml(task.title)}</div>
                    <div style="margin-top: 4px; font-size: 11px;">${projectIndicator}</div>
                    <div class="day-item-meta" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px;"><span class="task-priority priority-${task.priority}">${task.priority.toUpperCase()}</span>${statusBadge}</div>
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
    // Only close if clicking on the backdrop (modal itself), not the content
    if (event.target === event.currentTarget) {
        closeDayItemsModal();
    }
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
    const modalEl = document.getElementById(targetModal);
    if (modalEl) {
        modalEl.classList.remove('active');
    }
}

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
    await saveTasks();
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
    await saveTasks();
  }

  await saveProjects();

  closeProjectConfirmModal();

  // Clear sorted view cache to force refresh without deleted project
  projectsSortedView = null;

  // Navigate to projects page and refresh display
  window.location.hash = "#projects";
  showPage("projects");
  render();

}


function showProjectDetails(projectId) {
    // Update URL hash
    window.location.hash = `project-${projectId}`;

    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

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
    const startDate = new Date(project.startDate);
    const endDate = project.endDate ? new Date(project.endDate) : new Date();
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

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
                        <span class="project-status-badge ${projectStatus}" data-action="showStatusInfoModal">${projectStatus.toUpperCase()}</span>
                        <button class="back-btn" data-action="backToProjects" style="padding: 8px 12px; font-size: 14px; display: flex; align-items: center; gap: 6px; margin-left: 12px;">← Back To Projects</button>
                        <div style="margin-left: auto; position: relative;">
                            <button type="button" class="options-btn" id="project-options-btn" data-action="toggleProjectMenu" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;padding:4px;line-height:1;">⋯</button>
                            <div class="options-menu" id="project-options-menu" style="position:absolute;top:calc(100% + 8px);right:0;display:none;">
                                <button type="button" class="delete-btn" data-action="handleDeleteProject" data-param="${projectId}">🗑️ Delete Project</button>
                            </div>
                        </div>
                    </div>
                    <div class="project-details-description">
                        <textarea class="editable-description" onchange="updateProjectField(${projectId}, 'description', this.value)">${
        project.description || "No description provided for this epic."
    }</textarea>
                    </div>
                    <div class="project-timeline">
                        <div class="timeline-item">
                            <div class="timeline-label">Start Date</div>
                            <input type="text" class="form-input date-display editable-date datepicker"
                                placeholder="dd/mm/yyyy" maxLength="10"
                                value="${project.startDate ? formatDate(project.startDate) : ''}"
                                data-project-id="${projectId}" data-field="startDate">
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-label">End Date</div>
                                <input type="text" class="form-input date-display editable-date datepicker"
                                    placeholder="dd/mm/yyyy" maxLength="10"
                                    value="${project.endDate ? formatDate(project.endDate) : ''}"
                                    data-project-id="${projectId}" data-field="endDate">
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-label">Duration</div>
                            <div class="timeline-value">${duration} days</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-label">Created</div>
                            <div class="timeline-value">${formatDate(
                                project.createdAt?.split("T")[0]
                            )}</div>
                        </div>
                        <div class="timeline-item" style="position: relative;">
                            <div class="timeline-label">Calendar Color</div>
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
                                        <span style="font-size: 12px; color: var(--text-muted);">Custom color</span>
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
                        </div>
                    </div>
                </div>
                
                <div class="project-progress-section">
                    <div class="progress-header">
                        <div class="progress-title">Progress Overview</div>
                        <div class="progress-percentage">${completionPercentage}%</div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${completionPercentage}%"></div>
                    </div>
                    <div class="progress-stats">
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="todo" title="View To Do tasks for this project">
                            <div class="progress-stat-number" style="color: var(--text-muted);">${
                                todoTasks.length
                            }</div>
                            <div class="progress-stat-label">To Do</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="progress" title="View In Progress tasks for this project">
                            <div class="progress-stat-number" style="color: var(--accent-blue);">${
                                inProgressTasks.length
                            }</div>
                            <div class="progress-stat-label">In Progress</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="review" title="View In Review tasks for this project">
                            <div class="progress-stat-number" style="color: var(--accent-amber);">${
                                reviewTasks.length
                            }</div>
                            <div class="progress-stat-label">In Review</div>
                        </div>
                        <div class="progress-stat clickable" data-action="navigateToProjectStatus" data-param="${project.id}" data-param2="done" title="View Completed tasks for this project">
                            <div class="progress-stat-number" style="color: var(--accent-green);">${
                                completedTasks.length
                            }</div>
                            <div class="progress-stat-label">Completed</div>
                        </div>
                    </div>
                </div>
                
                <div class="project-tasks-section">
                    <div class="section-header">
                        <div class="section-title">Tasks (${
                            projectTasks.length
                        })</div>
                        <button class="add-btn" data-action="openTaskModalForProject" data-param="${projectId}">+ Add Task</button>
                    </div>
                    <div id="project-tasks-list">
                        ${
                            projectTasks.length === 0
                                ? '<div class="empty-state">No tasks yet. Create your first task for this epic.</div>'
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
                                                <div class="project-task-meta">${task.startDate && task.endDate ? `${formatDate(task.startDate)} - ${formatDate(task.endDate)}` : task.endDate ? `End: ${formatDate(task.endDate)}` : 'No dates set'}</div>
                                                ${task.tags && task.tags.length > 0 ? `
                                                    <div class="task-tags" style="margin-top: 4px;">
                                                        ${task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join(' ')}
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <div class="project-task-priority">
                                                <div class="task-priority priority-${task.priority}"><span class="priority-dot ${task.priority}"></span> ${task.priority.toUpperCase()}</div>
                                            </div>
                                            <div class="project-task-status-col">
                                                <div class="status-badge ${task.status}">
                                                    ${STATUS_LABELS[task.status] || task.status}
                                                </div>
                                            </div>
                                        </div>
                            `
                                      )
                                      .join("")
                        }
                    </div>
                </div>

                <div class="project-history-section">
                    <div class="section-header">
                        <div class="section-title">📜 Change History</div>
                    </div>
                    <div class="history-timeline-inline" id="project-history-timeline-${projectId}">
                        <!-- Timeline will be populated by JavaScript -->
                    </div>
                    <div class="history-empty-inline" id="project-history-empty-${projectId}" style="display: none;">
                        <div style="font-size: 36px; margin-bottom: 12px; opacity: 0.3;">📜</div>
                        <p style="color: var(--text-muted); text-align: center;">No changes yet for this project</p>
                    </div>
                </div>
            `;

    document.getElementById("project-details-content").innerHTML = detailsHTML;

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

        // Render project history after datepickers are initialized
        renderProjectHistory(projectId);
    }, 50);
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
    document.getElementById('project-confirm-input').value = '';
    document.getElementById('project-confirm-input').focus();

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
      const historySortOrderSelect = form.querySelector('#history-sort-order');

    // Populate user name from authenticated user (KV-backed)
    const currentUser = window.authSystem?.getCurrentUser();
    userNameInput.value = currentUser?.name || '';
  
      const emailInput = form.querySelector('#user-email');
      emailInput.value = settings.notificationEmail || currentUser?.email || '';
  
      // Populate application settings
      if (autoStartToggle) autoStartToggle.checked = !!settings.autoSetStartDateOnStatusChange;
      if (autoEndToggle) autoEndToggle.checked = !!settings.autoSetEndDateOnStatusChange;
      historySortOrderSelect.value = settings.historySortOrder;

      const logoFileInput = form.querySelector('#workspace-logo-input');
      if (logoFileInput) {
          logoFileInput.value = '';
      }

      // Reset any unsaved draft and refresh logo preview/clear button based on persisted settings
      workspaceLogoDraft.hasPendingChange = false;
      workspaceLogoDraft.dataUrl = null;
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

      // Capture initial settings form state for dirty-checking
      window.initialSettingsFormState = {
          userName: userNameInput.value || '',
          notificationEmail: emailInput.value || '',
          autoSetStartDateOnStatusChange: !!settings.autoSetStartDateOnStatusChange,
          autoSetEndDateOnStatusChange: !!settings.autoSetEndDateOnStatusChange,
          historySortOrder: settings.historySortOrder || 'newest',
          logoState: settings.customWorkspaceLogo ? 'logo-set' : 'logo-none'
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

              const current = {
                  userName: userNameInput.value || '',
                  notificationEmail: emailInput.value || '',
                  autoSetStartDateOnStatusChange: !!autoStartToggle?.checked,
                  autoSetEndDateOnStatusChange: !!autoEndToggle?.checked,
                  historySortOrder: historySortOrderSelect.value,
                  logoState: currentLogoState
              };

              const isDirty =
                  current.userName !== window.initialSettingsFormState.userName ||
                  current.notificationEmail !== window.initialSettingsFormState.notificationEmail ||
                  current.autoSetStartDateOnStatusChange !== window.initialSettingsFormState.autoSetStartDateOnStatusChange ||
                  current.autoSetEndDateOnStatusChange !== window.initialSettingsFormState.autoSetEndDateOnStatusChange ||
                  current.historySortOrder !== window.initialSettingsFormState.historySortOrder ||
                  current.logoState !== window.initialSettingsFormState.logoState;

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
          [userNameInput, emailInput, autoStartToggle, autoEndToggle, historySortOrderSelect, logoFileInput]
              .filter(Boolean)
              .forEach(el => {
                  el.addEventListener('change', markDirtyIfNeeded);
                  if (el.tagName === 'INPUT' && el.type === 'text' || el.type === 'email') {
                      el.addEventListener('input', markDirtyIfNeeded);
                  }
              });
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
            dropdown.classList.toggle("active");
        });
    }
}

function updateUserDisplay(name) {
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
        avatarEl.textContent = initials;
    }
}

function hydrateUserProfile() {
    // Get current user from auth system
    const currentUser = window.authSystem?.getCurrentUser();
    if (!currentUser) return; // Not logged in yet

    updateUserDisplay(currentUser.name);

    const emailEl = document.querySelector(".user-email");
    if (emailEl) emailEl.textContent = settings.notificationEmail || currentUser.email || currentUser.username;
}

function normalizeTaskModalAttachmentUI() {
    const addLinkBtn = document.querySelector('#task-modal [data-action="addAttachment"]');
    if (addLinkBtn) addLinkBtn.textContent = 'Add Link';
}

// Close dropdown when clicking outside
document.addEventListener("click", function () {
    const dropdown = document.getElementById("shared-user-dropdown");
    if (dropdown) {
        dropdown.classList.remove("active");
    }
});

function toggleTheme() {
    const root = document.documentElement;
    const themeText = document.getElementById("theme-text");

    if (root.getAttribute("data-theme") === "dark") {
        root.removeAttribute("data-theme");
        // Now in light mode; offer switch back to dark
        if (themeText) themeText.textContent = "Dark mode";
        localStorage.setItem("theme", "light");
    } else {
        root.setAttribute("data-theme", "dark");
        // Now in dark mode; offer switch back to light
        if (themeText) themeText.textContent = "Light mode";
        localStorage.setItem("theme", "dark");
    }

    // Refresh calendar bars to update colors for new theme
    if (typeof reflowCalendarBars === 'function') {
        reflowCalendarBars();
    }
}

// Load saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    const themeText = document.getElementById("theme-text");
    if (themeText) themeText.textContent = "Light mode";
}


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

function updateProjectField(projectId, field, value) {
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

    // Use project service to update field
    const result = updateProjectFieldService(projectId, field, updatedValue, projects);
    
    if (result.project) {
        projects = result.projects;
        const project = result.project;

        // Record history for project update
        if (window.historyService && oldProjectCopy) {
            window.historyService.recordProjectUpdated(oldProjectCopy, project);
        }

        saveProjects(); // Guardar en persistencia
        
        // 2. CORRECCIÓN DE VISUALIZACIÓN: Refrescar siempre
        // Eliminamos el 'if' que bloqueaba el refresco en fechas.
        showProjectDetails(projectId);

        // Always refresh calendar bars if the calendar is visible (date changes affect layout)
        if (document.getElementById('calendar-view')?.classList.contains('active')) {
            reflowCalendarBars();
        }
    }
}

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
    const alreadyOnCalendar = document.getElementById('calendar-view')?.classList.contains('active');

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

    // Hide other views and show calendar (idempotent)
    const kanban = document.querySelector(".kanban-board");
    const list = document.getElementById("list-view");
    const calendar = document.getElementById("calendar-view");
    if (kanban && !kanban.classList.contains('hidden')) kanban.classList.add('hidden');
    if (list && list.classList.contains('active')) list.classList.remove('active');
    if (calendar && !calendar.classList.contains('active')) calendar.classList.add('active');

    // mark header so the Add Task button aligns left like in Projects
    try{ document.querySelector('.kanban-header')?.classList.add('calendar-mode'); }catch(e){}

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

function addFeedbackItem() {
    const type = document.getElementById('feedback-type').value;
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
    document.getElementById('feedback-description').value = '';
    clearFeedbackScreenshot();
    saveFeedback();
    render();
}


// Add enter key support for feedback and initialize screenshot attachments
document.addEventListener('DOMContentLoaded', function() {
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

    const isMobileScreen = window.innerWidth <= 768;
    const screenshotDefaultText = isMobileScreen
        ? '📸 Tap to attach screenshot'
        : '📸 Drag & drop or click to attach screenshot';

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
                showErrorNotification('Please attach an image file.');
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
                        <img src="${dataUrl}" alt="Feedback screenshot preview">
                    </div>
                    <div class="feedback-screenshot-meta">
                        <div class="feedback-screenshot-title">Screenshot attached</div>
                        <div class="feedback-screenshot-subtitle">Will be saved with this feedback</div>
                    </div>
                    <button type="button" class="feedback-screenshot-remove">Remove</button>
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
            showErrorNotification('Could not read the image file. Please try again.');
        }
    };
    reader.readAsDataURL(file);
}

function clearFeedbackScreenshot() {
    currentFeedbackScreenshotData = "";
    const screenshotInput = document.getElementById('feedback-screenshot-url');
    if (screenshotInput) {
        const defaultText = screenshotInput.dataset.defaultText || '📸 Drag & drop or click to attach screenshot';
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
    if (item) {
        item.status = item.status === 'open' ? 'done' : 'open';
        saveFeedback();
        render();
    }
}

function renderFeedback() {
    const pendingContainer = document.getElementById('feedback-list-pending');
    const doneContainer = document.getElementById('feedback-list-done');
    if (!pendingContainer || !doneContainer) return;
    
    const typeIcons = {
        bug: '🐞',
        improvement: '💡',
        // Legacy values for backward compatibility
        feature: '💡',
        idea: '💡'
    };
    
    const pendingItems = feedbackItems.filter(f => f.status === 'open');
    const doneItems = feedbackItems.filter(f => f.status === 'done');
    
    if (pendingItems.length === 0) {
        pendingContainer.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No pending feedback</p></div>';
    } else {
        pendingContainer.innerHTML = pendingItems.map(item => `
            <div class="feedback-item ${item.status === 'done' ? 'done' : ''}">
                <input type="checkbox" class="feedback-checkbox"
                       data-feedback-id="${item.id}"
                       ${item.status === 'done' ? 'checked' : ''}>
                <span class="feedback-type-icon">${typeIcons[item.type] || '💡'}</span>
                ${item.screenshotUrl ? `<button type="button" class="feedback-screenshot-link" data-action="viewFeedbackScreenshot" data-param="${encodeURIComponent(item.screenshotUrl)}" title="View screenshot">🖼️</button>` : ''}
                <div class="feedback-description">${escapeHtml(item.description)}</div>
                <div class="feedback-date">${formatDate(item.createdAt)}</div>
                <button class="feedback-delete-btn" data-action="deleteFeedbackItemWithStop" data-param="${item.id}">❌</button>
            </div>
        `).join('');
    }

    if (doneItems.length === 0) {
        doneContainer.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No completed feedback</p></div>';
    } else {
        doneContainer.innerHTML = doneItems.map(item => `
            <div class="feedback-item done">
                <input type="checkbox" class="feedback-checkbox"
                       data-feedback-id="${item.id}"
                       checked>
                <span class="feedback-type-icon">${typeIcons[item.type] || '💡'}</span>
                ${item.screenshotUrl ? `<button type="button" class="feedback-screenshot-link" data-action="viewFeedbackScreenshot" data-param="${encodeURIComponent(item.screenshotUrl)}" title="View screenshot">🖼️</button>` : ''}
                <div class="feedback-description">${escapeHtml(item.description)}</div>
                <div class="feedback-date">${formatDate(item.createdAt)}</div>
                <button class="feedback-delete-btn" data-action="deleteFeedbackItemWithStop" data-param="${item.id}">❌</button>
            </div>
        `).join('');
    }
}

// === History Rendering - Inline for Tasks and Projects ===

// Modal tab switching
function setupModalTabs() {
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            const modalContent = e.target.closest('.modal-content');

            // Update tab buttons
            modalContent.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

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
        sortButton.innerHTML = settings.historySortOrder === 'newest' ? '↓ Newest First' : '↑ Oldest First';
        sortButton.onclick = () => toggleHistorySortOrder('task', taskId);
        historyContainer.insertBefore(sortButton, timeline);
    } else {
        sortButton.innerHTML = settings.historySortOrder === 'newest' ? '↓ Newest First' : '↑ Oldest First';
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
        sortButton.innerHTML = settings.historySortOrder === 'newest' ? '↓ Newest First' : '↑ Oldest First';
        sortButton.onclick = () => toggleHistorySortOrder('project', projectId);
        historyContainer.insertBefore(sortButton, timeline);
    } else {
        sortButton.innerHTML = settings.historySortOrder === 'newest' ? '↓ Newest First' : '↑ Oldest First';
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

    const time = new Date(entry.timestamp).toLocaleString('en-US', {
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
        title: 'Title',
        name: 'Name',
        description: 'Description',
        status: 'Status',
        priority: 'Priority',
        category: 'Category',
        startDate: 'Start Date',
        endDate: 'End Date',
        projectId: 'Project',
        tags: 'Tags',
        attachments: 'Attachments'
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

                        // Special handling for description - show full diff
                        if (field === 'description') {
                            const oldText = before ? before.replace(/<[^>]*>/g, '').trim() : '';
                            const newText = after ? after.replace(/<[^>]*>/g, '').trim() : '';

                            return `
                                <div class="history-change-description">
                                    <div class="change-field-label">${label}:</div>
                                    <div class="description-diff">
                                        ${oldText ? `<div class="description-before"><s>${escapeHtml(oldText)}</s></div>` : '<div class="description-before"><em style="opacity: 0.6;">empty</em></div>'}
                                        ${newText ? `<div class="description-after">${escapeHtml(newText)}</div>` : '<div class="description-after"><em style="opacity: 0.6;">empty</em></div>'}
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
                                <span class="change-arrow-compact">→</span>
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
    if (value === '') return '<em style="opacity: 0.7;">empty</em>';

    // Special formatting for different field types
    if (field === 'startDate' || field === 'endDate') {
        const dateStr = formatDate(value);
        return isBeforeValue ? `<span style="opacity: 0.7;">${dateStr}</span>` : dateStr;
    }

    if (field === 'status') {
        // Use status badge with proper color - NO opacity
        const statusLabel = STATUS_LABELS[value] || value;
        const statusColors = {
            todo: '#4B5563',
            progress: 'var(--accent-blue)',
            review: 'var(--accent-amber)',
            done: 'var(--accent-green)'
        };
        const bgColor = statusColors[value] || '#4B5563';
        return `<span style="background: ${bgColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">${escapeHtml(statusLabel)}</span>`;
    }

    if (field === 'priority') {
        // Use priority label with proper color - NO opacity
        const priorityLabel = PRIORITY_LABELS[value] || value;
        const priorityColor = PRIORITY_COLORS[value] || 'var(--text-secondary)';
        return `<span style="color: ${priorityColor}; font-weight: 600; font-size: 12px;">●</span> <span style="font-weight: 500;">${escapeHtml(priorityLabel)}</span>`;
    }

    if (field === 'projectId') {
        if (!value) return '<em style="opacity: 0.7;">No Project</em>';
        const project = projects.find(p => p.id === value);
        const projectName = project ? escapeHtml(project.name) : `#${value}`;
        return isBeforeValue ? `<span style="opacity: 0.7;">${projectName}</span>` : projectName;
    }

    if (field === 'tags') {
        // NO opacity for tags
        if (!Array.isArray(value) || value.length === 0) return '<em style="opacity: 0.7;">none</em>';
        return value.slice(0, 2).map(tag => {
            const tagColor = getTagColor(tag);
            return `<span style="background-color: ${tagColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`;
        }).join(' ') + (value.length > 2 ? ' ...' : '');
    }

    if (field === 'attachments') {
        if (!Array.isArray(value) || value.length === 0) return '<em style="opacity: 0.7;">none</em>';
        const attachStr = `${value.length} file${value.length !== 1 ? 's' : ''}`;
        return isBeforeValue ? `<span style="opacity: 0.7;">${attachStr}</span>` : attachStr;
    }

    if (field === 'description') {
        const text = value.replace(/<[^>]*>/g, '').trim();
        const shortText = text.length > 50 ? escapeHtml(text.substring(0, 50)) + '...' : escapeHtml(text) || '<em>empty</em>';
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
        title: 'Title',
        name: 'Name',
        description: 'Description',
        status: 'Status',
        priority: 'Priority',
        category: 'Category',
        startDate: 'Start Date',
        endDate: 'End Date',
        projectId: 'Project',
        tags: 'Tags',
        attachments: 'Attachments'
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
                        ${beforeValue !== null ? `<span class="change-label">Before:</span> ${beforeValue}` : '<span class="change-label-null">Not set</span>'}
                    </div>
                    <div class="history-change-arrow">→</div>
                    <div class="history-change-after">
                        ${afterValue !== null ? `<span class="change-label">After:</span> ${afterValue}` : '<span class="change-label-null">Removed</span>'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function formatChangeValue(field, value) {
    if (value === null || value === undefined) return null;
    if (value === '') return '<em style="color: var(--text-muted);">empty</em>';

    // Special formatting for different field types
    if (field === 'startDate' || field === 'endDate') {
        return formatDate(value);
    }

    if (field === 'projectId') {
        if (!value) return '<em style="color: var(--text-muted);">No Project</em>';
        const project = projects.find(p => p.id === value);
        return project ? escapeHtml(project.name) : `Project #${value}`;
    }

    if (field === 'tags') {
        if (!Array.isArray(value) || value.length === 0) {
            return '<em style="color: var(--text-muted);">No tags</em>';
        }
        return value.map(tag => `<span class="history-tag">${escapeHtml(tag)}</span>`).join(' ');
    }

    if (field === 'attachments') {
        if (!Array.isArray(value) || value.length === 0) {
            return '<em style="color: var(--text-muted);">No attachments</em>';
        }
        return `${value.length} attachment${value.length !== 1 ? 's' : ''}`;
    }

    if (field === 'description') {
        // Strip HTML tags and truncate
        const text = value.replace(/<[^>]*>/g, '').trim();
        if (text.length > 100) {
            return escapeHtml(text.substring(0, 100)) + '...';
        }
        return escapeHtml(text) || '<em style="color: var(--text-muted);">empty</em>';
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

function confirmFeedbackDelete() {
    if (feedbackItemToDelete !== null) {
        feedbackItems = feedbackItems.filter(f => f.id !== feedbackItemToDelete);
        saveFeedback();
        render();
        closeFeedbackDeleteModal();
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

function addAttachment() {
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
                    name = "Google Doc";
                    icon = "📄";
                } else if (path.includes("/spreadsheets/")) {
                    name = "Google Sheet";
                    icon = "📊";
                } else if (path.includes("/presentation/")) {
                    name = "Google Slides";
                    icon = "📑";
                } else {
                    name = "Google Drive File";
                    icon = "🗂️";
                }
            } else if (urlObj.hostname.includes("drive.google.com")) {
                name = "Google Drive File";
                icon = "🗂️";
            } else if (path.endsWith(".pdf")) {
                name = path.split("/").pop() || "PDF Document";
                icon = "📕";
            } else if (path.endsWith(".doc") || path.endsWith(".docx")) {
                name = path.split("/").pop() || "Word Document";
                icon = "📝";
            } else if (path.endsWith(".xls") || path.endsWith(".xlsx")) {
                name = path.split("/").pop() || "Excel File";
                icon = "📊";
            } else if (path.endsWith(".ppt") || path.endsWith(".pptx")) {
                name = path.split("/").pop() || "PowerPoint";
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
        saveTasks();
        renderAttachments(task.attachments);
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
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 8px 0;">No attachments</div>';
        return;
    }

    // First render with placeholders
    container.innerHTML = attachments.map((att, index) => {
        const sizeInKB = att.size ? Math.round(att.size / 1024) : 0;
        const sizeText = sizeInKB > 1024 ? `${(sizeInKB/1024).toFixed(1)} MB` : `${sizeInKB} KB`;

        // New file system (with fileKey)
        if (att.type === 'file' && att.fileKey) {
            const isImage = att.fileType === 'image';
            // Show placeholder, will load image if it's an image
            const thumbnailHtml = `<div id="thumbnail-${att.fileKey}" style="width: 60px; height: 60px; background: var(--bg-secondary); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 28px; cursor: ${isImage ? 'pointer' : 'default'};" ${isImage ? `data-action="viewFile" data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.fileType}"` : ''}>${att.icon}</div>`;

            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
                    ${thumbnailHtml}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${sizeText}</div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${isImage ?
                            `<button type="button" data-action="viewFile" data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.fileType}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;">Open</button>` :
                            `<button type="button" data-action="downloadFileAttachment" data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.mimeType}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;">Download</button>`
                        }
                        <button type="button" data-action="removeAttachment" data-param="${index}" style="padding: 0 12px; background: var(--accent-red); color: white; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">Delete</button>
                    </div>
                </div>
            `;
        }

        // Legacy: Old inline Base64 images (backward compatibility) - still show thumbnail since data is already in memory
        else if (att.type === 'image' && att.data) {
            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
                    <img src="${att.data}" alt="${escapeHtml(att.name)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer;" data-action="viewImageLegacy" data-param="${att.data}" data-param2="${escapeHtml(att.name)}">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${sizeText}</div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button type="button" data-action="viewImageLegacy" data-param="${att.data}" data-param2="${escapeHtml(att.name)}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;">Open</button>
                        <button type="button" data-action="removeAttachment" data-param="${index}" style="padding: 0 12px; background: var(--accent-red); color: white; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">Delete</button>
                    </div>
                </div>
            `;
        }

        // URL attachment
        else {
            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
                    <div style="width: 40px; height: 40px; background: transparent; border-radius: 0; display: flex; align-items: center; justify-content: center; font-size: 25px; line-height: 1;">🌐</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.url)}</div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button type="button" data-action="openUrlAttachment" data-param="${encodeURIComponent(att.url)}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">Open</button>
                        <button type="button" data-action="removeAttachment" data-param="${index}" style="padding: 0 12px; background: var(--accent-red); color: white; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">Delete</button>
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
                    thumbnailEl.innerHTML = `<img src="${base64Data}" alt="${escapeHtml(att.name)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">`;
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

    const fileRows = fileItems.map(({ att, index }) => {
        const sizeInKB = att.size ? Math.round(att.size / 1024) : 0;
        const sizeText = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;

        if (att.type === 'file' && att.fileKey) {
            const isImage = att.fileType === 'image';
            const thumbnailHtml = `<div id="thumbnail-${att.fileKey}" style="width: 60px; height: 60px; background: var(--bg-secondary); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 28px; cursor: ${isImage ? 'pointer' : 'default'};" ${isImage ? `data-action="viewFile" data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.fileType}"` : ''}>${att.icon}</div>`;

            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
                    ${thumbnailHtml}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${sizeText}</div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${isImage
                            ? `<button type="button" data-action="viewFile" data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.fileType}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;">Open</button>`
                            : `<button type="button" data-action="downloadFileAttachment" data-param="${att.fileKey}" data-param2="${escapeHtml(att.name)}" data-param3="${att.mimeType}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;">Download</button>`}
                        <button type="button" data-action="removeAttachment" data-param="${index}" style="padding: 0 12px; background: var(--accent-red); color: white; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">Delete</button>
                    </div>
                </div>
            `;
        }

        if (att.type === 'image' && att.data) {
            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
                    <img src="${att.data}" alt="${escapeHtml(att.name)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer;" data-action="viewImageLegacy" data-param="${att.data}" data-param2="${escapeHtml(att.name)}">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${sizeText}</div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button type="button" data-action="viewImageLegacy" data-param="${att.data}" data-param2="${escapeHtml(att.name)}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;">Open</button>
                        <button type="button" data-action="removeAttachment" data-param="${index}" style="padding: 0 12px; background: var(--accent-red); color: white; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">Delete</button>
                    </div>
                </div>
            `;
        }

        return '';
    }).filter(Boolean).join('');

    const linkRows = linkItems.map(({ att, index }) => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
            <div style="width: 40px; height: 40px; background: transparent; border-radius: 0; display: flex; align-items: center; justify-content: center; font-size: 25px; line-height: 1;">🌐</div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name)}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.url)}</div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" data-action="openUrlAttachment" data-param="${encodeURIComponent(att.url)}" style="padding: 0 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">Open</button>
                <button type="button" data-action="removeAttachment" data-param="${index}" style="padding: 0 12px; background: var(--accent-red); color: white; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; height: 32px; line-height: 1; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; appearance: none; -webkit-appearance: none;">Delete</button>
            </div>
        </div>
    `).join('');

    const hasAny = Boolean(fileRows) || Boolean(linkRows);
    if (!hasAny) {
        filesContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 8px 0;">No attachments</div>';
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
                    thumbnailEl.innerHTML = `<img src="${base64Data}" alt="${escapeHtml(att.name)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">`;
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
        showErrorNotification('Failed to load image: ' + error.message);
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

        showSuccessNotification('File downloaded!');
    } catch (error) {
        showErrorNotification('Failed to download file: ' + error.message);
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
                showSuccessNotification(`${attachment.name} deleted from storage`);
            } catch (error) {
                console.error('Failed to delete file from storage:', error);
                showErrorNotification('Failed to delete file from storage');
                return; // Don't remove from task if storage deletion failed
            }
        } else {
            showSuccessNotification('Attachment removed');
        }

        task.attachments.splice(index, 1);
        await saveTasks();
        renderAttachments(task.attachments);
    } else {
        // Removing from staged attachments
        const attachment = tempAttachments[index];

        // Delete file from NAUTILUS_FILES KV if it's a file attachment
        if (attachment.type === 'file' && attachment.fileKey) {
            try {
                await deleteFile(attachment.fileKey);
                showSuccessNotification(`${attachment.name} deleted from storage`);
            } catch (error) {
                console.error('Failed to delete file from storage:', error);
                showErrorNotification('Failed to delete file from storage');
                return; // Don't remove from staging if storage deletion failed
            }
        } else {
            showSuccessNotification('Attachment removed');
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
        ? 'Tap to attach file'
        : 'Drag & drop or click to attach file';

    dropzone.dataset.defaultText = defaultText;

    function setDropzoneText(text) {
        dropzone.innerHTML = '';
        const iconEl = document.createElement('span');
        iconEl.className = 'task-attachment-dropzone-icon';
        iconEl.textContent = '📁';
        const textEl = document.createElement('span');
        textEl.className = 'task-attachment-dropzone-text';
        textEl.textContent = text;
        dropzone.appendChild(iconEl);
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
        el.style.border = '2px dashed rgba(148, 163, 184, 0.45)';
        el.style.borderRadius = '10px';
        el.style.background = 'var(--bg-tertiary)';
        el.style.boxShadow = 'none';
        el.style.transition = 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease';
    }

    function setDropzoneDragoverStyles(el, isActive) {
        if (isActive) {
            el.style.borderColor = 'rgba(59, 130, 246, 0.98)';
            el.style.background = 'rgba(59, 130, 246, 0.06)';
            el.style.boxShadow = '0 0 0 1px rgba(59, 130, 246, 0.22)';
        } else {
            el.style.borderColor = 'rgba(148, 163, 184, 0.45)';
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
        showErrorNotification(`File size must be less than ${maxMB}MB. Please choose a smaller file.`);
        return;
    }

    const isButton = uiEl && uiEl.tagName === 'BUTTON';
    const originalText = isButton ? (uiEl.textContent || '📁 Upload File') : null;
    const defaultText = !isButton ? (uiEl?.dataset?.defaultText || 'Drag & drop or click to attach file') : null;

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
            await saveTasks();
            renderAttachments(task.attachments);
        } else {
            tempAttachments.push(attachment);
            renderAttachments(tempAttachments);
        }

        showSuccessNotification('File uploaded successfully!');

    } catch (error) {
        showErrorNotification('Error uploading file: ' + error.message);
    } finally {
        if (uiEl) {
            if (isButton) {
                uiEl.textContent = originalText;
                uiEl.disabled = false;
            } else {
                uiEl.innerHTML = '';
                const iconEl = document.createElement('span');
                iconEl.className = 'task-attachment-dropzone-icon';
                iconEl.textContent = '📁';
                const textEl = document.createElement('span');
                textEl.className = 'task-attachment-dropzone-text';
                textEl.textContent = defaultText;
                uiEl.appendChild(iconEl);
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
        showErrorNotification('Please select a file');
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
        case 'image': return '🖼️';
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
window.kanbanShowProjects = localStorage.getItem('kanbanShowProjects') !== 'false';
window.kanbanShowNoDate = localStorage.getItem('kanbanShowNoDate') !== 'false';

function toggleKanbanSettings(event) {
    event.stopPropagation();
    const panel = document.getElementById('kanban-settings-panel');
    const isActive = panel.classList.contains('active');

    if (isActive) {
        panel.classList.remove('active');
    } else {
        panel.classList.add('active');
        // Load current state
        document.getElementById('kanban-show-projects').checked = window.kanbanShowProjects !== false;
        document.getElementById('kanban-show-no-date').checked = window.kanbanShowNoDate !== false;
    }
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

function updateTaskField(field, value) {
  const form = document.getElementById('task-form');
  const taskId = form?.dataset.editingTaskId;
  if (!taskId) return;

  // Capture old task state for history tracking
  const oldTask = tasks.find(t => t.id === parseInt(taskId, 10));
  const oldTaskCopy = oldTask ? JSON.parse(JSON.stringify(oldTask)) : null;

  // Use task service to update field
  const normalizedValue = field === 'description' ? autoLinkifyDescription(value) : value;
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
  }

  saveTasks();
    if (field === 'endDate') {
        // Toggle "No Date" option visibility on end date changes
        updateNoDateOptionVisibility();
    }

  // Check if we're in project details view
  const isInProjectDetails = document.getElementById("project-details").classList.contains("active");
    // Calendar refresh for fields that affect date/project placement
    if (field === 'startDate' || field === 'endDate' || field === 'projectId' || field === 'status' || field === 'priority' || field === 'title') {
        reflowCalendarBars();
    }
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
    if (document.getElementById('calendar-view').classList.contains('active')) renderCalendar();
    if (document.getElementById('projects').classList.contains('active')) {
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
    status: form.querySelector('#hidden-status')?.value || "todo",
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
    status: form.querySelector('#hidden-status')?.value || "todo",
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
document.addEventListener('keydown', e => {
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
});


function addTag() {
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
        saveTasks();
        renderTags(task.tags);

        // Record history
        if (window.historyService) {
            window.historyService.recordTaskUpdated(oldTaskCopy, task);
        }

        // Refresh Kanban view immediately
        renderTasks();
        if (document.getElementById('list-view').classList.contains('active')) renderListView();
    populateTagOptions(); // Refresh tag dropdown only
    updateNoDateOptionVisibility();
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

function removeTag(tagName) {
    const taskId = document.getElementById('task-form').dataset.editingTaskId;

    if (taskId) {
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (!task || !task.tags) return;

        // Store old state for history
        const oldTaskCopy = JSON.parse(JSON.stringify(task));

        task.tags = task.tags.filter(t => t !== tagName);
        saveTasks();
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
            renderTasks();
            if (document.getElementById('list-view').classList.contains('active')) renderListView();
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
        container.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">No tags</span>';
        return;
    }
    
    container.innerHTML = tags.map(tag => {
        const color = getTagColor(tag);
        return `
            <span class="task-tag" style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                ${escapeHtml(tag.toUpperCase())}
                <button type="button" data-action="removeTag" data-param="${escapeHtml(tag)}" style="background: none; border: none; color: white; cursor: pointer; padding: 0; font-size: 14px; line-height: 1;">×</button>
            </span>
        `;
    }).join('');
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
            openTaskDetails(parseInt(param));
        },
        'deleteTask': () => deleteTask(),
        'duplicateTask': () => duplicateTask(),
        'confirmDelete': () => confirmDelete(),

        // Project operations
        'showProjectDetails': () => {
            if (target.dataset.stopPropagation) event.stopPropagation();
            showProjectDetails(parseInt(param));
        },
        'toggleProjectExpand': () => toggleProjectExpand(parseInt(param)),
        'toggleProjectMenu': () => toggleProjectMenu(event),
        'editProjectTitle': () => editProjectTitle(parseInt(param), param2),
        'saveProjectTitle': () => saveProjectTitle(parseInt(param)),
        'cancelProjectTitle': () => cancelProjectTitle(),
        'handleDeleteProject': () => handleDeleteProject(parseInt(param)),
        'toggleProjectColorPicker': () => toggleProjectColorPicker(parseInt(param)),
        'updateProjectColor': () => updateProjectColor(parseInt(param), param2),
        'openCustomProjectColorPicker': () => openCustomProjectColorPicker(parseInt(param)),
        'navigateToProjectStatus': () => navigateToProjectStatus(parseInt(param), param2),
        'deleteProject': () => deleteProject(),
        'confirmProjectDelete': () => confirmProjectDelete(),

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
        'changeMonth': () => changeMonth(parseInt(param)),
        'goToToday': () => goToToday(),
        'showDayTasks': () => showDayTasks(param),

        // Attachments & tags
        'addAttachment': () => addAttachment(),
        'addFileAttachment': () => addFileAttachment(event),
        'addTag': () => addTag(),
        'removeTag': () => removeTag(param),
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
              showErrorNotification && showErrorNotification('Could not open screenshot');
          }
      },

        // Navigation
        'backToProjects': () => backToProjects(),
        'showAllActivity': () => showAllActivity(),
        'backToDashboard': () => backToDashboard(),

        // Other
        'dismissKanbanTip': () => dismissKanbanTip(),
        'confirmDiscardChanges': () => confirmDiscardChanges(),
        'signOut': () => signOut(),
        'exportDashboardData': () => exportDashboardData(),
        'generateReport': () => generateReport(),
        'showStatusInfoModal': () => {
            event.stopPropagation();
            document.getElementById('status-info-modal').classList.add('active');
        },

        // Special case: stopPropagation
        'stopPropagation': () => event.stopPropagation(),

        // Special case: close modal only if backdrop is clicked
        'closeModalOnBackdrop': () => {
            if (event.target === event.currentTarget) {
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
            showProjectDetails(parseInt(param));
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
        items += '<div class="project-option" data-project-id="">Select a project</div>';
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

/**
 * applyProjectsSort(value, base)
 * value: sort key (same as before)
 * base: optional array of projects to sort (e.g., filtered view). If omitted, use full projects array.
 */
function applyProjectsSort(value, base) {
    if (!value || value === 'default') {
        projectsSortedView = null;
        // If a base (filtered list) is provided we should render that, otherwise render full projects
        if (base && Array.isArray(base)) {
            renderView(base);
        } else {
            renderProjects();
        }
        return;
    }

    // Use provided base or full projects, but do not mutate original arrays
    const view = (base && Array.isArray(base) ? base.slice() : projects.slice());
    
    if (value === 'name-asc') {
        view.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    } else if (value === 'name-desc') {
        view.sort((a,b) => (b.name||'').localeCompare(a.name||''));
    } else if (value === 'created-desc') {
        view.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (value === 'tasks-desc') {
        view.sort((a,b) => (tasks.filter(t=>t.projectId===b.id).length) - (tasks.filter(t=>t.projectId===a.id).length));
    } else if (value === 'completion-desc') {
        // Sort by completion percentage (highest first)
        view.sort((a,b) => {
            const aTotal = tasks.filter(t => t.projectId === a.id).length;
            const aDone = tasks.filter(t => t.projectId === a.id && t.status === 'done').length;
            const aPercent = aTotal > 0 ? (aDone / aTotal) * 100 : 0;
            
            const bTotal = tasks.filter(t => t.projectId === b.id).length;
            const bDone = tasks.filter(t => t.projectId === b.id && t.status === 'done').length;
            const bPercent = bTotal > 0 ? (bDone / bTotal) * 100 : 0;
            
            return bPercent - aPercent; // Highest completion first
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
}

// Hook up the select after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Sort button + panel handlers
    const sortBtn = document.getElementById('projects-sort-btn');
    const sortPanel = document.getElementById('projects-sort-panel');
    const sortLabel = document.getElementById('projects-sort-label');
    if (sortBtn && sortPanel) {
        sortBtn.addEventListener('click', (e) => {
            const open = sortBtn.getAttribute('aria-expanded') === 'true';
            sortBtn.setAttribute('aria-expanded', String(!open));
            sortPanel.setAttribute('aria-hidden', String(open));
            e.stopPropagation();
        });

        // Clicking an option
        // If there are duplicate panels (from previous DOM states), select carefully
        const panel = document.getElementById('projects-sort-panel');
        if (!panel) return;
        panel.querySelectorAll('.projects-sort-option').forEach(opt => {
            opt.addEventListener('click', (ev) => {
                const sortKey = opt.dataset.sort;
                // compute base respecting current search and chips
                let base = projects.slice();
                const active = Array.from(document.querySelectorAll('.pf-chip')).find(c=>c.classList.contains('active'))?.dataset.filter;
                if (active === 'has-tasks') base = base.filter(p => tasks.some(t => t.projectId === p.id));
                else if (active === 'no-tasks') base = base.filter(p => !tasks.some(t => t.projectId === p.id));
                const searchEl = document.getElementById('projects-search');
                if (searchEl && searchEl.value && searchEl.value.trim() !== '') {
                    const q = searchEl.value.trim().toLowerCase();
                    base = base.filter(p => ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q));
                }
                // apply sort and update label
                applyProjectsSort(sortKey, base);
                const labelText = (sortKey === 'default') ? 'Sort: Status' : `Sort: ${opt.textContent.trim()}`;
                if (sortLabel) sortLabel.textContent = labelText;
                // persist
                const saved = loadProjectsViewState() || { search: '', filter: '', sort: 'default' };
                saveProjectsViewState({ ...saved, sort: sortKey });
                // close panel
                sortBtn.setAttribute('aria-expanded', 'false');
                sortPanel.setAttribute('aria-hidden', 'true');
            });
        });

        // Close panel on outside click
        document.addEventListener('click', () => {
            sortBtn.setAttribute('aria-expanded', 'false');
            sortPanel.setAttribute('aria-hidden', 'true');
        });
    }
    // Projects-only search + chips (non-destructive)
    const search = document.getElementById('projects-search');
    const chips = Array.from(document.querySelectorAll('.pf-chip'));
    if (search) {
        search.addEventListener('input', debounce((e) => {
            const q = (e.target.value || '').trim().toLowerCase();
            // apply search on top of any sorted view
            let base = projectsSortedView ? projectsSortedView.slice() : projects.slice();
            if (q) base = base.filter(p => ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q));
            // render base
            renderView(base);
            updateProjectsClearButtonVisibility();
        }, 220));
    }

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const v = chip.dataset.filter;
            let base = projectsSortedView ? projectsSortedView.slice() : projects.slice();
            if (v === 'has-tasks') base = base.filter(p => tasks.some(t => t.projectId === p.id));
            else if (v === 'no-tasks') base = base.filter(p => !tasks.some(t => t.projectId === p.id));
            renderView(base);
            updateProjectsClearButtonVisibility();
        });
    });
    // ensure visibility is synced at start
    updateProjectsClearButtonVisibility();
});

// --- Utilities: debounce and persistence for Projects view state ---
function debounce(fn, wait) {
    let t = null;
    return function(...args) {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

function saveProjectsViewState(state) {
    try {
        localStorage.setItem('projectsViewState', JSON.stringify(state));
    } catch (e) {}
}

function loadProjectsViewState() {
    try {
        const raw = localStorage.getItem('projectsViewState');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}


// Helper: render a view array of projects (used by search/chips)
function renderView(view) {
    const container = document.getElementById('projects-list');
    if (!container) return;
    if (!view || view.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No projects matched</h3></div>';
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
}

// Initialize and persist project header controls
function setupProjectsControls() {
    const sel = document.getElementById('projects-sort');
    const sortBtn = document.getElementById('projects-sort-btn');
    const sortLabel = document.getElementById('projects-sort-label');
    const search = document.getElementById('projects-search');
    const chips = Array.from(document.querySelectorAll('.pf-chip'));

    // Load saved state
    const saved = loadProjectsViewState() || { search: '', filter: 'clear', sort: 'default' };

    // Apply saved search value to the input (don't render yet)
    if (search) search.value = saved.search || '';

    // Apply saved chip selection only if it maps to an existing chip (we no longer have an 'All' chip)
    if (chips && chips.length) {
        chips.forEach(c => c.classList.remove('active'));
        if (saved.filter && ['has-tasks','no-tasks'].includes(saved.filter)) {
            const activeChip = chips.find(c => c.dataset.filter === saved.filter);
            if (activeChip) activeChip.classList.add('active');
        }
    }

    // Prepare initial base according to saved search and chip filter, then apply saved sort and render
    let initialBase = projectsSortedView && projectsSortedView.length ? projectsSortedView.slice() : projects.slice();
    // filter by saved search
    if (search && search.value && search.value.trim() !== '') {
        const q = search.value.trim().toLowerCase();
        initialBase = initialBase.filter(p => ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q));
    }
    // filter by saved chip selection (prefer saved.filter)
    const chipFilter = (saved.filter && ['has-tasks','no-tasks'].includes(saved.filter)) ? saved.filter : (Array.from(document.querySelectorAll('.pf-chip')).find(c=>c.classList.contains('active'))?.dataset.filter);
    if (chipFilter === 'has-tasks') initialBase = initialBase.filter(p => tasks.some(t => t.projectId === p.id));
    else if (chipFilter === 'no-tasks') initialBase = initialBase.filter(p => !tasks.some(t => t.projectId === p.id));

    // Apply saved sort label
    if (sortBtn) {
        const sortKey = saved.sort || 'default';
        const sortLabels = {
            'default': 'Sort: Status',
            'name-asc': 'Sort: Name A → Z',
            'name-desc': 'Sort: Name Z → A',
            'created-desc': 'Sort: Newest',
            'tasks-desc': 'Sort: Most tasks',
            'completion-desc': 'Sort: % Completed'
        };
        const labelText = sortLabels[sortKey] || `Sort: ${sortKey}`;
        if (sortLabel) sortLabel.textContent = labelText;
    }

    // Finally apply saved sort to the initial base and render
    const selSort = saved.sort || 'default';
    applyProjectsSort(selSort, initialBase);

    // Wire up search input (merge with current saved state to avoid stale overwrites)
    if (search) {
        search.addEventListener('input', debounce((e) => {
            const q = (e.target.value || '').trim().toLowerCase();
            // Always base searches on the full projects list, then re-apply any saved sort
            let base = projects.slice();
            const result = q ? base.filter(p => ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q)) : base;
            // Apply saved sort if present
            const cur = loadProjectsViewState() || {};
            const selSort = cur.sort || 'default';
            if (selSort && selSort !== 'default') applyProjectsSort(selSort, result);
            else renderView(result);
            saveProjectsViewState({ ...cur, search: e.target.value });
            updateProjectsClearButtonVisibility();
        }, 220));
    }

    // Wire up chip clicks (merge with current saved state)
    if (chips && chips.length) {
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const v = chip.dataset.filter;
                // Always base chip filtering on the full projects list, then re-apply the current sort
                let base = projects.slice();
                if (v === 'has-tasks') base = base.filter(p => tasks.some(t => t.projectId === p.id));
                else if (v === 'no-tasks') base = base.filter(p => !tasks.some(t => t.projectId === p.id));
                const cur = loadProjectsViewState() || {};
                const selSort = cur.sort || 'default';
                if (selSort && selSort !== 'default') applyProjectsSort(selSort, base);
                else renderView(base);
                saveProjectsViewState({ ...cur, filter: v });
                updateProjectsClearButtonVisibility();
            });
        });
    }

    // Projects Clear button: only affects projects-scoped search & chips (preserve sort)
    const clearProjectsBtn = document.getElementById('btn-clear-projects');
    if (clearProjectsBtn) {
        clearProjectsBtn.addEventListener('click', () => {
            // Clear projects search and reset chips (no 'All' chip available)
            if (search) search.value = '';
            chips.forEach(c => c.classList.remove('active'));
            // Re-render respecting current saved sort (but with full base)
            const savedState = loadProjectsViewState() || saved;
            const selVal = savedState.sort || 'default';
            const base = projects.slice();
            applyProjectsSort(selVal, base);
            saveProjectsViewState({ search: '', filter: '', sort: selVal });
            updateProjectsClearButtonVisibility();
        });
    }

    // Ensure visibility is synced after setup
    updateProjectsClearButtonVisibility();
}

// Show/hide the Projects-specific Clear button when a projects filter/search is active
function updateProjectsClearButtonVisibility() {
    const btn = document.getElementById('btn-clear-projects');
    if (!btn) return;
    const searchEl = document.getElementById('projects-search');
    const chips = Array.from(document.querySelectorAll('.pf-chip'));
    const activeChip = chips.find(c => c.classList.contains('active'));
    const hasSearch = searchEl && searchEl.value && searchEl.value.trim() !== '';
    const hasChipFilter = activeChip && activeChip.dataset.filter && activeChip.dataset.filter !== 'clear';
    const shouldShow = hasSearch || hasChipFilter;
    btn.style.display = shouldShow ? 'inline-flex' : 'none';
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
        wrapper.innerHTML = `<div class=\"checkbox-row\" data-id=\"${id2}\" contenteditable=\"false\"><button type=\"button\" class=\"checkbox-toggle variant-1\" aria-pressed=\"false\" title=\"Toggle checkbox\" contenteditable=\"false\"></button><div class=\"check-text\" contenteditable=\"true\"></div></div>`;
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
