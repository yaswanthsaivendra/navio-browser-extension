# Browser Extension UI/UX Specification

Version: 1.0

## 1. Extension Popup (Launcher)

When clicking the extension icon:

### Main States:

1. **Idle State**

   - Button: “Start Recording”
   - Button: “Load Existing Flows”
   - Settings icon

2. **Recording State**

   - Indicator: Red dot + “Recording…”
   - Button: “Pause Recording”
   - Button: “Finish & Save Flow”
   - Steps counter

3. **Playback State**
   - Dropdown: Select Flow
   - Button: “Start Guided Demo”
   - Button: “Open Editor”

## 2. On-Screen Recorder Toolbar (Injected)

A small floating toolbar injected in the UI during recording.

### Toolbar Elements:

- Step counter (e.g., “Step 3”)
- “Add Manual Step”
- “Undo Last Step”
- “Finish Recording”
- “Hide Toolbar”

Toolbar automatically sticks to top-right.

## 3. Step Annotation Modal

After each captured action, auto-open a modal (non-blocking option available).

Fields:

- Step Title (auto-suggested: "Click Settings", etc.)
- Step Description (short text)
- Optional Presenter Notes (private)
- Next Button: Save

## 4. Playback Overlay UI

During live demo playback:

### Elements:

- A tooltip box next to the target element:
  - Step Title
  - Description
- Highlight ring around element
- Floating step navigator:
  - “Next Step”
  - “Previous Step”
  - “Jump to Step”
  - Branch flow selector (if applicable)
- Presenter-only panel (visible only to rep):
  - Notes
  - Client persona preset selection
  - Suggested phrases to say

## 5. UX Rules

- Overlays must not block essential UI elements.
- Always maintain visual consistency (rounded edges, soft shadows).
- Failure fallback: if element not found → show “Manual Mode” message.
- Snappy transitions (<150ms).
- Fade-in effects for tooltips.

## 6. Accessibility

- Keyboard navigation for steps.
- Allow high-contrast theme in settings.
