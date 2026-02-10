/**
 * P&C Insurance Relevance Filtering & Category Classification
 *
 * Keyword-based heuristic filter and classifier.
 * Excludes life/health insurance content.
 * Maps articles to P&C categories: Property, Casualty, Regulation, Claims, Reinsurance, Technology
 */

import type { SourceCategory } from "../../types/firestore.js";

// ============================================================================
// Category-Specific Keywords (for classification)
// ============================================================================

const CATEGORY_KEYWORDS: Record<SourceCategory, string[]> = {
  property_cat: [
    "property insurance", "homeowners", "commercial property", "fire insurance",
    "flood insurance", "hurricane", "catastrophe", "cat loss", "nat cat",
    "wildfire", "earthquake", "windstorm", "hail damage", "property damage",
    "builders risk", "inland marine", "ocean marine", "cargo insurance",
    "boiler and machinery", "equipment breakdown", "habitational", "dwelling",
    "commercial real estate", "building coverage", "business interruption",
    "parametric", "named storm", "wind damage", "water damage", "fire loss",
  ],
  casualty_liability: [
    "casualty", "liability", "general liability", "professional liability",
    "errors and omissions", "e&o", "d&o", "directors and officers",
    "workers compensation", "workers comp", "auto insurance", "commercial auto",
    "motor insurance", "product liability", "umbrella", "excess liability",
    "cyber insurance", "cyber liability", "data breach", "ransomware",
    "epli", "employment practices", "fiduciary liability", "crime insurance",
    "fidelity bond", "kidnap and ransom", "personal injury", "bodily injury",
    "third party", "vicarious liability", "negligence", "tort",
  ],
  regulation: [
    "regulation", "regulatory", "naic", "state insurance", "insurance regulation",
    "insurance commissioner", "surplus lines", "admitted", "non-admitted",
    "rate adequacy", "rate filing", "residual market", "fair plan",
    "citizens property", "legislation", "compliance", "mandate", "statute",
    "regulatory approval", "department of insurance", "insurance department",
    "market conduct", "consumer protection", "licensing", "solvency regulation",
  ],
  claims: [
    "claims", "claim management", "loss adjustment", "adjuster", "subrogation",
    "settlement", "reserve", "loss ratio", "loss development",
    "incurred but not reported", "ibnr", "case reserves", "adverse development",
    "reserve strengthening", "claims handling", "litigation", "lawsuit",
    "verdict", "claimant", "first notice of loss", "fnol",
  ],
  reinsurance: [
    "reinsurance", "retrocession", "treaty", "facultative", "cat bond",
    "catastrophe bond", "ils", "insurance-linked securities", "sidecar",
    "collateralized reinsurance", "quota share", "excess of loss",
    "aggregate cover", "1/1 renewals", "monte carlo", "risk transfer",
    "ceding", "ceded", "assumed", "retro", "reinstatement",
  ],
  insurtech: [
    "insurtech", "technology", "artificial intelligence", "ai", "machine learning",
    "automation", "digital transformation", "telematics", "iot", "blockchain",
    "smart contract", "digital claims", "api", "platform", "startup",
    "innovation", "tech", "software", "saas", "data analytics",
    "predictive analytics", "modeling", "parametric", "embedded insurance",
  ],
};

// ============================================================================
// P&C Positive Keywords (boost relevance) - Combined from all categories
// ============================================================================

const PC_KEYWORDS = [
  // Property
  "property insurance",
  "homeowners",
  "commercial property",
  "fire insurance",
  "flood insurance",
  "hurricane",
  "catastrophe",
  "cat loss",
  "nat cat",
  "wildfire",
  "earthquake",
  "windstorm",
  "hail damage",
  "property damage",
  "builders risk",
  "inland marine",
  "ocean marine",
  "cargo insurance",
  "boiler and machinery",
  "equipment breakdown",

  // Casualty / Liability
  "casualty",
  "liability",
  "general liability",
  "professional liability",
  "errors and omissions",
  "e&o",
  "d&o",
  "directors and officers",
  "workers compensation",
  "workers comp",
  "auto insurance",
  "commercial auto",
  "motor insurance",
  "product liability",
  "umbrella",
  "excess liability",
  "cyber insurance",
  "cyber liability",
  "data breach",
  "ransomware",
  "epli",
  "employment practices",
  "fiduciary liability",
  "crime insurance",
  "fidelity bond",
  "kidnap and ransom",

  // Social Inflation / Litigation Trends
  "social inflation",
  "nuclear verdict",
  "litigation funding",
  "third-party litigation",
  "class action",
  "mass tort",
  "mdl",
  "reptile theory",
  "punitive damages",
  "jury verdict",
  "bellwether trial",

  // Climate / ESG
  "climate risk",
  "climate change",
  "transition risk",
  "physical risk",
  "esg",
  "sustainability",
  "carbon footprint",
  "greenwashing",
  "climate disclosure",
  "adaptation",
  "resilience",

  // Reinsurance
  "reinsurance",
  "retrocession",
  "treaty",
  "facultative",
  "cat bond",
  "catastrophe bond",
  "ils",
  "insurance-linked securities",
  "sidecar",
  "collateralized reinsurance",
  "quota share",
  "excess of loss",
  "aggregate cover",
  "1/1 renewals",
  "monte carlo",
  "risk transfer",

  // Claims
  "claims",
  "loss adjustment",
  "subrogation",
  "litigation",
  "settlement",
  "reserve",
  "loss ratio",
  "combined ratio",
  "loss development",
  "incurred but not reported",
  "ibnr",
  "case reserves",
  "adverse development",
  "reserve strengthening",

  // Market / Regulation
  "underwriting",
  "premium",
  "rate increase",
  "hard market",
  "soft market",
  "capacity",
  "naic",
  "state insurance",
  "insurance regulation",
  "insurance commissioner",
  "surplus lines",
  "admitted",
  "non-admitted",
  "mga",
  "managing general agent",
  "rate adequacy",
  "loss cost",
  "rate filing",
  "residual market",
  "fair plan",
  "citizens property",

  // Industry / Market
  "p&c",
  "property and casualty",
  "commercial lines",
  "personal lines",
  "insurance carrier",
  "insurer",
  "policyholder",
  "m&a",
  "merger",
  "acquisition",
  "ipo",
  "earnings",
  "combined ratio",
  "return on equity",
  "book value",
  "statutory surplus",
  "am best",
  "s&p rating",
  "moody's rating",
  "fitch rating",
  "solvency",
  "rbc",
  "risk-based capital",

  // Major Carriers (high signal)
  "state farm",
  "allstate",
  "liberty mutual",
  "travelers",
  "chubb",
  "aig",
  "hartford",
  "progressive",
  "geico",
  "nationwide",
  "farmers",
  "usaa",
  "erie insurance",
  "cincinnati financial",
  "hanover",
  "cna",
  "zurich",
  "axa xl",
  "swiss re",
  "munich re",
  "berkshire hathaway",
  "markel",
  "w. r. berkley",
  "arch capital",
  "renaissancere",
  "everest re",
  "lloyd's",
];

