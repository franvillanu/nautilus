let projects = [];
let tasks = [];
let feedbackItems = [];
let projectCounter = 1;
let taskCounter = 1;
let feedbackCounter = 1;
let selectedCards = new Set();
let projectToDelete = null;
let tempAttachments = [];

// Status labels for consistent display
const statusLabels = {
    todo: "To Do",
    progress: "In Progress", 
    review: "Review",
    done: "Done"
};

import { loadData, saveData } from "./storage-client.js";

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
        await saveData('sortMode', sortMode);
        await saveData('manualTaskOrder', manualTaskOrder);
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
        const savedMode = await loadData('sortMode');
        const savedOrder = await loadData('manualTaskOrder');
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
        const priorityOrder = { high: 3, medium: 2, low: 1 };
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
                .sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0))
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
    await saveData("projects", projects);
    await saveData("tasks", tasks);
    await saveData("feedbackItems", feedbackItems);
}

async function saveProjects() {
    await saveData("projects", projects);
}

async function saveTasks() {
    await saveData("tasks", tasks);
}

async function saveFeedback() {
    await saveData("feedbackItems", feedbackItems);
}

async function saveProjectColors() {
    await saveData("projectColors", projectColorMap);
}

function loadProjectColors() {
    const stored = localStorage.getItem("projectColors");
    if (stored) {
        try {
            projectColorMap = JSON.parse(stored);
        } catch (e) {
            console.error("Error loading project colors:", e);
        }
    }
}

async function loadDataFromKV() {
    const loadedProjects = await loadData("projects");
    const loadedTasks = await loadData("tasks");
    const loadedFeedback = await loadData("feedbackItems");

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


// After the tempAttachments declaration
const TAG_COLORS = [
    // Darker, high-contrast colors for reliable white text legibility
    '#dc2626', // red-600
    '#ea580c', // orange-600
    '#b45309', // amber-700
    '#ca8a04', // yellow-700 (darker)
    '#16a34a', // green-600
    '#059669', // emerald-600
    '#0ea5a4', // teal-500
    '#0284c7', // blue-600
    '#0369a1', // sky-700
    '#4338ca', // indigo-700
    '#7c3aed', // violet-600
    '#6b21a8', // purple-800
    '#be185d', // pink-600
    '#e11d48', // rose-600
    '#065f46', // emerald-800 (deep)
    '#334155'  // slate-700 neutral
];
let tagColorMap = {}; // Maps tag names to colors
let projectColorMap = {}; // Maps project IDs to custom colors
let colorIndex = 0;

function getTagColor(tagName) {
    if (!tagColorMap[tagName]) {
        tagColorMap[tagName] = TAG_COLORS[colorIndex % TAG_COLORS.length];
        colorIndex++;
    }
    return tagColorMap[tagName];
}

// Project color management - optimized for dark mode with white text
const PROJECT_COLORS = [
    '#6C5CE7', // Purple - good contrast
    '#3742FA', // Indigo - good contrast  
    '#E84393', // Pink - good contrast
    '#00B894', // Teal - good contrast
    '#74B9FF', // Light blue - replaced with darker blue
    '#0984E3', // Blue - better contrast than light blue
    '#00CEC9', // Cyan - good contrast
    '#E17055', // Orange - good contrast
    '#9B59B6', // Purple variant - good contrast
    '#2F3542', // Dark gray - good contrast
    '#FF3838', // Red - good contrast
    '#6C5B7B', // Mauve - good contrast
    '#C44569', // Berry - good contrast
    '#F8B500', // Amber - good contrast
    '#5758BB'  // Deep purple - good contrast
];

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
            const hexColor = '#' + rgbColor.map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            option.style.border = hexColor.toUpperCase() === color.toUpperCase() ? '2px solid white' : '2px solid transparent';
        });
    }
    // Close picker
    toggleProjectColorPicker(projectId);
}


// === Global filter state ===
let filterState = {
    search: "",
    statuses: new Set(),
    priorities: new Set(),
    projects: new Set(),
    tags: new Set(),
    date: "",
};

