/**
 * Article detail sheet for the feed
 *
 * Shows headline, source, publish time, snippet, and actions:
 * - Read on source (external link)
 * - Generate TL;DR (calls getOrCreateArticleAI)
 * - Bookmark toggle
 */

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SHEET_TOKENS,
  SheetHeaderBlock,
  SheetSection,
  SheetSnippet,
  SheetActions,
  SheetIconButton,
} from "@/components/ui/sheet-primitives"
import { Bookmark, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useIsBookmarked, useToggleBookmark, useArticleAI } from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import type { Article, ArticleAI } from "@/types/firestore"
import type { Timestamp } from "firebase/firestore"
import { hapticLight } from "@/lib/haptics"

interface ArticleDetailSheetProps {
  article: Article | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Date unavailable"
  }
  try {
    return timestamp.toDate().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return "Date unavailable"
  }
}

export function ArticleDetailSheet({
  article,
  open,
  onOpenChange,
}: ArticleDetailSheetProps) {
  const { isAuthenticated } = useAuth()
  const { data: isBookmarked } = useIsBookmarked(article?.id)
  const toggleBookmark = useToggleBookmark()
  const generateAI = useArticleAI()

  // Local state for AI content (combines cached article.ai with generated)
  const [aiContent, setAiContent] = useState<ArticleAI | null>(null)

  // Reset AI content when article changes
  useEffect(() => {
    if (article?.ai) {
      setAiContent(article.ai)
    } else {
      setAiContent(null)
    }
  }, [article?.id, article?.ai])

  if (!article) return null

  const handleOpenArticle = () => {
    hapticLight()
    window.open(article.url, "_blank", "noopener,noreferrer")
  }

  const handleBookmark = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to bookmark articles")
      return
    }
    hapticLight()

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

  const handleGenerateAI = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to generate summaries")
      return
    }
    hapticLight()

    generateAI.mutate(article.id, {
      onSuccess: (data) => {
        // Convert generatedAt string to Timestamp-like object for display
        setAiContent({
          ...data.ai,
          generatedAt: { toDate: () => new Date(data.ai.generatedAt) } as unknown as Timestamp,
        } as ArticleAI)

        if (!data.cached) {
          toast.success("Summary generated", {
            description: `${data.remaining} summaries remaining today`,
          })
        }
      },
      onError: (error) => {
        console.error("Failed to generate AI:", error)
        toast.error("Failed to generate summary", {
          description: "Please try again later",
        })
      },
    })
  }

  const hasAI = !!aiContent
  const isGenerating = generateAI.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className={SHEET_TOKENS.containerClass}
      >
        {/* Drag indicator */}
        <div className={SHEET_TOKENS.dragIndicatorClass} />

        {/* Header */}
        {/* Accessibility: Visually hidden title for screen readers */}
        <SheetTitle className="sr-only">{article.title}</SheetTitle>
        <SheetDescription className="sr-only">
          Article details from {article.sourceName}
        </SheetDescription>

        <SheetHeaderBlock
          source={article.sourceName}
          timestamp={formatDate(article.publishedAt)}
          title={article.title}
        />

        {/* Image */}
        {article.imageUrl && (
          <div className={SHEET_TOKENS.imageClass}>
            <img
              src={article.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* AI Summary section */}
        {isGenerating ? (
          <div className="mb-[24px] overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-fill-quaternary)]">
            <div className="border-b border-[var(--color-separator)] px-[18px] py-[16px]">
              <Skeleton className="mb-[12px] h-4 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-[8px] h-4 w-3/4" />
            </div>
            <div className="px-[18px] py-[16px]">
              <Skeleton className="mb-[12px] h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-[8px] h-4 w-5/6" />
            </div>
          </div>
        ) : hasAI ? (
          <div className="mb-[24px] overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-fill-quaternary)]">
            <div className="border-b border-[var(--color-separator)] px-[18px] py-[16px]">
              <SheetSection label="TL;DR">{aiContent.tldr}</SheetSection>
            </div>

            <div className="px-[18px] py-[16px]">
              <SheetSection label="Why It Matters">
                {aiContent.whyItMatters}
              </SheetSection>
            </div>

            {/* Topics */}
            {aiContent.topics && aiContent.topics.length > 0 && (
              <div className="flex flex-wrap gap-[6px] border-t border-[var(--color-separator)] px-[18px] py-[13px]">
                {aiContent.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-[var(--color-surface)] px-[12px] py-[6px] text-[12px] font-medium tracking-[-0.05px] text-[var(--color-text-secondary)]"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {/* AI Disclaimer */}
            <div className="border-t border-[var(--color-separator)] px-[18px] py-[10px]">
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                Summary generated by AI. Read original source for full article.
              </p>
            </div>
          </div>
        ) : (
          /* Generate TL;DR button when no AI available */
          <div className={SHEET_TOKENS.sectionMargin}>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-[10px]"
              onClick={handleGenerateAI}
              disabled={isGenerating}
            >
              <Sparkles className="h-[18px] w-[18px]" />
              <span>Generate AI Summary</span>
            </Button>
          </div>
        )}

        {/* Snippet */}
        {article.snippet && <SheetSnippet>{article.snippet}</SheetSnippet>}

        {/* Actions */}
        <SheetActions
          onReadArticle={handleOpenArticle}
          secondaryButton={
            <SheetIconButton
              onClick={handleBookmark}
              disabled={toggleBookmark.isPending}
              loading={toggleBookmark.isPending}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
            >
              <Bookmark
                className="h-[20px] w-[20px]"
                fill={isBookmarked ? "currentColor" : "none"}
              />
            </SheetIconButton>
          }
        />
      </SheetContent>
    </Sheet>
  )
}

