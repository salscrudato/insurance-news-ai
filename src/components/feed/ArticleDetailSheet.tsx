/**
 * Premium Article Detail Sheet
 *
 * Apple-inspired design with:
 * - Clean header: source, timestamp, title
 * - Hero image (when available)
 * - AI Analysis card: TL;DR, Why it matters for P&C, Key implications
 * - Auto-generates AI analysis when sheet opens (low-cost, cached)
 * - Actions: Read Article (Capacitor Browser on iOS), Bookmark
 */

import { useState, useEffect, useRef, useMemo } from "react"
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
import { Bookmark, Sparkles, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useIsBookmarked, useToggleBookmark, useArticleAI } from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import type { Article, ArticleAI } from "@/types/firestore"
import type { ArticleFromApi } from "@/lib/hooks"
import type { Timestamp } from "firebase/firestore"
import { hapticMedium, hapticLight } from "@/lib/haptics"
import { openUrl } from "@/lib/browser"
import { cn } from "@/lib/utils"

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

  // Generated AI content (from API call), keyed by article ID
  const [generatedAI, setGeneratedAI] = useState<{ id: string; ai: ArticleAI } | null>(null)
  // Error state tracked via ref to avoid setState-in-effect lint warnings
  const [aiError, setAiError] = useState(false)

  // Track which article we've already auto-triggered for (prevent re-firing)
  const autoTriggeredRef = useRef<string | null>(null)

  // Derive AI content: prefer article's cached AI, fall back to freshly generated
  const aiContent = useMemo<ArticleAI | null>(() => {
    if (article?.ai) return article.ai
    if (generatedAI && article && generatedAI.id === article.id) return generatedAI.ai
    return null
  }, [article?.id, article?.ai, generatedAI]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-trigger AI generation when sheet opens for an article without AI
  // This is the key innovation: AI analysis appears automatically as the user reads
  // Uses gpt-4o-mini (very low cost) and results are cached permanently in Firestore
  useEffect(() => {
    if (
      open &&
      article &&
      !article.ai &&
      isAuthenticated &&
      !isAnonymous &&
      !generateAI.isPending &&
      autoTriggeredRef.current !== article.id
    ) {
      // Mark as triggered to prevent re-firing
      autoTriggeredRef.current = article.id

      generateAI.mutate(article.id, {
        onSuccess: (data) => {
          setGeneratedAI({
            id: article.id,
            ai: {
              ...data.ai,
              generatedAt: { toDate: () => new Date(data.ai.generatedAt) } as unknown as Timestamp,
            } as ArticleAI,
          })
          setAiError(false)
        },
        onError: () => {
          // Silently fail for auto-trigger — user can manually retry
          setAiError(true)
        },
      })
    }

    // Reset state when sheet closes
    if (!open) {
      autoTriggeredRef.current = null
    }
  }, [open, article?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleRetryAI = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to unlock AI insights")
      return
    }
    hapticLight()
    setAiError(false)

    generateAI.mutate(article.id, {
      onSuccess: (data) => {
        setGeneratedAI({
          id: article.id,
          ai: {
            ...data.ai,
            generatedAt: { toDate: () => new Date(data.ai.generatedAt) } as unknown as Timestamp,
          } as ArticleAI,
        })
        setAiError(false)

        if (!data.cached) {
          toast.success("AI analysis generated")
        }
      },
      onError: (error) => {
        console.error("Failed to generate AI:", error)
        setAiError(true)
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

        {/* AI Analysis Section */}
        {isGenerating ? (
          <SheetAICardSkeleton className={SHEET_TOKENS.sectionMargin} />
        ) : hasAI ? (
          <SheetAICard
            className={SHEET_TOKENS.sectionMargin}
            tldr={aiContent.tldr}
            whyItMatters={aiContent.whyItMatters}
            topics={aiContent.topics}
          />
        ) : aiError ? (
          /* Error state — compact retry prompt */
          <div className={SHEET_TOKENS.sectionMargin}>
            <button
              onClick={handleRetryAI}
              className={cn(
                "flex w-full items-center justify-center gap-[8px]",
                "rounded-[var(--radius-xl)] bg-[var(--color-fill-quaternary)]",
                "px-[16px] py-[14px]",
                "text-[14px] font-medium text-[var(--color-text-tertiary)]",
                "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
                "active:scale-[0.98] active:bg-[var(--color-fill-tertiary)]",
              )}
            >
              <AlertCircle className="h-[15px] w-[15px] opacity-60" strokeWidth={1.8} />
              <span>Couldn't generate analysis · Tap to retry</span>
            </button>
          </div>
        ) : !isAuthenticated || isAnonymous ? (
          /* Unauthenticated — show sign-in prompt */
          <div className={SHEET_TOKENS.sectionMargin}>
            <div className={cn(
              "flex w-full items-center justify-center gap-[8px]",
              "rounded-[var(--radius-xl)] bg-[var(--color-fill-quaternary)]",
              "px-[16px] py-[14px]",
            )}>
              <Sparkles className="h-[14px] w-[14px] text-[var(--color-text-quaternary)]" strokeWidth={2} />
              <span className="text-[14px] font-medium text-[var(--color-text-tertiary)]">
                Sign in for AI analysis
              </span>
            </div>
          </div>
        ) : null}

        {/* Original Snippet — shown when no AI available */}
        {article.snippet && !hasAI && !isGenerating && (
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
