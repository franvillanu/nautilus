/* Full backup of app.js captured 2025-10-10 15:00 */
// Top-level app logic (truncated for backup completeness)
let projects = [];
let tasks = [];
let feedbackItems = [];

// Persistence wrappers
import { loadData, saveData } from "./storage-client.js";

async function persistAll() {
  await saveData('projects', projects);
  await saveData('tasks', tasks);
  await saveData('feedback', feedbackItems);
}

const TAG_COLORS = ['#7dd3fc', '#60a5fa', '#a78bfa', '#fb7185'];
let tagColorMap = {};
const PROJECT_COLORS = ['#60a5fa', '#34d399', '#f472b6', '#f59e0b'];

let filterState = {
  search: '',
  statuses: new Set(),
  priorities: new Set(),
  projects: new Set(),
  tags: new Set(),
  dateRange: null,
};

function debounce(fn, wait) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  }
}

// Projects view state persistence helpers
function saveProjectsViewState(obj) {
  try { localStorage.setItem('projectsViewState', JSON.stringify(obj)); }
  catch(e){ console.warn('Unable to save projectsViewState', e); }
}
function loadProjectsViewState() {
  try { return JSON.parse(localStorage.getItem('projectsViewState') || '{}'); }
  catch(e){ return {}; }
}

// Render projects
function renderProjects(listEl, items) {
  listEl.innerHTML = '';
  items.forEach(p => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `<strong>${p.name}</strong><div class="mini-progress"></div>`;
    listEl.appendChild(card);
  });
}

// Setup Projects controls
function setupProjectsControls() {
  const search = document.getElementById('projects-search');
  const chips = Array.from(document.querySelectorAll('.pf-chip'));
  const clearBtn = document.getElementById('btn-clear-projects');
  const sortBtn = document.getElementById('projects-sort-btn');
  const sortPanel = document.getElementById('projects-sort-panel');
  const projectsList = document.getElementById('projects-list');

  let projectsSortedView = null;
  let savedState = loadProjectsViewState();
  let currentSort = savedState.sort || 'manual';

  function applySort(mode, base) {
    if(!base) return [];
    let arr = Array.from(base);
    if(mode === 'name-asc') arr.sort((a,b) => a.name.localeCompare(b.name));
    else if(mode === 'name-desc') arr.sort((a,b) => b.name.localeCompare(a.name));
    else if(mode === 'newest') arr.sort((a,b) => b.createdAt - a.createdAt);
    projectsSortedView = arr;
    return arr;
  }

  function computeFilteredProjects() {
    const base = projectsSortedView || projects;
    // simple filter: search text and chips
    const q = (search.value||'').toLowerCase().trim();
    return base.filter(p => {
      if(q && !p.name.toLowerCase().includes(q)) return false;
      const hasTasksChip = chips.find(c => c.dataset.filter === 'hasTasks' && c.classList.contains('active'));
      const noTasksChip = chips.find(c => c.dataset.filter === 'noTasks' && c.classList.contains('active'));
      if(hasTasksChip && (!p.tasks || p.tasks.length===0)) return false;
      if(noTasksChip && (p.tasks && p.tasks.length>0)) return false;
      return true;
    });
  }

  function doRender() {
    const items = computeFilteredProjects();
    renderProjects(projectsList, items);
  }

  search.addEventListener('input', debounce(() => {
    savedState = loadProjectsViewState();
    saveProjectsViewState(Object.assign({}, savedState, { search: search.value }));
    doRender();
  }, 220));

  chips.forEach(ch => ch.addEventListener('click', () => {
    ch.classList.toggle('active');
    savedState = loadProjectsViewState();
    const chipState = {
      hasTasks: chips.find(c => c.dataset.filter==='hasTasks' && c.classList.contains('active')) ? true : false,
      noTasks: chips.find(c => c.dataset.filter==='noTasks' && c.classList.contains('active')) ? true : false,
    };
    saveProjectsViewState(Object.assign({}, savedState, chipState));
    doRender();
  }));

  clearBtn.addEventListener('click', () => {
    search.value = '';
    chips.forEach(c => c.classList.remove('active'));
    savedState = loadProjectsViewState();
    saveProjectsViewState(Object.assign({}, savedState, { search: '', hasTasks: false, noTasks: false }));
    doRender();
  });

  sortBtn.addEventListener('click', () => {
    sortPanel.hidden = !sortPanel.hidden;
  });

  sortPanel.querySelectorAll('button[data-sort]').forEach(b => b.addEventListener('click', () => {
    currentSort = b.dataset.sort;
    savedState = loadProjectsViewState();
    saveProjectsViewState(Object.assign({}, savedState, { sort: currentSort }));
    projectsSortedView = applySort(currentSort, projects);
    doRender();
    sortPanel.hidden = true;
  }));

  // initial apply
  if(currentSort && currentSort !== 'manual') {
    projectsSortedView = applySort(currentSort, projects);
  }
  if(savedState.search) search.value = savedState.search;
  if(savedState.hasTasks) chips.find(c => c.dataset.filter==='hasTasks').classList.add('active');
  if(savedState.noTasks) chips.find(c => c.dataset.filter==='noTasks').classList.add('active');
  doRender();
}

// init app on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  // load from storage
  const s = loadData('projects');
  if(s) projects = s;
  const t = loadData('tasks');
  if(t) tasks = t;
  setupProjectsControls();
});
