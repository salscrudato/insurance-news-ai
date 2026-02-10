/**
 * Rate Limiting Utility
 *
 * Per-UID daily rate limiting using Firestore counters.
 * Relatively loose limits for MVP.
 */

import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * Rate limit configuration
 */
export const RATE_LIMITS = {
  /** Max article AI requests per user per day */
  articleAI: 50,
  /** Max askToday requests per user per day */
  askToday: 30,
  /** Max RAG chat requests per user per day */
  answerRag: 30,
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Get the current date key in yyyy-mm-dd format (America/New_York timezone).
 * Consistent with brief generation which uses ET dates.
 */
function getDateKey(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // returns yyyy-mm-dd
}

/**
 * Check and increment rate limit for a user.
 *
 * @param uid - User ID
 * @param type - Rate limit type
 * @returns Object with isAllowed and remaining count
 */
export async function checkRateLimit(
  uid: string,
  type: RateLimitType
): Promise<{ isAllowed: boolean; remaining: number; limit: number }> {
  const db = getFirestore();
  const dateKey = getDateKey();
  const limit = RATE_LIMITS[type];

  // Rate limit doc: users/{uid}/rateLimits/{date}
  const rateLimitRef = db
    .collection("users")
    .doc(uid)
    .collection("rateLimits")
    .doc(dateKey);

  // Use transaction to atomically check and increment
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(rateLimitRef);

    let counts: Record<string, number> = {};

    if (doc.exists) {
      counts = doc.data() as Record<string, number>;
    }

    const currentCount = counts[type] || 0;

    if (currentCount >= limit) {
      return {
        isAllowed: false,
        remaining: 0,
        limit,
      };
    }

    // Increment the counter
    transaction.set(
      rateLimitRef,
      {
        [type]: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return {
      isAllowed: true,
      remaining: limit - currentCount - 1,
      limit,
    };
  });

  return result;
}

/**
 * Get current rate limit status without incrementing.
 *
 * @param uid - User ID
 * @param type - Rate limit type
 * @returns Object with current count and limit
 */
export async function getRateLimitStatus(
  uid: string,
  type: RateLimitType
): Promise<{ current: number; limit: number; remaining: number }> {
  const db = getFirestore();
  const dateKey = getDateKey();
  const limit = RATE_LIMITS[type];

  const rateLimitRef = db
    .collection("users")
    .doc(uid)
    .collection("rateLimits")
    .doc(dateKey);

  const doc = await rateLimitRef.get();

  if (!doc.exists) {
    return { current: 0, limit, remaining: limit };
  }

  const counts = doc.data() as Record<string, number>;
  const current = counts[type] || 0;

  return {
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

