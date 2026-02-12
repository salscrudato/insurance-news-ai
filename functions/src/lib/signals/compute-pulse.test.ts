/**
 * Unit tests for deterministic pulse snapshot computation
 *
 * Run: npx tsx --test functions/src/lib/signals/compute-pulse.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computePulseSnapshot,
  type BriefInput,
} from "./compute-pulse.js";

// ============================================================================
// Helpers
// ============================================================================

function makeBriefs(
  entries: Array<{
    date: string;
    topics: string[];
    sourceIds?: string[];
  }>
): BriefInput[] {
  return entries.map(({ date, topics, sourceIds }) => ({
    date,
    topics,
    sourceIds: sourceIds ?? ["source-1"],
  }));
}

// ============================================================================
// computePulseSnapshot
// ============================================================================

describe("computePulseSnapshot", () => {
  it("identifies rising topics (momentum > 0)", () => {
    // recent window: 2026-02-04 to 2026-02-10 (7 days)
    // previous window: 2026-01-28 to 2026-02-03 (7 days)
    const briefs = makeBriefs([
      { date: "2026-02-04", topics: ["Nuclear Verdicts", "Florida Homeowners"] },
      { date: "2026-02-05", topics: ["nuclear verdicts"] },
      { date: "2026-02-06", topics: ["Nuclear Verdicts", "CAT Bonds"] },
      { date: "2026-02-07", topics: ["nuclear verdicts", "commercial auto"] },
      // previous window: "nuclear verdicts" appears once
      { date: "2026-01-30", topics: ["Nuclear Verdicts"] },
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    // nuclear verdicts: mentions=4 recent, 1 baseline, momentum=3
    const nv = snapshot.rising.find((t) => t.key === "nuclear verdicts");
    assert.ok(nv, "nuclear verdicts should be rising");
    assert.equal(nv.mentions, 4);
    assert.equal(nv.baselineMentions, 1);
    assert.equal(nv.momentum, 3);
    assert.equal(nv.daysPresent, 4);
    assert.equal(nv.type, "regulation"); // nuclear verdicts → regulation
  });

  it("identifies falling topics (momentum < 0)", () => {
    const briefs = makeBriefs([
      // "cyber liability" only in previous window (3 mentions)
      { date: "2026-01-28", topics: ["cyber liability"] },
      { date: "2026-01-29", topics: ["Cyber Liability"] },
      { date: "2026-01-30", topics: ["cyber liability"] },
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    const cl = snapshot.falling.find((t) => t.key === "cyber liability");
    assert.ok(cl, "cyber liability should be falling");
    assert.equal(cl.mentions, 0);
    assert.equal(cl.baselineMentions, 3);
    assert.equal(cl.momentum, -3);
    assert.equal(cl.type, "lob"); // cyber liability → lob
  });

  it("identifies stable topics (momentum === 0, mentions > 0)", () => {
    const briefs = makeBriefs([
      // Same number of mentions in both windows
      { date: "2026-02-05", topics: ["Florida homeowners"] },
      { date: "2026-02-06", topics: ["Florida homeowners"] },
      { date: "2026-01-29", topics: ["Florida homeowners"] },
      { date: "2026-01-30", topics: ["Florida homeowners"] },
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    const fh = snapshot.stable.find((t) => t.key === "florida homeowners");
    assert.ok(fh, "florida homeowners should be stable");
    assert.equal(fh.momentum, 0);
    assert.equal(fh.mentions, 2);
    assert.equal(fh.baselineMentions, 2);
  });

  it("computes uniqueSources correctly", () => {
    const briefs = makeBriefs([
      {
        date: "2026-02-05",
        topics: ["CAT Bonds"],
        sourceIds: ["source-a", "source-b"],
      },
      {
        date: "2026-02-06",
        topics: ["cat bonds"],
        sourceIds: ["source-b", "source-c"],
      },
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    const cb = snapshot.rising.find((t) => t.key === "cat bonds");
    assert.ok(cb, "cat bonds should exist");
    assert.equal(cb.uniqueSources, 3); // source-a, source-b, source-c
  });

  it("computes daysPresent correctly", () => {
    const briefs = makeBriefs([
      { date: "2026-02-05", topics: ["wildfire losses"] },
      { date: "2026-02-05", topics: ["wildfire losses"] }, // same day, different brief
      { date: "2026-02-07", topics: ["Wildfire Losses"] },
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    const wf = snapshot.rising.find((t) => t.key === "wildfire losses");
    assert.ok(wf, "wildfire losses should exist");
    assert.equal(wf.daysPresent, 2); // Feb 5 and Feb 7
  });

  it("builds trendSeries with daily counts", () => {
    // recent window: 2026-02-04 to 2026-02-10
    const briefs = makeBriefs([
      { date: "2026-02-04", topics: ["cat bonds"] },
      // 2026-02-05: no mention
      { date: "2026-02-06", topics: ["CAT Bonds"] },
      { date: "2026-02-07", topics: ["cat bonds"] },
      // 2026-02-08, 09, 10: no mention
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    const cb = snapshot.rising.find((t) => t.key === "cat bonds");
    assert.ok(cb, "cat bonds should exist");
    // trendSeries: [Feb4=1, Feb5=0, Feb6=1, Feb7=1, Feb8=0, Feb9=0, Feb10=0]
    assert.deepEqual(cb.trendSeries, [1, 0, 1, 1, 0, 0, 0]);
  });

  it("applies synonym normalization across briefs", () => {
    const briefs = makeBriefs([
      { date: "2026-02-05", topics: ["catastrophe losses"] },
      { date: "2026-02-06", topics: ["cat loss"] },
      { date: "2026-02-07", topics: ["CAT Events"] },
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    // All three should collapse into "cat losses"
    const cl = snapshot.rising.find((t) => t.key === "cat losses");
    assert.ok(cl, "cat losses should exist after synonym normalization");
    assert.equal(cl.mentions, 3);
    assert.equal(cl.daysPresent, 3);
  });

  it("filters stopword-only topics", () => {
    const briefs = makeBriefs([
      {
        date: "2026-02-05",
        topics: ["insurance market trends", "commercial auto"],
      },
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    // "insurance market trends" → all stopwords → empty → filtered
    const allKeys = [
      ...snapshot.rising.map((t) => t.key),
      ...snapshot.falling.map((t) => t.key),
      ...snapshot.stable.map((t) => t.key),
    ];
    assert.ok(!allKeys.includes(""), "Empty key should not appear");
    assert.ok(
      allKeys.includes("commercial auto"),
      "commercial auto should survive filtering"
    );
  });

  it("deduplicates topics within the same brief", () => {
    const briefs = makeBriefs([
      {
        date: "2026-02-05",
        topics: ["CAT bonds", "cat bonds", "CAT Bonds"],
      },
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    const cb = snapshot.rising.find((t) => t.key === "cat bonds");
    assert.ok(cb, "cat bonds should exist");
    assert.equal(cb.mentions, 1); // Deduplicated within brief
  });

  it("caps each list at 25 items", () => {
    // Create 30 unique topics only in recent window
    const topics = Array.from({ length: 30 }, (_, i) => `unique-topic-${i}`);
    const briefs = makeBriefs([{ date: "2026-02-10", topics }]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);
    assert.ok(snapshot.rising.length <= 25, "rising should be capped at 25");
  });

  it("handles empty briefs gracefully", () => {
    const snapshot = computePulseSnapshot([], "2026-02-10", 7);
    assert.equal(snapshot.rising.length, 0);
    assert.equal(snapshot.falling.length, 0);
    assert.equal(snapshot.stable.length, 0);
    assert.equal(snapshot.totalTopics, 0);
  });

  it("sorts rising by momentum desc, then mentions desc", () => {
    const briefs = makeBriefs([
      { date: "2026-02-07", topics: ["topicB"] },
      { date: "2026-02-08", topics: ["topicA", "topicB"] },
      { date: "2026-02-09", topics: ["topicA", "topicB", "topicC"] },
      { date: "2026-02-10", topics: ["topicA", "topicB", "topicC"] },
      // prev window: topicB appears once
      { date: "2026-01-30", topics: ["topicB"] },
    ]);
    // topicA: mentions=3, baseline=0, momentum=3
    // topicB: mentions=4, baseline=1, momentum=3 (same momentum, higher mentions)
    // topicC: mentions=2, baseline=0, momentum=2

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    assert.ok(snapshot.rising.length >= 3);
    // topicB first (momentum=3, mentions=4)
    assert.equal(snapshot.rising[0].key, "topicb");
    assert.equal(snapshot.rising[0].momentum, 3);
    // topicA second (momentum=3, mentions=3)
    assert.equal(snapshot.rising[1].key, "topica");
    assert.equal(snapshot.rising[1].momentum, 3);
    // topicC third (momentum=2)
    assert.equal(snapshot.rising[2].key, "topicc");
    assert.equal(snapshot.rising[2].momentum, 2);
  });

  it("classifies topics correctly", () => {
    const briefs = makeBriefs([
      {
        date: "2026-02-07",
        topics: [
          "Nuclear Verdicts",
          "Florida Homeowners",
          "CAT Bonds",
          "M&A",
          "Swiss Re",
        ],
      },
    ]);

    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    const typeMap = new Map(
      snapshot.rising.map((t) => [t.key, t.type])
    );
    assert.equal(typeMap.get("nuclear verdicts"), "regulation");
    assert.equal(typeMap.get("florida homeowners"), "lob");
    assert.equal(typeMap.get("cat bonds"), "capital");
    assert.equal(typeMap.get("m&a"), "mna");
    assert.equal(typeMap.get("swiss re"), "reinsurer");
  });

  it("is idempotent (same input → same output)", () => {
    const briefs = makeBriefs([
      { date: "2026-02-05", topics: ["nuclear verdicts", "CAT Bonds"] },
      { date: "2026-02-06", topics: ["Nuclear Verdicts"] },
      { date: "2026-01-30", topics: ["cat bonds"] },
    ]);

    const s1 = computePulseSnapshot(briefs, "2026-02-10", 7);
    const s2 = computePulseSnapshot(briefs, "2026-02-10", 7);

    assert.deepEqual(s1, s2, "Identical inputs must produce identical outputs");
  });

  it("returns correct metadata", () => {
    const briefs = makeBriefs([
      { date: "2026-02-05", topics: ["topic1"] },
      { date: "2026-02-06", topics: ["topic2"] },
    ]);
    const snapshot = computePulseSnapshot(briefs, "2026-02-10", 7);

    assert.equal(snapshot.dateKey, "2026-02-10");
    assert.equal(snapshot.windowDays, 7);
    assert.equal(snapshot.totalTopics, 2);
  });
});
