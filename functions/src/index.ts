/**
 * Firebase Cloud Functions (v2)
 */

import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { isAdminEmail } from "./config/admin.js";
import { ingestAllEnabledSources, fetchOgImage } from "./lib/ingestion/index.js";
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
          generatedAt: article.ai.generatedAt.toDate().toISOString(),
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
      publishedAt: article.publishedAt.toDate().toISOString().split("T")[0],
      url: article.url,
    });

    const response = await openai.responses.create({
      model: AI_MODEL,
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
    schedule: "0 6 * * *", // 6:00 AM daily
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
        publishedAt: article.publishedAt.toDate().toISOString(),
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
      createdAt: brief.createdAt.toDate().toISOString(),
    },
    topStoriesWithArticles,
  };
});
