let projects = [];
let tasks = [];
let projectCounter = 1;
let taskCounter = 1;

import { loadData, saveData } from "./blobs.js";

// Add this near the top of app.js after imports

async function persistAll() {
    await saveData("projects", projects);
    await saveData("tasks", tasks);
    await saveData("projectCounter", projectCounter);
    await saveData("taskCounter", taskCounter);
}


async function loadDataFromBlob() {
    const loadedProjects = await loadData("projects");
    const loadedTasks = await loadData("tasks");
    const loadedProjectCounter = await loadData("projectCounter");
    const loadedTaskCounter = await loadData("taskCounter");

    projects = loadedProjects || [];
    tasks = loadedTasks || [];
    projectCounter = loadedProjectCounter || 1;
    taskCounter = loadedTaskCounter || 1;
}

// === Global filter state ===
let filterState = {
    search: "",
    statuses: new Set(),
    priorities: new Set(),
    projects: new Set(),
    date: "",
};

// Initialize and wire up the new global filter toolbar
function initFiltersUI() {
    // Populate Project options dynamically
    const ul = document.getElementById("project-options");
    if (ul) {
        ul.innerHTML = "";
        if (projects.length === 0) {
            const li = document.createElement("li");
            li.textContent = "No projects";
            li.style.color = "var(--text-muted)";
            ul.appendChild(li);
        } else {
            projects.forEach((p) => {
                const li = document.createElement("li");
                const id = `proj-${p.id}`;
                li.innerHTML = `<label><input type="checkbox" id="${id}" value="${p.id}" data-filter="project"> ${p.name}</label>`;
                ul.appendChild(li);
            });
        }
    }

    // Open/close dropdown panels for Status, Priority, Project
    const groups = [
        document.getElementById("group-status"),
        document.getElementById("group-priority"),
        document.getElementById("group-project"),
    ].filter(Boolean);

    groups.forEach((g) => {
        const btn = g.querySelector(".filter-button");
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = g.classList.contains("open");
            groups.forEach((x) => x.classList.remove("open"));
            if (!isOpen) g.classList.add("open");
        });

        // keep panel open when clicking inside (so multiple checks don’t close it)
        const panel = g.querySelector(".dropdown-panel");
        if (panel) {
            panel.addEventListener("click", (e) => e.stopPropagation());
        }
    });

    // Clicking anywhere else closes panels
    document.addEventListener("click", () =>
        groups.forEach((g) => g.classList.remove("open"))
    );

    // Checkboxes for status, priority, and project
    document
        .querySelectorAll('.dropdown-panel input[type="checkbox"]')
        .forEach((cb) => {
            cb.addEventListener("change", () => {
                const type = cb.dataset.filter;
                if (type === "status")
                    toggleSet(filterState.statuses, cb.value, cb.checked);
                if (type === "priority")
                    toggleSet(filterState.priorities, cb.value, cb.checked);
                if (type === "project")
                    toggleSet(filterState.projects, cb.value, cb.checked);
                updateFilterBadges(); // updates the “All / count” badges and chips
                renderAfterFilterChange(); // re-renders lists/kanban
                updateClearButtonVisibility(); // show/hide the Clear button
            });
        });

    // “Select / Unselect All” ONLY for Status (if you added that checkbox)
    const selectAllStatus = document.getElementById("status-select-all");
    if (selectAllStatus) {
        selectAllStatus.addEventListener("change", () => {
            const statusCheckboxes = document.querySelectorAll(
                '.dropdown-panel input[type="checkbox"][data-filter="status"]'
            );
            const allChecked = selectAllStatus.checked;
            statusCheckboxes.forEach((cb) => {
                cb.checked = allChecked;
                if (allChecked) {
                    filterState.statuses.add(cb.value);
                } else {
                    filterState.statuses.delete(cb.value);
                }
            });
            updateFilterBadges();
            renderAfterFilterChange();
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
            filterState.date = "";

            // Reset UI elements
            document
                .querySelectorAll('.dropdown-panel input[type="checkbox"]')
                .forEach((cb) => (cb.checked = false));
            if (searchEl) searchEl.value = "";
            if (dateEl) dateEl.value = "";

            updateFilterBadges();
            renderAfterFilterChange();
            updateClearButtonVisibility(); // hides the button after clearing
        });
    }

    // First run
    updateFilterBadges();
    renderActiveFilterChips();
    updateClearButtonVisibility(); // initial show/hide
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
    if (b1)
        b1.textContent =
            filterState.statuses.size === 0 ? "All" : filterState.statuses.size;
    if (b2)
        b2.textContent =
            filterState.priorities.size === 0
                ? "All"
                : filterState.priorities.size;
    if (b3)
        b3.textContent =
            filterState.projects.size === 0 ? "All" : filterState.projects.size;
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
            renderAfterFilterChange();
        });

    // Status chips
    filterState.statuses.forEach((v) =>
        addChip("Status", v, () => {
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
    renderTasks(); // Kanban
    if (document.getElementById("list-view").classList.contains("active")) {
        renderListView(); // List
    }
    // Calendar will be added later
}

// Return filtered tasks array
function getFilteredTasks() {
    const search = filterState.search;
    const selStatus = filterState.statuses;
    const selPri = filterState.priorities;
    const selProj = filterState.projects;
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
            (task.projectId && selProj.has(task.projectId.toString()));

        // Date filter
        let dOK = true;
        if (dateFilter) {
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

        return sOK && stOK && pOK && prOK && dOK;
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
        locale: {
            firstDayOfWeek: 1,
        },
    };

    function addDateMask(input, flatpickrInstance) {
        let lastValue = "";
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
            if (
                e.key === "Backspace" &&
                input.selectionStart === 0 &&
                input.selectionEnd === 0
            ) {
                input.value = "";
                clearedOnFirstKey = true;
                e.preventDefault();
            }
        });

        input.addEventListener("input", function (e) {
            let value = e.target.value;
            let numbers = value.replace(/\D/g, "");

            if (value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                lastValue = value;
                return;
            }

            let formatted = "";

            if (numbers.length >= 1) {
                let day = numbers.substring(0, 2);
                if (numbers.length === 1) {
                    formatted = day;
                } else {
                    if (parseInt(day) > 31) day = "31";
                    formatted = day;
                }
            }

            if (numbers.length >= 3) {
                let month = numbers.substring(2, 4);
                if (numbers.length === 3) {
                    formatted += "/" + month;
                } else {
                    if (parseInt(month) > 12) month = "12";
                    formatted += "/" + month;
                }
            }

            if (numbers.length >= 5) {
                formatted += "/" + numbers.substring(4, 8);
            }

            if (value !== formatted) {
                e.target.value = formatted;
                lastValue = formatted;
            }

            if (formatted.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const parts = formatted.split("/");
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);

                if (
                    day >= 1 &&
                    day <= 31 &&
                    month >= 1 &&
                    month <= 12 &&
                    year >= 1900 &&
                    year <= 2100
                ) {
                    const dateObj = new Date(year, month - 1, day);
                    if (flatpickrInstance) {
                        flatpickrInstance.setDate(dateObj, false);
                    }
                }
            }
        });

        input.addEventListener("keypress", function (e) {
            const char = String.fromCharCode(e.which);
            if (!/[\d\/]/.test(char) && e.which !== 8 && e.which !== 46) {
                e.preventDefault();
            }
        });

        // Reset flag whenever focus leaves the input
        input.addEventListener("blur", function () {
            clearedOnFirstKey = false;
        });

        // Also reset whenever flatpickr sets a date
        if (flatpickrInstance) {
            flatpickrInstance.config.onChange.push(function () {
                clearedOnFirstKey = false;
            });
        }
    }

    document
        .querySelectorAll('input[type="date"], input.datepicker')
        .forEach((input) => {
            if (input._flatpickrInstance) return;

            if (input.type === "date") {
                if (input._wrapped) return;
                input._wrapped = true;

                const wrapper = document.createElement("div");
                wrapper.className = "date-input-wrapper";

                const displayInput = document.createElement("input");
                displayInput.type = "text";
                displayInput.className = "form-input date-display";
                displayInput.placeholder = "dd/mm/yyyy";
                displayInput.maxLength = "10";

                const originalValue = input.value;

                input.style.display = "none";
                input.type = "hidden";

                input.parentNode.insertBefore(wrapper, input);
                wrapper.appendChild(input);
                wrapper.appendChild(displayInput);

                const fp = flatpickr(displayInput, {
                    ...dateConfig,
                    defaultDate: originalValue || null,
                    onChange: function (selectedDates) {
                        if (selectedDates.length > 0) {
                            const date = selectedDates[0];
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(
                                2,
                                "0"
                            );
                            const day = String(date.getDate()).padStart(2, "0");
                            input.value = `${year}-${month}-${day}`;
                        }
                    },
                });

                addDateMask(displayInput, fp);
                input._flatpickrInstance = fp;
            } else {
                input.maxLength = "10";

                const fp = flatpickr(input, {
                    ...dateConfig,
                    defaultDate: null,
                    onChange: function () {},
                });

                addDateMask(input, fp);
                input._flatpickrInstance = fp;
            }
        });
}

