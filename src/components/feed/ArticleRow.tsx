/**
 * Article row component for the feed list
 */

import { Bookmark, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useIsBookmarked, useToggleBookmark } from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import type { Article } from "@/types/firestore"
import type { Timestamp } from "firebase/firestore"

interface ArticleRowProps {
  article: Article
  onSelect: (article: Article) => void
  showBookmark?: boolean
}

function formatRelativeTime(timestamp: Timestamp): string {
  const date = timestamp.toDate()
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
}

export function ArticleRow({ article, onSelect, showBookmark = true }: ArticleRowProps) {
  const { isAuthenticated, isAnonymous } = useAuth()
  const { data: isBookmarked } = useIsBookmarked(showBookmark ? article.id : undefined)
  const toggleBookmark = useToggleBookmark()

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isAuthenticated) {
      toast.error("Sign in to bookmark articles")
      return
    }

    if (isAnonymous) {
      toast.error("Guests cannot bookmark articles", {
        description: "Sign in to save articles for later",
      })
      return
    }

    toggleBookmark.mutate(
      { article, isCurrentlyBookmarked: !!isBookmarked },
      {
        onSuccess: ({ bookmarked }) => {
          toast.success(bookmarked ? "Article saved" : "Bookmark removed")
        },
        onError: () => {
          toast.error("Failed to update bookmark")
        },
      }
    )
  }

  const handleRowClick = () => {
    onSelect(article)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleRowClick()
        }
      }}
      className="flex w-full cursor-pointer gap-3 border-b border-[var(--color-border)] px-[var(--spacing-md)] py-[var(--spacing-md)] text-left transition-colors hover:bg-[var(--color-surface)] active:bg-[var(--color-surface)]"
    >
      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Source and time */}
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            {article.sourceName}
          </Badge>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">
            {formatRelativeTime(article.publishedAt)}
          </span>
        </div>

        {/* Headline */}
        <h3 className="mb-1 line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--color-text-primary)]">
          {article.title}
        </h3>

        {/* Snippet */}
        <p className="line-clamp-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          {article.snippet}
        </p>
      </div>

      {/* Bookmark button */}
      {showBookmark && (
        <button
          onClick={handleBookmarkClick}
          disabled={toggleBookmark.isPending}
          className="shrink-0 self-start rounded-full p-2 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)] disabled:opacity-50"
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          {toggleBookmark.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Bookmark
              className="h-5 w-5"
              fill={isBookmarked ? "currentColor" : "none"}
            />
          )}
        </button>
      )}
    </div>
  )
}

export function ArticleRowSkeleton() {
  return (
    <div className="flex gap-3 border-b border-[var(--color-border)] px-[var(--spacing-md)] py-[var(--spacing-md)]">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--color-surface)]" />
          <div className="h-4 w-12 animate-pulse rounded bg-[var(--color-surface)]" />
        </div>
        <div className="h-5 w-full animate-pulse rounded bg-[var(--color-surface)]" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--color-surface)]" />
        <div className="h-4 w-full animate-pulse rounded bg-[var(--color-surface)]" />
      </div>
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--color-surface)]" />
    </div>
  )
}

