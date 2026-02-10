/**
 * Backfill and Generate Brief Script
 *
 * One-time admin command to:
 * 1. Backfill articles from the last 7 days
 * 2. Generate today's daily brief
 *
 * Run with:
 *   cd functions
 *   npm run build
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node lib/scripts/backfill-and-brief.js
 *
 * Or with default credentials (if running on GCP or with gcloud auth):
 *   node lib/scripts/backfill-and-brief.js
 *
 * Safety:
 * - Articles are deduplicated by canonical URL hash (safe to re-run)
 * - Brief generation skips if brief already exists for today
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";
import { ingestAllEnabledSources } from "../lib/ingestion/index.js";
import {
  AI_MODEL,
  DAILY_BRIEF_SCHEMA,
  DAILY_BRIEF_SYSTEM,
  buildDailyBriefPrompt,
  type DailyBriefResponse,
} from "../lib/ai/index.js";
import type { Article, Brief } from "../types/firestore.js";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// ============================================================================
// Helper Functions
// ============================================================================

function getTodayDateET(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

// ============================================================================
// Main Script
// ============================================================================

async function main(): Promise<void> {
  console.log("🚀 Starting backfill and brief generation...\n");

  // Step 1: Backfill last 7 days
  console.log("📥 Step 1: Backfilling articles from last 7 days...\n");

  const ingestionSummary = await ingestAllEnabledSources({
    maxAgeDays: 7,
    forceRefresh: true,
  });

  console.log("\n=== Ingestion Summary ===");
  console.log(`Duration: ${ingestionSummary.durationMs}ms`);
  console.log(`Sources processed: ${ingestionSummary.sourcesProcessed}`);
  console.log(`Total items fetched: ${ingestionSummary.totalItemsFetched}`);
  console.log(`Total items ingested: ${ingestionSummary.totalItemsIngested}`);

  for (const r of ingestionSummary.results) {
    const status = r.success ? "✅" : "❌";
    console.log(
      `  ${status} ${r.sourceName}: ${r.itemsIngested} new, ${r.itemsDuplicate} duplicates`
    );
    if (r.error) console.log(`     Error: ${r.error}`);
  }

  // Step 2: Generate today's brief
  console.log("\n📝 Step 2: Generating today's brief...\n");

  const dateKey = getTodayDateET();
  const briefRef = db.collection("briefs").doc(dateKey);
  const existingBrief = await briefRef.get();

  if (existingBrief.exists) {
    console.log(`⏭️  Brief already exists for ${dateKey}, skipping generation.`);
    console.log("\n✅ Backfill complete! Brief was already generated.");
    return;
  }

  // Check for OpenAI API key
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.log("⚠️  OPENAI_API_KEY not set. Skipping brief generation.");
    console.log("   Set it with: export OPENAI_API_KEY=your-key");
    console.log("\n✅ Backfill complete! Run brief generation separately.");
    return;
  }

  // Fetch articles from last 36 hours
  const cutoffTime = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const articlesSnap = await db
    .collection("articles")
    .where("isRelevant", "==", true)
    .where("publishedAt", ">=", Timestamp.fromDate(cutoffTime))
    .orderBy("publishedAt", "desc")
    .limit(60)
    .get();

  if (articlesSnap.empty) {
    console.log(`⚠️  No relevant articles found for ${dateKey}`);
    console.log("\n✅ Backfill complete! No articles to generate brief from.");
    return;
  }

  console.log(`Found ${articlesSnap.size} articles for brief generation`);

  // Prepare article data
  const articles = articlesSnap.docs.map((doc) => {
    const data = doc.data() as Article;
    return {
      id: doc.id,
      title: data.title,
      sourceName: data.sourceName,
      sourceId: data.sourceId,
      snippet: data.snippet,
    };
  });

  // Build sources map
  const sourceMap = new Map<string, string>();
  articles.forEach((a) => {
    if (!sourceMap.has(a.sourceId)) {
      sourceMap.set(a.sourceId, a.sourceName);
    }
  });

  // Generate brief using OpenAI
  console.log("Calling OpenAI to generate brief...");

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const prompt = buildDailyBriefPrompt(dateKey, articles);

  const response = await openai.responses.create({
    model: AI_MODEL,
    input: [
      { role: "system", content: DAILY_BRIEF_SYSTEM },
      { role: "user", content: prompt },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "daily_brief",
        schema: DAILY_BRIEF_SCHEMA,
        strict: true,
      },
    },
  });

  const briefData = JSON.parse(response.output_text) as DailyBriefResponse;

  // Build the brief document
  const brief: Brief = {
    date: dateKey,
    createdAt: Timestamp.now(),
    executiveSummary: briefData.executiveSummary,
    topStories: briefData.topStories,
    sections: briefData.sections,
    topics: briefData.topics,
    sourcesUsed: Array.from(sourceMap.entries()).map(([sourceId, name]) => ({
      sourceId,
      name,
    })),
    sourceArticleIds: articles.map((a) => a.id),
    model: AI_MODEL,
  };

  // Save to Firestore
  await briefRef.set(brief);

  console.log(`\n✅ Brief created for ${dateKey}!`);
  console.log(`   - ${brief.executiveSummary.length} summary items`);
  console.log(`   - ${brief.topStories.length} top stories`);
  console.log(`   - ${brief.topics.length} topics`);
  console.log(`   - ${brief.sourceArticleIds.length} source articles`);

  console.log("\n🎉 Backfill and brief generation complete!");
}

// ============================================================================
// Run
// ============================================================================

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

