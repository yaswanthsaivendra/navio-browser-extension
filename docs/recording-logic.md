# Recording Logic Specification

Version: 1.0

## 1. Action Types Captured

We capture only the following atomic actions:

1. **Click Event**
   - CSS selector
   - Element path
   - Inner text (if any)
   - Node type
2. **Navigation (URL Change)**
   - URL before/after
3. **Input Event (optional MVP)**
   - Field selector
   - Input type
4. **Visibility Trigger**
   - “Element appeared” or “Element visible”
5. **Manual Step**
   - Created by rep, no DOM action required.

## 2. Selector Strategy

Priority order:

1. Stable data attributes → `data-testid`, `data-id`, etc.
2. IDs
3. Unique class combinations
4. Relative XPaths (worst-case fallback)

Record all four and choose the best score.

## 3. Step Structure (JSON)

````json
{
  "stepId": "uuid",
  "type": "click",
  "selector": "#settings-btn",
  "pageUrl": "https://app.com/dashboard",
  "title": "Open Settings",
  "description": "This is where you configure user preferences.",
  "presenterNotes": "Mention our new RBAC system.",
  "meta": {
    "screenshotThumb": "",
    "createdAt": ""
  }
}
4. Recording Flow

User clicks “Start Recording”

Content script attaches global listeners:

click

input

DOM change

navigation

On each captured event:

Detect event type

Extract selector

Compute diff from last step

Open annotation modal

Save step in memory until finalization

On “Finish Recording”:

Persist flow to backend

Reset listeners

5. Error Handling

If selector collision → fallback to XPath.

If page reload wipes overlays → auto-reinject.

If user clicks outside DOM → ignore event.

6. Security

Never capture user-entered passwords.

Ignore events from iframes (unless allowlist set).

No network calls from content script except to API endpoint.



# **📄 4. extension-overlay-runtime.md**

```md
# Overlay Runtime Specification
Version: 1.0

## 1. Purpose
Renders guided overlays on top of the live product UI during demos. The runtime is initiated either through extension popup or via injected script when user chooses a flow.

## 2. Overlay Components
1. **Tooltip Component**
   - Title + Description
   - Arrow pointer to target element
   - Smart position (avoid off-screen)

2. **Highlight Component**
   - Animated glowing rectangle around target
   - Resize on DOM resize events

3. **Step Navigator**
   - Next / Previous / Jump-to-step
   - Step counter
   - Branch selector

4. **Presenter Panel (private)**
   - Presenter notes
   - Suggested talking points
   - Toggle persona (Enterprise / SMB / etc.)

## 3. Step Execution Logic
1. Load flow JSON
2. For each step:
   - Query DOM for selector
   - If found:
     - Render highlight
     - Render tooltip
   - If not found:
     - Show fallback modal:
       “Element not found — continue manually?”
   - Wait for user to click “Next”

## 4. Selector Monitoring
- Observe DOM mutations using MutationObserver
- Re-attempt selector match when DOM changes
- Timeout after 2 seconds, then show fallback

## 5. Overlay Injection
- Append to document body using shadow DOM
- Prevent CSS conflicts
- Z-index safety layer
- Detached when flow ends

## 6. Cleanup
- Remove all DOM nodes
- Unsubscribe listeners
- Clear residual state
````
