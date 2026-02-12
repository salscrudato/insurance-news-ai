/**
 * Earnings Detail Page — /earnings/:ticker
 *
 * Apple-inspired, tab-based layout showing:
 * - Overview: KPIs, sparklines, earnings history
 * - Financials: compact quarterly tables
 * - Filings: SEC filings list (US only)
 * - AI Insights: structured analysis
 * - Remarks: filing highlights (US only)
 */

import { useState, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Star,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react"
import {
  useEarningsBundle,
  useEarningsAIInsights,
  useFilingRemarks,
  useEarningsWatchlist,
  useToggleEarningsWatchlist,
} from "@/lib/hooks"
import type {
  EarningsBundle,
  EarningsAIInsights,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
  Filing,
  FilingRemarks,
} from "@/lib/hooks"
import { Skeleton, ErrorState } from "@/components/ui"
import { cn } from "@/lib/utils"
import { Capacitor } from "@capacitor/core"
import { Browser } from "@capacitor/browser"

// ============================================================================
// Helpers
// ============================================================================

function fmt(val: number | null | undefined, opts?: { prefix?: string; suffix?: string; decimals?: number; compact?: boolean }): string {
  if (val === null || val === undefined) return "—"
  const { prefix = "", suffix = "", decimals = 2, compact = false } = opts ?? {}
  if (compact) {
    const abs = Math.abs(val)
    const sign = val < 0 ? "-" : ""
    if (abs >= 1e12) return `${sign}${prefix}${(abs / 1e12).toFixed(1)}T${suffix}`
    if (abs >= 1e9) return `${sign}${prefix}${(abs / 1e9).toFixed(1)}B${suffix}`
    if (abs >= 1e6) return `${sign}${prefix}${(abs / 1e6).toFixed(1)}M${suffix}`
    if (abs >= 1e3) return `${sign}${prefix}${(abs / 1e3).toFixed(1)}K${suffix}`
    return `${sign}${prefix}${abs.toFixed(decimals)}${suffix}`
  }
  return `${prefix}${val.toFixed(decimals)}${suffix}`
}

function fmtPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—"
  return `${(val * 100).toFixed(2)}%`
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

function fmtQuarter(dateStr: string): string {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr + "T00:00:00")
    const q = Math.ceil((d.getMonth() + 1) / 3)
    return `Q${q} ${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

async function openUrl(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

// ============================================================================
// Tab System
// ============================================================================

type TabId = "overview" | "financials" | "filings" | "insights" | "remarks"

interface TabDef {
  id: TabId
  label: string
  available: (bundle: EarningsBundle) => boolean
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", available: () => true },
  { id: "financials", label: "Financials", available: () => true },
  { id: "filings", label: "Filings", available: (b) => b.filings !== null },
  { id: "insights", label: "AI Insights", available: () => true },
  { id: "remarks", label: "Remarks", available: (b) => b.filings !== null },
]

// ============================================================================
// KPI Card
// ============================================================================

function KPICard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] bg-[var(--color-surface)] px-[10px] py-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
      <span className="text-[11px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)] mb-[3px] text-center">
        {label}
      </span>
      <span className="text-[17px] font-bold tracking-[-0.4px] text-[var(--color-text-primary)] text-center">
        {value}
      </span>
      {sublabel && (
        <span className="text-[11px] tracking-[-0.02em] text-[var(--color-text-quaternary)] mt-[1px] text-center">
          {sublabel}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// Sparkline (Lightweight SVG)
// ============================================================================

function Sparkline({
  data,
  color,
  height = 36,
  width = 140,
}: {
  data: number[]
  color: string
  height?: number
  width?: number
}) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const padding = 2

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2)
      const y = height - padding - ((v - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity="0.7"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width - padding}
          cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
          r="3"
          fill={color}
        />
      )}
    </svg>
  )
}

// ============================================================================
// Overview Tab
// ============================================================================

/** Compute YoY change: compare quarter to same quarter last year */
function yoyChange(current: number | null | undefined, history: Array<{ val: number | null }>, quarterIdx: number): string | undefined {
  if (current === null || current === undefined) return undefined
  // Look for same quarter last year (4 quarters back)
  const priorIdx = quarterIdx + 4
  const prior = history[priorIdx]?.val
  if (!prior || prior === 0) return undefined
  const pctChange = ((current - prior) / Math.abs(prior)) * 100
  const sign = pctChange >= 0 ? "+" : ""
  return `${sign}${pctChange.toFixed(1)}% YoY`
}

function OverviewTab({ bundle }: { bundle: EarningsBundle }) {
  const { profile, quote, earnings, financials, dataSources } = bundle
  const latestQ = earnings.quarterlyHistory[0]
  const latestIncome = financials.income[0]

  // Build YoY helper arrays
  const epsHistory = earnings.quarterlyHistory.map((q) => ({ val: q.reportedEPS }))
  const revenueHistory = financials.income.map((i) => ({ val: i.totalRevenue }))
  const niHistory = financials.income.map((i) => ({ val: i.netIncome }))

  // EPS sparkline data (reversed so newest is on right)
  const epsData = earnings.quarterlyHistory
    .filter((q) => q.reportedEPS !== null)
    .map((q) => q.reportedEPS!)
    .reverse()

  // Revenue sparkline data
  const revenueData = financials.income
    .filter((i) => i.totalRevenue !== null)
    .map((i) => i.totalRevenue!)
    .reverse()

  // Data source label
  const earningsSource = dataSources?.earnings
  const showXbrlBadge = earningsSource === "sec-xbrl"

  return (
    <div className="space-y-[20px]">
      {/* Data provenance badge */}
      {showXbrlBadge && (
        <div className="flex items-center gap-[6px] px-[10px] py-[6px] rounded-[8px] bg-[#e8f5e9] self-start w-fit">
          <svg viewBox="0 0 16 16" className="h-[13px] w-[13px] text-[#2e7d32] fill-current shrink-0">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.78 5.22a.75.75 0 0 0-1.06 0L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0 0-1.06Z"/>
          </svg>
          <span className="text-[11px] font-semibold tracking-[0.02em] text-[#2e7d32]">
            SEC-verified financial data
          </span>
        </div>
      )}

      {/* Quote banner */}
      {quote && (
        <div className="flex items-center justify-between rounded-[12px] bg-[var(--color-surface)] px-[16px] py-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
          <div>
            <span className="text-[24px] font-bold tracking-[-0.4px] text-[var(--color-text-primary)]">
              ${quote.price.toFixed(2)}
            </span>
            <span className="block text-[11px] text-[var(--color-text-quaternary)] mt-[1px]">
              {fmtDate(quote.latestTradingDay)}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-[4px] rounded-[8px] px-[10px] py-[5px]",
              quote.change >= 0
                ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                : "bg-[var(--color-destructive-soft)] text-[var(--color-destructive)]"
            )}
          >
            {quote.change >= 0 ? (
              <TrendingUp className="h-[13px] w-[13px]" strokeWidth={2} />
            ) : (
              <TrendingDown className="h-[13px] w-[13px]" strokeWidth={2} />
            )}
            <span className="text-[14px] font-semibold tracking-[-0.2px]">
              {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      )}

      {/* Latest Quarter KPIs */}
      <div>
        <h3 className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)] mb-[8px] px-[2px]">
          Latest Quarter{latestQ ? ` — ${fmtQuarter(latestQ.fiscalDateEnding)}` : ""}
        </h3>
        <div className="grid grid-cols-3 gap-[8px]">
          <KPICard
            label="EPS"
            value={fmt(latestQ?.reportedEPS, { prefix: "$" })}
            sublabel={latestQ?.estimatedEPS ? `Est: $${latestQ.estimatedEPS.toFixed(2)}` : yoyChange(latestQ?.reportedEPS, epsHistory, 0)}
          />
          <KPICard
            label="Surprise"
            value={latestQ?.surprisePercentage !== null && latestQ?.surprisePercentage !== undefined
              ? `${latestQ.surprisePercentage > 0 ? "+" : ""}${latestQ.surprisePercentage.toFixed(1)}%`
              : "—"}
          />
          <KPICard
            label="Revenue"
            value={fmt(latestIncome?.totalRevenue, { prefix: "$", compact: true })}
            sublabel={yoyChange(latestIncome?.totalRevenue, revenueHistory, 0)}
          />
          <KPICard
            label="Net Income"
            value={fmt(latestIncome?.netIncome, { prefix: "$", compact: true })}
            sublabel={yoyChange(latestIncome?.netIncome, niHistory, 0)}
          />
          <KPICard
            label="P/E"
            value={fmt(profile.peRatio, { decimals: 1 })}
          />
          <KPICard
            label="P/B"
            value={fmt(profile.pbRatio, { decimals: 2 })}
          />
          <KPICard
            label="ROE"
            value={profile.roe !== null ? fmtPct(profile.roe) : "—"}
          />
          <KPICard
            label="Market Cap"
            value={fmt(profile.marketCap, { prefix: "$", compact: true })}
          />
          <KPICard
            label="Div. Yield"
            value={profile.dividendYield !== null ? fmtPct(profile.dividendYield) : "—"}
          />
        </div>
      </div>

      {/* Sparklines */}
      {(epsData.length >= 2 || revenueData.length >= 2) && (
        <div className="flex gap-[12px]">
          {epsData.length >= 2 && (
            <div className="flex-1 rounded-[12px] bg-[var(--color-surface)] px-[14px] py-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-[6px]">
                <span className="text-[11px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">
                  EPS Trend
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                  ${epsData[epsData.length - 1].toFixed(2)}
                </span>
              </div>
              <Sparkline data={epsData} color="var(--color-accent)" width={140} height={32} />
            </div>
          )}
          {revenueData.length >= 2 && (
            <div className="flex-1 rounded-[12px] bg-[var(--color-surface)] px-[14px] py-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-[6px]">
                <span className="text-[11px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">
                  Revenue Trend
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                  {fmt(revenueData[revenueData.length - 1], { prefix: "$", compact: true })}
                </span>
              </div>
              <Sparkline data={revenueData} color="var(--color-success)" width={140} height={32} />
            </div>
          )}
        </div>
      )}

      {/* Earnings History Table */}
      {earnings.quarterlyHistory.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)] mb-[8px] px-[2px]">
            Quarterly History
          </h3>
          <div className="overflow-hidden rounded-[12px] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
            {/* Header */}
            <div className="grid grid-cols-5 gap-[4px] px-[12px] py-[8px] bg-[var(--color-fill-quaternary)]">
              {["Quarter", "Reported", "EPS", "Estimate", "Surprise"].map((h) => (
                <span key={h} className="text-[10px] font-semibold tracking-[0.03em] uppercase text-[var(--color-text-tertiary)] text-center">
                  {h}
                </span>
              ))}
            </div>
            {/* Rows */}
            {earnings.quarterlyHistory.map((q, idx) => (
              <div
                key={q.fiscalDateEnding}
                className={cn(
                  "grid grid-cols-5 gap-[4px] px-[12px] py-[9px]",
                  idx < earnings.quarterlyHistory.length - 1 && "border-b border-[var(--color-separator-light)]"
                )}
              >
                <span className="text-[13px] font-medium text-[var(--color-text-primary)] text-center">
                  {fmtQuarter(q.fiscalDateEnding)}
                </span>
                <span className="text-[12px] text-[var(--color-text-secondary)] text-center">
                  {fmtDate(q.reportedDate)}
                </span>
                <span className="text-[13px] font-semibold text-[var(--color-text-primary)] text-center">
                  {fmt(q.reportedEPS, { prefix: "$" })}
                </span>
                <span className="text-[12px] text-[var(--color-text-secondary)] text-center">
                  {fmt(q.estimatedEPS, { prefix: "$" })}
                </span>
                <SurpriseBadge pct={q.surprisePercentage} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 52-Week Range */}
      {profile.fiftyTwoWeekHigh && profile.fiftyTwoWeekLow && quote && (
        <div className="rounded-[12px] bg-[var(--color-surface)] px-[14px] py-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
          <h3 className="text-[11px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)] mb-[8px]">
            52-Week Range
          </h3>
          <div className="flex items-center gap-[10px]">
            <span className="text-[12px] tabular-nums text-[var(--color-text-secondary)] shrink-0">
              ${profile.fiftyTwoWeekLow.toFixed(2)}
            </span>
            <div className="flex-1 relative h-[4px] bg-[var(--color-fill-tertiary)] rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[var(--color-accent)] rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, ((quote.price - profile.fiftyTwoWeekLow) / (profile.fiftyTwoWeekHigh - profile.fiftyTwoWeekLow)) * 100))}%`,
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-[10px] w-[10px] rounded-full bg-[var(--color-accent)] border-[2px] border-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                style={{
                  left: `${Math.min(100, Math.max(0, ((quote.price - profile.fiftyTwoWeekLow) / (profile.fiftyTwoWeekHigh - profile.fiftyTwoWeekLow)) * 100))}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
            <span className="text-[12px] tabular-nums text-[var(--color-text-secondary)] shrink-0">
              ${profile.fiftyTwoWeekHigh.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Company Description */}
      {profile.description && (
        <ExpandableDescription text={profile.description} />
      )}
    </div>
  )
}

function SurpriseBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[12px] text-[var(--color-text-quaternary)] text-center">—</span>
  const isPositive = pct > 0
  const isNegative = pct < 0
  return (
    <span
      className={cn(
        "text-[12px] font-medium text-center",
        isPositive && "text-[var(--color-success)]",
        isNegative && "text-[var(--color-destructive)]",
        !isPositive && !isNegative && "text-[var(--color-text-tertiary)]",
      )}
    >
      {isPositive ? "+" : ""}{pct.toFixed(1)}%
    </span>
  )
}

function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 200

  return (
    <div className="rounded-[12px] bg-[var(--color-surface)] px-[14px] py-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
      <h3 className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)] mb-[6px]">
        About
      </h3>
      <p className={cn(
        "text-[13px] leading-[1.6] tracking-[-0.08px] text-[var(--color-text-secondary)]",
        !expanded && isLong && "line-clamp-3"
      )}>
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-[6px] text-[13px] font-medium text-[var(--color-accent)] flex items-center gap-[3px]"
        >
          {expanded ? "Show less" : "Read more"}
          {expanded ? <ChevronUp className="h-[12px] w-[12px]" /> : <ChevronDown className="h-[12px] w-[12px]" />}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Financials Tab
// ============================================================================

function FinancialsTab({ bundle }: { bundle: EarningsBundle }) {
  const { financials } = bundle
  const [section, setSection] = useState<"income" | "balance" | "cashflow">("income")

  return (
    <div className="space-y-[16px]">
      {/* Section switcher */}
      <div className="flex gap-[6px]">
        {([
          { id: "income" as const, label: "Income" },
          { id: "balance" as const, label: "Balance" },
          { id: "cashflow" as const, label: "Cash Flow" },
        ]).map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              "px-[14px] py-[7px] rounded-[8px] text-[13px] font-medium tracking-[-0.08px]",
              "transition-colors duration-150",
              section === s.id
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-fill-quaternary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-fill-tertiary)]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "income" && <IncomeTable data={financials.income} />}
      {section === "balance" && <BalanceTable data={financials.balance} />}
      {section === "cashflow" && <CashFlowTable data={financials.cashflow} />}
    </div>
  )
}

function CompactTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: Array<{ label: string; values: string[] }>
}) {
  return (
    <div className="overflow-x-auto -mx-[4px] px-[4px]">
      <div className="overflow-hidden rounded-[12px] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] min-w-[500px]">
        {/* Header */}
        <div className="grid gap-[2px] px-[10px] py-[7px] bg-[var(--color-fill-quaternary)]" style={{ gridTemplateColumns: `140px repeat(${headers.length}, 1fr)` }}>
          <span className="text-[10px] font-semibold tracking-[0.03em] uppercase text-[var(--color-text-tertiary)]" />
          {headers.map((h) => (
            <span key={h} className="text-[10px] font-semibold tracking-[0.03em] uppercase text-[var(--color-text-tertiary)] text-right">
              {h}
            </span>
          ))}
        </div>
        {/* Rows */}
        {rows.map((row, idx) => (
          <div
            key={row.label}
            className={cn(
              "grid gap-[2px] px-[10px] py-[8px]",
              idx < rows.length - 1 && "border-b border-[var(--color-separator-light)]"
            )}
            style={{ gridTemplateColumns: `140px repeat(${headers.length}, 1fr)` }}
          >
            <span className="text-[12px] font-medium text-[var(--color-text-secondary)] truncate">
              {row.label}
            </span>
            {row.values.map((v, vi) => (
              <span key={vi} className="text-[12px] text-[var(--color-text-primary)] text-right tabular-nums">
                {v}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function IncomeTable({ data }: { data: IncomeStatement[] }) {
  if (data.length === 0) return <NoDataNotice />
  const headers = data.slice(0, 4).map((d) => fmtQuarter(d.fiscalDateEnding))
  const rows = [
    { label: "Revenue", values: data.slice(0, 4).map((d) => fmt(d.totalRevenue, { prefix: "$", compact: true })) },
    { label: "Gross Profit", values: data.slice(0, 4).map((d) => fmt(d.grossProfit, { prefix: "$", compact: true })) },
    { label: "Operating Income", values: data.slice(0, 4).map((d) => fmt(d.operatingIncome, { prefix: "$", compact: true })) },
    { label: "Net Income", values: data.slice(0, 4).map((d) => fmt(d.netIncome, { prefix: "$", compact: true })) },
    { label: "EBITDA", values: data.slice(0, 4).map((d) => fmt(d.ebitda, { prefix: "$", compact: true })) },
  ]
  return <CompactTable headers={headers} rows={rows} />
}

function BalanceTable({ data }: { data: BalanceSheet[] }) {
  if (data.length === 0) return <NoDataNotice />
  const headers = data.slice(0, 4).map((d) => fmtQuarter(d.fiscalDateEnding))
  const rows = [
    { label: "Total Assets", values: data.slice(0, 4).map((d) => fmt(d.totalAssets, { prefix: "$", compact: true })) },
    { label: "Total Liabilities", values: data.slice(0, 4).map((d) => fmt(d.totalLiabilities, { prefix: "$", compact: true })) },
    { label: "Equity", values: data.slice(0, 4).map((d) => fmt(d.totalShareholderEquity, { prefix: "$", compact: true })) },
    { label: "Cash", values: data.slice(0, 4).map((d) => fmt(d.cashAndEquivalents, { prefix: "$", compact: true })) },
    { label: "Total Debt", values: data.slice(0, 4).map((d) => fmt(d.totalDebt, { prefix: "$", compact: true })) },
  ]
  return <CompactTable headers={headers} rows={rows} />
}

function CashFlowTable({ data }: { data: CashFlowStatement[] }) {
  if (data.length === 0) return <NoDataNotice />
  const headers = data.slice(0, 4).map((d) => fmtQuarter(d.fiscalDateEnding))
  const rows = [
    { label: "Operating CF", values: data.slice(0, 4).map((d) => fmt(d.operatingCashflow, { prefix: "$", compact: true })) },
    { label: "CapEx", values: data.slice(0, 4).map((d) => fmt(d.capitalExpenditures, { prefix: "$", compact: true })) },
    { label: "Free Cash Flow", values: data.slice(0, 4).map((d) => fmt(d.freeCashFlow, { prefix: "$", compact: true })) },
    { label: "Dividends", values: data.slice(0, 4).map((d) => fmt(d.dividendPayout, { prefix: "$", compact: true })) },
    { label: "Financing CF", values: data.slice(0, 4).map((d) => fmt(d.financingCashflow, { prefix: "$", compact: true })) },
  ]
  return <CompactTable headers={headers} rows={rows} />
}

function NoDataNotice() {
  return (
    <div className="rounded-[12px] bg-[var(--color-surface)] px-[16px] py-[24px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
      <p className="text-[14px] text-[var(--color-text-tertiary)]">No data available</p>
    </div>
  )
}

// ============================================================================
// Filings Tab
// ============================================================================

function FilingsTab({ filings }: { filings: Filing[] | null }) {
  if (!filings || filings.length === 0) {
    return (
      <div className="rounded-[12px] bg-[var(--color-surface)] px-[16px] py-[24px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
        <p className="text-[14px] text-[var(--color-text-tertiary)]">
          No SEC filings available for this company
        </p>
        <p className="text-[12px] text-[var(--color-text-quaternary)] mt-[4px]">
          Filings are only available for US-listed companies
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[12px] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
      {filings.map((f, idx) => (
        <button
          key={f.accessionNumber}
          onClick={() => openUrl(f.url)}
          className={cn(
            "group flex w-full items-center gap-[12px] px-[14px] py-[12px] text-left",
            "transition-colors duration-150",
            "hover:bg-[var(--color-fill-quaternary)] active:bg-[var(--color-fill-tertiary)]",
            "-webkit-tap-highlight-color-transparent",
            idx < filings.length - 1 && "border-b border-[var(--color-separator-light)]"
          )}
        >
          <div
            className={cn(
              "flex h-[32px] w-[32px] items-center justify-center rounded-[8px] shrink-0",
              f.form.startsWith("10-K") ? "bg-[var(--color-info-soft)]" : f.form.startsWith("8-K") ? "bg-[var(--color-warning-soft)]" : "bg-[var(--color-accent-soft)]"
            )}
          >
            <FileText
              className={cn(
                "h-[14px] w-[14px]",
                f.form.startsWith("10-K") ? "text-[var(--color-info)]" : f.form.startsWith("8-K") ? "text-[var(--color-warning)]" : "text-[var(--color-accent)]"
              )}
              strokeWidth={1.8}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-[6px]">
              <span className="text-[14px] font-semibold tracking-[-0.2px] text-[var(--color-text-primary)]">
                {f.form}
              </span>
              <span className="text-[12px] text-[var(--color-text-tertiary)]">
                {fmtDate(f.filingDate)}
              </span>
            </div>
            {f.primaryDocDescription && (
              <span className="block text-[12px] text-[var(--color-text-secondary)] truncate mt-[1px]">
                {f.primaryDocDescription}
              </span>
            )}
          </div>
          <ExternalLink
            className="h-[13px] w-[13px] shrink-0 text-[var(--color-text-quaternary)] opacity-60"
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// AI Insights Tab
// ============================================================================

function AIInsightsTab({
  ticker,
  periodKey,
}: {
  ticker: string
  periodKey: string | null
}) {
  const pk = periodKey ?? "latest"
  const {
    data: insights,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useEarningsAIInsights(ticker, pk)

  if (isError && !insights) {
    return (
      <div className="space-y-[16px]">
        <div className="rounded-[12px] bg-[var(--color-surface)] px-[16px] py-[24px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-[var(--color-destructive-soft)] mx-auto mb-[12px]">
            <AlertCircle className="h-[22px] w-[22px] text-[var(--color-destructive)]" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-medium text-[var(--color-text-primary)] mb-[4px]">
            Unable to Generate Insights
          </p>
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-[16px] max-w-[260px] mx-auto">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className={cn(
              "inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[10px]",
              "bg-[var(--color-accent)] text-white text-[14px] font-semibold tracking-[-0.2px]",
              "transition-all duration-150",
              "hover:bg-[var(--color-accent-hover)] active:scale-[0.97]",
            )}
          >
            <Sparkles className="h-[14px] w-[14px]" strokeWidth={2} />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || isFetching) {
    return (
      <div className="space-y-[16px]">
        <div className="rounded-[12px] bg-[var(--color-surface)] px-[16px] py-[24px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-[var(--color-accent-soft)] mx-auto mb-[12px] animate-pulse">
            <Sparkles className="h-[22px] w-[22px] text-[var(--color-accent)]" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-medium text-[var(--color-text-primary)] mb-[4px]">
            Analyzing Earnings...
          </p>
          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            This usually takes a few seconds
          </p>
        </div>
        <InsightsSkeleton />
      </div>
    )
  }

  if (!insights && !isLoading && !isFetching) {
    return (
      <div className="space-y-[16px]">
        <div className="rounded-[12px] bg-[var(--color-surface)] px-[16px] py-[24px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-[var(--color-accent-soft)] mx-auto mb-[12px]">
            <Sparkles className="h-[22px] w-[22px] text-[var(--color-accent)]" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-medium text-[var(--color-text-primary)] mb-[4px]">
            AI Earnings Analysis
          </p>
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-[16px] max-w-[260px] mx-auto">
            Generate AI-powered insights for {ticker}'s latest earnings
          </p>
          <button
            onClick={() => refetch()}
            className={cn(
              "inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[10px]",
              "bg-[var(--color-accent)] text-white text-[14px] font-semibold tracking-[-0.2px]",
              "transition-all duration-150",
              "hover:bg-[var(--color-accent-hover)] active:scale-[0.97]",
            )}
          >
            <Sparkles className="h-[14px] w-[14px]" strokeWidth={2} />
            Generate Insights
          </button>
        </div>
      </div>
    )
  }

  if (!insights) return null

  return <InsightsContent insights={insights} />
}

function InsightsContent({ insights }: { insights: EarningsAIInsights }) {
  const kpiEntries = Object.entries(insights.kpis).filter(
    ([, v]) => v && v.trim() !== ""
  )

  return (
    <div className="space-y-[16px]">
      {/* Headline */}
      <div className="rounded-[12px] bg-[var(--color-accent-soft)] px-[14px] py-[12px]">
        <p className="text-[15px] font-semibold tracking-[-0.24px] text-[var(--color-accent)]">
          {insights.headline}
        </p>
      </div>

      {/* Summary */}
      <BulletSection title="Summary" bullets={insights.summaryBullets} />

      {/* What It Means */}
      <BulletSection title="What This Means" bullets={insights.whatItMeansBullets} color="accent" />

      {/* Watch Items */}
      <BulletSection title="Watch Items" bullets={insights.watchItems} icon={AlertCircle} />

      {/* KPIs */}
      {kpiEntries.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)] mb-[8px] px-[2px]">
            Key Metrics
          </h3>
          <div className="grid grid-cols-3 gap-[6px]">
            {kpiEntries.map(([key, val]) => (
              <KPICard key={key} label={formatKpiLabel(key)} value={val!} />
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {insights.sources.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)] mb-[6px] px-[2px]">
            Sources
          </h3>
          <div className="space-y-[4px]">
            {insights.sources.map((s, i) => (
              <button
                key={i}
                onClick={() => openUrl(s.url)}
                className="flex items-center gap-[6px] text-[13px] text-[var(--color-accent)] hover:underline"
              >
                <ExternalLink className="h-[11px] w-[11px]" strokeWidth={2} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generated timestamp */}
      <p className="text-[11px] text-[var(--color-text-quaternary)] text-center">
        Generated {fmtDate(insights.generatedAt.split("T")[0])}
      </p>
    </div>
  )
}

function BulletSection({
  title,
  bullets,
  color,
  icon: Icon,
}: {
  title: string
  bullets: string[]
  color?: "accent"
  icon?: typeof AlertCircle
}) {
  if (bullets.length === 0) return null
  return (
    <div className="rounded-[12px] bg-[var(--color-surface)] px-[14px] py-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
      <h3 className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)] mb-[8px]">
        {title}
      </h3>
      <ul className="space-y-[6px]">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-[8px]">
            <span className={cn(
              "mt-[7px] h-[5px] w-[5px] rounded-full shrink-0",
              color === "accent" ? "bg-[var(--color-accent)]" : Icon ? "bg-[var(--color-warning)]" : "bg-[var(--color-fill-primary)]"
            )} />
            <span className="text-[13px] leading-[1.6] tracking-[-0.08px] text-[var(--color-text-secondary)]">
              {b}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatKpiLabel(key: string): string {
  const labels: Record<string, string> = {
    combinedRatio: "Combined Ratio",
    lossRatio: "Loss Ratio",
    expenseRatio: "Expense Ratio",
    catLosses: "Cat Losses",
    reserveDev: "Reserve Dev",
    nwp: "NWP",
    bookValuePerShare: "Book Value/Sh",
    roe: "ROE",
    pb: "P/B",
  }
  return labels[key] ?? key
}

function InsightsSkeleton() {
  return (
    <div className="space-y-[16px]">
      <Skeleton className="h-[48px] w-full rounded-[12px]" />
      <Skeleton className="h-[120px] w-full rounded-[12px]" />
      <Skeleton className="h-[120px] w-full rounded-[12px]" />
      <Skeleton className="h-[80px] w-full rounded-[12px]" />
    </div>
  )
}

// ============================================================================
// Remarks Tab
// ============================================================================

function RemarksTab({
  ticker,
  filings,
}: {
  ticker: string
  filings: Filing[] | null
}) {
  const [selectedFiling, setSelectedFiling] = useState<Filing | null>(null)
  const remarksMutation = useFilingRemarks()

  const relevantFilings = useMemo(
    () => filings?.filter((f) => f.form === "10-Q" || f.form === "10-K").slice(0, 5) ?? [],
    [filings]
  )

  const handleExtract = useCallback(
    (filing: Filing) => {
      setSelectedFiling(filing)
      remarksMutation.mutate({
        ticker,
        accessionNumber: filing.accessionNumber,
        periodKey: fmtQuarter(filing.reportDate || filing.filingDate),
      })
    },
    [ticker, remarksMutation]
  )

  if (!filings || filings.length === 0) {
    return (
      <div className="rounded-[12px] bg-[var(--color-surface)] px-[16px] py-[24px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
        <p className="text-[14px] text-[var(--color-text-tertiary)]">
          Remarks are only available for US-listed companies with SEC filings
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-[16px]">
      {/* Filing selector */}
      <div>
        <h3 className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)] mb-[8px] px-[2px]">
          Select a Filing
        </h3>
        <div className="flex flex-wrap gap-[6px]">
          {relevantFilings.map((f) => (
            <button
              key={f.accessionNumber}
              onClick={() => handleExtract(f)}
              className={cn(
                "px-[12px] py-[6px] rounded-[8px] text-[13px] font-medium tracking-[-0.08px]",
                "transition-colors duration-150",
                selectedFiling?.accessionNumber === f.accessionNumber
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-fill-quaternary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-fill-tertiary)]"
              )}
            >
              {f.form} · {fmtDate(f.filingDate)}
            </button>
          ))}
        </div>
      </div>

      {/* Remarks content */}
      {remarksMutation.isPending && <InsightsSkeleton />}

      {remarksMutation.isError && (
        <div className="rounded-[12px] bg-[var(--color-destructive-soft)] px-[14px] py-[12px]">
          <p className="text-[13px] text-[var(--color-destructive)]">
            Failed to extract remarks. Please try again.
          </p>
        </div>
      )}

      {remarksMutation.data && <RemarksContent remarks={remarksMutation.data} />}
    </div>
  )
}

function RemarksContent({ remarks }: { remarks: FilingRemarks }) {
  return (
    <div className="space-y-[16px]">
      <BulletSection title="Key Highlights" bullets={remarks.highlights} color="accent" />

      {remarks.notableQuotes.length > 0 && (
        <div className="rounded-[12px] bg-[var(--color-surface)] px-[14px] py-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
          <h3 className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)] mb-[8px]">
            Notable Quotes
          </h3>
          <div className="space-y-[8px]">
            {remarks.notableQuotes.map((q, i) => (
              <blockquote
                key={i}
                className="border-l-[2px] border-[var(--color-accent)] pl-[12px] text-[13px] italic leading-[1.6] text-[var(--color-text-secondary)]"
              >
                "{q}"
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {remarks.topics.length > 0 && (
        <div className="flex flex-wrap gap-[6px]">
          {remarks.topics.map((t, i) => (
            <span
              key={i}
              className="px-[10px] py-[4px] rounded-[6px] bg-[var(--color-fill-quaternary)] text-[12px] text-[var(--color-text-secondary)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {remarks.sources.length > 0 && (
        <div className="space-y-[4px]">
          {remarks.sources.map((s, i) => (
            <button
              key={i}
              onClick={() => openUrl(s.url)}
              className="flex items-center gap-[6px] text-[13px] text-[var(--color-accent)] hover:underline"
            >
              <ExternalLink className="h-[11px] w-[11px]" strokeWidth={2} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Page Shell Skeleton
// ============================================================================

function DetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto overscroll-none">
      <div className="mx-auto w-full max-w-2xl px-[var(--spacing-4)] pb-[calc(20px+var(--safe-area-inset-bottom))] pt-[12px]">
        <div className="space-y-[16px]">
          {/* Header */}
          <div className="flex items-center gap-[10px]">
            <Skeleton className="h-[32px] w-[32px] rounded-[8px]" />
            <div className="space-y-[4px] flex-1">
              <Skeleton className="h-[20px] w-[180px] rounded-[4px]" />
              <Skeleton className="h-[14px] w-[100px] rounded-[4px]" />
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-[4px]">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[32px] w-[70px] rounded-[8px]" />
            ))}
          </div>
          {/* KPI grid */}
          <div className="grid grid-cols-3 gap-[8px]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[68px] rounded-[12px]" />
            ))}
          </div>
          <Skeleton className="h-[200px] w-full rounded-[12px]" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Detail Page
// ============================================================================

export function EarningsDetailPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  const {
    data: bundle,
    isLoading,
    error,
    refetch,
  } = useEarningsBundle(ticker)

  const { data: watchlist } = useEarningsWatchlist()
  const toggleWatchlist = useToggleEarningsWatchlist()
  const isWatched = watchlist?.includes(ticker?.toUpperCase() ?? "") ?? false

  // Available tabs based on data
  const availableTabs = useMemo(() => {
    if (!bundle) return TABS.filter((t) => t.id === "overview" || t.id === "financials" || t.id === "insights")
    return TABS.filter((t) => t.available(bundle))
  }, [bundle])

  if (isLoading) return <DetailSkeleton />

  if (error || !bundle) {
    return (
      <div className="flex-1 flex items-center justify-center px-[20px]">
        <ErrorState
          title="Unable to Load"
          description={`Could not load earnings data for ${ticker}. Please check the ticker and try again.`}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const { profile } = bundle

  return (
    <div className="flex-1 overflow-y-auto overscroll-none">
      <div className="mx-auto w-full max-w-2xl px-[var(--spacing-4)] pb-[calc(20px+var(--safe-area-inset-bottom))] pt-[12px]">
        {/* Header */}
        <div className="flex items-center gap-[10px] mb-[16px]">
          <button
            onClick={() => navigate("/earnings")}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] bg-[var(--color-fill-quaternary)] shrink-0 hover:bg-[var(--color-fill-tertiary)] active:scale-[0.92] transition-all duration-150"
          >
            <ArrowLeft className="h-[16px] w-[16px] text-[var(--color-text-secondary)]" strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-bold tracking-[-0.4px] text-[var(--color-text-primary)] leading-[1.2]">
              {profile.name}
            </h1>
            <div className="flex items-center gap-[6px] mt-[3px] flex-wrap">
              <span className="text-[12px] font-semibold tracking-[-0.02em] text-[var(--color-accent)] px-[6px] py-[1px] rounded-[4px] bg-[var(--color-accent-soft)]">
                {profile.ticker}
              </span>
              {profile.exchange && (
                <span className="text-[12px] text-[var(--color-text-tertiary)]">
                  {profile.exchange}
                </span>
              )}
              {profile.sector && (
                <>
                  <span className="text-[10px] text-[var(--color-text-quaternary)]">·</span>
                  <span className="text-[12px] text-[var(--color-text-tertiary)]">
                    {profile.sector}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => ticker && toggleWatchlist.mutate(ticker.toUpperCase())}
            className={cn(
              "flex h-[34px] w-[34px] items-center justify-center rounded-[10px] shrink-0",
              "transition-all duration-150 active:scale-[0.90]",
              isWatched
                ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
                : "bg-[var(--color-fill-quaternary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-warning)]"
            )}
            aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
          >
            {isWatched ? (
              <Star className="h-[16px] w-[16px] fill-current" strokeWidth={1.8} />
            ) : (
              <Star className="h-[16px] w-[16px]" strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-[4px] mb-[20px] overflow-x-auto pb-[2px] -mx-[4px] px-[4px] scrollbar-none" style={{ WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-[14px] py-[7px] rounded-[8px] text-[13px] font-medium tracking-[-0.08px] whitespace-nowrap shrink-0",
                "transition-colors duration-150",
                activeTab === tab.id
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-fill-quaternary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-fill-tertiary)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab bundle={bundle} />}
        {activeTab === "financials" && <FinancialsTab bundle={bundle} />}
        {activeTab === "filings" && <FilingsTab filings={bundle.filings} />}
        {activeTab === "insights" && (
          <AIInsightsTab
            ticker={profile.ticker}
            periodKey={bundle.earnings.latestQuarter ? fmtQuarter(bundle.earnings.latestQuarter) : null}
          />
        )}
        {activeTab === "remarks" && (
          <RemarksTab ticker={profile.ticker} filings={bundle.filings} />
        )}

        {/* Data freshness footer */}
        <div className="mt-[24px] pb-[8px] flex items-center justify-center gap-[6px]">
          <span className="text-[11px] text-[var(--color-text-quaternary)]">
            Updated {bundle.updatedAt ? fmtDate(bundle.updatedAt.split("T")[0]) : "recently"}
          </span>
          {bundle.dataSources && (
            <span className="text-[10px] text-[var(--color-text-quaternary)]">
              · Data: {[
                bundle.dataSources.earnings === "sec-xbrl" ? "SEC XBRL" : null,
                bundle.dataSources.profile === "alpha-vantage" ? "Alpha Vantage" : null,
                bundle.dataSources.quote === "yahoo" ? "Yahoo Finance" : null,
                bundle.dataSources.filings === "sec-edgar" ? "SEC EDGAR" : null,
              ].filter(Boolean).join(", ") || "Multiple sources"}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
