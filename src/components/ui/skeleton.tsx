/**
 * Skeleton - Loading placeholder component
 * Following Apple HIG 2026 with refined shimmer animation
 * Includes proper accessibility attributes for screen readers
 */

import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variant for different skeleton shapes */
  variant?: "default" | "circular" | "text" | "button"
}

function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  const variantStyles = {
    default: "rounded-[var(--radius-md)]",
    circular: "rounded-full",
    text: "rounded-[var(--radius-xs)] h-[16px]",
    button: "rounded-[var(--radius-lg)] h-[46px]",
  }[variant]

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading..."
      className={cn(
        "skeleton-shimmer",
        variantStyles,
        className
      )}
      {...props}
    />
  )
}

export { Skeleton, type SkeletonProps }

