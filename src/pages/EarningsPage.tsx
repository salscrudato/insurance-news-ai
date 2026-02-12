/**
 * Earnings Home Page — /earnings
 *
 * Apple-inspired, minimal UI for searching companies and managing a watchlist.
 * - Debounced search with live results
 * - Persistent watchlist (Firestore-backed)
 * - Latest reported dates from watchlist tickers
 */

import { useState, useCallback, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  TrendingUp,
  Star,
  StarOff,
  ChevronRight,
  X,
  Building2,
} from "lucide-react"
import {
  useEarningsSearch,
  useEarningsWatchlist,
  useToggleEarningsWatchlist,
} from "@/lib/hooks"
import type { CompanySearchResult } from "@/lib/hooks"
import { Skeleton, EmptyState } from "@/components/ui"
import { cn } from "@/lib/utils"

// ============================================================================
// Debounce Hook
// ============================================================================

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

// ============================================================================
// Search Input
// ============================================================================

function SearchInput({
  value,
  onChange,
  onClear,
  inputRef,
}: {
  value: string
  onChange: (v: string) => void
  onClear: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-[14px]">
        <Search
          className="h-[16px] w-[16px] text-[var(--color-text-tertiary)]"
          strokeWidth={1.8}
        />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search ticker or company name…"
        className={cn(
          "w-full rounded-[12px] bg-[var(--color-fill-quaternary)]",
          "py-[11px] pl-[38px] pr-[38px]",
          "text-[15px] tracking-[-0.24px] text-[var(--color-text-primary)]",
          "placeholder:text-[var(--color-text-placeholder)]",
          "outline-none ring-0",
          "transition-colors duration-200",
          "focus:bg-[var(--color-fill-tertiary)]",
        )}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute inset-y-0 right-0 flex items-center pr-[12px]"
          aria-label="Clear search"
        >
          <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--color-fill-secondary)]">
            <X className="h-[10px] w-[10px] text-[var(--color-text-tertiary)]" strokeWidth={2.5} />
          </div>
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Search Result Row
// ============================================================================

function SearchResultRow({
  result,
  onClick,
}: {
  result: CompanySearchResult
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-[12px] px-[16px] py-[12px] text-left",
        "transition-colors duration-150",
        "hover:bg-[var(--color-fill-quaternary)] active:bg-[var(--color-fill-tertiary)]",
        "-webkit-tap-highlight-color-transparent",
      )}
    >
      <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[var(--color-accent-soft)] shrink-0">
        <Building2 className="h-[16px] w-[16px] text-[var(--color-accent)]" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[6px]">
          <span className="text-[15px] font-semibold tracking-[-0.24px] text-[var(--color-text-primary)]">
            {result.ticker}
          </span>
          <span className="text-[11px] tracking-[-0.02em] text-[var(--color-text-quaternary)] px-[5px] py-[1px] rounded-[4px] bg-[var(--color-fill-quaternary)]">
            {result.region}
          </span>
        </div>
        <span className="block text-[13px] tracking-[-0.08px] text-[var(--color-text-secondary)] truncate mt-[1px]">
          {result.name}
        </span>
      </div>
      <ChevronRight
        className="h-[13px] w-[13px] shrink-0 text-[var(--color-text-quaternary)] opacity-60 group-hover:translate-x-[1px] transition-transform duration-150"
        strokeWidth={2.5}
      />
    </button>
  )
}

// ============================================================================
// Watchlist Ticker Card
// ============================================================================