async function init() {
    await loadDataFromBlob();
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
    setupUserMenus();
    initializeDatePickers();

    // Initialize the new global filter toolbar
    initFiltersUI();

    // Initial rendering
    render();

    // View switching between Kanban, List, and Calendar
    document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            // Remove "active" class from all view buttons
            document
                .querySelectorAll(".view-btn")
                .forEach((b) => b.classList.remove("active"));
            e.target.classList.add("active");

            const view = e.target.textContent.toLowerCase();

            // Hide all views first
            document.querySelector(".kanban-board").classList.add("hidden");
            document.getElementById("list-view").classList.remove("active");
            document.getElementById("calendar-view").classList.remove("active");

            // Show the selected view
            if (view === "list") {
                document.getElementById("list-view").classList.add("active");
                renderListView();
            } else if (view === "kanban") {
                document
                    .querySelector(".kanban-board")
                    .classList.remove("hidden");
                renderTasks();
            } else if (view === "calendar") {
                document
                    .getElementById("calendar-view")
                    .classList.add("active");
                renderCalendar(); // Will be updated to respect filters later
            }
        });
    });
}

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", () => {
            const page = item.dataset.page;
            if (page) {
                showPage(page);
                document
                    .querySelectorAll(".nav-item")
                    .forEach((nav) => nav.classList.remove("active"));
                item.classList.add("active");

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
    // Hide ALL pages including project-details
    document
        .querySelectorAll(".page")
        .forEach((page) => page.classList.remove("active"));
    document.getElementById("project-details").classList.remove("active");

    // Show the requested page
    document.getElementById(pageId).classList.add("active");

    // Only render specific content for the active page
    if (pageId === "dashboard") {
        updateCounts();
        renderDashboard();
    } else if (pageId === "projects") {
        updateCounts();
        renderProjects();
    } else if (pageId === "tasks") {
        updateCounts();
        renderTasks();
        renderListView();

        // ✅ Always reset to Kanban view when entering Tasks
        document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
        document.querySelector(".view-btn:nth-child(1)").classList.add("active"); // Kanban
        document.querySelector(".kanban-board").classList.remove("hidden");
        document.getElementById("list-view").classList.remove("active");
        document.getElementById("calendar-view").classList.remove("active");
    }
}


function render() {
    updateCounts();
    renderDashboard();
    renderProjects();
    renderTasks();
    renderListView();
    if (document.getElementById("calendar-view").classList.contains("active")) {
        renderCalendar();
    }
}

function updateCounts() {
    document.getElementById("projects-count").textContent = projects.length;
    document.getElementById("tasks-count").textContent = tasks.length;
    document.getElementById("active-projects").textContent = projects.length;
    document.getElementById("pending-tasks").textContent = tasks.filter(
        (t) => t.status !== "done"
    ).length;
    document.getElementById("completed-tasks").textContent = tasks.filter(
        (t) => t.status === "done"
    ).length;

    document.getElementById("todo-count").textContent = tasks.filter(
        (t) => t.status === "todo"
    ).length;
    document.getElementById("progress-count").textContent = tasks.filter(
        (t) => t.status === "progress"
    ).length;
    document.getElementById("review-count").textContent = tasks.filter(
        (t) => t.status === "review"
    ).length;
    document.getElementById("done-count").textContent = tasks.filter(
        (t) => t.status === "done"
    ).length;
}

function renderDashboard() {
    const container = document.getElementById("recent-projects-container");
    if (projects.length === 0) {
        container.innerHTML =
            '<div class="empty-state"><h3>No projects yet</h3><p>Create your first project to get started</p></div>';
        return;
    }

    container.innerHTML =
        '<h3 style="margin-bottom: 16px; color: var(--text-secondary);">Recent Projects</h3>';
    const projectsHtml = projects
        .slice(0, 3)
        .map(
            (project) => `
                <div class="project-card">
                    <div class="project-title">${project.name}</div>
                    <div class="project-description">${
                        project.description || "No description"
                    }</div>
                    <div class="project-meta">
                        <div class="project-stats">
                            <span>📋 ${
                                tasks.filter((t) => t.projectId === project.id)
                                    .length
                            } tasks</span>
                            <span>✅ ${
                                tasks.filter(
                                    (t) =>
                                        t.projectId === project.id &&
                                        t.status === "done"
                                ).length
                            } done</span>
                        </div>
                        <div>${formatDate(project.startDate)}</div>
                    </div>
                </div>
            `
        )
        .join("");
    container.innerHTML += projectsHtml;
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
    let rows =
        typeof getFilteredTasks === "function"
            ? getFilteredTasks()
            : tasks.slice();

    // Sorting
    if (currentSort && currentSort.column) {
        rows.sort((a, b) => {
            let aVal = "",
                bVal = "";
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

    // Render rows with clickable behavior
    tbody.innerHTML = rows
        .map((t) => {
            const statusClass = `task-status-badge ${t.status}`;
            const proj = projects.find((p) => p.id === t.projectId);
            const projName = proj ? proj.name : "No Project";
            const due = t.dueDate ? formatDate(t.dueDate) : "No date";
            const prText = t.priority
                ? t.priority[0].toUpperCase() + t.priority.slice(1)
                : "";
            return `
                    <tr onclick="openTaskDetails(${t.id})">
                        <td>${escapeHtml(t.title || "")}</td>
                        <td><span class="${statusClass}"><span class="status-dot ${
                t.status
            }"></span>${statusLabels[t.status] || ""}</span></td>
                        <td><span class="priority-badge priority-${
                            t.priority
                        }">${prText}</span></td>
                        <td>${escapeHtml(projName)}</td>
                        <td>${due}</td>
                    </tr>
                `;
        })
        .join("");
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
        .map(
            (project) => `
                <div class="project-card" onclick="showProjectDetails(${
                    project.id
                })">
                    <div class="project-title">${project.name}</div>
                    <div class="project-description">${
                        project.description || "No description"
                    }</div>
                    <div class="project-meta">
                        <div class="project-stats">
                            <span>📋 ${
                                tasks.filter((t) => t.projectId === project.id)
                                    .length
                            } tasks</span>
                            <span>✅ ${
                                tasks.filter(
                                    (t) =>
                                        t.projectId === project.id &&
                                        t.status === "done"
                                ).length
                            } done</span>
                        </div>
                        <div>${formatDate(project.startDate)} - ${formatDate(
                project.endDate
            )}</div>
                    </div>
                </div>
            `
        )
        .join("");
}

function renderTasks() {
    const byStatus = { todo: [], progress: [], review: [], done: [] };
    const source =
        typeof getFilteredTasks === "function"
            ? getFilteredTasks()
            : tasks.slice();

    source.forEach((t) => {
        if (byStatus[t.status]) byStatus[t.status].push(t);
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
                return `
                        <div class="task-card" draggable="true" data-task-id="${
                            task.id
                        }">
                            <div class="task-title">${escapeHtml(
                                task.title || ""
                            )}</div>
                            <div class="task-meta">
                                <div class="task-due">${due}</div>
                                <div class="task-priority priority-${
                                    task.priority
                                }">${(task.priority || "").toUpperCase()}</div>
                            </div>
                            <div style="margin-top:8px; font-size:12px; color:var(--text-muted);">
                                ${escapeHtml(projName)}
                            </div>
                        </div>
                    `;
            })
            .join("");
    });

    // Click → open existing task details
    document.querySelectorAll(".task-card").forEach((card) => {
        card.addEventListener("click", () => {
            const taskId = parseInt(card.dataset.taskId, 10);
            if (!isNaN(taskId)) openTaskDetails(taskId);
        });
    });

    setupDragAndDrop();
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

    document.querySelector("#task-modal h2").textContent = "Edit Task";
    document.querySelector("#task-modal .btn-primary").textContent =
        "Update Task";
    document.getElementById("task-modal").classList.add("active");

    const select = document.getElementById("task-project-select");
    select.innerHTML =
        '<option value="">Select a project</option>' +
        projects
            .map((p) => `<option value="${p.id}">${p.name}</option>`)
            .join("");

    document.querySelector('#task-form input[name="title"]').value =
        task.title || "";
    document.getElementById("task-description-editor").innerHTML =
        task.description || "";
    document.getElementById("task-description-hidden").value =
        task.description || "";
    document.querySelector('#task-form select[name="projectId"]').value =
        task.projectId || "";
    document.querySelector('#task-form select[name="priority"]').value =
        task.priority || "medium";
    document.getElementById("hidden-status").value = task.status || "todo";

    // Status pill
    const statusLabels = {
        todo: "To Do",
        progress: "In Progress",
        review: "Review",
        done: "Done",
    };
    document.querySelector(
        ".status-dot"
    ).className = `status-dot ${task.status}`;
    document.querySelector(".status-text").textContent =
        statusLabels[task.status];

    // Due Date: convert ISO->DMY for display
    const dueInput = document.querySelector('#task-form input[name="dueDate"]');
    if (dueInput) {
        const iso = looksLikeDMY(task.dueDate)
            ? toISOFromDMY(task.dueDate)
            : task.dueDate;
        dueInput.value = looksLikeISO(iso) ? toDMYFromISO(iso) : "";
    }

    document.getElementById("task-form").dataset.editingTaskId = String(taskId);

    // ensure picker is attached
    setTimeout(() => initializeDatePickers(), 50);
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
}

function closeConfirmModal() {
    document.getElementById("confirm-modal").classList.remove("active");
}

function confirmDelete() {
    const confirmText = document.getElementById("confirm-input").value;

    if (confirmText === "delete") {
        const taskId =
            document.getElementById("task-form").dataset.editingTaskId;
        tasks = tasks.filter((t) => t.id !== parseInt(taskId));
        persistAll();
        closeConfirmModal();
        closeModal("task-modal");
        render();
    } else {
        alert('You must type "delete" exactly to confirm.');
    }
}

function setupDragAndDrop() {
    const taskCards = document.querySelectorAll(".task-card");
    let draggedTaskId = null;

    taskCards.forEach((card) => {
        card.addEventListener("dragstart", (e) => {
            draggedTaskId = parseInt(card.dataset.taskId);
            card.style.opacity = "0.5";

            // Add visual feedback to all columns
            document.querySelectorAll(".kanban-column").forEach((col) => {
                col.style.backgroundColor = "var(--bg-tertiary)";
                col.style.border = "2px dashed var(--accent-blue)";
            });
        });

        card.addEventListener("dragend", (e) => {
            card.style.opacity = "1";
            draggedTaskId = null;
            // Remove visual feedback
            document.querySelectorAll(".kanban-column").forEach((col) => {
                col.style.backgroundColor = "";
                col.style.border = "";
            });
        });
    });

    // Target the entire columns, not just the task containers
    const columns = document.querySelectorAll(".kanban-column");
    const statusMap = ["todo", "progress", "review", "done"];

    columns.forEach((column, index) => {
        column.addEventListener("dragover", (e) => {
            e.preventDefault();
            column.style.backgroundColor = "var(--hover-bg)";
        });

        column.addEventListener("dragleave", (e) => {
            if (!column.contains(e.relatedTarget)) {
                column.style.backgroundColor = "var(--bg-tertiary)";
            }
        });

        column.addEventListener("drop", (e) => {
            e.preventDefault();
            column.style.backgroundColor = "var(--bg-tertiary)";

            if (draggedTaskId) {
                const newStatus = statusMap[index];
                const task = tasks.find((t) => t.id === draggedTaskId);

                if (task && task.status !== newStatus) {
                    task.status = newStatus;
                    persistAll();
                    render();
                }
            }
        });
    });
}

function openProjectModal() {
    document.getElementById("project-modal").classList.add("active");
    document.querySelector('#project-form input[name="startDate"]').value =
        new Date().toISOString().split("T")[0];
    // Re-initialize date pickers for the modal
    setTimeout(() => {
        const dateInputs = document.querySelectorAll(
            '#project-modal input[type="text"][name*="Date"]'
        );
        dateInputs.forEach((input) => {
            if (!input.flatpickrInstance) {
                initializeDatePickers();
            }
        });
    }, 100);
}

function openTaskModal() {
    // Create mode UI
    document.querySelector("#task-modal h2").textContent = "Create New Task";
    document.querySelector("#task-modal .btn-primary").textContent =
        "Create Task";
    document.getElementById("task-description-editor").innerHTML = "";
    document.getElementById("task-description-hidden").value = "";
    document.getElementById("task-modal").classList.add("active");

    // prefill project list
    const select = document.getElementById("task-project-select");
    select.innerHTML =
        '<option value="">Select a project</option>' +
        projects
            .map((p) => `<option value="${p.id}">${p.name}</option>`)
            .join("");

    // reset status
    document.querySelector(".status-dot").className = "status-dot todo";
    document.querySelector(".status-text").textContent = "To Do";
    document.getElementById("hidden-status").value = "todo";
    delete document.getElementById("task-form").dataset.editingTaskId;

    // set today's date in dd/mm/yyyy (local, no UTC shift)
    const t = new Date();
    const dd = String(t.getDate()).padStart(2, "0");
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const yyyy = t.getFullYear();
    const due = document.querySelector('#task-form input[name="dueDate"]');
    if (due) due.value = `${dd}/${mm}/${yyyy}`;

    // (re)initialize pickers in the modal
    setTimeout(() => initializeDatePickers(), 50);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");

    // Reset forms when closing
    if (modalId === "task-modal") {
        const form = document.getElementById("task-form");
        form.reset();
        delete form.dataset.editingTaskId;

        // Reset status dropdown
        document.querySelector(".status-dot").className = "status-dot todo";
        document.querySelector(".status-text").textContent = "To Do";
        document.getElementById("hidden-status").value = "todo";

        // Reset modal to create mode
        document.querySelector("#task-modal h2").textContent =
            "Create New Task";
        document.querySelector("#task-modal .btn-primary").textContent =
            "Create Task";
    }

    if (modalId === "project-modal") {
        document.getElementById("project-form").reset();
    }
}

document
    .getElementById("project-form")
    .addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const project = {
            id: projectCounter++,
            name: formData.get("name"),
            description: formData.get("description"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            createdAt: new Date().toISOString(),
        };

        projects.push(project);
        persistAll();
        closeModal("project-modal");
        e.target.reset();
        render();
    });

