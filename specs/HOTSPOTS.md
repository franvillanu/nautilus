# HOTSPOTS (KEEP <= 200 LINES)

Purpose: A tiny index of recurring UI targets. Use this BEFORE registries when a request matches.
Format: short id + minimal pointers (HTML/CSS/JS) + the smallest read window to use.

Hotspots:

- ui.filters.task_toolbar (start/end date order, filter selection, search quirks)
  HTML: index.html 914-1041 (#global-filters, #group-end-date 976-992, #group-start-date 994-1041)
  CSS: style.css 8402-8523 (desktop), 10660-10756 (mobile), 8646+ (filter-chip), 9854+ (mobile chips)
  JS: app.js initFiltersUI 3604, updateFilterBadges 4145, renderActiveFilterChips 4204, getFilteredTasks 4484

- ui.filters.project_toolbar (project filters + chips)
  HTML: index.html 813-865 (.projects-filters-toolbar, #group-project-status, #group-project-tags)
  CSS: style.css 8429-8430 (.projects-filters-toolbar .pf-chip), 10422-10478 (mobile layout), 10573 (pf-chip)
  JS: app.js applyProjectFilters 18566, renderProjects 7532

- ui.kanban_board (backlog column, settings toggles, layout)
  HTML: index.html 1053-1161 (#kanban-settings-panel 1081-1092, #kanban-column-backlog 1101-1107)
  CSS: style.css 6384-6477 (kanban header/board), 8152 (#kanban-settings-panel), 8799+ (mobile)
  JS: app.js renderTasks 7736

- ui.task_cards (dates, overdue display, mobile sizing)
  HTML: index.html 1100-1161 (kanban) and 1139-1157 (list meta)
  CSS: style.css 6629-6708 (.task-card), 4164-4227 (.task-card-mobile)
  JS: app.js renderTasks 7736

- ui.project_cards (project details icon visibility, actions)
  HTML: index.html 892-894 (#projects-list)
  CSS: style.css 6180-6378 (.project-card-top), 10029-10320 (.project-card-mobile), 1476-1565 (.project-options)
  JS: app.js renderProjects 7532

- ui.project_details_view (mobile layout + history tab)
  HTML: index.html 899-903 (#project-details)
  CSS: style.css 7807-7882 (desktop), 10579-10651 (mobile), 12082-12257 (dark)
  JS: app.js showProjectDetails 13817

- ui.task_modal (mobile layout, scroll, tag input, attachments)
  HTML: index.html 1332-1575 (#task-modal)
  CSS: style.css 3517-3863 + 6815-7027 (desktop), 9459+ + 12864-12920 (mobile)
  JS: app.js openTaskModal 9278, openTaskDetails 8049

- ui.project_modal (new fields, tags, duplicate patterns)
  HTML: index.html 1296-1330 (#project-modal)
  CSS: style.css 7013-7027 (project modal styles)
  JS: app.js openProjectModal 9131

- ui.settings_modal (localization, toggles, mobile layout)
  HTML: index.html 1734-2095 (#settings-modal), settings.notifications 1938-2028
  CSS: style.css 2817-2960 (desktop), 12917-13000 (mobile)
  JS: app.js openSettingsModal 14493, saveSettings 3041, loadSettings 3053, applyLanguage 1440, toggleTheme 14887

- ui.workspace_logo (logo upload/crop, light mode)
  HTML: index.html 1821-1853 (workspace logo), 2098-2139 (logo crop modal)
  CSS: style.css 3112-3214 (.workspace-logo-*), 3180 (light theme), 3602 (.settings-field-logo)
  JS: app.js openSettingsModal 14493

- ui.notifications_dropdown (missing X, counts, empty sections)
  HTML: index.html 512-522 (#notification-dropdown, #notification-list)
  CSS: style.css 13946-14420 (.notify-*), 14665+ (mobile), 10554-10561 (mobile button sizing)
  JS: app.js renderNotificationDropdown 2221

- ui.feedback_page (save status clarity, delete/pagination)
  HTML: index.html 1221-1293 (#feedback, #feedback-save-status 1227)
  CSS: style.css 715-1153 (desktop), 11639-11955 (mobile)
  JS: app.js addFeedbackItem 15119, renderFeedback 15410

- ui.calendar_view (mobile layout, weekends, sticky header, backlog)
  HTML: index.html 1165-1197 (calendar view), 1886-1892 (calendar backlog setting)
  CSS: style.css 7596 (calendar-stage), 7781-7802 (today buttons), 8843+ (mobile)
  JS: app.js renderCalendar 12633

- ui.calendar_modals (create + day items)
  HTML: index.html 1613-1622 (#calendar-create-modal), 2145-2153 (#day-items-modal)
  CSS: style.css 6710-6727 (modal base), 9459+ (mobile modal base)
  JS: app.js renderCalendar 12633

- ui.flatpickr_datepicker (Today button, dark mode)
  HTML: index.html (inputs in task modal 1380-1550)
  CSS: style.css 500-656 (.flatpickr-*), 8773+ (dark)
  JS: app.js flatpickr init block 4648-5050, today button hook 4769-4776

- ui.dashboard_stats (remove "Research" wording)
  HTML: index.html 602-640 (dashboard stats), #research-milestones at line 701
  CSS: style.css 343-354 (.page-header)
  JS: app.js I18N entries near 48-60, dashboard stats update at 6143/6899

- ui.mobile_header (hidden/squashed header on mobile)
  HTML: index.html 494-505 (.mobile-header)
  CSS: style.css 4642 (base), 9317-9364 (mobile)
  JS: app.js showPage 5893, setupNavigation 5825

- ui.tags_and_chips (PLANIFICACION padding, tag size on mobile)
  HTML: index.html 914-1041 (filter chips), 1332-1575 (task modal tags)
  CSS: style.css 8646-8683 (filter chips), 9854-9870 (mobile chips), 9969-9979 (tag input)
  JS: app.js renderActiveFilterChips 4204, addTag 17549, renderTags 17678

- ui.notifications_email_settings (timezone, include backlog)
  HTML: index.html 1943-2028 (#email-notification-*)
  CSS: style.css 3697, 12982-12985 (#email-notification-timezone*)
  JS: app.js openSettingsModal 14493, saveSettings 3041

- ui.project_tags (tags on projects, project tag input)
  HTML: index.html 1296-1330 (project modal fields)
  CSS: style.css 5699-5707 (.project-tags-row/.project-tag), 9480-9519 (mobile)
  JS: app.js renderProjects 7532

- ui.task_list_meta (total results counter)
  HTML: index.html 1139-1157 (tasks list meta)
  CSS: style.css 4157-4161 (.tasks-list-mobile)
  JS: app.js renderTasks 7736

- ui.calendar_filters (entity toggles + project/task filter rows)
  HTML: index.html 1141-1216 (#calendar-project-filters row 1, .filters-toolbar row 2)
  CSS: style.css ~9585-9720 (calendar-only-filter, cal-pill-wrap, cal-check, cal-row-pill)
  JS: app.js calendarShowProjects/calendarShowTasks vars ~2478,
      initCalendarFilterEventListeners ~2579, renderCalendarStabilized ~2560,
      applyCalendarEntityUI ~2492, renderProjectBars ~14566

  ⚠️ CALENDAR RENDER RULE — TWO PATHS, pick the right one:

  renderBarsStabilized()     ← USE for calendarProjectFilterState changes ONLY
    (search, status, tags, updated)
    Skips grid rebuild → no flash. Resets spacer heights + two-pass bars render.

  renderCalendarStabilized() ← USE for everything else
    (month change, task filter change, entity toggle show/hide)
    Full grid rebuild + triple-RAF bars pass.

  NEVER call bare renderCalendar() or bare renderProjectBars() from filter handlers.
  VIOLATIONS cause bars rendering outside their week-row lanes or visible flicker.
