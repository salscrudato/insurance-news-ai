/**
 * Firestore TTL Cache for Earnings Data
 *
 * Multi-tier caching strategy:
 * 1. Firestore-backed TTL cache for cross-instance persistence
 * 2. Stale-While-Revalidate — serve stale data instantly, refresh in background
 * 3. Full-bundle caching — one Firestore read for the entire detail page
 * 4. Validation guards — never cache empty/broken data
 *
 * Collections:
 * - earningsCache/{cacheKey} — generic cache documents
 * - earningsBundles/{ticker} — full bundle snapshots (single-read optimization)
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";

// ============================================================================
// TTL Configuration
// ============================================================================

export const CACHE_TTL = {
  /** Company search results */
  search: 7 * 24 * 60 * 60 * 1000, // 7 days (search results rarely change)
  /** Company overview/profile */
  profile: 7 * 24 * 60 * 60 * 1000, // 7 days (fundamentals change quarterly)
  /** Earnings data */
  earnings: 24 * 60 * 60 * 1000, // 24 hours
  /** Financial statements */
  financials: 7 * 24 * 60 * 60 * 1000, // 7 days (quarterly updates)
  /** Stock quote */
  quote: 5 * 60 * 1000, // 5 minutes (real-time-ish via Yahoo)
  /** SEC filings list */
  filings: 24 * 60 * 60 * 1000, // 24 hours
  /** AI insights */
  aiInsights: 30 * 24 * 60 * 60 * 1000, // 30 days
  /** Filing excerpt */
  filingExcerpt: 90 * 24 * 60 * 60 * 1000, // 90 days
  /** Filing remarks (AI) */
  filingRemarks: 30 * 24 * 60 * 60 * 1000, // 30 days
  /** Full earnings bundle snapshot */
  bundle: 2 * 60 * 60 * 1000, // 2 hours (the aggregate payload)
} as const;

/**
 * Stale-while-revalidate grace period.
 * If data is expired but within this grace period, serve it immediately
 * and refresh in the background.
 */
export const STALE_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Generic Cache Layer
// ============================================================================

const CACHE_COLLECTION = "earningsCache";

interface CacheDoc {
  data: unknown;
  cachedAt: Timestamp;
  ttlMs: number;
  key: string;
}

/**
 * Sanitize a key for use as a Firestore document ID.
 * Firestore IDs cannot contain /, must be ≤1500 bytes.
 */
function sanitizeKey(key: string): string {
  return key
    .replace(/\//g, "__")
    .replace(/[^a-zA-Z0-9_\-.:]/g, "_")
    .slice(0, 200);
}

/**
 * Get a cached value by key. Returns null if missing or expired.
 */
export async function getCached<T>(key: string, ttlMs: number): Promise<T | null> {
  const db = getFirestore();
  const docRef = db.collection(CACHE_COLLECTION).doc(sanitizeKey(key));

  try {
    const snap = await docRef.get();
    if (!snap.exists) return null;

    const doc = snap.data() as CacheDoc;
    const age = Date.now() - doc.cachedAt.toMillis();

    if (age > ttlMs) {
      return null;
    }

    return doc.data as T;
  } catch {
    return null;
  }
}

/**
 * Get cached value with stale-while-revalidate support.
 * Returns { data, isStale } — stale data should be served while refreshing.
 */
export async function getCachedWithStaleness<T>(
  key: string,
  ttlMs: number
): Promise<{ data: T; isStale: boolean } | null> {
  const db = getFirestore();
  const docRef = db.collection(CACHE_COLLECTION).doc(sanitizeKey(key));

  try {
    const snap = await docRef.get();
    if (!snap.exists) return null;

    const doc = snap.data() as CacheDoc;
    const age = Date.now() - doc.cachedAt.toMillis();

    if (age <= ttlMs) {
      return { data: doc.data as T, isStale: false };
    }

    // Past TTL but within grace period — stale but usable
    if (age <= ttlMs + STALE_GRACE_MS) {
      return { data: doc.data as T, isStale: true };
    }

    return null; // Too old, not usable
  } catch {
    return null;
  }
}

/**
 * Store a value in cache with the given key and TTL.
 */
export async function setCache(key: string, data: unknown, ttlMs: number): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection(CACHE_COLLECTION).doc(sanitizeKey(key));

  const doc: CacheDoc = {
    data,
    cachedAt: Timestamp.now(),
    ttlMs,
    key,
  };

  await docRef.set(doc);
}

