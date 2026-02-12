/**
 * Unit tests for topic normalization
 *
 * Run: npx tsx --test functions/src/lib/signals/topic-normalization.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalTopicKey,
  pickDisplayName,
} from "./topic-normalization.js";

// ============================================================================
// canonicalTopicKey — basic normalization
// ============================================================================

describe("canonicalTopicKey — basic normalization", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    assert.equal(canonicalTopicKey("  Florida Homeowners  "), "florida homeowners");
  });

  it("collapses internal whitespace", () => {
    assert.equal(
      canonicalTopicKey("commercial   auto   severity"),
      "commercial auto"
    ); // "severity" is part of synonym → "commercial auto"
  });

  it("strips punctuation except &", () => {
    assert.equal(canonicalTopicKey("D&O liability!"), "d&o liability");
  });

  it("returns empty for blank input", () => {
    assert.equal(canonicalTopicKey("   "), "");
  });

  it("returns empty for stopwords-only input", () => {
    assert.equal(canonicalTopicKey("insurance market trends"), "");
  });
});

// ============================================================================
// canonicalTopicKey — stopword removal
// ============================================================================

describe("canonicalTopicKey — stopword removal", () => {
  it("removes 'insurance' from compound topics", () => {
    // "cyber insurance" → strip punctuation → "cyber insurance"
    // → no synonym match → remove stopword "insurance" → "cyber"
    const result = canonicalTopicKey("cyber insurance");
    assert.equal(result, "cyber");
  });

  it("removes 'market' and 'industry'", () => {
    assert.equal(canonicalTopicKey("reinsurance market hardening"), "reinsurance rates");
  });

  it("preserves meaningful tokens", () => {
    assert.equal(canonicalTopicKey("nuclear verdicts"), "nuclear verdicts");
  });
});

// ============================================================================
// canonicalTopicKey — synonym map
// ============================================================================

describe("canonicalTopicKey — synonym map", () => {
  it("normalizes 'winter storm claims' → 'winter storm losses'", () => {
    assert.equal(canonicalTopicKey("Winter Storm Claims"), "winter storm losses");
  });

  it("normalizes 'catastrophe losses' → 'cat losses'", () => {
    assert.equal(canonicalTopicKey("Catastrophe Losses"), "cat losses");
  });

  it("normalizes 'cat events' → 'cat losses'", () => {
    assert.equal(canonicalTopicKey("cat events"), "cat losses");
  });

  it("normalizes 'wildfire claims' → 'wildfire losses'", () => {
    assert.equal(canonicalTopicKey("Wildfire Claims"), "wildfire losses");
  });

  it("normalizes 'mergers and acquisitions' → 'm&a'", () => {
    assert.equal(canonicalTopicKey("Mergers and Acquisitions"), "m&a");
  });

  it("normalizes 'insurance technology' → 'insurtech'", () => {
    assert.equal(canonicalTopicKey("insurance technology"), "insurtech");
  });

  it("normalizes 'workers compensation' → 'workers comp'", () => {
    assert.equal(canonicalTopicKey("Workers Compensation"), "workers comp");
  });

  it("normalizes 'reinsurance pricing' → 'reinsurance rates'", () => {
    assert.equal(canonicalTopicKey("reinsurance pricing"), "reinsurance rates");
  });

  it("normalizes 'social inflation' → 'nuclear verdicts'", () => {
    assert.equal(canonicalTopicKey("Social Inflation"), "nuclear verdicts");
  });
});

// ============================================================================
// canonicalTopicKey — stability / determinism
// ============================================================================

describe("canonicalTopicKey — stability", () => {
  it("produces identical keys for case variations", () => {
    const k1 = canonicalTopicKey("Florida Homeowners");
    const k2 = canonicalTopicKey("florida homeowners");
    const k3 = canonicalTopicKey("FLORIDA HOMEOWNERS");
    assert.equal(k1, k2);
    assert.equal(k2, k3);
  });

  it("produces identical keys for punctuation variations", () => {
    const k1 = canonicalTopicKey("D&O");
    const k2 = canonicalTopicKey("D&O.");
    assert.equal(k1, k2);
  });

  it("produces identical keys for synonym variations", () => {
    const k1 = canonicalTopicKey("catastrophe losses");
    const k2 = canonicalTopicKey("cat loss");
    const k3 = canonicalTopicKey("CAT Events");
    assert.equal(k1, k2);
    assert.equal(k2, k3);
  });

  it("is idempotent", () => {
    const raw = "Winter Storm Claims";
    const first = canonicalTopicKey(raw);
    const second = canonicalTopicKey(first);
    assert.equal(first, second);
  });
});

// ============================================================================
// pickDisplayName
// ============================================================================

describe("pickDisplayName", () => {
  it("picks the shortest matching raw name", () => {
    const candidates = [
      "Florida Homeowners Insurance Market",
      "Florida Homeowners",
      "florida homeowners crisis",
    ];
    const key = canonicalTopicKey("Florida Homeowners");
    const display = pickDisplayName(key, candidates);
    assert.equal(display, "Florida Homeowners");
  });

  it("returns canonical key if no candidates match", () => {
    const display = pickDisplayName("unknown topic", ["other thing"]);
    assert.equal(display, "unknown topic");
  });

  it("is deterministic for same-length candidates", () => {
    const candidates = ["Cat Bonds", "cat bonds"];
    const key = canonicalTopicKey("cat bonds");
    const d1 = pickDisplayName(key, candidates);
    const d2 = pickDisplayName(key, [...candidates].reverse());
    assert.equal(d1, d2); // Alphabetical tiebreak
  });
});
