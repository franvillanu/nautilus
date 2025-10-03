let projects = [];
let tasks = [];
let feedbackItems = [];
let projectCounter = 1;
let taskCounter = 1;
let feedbackCounter = 1;
let selectedCards = new Set();
let projectToDelete = null;

import { loadData, saveData } from "./storage-client.js";


// Add this near the top of app.js after imports

async function persistAll() {
    await saveData("projects", projects);
    await saveData("tasks", tasks);
    await saveData("projectCounter", projectCounter);
    await saveData("taskCounter", taskCounter);
    await saveData("feedbackItems", feedbackItems);
    await saveData("feedbackCounter", feedbackCounter);    
}

async function loadDataFromKV() {
    const loadedProjects = await loadData("projects");
    const loadedTasks = await loadData("tasks");
    const loadedProjectCounter = await loadData("projectCounter");
    const loadedTaskCounter = await loadData("taskCounter");
    const loadedFeedback = await loadData("feedbackItems");
    const loadedFeedbackCounter = await loadData("feedbackCounter");    

    projects = loadedProjects || [];
    tasks = loadedTasks || [];
    projectCounter = loadedProjectCounter || 1;
    taskCounter = loadedTaskCounter || 1;
    feedbackItems = loadedFeedback || [];
    feedbackCounter = loadedFeedbackCounter || 1;

    // 🔄 Normalize IDs to numbers
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

    // ✅ Ensure counters are higher than any existing IDs
    if (projects.length > 0) {
        const maxProjectId = Math.max(...projects.map(p => p.id || 0));
        if (projectCounter <= maxProjectId) {
            projectCounter = maxProjectId + 1;
        }
    }

    if (tasks.length > 0) {
        const maxTaskId = Math.max(...tasks.map(t => t.id || 0));
        if (taskCounter <= maxTaskId) {
            taskCounter = maxTaskId + 1;
        }
    }

    if (feedbackItems.length > 0) {
        const maxFeedbackId = Math.max(...feedbackItems.map(f => f.id || 0));
        if (feedbackCounter <= maxFeedbackId) {
            feedbackCounter = maxFeedbackId + 1;
        }
    }
}


