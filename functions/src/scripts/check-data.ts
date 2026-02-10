/**
 * Check Data Script
 * Verifies the production data is ready
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

async function main(): Promise<void> {
  console.log("🔍 Checking production data...\n");

  // Check sources
  const sources = await db.collection("sources").get();
  console.log("=== SOURCES ===");
  let enabledCount = 0;
  sources.forEach((doc) => {
    const d = doc.data();
    if (d.enabled) enabledCount++;
    const lastFetched = d.lastFetchedAt?.toDate?.()?.toISOString() || "never";
    console.log(`  ${d.enabled ? "✅" : "⏸️ "} ${d.name} (lastFetched: ${lastFetched})`);
  });
  console.log(`  Total: ${sources.size} sources (${enabledCount} enabled)\n`);

  // Check articles count
  const articlesCount = await db.collection("articles").count().get();
  console.log(`=== ARTICLES: ${articlesCount.data().count} total ===`);

  // Check recent articles
  const recentArticles = await db
    .collection("articles")
    .orderBy("publishedAt", "desc")
    .limit(5)
    .get();
  console.log("Recent articles:");
  recentArticles.forEach((doc) => {
    const d = doc.data();
    const title = d.title?.substring(0, 55) || "No title";
    const date = d.publishedAt?.toDate?.()?.toISOString()?.split("T")[0] || "unknown";
    console.log(`  - ${title}... (${date})`);
  });

  // Check briefs
  const briefs = await db.collection("briefs").orderBy("date", "desc").limit(5).get();
  console.log(`\n=== BRIEFS: ${briefs.size} found ===`);
  briefs.forEach((doc) => {
    const d = doc.data();
    console.log(
      `  - ${doc.id}: ${d.topStories?.length || 0} top stories, ${d.executiveSummary?.length || 0} summary items`
    );
  });

  // Summary
  console.log("\n=== PRODUCTION READINESS ===");
  const issues: string[] = [];

  if (sources.size === 0) issues.push("❌ No sources configured");
  else if (enabledCount === 0) issues.push("❌ No sources enabled");

  if (articlesCount.data().count === 0) issues.push("❌ No articles ingested");
  else if (articlesCount.data().count < 10) issues.push("⚠️  Only " + articlesCount.data().count + " articles");

  if (briefs.size === 0) issues.push("❌ No briefs generated");

  if (issues.length === 0) {
    console.log("✅ All systems ready for production!");
  } else {
    issues.forEach((i) => console.log(i));
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });

