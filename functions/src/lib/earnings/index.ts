/**
 * Earnings Module — Public API
 *
 * Re-exports all types, adapters, and caching utilities.
 */

// Types
export type {
  CompanyProfile,
  CompanyQuote,
  EarningsData,
  QuarterlyEarning,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
  Filing,
  CompanySearchResult,
  EarningsBundle,
  EarningsAIInsights,
  FilingRemarks,
} from "./types.js";

// Alpha Vantage adapter
export {
  alphaVantageApiKey,
  searchCompanies as avSearchCompanies,
  getCompanyOverview,
  getEarnings,
  getIncomeStatements,
  getBalanceSheets,
  getCashFlowStatements,
  getQuote,
} from "./alpha-vantage.js";

// Yahoo Finance adapter (search + quote — no API key needed)
export {
  yfSearchCompanies,
  yfGetQuote,
  yfGetPartialProfile,
  yfGetProfile,
  yfGetEarnings,
  yfGetFinancials,
} from "./yahoo-finance.js";

// SEC EDGAR adapter
export {
  tickerToCik,
  getRecentFilings,
  getFilingDocumentText,
} from "./sec-edgar.js";

// Cache
export {
  CACHE_TTL,
  STALE_GRACE_MS,
  getCached,
  getCachedWithStaleness,
  setCache,
  getOrFetch,
  getCachedBundle,
  setCachedBundle,
  invalidateTickerCache,
} from "./cache.js";

// Key Pool
export {
  allAvSecrets,
  avKey1,
  avKey2,
  avKey3,
  getAvailableKey,
  recordCall,
  markRateLimited,
  getPoolStatus,
  syncUsageToFirestore,
  loadUsageFromFirestore,
} from "./key-pool.js";

// Request Queue
export {
  deduplicatedFetch,
  rateLimitedAvFetch,
  throttledAvCall,
} from "./request-queue.js";

// SEC XBRL (precise, audited data from SEC filings)
export {
  xbrlGetQuarterlyEarnings,
  xbrlGetQuarterlyIncome,
  xbrlGetQuarterlyBalance,
  xbrlGetEntityName,
} from "./sec-xbrl.js";
