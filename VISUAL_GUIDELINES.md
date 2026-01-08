# Nautilus Visual Guidelines

This document defines the visual design standards for Nautilus, ensuring consistency, accessibility, and quality across all UI elements.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Specifications](#component-specifications)
6. [Iconography](#iconography)
7. [Shadows & Elevation](#shadows--elevation)
8. [Animations & Transitions](#animations--transitions)
9. [Responsive Design](#responsive-design)
10. [Accessibility](#accessibility)
11. [Dark Mode](#dark-mode)
12. [Quality Checklist](#quality-checklist)

---

## Design Principles

### 1. Clarity
- **Clear hierarchy** - Use size, weight, and color to establish importance
- **Obvious actions** - Buttons and interactive elements should be immediately recognizable
- **Consistent patterns** - Similar elements should look and behave similarly

### 2. Efficiency
- **Minimal clicks** - Common actions should be quick to access
- **Smart defaults** - Reduce cognitive load with sensible defaults
- **Keyboard shortcuts** - Support power users

### 3. Delight
- **Smooth animations** - Transitions should feel natural and purposeful
- **Visual feedback** - Acknowledge user actions immediately
- **Polish** - Attention to detail in spacing, alignment, and refinement

---

## Color System

### CSS Variables

All colors are defined as CSS variables for easy theming and consistency.

**Light Mode Palette:**
```css
--bg-primary: #f8fafc;           /* Page background */
--bg-secondary: #f1f5f9;         /* Sidebar, headers */
--bg-tertiary: #e2e8f0;          /* Hover states, secondary elements */
--bg-card: #ffffff;              /* Card backgrounds */

--text-primary: #111827;         /* Main text */
--text-secondary: #374151;       /* Secondary text */
--text-muted: #6b7280;           /* Muted text, placeholders */

--border: #cbd5e1;               /* Standard borders */
--border-light: #e2e8f0;         /* Light borders */
--border-strong: #94a3b8;        /* Strong borders, focus states */

--accent-blue: #2563eb;          /* Primary action, info */
--accent-green: #16a34a;         /* Success, low priority */
--accent-amber: #d97706;         /* Warning, medium priority */
--accent-red: #ff3333;           /* Error, high priority, danger */
```

**Dark Mode Palette:**
```css
--bg-primary: #0f1419;
--bg-secondary: #1c1f2b;
--bg-tertiary: #252a36;
--bg-card: #1a1f2e;

--text-primary: #f9fafb;
--text-secondary: #d1d5db;
--text-muted: #9ca3af;

--border: #374151;
--border-light: #2d3340;
--border-strong: #4b5563;

--accent-blue: #3b82f6;
--accent-green: #0ea36a;
--accent-amber: #d18b06;
--accent-red: #ff4444;
```

### Semantic Colors

| Usage | Variable | Light | Dark |
|-------|----------|-------|------|
| **Status: To Do** | `--accent-amber` | #d97706 | #d18b06 |
| **Status: In Progress** | `--accent-blue` | #2563eb | #3b82f6 |
| **Status: Review** | `--accent-amber` | #d97706 | #d18b06 |
| **Status: Done** | `--accent-green` | #16a34a | #0ea36a |
| **Priority: High** | `--accent-red` | #ff3333 | #ff4444 |
| **Priority: Medium** | `--accent-amber` | #d97706 | #d18b06 |
| **Priority: Low** | `--accent-green` | #16a34a | #0ea36a |

### Project Colors (15 options)

```javascript
const PROJECT_COLORS = [
    '#6C5CE7',  // Purple
    '#3742FA',  // Blue
    '#E84393',  // Pink
    '#00B894',  // Green
    '#0984E3',  // Light Blue
    '#00CEC9',  // Cyan
    '#E17055',  // Orange
    '#9B59B6',  // Violet
    '#2F3542',  // Dark Gray
    '#FF3838',  // Red
    '#6C5B7B',  // Mauve
    '#C44569',  // Rose
    '#F8B500',  // Yellow
    '#5758BB',  // Indigo
    '#74B9FF'   // Sky Blue
];
```

### Tag Colors (16 high-contrast options)

```javascript
const TAG_COLORS = [
    '#dc2626',  // Red
    '#ea580c',  // Orange
    '#b45309',  // Brown
    '#ca8a04',  // Gold
    '#16a34a',  // Green
    '#059669',  // Emerald
    '#0ea5a4',  // Teal
    '#0284c7',  // Sky
    '#0369a1',  // Blue
    '#4338ca',  // Indigo
    '#7c3aed',  // Violet
    '#6b21a8',  // Purple
    '#be185d',  // Pink
    '#e11d48',  // Rose
    '#065f46',  // Dark Green
    '#334155'   // Slate
];
```

### Color Usage Rules

**DO:**
- ✅ Use CSS variables for all colors
- ✅ Ensure 4.5:1 contrast ratio for text (WCAG AA)
- ✅ Test in both light and dark mode
- ✅ Use semantic colors (success = green, error = red)

**DON'T:**
- ❌ Hardcode color values in components
- ❌ Use more than 3 accent colors in a single view
- ❌ Rely solely on color to convey information (use icons/text too)

---

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
             'Roboto', 'Helvetica Neue', Arial, sans-serif;
```

**System fonts provide:**
- Native appearance on each platform
- Optimal rendering
- No web font loading delay
- Better performance

### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| **Page Title** | 28px | 700 | 1.2 | Main page headings |
| **Section Title** | 20px | 600 | 1.3 | Section headings |
| **Card Title** | 16px | 600 | 1.4 | Card/modal titles |
| **Body Large** | 16px | 400 | 1.5 | Prominent body text |
| **Body** | 14px | 400 | 1.5 | Standard body text |
| **Body Small** | 13px | 400 | 1.4 | Secondary information |
| **Caption** | 12px | 500 | 1.3 | Labels, metadata |
| **Tiny** | 11px | 500 | 1.2 | Badges, counts |

### Typography Examples

```css
/* Page Title */
.page-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px 0;
}

/* Section Title */
.section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 16px 0;
}

/* Body Text */
.body-text {
    font-size: 14px;
    font-weight: 400;
    color: var(--text-primary);
    line-height: 1.5;
}

/* Caption */
.caption {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
```

### Typography Rules

**DO:**
- ✅ Use relative line-heights (unitless values)
- ✅ Limit line length to 60-80 characters for readability
- ✅ Use consistent font weights (400, 500, 600, 700 only)
- ✅ Establish clear hierarchy with size and weight

**DON'T:**
- ❌ Use more than 3 font sizes in a component
- ❌ Set line-height below 1.2 or above 1.8
- ❌ Use font weights below 400 (too light) or above 700 (too heavy)
- ❌ Use ALL CAPS for long text (max 3-4 words)

---

## Spacing & Layout

### Spacing Scale (8px base unit)

| Name | Value | Usage |
|------|-------|-------|
| **xs** | 4px | Tight spacing, inline elements |
| **sm** | 8px | Small gaps, related items |
| **md** | 16px | Standard spacing, card padding |
| **lg** | 20px | Large gaps, section spacing |
| **xl** | 24px | Extra large spacing |
| **2xl** | 32px | Major section breaks |
| **3xl** | 48px | Page-level spacing |

### Spacing Examples

```css
/* Card padding */
.card {
    padding: 16px;          /* md */
}

/* Form group spacing */
.form-group {
    margin-bottom: 20px;    /* lg */
}

/* Section spacing */
.section {
    margin-bottom: 32px;    /* 2xl */
}

/* Inline element gaps */
.tag-list {
    gap: 4px;               /* xs */
}

/* Related items */
.meta-items {
    gap: 8px;               /* sm */
}
```

### Grid System

**Dashboard Stats Grid:**
```css
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}
```

**Kanban Board:**
```css
.kanban-board {
    display: grid;
    grid-template-columns: repeat(4, minmax(280px, 1fr));
    gap: 16px;
}
```

### Layout Rules

**DO:**
- ✅ Use multiples of 4px for all spacing
- ✅ Use CSS Grid for equal-width layouts
- ✅ Use Flexbox for flexible, single-axis layouts
- ✅ Maintain consistent padding/margin across similar components

**DON'T:**
- ❌ Use arbitrary spacing values (e.g., 13px, 17px)
- ❌ Nest grids more than 2 levels deep
- ❌ Mix spacing units (stick to px for consistency)

---

## Component Specifications

### Buttons

**Primary Button:**
```css
.btn-primary {
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    background: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-primary:active {
    transform: translateY(0);
}
```

**Size Variants:**
- Small: `padding: 6px 12px; font-size: 12px;`
- Medium (default): `padding: 10px 20px; font-size: 14px;`
- Large: `padding: 12px 24px; font-size: 16px;`

### Cards

**Standard Card:**
```css
.card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

**Task Card:**
```css
.task-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.task-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-color: var(--accent-blue);
}
```

### Badges

**Status Badge:**
```css
.status-badge {
    display: inline-block;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 12px;      /* Pill shape */
    text-transform: capitalize;
}
```

**Tag Badge:**
```css
.tag-badge {
    display: inline-block;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 4px;       /* Subtle rounding */
    color: white;
}
```

**Priority Dot:**
```css
.priority-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;       /* Perfect circle */
    flex-shrink: 0;
}
```

### Inputs

**Text Input:**
```css
.form-input {
    width: 100%;
    padding: 10px 12px;
    font-size: 14px;
    color: var(--text-primary);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    transition: all 0.2s;
}

.form-input:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input::placeholder {
    color: var(--text-muted);
}
```

### Modals

**Modal Dimensions:**
- Min width: 400px
- Max width: 90vw
- Max height: 90vh
- Overflow: auto (if content exceeds height)

**Modal Structure:**
```css
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);    /* 70% opacity backdrop */
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: var(--bg-card);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}
```

### Scrollbars

**Design Philosophy:**
- Ultra-minimal and subtle
- Nearly invisible until hover
- No arrows or buttons
- Seamlessly blends with dark mode UI

**Standard Scrollbar:**
```css
.scrollable-container {
    overflow-y: auto;
    /* Firefox */
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

/* WebKit browsers (Chrome, Safari, Edge) */
.scrollable-container::-webkit-scrollbar {
    width: 4px;
}

.scrollable-container::-webkit-scrollbar-track {
    background: transparent;
    margin: 4px 0;
}

.scrollable-container::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
}

.scrollable-container:hover::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
}

/* Remove scrollbar buttons/arrows */
.scrollable-container::-webkit-scrollbar-button {
    display: none;
}
```

**Specifications:**
- Width: 4px (ultra-thin)
- Color (default): `rgba(255, 255, 255, 0.1)` (barely visible)
- Color (hover): `rgba(255, 255, 255, 0.2)` (subtle increase)
- Border radius: 2px (minimal rounding)
- Track: Transparent with 4px top/bottom margin
- Buttons/arrows: Removed (`display: none`)

**Usage Guidelines:**

**DO:**
- ✅ Use for containers with `max-height` that may overflow
- ✅ Apply to project expanded task lists
- ✅ Apply to modal content areas
- ✅ Keep scrollbar width at 4px for consistency

**DON'T:**
- ❌ Make scrollbars too prominent or thick
- ❌ Use default browser scrollbars (they clash with dark mode)
- ❌ Add scrollbar arrows (creates visual clutter)
- ❌ Use different colors that don't match the theme

**Examples:**
- `.expanded-tasks-container` - Project tasks list in expanded view
- `.project-card-body-premium` - Mobile project card expandable content
- `.modal-content` - Modal dialog overflow areas

---

## Iconography

### Emoji Icons

Nautilus uses emoji for icons to maintain a lightweight, friendly aesthetic.

**Common Icons:**
- 📊 Analytics, Dashboard
- 📅 Calendar, Dates
- 📁 Projects, Folders
- ✓ Success, Done
- ✕ Error, Close
- ℹ Information
- ⚠ Warning
- 🔍 Search
- ⚙️ Settings
- 📎 Attachments
- 🔗 Links
- 🗑️ Delete
- ✏️ Edit
- 🌙 Dark mode toggle
- ☀️ Light mode toggle
- 📈 Growth, Progress
- 🎯 Goals, Targets

### Icon Sizes

| Context | Size | Usage |
|---------|------|-------|
| **Page header** | 32px | Main page icon |
| **Nav item** | 20px | Sidebar navigation |
| **Button icon** | 16-18px | Icon buttons |
| **Inline icon** | 14-16px | Inline with text |
| **Small badge** | 12px | Status indicators |

### Icon Rules

**DO:**
- ✅ Use emoji for consistency (no icon font needed)
- ✅ Pair icons with text for clarity
- ✅ Use consistent icons for the same action across the app
- ✅ Ensure sufficient contrast (especially in dark mode)

**DON'T:**
- ❌ Use more than one icon per button (unless absolutely necessary)
- ❌ Rely on icons alone without labels for complex actions
- ❌ Mix emoji and SVG/icon fonts in the same context

---

## Shadows & Elevation

### Shadow Scale

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.12);
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
```

### Elevation Hierarchy

| Level | Shadow | Usage |
|-------|--------|-------|
| **0** | none | Flat elements (text, backgrounds) |
| **1** | sm | Subtle elevation (cards at rest) |
| **2** | md | Hover states, dropdowns |
| **3** | lg | Modals, popovers |
| **4** | xl | Drag previews, critical overlays |

### Dark Mode Shadows

In dark mode, increase shadow opacity slightly:

```css
[data-theme="dark"] .card {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);  /* Higher opacity */
}
```

### Shadow Rules

**DO:**
- ✅ Use consistent shadow for same elevation level
- ✅ Animate shadow on hover for interactive elements
- ✅ Combine multiple shadows for depth (see `--shadow-card`)
- ✅ Test shadows in both light and dark mode

**DON'T:**
- ❌ Use shadows on every element (causes visual clutter)
- ❌ Animate shadow on non-interactive elements
- ❌ Use colored shadows (stick to black with transparency)
- ? Use gradients, glossy overlays, or glow effects on surfaces

---

## Animations & Transitions

### Transition Timing

```css
--transition-fast: 0.15s;       /* Micro-interactions */
--transition-base: 0.2s;        /* Standard transitions */
--transition-slow: 0.3s;        /* Major state changes */
```

### Easing Functions

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Common Transitions

**Button Hover:**
```css
.btn {
    transition: all 0.2s ease;
}

.btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

**Card Hover:**
```css
.card {
    transition: all 0.2s ease;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

**Modal Enter:**
```css
@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal.active {
    animation: modalSlideIn 0.3s ease-out;
}
```

**Notification Slide:**
```css
.notification {
    transform: translateX(400px);
    transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.notification.show {
    transform: translateX(0);
    opacity: 1;
}
```

### Animation Rules

**DO:**
- ✅ Keep animations under 400ms (feels instant)
- ✅ Use `ease-out` for entering elements
- ✅ Use `ease-in` for exiting elements
- ✅ Provide reduced motion alternative (prefers-reduced-motion)
- ✅ Animate transforms and opacity (GPU-accelerated)

**DON'T:**
- ❌ Animate width/height (causes layout reflow)
- ❌ Use animations longer than 500ms (feels slow)
- ❌ Chain more than 2 animations sequentially
- ❌ Animate every property (use `all` sparingly)

### Accessibility: Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Layout Adaptations

**Stats Grid:**
```css
.stats-grid {
    display: grid;
    grid-template-columns: 1fr;    /* Mobile: 1 column */
    gap: 16px;
}

@media (min-width: 768px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);  /* Tablet: 2 columns */
    }
}

@media (min-width: 1024px) {
    .stats-grid {
        grid-template-columns: repeat(3, 1fr);  /* Desktop: 3 columns */
    }
}
```

**Kanban Board:**
```css
.kanban-board {
    /* Mobile: Vertical scroll */
    display: flex;
    flex-direction: column;
    gap: 16px;
}

@media (min-width: 1024px) {
    .kanban-board {
        /* Desktop: Horizontal scroll */
        flex-direction: row;
        overflow-x: auto;
    }
}
```

### Responsive Rules

**DO:**
- ✅ Design mobile-first (start with smallest screen)
- ✅ Test on actual devices, not just browser resize
- ✅ Use relative units (%, rem, em) for scalability
- ✅ Hide non-essential content on mobile
- ✅ Increase touch target size on mobile (min 44x44px)

**DON'T:**
- ❌ Design desktop-first (leads to bloated mobile code)
- ❌ Use fixed widths that break on small screens
- ❌ Hide critical functionality on mobile
- ❌ Use hover effects as only interaction on touch devices

---

## Accessibility

### Contrast Ratios

**WCAG AA Compliance (minimum):**
- Normal text (< 18px): 4.5:1 contrast ratio
- Large text (≥ 18px or ≥ 14px bold): 3:1 contrast ratio
- UI components & graphics: 3:1 contrast ratio

**Testing Tools:**
- Chrome DevTools Contrast Checker
- WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/)

### Keyboard Navigation

**Tab Order:**
- Ensure logical tab order (left to right, top to bottom)
- Skip links for main content
- Focus indicators on all interactive elements

**Focus States:**
```css
.btn:focus,
.form-input:focus {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
}

/* Or custom focus ring */
.btn:focus {
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
}
```

### ARIA Labels

```html
<!-- Button with icon only -->
<button aria-label="Close modal" onclick="closeModal()">
    ×
</button>

<!-- Loading state -->
<div aria-live="polite" aria-busy="true">
    Loading tasks...
</div>

<!-- Error message -->
<div role="alert" aria-live="assertive">
    Failed to save task
</div>
```

### Screen Reader Support

**DO:**
- ✅ Use semantic HTML (nav, main, section, article)
- ✅ Provide alt text for images
- ✅ Use ARIA labels for icon-only buttons
- ✅ Announce dynamic content with aria-live
- ✅ Provide skip links for keyboard users

**DON'T:**
- ❌ Use divs for buttons (use `<button>`)
- ❌ Remove focus outlines without providing alternative
- ❌ Use color alone to convey information
- ❌ Forget to test with actual screen readers

---

## Dark Mode

### Implementation

**Toggle Dark Mode:**
```javascript
function toggleTheme() {
    const currentTheme = document.body.dataset.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.body.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
}
```

**Apply on Load:**
```javascript
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.dataset.theme = savedTheme;
```

### Dark Mode Checklist

**Test every component in dark mode:**
- [ ] Text contrast meets WCAG AA (4.5:1)
- [ ] Borders are visible but not harsh
- [ ] Shadows are adjusted (higher opacity)
- [ ] Images/icons work in both modes
- [ ] Hover states are visible
- [ ] Focus states are visible
- [ ] Loading states are visible
- [ ] Empty states are visible

### Dark Mode Best Practices

**DO:**
- ✅ Use CSS variables for all colors
- ✅ Test in actual dark environment (not just dark UI)
- ✅ Increase shadow opacity in dark mode
- ✅ Reduce image brightness slightly in dark mode
- ✅ Provide toggle in obvious location

**DON'T:**
- ❌ Use pure black (#000) - too harsh (use #0f1419)
- ❌ Use pure white (#fff) - too bright in dark mode
- ❌ Forget to test transitions between modes
- ❌ Invert images/logos (preserve brand colors)

---

## Quality Checklist

### Visual Quality

Before shipping any UI:

**Layout:**
- [ ] Consistent spacing (multiples of 4px)
- [ ] Proper alignment (no pixel misalignment)
- [ ] Responsive on mobile, tablet, desktop
- [ ] No horizontal scrolling on mobile
- [ ] Content doesn't overflow containers

**Typography:**
- [ ] Clear hierarchy (size, weight, color)
- [ ] Readable line length (60-80 characters)
- [ ] Sufficient line-height (1.4-1.6 for body text)
- [ ] Consistent font weights used
- [ ] No orphaned words (single word on last line)

**Color:**
- [ ] Uses CSS variables (no hardcoded colors)
- [ ] Meets contrast requirements (4.5:1)
- [ ] Works in light and dark mode
- [ ] Semantic colors used correctly
- [ ] No more than 3 accent colors per view

**Interactions:**
- [ ] Hover states on interactive elements
- [ ] Focus states visible
- [ ] Loading states for async actions
- [ ] Error states handled gracefully
- [ ] Success feedback provided

**Animations:**
- [ ] Smooth transitions (under 400ms)
- [ ] Reduced motion alternative
- [ ] No janky animations (60fps)
- [ ] Purposeful (not decorative)

**Accessibility:**
- [ ] Keyboard navigable
- [ ] Focus indicators visible
- [ ] ARIA labels on icon buttons
- [ ] Semantic HTML used
- [ ] Screen reader tested

**Performance:**
- [ ] No layout shift (CLS < 0.1)
- [ ] Fast first paint (FCP < 1.8s)
- [ ] Smooth scrolling
- [ ] Optimized images
- [ ] Minimal repaints/reflows

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0

See also:
- [specs/UI_PATTERNS.md](specs/UI_PATTERNS.md) - Component code examples
- [specs/CODING_CONVENTIONS.md](specs/CODING_CONVENTIONS.md) - Code standards
- [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) - Technical architecture
