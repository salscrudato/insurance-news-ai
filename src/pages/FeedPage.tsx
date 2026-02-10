/**
 * Feed Page - Infinite scroll article list with filters
 */

import { useState, useMemo, useRef, useCallback } from "react"
import { Inbox, Search } from "lucide-react"
import { useArticles, useSources, type ArticleFilters } from "@/lib/hooks"
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
import type { Article, SourceCategory } from "@/types/firestore"

export function FeedPage() {
  // Filter state
  const [category, setCategory] = useState<SourceCategory | "all">("all")
  const [timeWindow, setTimeWindow] = useState<"24h" | "7d" | "all">("7d")
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Article detail sheet state
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
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

  // Infinite scroll observer - triggers 150px before element comes into view
  // Conservative margin prevents over-fetching while keeping scroll smooth
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
        { rootMargin: '0px 0px 150px 0px' }
      )

      if (node) observerRef.current.observe(node)
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  )

  const handleSelectArticle = (article: Article) => {
    hapticMedium()
    setSelectedArticle(article)
    setSheetOpen(true)
  }

  return (
    <>
      <div className="-mx-[var(--spacing-4)] -mt-[6px]">
        {/* Sticky filters header - minimal height, positioned below TopNav */}
        <div
          className="glass-nav sticky z-30 px-[var(--spacing-4)] pb-[12px] pt-[10px]"
          style={{ top: 'calc(52px + var(--safe-area-inset-top))' }}
        >
          {/* Search */}
          <div className="mb-[12px]">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Category pills - scrollable */}
          <CategoryChips value={category} onChange={setCategory} />

          {/* Time + Sources row - compact inline controls with hairline above */}
          <div className="mt-[12px] flex items-center gap-[8px] pt-[10px] border-t border-[var(--color-separator-opaque)]">
            <TimeWindowToggle value={timeWindow} onChange={setTimeWindow} />
            <div className="h-[16px] w-px bg-[var(--color-separator-opaque)] mx-[4px]" />
            <SourceFilter
              sources={sources}
              selectedIds={selectedSourceIds}
              onChange={setSelectedSourceIds}
            />
          </div>
        </div>

        {/* Articles list */}
        <div className="min-h-[50vh] px-[var(--spacing-4)] py-[16px]">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-[12px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error state - vertically centered */}
          {error && !filteredArticles.length && (
            <div className="flex min-h-[50vh] items-center justify-center pt-[var(--spacing-4)]">
              <ErrorState
                title="Unable to load articles"
                description="Check your connection and try again."
                onRetry={() => window.location.reload()}
              />
            </div>
          )}

          {/* Empty state - vertically centered */}
          {!isLoading && !error && filteredArticles.length === 0 && (
            <div className="flex min-h-[50vh] items-center justify-center pt-[var(--spacing-4)]">
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

          {/* Article cards - tighter spacing */}
          {!isLoading && filteredArticles.length > 0 && (
            <div className="space-y-[12px]">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onSelect={handleSelectArticle}
                />
              ))}
            </div>
          )}

          {/* Load more trigger - positioned well ahead */}
          {hasNextPage && !searchQuery && (
            <div ref={loadMoreRef} className="py-[32px]">
              {isFetchingNextPage && (
                <div className="flex justify-center">
                  <div className="h-[18px] w-[18px] rounded-full border-[2px] border-[var(--color-accent)] border-t-transparent spinner" />
                </div>
              )}
            </div>
          )}

          {/* End of list */}
          {!hasNextPage && filteredArticles.length > 0 && !searchQuery && (
            <p className="py-[40px] text-center text-[13px] text-[var(--color-text-quaternary)]">
              You're all caught up
            </p>
          )}
        </div>
      </div>

      {/* Article detail sheet */}
      <ArticleDetailSheet
        article={selectedArticle}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}

