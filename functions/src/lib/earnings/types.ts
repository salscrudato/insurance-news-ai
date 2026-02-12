/**
 * Earnings Feature — Shared Types
 *
 * Internal normalized types for company data, earnings, financials, and filings.
 * All external API responses are mapped into these shapes.
 */

// ============================================================================
// Company Profile
// ============================================================================

export interface CompanyProfile {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  roe: number | null;
  dividendYield: number | null;
  beta: number | null;
  eps: number | null;
  website: string;
  description: string;
  country: string;
  currency: string;
  fiscalYearEnd: string;
  analystTargetPrice: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  sharesOutstanding: number | null;
  bookValue: number | null;
  forwardPE: number | null;
  evToEbitda: number | null;
  profitMargin: number | null;
  revenuePerShareTTM: number | null;
  revenueTTM: number | null;
}

// ============================================================================
// Quote
// ============================================================================

export interface CompanyQuote {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  latestTradingDay: string;
}

// ============================================================================
// Earnings
// ============================================================================

export interface QuarterlyEarning {
  fiscalDateEnding: string;
  reportedDate: string;
  reportedEPS: number | null;
  estimatedEPS: number | null;
  surprise: number | null;
  surprisePercentage: number | null;
}

export interface EarningsData {
  annualEarnings: Array<{ fiscalDateEnding: string; reportedEPS: number | null }>;
  quarterlyEarnings: QuarterlyEarning[];
}

// ============================================================================
// Financial Statements
// ============================================================================

export interface IncomeStatement {
  fiscalDateEnding: string;
  totalRevenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda: number | null;
  interestExpense: number | null;
  researchAndDevelopment: number | null;
  sellingGeneralAdmin: number | null;
  operatingExpenses: number | null;
}

export interface BalanceSheet {
  fiscalDateEnding: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalShareholderEquity: number | null;
  cashAndEquivalents: number | null;
  shortTermDebt: number | null;
  longTermDebt: number | null;
  totalDebt: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  retainedEarnings: number | null;
  commonStock: number | null;
  goodwill: number | null;
  intangibleAssets: number | null;
}

export interface CashFlowStatement {
  fiscalDateEnding: string;
  operatingCashflow: number | null;
  capitalExpenditures: number | null;
  freeCashFlow: number | null;
  dividendPayout: number | null;
  netIncome: number | null;
  depreciationAmortization: number | null;
  changeInWorkingCapital: number | null;
  investingCashflow: number | null;
  financingCashflow: number | null;
}

// ============================================================================
// Filings (SEC EDGAR)
// ============================================================================

export interface Filing {
  accessionNumber: string;
  form: string;
  filingDate: string;
  primaryDocument: string;
  primaryDocDescription: string;
  reportDate: string;
  url: string;
}

// ============================================================================
// Search Result
// ============================================================================

export interface CompanySearchResult {
  ticker: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  matchScore: number;
}

// ============================================================================
// Earnings Bundle (full payload for detail page)
// ============================================================================

export interface EarningsBundle {
  profile: CompanyProfile;
  quote: CompanyQuote | null;
  earnings: {
    latestQuarter: string | null;
    quarterlyHistory: QuarterlyEarning[];
  };
  financials: {
    income: IncomeStatement[];
    balance: BalanceSheet[];
    cashflow: CashFlowStatement[];
  };
  filings: Filing[] | null;
  /** ISO timestamp of when this bundle was assembled */
  updatedAt: string;
  /** Data provenance — which sources contributed to this bundle */
  dataSources?: {
    earnings?: "sec-xbrl" | "alpha-vantage" | "none";
    income?: "sec-xbrl" | "alpha-vantage" | "none";
    balance?: "sec-xbrl" | "alpha-vantage" | "none";
    cashflow?: "alpha-vantage" | "none";
    profile?: "alpha-vantage" | "yahoo" | "none";
    quote?: "yahoo" | "alpha-vantage" | "none";
    filings?: "sec-edgar" | "none";
  };
}

// ============================================================================
// AI Insights
// ============================================================================

export interface EarningsAIInsights {
  headline: string;
  summaryBullets: string[];
  whatItMeansBullets: string[];
  watchItems: string[];
  kpis: {
    combinedRatio?: string;
    lossRatio?: string;
    expenseRatio?: string;
    catLosses?: string;
    reserveDev?: string;
    nwp?: string;
    bookValuePerShare?: string;
    roe?: string;
    pb?: string;
  };
  sources: Array<{ label: string; url: string }>;
  generatedAt: string;
  periodKey: string;
}

// ============================================================================
// Filing Remarks
// ============================================================================

export interface FilingRemarks {
  highlights: string[];
  notableQuotes: string[];
  topics: string[];
  sources: Array<{ label: string; url: string }>;
  generatedAt: string;
}
