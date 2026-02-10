/**
 * Search bar component for the Feed page
 * iOS-native search field design following Apple HIG 2026
 * Features refined styling, proper focus states, and accessible clear button
 */

import { memo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Size variant */
  size?: "default" | "large"
}

export const SearchBar = memo(function SearchBar({
  value,
  onChange,
  placeholder = "Search",
  size = "default"
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  const handleClear = () => {
    onChange("")
    inputRef.current?.focus()
  }

  const isDefault = size === "default"
  const sizeStyles = isDefault
    ? "h-[36px] text-[15px] pl-[32px] pr-[36px] rounded-[var(--radius-md)]"
    : "h-[44px] text-[17px] pl-[38px] pr-[40px] rounded-[var(--radius-lg)]"

  const iconSize = isDefault ? "h-[15px] w-[15px]" : "h-[18px] w-[18px]"
  const iconLeft = isDefault ? "left-[10px]" : "left-[12px]"

  return (
    <div className="relative">
      {/* Search icon - vertically centered with flex fallback */}
      <Search
        className={cn(
          "absolute top-1/2 -translate-y-1/2 pointer-events-none",
          iconSize,
          iconLeft,
          "transition-colors duration-[var(--duration-fast)]",
          isFocused ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"
        )}
        strokeWidth={2}
      />

      {/* Input field */}
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        aria-label="Search articles"
        // Hide native clear button in WebKit
        style={{ WebkitAppearance: 'none' }}
        className={cn(
          "w-full",
          sizeStyles,
          "bg-[var(--color-fill-tertiary)]",
          "tracking-[-0.2px] text-[var(--color-text-primary)]",
          "placeholder:text-[var(--color-text-placeholder)]",
          "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
          // Subtle focus: tinted background, no ring (Apple-style)
          "focus:outline-none focus:bg-[var(--color-fill-secondary)]",
          // Remove default search styling
          "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        )}
      />

      {/* Clear button - 44px touch target with smaller visual element */}
      {value && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2",
            "flex h-[44px] w-[44px] items-center justify-center",
            "-webkit-tap-highlight-color-transparent"
          )}
        >
          <span
            className={cn(
              "flex h-[16px] w-[16px] items-center justify-center",
              "rounded-full bg-[var(--color-fill-secondary)]",
              "text-[var(--color-text-tertiary)]",
              "transition-all duration-[var(--duration-instant)] ease-[var(--ease-ios)]",
              "active:scale-[0.85] active:bg-[var(--color-fill-primary)]"
            )}
          >
            <X className="h-[9px] w-[9px]" strokeWidth={3} />
          </span>
        </button>
      )}
    </div>
  )
})

