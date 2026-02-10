/**
 * Seed Initial Sources Script
 *
 * Run with: npx ts-node src/scripts/seed-sources.ts
 * Or after build: node lib/scripts/seed-sources.js
 *
 * This script upserts the initial reputable sources into Firestore.
 * It uses the Firebase Admin SDK and requires GOOGLE_APPLICATION_CREDENTIALS
 * or running in a Firebase environment.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { SourceCategory } from "../types/firestore.js";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  // In production, uses GOOGLE_APPLICATION_CREDENTIALS or default credentials
  // For local dev, you can set GOOGLE_APPLICATION_CREDENTIALS to a service account key
  initializeApp();
}

const db = getFirestore();

// ============================================================================
// Source Definitions
// ============================================================================

interface SourceSeed {
  id: string;
  name: string;
  siteUrl: string;
  rssUrl: string;
  rssUrls?: string[];
  enabled: boolean;
  enabledByDefault: boolean;
  tags: SourceCategory[];
  region?: string;
}

const REPUTABLE_SOURCES: SourceSeed[] = [
  // === ORIGINAL SOURCES ===
  {
    id: "insurance-journal",
    name: "Insurance Journal",
    siteUrl: "https://www.insurancejournal.com",
    rssUrl: "https://www.insurancejournal.com/rss/news/",
    enabled: true,
    enabledByDefault: true,
    tags: ["property_cat", "casualty_liability", "regulation", "claims"],
  },
  {
    id: "claims-journal",
    name: "Claims Journal",
    siteUrl: "https://www.claimsjournal.com",
    rssUrl: "https://www.claimsjournal.com/rss/news/",
    enabled: true,
    enabledByDefault: true,
    tags: ["claims", "casualty_liability"],
  },
  {
    id: "artemis",
    name: "Artemis",
    siteUrl: "https://www.artemis.bm",
    rssUrl: "https://www.artemis.bm/feed/",
    enabled: true,
    enabledByDefault: true,
    tags: ["reinsurance", "property_cat"],
  },
  // === NEW SOURCES ===
  {
    id: "carrier-management",
    name: "Carrier Management",
    siteUrl: "https://www.carriermanagement.com",
    rssUrl: "https://www.carriermanagement.com/feed",
    enabled: true,
    enabledByDefault: true,
    tags: ["property_cat", "claims", "insurtech", "reinsurance"],
  },
  {
    id: "business-insurance",
    name: "Business Insurance",
    siteUrl: "https://www.businessinsurance.com",
    rssUrl: "https://www.businessinsurance.com/section/rss?feed=NEWS",
    rssUrls: [
      "https://www.businessinsurance.com/section/rss?feed=NEWS",
      "https://www.businessinsurance.com/section/rss?feed=NEWS06",
      "https://www.businessinsurance.com/section/rss?feed=NEWS08",
      "https://www.businessinsurance.com/section/rss?feed=GLOBAL",
    ],
    enabled: false, // Disabled: RSS feeds return 403 Forbidden
    enabledByDefault: false,
    tags: ["property_cat", "casualty_liability", "regulation"],
  },
  {
    id: "insurance-business-us",
    name: "Insurance Business (US)",
    siteUrl: "https://www.insurancebusinessmag.com/us/",
    rssUrl: "https://www.insurancebusinessmag.com/us/rss",
    enabled: true,
    enabledByDefault: true,
    tags: ["property_cat", "casualty_liability", "regulation"],
  },
  {
    id: "risk-and-insurance",
    name: "Risk & Insurance",
    siteUrl: "https://riskandinsurance.com",
    rssUrl: "https://riskandinsurance.com/feed",
    enabled: true,
    enabledByDefault: true,
    tags: ["claims", "insurtech"],
  },
];

// Optional sources - disabled by default
const OPTIONAL_SOURCES: SourceSeed[] = [
  {
    id: "canadian-underwriter",
    name: "Canadian Underwriter",
    siteUrl: "https://www.canadianunderwriter.ca",
    rssUrl: "https://www.canadianunderwriter.ca/news/feed",
    rssUrls: [
      "https://www.canadianunderwriter.ca/news/feed",
      "https://www.canadianunderwriter.ca/global-category/property/feed",
    ],
    enabled: false,
    enabledByDefault: false,
    tags: ["property_cat", "claims"],
    region: "Canada",
  },
  {
    id: "leaders-edge",
    name: "Leader's Edge",
    siteUrl: "https://www.leadersedge.com",
    rssUrl: "https://www.leadersedge.com/category/p-c/feed",
    enabled: false,
    enabledByDefault: false,
    tags: ["property_cat", "casualty_liability"],
  },
];

// ============================================================================
// Seed Function
// ============================================================================

async function seedSources(): Promise<void> {
  console.log("🌱 Starting source seeding...\n");

  const now = Timestamp.now();
  const allSources = [...REPUTABLE_SOURCES, ...OPTIONAL_SOURCES];

  const defaultFetchState = {
    etag: null,
    lastModified: null,
    lastFetchedAt: null,
    lastError: null,
  };

  for (const seed of allSources) {
    const docRef = db.collection("sources").doc(seed.id);
    const existing = await docRef.get();
    const existingData = existing.exists ? existing.data() : null;

    // Build fetchStates for multi-feed sources
    const rssUrlsToUse = seed.rssUrls ?? [seed.rssUrl];
    let fetchStates: Record<string, typeof defaultFetchState> | undefined;
    if (rssUrlsToUse.length > 1) {
      fetchStates = (existingData?.fetchStates as Record<string, typeof defaultFetchState>) ?? {};
      for (const url of rssUrlsToUse) {
        if (!fetchStates![url]) {
          fetchStates![url] = { ...defaultFetchState };
        }
      }
    }

    // Build source data, omitting undefined fields
    const sourceData: Record<string, unknown> = {
      name: seed.name,
      siteUrl: seed.siteUrl,
      rssUrl: seed.rssUrl,
      enabled: seed.enabled,
      enabledByDefault: seed.enabledByDefault,
      tier: "reputable",
      tags: seed.tags,
      createdAt: existingData?.createdAt ?? now,
      updatedAt: now,
      fetchState: existingData?.fetchState ?? defaultFetchState,
    };

    // Only add optional fields if they have values
    if (seed.rssUrls) {
      sourceData.rssUrls = seed.rssUrls;
    }
    if (seed.region) {
      sourceData.region = seed.region;
    }
    if (fetchStates) {
      sourceData.fetchStates = fetchStates;
    }

    await docRef.set({ id: seed.id, ...sourceData }, { merge: true });

    const status = existing.exists ? "updated" : "created";
    const enabledStatus = seed.enabled ? "✅ enabled" : "⏸️  disabled";
    const feedCount = rssUrlsToUse.length > 1 ? ` (${rssUrlsToUse.length} feeds)` : "";
    console.log(`  ${enabledStatus} ${seed.name}${feedCount} (${status})`);
  }

  console.log(`\n✨ Seeded ${allSources.length} sources successfully!`);
}

// ============================================================================
// Main
// ============================================================================

seedSources()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error seeding sources:", error);
    process.exit(1);
  });