// === Global filter state ===
let filterState = {
    search: "",
    statuses: new Set(),
    priorities: new Set(),
    projects: new Set(),
    date: "",
};

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

    // Show/hide project select-all based on number of projects
    const selectAllProjectRow = document.getElementById("project-select-all");
    if (selectAllProjectRow && selectAllProjectRow.parentElement.parentElement) {
        if (projects.length > 1) {
            selectAllProjectRow.parentElement.parentElement.style.display = 'block';
        } else {
            selectAllProjectRow.parentElement.parentElement.style.display = 'none';
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
                updateFilterBadges();
                renderAfterFilterChange();
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
    } else {
      // Plain text inputs with .datepicker (eg project fields)
      input.maxLength = "10";
      const fp = flatpickr(input, {
        ...dateConfig,
        defaultDate: null,
        onChange: function (selectedDates, dateStr) {
          // Only persist to a task if this input actually lives inside the task form
          const inTaskForm = !!input.closest("#task-form");
          if (!inTaskForm || input.name !== "dueDate") return;

          const form = document.getElementById("task-form");
          const isEditing = !!(form && form.dataset.editingTaskId);
          if (!isEditing || fp.__suppressChange) return;

          const iso = looksLikeDMY(dateStr) ? toISOFromDMY(dateStr) : (looksLikeISO(dateStr) ? dateStr : "");
          updateTaskField("dueDate", iso);
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
    initFiltersUI();


    // Check for URL hash
    const hash = window.location.hash.slice(1);
    const validPages = ['dashboard', 'projects', 'tasks', 'feedback'];

    // Clear all nav highlights first
    document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));

    if (hash === 'calendar') {
        // ... keep existing calendar code
    } else if (hash.startsWith('project-')) {
        // Handle project detail URLs
        const projectId = parseInt(hash.replace('project-', ''));
        document.querySelector('.nav-item[data-page="projects"]')?.classList.add("active");
        showProjectDetails(projectId);
    } else {
        // Normal page navigation
        const pageToShow = validPages.includes(hash) ? hash : 'dashboard';
        const navItem = document.querySelector(`.nav-item[data-page="${pageToShow}"]`);
        if (navItem) navItem.classList.add("active");
        showPage(pageToShow);
    }

    // Initial rendering
    render();

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
            } else if (view === "kanban") {
                document.querySelector(".kanban-board").classList.remove("hidden");
                renderTasks();
            } else if (view === "calendar") {
                document.getElementById("calendar-view").classList.add("active");
                renderCalendar();
            }
        });
    });
}

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", () => {
            const page = item.dataset.page;
            if (page) {
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
    // Hide ALL pages including project-details
    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
    document.getElementById("project-details").classList.remove("active");

    // Show the requested page
    document.getElementById(pageId).classList.add("active");

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

        // Only reset to Kanban if NOT coming from calendar hash
        if (window.location.hash !== '#calendar') {
            document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
            document.querySelector(".view-btn:nth-child(1)").classList.add("active");
            document.querySelector(".kanban-board").classList.remove("hidden");
            document.getElementById("list-view").classList.remove("active");
            document.getElementById("calendar-view").classList.remove("active");
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
    // Dashboard doesn't have dynamic content to render beyond counts
    // Counts are already updated by updateCounts()
    // This function exists to maintain consistency with other render functions
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
    const feedbackCount = feedbackItems.filter(f => f.status === 'open').length;
    document.getElementById("feedback-count").textContent = feedbackCount;    
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

  // Project dropdown
  const projSelect = modal.querySelector('#task-form select[name="projectId"]');
  if (projSelect) {
    projSelect.innerHTML =
      '<option value="">Select a project</option>' +
      projects.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    projSelect.value = task.projectId || "";
  }

  // Title/description
  const titleInput = modal.querySelector('#task-form input[name="title"]');
  if (titleInput) titleInput.value = task.title || "";

  const descEditor = modal.querySelector("#task-description-editor");
  if (descEditor) descEditor.innerHTML = task.description || "";
  const descHidden = modal.querySelector("#task-description-hidden");
  if (descHidden) descHidden.value = task.description || "";

  // Priority
  const prioritySelect = modal.querySelector('#task-form select[name="priority"]');
  if (prioritySelect) prioritySelect.value = task.priority || "medium";

  // Status
  const hiddenStatus = modal.querySelector("#hidden-status");
  if (hiddenStatus) hiddenStatus.value = task.status || "todo";
  const statusLabels = { todo: "To Do", progress: "In Progress", review: "Review", done: "Done" };
  const currentBtn = modal.querySelector("#status-current");
  if (currentBtn) {
    const statusDot = currentBtn.querySelector(".status-dot");
    const statusText = currentBtn.querySelector(".status-text");
    if (statusDot) statusDot.className = "status-dot " + (task.status || "todo");
    if (statusText) statusText.textContent = statusLabels[task.status] || "To Do";
  }

  // Make sure date pickers exist in the modal
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
        fp.setDate(new Date(iso), false); // set via real Date object
      } else {
        fp.clear();
        fp.jumpToDate(new Date()); // empty but open on today
      }
    }
    hiddenDue.value = iso || "";
    if (displayInput) displayInput.value = iso ? toDMYFromISO(iso) : "";
  }

  // Editing ID
  const form = modal.querySelector("#task-form");
  if (form) form.dataset.editingTaskId = String(taskId);

  renderAttachments(task.attachments || []);
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
        persistAll();
        closeConfirmModal();
        closeModal("task-modal");

        // If we were viewing project details, refresh them
        if (wasInProjectDetails && projectId) {
            showProjectDetails(projectId);
        } else {
            // Otherwise refresh the main views
            renderTasks();
            if (document.getElementById('list-view').classList.contains('active')) renderListView();
            if (document.getElementById('calendar-view').classList.contains('active')) renderCalendar();
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

    taskCards.forEach((card) => {
        card.addEventListener("dragstart", (e) => {
            const taskId = parseInt(card.dataset.taskId);
            
            // If this card is selected, drag all selected cards
            if (selectedCards.has(taskId)) {
                draggedTaskIds = Array.from(selectedCards);
            } else {
                // Otherwise just drag this one card
                draggedTaskIds = [taskId];
            }
            
            card.style.opacity = "0.5";
            
            // Visual feedback on columns
            document.querySelectorAll(".kanban-column").forEach((col) => {
                col.style.backgroundColor = "var(--bg-tertiary)";
                col.style.border = "2px dashed var(--accent-blue)";
            });
        });

        card.addEventListener("dragend", (e) => {
            card.style.opacity = "1";
            draggedTaskIds = [];
            
            // Remove visual feedback
            document.querySelectorAll(".kanban-column").forEach((col) => {
                col.style.backgroundColor = "";
                col.style.border = "";
            });
        });
    });

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

            if (draggedTaskIds.length > 0) {
                const newStatus = statusMap[index];
                
                // Update ALL dragged tasks
                draggedTaskIds.forEach(taskId => {
                    const task = tasks.find((t) => t.id === taskId);
                    if (task && task.status !== newStatus) {
                        task.status = newStatus;
                    }
                });
                
                // Clear selection after move
                selectedCards.clear();
                
                persistAll();
                render();
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
    const modal = document.getElementById("task-modal");
    if (!modal) return;

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

    // Clear fields
    const titleInput = modal.querySelector('#task-form input[name="title"]');
    if (titleInput) titleInput.value = "";

    const descEditor = modal.querySelector("#task-description-editor");
    if (descEditor) descEditor.innerHTML = "";

    const descHidden = modal.querySelector("#task-description-hidden");
    if (descHidden) descHidden.value = "";

    // Populate project dropdown fresh
    const projSelect = modal.querySelector('#task-form select[name="projectId"]');
    if (projSelect) {
        projSelect.innerHTML =
            '<option value="">Select a project</option>' +
            projects.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
        projSelect.value = "";
    }

    // Reset priority
    const prioritySelect = modal.querySelector('#task-form select[name="priority"]');
    if (prioritySelect) prioritySelect.value = "low";

    // Reset status
    const hiddenStatus = modal.querySelector("#hidden-status");
    if (hiddenStatus) hiddenStatus.value = "todo";

    const currentBtn = modal.querySelector("#status-current");
    if (currentBtn) {
        const sd = currentBtn.querySelector(".status-dot");
        const st = currentBtn.querySelector(".status-text");
        if (sd) sd.className = "status-dot todo";
        if (st) st.textContent = "To Do";
    }

    // Clear due date
    const due = modal.querySelector('#task-form input[name="dueDate"]');
    if (due) {
        if (due._flatpickrInstance) {
            due._flatpickrInstance.clear();
        }
        due.value = "";
    }

    // Reset editing mode
    const form = modal.querySelector("#task-form");
    if (form) delete form.dataset.editingTaskId;

    modal.classList.add("active");

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
            id: projectCounter,  // Use current counter value
            name: formData.get("name"),
            description: formData.get("description"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            createdAt: new Date().toISOString(),
        };

        projects.push(project);
        projectCounter++;  // Increment AFTER creating the project
        persistAll();  // This saves the incremented counter
        closeModal("project-modal");
        e.target.reset();
        
        // Navigate to the new project details
        window.location.hash = `project-${project.id}`;
        window.location.reload();
    });