document.addEventListener("DOMContentLoaded", init);

function submitTaskForm() {
    const form = document.getElementById("task-form");
    const editingTaskId = form.dataset.editingTaskId;

    const title = form.querySelector('input[name="title"]').value;
    const description = document.getElementById(
        "task-description-hidden"
    ).value;
    const projectIdRaw = form.querySelector('select[name="projectId"]').value;

    // read status/priority from form
    const status = document.getElementById("hidden-status").value || "todo";
    const priority =
        form.querySelector('select[name="priority"]').value || "medium";

    // normalize and store ISO no matter what the user typed
    const dueRaw = form.querySelector('input[name="dueDate"]').value;
    const dueRawNorm = (dueRaw || "").replace(/-/g, "/").trim();
    const dueISO = looksLikeDMY(dueRawNorm)
        ? toISOFromDMY(dueRawNorm)
        : looksLikeISO(dueRawNorm)
        ? dueRawNorm
        : "";

    if (editingTaskId) {
        const t = tasks.find((x) => x.id === parseInt(editingTaskId, 10));
        if (t) {
            t.title = title;
            t.description = description;
            t.projectId = projectIdRaw ? parseInt(projectIdRaw, 10) : null;
            t.dueDate = dueISO;
            t.priority = priority;
            t.status = status;
        }
    } else {
        tasks.push({
            id: taskCounter++,
            title,
            description,
            projectId: projectIdRaw ? parseInt(projectIdRaw, 10) : null,
            dueDate: dueISO,
            priority,
            status,
            createdAt: new Date().toISOString(),
        });
    }

    persistAll();
    closeModal("task-modal");
    render();
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
        }
        return;
    }

    // Handle status option clicks
    if (e.target.closest(".status-option")) {
        e.preventDefault();
        e.stopPropagation();
        const option = e.target.closest(".status-option");
        const status = option.dataset.status;
        const statusText = option.textContent.trim();
        const statusDotClass = option.querySelector(".status-dot").className;

        // Update display
        const currentBtn = document.getElementById("status-current");
        const hiddenStatus = document.getElementById("hidden-status");

        if (currentBtn && hiddenStatus) {
            const statusDot = currentBtn.querySelector(".status-dot");
            const statusTextElement = currentBtn.querySelector(".status-text");

            if (statusDot) statusDot.className = statusDotClass;
            if (statusTextElement) statusTextElement.textContent = statusText;
            hiddenStatus.value = status;
        }

        // Close dropdown
        const dropdown = option.closest(".status-dropdown");
        if (dropdown) dropdown.classList.remove("active");
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

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        calendarHTML += `<div class="calendar-day other-month">
                    <div class="calendar-day-number">${day}</div>
                </div>`;
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
        const dayTasks = tasks.filter((task) => task.dueDate === dateStr);

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
        const maxVisible = 2; // Reduced to make room for projects

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

        // In renderCalendar(), update this part:
        calendarHTML += `
                    <div class="calendar-day ${
                        isToday ? "today" : ""
                    }" onclick="showDayTasks('${dateStr}')">
                        <div class="calendar-day-number">${day}</div>
                        <div style="margin-top: 25px;">  <!-- Add this wrapper with margin -->
                            ${tasksHTML}
                        </div>
                    </div>
                `;
    }

    // Add next month's leading days
    const totalCells = firstDay + daysInMonth;
    const cellsNeeded = Math.ceil(totalCells / 7) * 7;
    const nextMonthDays = cellsNeeded - totalCells;

    for (let day = 1; day <= nextMonthDays; day++) {
        calendarHTML += `<div class="calendar-day other-month">
                    <div class="calendar-day-number">${day}</div>
                </div>`;
    }

    document.getElementById("calendar-grid").innerHTML = calendarHTML;
    setTimeout(renderProjectBars, 50); // Render bars after DOM updates
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
            index: index,
            day: parseInt(el.querySelector(".calendar-day-number").textContent),
            isOtherMonth: el.classList.contains("other-month"),
        }))
        .filter((item) => !item.isOtherMonth);

    projects.forEach((project, projectIndex) => {
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
            const startDayInfo = currentMonthDays.find(
                (d) => d.day === startDay
            );
            console.log(
                "Current month days:",
                currentMonthDays.map((d) => ({ day: d.day, index: d.index }))
            );
            const endDayInfo = currentMonthDays.find((d) => d.day === endDay);

            if (!startDayInfo || !endDayInfo) return;

            const startIndex = startDayInfo.index;
            const endIndex = endDayInfo.index;

            // Create bars for each week row
            let currentIndex = startIndex;

            while (currentIndex <= endIndex) {
                const rowStart = Math.floor(currentIndex / 7) * 7;
                const rowEnd = Math.min(rowStart + 6, endIndex);
                const segmentStart = Math.max(currentIndex, rowStart);

                const startEl = allDayElements[segmentStart];
                const endEl = allDayElements[rowEnd];

                if (!startEl || !endEl) {
                    currentIndex = rowEnd + 1;
                    continue;
                }

                const startRect = startEl.getBoundingClientRect();
                const endRect = endEl.getBoundingClientRect();
                const gridRect = calendarGrid.getBoundingClientRect();

                const bar = document.createElement("div");
                bar.className = "project-bar";
                bar.style.position = "absolute";
                bar.style.left = startRect.left - gridRect.left + "px";
                bar.style.width = endRect.right - startRect.left + "px";

                // Smart stacking: check for tasks and adjust top position
                const hasTasksInRow = false; // We'll adjust this based on task detection
                const baseTop = startRect.top - gridRect.top;
                const stackOffset = 30; // Space for day number
                const projectHeight = 18;
                const taskSpace = hasTasksInRow ? 60 : stackOffset; // Extra space if tasks exist

                bar.style.top =
                    baseTop +
                    taskSpace +
                    projectIndex * (projectHeight + 2) +
                    "px";
                bar.style.height = projectHeight + "px";
                bar.style.background =
                    "linear-gradient(90deg, #6366f1, #8b5cf6)";
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

                // Border radius only on actual start/end
                if (segmentStart === startIndex) {
                    bar.style.borderTopLeftRadius = "6px";
                    bar.style.borderBottomLeftRadius = "6px";
                    bar.textContent = project.name;
                }
                if (rowEnd === endIndex) {
                    bar.style.borderTopRightRadius = "6px";
                    bar.style.borderBottomRightRadius = "6px";
                }

                bar.onclick = (e) => {
                    e.stopPropagation();
                    showProjectDetails(project.id);
                };

                overlay.appendChild(bar);
                currentIndex = rowEnd + 1;
            }
        }
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
}

