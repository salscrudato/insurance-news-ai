/**
 * Topic Normalization Layer for Industry Pulse
 *
 * Produces a stable, deterministic canonical key for each topic string.
 * Pipeline: trim → lowercase → strip punctuation → collapse whitespace
 *         → apply synonym map → filter stopwords → re-collapse whitespace
 *
 * This module is pure (no IO) and fully unit-testable.
 */

// ============================================================================
// Stopwords — generic noise tokens removed from canonical keys
// ============================================================================

const STOPWORDS = new Set([
  "insurance",
  "insurer",
  "insurers",
  "market",
  "markets",
  "company",
  "companies",
  "industry",
  "industries",
  "sector",
  "sectors",
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "its",
  "are",
  "was",
  "has",
  "have",
  "been",
  "will",
  "may",
  "could",
  "new",
  "latest",
  "recent",
  "update",
  "updates",
  "news",
  "report",
  "reports",
  "trend",
  "trends",
  "impact",
  "impacts",
  "affecting",
  "regarding",
  "around",
  "about",
  "amid",
  "during",
]);

// ============================================================================
// Synonym Map — deterministic phrase normalization
// ============================================================================

/**
 * Map of phrase → canonical form.
 * Keys and values are already in normalized form (lowercase, no punctuation).
 * Applied BEFORE stopword removal so multi-word phrases match reliably.
 */
const SYNONYM_MAP = new Map<string, string>([
  // Catastrophe terminology
  ["catastrophe losses", "cat losses"],
  ["catastrophe loss", "cat losses"],
  ["cat loss", "cat losses"],
  ["cat events", "cat losses"],
  ["catastrophe events", "cat losses"],

  // Winter storm
  ["winter storm claims", "winter storm losses"],
  ["winter storm damage", "winter storm losses"],
  ["winter storms", "winter storm losses"],

  // Wildfire
  ["wildfire claims", "wildfire losses"],
  ["wildfire damage", "wildfire losses"],
  ["wildfires", "wildfire losses"],
  ["wildfire risk", "wildfire losses"],

  // Hurricane
  ["hurricane claims", "hurricane losses"],
  ["hurricane damage", "hurricane losses"],
  ["hurricane season", "hurricane losses"],
  ["hurricanes", "hurricane losses"],

  // Nuclear verdicts
  ["nuclear verdict", "nuclear verdicts"],
  ["social inflation", "nuclear verdicts"],

  // Commercial auto
  ["commercial auto severity", "commercial auto"],
  ["commercial auto losses", "commercial auto"],
  ["commercial automobile", "commercial auto"],

  // Cyber
  ["cyber risk", "cyber liability"],
  ["cyber claims", "cyber liability"],
  ["cyber losses", "cyber liability"],
  ["cybersecurity", "cyber liability"],

  // CAT bonds
  ["catastrophe bonds", "cat bonds"],
  ["catastrophe bond", "cat bonds"],
  ["cat bond", "cat bonds"],

  // Reinsurance
  ["reinsurance pricing", "reinsurance rates"],
  ["reinsurance renewals", "reinsurance rates"],
  ["reinsurance rate increases", "reinsurance rates"],
  ["reinsurance market hardening", "reinsurance rates"],

  // Rate adequacy
  ["pricing adequacy", "rate adequacy"],
  ["premium adequacy", "rate adequacy"],
  ["rate increases", "rate adequacy"],

  // Loss development
  ["reserve development", "loss development"],
  ["reserve strengthening", "loss development"],
  ["loss reserve", "loss development"],
  ["loss reserves", "loss development"],

  // Litigation
  ["litigation funding", "litigation finance"],
  ["third party litigation funding", "litigation finance"],

  // Climate
  ["climate risk", "climate change"],
  ["climate change risk", "climate change"],

  // Florida
  ["florida property", "florida homeowners"],
  ["florida home insurance", "florida homeowners"],
  ["florida citizens", "florida homeowners"],

  // Combined ratio
  ["combined ratios", "combined ratio"],
  ["underwriting profitability", "combined ratio"],

  // M&A
  ["mergers and acquisitions", "m&a"],
  ["mergers & acquisitions", "m&a"],
  ["merger activity", "m&a"],
  ["acquisition activity", "m&a"],

  // Insurtech
  ["insurance technology", "insurtech"],
  ["insuretech", "insurtech"],

  // Workers comp
  ["workers compensation", "workers comp"],
  ["workers comp claims", "workers comp"],

  // D&O
  ["directors and officers", "d&o"],
  ["directors & officers", "d&o"],

  // E&O
  ["errors and omissions", "e&o"],
  ["errors & omissions", "e&o"],

  // Excess & surplus
  ["excess and surplus lines", "e&s"],
  ["excess & surplus lines", "e&s"],
  ["e&s lines", "e&s"],
  ["surplus lines", "e&s"],

  // Lloyd's
  ["lloyds of london", "lloyds"],
  ["lloyd's of london", "lloyds"],
  ["lloyd's", "lloyds"],
]);

// ============================================================================
// Core normalization function
// ============================================================================

/**
 * Produce a stable canonical topic key.
 *
 * Pipeline:
 *  1. Trim + lowercase
 *  2. Strip punctuation (except & which is semantically significant in P&C)
 *  3. Collapse whitespace
 *  4. Apply synonym map (longest-match-first)
 *  5. Remove stopwords
 *  6. Re-collapse whitespace, trim
 *
 * Returns empty string for topics that reduce to nothing after filtering.
 */
export function canonicalTopicKey(raw: string): string {
  // Step 1: trim + lowercase
  let s = raw.trim().toLowerCase();
  if (s.length === 0) return "";

  // Step 2: strip punctuation except &
  // Keep letters, digits, whitespace, and &
  s = s.replace(/[^a-z0-9\s&]/g, "");

  // Step 3: collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  if (s.length === 0) return "";

  // Step 4: apply synonym map
  s = applySynonyms(s);

  // Step 5: remove stopwords
  const tokens = s.split(" ");
  const filtered = tokens.filter((t) => !STOPWORDS.has(t));

  // Step 6: rejoin, collapse, trim
  const result = filtered.join(" ").replace(/\s+/g, " ").trim();
  return result;
}

/**
 * Apply synonym map using word-boundary-aware replacement.
 * Uses longest-match-first to handle multi-word phrases correctly.
 * Prevents cascading replacements (a replaced region is not re-matched).
 */
function applySynonyms(input: string): string {
  let result = input;
  // Sort entries by key length descending so longer phrases match first
  const sorted = [...SYNONYM_MAP.entries()].sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [phrase, canonical] of sorted) {
    // Use word-boundary regex to avoid partial substring matches
    // e.g., "cat loss" should not match inside "cat losses"
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "g");
    result = result.replace(re, canonical);
  }
  return result;
}

/**
 * Determine the display name for a canonical key.
 * Uses the first raw topic string seen for that key (preserves original casing).
 */
export function pickDisplayName(
  canonKey: string,
  rawCandidates: string[]
): string {
  // Prefer the shortest candidate that normalizes to this key
  // (avoids verbose AI-generated topic names)
  const matching = rawCandidates.filter(
    (r) => canonicalTopicKey(r) === canonKey
  );
  if (matching.length === 0) return canonKey;

  // Return shortest, then alphabetically first for determinism
  matching.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return matching[0];
}

// ============================================================================
// Exports for testing
// ============================================================================

export const _testExports = {
  STOPWORDS,
  SYNONYM_MAP,
  applySynonyms,
};
