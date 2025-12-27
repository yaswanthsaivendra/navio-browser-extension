# Browser Extension – Screenshot-Based Demo Recorder

Version: 2.0  
Status: Current

## 1. Purpose

This browser extension enables sales reps and product teams to record demo flows using screenshot-based recording. The extension captures screenshots at each step, creating standalone, shareable demos that work without requiring the live product to be accessible.

## 2. Core Capabilities

- Start/stop recording of demo flows
- Capture screenshots at each click/navigation step
- Store screenshots efficiently (thumbnails in chrome.storage, full images in IndexedDB)
- Generate a step-by-step flow stored locally
- Support manual steps

## 3. Design Principles

- Must not require product engineering changes
- Must be lightweight and safe—no mutation of the app DOM beyond injected overlays
- Minimal visible UI during recording
- Record once → reusable anytime
- Work on any modern web app
- Screenshot-based for standalone demos (no live product required)

## 4. Dependencies

- Manifest v3 (Chrome extension)
- Content scripts for DOM interaction
- Background service worker
- Messaging between extension ↔ content scripts
- IndexedDB for large screenshot storage
- chrome.tabs.captureVisibleTab API

## 5. Recording Approach

- **Screenshot-based**: Each step captures a screenshot of the current viewport
- Screenshots are compressed and stored efficiently
- Thumbnails stored in chrome.storage.local for quick access
- Full screenshots stored in IndexedDB for unlimited storage
- No selector-based recording (removed in v2.0)
