/**
 * Test Ingestion Script
 *
 * Run with: npx ts-node src/scripts/test-ingestion.ts
 * Or after build: node lib/scripts/test-ingestion.js
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { ingestAllEnabledSources } from "../lib/ingestion/index.js";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

async function testIngestion(): Promise<void> {
  console.log("🚀 Testing ingestion with 7-day lookback...\n");

  const summary = await ingestAllEnabledSources({ maxAgeDays: 7 });

  console.log("\n=== Ingestion Summary ===");
  console.log("Duration:", summary.durationMs, "ms");
  console.log("Sources processed:", summary.sourcesProcessed);
  console.log("Total items fetched:", summary.totalItemsFetched);
  console.log("Total items ingested:", summary.totalItemsIngested);

  console.log("\n=== Per-Source Results ===");
  for (const r of summary.results) {
    console.log(`\n${r.sourceName}:`);
    console.log("  Success:", r.success);
    if (r.notModified) {
      console.log("  Status: Not Modified (304)");
    } else {
      console.log("  Items fetched:", r.itemsFetched);
      console.log("  Items ingested:", r.itemsIngested);
      console.log("  Items skipped:", r.itemsSkipped);
      console.log("  Duplicates:", r.itemsDuplicate);
    }
    if (r.error) console.log("  Error:", r.error);
  }

  console.log("\n✅ Ingestion test complete!");
}

testIngestion()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  });

