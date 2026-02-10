/**
 * Shared primitives for bottom sheets
 *
 * Provides consistent styling across all article detail sheets:
 * - SheetHeaderBlock: source label + optional timestamp + title
 * - SheetSection: labeled content block (TL;DR, Why it matters, etc.)
 * - SheetAICard: premium glass card for AI-generated content
 * - SheetActions: primary button + secondary icon button
 */

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// Design Tokens (unified across all sheets)
// ============================================================================

export const SHEET_TOKENS = {
  // Container
  containerClass: "glass-sheet sheet-scroll h-[85vh] overflow-y-auto px-[20px] pb-[calc(56px+var(--safe-area-inset-bottom))] pt-[8px]",

  // Drag indicator
  dragIndicatorClass: "drag-indicator mb-[16px]",

  // Header
  headerMargin: "mb-[18px]",

  // Image
  imageClass: "mb-[18px] aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-fill-tertiary)]",

  // Section spacing
  sectionMargin: "mb-[18px]",
  snippetMargin: "mb-[22px]",

  // Actions
  actionsGap: "gap-[10px]",
  iconButtonSize: "h-[52px] w-[52px]",
} as const

// ============================================================================
// SheetHeaderBlock
// ============================================================================

interface SheetHeaderBlockProps {
  source: string
  timestamp?: string
  title: string
  className?: string
}

export function SheetHeaderBlock({
  source,
  timestamp,
  title,
  className,
}: SheetHeaderBlockProps) {
  return (
    <div className={cn("text-left", SHEET_TOKENS.headerMargin, className)}>
      <div className="mb-[8px] flex items-center gap-[6px]">
        <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--color-accent)]">
          {source}
        </span>
        {timestamp && (
          <>
            <span className="text-[11px] text-[var(--color-text-quaternary)]">·</span>
            <span className="text-[12px] tracking-[-0.04px] text-[var(--color-text-tertiary)]">
              {timestamp}
            </span>
          </>
        )}
      </div>
      <h2 className="text-[24px] font-bold leading-[1.18] tracking-[-0.48px] text-[var(--color-text-primary)]">
        {title}
      </h2>
    </div>
  )
}

// ============================================================================
// SheetSection
// ============================================================================

interface SheetSectionProps {
  label: string
  children: React.ReactNode
  className?: string
}

