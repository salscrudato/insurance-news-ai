#!/usr/bin/env node
/**
 * Script to backfill missing images for articles
 * Run with: node scripts/backfill-images.js
 */

import admin from "firebase-admin";

// Initialize Firebase Admin with default credentials
admin.initializeApp({
  projectId: "insurance-news-ai",
});

const db = admin.firestore();

async function backfillImages() {
  console.log("Starting image backfill...\n");

  // Get articles without images (simple query, no composite index needed)
  // We'll limit to 200 and can run again for more
  const articlesSnap = await db
    .collection("articles")
    .where("imageUrl", "==", null)
    .limit(200)
    .get();

  console.log(`Found ${articlesSnap.size} articles without images\n`);

  if (articlesSnap.size === 0) {
    console.log("No articles need image backfill!");
    process.exit(0);
  }

  // Now fetch og:image for each article
  let updated = 0;
  let failed = 0;

  for (const doc of articlesSnap.docs) {
    const article = doc.data();
    const url = article.url;

    if (!url) {
      console.log(`⏭ ${doc.id}: No URL`);
      failed++;
      continue;
    }

    try {
      const imageUrl = await fetchOgImage(url);
      if (imageUrl) {
        await doc.ref.update({ imageUrl });
        console.log(`✓ ${article.title?.substring(0, 50)}...`);
        console.log(`  Image: ${imageUrl.substring(0, 80)}...`);
        updated++;
      } else {
        console.log(`✗ ${article.title?.substring(0, 50)}... (no og:image found)`);
        failed++;
      }
    } catch (error) {
      console.log(`✗ ${article.title?.substring(0, 50)}... (${error.message})`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Backfill complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`========================================\n`);
}

async function fetchOgImage(articleUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(articleUrl, {
      method: "GET",
      headers: {
        "User-Agent": "InsuranceNewsAI/1.0 (+https://insurance-news-ai.web.app)",
        Accept: "text/html",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    // Read only the first 64KB to get the <head> section
    const reader = response.body.getReader();
    let html = "";
    let bytesRead = 0;

    while (bytesRead < 65536) {
      const { done, value } = await reader.read();
      if (done) break;

      html += new TextDecoder().decode(value);
      bytesRead += value.length;

      if (html.includes("</head>")) {
        break;
      }
    }

    reader.cancel().catch(() => {});

    // Extract og:image or twitter:image
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const imageUrl = match[1].trim();
        if (imageUrl === "undefined" || imageUrl === "null" || imageUrl === "") {
          continue;
        }
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          return imageUrl;
        }
        if (imageUrl.startsWith("//")) {
          return "https:" + imageUrl;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

backfillImages().catch(console.error);

