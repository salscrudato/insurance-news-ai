/**
 * Historical Backfill Script
 *
 * Purpose: Backfill articles (via RSS ingestion) and generate daily briefs
 * for past dates where articles exist but briefs are missing.
 *
 * Unlike the normal brief generation (which queries a 36h window from "now"),
 * this script queries articles relative to EACH target date — simulating what
 * the scheduler would have seen on that day.
 *
 * Usage:
 *   cd functions
 *   npm run build
 *   OPENAI_API_KEY=<key> node lib/scripts/backfill-historical.js [--days=10] [--skip-ingest] [--force]
 *
 * Options:
 *   --days=N        Number of days to look back (default: 10)
 *   --skip-ingest   Skip RSS ingestion step (if you already ran it)
 *   --force         Overwrite existing briefs (default: skip if exists)
 *   --dry-run       Show what would be generated without doing it
 *
 * Safety:
 *   - Article dedup is handled by the ingestion engine (SHA256 of canonical URL)
 *   - Briefs are skipped if they already exist (unless --force)
 *   - Each date gets articles from a ±36h window centered on that date's evening
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";
import { ingestAllEnabledSources } from "../lib/ingestion/index.js";
import {
  selectArticlesForBrief,
  logSelectionMetrics,
} from "../lib/ai/article-selection.js";
import {
  AI_MODEL_PREMIUM,
  DAILY_BRIEF_SCHEMA,
  DAILY_BRIEF_SYSTEM,
  buildDailyBriefPrompt,
  type DailyBriefResponse,
} from "../lib/ai/index.js";
import type { Article, Brief } from "../types/firestore.js";

// ============================================================================
// Init
// ============================================================================

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// ============================================================================
// Helpers
// ============================================================================

function parseArgs(): {
  days: number;
  skipIngest: boolean;
  force: boolean;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let days = 10;
  let skipIngest = false;
  let force = false;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith("--days=")) {
      days = parseInt(arg.split("=")[1], 10);
      if (isNaN(days) || days < 1 || days > 30) {
        console.error("❌ --days must be between 1 and 30");
        process.exit(1);
      }
    } else if (arg === "--skip-ingest") {
      skipIngest = true;
    } else if (arg === "--force") {
      force = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { days, skipIngest, force, dryRun };
}

function formatDateET(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Generate the list of date keys we want briefs for.
 * Goes back `days` from today ET, returns yyyy-mm-dd strings.
 */
function getTargetDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();

  for (let i = 1; i <= days; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(formatDateET(d));
  }

  // Sort chronologically (oldest first)
  return dates.sort();
}

/**
 * For a given dateKey (e.g. "2026-02-05"), return a query window
 * that simulates what the scheduler would have seen:
 * - Articles published from 48h before the date's midnight to 6h after
 * - This captures articles from the day before through end of day
 */
function getArticleWindow(dateKey: string): { start: Date; end: Date } {
  // Parse the date in UTC
  const [year, month, day] = dateKey.split("-").map(Number);
  // Target date at midnight UTC (close enough — ET is UTC-5)
  const targetMidnight = new Date(Date.UTC(year, month - 1, day, 5, 0, 0)); // 5 UTC = midnight ET

  // Window: 48h before midnight through end of that day (30h after midnight)
  const start = new Date(targetMidnight.getTime() - 48 * 60 * 60 * 1000);
  const end = new Date(targetMidnight.getTime() + 30 * 60 * 60 * 1000);

  return { start, end };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const { days, skipIngest, force, dryRun } = parseArgs();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           HISTORICAL BACKFILL — Insurance News AI       ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  Days to backfill:  ${days}`);
  console.log(`  Skip ingestion:    ${skipIngest}`);
  console.log(`  Force overwrite:   ${force}`);
  console.log(`  Dry run:           ${dryRun}`);
  console.log("");

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey && !dryRun) {
    console.error("❌ OPENAI_API_KEY not set. Set it or use --dry-run.");
    process.exit(1);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Step 1: Ingest articles with maximum lookback
  // ──────────────────────────────────────────────────────────────────────

  if (!skipIngest) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 1: RSS Ingestion (14-day lookback, force refresh)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    if (dryRun) {
      console.log("  [DRY RUN] Would ingest from all enabled sources (14 days)\n");
    } else {
      const ingestionStart = Date.now();
      const summary = await ingestAllEnabledSources({
        maxAgeDays: 14,
        forceRefresh: true,
      });

      console.log("");
      console.log(`  ⏱  Duration:    ${(summary.durationMs / 1000).toFixed(1)}s`);
      console.log(`  📡 Sources:     ${summary.sourcesProcessed}`);
      console.log(`  📥 Fetched:     ${summary.totalItemsFetched}`);
      console.log(`  ✅ Ingested:    ${summary.totalItemsIngested}`);
      console.log("");

      for (const r of summary.results) {
        const icon = r.success ? "  ✓" : "  ✗";
        const detail = r.notModified
          ? "not modified"
          : `+${r.itemsIngested} new, ${r.itemsDuplicate} dup, ${r.itemsSkipped} skip`;
        console.log(`${icon} ${r.sourceName}: ${detail}`);
      }

      console.log("");
      console.log(
        `  Total ingestion time: ${((Date.now() - ingestionStart) / 1000).toFixed(1)}s`
      );
      console.log("");
    }
  } else {
    console.log("⏭  Skipping ingestion (--skip-ingest)\n");
  }

  // ──────────────────────────────────────────────────────────────────────
  // Step 2: Audit — check articles + briefs per date
  // ──────────────────────────────────────────────────────────────────────

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 2: Data Audit");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const targetDates = getTargetDates(days);
  const datesToGenerate: string[] = [];

  console.log("  Date       │ Articles │ Brief │ Action");
  console.log("  ───────────┼──────────┼───────┼───────────────────");

  for (const dateKey of targetDates) {
    const window = getArticleWindow(dateKey);

    // Count articles in the window for this date
    // Use publishedAt range only (avoids needing composite index for count)
    // The actual generation step will filter by isRelevant
    const articleSnap = await db
      .collection("articles")
      .where("publishedAt", ">=", Timestamp.fromDate(window.start))
      .where("publishedAt", "<", Timestamp.fromDate(window.end))
      .count()
      .get();

    const articleCount = articleSnap.data().count;

    // Check if brief exists
    const briefDoc = await db.collection("briefs").doc(dateKey).get();
    const hasBrief = briefDoc.exists;

    let action = "";
    if (hasBrief && !force) {
      action = "skip (brief exists)";
    } else if (articleCount < 5) {
      action = "skip (< 5 articles)";
    } else {
      action = force && hasBrief ? "REGENERATE" : "GENERATE";
      datesToGenerate.push(dateKey);
    }

    const briefIcon = hasBrief ? "  ✓  " : "  ✗  ";
    console.log(
      `  ${dateKey} │ ${String(articleCount).padStart(8)} │${briefIcon}│ ${action}`
    );
  }

  console.log("");
  console.log(`  📋 Dates needing briefs: ${datesToGenerate.length}`);
  console.log("");

  if (datesToGenerate.length === 0) {
    console.log("✅ Nothing to backfill — all dates have briefs or insufficient articles.");
    return;
  }

  if (dryRun) {
    console.log("[DRY RUN] Would generate briefs for:", datesToGenerate.join(", "));
    return;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Step 3: Generate briefs for missing dates
  // ──────────────────────────────────────────────────────────────────────

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`STEP 3: Brief Generation (${datesToGenerate.length} dates)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const openai = new OpenAI({ apiKey: openaiApiKey! });
  let successCount = 0;
  let failCount = 0;

  for (const dateKey of datesToGenerate) {
    const stepStart = Date.now();
    console.log(`  📝 Generating brief for ${dateKey}...`);

    try {
      // Fetch articles in the window for this date
      const window = getArticleWindow(dateKey);
      const articlesSnap = await db
        .collection("articles")
        .where("isRelevant", "==", true)
        .where("publishedAt", ">=", Timestamp.fromDate(window.start))
        .where("publishedAt", "<", Timestamp.fromDate(window.end))
        .orderBy("publishedAt", "desc")
        .limit(100)
        .get();

      if (articlesSnap.empty) {
        console.log(`     ⚠️  No articles found, skipping`);
        continue;
      }

      // Apply article selection (relevance gate + diversity)
      const rawArticles = articlesSnap.docs.map((doc) => {
        const data = doc.data() as Article;
        return { ...data, id: doc.id };
      });

      const { articles: selectedArticles, metrics } =
        selectArticlesForBrief(rawArticles);
      logSelectionMetrics(`backfill/${dateKey}`, metrics);

      if (selectedArticles.length === 0) {
        console.log(
          `     ⚠️  No articles passed relevance gate (${rawArticles.length} candidates)`
        );
        continue;
      }

      // Prepare article data for the AI
      const articles = selectedArticles.map((a) => ({
        id: a.id,
        title: a.title,
        sourceName: a.sourceName,
        sourceId: a.sourceId,
        snippet: a.snippet,
      }));

      // Build sources map
      const sourceMap = new Map<string, string>();
      articles.forEach((a) => {
        if (!sourceMap.has(a.sourceId)) {
          sourceMap.set(a.sourceId, a.sourceName);
        }
      });

      // Generate brief via OpenAI
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

      const briefData = JSON.parse(
        response.output_text
      ) as DailyBriefResponse;

      // Build the brief document
      const brief: Brief = {
        date: dateKey,
        createdAt: Timestamp.now(),
        executiveSummary: briefData.executiveSummary,
        topStories: briefData.topStories,
        sections: briefData.sections,
        topics: briefData.topics,
        sourcesUsed: Array.from(sourceMap.entries()).map(
          ([sourceId, name]) => ({ sourceId, name })
        ),
        sourceArticleIds: articles.map((a) => a.id),
        model: AI_MODEL_PREMIUM,
      };

      // Delete existing if force mode
      if (force) {
        await db.collection("briefs").doc(dateKey).delete();
      }

      // Save to Firestore
      await db.collection("briefs").doc(dateKey).set(brief);

      const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
      console.log(
        `     ✅ Created (${elapsed}s) — ` +
          `${brief.executiveSummary.length} summary, ` +
          `${brief.topStories.length} stories, ` +
          `${brief.topics.length} topics, ` +
          `${articles.length} articles used`
      );
      successCount++;

      // Small delay between API calls to be respectful
      if (datesToGenerate.indexOf(dateKey) < datesToGenerate.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (error) {
      const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
      const msg =
        error instanceof Error ? error.message : String(error);
      console.log(`     ❌ Failed (${elapsed}s): ${msg}`);
      failCount++;
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Step 4: Clear stale signals cache
  // ──────────────────────────────────────────────────────────────────────

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 4: Clear Signals Cache");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const signalsSnap = await db.collection("signals").get();
  if (signalsSnap.empty) {
    console.log("  No cached signals to clear.");
  } else {
    const batch = db.batch();
    signalsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(
      `  🗑️  Cleared ${signalsSnap.size} cached signal docs (Pulse will recompute)`
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║                   BACKFILL COMPLETE                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  ✅ Briefs generated: ${successCount}`);
  if (failCount > 0) {
    console.log(`  ❌ Briefs failed:    ${failCount}`);
  }
  console.log(`  📊 Signals cache:    cleared`);
  console.log("");
}

// ============================================================================
// Run
// ============================================================================

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
