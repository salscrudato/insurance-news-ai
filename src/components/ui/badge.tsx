import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Badge - Compact label for status and categories
 *
 * Consistent with iOS styling: rounded full, proper padding, muted colors.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full text-[12px] font-semibold tracking-[-0.02em] transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-accent)] text-white",
        secondary: "bg-[var(--color-fill-tertiary)] text-[var(--color-text-secondary)]",
        muted: "bg-[var(--color-fill-quaternary)] text-[var(--color-text-tertiary)]",
        destructive: "bg-[var(--color-destructive-soft)] text-[var(--color-destructive)]",
        success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
        accent: "bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10 text-[#007AFF]",
      },
      size: {
        default: "h-[22px] px-[10px]",
        sm: "h-[18px] px-[8px] text-[11px]",
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
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }

