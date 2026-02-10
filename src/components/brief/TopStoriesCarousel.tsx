/**
 * Horizontal scrolling carousel of top stories
 * Executive-grade design with consistent sizing and elegant fallbacks
 */

import { useState, useRef } from "react"
import type { TopStoryWithArticle } from "@/lib/hooks/use-today-brief"

/** Accept Firestore Timestamp, ISO string, or ms number. */
function formatRelativeTime(timestamp: { toDate(): Date } | string | number | Date | null | undefined): string {
  if (!timestamp) return ""
  try {
    const date =
      typeof timestamp === "string" || typeof timestamp === "number"
        ? new Date(timestamp)
        : timestamp instanceof Date
          ? timestamp
          : timestamp.toDate()
    if (isNaN(date.getTime())) return ""
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

/**
 * Get initials from source name (e.g., "Insurance Journal" → "IJ")
 */
function getSourceInitials(sourceName: string): string {
  const words = sourceName.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return sourceName.slice(0, 2).toUpperCase()
}

// Muted, professional palette for placeholders (no flashy colours)
const PLACEHOLDER_BG = [
  "#E8EDF2", // slate
  "#E5ECF0", // cool gray
  "#EAE8EE", // mauve
  "#E6EDE9", // sage
  "#EDE9E5", // warm gray
]

/**
 * Elegant placeholder showing source initials on a muted background
 */
function ImagePlaceholder({ sourceName, index }: { sourceName: string; index: number }) {
  const bg = PLACEHOLDER_BG[index % PLACEHOLDER_BG.length]
  const initials = getSourceInitials(sourceName)

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ backgroundColor: bg }}
    >
      <span className="text-[20px] font-bold tracking-tight text-[var(--color-text-tertiary)]" style={{ opacity: 0.55 }}>
        {initials}
      </span>
    </div>
  )
}

// Layout constants
const CARD_WIDTH = 268
const IMAGE_HEIGHT = 140

interface TopStoryCardProps {
  story: TopStoryWithArticle
  index: number
  onSelect: (story: TopStoryWithArticle) => void
}

function TopStoryCard({ story, index, onSelect }: TopStoryCardProps) {
  const [imgError, setImgError] = useState(false)
  const prevImageUrlRef = useRef(story.article?.imageUrl)

  // Reset error state when imageUrl changes (without useEffect)
  if (story.article?.imageUrl !== prevImageUrlRef.current) {
    prevImageUrlRef.current = story.article?.imageUrl
    if (imgError) setImgError(false)
  }

  // Defensive: skip rendering if article is null (deleted from Firestore)
  if (!story.article) return null

  const showPlaceholder = !story.article.imageUrl || imgError

  return (
    <button
      onClick={() => onSelect(story)}
      className="group shrink-0 snap-start overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)] text-left shadow-[var(--shadow-card)] transition-all duration-[var(--duration-normal)] ease-[var(--ease-ios)] active:scale-[0.98] active:shadow-[var(--shadow-card-active)]"
      style={{ width: `${CARD_WIDTH}px` }}
      aria-label={`Read story: ${story.headline}`}
    >
      {/* Image / placeholder — fixed height for visual consistency */}
      <div className="w-full overflow-hidden" style={{ height: `${IMAGE_HEIGHT}px` }}>
        {showPlaceholder ? (
          <ImagePlaceholder sourceName={story.article.sourceName} index={index} />
        ) : (
          <img
            src={story.article.imageUrl!}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Content */}
      <div className="px-[14px] py-[12px]">
        {/* Source + timestamp */}
        <div className="mb-[5px] flex items-center gap-[6px]">
          <span className="text-[12px] font-medium tracking-[-0.08px] text-[var(--color-text-tertiary)]">
            {story.article.sourceName}
          </span>
          <span className="text-[12px] text-[var(--color-text-quaternary)]">
            {formatRelativeTime(story.article.publishedAt)}
          </span>
        </div>

        {/* Headline */}
        <h3 className="mb-[4px] line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-[-0.2px] text-[var(--color-text-primary)]">
          {story.headline}
        </h3>

        {/* Why it matters */}
        <p className="line-clamp-2 text-[13px] leading-[1.4] tracking-[-0.08px] text-[var(--color-text-secondary)]">
          {story.whyItMatters}
        </p>
      </div>
    </button>
  )
}

interface TopStoriesCarouselProps {
  stories: TopStoryWithArticle[]
  onSelectStory: (story: TopStoryWithArticle) => void
}

export function TopStoriesCarousel({ stories, onSelectStory }: TopStoriesCarouselProps) {
  const validStories = stories.filter((story) => story.article !== null)

  if (validStories.length === 0) return null

  return (
    <div
      className="-mx-[16px] overflow-x-auto scrollbar-none"
      role="region"
      aria-label="Top stories carousel"
    >
      <div className="flex snap-x snap-mandatory gap-[10px] px-[16px] pb-[4px]">
        {validStories.map((story, index) => (
          <TopStoryCard
            key={story.articleId}
            story={story}
            index={index}
            onSelect={onSelectStory}
          />
        ))}
        {/* End spacer */}
        <div className="w-[4px] shrink-0" />
      </div>
    </div>
  )
}
