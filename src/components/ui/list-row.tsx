/**
 * ListRow - iOS-style interactive list row
 * Following Apple HIG 2026 with refined spacing and interactions
 *
 * Features:
 * - Consistent touch targets (min 44px)
 * - iOS-native press feedback
 * - Accessible focus states
 * - Use within Card variant="grouped" for Settings-style lists
 */

import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Make row interactive with press states */
  interactive?: boolean
  /** Add disclosure indicator (chevron) */
  hasChevron?: boolean
  /** Variant for different row styles */
  variant?: "default" | "compact" | "spacious"
}

const ListRow = React.forwardRef<HTMLDivElement, ListRowProps>(
  ({ className, interactive = false, hasChevron = false, variant = "default", children, ...props }, ref) => {
    const paddingClass = {
      default: "min-h-[48px] px-[16px] py-[12px]",
      compact: "min-h-[44px] px-[16px] py-[10px]",
      spacious: "min-h-[56px] px-[18px] py-[14px]",
    }[variant]

    return (
      <div
        ref={ref}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        className={cn(
          "flex items-center gap-[12px]",
          paddingClass,
          interactive && [
            "cursor-pointer",
            "-webkit-tap-highlight-color-transparent",
            "transition-colors duration-[var(--duration-instant)] ease-[var(--ease-out)]",
            "active:bg-[var(--color-fill-quaternary)]",
            "focus-visible:outline-none focus-visible:bg-[var(--color-fill-quaternary)]",
            "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset",
          ],
          className
        )}
        {...props}
      >
        {children}
        {hasChevron && (
          <ChevronRight
            className="h-[16px] w-[16px] shrink-0 text-[var(--color-text-quaternary)]"
            strokeWidth={2.5}
          />
        )}
      </div>
    )
  }
)
ListRow.displayName = "ListRow"

/**
 * ListRowIcon - Leading icon container for list rows (iOS Settings style)
 * Supports colored backgrounds for app-like icon treatment
 */
interface ListRowIconProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Background color for the icon container */
  color?: string
  /** Whether icon is disabled (reduced opacity) */
  disabled?: boolean
  /** Size variant */
  size?: "sm" | "default" | "lg"
}

const ListRowIcon = React.forwardRef<HTMLDivElement, ListRowIconProps>(
  ({ className, color, disabled, size = "default", children, ...props }, ref) => {
    const sizeClass = {
      sm: "h-[24px] w-[24px] rounded-[5px] [&_svg]:h-[14px] [&_svg]:w-[14px]",
      default: "h-[30px] w-[30px] rounded-[7px] [&_svg]:h-[17px] [&_svg]:w-[17px]",
      lg: "h-[36px] w-[36px] rounded-[8px] [&_svg]:h-[20px] [&_svg]:w-[20px]",
    }[size]

    return (
      <div
        ref={ref}
        className={cn(
          "flex shrink-0 items-center justify-center",
          sizeClass,
          disabled && "opacity-40",
          !color && "bg-[var(--color-fill-secondary)] text-[var(--color-text-secondary)]",
          color && "text-white",
          className
        )}
        style={color ? { backgroundColor: color } : undefined}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ListRowIcon.displayName = "ListRowIcon"

/**
 * ListRowContent - Main content area for list rows
 * Handles text overflow and provides vertical stacking for label/description
 */
const ListRowContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 min-w-0 flex flex-col justify-center", className)}
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
      "block text-[17px] leading-[1.29] tracking-[-0.4px]",
      disabled ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]",
      className
    )}
    {...props}
  />
))
ListRowLabel.displayName = "ListRowLabel"

/**
 * ListRowDescription - Secondary text below the label
 */
const ListRowDescription = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "block text-[14px] leading-[1.35] tracking-[-0.15px] text-[var(--color-text-secondary)] mt-[2px]",
      className
    )}
    {...props}
  />
))
ListRowDescription.displayName = "ListRowDescription"

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
      "text-[17px] text-[var(--color-text-tertiary)] tracking-[-0.4px]",
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
  ListRowDescription,
  ListRowValue,
  type ListRowProps,
  type ListRowIconProps,
}

