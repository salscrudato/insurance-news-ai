/**
 * Article Card component for the feed
 * Premium iOS news reader design following Apple HIG 2026
 * Features refined typography, smooth image loading, and iOS-native interactions
 */

import { useState, useCallback } from "react"
import { Sparkles, Newspaper } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ArticleFromApi } from "@/lib/hooks"
import type { Timestamp } from "firebase/firestore"

/**
 * Elegant placeholder for articles without images
 * Uses a subtle gradient with a centered icon
 */
function ImagePlaceholder() {
  return (
    <div className="aspect-[1.9/1] w-full flex items-center justify-center bg-gradient-to-br from-[var(--color-fill-tertiary)] via-[var(--color-fill-quaternary)] to-[var(--color-fill-tertiary)]">
      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[var(--color-fill-secondary)]">
        <Newspaper
          className="h-[26px] w-[26px] text-[var(--color-text-quaternary)]"
          strokeWidth={1.5}
        />
      </div>
    </div>
  )
}

/**
 * Image with loading state and error fallback
 * Prevents layout shift during image load with smooth fade-in
 */
interface ArticleImageProps {
  src: string
  alt?: string
}

function ArticleImage({ src, alt = "" }: ArticleImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")

  const handleLoad = useCallback(() => {
    setStatus("loaded")
  }, [])

  const handleError = useCallback(() => {
    setStatus("error")
  }, [])

  if (status === "error") {
    return <ImagePlaceholder />
  }

  return (
    <div className="relative aspect-[1.9/1] w-full overflow-hidden bg-[var(--color-fill-quaternary)]">
      {status === "loading" && (
        <div className="absolute inset-0 skeleton-shimmer" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full object-cover",
          "transition-all duration-[var(--duration-normal)] ease-[var(--ease-ios)]",
          status === "loaded"
            ? "opacity-100 scale-100"
            : "opacity-0 scale-[1.02]"
        )}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

interface ArticleCardProps {
  article: ArticleFromApi
  onSelect: (article: ArticleFromApi) => void
}

function formatRelativeTime(timestamp: Timestamp | string | null): string {
  if (!timestamp) return ""
  // Handle both Firestore Timestamp and ISO string
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp.toDate()
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
      className={cn(
        "content-visibility-auto group cursor-pointer overflow-hidden",
        "rounded-[var(--radius-xl)] bg-[var(--color-surface)]",
        // Refined shadow - subtle card elevation
        "shadow-[0_0_0_0.5px_var(--color-separator),0_2px_8px_rgba(0,0,0,0.04)]",
        // Smooth transition
        "-webkit-tap-highlight-color-transparent",
        "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
        // Press feedback
        "active:scale-[0.98] active:shadow-[0_0_0_0.5px_var(--color-separator)]",
        // Focus state
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
      )}
    >
      {/* Image with loading state or placeholder */}
      <div className="relative overflow-hidden">
        {hasImage && article.imageUrl ? (
          <ArticleImage src={article.imageUrl} />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* Content - refined padding and spacing */}
      <div className="px-[16px] py-[14px] min-w-0">
        {/* Meta row: Source · Time · AI indicator */}
        <div className="mb-[8px] flex items-center gap-[6px]">
          <span className="text-[12px] font-semibold tracking-[-0.08px] text-[var(--color-text-secondary)]">
            {article.sourceName}
          </span>
          <span className="text-[11px] text-[var(--color-text-quaternary)]">·</span>
          <span className="text-[12px] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
            {formatRelativeTime(article.publishedAt)}
          </span>
          {/* AI indicator badge - appears when AI summary exists */}
          {hasAI && (
            <div className="ml-auto flex items-center gap-[3px] rounded-full bg-[var(--color-accent-soft)] px-[6px] py-[2px]">
              <Sparkles
                className="h-[10px] w-[10px] text-[var(--color-accent)]"
                strokeWidth={2.5}
              />
              <span className="text-[10px] font-semibold text-[var(--color-accent)]">AI</span>
            </div>
          )}
        </div>

        {/* Headline - strong visual hierarchy */}
        <h3 className="headline-text line-clamp-2 text-[17px] font-semibold leading-[1.28] tracking-[-0.4px] text-[var(--color-text-primary)]">
          {article.title}
        </h3>

        {/* Snippet - use AI summary if available, otherwise snippet */}
        <p className="mt-[8px] line-clamp-2 text-[14px] leading-[1.43] tracking-[-0.15px] text-[var(--color-text-secondary)]">
          {article.ai?.tldr ?? article.snippet}
        </p>
      </div>
    </article>
  )
}

/**
 * Skeleton loader for ArticleCard
 * Matches the exact dimensions and spacing of the real card
 */
export function ArticleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[0_0_0_0.5px_var(--color-separator),0_2px_8px_rgba(0,0,0,0.04)]">
      {/* Image skeleton */}
      <div className="aspect-[1.9/1] w-full skeleton-shimmer" />

      {/* Content skeleton */}
      <div className="px-[16px] py-[14px]">
        {/* Meta row */}
        <div className="mb-[8px] flex items-center gap-[6px]">
          <div className="h-[12px] w-[64px] rounded-[4px] skeleton-shimmer" />
          <div className="h-[12px] w-[28px] rounded-[4px] skeleton-shimmer" />
        </div>

        {/* Headline */}
        <div className="space-y-[6px]">
          <div className="h-[17px] w-full rounded-[4px] skeleton-shimmer" />
          <div className="h-[17px] w-[80%] rounded-[4px] skeleton-shimmer" />
        </div>

        {/* Snippet */}
        <div className="mt-[8px] space-y-[5px]">
          <div className="h-[14px] w-full rounded-[4px] skeleton-shimmer" />
          <div className="h-[14px] w-[65%] rounded-[4px] skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

