/**
 * Firebase Cloud Functions (v2)
 */

import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { isAdminEmail } from "./config/admin.js";
import { ingestAllEnabledSources, fetchOgImage } from "./lib/ingestion/index.js";
import {
  ensureArticleVector,
  EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_DIMS,
} from "./lib/embeddings/index.js";
import {
  getOpenAIClient,
  openaiApiKey,
  AI_MODEL,
  AI_MODEL_PREMIUM,
  ARTICLE_AI_SCHEMA,
  DAILY_BRIEF_SCHEMA,
  ARTICLE_SUMMARIZE_SYSTEM,
  DAILY_BRIEF_SYSTEM,
  buildArticleSummarizePrompt,
  buildDailyBriefPrompt,
  checkRateLimit,
  selectArticlesForBrief,
  logSelectionMetrics,
  type ArticleAIResponse,
  type DailyBriefResponse,
} from "./lib/ai/index.js";
import {
  answerQuestion,
  performRetrieval,
  streamRagAnswer,
  type RagScope,
  type ChatMessage,
} from "./lib/rag/index.js";
import {
  sendNotificationToOptedInUsers,
  formatDateForNotification,
} from "./lib/notifications/index.js";
import type { Article, Brief } from "./types/firestore.js";

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * Health check endpoint
 * Returns { ok: true, ts: <ISO timestamp> }
 */
export const apiHealth = onRequest((req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
  });
});

// ============================================================================
// Admin Functions
// ============================================================================

interface AdminSetSourceEnabledData {
  sourceId: string;
  enabled: boolean;
}

/**
 * Admin-only callable function to enable/disable a source
 *
 * Requires:
 * - Authenticated user
 * - User email in admin allowlist
 *
 * @param sourceId - The source document ID
 * @param enabled - Whether to enable or disable the source
 */
export const adminSetSourceEnabled = onCall<AdminSetSourceEnabledData>(
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to perform this action."
      );
    }

    // Check admin privileges
    const userEmail = request.auth.token.email;
    if (!isAdminEmail(userEmail)) {
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to perform this action."
      );
    }

    // Validate input
    const { sourceId, enabled } = request.data;

    if (typeof sourceId !== "string" || sourceId.trim() === "") {
      throw new HttpsError(
        "invalid-argument",
        "sourceId must be a non-empty string."
      );
    }

    if (typeof enabled !== "boolean") {
      throw new HttpsError("invalid-argument", "enabled must be a boolean.");
    }

    // Check if source exists
    const sourceRef = db.collection("sources").doc(sourceId);
    const sourceDoc = await sourceRef.get();

    if (!sourceDoc.exists) {
      throw new HttpsError("not-found", `Source "${sourceId}" not found.`);
    }

    // Update the source
    await sourceRef.update({
      enabled,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(
      `[Admin] ${userEmail} set source "${sourceId}" enabled=${enabled}`
    );

    return {
      success: true,
      sourceId,
      enabled,
      updatedBy: userEmail,
    };
  }
);

// ============================================================================
// Scheduled RSS Ingestion
// ============================================================================

/**
 * Scheduled function that runs every 60 minutes to ingest RSS feeds.
 *
 * - Fetches all enabled sources
 * - Uses conditional GET (ETag/Last-Modified) to minimize bandwidth
 * - Parses items, filters for P&C relevance, deduplicates
 * - Stores articles in Firestore
 */
export const ingestRssFeeds = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "America/New_York",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes max
  },
  async () => {
    console.log("[ingestRssFeeds] Starting scheduled ingestion...");

    try {
      const summary = await ingestAllEnabledSources();

      // Log individual source errors
      const failedSources = summary.results.filter((r) => !r.success);
      for (const result of failedSources) {
        console.error(
          `[ingestRssFeeds] Source "${result.sourceName}" failed: ${result.error}`
        );
      }

      // Clear success/failure summary for easy log parsing
      if (failedSources.length === 0) {
        console.log(
          `[ingestRssFeeds] ✓ SUCCESS: Completed in ${summary.durationMs}ms. ` +
            `Sources: ${summary.sourcesProcessed}, ` +
            `Fetched: ${summary.totalItemsFetched}, ` +
            `Ingested: ${summary.totalItemsIngested}`
        );
      } else {
        console.log(
          `[ingestRssFeeds] ⚠ PARTIAL: ${failedSources.length}/${summary.sourcesProcessed} sources failed. ` +
            `Completed in ${summary.durationMs}ms. ` +
            `Fetched: ${summary.totalItemsFetched}, ` +
            `Ingested: ${summary.totalItemsIngested}`
        );
      }
    } catch (error) {
      console.error(
        "[ingestRssFeeds] ✗ FAILURE: Unexpected error during ingestion:",
        error instanceof Error ? error.message : error
      );
      throw error; // Re-throw so Cloud Functions marks the execution as failed
    }
  }
);

/**
 * Admin-only callable function to backfill articles from the last 7 days.
 *
 * This is intended for one-time use after initial deployment to populate
 * the database with recent articles from all enabled sources.
 */
export const adminBackfillLast7Days = onCall(
  {
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to perform this action."
      );
    }

    // Check admin privileges
    const userEmail = request.auth.token.email;
    if (!isAdminEmail(userEmail)) {
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to perform this action."
      );
    }

    console.log(`[adminBackfillLast7Days] Started by ${userEmail}`);

    // Run ingestion with 7-day lookback
    const summary = await ingestAllEnabledSources({
      maxAgeDays: 7,
      forceRefresh: true,
    });

    console.log(
      `[adminBackfillLast7Days] Completed in ${summary.durationMs}ms. ` +
        `Sources: ${summary.sourcesProcessed}, ` +
        `Ingested: ${summary.totalItemsIngested}`
    );

    return {
      success: true,
      startedAt: summary.startedAt.toISOString(),
      completedAt: summary.completedAt.toISOString(),
      durationMs: summary.durationMs,
      sourcesProcessed: summary.sourcesProcessed,
      totalItemsFetched: summary.totalItemsFetched,
      totalItemsIngested: summary.totalItemsIngested,
      results: summary.results.map((r) => ({
        sourceId: r.sourceId,
        sourceName: r.sourceName,
        success: r.success,
        itemsIngested: r.itemsIngested,
        itemsSkipped: r.itemsSkipped,
        itemsDuplicate: r.itemsDuplicate,
        error: r.error,
      })),
      triggeredBy: userEmail,
    };
  }
);

/**
 * HTTP endpoint to manually trigger ingestion (for testing).
 * Requires admin authentication via query parameter.
 */
export const triggerIngestion = onRequest(
  {
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (req, res) => {
    // Simple API key check for manual triggers
    const apiKey = req.query.key;
    if (apiKey !== process.env.INGESTION_API_KEY && !process.env.FUNCTIONS_EMULATOR) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    console.log("[triggerIngestion] Manual ingestion triggered");

    const maxAgeDays = parseInt(req.query.days as string) || 7;

    const summary = await ingestAllEnabledSources({ maxAgeDays });

    res.json({
      success: true,
      durationMs: summary.durationMs,
      sourcesProcessed: summary.sourcesProcessed,
      totalItemsFetched: summary.totalItemsFetched,
      totalItemsIngested: summary.totalItemsIngested,
      results: summary.results,
    });
  }
);

/**
 * Admin-only callable function to backfill missing images for existing articles.
 *
 * Fetches og:image from article pages for articles that don't have an imageUrl.
 * Processes in batches to avoid timeout.
 */
export const adminBackfillMissingImages = onCall(
  {
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to perform this action."
      );
    }

    const userEmail = request.auth.token.email || "";
    if (!isAdminEmail(userEmail)) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can backfill images."
      );
    }

    console.log(`[adminBackfillMissingImages] Started by ${userEmail}`);

    // Get articles without images from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const articlesSnap = await db
      .collection("articles")
      .where("imageUrl", "==", null)
      .where("publishedAt", ">=", Timestamp.fromDate(thirtyDaysAgo))
      .limit(100) // Process in batches
      .get();

    console.log(
      `[adminBackfillMissingImages] Found ${articlesSnap.size} articles without images`
    );

    let updated = 0;
    let failed = 0;

    for (const doc of articlesSnap.docs) {
      const article = doc.data();
      const url = article.url;

      if (!url) {
        failed++;
        continue;
      }

      try {
        const imageUrl = await fetchOgImage(url);
        if (imageUrl) {
          await doc.ref.update({ imageUrl });
          updated++;
          console.log(`[adminBackfillMissingImages] Updated ${doc.id}: ${imageUrl}`);
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        console.error(`[adminBackfillMissingImages] Error for ${doc.id}:`, error);
      }
    }

    console.log(
      `[adminBackfillMissingImages] Completed. Updated: ${updated}, Failed: ${failed}`
    );

    return {
      success: true,
      articlesProcessed: articlesSnap.size,
      updated,
      failed,
      triggeredBy: userEmail,
    };
  }
);

// ============================================================================
// AI Functions
// ============================================================================

interface GetOrCreateArticleAIData {
  articleId: string;
}

/**
 * Generate or retrieve cached AI summary for an article.
 *
 * Requires authentication. Rate limited per user.
 * Uses OpenAI gpt-4o-mini with structured output.
 *
 * @param articleId - The article document ID
 * @returns AI-generated content (tldr, whyItMatters, topics, category)
 */
