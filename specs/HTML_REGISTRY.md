# HTML REGISTRY - Section Locator

**Purpose**: Navigate index.html without reading full file (20,500 tokens → 200 tokens per edit).

**Usage**: Find section in this registry → Edit at those lines directly.

---

## DOCUMENT STRUCTURE

### Head Section
**Lines**: 1-160
- Meta tags, title
- Inline critical styles (prevent white flash)
- Theme initialization script (localStorage)
- External CSS links (style.css, flatpickr)
- PWA manifest

**Edit When**: Adding new meta tags, external libraries, PWA config

---

### Loading Screen
**Lines**: 145-162
- Animated loading spinner shown during app boot
- Class: `.loading-screen`

**Edit When**: Changing loading animation

---

### Lock Screen (DISABLED)
**Lines**: 173-198
- Old PIN lock system (deprecated)
- Currently disabled in favor of auth system

**Edit When**: Never (legacy code)

---

## AUTH SYSTEM (Full-screen overlays)

### User Login Page
**Lines**: 202-256
- `#login-page`
- Email + password form
- "Forgot PIN" and "Admin Login" links

**Edit When**: Changing login UI, adding OAuth, etc.

---

### Admin Login Page
**Lines**: 258-306
- `#admin-login-page`
- Admin-specific authentication

**Edit When**: Changing admin auth UI

---

### User Setup Page (First-time login)
**Lines**: 308-403
- `#user-setup-page`
- Name + email capture for new users

**Edit When**: Adding onboarding fields

---

### Admin Dashboard Page
**Lines**: 405-490
- `#admin-dashboard-page`
- User management, create user form

**Edit When**: Adding admin features

---

## MAIN APP STRUCTURE

### App Container
**Lines**: 493-1433 (entire app wrapper)
- `class="app-container"`
- Contains: mobile header, sidebar, all pages, all modals

---

### Mobile Header
**Lines**: 493-505
- Shown only on mobile (≤768px)
- Hamburger menu button, logo

**Edit When**: Changing mobile nav trigger

---

### Sidebar Navigation (Desktop & Mobile Drawer)
**Lines**: 510-606
- Desktop: Fixed left sidebar
- Mobile: Slide-out drawer (toggled by hamburger)
- User info, nav links, language selector

**Edit When**: Adding new page to nav

---

## PAGES (Main Content Areas)

### Dashboard Page
**Lines**: 609-891
- `#dashboard-page`
- Hero stats, project overview, quick actions, activity feed

**Edit When**: Adding dashboard widgets

---

### Tasks Page (Kanban Board)
**Lines**: 893-1159
- `#tasks-page`
- Filters toolbar
- Board columns (Todo, In Progress, In Review, Done)

**Edit When**: Adding filters, changing board layout

---

### Projects Page
**Lines**: 1160-1270
- `#projects-page`
- Project list/grid view
- Empty state

**Edit When**: Changing project list layout

---

### Settings Page
**Lines**: 1271-1350
- `#settings-page`
- Opens settings modal (modal is separate)

**Edit When**: Rarely (page just triggers modal)

---

### Backlog Page
**Lines**: 1351-1450
- `#backlog-page`
- List of unscheduled tasks

**Edit When**: Changing backlog layout

---

### Reports Page
**Lines**: 1451-1550
- `#reports-page`
- Analytics and charts (placeholder)

**Edit When**: Adding reporting features

---

### History Page (OLD - can remove)
**Lines**: 1551-1650
- `#history-page`
- Old history implementation (superseded by inline history)

**Edit When**: Never (legacy code)

---

## MODALS

### Task Modal (Create/Edit Task)
**Lines**: 660-850
- `#task-modal`
- Form fields: title, description, category, project, priority, status, dates, tags, attachments
- Tabs: Details, History
- Actions: Save, Delete, Duplicate, Close

**Edit When**: Adding new task field

**Pattern for adding field**:
1. Add form input in Details tab (~line 700)
2. Update submitTaskForm() in app.js to read field
3. Update openTaskModal() in app.js to populate field when editing
4. Update renderTaskCard() in app.js to display field

---

### Project Modal (Create/Edit Project)
**Lines**: 851-950
- `#project-modal`
- Form fields: name, description, start date, end date
- Tabs: Details, Tasks, History

**Edit When**: Adding new project field

---

### Project Details Modal
**Lines**: 951-1100
- `#project-details-modal`
- View-only project info
- Task list within project
- Timeline, progress

**Edit When**: Changing project detail view

---

### Settings Modal
**Lines**: 1900-2100
- `#settings-modal`
- Tabs: Preferences, Notifications, Account, About
- Settings fields (toggles, selects, inputs)

**Edit When**: Adding new setting (see CLAUDE.md for full checklist)

**Pattern for adding setting**:
1. Add toggle/input in appropriate tab
2. Add to DEFAULT_SETTINGS in app.js
3. Add translations (en, es)
4. Update openSettings() to read value
5. Update saveSettings() to write value
6. Update dirty detection (3 places)
7. Add change event listener

---

### Confirmation Modal (Delete, etc.)
**Lines**: 2101-2200
- `#confirmation-modal`
- Generic confirmation dialog
- Used for delete confirmations, destructive actions

**Edit When**: Changing confirmation UI

---

### Release Notes Modal
**Lines**: 2201-2300
- `#release-notes-modal`
- Displays release notes (fetched from /api/release-notes)

**Edit When**: Changing release notes display

---

### Filters Panel (Mobile Sidebar)
**Lines**: 1080-1159
- Slide-out panel on mobile for advanced filters
- Desktop: Inline toolbar
- Mobile: Drawer panel

**Edit When**: Adding new filter type

---

## QUICK COMPONENT LOOKUP

| Component | Lines | ID/Class | Purpose |
|-----------|-------|----------|---------|
| **User Login** | 202-256 | `#login-page` | User authentication |
| **Admin Login** | 258-306 | `#admin-login-page` | Admin authentication |
| **Mobile Header** | 493-505 | `.mobile-header` | Mobile nav trigger |
| **Sidebar** | 510-606 | `.navigation` | Main navigation |
| **Dashboard** | 609-891 | `#dashboard-page` | Home page |
| **Kanban Board** | 893-1159 | `#tasks-page` | Task board |
| **Projects List** | 1160-1270 | `#projects-page` | Project list |
| **Backlog** | 1351-1450 | `#backlog-page` | Unscheduled tasks |
| **Task Modal** | 660-850 | `#task-modal` | Create/edit task |
| **Project Modal** | 851-950 | `#project-modal` | Create/edit project |
| **Settings Modal** | 1900-2100 | `#settings-modal` | App settings |
| **Filters Toolbar** | 950-1000 | `.filters-toolbar` | Task filters (desktop) |
| **Filters Panel** | 1080-1159 | `.filters-panel` | Task filters (mobile) |

---

## ADDING NEW ELEMENTS

### Adding New Page
1. Add page HTML (~line 1450)
   ```html
   <div id="new-page-id" class="page" style="display: none;">
       <!-- Page content -->
   </div>
   ```
2. Add nav link in sidebar (~line 550)
   ```html
   <a href="#/new-page" class="nav-item" data-i18n="nav.newPage">
       <i class="fas fa-icon"></i>
       <span>New Page</span>
   </a>
   ```
3. Add routing in app.js (~line 8500 in hashchange handler)
4. Add render function in app.js

**Token Cost**: ~600 tokens (vs 20,500 reading full file)

---

### Adding New Modal
1. Add modal HTML after existing modals (~line 2200)
   ```html
   <div id="new-modal" class="modal" style="display: none;">
       <div class="modal-overlay"></div>
       <div class="modal-content">
           <!-- Modal content -->
       </div>
   </div>
   ```
2. Add open/close functions in app.js (~line 4000)
3. Add form submit handler in app.js (~line 4500)

**Token Cost**: ~800 tokens

---

### Adding New Filter Button
1. Add button in filters toolbar (~line 950)
   ```html
   <button class="filter-button" data-filter-type="newFilter">
       <i class="fas fa-icon"></i>
       <span data-i18n="filters.newFilter">New Filter</span>
   </button>
   ```
2. Add filter logic in app.js getFilteredTasks() (~line 3020)
3. Add badge update in app.js updateFilterBadges() (~line 5850)
4. **Don't forget mobile version** (see CSS_REGISTRY.md)

**Token Cost**: ~600 tokens

---

### Adding New Form Field to Task Modal
1. Add form input in task modal Details tab (~line 700)
   ```html
   <div class="form-group">
       <label for="new-field-id" data-i18n="task.newField">New Field</label>
       <input type="text" id="new-field-id" name="newField">
   </div>
   ```
2. Update submitTaskForm() in app.js (~line 4250)
3. Update openTaskModal() in app.js (~line 4120)
4. Update renderTaskCard() in app.js (~line 3620) to display field
5. Add translations (en, es) in app.js
6. Add field to task schema in createTask() in app.js (~line 1860)

**Token Cost**: ~1,500 tokens (vs 98,000+ reading app.js fully)

---

### Adding New Setting Toggle
See CLAUDE.md "Add New Setting" section for full 10-step checklist.

**Token Cost**: ~2,000 tokens

---

## COMMON EDIT LOCATIONS

### Scripts Section (Bottom of File)
**Lines**: 1400-1433
- Script tags loading app.js, storage-client.js

**Edit When**: Adding new JS modules

---

### PWA Manifest
**Lines**: 50-60 (in head)
- `<link rel="manifest" href="/manifest.json">`

**Edit When**: Updating PWA config

---

### Version Strings (CRITICAL!)
**Lines**: 47-48
```html
<link rel="stylesheet" href="style.css?v=20260109-project-tags">
<script src="app.js?v=20260109-backlog-notifications"></script>
```

**Edit When**: EVERY commit that changes app.js or style.css
**Format**: `?v=YYYYMMDD-feature-name`
**Why**: Forces cache bust (Cloudflare caches for 1 year!)

---

## TOKEN COMPARISON

| Task | Without Registry | With Registry | Savings |
|------|------------------|---------------|---------|
| **Add form field to modal** | 20,500 | 200 | **102x** |
| **Add new page** | 20,500 | 600 | **34x** |
| **Add filter button** | 20,500 | 200 | **102x** |
| **Add nav link** | 20,500 | 200 | **102x** |
| **Update version string** | 20,500 | 100 | **205x** |
| **Average HTML edit** | 20,500 | 300 | **68x** |

---

## MAINTENANCE

**When to update this registry**:
- New page added → Add entry
- New modal added → Add entry
- Major HTML restructure → Update line numbers

**How to update**:
```bash
# Find element in HTML
Grep "#new-modal" in index.html

# Update line number in registry
Edit HTML_REGISTRY.md
```

---

**Last Updated**: 2026-01-11
**Version**: 1.0.0
**Sections Documented**: All major pages, modals, and components
**Token Savings**: Average 68x reduction per HTML edit
