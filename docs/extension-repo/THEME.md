# Design System & Theme

## Design Principles

1. **Minimal interference** - Overlays should guide, not distract
2. **Professional** - Looks polished during client demos
3. **Clear hierarchy** - Prospect-facing vs. rep-facing content is obvious
4. **Consistent with web app** - Shared color palette and typography

---

## Color Palette

Match the Navio web app theme (shadcn/ui default):

```css
/* Light Mode (Primary) */
--primary: 222.2 47.4% 11.2%;        /* Dark slate */
--primary-foreground: 210 40% 98%;   /* Off white */

--accent: 210 40% 96.1%;             /* Light blue-gray */
--accent-foreground: 222.2 47.4% 11.2%;

--border: 214.3 31.8% 91.4%;         /* Subtle gray */
--background: 0 0% 100%;             /* White */

/* Semantic Colors */
--highlight: 221 83% 53%;            /* Blue for highlights */
--success: 142 71% 45%;              /* Green */
--warning: 38 92% 50%;               /* Orange */
```

### Usage
- **Highlight box:** `--highlight` with 2px border + subtle shadow
- **Tooltips:** `--background` with `--border`
- **Presenter panel:** `--accent` background
- **Active step:** `--primary` background with `--primary-foreground` text

---

## Typography

Use system fonts for performance:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

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
Border-radius: 4px
Box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1)
Animation: Subtle pulse (1.5s ease-in-out infinite)
Z-index: 9998
```

### 2. Tooltip
```
Background: var(--background)
Border: 1px solid var(--border)
Border-radius: 8px
Padding: 12px 16px
Max-width: 320px
Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
Z-index: 9999

Position: 
- Prefer right of element (12px offset)
- Fallback to left/top/bottom if no space
- Arrow pointing to element
```

**Content:**
- Title (semibold, 14px)
- Description (regular, 13px, muted)

### 3. Presenter Panel
```
Position: Fixed right side
Width: 320px
Height: 100vh
Background: var(--accent)
Border-left: 1px solid var(--border)
Box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05)
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
  0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
  50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.2); }
}

/* Tooltip fade in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Panel slide in */
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

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
