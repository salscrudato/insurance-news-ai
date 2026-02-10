/**
 * RSS Feed Fetcher with Conditional GET Support and Caching
 *
 * Uses ETag/Last-Modified headers to minimize bandwidth.
 * Implements in-memory caching to avoid redundant fetches.
 */

import Parser from "rss-parser";
import type { SourceFetchState } from "../../types/firestore.js";

// ============================================================================
// Types
// ============================================================================

export interface RssItem {
  title: string;
  link: string;
  guid?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  description?: string;
  creator?: string;
  categories?: string[];
  enclosure?: {
    url?: string;
    type?: string;
  };
  "media:content"?: {
    $?: { url?: string };
  };
  "media:thumbnail"?: {
    $?: { url?: string };
  };
}

export interface FetchResult {
  success: boolean;
  notModified: boolean;
  items: RssItem[];
  newFetchState: Partial<SourceFetchState>;
  error?: string;
  cached?: boolean;
}

// ============================================================================
// Feed Cache (in-memory, per-function-invocation)
// ============================================================================

interface CachedFeed {
  items: RssItem[];
  fetchState: Partial<SourceFetchState>;
  cachedAt: number;
}

// Cache TTL: 15 minutes (reduces redundant fetches within same ingestion run)
const CACHE_TTL_MS = 15 * 60 * 1000;
const feedCache = new Map<string, CachedFeed>();

/**
 * Clear expired entries from the cache
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [url, cached] of feedCache.entries()) {
    if (now - cached.cachedAt > CACHE_TTL_MS) {
      feedCache.delete(url);
    }
  }
}

/**
 * Get cached feed if available and not expired
 */
function getCachedFeed(url: string): CachedFeed | null {
  const cached = feedCache.get(url);
  if (!cached) return null;

  const age = Date.now() - cached.cachedAt;
  if (age > CACHE_TTL_MS) {
    feedCache.delete(url);
    return null;
  }

  return cached;
}

/**
 * Store feed in cache
 */
function setCachedFeed(url: string, items: RssItem[], fetchState: Partial<SourceFetchState>): void {
  // Clean up old entries periodically
  if (feedCache.size > 50) {
    cleanExpiredCache();
  }

  feedCache.set(url, {
    items,
    fetchState,
    cachedAt: Date.now(),
  });
}

// ============================================================================
// RSS Parser Instance
// ============================================================================

const parser = new Parser({
  timeout: 30000, // 30 second timeout
  headers: {
    "User-Agent": "InsuranceNewsAI/1.0 (+https://insurance-news-ai.web.app)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
  customFields: {
    item: [
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
    ],
  },
});

// ============================================================================
// Fetch Functions
// ============================================================================

/**
 * Fetch RSS feed with conditional GET support and caching.
 *
 * @param feedUrl - The RSS feed URL
 * @param fetchState - Previous fetch state with ETag/Last-Modified
 * @param options - Fetch options
 * @returns FetchResult with items and new fetch state
 */
export async function fetchRssFeed(
  feedUrl: string,
  fetchState: SourceFetchState,
  options?: { skipCache?: boolean }
): Promise<FetchResult> {
  try {
    // Check cache first (unless explicitly skipped)
    if (!options?.skipCache) {
      const cached = getCachedFeed(feedUrl);
      if (cached) {
        return {
          success: true,
          notModified: false,
          items: cached.items,
          newFetchState: cached.fetchState,
          cached: true,
        };
      }
    }

    // Build conditional request headers
    const headers: Record<string, string> = {
      "User-Agent": "InsuranceNewsAI/1.0 (+https://insurance-news-ai.web.app)",
      Accept: "application/rss+xml, application/xml, text/xml",
    };

    if (fetchState.etag) {
      headers["If-None-Match"] = fetchState.etag;
    }
    if (fetchState.lastModified) {
      headers["If-Modified-Since"] = fetchState.lastModified;
    }

    // Fetch the feed
    const response = await fetch(feedUrl, {
      method: "GET",
      headers,
    });

    // Handle 304 Not Modified
    if (response.status === 304) {
      return {
        success: true,
        notModified: true,
        items: [],
        newFetchState: {
          lastFetchedAt: null, // Will be set to serverTimestamp by caller
          lastError: null,
        },
      };
    }

    // Handle non-success status
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse the feed
    const feedText = await response.text();
    const feed = await parser.parseString(feedText);

    // Extract new fetch state from headers
    const newEtag = response.headers.get("etag");
    const newLastModified = response.headers.get("last-modified");

    const newFetchState = {
      etag: newEtag || fetchState.etag,
      lastModified: newLastModified || fetchState.lastModified,
      lastFetchedAt: null, // Will be set to serverTimestamp by caller
      lastError: null,
    };

    const items = feed.items as RssItem[];

    // Cache the result
    setCachedFeed(feedUrl, items, newFetchState);

    return {
      success: true,
      notModified: false,
      items,
      newFetchState,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      notModified: false,
      items: [],
      newFetchState: {
        lastFetchedAt: null,
        lastError: errorMessage,
      },
      error: errorMessage,
    };
  }
}

/**
 * Extract image URL from RSS item.
 * Checks multiple possible locations for image.
 */
export function extractImageUrl(item: RssItem): string | null {
  // Check enclosure (common for images)
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return item.enclosure.url;
  }

  // Check media:content
  if (item["media:content"]?.$?.url) {
    return item["media:content"].$.url;
  }

  // Check media:thumbnail
  if (item["media:thumbnail"]?.$?.url) {
    return item["media:thumbnail"].$.url;
  }

  return null;
}

