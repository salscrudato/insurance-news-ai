/**
 * Bookmarks Page - Saved articles list
 */

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bookmark as BookmarkIcon, Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { doc, getDoc } from "firebase/firestore"
import { useQuery } from "@tanstack/react-query"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import {
  Card,
  Separator,
  SHEET_TOKENS,
  SheetHeaderBlock,
  SheetSection,
  SheetSnippet,
  SheetActions,
  SheetIconButton,
} from "@/components/ui"
import { useBookmarks, useToggleBookmark } from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { hapticMedium, hapticSuccess, hapticLight } from "@/lib/haptics"
import { openUrl } from "@/lib/browser"
import type { Bookmark, Article } from "@/types/firestore"

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function BookmarkRowSkeleton() {
  return (
    <div className="flex min-h-[68px] items-center gap-[12px] px-[16px] py-[12px]">
      <div className="min-w-0 flex-1">
        <div className="mb-[6px] h-[16px] w-4/5 rounded-[4px] skeleton-shimmer" />
        <div className="h-[13px] w-2/5 rounded-[3px] skeleton-shimmer" />
      </div>
      <div className="h-[36px] w-[36px] shrink-0 rounded-full skeleton-shimmer" />
    </div>
  )
}

/**
 * Polished empty state with CTA
 */
function EmptyState({ onBrowseFeed }: { onBrowseFeed: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-[56px] text-center">
      {/* Icon container with subtle gradient */}
      <div className="mb-[20px] flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-gradient-to-br from-[var(--color-fill-tertiary)] to-[var(--color-fill-secondary)]">
        <BookmarkIcon className="h-[32px] w-[32px] text-[var(--color-text-tertiary)]" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 className="mb-[8px] text-[22px] font-bold tracking-[-0.4px] text-[var(--color-text-primary)]">
        No Saved Articles
      </h3>

      {/* Description */}
      <p className="mb-[24px] max-w-[280px] text-[15px] leading-[1.5] tracking-[-0.16px] text-[var(--color-text-secondary)]">
        Tap the bookmark icon on any article to save it for later reading.
      </p>

      {/* CTA Button */}
      <button
        onClick={onBrowseFeed}
        className="group flex items-center gap-[8px] rounded-full bg-[var(--color-accent)] px-[24px] py-[14px] text-[16px] font-semibold text-white shadow-[0_2px_12px_rgba(10,132,255,0.3)] transition-all duration-200 active:scale-[0.96] active:shadow-[0_1px_6px_rgba(10,132,255,0.2)]"
      >
        <span>Browse Feed</span>
        <ArrowRight className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-[2px]" strokeWidth={2} />
      </button>
    </div>
  )
}

interface BookmarkRowProps {
  bookmark: Bookmark
  onSelect: (bookmark: Bookmark) => void
  onRemove: (bookmark: Bookmark) => void
  isRemoving: boolean
}

function BookmarkRow({ bookmark, onSelect, onRemove, isRemoving }: BookmarkRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(bookmark)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(bookmark)
        }
      }}
      className="flex w-full min-h-[64px] cursor-pointer items-center gap-[12px] px-[16px] py-[12px] text-left transition-colors duration-[var(--duration-instant)] active:bg-[var(--color-fill-quaternary)]"
    >
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[16px] font-medium leading-[1.32] tracking-[-0.24px] text-[var(--color-text-primary)]">
          {bookmark.title}
        </h3>
        <p className="mt-[5px] text-[13px] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
          <span className="font-medium text-[var(--color-text-secondary)]">{bookmark.sourceName}</span>
          <span className="mx-[5px]">·</span>
          <span>{formatDate(bookmark.bookmarkedAt.toDate())}</span>
        </p>
      </div>
      <button
        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-fill-tertiary)] active:scale-[0.88] active:bg-[var(--color-fill-secondary)] disabled:opacity-50"
        onClick={(e) => {
          e.stopPropagation()
          hapticLight()
          onRemove(bookmark)
        }}
        disabled={isRemoving}
      >
        {isRemoving ? (
          <Loader2 className="h-[17px] w-[17px] animate-spin text-[var(--color-accent)]" />
        ) : (
          <BookmarkIcon className="h-[17px] w-[17px] fill-[var(--color-accent)] text-[var(--color-accent)]" />
        )}
      </button>
    </div>
  )
}

