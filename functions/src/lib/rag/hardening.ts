/**
 * RAG Hardening Module
 *
 * Provides security, caching, validation, and logging for AI operations.
 * Implements defense-in-depth against prompt injection and abuse.
 */

import { createHash } from "crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import type { RagAnswerResponse } from "../ai/openai-client.js";

// Local type definitions to avoid circular imports
interface RagScope {
  timeWindow: "today" | "7d" | "30d";
  category: string;
  sourceIds: string[] | null;
}

interface ArticleContext {
  id: string;
  title: string;
  sourceName: string;
  url: string;
  publishedAt: string;
  snippet: string;
  tldr: string | null;
}

// ============================================================================
// Prompt Injection Defense
// ============================================================================

/** Patterns that indicate prompt injection attempts */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /forget\s+(all\s+)?(previous|prior|above)/i,
  /new\s+instructions?:/i,
  /system\s*prompt/i,
  /you\s+are\s+(now|a)\s+/i,
  /act\s+as\s+(if|a)\s+/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /roleplay\s+as/i,
  /jailbreak/i,
  /bypass\s+(safety|content|filter)/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /###\s*(system|user|assistant)/i,
];

/** Words that should never appear in P&C insurance questions */
const BLOCKLIST_TERMS = [
  "bomb", "weapon", "illegal", "hack", "exploit", "malware",
  "password", "credential", "api key", "secret key",
];

export interface SanitizationResult {
  isClean: boolean;
  sanitizedText: string;
  rejectionReason?: string;
  riskScore: number; // 0-100
}

/**
 * Sanitize and validate user input for prompt injection
 */
export function sanitizeUserInput(text: string): SanitizationResult {
  const trimmed = text.trim();
  let riskScore = 0;

  // Check length
  if (trimmed.length > 2000) {
    return {
      isClean: false,
      sanitizedText: "",
      rejectionReason: "Question too long (max 2000 characters)",
      riskScore: 100,
    };
  }

  if (trimmed.length < 3) {
    return {
      isClean: false,
      sanitizedText: "",
      rejectionReason: "Question too short",
      riskScore: 100,
    };
  }

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      logger.warn("Prompt injection detected", { pattern: pattern.source, text: trimmed.slice(0, 100) });
      riskScore += 50;
    }
  }

  // Check blocklist
  const lowerText = trimmed.toLowerCase();
  for (const term of BLOCKLIST_TERMS) {
    if (lowerText.includes(term)) {
      logger.warn("Blocklist term detected", { term, text: trimmed.slice(0, 100) });
      riskScore += 30;
    }
  }

  // Check for excessive special characters (potential encoding tricks)
  const specialCharRatio = (trimmed.match(/[^\w\s.,?!'-]/g) || []).length / trimmed.length;
  if (specialCharRatio > 0.3) {
    riskScore += 20;
  }

  // Check for repeated patterns (spam/DoS)
  const words = trimmed.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
    riskScore += 20;
  }

  if (riskScore >= 50) {
    return {
      isClean: false,
      sanitizedText: "",
      rejectionReason: "Question flagged for review",
      riskScore,
    };
  }

  // Sanitize: remove control characters, normalize whitespace
  const sanitized = trimmed
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " ")            // Normalize whitespace
    .slice(0, 2000);                 // Hard limit

  return {
    isClean: true,
    sanitizedText: sanitized,
    riskScore,
  };
}

// ============================================================================
// Response Caching
// ============================================================================

const CACHE_COLLECTION = "ragCache";
const CACHE_TTL_HOURS = 6; // Cache responses for 6 hours

export interface CacheKey {
  userId: string;
  queryHash: string;
  scope: string;
  sourcesHash: string;
  dateKey: string;
}

/**
 * Generate a deterministic cache key for a RAG query
 */