// ============================================================================
// Open Graph Image Extraction
// ============================================================================

/** Timeout for og:image fetch requests (ms) */
const OG_IMAGE_FETCH_TIMEOUT_MS = 5000;

/** Maximum HTML bytes to read when looking for og:image (64KB should be enough for <head>) */
const OG_IMAGE_MAX_BYTES = 65536;

/**
 * Fetch og:image from an article page.
 *
 * This function fetches the article URL and extracts the og:image meta tag.
 * It's designed to be fast and robust:
 * - Uses a short timeout to avoid blocking ingestion
 * - Only reads the first 64KB of the page (enough for <head>)
 * - Handles various og:image meta tag formats
 * - Returns null on any error (never throws)
 *
 * @param articleUrl - The article URL to fetch
 * @returns The og:image URL or null if not found/error
 */
export async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OG_IMAGE_FETCH_TIMEOUT_MS);

    const response = await fetch(articleUrl, {
      method: "GET",
      headers: {
        "User-Agent": "InsuranceNewsAI/1.0 (+https://insurance-news-ai.web.app)",
        "Accept": "text/html",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    // Read only the first chunk of the response (enough for <head>)
    const reader = response.body?.getReader();
    if (!reader) {
      return null;
    }

    let html = "";
    let bytesRead = 0;

    while (bytesRead < OG_IMAGE_MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;

      html += new TextDecoder().decode(value);
      bytesRead += value.length;

      // Early exit if we've passed </head> - no need to read more
      if (html.includes("</head>")) {
        break;
      }
    }

    // Cancel the rest of the response to free resources
    reader.cancel().catch(() => {});

    // Extract og:image using regex patterns (also try twitter:image as fallback)
    // Pattern 1: <meta property="og:image" content="...">
    // Pattern 2: <meta content="..." property="og:image">
    // Pattern 3: <meta name="og:image" content="...">
    // Pattern 4-6: Same patterns for twitter:image
    const imagePatterns = [
      // og:image patterns (preferred)
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']og:image["']/i,
      // twitter:image patterns (fallback)
      /<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']twitter:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];

    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const imageUrl = match[1].trim();
        // Skip placeholder/undefined values
        if (imageUrl === "undefined" || imageUrl === "null" || imageUrl === "") {
          continue;
        }
        // Validate it looks like a URL
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          return imageUrl;
        }
        // Handle protocol-relative URLs
        if (imageUrl.startsWith("//")) {
          return "https:" + imageUrl;
        }
      }
    }

    return null;
  } catch {
    // Silently fail - og:image is optional enhancement
    return null;
  }
}

