# Design System & Theme

## Design Principles

1. **Minimal interference** - Overlays should guide, not distract
2. **Professional** - Looks polished during client demos
3. **Clear hierarchy** - Prospect-facing vs. rep-facing content is obvious
4. **Consistent with web app** - Shared color palette and typography

---

## Color Palette

Match the Navio web app theme (Warm & Earthy Palette using OKLCH):

```css
/* Light Mode (Primary) */
--primary: oklch(0.45 0.12 140); /* Deep Forest Green */
--primary-foreground: oklch(0.98 0.02 95); /* Cream/Sand */

--accent: oklch(0.65 0.18 45); /* Terracotta */
--accent-foreground: oklch(0.98 0.02 95);

--border: oklch(0.9 0.02 95); /* Subtle warm gray */
--background: oklch(0.98 0.02 95); /* Cream/Sand */

--secondary: oklch(0.92 0.03 95); /* Warm Beige */
--secondary-foreground: oklch(0.25 0.02 95);

--muted: oklch(0.95 0.02 95);
--muted-foreground: oklch(0.55 0.04 95);

--card: oklch(0.98 0.02 95);
--card-foreground: oklch(0.25 0.02 95);

/* Semantic Colors (for extension overlays) */
--highlight: oklch(
  0.55 0.18 220
); /* Blue for highlights - complements warm palette */
--success: oklch(0.55 0.15 140); /* Green - matches primary hue */
--warning: oklch(0.75 0.15 60); /* Warm orange/yellow */
```

### Usage

- **Highlight box:** `--highlight` with 2px border + subtle shadow
- **Tooltips:** `--background` with `--border`
- **Presenter panel:** `--accent` background
- **Active step:** `--primary` background with `--primary-foreground` text

---

## Typography

Match the Navio web app fonts (Geist from Google Fonts):

```css
/* Sans-serif (primary) */
font-family:
  var(--font-geist-sans),
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  sans-serif;

/* Monospace (for code/technical content) */
font-family: var(--font-geist-mono), "SF Mono", Monaco, "Cascadia Code",
  "Roboto Mono", monospace;
```

**Note:** The extension should use Geist fonts when possible. If loading external fonts is not feasible in the extension context, fall back to system fonts for performance.

**Sizes:**

- Step title: `14px` (semibold)
- Description: `13px` (regular)
- Notes: `12px` (regular, muted)
- Panel header: `16px` (semibold)

---

## Component Specs

### 1. Highlight Box

```
Border: 2px solid var(--highlight)
Border-radius: var(--radius-md) /* ~8px, matches web app */
Box-shadow: 0 0 0 4px oklch(0.55 0.18 220 / 0.1)
Animation: Subtle pulse (1.5s ease-in-out infinite)
Z-index: 9998
```

### 2. Tooltip

```
Background: var(--background)
Border: 1px solid var(--border)
Border-radius: var(--radius-lg) /* 10px, matches web app */
Padding: 12px 16px
Max-width: 320px
Box-shadow: 0 4px 12px oklch(0 0 0 / 0.1)
Z-index: 9999

Position:
- Prefer right of element (12px offset)
- Fallback to left/top/bottom if no space
- Arrow pointing to element
```

**Content:**

- Title (semibold, 14px)
- Description (regular, 13px, muted using `--muted-foreground`)

### 3. Presenter Panel

```
Position: Fixed right side
Width: 320px
Height: 100vh
Background: var(--accent) /* Terracotta background */
Border-left: 1px solid var(--border)
Box-shadow: -2px 0 8px oklch(0 0 0 / 0.05)
Z-index: 9997

Sections:
1. Header
   - Flow name (16px semibold)
   - Close button (top-right)

2. Steps List
   - Scrollable
   - Each step:
     - Number badge
     - Title
     - Active state: primary background

3. Current Step Details
   - Title
   - Description
   - Notes (yellow background, italic)

4. Navigation
   - Previous / Next buttons
   - Keyboard shortcuts hint
```

### 4. Extension Popup

```
Width: 360px
Padding: 16px
Background: var(--background)

Components:
- Header with logo
- Flow list (scrollable)
- Primary action button (Start Recording / Play Flow)
- Secondary actions (Export, Import)
```

---

## Animations

Keep subtle and professional:

```css
/* Highlight pulse */
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 4px oklch(0.55 0.18 220 / 0.1);
  }
  50% {
    box-shadow: 0 0 0 8px oklch(0.55 0.18 220 / 0.2);
  }
}

/* Tooltip fade in */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Panel slide in */
@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
```

---

## Border Radius

Match the web app's border radius system:

```css
--radius: 0.625rem; /* 10px base */
--radius-sm: calc(var(--radius) - 4px); /* 6px */
--radius-md: calc(var(--radius) - 2px); /* 8px */
--radius-lg: var(--radius); /* 10px */
--radius-xl: calc(var(--radius) + 4px); /* 14px */
```

**Usage:**

- Cards, panels: `var(--radius-lg)` or `var(--radius-xl)`
- Buttons, inputs: `var(--radius-md)`
- Small badges: `var(--radius-sm)`

---

## Accessibility

- All interactive elements have `aria-labels`
- Keyboard navigation fully supported
- Focus states clearly visible
- Color contrast meets WCAG AA standards
- Tooltips dismissible with Escape key

---

## Responsive Behavior

- Panel collapses to icon on screens < 1024px
- Tooltips adjust position based on viewport
- Highlights remain visible during scroll
- Touch-friendly tap targets (min 44px)

---

## Icons

Use **Lucide React** (same as web app):

- `Play` - Start flow
- `Circle` - Recording indicator
- `ChevronRight/Left` - Navigation
- `X` - Close
- `Download/Upload` - Export/Import
- `Eye/EyeOff` - Toggle presenter panel
