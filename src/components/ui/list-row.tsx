/**
 * ListRow - iOS-style interactive list row
 * 
 * Consistent touch targets (min 44px), press feedback, and focus states.
 * Use within Card variant="grouped" for Settings-style lists.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Make row interactive with press states */
  interactive?: boolean
  /** Add disclosure indicator (chevron) */
  hasChevron?: boolean
}

const ListRow = React.forwardRef<HTMLDivElement, ListRowProps>(
  ({ className, interactive = false, children, ...props }, ref) => (
    <div
      ref={ref}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        "flex min-h-[44px] items-center gap-[12px] px-[16px] py-[12px]",
        interactive && [
          "cursor-pointer",
          "transition-colors duration-[var(--duration-instant)] ease-[var(--ease-out)]",
          "active:bg-[var(--color-fill-quaternary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset",
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
ListRow.displayName = "ListRow"

/**
 * ListRowIcon - Leading icon container for list rows (iOS Settings style)
 */
interface ListRowIconProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Background color for the icon container */
  color?: string
  /** Whether icon is disabled (reduced opacity) */
  disabled?: boolean
}

const ListRowIcon = React.forwardRef<HTMLDivElement, ListRowIconProps>(
  ({ className, color, disabled, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px]",
        disabled && "opacity-50",
        !color && "bg-[var(--color-fill-secondary)]",
        className
      )}
      style={color ? { backgroundColor: color } : undefined}
      {...props}
    >
      {children}
    </div>
  )
)
ListRowIcon.displayName = "ListRowIcon"

/**
 * ListRowContent - Main content area for list rows
 */
const ListRowContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 min-w-0", className)}
    {...props}
  />
))
ListRowContent.displayName = "ListRowContent"

/**
 * ListRowLabel - Primary text for list rows
 */
const ListRowLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { disabled?: boolean }
>(({ className, disabled, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "block text-[17px] leading-[22px] tracking-[-0.4px]",
      disabled ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]",
      className
    )}
    {...props}
  />
))
ListRowLabel.displayName = "ListRowLabel"

/**
 * ListRowValue - Secondary/trailing value text for list rows
 */
const ListRowValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "text-[17px] text-[var(--color-text-tertiary)]",
      className
    )}
    {...props}
  />
))
ListRowValue.displayName = "ListRowValue"

export { 
  ListRow, 
  ListRowIcon, 
  ListRowContent, 
  ListRowLabel, 
  ListRowValue,
  type ListRowProps,
  type ListRowIconProps,
}

