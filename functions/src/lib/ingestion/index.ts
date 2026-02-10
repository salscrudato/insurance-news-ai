/**
 * RSS Ingestion Module Exports
 */

export {
  ingestAllEnabledSources,
  ingestSource,
  type IngestionResult,
  type IngestionSummary,
} from "./ingest.js";

export { calculateRelevance, classifyCategories } from "./relevance.js";

export { fetchRssFeed, extractImageUrl, fetchOgImage, type RssItem } from "./rss-fetcher.js";

export {
  normalizeUrl,
  sha256Hash,
  generateArticleId,
  truncateText,
  stripHtml,
} from "./url-utils.js";

