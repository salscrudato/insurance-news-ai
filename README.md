# Insurance News AI

A production-grade mobile-first PWA for insurance news signals powered by AI. Built with React, TypeScript, Tailwind CSS, and Firebase.

## Project Structure

```
insurance-news-ai/
├── apps/
│   └── web/                 # React + Vite web application
├── functions/               # Firebase Cloud Functions (TypeScript, Gen2)
├── shared/                  # Shared types and utilities
├── pnpm-workspace.yaml      # pnpm monorepo configuration
└── firebase.json            # Firebase configuration
```

## Tech Stack

- **Package Manager**: pnpm with workspaces
- **Web App**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 with CSS variables
- **Backend**: Firebase Cloud Functions (Gen2)
- **Database**: Firestore
- **Linting**: ESLint + Prettier
- **Deployment**: Firebase Hosting + Cloud Functions

## Prerequisites

- Node.js 18+
- pnpm 8+
- Firebase CLI
- Firebase project: `insurance-news-ai`

## Installation

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm

# Install all dependencies
pnpm install
```

## Development

### Start Web App

```bash
pnpm dev:web
```

Opens at `http://localhost:5173` with hot reload enabled.

### Start Firebase Emulator

```bash
pnpm dev:functions
```

Runs Firebase emulator for local development.

### Run All Services

```bash
pnpm dev
```

Runs web app and functions in parallel.

## Building

### Build Web App

```bash
pnpm build:web
```

Outputs to `apps/web/dist/`

### Build Functions

```bash
pnpm build:functions
```

Outputs to `functions/lib/`

### Build Everything

```bash
pnpm build
```

## Linting & Type Checking

```bash
# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check all packages
pnpm type-check
```

## Environment Configuration

### Web App

Copy `.env.example` to `.env.local` and update with your Firebase credentials:

```bash
cp apps/web/.env.example apps/web/.env.local
```

**Never commit `.env.local`** - it's in `.gitignore`

## Project Features

### Web App Shell

- **Bottom Tab Navigation**: Today, Feed, Ask, Saved, Settings
- **Apple-Inspired Design**: Light/dark mode, safe-area support
- **Responsive**: Mobile-first, PWA-ready
- **Accessibility**: WCAG AA+, keyboard navigation, screen reader support

### Shared Types

- `NewsSignal`: Core news signal interface
- `UserPreferences`: User settings and preferences
- `SavedArticle`: Bookmarked articles
- `AnalyticsEvent`: Event tracking

### Firebase Functions

- HTTP endpoints for news signal fetching
- Firestore triggers for signal processing
- Scheduled functions for daily updates
- Gen2 ready for better performance

## Deployment

### Deploy to Firebase

```bash
# Build everything
pnpm build

# Deploy to Firebase
firebase deploy
```

### Deploy Only Functions

```bash
firebase deploy --only functions
```

### Deploy Only Hosting

```bash
firebase deploy --only hosting
```

## Design System

### Colors (CSS Variables)

- `--color-surface`: Primary background
- `--color-surface-secondary`: Secondary background
- `--color-text`: Primary text
- `--color-accent`: Interactive elements
- `--color-separator`: Dividers

### Typography

- `text-display-large`: 34px, bold
- `text-headline`: 22px, bold
- `text-body`: 17px, regular
- `text-caption`: 13px, regular

### Spacing

- Safe area support for notch/home indicator
- Consistent 4px grid
- Generous whitespace

## Scripts Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services |
| `pnpm dev:web` | Start web app only |
| `pnpm dev:functions` | Start Firebase emulator |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | Type check all packages |

## Next Steps

1. Configure Firebase project credentials in `.env.local`
2. Implement news signal fetching logic in `functions/src/index.ts`
3. Build out individual views (Today, Feed, Ask, Saved)
4. Add authentication with Firebase Auth
5. Implement Firestore data models
6. Add PWA manifest and service worker
7. Set up CI/CD pipeline

## License

MIT

