/**
 * Search bar component for the Feed page
 * iOS-native search field design following Apple HIG 2026
 * Features refined styling, proper focus states, and accessible clear button
 */

import { Search, X } from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Size variant */
  size?: "default" | "large"
}

export function SearchBar({
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

  const sizeStyles = {
    default: "h-[38px] text-[16px] pl-[34px] pr-[36px] rounded-[12px]",
    large: "h-[44px] text-[17px] pl-[38px] pr-[40px] rounded-[14px]",
  }[size]

  const iconSize = size === "large" ? "h-[18px] w-[18px]" : "h-[16px] w-[16px]"
  const iconLeft = size === "large" ? "left-[12px]" : "left-[10px]"

  return (
    <div className="relative">
      {/* Search icon */}
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
          "tracking-[-0.24px] text-[var(--color-text-primary)]",
          "placeholder:text-[var(--color-text-placeholder)]",
          "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
          // Focus state
          "focus:outline-none focus:bg-[var(--color-fill-secondary)]",
          "focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset",
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
              "flex h-[18px] w-[18px] items-center justify-center",
              "rounded-full bg-[var(--color-fill-secondary)]",
              "text-[var(--color-text-tertiary)]",
              "transition-all duration-[var(--duration-instant)] ease-[var(--ease-ios)]",
              "active:scale-[0.85] active:bg-[var(--color-fill-primary)]"
            )}
          >
            <X className="h-[10px] w-[10px]" strokeWidth={3} />
          </span>
        </button>
      )}
    </div>
  )
}

