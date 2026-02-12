/**
 * Alpha Vantage API Key Pool
 *
 * Rotates across multiple free-tier API keys to multiply effective
 * rate limits (25 calls/day × N keys, 5 calls/min × N keys).
 *
 * Each key tracks:
 * - Calls made today (resets at midnight UTC)
 * - Calls made in the current minute
 * - Whether it's been flagged as rate-limited
 *
 * Strategy: round-robin with health checks. Skip exhausted keys.
 */

import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ============================================================================
// Key Definitions — add more free keys to scale horizontally
// ============================================================================

export const avKey1 = defineSecret("ALPHA_VANTAGE_API_KEY");
export const avKey2 = defineSecret("ALPHA_VANTAGE_API_KEY_2");
export const avKey3 = defineSecret("ALPHA_VANTAGE_API_KEY_3");

/** All secret refs — used in onCall({ secrets: [...] }) */
export const allAvSecrets = [avKey1, avKey2, avKey3];

// ============================================================================
// In-Memory Per-Key State
// ============================================================================

interface KeyState {
  id: string;
  callsThisMinute: number;
  minuteStart: number;
  callsToday: number;
  dayStart: number; // midnight UTC as epoch ms
  rateLimitedUntil: number; // epoch ms — skip key until this time
}

const MAX_PER_MINUTE = 4; // leave 1 req/min buffer (AV limit is 5)
const MAX_PER_DAY = 23; // leave 2 req/day buffer (AV limit is 25)
const RATE_LIMIT_COOLDOWN_MS = 65_000; // 65 seconds cooldown on rate limit

let keyStates: KeyState[] = [];
let roundRobinIdx = 0;

function todayMidnightUTC(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function getOrInitStates(): KeyState[] {
  if (keyStates.length > 0) return keyStates;

  const keys: Array<{ id: string; secret: typeof avKey1 }> = [
    { id: "key1", secret: avKey1 },
    { id: "key2", secret: avKey2 },
    { id: "key3", secret: avKey3 },
  ];

  keyStates = keys
    .filter((k) => {
      try {
        const val = k.secret.value();
        // Skip empty, placeholder, or very short keys
        return !!val && val.length > 10 && !val.startsWith("PLACEHOLDER");
      } catch {
        return false;
      }
    })
    .map((k) => ({
      id: k.id,
      callsThisMinute: 0,
      minuteStart: Date.now(),
      callsToday: 0,
      dayStart: todayMidnightUTC(),
      rateLimitedUntil: 0,
    }));

  return keyStates;
}

// ============================================================================
// Key Selection
// ============================================================================

/**
 * Get the best available API key value, or null if all keys are exhausted.
 * Uses round-robin with health checks.
 */
export function getAvailableKey(): { key: string; stateIdx: number } | null {
  const states = getOrInitStates();
  if (states.length === 0) return null;

  const now = Date.now();
  const midnight = todayMidnightUTC();

  // Reset counters if needed
  for (const s of states) {
    // Reset daily counter
    if (s.dayStart < midnight) {
      s.callsToday = 0;
      s.dayStart = midnight;
    }
    // Reset minute counter
    if (now - s.minuteStart > 60_000) {
      s.callsThisMinute = 0;
      s.minuteStart = now;
    }
  }

  // Try each key in round-robin order
  const total = states.length;
  for (let i = 0; i < total; i++) {
    const idx = (roundRobinIdx + i) % total;
    const s = states[idx];

    // Skip if rate-limited
    if (s.rateLimitedUntil > now) continue;
    // Skip if daily limit reached
    if (s.callsToday >= MAX_PER_DAY) continue;
    // Skip if minute limit reached
    if (s.callsThisMinute >= MAX_PER_MINUTE) continue;

    // This key is available
    roundRobinIdx = (idx + 1) % total;

    const secrets = [avKey1, avKey2, avKey3];
    const keyValue = secrets[idx]?.value();
    if (!keyValue) continue;

    return { key: keyValue, stateIdx: idx };
  }

  return null; // All keys exhausted
}

/**
 * Record a successful call for a key.
 */
export function recordCall(stateIdx: number): void {
  const states = getOrInitStates();
  if (!states[stateIdx]) return;
  states[stateIdx].callsThisMinute++;
  states[stateIdx].callsToday++;
}

/**
 * Mark a key as rate-limited (cooldown period).
 */
export function markRateLimited(stateIdx: number): void {
  const states = getOrInitStates();
  if (!states[stateIdx]) return;
  states[stateIdx].rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
  console.warn(`[KeyPool] Key ${states[stateIdx].id} rate-limited, cooldown ${RATE_LIMIT_COOLDOWN_MS}ms`);
}

/**
 * Get pool status for diagnostics.
 */
export function getPoolStatus(): Array<{ id: string; callsToday: number; callsThisMin: number; available: boolean }> {
  const states = getOrInitStates();
  const now = Date.now();
  return states.map((s) => ({
    id: s.id,
    callsToday: s.callsToday,
    callsThisMin: s.callsThisMinute,
    available: s.rateLimitedUntil <= now && s.callsToday < MAX_PER_DAY && s.callsThisMinute < MAX_PER_MINUTE,
  }));
}

// ============================================================================
// Persistent Usage Tracking (Firestore — for cross-instance awareness)
// ============================================================================

const USAGE_COLLECTION = "apiKeyUsage";

/**
 * Persist today's usage to Firestore so other Cloud Function instances
 * can be aware of key exhaustion.
 */
export async function syncUsageToFirestore(): Promise<void> {
  const states = getOrInitStates();
  const db = getFirestore();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  for (const s of states) {
    const docRef = db.collection(USAGE_COLLECTION).doc(`${s.id}_${today}`);
    await docRef.set(
      {
        keyId: s.id,
        date: today,
        callsToday: s.callsToday,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}

/**
 * Load persisted usage from Firestore (called on cold start).
 */
export async function loadUsageFromFirestore(): Promise<void> {
  const states = getOrInitStates();
  if (states.length === 0) return;

  const db = getFirestore();
  const today = new Date().toISOString().slice(0, 10);

  for (const s of states) {
    try {
      const snap = await db.collection(USAGE_COLLECTION).doc(`${s.id}_${today}`).get();
      if (snap.exists) {
        const data = snap.data();
        if (data?.callsToday && typeof data.callsToday === "number") {
          s.callsToday = Math.max(s.callsToday, data.callsToday);
        }
      }
    } catch {
      // Non-critical — continue with in-memory state
    }
  }
}
