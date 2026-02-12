/**
 * Deterministic Pulse Snapshot Computation
 *
 * Computes normalized, classified, fully-deterministic topic metrics
 * from daily brief data. No AI calls. Pure function.
 *
 * Input:  BriefInput[] — date, topics, sourcesUsed from each brief
 * Output: PulseSnapshot — rising/falling/stable topics with full metrics
 */

import { canonicalTopicKey, pickDisplayName } from "./topic-normalization.js";
import { classifyTopic, type TopicType } from "./topic-classification.js";
import { dateRange } from "./compute-signals.js";

// ============================================================================
// Types
// ============================================================================

/** Input from a single daily brief */
export interface BriefInput {
  /** Date key yyyy-mm-dd */
  date: string;
  /** Raw topic strings from the brief */
  topics: string[];
  /** Source IDs used in this brief (for uniqueSources metric) */
  sourceIds: string[];
}

/** Fully-computed topic with all pulse metrics */
export interface PulseTopic {
  /** Canonical key (normalized, stable across briefs) */
  key: string;
  /** Human-readable display name (shortest raw form seen) */
  displayName: string;
  /** Classification type */
  type: TopicType;
  /** Total mention count across all briefs in the recent window */
  mentions: number;
  /** Baseline mention count in the prior equivalent window */
  baselineMentions: number;
  /** mentions - baselineMentions */
  momentum: number;
  /** Number of unique days the topic appeared */
  daysPresent: number;
  /** Number of unique source IDs associated with briefs containing this topic */
  uniqueSources: number;
  /** Array[windowDays] of daily mention counts (oldest first) */
  trendSeries: number[];
}

/** Complete pulse snapshot result */
export interface PulseSnapshot {
  windowDays: number;
  dateKey: string;
  totalTopics: number;
  rising: PulseTopic[];
  falling: PulseTopic[];
  stable: PulseTopic[];
}

// ============================================================================
// Internal accumulator
// ============================================================================

interface TopicAccumulator {
  /** All raw topic strings that resolved to this canonical key */
  rawNames: string[];
  /** Set of dates (yyyy-mm-dd) the topic appeared on */
  dates: Set<string>;
  /** Total mention count (a topic appearing in 2 briefs on same day = 2) */
  mentions: number;
  /** Set of source IDs from briefs containing this topic */
  sourceIds: Set<string>;
}

// ============================================================================
// Core computation
// ============================================================================

const MAX_ITEMS = 25;

/**
 * Compute a deterministic pulse snapshot.
 *
 * @param briefs     - Array of { date, topics, sourceIds } from Firestore briefs
 * @param dateKey    - Reference date (end of recent window), yyyy-mm-dd
 * @param windowDays - Size of each comparison window (default 7)
 * @returns PulseSnapshot with rising, falling, stable topic lists
 */
