/**
 * Error State Component
 *
 * Non-alarming error display with retry capability.
 * iOS-style calm and professional design.
 */

import { type LucideIcon, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface ErrorStateProps {
  /** Custom icon (defaults to WifiOff) */
  icon?: LucideIcon
  /** Error heading */
  title?: string
  /** Error description */
  description?: string
  /** Retry callback */
  onRetry?: () => void
  /** Retry button label */
  retryLabel?: string
  /** Optional additional class names */
  className?: string
  /** Compact variant with smaller spacing */
  compact?: boolean
}

export function ErrorState({
  icon: Icon = WifiOff,
  title = "Unable to load",
  description = "Check your connection and try again.",
  onRetry,
  retryLabel = "Try Again",
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-[32px]" : "py-[48px]",
        className
      )}
    >
      {/* Icon container - rounded square for iOS feel */}
      <div
        className={cn(
          "flex items-center justify-center rounded-[20px] bg-[var(--color-fill-tertiary)]",
          compact ? "mb-[14px] h-[48px] w-[48px]" : "mb-[18px] h-[64px] w-[64px]"
        )}
      >
        <Icon
          className={cn(
            "text-[var(--color-text-tertiary)]",
            compact ? "h-[22px] w-[22px]" : "h-[28px] w-[28px]"
          )}
          strokeWidth={1.5}
        />
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-semibold tracking-[-0.4px] text-[var(--color-text-primary)]",
          compact ? "mb-[4px] text-[17px]" : "mb-[8px] text-[20px]"
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          "max-w-[260px] leading-[1.45] tracking-[-0.16px] text-[var(--color-text-tertiary)]",
          compact ? "text-[14px]" : "text-[15px]"
        )}
      >
        {description}
      </p>

      {/* Retry button */}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-[20px]">
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

