# Pre-Production Hardening Report — The Brief

Generated: 2026-02-10

---

## 1. Pre-Production Checklist

### A. Build & Lint
- [x] `npm install` — clean (0 vulnerabilities)
- [x] `npm run lint` — 0 errors, 0 warnings
- [x] `npm run build` — passes (tsc + vite)
- [x] `functions/npm install` — clean (0 vulnerabilities)
- [x] `functions/npm run lint` — 0 errors
- [x] `functions/npm run build` — passes (tsc)
- [x] `npx cap sync ios` — 5 plugins synced, no errors

### B. UI/UX Quality
- [x] All tap targets >= 44px (sheet close buttons, expand/collapse, search clear)
- [x] All interactive elements have `aria-label` attributes
- [x] All cards have accessible role + label
- [x] Expand/collapse buttons use `aria-expanded`
- [x] No hardcoded colors — all use CSS variables
- [x] Skeleton loading states on all data-dependent screens
- [x] Empty states on Feed, Bookmarks, Ask AI
- [x] Error states with retry on Today, Feed
- [x] Safe area insets applied on all screens (top nav, composers, sheets, footers)
- [x] Glass morphism nav bars with proper backdrop-filter
- [x] Light theme only — no dark mode artifacts

### C. AI & Cost
- [x] `max_output_tokens` set on all AI calls (800 for articles, 4000 for briefs)
- [x] `triggerDailyBrief` HTTP endpoint secured with API key authentication
- [x] Question length validated (max 2000 chars) on both RAG endpoints
- [x] `sourceIds` validated (max 10 items) on both RAG endpoints
- [x] `startAfterPublishedAt` date parsing validated
- [x] Structured output with `strict: true` on all AI calls
- [x] Prompt injection defense via `sanitizeUserInput` + blocklist
- [x] Rate limiting: 50/day article AI, 30/day RAG
- [x] RAG cache with 6-hour TTL
- [x] Article AI permanently cached on document

### D. Data & Performance
- [x] Code splitting: main bundle 441KB (was 1,056KB)
- [x] Vendor chunks: firebase, react, radix-ui, react-query (independently cacheable)
- [x] Firestore indexes cover all query patterns
- [x] Firestore rules: public read for content, user-scoped writes with validation
- [x] Infinite scroll with IntersectionObserver + 300px margin
- [x] Images lazy-loaded with `loading="lazy" decoding="async"`
- [x] localStorage caching for today's brief (30min TTL)
- [x] TanStack Query staleTime/gcTime tuned per data type

### E. iOS / Capacitor
- [x] `viewport-fit=cover` in HTML meta
- [x] StatusBar style: LIGHT (dark text)
- [x] Theme color: #FFFFFF
- [x] Keyboard resize: body
- [x] Safe area CSS variables used throughout
- [x] External links via Capacitor Browser plugin
- [x] Push notifications handle denied/unsupported states gracefully
- [x] Firebase Auth native SDK on iOS (bypasses reCAPTCHA)

---

## 2. Changelog

### UI Polish
- **app-logo.tsx**: Replaced `Math.random()` with React `useId()` for SSR-safe gradient IDs
- **sheet.tsx**: Increased close button tap target from 36px to 44px (Apple HIG)
- **SearchBar.tsx**: Replaced hardcoded `rgba()` focus color with CSS variable `--color-fill-secondary`
- **ArticleCard.tsx**: Added `aria-label` with article title and source name
- **BriefSections.tsx**: Added `aria-expanded`, `aria-label`, and `min-h-[44px]` to expand/collapse buttons
- **MainLayout.tsx**: Extracted `LargeTitleContext` to separate file for React fast-refresh compliance
- **MainLayout.tsx**: Fixed ternary expression lint error in NavRow click handler

### AI / Prompting / RAG
- **index.ts**: Added `max_output_tokens: 800` to article AI calls (gpt-4o-mini)
- **index.ts**: Added `max_output_tokens: 4000` to daily brief calls (gpt-4o) — both scheduled and manual
- **index.ts**: Secured `triggerDailyBrief` endpoint with API key authentication
- **index.ts**: Added question length validation (max 2000 chars) to `answerQuestionRag` and streaming endpoint
- **index.ts**: Added `sourceIds` array validation (max 10) to both RAG endpoints
- **index.ts**: Added `startAfterPublishedAt` date parsing validation in `getArticles`

