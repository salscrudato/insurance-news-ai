/**
 * Feed Page - Infinite scroll article list with filters
 *
 * Supports URL query params:
 * - ?q=<search> - Pre-fill search query (e.g., from topic links on Today page)
 *
 * Firestore limitations handled:
 * - Source filter limited to 10 sources (UI constraint in SourceFilter)
 * - Multi-query merge for >10 sources handled in useArticles hook
 */

import { useState, useMemo, useRef, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Inbox, Search } from "lucide-react"
import { useArticles, useSources, type ArticleFilters, type ArticleFromApi } from "@/lib/hooks"
import {
  CategoryChips,
  TimeWindowToggle,
  SourceFilter,
  SearchBar,
  ArticleCard,
  ArticleCardSkeleton,
  ArticleDetailSheet,
} from "@/components/feed"
import { EmptyState, ErrorState } from "@/components/ui"
import { hapticMedium } from "@/lib/haptics"
import type { SourceCategory } from "@/types/firestore"

/** Prefetch articles when trigger is within this distance from viewport */
const INFINITE_SCROLL_ROOT_MARGIN = 300

export function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Filter state - initialize search from URL query param
  const [category, setCategory] = useState<SourceCategory | "all">("all")
  const [timeWindow, setTimeWindow] = useState<"24h" | "7d" | "all">("7d")
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([])
  // Search query — URL param is source of truth for external navigation,
  // local state provides fast typing feedback
  const urlQueryParam = searchParams.get("q") || ""
  const [searchQuery, setSearchQueryRaw] = useState(urlQueryParam)
  const [lastSyncedParam, setLastSyncedParam] = useState(urlQueryParam)

  // Sync when URL param changes externally (e.g. topic link from Today page)
  if (urlQueryParam !== lastSyncedParam) {
    setLastSyncedParam(urlQueryParam)
    if (urlQueryParam) {
      setSearchQueryRaw(urlQueryParam)
    }
  }


  // Clear URL param when search is cleared
  const handleSearchChange = useCallback((value: string) => {
    setSearchQueryRaw(value)
    if (!value && searchParams.has("q")) {
      searchParams.delete("q")
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Article detail sheet state
  const [selectedArticle, setSelectedArticle] = useState<ArticleFromApi | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Build filters object
  const filters: ArticleFilters = useMemo(
    () => ({
      category,
      timeWindow,
      sourceIds: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
    }),
    [category, timeWindow, selectedSourceIds]
  )

  // Fetch articles with infinite scroll
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useArticles(filters)

  // Fetch sources for filter
  const { data: sources = [] } = useSources()

  // Flatten pages into single array
  const articles = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.articles)
  }, [data])

  // Client-side search filter
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles
    const query = searchQuery.toLowerCase()
    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.snippet.toLowerCase().includes(query) ||
        article.sourceName.toLowerCase().includes(query)
    )
  }, [articles, searchQuery])

  // Infinite scroll observer - triggers before element comes into view
  // Generous margin ensures smooth continuous scrolling without visible loading
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage()
          }
        },
        { rootMargin: `0px 0px ${INFINITE_SCROLL_ROOT_MARGIN}px 0px` }
      )

      if (node) observerRef.current.observe(node)
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  )

  const handleSelectArticle = (article: ArticleFromApi) => {
    hapticMedium()
    setSelectedArticle(article)
    setSheetOpen(true)
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Sticky filters header - stable height, glass background, hairline bottom */}
      <header
        className="glass-nav sticky top-0 z-30 px-[var(--spacing-4)] pt-[10px] pb-[10px] border-b-[0.5px] border-[var(--color-separator)]"
      >
        {/* Search */}
        <div className="mb-[8px]">
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
        </div>

        {/* Category chips - horizontally scrollable, stable height */}
        <div className="h-[30px]">
          <CategoryChips value={category} onChange={setCategory} />
        </div>

        {/* Time + Sources row - stable height with iOS segmented control */}
        <div className="mt-[8px] flex items-center gap-[4px] h-[30px]">
          <TimeWindowToggle value={timeWindow} onChange={setTimeWindow} />
          <div className="h-[14px] w-[0.5px] bg-[var(--color-separator-opaque)] mx-[4px]" />
          <SourceFilter
            sources={sources}
            selectedIds={selectedSourceIds}
            onChange={setSelectedSourceIds}
          />
        </div>
      </header>

      {/* Articles list */}
      <main className="flex-1 px-[var(--spacing-4)] pt-[14px] pb-[calc(14px+var(--safe-area-inset-bottom))]">
        {/* Loading state - show skeletons */}
        {isLoading && (
          <div className="space-y-[14px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state - vertically centered */}
        {error && !filteredArticles.length && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <ErrorState
              title="Unable to load articles"
              description="Check your connection and try again."
              onRetry={() => window.location.reload()}
            />
          </div>
        )}

        {/* Empty state - vertically centered */}
        {!isLoading && !error && filteredArticles.length === 0 && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <EmptyState
              icon={searchQuery ? Search : Inbox}
              title={searchQuery ? "No results" : "No articles"}
              description={
                searchQuery
                  ? "Try a different search term."
                  : "Adjust filters or check back later."
              }
            />
          </div>
        )}

        {/* Article cards */}
        {!isLoading && filteredArticles.length > 0 && (
          <div className="space-y-[14px]">
            {filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onSelect={handleSelectArticle}
              />
            ))}
          </div>
        )}

        {/* Load more trigger - positioned well ahead of viewport edge */}
        {hasNextPage && !searchQuery && (
          <div ref={loadMoreRef} className="py-[20px]">
            {isFetchingNextPage && (
              <div className="flex justify-center">
                <div className="h-[16px] w-[16px] rounded-full border-[1.5px] border-[var(--color-text-quaternary)] border-t-transparent spinner" />
              </div>
            )}
          </div>
        )}

        {/* End of list indicator */}
        {!hasNextPage && filteredArticles.length > 0 && !searchQuery && (
          <p className="py-[28px] text-center text-[12px] font-medium tracking-[-0.04px] text-[var(--color-text-quaternary)]">
            You're all caught up
          </p>
        )}
      </main>

      {/* Article detail sheet */}
      <ArticleDetailSheet
        article={selectedArticle}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}