function WatchlistTickerCard({
  ticker,
  onNavigate,
  onRemove,
}: {
  ticker: string
  onNavigate: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-[10px]">
      <button
        onClick={onNavigate}
        className={cn(
          "group flex-1 flex items-center gap-[12px] px-[14px] py-[12px] text-left",
          "rounded-[12px] bg-[var(--color-surface)]",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]",
          "transition-all duration-150",
          "hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]",
          "active:scale-[0.98]",
          "-webkit-tap-highlight-color-transparent",
        )}
      >
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[var(--color-accent-soft)] shrink-0">
          <TrendingUp className="h-[15px] w-[15px] text-[var(--color-accent)]" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold tracking-[-0.24px] text-[var(--color-text-primary)]">
            {ticker}
          </span>
        </div>
        <ChevronRight
          className="h-[13px] w-[13px] shrink-0 text-[var(--color-text-quaternary)] opacity-60 group-hover:translate-x-[1px] transition-transform duration-150"
          strokeWidth={2.5}
        />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className={cn(
          "flex h-[34px] w-[34px] items-center justify-center rounded-[10px] shrink-0",
          "text-[var(--color-text-tertiary)]",
          "transition-all duration-150",
          "hover:bg-[var(--color-fill-quaternary)] hover:text-[var(--color-warning)]",
          "active:scale-[0.92]",
        )}
        aria-label={`Remove ${ticker} from watchlist`}
      >
        <StarOff className="h-[15px] w-[15px]" strokeWidth={1.8} />
      </button>
    </div>
  )
}

// ============================================================================
// Skeletons
// ============================================================================

function SearchSkeleton() {
  return (
    <div className="space-y-[2px]">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-[12px] px-[16px] py-[12px]">
          <Skeleton className="h-[36px] w-[36px] rounded-[10px]" />
          <div className="flex-1 space-y-[6px]">
            <Skeleton className="h-[14px] w-[60px] rounded-[4px]" />
            <Skeleton className="h-[12px] w-[140px] rounded-[4px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function WatchlistSkeleton() {
  return (
    <div className="space-y-[8px]">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[58px] w-full rounded-[12px]" />
      ))}
    </div>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export function EarningsPage() {
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebouncedValue(searchValue, 350)

  const {
    data: searchResults,
    isLoading: searchLoading,
    isFetching: searchFetching,
  } = useEarningsSearch(debouncedQuery)
  const { data: watchlist, isLoading: watchlistLoading } = useEarningsWatchlist()
  const toggleWatchlist = useToggleEarningsWatchlist()

  const handleClearSearch = useCallback(() => {
    setSearchValue("")
    inputRef.current?.focus()
  }, [])

  const handleNavigateToDetail = useCallback(
    (ticker: string) => {
      navigate(`/earnings/${ticker}`)
    },
    [navigate]
  )

  const isSearching = searchValue.trim().length > 0
  const hasResults = searchResults && searchResults.length > 0
  const hasWatchlist = watchlist && watchlist.length > 0

  return (
    <>
      {/* Search */}
      <div className="mb-[20px]">
        <SearchInput
          value={searchValue}
          onChange={setSearchValue}
          onClear={handleClearSearch}
          inputRef={inputRef}
        />
      </div>

      {/* Search Results */}
      {isSearching && (
        <div className="mb-[24px]">
          <div className="mb-[8px] px-[2px]">
            <span className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)]">
              Search Results
            </span>
          </div>
          <div className="overflow-hidden rounded-[12px] bg-[var(--color-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]">
            {searchLoading || searchFetching ? (
              <SearchSkeleton />
            ) : hasResults ? (
              <div className="divide-y divide-[var(--color-separator-light)]">
                {searchResults.map((result) => (
                  <SearchResultRow
                    key={result.ticker}
                    result={result}
                    onClick={() => handleNavigateToDetail(result.ticker)}
                  />
                ))}
              </div>
            ) : (
              <div className="px-[16px] py-[24px] text-center">
                <p className="text-[14px] text-[var(--color-text-tertiary)]">
                  No results for "{searchValue}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Watchlist */}
      {!isSearching && (
        <div>
          <div className="mb-[10px] px-[2px]">
            <span className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-tertiary)]">
              Watchlist
            </span>
          </div>

          {watchlistLoading ? (
            <WatchlistSkeleton />
          ) : hasWatchlist ? (
            <div className="space-y-[8px]">
              {watchlist.map((ticker) => (
                <WatchlistTickerCard
                  key={ticker}
                  ticker={ticker}
                  onNavigate={() => handleNavigateToDetail(ticker)}
                  onRemove={() => toggleWatchlist.mutate(ticker)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Star}
              title="No Companies Yet"
              description="Search for a ticker or company name to get started with earnings data."
              iconVariant="accent"
              compact
            />
          )}
        </div>
      )}
    </>
  )
}
