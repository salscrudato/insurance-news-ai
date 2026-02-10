/**
 * Horizontal scrolling carousel of top stories
 * Styled to match Feed ArticleCard for visual consistency
 */

import type { TopStoryWithArticle } from "@/lib/hooks/use-today-brief"

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
  onSelect: (story: TopStoryWithArticle) => void
}

function TopStoryCard({ story, onSelect }: TopStoryCardProps) {
  // Defensive: skip rendering if article is null (deleted from Firestore)
  if (!story.article) {
    return null
  }

  return (
    <button
      onClick={() => onSelect(story)}
      className="group w-[300px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)] text-left shadow-[var(--shadow-card)] transition-all duration-[var(--duration-normal)] active:scale-[0.98]"
      aria-label={`Read story: ${story.headline}`}
    >
      {/* Image */}
      {story.article.imageUrl && (
        <div className="aspect-[2/1] w-full overflow-hidden bg-[var(--color-fill-quaternary)]">
          <img
            src={story.article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-[var(--spacing-4)]">
        {/* Source and timestamp */}
        <div className="mb-[var(--spacing-2)] flex items-center gap-[var(--spacing-2)]">
          <span className="inline-block rounded-full bg-[var(--color-fill-quaternary)] px-[var(--spacing-2)] py-[2px] text-[11px] font-medium text-[var(--color-text-secondary)]">
            {story.article.sourceName}
          </span>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">
            {formatRelativeTime(story.article.publishedAt)}
          </span>
        </div>

        {/* Headline */}
        <h3 className="mb-[var(--spacing-2)] line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-[var(--color-text-primary)]">
          {story.headline}
        </h3>

        {/* Why it matters */}
        <p className="line-clamp-2 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
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
      className="overflow-x-auto scrollbar-none"
      role="region"
      aria-label="Top stories carousel"
    >
      <div className="flex snap-x snap-mandatory gap-[var(--spacing-3)] px-[var(--spacing-4)] pb-[var(--spacing-2)]">
        {validStories.map((story) => (
          <TopStoryCard
            key={story.articleId}
            story={story}
            onSelect={onSelectStory}
          />
        ))}
        {/* End spacer for scroll padding */}
        <div className="w-[var(--spacing-4)] shrink-0" />
      </div>
    </div>
  )
}

