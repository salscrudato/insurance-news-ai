/**
 * Today Screen - Premium Daily Brief View
 *
 * Apple-inspired design with refined hierarchy:
 * - Date header with AI badge
 * - Executive summary with accent bullets
 * - Top stories carousel with gradient overlays
 * - Category sections with muted icon chips
 * - Topics and sources footer
 */

import { useState } from "react"
import { Newspaper, Sparkles } from "lucide-react"
import { useTodayBrief, type TopStoryWithArticle } from "@/lib/hooks/use-today-brief"
import {
  TodayScreenSkeleton,
  TopStoriesCarousel,
  BriefSections,
  ArticleSheet,
} from "@/components/brief"
import { EmptyState, ErrorState, SectionLabel, Card } from "@/components/ui"
import { hapticMedium } from "@/lib/haptics"

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

export function TodayPage() {
  const { data, isLoading, error, refetch } = useTodayBrief()
  const [selectedStory, setSelectedStory] = useState<TopStoryWithArticle | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSelectStory = (story: TopStoryWithArticle) => {
    hapticMedium()
    setSelectedStory(story)
    setSheetOpen(true)
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
          {/* Card Header with AI Badge */}
          <div className="flex items-center justify-between border-b border-[var(--color-separator)] px-[14px] py-[10px]">
            <div className="flex items-center gap-[6px]">
              <div className="flex h-[20px] items-center gap-[4px] rounded-full bg-[#007AFF]/8 px-[8px]">
                <Sparkles className="h-[10px] w-[10px] text-[#007AFF]" strokeWidth={2.25} />
                <span className="text-[10px] font-semibold tracking-[0.1px] text-[#007AFF]/90">
                  AI Daily Brief
                </span>
              </div>
            </div>
            <span className="text-[12px] font-medium tracking-[-0.1px] text-[var(--color-text-secondary)]">
              {formatUpdateTime(brief.createdAt)}
            </span>
          </div>

          {/* Executive Summary Bullets */}
          <div className="px-[14px] py-[12px]">
            <ul className="space-y-[8px]">
              {brief.executiveSummary.map((bullet, index) => (
                <li
                  key={index}
                  className="flex gap-[10px] text-[15px] leading-[1.45] tracking-[-0.2px] text-[var(--color-text-primary)]"
                >
                  <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Top Stories */}
        {topStoriesWithArticles.length > 0 && (
          <section className="space-y-[6px]">
            <SectionLabel>Top Stories</SectionLabel>
            <TopStoriesCarousel
              stories={topStoriesWithArticles}
              onSelectStory={handleSelectStory}
            />
          </section>
        )}

        {/* Category Sections */}
        <section className="space-y-[6px]">
          <SectionLabel>By Category</SectionLabel>
          <BriefSections sections={brief.sections} />
        </section>

        {/* Topics */}
        {brief.topics.length > 0 && (
          <section className="space-y-[6px]">
            <SectionLabel>Topics Covered</SectionLabel>
            <div className="flex flex-wrap gap-[5px]">
              {brief.topics.map((topic, index) => (
                <span
                  key={index}
                  className="rounded-full bg-[var(--color-fill-tertiary)] px-[10px] py-[5px] text-[12px] font-medium tracking-[-0.08px] text-[var(--color-text-secondary)] transition-colors duration-[var(--duration-fast)] active:bg-[var(--color-fill-secondary)]"
                >
                  {topic}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Sources Footer */}
        <footer className="border-t border-[var(--color-separator)] pt-[12px]">
          <p className="text-[12px] leading-[1.55] tracking-[-0.06px] text-[var(--color-text-secondary)]">
            Compiled from {brief.sourcesUsed.length} sources:{" "}
            <span className="text-[var(--color-text-tertiary)]">
              {brief.sourcesUsed.map((s) => s.name).join(" · ")}
            </span>
          </p>
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

