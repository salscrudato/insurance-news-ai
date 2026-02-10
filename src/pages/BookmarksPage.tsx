/**
 * Bookmarks Page - Saved articles reading list
 * Apple-inspired iOS "Reading List" design with premium polish
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
  SheetSnippet,
  SheetActions,
  SheetIconButton,
  SheetAICard,
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
    <div className="flex min-h-[68px] items-center gap-[14px] px-[16px] py-[12px]">
      <div className="min-w-0 flex-1">
        <div className="mb-[6px] h-[16px] w-4/5 rounded-[4px] skeleton-shimmer" />
        <div className="h-[13px] w-2/5 rounded-[3px] skeleton-shimmer" />
      </div>
      <div className="h-[44px] w-[44px] shrink-0 rounded-full skeleton-shimmer" />
    </div>
  )
}

/**
 * Polished empty state - calm, centered, App Store quality
 */
function EmptyBookmarks({ onBrowseFeed }: { onBrowseFeed: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-[48px] text-center">
      {/* Icon container - iOS grouped card feel */}
      <div className="mb-[18px] flex h-[64px] w-[64px] items-center justify-center rounded-[16px] bg-[var(--color-fill-quaternary)] shadow-[inset_0_0_0_0.5px_var(--color-separator-light)]">
        <BookmarkIcon className="h-[28px] w-[28px] text-[var(--color-text-quaternary)]" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 className="mb-[6px] text-[20px] font-semibold leading-[1.2] tracking-[-0.24px] text-[var(--color-text-primary)]">
        No Saved Articles
      </h3>

      {/* Description */}
      <p className="mb-[22px] max-w-[260px] text-[15px] leading-[1.45] tracking-[-0.2px] text-[var(--color-text-tertiary)]">
        Tap the bookmark icon on any article to save it here for later.
      </p>

      {/* CTA Button - matches system button style */}
      <button
        onClick={onBrowseFeed}
        className="group flex items-center gap-[7px] rounded-full bg-[var(--color-accent)] px-[22px] py-[12px] text-[15px] font-semibold tracking-[-0.2px] text-white shadow-[var(--shadow-button)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.97] active:bg-[var(--color-accent-pressed)] active:shadow-[var(--shadow-button-active)]"
      >
        <span>Browse Feed</span>
        <ArrowRight className="h-[16px] w-[16px] transition-transform duration-[var(--duration-fast)] ease-[var(--ease-ios)] group-hover:translate-x-[2px]" strokeWidth={2.2} />
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
      aria-label={`Open ${bookmark.title} from ${bookmark.sourceName}`}
      onClick={() => onSelect(bookmark)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(bookmark)
        }
      }}
      className="flex w-full min-h-[64px] cursor-pointer items-center gap-[14px] px-[16px] py-[12px] text-left transition-colors duration-[var(--duration-instant)] ease-[var(--ease-ios)] active:bg-[var(--color-fill-quaternary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]"
    >
      <div className="min-w-0 flex-1">
        <h3 className="headline-text line-clamp-2 text-[16px] font-semibold leading-[1.32] tracking-[-0.28px] text-[var(--color-text-primary)]">
          {bookmark.title}
        </h3>
        <div className="mt-[4px] flex items-center gap-[5px]">
          <span className="text-[12px] font-semibold tracking-[-0.08px] text-[var(--color-text-secondary)]">
            {bookmark.sourceName}
          </span>
          <span className="text-[10px] leading-none text-[var(--color-text-quaternary)]">·</span>
          <span className="text-[12px] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
            {formatDate(bookmark.bookmarkedAt.toDate())}
          </span>
        </div>
      </div>
      <button
        aria-label={`Remove bookmark for ${bookmark.title}`}
        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full -webkit-tap-highlight-color-transparent transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:bg-[var(--color-fill-tertiary)] active:scale-[0.90] active:bg-[var(--color-fill-secondary)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        onClick={(e) => {
          e.stopPropagation()
          hapticLight()
          onRemove(bookmark)
        }}
        disabled={isRemoving}
      >
        {isRemoving ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin text-[var(--color-accent)]" />
        ) : (
          <BookmarkIcon className="h-[18px] w-[18px] fill-[var(--color-accent)] text-[var(--color-accent)]" />
        )}
      </button>
    </div>
  )
}

export function BookmarksPage() {
  const navigate = useNavigate()
  const { isLoading: authLoading, user } = useAuth()
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

  // If the user is a local guest (no Firebase account), there are no bookmarks
  // to fetch — skip straight to empty state, never show skeleton.
  // Also, once auth is resolved and there's no user, don't wait on the query.
  const isLoading = authLoading || (!!user && bookmarksLoading)

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
      {/* Page subtitle - matches TodayPage header pattern */}
      <header className="-mt-[4px]">
        <p className="text-[15px] font-normal leading-[1.45] tracking-[-0.2px] text-[var(--color-text-secondary)]">
          Your reading list
          {!isLoading && bookmarks && bookmarks.length > 0 && (
            <span className="text-[var(--color-text-tertiary)]">
              {" · "}{bookmarks.length} article{bookmarks.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </header>

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
        <EmptyBookmarks onBrowseFeed={() => {
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

              {/* AI Summary - uses unified SheetAICard for design consistency */}
              {selectedArticle?.ai && (
                <SheetAICard
                  className={SHEET_TOKENS.sectionMargin}
                  tldr={selectedArticle.ai.tldr}
                  whyItMatters={selectedArticle.ai.whyItMatters}
                  topics={selectedArticle.ai.topics}
                />
              )}

              {/* Snippet - shown when no AI available */}
              {selectedArticle?.snippet && !selectedArticle?.ai && (
                <SheetSnippet>{selectedArticle.snippet}</SheetSnippet>
              )}

              {/* Actions */}
              <SheetActions
                onReadArticle={handleOpenArticle}
                primaryLabel="Read Full Article"
                secondaryButton={
                  <SheetIconButton
                    onClick={() => handleRemoveBookmark(selectedBookmark)}
                    disabled={removingId === selectedBookmark.articleId}
                    loading={removingId === selectedBookmark.articleId}
                    aria-label="Remove bookmark"
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

