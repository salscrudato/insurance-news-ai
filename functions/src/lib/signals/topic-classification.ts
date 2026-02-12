/**
 * Topic Classification Engine for Industry Pulse
 *
 * Assigns a `TopicType` to each canonical topic using rule-based keyword matching.
 * No AI calls — entirely deterministic.
 *
 * Types:
 *  carrier     — Named carriers, carrier financials, AM Best ratings
 *  broker      — Brokers, distribution, program business
 *  reinsurer   — Reinsurance markets, retro, ILS
 *  lob         — Lines of business (auto, property, GL, cyber, etc.)
 *  peril       — Catastrophe perils, weather events, loss drivers
 *  regulation  — Legislative, regulatory, legal/judicial
 *  capital     — Capital markets, ILS, cat bonds, ratings, investment
 *  mna         — M&A, deals, consolidation
 *  people      — Leadership changes, talent, DE&I
 *  technology  — Insurtech, AI, automation, platforms
 */

// ============================================================================
// Types
// ============================================================================

export type TopicType =
  | "carrier"
  | "broker"
  | "reinsurer"
  | "lob"
  | "peril"
  | "regulation"
  | "capital"
  | "mna"
  | "people"
  | "technology";

// ============================================================================
// Keyword rules — evaluated top-down, first match wins
// ============================================================================

interface ClassificationRule {
  type: TopicType;
  /** Keywords/phrases that must appear in the canonical topic key */
  keywords: string[];
}

/**
 * Rules are ordered from most specific to most general.
 * Each keyword is checked via substring match against the canonical key.
 */
const RULES: ClassificationRule[] = [
  // ------- M&A -------
  {
    type: "mna",
    keywords: [
      "m&a",
      "merger",
      "acquisition",
      "consolidation",
      "ipo",
      "spac",
      "deal",
      "buyout",
      "divestiture",
      "takeover",
    ],
  },

  // ------- People -------
  {
    type: "people",
    keywords: [
      "ceo",
      "cfo",
      "cro",
      "leadership",
      "executive",
      "appointment",
      "hire",
      "hiring",
      "talent",
      "workforce",
      "diversity",
      "de&i",
      "retirement",
      "succession",
      "layoff",
      "headcount",
    ],
  },

  // ------- Technology -------
  {
    type: "technology",
    keywords: [
      "insurtech",
      "artificial intelligence",
      "machine learning",
      "ai model",
      "automation",
      "digital",
      "platform",
      "telematics",
      "parametric",
      "blockchain",
      "data analytics",
      "predictive",
      "saas",
      "api",
      "cloud",
    ],
  },

  // ------- Regulation -------
  {
    type: "regulation",
    keywords: [
      "regulation",
      "regulatory",
      "legislature",
      "legislation",
      "bill",
      "statute",
      "ruling",
      "court",
      "lawsuit",
      "litigation",
      "attorney general",
      "naic",
      "department of",
      "commissioner",
      "compliance",
      "mandate",
      "reform",
      "tort",
      "nuclear verdicts",
      "social inflation",
      "class action",
      "antitrust",
      "solvency",
      "rbc",
      "ifrs",
      "gaap",
    ],
  },

  // ------- Capital / ILS -------
  {
    type: "capital",
    keywords: [
      "cat bond",
      "ils",
      "insurance linked",
      "capital",
      "investor",
      "investment",
      "am best",
      "s&p",
      "moody",
      "fitch",
      "rating",
      "downgrade",
      "upgrade",
      "surplus",
      "combined ratio",
      "loss ratio",
      "expense ratio",
      "roe",
      "book value",
      "reserve",
      "loss development",
      "rate adequacy",
    ],
  },

  // ------- Reinsurer -------
  {
    type: "reinsurer",
    keywords: [
      "reinsur",
      "retrocession",
      "retro",
      "swiss re",
      "munich re",
      "hannover re",
      "scor",
      "gen re",
      "berkshire re",
      "lloyds",
      "treaty",
      "facultative",
      "excess of loss",
      "quota share",
    ],
  },

  // ------- Broker -------
  {
    type: "broker",
    keywords: [
      "broker",
      "brokerage",
      "marsh",
      "aon",
      "gallagher",
      "willis",
      "wtw",
      "lockton",
      "hub international",
      "ryan specialty",
      "brown & brown",
      "mga",
      "managing general",
      "wholesale",
      "program",
      "distribution",
      "e&s",
    ],
  },

  // ------- Peril -------
  {
    type: "peril",
    keywords: [
      "hurricane",
      "wildfire",
      "flood",
      "tornado",
      "hail",
      "earthquake",
      "winter storm",
      "convective",
      "severe weather",
      "cat loss",
      "catastrophe",
      "nat cat",
      "secondary peril",
      "climate change",
      "sea level",
      "drought",
      "freeze",
    ],
  },

  // ------- Carrier -------
  {
    type: "carrier",
    keywords: [
      "state farm",
      "allstate",
      "progressive",
      "geico",
      "liberty mutual",
      "travelers",
      "chubb",
      "hartford",
      "nationwide",
      "usaa",
      "farmers",
      "erie",
      "american family",
      "auto owners",
      "citizens",
      "zurich",
      "aig",
      "allianz",
      "berkshire",
      "fairfax",
      "markel",
      "rli",
      "carrier",
      "underwriter",
      "admitted",
      "nonadmitted",
    ],
  },

  // ------- Line of Business (most general — last) -------
  {
    type: "lob",
    keywords: [
      "commercial auto",
      "personal auto",
      "homeowners",
      "renters",
      "commercial property",
      "general liability",
      "professional liability",
      "d&o",
      "e&o",
      "cyber",
      "workers comp",
      "medical malpractice",
      "umbrella",
      "excess liability",
      "marine",
      "aviation",
      "surety",
      "title",
      "crop",
      "pet",
      "flood",
      "earthquake",
      "auto",
      "property",
      "liability",
      "casualty",
      "specialty",
      "personal lines",
      "commercial lines",
      "florida homeowners",
      "california",
      "texas wind",
    ],
  },
];

// ============================================================================
// Classification function
// ============================================================================

/**
 * Classify a canonical topic key into a TopicType.
 *
 * Uses first-match-wins against an ordered rule set.
 * Falls back to "lob" if no rule matches (conservative default
 * for the P&C insurance domain).
 *
 * @param canonKey - Already-normalized canonical topic key
 * @returns The matched TopicType
 */
export function classifyTopic(canonKey: string): TopicType {
  if (!canonKey) return "lob";

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (canonKey.includes(kw)) {
        return rule.type;
      }
    }
  }

  // Default: most topics in P&C news relate to a line of business
  return "lob";
}
