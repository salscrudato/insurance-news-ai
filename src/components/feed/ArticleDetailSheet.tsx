/**
 * Premium Article Detail Sheet
 *
 * Apple-inspired design with:
 * - Clean header: source, timestamp, title
 * - Hero image (when available)
 * - AI Analysis card: TL;DR, Why it matters for P&C, Key implications
 * - Actions: Read Article (Capacitor Browser on iOS), Bookmark
 */

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import {
  SHEET_TOKENS,
  SheetHeaderBlock,
  SheetSnippet,
  SheetActions,
  SheetIconButton,
  SheetAICard,
  SheetAICardSkeleton,
} from "@/components/ui/sheet-primitives"
import { Bookmark, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useIsBookmarked, useToggleBookmark, useArticleAI } from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import type { Article, ArticleAI } from "@/types/firestore"
import type { ArticleFromApi } from "@/lib/hooks"
import type { Timestamp } from "firebase/firestore"
import { hapticMedium, hapticLight } from "@/lib/haptics"
import { openUrl } from "@/lib/browser"

// Accept either Firestore Article (from direct queries) or API Article (from Cloud Functions)
type ArticleType = Article | ArticleFromApi

interface ArticleDetailSheetProps {
  article: ArticleType | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(timestamp: Timestamp | string | null | undefined): string {
  if (!timestamp) {
    return "Date unavailable"
  }
  try {
    // Handle both Firestore Timestamp and ISO string
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp.toDate()
    return date.toLocaleDateString("en-US", {
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
  const { isAuthenticated, isAnonymous } = useAuth()
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

  const handleOpenArticle = async () => {
    hapticMedium()
    await openUrl(article.url)
  }

  const handleBookmark = () => {
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
      toast.error("Sign in to unlock AI insights")
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
          toast.success("AI analysis generated", {
            description: `${data.remaining} remaining today`,
          })
        }
      },
      onError: (error) => {
        console.error("Failed to generate AI:", error)
        toast.error("Failed to generate analysis", {
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

        {/* Hero Image */}
        {article.imageUrl && (
          <div className={SHEET_TOKENS.imageClass}>
            <img
              src={article.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* AI Analysis Card */}
        {isGenerating ? (
          <SheetAICardSkeleton className={SHEET_TOKENS.sectionMargin} />
        ) : hasAI ? (
          <SheetAICard
            className={SHEET_TOKENS.sectionMargin}
            tldr={aiContent.tldr}
            whyItMatters={aiContent.whyItMatters}
            topics={aiContent.topics}
          />
        ) : (
          /* Generate AI Analysis button when no AI available */
          <div className={SHEET_TOKENS.sectionMargin}>
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="group flex w-full items-center justify-center gap-[10px] rounded-[var(--radius-2xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-fill-quaternary)] px-[20px] py-[18px] text-[15px] font-medium text-[var(--color-text-secondary)] transition-all duration-200 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="h-[18px] w-[18px] transition-colors group-hover:text-[var(--color-accent)]" />
              <span>Generate AI Analysis</span>
            </button>
          </div>
        )}

        {/* Original Snippet */}
        {article.snippet && !hasAI && (
          <SheetSnippet>{article.snippet}</SheetSnippet>
        )}

        {/* Primary Action */}
        <SheetActions
          onReadArticle={handleOpenArticle}
          primaryLabel="Read Full Article"
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

