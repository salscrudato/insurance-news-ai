/**
 * Show Brief Script
 * Displays the current brief content
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
  console.log(`📋 Brief for ${dateKey}\n`);

  const briefDoc = await db.collection("briefs").doc(dateKey).get();

  if (!briefDoc.exists) {
    console.log("❌ No brief found for this date");
    return;
  }

  const brief = briefDoc.data()!;

  console.log("=== EXECUTIVE SUMMARY ===");
  brief.executiveSummary?.forEach((item: string, i: number) => {
    console.log(`  ${i + 1}. ${item}`);
  });

  console.log("\n=== TOP STORIES ===");
  brief.topStories?.forEach((story: { headline: string; whyItMatters: string }, i: number) => {
    console.log(`  ${i + 1}. ${story.headline}`);
    console.log(`     → ${story.whyItMatters}`);
  });

  console.log("\n=== SECTIONS ===");
  const sections = brief.sections || {};
  for (const [key, section] of Object.entries(sections)) {
    const s = section as { bullets: string[]; articleIds: string[] };
    if (s.bullets?.length > 0) {
      console.log(`  ${key}: ${s.bullets.length} bullets, ${s.articleIds?.length || 0} articles`);
    }
  }

  console.log("\n=== TOPICS ===");
  console.log(`  ${brief.topics?.join(", ") || "None"}`);

  console.log("\n=== METADATA ===");
  console.log(`  Model: ${brief.model}`);
  console.log(`  Sources used: ${brief.sourcesUsed?.length || 0}`);
  console.log(`  Source articles: ${brief.sourceArticleIds?.length || 0}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });

