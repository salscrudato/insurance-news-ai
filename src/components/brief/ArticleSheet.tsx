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
  SheetAICard,
} from "@/components/ui/sheet-primitives"
import type { TopStoryWithArticle } from "@/lib/hooks/use-today-brief"
import { openUrl } from "@/lib/browser"

interface ArticleSheetProps {
  story: TopStoryWithArticle | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArticleSheet({ story, open, onOpenChange }: ArticleSheetProps) {
  // Null safety: don't render if story or article is missing
  if (!story || !story.article) return null

  // Destructure for cleaner access (article is guaranteed non-null here)
  const { article } = story

  const handleOpenArticle = async () => {
    await openUrl(article.url)
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
        />
      </SheetContent>
    </Sheet>
  )
}
