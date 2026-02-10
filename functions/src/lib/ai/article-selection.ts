/**
 * Article Selection for Daily Brief Generation
 *
 * Implements a "relevance gate" that prioritizes articles by:
 * 1. Relevance score (higher = more relevant to P&C)
 * 2. Category diversity (ensure coverage across P&C topics, avoid market over-weighting)
 * 3. Source diversity (avoid over-representation from one source)
 *
 * Also provides logging/metrics for debugging relevance drift.
 */

import type { Article, SourceCategory } from "../../types/firestore.js";

// Minimum relevance score for inclusion in daily brief
// Raised from 0.4 to 0.5 to tighten the relevance gate
const MIN_BRIEF_RELEVANCE_SCORE = 0.5;

// Maximum articles from a single source (prevents source over-representation)
const MAX_PER_SOURCE = 6;

// Maximum total articles to send to AI
const MAX_TOTAL_ARTICLES = 35;

// Maximum articles per category to ensure diversity
// Categories that tend to be over-represented get lower caps
const MAX_PER_CATEGORY: Record<string, number> = {
  market: 6,         // M&A/earnings often flood the feed
  insurtech: 5,      // Tech news can dominate
  regulation: 8,     // Allow more regulatory coverage
  claims: 8,         // Claims/litigation important for brief
  property: 10,      // Core P&C content
  casualty: 10,      // Core P&C content
  reinsurance: 8,    // Core P&C content
  litigation: 6,     // Subset of claims-adjacent
};

// Default cap for unlisted categories
const DEFAULT_CATEGORY_CAP = 8;

/**
 * Article with selection metadata
 */
interface ArticleWithMeta {
  id: string;
  title: string;
  sourceName: string;
  sourceId: string;
  snippet: string;
  relevanceScore: number;
  categories: SourceCategory[];
}

/**
 * Selection metrics for logging
 */
export interface SelectionMetrics {
  totalCandidates: number;
  filteredByScore: number;
  filteredByCategory: number;
  filteredBySource: number;
  selectedCount: number;
  categoryDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  avgRelevanceScore: number;
  minRelevanceScore: number;
  maxRelevanceScore: number;
  configUsed: {
    minScore: number;
    maxPerSource: number;
    maxTotal: number;
  };
}

/**
 * Get the primary category for an article (first category or 'uncategorized')
 */
function getPrimaryCategory(categories: SourceCategory[]): string {
  return categories.length > 0 ? categories[0] : "uncategorized";
}

/**
 * Check if adding an article would exceed category cap
 */
function wouldExceedCategoryCap(
  categories: SourceCategory[],
  categoryCount: Record<string, number>
): boolean {
  const primary = getPrimaryCategory(categories);
  const cap = MAX_PER_CATEGORY[primary] ?? DEFAULT_CATEGORY_CAP;
  const current = categoryCount[primary] || 0;
  return current >= cap;
}

/**
 * Select and prioritize articles for daily brief generation.
 *
 * Applies relevance gate and ensures diversity across categories and sources.
 *
 * @param rawArticles - Articles fetched from Firestore
 * @returns Selected articles for brief generation and metrics for logging
 */
export function selectArticlesForBrief(
  rawArticles: Article[]
): { articles: ArticleWithMeta[]; metrics: SelectionMetrics } {
  // Convert to selection format
  const candidates: ArticleWithMeta[] = rawArticles.map((a) => ({
    id: a.id,
    title: a.title,
    sourceName: a.sourceName,
    sourceId: a.sourceId,
    snippet: a.snippet,
    relevanceScore: a.relevanceScore,
    categories: a.categories,
  }));

  const totalCandidates = candidates.length;

  // Step 1: Filter by minimum relevance score (relevance gate)
  const highRelevance = candidates.filter(
    (a) => a.relevanceScore >= MIN_BRIEF_RELEVANCE_SCORE
  );
  const filteredByScore = totalCandidates - highRelevance.length;

  // Step 2: Sort by relevance score (descending)
  highRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Step 3: Apply diversity constraints (source + category caps)
  const selected: ArticleWithMeta[] = [];
  const categoryCount: Record<string, number> = {};
  const sourceCount: Record<string, number> = {};
  let filteredByCategory = 0;
  let filteredBySource = 0;

  for (const article of highRelevance) {
    if (selected.length >= MAX_TOTAL_ARTICLES) break;

    // Check source limit
    const srcCount = sourceCount[article.sourceId] || 0;
    if (srcCount >= MAX_PER_SOURCE) {
      filteredBySource++;
      continue;
    }

    // Check category limit (prevents market/insurtech from dominating)
    if (wouldExceedCategoryCap(article.categories, categoryCount)) {
      filteredByCategory++;
      continue;
    }

    // Add article
    selected.push(article);
    sourceCount[article.sourceId] = srcCount + 1;

    // Track category distribution (primary category only for caps)
    const primary = getPrimaryCategory(article.categories);
    categoryCount[primary] = (categoryCount[primary] || 0) + 1;
  }

  // Step 4: Compute metrics
  const relevanceScores = selected.map((a) => a.relevanceScore);
  const avgScore = relevanceScores.length > 0
    ? relevanceScores.reduce((sum, s) => sum + s, 0) / relevanceScores.length
    : 0;

  const metrics: SelectionMetrics = {
    totalCandidates,
    filteredByScore,
    filteredByCategory,
    filteredBySource,
    selectedCount: selected.length,
    categoryDistribution: categoryCount,
    sourceDistribution: sourceCount,
    avgRelevanceScore: Math.round(avgScore * 100) / 100,
    minRelevanceScore: relevanceScores.length > 0 ? Math.min(...relevanceScores) : 0,
    maxRelevanceScore: relevanceScores.length > 0 ? Math.max(...relevanceScores) : 0,
    configUsed: {
      minScore: MIN_BRIEF_RELEVANCE_SCORE,
      maxPerSource: MAX_PER_SOURCE,
      maxTotal: MAX_TOTAL_ARTICLES,
    },
  };

  return { articles: selected, metrics };
}

/**
 * Log selection metrics for debugging relevance drift
 */
export function logSelectionMetrics(prefix: string, metrics: SelectionMetrics): void {
  console.log(`[${prefix}] Article selection metrics:`);
  console.log(`  Config: minScore=${metrics.configUsed.minScore}, maxPerSource=${metrics.configUsed.maxPerSource}, maxTotal=${metrics.configUsed.maxTotal}`);
  console.log(`  Pipeline: ${metrics.totalCandidates} candidates → ${metrics.filteredByScore} filtered (score) → ${metrics.filteredByCategory} filtered (category cap) → ${metrics.filteredBySource} filtered (source cap) → ${metrics.selectedCount} selected`);
  console.log(`  Relevance: avg=${metrics.avgRelevanceScore}, min=${metrics.minRelevanceScore}, max=${metrics.maxRelevanceScore}`);
  console.log(`  Categories: ${JSON.stringify(metrics.categoryDistribution)}`);
  console.log(`  Sources: ${JSON.stringify(metrics.sourceDistribution)}`);
}

