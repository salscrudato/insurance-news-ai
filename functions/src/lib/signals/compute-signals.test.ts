/**
 * Unit tests for signal computation (pure function)
 *
 * Run: npx tsx --test functions/src/lib/signals/compute-signals.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeSignals,
  canonicalize,
  dateRange,
  type BriefTopicsInput,
} from "./compute-signals.js";

// ============================================================================
// canonicalize
// ============================================================================

describe("canonicalize", () => {
  it("trims and lowercases", () => {
    assert.equal(canonicalize("  Florida Homeowners  "), "florida homeowners");
  });

  it("collapses whitespace", () => {
    assert.equal(canonicalize("commercial   auto   severity"), "commercial auto severity");
  });

  it("returns empty for blank", () => {
    assert.equal(canonicalize("   "), "");
  });
});

// ============================================================================
// dateRange
// ============================================================================

describe("dateRange", () => {
  it("produces correct 7-day range ending on 2026-02-10", () => {
    const range = dateRange("2026-02-10", 7);
    assert.equal(range.length, 7);
    assert.equal(range[0], "2026-02-04");
    assert.equal(range[6], "2026-02-10");
  });

  it("handles month boundary", () => {
    const range = dateRange("2026-03-02", 5);
    assert.equal(range[0], "2026-02-26");
    assert.equal(range[4], "2026-03-02");
  });

  it("single day", () => {
    const range = dateRange("2026-01-15", 1);
    assert.deepEqual(range, ["2026-01-15"]);
  });
});

// ============================================================================
// computeSignals
// ============================================================================

describe("computeSignals", () => {
  // Helper: build brief inputs for a range of dates
  function makeBriefs(entries: Array<{ date: string; topics: string[] }>): BriefTopicsInput[] {
    return entries.map(({ date, topics }) => ({ date, topics }));
  }

  it("identifies rising signals (delta > 0) with sparkline and intensity", () => {
    // recent window: 2026-02-04 to 2026-02-10 (7 days)
    // previous window: 2026-01-28 to 2026-02-03 (7 days)
    const briefs = makeBriefs([
      // "nuclear verdicts" appears in recent only (4 days)
      { date: "2026-02-04", topics: ["Nuclear Verdicts", "Florida homeowners"] },
      { date: "2026-02-05", topics: ["nuclear verdicts"] },
      { date: "2026-02-06", topics: ["Nuclear Verdicts", "CAT bonds"] },
      { date: "2026-02-07", topics: ["nuclear verdicts", "commercial auto"] },
      // previous window: "nuclear verdicts" appears 1 day
      { date: "2026-01-30", topics: ["Nuclear Verdicts"] },
    ]);

    const result = computeSignals(briefs, "2026-02-10", 7);

    // nuclear verdicts: recentCount=4, prevCount=1, delta=3
    const nv = result.rising.find((s) => s.canonical === "nuclear verdicts");
    assert.ok(nv, "nuclear verdicts should be rising");
    assert.equal(nv.recentCount, 4);
    assert.equal(nv.prevCount, 1);
    assert.equal(nv.delta, 3);
    // Sparkline: Feb 4=1, Feb 5=1, Feb 6=1, Feb 7=1, Feb 8=0, Feb 9=0, Feb 10=0
    assert.deepEqual(nv.sparkline, [1, 1, 1, 1, 0, 0, 0]);
    // Intensity: 4/7 ≈ 57%
    assert.equal(nv.intensity, 57);
  });

  it("identifies falling signals (delta < 0)", () => {
    const briefs = makeBriefs([
      // "cyber liability" only in previous window
      { date: "2026-01-28", topics: ["cyber liability"] },
      { date: "2026-01-29", topics: ["Cyber Liability"] },
      { date: "2026-01-30", topics: ["cyber liability"] },
    ]);

    const result = computeSignals(briefs, "2026-02-10", 7);

    const cl = result.falling.find((s) => s.canonical === "cyber liability");
    assert.ok(cl, "cyber liability should be falling");
    assert.equal(cl.recentCount, 0);
    assert.equal(cl.prevCount, 3);
    assert.equal(cl.delta, -3);
  });

  it("identifies persistent signals (recentCount >= ceil(0.6 * windowDays))", () => {
    // For windowDays=7, threshold = ceil(7*0.6) = ceil(4.2) = 5
    const briefs = makeBriefs([
      { date: "2026-02-04", topics: ["Florida homeowners"] },
      { date: "2026-02-05", topics: ["Florida homeowners"] },
      { date: "2026-02-06", topics: ["Florida homeowners"] },
      { date: "2026-02-07", topics: ["Florida homeowners"] },
      { date: "2026-02-08", topics: ["Florida homeowners"] },
      // Also appears in prev window (so delta=0, but still persistent)
      { date: "2026-01-28", topics: ["Florida homeowners"] },
      { date: "2026-01-29", topics: ["Florida homeowners"] },
      { date: "2026-01-30", topics: ["Florida homeowners"] },
      { date: "2026-01-31", topics: ["Florida homeowners"] },
      { date: "2026-02-01", topics: ["Florida homeowners"] },
    ]);

    const result = computeSignals(briefs, "2026-02-10", 7);

    const fh = result.persistent.find((s) => s.canonical === "florida homeowners");
    assert.ok(fh, "florida homeowners should be persistent");
    assert.equal(fh.recentCount, 5);
  });

  it("deduplicates topics within the same day", () => {
    const briefs = makeBriefs([
      {
        date: "2026-02-05",
        topics: ["CAT bonds", "cat bonds", "CAT Bonds"],
      },
    ]);

    const result = computeSignals(briefs, "2026-02-10", 7);
    const cb = result.rising.find((s) => s.canonical === "cat bonds");
    // Should only count as 1 day, not 3
    assert.ok(cb, "cat bonds should exist");
    assert.equal(cb.recentCount, 1);
  });

  it("limits each list to 25 items", () => {
    // Create 30 unique topics only in recent window
    const topics = Array.from({ length: 30 }, (_, i) => `topic-${i}`);
    const briefs = makeBriefs([
      { date: "2026-02-10", topics },
    ]);

    const result = computeSignals(briefs, "2026-02-10", 7);
    assert.ok(result.rising.length <= 25, "rising should be capped at 25");
  });

  it("handles empty briefs", () => {
    const result = computeSignals([], "2026-02-10", 7);
    assert.equal(result.rising.length, 0);
    assert.equal(result.falling.length, 0);
    assert.equal(result.persistent.length, 0);
    assert.equal(result.meta.totalTopics, 0);
  });

  it("sorts rising by delta desc, then recentCount desc", () => {
    // Use combined topic lists per date to avoid Map overwrite
    const briefs = makeBriefs([
      { date: "2026-02-07", topics: ["topicB"] },
      { date: "2026-02-08", topics: ["topicA", "topicB"] },
      { date: "2026-02-09", topics: ["topicA", "topicB", "topicC"] },
      { date: "2026-02-10", topics: ["topicA", "topicB", "topicC"] },
      // prev window: topicB appears once
      { date: "2026-01-30", topics: ["topicB"] },
    ]);
    // topicA: recent=3, prev=0, delta=3
    // topicB: recent=4, prev=1, delta=3 (same delta, higher recentCount)
    // topicC: recent=2, prev=0, delta=2

    const result = computeSignals(briefs, "2026-02-10", 7);

    // topicB should come first (delta=3, recentCount=4)
    // topicA second (delta=3, recentCount=3)
    // topicC third (delta=2)
    assert.equal(result.rising[0].canonical, "topicb");
    assert.equal(result.rising[0].delta, 3);
    assert.equal(result.rising[0].recentCount, 4);
    assert.equal(result.rising[1].canonical, "topica");
    assert.equal(result.rising[1].delta, 3);
    assert.equal(result.rising[1].recentCount, 3);
    assert.equal(result.rising[2].canonical, "topicc");
    assert.equal(result.rising[2].delta, 2);
  });

  it("returns correct metadata including briefsAvailable", () => {
    const briefs = makeBriefs([
      { date: "2026-02-05", topics: ["topic1"] },
      { date: "2026-02-06", topics: ["topic2"] },
    ]);
    const result = computeSignals(briefs, "2026-02-10", 7);
    assert.equal(result.meta.dateKey, "2026-02-10");
    assert.equal(result.meta.windowDays, 7);
    assert.equal(result.meta.recentDates.length, 7);
    assert.equal(result.meta.prevDates.length, 7);
    assert.equal(result.meta.briefsAvailable, 2);
    // Recent: Feb 4-10, Previous: Jan 28 - Feb 3
    assert.equal(result.meta.recentDates[0], "2026-02-04");
    assert.equal(result.meta.recentDates[6], "2026-02-10");
    assert.equal(result.meta.prevDates[0], "2026-01-28");
    assert.equal(result.meta.prevDates[6], "2026-02-03");
  });
});
