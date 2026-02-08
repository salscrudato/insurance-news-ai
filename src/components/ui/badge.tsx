import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent)] text-white",
        secondary:
          "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
        destructive:
          "bg-[var(--color-destructive)] text-white",
        outline:
          "border border-[var(--color-border-strong)] text-[var(--color-text-secondary)]",
        success:
          "bg-[var(--color-success)]/10 text-[var(--color-success)]",
        warning:
          "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

