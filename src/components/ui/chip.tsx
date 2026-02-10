/**
 * Chip - iOS-style pill/tag for filters, topics, and categories
 * Following Apple HIG 2026 with refined styling and interactions
 *
 * Variants:
 * - filter: For filter buttons (active/inactive states)
 * - topic: For topic/category tags (subtle, read-only appearance)
 * - action: For actionable chips with press feedback
 * - accent: For highlighted accent chips
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const chipVariants = cva(
  [
    "inline-flex items-center justify-center gap-[4px]",
    "rounded-full font-semibold",
    "-webkit-tap-highlight-color-transparent",
    "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
  ].join(" "),
  {
    variants: {
      variant: {
        filter: [
          "bg-[var(--color-fill-tertiary)]",
          "text-[var(--color-text-secondary)]",
          "active:bg-[var(--color-fill-secondary)] active:scale-[0.96]",
        ].join(" "),
        filterActive: [
          "bg-[var(--color-text-primary)]",
          "text-white",
          "shadow-[0_1px_4px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06)]",
          "active:scale-[0.96]",
        ].join(" "),
        topic: [
          "bg-[var(--color-fill-quaternary)]",
          "text-[var(--color-text-secondary)]",
        ].join(" "),
        action: [
          "bg-[var(--color-surface)]",
          "text-[var(--color-text-secondary)]",
          "shadow-[0_0.5px_1px_rgba(0,0,0,0.04),0_0_0_0.5px_var(--color-separator)]",
          "active:bg-[var(--color-fill-quaternary)] active:scale-[0.96]",
        ].join(" "),
        accent: [
          "bg-[var(--color-accent-soft)]",
          "text-[var(--color-accent)]",
          "active:bg-[rgba(0,122,255,0.18)] active:scale-[0.96]",
        ].join(" "),
      },
      size: {
        sm: "h-[26px] px-[10px] text-[12px] tracking-[-0.04px]",
        default: "h-[32px] px-[14px] text-[13px] tracking-[-0.08px]",
        lg: "h-[36px] px-[16px] text-[14px] tracking-[-0.1px]",
      },
    },
    defaultVariants: {
      variant: "filter",
      size: "default",
    },
  }
)

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  /** Whether the chip is in an active/selected state */
  active?: boolean
  /** Make the chip non-interactive (just displays) */
  asTag?: boolean
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant, size, active, asTag, children, ...props }, ref) => {
    // If active is true and variant is "filter", switch to filterActive
    const resolvedVariant =
      active && (variant === "filter" || variant === undefined)
        ? "filterActive"
        : variant

    if (asTag) {
      return (
        <span
          className={cn(chipVariants({ variant: resolvedVariant, size }), className)}
        >
          {children}
        </span>
      )
    }

    return (
      <button
        ref={ref}
        className={cn(chipVariants({ variant: resolvedVariant, size }), className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Chip.displayName = "Chip"

export { Chip, chipVariants }

