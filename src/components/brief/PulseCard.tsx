/**
 * Pulse Card — Compact market signal intelligence for Today page
 *
 * Premium Apple-inspired card: AI narrative teaser + top rising signals
 * with severity accents and sparklines. Taps through to full Pulse page.
 */

import { useNavigate } from "react-router-dom"
import { ChevronRight, Sparkles } from "lucide-react"
import { useSignals } from "@/lib/hooks"
import { Card, Skeleton } from "@/components/ui"
import { cn } from "@/lib/utils"

// ============================================================================
// Skeleton
// ============================================================================

function PulseCardSkeleton() {
  return (
    <Card>
      <div className="px-[16px] py-[12px] flex items-center justify-between">
        <Skeleton variant="text" className="w-[130px]" />
        <Skeleton variant="text" className="w-[50px]" />
      </div>
      <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />
      <div className="px-[16px] py-[12px] space-y-[6px]">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-[75%]" />
      </div>
      <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />
      <div className="px-[16px] py-[10px] space-y-[10px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-[10px]">
            <Skeleton className="h-[24px] w-[40px] rounded-[7px]" />
            <Skeleton variant="text" className="flex-1" />
          </div>
        ))}
      </div>
    </Card>
  )
}

// ============================================================================
// Sparkline — tiny inline version
// ============================================================================

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const barW = 2.5
  const gap = 1.5
  const width = data.length * barW + (data.length - 1) * gap
  return (
    <svg width={width} height={12} viewBox={`0 0 ${width} 12`} className="shrink-0" aria-hidden>
      {data.map((v, i) => (
        <rect
          key={i}
          x={i * (barW + gap)}
          y={v ? 1 : 8}
          width={barW}
          height={v ? 10 : 3}
          rx={barW / 2}
          fill={v ? color : "var(--color-fill-secondary)"}
          opacity={v ? 0.8 : 0.3}
        />
      ))}
    </svg>
  )
}

// ============================================================================
// Severity colors (subtle left-border accent)
// ============================================================================

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#FF3B30",
  high: "#FF9500",
  medium: "#007AFF",
  low: "rgba(120,120,128,0.20)",
}

// ============================================================================
// Card
// ============================================================================

export function PulseCard() {
  const navigate = useNavigate()
  const { data, isLoading } = useSignals(7)

  if (isLoading && !data) {
    return <PulseCardSkeleton />
  }

  if (!data || data.rising.length === 0) {
    return null
  }

  const topSignals = data.rising.slice(0, 4)

  return (
    <Card
      variant="interactive"
      onClick={() => navigate("/pulse")}
      role="button"
      aria-label="View Industry Pulse"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-[16px] py-[12px]">
        <div className="flex items-center gap-[6px]">
          <Sparkles className="h-[14px] w-[14px] text-[var(--color-accent)]" strokeWidth={2.25} />
          <span className="text-[13px] font-semibold tracking-[-0.08px] text-[var(--color-accent)]">
            Industry Pulse
          </span>
        </div>
        <div className="flex items-center gap-[3px]">
          <span className="text-[12px] font-normal tracking-[-0.08px] text-[var(--color-text-quaternary)]">
            {data.meta.briefsAvailable} briefs
          </span>
          <ChevronRight className="h-[12px] w-[12px] text-[var(--color-text-quaternary)]" strokeWidth={2} />
        </div>
      </div>

      {/* AI narrative teaser */}
      {data.narrative && (
        <>
          <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />
          <div className="px-[16px] py-[12px]">
            <p className="text-[14px] leading-[1.48] tracking-[-0.15px] text-[var(--color-text-secondary)] line-clamp-2">
              {data.narrative}
            </p>
          </div>
        </>
      )}

      {/* Signal list */}
      <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />
      <div className="py-[6px]">
        {topSignals.map((signal, index) => {
          const severityColor = signal.severity
            ? SEVERITY_COLORS[signal.severity] ?? SEVERITY_COLORS.low
            : "transparent"

          return (
            <div key={signal.canonical}>
              <div className="relative px-[16px] py-[10px]">
                {/* Severity accent — left edge */}
                <div
                  className="absolute left-[4px] top-[12px] bottom-[12px] w-[2.5px] rounded-full"
                  style={{ backgroundColor: severityColor }}
                />

                <div className="flex items-center gap-[10px] ml-[6px]">
                  {/* Delta chip */}
                  <span
                    className={cn(
                      "inline-flex h-[24px] min-w-[38px] items-center justify-center rounded-[7px] px-[6px]",
                      "text-[12px] font-bold tabular-nums shrink-0",
                      signal.delta > 0
                        ? "bg-[rgba(52,199,89,0.10)] text-[#34C759]"
                        : "bg-[var(--color-fill-tertiary)] text-[var(--color-text-secondary)]"
                    )}
                  >
                    {signal.delta > 0 ? "+" : ""}{signal.delta}
                  </span>

                  {/* Topic */}
                  <span className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--color-text-primary)] truncate flex-1 leading-[1.2]">
                    {signal.topic}
                  </span>

                  {/* Mini sparkline */}
                  {signal.sparkline && signal.sparkline.length > 0 && (
                    <MiniSparkline data={signal.sparkline} color="#34C759" />
                  )}
                </div>
              </div>

              {index < topSignals.length - 1 && (
                <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