export function computePulseSnapshot(
  briefs: BriefInput[],
  dateKey: string,
  windowDays: number = 7
): PulseSnapshot {
  // Build date ranges
  const recentDatesArr = dateRange(dateKey, windowDays);
  const recentDatesSet = new Set(recentDatesArr);

  // Previous window ends the day before the recent window starts
  const firstRecentDate = recentDatesArr[0];
  const [pY, pM, pD] = firstRecentDate.split("-").map(Number);
  const prevEnd = new Date(Date.UTC(pY, pM - 1, pD));
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevEndKey = `${prevEnd.getUTCFullYear()}-${String(prevEnd.getUTCMonth() + 1).padStart(2, "0")}-${String(prevEnd.getUTCDate()).padStart(2, "0")}`;
  const prevDatesArr = dateRange(prevEndKey, windowDays);
  const prevDatesSet = new Set(prevDatesArr);

  // Accumulate metrics for recent window
  const recentAcc = accumulateTopics(briefs, recentDatesSet);
  // Accumulate metrics for baseline window
  const baselineAcc = accumulateTopics(briefs, prevDatesSet);

  // Union of all canonical keys across both windows
  const allKeys = new Set([...recentAcc.keys(), ...baselineAcc.keys()]);

  // Build PulseTopic for each
  const topics: PulseTopic[] = [];

  for (const key of allKeys) {
    const recent = recentAcc.get(key);
    const baseline = baselineAcc.get(key);

    const mentions = recent?.mentions ?? 0;
    const baselineMentions = baseline?.mentions ?? 0;
    const daysPresent = recent?.dates.size ?? 0;
    const uniqueSources = recent?.sourceIds.size ?? 0;
    const momentum = mentions - baselineMentions;

    // Collect all raw names from both windows for display name selection
    const rawNames = [
      ...(recent?.rawNames ?? []),
      ...(baseline?.rawNames ?? []),
    ];

    const trendSeries = buildTrendSeries(
      key,
      briefs,
      recentDatesArr
    );

    topics.push({
      key,
      displayName: pickDisplayName(key, rawNames),
      type: classifyTopic(key),
      mentions,
      baselineMentions,
      momentum,
      daysPresent,
      uniqueSources,
      trendSeries,
    });
  }

  // Classify into rising, falling, stable
  const rising = topics
    .filter((t) => t.momentum > 0)
    .sort((a, b) => b.momentum - a.momentum || b.mentions - a.mentions)
    .slice(0, MAX_ITEMS);

  const falling = topics
    .filter((t) => t.momentum < 0)
    .sort((a, b) => a.momentum - b.momentum || b.baselineMentions - a.baselineMentions)
    .slice(0, MAX_ITEMS);

  const stable = topics
    .filter((t) => t.momentum === 0 && t.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions || b.daysPresent - a.daysPresent)
    .slice(0, MAX_ITEMS);

  return {
    windowDays,
    dateKey,
    totalTopics: allKeys.size,
    rising,
    falling,
    stable,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Accumulate topic metrics for a set of dates.
 */
function accumulateTopics(
  briefs: BriefInput[],
  dateSet: Set<string>
): Map<string, TopicAccumulator> {
  const acc = new Map<string, TopicAccumulator>();

  for (const brief of briefs) {
    if (!dateSet.has(brief.date)) continue;

    // Track which canonical keys we've already seen for THIS brief
    // (a topic appearing multiple times in the same brief's topics array counts once)
    const seenInBrief = new Set<string>();

    for (const rawTopic of brief.topics) {
      const key = canonicalTopicKey(rawTopic);
      if (!key) continue; // Filtered out entirely (stopwords only, etc.)
      if (seenInBrief.has(key)) continue;
      seenInBrief.add(key);

      let entry = acc.get(key);
      if (!entry) {
        entry = {
          rawNames: [],
          dates: new Set(),
          mentions: 0,
          sourceIds: new Set(),
        };
        acc.set(key, entry);
      }

      entry.rawNames.push(rawTopic);
      entry.dates.add(brief.date);
      entry.mentions++;
      for (const sid of brief.sourceIds) {
        entry.sourceIds.add(sid);
      }
    }
  }

  return acc;
}

/**
 * Build a daily trend series for a canonical topic across the recent window.
 * Each element = number of briefs that day containing the topic (0 or 1 typically).
 */
function buildTrendSeries(
  canonKey: string,
  briefs: BriefInput[],
  recentDatesArr: string[]
): number[] {
  // Index briefs by date for O(1) lookup
  const briefsByDate = new Map<string, BriefInput[]>();
  for (const b of briefs) {
    const existing = briefsByDate.get(b.date);
    if (existing) {
      existing.push(b);
    } else {
      briefsByDate.set(b.date, [b]);
    }
  }

  return recentDatesArr.map((date) => {
    const dayBriefs = briefsByDate.get(date);
    if (!dayBriefs) return 0;

    let count = 0;
    for (const brief of dayBriefs) {
      const hasMatch = brief.topics.some(
        (t) => canonicalTopicKey(t) === canonKey
      );
      if (hasMatch) count++;
    }
    return count;
  });
}
