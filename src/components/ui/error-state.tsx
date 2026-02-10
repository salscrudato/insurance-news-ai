/**
 * Error State Component
 *
 * Non-alarming error display with retry capability.
 * iOS-style calm and professional design following Apple HIG 2026.
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
  /** Icon color variant */
  iconVariant?: "default" | "warning" | "muted"
}

export function ErrorState({
  icon: Icon = WifiOff,
  title = "Unable to load",
  description = "Check your connection and try again.",
  onRetry,
  retryLabel = "Try Again",
  className,
  compact = false,
  iconVariant = "default",
}: ErrorStateProps) {
  const iconContainerClass = {
    default: "bg-gradient-to-br from-[var(--color-fill-tertiary)] to-[var(--color-fill-secondary)]",
    warning: "bg-gradient-to-br from-[rgba(255,149,0,0.12)] to-[rgba(255,149,0,0.20)]",
    muted: "bg-[var(--color-fill-quaternary)]",
  }[iconVariant]

  const iconColorClass = {
    default: "text-[var(--color-text-tertiary)]",
    warning: "text-[#FF9500]",
    muted: "text-[var(--color-text-quaternary)]",
  }[iconVariant]

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-[24px]",
        compact ? "py-[36px]" : "py-[56px]",
        className
      )}
    >
      {/* Icon container - refined gradient with squircle-like corners */}
      <div
        className={cn(
          "flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
          iconContainerClass,
          compact
            ? "mb-[16px] h-[52px] w-[52px] rounded-[14px]"
            : "mb-[20px] h-[72px] w-[72px] rounded-[20px]"
        )}
      >
        <Icon
          className={cn(
            iconColorClass,
            compact ? "h-[24px] w-[24px]" : "h-[32px] w-[32px]"
          )}
          strokeWidth={1.5}
        />
      </div>

      {/* Title - refined typography */}
      <h3
        className={cn(
          "font-bold tracking-[-0.4px] text-[var(--color-text-primary)]",
          compact ? "mb-[6px] text-[18px]" : "mb-[8px] text-[22px]"
        )}
      >
        {title}
      </h3>

      {/* Description - improved line height and max width */}
      <p
        className={cn(
          "max-w-[280px] leading-[1.5] tracking-[-0.16px] text-[var(--color-text-secondary)]",
          compact ? "text-[14px]" : "text-[15px]"
        )}
      >
        {description}
      </p>

      {/* Retry button - refined styling */}
      {onRetry && (
        <Button
          variant="secondary"
          size="default"
          onClick={onRetry}
          className={cn(compact ? "mt-[20px]" : "mt-[24px]")}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

