/**
 * Alpha Vantage Adapter
 *
 * Free-tier API integration for:
 * - Company search (SYMBOL_SEARCH)
 * - Company overview (OVERVIEW)
 * - Earnings data (EARNINGS)
 * - Income statement (INCOME_STATEMENT)
 * - Balance sheet (BALANCE_SHEET)
 * - Cash flow (CASH_FLOW)
 * - Global quote (GLOBAL_QUOTE)
 *
 * Rate limits: 25 requests/day on free tier.
 * All responses are normalized into internal types.
 */

import { defineSecret } from "firebase-functions/params";
import type {
  CompanyProfile,
  CompanyQuote,
  EarningsData,
  QuarterlyEarning,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
  CompanySearchResult,
} from "./types.js";
import { rateLimitedAvFetch } from "./request-queue.js";

// ============================================================================
// Config
// ============================================================================

export const alphaVantageApiKey = defineSecret("ALPHA_VANTAGE_API_KEY");

const BASE_URL = "https://www.alphavantage.co/query";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Safely parse a numeric string. Returns null for "None", "-", empty, or invalid values.
 */
function safeNum(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null || val === "None" || val === "-" || val === "") {
    return null;
  }
  const n = typeof val === "number" ? val : parseFloat(val);
  return isNaN(n) ? null : n;
}

/**
 * Safely parse a percentage string (e.g., "12.5%" → 0.125, or "0.125" → 0.125).
 */
function safePct(val: string | undefined | null): number | null {
  if (!val || val === "None" || val === "-") return null;
  const cleaned = val.replace("%", "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  // If the original had %, convert from percentage to decimal
  return val.includes("%") ? n / 100 : n;
}

/**
 * Fetch from Alpha Vantage using the key pool with rate-limit awareness.
 * Falls back to the original single key if pool is unavailable.
 */
async function fetchAV(params: Record<string, string>): Promise<Record<string, unknown>> {
  // Try key pool first
  try {
    return await rateLimitedAvFetch(params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // If pool is exhausted, try the original single key as last resort
    if (msg.startsWith("AV_KEYS_EXHAUSTED")) {
      const key = alphaVantageApiKey.value();
      if (!key) throw err; // No fallback key either

      console.log("[AlphaVantage] Key pool exhausted, trying primary key as last resort");
      const url = new URL(BASE_URL);
      url.searchParams.set("apikey", key);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }

      const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
      if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);

      const data = await res.json() as Record<string, unknown>;

      if (data["Error Message"]) throw new Error(`Alpha Vantage error: ${data["Error Message"]}`);
      if (data["Note"]) throw new Error(`AV_RATE_LIMITED: ${data["Note"]}`);
      if (data["Information"] && typeof data["Information"] === "string") {
        throw new Error(`AV_RATE_LIMITED: ${data["Information"]}`);
      }

      return data;
    }
    throw err;
  }
}

// ============================================================================
// Search
// ============================================================================

export async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
  const data = await fetchAV({ function: "SYMBOL_SEARCH", keywords: query });
  const matches = (data["bestMatches"] ?? []) as Array<Record<string, string>>;

  return matches.map((m) => ({
    ticker: m["1. symbol"] ?? "",
    name: m["2. name"] ?? "",
    type: m["3. type"] ?? "",
    region: m["4. region"] ?? "",
    currency: m["8. currency"] ?? "",
    matchScore: safeNum(m["9. matchScore"]) ?? 0,
  })).filter((r) => r.ticker && r.name);
}

// ============================================================================
// Company Overview → Profile
// ============================================================================

export async function getCompanyOverview(ticker: string): Promise<CompanyProfile> {
  const d = await fetchAV({ function: "OVERVIEW", symbol: ticker }) as Record<string, string>;

  return {
    ticker: d["Symbol"] ?? ticker,
    name: d["Name"] ?? ticker,
    exchange: d["Exchange"] ?? "",
    sector: d["Sector"] ?? "",
    industry: d["Industry"] ?? "",
    marketCap: safeNum(d["MarketCapitalization"]),
    peRatio: safeNum(d["PERatio"]),
    pbRatio: safeNum(d["PriceToBookRatio"]),
    roe: safeNum(d["ReturnOnEquityTTM"]),
    dividendYield: safePct(d["DividendYield"]),
    beta: safeNum(d["Beta"]),
    eps: safeNum(d["EPS"]),
    website: d["OfficialWebsite"] ?? "",
    description: d["Description"] ?? "",
    country: d["Country"] ?? "",
    currency: d["Currency"] ?? "",
    fiscalYearEnd: d["FiscalYearEnd"] ?? "",
    analystTargetPrice: safeNum(d["AnalystTargetPrice"]),
    fiftyTwoWeekHigh: safeNum(d["52WeekHigh"]),
    fiftyTwoWeekLow: safeNum(d["52WeekLow"]),
    sharesOutstanding: safeNum(d["SharesOutstanding"]),
    bookValue: safeNum(d["BookValue"]),
    forwardPE: safeNum(d["ForwardPE"]),
    evToEbitda: safeNum(d["EVToEBITDA"]),
    profitMargin: safeNum(d["ProfitMargin"]),
    revenuePerShareTTM: safeNum(d["RevenuePerShareTTM"]),
    revenueTTM: safeNum(d["RevenueTTM"]),
  };
}

// ============================================================================
// Earnings
// ============================================================================

