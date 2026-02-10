/**
 * Embeddings Module
 *
 * Provides vector embeddings for articles using OpenAI's text-embedding-3-small model.
 * Uses reduced dimensions (256) to keep Firestore document sizes small.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { getOpenAIClient } from "../ai/openai-client.js";
import type { Article, ArticleEmbedding } from "../../types/firestore.js";

// ============================================================================
// Constants
// ============================================================================

/** Default embedding model */
export const EMBEDDING_MODEL = "text-embedding-3-small";

/** Default embedding dimensions (reduced from 1536 default to save storage) */
export const DEFAULT_EMBEDDING_DIMS = 256;

/** Stopwords to filter from search tokens */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "he", "in", "is", "it", "its", "of", "on", "or",
  "that", "the", "to", "was", "were", "will", "with", "this", "their",
  "they", "but", "not", "what", "who", "which", "when", "where", "how",
  "all", "been", "being", "had", "her", "him", "his", "more", "new",
  "one", "our", "out", "said", "she", "some", "than", "them", "then",
  "there", "these", "we", "you", "your", "can", "could", "into", "may",
  "no", "so", "up", "very", "would", "about", "after", "also", "any",
  "back", "because", "do", "first", "get", "go", "just", "know", "like",
  "make", "most", "now", "only", "other", "over", "see", "such", "take",
  "through", "two", "way", "well", "work", "year", "years",
]);

// ============================================================================
// Embedding Functions
// ============================================================================

/**
 * Generate an embedding for the given text using OpenAI's embedding API.
 *
 * @param text - The text to embed
 * @param dims - Number of dimensions for the embedding (default: 256)
 * @returns The embedding vector
 */
export async function embedText(
  text: string,
  dims: number = DEFAULT_EMBEDDING_DIMS
): Promise<number[]> {
  const openai = getOpenAIClient();

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: dims,
  });

  return response.data[0].embedding;
}

/**
 * Generate search tokens from article content.
 * Used for lexical narrowing before semantic search.
 *
 * @param article - The article to generate tokens from
 * @returns Array of lowercase tokens
 */
export function generateSearchTokens(article: {
  title: string;
  snippet: string;
  ai?: { topics?: string[] } | null;
}): string[] {
  const text = [
    article.title,
    article.snippet,
    ...(article.ai?.topics || []),
  ].join(" ");

  // Tokenize: lowercase, split on non-word characters, filter
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => {
      // Must be at least 2 characters
      if (token.length < 2) return false;
      // Must not be a stopword
      if (STOPWORDS.has(token)) return false;
      // Must not be purely numeric
      if (/^\d+$/.test(token)) return false;
      return true;
    });

  // Deduplicate and limit
  const uniqueTokens = [...new Set(tokens)];
  return uniqueTokens.slice(0, 50); // Limit to 50 tokens
}

/**
 * Ensure an article has both embedding and searchTokens.
 * Computes and stores them if missing.
 *
 * @param articleId - The article document ID
 * @returns Object indicating what was computed
 */
export async function ensureArticleVector(articleId: string): Promise<{
  embeddingComputed: boolean;
  searchTokensComputed: boolean;
  skipped: boolean;
  reason?: string;
}> {
  const db = getFirestore();
  const articleRef = db.collection("articles").doc(articleId);
  const articleDoc = await articleRef.get();

  if (!articleDoc.exists) {
    return { embeddingComputed: false, searchTokensComputed: false, skipped: true, reason: "not_found" };
  }

  const article = articleDoc.data() as Article;

  // Skip if not relevant
  if (!article.isRelevant) {
    return { embeddingComputed: false, searchTokensComputed: false, skipped: true, reason: "not_relevant" };
  }

  const updates: Record<string, unknown> = {};
  let embeddingComputed = false;
  let searchTokensComputed = false;

  // Compute searchTokens if missing
  if (!article.searchTokens || article.searchTokens.length === 0) {
    const tokens = generateSearchTokens(article);
    updates.searchTokens = tokens;
    searchTokensComputed = true;
    logger.debug("Generated searchTokens", { articleId, tokenCount: tokens.length });
  }

  // Compute embedding if missing
  if (!article.embedding) {
    const textToEmbed = `${article.title}\n${article.snippet}`;
    const vector = await embedText(textToEmbed, DEFAULT_EMBEDDING_DIMS);

    const embedding: ArticleEmbedding = {
      dims: DEFAULT_EMBEDDING_DIMS,
      vector,
      model: EMBEDDING_MODEL,
      updatedAt: Timestamp.now(),
    };

    updates.embedding = embedding;
    embeddingComputed = true;
    logger.debug("Generated embedding", { articleId, dims: DEFAULT_EMBEDDING_DIMS });
  }

  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    await articleRef.update(updates);
  }

  return { embeddingComputed, searchTokensComputed, skipped: false };
}