// ============================================================================
// Convenience: Get-or-Fetch with Stale-While-Revalidate
// ============================================================================

/**
 * Get data from cache or fetch fresh data if cache miss/expired.
 * Supports stale-while-revalidate: serves stale data immediately
 * and triggers a background refresh.
 *
 * @param validate Optional function to check if the fetched data is valid/complete.
 *                 If it returns false, the data is NOT cached (but still returned).
 */
export async function getOrFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  validate?: (data: T) => boolean
): Promise<T> {
  // Try cache with staleness awareness
  const cached = await getCachedWithStaleness<T>(key, ttlMs);

  if (cached && !cached.isStale) {
    // Fresh cache hit — check validity
    if (!validate || validate(cached.data)) {
      return cached.data;
    }
    console.log(`[cache] Skipping invalid cached data for ${key}`);
  }

  if (cached?.isStale) {
    // Stale data available — serve it and refresh in background
    if (!validate || validate(cached.data)) {
      // Fire-and-forget background refresh
      fetcher()
        .then((fresh) => {
          const shouldCache = !validate || validate(fresh);
          if (shouldCache) {
            setCache(key, fresh, ttlMs).catch(() => {});
          }
        })
        .catch((err) => {
          console.warn(`[cache] Background refresh failed for ${key}:`, err instanceof Error ? err.message : err);
        });
      return cached.data;
    }
  }

  // No cache or invalid — fetch fresh
  const fresh = await fetcher();

  const shouldCache = !validate || validate(fresh);
  if (shouldCache) {
    setCache(key, fresh, ttlMs).catch((err) => {
      console.warn(`[cache] Failed to write cache for ${key}:`, err);
    });
  } else {
    console.log(`[cache] Not caching invalid/incomplete data for ${key}`);
  }

  return fresh;
}

// ============================================================================
// Full Bundle Cache (Single-Read Optimization)
// ============================================================================

/**
 * Get a cached full earnings bundle for a ticker.
 * Returns the bundle if fresh or stale-but-usable.
 */
export async function getCachedBundle<T>(ticker: string): Promise<{ data: T; isStale: boolean } | null> {
  return getCachedWithStaleness<T>(`bundle:${ticker.toUpperCase()}`, CACHE_TTL.bundle);
}

/**
 * Cache a full earnings bundle for single-read retrieval.
 */
export async function setCachedBundle(ticker: string, bundle: unknown): Promise<void> {
  await setCache(`bundle:${ticker.toUpperCase()}`, bundle, CACHE_TTL.bundle);
}

// ============================================================================
// Batch Invalidation
// ============================================================================

/**
 * Invalidate all cache entries for a ticker (used when forcing refresh).
 */
export async function invalidateTickerCache(ticker: string): Promise<void> {
  const db = getFirestore();
  const sym = ticker.toUpperCase();
  const keys = [
    `profile:${sym}`, `quote:${sym}`, `earnings:${sym}`,
    `income:${sym}`, `balance:${sym}`, `cashflow:${sym}`,
    `filings:${sym}`, `bundle:${sym}`,
    `av-profile:${sym}`, `av-earnings:${sym}`, `av-income:${sym}`,
    `av-balance:${sym}`, `av-cashflow:${sym}`, `av-quote:${sym}`,
    `xbrl-earnings:${sym}`, `xbrl-income:${sym}`, `xbrl-balance:${sym}`,
  ];

  const batch = db.batch();
  for (const key of keys) {
    batch.delete(db.collection(CACHE_COLLECTION).doc(sanitizeKey(key)));
  }
  await batch.commit();
}
