# P&C Brief (Insurance News AI)

A React + TypeScript + Vite application for insurance news with iOS native support via Capacitor.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## Firebase

This project uses Firebase for backend services:
- **Firestore** - NoSQL database
- **Cloud Functions** - Serverless backend (TypeScript, Node 22)
- **Hosting** - Static web hosting

### Prerequisites

- Java 21+ (required for Firestore emulator)
- Firebase CLI (included as dev dependency)
- Firebase project: `insurance-news-ai`

### Local Development with Emulators

```bash
# Start all emulators (requires Java 21+)
npm run firebase:emulators

# Start only Functions and Hosting (no Java required)
npm run firebase:emulators:functions
```

Emulator URLs:
- **Emulator UI**: http://127.0.0.1:4000
- **Hosting**: http://127.0.0.1:5002
- **Functions**: http://127.0.0.1:5001
- **Firestore**: http://127.0.0.1:8080

### Deployment

```bash
# Deploy everything (builds first)
npm run firebase:deploy

# Deploy only hosting
npm run firebase:deploy:hosting

# Deploy only functions
npm run firebase:deploy:functions

# Deploy only Firestore rules and indexes
npm run firebase:deploy:firestore
```

### Firestore Schema

The database uses the following collections:

| Collection | Description | Access |
|------------|-------------|--------|
| `sources/{sourceId}` | RSS feed sources | Public read, server write |
| `articles/{articleId}` | Ingested articles | Public read, server write |
| `briefs/{yyyy-mm-dd}` | Daily AI briefs | Public read, server write |
| `users/{uid}` | User profiles | Owner read, server write |
| `users/{uid}/bookmarks/{articleId}` | User bookmarks | Owner read/write |
| `users/{uid}/prefs/main` | User preferences | Owner read/write |

TypeScript types are defined in:
- `src/types/firestore.ts` (client)
- `functions/src/types/firestore.ts` (server)

### RSS Sources

The following reputable P&C insurance news sources are integrated:

| Source | RSS URL(s) | Category Focus | Notes |
|--------|-----------|----------------|-------|
| Insurance Journal | `insurancejournal.com/rss/news/` | Property, Casualty, Regulation, Claims | Industry standard |
| Claims Journal | `claimsjournal.com/rss/news/` | Claims, Casualty | Claims-focused |
| Artemis | `artemis.bm/feed/` | Reinsurance, Cat bonds | ILS/Re specialist |
| Carrier Management | `carriermanagement.com/feed` | Property, Claims, InsurTech, Re | Executive-focused |
| Business Insurance | Multiple feeds (NEWS, NEWS06, NEWS08, GLOBAL) | Property, Casualty, Regulation | 4 feeds combined |
| Insurance Business (US) | `insurancebusinessmag.com/us/rss` | Property, Casualty, Regulation | US market |
| Risk & Insurance | `riskandinsurance.com/feed` | Claims, InsurTech | Risk management |
| Canadian Underwriter | Multiple feeds | Property, Claims | Optional, Canada |
| Leader's Edge | `leadersedge.com/category/p-c/feed` | Property, Casualty | Optional, P&C category |

**Multi-feed sources:** Business Insurance and Canadian Underwriter support multiple RSS URLs per source. The ingestion engine fetches all feeds and deduplicates by canonical URL.

**Caching:** RSS responses are cached in-memory for 15 minutes to reduce network calls during the 60-minute ingestion cycle.

**Category Classification:** Articles are classified into categories (Property, Casualty, Regulation, Claims, Reinsurance, Technology) using keyword matching, with fallback to source tags.

### Functions Development

Functions are located in `/functions` with TypeScript:

```bash
cd functions

# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint
```

### Environment Variables

- **Client-side**: Use `.env.local` with `VITE_` prefix (public only)
- **Server-side (Functions)**: Use Firebase Functions config or secrets

```bash
# Set a secret for Functions (e.g., OpenAI key)
firebase functions:secrets:set OPENAI_API_KEY

# Access in function code
import { defineSecret } from "firebase-functions/params";
const openaiKey = defineSecret("OPENAI_API_KEY");
```

⚠️ **Never expose API keys to the client.** All secrets are accessed server-side only.

---

## iOS Native App (Capacitor)

This project uses [Capacitor](https://capacitorjs.com/) to run as a native iOS app.

### Prerequisites

- Xcode 15+ (macOS only)
- CocoaPods (`sudo gem install cocoapods`)
- iOS Simulator or physical iOS device

### Building for iOS

1. **Build the web app:**
   ```bash
   npm run build
   ```

2. **Sync web assets to iOS project:**
   ```bash
   npm run cap:sync
   ```

3. **Open in Xcode:**
   ```bash
   npm run ios:open
   ```

4. **Run on simulator (from terminal):**
   ```bash
   npm run ios:run
   ```

### Capacitor Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build web assets |
| `npm run cap:sync` | Sync web assets + update native dependencies |
| `npm run ios:open` | Open iOS project in Xcode |
| `npm run ios:run` | Build and run on iOS simulator |

### iOS Configuration

The app is configured with:
- **App ID:** `com.insurancenewsai.app`
- **App Name:** `P&C Brief`
- **Safe area handling:** Automatic (respects notch and home indicator)
- **Status bar:** Light style (dark text on light background)

---

## React Configuration

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
