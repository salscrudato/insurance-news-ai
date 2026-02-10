/**
 * Today Screen - Executive-Grade AI Daily Brief
 *
 * Apple-inspired design with premium information density:
 * - Clear header with AI badge and timestamp
 * - Executive summary with structured, scannable bullets
 * - Top stories carousel with proper image fallbacks
 * - Category sections with subtle icons (2-4 bullets)
 * - Tappable topics that filter Feed
 * - Source attribution footer
 */

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Newspaper, Sparkles } from "lucide-react"
import { useTodayBrief, type TopStoryWithArticle } from "@/lib/hooks/use-today-brief"
import {
  TodayScreenSkeleton,
  TopStoriesCarousel,
  BriefSections,
  ArticleSheet,
} from "@/components/brief"
import { EmptyState, ErrorState, SectionLabel, Card } from "@/components/ui"

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
    return `${displayHours}:${displayMinutes} ${ampm} ET`
  } catch {
    return "Updated this morning"
  }
}

/**
 * Strip citation brackets from bullet text.
 * The AI includes article IDs like [f7fd4c2019240531] which we don't want to display.
 */
function stripCitations(text: string): string {
  return text.replace(/\s*\[[a-f0-9]{10,}\]/gi, "").trim()
}

/**
 * Split an executive summary bullet into headline + detail.
 * Expects format: "Headline — Detail sentence."
 * Falls back to the full text if no em-dash is found.
 */
function parseBullet(raw: string): { headline: string; detail: string } {
  const cleaned = stripCitations(raw)
  // Try em-dash first, then en-dash
  const sep = cleaned.includes(" \u2014 ") ? " \u2014 " : cleaned.includes(" \u2013 ") ? " \u2013 " : null
  if (sep) {
    const idx = cleaned.indexOf(sep)
    return {
      headline: cleaned.slice(0, idx).trim(),
      detail: cleaned.slice(idx + sep.length).trim(),
    }
  }
  return { headline: "", detail: cleaned }
}

export function TodayPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useTodayBrief()
  const [selectedStory, setSelectedStory] = useState<TopStoryWithArticle | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSelectStory = (story: TopStoryWithArticle) => {
    setSelectedStory(story)
    setSheetOpen(true)
  }

  const handleTopicClick = (topic: string) => {
    navigate(`/feed?q=${encodeURIComponent(topic)}`)
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
        description="We couldn\u2019t fetch today\u2019s briefing. Please try again."
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
        description="Check back soon for today\u2019s industry briefing."
      />
    )
  }

  const { brief, topStoriesWithArticles } = data

  return (
    <>
      <div className="space-y-[24px]">
        {/* Date subheader */}
        <header className="-mt-[4px]">
          <p className="text-[15px] font-normal tracking-[-0.2px] text-[var(--color-text-secondary)]">
            {formatDate(brief.date)}
          </p>
        </header>

        {/* ============================================================ */}
        {/* Executive Summary Card — the hero module                      */}
        {/* ============================================================ */}
        <Card>
          {/* Card header: AI badge + timestamp */}
          <div className="flex items-center justify-between px-[16px] py-[10px]">
            <div className="flex items-center gap-[5px]">
              <Sparkles className="h-[12px] w-[12px] text-[var(--color-accent)]" strokeWidth={2.25} />
              <span className="text-[12px] font-semibold tracking-[-0.08px] text-[var(--color-accent)]">
                AI Daily Brief
              </span>
            </div>
            <span className="text-[12px] font-normal tracking-[-0.08px] text-[var(--color-text-quaternary)]">
              {formatUpdateTime(brief.createdAt)}
            </span>
          </div>

          {/* Hairline separator */}
          <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />

          {/* Executive summary bullets */}
          <div className="px-[16px] py-[14px]">
            <ul className="space-y-[14px]">
              {brief.executiveSummary.map((bullet, index) => {
                const { headline, detail } = parseBullet(bullet)
                return (
                  <li key={index} className="flex gap-[10px]" style={{ maxWidth: "540px" }}>
                    <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--color-accent)]" />
                    <span className="text-[15px] leading-[1.47] tracking-[-0.2px] text-[var(--color-text-primary)]">
                      {headline ? (
                        <>
                          <span className="font-semibold">{headline}</span>
                          {" \u2014 "}
                          <span className="font-normal text-[var(--color-text-secondary)]">{detail}</span>
                        </>
                      ) : (
                        detail
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </Card>

        {/* ============================================================ */}
        {/* Top Stories Carousel                                          */}
        {/* ============================================================ */}
        {topStoriesWithArticles.length > 0 && (
          <section className="space-y-[10px]">
            <SectionLabel>Top Stories</SectionLabel>
            <TopStoriesCarousel
              stories={topStoriesWithArticles}
              onSelectStory={handleSelectStory}
            />
          </section>
        )}

        {/* ============================================================ */}
        {/* Category Sections                                             */}
        {/* ============================================================ */}
        <section className="space-y-[10px]">
          <SectionLabel>By Category</SectionLabel>
          <BriefSections sections={brief.sections} />
        </section>

        {/* ============================================================ */}
        {/* Topics Covered                                                */}
        {/* ============================================================ */}
        {brief.topics.length > 0 && (
          <section className="space-y-[10px]">
            <SectionLabel>Topics Covered</SectionLabel>
            <div className="flex flex-wrap gap-[6px]">
              {brief.topics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleTopicClick(topic)}
                  className="rounded-full bg-[var(--color-fill-quaternary)] px-[11px] py-[5px] text-[13px] font-medium tracking-[-0.08px] text-[var(--color-text-secondary)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.97] active:bg-[var(--color-fill-tertiary)]"
                >
                  {topic}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* Sources Footer                                                */}
        {/* ============================================================ */}
        <footer className="pt-[4px] pb-[4px]">
          <div className="h-[0.5px] bg-[var(--color-separator)] mb-[14px]" />
          <div className="py-[4px]">
            <p className="text-[13px] font-medium tracking-[-0.08px] text-[var(--color-text-secondary)]">
              Compiled from {brief.sourcesUsed.length} sources
            </p>
            <p className="mt-[2px] truncate text-[12px] tracking-[-0.04px] text-[var(--color-text-tertiary)]">
              {brief.sourcesUsed.map((s) => s.name).join(" \u00b7 ")}
            </p>
          </div>
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
