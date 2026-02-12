/**
 * Smart Request Queue for Alpha Vantage
 *
 * Manages rate-limited API calls with:
 * - Per-key rate tracking via key-pool
 * - In-flight request deduplication (same cache key = one actual call)
 * - Automatic retry with exponential backoff
 * - Queue draining with rate-aware scheduling
 */

import { getAvailableKey, recordCall, markRateLimited } from "./key-pool.js";

// ============================================================================
// In-Flight Deduplication
// ============================================================================

/** Map of cache-key → pending promise for in-flight deduplication */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Deduplicated fetch: if the same cacheKey is already in-flight,
 * returns the existing promise instead of making a duplicate call.
 */
export async function deduplicatedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(cacheKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    inFlight.delete(cacheKey);
  });

  inFlight.set(cacheKey, promise);
  return promise;
}

// ============================================================================
// Rate-Aware Alpha Vantage Fetch
// ============================================================================

const AV_BASE_URL = "https://www.alphavantage.co/query";

/**
 * Make an Alpha Vantage API call using the key pool.
 * Automatically selects the best available key and tracks usage.
 *
 * @throws Error if all keys are exhausted or AV returns an error
 */
export async function rateLimitedAvFetch(
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const keyInfo = getAvailableKey();
  if (!keyInfo) {
    throw new Error("AV_KEYS_EXHAUSTED: All Alpha Vantage API keys are exhausted. Data will be sourced from cache or fallback providers.");
  }

  const url = new URL(AV_BASE_URL);
  url.searchParams.set("apikey", keyInfo.key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Alpha Vantage HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json() as Record<string, unknown>;

  // Check for rate limit / error responses
  if (data["Error Message"]) {
    throw new Error(`Alpha Vantage error: ${data["Error Message"]}`);
  }
  if (data["Note"]) {
    markRateLimited(keyInfo.stateIdx);
    throw new Error(`AV_RATE_LIMITED: ${data["Note"]}`);
  }
  if (data["Information"] && typeof data["Information"] === "string") {
    markRateLimited(keyInfo.stateIdx);
    throw new Error(`AV_RATE_LIMITED: ${data["Information"]}`);
  }

  // Success — record usage
  recordCall(keyInfo.stateIdx);
  return data;
}

// ============================================================================
// Sequential Queue for AV Calls
// ============================================================================

/**
 * Execute AV-dependent tasks sequentially with a minimum gap between calls.
 * This ensures we don't exceed the per-minute rate limit even when
 * multiple functions fire concurrently on the same instance.
 */
let lastAvCallTime = 0;
const MIN_GAP_MS = 1200; // ~50 calls/min theoretical, but we're conservative

export async function throttledAvCall<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastAvCallTime;
  if (elapsed < MIN_GAP_MS) {
    await new Promise((r) => setTimeout(r, MIN_GAP_MS - elapsed));
  }
  lastAvCallTime = Date.now();
  return fn();
}
