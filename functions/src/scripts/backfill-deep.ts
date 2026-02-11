/**
 * Deep Historical Backfill Script
 *
 * Problem: Standard RSS feeds only expose 10-30 recent items (~2 days).
 * Solution: Many WordPress-based P&C news sites support paginated RSS
 * via ?paged=N, surfacing articles weeks or months back.
 *
 * This script:
 * 1. Fetches paginated RSS from sites that support it
 * 2. Adds Reinsurance News as a new source
 * 3. Ingests articles through the standard dedup pipeline
 * 4. Then delegates to backfill-historical for brief generation
 *
 * Usage:
 *   cd functions
 *   npm run build-scripts
 *   GOOGLE_CLOUD_PROJECT=insurance-news-ai OPENAI_API_KEY=<key> \
 *     node lib/scripts/backfill-deep.js [--max-pages=10] [--max-age-days=30]
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import Parser from "rss-parser";
import type { Source, Article, SourceCategory } from "../types/firestore.js";
import {
  normalizeUrl,
  generateArticleId,
  truncateText,
  stripHtml,
} from "../lib/ingestion/url-utils.js";
import { calculateRelevance, classifyCategories } from "../lib/ingestion/relevance.js";
import { generateSearchTokens } from "../lib/embeddings/index.js";
import { extractImageUrl, fetchOgImage } from "../lib/ingestion/rss-fetcher.js";

// ============================================================================
// Init
// ============================================================================

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const parser = new Parser({
  timeout: 30000,
  headers: {
    "User-Agent": "InsuranceNewsAI/1.0 (RSS Aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

// ============================================================================
// Paginated feed sources — sites that support ?paged=N
// ============================================================================

interface PaginatedSource {
  id: string;
  name: string;
  siteUrl: string;
  baseRssUrl: string;
  tags: SourceCategory[];
  maxPages: number; // cap per source
}

const PAGINATED_SOURCES: PaginatedSource[] = [
  {
    id: "risk-and-insurance",
    name: "Risk & Insurance",
    siteUrl: "https://riskandinsurance.com",
    baseRssUrl: "https://riskandinsurance.com/feed/",
    tags: ["claims", "insurtech"],
    maxPages: 12,
  },
  {
    id: "artemis",
    name: "Artemis",
    siteUrl: "https://www.artemis.bm",
    baseRssUrl: "https://www.artemis.bm/feed/",
    tags: ["reinsurance", "property_cat"],
    maxPages: 12,
  },
  {
    id: "reinsurance-news",
    name: "Reinsurance News",
    siteUrl: "https://www.reinsurancene.ws",
    baseRssUrl: "https://www.reinsurancene.ws/feed/",
    tags: ["reinsurance", "property_cat"],
    maxPages: 12,
  },
];

// ============================================================================
// Helpers
// ============================================================================

function parseArgs(): { maxPages: number; maxAgeDays: number } {
  const args = process.argv.slice(2);
  let maxPages = 10;
  let maxAgeDays = 30;

  for (const arg of args) {
    if (arg.startsWith("--max-pages=")) {
      maxPages = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--max-age-days=")) {
      maxAgeDays = parseInt(arg.split("=")[1], 10);
    }
  }

  return { maxPages: Math.min(maxPages, 20), maxAgeDays: Math.min(maxAgeDays, 60) };
}

// ============================================================================
// Ensure source exists in Firestore
// ============================================================================

async function ensureSourceExists(src: PaginatedSource): Promise<Source> {
  const ref = db.collection("sources").doc(src.id);
  const doc = await ref.get();

  if (doc.exists) {
    return { id: doc.id, ...doc.data() } as Source;
  }

  // Create the source
  const now = Timestamp.now();
  const sourceData = {
    id: src.id,
    name: src.name,
    siteUrl: src.siteUrl,
    rssUrl: src.baseRssUrl,
    enabled: true,
    enabledByDefault: true,
    tier: "reputable",
    tags: src.tags,
    createdAt: now,
    updatedAt: now,
    fetchState: {
      etag: null,
      lastModified: null,
      lastFetchedAt: null,
      lastError: null,
    },
  };

  await ref.set(sourceData);
  console.log(`    ✨ Created new source: ${src.name}`);

  return sourceData as unknown as Source;
}

// ============================================================================
// Ingest a single RSS item (reuses same logic as main ingestion engine)
// ============================================================================

async function ingestItem(
  item: Parser.Item,
  source: Source,
  cutoffDate: Date,
): Promise<"ingested" | "skipped" | "duplicate"> {
  if (!item.link || !item.title) return "skipped";

  const pubDateStr = item.isoDate || item.pubDate;
  if (!pubDateStr) return "skipped";

  const pubDate = new Date(pubDateStr);
  if (isNaN(pubDate.getTime())) return "skipped";
  if (pubDate < cutoffDate) return "skipped";

  // Dedup by canonical URL hash
  const articleId = generateArticleId(item.link);
  const existingDoc = await db.collection("articles").doc(articleId).get();
  if (existingDoc.exists) return "duplicate";

  const rawSnippet = item.contentSnippet || item.summary || item.content || "";
  const snippet = truncateText(stripHtml(rawSnippet), 200);
  const relevance = calculateRelevance(item.title, snippet, source.tags);
  const categories = classifyCategories(item.title, snippet, source.tags);

  // Extract image
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let imageUrl = extractImageUrl(item as any);
  if (!imageUrl) {
    imageUrl = await fetchOgImage(item.link);
  }

  const article: Omit<Article, "id"> = {
    sourceId: source.id,
    sourceName: source.name,
    title: item.title.trim(),
    snippet,
    url: item.link,
    canonicalUrl: normalizeUrl(item.link),
    guid: item.guid || null,
    imageUrl,
    categories,
    publishedAt: Timestamp.fromDate(pubDate),
    ingestedAt: Timestamp.now(),
    relevanceScore: relevance.score,
    isRelevant: relevance.isRelevant,
    ai: null,
  };

  const searchTokens = relevance.isRelevant
    ? generateSearchTokens({ title: item.title.trim(), snippet })
    : [];

  await db.collection("articles").doc(articleId).set({
    id: articleId,
    ...article,
    searchTokens,
  });

  return "ingested";
}

// ============================================================================
// Fetch paginated feed for one source
// ============================================================================

async function fetchPaginatedSource(
  src: PaginatedSource,
  globalMaxPages: number,
  cutoffDate: Date,
): Promise<{ ingested: number; duplicate: number; skipped: number; pages: number; oldestDate: string | null }> {
  const source = await ensureSourceExists(src);
  const maxP = Math.min(src.maxPages, globalMaxPages);

  let ingested = 0;
  let duplicate = 0;
  let skipped = 0;
  let pagesProcessed = 0;
  let oldestDate: string | null = null;
  let hitCutoff = false;

  for (let page = 1; page <= maxP; page++) {
    const url = page === 1 ? src.baseRssUrl : `${src.baseRssUrl}?paged=${page}`;

    try {
      const feed = await parser.parseURL(url);
      pagesProcessed++;

      if (!feed.items || feed.items.length === 0) {
        console.log(`    Page ${page}: empty — stopping`);
        break;
      }

      for (const item of feed.items) {
        // Track oldest article seen
        const pubStr = item.isoDate || item.pubDate;
        if (pubStr) {
          const d = new Date(pubStr);
          if (!isNaN(d.getTime())) {
            const dateStr = d.toISOString().split("T")[0];
            if (!oldestDate || dateStr < oldestDate) oldestDate = dateStr;
            if (d < cutoffDate) {
              hitCutoff = true;
            }
          }
        }

        const result = await ingestItem(item, source, cutoffDate);
        if (result === "ingested") ingested++;
        else if (result === "duplicate") duplicate++;
        else skipped++;
      }

      const lastPubDate = feed.items[feed.items.length - 1]?.isoDate || feed.items[feed.items.length - 1]?.pubDate;
      const lastDate = lastPubDate ? new Date(lastPubDate).toISOString().split("T")[0] : "?";
      console.log(
        `    Page ${page}: ${feed.items.length} items → +${ingested > 0 ? ingested : 0} new (oldest: ${lastDate})`,
      );

      // Stop if we've gone past the cutoff
      if (hitCutoff) {
        console.log(`    Reached cutoff date — stopping pagination`);
        break;
      }

      // Be polite
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("Not Found")) {
        console.log(`    Page ${page}: 404 — no more pages`);
        break;
      }
      console.log(`    Page ${page}: error — ${msg}`);
      break;
    }
  }

  // Update fetch state
  await db.collection("sources").doc(src.id).update({
    "fetchState.lastFetchedAt": FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ingested, duplicate, skipped, pages: pagesProcessed, oldestDate };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const { maxPages, maxAgeDays } = parseArgs();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║              DEEP HISTORICAL BACKFILL                   ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  Max pages per source:  ${maxPages}`);
  console.log(`  Max article age:       ${maxAgeDays} days`);
  console.log(`  Cutoff date:           ${cutoffDate.toISOString().split("T")[0]}`);
  console.log(`  Sources:               ${PAGINATED_SOURCES.map((s) => s.name).join(", ")}`);
  console.log("");

  // Count articles before
  const beforeCount = await db.collection("articles").count().get();
  console.log(`  Articles before:       ${beforeCount.data().count}`);
  console.log("");

  let totalIngested = 0;
  let totalDuplicate = 0;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 1: Paginated RSS Ingestion");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  for (const src of PAGINATED_SOURCES) {
    console.log(`  📡 ${src.name}`);
    const result = await fetchPaginatedSource(src, maxPages, cutoffDate);
    totalIngested += result.ingested;
    totalDuplicate += result.duplicate;

    console.log(
      `     ✅ ${result.pages} pages → +${result.ingested} new, ${result.duplicate} dup, ${result.skipped} skip` +
        (result.oldestDate ? ` (oldest: ${result.oldestDate})` : ""),
    );
    console.log("");
  }

  // Also run standard ingestion to pick up anything from non-paginated sources
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 2: Standard RSS Ingestion (all sources, 14d)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const { ingestAllEnabledSources } = await import("../lib/ingestion/index.js");
  const summary = await ingestAllEnabledSources({ maxAgeDays: 14, forceRefresh: true });
  totalIngested += summary.totalItemsIngested;

  for (const r of summary.results) {
    const icon = r.success ? "  ✓" : "  ✗";
    const detail = r.notModified
      ? "not modified"
      : `+${r.itemsIngested} new, ${r.itemsDuplicate} dup`;
    console.log(`${icon} ${r.sourceName}: ${detail}`);
  }

  // Count articles after
  const afterCount = await db.collection("articles").count().get();
  console.log("");
  console.log(`  Articles after:        ${afterCount.data().count} (+${afterCount.data().count - beforeCount.data().count})`);

  // ──────────────────────────────────────────────────────────────────────
  // Step 3: Audit + brief generation
  // ──────────────────────────────────────────────────────────────────────

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 3: Brief Generation for Missing Dates");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.log("  ⚠️  OPENAI_API_KEY not set — skipping brief generation.");
    console.log("     Run backfill-historical separately to generate briefs.");
    return;
  }

  // Import brief generation dependencies
  const {
    AI_MODEL_PREMIUM,
    DAILY_BRIEF_SCHEMA,
    DAILY_BRIEF_SYSTEM,
    buildDailyBriefPrompt,
    selectArticlesForBrief,
    logSelectionMetrics,
  } = await import("../lib/ai/index.js");
  const OpenAI = (await import("openai")).default;

  const openai = new OpenAI({ apiKey: openaiApiKey });

  // Check each date for the past maxAgeDays
  const now = new Date();
  const datesToGenerate: string[] = [];

  for (let i = 1; i <= maxAgeDays; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dateKey = formatter.format(d);

    // Skip if brief exists
    const briefDoc = await db.collection("briefs").doc(dateKey).get();
    if (briefDoc.exists) continue;

    // Check article count in window
    const [year, month, day] = dateKey.split("-").map(Number);
    const targetMidnight = new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
    const windowStart = new Date(targetMidnight.getTime() - 48 * 3600000);
    const windowEnd = new Date(targetMidnight.getTime() + 30 * 3600000);

    const articleSnap = await db
      .collection("articles")
      .where("publishedAt", ">=", Timestamp.fromDate(windowStart))
      .where("publishedAt", "<", Timestamp.fromDate(windowEnd))
      .count()
      .get();

    if (articleSnap.data().count >= 5) {
      datesToGenerate.push(dateKey);
    }
  }

  datesToGenerate.sort();

  if (datesToGenerate.length === 0) {
    console.log("  All dates already have briefs or insufficient articles.");
  } else {
    console.log(`  📋 ${datesToGenerate.length} dates need briefs: ${datesToGenerate.join(", ")}`);
    console.log("");

    let successCount = 0;
    for (const dateKey of datesToGenerate) {
      const stepStart = Date.now();
      console.log(`  📝 ${dateKey}...`);

      try {
        const [year, month, day] = dateKey.split("-").map(Number);
        const targetMidnight = new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
        const windowStart = new Date(targetMidnight.getTime() - 48 * 3600000);
        const windowEnd = new Date(targetMidnight.getTime() + 30 * 3600000);

        const articlesSnap = await db
          .collection("articles")
          .where("isRelevant", "==", true)
          .where("publishedAt", ">=", Timestamp.fromDate(windowStart))
          .where("publishedAt", "<", Timestamp.fromDate(windowEnd))
          .orderBy("publishedAt", "desc")
          .limit(100)
          .get();

        if (articlesSnap.empty) {
          console.log(`     ⚠️  No relevant articles, skipping`);
          continue;
        }

        const rawArticles = articlesSnap.docs.map((doc) => {
          const data = doc.data() as Article;
          return { ...data, id: doc.id };
        });

        const { articles: selectedArticles, metrics } = selectArticlesForBrief(rawArticles);
        logSelectionMetrics(`deep-backfill/${dateKey}`, metrics);

        if (selectedArticles.length === 0) continue;

        const articles = selectedArticles.map((a) => ({
          id: a.id,
          title: a.title,
          sourceName: a.sourceName,
          sourceId: a.sourceId,
          snippet: a.snippet,
        }));

        const sourceMap = new Map<string, string>();
        articles.forEach((a) => {
          if (!sourceMap.has(a.sourceId)) sourceMap.set(a.sourceId, a.sourceName);
        });

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

        const briefData = JSON.parse(response.output_text);
        const brief = {
          date: dateKey,
          createdAt: Timestamp.now(),
          executiveSummary: briefData.executiveSummary,
          topStories: briefData.topStories,
          sections: briefData.sections,
          topics: briefData.topics,
          sourcesUsed: Array.from(sourceMap.entries()).map(([sourceId, name]) => ({ sourceId, name })),
          sourceArticleIds: articles.map((a) => a.id),
          model: AI_MODEL_PREMIUM,
        };

        await db.collection("briefs").doc(dateKey).set(brief);

        const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
        console.log(
          `     ✅ (${elapsed}s) ${brief.topics.length} topics, ${brief.topStories.length} stories, ${articles.length} articles`,
        );
        successCount++;

        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`     ❌ ${msg}`);
      }
    }

    console.log(`\n  Briefs generated: ${successCount}`);
  }

  // Clear signals cache
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 4: Clear Signals Cache");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const signalsSnap = await db.collection("signals").get();
  if (signalsSnap.empty) {
    console.log("  No cached signals.");
  } else {
    const batch = db.batch();
    signalsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  🗑️  Cleared ${signalsSnap.size} signal docs`);
  }

  // Final summary
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║                 DEEP BACKFILL COMPLETE                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  New articles ingested:  ${totalIngested}`);
  console.log(`  Duplicates skipped:     ${totalDuplicate}`);
  console.log(`  Total articles now:     ${afterCount.data().count}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
