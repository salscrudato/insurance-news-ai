/**
 * Unit tests for topic classification
 *
 * Run: npx tsx --test functions/src/lib/signals/topic-classification.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyTopic, type TopicType } from "./topic-classification.js";

// ============================================================================
// Classification tests
// ============================================================================

describe("classifyTopic", () => {
  // Helper to assert classification
  function assertType(canonKey: string, expected: TopicType) {
    const actual = classifyTopic(canonKey);
    assert.equal(
      actual,
      expected,
      `Expected "${canonKey}" → ${expected}, got ${actual}`
    );
  }

  it("classifies M&A topics", () => {
    assertType("m&a", "mna");
    assertType("carrier consolidation", "mna");
    assertType("ipo activity", "mna");
  });

  it("classifies people/leadership topics", () => {
    assertType("ceo appointment", "people");
    assertType("talent shortage", "people");
    assertType("leadership changes", "people");
    assertType("de&i initiatives", "people");
  });

  it("classifies technology topics", () => {
    assertType("insurtech", "technology");
    assertType("artificial intelligence underwriting", "technology");
    assertType("telematics pricing", "technology");
    assertType("parametric solutions", "technology");
  });

  it("classifies regulation topics", () => {
    assertType("nuclear verdicts", "regulation");
    assertType("naic reform", "regulation");
    assertType("tort reform", "regulation");
    assertType("litigation finance", "regulation");
    assertType("solvency requirements", "regulation");
  });

  it("classifies capital topics", () => {
    assertType("cat bonds", "capital");
    assertType("combined ratio", "capital");
    assertType("loss development", "capital");
    assertType("am best rating", "capital");
    assertType("rate adequacy", "capital");
  });

  it("classifies reinsurer topics", () => {
    assertType("reinsurance rates", "reinsurer");
    assertType("swiss re", "reinsurer");
    assertType("treaty placement", "reinsurer");
    assertType("lloyds", "reinsurer");
  });

  it("classifies broker topics", () => {
    assertType("marsh placement", "broker");
    assertType("mga growth", "broker");
    assertType("wholesale distribution", "broker");
    assertType("e&s", "broker");
  });

  it("classifies peril topics", () => {
    assertType("wildfire losses", "peril");
    assertType("hurricane losses", "peril");
    assertType("winter storm losses", "peril");
    assertType("cat losses", "peril");
    assertType("climate change", "peril");
    assertType("severe weather", "peril");
  });

  it("classifies carrier topics", () => {
    assertType("state farm withdrawal", "carrier");
    assertType("chubb earnings", "carrier");
    assertType("progressive growth", "carrier");
  });

  it("classifies line-of-business topics", () => {
    assertType("commercial auto", "lob");
    assertType("florida homeowners", "lob");
    assertType("cyber liability", "lob");
    assertType("workers comp", "lob");
    assertType("d&o", "lob");
    assertType("personal lines", "lob");
  });

  it("defaults to 'lob' for unrecognized topics", () => {
    assertType("some unknown topic", "lob");
  });

  it("handles empty string", () => {
    assertType("", "lob");
  });
});
