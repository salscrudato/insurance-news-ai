/**
 * Today Screen - Executive-Grade AI Daily Brief
 *
 * Apple-inspired design with premium information density:
 * - Clear header with AI badge and timestamp
 * - Executive summary with key themes chips
 * - Top stories carousel with proper image fallbacks
 * - Category sections with subtle icons (2-4 bullets)
 * - Tappable topics that filter Feed
 * - Source attribution footer
 */

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Newspaper, Sparkles, ExternalLink } from "lucide-react"
import { useTodayBrief, type TopStoryWithArticle } from "@/lib/hooks/use-today-brief"
import {
  TodayScreenSkeleton,
  TopStoriesCarousel,
  BriefSections,
  ArticleSheet,
} from "@/components/brief"
import { EmptyState, ErrorState, SectionLabel, Card } from "@/components/ui"
import { hapticMedium, hapticLight } from "@/lib/haptics"

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T12:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function formatUpdateTime(createdAt: { toDate?: () => Date } | null): string {
  if (!createdAt || !createdAt.toDate) {
    return "Updated this morning"
  }
  try {
    const date = createdAt.toDate()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    const displayMinutes = minutes.toString().padStart(2, "0")
    return `Updated ${displayHours}:${displayMinutes} ${ampm} ET`
  } catch {
    return "Updated this morning"
  }
}

/**
 * Strip citation brackets from bullet text
 * The AI includes article IDs like [f7fd4c2019240531] which we don't want to display
 */
function stripCitations(text: string): string {
  // Remove patterns like [hexId] or [alphanumericId] at the end or within text
  return text.replace(/\s*\[[a-f0-9]{10,}\]/gi, "").trim()
}

export function TodayPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useTodayBrief()
  const [selectedStory, setSelectedStory] = useState<TopStoryWithArticle | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSelectStory = (story: TopStoryWithArticle) => {
    hapticMedium()
    setSelectedStory(story)
    setSheetOpen(true)
  }

  // Navigate to Feed with search query for the topic
  const handleTopicClick = (topic: string) => {
    hapticLight()
    navigate(`/feed?q=${encodeURIComponent(topic)}`)
  }

  // Navigate to Sources page
  const handleSourcesClick = () => {
    hapticLight()
    navigate("/sources")
  }

  // Loading state (only show skeleton if no cached data)
  if (isLoading && !data) {
    return <TodayScreenSkeleton />
  }

  // Error state
  if (error && !data) {
    return (
      <ErrorState
        title="Unable to load brief"
        description="We couldn't fetch today's briefing. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  // No brief found
  if (!data?.found || !data.brief) {
    return (
      <EmptyState
        icon={Newspaper}
        title="No brief available yet"
        description="Check back soon for today's industry briefing."
      />
    )
  }

  const { brief, topStoriesWithArticles } = data

  return (
    <>
      <div className="space-y-[20px]">
        {/* Date Header */}
        <header>
          <p className="text-[14px] font-medium tracking-[-0.15px] text-[var(--color-text-secondary)]">
            {formatDate(brief.date)}
          </p>
        </header>

        {/* Executive Summary Card */}
        <Card>
          {/* Card Header with AI Badge and Timestamp */}
          <div className="flex items-center justify-between border-b border-[var(--color-separator)] px-[14px] py-[10px]">
            <div className="flex items-center gap-[6px]">
              <div className="flex h-[20px] items-center gap-[4px] rounded-full bg-[var(--color-accent-soft)] px-[8px]">
                <Sparkles className="h-[10px] w-[10px] text-[var(--color-accent)]" strokeWidth={2.25} />
                <span className="text-[10px] font-semibold tracking-[0.1px] text-[var(--color-accent)]">
                  AI Daily Brief
                </span>
              </div>
            </div>
            <span className="text-[11px] font-medium tracking-[-0.1px] text-[var(--color-text-tertiary)]">
              {formatUpdateTime(brief.createdAt)}
            </span>
          </div>

          {/* Executive Summary Bullets - Improved readability */}
          <div className="px-[14px] py-[12px]">
            <ul className="space-y-[10px]">
              {brief.executiveSummary.map((bullet, index) => (
                <li
                  key={index}
                  className="flex gap-[10px] text-[15px] leading-[1.5] tracking-[-0.15px] text-[var(--color-text-primary)]"
                  style={{ maxWidth: "540px" }}
                >
                  <span className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-indigo)]" />
                  <span>{stripCitations(bullet)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Top Stories */}
        {topStoriesWithArticles.length > 0 && (
          <section className="space-y-[8px]">
            <SectionLabel>Top Stories</SectionLabel>
            <TopStoriesCarousel
              stories={topStoriesWithArticles}
              onSelectStory={handleSelectStory}
            />
          </section>
        )}

        {/* Category Sections */}
        <section className="space-y-[8px]">
          <SectionLabel>By Category</SectionLabel>
          <BriefSections sections={brief.sections} />
        </section>

        {/* Topics Covered - Compact, tappable chips */}
        {brief.topics.length > 0 && (
          <section className="space-y-[8px]">
            <SectionLabel>Topics Covered</SectionLabel>
            <div className="flex flex-wrap gap-[6px]">
              {brief.topics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleTopicClick(topic)}
                  className="rounded-full bg-[var(--color-fill-quaternary)] px-[10px] py-[5px] text-[12px] font-medium tracking-[-0.08px] text-[var(--color-text-secondary)] transition-all duration-150 active:scale-[0.97] active:bg-[var(--color-fill-tertiary)]"
                >
                  {topic}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Sources Footer - Readable and tappable */}
        <footer className="border-t border-[var(--color-separator)] pt-[14px] pb-[4px]">
          <button
            onClick={handleSourcesClick}
            className="group flex w-full items-center justify-between rounded-[var(--radius-md)] px-[2px] py-[4px] text-left transition-colors active:bg-[var(--color-fill-quaternary)]"
          >
            <div>
              <p className="text-[13px] font-medium tracking-[-0.1px] text-[var(--color-text-secondary)]">
                Compiled from {brief.sourcesUsed.length} sources
              </p>
              <p className="mt-[2px] line-clamp-1 text-[12px] tracking-[-0.04px] text-[var(--color-text-tertiary)]">
                {brief.sourcesUsed.map((s) => s.name).join(" · ")}
              </p>
            </div>
            <ExternalLink
              className="h-[14px] w-[14px] shrink-0 text-[var(--color-text-quaternary)] transition-colors group-active:text-[var(--color-text-tertiary)]"
              strokeWidth={1.75}
            />
          </button>
        </footer>
      </div>

      {/* Article Sheet */}
      <ArticleSheet
        story={selectedStory}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}