// Initialize filters UI - only call once on page load
function initFiltersUI() {
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

    // Open/close dropdown panels for Status, Priority, Project, Tags
    const groups = [
        document.getElementById("group-status"),
        document.getElementById("group-priority"),
        document.getElementById("group-project"),
        document.getElementById("group-tags"),
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

    // Date select
    const dateEl = document.getElementById("filter-date-global");
    if (dateEl) {
        dateEl.addEventListener("change", () => {
            filterState.date = dateEl.value;
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

    // Clear all filters
    const clearBtn = document.getElementById("btn-clear-filters");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            filterState.search = "";
            filterState.statuses.clear();
            filterState.priorities.clear();
            filterState.projects.clear();
            filterState.tags.clear();
            filterState.date = "";

            // Reset UI elements
            document
                .querySelectorAll('.dropdown-panel input[type="checkbox"]')
                .forEach((cb) => (cb.checked = false));
            if (searchEl) searchEl.value = "";
            if (dateEl) dateEl.value = "";

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
        (filterState.date && filterState.date !== "");

    btn.style.display = hasFilters ? "inline-flex" : "none";
}

// Update numeric badges for each dropdown
function updateFilterBadges() {
    const b1 = document.getElementById("badge-status");
    const b2 = document.getElementById("badge-priority");
    const b3 = document.getElementById("badge-project");
    const b4 = document.getElementById("badge-tags");
    
    if (b1) b1.textContent = filterState.statuses.size === 0 ? "All" : filterState.statuses.size;
    if (b2) b2.textContent = filterState.priorities.size === 0 ? "All" : filterState.priorities.size;
    if (b3) b3.textContent = filterState.projects.size === 0 ? "All" : filterState.projects.size;
    if (b4) b4.textContent = filterState.tags.size === 0 ? "All" : filterState.tags.size;
    
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
        addChip("Status", statusLabels[v] || v, () => {
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

    // Date chip
    if (filterState.date)
        addChip("Date", filterState.date, () => {
            filterState.date = "";
            const el = document.getElementById("filter-date-global");
            if (el) el.value = "";
            renderAfterFilterChange();
        });
}

// Called whenever filters change
function renderAfterFilterChange() {
    renderActiveFilterChips(); // Update filter chips display
    renderTasks(); // Kanban
    if (document.getElementById("list-view").classList.contains("active")) {
        renderListView(); // List
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
    const dateFilter = filterState.date;

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

        // Date filter
        let dOK = true;
        if (dateFilter) {
            if (dateFilter === "no-date") {
                // Show only tasks without due dates
                dOK = !task.dueDate;
            } else if (!task.dueDate) {
                // For all other date filters, exclude tasks without due dates
                dOK = false;
            } else {
                // Apply specific date filters only to tasks with due dates
                const today = new Date();
                const todayStr = today.toISOString().split("T")[0];
                const tDate = new Date(task.dueDate);

                switch (dateFilter) {
                    case "overdue":
                        dOK = task.dueDate < todayStr && task.status !== "done";
                        break;
                    case "today":
                        dOK = task.dueDate === todayStr;
                        break;
                    case "this-week": {
                        const end = new Date(
                            today.getTime() + 7 * 24 * 60 * 60 * 1000
                        );
                        dOK = tDate >= stripTime(today) && tDate <= stripTime(end);
                        break;
                    }
                    case "next-week": {
                        const start = new Date(
                            today.getTime() + 7 * 24 * 60 * 60 * 1000
                        );
                        const end = new Date(
                            today.getTime() + 14 * 24 * 60 * 60 * 1000
                        );
                        dOK = tDate >= stripTime(start) && tDate <= stripTime(end);
                        break;
                    }
                    case "this-month":
                        dOK =
                            tDate.getMonth() === today.getMonth() &&
                            tDate.getFullYear() === today.getFullYear();
                        break;
                }
            }
        }

        // Tag filter
        const tagOK = selTags.size === 0 || 
            (task.tags && task.tags.some(tag => selTags.has(tag))) ||
            (!task.tags || task.tags.length === 0) && selTags.has("none");

        return sOK && stOK && pOK && prOK && tagOK && dOK;  // ADD tagOK
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
        if (flatpickrInstance) {
          // Programmatic set: do not persist
          flatpickrInstance.__suppressChange = true;
          flatpickrInstance.setDate(dateObj, false);
          setTimeout(() => (flatpickrInstance.__suppressChange = false), 0);
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

          // Persist only when:
          // - this field is the task dueDate
          // - a task is being edited
          // - the change was user-initiated (not programmatic)
          const form = document.getElementById("task-form");
          const isEditing = !!(form && form.dataset.editingTaskId);
          const isDueDate = input.name === "dueDate";
          if (isEditing && isDueDate && !fp.__suppressChange) {
            updateTaskField("dueDate", iso);
          }
        },
      });

            patchProgrammaticGuards(fp);
            addDateMask(displayInput, fp);
            input._flatpickrInstance = fp;

            // Add an explicit Clear button only for the task modal dueDate field
            const inTaskForm = !!displayInput.closest('#task-form');
            if (inTaskForm && input.name === 'dueDate') {
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

                // Ensure wrapper lays out input + button nicely
                const wrapperNode = displayInput.parentElement;
                if (wrapperNode) {
                    wrapperNode.style.display = 'flex';
                    wrapperNode.style.gap = '8px';
                }

                wrapperNode.appendChild(clearBtn);
                clearBtn.addEventListener('click', () => {
                    // Clear display and hidden ISO
                    displayInput.value = '';
                    input.value = '';
                    if (fp) {
                        fp.__suppressChange = true;
                        fp.clear();
                        setTimeout(() => (fp.__suppressChange = false), 0);
                    }
                    // Persist when editing
                    const form = document.getElementById('task-form');
                    const isEditing = !!(form && form.dataset.editingTaskId);
                    if (isEditing) {
                        updateTaskField('dueDate', '');
                    }
                });
            }
    } else {
      // Plain text inputs with .datepicker (eg project fields)
      input.maxLength = "10";
      const fp = flatpickr(input, {
        ...dateConfig,
        defaultDate: null,
        onChange: function (selectedDates, dateStr) {
          if (fp.__suppressChange) return;
          
          // Handle task form dates
          const inTaskForm = !!input.closest("#task-form");
          if (inTaskForm && input.name === "dueDate") {
            const form = document.getElementById("task-form");
            const isEditing = !!(form && form.dataset.editingTaskId);
            if (isEditing) {
              const iso = looksLikeDMY(dateStr) ? toISOFromDMY(dateStr) : (looksLikeISO(dateStr) ? dateStr : "");
              updateTaskField("dueDate", iso);
            }
            return;
          }
          
          // Handle project detail dates - trigger the existing onchange handler
          if (input.onchange) {
            input.value = dateStr;
            // Create a proper event object to trigger the onchange
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
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
    await loadDataFromKV();
    await loadSortPreferences(); // load saved sort mode and manual order
    loadProjectColors(); // Load project color preferences
    if (projects.length === 0) {
        projects = [
            {
                id: projectCounter++,
                name: "Coral Bleaching Study",
                description: "Research on coral bleaching patterns",
                startDate: "2025-09-15",
                endDate: "2025-09-30",
                createdAt: new Date().toISOString(),
            },
        ];

        tasks = [
            {
                id: taskCounter++,
                title: "Collect temperature data",
                description: "Daily temperature readings",
                projectId: 1,
                dueDate: "2024-02-15",
                priority: "high",
                status: "progress",
                createdAt: new Date().toISOString(),
            },
            {
                id: taskCounter++,
                title: "Analyze samples",
                description: "Lab analysis of coral samples",
                projectId: 1,
                dueDate: "2024-02-20",
                priority: "medium",
                status: "todo",
                createdAt: new Date().toISOString(),
            },
        ];

        persistAll();
    }

    // Basic app setup
    setupNavigation();
    setupStatusDropdown();
    setupPriorityDropdown();
    setupProjectDropdown();
    setupUserMenus();
    initializeDatePickers();
    initFiltersUI();


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

    // Add hashchange event listener for URL routing
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1); // Remove #
        
        // Clear all nav highlights first
        document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
        
        if (hash === 'dashboard/recent_activity') {
            document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
            showPage('dashboard/recent_activity');
        } else if (hash.startsWith('project-')) {
            const projectId = parseInt(hash.replace('project-', ''));
            document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
            showProjectDetails(projectId);
        } else if (hash === 'calendar') {
            // Avoid thrashing: highlight and ensure calendar is visible
            document.querySelector('.nav-item.calendar-nav')?.classList.add('active');
            showCalendarView();
        } else if (hash === 'tasks') {
            document.querySelector('.nav-item[data-page="tasks"]')?.classList.add("active");
            showPage('tasks');
        } else if (hash === 'projects') {
            document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
            showPage('projects');
        } else if (hash === 'feedback') {
            document.querySelector('.nav-item[data-page="feedback"]')?.classList.add("active");
            showPage('feedback');
        } else if (hash === '' || hash === 'dashboard') {
            document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add("active");
            showPage('dashboard');
        }
    });

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
            } else if (view === "kanban") {
                document.querySelector(".kanban-board").classList.remove("hidden");
                renderTasks();
                updateSortUI();
                // ensure kanban header is in default state
                try{ document.querySelector('.kanban-header')?.classList.remove('calendar-mode'); }catch(e){}
            } else if (view === "calendar") {
                const cal = document.getElementById("calendar-view");
                if (!cal) return;
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
        // Apply overdue filter by setting the global date filter
        filterState.date = 'overdue';
        
        // Update the date filter dropdown
        const dateFilterGlobal = document.getElementById('filter-date-global');
        if (dateFilterGlobal) {
            dateFilterGlobal.value = 'overdue';
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
        }
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
    const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;
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
        if (!t.dueDate || t.status === 'done') return false;
        const today = new Date().toDateString();
        return new Date(t.dueDate).toDateString() === today;
    }).length;
    
    document.getElementById('progress-change').textContent = `+${Math.max(1, Math.floor(tasks.length * 0.1))} this week`;
    document.getElementById('pending-change').textContent = dueTodayCount > 0 ? `${dueTodayCount} due today` : 'On track';
    document.getElementById('completed-change').textContent = `+${thisWeekCompleted} this week`;
    document.getElementById('overdue-change').textContent = document.getElementById('overdue-tasks').textContent > 0 ? 'Needs attention' : 'All on track';
    document.getElementById('priority-change').textContent = `${Math.max(1, Math.ceil(tasks.length * 0.2))} critical`;
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
            <div class="progress-bar-item clickable-project" onclick="showProjectDetails(${project.id})" style="margin-bottom: 20px; cursor: pointer; transition: all 0.2s ease;">
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

function formatActivityDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function showAllActivity() {
    // Update URL hash to create proper page routing
    window.location.hash = 'dashboard/recent_activity';
}

function backToDashboard() {
    // Navigate back to main dashboard
    window.location.hash = 'dashboard';
}

function showRecentActivityPage() {
    // Hide all main pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show dashboard page but hide its main content
    document.getElementById('dashboard').classList.add('active');
    document.querySelector('.dashboard-grid').style.display = 'none';
    
    // Create or show activity page
    let activityPage = document.getElementById('activity-page');
    if (!activityPage) {
        activityPage = document.createElement('div');
        activityPage.id = 'activity-page';
        activityPage.className = 'activity-page';
        activityPage.innerHTML = `
            <div class="activity-page-header">
                <button class="back-btn" onclick="backToDashboard()">← Back to Dashboard</button>
                <h2>All Recent Activity</h2>
            </div>
            <div id="all-activity-list" class="all-activity-list"></div>
        `;
        document.querySelector('.dashboard-content').appendChild(activityPage);
    }
    
    activityPage.style.display = 'block';
    renderAllActivity();

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
    const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;
    const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;
    const todayTasks = tasks.filter(t => {
        if (!t.dueDate) return false;
        const today = new Date().toDateString();
        return new Date(t.dueDate).toDateString() === today && t.status !== 'done';
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
function exportDashboardData() {
    const dashboardData = {
        projects: projects,
        tasks: tasks,
        statistics: {
            totalProjects: projects.length,
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'done').length,
            completionRate: tasks.length > 0 ? ((tasks.filter(t => t.status === 'done').length / tasks.length) * 100).toFixed(1) : 0
        },
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(dashboardData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `nautilus-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function generateReport() {
    // Create a simple research progress report
    const report = {
        title: 'Marine Research Progress Report',
        generatedDate: new Date().toLocaleDateString(),
        overview: {
            totalProjects: projects.length,
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'done').length,
            completionRate: tasks.length > 0 ? ((tasks.filter(t => t.status === 'done').length / tasks.length) * 100).toFixed(1) + '%' : '0%'
        },
        projects: projects.map(project => ({
            name: project.name,
            description: project.description,
            tasks: tasks.filter(t => t.projectId === project.id).length,
            completed: tasks.filter(t => t.projectId === project.id && t.status === 'done').length
        }))
    };
    
    // For now, just show an alert with summary
    alert(`Research Report Generated!
    
📊 ${report.overview.totalProjects} Active Projects
✅ ${report.overview.completedTasks}/${report.overview.totalTasks} Tasks Completed
🎯 ${report.overview.completionRate} Overall Progress
    
Report functionality will be expanded in future updates.`);
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
        const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;
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

    const statusLabels = {
        todo: "To Do",
        progress: "In Progress",
        review: "Review",
        done: "Done",
    };
    let rows = typeof getFilteredTasks === "function" ? getFilteredTasks() : tasks.slice();
    
    // Priority order for sorting: high=3, medium=2, low=1
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    // Sort by priority first (high to low), then maintain existing sort
    rows.sort((a, b) => {
        const priorityA = priorityOrder[a.priority] || 0;
        const priorityB = priorityOrder[b.priority] || 0;
        if (priorityA !== priorityB) {
            return priorityB - priorityA; // High to low priority
        }
        return 0; // Keep original order for same priority
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
                case "dueDate":
                    aVal = a.dueDate || "";
                    bVal = b.dueDate || "";
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
        const due = t.dueDate ? formatDate(t.dueDate) : "No date";
        const prText = t.priority ? t.priority[0].toUpperCase() + t.priority.slice(1) : "";
        
        const tagsHTML = t.tags && t.tags.length > 0
            ? t.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join('')
            : '';
        
        return `
            <tr onclick="openTaskDetails(${t.id})">
                <td>${escapeHtml(t.title || "")}</td>
                <td><span class="priority-badge priority-${t.priority}">${prText}</span></td>
                <td><span class="${statusClass}"><span class="status-dot ${t.status}"></span>${statusLabels[t.status] || ""}</span></td>
                <td>${tagsHTML || '<span style="color: var(--text-muted); font-size: 12px;">—</span>'}</td>
                <td>${escapeHtml(projName)}</td>
                <td>${due}</td>
            </tr>
        `;
    }).join("");
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

function renderProjects() {
    const container = document.getElementById("projects-list");
    if (projects.length === 0) {
        container.innerHTML =
            '<div class="empty-state"><h3>No projects yet</h3><p>Create your first project</p></div>';
        return;
    }

    container.innerHTML = projects
        .map((project) => {
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

            return `
                <div class="project-card" onclick="showProjectDetails(${project.id})">
                    <div class="project-card-top">
                        <div class="project-swatch" style="background: ${swatchColor};" aria-hidden="true"></div>
                        <div class="project-headline">
                            <div class="project-title">${escapeHtml(project.name || 'Untitled Project')}</div>
                            <div class="project-dates-pair">
                                <span class="date-pill">${formatDatePretty(project.startDate)}</span>
                                <span class="date-sep">—</span>
                                <span class="date-pill">${formatDatePretty(project.endDate)}</span>
                            </div>
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
                            <div class="project-status-wrap"><span class="project-status-badge ${projectStatus}">${projectStatus.toUpperCase()}</span></div>
                        </div>
                    </div>

                    <div class="project-description">${escapeHtml(project.description || 'No description')}</div>

                    <div class="mini-progress-wrapper">
                        <div class="mini-progress" role="img" aria-label="Project progress: ${completed} done, ${inProgress} in progress, ${review} in review, ${todo} to do">
                            <div class="mini-segment done" style="width: ${completedPct}%;"></div>
                            <div class="mini-segment progress" style="width: ${inProgressPct}%;"></div>
                            <div class="mini-segment review" style="width: ${reviewPct}%;"></div>
                            <div class="mini-segment todo" style="width: ${todoPct}%;"></div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div class="mini-progress-percent">${completionPct}%</div>
                        </div>
                    </div>

                    <div class="project-legend">
                        <div class="legend-item"><span class="legend-dot todo"></span> <span class="legend-label">To do: ${todo}</span></div>
                        <div class="legend-item"><span class="legend-dot progress"></span> <span class="legend-label">In progress: ${inProgress}</span></div>
                        <div class="legend-item"><span class="legend-dot review"></span> <span class="legend-label">Review: ${review}</span></div>
                        <div class="legend-item"><span class="legend-dot done"></span> <span class="legend-label">Done: ${completed}</span></div>
                        <div class="project-count legend-right" title="Total tasks: ${total}" aria-label="Total tasks: ${total}" role="text">${total}</div>
                    </div>
                </div>
            `;
        })
        .join("");
}

function renderTasks() {
    const byStatus = { todo: [], progress: [], review: [], done: [] };
    const source =
        typeof getFilteredTasks === "function"
            ? getFilteredTasks()
            : tasks.slice();

    // Priority order for sorting: high=3, medium=2, low=1
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
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
                const pa = priorityOrder[a.priority] || 0;
                const pb = priorityOrder[b.priority] || 0;
                return pb - pa;
            });
        } else {
            byStatus[status].sort((a, b) => {
                const priorityA = priorityOrder[a.priority] || 0;
                const priorityB = priorityOrder[b.priority] || 0;
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
                const due = task.dueDate ? formatDate(task.dueDate) : "No date";
                const tagsHTML = task.tags && task.tags.length > 0 
                    ? `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                        ${task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join('')}
                    </div>`
                    : '';

                return `
                    <div class="task-card" draggable="true" data-task-id="${task.id}">
                        <div class="task-title">${escapeHtml(task.title || "")}</div>
                        <div class="task-meta">
                            <div class="task-due">${due}</div>
                            <div class="task-priority priority-${task.priority}">${(task.priority || "").toUpperCase()}</div>
                        </div>
                        <div style="margin-top:8px; font-size:12px;">
                            ${proj ? 
                                `<span style="background-color: ${getProjectColor(proj.id)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(proj.name)}">${escapeHtml(proj.name)}</span>` :
                                `<span style="color: var(--text-muted);">No Project</span>`
                            }
                        </div>
                        ${tagsHTML}
                    </div>
                `;
            })
            .join("");
    });

    // Click → open existing task details
    document.querySelectorAll(".task-card").forEach((card) => {
        card.addEventListener("click", (e) => {
            const taskId = parseInt(card.dataset.taskId, 10);
            
            // Shift-click = toggle selection
            if (e.shiftKey) {
                e.preventDefault();
                card.classList.toggle('selected');
                if (card.classList.contains('selected')) {
                    selectedCards.add(taskId);
                } else {
                    selectedCards.delete(taskId);
                }
            } 
            // Normal click = open modal
            else {
                if (!isNaN(taskId)) openTaskDetails(taskId);
            }
        });
    });

    setupDragAndDrop();
    updateSortUI();
}

// Escape text for safe HTML
function escapeHtml(s) {
    return (s || "").replace(
        /[&<>"']/g,
        (m) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            }[m])
    );
}

function openTaskDetails(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById("task-modal");
    if (!modal) return;

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
                projectTextSpan.textContent = project ? project.name : "Select a project";
            } else {
                projectTextSpan.textContent = "Select a project";
            }
        }
    }

    // Title/description
    const titleInput = modal.querySelector('#task-form input[name="title"]');
    if (titleInput) titleInput.value = task.title || "";

    const descEditor = modal.querySelector("#task-description-editor");
    if (descEditor) descEditor.innerHTML = task.description || "";
    const descHidden = modal.querySelector("#task-description-hidden");
    if (descHidden) descHidden.value = task.description || "";

    // Priority
    const hiddenPriority = modal.querySelector("#hidden-priority");
    if (hiddenPriority) hiddenPriority.value = task.priority || "medium";
    const priorityCurrentBtn = modal.querySelector("#priority-current");
    if (priorityCurrentBtn) {
        const priority = task.priority || "medium";
        const labels = { low: "Low", medium: "Medium", high: "High" };
        priorityCurrentBtn.innerHTML = `<span class="priority-dot ${priority}"></span> ${labels[priority]} <span class="dropdown-arrow">▼</span>`;
        updatePriorityOptions(priority);
    }

    // Status
    const hiddenStatus = modal.querySelector("#hidden-status");
    if (hiddenStatus) hiddenStatus.value = task.status || "todo";
    const statusLabels = { todo: "To Do", progress: "In Progress", review: "Review", done: "Done" };
  const currentBtn = modal.querySelector("#status-current");
  if (currentBtn) {
    const statusBadge = currentBtn.querySelector(".status-badge");
    if (statusBadge) {
      statusBadge.className = "status-badge " + (task.status || "todo");
      statusBadge.textContent = statusLabels[task.status] || "To Do";
    }
    updateStatusOptions(task.status || "todo");
  }    // Make sure date pickers exist in the modal
    initializeDatePickers();

    // Due date handling
    const hiddenDue = modal.querySelector('#task-form input[name="dueDate"]');
    let iso = "";
    if (typeof task.dueDate === "string") {
        if (looksLikeISO(task.dueDate)) iso = task.dueDate;
        else if (looksLikeDMY(task.dueDate)) iso = toISOFromDMY(task.dueDate);
    }

    if (hiddenDue) {
        const fp = hiddenDue._flatpickrInstance;
        const displayInput = hiddenDue.parentElement
            ? hiddenDue.parentElement.querySelector("input.date-display")
            : null;

        if (fp) {
            if (iso) {
                fp.setDate(new Date(iso), false);
            } else {
                fp.clear();
                fp.jumpToDate(new Date());
            }
        }
        hiddenDue.value = iso || "";
        if (displayInput) displayInput.value = iso ? toDMYFromISO(iso) : "";
    }

    // Editing ID
    const form = modal.querySelector("#task-form");
    if (form) form.dataset.editingTaskId = String(taskId);

    renderAttachments(task.attachments || []);
    renderTags(task.tags || []);

    modal.classList.add("active");
    
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

    const original = tasks.find(t => t.id === parseInt(editingTaskId, 10));
    if (!original) return;

    // Build a new title with "Copy " prefix if not already
    const baseTitle = original.title || "Untitled";
    const newTitle = baseTitle.startsWith("Copy ") ? baseTitle : `Copy ${baseTitle}`;

    // Create a deep-ish clone (copy arrays/objects we know about)
    const cloned = {
        id: taskCounter++,
        title: newTitle,
        description: original.description || "",
        projectId: original.projectId ?? null,
        dueDate: original.dueDate || "",
        priority: original.priority || "medium",
        status: original.status || "todo",
        tags: Array.isArray(original.tags) ? [...original.tags] : [],
        attachments: Array.isArray(original.attachments) ? original.attachments.map(a => ({...a})) : [],
        createdAt: new Date().toISOString(),
    };

    tasks.push(cloned);
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
        const task = tasks.find(t => t.id === parseInt(taskId));
        const wasInProjectDetails = task && task.projectId && 
            document.getElementById("project-details").classList.contains("active");
        const projectId = task ? task.projectId : null;
        
        tasks = tasks.filter((t) => t.id !== parseInt(taskId));
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
    const taskCards = document.querySelectorAll(".task-card");
    let draggedTaskIds = [];
    let draggedFromStatus = null;
    let dragOverCard = null; // { card, isTop }
    let isSingleDrag = true;
    let dragPlaceholder = null;

    // Auto-scroll while dragging when near edges
    let autoScrollTimer = null;
    const SCROLL_ZONE = 80; // px from top/bottom to trigger
    const SCROLL_SPEED = 20; // px per tick

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

            // create the drag placeholder element
            dragPlaceholder = document.createElement('div');
            dragPlaceholder.className = 'drag-placeholder';
            dragPlaceholder.setAttribute('aria-hidden', 'true');

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

            // remove placeholder if present
            try { if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder); } catch (err) {}
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

        // Per-card dragover to determine insertion position
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            const thisId = parseInt(card.dataset.taskId, 10);
            if (draggedTaskIds.includes(thisId)) return;
            const rect = card.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const isTop = e.clientY < midpoint;
            dragOverCard = { card, isTop };

            document.querySelectorAll(".task-card").forEach((c) => c.classList.remove('drag-over-top', 'drag-over-bottom'));
            card.classList.add(isTop ? 'drag-over-top' : 'drag-over-bottom');
            // insert/move placeholder before/after this card
            try {
                const col = card.closest('.kanban-column');
                if (dragPlaceholder) {
                    if (isTop) col.insertBefore(dragPlaceholder, card);
                    else if (card.nextSibling) col.insertBefore(dragPlaceholder, card.nextSibling);
                    else col.appendChild(dragPlaceholder);
                    dragPlaceholder.classList.add('active');
                }
            } catch (err) {}

            // Auto-scroll when near viewport edges or within scrollable column
            try {
                const scrollContainer = getScrollableAncestor(card.closest('.kanban-column'));
                const y = e.clientY;
                const topDist = y;
                const bottomDist = window.innerHeight - y;
                if (topDist < SCROLL_ZONE) startAutoScroll('up', scrollContainer);
                else if (bottomDist < SCROLL_ZONE) startAutoScroll('down', scrollContainer);
                else stopAutoScroll();
            } catch (err) { stopAutoScroll(); }
        });

        card.addEventListener('dragleave', (e) => {
            // remove highlight when leaving card
            const thisId = parseInt(card.dataset.taskId, 10);
            if (dragOverCard && dragOverCard.card === card) {
                card.classList.remove('drag-over-top', 'drag-over-bottom');
                dragOverCard = null;
            }
            stopAutoScroll();
        });
    });

    const columns = document.querySelectorAll(".kanban-column");
    const statusMap = ["todo", "progress", "review", "done"];

    columns.forEach((column, index) => {
        column.addEventListener("dragover", (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
            column.style.backgroundColor = "var(--hover-bg)";
            // if hovering over empty column, append placeholder
            try {
                if (dragPlaceholder && !column.querySelector('.task-card')) column.appendChild(dragPlaceholder);
            } catch (err) {}

            // Auto-scroll for column when dragging near edges
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

                // Single-card drag: treat as reorder (enable manual mode)
                if (isSingleDrag) {
                    // Ensure manual sorting mode is initialized from priority ordering when needed
                    if (sortMode === 'priority') {
                        sortMode = 'manual';
                        ['todo','progress','review','done'].forEach(st => {
                            const priorityOrder = { high: 3, medium: 2, low: 1 };
                            manualTaskOrder[st] = tasks
                                .filter(t => t.status === st)
                                .slice()
                                .sort((a,b) => (priorityOrder[b.priority]||0) - (priorityOrder[a.priority]||0))
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
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    const currentColumnTasks = tasks.filter(t => t.status === newStatus && !draggedTaskIds.includes(t.id));

                    let orderedIds;
                    if (Array.isArray(manualTaskOrder[newStatus]) && manualTaskOrder[newStatus].length) {
                        // Keep the saved manual order but remove any IDs that are no longer present
                        const presentIds = new Set(currentColumnTasks.map(t => t.id));
                        orderedIds = manualTaskOrder[newStatus].filter(id => presentIds.has(id));

                        // Append any missing tasks (may be newly visible due to filtering) in priority order
                        const missing = currentColumnTasks
                            .filter(t => !orderedIds.includes(t.id))
                            .slice()
                            .sort((a,b) => (priorityOrder[b.priority]||0) - (priorityOrder[a.priority]||0))
                            .map(t => t.id);
                        orderedIds = orderedIds.concat(missing);
                    } else {
                        // No manual order saved for this column: fall back to priority order
                        orderedIds = currentColumnTasks
                            .slice()
                            .sort((a,b) => (priorityOrder[b.priority]||0) - (priorityOrder[a.priority]||0))
                            .map(t => t.id);
                    }

                    // Default insert at end
                    let insertIndex = orderedIds.length;

                    // If the user is hovering over a specific card in this column, compute the precise insertion index
                    if (dragOverCard && dragOverCard.card.closest('.kanban-column') === column) {
                        const targetId = parseInt(dragOverCard.card.dataset.taskId, 10);
                        const targetIndex = orderedIds.indexOf(targetId);
                        if (targetIndex !== -1) {
                            insertIndex = dragOverCard.isTop ? targetIndex : targetIndex + 1;
                        } else {
                            // Target not found in orderedIds (filtered/virtualized). Fallback to mapping DOM order.
                            const idsInDom = Array.from(column.querySelectorAll('.task-card'))
                                .map(el => parseInt(el.dataset.taskId, 10))
                                .filter(n => !isNaN(n) && !draggedTaskIds.includes(n));
                            const domIndex = idsInDom.indexOf(targetId);
                            if (domIndex !== -1) {
                                // Try to translate DOM position to orderedIds index, otherwise use domIndex
                                const idAtDom = idsInDom[domIndex];
                                const mapped = orderedIds.indexOf(idAtDom);
                                if (mapped !== -1) {
                                    insertIndex = dragOverCard.isTop ? mapped : mapped + 1;
                                } else {
                                    insertIndex = dragOverCard.isTop ? domIndex : domIndex + 1;
                                }
                            }
                        }
                    }

                    // Insert dragged ids into the computed position
                    orderedIds.splice(insertIndex, 0, ...draggedTaskIds);
                    manualTaskOrder[newStatus] = orderedIds;

                    // Update task statuses
                    draggedTaskIds.forEach(id => {
                        const t = tasks.find(x => x.id === id);
                        if (t) t.status = newStatus;
                    });

                    saveSortPreferences();
                    selectedCards.clear();
                    saveTasks();
                    render();
                    const calendarView = document.getElementById("calendar-view");
                    if (calendarView) renderCalendar();
                    // remove visual placeholder
                    try { if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder); } catch (err) {}
                    dragPlaceholder = null;
                    stopAutoScroll();
                } else {
                // Multi-drag: preserve the selection order and insert as a block into the destination
                // Treat multi-drag like a reorder (switch to manual mode if needed)
                if (sortMode === 'priority') {
                    sortMode = 'manual';
                    ['todo','progress','review','done'].forEach(st => {
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        manualTaskOrder[st] = tasks
                            .filter(t => t.status === st)
                            .slice()
                            .sort((a,b) => (priorityOrder[b.priority]||0) - (priorityOrder[a.priority]||0))
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
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const currentColumnTasks = tasks.filter(t => t.status === newStatus && !draggedTaskIds.includes(t.id));

                let orderedIds;
                if (Array.isArray(manualTaskOrder[newStatus]) && manualTaskOrder[newStatus].length) {
                    const presentIds = new Set(currentColumnTasks.map(t => t.id));
                    orderedIds = manualTaskOrder[newStatus].filter(id => presentIds.has(id));

                    const missing = currentColumnTasks
                        .filter(t => !orderedIds.includes(t.id))
                        .slice()
                        .sort((a,b) => (priorityOrder[b.priority]||0) - (priorityOrder[a.priority]||0))
                        .map(t => t.id);
                    orderedIds = orderedIds.concat(missing);
                } else {
                    orderedIds = currentColumnTasks
                        .slice()
                        .sort((a,b) => (priorityOrder[b.priority]||0) - (priorityOrder[a.priority]||0))
                        .map(t => t.id);
                }

                // Default insert at end
                let insertIndex = orderedIds.length;

                // If hovering over a specific card in this column, compute insertion index (fallback to DOM mapping)
                if (dragOverCard && dragOverCard.card.closest('.kanban-column') === column) {
                    const targetId = parseInt(dragOverCard.card.dataset.taskId, 10);
                    const targetIndex = orderedIds.indexOf(targetId);
                    if (targetIndex !== -1) {
                        insertIndex = dragOverCard.isTop ? targetIndex : targetIndex + 1;
                    } else {
                        const idsInDom = Array.from(column.querySelectorAll('.task-card'))
                            .map(el => parseInt(el.dataset.taskId, 10))
                            .filter(n => !isNaN(n) && !draggedTaskIds.includes(n));
                        const domIndex = idsInDom.indexOf(targetId);
                        if (domIndex !== -1) {
                            const idAtDom = idsInDom[domIndex];
                            const mapped = orderedIds.indexOf(idAtDom);
                            if (mapped !== -1) {
                                insertIndex = dragOverCard.isTop ? mapped : mapped + 1;
                            } else {
                                insertIndex = dragOverCard.isTop ? domIndex : domIndex + 1;
                            }
                        }
                    }
                }

                // Insert dragged ids preserving the selection order
                orderedIds.splice(insertIndex, 0, ...draggedTaskIds);
                manualTaskOrder[newStatus] = orderedIds;

                // Update task statuses
                draggedTaskIds.forEach(id => {
                    const t = tasks.find(x => x.id === id);
                    if (t) t.status = newStatus;
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
    // Ensure auto-scroll stops on global dragend
    document.addEventListener('dragend', () => stopAutoScroll());
}
function openProjectModal() {
    document.getElementById("project-modal").classList.add("active");
    document.querySelector('#project-form input[name="startDate"]').value =
        new Date().toISOString().split("T")[0];
    // Re-initialize date pickers for the modal
    setTimeout(() => {
        // Clear any existing flatpickr instances first
        const dateInputs = document.querySelectorAll('#project-modal input[type="date"]');
        dateInputs.forEach(input => {
            if (input._flatpickrInstance) {
                input._flatpickrInstance.destroy();
                input._flatpickrInstance = null;
                input._wrapped = false;
            }
        });
        initializeDatePickers();
    }, 150);
}

function openTaskModal() {
    const modal = document.getElementById("task-modal");
    if (!modal) return;

    // Re-initialize date pickers for task modal
    setTimeout(() => {
        const dateInputs = modal.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            if (input._flatpickrInstance) {
                input._flatpickrInstance.destroy();
                input._flatpickrInstance = null;
                input._wrapped = false;
            }
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

    // Explicitly clear due date field (this is reset for new tasks)
    const dueDateInput = modal.querySelector('#task-form input[name="dueDate"]');
    if (dueDateInput) {
        dueDateInput.value = "";
        // Also clear flatpickr instance if it exists
        if (dueDateInput._flatpickrInstance) {
            dueDateInput._flatpickrInstance.clear();
        }
    }

    // Clear attachments and tags
    tempAttachments = [];
    window.tempTags = [];
    filterState.tags.clear();
    renderAttachments([]);
    renderTags([]);

    modal.classList.add("active");

    setTimeout(() => initializeDatePickers(), 50);

}



function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");

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
    const form = document.getElementById("task-form");
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
    closeModal("task-modal");
}

document
    .getElementById("project-form")
    .addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const project = {
            id: projectCounter,  // Use current counter value
            name: formData.get("name"),
            description: formData.get("description"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            createdAt: new Date().toISOString(),
        };

        projects.push(project);
        projectCounter++;  // Increment AFTER creating the project
        saveProjects();  // This saves the incremented counter
        closeModal("project-modal");
        e.target.reset();
        
        // Refresh projects view if we're on projects page, otherwise navigate to new project
        if (document.getElementById("projects").classList.contains("active")) {
            render(); // Refresh the projects list
        } else {
            // Navigate to the new project details
            window.location.hash = `project-${project.id}`;
            showProjectDetails(project.id);
        }
    });

document.addEventListener("DOMContentLoaded", init);

// Close color pickers when clicking outside
document.addEventListener("click", function(e) {
    if (!e.target.closest('.color-picker-container')) {
        document.querySelectorAll('.color-picker-dropdown').forEach(picker => {
            picker.style.display = 'none';
        });
    }
});

function submitTaskForm() {
    const form = document.getElementById("task-form");
    const editingTaskId = form.dataset.editingTaskId;

    const title = form.querySelector('input[name="title"]').value;
    const description = document.getElementById("task-description-hidden").value;
    // Read projectId from hidden input (custom dropdown), fallback to a select if present
    const projectIdRaw = (form.querySelector('input[name="projectId"]').value ||
                         (form.querySelector('select[name="projectId"]') ? form.querySelector('select[name="projectId"]').value : ""));

    const status = document.getElementById("hidden-status").value || "todo";
    const priority = form.querySelector('#hidden-priority').value || "medium";

    const dueRaw = (form.querySelector('input[name="dueDate"]').value || '').trim();
    // HTML date input returns ISO format (YYYY-MM-DD) directly
    const dueISO = dueRaw === '' ? '' : dueRaw;

    if (editingTaskId) {
        const t = tasks.find((x) => x.id === parseInt(editingTaskId, 10));
        if (t) {
            const oldProjectId = t.projectId; 
            t.title = title;
            t.description = description;
            t.projectId = projectIdRaw ? parseInt(projectIdRaw, 10) : null;
            t.dueDate = dueISO;
            t.priority = priority;
            t.status = status;

            if (document.getElementById("project-details").classList.contains("active")) {
                const displayedProjectId = oldProjectId || t.projectId;
                if (displayedProjectId) {
                    saveTasks();
                    closeModal("task-modal");
                    showProjectDetails(displayedProjectId);
                    return;
                }
            }
        }
    } else {
        const newTask = {
            id: taskCounter++,
            title,
            description,
            projectId: projectIdRaw ? parseInt(projectIdRaw, 10) : null,
            dueDate: dueISO,
            priority,
            status,
            tags: [], // Add this
            attachments: tempAttachments.length > 0 ? [...tempAttachments] : [],
            createdAt: new Date().toISOString(),
        };
        tasks.push(newTask);
        tempAttachments = [];
        window.tempTags = [];
        closeModal("task-modal");  // Close modal immediately after creating new task
    // Keep filter dropdowns in sync with new task data
    populateProjectOptions();
    populateTagOptions();
    updateNoDateOptionVisibility();

        // ✅ NEW: If we’re inside project details, refresh it right away
        if (
            newTask.projectId &&
            document.getElementById("project-details").classList.contains("active")
        ) {
            saveTasks();
            closeModal("task-modal");
            showProjectDetails(newTask.projectId);
            updateCounts(); 
            return; // skip global render
        }
    }

    saveTasks();
    render(); // Refresh UI first
    
    // Always refresh calendar if it exists (regardless of active state)
    const calendarView = document.getElementById("calendar-view");
    if (calendarView) {
        renderCalendar();
    }
    
    renderRecentActivity(); // Update recent activity
    // Small delay to ensure render completes before closing modal
    setTimeout(() => closeModal("task-modal"), 10);
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
    
    const allPriorities = [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" }
    ];
    
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
        { value: "review", label: "Review" },
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
        console.log("PROJECT DROPDOWN CLICKED!");
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
                projectTextSpan.textContent = projectText;
            }
            hiddenProject.value = projectId;
            updateTaskField('projectId', projectId);
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
            .map(project => `<div class="project-option" data-project-id="${project.id}">${project.name}</div>`)
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
            if (projectTextSpan) projectTextSpan.textContent = projectText;
            hiddenProject.value = projectId;
            updateTaskField('projectId', projectId);
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
    document.execCommand("insertHTML", false, "<hr>");
    document.getElementById("task-description-editor").focus();
}

// Update the description hidden field when content changes
document.addEventListener("DOMContentLoaded", function () {
    const taskEditor = document.getElementById("task-description-editor");
    const taskHiddenField = document.getElementById("task-description-hidden");

    if (taskEditor && taskHiddenField) {
        taskEditor.addEventListener("input", function () {
            taskHiddenField.value = taskEditor.innerHTML;
        });
        
        // Prevent Enter from submitting form in description editor
        taskEditor.addEventListener("keydown", function (e) {
            if (e.key === 'Enter') {
                e.stopPropagation(); // Stop the event from bubbling up to form
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
        feedbackInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addFeedbackItem();
            }
        });
    }
});


// Calendar functionality
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

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
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Update month/year display
    document.getElementById(
        "calendar-month-year"
    ).textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Calculate first day and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
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
        const dayTasks = getFilteredTasks().filter((task) => task.dueDate === dateStr);
        
        // Sort tasks by priority (high to low)
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        dayTasks.sort((a, b) => {
            const priorityA = priorityOrder[a.priority] || 0;
            const priorityB = priorityOrder[b.priority] || 0;
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
                            onclick="openTaskDetails(${
                                task.id
                            }); event.stopPropagation();">
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
                    <div class="calendar-day ${isToday ? "today" : ""}" data-row="${row}" onclick="showDayTasks('${dateStr}')">
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
    requestAnimationFrame(() => requestAnimationFrame(() => {
        renderProjectBars();
        // Reveal overlay after bars render
        if (overlay) overlay.style.opacity = '1';
    }));
}

function renderProjectBars() {
    const overlay = document.getElementById("project-overlay");
    if (!overlay) return;

    overlay.innerHTML = "";

    const calendarGrid = document.getElementById("calendar-grid");
    const allDayElements = Array.from(
        calendarGrid.querySelectorAll(".calendar-day")
    );

    if (allDayElements.length === 0) {
        setTimeout(renderProjectBars, 100);
        return;
    }

    const currentMonthDays = allDayElements
        .map((el, index) => ({
            element: el,
            index,
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

    // Prepare per-row segments map for packing
    const segmentsByRow = new Map(); // rowIndex -> [ { startIndex, endIndex, project } ]

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

            const startIndex = startDayInfo.index;
            const endIndex = endDayInfo.index;

            // Split into week row segments and store for later packing
            let cursor = startIndex;
            while (cursor <= endIndex) {
                const rowStart = Math.floor(cursor / 7) * 7;
                const rowEnd = Math.min(rowStart + 6, endIndex);
                const segStart = Math.max(cursor, rowStart);
                const segEnd = rowEnd;
                const row = Math.floor(segStart / 7);
                if (!segmentsByRow.has(row)) segmentsByRow.set(row, []);
                segmentsByRow.get(row).push({ startIndex: segStart, endIndex: segEnd, project });
                cursor = rowEnd + 1;
            }
        }
    });

    // Layout constants (vertical measurement anchored to the project-spacer for consistency across views)
    const projectHeight = 18;
    const projectSpacing = 2;

    // For each row, pack segments into tracks and render, then set spacer heights
    const gridRect = calendarGrid.getBoundingClientRect();
    const rowMaxTracks = new Map();

    segmentsByRow.forEach((segments, row) => {
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

        // Record max tracks for row
        rowMaxTracks.set(row, trackEnds.length);
    });

    // Set spacer height per row so tasks start below project bars
    const spacers = calendarGrid.querySelectorAll('.calendar-day .project-spacer');
    const spacerByRow = new Map();
    spacers.forEach(sp => {
        const row = parseInt(sp.closest('.calendar-day').dataset.row, 10);
        const tracks = rowMaxTracks.get(row) || 0;
        const reserved = tracks > 0 ? (tracks * (projectHeight + projectSpacing)) + 4 : 0;
        sp.style.height = reserved + 'px';
        spacerByRow.set(row, reserved);
    });
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
    renderCalendar();
}

function goToToday() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
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
    const dayTasks = tasks.filter((task) => task.dueDate === dateStr);
    
    // Sort tasks by priority (high to low)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    dayTasks.sort((a, b) => {
        const priorityA = priorityOrder[a.priority] || 0;
        const priorityB = priorityOrder[b.priority] || 0;
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
            document.querySelector('#task-form input[name="dueDate"]').value = toDMYFromISO(dateStr);
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
                <div class="day-item" onclick="closeDayItemsModal(); showProjectDetails(${project.id})">
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
            const statusLabels = { todo: "To Do", progress: "In Progress", review: "Review", done: "Done" };
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
            const statusBadge = `<span class="status-badge ${task.status}" style="padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">${statusLabels[task.status] || task.status}</span>`;
            
            html += `
                <div class="day-item" onclick="closeDayItemsModal(); openTaskDetails(${task.id})">
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
    window.pendingModalToClose = null;
}

function confirmDiscardChanges() {
    closeUnsavedChangesModal();
    if (window.pendingModalToClose) {
        closeModal(window.pendingModalToClose);
        window.pendingModalToClose = null;
    } else {
        // Fallback: close task modal directly
        closeModal('task-modal');
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

  if (deleteTasksCheckbox.checked) {
    tasks = tasks.filter(t => t.projectId !== projectIdNum);
    saveTasks();
  } else {
    tasks.forEach(t => {
      if (t.projectId === projectIdNum) t.projectId = null;
    });
    saveProjects();
  }

  projects = projects.filter(p => p.id !== projectIdNum);
  saveProjects();

closeProjectConfirmModal();
window.location.hash = "#projects"; // ensure correct route
showPage("projects");
render(); // Refresh all views without page reload

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
    
    // Debug logging
    console.log('Project Details Debug:', {
        projectId: project.id,
        projectName: project.name,
        totalProjectTasks: projectTasks.length,
        inProgressCount: inProgressTasks.length,
        inProgressTasks: inProgressTasks.map(t => ({
            title: t.title,
            status: t.status,
            projectId: t.projectId
        }))
    });
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
                        <span id="project-title-display" onclick="editProjectTitle(${projectId}, '${escapeHtml(project.name).replace(/'/g, "&#39;")}')" style="font-size: 32px; font-weight: 700; color: var(--text-primary);">${escapeHtml(project.name)}</span>
                        <div id="project-title-edit" style="display: none;">
                            <input type="text" id="project-title-input" class="editable-project-title" value="${escapeHtml(project.name)}" style="font-size: 32px; font-weight: 700;">
                            <button class="title-edit-btn confirm" onclick="saveProjectTitle(${projectId})">✓</button>
                            <button class="title-edit-btn cancel" onclick="cancelProjectTitle()">✕</button>
                        </div>
                        <span class="project-status-badge ${projectStatus}" onclick="event.stopPropagation(); document.getElementById('status-info-modal').classList.add('active');">${projectStatus.toUpperCase()}</span>
                        <button class="back-btn" onclick="backToProjects()" style="padding: 8px 12px; font-size: 14px; display: flex; align-items: center; gap: 6px; margin-left: 12px;">← Back To Projects</button>
                        <div style="margin-left: auto; position: relative;">
                            <button type="button" class="options-btn" id="project-options-btn" onclick="toggleProjectMenu(event)" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;padding:4px;line-height:1;">⋯</button>
                            <div class="options-menu" id="project-options-menu" style="position:absolute;top:calc(100% + 8px);right:0;display:none;">
                                <button type="button" class="delete-btn" onclick="handleDeleteProject(${projectId})">🗑️ Delete Project</button>
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
                                onchange="updateProjectField(${projectId}, 'startDate', this.value)">
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-label">End Date</div>
                                <input type="text" class="form-input date-display editable-date datepicker" 
                                    placeholder="dd/mm/yyyy" maxLength="10"
                                    value="${project.endDate ? formatDate(project.endDate) : ''}"
                                    onchange="updateProjectField(${projectId}, 'endDate', this.value)">
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
                                     onclick="toggleProjectColorPicker(${projectId})">
                                </div>
                                <div class="color-picker-dropdown" id="color-picker-${projectId}" style="display: none; position: absolute; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; margin-top: 4px; z-index: 1000; left: 0; top: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                    <div class="color-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                                        ${PROJECT_COLORS.map(color => `
                                            <div class="color-option" 
                                                 style="width: 24px; height: 24px; background-color: ${color}; border-radius: 4px; cursor: pointer; border: 2px solid ${color === getProjectColor(projectId) ? 'white' : 'transparent'};"
                                                 onclick="updateProjectColor(${projectId}, '${color}')">
                                            </div>
                                        `).join('')}
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
                        <div class="progress-stat clickable" onclick="navigateToProjectStatus(${project.id}, 'todo')" title="View To Do tasks for this project">
                            <div class="progress-stat-number" style="color: var(--text-muted);">${
                                todoTasks.length
                            }</div>
                            <div class="progress-stat-label">To Do</div>
                        </div>
                        <div class="progress-stat clickable" onclick="navigateToProjectStatus(${project.id}, 'progress')" title="View In Progress tasks for this project">
                            <div class="progress-stat-number" style="color: var(--accent-blue);">${
                                inProgressTasks.length
                            }</div>
                            <div class="progress-stat-label">In Progress</div>
                        </div>
                        <div class="progress-stat clickable" onclick="navigateToProjectStatus(${project.id}, 'review')" title="View In Review tasks for this project">
                            <div class="progress-stat-number" style="color: var(--accent-amber);">${
                                reviewTasks.length
                            }</div>
                            <div class="progress-stat-label">In Review</div>
                        </div>
                        <div class="progress-stat clickable" onclick="navigateToProjectStatus(${project.id}, 'done')" title="View Completed tasks for this project">
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
                        <button class="add-btn" onclick="openTaskModalForProject(${projectId})">+ Add Task</button>
                    </div>
                    <div id="project-tasks-list">
                        ${
                            projectTasks.length === 0
                                ? '<div class="empty-state">No tasks yet. Create your first task for this epic.</div>'
                                : projectTasks
                                      .sort((a, b) => {
                                          const priorityOrder = { high: 3, medium: 2, low: 1 };
                                          const priorityA = priorityOrder[a.priority] || 1;
                                          const priorityB = priorityOrder[b.priority] || 1;
                                          return priorityB - priorityA; // Sort high to low
                                      })
                                      .map(
                                          (task) => `
                                        <div class="project-task-item" onclick="openTaskDetails(${task.id})">
                                            <div class="project-task-info">
                                                <div class="project-task-title">${task.title}</div>
                                                <div class="project-task-meta">Due: ${formatDate(task.dueDate)}</div>
                                                ${task.tags && task.tags.length > 0 ? `
                                                    <div class="task-tags" style="margin-top: 4px;">
                                                        ${task.tags.map(tag => `<span style="background-color: ${getTagColor(tag)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(tag.toUpperCase())}</span>`).join(' ')}
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <div class="project-task-status">
                                                <div class="task-priority priority-${task.priority}"><span class="priority-dot ${task.priority}"></span> ${task.priority.toUpperCase()}</div>
                                                <div class="status-badge ${task.status}">
                                                    ${task.status === "todo" ? "To Do" : task.status === "progress" ? "In Progress" : task.status === "review" ? "Review" : "Done"}
                                                </div>
                                            </div>
                                        </div>
                            `
                                      )
                                      .join("")
                        }
                    </div>
                </div>
            `;

    document.getElementById("project-details-content").innerHTML = detailsHTML;
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
    if (projectTextSpan && proj) projectTextSpan.textContent = proj.name;
    // Close any portal that might be lingering
    if (typeof hideProjectDropdownPortal === 'function') hideProjectDropdownPortal();
}

// Simplified user menu setup
function setupUserMenus() {
    const avatar = document.getElementById("shared-user-avatar");
    const dropdown = document.getElementById("shared-user-dropdown");

    if (avatar && dropdown) {
        avatar.addEventListener("click", function (e) {
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });
    }
}

// Close dropdown when clicking outside
document.addEventListener("click", function () {
    const dropdown = document.getElementById("shared-user-dropdown");
    if (dropdown) {
        dropdown.classList.remove("active");
    }
});

function toggleTheme() {
    const body = document.body;
    const themeText = document.getElementById("theme-text");

    if (body.getAttribute("data-theme") === "dark") {
        body.removeAttribute("data-theme");
        if (themeText) themeText.textContent = "Dark mode";
        localStorage.setItem("theme", "light");
    } else {
        body.setAttribute("data-theme", "dark");
        if (themeText) themeText.textContent = "Light mode";
        localStorage.setItem("theme", "dark");
    }
}

// Load saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
    document.body.setAttribute("data-theme", "dark");
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
    const project = projects.find((p) => p.id === projectId);
    if (project) {
        // If it's a date field, convert from dd/mm/yyyy to ISO
        if ((field === 'startDate' || field === 'endDate') && looksLikeDMY(value)) {
            project[field] = toISOFromDMY(value);
        } else {
            project[field] = value;
        }
        saveProjects();
        
        // If updating fields other than dates, refresh the project details panel
        if (field !== 'startDate' && field !== 'endDate') {
            showProjectDetails(projectId);
        }

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

// Date utility functions
function looksLikeDMY(s) {
    return (
        typeof s === "string" &&
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s.trim())
    );
}

function looksLikeISO(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function toISOFromDMY(s) {
    if (!looksLikeDMY(s)) return s || "";
    const parts = s.trim().split(/[\/\-]/);
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (!d || !m || !y || d > 31 || m > 12) return "";
    const dd = String(d).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}

function toDMYFromISO(s) {
    if (!looksLikeISO(s)) return s || "";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
}

function formatDate(s) {
    if (!s) return "No date";

    // If it's already in dd/mm/yyyy format, just return it
    if (looksLikeDMY(s)) {
        return s.replace(/-/g, "/");
    }

    // If it's in ISO format, convert to dd/mm/yyyy
    if (looksLikeISO(s)) {
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
    }

    return "No date";
}

// Human-friendly date for display (e.g. "Oct 10, 2025") without changing
// the underlying storage format used elsewhere.
function formatDatePretty(s) {
    if (!s) return "No date";
    try {
        // ISO yyyy-mm-dd
        if (looksLikeISO(s)) {
            const [y, m, d] = s.split("-");
            const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }

        // dd/mm/yyyy or dd-mm-yyyy
        if (looksLikeDMY(s)) {
            const parts = s.split(/[\/\-]/);
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const y = parseInt(parts[2], 10);
            const date = new Date(y, m - 1, d);
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    } catch (e) {
        // fallthrough
    }
    return s;
}

function migrateDatesToISO() {
    let touched = false;

    tasks.forEach((t) => {
        if (t.dueDate && looksLikeDMY(t.dueDate)) {
            t.dueDate = toISOFromDMY(t.dueDate);
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
    const screenshotUrl = document.getElementById('feedback-screenshot-url').value.trim();
    
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
    document.getElementById('feedback-screenshot-url').value = '';
    saveFeedback();
    render();
}


// Add enter key support for feedback
document.addEventListener('DOMContentLoaded', function() {
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
                       ${item.status === 'done' ? 'checked' : ''} 
                       onchange="toggleFeedbackItem(${item.id})">
                <span class="feedback-type-icon">${typeIcons[item.type] || '💡'}</span>
                ${item.screenshotUrl ? `<a href="${escapeHtml(item.screenshotUrl)}" target="_blank" class="feedback-screenshot-link" title="View screenshot">🔗</a>` : ''}
                <div class="feedback-description">${escapeHtml(item.description)}</div>
                <div class="feedback-date">${formatDate(item.createdAt)}</div>
                <button class="feedback-delete-btn" onclick="deleteFeedbackItem(${item.id}); event.stopPropagation();">❌</button>
            </div>
        `).join('');
    }
    
    if (doneItems.length === 0) {
        doneContainer.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No completed feedback</p></div>';
    } else {
        doneContainer.innerHTML = doneItems.map(item => `
            <div class="feedback-item done">
                <input type="checkbox" class="feedback-checkbox" 
                       checked 
                       onchange="toggleFeedbackItem(${item.id})">
                <span class="feedback-type-icon">${typeIcons[item.type] || '💡'}</span>
                ${item.screenshotUrl ? `<a href="${escapeHtml(item.screenshotUrl)}" target="_blank" class="feedback-screenshot-link" title="View screenshot">🔗</a>` : ''}
                <div class="feedback-description">${escapeHtml(item.description)}</div>
                <div class="feedback-date">${formatDate(item.createdAt)}</div>
                <button class="feedback-delete-btn" onclick="deleteFeedbackItem(${item.id}); event.stopPropagation();">❌</button>
            </div>
        `).join('');
    }
}
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

    const attachment = { name, icon, url, addedAt: new Date().toISOString() };

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

function renderAttachments(attachments) {
    const container = document.getElementById('attachments-list');
    if (!attachments || attachments.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 8px 0;">No attachments</div>';
        return;
    }
    
    container.innerHTML = attachments.map((att, index) => `
        <div class="attachment-item">
            <a href="${escapeHtml(att.url)}" target="_blank" class="attachment-link">
                <span class="attachment-icon">${escapeHtml(att.icon)}</span>
                <span class="attachment-name">${escapeHtml(att.name)}</span>
            </a>
            <button type="button" class="attachment-remove" onclick="removeAttachment(${index}); event.preventDefault();">❌</button>
        </div>
    `).join('');
}

function removeAttachment(index) {
    const taskId = document.getElementById('task-form').dataset.editingTaskId;
    
    if (taskId) {
        // Removing from existing task
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (!task || !task.attachments) return;
        task.attachments.splice(index, 1);
        saveTasks();
        renderAttachments(task.attachments);
    } else {
        // Removing from staged attachments
        tempAttachments.splice(index, 1);
        renderAttachments(tempAttachments);
    }
}

function updateTaskField(field, value) {
  const form = document.getElementById('task-form');
  const taskId = form?.dataset.editingTaskId;
  if (!taskId) return;

  const task = tasks.find(t => t.id === parseInt(taskId,10));
  if (!task) return;
    // Capture the project the detail view is currently showing this task under
    const prevProjectId = task.projectId;

  if (field === 'dueDate') {
    const iso = looksLikeDMY(value) ? toISOFromDMY(value)
              : looksLikeISO(value) ? value
              : "";
    task.dueDate = iso;
  } else if (field === 'projectId') {
    task.projectId = value ? parseInt(value,10) : null;
        // Project-related changes can affect presence of "No Project" option
        populateProjectOptions();
  } else {
    task[field] = value;
    // Set completedDate when task is marked as done
    if (field === 'status' && value === 'done' && !task.completedDate) {
      task.completedDate = new Date().toISOString();
    }
  }

  saveTasks();
    if (field === 'dueDate') {
        // Toggle "No Date" option visibility on due date changes
        updateNoDateOptionVisibility();
    }
  
  // Check if we're in project details view
  const isInProjectDetails = document.getElementById("project-details").classList.contains("active");
    // Calendar refresh for fields that affect date/project placement
    if (field === 'dueDate' || field === 'projectId' || field === 'status' || field === 'priority' || field === 'title') {
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
    if (document.getElementById('list-view').classList.contains('active')) renderListView();
            if (document.getElementById('calendar-view').classList.contains('active')) renderCalendar();
  }
}

// === Click outside to close task/project modals (keep ESC intact) ===

// Detect unsaved data in NEW (not editing) task
function hasUnsavedNewTask() {
  const form = document.getElementById('task-form');
  if (!form) return false;
  if (form.dataset.editingTaskId) return false;

  const title = form.querySelector('input[name="title"]')?.value.trim() || "";
  const desc  = document.getElementById('task-description-hidden')?.value.trim() || "";
    // Support custom hidden project field and legacy select
    const projHidden = form.querySelector('input[name="projectId"]')?.value || "";
    const projSelect = form.querySelector('select[name="projectId"]')?.value || "";
    const proj  = projHidden || projSelect;
  const due   = form.querySelector('input[name="dueDate"]')?.value || "";
  return !!(title || desc || proj || due);
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
});

// === ESC key close (existing behavior retained) ===
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(m => {
            if (m.id === 'task-modal' && hasUnsavedNewTask()) {
                showUnsavedChangesModal('task-modal');
            } else {
                closeModal(m.id);
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
        task.tags.push(tagName);
        saveTasks();
        renderTags(task.tags);
        
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
        window.tempTags.push(tagName);
        renderTags(window.tempTags);
    }
    
    input.value = '';
}

function removeTag(tagName) {
    const taskId = document.getElementById('task-form').dataset.editingTaskId;
    
    if (taskId) {
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (!task || !task.tags) return;
        task.tags = task.tags.filter(t => t !== tagName);
        saveTasks();
        renderTags(task.tags);
        
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
                <button type="button" onclick="removeTag('${escapeHtml(tag)}')" style="background: none; border: none; color: white; cursor: pointer; padding: 0; font-size: 14px; line-height: 1;">×</button>
            </span>
        `;
    }).join('');
}


// === Fix for inline onclick handlers in index.html ===
Object.assign(window, {
    toggleTheme,
    showCalendarView,
    openProjectModal,
    backToProjects,
    openTaskModal,
    closeModal,
    closeTaskModal,
    deleteTask,
    duplicateTask,
    submitTaskForm,
    sortTable,
    changeMonth,
    goToToday,
    closeConfirmModal,
    confirmDelete,
    formatTaskText,
    insertTaskHeading,
    insertTaskDivider,
    openTaskDetails,       
    showDayTasks,          
    openTaskModalForProject, 
    updateProjectField,
    showProjectDetails,
    addFeedbackItem,
    toggleFeedbackItem,  
    deleteFeedbackItem,      
    closeFeedbackDeleteModal,
    confirmFeedbackDelete,
    editProjectTitle,
    saveProjectTitle,
    cancelProjectTitle,        
    dismissKanbanTip, 
    toggleSortMode,
    updateSortUI,
    addAttachment,
    removeAttachment,    
    updateTaskField,  
    deleteProject,
    closeProjectConfirmModal,
    closeUnsavedChangesModal,
    confirmDiscardChanges,
    confirmProjectDelete,
    toggleProjectMenu,      
    handleDeleteProject,
    closeDayItemsModal,
    closeDayItemsModalOnBackdrop,
    addTag,
    removeTag,
    toggleProjectColorPicker,
    updateProjectColor,
    getProjectStatus,
    showAllActivity,
    backToDashboard,
});
function clearAllFilters() {
    // Clear all filter states
    filterState.statuses.clear();
    filterState.priorities.clear();
    filterState.projects.clear();
    filterState.tags.clear();
    filterState.searchTerm = '';
    filterState.date = ''; // Clear date filter
    
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
    
    // Update filter badges
    updateFilterBadges();
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
    filterState.date = '';
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
    const hasNoDateTasks = tasks.some(t => !t.dueDate);
    noDateOpt.style.display = hasNoDateTasks ? '' : 'none';
    // If user had selected 'no-date' but it's not applicable anymore, clear it
    if (!hasNoDateTasks && sel.value === 'no-date') {
        sel.value = '';
        filterState.date = '';
        updateFilterBadges();
        renderAfterFilterChange();
    }
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
    if (value === 'name-asc') view.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    else if (value === 'name-desc') view.sort((a,b) => (b.name||'').localeCompare(a.name||''));
    else if (value === 'created-desc') view.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (value === 'tasks-desc') view.sort((a,b) => (tasks.filter(t=>t.projectId===b.id).length) - (tasks.filter(t=>t.projectId===a.id).length));

    projectsSortedView = view;
    // Render the view without changing the source
    const container = document.getElementById('projects-list');
    if (!container) return;
    container.innerHTML = projectsSortedView.map((project) => {
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
        const swatchColor = getProjectColor(project.id);
        const projectStatus = getProjectStatus(project.id);

        return `
            <div class="project-card" onclick="showProjectDetails(${project.id})">
                <div class="project-card-top">
                    <div class="project-swatch" style="background: ${swatchColor};" aria-hidden="true"></div>
                    <div class="project-headline">
                        <div class="project-title">${escapeHtml(project.name || 'Untitled Project')}</div>
                        <div class="project-dates-pair">
                            <span class="date-pill">${formatDatePretty(project.startDate)}</span>
                            <span class="date-sep">—</span>
                            <span class="date-pill">${formatDatePretty(project.endDate)}</span>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
                        <div class="project-status-wrap"><span class="project-status-badge ${projectStatus}">${projectStatus.toUpperCase()}</span></div>
                    </div>
                </div>
                <div class="project-description">${escapeHtml(project.description || 'No description')}</div>
                <div class="mini-progress-wrapper">
                    <div class="mini-progress" role="img" aria-label="Project progress: ${completed} done, ${inProgress} in progress, ${review} in review, ${todo} to do">
                        <div class="mini-segment done" style="width: ${completedPct}%;"></div>
                        <div class="mini-segment progress" style="width: ${inProgressPct}%;"></div>
                        <div class="mini-segment review" style="width: ${reviewPct}%;"></div>
                        <div class="mini-segment todo" style="width: ${todoPct}%;"></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div class="mini-progress-percent">${completionPct}%</div>
                    </div>
                </div>
                <div class="project-legend">
                    <div class="legend-item"><span class="legend-dot todo"></span> <span class="legend-label">To do: ${todo}</span></div>
                    <div class="legend-item"><span class="legend-dot progress"></span> <span class="legend-label">In progress: ${inProgress}</span></div>
                    <div class="legend-item"><span class="legend-dot review"></span> <span class="legend-label">Review: ${review}</span></div>
                    <div class="legend-item"><span class="legend-dot done"></span> <span class="legend-label">Done: ${completed}</span></div>
                    <div class="project-count legend-right" title="Total tasks: ${total}" aria-label="Total tasks: ${total}" role="text">${total}</div>
                </div>
            </div>
        `;
    }).join('');
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
    // Reuse the same markup as applyProjectsSort/renderProjectsFromView
    container.innerHTML = view.map((project) => {
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
        const swatchColor = getProjectColor(project.id);
        const projectStatus = getProjectStatus(project.id);

        return `
            <div class="project-card" onclick="showProjectDetails(${project.id})">
                <div class="project-card-top">
                    <div class="project-swatch" style="background: ${swatchColor};" aria-hidden="true"></div>
                    <div class="project-headline">
                        <div class="project-title">${escapeHtml(project.name || 'Untitled Project')}</div>
                        <div class="project-dates-pair">
                            <span class="date-pill">${formatDatePretty(project.startDate)}</span>
                            <span class="date-sep">—</span>
                            <span class="date-pill">${formatDatePretty(project.endDate)}</span>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
                        <div class="project-status-wrap"><span class="project-status-badge ${projectStatus}">${projectStatus.toUpperCase()}</span></div>
                    </div>
                </div>
                <div class="project-description">${escapeHtml(project.description || 'No description')}</div>
                <div class="mini-progress-wrapper">
                    <div class="mini-progress" role="img" aria-label="Project progress: ${completed} done, ${inProgress} in progress, ${review} in review, ${todo} to do">
                        <div class="mini-segment done" style="width: ${completedPct}%;"></div>
                        <div class="mini-segment progress" style="width: ${inProgressPct}%;"></div>
                        <div class="mini-segment review" style="width: ${reviewPct}%;"></div>
                        <div class="mini-segment todo" style="width: ${todoPct}%;"></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div class="mini-progress-percent">${completionPct}%</div>
                    </div>
                </div>
                <div class="project-legend">
                    <div class="legend-item"><span class="legend-dot todo"></span> <span class="legend-label">To do: ${todo}</span></div>
                    <div class="legend-item"><span class="legend-dot progress"></span> <span class="legend-label">In progress: ${inProgress}</span></div>
                    <div class="legend-item"><span class="legend-dot review"></span> <span class="legend-label">Review: ${review}</span></div>
                    <div class="legend-item"><span class="legend-dot done"></span> <span class="legend-label">Done: ${completed}</span></div>
                    <div class="project-count legend-right" title="Total tasks: ${total}" aria-label="Total tasks: ${total}" role="text">${total}</div>
                </div>
            </div>
        `;
    }).join('');
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
        const labelText = (sortKey === 'default') ? 'Sort: Status' : `Sort: ${ (sortKey === 'name-asc' ? 'Name A → Z' : sortKey === 'name-desc' ? 'Name Z → A' : sortKey === 'created-desc' ? 'Newest' : sortKey === 'tasks-desc' ? 'Most tasks' : sortKey) }`;
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