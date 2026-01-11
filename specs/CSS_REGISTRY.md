# CSS REGISTRY - Linked Desktop & Mobile Sections

**Purpose**: Prevent forgetting to update both desktop AND mobile CSS when making changes.

**CRITICAL RULE**: When editing ANY component style, you MUST check BOTH sections listed below.

**Token Savings**: Use this registry instead of reading style.css (56,000 tokens). Direct Edit = ~200 tokens per change.

---

## HOW TO USE THIS REGISTRY

### ❌ WRONG (Old Way - 56,000 tokens):
```
1. Read style.css (56,000 tokens)
2. Find task card styles
3. Edit desktop styles
4. Forget mobile styles exist
5. User reports mobile is broken
6. Read style.css again (56,000 tokens)
7. Fix mobile styles
Total: 112,000+ tokens + frustrated user
```

### ✅ CORRECT (New Way - 400 tokens):
```
1. Check CSS_REGISTRY.md (cached, 0 tokens after first read)
2. Find "Task Card" entry
3. See: Desktop (lines 1000-1200) + Mobile (lines 9000-9100)
4. Edit style.css lines 1000-1200 (200 tokens)
5. Edit style.css lines 9000-9100 (200 tokens)
6. Done - both versions updated
Total: 400 tokens + happy user
```

---

## TABLE OF CONTENTS