function showDayTasks(dateStr) {
    const dayTasks = tasks.filter((task) => task.dueDate === dateStr);
    const dayProjects = projects.filter((project) => {
        const startDate = new Date(project.startDate);
        const endDate = project.endDate
            ? new Date(project.endDate)
            : new Date(project.startDate);
        const currentDate = new Date(dateStr);
        return currentDate >= startDate && currentDate <= endDate;
    });

    if (dayTasks.length === 0 && dayProjects.length === 0) {
        // Optionally create a new task for this date
        const confirmCreate = confirm(
            `No tasks or projects for ${formatDate(
                dateStr
            )}. Create a new task?`
        );
        if (confirmCreate) {
            openTaskModal();
            document.querySelector('#task-form input[name="dueDate"]').value =
                toDMYFromISO(dateStr);
        }
    } else if (dayTasks.length === 1 && dayProjects.length === 0) {
        openTaskDetails(dayTasks[0].id);
    } else if (dayTasks.length === 0 && dayProjects.length === 1) {
        showProjectDetails(dayProjects[0].id);
    } else {
        // Show list of tasks and projects for this day
        let itemList = `Items for ${formatDate(dateStr)}:\n\n`;

        if (dayProjects.length > 0) {
            itemList += "Projects:\n";
            dayProjects.forEach((project, index) => {
                itemList += `${index + 1}. ${project.name}\n`;
            });
            itemList += "\n";
        }

        if (dayTasks.length > 0) {
            itemList += "Tasks:\n";
            dayTasks.forEach((task, index) => {
                itemList += `${index + 1}. ${task.title} (${task.status})\n`;
            });
        }

        alert(itemList);
    }
}
function showProjectDetails(projectId) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // Hide ALL pages first, then show project details
    document
        .querySelectorAll(".page")
        .forEach((page) => page.classList.remove("active"));
    document.getElementById("project-details").classList.add("active");

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

    // Calculate project status
    let projectStatus = "active";
    if (completionPercentage === 100) {
        projectStatus = "completed";
    } else if (completionPercentage === 0) {
        projectStatus = "planning";
    }

    // Calculate duration
    const startDate = new Date(project.startDate);
    const endDate = project.endDate ? new Date(project.endDate) : new Date();
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Render project details
    const detailsHTML = `
                <div class="project-details-header">
                    <div class="project-details-title">
                        ${project.name}
                        <span class="project-status-badge ${projectStatus}">${projectStatus.toUpperCase()}</span>
                    </div>
                    <div class="project-details-description">
                        <textarea class="editable-description" onchange="updateProjectField(${projectId}, 'description', this.value)">${
        project.description || "No description provided for this epic."
    }</textarea>
                    </div>
                    <div class="project-timeline">
                        <div class="timeline-item">
                            <div class="timeline-label">Start Date</div>
                            <input type="date" class="editable-date" value="${
                                project.startDate
                            }" onchange="updateProjectField(${projectId}, 'startDate', this.value)">
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-label">End Date</div>
                            <input type="date" class="editable-date" value="${
                                project.endDate || ""
                            }" onchange="updateProjectField(${projectId}, 'endDate', this.value)">
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
                        <div class="progress-stat">
                            <div class="progress-stat-number" style="color: var(--text-muted);">${
                                todoTasks.length
                            }</div>
                            <div class="progress-stat-label">To Do</div>
                        </div>
                        <div class="progress-stat">
                            <div class="progress-stat-number" style="color: var(--accent-blue);">${
                                inProgressTasks.length
                            }</div>
                            <div class="progress-stat-label">In Progress</div>
                        </div>
                        <div class="progress-stat">
                            <div class="progress-stat-number" style="color: var(--accent-amber);">${
                                reviewTasks.length
                            }</div>
                            <div class="progress-stat-label">In Review</div>
                        </div>
                        <div class="progress-stat">
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
                                      .map(
                                          (task) => `
                                <div class="project-task-item" onclick="openTaskDetails(${
                                    task.id
                                })">
                                    <div class="project-task-info">
                                        <div class="project-task-title">${
                                            task.title
                                        }</div>
                                        <div class="project-task-meta">Due: ${formatDate(
                                            task.dueDate
                                        )} • Priority: ${task.priority}</div>
                                    </div>
                                    <div class="project-task-status">
                                        <div class="task-status-badge ${
                                            task.status
                                        }">
                                            <span class="status-dot ${
                                                task.status
                                            }"></span>
                                            ${
                                                task.status === "todo"
                                                    ? "To Do"
                                                    : task.status === "progress"
                                                    ? "In Progress"
                                                    : task.status === "review"
                                                    ? "Review"
                                                    : "Done"
                                            }
                                        </div>
                                        <div class="task-priority priority-${
                                            task.priority
                                        }">${task.priority.toUpperCase()}</div>
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
    document.getElementById("project-detail-title").textContent = project.name;
    // Re-initialize date pickers for project details
    setTimeout(() => {
        initializeDatePickers();
    }, 100);
}

