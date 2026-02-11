/**
 * Industry Pulse — P&C Market Signal Intelligence
 *
 * Premium Apple-inspired design:
 * - Clean hierarchy with generous whitespace
 * - Severity communicated via subtle left-edge accents
 * - Expandable insight cards with chevron affordance
 * - Empty sections hidden entirely (no "no signals" noise)
 * - Sparklines as ambient visual context, not data charts
 */

import { useState, useMemo, useCallback } from "react"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Pin,
  PinOff,
  Sparkles,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from "lucide-react"
import { useSignals, useWatchlist, useToggleWatchlistTopic } from "@/lib/hooks"
import {
  SegmentedControl,
  Card,
  SectionLabel,
  Skeleton,
  EmptyState,
  ErrorState,
} from "@/components/ui"
import { cn } from "@/lib/utils"
import type { SignalItem } from "@/types/firestore"

type WindowDays = 7 | 30

const windowOptions = [
  { value: "7" as const, label: "7D" },
  { value: "30" as const, label: "30D" },
]

// ============================================================================
// Severity
// ============================================================================

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#FF3B30",
  high: "#FF9500",
  medium: "#007AFF",
  low: "rgba(120,120,128,0.18)",
}

function getSeverityColor(severity?: string): string {
  if (!severity) return "transparent"
  return SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.low
}

// ============================================================================
// Sparkline
// ============================================================================

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const barW = 4
  const gap = 2.5
  const width = data.length * barW + (data.length - 1) * gap
  const h = 18

  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} className="shrink-0" aria-hidden>
      {data.map((v, i) => (
        <rect
          key={i}
          x={i * (barW + gap)}
          y={v ? 2 : 12}
          width={barW}
          height={v ? 14 : 4}
          rx={2}
          fill={v ? color : "var(--color-fill-secondary)"}
          opacity={v ? 0.8 : 0.3}
        />
      ))}
    </svg>
  )
}

// ============================================================================
// Signal Card
// ============================================================================

