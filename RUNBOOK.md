# P&C Insurance News AI - Deployment Runbook

This runbook covers environment setup, deployment, rollback, and monitoring for the Insurance News AI application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Secrets Management](#secrets-management)
4. [Deployment Steps](#deployment-steps)
5. [Backfill & Initial Setup](#backfill--initial-setup)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js 22+** (use nvm: `nvm install 22 && nvm use 22`)
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google Cloud SDK** (optional, for advanced operations)
- **Access to Firebase project**: `insurance-news-ai`

### Verify Installation

```bash
node --version      # Should be v22.x
firebase --version  # Should be 15.x+
firebase login      # Authenticate with Google account
```

---

## Environment Setup

### 1. Clone and Install

```bash
git clone https://github.com/salscrudato/insurance-news-ai.git
cd insurance-news-ai

# Install root dependencies
npm install

# Install functions dependencies
cd functions && npm install && cd ..
```

### 2. Local Environment File

Create `.env.local` in the project root for local development:

```bash
# .env.local
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=insurance-news-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=insurance-news-ai
VITE_FIREBASE_STORAGE_BUCKET=insurance-news-ai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

Get these values from Firebase Console → Project Settings → General.

### 3. Firebase Project Selection

```bash
firebase use insurance-news-ai
```

---

## Secrets Management

### Required Secrets

| Secret Name      | Description                    | Used By                        |
|------------------|--------------------------------|--------------------------------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | `getOrCreateArticleAI`, `askToday`, `generateDailyBrief` |

### Setting Secrets

```bash
# Set a secret (you'll be prompted for the value)
firebase functions:secrets:set OPENAI_API_KEY

# Verify secret exists
firebase functions:secrets:get OPENAI_API_KEY
```

### Optional: Ingestion API Key

For manual ingestion triggers via HTTP, set an environment variable:

```bash
firebase functions:config:set ingestion.api_key="your-secure-key"
```

---

## Deployment Steps

### Full Deployment

Deploy everything (hosting, functions, Firestore rules/indexes):

```bash
# Build and deploy all
npm run firebase:deploy
```

This runs:
1. `npm run build` - Builds the Vite frontend
2. `firebase deploy` - Deploys hosting, functions, and Firestore

### Partial Deployments

```bash
# Hosting only (frontend)
npm run firebase:deploy:hosting

# Functions only (backend)
npm run firebase:deploy:functions

# Firestore rules and indexes only
npm run firebase:deploy:firestore
```

### Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] `npm run build` succeeds without errors
- [ ] `cd functions && npm run build` succeeds
- [ ] Secrets are configured (`firebase functions:secrets:get OPENAI_API_KEY`)
- [ ] You're on the correct Firebase project (`firebase use`)

---

## Backfill & Initial Setup

### Prerequisites

You need a service account key for local scripts. Download from:
Firebase Console → Project Settings → Service Accounts → Generate New Private Key

Set the environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### 1. Seed Sources

First, populate the sources collection with reputable P&C news sources:

```bash
cd functions
npm run seed-sources
```

This upserts the default sources (Insurance Journal, Claims Journal, Artemis) into Firestore.

### 2. Run 7-Day Backfill + Generate Brief (Recommended)

The easiest way to backfill and generate the brief in one command:

```bash
cd functions
export OPENAI_API_KEY=your-openai-key
npm run backfill
```

This script:
1. Fetches articles from all enabled sources (last 7 days)
2. Deduplicates by canonical URL (safe to re-run)
3. Generates today's daily brief using OpenAI
4. Skips brief generation if one already exists

### Alternative: Via Cloud Functions

**Option A: Via Firebase Console**
1. Go to Firebase Console → Functions
2. Find `adminBackfillLast7Days`
3. Use the testing interface to call it (requires admin auth)

**Option B: Via Client App**
Sign in as an admin user (email in `ADMIN_EMAILS` list) and call:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const backfill = httpsCallable(functions, 'adminBackfillLast7Days');
const result = await backfill({});
console.log(result.data);
```

**Option C: Via HTTP Trigger (with API key)**
```bash
# Backfill articles
curl "https://us-central1-insurance-news-ai.cloudfunctions.net/triggerIngestion?key=YOUR_API_KEY&days=7"

# Generate brief
curl "https://us-central1-insurance-news-ai.cloudfunctions.net/triggerDailyBrief"
```

### 3. Verify Setup

After backfill, verify everything is working:

1. **Check sources**: Firestore → sources (should have 3-4 documents)
2. **Check articles**: Firestore → articles (should have recent documents)
3. **Check brief**: Firestore → briefs → {today's date}
4. **Check app**: Open https://insurance-news-ai.web.app and verify Today screen loads

---

## Rollback Procedures

### Hosting Rollback

Firebase Hosting maintains release history. To rollback:

1. Go to Firebase Console → Hosting
2. Click "Release history"
3. Find the previous working release
4. Click "Rollback" on that release

Or via CLI:

```bash
# List recent releases
firebase hosting:channel:list

# Rollback to a specific version (get version ID from console)
firebase hosting:clone insurance-news-ai:live insurance-news-ai:live --version VERSION_ID
```

### Functions Rollback

Functions don't have built-in rollback. Options:

1. **Redeploy previous commit:**
   ```bash
   git checkout <previous-commit>
   cd functions && npm install && npm run build
   firebase deploy --only functions
   git checkout main
   ```

2. **Disable problematic function:**
   ```bash
   # In Firebase Console → Functions → Click function → Disable
   ```

### Firestore Rules Rollback

1. Go to Firebase Console → Firestore → Rules
2. Click "History" tab
3. Select previous version and "Revert"

---

## Monitoring & Logging

### Firebase Console Locations

| Resource | URL |
|----------|-----|
| **Project Overview** | https://console.firebase.google.com/project/insurance-news-ai |
| **Functions Logs** | https://console.firebase.google.com/project/insurance-news-ai/functions/logs |
| **Firestore Data** | https://console.firebase.google.com/project/insurance-news-ai/firestore |
| **Hosting** | https://console.firebase.google.com/project/insurance-news-ai/hosting |
| **Authentication** | https://console.firebase.google.com/project/insurance-news-ai/authentication |

### Cloud Logging (Advanced)

```bash
# View functions logs
firebase functions:log

# View specific function logs
firebase functions:log --only ingestRssFeeds

# Stream logs in real-time
firebase functions:log --follow
```

### Key Metrics to Monitor

1. **Ingestion Health**
   - Check `ingestRssFeeds` runs every 60 minutes
   - Look for errors in logs: `[Ingestion] Error`

2. **Daily Brief Generation**
   - Check `generateDailyBrief` runs at 6:00 AM ET
   - Verify brief exists: Firestore → briefs → {today's date}

3. **API Rate Limits**
   - Monitor OpenAI usage in OpenAI dashboard
   - Check for `resource-exhausted` errors in logs

4. **Firestore Usage**
   - Firebase Console → Usage → Firestore
   - Watch for read/write spikes

### Scheduled Functions

| Function | Schedule | Purpose |
|----------|----------|---------|
| `ingestRssFeeds` | Every 60 minutes | Fetch new articles from RSS feeds |
| `generateDailyBrief` | 6:00 AM ET daily | Generate AI daily brief |

---

## Troubleshooting

### Common Issues

#### "OPENAI_API_KEY secret is not configured"

```bash
firebase functions:secrets:set OPENAI_API_KEY
# Enter your OpenAI API key when prompted
firebase deploy --only functions
```

#### Functions not deploying

```bash
# Check for build errors
cd functions && npm run build

# Check for lint errors
cd functions && npm run lint

# Ensure correct Node version
node --version  # Should be 22.x
```

#### Ingestion not running

1. Check if sources are enabled:
   ```
   Firestore → sources → Check "enabled" field
   ```

2. Check function logs:
   ```bash
   firebase functions:log --only ingestRssFeeds
   ```

3. Manually trigger:
   ```bash
   curl "https://us-central1-insurance-news-ai.cloudfunctions.net/triggerIngestion?key=YOUR_KEY"
   ```

#### Brief not generating

1. Check if articles exist:
   ```
   Firestore → articles → Should have recent documents
   ```

2. Check function logs:
   ```bash
   firebase functions:log --only generateDailyBrief
   ```

3. Manually trigger:
   ```bash
   curl "https://us-central1-insurance-news-ai.cloudfunctions.net/triggerDailyBrief"
   ```

#### "Permission denied" errors

- Verify user email is in `functions/src/config/admin.ts` ADMIN_EMAILS list
- Redeploy functions after updating admin list

### Support Contacts

- **Firebase Issues**: https://firebase.google.com/support
- **OpenAI API Issues**: https://help.openai.com

---

## Quick Reference

### Deploy Commands

```bash
npm run firebase:deploy              # Full deploy
npm run firebase:deploy:hosting      # Frontend only
npm run firebase:deploy:functions    # Backend only
npm run firebase:deploy:firestore    # Rules/indexes only
```

### Local Development

```bash
npm run dev                          # Start Vite dev server
npm run firebase:emulators           # Start all emulators
```

### Useful Firebase Commands

```bash
firebase use                         # Show current project
firebase projects:list               # List all projects
firebase functions:log               # View function logs
firebase functions:secrets:get KEY   # Check secret exists
```


