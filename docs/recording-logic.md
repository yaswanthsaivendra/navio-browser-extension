# Recording Logic Specification

Version: 2.0

## 1. Action Types Captured

We capture only the following atomic actions:

1. **Click Event**
   - Screenshot of viewport at click time
   - Element text (for reference)
   - Node type (for reference)
   - URL at time of click
2. **Navigation (URL Change)**
   - URL before/after
   - Screenshot of new page
3. **Input Event (optional MVP)**
   - Screenshot of input field
4. **Visibility Trigger**
   - "Element appeared" or "Element visible"
   - Screenshot when element becomes visible
5. **Manual Step**
   - Created by rep, no DOM action required
   - Screenshot of current state

## 2. Screenshot Strategy

- Capture visible viewport using `chrome.tabs.captureVisibleTab()`
- Generate thumbnail (320px width, ~50-100KB) for quick preview
- Store full screenshot if <200KB in step meta
- Store full screenshot in IndexedDB if >=200KB
- Compress images using Canvas API (JPEG, quality 0.75-0.85)

## 3. Step Structure (JSON)

```json
{
  "id": "uuid",
  "type": "click",
  "url": "https://app.com/dashboard",
  "explanation": "Click Settings button to open preferences",
  "order": 1,
  "meta": {
    "elementText": "Settings",
    "nodeType": "button",
    "timestamp": "2025-01-15T10:30:00Z",
    "screenshotThumb": "data:image/jpeg;base64,...",
    "screenshotFull": "data:image/jpeg;base64,...",
    "screenshotIndexedDB": false,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

## 4. Storage Strategy

- **Thumbnails**: Always stored in `chrome.storage.local` (step.meta.screenshotThumb)
- **Full Screenshots**:
  - If <200KB: Stored in step.meta.screenshotFull
  - If >=200KB: Stored in IndexedDB, flagged with screenshotIndexedDB: true
- **IndexedDB Structure**:
  - Store name: "screenshots"
  - Key: `${flowId}_${stepId}`
  - Value: Blob containing full screenshot

## 5. Recording Flow

1. User clicks "Start Recording" in popup
2. Content script attaches click listener
3. On each click:
   - Capture screenshot of visible viewport
   - Generate thumbnail
   - Create step with screenshot data
   - Send step to background script
4. Background script stores step and manages order
5. User clicks "Stop Recording" and saves flow
