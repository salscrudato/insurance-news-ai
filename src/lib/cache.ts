/**
 * LocalStorage Cache Utility
 * 
 * Simple TTL-based cache for expensive data like the Today brief.
 * Provides instant fallback while fresh data loads.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const CACHE_PREFIX = "pcbrief_cache_"

/**
 * Get cached data if valid (not expired)
 */
export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)
    const now = Date.now()
    const age = now - entry.timestamp

    // Return data if within TTL
    if (age < entry.ttl) {
      return entry.data
    }

    // Expired - remove and return null
    localStorage.removeItem(CACHE_PREFIX + key)
    return null
  } catch {
    return null
  }
}

/**
 * Set cached data with TTL
 * @param key Cache key
 * @param data Data to cache
 * @param ttlMs Time-to-live in milliseconds (default: 30 minutes)
 */
export function setCache<T>(key: string, data: T, ttlMs: number = 30 * 60 * 1000): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // Storage may be full or disabled - silently ignore
  }
}

/**
 * Remove cached data
 */
export function removeCache(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch {
    // Silently ignore
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    // Silently ignore
  }
}

