/**
 * Search bar component for the Feed page
 * iOS-native search field design
 */

import { Search, X } from "lucide-react"
import { useRef } from "react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = "Search" }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClear = () => {
    onChange("")
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <Search
        className="absolute left-[10px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none"
        strokeWidth={2}
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search articles"
        className="h-[36px] w-full rounded-[10px] bg-[var(--color-fill-tertiary)] pl-[32px] pr-[32px] text-[16px] tracking-[-0.2px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:bg-[var(--color-fill-secondary)] transition-colors duration-[var(--duration-fast)]"
      />
      {value && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-0 top-1/2 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center"
        >
          {/* Visual clear button - smaller visible element with proper touch target */}
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--color-fill-secondary)] text-[var(--color-text-tertiary)] transition-transform duration-[var(--duration-instant)] active:scale-90">
            <X className="h-[10px] w-[10px]" strokeWidth={3} />
          </span>
        </button>
      )}
    </div>
  )
}

