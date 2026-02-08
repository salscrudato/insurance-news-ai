# insurance-news-ai

Empty repository. Ready for development.

## Firebase

**Project:** `insurance-news-ai`  
**Project Number:** `695640024145`

### Setup

```bash
firebase use insurance-news-ai
```

### Deploy

```bash
firebase deploy
```

## Secrets

**OPENAI_API_KEY** is configured in Firebase Functions secrets.

### Access in Functions

```typescript
import { defineSecret } from "firebase-functions/params";

const openaiKey = defineSecret("OPENAI_API_KEY");

export const myFunction = onRequest({ secrets: [openaiKey] }, (req, res) => {
  const key = openaiKey.value();
});
```

### Manage Secrets

```bash
# View secret versions
firebase functions:secrets:get OPENAI_API_KEY

# Set new value
firebase functions:secrets:set OPENAI_API_KEY

# Access value (requires permissions)
firebase functions:secrets:access OPENAI_API_KEY
```

