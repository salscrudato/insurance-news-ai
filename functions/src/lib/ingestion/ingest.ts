/**
 * RSS Feed Ingestion Engine
 *
 * Main ingestion logic for processing RSS feeds and storing articles.
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import type { Source, Article, SourceFetchState } from "../../types/firestore.js";
import { fetchRssFeed, extractImageUrl, fetchOgImage, type RssItem } from "./rss-fetcher.js";
import {
  normalizeUrl,
  generateArticleId,
  truncateText,
  stripHtml,
} from "./url-utils.js";
import { calculateRelevance, classifyCategories } from "./relevance.js";
import { generateSearchTokens } from "../embeddings/index.js";

// ============================================================================
// Types
// ============================================================================

export interface IngestionResult {
  sourceId: string;
  sourceName: string;
  success: boolean;
  notModified: boolean;
  itemsFetched: number;
  itemsIngested: number;
  itemsSkipped: number;
  itemsDuplicate: number;
  /** Duration in milliseconds for this source */
  durationMs?: number;
  /** Number of feeds processed (for multi-feed sources) */
  feedsProcessed?: number;
  /** Whether results came from cache */
  cached?: boolean;
  error?: string;
}

export interface IngestionSummary {
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  sourcesProcessed: number;
  totalItemsFetched: number;
  totalItemsIngested: number;
  results: IngestionResult[];
}

// ============================================================================
// Constants
// ============================================================================

const SNIPPET_MAX_LENGTH = 200;
const MAX_ARTICLE_AGE_DAYS = 30; // Don't ingest articles older than 30 days

// ============================================================================
// Main Ingestion Function
// ============================================================================

/**
 * Ingest articles from all enabled sources.
 *
 * @param options - Ingestion options
 * @returns Summary of ingestion results
 */
export async function ingestAllEnabledSources(options?: {
  maxAgeDays?: number;
  forceRefresh?: boolean;
}): Promise<IngestionSummary> {
  const startedAt = new Date();
  const db = getFirestore();
  const maxAgeDays = options?.maxAgeDays ?? MAX_ARTICLE_AGE_DAYS;

  // Fetch all enabled sources
  const sourcesSnap = await db
    .collection("sources")
    .where("enabled", "==", true)
    .get();

  const sources = sourcesSnap.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Source
  );

  logger.info("Starting RSS ingestion", {
    sourcesCount: sources.length,
    maxAgeDays,
    forceRefresh: options?.forceRefresh ?? false,
  });

  const results: IngestionResult[] = [];

  for (const source of sources) {
    const sourceStartTime = Date.now();
    const result = await ingestSource(source, { maxAgeDays });
    result.durationMs = Date.now() - sourceStartTime;
    results.push(result);

    // Log progress with structured data
    if (result.success) {
      if (result.notModified) {
        logger.debug("Source not modified", {
          sourceId: source.id,
          sourceName: source.name,
        });
      } else {
        logger.info("Source ingested", {
          sourceId: source.id,
          sourceName: source.name,
          itemsFetched: result.itemsFetched,
          itemsIngested: result.itemsIngested,
          itemsSkipped: result.itemsSkipped,
          itemsDuplicate: result.itemsDuplicate,
          feedsProcessed: result.feedsProcessed,
          cached: result.cached,
          durationMs: result.durationMs,
        });
      }
    } else {
      logger.error("Source ingestion failed", {
        sourceId: source.id,
        sourceName: source.name,
        error: result.error,
      });
    }
  }

  const completedAt = new Date();
  const totalDurationMs = completedAt.getTime() - startedAt.getTime();

  // Log final summary
  const summary: IngestionSummary = {
    startedAt,
    completedAt,
    durationMs: totalDurationMs,
    sourcesProcessed: sources.length,
    totalItemsFetched: results.reduce((sum, r) => sum + r.itemsFetched, 0),
    totalItemsIngested: results.reduce((sum, r) => sum + r.itemsIngested, 0),
    results,
  };

  logger.info("Ingestion completed", {
    durationMs: totalDurationMs,
    sourcesProcessed: sources.length,
    totalItemsFetched: summary.totalItemsFetched,
    totalItemsIngested: summary.totalItemsIngested,
    successCount: results.filter((r) => r.success).length,
    failureCount: results.filter((r) => !r.success).length,
  });

  return summary;
}

