# Navio Browser Extension

Browser extension for recording demo flows using screenshot-based recording. Sales reps can record standalone demos that work without requiring the live product to be accessible.

This is a Chrome extension built with Vite, React, and TypeScript using industry-standard practices.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development](#development)
- [Building](#building)
- [Code Quality](#code-quality)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Prerequisites

- **Node.js**: 20.x (see `.nvmrc`)
- **pnpm**: 10.22.0 (specified in `packageManager` field)
- **Chrome browser** (for development and testing)

### Using nvm (recommended)

```bash
nvm install
nvm use
```

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd navio-browser-extension
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm dev
   ```

4. **Load the extension in Chrome**
   - Open Chrome → `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/chrome-mv3-dev` folder (or `dist/chrome-mv3-prod` for production build)

The extension will auto-reload as you make changes to the code.

## Development

### Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm package` - Package the extension into a zip file
- `pnpm clean` - Remove build artifacts and cache
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Run ESLint with auto-fix
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm type-check` - Run TypeScript type checking
- `pnpm validate` - Run all checks (type-check, lint, format)
- `pnpm check-all` - Alias for `validate`

### Project Structure

```
navio-browser-extension/
├── public/             # Static assets (icons, images)
│   └── assets/
├── dist/              # Build output (gitignored)
├── docs/              # Documentation
├── src/
│   ├── popup/         # Extension popup UI
│   │   ├── index.html
│   │   ├── index.tsx
│   │   └── Popup.tsx
│   ├── background/    # Background service worker
│   │   └── index.ts
│   ├── content/       # Content scripts
│   │   └── index.ts
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   └── manifest.json  # Extension manifest
├── .github/           # GitHub Actions workflows
├── .husky/            # Git hooks
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
└── package.json       # Dependencies and scripts
```

### Adding New Features

- **Popup UI**: Edit `src/popup/Popup.tsx`
- **Options Page**: Create `src/options/` directory with `index.html` and `index.tsx`
- **Content Scripts**: Edit `src/content/index.ts` or add new files
- **Background Script**: Edit `src/background/index.ts`
- **Components**: Add React components in `src/components/` (create if needed)
- **Manifest**: Update `src/manifest.json` for permissions, content scripts, etc.

## Building

### Production Build

```bash
pnpm build
```

This creates optimized production bundles in `dist/chrome-mv3-prod/`.

### Package for Distribution

```bash
pnpm package
```

This creates a zip file ready for Chrome Web Store submission.

## Code Quality

This project uses several tools to maintain code quality:

- **ESLint**: Code linting with TypeScript and React rules
- **Prettier**: Code formatting with import sorting
- **TypeScript**: Static type checking with strict mode
- **Husky**: Git hooks for pre-commit and pre-push validation
- **lint-staged**: Run linters on staged files
- **Commitlint**: Enforce conventional commit messages

### Pre-commit Hook

Before each commit, the following checks run automatically:

- ESLint on staged files
- Prettier formatting on staged files

### Pre-push Hook

Before pushing to remote, the following checks run:

- TypeScript type checking
- ESLint on all files

### Commit Message Format

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

## Configuration

### Vite Configuration

The `vite.config.ts` file contains build configuration:

- React plugin setup
- Chrome extension plugin configuration
- Build output settings

### Environment Variables

Create a `.env` file in the root directory for local development (see `.env.example` for template).

**Note**: `.env` files are gitignored. Never commit sensitive information.

### TypeScript

TypeScript configuration uses strict mode and modern ES features. See `tsconfig.json` for details.

### ESLint

ESLint uses the flat config format (ESLint 9+). Configuration is in `eslint.config.mjs`.

### Prettier

Prettier configuration is in `.prettierrc.mjs` and includes:

- Import sorting with `@ianvs/prettier-plugin-sort-imports`
- Consistent code formatting rules

## Deployment

### Chrome Web Store

1. Build the extension: `pnpm build`
2. Package it: `pnpm package`
3. Upload `navio-extension.zip` (created in project root) to Chrome Web Store

### Automated Deployment

The project includes a GitHub Action workflow (`.github/workflows/submit.yml`) for automated submission using [bpp](https://bpp.browser.market).

**Setup**:

1. Upload the first version manually to establish credentials
2. Add `SUBMIT_KEYS` secret to GitHub repository
3. Trigger the workflow manually from GitHub Actions

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run validation: `pnpm validate`
4. Commit using conventional commits: `git commit -m "feat: add new feature"`
5. Push and create a pull request

### Development Workflow

1. Make changes
2. Linting and formatting run automatically on commit
3. Ensure all checks pass before pushing
4. Create PR with descriptive title and description

## Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Vite Documentation](https://vitejs.dev/)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)

## License

[Add your license here]
