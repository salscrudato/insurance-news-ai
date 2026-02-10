/**
 * Empty State Component
 *
 * Minimal empty state for lists with no content.
 * iOS-style centered design with refined typography following Apple HIG 2026.
 */

import { type ReactNode } from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon
  /** Primary heading text */
  title: string
  /** Optional description text */
  description?: string
  /** Optional action button/element */
  action?: ReactNode
  /** Optional additional class names */
  className?: string
  /** Compact variant with smaller spacing */
  compact?: boolean
  /** Icon color variant */
  iconVariant?: "default" | "accent" | "muted"
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
  iconVariant = "default",
}: EmptyStateProps) {
  const iconContainerClass = {
    default: "bg-gradient-to-br from-[var(--color-fill-tertiary)] to-[var(--color-fill-secondary)]",
    accent: "bg-gradient-to-br from-[var(--color-accent-soft)] to-[rgba(0,122,255,0.18)]",
    muted: "bg-[var(--color-fill-quaternary)]",
  }[iconVariant]

  const iconColorClass = {
    default: "text-[var(--color-text-tertiary)]",
    accent: "text-[var(--color-accent)]",
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
      {description && (
        <p
          className={cn(
            "max-w-[280px] leading-[1.5] tracking-[-0.16px] text-[var(--color-text-secondary)]",
            compact ? "text-[14px]" : "text-[15px]"
          )}
        >
          {description}
        </p>
      )}

      {/* Optional action button - increased spacing */}
      {action && (
        <div className={cn(compact ? "mt-[20px]" : "mt-[24px]")}>
          {action}
        </div>
      )}
    </div>
  )
}

