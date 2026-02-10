import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Separator - iOS-style divider line
 *
 * Variants:
 * - full: Full-width separator (default)
 * - inset: Standard inset (16px left margin) for list rows
 * - inset-icon: Larger inset (57px left margin) for rows with leading icons (16px + 29px + 12px)
 *
 * Uses 0.5px height for true iOS hairline appearance
 */
interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  variant?: "full" | "inset" | "inset-icon"
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", variant = "full", ...props }, ref) => {
    const insetMargin = variant === "inset"
      ? "ml-[16px]"
      : variant === "inset-icon"
        ? "ml-[57px]"
        : ""

    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        className={cn(
          "shrink-0 bg-[var(--color-separator)]",
          orientation === "horizontal"
            ? `h-[0.5px] w-full ${insetMargin}`
            : "h-full w-[0.5px]",
          className
        )}
        {...props}
      />
    )
  }
)
Separator.displayName = "Separator"

export { Separator, type SeparatorProps }

