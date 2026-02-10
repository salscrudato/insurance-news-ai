/**
 * Empty State Component
 *
 * Minimal empty state for lists with no content.
 * iOS-style centered design with refined typography.
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
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
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
      {description && (
        <p
          className={cn(
            "max-w-[260px] leading-[1.45] tracking-[-0.16px] text-[var(--color-text-tertiary)]",
            compact ? "text-[14px]" : "text-[15px]"
          )}
        >
          {description}
        </p>
      )}

      {/* Optional action button */}
      {action && <div className="mt-[20px]">{action}</div>}
    </div>
  )
}

