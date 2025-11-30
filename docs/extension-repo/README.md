# Navio Browser Extension

Chrome extension that provides live overlay guidance for product demos. Sales reps can trigger flows that highlight UI elements, show tooltips, and display presenter notes directly on top of the real product during screen-share demos.

## Quick Start

### Prerequisites

- Node.js 18+
- Chrome browser

### Install & Run

```bash
pnpm install
pnpm dev
```

Then:

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `build/chrome-mv3-dev` folder

## Project Structure

```
extension/
├── src/
│   ├── background/       # Service worker (API calls, auth)
│   ├── content/          # Injected scripts
│   │   ├── recorder/    # Flow recording logic
│   │   └── runtime/     # Overlay player
│   ├── popup/           # Extension popup UI
│   └── components/      # Shared React components
├── public/              # Static assets
└── manifest.json        # Extension manifest
```

## Tech Stack

- **Framework:** Vite + React + TypeScript
- **UI:** React + TailwindCSS
- **Storage:** Chrome Storage API (Phase 1: localStorage)
- **Build:** TypeScript + Vite

## Development

```bash
# Development with hot reload
pnpm dev

# Build for production
pnpm build

# Package for Chrome Web Store
pnpm package
```

## Phase 1 Scope (MVP)

See [PRODUCT.md](./PRODUCT.md) for full details.

**Core features:**

- ✅ Record clicks and capture DOM selectors
- ✅ Play back flows with overlay highlights
- ✅ Show tooltips and presenter notes
- ✅ Local storage (no backend required)
- ✅ Manual JSON export/import

## Design

See [THEME.md](./THEME.md) for UI guidelines and design system.
