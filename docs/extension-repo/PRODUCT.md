# Product Context

## The Problem

Sales reps struggle with:

- **Inconsistent demos** - Different reps present different flows, forget steps
- **Unpredictable environments** - Staging has missing/broken data
- **Forgetting what to say** - Juggling tabs, notes, slides during demos
- **Slow onboarding** - New reps take months to learn the "perfect demo"

## The Solution

A browser extension that overlays guidance directly on the real product during live demos:

- Highlights the next UI element to click
- Shows tooltip explanations for prospects
- Displays private presenter notes for the rep
- Walks reps step-by-step through predefined flows

**Key insight:** Guide reps _inside_ the real product, not with slides or scripts.

---

# Phase 1 - MVP Scope

Build a **standalone extension** that works without a backend. Focus on proving the core value.

## Features to Build

### 1. Recorder

**Goal:** Capture a demo flow by recording clicks

**Functionality:**

- Start/stop recording from extension popup
- Listen to click events on the page
- For each click, capture:
  - DOM selector (use priority-based selector strategy)
  - Current URL
  - Element text content
  - Timestamp
  - Auto-generate step explanation (60-100 characters)
  - Auto-number steps sequentially
- Store steps in `chrome.storage.local` (persists across page navigations)
- Steps can be edited later after recording is complete

**UI:**

- Simple popup with "Start Recording" / "Finish & Save Flow" button
- Step counter displayed during recording
- Dialog to enter flow name when saving
- After recording, show list of saved flows

### 2. Runtime (Overlay Player)

**Goal:** Play back recorded flows with visual overlays

**Functionality:**

- Select a flow from popup to start
- Inject overlay UI into the page:
  - **Highlight box** around the current element (using stored selector)
  - **Tooltip** next to element showing step title + description
  - **Presenter panel** (floating sidebar) with:
    - Full list of steps
    - Current step highlighted
    - Private notes for the rep
    - Next/Previous buttons
- Navigate through steps with:
  - Click "Next" button
  - Keyboard shortcuts (→ for next, ← for previous)
- Auto-scroll to highlighted element

**UI Components:**

- Highlight: 2px solid border with subtle glow
- Tooltip: Card with step title + description
- Presenter panel: Floating sidebar (right side, collapsible)

### 3. Storage & Export

**Goal:** Persist flows locally and allow sharing

**Functionality:**

- Save flows to `chrome.storage.local`
- Export flow as JSON file
- Import flow from JSON file
- List all saved flows in popup

**Data Structure:**

```typescript
type Flow = {
  id: string
  name: string
  createdAt: string
  updatedAt?: string
  steps: FlowStep[]
  meta?: {
    description?: string
    tags?: string[]
  }
}

type FlowStep = {
  id: string
  type: "click" | "navigation" | "input" | "visibility" | "manual"
  selector: string
  url: string
  explanation: string // Single field for step description (60-100 characters)
  order: number
  meta?: {
    elementText?: string
    nodeType?: string
    timestamp?: string
    screenshotThumb?: string
    createdAt?: string
  }
}
```

---

## What NOT to Build (Phase 1)

- ❌ Backend integration (comes in Phase 2)
- ❌ Multi-user/team features
- ❌ Branching flows
- ❌ Demo data overrides
- ❌ Analytics
- ❌ Cloud sync

---

## Success Criteria

You have a working MVP when:

1. ✅ You can record a 5-step flow on any website
2. ✅ You can play it back with visible highlights and tooltips
3. ✅ You can see presenter notes in the side panel
4. ✅ You can export and import flows as JSON
5. ✅ A new user can install and use it in under 5 minutes

---

## Technical Notes

### Selector Strategy

Use a robust selector generator that prioritizes:

1. `data-testid` attributes
2. Unique IDs
3. Combination of class + nth-child
4. XPath as fallback

### URL Matching

- Store full URL during recording
- During playback, match by pathname (ignore query params initially)
- Show warning if URL doesn't match

### Overlay Injection

- Use Shadow DOM to isolate styles
- Position highlights using `getBoundingClientRect()`
- Handle scroll events to keep highlights in sync

### Performance

- Debounce scroll events
- Use `requestAnimationFrame` for smooth animations
- Clean up event listeners when flow ends