1. [Global Styles & Variables](#global-styles--variables)
2. [Layout & Navigation](#layout--navigation)
3. [Task Components](#task-components)
4. [Project Components](#project-components)
5. [Modals & Dialogs](#modals--dialogs)
6. [Forms & Inputs](#forms--inputs)
7. [Filters & Toolbars](#filters--toolbars)
8. [Buttons & Actions](#buttons--actions)
9. [Status & Priority Badges](#status--priority-badges)
10. [History & Timeline](#history--timeline)

---

## GLOBAL STYLES & VARIABLES

### Root Variables (Light Mode)

**Desktop**: Lines 7-125
**Mobile**: N/A (inherited)

Contains:
- Color palette (--color-primary, --color-background, etc.)
- Spacing scale (--spacing-xs to --spacing-xxl)
- Typography (--font-family, --font-size-*)
- Border radius, shadows, transitions

**Edit Pattern**: Only edit desktop section. Mobile inherits.

---

### Root Variables (Dark Mode)

**Desktop**: Lines 127-205
**Mobile**: N/A (inherited)

Contains dark mode overrides:
- `[data-theme="dark"]` selector
- Inverted color palette
- Adjusted shadows and borders

**Edit Pattern**: Only edit desktop section. Mobile inherits.

---

### Global Dark Mode Responsive

**Desktop**: N/A
**Mobile**: Lines 200-205

Contains:
- Mobile-specific dark mode adjustments

**Edit Pattern**: Edit if dark mode needs mobile-specific tweaks.

---

## LAYOUT & NAVIGATION

### App Container

**Desktop**: Lines 206-250
**Mobile**: Lines 8797-8850

Desktop contains:
- `.app-container` - Main app wrapper
- Display: flex, height: 100vh

Mobile contains:
- `.app-container` - Adjusted for mobile viewport
- Flexbox adjustments

**Edit Pattern**: Always edit both sections for layout changes.

---

### Navigation Sidebar

**Desktop**: Lines 251-423
**Mobile**: Lines 8851-9050

Desktop contains:
- `.navigation` - Fixed left sidebar
- Width: 240px
- `.nav-logo`, `.nav-item`, `.nav-link`

Mobile contains:
- `.navigation` - Bottom navigation bar
- Position: fixed, bottom: 0
- Icon-only navigation
- Horizontal layout

**Edit Pattern**:
- Changing nav item styles → Edit both sections
- Adding new nav item → Add to both desktop list and mobile bar
- Changing colors/hover → Edit both sections

---

### Main Content Area

**Desktop**: Lines 424-490
**Mobile**: Lines 9051-9150

Desktop contains:
- `.main-content` - Content area next to sidebar
- Margin-left: 240px (sidebar width)

Mobile contains:
- `.main-content` - Full width
- Margin-bottom: 60px (bottom nav height)

**Edit Pattern**: Always edit both for content spacing changes.

---

## TASK COMPONENTS

### Task Board & Columns

**Desktop**: Lines 491-800
**Mobile**: Lines 9151-9400

Desktop contains:
- `.board` - Flexbox container for columns
- `.board-column` - Individual status columns
- Gap, padding, min-width settings

Mobile contains:
- `.board` - Stacked columns
- `.board-column` - Full width
- Adjusted spacing

**Edit Pattern**:
- Changing column layout → Edit both
- Changing spacing → Edit both
- Changing column headers → Edit both

---

### Task Card

**Desktop**: Lines 801-1200
**Mobile**: Lines 9401-9700

Desktop contains:
- `.task-card` - Individual task card
- Hover effects, shadows, borders
- `.task-card-header`, `.task-card-body`, `.task-card-footer`
- All task card sub-components

Mobile contains:
- `.task-card` - Touch-optimized
- Larger tap targets (min-height: 44px)
- Adjusted padding
- Simplified hover effects (touch doesn't hover)

**Edit Pattern**:
- Changing card style → Edit both
- Adding new field → Add to both
- Changing colors → Edit both
- **CRITICAL**: Desktop has hover effects, mobile should have touch-friendly alternatives

---

### Task Card - Priority Badge

**Desktop**: Lines 1050-1100
**Mobile**: Lines 9550-9600

Desktop contains:
- `.task-priority` - Priority badge styles
- Color coding (high/medium/low)
- Size: standard

Mobile contains:
- `.task-priority` - Larger for touch
- Same color coding
- Size: increased

**Edit Pattern**: When changing priority colors, edit BOTH sections.

---

### Task Card - Status Badge

**Desktop**: Lines 1101-1150
**Mobile**: Lines 9601-9650

Desktop contains:
- `.task-status` - Status indicator
- Color per status (todo/progress/review/done)

Mobile contains:
- `.task-status` - Same logic, adjusted size

**Edit Pattern**: When changing status colors, edit BOTH sections.

---

### Task Card - Tags

**Desktop**: Lines 1151-1200
**Mobile**: Lines 9651-9700

Desktop contains:
- `.task-tags`, `.task-tag` - Tag pills
- Background, padding, border-radius

Mobile contains:
- `.task-tags`, `.task-tag` - Adjusted size for touch

**Edit Pattern**: When styling tags, edit BOTH sections.

---

## PROJECT COMPONENTS

### Project List

**Desktop**: Lines 1201-1500
**Mobile**: Lines 9701-9950

Desktop contains:
- `.projects-list` - Grid/list of projects
- `.project-card` - Individual project card
- Grid layout settings

Mobile contains:
- `.projects-list` - Stacked layout
- `.project-card` - Full width cards
- Adjusted spacing

**Edit Pattern**: When changing project card styles, edit BOTH sections.

---

### Project Card

**Desktop**: Lines 1301-1500
**Mobile**: Lines 9751-9950

Desktop contains:
- `.project-card` - Project card styles
- Hover effects, shadows
- `.project-header`, `.project-body`, `.project-footer`

Mobile contains:
- `.project-card` - Touch-optimized
- Larger tap targets
- Simplified hover

**Edit Pattern**:
- Changing project card design → Edit both
- Adding project metadata → Add to both
- **IMPORTANT**: Desktop hover effects need mobile touch alternatives

---

## MODALS & DIALOGS

### Modal Overlay & Container

**Desktop**: Lines 1501-1600
**Mobile**: Lines 9951-10100

Desktop contains:
- `.modal-overlay` - Full-screen overlay
- `.modal` - Modal container
- Centered with max-width

Mobile contains:
- `.modal-overlay` - Full-screen
- `.modal` - Full-screen or near-full-screen
- Adjusted for mobile viewport

**Edit Pattern**: When changing modal behavior, edit BOTH sections.

---

### Task Modal

**Desktop**: Lines 1601-1800
**Mobile**: Lines 10101-10350

Desktop contains:
- `#task-modal` - Task creation/edit modal
- Two-column layout (form on left, details on right)
- Width: 900px

Mobile contains:
- `#task-modal` - Single column
- Full screen on mobile
- Stacked layout

**Edit Pattern**:
- Adding form field → Add to both
- Changing modal layout → Edit both
- **CRITICAL**: Desktop is two-column, mobile is stacked

---

### Project Modal

**Desktop**: Lines 1801-1900
**Mobile**: Lines 10351-10450

Desktop contains:
- `#project-modal` - Project modal
- Standard form layout

Mobile contains:
- `#project-modal` - Full-screen
- Touch-optimized inputs

**Edit Pattern**: When editing project modal, edit BOTH sections.

---

### Settings Modal

**Desktop**: Lines 1903-2384
**Mobile**: Lines 10451-10850

Desktop contains:
- `#settings-modal` - Settings modal
- `.settings-field`, `.settings-field-toggle`
- Organized sections

Mobile contains:
- `#settings-modal` - Full-screen
- Stacked fields
- Larger toggles for touch

**Edit Pattern**:
- Adding new setting → Add to both
- Changing toggle styles → Edit both
- **IMPORTANT**: Desktop uses labels, mobile may need adjusted spacing

---

### Confirmation Modal

**Desktop**: Lines 2385-2500
**Mobile**: Lines 10851-10950

Desktop contains:
- `.confirmation-modal` - Delete confirmations, etc.
- Centered, small width

Mobile contains:
- `.confirmation-modal` - Adjusted for mobile
- Full-width buttons

**Edit Pattern**: When changing confirmation UI, edit BOTH sections.

---

## FORMS & INPUTS

### Input Fields (Text, Email, etc.)

**Desktop**: Lines 2501-2650
**Mobile**: Lines 10951-11100

Desktop contains:
- `input[type="text"]`, `input[type="email"]`, etc.
- Standard sizing, padding, borders

Mobile contains:
- Same input types
- Larger touch targets (min-height: 44px)
- Font size 16px+ (prevents iOS zoom)

**Edit Pattern**:
- Changing input styles → Edit both
- **CRITICAL**: Mobile needs min-height: 44px and font-size: 16px+

---

### Textarea

**Desktop**: Lines 2651-2700
**Mobile**: Lines 11101-11150

Desktop contains:
- `textarea` - Multi-line text input
- Standard sizing

Mobile contains:
- `textarea` - Larger for touch
- Font size 16px+ (prevents zoom)

**Edit Pattern**: When styling textareas, edit BOTH sections.

---

### Select Dropdowns

**Desktop**: Lines 2701-2750
**Mobile**: Lines 11151-11200

Desktop contains:
- `select` - Dropdown selects
- Custom arrow icon

Mobile contains:
- `select` - Native mobile select
- Larger tap target

**Edit Pattern**: When styling dropdowns, edit BOTH sections.

---

### Checkboxes & Toggles

**Desktop**: Lines 2751-2850
**Mobile**: Lines 11201-11350

Desktop contains:
- `.toggle`, `.premium-toggle` - Custom checkbox toggles
- Animation, transitions

Mobile contains:
- Same toggles, larger size
- Easier to tap (min 44px)

**Edit Pattern**: When changing toggle styles, edit BOTH sections.

---

### Date Inputs (Flatpickr)

**Desktop**: Lines 491-580 (Flatpickr theme section)
**Mobile**: Lines 11351-11450

Desktop contains:
- `.flatpickr-calendar` - Date picker styling
- Custom colors and spacing

Mobile contains:
- `.flatpickr-calendar` - Touch-optimized
- Larger day cells for tapping

**Edit Pattern**: When changing date picker styles, edit BOTH sections.

---

## FILTERS & TOOLBARS

### Filters Toolbar

**Desktop**: Lines 2851-3100
**Mobile**: Lines 8401-8792 + 11451-11700

Desktop contains:
- `.filters-toolbar` - Filter button container
- Flexbox layout with wrapping
- `.filter-chip`, `.filter-button`

Mobile contains:
- `.filters-toolbar` - Horizontal scroll or wrap
- Adjusted spacing for touch
- Larger buttons

**Edit Pattern**:
- Adding new filter button → Add to both
- Changing filter styles → Edit both
- **NOTE**: Mobile has TWO sections (8401-8792 and 11451-11700)

---

### Filter Chips (Active Filters)

**Desktop**: Lines 3101-3200
**Mobile**: Lines 8645-8693 + 11601-11650

Desktop contains:
- `.active-filter-chip` - Pills showing active filters
- Remove button (×)

Mobile contains:
- `.active-filter-chip` - Larger for touch
- Bigger remove button

**Edit Pattern**: When styling active filters, edit BOTH sections.

---

### Clear Filters Button

**Desktop**: Lines 3201-3250
**Mobile**: Lines 8731-8792 + 11651-11700

Desktop contains:
- `.clear-filters-btn` - Clear all button

Mobile contains:
- `.clear-filters-btn` - Full width or larger

**Edit Pattern**: When changing clear button, edit BOTH sections.

---

## BUTTONS & ACTIONS

### Primary Button

**Desktop**: Lines 3251-3350
**Mobile**: Lines 11701-11800

Desktop contains:
- `.btn-primary` - Primary action button
- Hover effects, transitions

Mobile contains:
- `.btn-primary` - Larger (min-height: 44px)
- Touch-friendly, no hover effects

**Edit Pattern**: When changing primary button, edit BOTH sections.

---

### Secondary Button

**Desktop**: Lines 3351-3450
**Mobile**: Lines 11801-11900

Desktop contains:
- `.btn-secondary` - Secondary button

Mobile contains:
- `.btn-secondary` - Larger for touch

**Edit Pattern**: When changing secondary button, edit BOTH sections.

---

### Icon Buttons

**Desktop**: Lines 3451-3550
**Mobile**: Lines 11901-12000

Desktop contains:
- `.btn-icon` - Icon-only buttons
- Size: 32px × 32px

Mobile contains:
- `.btn-icon` - Larger (44px × 44px minimum)
- Easier to tap

**Edit Pattern**:
- Changing icon button → Edit both
- **CRITICAL**: Mobile needs larger touch targets (44px+)

---

### Floating Action Button (FAB)

**Desktop**: Lines 3551-3650
**Mobile**: Lines 12001-12100

Desktop contains:
- `.fab` - Floating action button (e.g., "Add Task")
- Position: fixed, bottom-right

Mobile contains:
- `.fab` - Adjusted position for bottom nav
- Bottom-right but above nav bar

**Edit Pattern**: When changing FAB, edit BOTH sections.

---

## STATUS & PRIORITY BADGES

### Priority Badges (Global)

**Desktop**: Lines 3651-3750
**Mobile**: Lines 8694-8730 + 12101-12200

Desktop contains:
- `.priority-high`, `.priority-medium`, `.priority-low`
- Color coding

Mobile contains:
- Same classes, adjusted sizing

**Edit Pattern**:
- Changing priority colors → Edit BOTH sections
- **NOTE**: Mobile has embedded section at 8694-8730

---

### Status Badges (Global)

**Desktop**: Lines 3751-3850
**Mobile**: Lines 12201-12300

Desktop contains:
- `.status-todo`, `.status-progress`, `.status-review`, `.status-done`
- Color coding per status

Mobile contains:
- Same classes, adjusted sizing

**Edit Pattern**: When changing status colors, edit BOTH sections.

---

## HISTORY & TIMELINE

### History Section (Task Modal & Project Details)

**Desktop**: Lines 1903-2384
**Mobile**: Lines 12301-12642

Desktop contains:
- `.history-section` - History timeline
- `.history-item` - Individual history entries
- Left timeline line with icons

Mobile contains:
- `.history-section` - Simplified timeline
- Adjusted spacing for mobile

**Edit Pattern**: When changing history styles, edit BOTH sections.

---

## DARK MODE OVERRIDES

### Dark Mode (Desktop)

**Location**: Lines 127-205

Contains:
- `[data-theme="dark"]` selector
- All color overrides for dark mode

**Edit Pattern**: When adding new colors, add dark mode variant here.

---

### Dark Mode (Mobile-Specific)

**Location**: Lines 200-205

Contains:
- Mobile-specific dark mode adjustments

**Edit Pattern**: If dark mode needs mobile tweaks, edit here.

---

## COMPONENT QUICK LOOKUP

| Component | Desktop Lines | Mobile Lines | Notes |
|-----------|---------------|--------------|-------|
| **App Container** | 206-250 | 8797-8850 | Layout structure |
| **Navigation** | 251-423 | 8851-9050 | Sidebar → Bottom bar |
| **Task Card** | 801-1200 | 9401-9700 | Hover → Touch |
| **Task Modal** | 1601-1800 | 10101-10350 | Two-col → Stacked |
| **Project Card** | 1301-1500 | 9751-9950 | Hover → Touch |
| **Filters Toolbar** | 2851-3100 | 8401-8792, 11451-11700 | **TWO mobile sections!** |
| **Primary Button** | 3251-3350 | 11701-11800 | Standard → 44px+ |
| **Icon Button** | 3451-3550 | 11901-12000 | 32px → 44px |
| **Settings Modal** | 1903-2384 | 10451-10850 | Full-screen mobile |
| **History Timeline** | 1903-2384 | 12301-12642 | Simplified mobile |

---

## MOBILE DESIGN RULES

When editing mobile styles, remember:

1. **Touch Targets**: Minimum 44px × 44px for all interactive elements
2. **Font Size**: Minimum 16px for inputs (prevents iOS zoom)
3. **No Hover**: Replace hover effects with :active or remove
4. **Spacing**: More generous padding and margins
5. **Full Width**: Most components go full-width on mobile
6. **Bottom Nav**: Account for 60px bottom navigation bar
7. **Modal**: Most modals go full-screen on mobile

---

## COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Forgetting Mobile Section

**Example**: User reports "progress task cards look wrong on mobile"

**What happened**:
- Edited `.task-card.progress` hover effect in desktop section (line 950)
- Forgot mobile section (line 9500)
- Mobile still has old hover effect (which doesn't work on touch)

**Solution**: ALWAYS check this registry and edit BOTH sections.

---

### ❌ Mistake 2: Forgetting Dual Mobile Sections

**Example**: User reports "filter toolbar broken on mobile"

**What happened**:
- Edited filters at line 11500 (mobile section 2)
- Forgot filters also have styles at line 8401 (mobile section 1)
- Only half of mobile filters updated

**Solution**: Some components have TWO mobile sections (see "Component Quick Lookup" table).

---

### ❌ Mistake 3: Identical Desktop/Mobile Edit

**Example**: Changed button height to 38px in both desktop and mobile

**What happened**:
- 38px is fine for desktop
- 38px is too small for mobile touch targets (need 44px minimum)
- Users can't tap buttons on mobile

**Solution**: Desktop and mobile often need DIFFERENT values. Check "Mobile Design Rules".

---

## HOW TO ADD NEW COMPONENT

When creating a new component:

1. **Design desktop version** → Add to appropriate section (e.g., lines 3000-3100)
2. **Add line range to this registry**
3. **Design mobile version** → Add to mobile section (e.g., lines 11800-11900)
4. **Add mobile line range to this registry**
5. **Link them in "Component Quick Lookup" table**

This ensures future edits won't forget mobile.

---

## TOKEN COMPARISON

| Task | Without Registry | With Registry | Savings |
|------|------------------|---------------|---------|
| **Change task card color** | 56,000 | 400 | **140x** |
| **Add new filter button** | 56,000 | 600 | **93x** |
| **Update button styles** | 56,000 | 400 | **140x** |
| **Fix mobile bug (after forgetting)** | 112,000 | 400 | **280x** |
| **Average CSS change** | 56,000 | 500 | **112x** |

---

## MAINTENANCE

**When to update this registry**:
- New component added → Add desktop + mobile entries
- Component moved → Update line numbers
- Major CSS refactor → Regenerate sections

**How to update line numbers**:
```bash
# Find component in CSS
Grep "\.task-card" in style.css

# Update line numbers in registry
Edit CSS_REGISTRY.md
```

---

**Last Updated**: 2026-01-11
**Version**: 1.0.0
**Components Documented**: 35+ components with desktop/mobile links
**Token Savings**: Average 112x reduction per CSS edit