export function generateCacheKey(
  userId: string,
  question: string,
  scope: RagScope
): CacheKey {
  const dateKey = new Date().toISOString().split("T")[0];
  
  // Hash the question
  const queryHash = createHash("sha256")
    .update(question.toLowerCase().trim())
    .digest("hex")
    .slice(0, 16);

  // Hash the sources (or "all" if no filter)
  const sourcesStr = scope.sourceIds?.sort().join(",") || "all";
  const sourcesHash = createHash("sha256")
    .update(sourcesStr)
    .digest("hex")
    .slice(0, 8);

  return {
    userId,
    queryHash,
    scope: `${scope.timeWindow}_${scope.category}`,
    sourcesHash,
    dateKey,
  };
}

/**
 * Get the cache document ID from a cache key
 */
function getCacheDocId(key: CacheKey): string {
  return `${key.userId}_${key.queryHash}_${key.scope}_${key.sourcesHash}_${key.dateKey}`;
}

/**
 * Check cache for a previous response
 */
export async function getCachedResponse(
  key: CacheKey
): Promise<RagAnswerResponse | null> {
  const db = getFirestore();
  const docId = getCacheDocId(key);
  const docRef = db.collection(CACHE_COLLECTION).doc(docId);

  try {
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    // Check if cache is expired
    const createdAt = data.createdAt?.toDate?.() || new Date(0);
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (ageHours > CACHE_TTL_HOURS) {
      logger.info("Cache expired", { docId, ageHours });
      return null;
    }

    logger.info("Cache hit", { docId });
    return data.response as RagAnswerResponse;
  } catch (error) {
    logger.warn("Cache read error", { error });
    return null;
  }
}

/**
 * Store a response in the cache
 */
export async function setCachedResponse(
  key: CacheKey,
  response: RagAnswerResponse
): Promise<void> {
  const db = getFirestore();
  const docId = getCacheDocId(key);
  const docRef = db.collection(CACHE_COLLECTION).doc(docId);

  try {
    await docRef.set({
      response,
      createdAt: Timestamp.now(),
      userId: key.userId,
      queryHash: key.queryHash,
      scope: key.scope,
    });
    logger.info("Cache set", { docId });
  } catch (error) {
    logger.warn("Cache write error", { error });
    // Don't throw - caching is best-effort
  }
}

// ============================================================================
// Response Validation
// ============================================================================

/**
 * Validate a RAG answer response structure
 */
