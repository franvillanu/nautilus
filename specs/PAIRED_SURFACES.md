# PAIRED SURFACES (MANDATORY CHECKLIST)

Purpose: Prevent "desktop-only" or "light-only" fixes. Keep short and always apply.

⚠️ **CRITICAL: THEME COMPATIBILITY IS MANDATORY** ⚠️

**NEVER use hardcoded colors** (`white`, `black`, `#fff`, `#000`, etc.) for text, backgrounds, or borders.
**ALWAYS use CSS theme variables** (`var(--text-primary)`, `var(--bg-card)`, `var(--border)`, etc.)

⚠️ **CRITICAL: I18N IS MANDATORY FOR ALL USER-FACING TEXT** ⚠️

**NEVER add user-facing text without i18n:**
- HTML must have `data-i18n="section.key"` attribute
- src/config/i18n.js must have BOTH I18N.en AND I18N.es entries
- Missing translations = broken UI for users

Rules:
1) CSS component edits must touch BOTH desktop and mobile blocks (use CSS_REGISTRY_VERIFIED.md).
2) **MANDATORY: Any color or contrast change MUST use theme variables:**
   - Text: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
   - Backgrounds: `var(--bg-card)`, `var(--bg-primary)`, `var(--bg-tertiary)`
   - Borders: `var(--border)`
   - Accents: `var(--accent-blue)`, `var(--accent-green)`, etc.
   - **NEVER**: `color: white`, `background: #fff`, `border: 1px solid black`
   - If theme overrides exist, check `[data-theme="dark"]` and `[data-theme="light"]` selectors near the component.
3) **MANDATORY: Any user-facing text must update i18n (BOTH languages):**
   - index.html: Add data-i18n attribute to element (e.g., data-i18n="tasks.filters.newLabel")
   - src/config/i18n.js: Add translation key to BOTH I18N.en and I18N.es dictionaries
   - Format: 'section.subsection.key': 'English text' (en) and 'Spanish text' (es)
   - Example: 'tasks.filters.selectAll': 'Select / Unselect All' (en), 'Seleccionar / deseleccionar todo' (es)
   - **BLOCKING**: Do not commit without both translations
4) UI elements shared across views must be checked in ALL views where they appear.

Paired surface matrix (fast lookup):
- Filters toolbar: desktop 8402-8523, mobile 10660-10756; chips 8646+ / 9854+
- Task cards: desktop 6629-6708, mobile 4164-4227
- Project cards: desktop 6180-6378, mobile 10029-10320; dark overrides near 10181
- Notifications dropdown: desktop 13946-14420, mobile 14665+; light overrides near 14233
- Feedback page: desktop 715-1153, mobile 11639-11955
- Settings modal: desktop 2817-2960, mobile 12917-13000
- Calendar view: desktop 7596 + 7781-7802, mobile 8843+ + 8936-8963
- Modal base: desktop 6710-6727, mobile 9459+
- Modal tabs: desktop 1807-1901, mobile 12864-12920

Multi-view checks:
- Task changes: Kanban + list + calendar where applicable.
- Project changes: Projects list + project details view.
- Notifications: dropdown + settings (email toggles/timezone).