export function BookmarksPage() {
  const navigate = useNavigate()
  const { isLoading: authLoading } = useAuth()
  const { data: bookmarks, isLoading: bookmarksLoading } = useBookmarks()
  const toggleBookmark = useToggleBookmark()

  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Fetch full article when bookmark is selected
  const { data: selectedArticle } = useQuery({
    queryKey: ["article", selectedBookmark?.articleId],
    queryFn: async () => {
      if (!selectedBookmark) return null
      const articleDoc = await getDoc(doc(db, "articles", selectedBookmark.articleId))
      if (!articleDoc.exists()) return null
      return { id: articleDoc.id, ...articleDoc.data() } as Article
    },
    enabled: !!selectedBookmark,
  })

  const isLoading = authLoading || bookmarksLoading

  const handleSelectBookmark = (bookmark: Bookmark) => {
    hapticMedium()
    setSelectedBookmark(bookmark)
    setSheetOpen(true)
  }

  const handleRemoveBookmark = (bookmark: Bookmark) => {
    if (!selectedArticle && bookmark.articleId !== selectedBookmark?.articleId) {
      // Create a minimal article object for removal
      const minimalArticle: Article = {
        id: bookmark.articleId,
        title: bookmark.title,
        sourceName: bookmark.sourceName,
        url: bookmark.url,
        sourceId: "",
        snippet: "",
        canonicalUrl: bookmark.url,
        guid: null,
        imageUrl: null,
        categories: [],
        publishedAt: bookmark.bookmarkedAt,
        ingestedAt: bookmark.bookmarkedAt,
        relevanceScore: 0,
        isRelevant: true,
        ai: null,
      }

      setRemovingId(bookmark.articleId)
      toggleBookmark.mutate(
        { article: minimalArticle, isCurrentlyBookmarked: true },
        {
          onSuccess: () => {
            hapticSuccess()
            toast.success("Bookmark removed")
            setRemovingId(null)
          },
          onError: () => {
            toast.error("Failed to remove bookmark")
            setRemovingId(null)
          },
        }
      )
      return
    }

    if (selectedArticle) {
      setRemovingId(bookmark.articleId)
      toggleBookmark.mutate(
        { article: selectedArticle, isCurrentlyBookmarked: true },
        {
          onSuccess: () => {
            hapticSuccess()
            toast.success("Bookmark removed")
            setRemovingId(null)
            setSheetOpen(false)
          },
          onError: () => {
            toast.error("Failed to remove bookmark")
            setRemovingId(null)
          },
        }
      )
    }
  }

  const handleOpenArticle = () => {
    if (selectedBookmark) {
      hapticMedium()
      openUrl(selectedBookmark.url)
    }
  }

  return (
    <div className="space-y-[20px]">
      {/* Description */}
      <div className="-mt-[4px]">
        <p className="text-[15px] leading-[1.45] tracking-[-0.16px] text-[var(--color-text-secondary)]">
          Your reading list
        </p>
        {!isLoading && bookmarks && bookmarks.length > 0 && (
          <p className="mt-[8px] text-[13px] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
            {bookmarks.length} article{bookmarks.length !== 1 ? "s" : ""} saved
          </p>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card variant="grouped">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <BookmarkRowSkeleton />
              {i < 3 && <Separator variant="inset" />}
            </div>
          ))}
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && (!bookmarks || bookmarks.length === 0) && (
        <EmptyState onBrowseFeed={() => {
          hapticMedium()
          navigate("/feed")
        }} />
      )}

      {/* Bookmarks list */}
      {!isLoading && bookmarks && bookmarks.length > 0 && (
        <Card variant="grouped">
          {bookmarks.map((bookmark, index) => (
            <div key={bookmark.articleId}>
              <BookmarkRow
                bookmark={bookmark}
                onSelect={handleSelectBookmark}
                onRemove={handleRemoveBookmark}
                isRemoving={removingId === bookmark.articleId}
              />
              {index < bookmarks.length - 1 && <Separator variant="inset" />}
            </div>
          ))}
        </Card>
      )}

      {/* Bookmark detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          hideCloseButton
          className={SHEET_TOKENS.containerClass}
        >
          {/* Drag indicator */}
          <div className={SHEET_TOKENS.dragIndicatorClass} />

          {selectedBookmark && (
            <>
              {/* Accessibility: Visually hidden title for screen readers */}
              <SheetTitle className="sr-only">{selectedBookmark.title}</SheetTitle>
              <SheetDescription className="sr-only">
                Saved article from {selectedBookmark.sourceName}
              </SheetDescription>

              {/* Header */}
              <SheetHeaderBlock
                source={selectedBookmark.sourceName}
                timestamp={`Saved ${formatDate(selectedBookmark.bookmarkedAt.toDate())}`}
                title={selectedBookmark.title}
              />

              {/* AI Summary if available */}
              {selectedArticle?.ai && (
                <div className="mb-[24px] overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-fill-quaternary)]">
                  <div className="border-b border-[var(--color-separator)] px-[18px] py-[16px]">
                    <SheetSection label="TL;DR">
                      {selectedArticle.ai.tldr}
                    </SheetSection>
                  </div>

                  <div className="px-[18px] py-[16px]">
                    <SheetSection label="Why It Matters">
                      {selectedArticle.ai.whyItMatters}
                    </SheetSection>
                  </div>

                  {/* Topics */}
                  {selectedArticle.ai.topics.length > 0 && (
                    <div className="flex flex-wrap gap-[6px] border-t border-[var(--color-separator)] px-[18px] py-[13px]">
                      {selectedArticle.ai.topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-[var(--color-surface)] px-[12px] py-[6px] text-[12px] font-medium tracking-[-0.05px] text-[var(--color-text-secondary)]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI Disclaimer */}
                  <div className="border-t border-[var(--color-separator)] px-[18px] py-[10px]">
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">
                      Summary generated by AI. Read original source for full article.
                    </p>
                  </div>
                </div>
              )}

              {/* Snippet */}
              {selectedArticle?.snippet && (
                <SheetSnippet>{selectedArticle.snippet}</SheetSnippet>
              )}

              {/* Actions */}
              <SheetActions
                onReadArticle={handleOpenArticle}
                secondaryButton={
                  <SheetIconButton
                    onClick={() => handleRemoveBookmark(selectedBookmark)}
                    disabled={removingId === selectedBookmark.articleId}
                    loading={removingId === selectedBookmark.articleId}
                  >
                    <BookmarkIcon className="h-[20px] w-[20px] fill-current" />
                  </SheetIconButton>
                }
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

