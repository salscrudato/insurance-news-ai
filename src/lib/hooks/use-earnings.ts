/**
 * Earnings Feature — React Hooks
 *
 * Data fetching hooks for the Earnings pages using TanStack Query.
 * Uses HTTP fetch (primary) for Capacitor compatibility.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"

// ============================================================================
// Types (mirror backend types for the frontend)
// ============================================================================

export interface CompanySearchResult {
  ticker: string
  name: string
  type: string
  region: string
  currency: string
  matchScore: number
}

export interface CompanyProfile {
  ticker: string
  name: string
  exchange: string
  sector: string
  industry: string
  marketCap: number | null
  peRatio: number | null
  pbRatio: number | null
  roe: number | null
  dividendYield: number | null
  beta: number | null
  eps: number | null
  website: string
  description: string
  country: string
  currency: string
  fiscalYearEnd: string
  analystTargetPrice: number | null
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  sharesOutstanding: number | null
  bookValue: number | null
  forwardPE: number | null
  evToEbitda: number | null
  profitMargin: number | null
  revenuePerShareTTM: number | null
  revenueTTM: number | null
}

export interface CompanyQuote {
  price: number
  change: number
  changePercent: number
  volume: number
  latestTradingDay: string
}

export interface QuarterlyEarning {
  fiscalDateEnding: string
  reportedDate: string
  reportedEPS: number | null
  estimatedEPS: number | null
  surprise: number | null
  surprisePercentage: number | null
}

export interface IncomeStatement {
  fiscalDateEnding: string
  totalRevenue: number | null
  costOfRevenue: number | null
  grossProfit: number | null
  operatingIncome: number | null
  netIncome: number | null
  ebitda: number | null
  interestExpense: number | null
  researchAndDevelopment: number | null
  sellingGeneralAdmin: number | null
  operatingExpenses: number | null
}

export interface BalanceSheet {
  fiscalDateEnding: string
  totalAssets: number | null
  totalLiabilities: number | null
  totalShareholderEquity: number | null
  cashAndEquivalents: number | null
  shortTermDebt: number | null
  longTermDebt: number | null
  totalDebt: number | null
  currentAssets: number | null
  currentLiabilities: number | null
  retainedEarnings: number | null
  commonStock: number | null
  goodwill: number | null
  intangibleAssets: number | null
}

export interface CashFlowStatement {
  fiscalDateEnding: string
  operatingCashflow: number | null
  capitalExpenditures: number | null
  freeCashFlow: number | null
  dividendPayout: number | null
  netIncome: number | null
  depreciationAmortization: number | null
  changeInWorkingCapital: number | null
  investingCashflow: number | null
  financingCashflow: number | null
}

export interface Filing {
  accessionNumber: string
  form: string
  filingDate: string
  primaryDocument: string
  primaryDocDescription: string
  reportDate: string
  url: string
}

export interface EarningsBundle {
  profile: CompanyProfile
  quote: CompanyQuote | null
  earnings: {
    latestQuarter: string | null
    quarterlyHistory: QuarterlyEarning[]
  }
  financials: {
    income: IncomeStatement[]
    balance: BalanceSheet[]
    cashflow: CashFlowStatement[]
  }
  filings: Filing[] | null
  updatedAt: string
  dataSources?: {
    earnings?: "sec-xbrl" | "alpha-vantage" | "none"
    income?: "sec-xbrl" | "alpha-vantage" | "none"
    balance?: "sec-xbrl" | "alpha-vantage" | "none"
    cashflow?: "alpha-vantage" | "none"
    profile?: "alpha-vantage" | "yahoo" | "none"
    quote?: "yahoo" | "alpha-vantage" | "none"
    filings?: "sec-edgar" | "none"
  }
}

export interface EarningsAIInsights {
  headline: string
  summaryBullets: string[]
  whatItMeansBullets: string[]
  watchItems: string[]
  kpis: {
    combinedRatio?: string
    lossRatio?: string
    expenseRatio?: string
    catLosses?: string
    reserveDev?: string
    nwp?: string
    bookValuePerShare?: string
    roe?: string
    pb?: string
  }
  sources: Array<{ label: string; url: string }>
  generatedAt: string
  periodKey: string
}

export interface FilingRemarks {
  highlights: string[]
  notableQuotes: string[]
  topics: string[]
  sources: Array<{ label: string; url: string }>
  generatedAt: string
}

// ============================================================================
// API Base
// ============================================================================

const FUNCTIONS_BASE_URL = "https://us-central1-insurance-news-ai.cloudfunctions.net"

async function callFunction<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${FUNCTIONS_BASE_URL}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error")
    throw new Error(`Function ${name} failed: ${response.status} ${errText}`)
  }

  const json = await response.json()
  return (json.result ?? json) as T
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Search companies by name or ticker.
 * Only fires when query is non-empty. Debounced in the UI layer.
 */
export function useEarningsSearch(query: string) {
  return useQuery({
    queryKey: ["earnings-search", query],
    queryFn: () =>
      callFunction<{ results: CompanySearchResult[] }>("searchEarningsCompanies", {
        query,
      }).then((r) => r.results),
    enabled: query.trim().length >= 1,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2,
    retry: 1,
  })
}

/**
 * Get the full earnings bundle for a ticker (detail page).
 */
export function useEarningsBundle(ticker: string | undefined) {
  return useQuery({
    queryKey: ["earnings-bundle", ticker],
    queryFn: () =>
      callFunction<EarningsBundle>("getCompanyEarningsBundle", {
        ticker: ticker!,
      }),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  })
}

/**
 * Generate AI earnings insights (on-demand mutation).
 */
export function useEarningsAIInsights(ticker: string | undefined, periodKey: string | undefined) {
  return useQuery({
    queryKey: ["earnings-ai-insights", ticker, periodKey],
    queryFn: () =>
      callFunction<EarningsAIInsights>("getEarningsAIInsights", {
        ticker: ticker!,
        periodKey: periodKey!,
      }),
    enabled: false, // Manual trigger only
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: 1,
  })
}

/**
 * Generate filing remarks (on-demand mutation).
 */
export function useFilingRemarks() {
  return useMutation({
    mutationFn: (params: { ticker: string; accessionNumber: string; periodKey: string }) =>
      callFunction<FilingRemarks>("getFilingRemarks", params),
  })
}

/**
 * Get the user's earnings watchlist from Firestore prefs.
 */
export function useEarningsWatchlist() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["earnings-watchlist", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return []
      const prefsRef = doc(db, "users", user.uid, "prefs", "main")
      const snap = await getDoc(prefsRef)
      if (!snap.exists()) return []
      const data = snap.data()
      return (data?.earningsWatchlist ?? []) as string[]
    },
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Toggle a ticker on/off the earnings watchlist.
 */
export function useToggleEarningsWatchlist() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (ticker: string) =>
      callFunction<{ ticker: string; isWatched: boolean; watchlist: string[] }>(
        "toggleEarningsWatchlistTicker",
        { ticker }
      ),
    onSuccess: (result) => {
      // Optimistically update the watchlist cache
      queryClient.setQueryData(["earnings-watchlist", user?.uid], result.watchlist)
    },
  })
}