function backToProjects() {
    // Hide project details
    document.getElementById("project-details").classList.remove("active");

    // Use the standard page switching mechanism
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
    // Pre-select the project in the dropdown
    document.querySelector('#task-form select[name="projectId"]').value =
        projectId;
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
        project[field] = value;
        persistAll();
        showProjectDetails(projectId);
    }
}

function showCalendarView() {
    // Switch to tasks page
    showPage("tasks");

    // Keep Calendar highlighted in sidebar (not All Tasks)
    document
        .querySelectorAll(".nav-item")
        .forEach((nav) => nav.classList.remove("active"));
    document.querySelector(".nav-item.calendar-nav").classList.add("active");

    // Hide the view toggle when accessing from Calendar nav
    const viewToggle = document.querySelector(".view-toggle");
    if (viewToggle) viewToggle.classList.add("hidden");

    // Hide other views and show calendar
    document.querySelector(".kanban-board").classList.add("hidden");
    document.getElementById("list-view").classList.remove("active");
    document.getElementById("calendar-view").classList.add("active");

    // Render the calendar
    renderCalendar();
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

// === Fix for inline onclick handlers in index.html ===
Object.assign(window, {
    toggleTheme,
    showCalendarView,
    openProjectModal,
    backToProjects,
    openTaskModal,
    closeModal,
    deleteTask,
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
    showProjectDetails     
});

