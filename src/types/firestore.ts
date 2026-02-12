/**
 * Firestore Document Types for P&C Insurance News AI
 *
 * Collections:
 * - sources/{sourceId}
 * - articles/{articleId}
 * - briefs/{yyyy-mm-dd}
 * - users/{uid}
 *   - bookmarks/{articleId}
 *   - prefs/main
 */

import type { Timestamp } from "firebase/firestore";

// ============================================================================
// Sources Collection: sources/{sourceId}
// ============================================================================

export type SourceCategory =
  | "property_cat"
  | "casualty_liability"
  | "regulation"
  | "claims"
  | "reinsurance"
  | "insurtech";

/** Source tier indicating trustworthiness/quality */
export type SourceTier = "reputable" | "community" | "user-submitted";

/** Fetch state for conditional RSS requests */
export interface SourceFetchState {
  /** ETag from last fetch (for conditional requests) */
  etag: string | null;
  /** Last-Modified header from last fetch */
  lastModified: string | null;
  /** Last successful fetch timestamp */
  lastFetchedAt: Timestamp | null;
  /** Last fetch error message (null if successful) */
  lastError: string | null;
}

export interface Source {
  /** Unique identifier (slug-style, e.g., "insurance-journal") */
  id: string;
  /** Display name */
  name: string;
  /** Publisher website URL */
  siteUrl: string;
  /** RSS feed URL (legacy single-feed) */
  rssUrl: string;
  /** RSS feed URLs (supports multiple feeds per source) */
  rssUrls?: string[];
  /** Whether this source is enabled for ingestion */
  enabled: boolean;
  /** Whether this source is enabled by default for new users */
  enabledByDefault?: boolean;
  /** Source tier indicating trustworthiness */
  tier: SourceTier;
  /** Tags for categorization and filtering */
  tags: SourceCategory[];
  /** Region/geography focus (optional) */
  region?: string;
  /** Created timestamp */
  createdAt: Timestamp;
  /** Updated timestamp */
  updatedAt: Timestamp;
  /** Fetch state for conditional requests (keyed by rssUrl for multi-feed) */
  fetchState: SourceFetchState;
  /** Fetch states per RSS URL (for multi-feed sources) */
  fetchStates?: Record<string, SourceFetchState>;
}

// ============================================================================
// Articles Collection: articles/{articleId}
// ============================================================================

export interface Article {
  /** Unique identifier (SHA256 hash of canonical URL or GUID) */
  id: string;
  /** Source ID reference */
  sourceId: string;
  /** Source display name (denormalized for display) */
  sourceName: string;
  /** Article headline/title */
  title: string;
  /** Short snippet/excerpt (≤200 chars, respecting publisher policies) */
  snippet: string;
  /** Original article URL */
  url: string;
  /** Normalized canonical URL (for deduplication) */
  canonicalUrl: string;
  /** RSS GUID if available (fallback for deduplication) */
  guid: string | null;
  /** Article image URL if present in RSS */
  imageUrl: string | null;
  /** Article categories */
  categories: SourceCategory[];
  /** Publication timestamp */
  publishedAt: Timestamp;
  /** When we ingested this article */
  ingestedAt: Timestamp;
  /** P&C relevance score (0-1) from heuristic filter */
  relevanceScore: number;
  /** Whether article passes P&C relevance filter */
  isRelevant: boolean;
  /** AI-generated content (cached, generated on first request) */
  ai: ArticleAI | null;
  /** Vector embedding for semantic search (optional, computed on-demand) */
  embedding?: ArticleEmbedding;
  /** Search tokens for lexical narrowing (optional, computed at ingest) */
  searchTokens?: string[];
}

/**
 * Vector embedding for an article
 */
export interface ArticleEmbedding {
  /** Number of dimensions in the vector */
  dims: number;
  /** The embedding vector */
  vector: number[];
  /** Model used to generate the embedding */
  model: string;
  /** When the embedding was generated */
  updatedAt: Timestamp;
}

/**
 * AI-generated article content
 */
export interface ArticleAI {
  /** 2-3 sentence executive summary */
  tldr: string;
  /** Why this matters for P&C professionals */
  whyItMatters: string;
  /** 2-4 relevant topic tags */
  topics: string[];
  /** Primary category */
  category: "property" | "casualty" | "reinsurance" | "regulation" | "claims" | "insurtech" | "market" | "litigation";
  /** When AI content was generated */
  generatedAt: Timestamp;
  /** Model used for generation */
  model: string;
}

// ============================================================================
// Briefs Collection: briefs/{yyyy-mm-dd}
// ============================================================================

export interface BriefTopStory {
  /** Article ID reference */
  articleId: string;
  /** Article headline (synthesized, not copied) */
  headline: string;
  /** Why this story matters for P&C professionals */
  whyItMatters: string;
}