// ============================================================================
// Exclusion Keywords (reduce relevance - life/health focus)
// ============================================================================

const EXCLUSION_KEYWORDS = [
  "life insurance",
  "term life",
  "whole life",
  "universal life",
  "health insurance",
  "health plan",
  "medicare",
  "medicaid",
  "obamacare",
  "aca",
  "affordable care act",
  "dental insurance",
  "vision insurance",
  "disability insurance",
  "long-term care",
  "annuity",
  "annuities",
  "retirement plan",
  "401k",
  "pension",
];

// ============================================================================
// Relevance Scoring
// ============================================================================

interface RelevanceResult {
  score: number;
  isRelevant: boolean;
  matchedKeywords: string[];
  excludedKeywords: string[];
}

/**
 * Calculate P&C relevance score for an article.
 *
 * @param title - Article title
 * @param snippet - Article snippet/description
 * @param sourceCategories - Categories from the source
 * @returns Relevance result with score (0-1) and isRelevant flag
 */
export function calculateRelevance(
  title: string,
  snippet: string,
  sourceCategories: SourceCategory[] = []
): RelevanceResult {
  const text = `${title} ${snippet}`.toLowerCase();

  // Check for exclusion keywords
  const excludedKeywords = EXCLUSION_KEYWORDS.filter((kw) =>
    text.includes(kw.toLowerCase())
  );

  // Check for P&C keywords
  const matchedKeywords = PC_KEYWORDS.filter((kw) =>
    text.includes(kw.toLowerCase())
  );

  // Calculate base score
  let score = 0;

  // Start with source category boost (reputable P&C sources)
  if (sourceCategories.length > 0) {
    score += 0.3;
  }

  // Add points for matched P&C keywords (diminishing returns)
  const keywordBoost = Math.min(matchedKeywords.length * 0.15, 0.6);
  score += keywordBoost;

  // Penalty for exclusion keywords
  const exclusionPenalty = Math.min(excludedKeywords.length * 0.3, 0.8);
  score -= exclusionPenalty;

  // Clamp score between 0 and 1
  score = Math.max(0, Math.min(1, score));

  // Threshold for relevance
  const isRelevant = score >= 0.25 && excludedKeywords.length === 0;

  return {
    score: Math.round(score * 100) / 100,
    isRelevant,
    matchedKeywords,
    excludedKeywords,
  };
}

// ============================================================================
// Category Classification
// ============================================================================

interface CategoryScore {
  category: SourceCategory;
  score: number;
  matchedKeywords: string[];
}

/**
 * Classify article into P&C categories based on keyword matching.
 * Returns categories sorted by relevance score.
 *
 * @param title - Article title
 * @param snippet - Article snippet/description
 * @param sourceCategories - Categories from the source (used as fallback)
 * @returns Array of matched categories sorted by score
 */
export function classifyCategories(
  title: string,
  snippet: string,
  sourceCategories: SourceCategory[] = []
): SourceCategory[] {
  const text = `${title} ${snippet}`.toLowerCase();
  const scores: CategoryScore[] = [];

  // Score each category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matched = keywords.filter((kw) => text.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      scores.push({
        category: category as SourceCategory,
        score: matched.length,
        matchedKeywords: matched,
      });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Get top categories (at least 1 match)
  const inferredCategories = scores.map((s) => s.category);

  // If no categories matched, fall back to source categories
  if (inferredCategories.length === 0) {
    return sourceCategories;
  }

  // Merge with source categories, prioritizing inferred
  const mergedCategories = [...new Set([...inferredCategories, ...sourceCategories])];

  // Limit to top 3 categories
  return mergedCategories.slice(0, 3);
}

