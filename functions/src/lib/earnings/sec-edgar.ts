/**
 * SEC EDGAR Adapter
 *
 * Free API (no key required) for US public company filings:
 * - Ticker → CIK mapping via company_tickers.json
 * - Submissions API for filing metadata
 * - Filings archive URLs for 10-Q, 10-K, 8-K
 *
 * Compliance: SEC requires a User-Agent header with company/email.
 * Rate limit: Max 10 requests/second.
 */

import type { Filing } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

/** SEC requires a descriptive User-Agent for fair-access compliance. */
const SEC_USER_AGENT = "InsuranceBrief/1.0 (support@theinsurancebrief.com)";

const EDGAR_BASE = "https://data.sec.gov";
const SEC_FILES_BASE = "https://www.sec.gov";
const ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";

/** Forms we care about for earnings/filings context */
const RELEVANT_FORMS = new Set(["10-Q", "10-K", "8-K", "10-K/A", "10-Q/A"]);

// ============================================================================
// CIK Mapping
// ============================================================================

/** In-memory cache for ticker → CIK mapping */
let tickerToCikMap: Map<string, { cik: string; name: string }> | null = null;
let tickerMapFetchedAt = 0;
const TICKER_MAP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch and cache the SEC company_tickers.json mapping.
 * Contains ~13k tickers → CIK + company name.
 */
async function ensureTickerMap(): Promise<Map<string, { cik: string; name: string }>> {
  const now = Date.now();
  if (tickerToCikMap && now - tickerMapFetchedAt < TICKER_MAP_TTL_MS) {
    return tickerToCikMap;
  }

  const res = await fetch(`${SEC_FILES_BASE}/files/company_tickers.json`, {
    headers: { "User-Agent": SEC_USER_AGENT, "Accept": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`SEC EDGAR ticker map HTTP ${res.status}`);
  }

  const data = await res.json() as Record<string, {
    cik_str: number;
    ticker: string;
    title: string;
  }>;

  const map = new Map<string, { cik: string; name: string }>();
  for (const entry of Object.values(data)) {
    const ticker = entry.ticker?.toUpperCase();
    if (ticker) {
      map.set(ticker, {
        cik: String(entry.cik_str),
        name: entry.title ?? "",
      });
    }
  }

  tickerToCikMap = map;
  tickerMapFetchedAt = now;
  return map;
}

/**
 * Resolve a ticker symbol to its SEC CIK number.
 * Returns null if not found (non-US company or delisted).
 */
export async function tickerToCik(ticker: string): Promise<string | null> {
  const map = await ensureTickerMap();
  const entry = map.get(ticker.toUpperCase());
  return entry?.cik ?? null;
}

// ============================================================================
// Filings
// ============================================================================

/**
 * Fetch recent SEC filings for a given ticker.
 * Returns only 10-Q, 10-K, and 8-K forms (most relevant for earnings).
 * Returns null for non-US companies.
 */
export async function getRecentFilings(ticker: string, limit = 25): Promise<Filing[] | null> {
  const cik = await tickerToCik(ticker);
  if (!cik) return null; // Not a US-listed company

  const paddedCik = cik.padStart(10, "0");
  const url = `${EDGAR_BASE}/submissions/CIK${paddedCik}.json`;

  const res = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT, "Accept": "application/json" },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`SEC EDGAR submissions HTTP ${res.status}`);
  }

  const data = await res.json() as {
    filings?: {
      recent?: {
        accessionNumber?: string[];
        form?: string[];
        filingDate?: string[];
        primaryDocument?: string[];
        primaryDocDescription?: string[];
        reportDate?: string[];
      };
    };
  };

  const recent = data?.filings?.recent;
  if (!recent?.accessionNumber) return [];

  const filings: Filing[] = [];
  const count = recent.accessionNumber.length;

  for (let i = 0; i < count && filings.length < limit; i++) {
    const form = recent.form?.[i] ?? "";
    if (!RELEVANT_FORMS.has(form)) continue;

    const accession = recent.accessionNumber[i] ?? "";
    const accessionClean = accession.replace(/-/g, "");
    const primaryDoc = recent.primaryDocument?.[i] ?? "";

    filings.push({
      accessionNumber: accession,
      form,
      filingDate: recent.filingDate?.[i] ?? "",
      primaryDocument: primaryDoc,
      primaryDocDescription: recent.primaryDocDescription?.[i] ?? "",
      reportDate: recent.reportDate?.[i] ?? "",
      url: primaryDoc
        ? `${ARCHIVES_BASE}/${cik}/${accessionClean}/${primaryDoc}`
        : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${form}&dateb=&owner=include&count=10`,
    });
  }

  return filings;
}

// ============================================================================
// Filing Excerpt (for AI Remarks extraction)
// ============================================================================

/**
 * Fetch the primary document text of a filing for excerpt extraction.
 * Returns truncated plain text (max chars) suitable for AI processing.
 */
export async function getFilingDocumentText(
  ticker: string,
  accessionNumber: string,
  maxChars = 25000
): Promise<string | null> {
  const cik = await tickerToCik(ticker);
  if (!cik) return null;

  // First fetch filing index to find the primary document
  const accessionClean = accessionNumber.replace(/-/g, "");
  const indexUrl = `${ARCHIVES_BASE}/${cik}/${accessionClean}/index.json`;

  const indexRes = await fetch(indexUrl, {
    headers: { "User-Agent": SEC_USER_AGENT, "Accept": "application/json" },
  });

  if (!indexRes.ok) return null;

  const indexData = await indexRes.json() as {
    directory?: { item?: Array<{ name: string; type: string; size: string }> };
  };

  // Find the primary document (usually .htm or .txt)
  const items = indexData?.directory?.item ?? [];
  const primaryDoc = items.find(
    (it) => it.name.endsWith(".htm") || it.name.endsWith(".html")
  ) ?? items.find((it) => it.name.endsWith(".txt"));

  if (!primaryDoc) return null;

  const docUrl = `${ARCHIVES_BASE}/${cik}/${accessionClean}/${primaryDoc.name}`;
  const docRes = await fetch(docUrl, {
    headers: { "User-Agent": SEC_USER_AGENT },
  });

  if (!docRes.ok) return null;

  let text = await docRes.text();

  // Strip HTML tags to get plain text
  text = text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Truncate to safe limit
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + "\n\n[TRUNCATED]";
  }

  return text;
}