export const getOrCreateArticleAI = onCall<GetOrCreateArticleAIData>(
  {
    secrets: [openaiApiKey],
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to use this feature."
      );
    }

    const uid = request.auth.uid;
    const { articleId } = request.data;

    // Validate input
    if (typeof articleId !== "string" || articleId.trim() === "") {
      throw new HttpsError(
        "invalid-argument",
        "articleId must be a non-empty string."
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(uid, "articleAI");
    if (!rateLimit.isAllowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily limit reached. Try again tomorrow. (${rateLimit.limit} requests/day)`
      );
    }

    // Fetch article
    const articleDoc = await db.collection("articles").doc(articleId).get();
    if (!articleDoc.exists) {
      throw new HttpsError("not-found", `Article "${articleId}" not found.`);
    }

    const article = articleDoc.data() as Article;

    // Return cached AI if exists
    if (article.ai) {
      console.log(`[getOrCreateArticleAI] Returning cached AI for ${articleId}`);
      return {
        cached: true,
        ai: {
          tldr: article.ai.tldr,
          whyItMatters: article.ai.whyItMatters,
          topics: article.ai.topics,
          category: article.ai.category,
          generatedAt: article.ai.generatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          model: article.ai.model,
        },
        remaining: rateLimit.remaining,
      };
    }

    // Generate AI summary
    console.log(`[getOrCreateArticleAI] Generating AI for ${articleId}`);

    const openai = getOpenAIClient();

    const prompt = buildArticleSummarizePrompt({
      title: article.title,
      snippet: article.snippet,
      sourceName: article.sourceName,
      publishedAt: article.publishedAt?.toDate?.()?.toISOString()?.split("T")[0] ?? "unknown",
      url: article.url,
    });

    let response;
    try {
      response = await openai.responses.create({
        model: AI_MODEL,
        max_output_tokens: 800,
        input: [
          { role: "system", content: ARTICLE_SUMMARIZE_SYSTEM },
          { role: "user", content: prompt },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "article_ai",
            schema: ARTICLE_AI_SCHEMA,
            strict: true,
          },
        },
      });
    } catch (openaiError) {
      console.error("[getOrCreateArticleAI] OpenAI API error:", openaiError instanceof Error ? openaiError.message : "Unknown error");
      throw new HttpsError("internal", "AI service is temporarily unavailable. Please try again.");
    }

    // Parse structured output
    const outputText = response.output_text;
    let aiResult: ArticleAIResponse;
    try {
      aiResult = JSON.parse(outputText) as ArticleAIResponse;
    } catch (parseError) {
      const truncatedOutput = outputText?.slice(0, 500) ?? "(empty response)";
      console.error(
        "[getOrCreateArticleAI] Failed to parse AI response as ArticleAIResponse JSON.",
        "Expected: { tldr: string, whyItMatters: string, topics: string[], category: string }.",
        `Parse error: ${parseError instanceof Error ? parseError.message : "unknown"}`,
        `Raw response (first 500 chars): ${truncatedOutput}`
      );
      throw new HttpsError("internal", "Failed to parse AI response as valid JSON");
    }

    // Save to Firestore
    const now = Timestamp.now();
    await articleDoc.ref.update({
      ai: {
        tldr: aiResult.tldr,
        whyItMatters: aiResult.whyItMatters,
        topics: aiResult.topics,
        category: aiResult.category,
        generatedAt: now,
        model: AI_MODEL,
      },
    });

    console.log(`[getOrCreateArticleAI] Saved AI for ${articleId}`);

    return {
      cached: false,
      ai: {
        tldr: aiResult.tldr,
        whyItMatters: aiResult.whyItMatters,
        topics: aiResult.topics,
        category: aiResult.category,
        generatedAt: now.toDate().toISOString(),
        model: AI_MODEL,
      },
      remaining: rateLimit.remaining,
    };
  }
);

// ============================================================================
// Daily Brief Functions
// ============================================================================

/**
 * Get today's date in America/New_York timezone formatted as yyyy-mm-dd
 */
function getTodayDateET(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // returns yyyy-mm-dd
}

/**
 * Scheduled function to generate daily brief at 6:00 AM ET
 *
 * - Fetches articles from last 24-36 hours
 * - Uses OpenAI to synthesize a brief
 * - Stores in briefs/{yyyy-mm-dd}
 * - Safe regeneration: skips if brief already exists
 */
export const generateDailyBrief = onSchedule(
  {
    schedule: "0 0 * * *", // 12:00 AM (midnight) daily
    timeZone: "America/New_York",
    secrets: [openaiApiKey],
  },
  async () => {
    const dateKey = getTodayDateET();
    console.log(`[generateDailyBrief] Starting brief generation for ${dateKey}`);

    // Check if brief already exists
    const briefRef = db.collection("briefs").doc(dateKey);
    const existingBrief = await briefRef.get();

    if (existingBrief.exists) {
      console.log(`[generateDailyBrief] Brief already exists for ${dateKey}, skipping`);
      return;
    }

    // Fetch articles from last 36 hours (get more candidates for filtering)
    const cutoffTime = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const articlesSnap = await db
      .collection("articles")
      .where("isRelevant", "==", true)
      .where("publishedAt", ">=", Timestamp.fromDate(cutoffTime))
      .orderBy("publishedAt", "desc")
      .limit(100) // Fetch more to allow relevance gate filtering
      .get();

    if (articlesSnap.empty) {
      console.log(`[generateDailyBrief] No relevant articles found for ${dateKey}`);
      return;
    }

    console.log(`[generateDailyBrief] Found ${articlesSnap.size} candidate articles`);

    // Apply relevance gate: prioritize by score, ensure diversity
    const rawArticles = articlesSnap.docs.map((doc) => {
      const data = doc.data() as Article;
      return { ...data, id: doc.id };
    });

    const { articles: selectedArticles, metrics } = selectArticlesForBrief(rawArticles);
    logSelectionMetrics("generateDailyBrief", metrics);

    if (selectedArticles.length === 0) {
      console.log(`[generateDailyBrief] No articles passed relevance gate for ${dateKey}`);
      return;
    }

    // Prepare article data for prompt
    const articles = selectedArticles.map((a) => ({
      id: a.id,
      title: a.title,
      sourceName: a.sourceName,
      sourceId: a.sourceId,
      snippet: a.snippet,
    }));

    // Build sources used map
    const sourceMap = new Map<string, string>();
    articles.forEach((a) => {
      if (!sourceMap.has(a.sourceId)) {
        sourceMap.set(a.sourceId, a.sourceName);
      }
    });

    // Generate brief using OpenAI
    const openai = getOpenAIClient();
    const prompt = buildDailyBriefPrompt(dateKey, articles);

    console.log("[generateDailyBrief] Calling OpenAI with premium model...");

    const response = await openai.responses.create({
      model: AI_MODEL_PREMIUM,
      max_output_tokens: 4000,
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

    // Parse structured output
    const outputText = response.output_text;
    let briefData: DailyBriefResponse;
    try {
      briefData = JSON.parse(outputText) as DailyBriefResponse;
    } catch (parseError) {
      const truncatedOutput = outputText?.slice(0, 500) ?? "(empty response)";
      console.error(
        "[generateDailyBrief] Failed to parse AI response as DailyBriefResponse JSON.",
        "Expected: { executiveSummary, topStories, sections, signals, watchlistMentions }.",
        `Parse error: ${parseError instanceof Error ? parseError.message : "unknown"}`,
        `Raw response (first 500 chars): ${truncatedOutput}`
      );
      throw new Error("Failed to parse AI response for daily brief");
    }

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
      model: AI_MODEL_PREMIUM,
    };

    // Save to Firestore
    await briefRef.set(brief);

    // Send push notifications to opted-in users
    let notificationInfo = "";
    try {
      const formattedDate = formatDateForNotification(dateKey);
      const notificationResult = await sendNotificationToOptedInUsers({
        title: "Morning Brief",
        body: `Top P&C updates for ${formattedDate}`,
        data: {
          type: "daily_brief",
          date: dateKey,
        },
      });
      notificationInfo = ` Notifications: ${notificationResult.sent} sent, ${notificationResult.failed} failed.`;
    } catch (error) {
      // Don't fail the function if notifications fail
      console.error("[generateDailyBrief] Notification send error:", error);
      notificationInfo = " Notifications: failed to send.";
    }

    // Clear success log
    console.log(
      `[generateDailyBrief] ✓ SUCCESS for ${dateKey}: ` +
        `${brief.executiveSummary.length} summary items, ` +
        `${brief.topStories.length} top stories, ` +
        `${brief.topics.length} topics.${notificationInfo}`
    );
  }
);

/**
 * HTTP trigger to manually generate daily brief (for testing)
 */
export const triggerDailyBrief = onRequest(
  { secrets: [openaiApiKey] },
  async (req, res) => {
    // Protect against unauthorized access (gpt-4o is expensive)
    const apiKey = req.query.key;
    if (apiKey !== process.env.INGESTION_API_KEY && !process.env.FUNCTIONS_EMULATOR) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const dateKey = (req.query.date as string) || getTodayDateET();
    console.log(`[triggerDailyBrief] Manual trigger for ${dateKey}`);

    // Check if brief already exists
    const briefRef = db.collection("briefs").doc(dateKey);
    const existingBrief = await briefRef.get();

    if (existingBrief.exists) {
      res.json({
        ok: false,
        message: `Brief already exists for ${dateKey}`,
        date: dateKey,
      });
      return;
    }

    // Fetch articles from last 36 hours (get more candidates for filtering)
    const cutoffTime = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const articlesSnap = await db
      .collection("articles")
      .where("isRelevant", "==", true)
      .where("publishedAt", ">=", Timestamp.fromDate(cutoffTime))
      .orderBy("publishedAt", "desc")
      .limit(100) // Fetch more to allow relevance gate filtering
      .get();

    if (articlesSnap.empty) {
      res.json({
        ok: false,
        message: `No relevant articles found for ${dateKey}`,
        date: dateKey,
      });
      return;
    }

    console.log(`[triggerDailyBrief] Found ${articlesSnap.size} candidate articles`);

    // Apply relevance gate: prioritize by score, ensure diversity
    const rawArticles = articlesSnap.docs.map((doc) => {
      const data = doc.data() as Article;
      return { ...data, id: doc.id };
    });

    const { articles: selectedArticles, metrics } = selectArticlesForBrief(rawArticles);
    logSelectionMetrics("triggerDailyBrief", metrics);

    if (selectedArticles.length === 0) {
      res.json({
        ok: false,
        message: `No articles passed relevance gate for ${dateKey}`,
        date: dateKey,
        metrics,
      });
      return;
    }

    // Prepare article data for prompt
    const articles = selectedArticles.map((a) => ({
      id: a.id,
      title: a.title,
      sourceName: a.sourceName,
      sourceId: a.sourceId,
      snippet: a.snippet,
    }));

    // Build sources used map
    const sourceMap = new Map<string, string>();
    articles.forEach((a) => {
      if (!sourceMap.has(a.sourceId)) {
        sourceMap.set(a.sourceId, a.sourceName);
      }
    });

    // Generate brief using OpenAI with premium model
    const openai = getOpenAIClient();
    const prompt = buildDailyBriefPrompt(dateKey, articles);

    const response = await openai.responses.create({
      model: AI_MODEL_PREMIUM,
      max_output_tokens: 4000,
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

    // Parse structured output
    const outputText = response.output_text;
    let briefData: DailyBriefResponse;
    try {
      briefData = JSON.parse(outputText) as DailyBriefResponse;
    } catch (parseError) {
      const truncatedOutput = outputText?.slice(0, 500) ?? "(empty response)";
      console.error(
        "[triggerDailyBrief] Failed to parse AI response as DailyBriefResponse JSON.",
        `Parse error: ${parseError instanceof Error ? parseError.message : "unknown"}`,
        `Raw response (first 500 chars): ${truncatedOutput}`
      );
      res.status(500).json({
        ok: false,
        message: "Failed to parse AI response as valid JSON",
        date: dateKey,
      });
      return;
    }

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
      model: AI_MODEL_PREMIUM,
    };

    // Save to Firestore
    await briefRef.set(brief);

    res.json({
      ok: true,
      message: `Brief created for ${dateKey}`,
      date: dateKey,
      stats: {
        summaryItems: brief.executiveSummary.length,
        topStories: brief.topStories.length,
        topics: brief.topics.length,
        articlesUsed: brief.sourceArticleIds.length,
      },
      selectionMetrics: metrics,
    });
  }
);

interface GetTodayBriefData {
  date?: string;
}

/**
 * Callable function to get today's brief with article cards
 *
 * @param date - Optional date in yyyy-mm-dd format (defaults to today ET)
 * @returns Brief with topStories populated with full article data
 */
export const getTodayBrief = onCall<GetTodayBriefData>(async (request) => {
  const { date } = request.data || {};

  // Get date key (default to today in ET)
  const dateKey = date || getTodayDateET();

  console.log(`[getTodayBrief] Fetching brief for ${dateKey}`);

  // Fetch brief
  const briefDoc = await db.collection("briefs").doc(dateKey).get();

  if (!briefDoc.exists) {
    return {
      found: false,
      date: dateKey,
      brief: null,
      topStoriesWithArticles: [],
    };
  }

  const brief = briefDoc.data() as Brief;

  // Fetch full article data for top stories
  const topStoryIds = brief.topStories.map((s) => s.articleId);
  const articleDocs = await Promise.all(
    topStoryIds.map((id) => db.collection("articles").doc(id).get())
  );

  const topStoriesWithArticles = brief.topStories.map((story, index) => {
    const articleDoc = articleDocs[index];
    if (!articleDoc.exists) {
      return {
        ...story,
        article: null,
      };
    }

    const article = articleDoc.data() as Article;
    return {
      ...story,
      article: {
        id: articleDoc.id,
        title: article.title,
        url: article.url,
        sourceName: article.sourceName,
        sourceId: article.sourceId,
        publishedAt: article.publishedAt?.toDate?.()?.toISOString() ?? null,
        snippet: article.snippet,
        imageUrl: article.imageUrl || null,
      },
    };
  });

  return {
    found: true,
    date: dateKey,
    brief: {
      ...brief,
      createdAt: brief.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    },
    topStoriesWithArticles,
  };
});

// ============================================================================
// Articles API
// ============================================================================

interface GetArticlesData {
  category?: string;
  timeWindow?: "24h" | "7d" | "all";
  sourceIds?: string[];
  limit?: number;
  startAfterPublishedAt?: string; // ISO date string for pagination
}

/**
 * Callable function to get articles with filters
 * Used by mobile app where direct Firestore queries hang
 */
export const getArticles = onCall<GetArticlesData>(async (request) => {
  const {
    category,
    timeWindow = "7d",
    sourceIds,
    limit: requestLimit = 20,
    startAfterPublishedAt
  } = request.data || {};

  console.log("[getArticles] Fetching articles", { category, timeWindow, sourceIds, limit: requestLimit });

  // Build query
  let query = db.collection("articles").orderBy("publishedAt", "desc");

  // Time window filter
  if (timeWindow !== "all") {
    const now = new Date();
    const cutoff = timeWindow === "24h"
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    query = query.where("publishedAt", ">=", Timestamp.fromDate(cutoff));
  }

  // Category filter
  if (category && category !== "all") {
    query = query.where("categories", "array-contains", category);
  }

  // Source filter (max 10 for Firestore 'in' query)
  if (sourceIds && sourceIds.length > 0 && sourceIds.length <= 10) {
    const validSourceIds = sourceIds.filter((id) => typeof id === "string" && id.trim() !== "");
    if (validSourceIds.length > 0) {
      query = query.where("sourceId", "in", validSourceIds);
    }
  }

  // Pagination
  if (startAfterPublishedAt) {
    const startAfterDate = new Date(startAfterPublishedAt);
    if (isNaN(startAfterDate.getTime())) {
      throw new HttpsError("invalid-argument", "startAfterPublishedAt must be a valid ISO date string.");
    }
    query = query.startAfter(Timestamp.fromDate(startAfterDate));
  }

  // Limit
  const safeLimit = Math.min(requestLimit, 50);
  query = query.limit(safeLimit);

  const snapshot = await query.get();

  const articles = snapshot.docs.map((doc) => {
    const data = doc.data() as Article;
    return {
      id: doc.id,
      sourceId: data.sourceId,
      sourceName: data.sourceName,
      title: data.title,
      snippet: data.snippet,
      url: data.url,
      canonicalUrl: data.canonicalUrl,
      guid: data.guid,
      imageUrl: data.imageUrl || null,
      categories: data.categories || [],
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || null,
      ingestedAt: data.ingestedAt?.toDate?.()?.toISOString() || null,
      relevanceScore: data.relevanceScore,
      isRelevant: data.isRelevant,
      ai: data.ai || null,
    };
  });

  console.log(`[getArticles] Returning ${articles.length} articles`);

  return {
    articles,
    hasMore: articles.length === safeLimit,
  };
});

// ============================================================================
// Embeddings Functions
// ============================================================================

interface BackfillEmbeddingsData {
  limitPerRun?: number;
  daysBack?: number;
}

/**
 * Admin callable to backfill embeddings for articles.
 * Only processes isRelevant articles within the last N days.
 * Uses pagination to avoid timeouts.
 *
 * @param limitPerRun - Max articles to process per run (default: 100)
 * @param daysBack - How many days back to look (default: 30)
 */
export const backfillEmbeddingsLast30Days = onCall<BackfillEmbeddingsData>(
  {
    secrets: [openaiApiKey],
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    // Require admin
    const userEmail = request.auth.token.email;
    if (!isAdminEmail(userEmail)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const rawLimit = request.data?.limitPerRun ?? 100;
    const rawDays = request.data?.daysBack ?? 30;
    const limitPerRun = Math.min(Math.max(1, Number(rawLimit) || 100), 500);
    const daysBack = Math.min(Math.max(1, Number(rawDays) || 30), 365);

    console.log("[backfillEmbeddings] Starting backfill", {
      limitPerRun,
      daysBack,
      model: EMBEDDING_MODEL,
      dims: DEFAULT_EMBEDDING_DIMS,
    });

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    // Query articles that are relevant and published within the time range
    // and are missing embeddings
    const articlesQuery = db
      .collection("articles")
      .where("isRelevant", "==", true)
      .where("publishedAt", ">=", cutoffTimestamp)
      .orderBy("publishedAt", "desc")
      .limit(limitPerRun * 2); // Fetch more to account for already-embedded articles

    const snapshot = await articlesQuery.get();
    console.log("[backfillEmbeddings] Found articles to check", {
      count: snapshot.size,
    });

    let processed = 0;
    let embeddingsCreated = 0;
    let searchTokensCreated = 0;
    let skipped = 0;
    let alreadyHasEmbedding = 0;

    for (const doc of snapshot.docs) {
      if (processed >= limitPerRun) break;

      const article = doc.data() as Article;

      // Skip if already has embedding
      if (article.embedding) {
        alreadyHasEmbedding++;
        continue;
      }

      try {
        const result = await ensureArticleVector(doc.id);

        if (result.skipped) {
          skipped++;
        } else {
          if (result.embeddingComputed) embeddingsCreated++;
          if (result.searchTokensComputed) searchTokensCreated++;
        }

        processed++;

        // Log progress every 10 articles
        if (processed % 10 === 0) {
          console.log("[backfillEmbeddings] Progress", {
            processed,
            embeddingsCreated,
            searchTokensCreated,
          });
        }
      } catch (error) {
        console.error("[backfillEmbeddings] Error processing article", {
          articleId: doc.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        skipped++;
      }
    }

    console.log("[backfillEmbeddings] Completed", {
      processed,
      embeddingsCreated,
      searchTokensCreated,
      skipped,
      alreadyHasEmbedding,
    });

    return {
      success: true,
      processed,
      embeddingsCreated,
      searchTokensCreated,
      skipped,
      alreadyHasEmbedding,
      model: EMBEDDING_MODEL,
      dims: DEFAULT_EMBEDDING_DIMS,
    };
  }
);

/**
 * Scheduled function to continuously backfill embeddings.
 * Runs every 6 hours and processes up to 50 articles per run.
 */
export const runEmbeddingsBackfill = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "America/New_York",
    memory: "512MiB",
    timeoutSeconds: 540,
    secrets: [openaiApiKey],
  },
  async () => {
    const limitPerRun = 50;
    const daysBack = 30;

    console.log("[runEmbeddingsBackfill] Starting scheduled backfill");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    // Query articles missing embeddings
    const articlesQuery = db
      .collection("articles")
      .where("isRelevant", "==", true)
      .where("publishedAt", ">=", cutoffTimestamp)
      .orderBy("publishedAt", "desc")
      .limit(limitPerRun * 2);

    const snapshot = await articlesQuery.get();

    let processed = 0;
    let embeddingsCreated = 0;
    let searchTokensCreated = 0;

    for (const doc of snapshot.docs) {
      if (processed >= limitPerRun) break;

      const article = doc.data() as Article;
      if (article.embedding) continue;

      try {
        const result = await ensureArticleVector(doc.id);
        if (!result.skipped) {
          if (result.embeddingComputed) embeddingsCreated++;
          if (result.searchTokensComputed) searchTokensCreated++;
          processed++;
        }
      } catch (error) {
        console.error("[runEmbeddingsBackfill] Error", {
          articleId: doc.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log("[runEmbeddingsBackfill] Completed", {
      processed,
      embeddingsCreated,
      searchTokensCreated,
    });
  }
);

// ============================================================================
// RAG Chat Functions
// ============================================================================

interface AnswerQuestionRagData {
  question: string;
  scope: "today" | "7d" | "30d";
  category: string;
  sourceIds: string[] | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Answer a question using RAG (Retrieval-Augmented Generation).
 *
 * Retrieves relevant articles based on scope/category/sources,
 * reranks by semantic similarity, and generates a grounded answer
 * with citations.
 *
 * Requires authentication. Rate limited per user.
 *
 * @param question - The user's question
 * @param scope - Time window: "today" (36h), "7d", or "30d"
 * @param category - Category filter: "all" or specific category
 * @param sourceIds - Optional array of source IDs to filter by
 * @param history - Chat history (last N messages, N<=8)
 * @returns Grounded answer with citations and follow-ups
 */
export const answerQuestionRag = onCall<AnswerQuestionRagData>(
  {
    secrets: [openaiApiKey],
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    // Allow guest access for Capacitor WebView (where Firebase Auth SDK hangs)
    // Use IP-based guest ID for rate limiting when not authenticated
    let uid: string;
    if (request.auth) {
      uid = request.auth.uid;
    } else {
      // Use IP from rawRequest for guest rate limiting
      const rawIp = request.rawRequest?.headers?.["x-forwarded-for"] ||
                    request.rawRequest?.ip ||
                    "unknown";
      const clientIp = Array.isArray(rawIp) ? rawIp[0] ?? "unknown" : rawIp.split(",")[0]?.trim() ?? "unknown";
      uid = `guest_${clientIp}`;
    }

    const { question, scope, category, sourceIds, history } = request.data;

    // Validate input
    if (typeof question !== "string" || question.trim() === "") {
      throw new HttpsError(
        "invalid-argument",
        "question must be a non-empty string."
      );
    }

    if (question.length > 2000) {
      throw new HttpsError(
        "invalid-argument",
        "Question is too long. Maximum 2000 characters."
      );
    }

    if (!["today", "7d", "30d"].includes(scope)) {
      throw new HttpsError(
        "invalid-argument",
        "scope must be 'today', '7d', or '30d'."
      );
    }

    // Validate sourceIds
    if (sourceIds && (!Array.isArray(sourceIds) || sourceIds.length > 10)) {
      throw new HttpsError(
        "invalid-argument",
        "sourceIds must be an array of at most 10 source IDs."
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(uid, "answerRag");
    if (!rateLimit.isAllowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily limit reached. Try again tomorrow. (${rateLimit.limit} requests/day)`
      );
    }

    console.log("[answerQuestionRag] Processing", {
      uid,
      questionLength: question.length,
      scope,
      category,
      sourceCount: sourceIds?.length ?? "all",
      historyLength: history?.length ?? 0,
    });

    try {
      // Build scope object
      const ragScope: RagScope = {
        timeWindow: scope,
        category: category || "all",
        sourceIds: sourceIds || null,
      };

      // Sanitize history — truncate individual messages to prevent token abuse
      const MAX_HISTORY_MSG_LENGTH = 4000;
      const chatHistory: ChatMessage[] = (history || [])
        .slice(-8)
        .filter(
          (msg): msg is ChatMessage =>
            msg &&
            typeof msg.role === "string" &&
            (msg.role === "user" || msg.role === "assistant") &&
            typeof msg.content === "string"
        )
        .map((msg) => ({
          ...msg,
          content: msg.content.length > MAX_HISTORY_MSG_LENGTH
            ? msg.content.slice(0, MAX_HISTORY_MSG_LENGTH)
            : msg.content,
        }));

      // Generate answer with userId for caching
      const answer = await answerQuestion(question, ragScope, chatHistory, uid);

      console.log("[answerQuestionRag] Success", {
        answerLength: answer.answerMarkdown.length,
        citationCount: answer.citations.length,
        takeawayCount: answer.takeaways.length,
        cached: answer.cached || false,
        requestId: answer.requestId,
      });

      return {
        ...answer,
        remaining: rateLimit.remaining,
      };
    } catch (error) {
      console.error("[answerQuestionRag] Error", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new HttpsError(
        "internal",
        "Failed to generate answer. Please try again."
      );
    }
  }
);

