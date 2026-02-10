/**
 * Shared primitives for bottom sheets
 * 
 * Provides consistent styling across all article detail sheets:
 * - SheetHeaderBlock: source label + optional timestamp + title
 * - SheetSection: labeled content block (TL;DR, Why it matters, etc.)
 * - SheetActions: primary button + secondary icon button
 */

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// Design Tokens (unified across all sheets)
// ============================================================================

export const SHEET_TOKENS = {
  // Container
  containerClass: "glass-sheet sheet-scroll h-[85vh] overflow-y-auto px-[20px] pb-[calc(56px+var(--safe-area-inset-bottom))] pt-[8px]",
  
  // Drag indicator
  dragIndicatorClass: "drag-indicator mb-[20px]",
  
  // Header
  headerMargin: "mb-[24px]",
  
  // Image
  imageClass: "mb-[24px] aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-fill-tertiary)]",
  
  // Section spacing
  sectionMargin: "mb-[24px]",
  snippetMargin: "mb-[28px]",
  
  // Actions
  actionsGap: "gap-[12px]",
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
      <div className="mb-[10px] flex items-center gap-[6px]">
        <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--color-accent)]">
          {source}
        </span>
        {timestamp && (
          <span className="text-[12px] text-[var(--color-text-tertiary)]">
            · {timestamp}
          </span>
        )}
      </div>
      <h2 className="text-[26px] font-bold leading-[1.18] tracking-[-0.5px] text-[var(--color-text-primary)]">
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
      <h4 className="mb-[8px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-tertiary)]">
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
      <div className="px-[18px] py-[16px]">{children}</div>
      {footer && (
        <div className="border-t border-[var(--color-separator)] px-[18px] py-[10px]">
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
        <ExternalLink className="h-[17px] w-[17px]" />
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