/**
 * Ingest articles from a single source.
 * Supports multiple RSS URLs per source.
 */
export async function ingestSource(
  source: Source,
  options?: { maxAgeDays?: number }
): Promise<IngestionResult> {
  const maxAgeDays = options?.maxAgeDays ?? MAX_ARTICLE_AGE_DAYS;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  const result: IngestionResult = {
    sourceId: source.id,
    sourceName: source.name,
    success: false,
    notModified: false,
    itemsFetched: 0,
    itemsIngested: 0,
    itemsSkipped: 0,
    itemsDuplicate: 0,
    feedsProcessed: 0,
    cached: false,
  };

  // Get all RSS URLs for this source (support both single and multiple)
  const rssUrls = source.rssUrls?.length ? source.rssUrls : [source.rssUrl];
  const isMultiFeed = rssUrls.length > 1;

  let allNotModified = true;
  let anySuccess = false;
  let anyCached = false;
  const feedErrors: string[] = [];

  try {
    for (const rssUrl of rssUrls) {
      // Get the fetch state for this specific URL
      // Note: For multi-feed sources, fetchStates is keyed by urlToSafeKey(rssUrl), not the raw URL
      const safeKey = urlToSafeKey(rssUrl);
      const fetchState = isMultiFeed
        ? source.fetchStates?.[safeKey] ?? getDefaultFetchState()
        : source.fetchState;

      // Fetch the RSS feed
      const fetchResult = await fetchRssFeed(rssUrl, fetchState);

      if (!fetchResult.success) {
        feedErrors.push(`${rssUrl}: ${fetchResult.error}`);
        // Update fetch state for this URL
        if (isMultiFeed) {
          await updateSourceFetchStateForUrl(source.id, rssUrl, fetchResult.newFetchState);
        } else {
          await updateSourceFetchState(source.id, fetchResult.newFetchState);
        }
        continue;
      }

      // Track metadata
      result.feedsProcessed = (result.feedsProcessed ?? 0) + 1;
      if (fetchResult.cached) {
        anyCached = true;
      }

      // Track if any feed was not "not modified"
      if (!fetchResult.notModified) {
        allNotModified = false;
      }

      anySuccess = true;
      result.itemsFetched += fetchResult.items.length;

      // Process each item
      for (const item of fetchResult.items) {
        const itemResult = await processRssItem(item, source, cutoffDate);

        if (itemResult === "ingested") result.itemsIngested++;
        else if (itemResult === "skipped") result.itemsSkipped++;
        else if (itemResult === "duplicate") result.itemsDuplicate++;
      }

      // Update fetch state for this URL (skip for cached results)
      if (!fetchResult.cached) {
        if (isMultiFeed) {
          await updateSourceFetchStateForUrl(source.id, rssUrl, fetchResult.newFetchState);
        } else {
          await updateSourceFetchState(source.id, fetchResult.newFetchState);
        }
      }
    }

    // Determine overall result
    result.success = anySuccess;
    result.notModified = allNotModified && anySuccess;
    result.cached = anyCached;

    if (feedErrors.length > 0 && feedErrors.length < rssUrls.length) {
      // Partial failure
      result.error = `Partial failure: ${feedErrors.join("; ")}`;
    } else if (feedErrors.length === rssUrls.length) {
      // Complete failure
      result.success = false;
      result.error = feedErrors.join("; ");
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error";
    return result;
  }
}

/**
 * Get default fetch state for new feeds
 */
function getDefaultFetchState(): SourceFetchState {
  return {
    etag: null,
    lastModified: null,
    lastFetchedAt: null,
    lastError: null,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

type ProcessResult = "ingested" | "skipped" | "duplicate";

/**
 * Process a single RSS item and store if relevant.
 */
async function processRssItem(
  item: RssItem,
  source: Source,
  cutoffDate: Date
): Promise<ProcessResult> {
  const db = getFirestore();

  // Skip items without required fields
  if (!item.link || !item.title) {
    return "skipped";
  }

  // Parse publication date
  const pubDateStr = item.isoDate || item.pubDate;
  if (!pubDateStr) {
    return "skipped";
  }

  const pubDate = new Date(pubDateStr);
  if (isNaN(pubDate.getTime())) {
    return "skipped";
  }

  // Skip articles older than cutoff
  if (pubDate < cutoffDate) {
    return "skipped";
  }

  // Generate article ID from canonical URL
  const canonicalUrl = normalizeUrl(item.link);
  const articleId = generateArticleId(item.link);

  // Check if article already exists
  const existingDoc = await db.collection("articles").doc(articleId).get();
  if (existingDoc.exists) {
    return "duplicate";
  }

  // Extract and clean snippet
  const rawSnippet =
    item.contentSnippet || item.summary || item.description || item.content || "";
  const snippet = truncateText(stripHtml(rawSnippet), SNIPPET_MAX_LENGTH);

  // Calculate relevance
  const relevance = calculateRelevance(item.title, snippet, source.tags);

  // Classify into categories (uses keyword matching, falls back to source tags)
  const categories = classifyCategories(item.title, snippet, source.tags);

  // Extract image URL from RSS feed first
  let imageUrl = extractImageUrl(item);

  // If no image in RSS, try to fetch og:image from the article page
  if (!imageUrl) {
    imageUrl = await fetchOgImage(item.link);
  }

  // Build article document
  const article: Omit<Article, "id"> = {
    sourceId: source.id,
    sourceName: source.name,
    title: item.title.trim(),
    snippet,
    url: item.link,
    canonicalUrl,
    guid: item.guid || null,
    imageUrl,
    categories,
    publishedAt: Timestamp.fromDate(pubDate),
    ingestedAt: Timestamp.now(),
    relevanceScore: relevance.score,
    isRelevant: relevance.isRelevant,
    ai: null,
  };

  // Generate searchTokens for relevant articles (no OpenAI call needed)
  const searchTokens = relevance.isRelevant
    ? generateSearchTokens({ title: item.title.trim(), snippet })
    : [];

  // Store in Firestore
  await db.collection("articles").doc(articleId).set({
    id: articleId,
    ...article,
    searchTokens,
  });

  return "ingested";
}

/**
 * Update source fetch state in Firestore (single feed).
 */
async function updateSourceFetchState(
  sourceId: string,
  newFetchState: Record<string, unknown>
): Promise<void> {
  const db = getFirestore();

  // Replace null lastFetchedAt with server timestamp
  const updates: Record<string, unknown> = {
    "fetchState.lastError": newFetchState.lastError ?? null,
    "fetchState.lastFetchedAt": FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (newFetchState.etag !== undefined) {
    updates["fetchState.etag"] = newFetchState.etag;
  }
  if (newFetchState.lastModified !== undefined) {
    updates["fetchState.lastModified"] = newFetchState.lastModified;
  }

  await db.collection("sources").doc(sourceId).update(updates);
}

/**
 * Create a safe key for a URL to use in Firestore field paths.
 * Uses a simple hash to avoid special characters.
 */
function urlToSafeKey(url: string): string {
  // Create a simple hash from the URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Return a safe alphanumeric key
  return `feed_${Math.abs(hash).toString(36)}`;
}

/**
 * Update fetch state for a specific RSS URL in a multi-feed source.
 * Uses a hash of the URL as the key to avoid Firestore field path issues.
 */
async function updateSourceFetchStateForUrl(
  sourceId: string,
  rssUrl: string,
  newFetchState: Record<string, unknown>
): Promise<void> {
  const db = getFirestore();

  // Use a safe key derived from the URL
  const safeKey = urlToSafeKey(rssUrl);

  const updates: Record<string, unknown> = {
    [`fetchStates.${safeKey}.url`]: rssUrl,
    [`fetchStates.${safeKey}.lastError`]: newFetchState.lastError ?? null,
    [`fetchStates.${safeKey}.lastFetchedAt`]: FieldValue.serverTimestamp(),
    [`fetchStates.${safeKey}.etag`]: newFetchState.etag ?? null,
    [`fetchStates.${safeKey}.lastModified`]: newFetchState.lastModified ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection("sources").doc(sourceId).update(updates);
}