export function SheetSection({ label, children, className }: SheetSectionProps) {
  return (
    <div className={cn(className)}>
      <h4 className="mb-[6px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-tertiary)]">
        {label}
      </h4>
      <div className="text-[15px] leading-[1.55] tracking-[-0.2px] text-[var(--color-text-primary)]">
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// SheetSectionCard (for grouped AI content)
// ============================================================================

interface SheetSectionCardProps {
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function SheetSectionCard({ children, footer, className }: SheetSectionCardProps) {
  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-fill-quaternary)]", className)}>
      <div className="px-[16px] py-[14px]">{children}</div>
      {footer && (
        <div className="border-t border-[var(--color-separator)] px-[16px] py-[10px]">
          {footer}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SheetSnippet
// ============================================================================

interface SheetSnippetProps {
  children: React.ReactNode
  className?: string
}

export function SheetSnippet({ children, className }: SheetSnippetProps) {
  return (
    <div className={cn(SHEET_TOKENS.snippetMargin, className)}>
      <p className="text-[15px] leading-[1.6] tracking-[-0.2px] text-[var(--color-text-secondary)]">
        {children}
      </p>
    </div>
  )
}

// ============================================================================
// SheetActions
// ============================================================================

interface SheetActionsProps {
  onReadArticle: () => void
  secondaryButton: React.ReactNode
  primaryLabel?: string
  className?: string
}

export function SheetActions({
  onReadArticle,
  secondaryButton,
  primaryLabel = "Read Article",
  className,
}: SheetActionsProps) {
  return (
    <div className={cn("flex", SHEET_TOKENS.actionsGap, className)}>
      <Button onClick={onReadArticle} className="flex-1 gap-[8px]" size="lg">
        <span>{primaryLabel}</span>
        <ExternalLink className="h-[16px] w-[16px]" />
      </Button>
      {secondaryButton}
    </div>
  )
}

// ============================================================================
// SheetIconButton (for bookmark/action icon buttons)
// ============================================================================

interface SheetIconButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  className?: string
  "aria-label"?: string
}

export function SheetIconButton({
  onClick,
  disabled,
  loading,
  children,
  className,
  "aria-label": ariaLabel,
}: SheetIconButtonProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(SHEET_TOKENS.iconButtonSize, "shrink-0 p-0 active:scale-[0.94]", className)}
    >
      {loading ? <Loader2 className="h-[20px] w-[20px] animate-spin" /> : children}
    </Button>
  )
}

// ============================================================================
// SheetAICard - Premium glass card for AI-generated insights
// ============================================================================

interface SheetAISectionProps {
  label: string
  children: React.ReactNode
  isLast?: boolean
}

function SheetAISection({ label, children, isLast }: SheetAISectionProps) {
  return (
    <div className={cn(
      "px-[16px] py-[14px]",
      !isLast && "border-b-[0.5px] border-[var(--color-separator)]"
    )}>
      <h4 className="mb-[6px] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
        {label}
      </h4>
      <div className="text-[15px] leading-[1.55] tracking-[-0.2px] text-[var(--color-text-primary)]">
        {children}
      </div>
    </div>
  )
}

interface SheetAICardProps {
  tldr?: string
  whyItMatters?: string
  keyImplications?: string[]
  topics?: string[]
  className?: string
}

export function SheetAICard({
  tldr,
  whyItMatters,
  keyImplications,
  topics,
  className,
}: SheetAICardProps) {
  const hasContent = tldr || whyItMatters || (keyImplications && keyImplications.length > 0)
  if (!hasContent) return null

  return (
    <div className={cn(
      "overflow-hidden rounded-[var(--radius-2xl)]",
      "border-[0.5px] border-[var(--color-separator)]",
      "bg-[var(--color-surface)]",
      className
    )}>
      {/* AI Badge Header */}
      <div className="flex items-center gap-[6px] border-b-[0.5px] border-[var(--color-separator)] bg-[var(--color-fill-quaternary)] px-[16px] py-[9px]">
        <Sparkles className="h-[12px] w-[12px] text-[var(--color-accent)]" strokeWidth={2.5} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-accent)]">
          AI Analysis
        </span>
      </div>

      {/* TL;DR */}
      {tldr && (
        <SheetAISection label="Summary" isLast={!whyItMatters && !keyImplications?.length}>
          {tldr}
        </SheetAISection>
      )}

      {/* Why It Matters */}
      {whyItMatters && (
        <SheetAISection label="Why It Matters for P&C" isLast={!keyImplications?.length}>
          {whyItMatters}
        </SheetAISection>
      )}

      {/* Key Implications */}
      {keyImplications && keyImplications.length > 0 && (
        <SheetAISection label="Key Implications" isLast>
          <ul className="space-y-[6px]">
            {keyImplications.map((implication, index) => (
              <li key={index} className="flex items-start gap-[8px]">
                <span className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-[var(--color-accent)]" />
                <span>{implication}</span>
              </li>
            ))}
          </ul>
        </SheetAISection>
      )}

      {/* Topics */}
      {topics && topics.length > 0 && (
        <div className="flex flex-wrap gap-[6px] border-t-[0.5px] border-[var(--color-separator)] bg-[var(--color-fill-quaternary)] px-[16px] py-[10px]">
          {topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-[var(--color-surface)] px-[9px] py-[4px] text-[11px] font-medium tracking-[-0.02em] text-[var(--color-text-secondary)] shadow-[0_0_0_0.5px_var(--color-separator)]"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="border-t-[0.5px] border-[var(--color-separator)] bg-[var(--color-fill-quaternary)] px-[16px] py-[8px]">
        <p className="text-[10px] leading-[1.4] tracking-[-0.02em] text-[var(--color-text-quaternary)]">
          Generated by AI · Read original for full details
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// SheetAICardSkeleton - Loading state for AI card
// ============================================================================

export function SheetAICardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "overflow-hidden rounded-[var(--radius-2xl)]",
      "border-[0.5px] border-[var(--color-separator)]",
      "bg-[var(--color-surface)]",
      className
    )}>
      {/* AI Badge Header */}
      <div className="flex items-center gap-[6px] border-b-[0.5px] border-[var(--color-separator)] bg-[var(--color-fill-quaternary)] px-[16px] py-[9px]">
        <Sparkles className="h-[12px] w-[12px] animate-subtle-pulse text-[var(--color-accent)]" strokeWidth={2.5} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-accent)]">
          Analyzing...
        </span>
      </div>

      {/* Skeleton sections */}
      <div className="space-y-0">
        {/* Summary skeleton */}
        <div className="border-b-[0.5px] border-[var(--color-separator)] px-[16px] py-[14px]">
          <div className="mb-[8px] h-[11px] w-[52px] rounded-[3px] skeleton-shimmer" />
          <div className="space-y-[6px]">
            <div className="h-[15px] w-full rounded-[3px] skeleton-shimmer" />
            <div className="h-[15px] w-[90%] rounded-[3px] skeleton-shimmer" />
            <div className="h-[15px] w-[70%] rounded-[3px] skeleton-shimmer" />
          </div>
        </div>
        {/* Why it matters skeleton */}
        <div className="px-[16px] py-[14px]">
          <div className="mb-[8px] h-[11px] w-[120px] rounded-[3px] skeleton-shimmer" />
          <div className="space-y-[6px]">
            <div className="h-[15px] w-full rounded-[3px] skeleton-shimmer" />
            <div className="h-[15px] w-[80%] rounded-[3px] skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}
