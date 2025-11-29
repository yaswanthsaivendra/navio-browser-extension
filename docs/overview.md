# Browser Extension – Overlay Demo Recorder

Version: 1.0  
Status: Draft

## 1. Purpose

This browser extension enables sales reps and product teams to record demo flows on the live product UI. The extension captures user actions (clicks, navigation, inputs), generates structured step definitions, and overlays guided steps during live demos.

## 2. Core Capabilities

- Start/stop recording of demo flows.
- Capture actions: click, navigation, text input, DOM visibility.
- Auto-identify unique selectors for each action.
- Generate a step-by-step flow stored in backend.
- Overlay presenter notes and tooltips during live demo.
- Support branching flows (manual selection).
- Allow editing and re-recording specific steps.

## 3. Design Principles

- Must not require product engineering changes.
- Must be lightweight and safe—no mutation of the app DOM beyond injected overlays.
- Minimal visible UI during recording.
- Record once → reusable anytime.
- Work on any modern web app.

## 4. Dependencies

- Manifest v3 (Chrome extension).
- Content scripts for DOM interaction.
- Background service worker.
- Messaging between extension ↔ content scripts.
- Secure API communication with web app backend.

## 5. Out of Scope (MVP)

- Video recording.
- Screenshot-based demos.
- Full sandbox/clone environment.
- Real-user analytics.