### Performance / Caching
- **vite.config.ts**: Added `manualChunks` code-splitting — main bundle reduced from 1,056KB to 441KB
  - `vendor-react`: react, react-dom, react-router-dom (48KB)
  - `vendor-firebase`: firebase/app, auth, firestore (444KB)
  - `vendor-ui`: radix-ui dialog, dropdown-menu, slot (85KB)
  - `vendor-query`: @tanstack/react-query (37KB)

### Firebase / Functions / Infra
- **eslint.config.js**: Excluded `functions/lib` from web ESLint (compiled JS outputs)
- **configure-phone-auth.ts**: Removed unused variables (`AUTHORIZED_DOMAINS`, `testPhoneNumbers`)

### iOS / Capacitor
- Verified `viewport-fit=cover`, `maximum-scale=1`, `theme-color` meta tags
- Verified Capacitor StatusBar, Keyboard, PushNotifications, FirebaseAuthentication config
- Verified `cap sync ios` passes with all 5 plugins

### Lint Fixes (16 errors → 0)
- **app-logo.tsx**: `Math.random()` → `useId()` (react-hooks/purity)
- **badge.tsx, button.tsx, card.tsx, chip.tsx**: Added eslint-disable for react-refresh/only-export-components (standard shadcn pattern)
- **auth-context.tsx**: Removed unused `error` variable, added eslint-disable for useAuth export
- **AskPage.tsx**: Removed unused `error` variable, replaced `while(true)` with `for(;;)` to remove stale eslint-disable
- **FeedPage.tsx**: Replaced effect-based URL sync with render-time state sync pattern (react-hooks/set-state-in-effect)
- **AuthPage.tsx**: Extracted boolean expression to `isEmpty` variable (react-hooks/exhaustive-deps)

---

## 3. Release Runbook

### Build Web
```bash
npm install
npm run lint
npm run build
```

### Run Firebase Emulators
```bash
# Start all emulators (Auth, Functions, Firestore, Hosting)
npx firebase emulators:start
# Or functions only:
npx firebase emulators:start --only functions
```

### Deploy Hosting + Functions + Firestore
```bash
# Deploy everything
npx firebase deploy

# Deploy individually
npx firebase deploy --only hosting
npx firebase deploy --only functions
npx firebase deploy --only firestore:rules
npx firebase deploy --only firestore:indexes
```

### Build & Sync iOS
```bash
npm run build
npx cap sync ios
npx cap open ios
# Then build/archive in Xcode
```

### Smoke Test
```bash
bash scripts/smoke-test.sh
```

### Verify Functions (curl)
```bash
# Health check
curl https://us-central1-insurance-news-ai.cloudfunctions.net/apiHealth

# Get today's brief
curl -X POST https://us-central1-insurance-news-ai.cloudfunctions.net/getTodayBrief \
  -H "Content-Type: application/json" \
  -d '{"data":{}}'

# Get articles
curl -X POST https://us-central1-insurance-news-ai.cloudfunctions.net/getArticles \
  -H "Content-Type: application/json" \
  -d '{"data":{"category":"all","timeWindow":"7d","limit":5}}'
```

### Manual Ingestion / Brief Generation
```bash
# Trigger RSS ingestion (requires INGESTION_API_KEY)
curl "https://us-central1-insurance-news-ai.cloudfunctions.net/triggerIngestion?key=YOUR_KEY"

# Generate daily brief (requires INGESTION_API_KEY)
curl "https://us-central1-insurance-news-ai.cloudfunctions.net/triggerDailyBrief?key=YOUR_KEY"
```

---

## 4. Smoke Test Script

Located at `scripts/smoke-test.sh`. Runs 19 automated checks:

- **Web** (5): install, lint, build, dist files, no .env leak
- **Functions** (4): install, lint, build, lib output
- **iOS** (3): config exists, ios directory, cap sync
- **Config** (5): firebase.json, rules, indexes, viewport-fit, theme-color

Run with: `bash scripts/smoke-test.sh`

Last run: **19/19 passed**
