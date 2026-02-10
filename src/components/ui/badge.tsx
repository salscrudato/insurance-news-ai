/**
 * Badge - Compact label for status and categories
 * Following Apple HIG 2026 with refined styling
 *
 * Consistent with iOS styling: rounded full, proper padding, muted colors.
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-[4px]",
    "rounded-full font-semibold",
    "tracking-[-0.02em]",
    "transition-colors duration-[var(--duration-fast)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-[var(--color-accent)] text-white",
        secondary: "bg-[var(--color-fill-tertiary)] text-[var(--color-text-secondary)]",
        muted: "bg-[var(--color-fill-quaternary)] text-[var(--color-text-tertiary)]",
        destructive: "bg-[var(--color-destructive-soft)] text-[var(--color-destructive)]",
        success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
        accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
        // New outline variant
        outline: "bg-transparent border border-[var(--color-separator-opaque)] text-[var(--color-text-secondary)]",
      },
      size: {
        sm: "h-[18px] px-[8px] text-[11px]",
        default: "h-[22px] px-[10px] text-[12px]",
        lg: "h-[26px] px-[12px] text-[13px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional dot indicator before text */
  withDot?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, withDot, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {withDot && (
        <span className="h-[5px] w-[5px] rounded-full bg-current opacity-80" />
      )}
      {children}
    </div>
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }

