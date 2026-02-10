/**
 * Premium Article Sheet for Today's Brief
 *
 * Apple-inspired design showing top story details:
 * - Clean header: source + headline
 * - Hero image
 * - AI Analysis card with "Why It Matters"
 * - Primary action: Read Article (Capacitor Browser on iOS)
 */

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import {
  SHEET_TOKENS,
  SheetHeaderBlock,
  SheetActions,
  SheetIconButton,
  SheetAICard,
} from "@/components/ui/sheet-primitives"
import { Bookmark } from "lucide-react"
import { toast } from "sonner"
import { Timestamp } from "firebase/firestore"
import { useIsBookmarked, useToggleBookmark } from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import type { TopStoryWithArticle } from "@/lib/hooks/use-today-brief"
import type { Article } from "@/types/firestore"
import { hapticMedium, hapticLight } from "@/lib/haptics"
import { openUrl } from "@/lib/browser"

interface ArticleSheetProps {
  story: TopStoryWithArticle | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArticleSheet({ story, open, onOpenChange }: ArticleSheetProps) {
  const { isAuthenticated, isAnonymous } = useAuth()
  const { data: isBookmarked } = useIsBookmarked(story?.article?.id)
  const toggleBookmark = useToggleBookmark()

  // Null safety: don't render if story or article is missing
  if (!story || !story.article) return null

  // Destructure for cleaner access (article is guaranteed non-null here)
  const { article } = story

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

    // Create a minimal Article object for bookmarking
    // The bookmark only stores essential fields anyway
    const minimalArticle: Article = {
      id: article.id,
      sourceId: article.sourceId ?? "",
      sourceName: article.sourceName,
      title: article.title,
      snippet: article.snippet,
      url: article.url,
      canonicalUrl: article.url,
      guid: null,
      imageUrl: article.imageUrl,
      categories: [],
      publishedAt: Timestamp.fromDate(new Date(article.publishedAt)),
      ingestedAt: Timestamp.now(),
      relevanceScore: 1,
      isRelevant: true,
      ai: null,
    }

    toggleBookmark.mutate(
      { article: minimalArticle, isCurrentlyBookmarked: !!isBookmarked },
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className={SHEET_TOKENS.containerClass}
      >
        {/* Drag indicator */}
        <div className={SHEET_TOKENS.dragIndicatorClass} />

        {/* Accessibility: Visually hidden title for screen readers */}
        <SheetTitle className="sr-only">{story.headline}</SheetTitle>
        <SheetDescription className="sr-only">
          Article details from {article.sourceName}
        </SheetDescription>

        {/* Header */}
        <SheetHeaderBlock
          source={article.sourceName}
          title={story.headline}
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
        <SheetAICard
          className={SHEET_TOKENS.sectionMargin}
          whyItMatters={story.whyItMatters}
        />

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