export interface BriefSection {
  /** Section bullets (2-4 items) */
  bullets: string[];
  /** Related article IDs */
  articleIds: string[];
}

export interface BriefSourceUsed {
  /** Source ID */
  sourceId: string;
  /** Source display name */
  name: string;
}

export interface Brief {
  /** Date in yyyy-mm-dd format */
  date: string;
  /** When this brief was created */
  createdAt: Timestamp;
  /** Executive summary bullets (3-5 items) */
  executiveSummary: string[];
  /** Top stories with "why it matters" */
  topStories: BriefTopStory[];
  /** Category sections */
  sections: {
    propertyCat: BriefSection;
    casualtyLiability: BriefSection;
    regulation: BriefSection;
    claims: BriefSection;
    reinsurance: BriefSection;
    insurtech: BriefSection;
    market: BriefSection;
  };
  /** Key topics covered */
  topics: string[];
  /** Sources used to generate this brief */
  sourcesUsed: BriefSourceUsed[];
  /** Article IDs used to generate this brief (for grounded chat) */
  sourceArticleIds: string[];
  /** Model used for generation */
  model: string;
}

// ============================================================================
// Users Collection: users/{uid}
// ============================================================================

export interface UserProfile {
  /** User's Firebase UID */
  uid: string;
  /** Email address */
  email: string | null;
  /** Display name */
  displayName: string | null;
  /** Account created timestamp */
  createdAt: Timestamp;
  /** Last login timestamp */
  lastLoginAt: Timestamp;
}

// ============================================================================
// User Bookmarks Subcollection: users/{uid}/bookmarks/{articleId}
// ============================================================================

export interface Bookmark {
  /** Article ID (same as document ID) */
  articleId: string;
  /** Article title (denormalized for display) */
  title: string;
  /** Source name (denormalized) */
  sourceName: string;
  /** Article URL */
  url: string;
  /** When bookmarked */
  bookmarkedAt: Timestamp;
}

// ============================================================================
// User Preferences Subcollection: users/{uid}/prefs/main
// ============================================================================