export async function getEarnings(ticker: string): Promise<EarningsData> {
  const data = await fetchAV({ function: "EARNINGS", symbol: ticker });

  const annual = ((data["annualEarnings"] ?? []) as Array<Record<string, string>>).map((e) => ({
    fiscalDateEnding: e["fiscalDateEnding"] ?? "",
    reportedEPS: safeNum(e["reportedEPS"]),
  }));

  const quarterly = ((data["quarterlyEarnings"] ?? []) as Array<Record<string, string>>).map((e): QuarterlyEarning => ({
    fiscalDateEnding: e["fiscalDateEnding"] ?? "",
    reportedDate: e["reportedDate"] ?? "",
    reportedEPS: safeNum(e["reportedEPS"]),
    estimatedEPS: safeNum(e["estimatedEPS"]),
    surprise: safeNum(e["surprise"]),
    surprisePercentage: safeNum(e["surprisePercentage"]),
  }));

  return {
    annualEarnings: annual,
    quarterlyEarnings: quarterly.slice(0, 8),
  };
}

// ============================================================================
// Financial Statements
// ============================================================================

export async function getIncomeStatements(ticker: string): Promise<IncomeStatement[]> {
  const data = await fetchAV({ function: "INCOME_STATEMENT", symbol: ticker });
  const reports = (data["quarterlyReports"] ?? []) as Array<Record<string, string>>;

  return reports.slice(0, 8).map((r): IncomeStatement => ({
    fiscalDateEnding: r["fiscalDateEnding"] ?? "",
    totalRevenue: safeNum(r["totalRevenue"]),
    costOfRevenue: safeNum(r["costOfRevenue"]),
    grossProfit: safeNum(r["grossProfit"]),
    operatingIncome: safeNum(r["operatingIncome"]),
    netIncome: safeNum(r["netIncome"]),
    ebitda: safeNum(r["ebitda"]),
    interestExpense: safeNum(r["interestExpense"]),
    researchAndDevelopment: safeNum(r["researchAndDevelopment"]),
    sellingGeneralAdmin: safeNum(r["sellingGeneralAndAdministrative"]),
    operatingExpenses: safeNum(r["operatingExpenses"]),
  }));
}

export async function getBalanceSheets(ticker: string): Promise<BalanceSheet[]> {
  const data = await fetchAV({ function: "BALANCE_SHEET", symbol: ticker });
  const reports = (data["quarterlyReports"] ?? []) as Array<Record<string, string>>;

  return reports.slice(0, 8).map((r): BalanceSheet => ({
    fiscalDateEnding: r["fiscalDateEnding"] ?? "",
    totalAssets: safeNum(r["totalAssets"]),
    totalLiabilities: safeNum(r["totalLiabilities"]),
    totalShareholderEquity: safeNum(r["totalShareholderEquity"]),
    cashAndEquivalents: safeNum(r["cashAndCashEquivalentsAtCarryingValue"]),
    shortTermDebt: safeNum(r["shortTermDebt"]),
    longTermDebt: safeNum(r["longTermDebt"]),
    totalDebt: safeNum(r["shortLongTermDebtTotal"]),
    currentAssets: safeNum(r["totalCurrentAssets"]),
    currentLiabilities: safeNum(r["totalCurrentLiabilities"]),
    retainedEarnings: safeNum(r["retainedEarnings"]),
    commonStock: safeNum(r["commonStock"]),
    goodwill: safeNum(r["goodwill"]),
    intangibleAssets: safeNum(r["intangibleAssets"]),
  }));
}

export async function getCashFlowStatements(ticker: string): Promise<CashFlowStatement[]> {
  const data = await fetchAV({ function: "CASH_FLOW", symbol: ticker });
  const reports = (data["quarterlyReports"] ?? []) as Array<Record<string, string>>;

  return reports.slice(0, 8).map((r): CashFlowStatement => ({
    fiscalDateEnding: r["fiscalDateEnding"] ?? "",
    operatingCashflow: safeNum(r["operatingCashflow"]),
    capitalExpenditures: safeNum(r["capitalExpenditures"]),
    freeCashFlow:
      safeNum(r["operatingCashflow"]) !== null && safeNum(r["capitalExpenditures"]) !== null
        ? (safeNum(r["operatingCashflow"])! - Math.abs(safeNum(r["capitalExpenditures"])!))
        : null,
    dividendPayout: safeNum(r["dividendPayout"]),
    netIncome: safeNum(r["netIncome"]),
    depreciationAmortization: safeNum(r["depreciationDepletionAndAmortization"]),
    changeInWorkingCapital: safeNum(r["changeInOperatingLiabilities"]),
    investingCashflow: safeNum(r["cashflowFromInvestment"]),
    financingCashflow: safeNum(r["cashflowFromFinancing"]),
  }));
}

// ============================================================================
// Global Quote
// ============================================================================

export async function getQuote(ticker: string): Promise<CompanyQuote | null> {
  try {
    const data = await fetchAV({ function: "GLOBAL_QUOTE", symbol: ticker });
    const q = (data["Global Quote"] ?? {}) as Record<string, string>;

    if (!q["05. price"]) return null;

    const changePctStr = (q["10. change percent"] ?? "0").replace("%", "");

    return {
      price: safeNum(q["05. price"]) ?? 0,
      change: safeNum(q["09. change"]) ?? 0,
      changePercent: safeNum(changePctStr) ?? 0,
      volume: safeNum(q["06. volume"]) ?? 0,
      latestTradingDay: q["07. latest trading day"] ?? "",
    };
  } catch {
    // Quote is optional — fail silently
    return null;
  }
}
