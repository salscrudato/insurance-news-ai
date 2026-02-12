/**
 * Yahoo Finance Adapter (Complementary Provider)
 *
 * Uses the public Yahoo Finance API endpoints that remain accessible:
 * - Search (v1/finance/search) — robust company/ticker search, no key needed
 * - Chart (v8/finance/chart) — real-time quotes with basic company metadata
 *
 * The v10/quoteSummary endpoint (profile, earnings, financials) now requires
 * authentication (crumb), so those are sourced from Alpha Vantage instead.
 * Yahoo provides the two most frequently needed pieces (search & quote)
 * without consuming any AV quota.
 */

import type {
  CompanyProfile,
  CompanyQuote,
  CompanySearchResult,
} from "./types.js";

// ============================================================================
// Helpers
// ============================================================================

const YF_BASE = "https://query1.finance.yahoo.com";
const YF_SEARCH = "https://query2.finance.yahoo.com/v1/finance/search";

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "application/json",
};

function safeNum(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) || !isFinite(n) ? null : n;
}

async function yfFetch(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: YF_HEADERS });
  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

// ============================================================================
// Search (works without auth — our primary search provider)
// ============================================================================

export async function yfSearchCompanies(query: string): Promise<CompanySearchResult[]> {
  const url = `${YF_SEARCH}?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;

  try {
    const data = await yfFetch(url);
    const quotes = (data.quotes ?? []) as Array<Record<string, unknown>>;

    return quotes
      .filter((q) => q.quoteType === "EQUITY" && q.symbol)
      .map((q) => ({
        ticker: String(q.symbol ?? ""),
        name: String(q.shortname ?? q.longname ?? q.symbol ?? ""),
        type: "Equity",
        region: String(q.exchDisp ?? q.exchange ?? ""),
        currency: String(q.currency ?? ""),
        matchScore: 1,
      }))
      .filter((r) => r.ticker && r.name);
  } catch (err) {
    console.warn("[YahooFinance] Search failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ============================================================================
// Quote via Chart API (works without auth — real-time pricing)
// Also extracts basic profile metadata from chart response
// ============================================================================

export async function yfGetQuote(ticker: string): Promise<CompanyQuote | null> {
  try {
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d&includePrePost=false`;
    const data = await yfFetch(url);

    const result = (data.chart as Record<string, unknown>)?.result as Array<Record<string, unknown>> | undefined;
    if (!result?.[0]) return null;

    const meta = result[0].meta as Record<string, unknown> | undefined;
    if (!meta) return null;

    const price = safeNum(meta.regularMarketPrice);
    const prevClose = safeNum(meta.previousClose) ?? safeNum(meta.chartPreviousClose);
    if (price === null) return null;

    const change = prevClose !== null ? price - prevClose : 0;
    const changePct = prevClose && prevClose !== 0 ? (change / prevClose) * 100 : 0;

    return {
      price,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePct * 100) / 100,
      volume: safeNum(meta.regularMarketVolume) ?? 0,
      latestTradingDay: new Date().toISOString().slice(0, 10),
    };
  } catch (err) {
    console.warn("[YahooFinance] Quote failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Extract a partial profile from the chart endpoint metadata.
 * Provides name, exchange, 52-week high/low, and currency — no API key needed.
 * Missing fields are set to null; AV fills the rest.
 */
export async function yfGetPartialProfile(ticker: string): Promise<Partial<CompanyProfile> | null> {
  try {
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d&includePrePost=false`;
    const data = await yfFetch(url);

    const result = (data.chart as Record<string, unknown>)?.result as Array<Record<string, unknown>> | undefined;
    if (!result?.[0]) return null;

    const meta = result[0].meta as Record<string, unknown> | undefined;
    if (!meta) return null;

    const name = String(meta.shortName ?? meta.longName ?? ticker);
    const exchange = String(meta.fullExchangeName ?? meta.exchangeName ?? "");

    if (!exchange && name === ticker) return null;

    return {
      ticker,
      name,
      exchange,
      currency: String(meta.currency ?? ""),
      fiftyTwoWeekHigh: safeNum(meta.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: safeNum(meta.fiftyTwoWeekLow),
    };
  } catch (err) {
    console.warn("[YahooFinance] Partial profile failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ============================================================================
// Stub exports for removed features
// (v10/quoteSummary requires auth crumb — these return null gracefully)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function yfGetProfile(ticker: string): Promise<CompanyProfile | null> {
  // quoteSummary now requires crumb auth — use AV instead
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function yfGetEarnings(ticker: string): Promise<null> {
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function yfGetFinancials(ticker: string): Promise<null> {
  return null;
}
