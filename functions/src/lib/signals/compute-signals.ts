/**
 * Pure signal computation logic for Industry Pulse
 *
 * Computes rising, falling, and persistent topic trends
 * by comparing topic frequency across two adjacent time windows.
 *
 * This is a pure function with no external dependencies — easy to unit test.
 */

// ============================================================================
// Types
// ============================================================================

export interface SignalItem {
  /** Display-form of the topic (first occurrence's casing) */
  topic: string;
  /** Canonical (normalized) form for matching */
  canonical: string;
  /** Number of days topic appeared in recent window */
  recentCount: number;
  /** Number of days topic appeared in previous window */
  prevCount: number;
  /** recentCount - prevCount */
  delta: number;
  /** Percentage of recent window days that had this topic (0-100) */
  intensity: number;
  /** Per-day appearance in recent window: 1 = appeared, 0 = absent. Oldest first. */
  sparkline: number[];
  /** AI-generated insight — why is this signal trending/declining/persistent */
  why?: string;
  /** AI-generated implication for P&C insurance professionals */
  implication?: string;
  /** AI-assessed severity: low | medium | high | critical */
  severity?: "low" | "medium" | "high" | "critical";
}

export interface SignalsResult {
  rising: SignalItem[];
  falling: SignalItem[];
  persistent: SignalItem[];
  /** Metadata about the computation */
  meta: {
    dateKey: string;
    windowDays: number;
    recentDates: string[];
    prevDates: string[];
    totalTopics: number;
    briefsAvailable: number;
  };
}

export interface BriefTopicsInput {
  /** Date key yyyy-mm-dd */
  date: string;
  /** Topic strings from the brief */
  topics: string[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Canonicalize a topic string for deduplication/matching.
 * Trims, lowercases, and collapses whitespace.
 */
export function canonicalize(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Compute N date-key strings ending on `endDateKey` (inclusive), stepping back by 1 day.
 * Returns dates in chronological order (oldest first).
 *
 * @param endDateKey  - yyyy-mm-dd (inclusive end)
 * @param count       - how many dates to produce
 */
export function dateRange(endDateKey: string, count: number): string[] {
  const [year, month, day] = endDateKey.split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1, day));
  const dates: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  return dates;
}

// ============================================================================
// Core computation
// ============================================================================

/**
 * Compute signal trends from an array of daily brief topics.
 *
 * @param briefs      - Array of { date, topics } from Firestore briefs
 * @param dateKey     - Reference date (end of recent window)
 * @param windowDays  - Size of each comparison window (default 7)
 * @returns           - SignalsResult with rising, falling, persistent lists
 */
export function computeSignals(
  briefs: BriefTopicsInput[],
  dateKey: string,
  windowDays: number = 7
): SignalsResult {
  const MAX_ITEMS = 25;

  // Build date sets for each window
  const recentDates = new Set(dateRange(dateKey, windowDays));

  // Previous window ends the day before the recent window starts
  const recentDatesArr = dateRange(dateKey, windowDays);
  const prevEndDate = recentDatesArr[0]; // first day of recent window
  // prev window ends one day before recent window starts
  const [pYear, pMonth, pDay] = prevEndDate.split("-").map(Number);
  const prevEnd = new Date(Date.UTC(pYear, pMonth - 1, pDay));
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevEndKey = `${prevEnd.getUTCFullYear()}-${String(prevEnd.getUTCMonth() + 1).padStart(2, "0")}-${String(prevEnd.getUTCDate()).padStart(2, "0")}`;
  const prevDates = new Set(dateRange(prevEndKey, windowDays));

  // Index briefs by date for O(1) lookup
  // Merge topics if multiple briefs exist for same date
  const briefsByDate = new Map<string, string[]>();
  for (const b of briefs) {
    const existing = briefsByDate.get(b.date);
    if (existing) {
      existing.push(...b.topics);
    } else {
      briefsByDate.set(b.date, [...b.topics]);
    }
  }

  // Count topic appearances per window
  // A topic is counted once per day (even if it appears multiple times in a brief's topics)
  const recentCounts = new Map<string, { count: number; display: string }>();
  const prevCounts = new Map<string, { count: number; display: string }>();

  function countTopics(
    dateSet: Set<string>,
    countsMap: Map<string, { count: number; display: string }>
  ) {
    for (const date of dateSet) {
      const topics = briefsByDate.get(date);
      if (!topics) continue;

      // Deduplicate within a single day
      const seen = new Set<string>();
      for (const topic of topics) {
        const canon = canonicalize(topic);
        if (!canon || seen.has(canon)) continue;
        seen.add(canon);

        const existing = countsMap.get(canon);
        if (existing) {
          existing.count++;
        } else {
          countsMap.set(canon, { count: 1, display: topic });
        }
      }
    }
  }

  countTopics(recentDates, recentCounts);
  countTopics(prevDates, prevCounts);

  // Collect all unique canonical topics across both windows
  const allCanonical = new Set([
    ...recentCounts.keys(),
    ...prevCounts.keys(),
  ]);

  // Build per-day lookup for sparkline generation
  const recentDatesArr2 = dateRange(dateKey, windowDays); // chronological
  function buildSparkline(canon: string): number[] {
    return recentDatesArr2.map((date) => {
      const topics = briefsByDate.get(date);
      if (!topics) return 0;
      return topics.some((t) => canonicalize(t) === canon) ? 1 : 0;
    });
  }

  // Build signal items
  const signals: SignalItem[] = [];
  for (const canon of allCanonical) {
    const recent = recentCounts.get(canon);
    const prev = prevCounts.get(canon);
    const recentCount = recent?.count ?? 0;
    const prevCount = prev?.count ?? 0;
    const display = recent?.display ?? prev?.display ?? canon;
    const sparkline = buildSparkline(canon);
    const intensity = windowDays > 0 ? Math.round((recentCount / windowDays) * 100) : 0;

    signals.push({
      topic: display,
      canonical: canon,
      recentCount,
      prevCount,
      delta: recentCount - prevCount,
      intensity,
      sparkline,
    });
  }

  // Classify into rising, falling, persistent
  const rising = signals
    .filter((s) => s.delta > 0)
    .sort((a, b) => b.delta - a.delta || b.recentCount - a.recentCount)
    .slice(0, MAX_ITEMS);

  const falling = signals
    .filter((s) => s.delta < 0)
    .sort((a, b) => a.delta - b.delta || b.recentCount - a.recentCount)
    .slice(0, MAX_ITEMS);

  const persistentThreshold = Math.ceil(windowDays * 0.6);
  const persistent = signals
    .filter((s) => s.recentCount >= persistentThreshold)
    .sort((a, b) => b.recentCount - a.recentCount)
    .slice(0, MAX_ITEMS);

  return {
    rising,
    falling,
    persistent,
    meta: {
      dateKey,
      windowDays,
      recentDates: [...recentDates].sort(),
      prevDates: [...prevDates].sort(),
      totalTopics: allCanonical.size,
      briefsAvailable: briefsByDate.size,
    },
  };
}