export interface UserPreferences {
  /** Source IDs the user has enabled */
  enabledSourceIds: string[];
  /** Categories the user wants to see */
  enabledCategories: SourceCategory[];
  /** Notification preferences */
  notifications: {
    dailyBrief: boolean;
    breakingNews: boolean;
  };
  /** Watchlist topics (canonical form) for Industry Pulse */
  watchlistTopics?: string[];
  /** Last updated timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// Signals (Industry Pulse) — Legacy response types
// ============================================================================

export interface SignalItem {
  topic: string;
  canonical: string;
  recentCount: number;
  prevCount: number;
  delta: number;
  /** Percentage of recent window days with this topic (0-100) */
  intensity: number;
  /** Per-day appearance flags: 1 = present, 0 = absent. Oldest first. */
  sparkline: number[];
  why?: string;
  implication?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface SignalsMeta {
  dateKey: string;
  windowDays: number;
  recentDates: string[];
  prevDates: string[];
  totalTopics: number;
  briefsAvailable: number;
}

export interface PulseSignalsResponse {
  cached: boolean;
  /** AI-generated executive market narrative */
  narrative: string;
  rising: SignalItem[];
  falling: SignalItem[];
  persistent: SignalItem[];
  meta: SignalsMeta;
}

// ============================================================================
// Pulse Snapshots — Deterministic response types
// ============================================================================

/** Topic type classification for Industry Pulse */
export type PulseTopicType =
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

/** A single topic in a pulse snapshot */
export interface PulseTopic {
  /** Canonical key (normalized, stable across briefs) */
  key: string;
  /** Human-readable display name */
  displayName: string;
  /** Classification type */
  type: PulseTopicType;
  /** Total mention count in the recent window */
  mentions: number;
  /** Baseline mention count in the prior equivalent window */
  baselineMentions: number;
  /** mentions - baselineMentions */
  momentum: number;
  /** Number of unique days the topic appeared */
  daysPresent: number;
  /** Number of unique sources associated with the topic */
  uniqueSources: number;
  /** Array[windowDays] of daily mention counts (oldest first) */
  trendSeries: number[];
}

/** A driver reference cited in the pulse narrative */
export interface PulseNarrativeDriver {
  /** Article ID (if resolvable) */
  articleId?: string;
  /** Source publication name */
  source: string;
  /** Article or story title */
  title: string;
  /** URL to the original article */
  url: string;
}

/** Structured market narrative for a pulse snapshot */
export interface PulseNarrative {
  /** Single-line executive headline */
  headline: string;
  /** 3–5 grounded market insight bullets */
  bullets: string[];
  /** 2–4 overarching theme labels */
  themes: string[];
  /** Concrete driver references backing the narrative */
  drivers: PulseNarrativeDriver[];
  /** Count of unique sources referenced */
  sourcesUsed: number;
}

/** Pulse snapshot response from getPulseSnapshot callable */
export interface PulseSnapshotResponse {
  windowDays: number;
  dateKey: string;
  generatedAt: string; // ISO string
  totalTopics: number;
  rising: PulseTopic[];
  falling: PulseTopic[];
  stable: PulseTopic[];
  /** Structured market narrative (null if generation failed or unavailable) */
  narrative: PulseNarrative | null;
}

// ============================================================================
// Pulse Topic Drilldown — getPulseTopicDetail response types
// ============================================================================

/** A driver article backing a topic's mentions */
export interface PulseTopicDriver {
  /** Firestore article document ID */
  articleId: string;
  /** Source publication name */
  source: string;
  /** Article headline */
  title: string;
  /** URL to the original article */
  url: string;
  /** When the article was published (ISO string) */
  publishedAt: string;
}

/** Response from getPulseTopicDetail callable */
export interface PulseTopicDetailResponse {
  /** Canonical topic key */
  key: string;
  /** Human-readable display name */
  displayName: string;
  /** Classification type */
  type: PulseTopicType;
  /** Total mention count in the recent window */
  mentions: number;
  /** Baseline mention count in the prior equivalent window */
  baselineMentions: number;
  /** mentions - baselineMentions */
  momentum: number;
  /** Number of unique days the topic appeared */
  daysPresent: number;
  /** Number of unique sources associated with the topic */
  uniqueSources: number;
  /** Array[windowDays] of daily mention counts (oldest first) */
  trendSeries: number[];
  /** Top N articles contributing to this topic's mentions */
  drivers: PulseTopicDriver[];
}

// ============================================================================
// Watchlist — toggleWatchlistTopic / getWatchlistTopics response types
// ============================================================================

/** A pinned topic in the user's watchlist (stored at users/{uid}/watchlist/{topicKey}) */
export interface WatchlistTopic {
  /** Canonical topic key */
  key: string;
  /** Human-readable display name */
  displayName: string;
  /** Classification type */
  type: PulseTopicType;
  /** When the user pinned this topic (ISO string) */
  createdAt: string;
}

/** Watchlist topic enriched with current snapshot metrics */
export interface WatchlistTopicEnriched {
  /** Canonical topic key */
  key: string;
  /** Human-readable display name */
  displayName: string;
  /** Classification type */
  type: PulseTopicType;
  /** When the user pinned this topic (ISO string) */
  createdAt: string;
  /** Whether live snapshot metrics are available */
  hasMetrics: boolean;
  /** Current mention count (null if snapshot unavailable or topic absent) */
  mentions: number | null;
  /** Baseline mention count (null if unavailable) */
  baselineMentions: number | null;
  /** Current momentum (null if unavailable) */
  momentum: number | null;
  /** Days present in recent window (null if unavailable) */
  daysPresent: number | null;
  /** Unique sources (null if unavailable) */
  uniqueSources: number | null;
  /** Daily trend series (null if unavailable) */
  trendSeries: number[] | null;
}

/** Response from getWatchlistTopics callable */
export interface GetWatchlistTopicsResponse {
  topics: WatchlistTopicEnriched[];
  /** Window used for metric enrichment */
  windowDays: number;
  /** Whether a snapshot was available for enrichment */
  snapshotAvailable: boolean;
}

// ============================================================================
// Chat Threads Subcollection: users/{uid}/chatThreads/{threadId}
// ============================================================================

/** Time scope for chat queries */
export type ChatTimeScope = "today" | "7d" | "30d";

/** Source filter mode */
export type ChatSourceFilter = "all" | "selected";

/** Category filter for chat */
export type ChatCategory = "all" | "property" | "casualty" | "regulation" | "claims" | "reinsurance";

/** Citation reference in a chat message */
export interface ChatCitation {
  /** Article ID reference */
  articleId: string;
  /** Article title */
  title: string;
  /** Source name */
  sourceName: string;
  /** Article URL */
  url: string;
  /** Publication timestamp (ISO string for serialization) */
  publishedAt: string;
}

/** Chat thread document */
export interface ChatThread {
  /** Thread ID (document ID) */
  id: string;
  /** Thread title (auto-generated from first message or user-set) */
  title: string;
  /** When thread was created */
  createdAt: Timestamp;
  /** When thread was last updated */
  updatedAt: Timestamp;
  /** Time scope filter */
  scope: ChatTimeScope;
  /** Source filter mode */
  sourceFilter: ChatSourceFilter;
  /** Category filter */
  category: ChatCategory;
}

/** Chat message document */
export interface ChatMessage {
  /** Message ID (document ID) */
  id: string;
  /** Message role */
  role: "user" | "assistant";
  /** Message content */
  content: string;
  /** When message was created */
  createdAt: Timestamp;
  /** Citations (only for assistant messages) */
  citations?: ChatCitation[];
}

