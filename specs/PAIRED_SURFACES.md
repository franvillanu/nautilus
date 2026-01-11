# PAIRED SURFACES (MANDATORY CHECKLIST)

Purpose: Prevent "desktop-only" or "light-only" fixes. Keep short and always apply.

Rules:
1) CSS component edits must touch BOTH desktop and mobile blocks (use CSS_REGISTRY_VERIFIED.md).
2) Any color or contrast change must check theme overrides:
   - [data-theme="dark"] and [data-theme="light"] selectors near the component.
3) Any user-facing text must update i18n:
   - index.html data-i18n / data-i18n-attr
   - app.js I18N dictionary (near lines 48-60) and applyTranslations()
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