// ============================================================================
// Streaming RAG Chat Function
// ============================================================================

/**
 * Streaming version of answerQuestionRag using Server-Sent Events (SSE).
 *
 * This endpoint:
 * 1. Verifies Firebase Auth token from Authorization header
 * 2. Performs retrieval (same as answerQuestionRag)
 * 3. Streams OpenAI response tokens as SSE events
 * 4. Sends a final "done" event with citations, takeaways, and followUps
 *
 * Client sends POST with JSON body:
 * {
 *   question: string,
 *   scope: "today" | "7d" | "30d",
 *   category: string,
 *   sourceIds: string[] | null,
 *   history: Array<{ role: "user" | "assistant"; content: string }>
 * }
 *
 * SSE events:
 * - data: {"text": "chunk"} - streamed text chunks
 * - event: done, data: {"citations": [...], "takeaways": [...], "followUps": [...], "answerMarkdown": "..."}
 */
export const answerQuestionRagStream = onRequest(
  {
    secrets: [openaiApiKey],
    memory: "512MiB",
    timeoutSeconds: 120,
    cors: true, // Enable CORS with default settings
  },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Verify Firebase Auth token (optional for Capacitor guest mode)
    const authHeader = req.headers.authorization;
    let uid: string;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await getAuth().verifyIdToken(token);
        uid = decodedToken.uid;
      } catch (error) {
        console.error("[answerQuestionRagStream] Token verification failed:", error);
        res.status(401).json({ error: "Invalid authentication token" });
        return;
      }
    } else {
      // No auth token - use IP-based guest ID for rate limiting
      // This allows Capacitor WebView guests to use the API
      const rawIp = req.headers["x-forwarded-for"] || req.ip || "unknown";
      const clientIp = Array.isArray(rawIp) ? rawIp[0] ?? "unknown" : rawIp.split(",")[0]?.trim() ?? "unknown";
      uid = `guest_${clientIp}`;
    }

    // Parse request body
    const { question, scope, category, sourceIds, history } = req.body || {};

    // Validate input
    if (typeof question !== "string" || question.trim() === "") {
      res.status(400).json({ error: "question must be a non-empty string" });
      return;
    }

    if (question.length > 2000) {
      res.status(400).json({ error: "Question is too long. Maximum 2000 characters." });
      return;
    }

    if (!["today", "7d", "30d"].includes(scope)) {
      res.status(400).json({ error: "scope must be 'today', '7d', or '30d'" });
      return;
    }

    if (sourceIds && (!Array.isArray(sourceIds) || sourceIds.length > 10)) {
      res.status(400).json({ error: "sourceIds must be an array of at most 10 source IDs." });
      return;
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(uid, "answerRag");
    if (!rateLimit.isAllowed) {
      res.status(429).json({
        error: `Daily limit reached. Try again tomorrow. (${rateLimit.limit} requests/day)`,
      });
      return;
    }

    console.log("[answerQuestionRagStream] Processing", {
      uid,
      questionLength: question.length,
      scope,
      category,
      sourceCount: sourceIds?.length ?? "all",
      historyLength: history?.length ?? 0,
    });

    try {
      // Build scope object
      const ragScope: RagScope = {
        timeWindow: scope,
        category: category || "all",
        sourceIds: sourceIds || null,
      };

      // Sanitize history — truncate individual messages to prevent token abuse
      const MAX_STREAM_HISTORY_MSG_LENGTH = 4000;
      const chatHistory: ChatMessage[] = (history || [])
        .slice(-8)
        .filter(
          (msg: unknown): msg is ChatMessage =>
            msg !== null &&
            typeof msg === "object" &&
            "role" in msg &&
            "content" in msg &&
            typeof (msg as ChatMessage).role === "string" &&
            ((msg as ChatMessage).role === "user" || (msg as ChatMessage).role === "assistant") &&
            typeof (msg as ChatMessage).content === "string"
        )
        .map((msg: ChatMessage) => ({
          ...msg,
          content: msg.content.length > MAX_STREAM_HISTORY_MSG_LENGTH
            ? msg.content.slice(0, MAX_STREAM_HISTORY_MSG_LENGTH)
            : msg.content,
        }));

      // Perform retrieval (uses hardened pipeline with input sanitization, lexical+semantic ranking)
      const retrieval = await performRetrieval(question, ragScope, chatHistory);

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

      // If retrieval was refused (input validation, insufficient context)
      if (retrieval.refused || (retrieval.noResults && retrieval.noResultsResponse)) {
        const response = retrieval.noResultsResponse;
        if (response) {
          // Send the answer as text first
          res.write(`data: ${JSON.stringify({ text: response.answerMarkdown })}\n\n`);
          // Send done event
          res.write(`event: done\ndata: ${JSON.stringify({
            citations: response.citations,
            takeaways: response.takeaways,
            followUps: response.followUps,
            answerMarkdown: response.answerMarkdown,
            refused: retrieval.refused || false,
          })}\n\n`);
        }
        console.log("[answerQuestionRagStream] Refused/NoResults", {
          refused: retrieval.refused,
          sanitizationRisk: retrieval.sanitization?.riskScore,
        });
        res.end();
        return;
      }

      // Stream the answer
      await streamRagAnswer(res, question, retrieval.context, chatHistory);

      console.log("[answerQuestionRagStream] Success", {
        contextArticles: retrieval.context.length,
      });
      res.end();
    } catch (error) {
      console.error("[answerQuestionRagStream] Error", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      // If headers haven't been sent yet, send error as JSON
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate answer. Please try again." });
      } else {
        // If streaming already started, send error as SSE event
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
        res.end();
      }
    }
  }
);

// ============================================================================
// Account Deletion (App Store Guideline 5.1.1(v))
// ============================================================================

/**
 * Delete the authenticated user's account and all associated data.
 *
 * This callable function:
 * 1. Requires authentication
 * 2. Deletes all user-owned Firestore data:
 *    - users/{uid}/prefs/*
 *    - users/{uid}/bookmarks/*
 *    - users/{uid}/pushTokens/*
 *    - users/{uid}/chatThreads/* and subcollection messages
 *    - users/{uid}/rateLimits/*
 *    - users/{uid} document itself
 * 3. Deletes the user from Firebase Auth
 *
 * Deletion is idempotent — safe to retry on partial failure.
 */
export const deleteAccount = onCall(
  {
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to delete your account."
      );
    }

    const uid = request.auth.uid;
    console.log(`[deleteAccount] Starting account deletion for uid: ${uid}`);

    const deletionResults: Record<string, { deleted: number; errors: number }> = {};

    /**
     * Helper: delete all documents in a collection (with optional subcollections)
     */
    async function deleteCollection(
      collectionPath: string,
      subcollections?: string[]
    ): Promise<{ deleted: number; errors: number }> {
      let deleted = 0;
      let errors = 0;

      const snapshot = await db.collection(collectionPath).get();

      for (const doc of snapshot.docs) {
        try {
          // Delete subcollections first
          if (subcollections) {
            for (const sub of subcollections) {
              const subPath = `${collectionPath}/${doc.id}/${sub}`;
              const subResult = await deleteCollection(subPath);
              deleted += subResult.deleted;
              errors += subResult.errors;
            }
          }
          await doc.ref.delete();
          deleted++;
        } catch (error) {
          errors++;
          console.error(`[deleteAccount] Error deleting ${collectionPath}/${doc.id}:`, error);
        }
      }

      return { deleted, errors };
    }

    try {
      // 1. Delete user preferences
      const prefsResult = await deleteCollection(`users/${uid}/prefs`);
      deletionResults["prefs"] = prefsResult;

      // 2. Delete bookmarks
      const bookmarksResult = await deleteCollection(`users/${uid}/bookmarks`);
      deletionResults["bookmarks"] = bookmarksResult;

      // 3. Delete push tokens
      const pushTokensResult = await deleteCollection(`users/${uid}/pushTokens`);
      deletionResults["pushTokens"] = pushTokensResult;

      // 4. Delete chat threads (and their messages subcollection)
      const chatThreadsResult = await deleteCollection(
        `users/${uid}/chatThreads`,
        ["messages"]
      );
      deletionResults["chatThreads"] = chatThreadsResult;

      // 5. Delete rate limits
      const rateLimitsResult = await deleteCollection(`users/${uid}/rateLimits`);
      deletionResults["rateLimits"] = rateLimitsResult;

      // 6. Delete user profile document
      try {
        const userDocRef = db.collection("users").doc(uid);
        const userDoc = await userDocRef.get();
        if (userDoc.exists) {
          await userDocRef.delete();
          deletionResults["userProfile"] = { deleted: 1, errors: 0 };
        } else {
          deletionResults["userProfile"] = { deleted: 0, errors: 0 };
        }
      } catch (error) {
        deletionResults["userProfile"] = { deleted: 0, errors: 1 };
        console.error("[deleteAccount] Error deleting user profile:", error);
      }

      // 7. Delete user from Firebase Auth
      try {
        await getAuth().deleteUser(uid);
        deletionResults["authUser"] = { deleted: 1, errors: 0 };
      } catch (error) {
        // User may already be deleted from Auth
        const authError = error as { code?: string };
        if (authError.code === "auth/user-not-found") {
          deletionResults["authUser"] = { deleted: 0, errors: 0 };
          console.log(`[deleteAccount] Auth user already deleted: ${uid}`);
        } else {
          deletionResults["authUser"] = { deleted: 0, errors: 1 };
          console.error("[deleteAccount] Error deleting Auth user:", error);
          throw new HttpsError(
            "internal",
            "Failed to delete authentication account. Please try again."
          );
        }
      }

      // Summarize results
      const totalDeleted = Object.values(deletionResults).reduce((sum, r) => sum + r.deleted, 0);
      const totalErrors = Object.values(deletionResults).reduce((sum, r) => sum + r.errors, 0);

      console.log(`[deleteAccount] ✓ Completed for ${uid}:`, {
        totalDeleted,
        totalErrors,
        details: deletionResults,
      });

      return {
        success: true,
        uid,
        totalDeleted,
        totalErrors,
        details: deletionResults,
      };
    } catch (error) {
      // If it's already an HttpsError, re-throw
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error(`[deleteAccount] ✗ Unexpected error for ${uid}:`, error);
      throw new HttpsError(
        "internal",
        "Account deletion failed. Please try again or contact support."
      );
    }
  }
);
