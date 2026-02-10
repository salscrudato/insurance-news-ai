/**
 * Regenerate Brief Script
 * Deletes existing brief and regenerates with current articles
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";
import {
  AI_MODEL,
  DAILY_BRIEF_SCHEMA,
  DAILY_BRIEF_SYSTEM,
  buildDailyBriefPrompt,
  type DailyBriefResponse,
} from "../lib/ai/index.js";
import type { Article, Brief } from "../types/firestore.js";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

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

async function main(): Promise<void> {
  const dateKey = process.argv[2] || getTodayDateET();
  console.log(`🔄 Regenerating brief for ${dateKey}...\n`);

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error("❌ OPENAI_API_KEY not set");
    process.exit(1);
  }

  // Delete existing brief
  const briefRef = db.collection("briefs").doc(dateKey);
  const existing = await briefRef.get();
  if (existing.exists) {
    console.log("🗑️  Deleting existing brief...");
    await briefRef.delete();
  }

  // Fetch articles from last 7 days (more generous window)
  const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // First try with isRelevant filter
  let articlesSnap = await db
    .collection("articles")
    .where("isRelevant", "==", true)
    .where("publishedAt", ">=", Timestamp.fromDate(cutoffTime))
    .orderBy("publishedAt", "desc")
    .limit(60)
    .get();

  // If not enough relevant articles, get all articles
  if (articlesSnap.size < 10) {
    console.log(`⚠️  Only ${articlesSnap.size} relevant articles, fetching all articles...`);
    articlesSnap = await db
      .collection("articles")
      .where("publishedAt", ">=", Timestamp.fromDate(cutoffTime))
      .orderBy("publishedAt", "desc")
      .limit(60)
      .get();
  }

  console.log(`📰 Found ${articlesSnap.size} articles for brief generation`);

  if (articlesSnap.empty) {
    console.log("❌ No articles found");
    return;
  }

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
  console.log("🤖 Calling OpenAI to generate brief...");

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

  console.log(`\n✅ Brief regenerated for ${dateKey}!`);
  console.log(`   - ${brief.executiveSummary.length} summary items`);
  console.log(`   - ${brief.topStories.length} top stories`);
  console.log(`   - ${brief.topics.length} topics`);
  console.log(`   - ${brief.sourceArticleIds.length} source articles`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });

