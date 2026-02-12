/**
 * SEC EDGAR XBRL CompanyFacts Adapter
 *
 * Uses the free SEC XBRL API to fetch precise, audited financial data
 * directly from SEC filings. This is the AUTHORITATIVE source for:
 * - EPS (diluted, basic)
 * - Revenue / Net Premiums Earned
 * - Net Income
 * - Total Assets, Equity, etc.
 *
 * No API key required. Rate limit: 10 req/sec (very generous).
 * Data is exact as filed — no third-party normalization issues.
 *
 * Endpoint: https://data.sec.gov/api/xbrl/companyfacts/CIK{padded}.json
 */

import { tickerToCik } from "./sec-edgar.js";
import type { QuarterlyEarning, IncomeStatement, BalanceSheet } from "./types.js";

const XBRL_BASE = "https://data.sec.gov/api/xbrl/companyfacts";
const SEC_USER_AGENT = "InsuranceBrief/1.0 (support@theinsurancebrief.com)";

// Max duration in days for a "single quarter" entry (vs YTD cumulative)
const MAX_QUARTER_DAYS = 105;

interface XBRLEntry {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;  // Q1, Q2, Q3, Q4, FY
  form: string; // 10-Q, 10-K
  filed: string;
}

// ============================================================================
// Core Fetcher
// ============================================================================

/** In-memory cache for company facts (these are large JSON responses) */
const factsCache = new Map<string, { data: Record<string, unknown>; ts: number }>();
const FACTS_CACHE_MS = 30 * 60 * 1000; // 30 minutes in-memory

async function fetchCompanyFacts(ticker: string): Promise<Record<string, unknown> | null> {
  const sym = ticker.toUpperCase();

  // Check in-memory cache first (avoids redundant fetches within same invocation)
  const cached = factsCache.get(sym);
  if (cached && Date.now() - cached.ts < FACTS_CACHE_MS) {
    return cached.data;
  }

  const cik = await tickerToCik(sym);
  if (!cik) return null; // Non-US company

  const paddedCik = cik.padStart(10, "0");
  const url = `${XBRL_BASE}/CIK${paddedCik}.json`;

  const res = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT, "Accept": "application/json" },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`SEC XBRL HTTP ${res.status}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  factsCache.set(sym, { data, ts: Date.now() });
  return data;
}

/**
 * Get the official SEC entity name for a ticker.
 * Useful as fallback when AV profile is unavailable.
 */
export async function xbrlGetEntityName(ticker: string): Promise<string | null> {
  const data = await fetchCompanyFacts(ticker);
  if (!data) return null;
  const name = data.entityName as string | undefined;
  return name ?? null;
}

// ============================================================================
// Helpers
// ============================================================================

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Extract quarterly (single-period) entries from XBRL units array.
 * Filters out YTD cumulative entries by checking date range.
 * For balance sheet items (no start date), all entries are "instant".
 */
function extractQuarterly(entries: XBRLEntry[], isInstant = false): XBRLEntry[] {
  const seen = new Set<string>(); // Dedup by end date

  return entries
    .filter((e) => {
      // Only 10-Q and 10-K filings
      if (!["10-Q", "10-K"].includes(e.form)) return false;
      // Skip FY annual entries
      if (e.fp === "FY") return false;

      if (isInstant) {
        // Balance sheet items are "instant" — no start date
        return true;
      }

      // Flow items: filter for single-quarter duration
      if (!e.start) return false;
      const days = daysBetween(e.start, e.end);
      return days > 0 && days <= MAX_QUARTER_DAYS;
    })
    .filter((e) => {
      // Dedup: keep first entry per end date (most recent filing)
      const key = e.end;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.end.localeCompare(a.end)); // Newest first
}

function getFactUnits(
  facts: Record<string, unknown>,
  concept: string,
  unitType: string
): XBRLEntry[] {
  const usgaap = (facts["us-gaap"] ?? {}) as Record<string, unknown>;
  const fact = (usgaap[concept] ?? {}) as Record<string, unknown>;
  const units = (fact["units"] ?? {}) as Record<string, unknown>;
  return ((units[unitType] ?? []) as XBRLEntry[]);
}

/** Try multiple concept names, return first non-empty */
function getFirstAvailable(
  facts: Record<string, unknown>,
  concepts: string[],
  unitType: string,
  isInstant = false,
): XBRLEntry[] {
  for (const concept of concepts) {
    const entries = getFactUnits(facts, concept, unitType);
    const quarterly = extractQuarterly(entries, isInstant);
    if (quarterly.length > 0) return quarterly;
  }
  return [];
}

// ============================================================================
// Public API: Quarterly Earnings (EPS)
// ============================================================================

export async function xbrlGetQuarterlyEarnings(
  ticker: string,
  limit = 8
): Promise<QuarterlyEarning[] | null> {
  const data = await fetchCompanyFacts(ticker);
  if (!data) return null;

  const facts = (data.facts ?? {}) as Record<string, unknown>;

  // EPS diluted is the standard metric
  const epsEntries = getFirstAvailable(facts, [
    "EarningsPerShareDiluted",
    "EarningsPerShareBasic",
  ], "USD/shares");

  if (epsEntries.length === 0) return null;

  return epsEntries.slice(0, limit).map((e): QuarterlyEarning => ({
    fiscalDateEnding: e.end,
    reportedDate: e.filed,
    reportedEPS: e.val,
    estimatedEPS: null, // XBRL doesn't have estimates
    surprise: null,
    surprisePercentage: null,
  }));
}

// ============================================================================
// Public API: Quarterly Income Statement (key lines)
// ============================================================================

export async function xbrlGetQuarterlyIncome(
  ticker: string,
  limit = 8
): Promise<IncomeStatement[] | null> {
  const data = await fetchCompanyFacts(ticker);
  if (!data) return null;

  const facts = (data.facts ?? {}) as Record<string, unknown>;

  // Revenue: insurance companies use different concepts
  const revenueEntries = getFirstAvailable(facts, [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "PremiumsEarnedNet",  // Insurance-specific
    "InsuranceServicesRevenue",
  ], "USD");

  const netIncomeEntries = getFirstAvailable(facts, [
    "NetIncomeLoss",
    "ProfitLoss",
    "NetIncomeLossAvailableToCommonStockholdersBasic",
  ], "USD");

  const opIncomeEntries = getFirstAvailable(facts, [
    "OperatingIncomeLoss",
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
  ], "USD");

  // Build quarterly income statements by merging on end date
  const dates = new Set<string>();
  revenueEntries.forEach((e) => dates.add(e.end));
  netIncomeEntries.forEach((e) => dates.add(e.end));

  const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a)).slice(0, limit);

  if (sortedDates.length === 0) return null;

  const revMap = new Map(revenueEntries.map((e) => [e.end, e.val]));
  const niMap = new Map(netIncomeEntries.map((e) => [e.end, e.val]));
  const opMap = new Map(opIncomeEntries.map((e) => [e.end, e.val]));

  return sortedDates.map((date): IncomeStatement => ({
    fiscalDateEnding: date,
    totalRevenue: revMap.get(date) ?? null,
    costOfRevenue: null,
    grossProfit: null,
    operatingIncome: opMap.get(date) ?? null,
    netIncome: niMap.get(date) ?? null,
    ebitda: null,
    interestExpense: null,
    researchAndDevelopment: null,
    sellingGeneralAdmin: null,
    operatingExpenses: null,
  }));
}

// ============================================================================
// Public API: Balance Sheet (key lines, instant values)
// ============================================================================

export async function xbrlGetQuarterlyBalance(
  ticker: string,
  limit = 8
): Promise<BalanceSheet[] | null> {
  const data = await fetchCompanyFacts(ticker);
  if (!data) return null;

  const facts = (data.facts ?? {}) as Record<string, unknown>;

  const totalAssetsEntries = getFirstAvailable(facts, ["Assets"], "USD", true);
  const totalLiabEntries = getFirstAvailable(facts, ["Liabilities"], "USD", true);
  const equityEntries = getFirstAvailable(facts, [
    "StockholdersEquity",
    "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
  ], "USD", true);
  const cashEntries = getFirstAvailable(facts, [
    "CashAndCashEquivalentsAtCarryingValue",
    "Cash",
  ], "USD", true);

  const dates = new Set<string>();
  totalAssetsEntries.forEach((e) => dates.add(e.end));

  const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a)).slice(0, limit);
  if (sortedDates.length === 0) return null;

  const taMap = new Map(totalAssetsEntries.map((e) => [e.end, e.val]));
  const tlMap = new Map(totalLiabEntries.map((e) => [e.end, e.val]));
  const eqMap = new Map(equityEntries.map((e) => [e.end, e.val]));
  const cashMap = new Map(cashEntries.map((e) => [e.end, e.val]));

  return sortedDates.map((date): BalanceSheet => ({
    fiscalDateEnding: date,
    totalAssets: taMap.get(date) ?? null,
    totalLiabilities: tlMap.get(date) ?? null,
    totalShareholderEquity: eqMap.get(date) ?? null,
    cashAndEquivalents: cashMap.get(date) ?? null,
    shortTermDebt: null,
    longTermDebt: null,
    totalDebt: null,
    currentAssets: null,
    currentLiabilities: null,
    retainedEarnings: null,
    commonStock: null,
    goodwill: null,
    intangibleAssets: null,
  }));
}
