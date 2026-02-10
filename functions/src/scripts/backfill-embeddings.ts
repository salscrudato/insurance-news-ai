#!/usr/bin/env node
/**
 * Backfill Embeddings Script
 *
 * Standalone script to backfill embeddings for articles.
 * Run with: npm run backfill-embeddings
 *
 * Usage:
 *   npm run backfill-embeddings              # Default: 50 articles, 30 days
 *   npm run backfill-embeddings -- --limit=100 --days=7
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";
import type { Article } from "../types/firestore.js";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// ============================================================================
// Constants
// ============================================================================

const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_DIMS = 256;

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "he", "in", "is", "it", "its", "of", "on", "or",
  "that", "the", "to", "was", "were", "will", "with", "this", "their",
  "they", "but", "not", "what", "who", "which", "when", "where", "how",
  "all", "been", "being", "had", "her", "him", "his", "more", "new",
  "one", "our", "out", "said", "she", "some", "than", "them", "then",
  "there", "these", "we", "you", "your", "can", "could", "into", "may",
  "no", "so", "up", "very", "would", "about", "after", "also", "any",
]);

// ============================================================================
// Helper Functions
// ============================================================================

function generateSearchTokens(article: { title: string; snippet: string }): string[] {
  const text = `${article.title} ${article.snippet}`;
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
  return [...new Set(tokens)].slice(0, 50);
}

async function embedText(openai: OpenAI, text: string, dims = DEFAULT_DIMS): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: dims,
  });
  return response.data[0].embedding;
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  let limit = 50;
  let daysBack = 30;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.replace("--limit=", ""), 10);
    } else if (arg.startsWith("--days=")) {
      daysBack = parseInt(arg.replace("--days=", ""), 10);
    }
  }

  console.log("\n🔢 Backfill Embeddings");
  console.log(`   Limit: ${limit} articles`);
  console.log(`   Days back: ${daysBack}`);
  console.log(`   Model: ${EMBEDDING_MODEL}`);
  console.log(`   Dimensions: ${DEFAULT_DIMS}\n`);

  // Check for OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY environment variable not set");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  // Calculate cutoff
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  // Query articles
  console.log("📋 Querying articles...");
  const snapshot = await db
    .collection("articles")
    .where("isRelevant", "==", true)
    .where("publishedAt", ">=", cutoffTimestamp)
    .orderBy("publishedAt", "desc")
    .limit(limit * 2)
    .get();

  console.log(`   Found ${snapshot.size} relevant articles to check\n`);

  let processed = 0;
  let embeddingsCreated = 0;
  let searchTokensCreated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    if (processed >= limit) break;

    const article = doc.data() as Article;

    // Skip if already has embedding
    if (article.embedding) {
      skipped++;
      continue;
    }

    try {
      const updates: Record<string, unknown> = {};

      // Generate searchTokens if missing
      if (!article.searchTokens || article.searchTokens.length === 0) {
        updates.searchTokens = generateSearchTokens(article);
        searchTokensCreated++;
      }

      // Generate embedding
      const textToEmbed = `${article.title}\n${article.snippet}`;
      const vector = await embedText(openai, textToEmbed);

      updates.embedding = {
        dims: DEFAULT_DIMS,
        vector,
        model: EMBEDDING_MODEL,
        updatedAt: Timestamp.now(),
      };
      embeddingsCreated++;

      await doc.ref.update(updates);
      processed++;

      if (processed % 10 === 0) {
        console.log(`   Progress: ${processed}/${limit} (${embeddingsCreated} embeddings)`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${doc.id}:`, error);
    }
  }

  console.log("\n✅ Completed!");
  console.log(`   Processed: ${processed}`);
  console.log(`   Embeddings created: ${embeddingsCreated}`);
  console.log(`   SearchTokens created: ${searchTokensCreated}`);
  console.log(`   Already had embedding: ${skipped}\n`);
}

main().catch(console.error);

