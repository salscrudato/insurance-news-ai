/**
 * Article Card component for the feed
 * Premium iOS news reader design - tight typography, subtle styling
 */

import { Sparkles } from "lucide-react"
import type { Article } from "@/types/firestore"
import type { Timestamp } from "firebase/firestore"

interface ArticleCardProps {
  article: Article
  onSelect: (article: Article) => void
}

function formatRelativeTime(timestamp: Timestamp): string {
  const date = timestamp.toDate()
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `${diffMins}m`
  } else if (diffHours < 24) {
    return `${diffHours}h`
  } else if (diffDays < 7) {
    return `${diffDays}d`
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
}

export function ArticleCard({ article, onSelect }: ArticleCardProps) {
  const handleClick = () => {
    onSelect(article)
  }

  const hasAI = Boolean(article.ai?.tldr)
  const hasImage = Boolean(article.imageUrl)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleClick()
        }
      }}
      className="content-visibility-auto group cursor-pointer overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[0_0_0_0.5px_var(--color-separator)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.985] active:bg-[var(--color-fill-quaternary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
    >
      {/* Image - consistent 2:1 aspect ratio */}
      {hasImage && article.imageUrl && (
        <div className="aspect-[2/1] w-full overflow-hidden bg-[var(--color-fill-quaternary)]">
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Content - consistent padding regardless of image */}
      <div className={hasImage ? "px-[14px] py-[12px]" : "px-[14px] py-[14px]"}>
        {/* Meta row: Source · Time · subtle AI indicator */}
        <div className="mb-[6px] flex items-center gap-[5px]">
          <span className="text-[12px] font-semibold tracking-[-0.1px] text-[var(--color-text-secondary)]">
            {article.sourceName}
          </span>
          <span className="text-[11px] text-[var(--color-text-quaternary)]">·</span>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">
            {formatRelativeTime(article.publishedAt)}
          </span>
          {hasAI && (
            <Sparkles className="ml-auto h-[11px] w-[11px] text-[var(--color-text-quaternary)] opacity-70" strokeWidth={2} />
          )}
        </div>

        {/* Headline */}
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.33] tracking-[-0.2px] text-[var(--color-text-primary)]">
          {article.title}
        </h3>

        {/* Snippet - always show, keep it tight */}
        <p className="mt-[6px] line-clamp-2 text-[13px] leading-[1.38] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
          {article.ai?.tldr ?? article.snippet}
        </p>
      </div>
    </article>
  )
}

export function ArticleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[0_0_0_0.5px_var(--color-separator)]">
      {/* Image skeleton */}
      <div className="aspect-[2/1] w-full skeleton-shimmer" />

      {/* Content skeleton */}
      <div className="px-[14px] py-[12px]">
        {/* Meta row */}
        <div className="mb-[6px] flex items-center gap-[5px]">
          <div className="h-[11px] w-[60px] rounded-[3px] skeleton-shimmer" />
          <div className="h-[11px] w-[24px] rounded-[3px] skeleton-shimmer" />
        </div>

        {/* Headline */}
        <div className="space-y-[5px]">
          <div className="h-[14px] w-full rounded-[3px] skeleton-shimmer" />
          <div className="h-[14px] w-[85%] rounded-[3px] skeleton-shimmer" />
        </div>

        {/* Snippet */}
        <div className="mt-[6px] space-y-[4px]">
          <div className="h-[12px] w-full rounded-[3px] skeleton-shimmer" />
          <div className="h-[12px] w-[70%] rounded-[3px] skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

