# Browser Extension UI/UX Specification

Version: 1.0

## 1. Extension Popup (Launcher)

When clicking the extension icon:

### Main States:

1. **Idle State**

   - Button: "Start Recording"
   - List of saved flows with "View Details" and "Delete" buttons

2. **Recording State**

   - Indicator: Red dot + "Recording…"
   - Button: "Finish & Save Flow"
   - Steps counter

## 2. Recording UI

During recording, the extension popup shows:

- Red dot indicator + "Recording... Step X" text
- "Finish & Save Flow" button
- Step counter updates in real-time

No on-screen toolbar is displayed during recording to minimize interference.

## 3. Step Annotation

Steps are automatically annotated during recording:

- Auto-generated explanation (60-100 characters)
- Auto-numbered sequentially (Step 1, Step 2, etc.)
- Based on element text and action type
- Screenshot captured at each step

## 5. UX Rules

- Overlays must not block essential UI elements.
- Always maintain visual consistency (rounded edges, soft shadows).
- Failure fallback: if element not found → show “Manual Mode” message.
- Snappy transitions (<150ms).
- Fade-in effects for tooltips.

## 6. Accessibility

- Keyboard navigation for steps.
- Allow high-contrast theme in settings.