export function validateRagResponse(response: unknown): {
  isValid: boolean;
  errors: string[];
  sanitizedResponse?: RagAnswerResponse;
} {
  const errors: string[] = [];

  if (!response || typeof response !== "object") {
    return { isValid: false, errors: ["Response is not an object"] };
  }

  const r = response as Record<string, unknown>;

  // Check required fields
  if (typeof r.answerMarkdown !== "string") {
    errors.push("Missing or invalid answerMarkdown");
  } else if (r.answerMarkdown.length < 10) {
    errors.push("Answer too short");
  } else if (r.answerMarkdown.length > 10000) {
    errors.push("Answer too long");
  }

  if (!Array.isArray(r.takeaways)) {
    errors.push("Missing or invalid takeaways array");
  }

  if (!Array.isArray(r.citations)) {
    errors.push("Missing or invalid citations array");
  }

  if (!Array.isArray(r.followUps)) {
    errors.push("Missing or invalid followUps array");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize the response
  const sanitized: RagAnswerResponse = {
    answerMarkdown: String(r.answerMarkdown).slice(0, 10000),
    takeaways: (r.takeaways as unknown[])
      .filter((t): t is string => typeof t === "string")
      .slice(0, 10),
    citations: (r.citations as unknown[])
      .filter((c): c is Record<string, unknown> =>
        typeof c === "object" && c !== null && "articleId" in c
      )
      .map((c) => ({
        articleId: String(c.articleId),
        title: String(c.title || ""),
        sourceName: String(c.sourceName || ""),
        url: String(c.url || ""),
        publishedAt: String(c.publishedAt || ""),
      }))
      .slice(0, 20),
    followUps: (r.followUps as unknown[])
      .filter((f): f is string => typeof f === "string")
      .slice(0, 5),
  };

  return { isValid: true, errors: [], sanitizedResponse: sanitized };
}

// ============================================================================
// Relevance & Refusal Detection
// ============================================================================

/**
 * Check if a question is likely related to P&C insurance.
 * 
 * This is intentionally permissive — false positives are cheap (the model 
 * will just say "not enough info"), but false negatives block valid questions
 * like "What happened today?" or "Any news about State Farm?"
 */
export function isLikelyPnCQuestion(question: string): boolean {
  const lowerQ = question.toLowerCase();

  // P&C-specific keywords
  const pncKeywords = [
    "insurance", "insurer", "carrier", "underwriting", "claims",
    "reinsurance", "catastrophe", "cat bond", "loss", "premium",
    "policy", "coverage", "liability", "property", "casualty",
    "hurricane", "wildfire", "flood", "storm", "nuclear verdict",
    "social inflation", "combined ratio", "loss ratio", "rate",
    "reserve", "treaty", "facultative", "excess", "surplus",
    "mga", "broker", "agent", "risk", "exposure", "d&o", "e&o",
    "cyber", "auto", "homeowners", "workers comp", "commercial",
    "naic", "doi", "regulation", "actuarial", "pricing",
    "berkshire", "aig", "chubb", "allstate", "state farm", "geico",
    "progressive", "travelers", "liberty mutual", "nationwide",
    "zurich", "beazley", "markel", "hannover", "munich re", "swiss re",
    "lloyd", "p&c", "pnc", "p and c", "deductible", "indemnity",
    "subrogation", "class action", "tort", "settlement",
    "hail", "earthquake", "fire", "tornado", "climate",
    "m&a", "acquisition", "merger", "ipo", "market", "sector",
    "company", "firm", "deal", "consolidation", "capital",
  ];

  // Direct keyword match
  if (pncKeywords.some((kw) => lowerQ.includes(kw))) return true;

  // General news-seeking patterns that are valid in this app's context.
  // Users asking "what happened today?" in an insurance news app clearly want insurance news.
  const newsPatterns = [
    /what('s| is| has)?\s+(happening|happened|new|the latest|going on|trending)/,
    /any\s+(news|updates|developments|changes|stories)/,
    /tell me (about|what)/,
    /summary\s+(of|for)/,
    /this (week|month|quarter)/,
    /today('s)?\s+(news|brief|update|top|headline)/,
    /latest\s+(news|updates|developments|stories|headlines)/,
    /top\s+(stories|news|headlines|developments)/,
    /recap|overview|rundown|briefing/,
    /what should (i|we) (know|watch|be aware)/,
  ];

  if (newsPatterns.some((p) => p.test(lowerQ))) return true;

  // Short follow-up questions in a conversation context are likely valid.
  // e.g. "Tell me more" or "What about pricing?" — let these through.
  if (lowerQ.length < 50) return true;

  return false;
}

/**
 * Determine if we should refuse to answer based on context quality
 */
export function shouldRefuse(
  question: string,
  context: ArticleContext[]
): { refuse: boolean; reason?: string } {
  // No articles found
  if (context.length === 0) {
    return {
      refuse: true,
      reason: "No relevant articles found for your query."
    };
  }

  // Check if question seems P&C related
  if (!isLikelyPnCQuestion(question)) {
    return {
      refuse: true,
      reason: "This question doesn't appear to be about P&C insurance. I can only answer questions about property & casualty insurance news."
    };
  }

  // Very few context articles
  if (context.length < 2) {
    return {
      refuse: false, // Don't refuse, but will flag as low-confidence
    };
  }

  return { refuse: false };
}

// ============================================================================
// Structured Logging
// ============================================================================

export interface RagLogEntry {
  requestId: string;
  userId: string;
  question: string;
  scope: RagScope;
  inputSanitization: SanitizationResult;
  cacheHit: boolean;
  candidateCount: number;
  selectedCount: number;
  modelCalled: boolean;
  tokenEstimate?: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  refused?: boolean;
  refusalReason?: string;
}

/**
 * Log a structured RAG request for monitoring and debugging
 */
export function logRagRequest(entry: RagLogEntry): void {
  const logData = {
    ...entry,
    question: entry.question.slice(0, 100), // Truncate for logs
    timestamp: new Date().toISOString(),
  };

  if (entry.success) {
    logger.info("RAG request completed", logData);
  } else {
    logger.error("RAG request failed", logData);
  }
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `rag_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

