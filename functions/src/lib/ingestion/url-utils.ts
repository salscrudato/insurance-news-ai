/**
 * URL Normalization and Hashing Utilities
 *
 * Used for article deduplication via canonical URL hashing.
 */

import { createHash } from "crypto";

/**
 * Normalize a URL for deduplication.
 * - Lowercase hostname
 * - Remove tracking parameters (utm_*, fbclid, etc.)
 * - Remove trailing slashes
 * - Sort query parameters
 * - Remove fragments
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
      "source",
    ];

    trackingParams.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    // Sort query params for consistency
    parsed.searchParams.sort();

    // Remove fragment
    parsed.hash = "";

    // Build normalized URL
    let normalized = `${parsed.protocol}//${parsed.hostname}`;

    // Add port if non-standard
    if (
      parsed.port &&
      !(parsed.protocol === "https:" && parsed.port === "443") &&
      !(parsed.protocol === "http:" && parsed.port === "80")
    ) {
      normalized += `:${parsed.port}`;
    }

    // Add path (remove trailing slash unless root)
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    normalized += path;

    // Add query string if present
    const queryString = parsed.searchParams.toString();
    if (queryString) {
      normalized += `?${queryString}`;
    }

    return normalized;
  } catch {
    // If URL parsing fails, return original trimmed
    return url.trim().toLowerCase();
  }
}

/**
 * Generate SHA256 hash of a string.
 * Returns first 16 characters for compact storage.
 */
export function sha256Hash(input: string): string {
  return createHash("sha256").update(input).digest("hex").substring(0, 16);
}

/**
 * Generate article ID from URL.
 * Uses SHA256 hash of normalized URL for deduplication.
 */
export function generateArticleId(url: string): string {
  const normalizedUrl = normalizeUrl(url);
  return sha256Hash(normalizedUrl);
}

/**
 * Generate fallback article ID from GUID.
 */
export function generateArticleIdFromGuid(guid: string): string {
  return sha256Hash(guid);
}

/**
 * Truncate text to a maximum length, respecting word boundaries.
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix = "..."
): string {
  if (!text) return "";

  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  // Find last space before maxLength
  const truncated = trimmed.substring(0, maxLength - suffix.length);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + suffix;
  }

  return truncated + suffix;
}

/**
 * Extract clean text from potentially HTML content.
 * Removes HTML tags and decodes entities.
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

