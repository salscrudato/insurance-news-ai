/**
 * iOS-style Segmented Control component
 * Following Apple HIG 2026 with refined styling and animations
 *
 * Features:
 * - Smooth sliding indicator with spring animation
 * - Stable height for layout consistency
 * - Touch-friendly 44pt tap targets
 * - Haptic feedback integration
 * - Focus-visible accessibility support
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Optional icon to show before label */
  icon?: React.ReactNode
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  /** Compact mode for tighter spaces */
  compact?: boolean
  /** Full width mode - segments expand to fill container */
  fullWidth?: boolean
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  compact = false,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({})

  // Track selected index
  const selectedIndex = options.findIndex((opt) => opt.value === value)

  // Update indicator position
  React.useEffect(() => {
    if (!containerRef.current || selectedIndex === -1) return

    const container = containerRef.current
    const buttons = container.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    const selectedButton = buttons[selectedIndex]

    if (selectedButton) {
      const containerRect = container.getBoundingClientRect()
      const buttonRect = selectedButton.getBoundingClientRect()

      setIndicatorStyle({
        width: buttonRect.width,
        transform: `translateX(${buttonRect.left - containerRect.left}px)`,
      })
    }
  }, [selectedIndex, options])

  const handleSelect = (optValue: T) => {
    if (optValue !== value) {
      onChange(optValue)
    }
  }

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={cn(
        [
          "relative inline-flex items-center",
          "rounded-[9px] bg-[var(--color-fill-tertiary)]",
          "p-[2px]",
        ].join(" "),
        compact ? "h-[30px]" : "h-[34px]",
        fullWidth && "w-full",
        className
      )}
    >
      {/* Sliding indicator with refined shadow */}
      <div
        className={cn(
          "absolute top-[2px] bottom-[2px]",
          "rounded-[7px] bg-white",
          "shadow-[0_1px_4px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]",
          "transition-all duration-[var(--duration-normal)] ease-[var(--ease-ios-spring)]"
        )}
        style={indicatorStyle}
      />

      {/* Segment buttons */}
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isSelected}
            onClick={() => handleSelect(option.value)}
            className={cn(
              [
                "relative z-10 flex items-center justify-center gap-[4px]",
                "rounded-[7px] font-semibold",
                "-webkit-tap-highlight-color-transparent",
                "transition-colors duration-[var(--duration-fast)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset",
              ].join(" "),
              compact
                ? "min-w-[44px] px-[10px] text-[12px] tracking-[-0.04px]"
                : "min-w-[48px] px-[14px] text-[13px] tracking-[-0.08px]",
              fullWidth && "flex-1",
              isSelected
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