function SignalCard({
  signal,
  isPinned,
  onTogglePin,
  hasInsight = false,
  variant = "rising",
}: {
  signal: SignalItem
  isPinned: boolean
  onTogglePin: () => void
  hasInsight?: boolean
  variant?: "rising" | "falling" | "persistent"
}) {
  const [expanded, setExpanded] = useState(false)
  const isPositive = signal.delta > 0
  const isNegative = signal.delta < 0
  const canExpand = hasInsight && Boolean(signal.why)

  const severityColor = getSeverityColor(signal.severity)
  const deltaColor = isPositive
    ? "#34C759"
    : isNegative
      ? "#FF3B30"
      : "var(--color-text-tertiary)"
  const deltaBg = isPositive
    ? "rgba(52,199,89,0.10)"
    : isNegative
      ? "rgba(255,59,48,0.10)"
      : "var(--color-fill-tertiary)"
  const sparkColor = variant === "rising"
    ? "#34C759"
    : variant === "falling"
      ? "#FF3B30"
      : "var(--color-accent)"

  const handleCardClick = useCallback(() => {
    if (canExpand) setExpanded((p) => !p)
  }, [canExpand])

  return (
    <div
      className={cn(
        "relative",
        canExpand && "cursor-pointer -webkit-tap-highlight-color-transparent",
      )}
      onClick={handleCardClick}
      role={canExpand ? "button" : undefined}
      aria-expanded={canExpand ? expanded : undefined}
    >
      {/* Severity accent — left edge */}
      <div
        className="absolute left-0 top-[12px] bottom-[12px] w-[3px] rounded-full"
        style={{ backgroundColor: severityColor }}
      />

      <div className="pl-[16px] pr-[14px] py-[14px]">
        {/* Row 1: Delta + Topic + Expand chevron / Pin */}
        <div className="flex items-center gap-[10px]">
          {/* Delta pill */}
          <span
            className="inline-flex h-[30px] min-w-[46px] items-center justify-center rounded-[9px] px-[8px] text-[14px] font-bold tabular-nums shrink-0"
            style={{ backgroundColor: deltaBg, color: deltaColor }}
          >
            {isPositive ? "+" : ""}{signal.delta}
          </span>

          {/* Topic name */}
          <span className="flex-1 text-[16px] font-semibold leading-[1.3] tracking-[-0.3px] text-[var(--color-text-primary)]">
            {signal.topic}
          </span>

          {/* Expand chevron (for expandable) or just pin */}
          {canExpand && (
            <ChevronRight
              className={cn(
                "h-[14px] w-[14px] shrink-0 text-[var(--color-text-quaternary)]",
                "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
                expanded && "rotate-90"
              )}
              strokeWidth={2.5}
            />
          )}

          {/* Pin */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin()
            }}
            className={cn(
              "flex h-[32px] w-[32px] items-center justify-center rounded-[9px] shrink-0",
              "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
              "-webkit-tap-highlight-color-transparent",
              "active:scale-[0.88]",
              isPinned
                ? "text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                : "text-[var(--color-text-quaternary)] hover:text-[var(--color-text-tertiary)] hover:bg-[var(--color-fill-quaternary)]"
            )}
            aria-label={isPinned ? "Unpin from watchlist" : "Pin to watchlist"}
          >
            {isPinned ? (
              <PinOff className="h-[14px] w-[14px]" strokeWidth={2} />
            ) : (
              <Pin className="h-[14px] w-[14px]" strokeWidth={2} />
            )}
          </button>
        </div>

        {/* Row 2: Metadata + Sparkline */}
        <div className="mt-[6px] ml-[56px] flex items-center gap-[10px]">
          <span className="text-[13px] tracking-[-0.08px] text-[var(--color-text-tertiary)] tabular-nums">
            {signal.recentCount} of {signal.sparkline?.length ?? 7} days
            {signal.prevCount > 0 && (
              <span className="text-[var(--color-text-quaternary)]"> · prev {signal.prevCount}</span>
            )}
          </span>

          {signal.sparkline && signal.sparkline.length > 0 && (
            <Sparkline data={signal.sparkline} color={sparkColor} />
          )}
        </div>

        {/* Expanded AI Insight */}
        {canExpand && expanded && signal.why && (
          <div className="mt-[14px] ml-[56px] space-y-[10px]">
            <div>
              <p className="text-[14px] leading-[1.5] tracking-[-0.15px] text-[var(--color-text-primary)]">
                {signal.why}
              </p>
            </div>
            {signal.implication && (
              <div className="border-l-[2px] border-[var(--color-accent)] pl-[10px]">
                <p className="text-[13px] leading-[1.48] tracking-[-0.08px] text-[var(--color-text-secondary)]">
                  {signal.implication}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Signal Section
// ============================================================================

function SignalSection({
  title,
  icon: Icon,
  signals,
  isPinned,
  onTogglePin,
  showInsights = false,
  variant = "rising",
  initialCount = 5,
  accentColor,
}: {
  title: string
  icon: typeof TrendingUp
  signals: SignalItem[]
  isPinned: (canonical: string) => boolean
  onTogglePin: (canonical: string, pinned: boolean) => void
  showInsights?: boolean
  variant?: "rising" | "falling" | "persistent"
  initialCount?: number
  accentColor?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const visibleSignals = expanded ? signals : signals.slice(0, initialCount)
  const hasMore = signals.length > initialCount

  // Hide empty sections entirely — no empty-state cards
  if (signals.length === 0) return null

  return (
    <section className="space-y-[10px]">
      <div className="flex items-center justify-between">
        <SectionLabel icon={Icon}>{title}</SectionLabel>
        {accentColor && (
          <span
            className="text-[12px] font-medium tabular-nums tracking-[-0.04px] opacity-70"
            style={{ color: accentColor }}
          >
            {signals.length}
          </span>
        )}
      </div>
      <Card>
        {visibleSignals.map((signal, index) => (
          <div key={signal.canonical}>
            <SignalCard
              signal={signal}
              isPinned={isPinned(signal.canonical)}
              onTogglePin={() => onTogglePin(signal.canonical, !isPinned(signal.canonical))}
              hasInsight={showInsights}
              variant={variant}
            />
            {index < visibleSignals.length - 1 && (
              <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />
            )}
          </div>
        ))}

        {hasMore && (
          <>
            <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "flex w-full items-center justify-center gap-[5px] py-[13px]",
                "text-[14px] font-medium tracking-[-0.1px] text-[var(--color-accent)]",
                "transition-colors duration-[var(--duration-fast)]",
                "-webkit-tap-highlight-color-transparent",
                "active:opacity-60"
              )}
            >
              {expanded ? (
                <>Show less <ChevronUp className="h-[14px] w-[14px]" strokeWidth={2.5} /></>
              ) : (
                <>Show {signals.length - initialCount} more <ChevronDown className="h-[14px] w-[14px]" strokeWidth={2.5} /></>
              )}
            </button>
          </>
        )}
      </Card>
    </section>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

function PulsePageSkeleton() {
  return (
    <div className="space-y-[24px]">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-[140px]" />
        <Skeleton className="h-[30px] w-[100px] rounded-[9px]" />
      </div>

      <Card>
        <div className="px-[16px] py-[16px] space-y-[8px]">
          <div className="flex items-center gap-[6px] mb-[4px]">
            <Skeleton className="h-[14px] w-[14px] rounded-full" />
            <Skeleton variant="text" className="w-[140px]" />
          </div>
          <Skeleton variant="text" className="w-full" />
          <Skeleton variant="text" className="w-[92%]" />
          <Skeleton variant="text" className="w-[64%]" />
        </div>
      </Card>

      <div className="space-y-[10px]">
        <Skeleton variant="text" className="w-[80px]" />
        <Card>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="pl-[16px] pr-[14px] py-[14px]">
                <div className="flex items-center gap-[10px]">
                  <Skeleton className="h-[30px] w-[46px] rounded-[9px]" />
                  <Skeleton variant="text" className="flex-1 h-[18px]" />
                  <Skeleton className="h-[32px] w-[32px] rounded-[9px]" />
                </div>
                <div className="mt-[6px] ml-[56px] flex items-center gap-[10px]">
                  <Skeleton variant="text" className="w-[80px]" />
                  <Skeleton className="h-[14px] w-[50px] rounded-[4px]" />
                </div>
              </div>
              {i < 3 && <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// Page
// ============================================================================

export function PulsePage() {
  const [windowDays, setWindowDays] = useState<WindowDays>(7)
  const { data, isLoading, error, refetch } = useSignals(windowDays)
  const { watchlistTopics, isPinned } = useWatchlist()
  const togglePin = useToggleWatchlistTopic()

  const handleTogglePin = (canonical: string, pinned: boolean) => {
    togglePin.mutate({ canonical, pinned })
  }

  const handleWindowChange = (value: string) => {
    setWindowDays(Number(value) as WindowDays)
  }

  const watchlistSignals = useMemo(() => {
    if (!data || watchlistTopics.length === 0) return []
    const watchSet = new Set(watchlistTopics)
    const allSignals = [...data.rising, ...data.falling, ...data.persistent]
    const seen = new Set<string>()
    const result: SignalItem[] = []
    for (const s of allSignals) {
      if (watchSet.has(s.canonical) && !seen.has(s.canonical)) {
        result.push(s)
        seen.add(s.canonical)
      }
    }
    for (const topic of watchlistTopics) {
      if (!seen.has(topic)) {
        result.push({
          topic,
          canonical: topic,
          recentCount: 0,
          prevCount: 0,
          delta: 0,
          intensity: 0,
          sparkline: [],
        })
      }
    }
    return result
  }, [data, watchlistTopics])

  if (isLoading && !data) {
    return <PulsePageSkeleton />
  }

  if (error && !data) {
    return (
      <ErrorState
        title="Unable to load signals"
        description="We couldn\u2019t fetch signal trends. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  if (!data || data.meta.totalTopics === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Not enough data yet"
        description="Signals will appear once enough daily briefs have been generated. Check back soon."
        iconVariant="accent"
      />
    )
  }

  return (
    <div className="space-y-[24px]">
      {/* Header */}
      <div className="flex items-center justify-between -mt-[4px]">
        <p className="text-[15px] font-normal tracking-[-0.2px] text-[var(--color-text-secondary)]">
          {data.meta.briefsAvailable} briefs · {data.meta.totalTopics} topics
        </p>
        <SegmentedControl
          options={windowOptions}
          value={String(windowDays)}
          onChange={handleWindowChange}
          compact
        />
      </div>

      {/* Market Narrative */}
      {data.narrative && (
        <Card>
          <div className="px-[16px] py-[16px]">
            <div className="flex items-center gap-[6px] mb-[10px]">
              <Sparkles className="h-[14px] w-[14px] text-[var(--color-accent)]" strokeWidth={2.25} />
              <span className="text-[13px] font-semibold tracking-[-0.08px] text-[var(--color-accent)]">
                Market Narrative
              </span>
            </div>
            <p className="text-[15px] leading-[1.55] tracking-[-0.2px] text-[var(--color-text-primary)]">
              {data.narrative}
            </p>
          </div>
        </Card>
      )}

      {/* Watchlist */}
      {watchlistSignals.length > 0 && (
        <SignalSection
          title="Watchlist"
          icon={Pin}
          signals={watchlistSignals}
          isPinned={isPinned}
          onTogglePin={handleTogglePin}
          variant="rising"
          initialCount={10}
        />
      )}

      {/* Rising */}
      <SignalSection
        title="Rising"
        icon={TrendingUp}
        signals={data.rising}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        showInsights
        variant="rising"
        initialCount={5}
        accentColor="#34C759"
      />

      {/* Persistent */}
      <SignalSection
        title="Persistent"
        icon={Activity}
        signals={data.persistent}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        showInsights
        variant="persistent"
        initialCount={5}
        accentColor="var(--color-accent)"
      />

      {/* Falling */}
      <SignalSection
        title="Falling"
        icon={TrendingDown}
        signals={data.falling}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        showInsights
        variant="falling"
        initialCount={5}
        accentColor="#FF3B30"
      />

      {/* Footer */}
      <footer className="pb-[4px]">
        <p className="text-[12px] tracking-[-0.04px] text-[var(--color-text-quaternary)] text-center">
          {windowDays}-day window · {data.meta.recentDates.length + data.meta.prevDates.length} days analyzed
        </p>
      </footer>
    </div>
  )
}