document.addEventListener("DOMContentLoaded", init);

function submitTaskForm() {
    const form = document.getElementById("task-form");
    const editingTaskId = form.dataset.editingTaskId;

    const title = form.querySelector('input[name="title"]').value;
    const description = document.getElementById("task-description-hidden").value;
    const projectIdRaw = form.querySelector('select[name="projectId"]').value;

    const status = document.getElementById("hidden-status").value || "todo";
    const priority = form.querySelector('select[name="priority"]').value || "medium";

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
                    persistAll();
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
            createdAt: new Date().toISOString(),
        };
        tasks.push(newTask);

        // ✅ NEW: If we’re inside project details, refresh it right away
        if (
            newTask.projectId &&
            document.getElementById("project-details").classList.contains("active")
        ) {
            persistAll();
            closeModal("task-modal");
            showProjectDetails(newTask.projectId);
            updateCounts(); 
            return; // skip global render
        }
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
updateTaskField('status', status);

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
        const dayTasks = getFilteredTasks().filter((task) => task.dueDate === dateStr);

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

        // Calculate top margin based on number of overlapping projects
        const projectBarHeight = 18;
        const projectBarSpacing = 2;
        const baseSpacing = 10;
        const topMargin = baseSpacing + (overlappingProjects * (projectBarHeight + projectBarSpacing));

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
                        <div style="margin-top: ${topMargin}px;">
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

    // Get filtered project IDs
    const filteredProjectIds = filterState.projects.size > 0 
        ? Array.from(filterState.projects).map(id => parseInt(id, 10))
        : projects.map(p => p.id);

    // Only render filtered projects
    const filteredProjects = projects.filter(p => filteredProjectIds.includes(p.id));

    filteredProjects.forEach((project, projectIndex) => {
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
                // Alternate colors for overlapping projects
                if (projectIndex % 2 === 0) {
                    bar.style.background = "linear-gradient(90deg, #5b21b6, #7e22ce)"; // Purple
                } else {
                    bar.style.background = "linear-gradient(90deg, #1e40af, #3b82f6)"; // More blueish
                }                
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
            html += `
                <div class="day-item" onclick="closeDayItemsModal(); showProjectDetails(${project.id})">
                    <div class="day-item-title">${escapeHtml(project.name)}</div>
                    <div class="day-item-meta">${formatDate(project.startDate)} - ${formatDate(project.endDate)}</div>
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
            html += `
                <div class="day-item" onclick="closeDayItemsModal(); openTaskDetails(${task.id})">
                    <div class="day-item-title">${escapeHtml(task.title)}</div>
                    <div class="day-item-meta">${statusLabels[task.status] || task.status} • ${task.priority}</div>
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

function closeProjectConfirmModal() {
    document.getElementById('project-confirm-modal').classList.remove('active');
    document.getElementById('delete-tasks-checkbox').checked = false;
    document.getElementById("project-confirm-error").classList.remove("show");
    projectToDelete = null;
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
    await saveData("tasks", tasks);
  } else {
    tasks.forEach(t => {
      if (t.projectId === projectIdNum) t.projectId = null;
    });
    await saveData("tasks", tasks);
  }

  projects = projects.filter(p => p.id !== projectIdNum);
  await saveData("projects", projects);

closeProjectConfirmModal();
window.location.hash = "#projects"; // ensure correct route
window.location.reload();

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
                        <span id="project-title-display" onclick="editProjectTitle(${projectId}, '${escapeHtml(project.name).replace(/'/g, "&#39;")}')">${escapeHtml(project.name)}</span>
                        <div id="project-title-edit" style="display: none;">
                            <input type="text" id="project-title-input" class="editable-project-title" value="${escapeHtml(project.name)}">
                            <button class="title-edit-btn confirm" onclick="saveProjectTitle(${projectId})">✓</button>
                            <button class="title-edit-btn cancel" onclick="cancelProjectTitle()">✕</button>
                        </div>
                        <span class="project-status-badge ${projectStatus}" onclick="event.stopPropagation(); document.getElementById('status-info-modal').classList.add('active');">${projectStatus.toUpperCase()}</span>
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
                                        <div class="project-task-item" onclick="openTaskDetails(${task.id})">
                                            <div class="project-task-info">
                                                <div class="project-task-title">${task.title}</div>
                                                <div class="project-task-meta">Due: ${formatDate(task.dueDate)}</div>
                                            </div>
                                            <div class="project-task-status">
                                                <div class="task-status-badge ${task.status}">
                                                    <span class="status-dot ${task.status}"></span>
                                                    ${task.status === "todo" ? "To Do" : task.status === "progress" ? "In Progress" : task.status === "review" ? "Review" : "Done"}
                                                </div>
                                                <div class="task-priority priority-${task.priority}">${task.priority.toUpperCase()}</div>
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
        // If it's a date field, convert from dd/mm/yyyy to ISO
        if ((field === 'startDate' || field === 'endDate') && looksLikeDMY(value)) {
            project[field] = toISOFromDMY(value);
        } else {
            project[field] = value;
        }
        persistAll();
        showProjectDetails(projectId);
    }
}

