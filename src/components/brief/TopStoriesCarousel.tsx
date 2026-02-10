/**
 * Horizontal scrolling carousel of top stories
 * Executive-grade design with consistent sizing and elegant fallbacks
 */

import { Newspaper } from "lucide-react"
import type { TopStoryWithArticle } from "@/lib/hooks/use-today-brief"

// Gradient colors for image placeholders (subtle, professional)
const PLACEHOLDER_GRADIENTS = [
  { from: "var(--color-accent-soft)", to: "var(--color-indigo-soft)" },
  { from: "var(--color-teal-soft)", to: "var(--color-cyan-soft)" },
  { from: "var(--color-purple-soft)", to: "var(--color-pink-soft)" },
  { from: "var(--color-success-soft)", to: "var(--color-teal-soft)" },
  { from: "var(--color-warning-soft)", to: "var(--color-orange-soft)" },
]

/**
 * Get initials from source name (e.g., "Insurance Journal" → "IJ")
 */
function getSourceInitials(sourceName: string): string {
  const words = sourceName.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return sourceName.slice(0, 2).toUpperCase()
}

/**
 * Elegant placeholder showing source mark with gradient background
 */
function ImagePlaceholder({ sourceName, index }: { sourceName: string; index: number }) {
  const gradient = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length]
  const initials = getSourceInitials(sourceName)

  return (
    <div
      className="aspect-[2/1] w-full flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
      }}
    >
      <div className="flex flex-col items-center gap-[4px]">
        <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-white/30 backdrop-blur-sm">
          <span className="text-[16px] font-bold tracking-tight text-[var(--color-text-primary)]" style={{ opacity: 0.7 }}>
            {initials}
          </span>
        </div>
        <Newspaper
          className="h-[14px] w-[14px] text-[var(--color-text-tertiary)]"
          strokeWidth={1.5}
          style={{ opacity: 0.5 }}
        />
      </div>
    </div>
  )
}

/** Accept Firestore Timestamp, ISO string, or ms number (e.g. from today brief API). */
function formatRelativeTime(timestamp: { toDate(): Date } | string | number | Date): string {
  const date =
    typeof timestamp === "string" || typeof timestamp === "number"
      ? new Date(timestamp)
      : timestamp instanceof Date
        ? timestamp
        : timestamp.toDate()
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

interface TopStoryCardProps {
  story: TopStoryWithArticle
  index: number
  onSelect: (story: TopStoryWithArticle) => void
}

// Fixed card height for consistent sizing (image + content)
const CARD_WIDTH = 280
const IMAGE_HEIGHT = 140 // Fixed height instead of aspect ratio for consistency

function TopStoryCard({ story, index, onSelect }: TopStoryCardProps) {
  // Defensive: skip rendering if article is null (deleted from Firestore)
  if (!story.article) {
    return null
  }

  return (
    <button
      onClick={() => onSelect(story)}
      className="group shrink-0 snap-start overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)] text-left shadow-[var(--shadow-card)] transition-all duration-[var(--duration-normal)] active:scale-[0.98]"
      style={{ width: `${CARD_WIDTH}px` }}
      aria-label={`Read story: ${story.headline}`}
    >
      {/* Image or elegant placeholder - fixed height for consistency */}
      <div className="w-full overflow-hidden" style={{ height: `${IMAGE_HEIGHT}px` }}>
        {story.article.imageUrl ? (
          <img
            src={story.article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.02]"
            loading="lazy"
            onError={(e) => {
              // Hide broken images - parent will show placeholder color
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <ImagePlaceholder sourceName={story.article.sourceName} index={index} />
        )}
      </div>

      {/* Content - fixed padding for consistent layout */}
      <div className="p-[14px]">
        {/* Source and timestamp */}
        <div className="mb-[6px] flex items-center gap-[6px]">
          <span className="inline-block rounded-full bg-[var(--color-fill-quaternary)] px-[8px] py-[2px] text-[11px] font-medium text-[var(--color-text-secondary)]">
            {story.article.sourceName}
          </span>
          <span className="text-[11px] text-[var(--color-text-tertiary)]">
            {formatRelativeTime(story.article.publishedAt)}
          </span>
        </div>

        {/* Headline - fixed line clamp */}
        <h3 className="mb-[6px] line-clamp-2 text-[16px] font-semibold leading-[1.3] tracking-[-0.2px] text-[var(--color-text-primary)]">
          {story.headline}
        </h3>

        {/* Why it matters - subtle, informative */}
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
  // Filter out stories where article was deleted (null)
  const validStories = stories.filter((story) => story.article !== null)

  if (validStories.length === 0) {
    return null
  }

  return (
    <div
      className="-mx-[16px] overflow-x-auto scrollbar-none"
      role="region"
      aria-label="Top stories carousel"
    >
      <div className="flex snap-x snap-mandatory gap-[12px] px-[16px] pb-[4px]">
        {validStories.map((story, index) => (
          <TopStoryCard
            key={story.articleId}
            story={story}
            index={index}
            onSelect={onSelectStory}
          />
        ))}
        {/* End spacer for scroll padding */}
        <div className="w-[16px] shrink-0" />
      </div>
    </div>
  )
}