function showCalendarView() {
    // Update URL hash to calendar for bookmarking
    window.location.hash = "calendar";
    
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
    persistAll();
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
        persistAll();
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
        persistAll();
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

// Add to task object structure (update when saving)
function addAttachment() {
    const urlInput = document.getElementById('attachment-url');
    const url = urlInput.value.trim();
    
    if (!url) return;
    
    const taskId = document.getElementById('task-form').dataset.editingTaskId;
    if (!taskId) return;
    
    const task = tasks.find(t => t.id === parseInt(taskId));
    if (!task) return;
    
    if (!task.attachments) task.attachments = [];

    // === Detect type and assign name + icon ===
    let name = 'Attachment';
    let icon = '📁'; // default
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

    task.attachments.push({ name, icon, url, addedAt: new Date().toISOString() });
    
    urlInput.value = '';
    persistAll();
    renderAttachments(task.attachments);
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
            <button class="attachment-remove" onclick="removeAttachment(${index}); event.preventDefault();">❌</button>
        </div>
    `).join('');
}

function removeAttachment(index) {
    const taskId = document.getElementById('task-form').dataset.editingTaskId;
    if (!taskId) return;
    
    const task = tasks.find(t => t.id === parseInt(taskId));
    if (!task || !task.attachments) return;
    
    task.attachments.splice(index, 1);
    persistAll();
    renderAttachments(task.attachments);
}

function updateTaskField(field, value) {
  const form = document.getElementById('task-form');
  const taskId = form?.dataset.editingTaskId;
  if (!taskId) return;

  const task = tasks.find(t => t.id === parseInt(taskId,10));
  if (!task) return;

  if (field === 'dueDate') {
    const iso = looksLikeDMY(value) ? toISOFromDMY(value)
              : looksLikeISO(value) ? value
              : "";
    task.dueDate = iso;
  } else if (field === 'projectId') {
    task.projectId = value ? parseInt(value,10) : null;
  } else {
    task[field] = value;
  }

  persistAll();
  
  // Check if we're in project details view
  const isInProjectDetails = document.getElementById("project-details").classList.contains("active");
  
  if (isInProjectDetails && task.projectId) {
    // Refresh project details to show updated status/progress
    showProjectDetails(task.projectId);
  } else {
    // Otherwise refresh the main views
    renderTasks();
    if (document.getElementById('list-view').classList.contains('active')) renderListView();
    if (document.getElementById('calendar-view').classList.contains('active')) renderCalendar();
  }
}


// Backdrop click
document.addEventListener("click", function (e) {
  const modal = document.getElementById("task-modal");
  if (modal && modal.classList.contains("active") && e.target === modal) {
    closeModal("task-modal");
  }
});

// ESC key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    const modals = document.querySelectorAll(".modal.active");
    modals.forEach(m => closeModal(m.id));
  }
});


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
    addAttachment,
    removeAttachment,    
    updateTaskField,  
    deleteProject,
    closeProjectConfirmModal,
    confirmProjectDelete,
    toggleProjectMenu,      
    handleDeleteProject,
    closeDayItemsModal,
});
