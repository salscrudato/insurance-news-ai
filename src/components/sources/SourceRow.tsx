/**
 * Source row component with toggle switch - iOS Settings quality
 */

import { ExternalLink } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import type { Source } from "@/types/firestore"
import { hapticLight } from "@/lib/haptics"

interface SourceRowProps {
  source: Source
  isFollowing: boolean
  onToggle: (enabled: boolean) => void
  isLoading?: boolean
}

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  property_cat: "Property",
  casualty_liability: "Casualty",
  regulation: "Regulation",
  claims: "Claims",
  reinsurance: "Reinsurance",
  insurtech: "InsurTech",
}

// Category colors - muted, tasteful palette
const CATEGORY_COLORS: Record<string, string> = {
  property_cat: "rgba(0, 122, 255, 0.65)",
  casualty_liability: "rgba(175, 82, 222, 0.65)",
  regulation: "rgba(88, 86, 214, 0.65)",
  claims: "rgba(255, 149, 0, 0.65)",
  reinsurance: "rgba(48, 176, 199, 0.65)",
  insurtech: "rgba(52, 199, 89, 0.65)",
}

export function SourceRow({
  source,
  isFollowing,
  onToggle,
  isLoading,
}: SourceRowProps) {
  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticLight()
  }

  return (
    <div className="flex min-h-[56px] items-center gap-[var(--spacing-3)] px-[20px] py-[12px]">
      {/* Source info */}
      <div className="min-w-0 flex-1">
        {/* Name row with external link */}
        <div className="flex items-center gap-[6px]">
          <h3 className="text-[17px] font-normal tracking-[-0.4px] text-[var(--color-text-primary)]">
            {source.name}
          </h3>
          <a
            href={source.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalClick}
            className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-[var(--color-text-quaternary)] transition-colors active:bg-[var(--color-fill-tertiary)]"
            aria-label={`Visit ${source.name} website`}
          >
            <ExternalLink className="h-[12px] w-[12px]" strokeWidth={1.75} />
          </a>
        </div>

        {/* Category tags - cleaner inline layout */}
        {source.tags.length > 0 && (
          <div className="mt-[3px] flex items-center gap-[6px]">
            {source.tags.slice(0, 3).map((tag, index) => (
              <div key={tag} className="flex items-center gap-[5px]">
                <span
                  className="h-[6px] w-[6px] rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[tag] || "rgba(60, 60, 67, 0.3)" }}
                />
                <span className="text-[13px] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
                  {CATEGORY_LABELS[tag] || tag}
                </span>
                {index < Math.min(source.tags.length, 3) - 1 && (
                  <span className="text-[13px] text-[var(--color-text-quaternary)]">·</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toggle switch - vertically centered */}
      <Switch
        checked={isFollowing}
        onCheckedChange={onToggle}
        disabled={isLoading}
        aria-label={`${isFollowing ? "Unfollow" : "Follow"} ${source.name}`}
      />
    </div>
  )
}

export function SourceRowSkeleton() {
  return (
    <div className="flex min-h-[56px] items-center gap-[var(--spacing-3)] px-[20px] py-[12px]">
      <div className="min-w-0 flex-1">
        <div className="h-[17px] w-36 rounded-[4px] skeleton-shimmer" />
        <div className="mt-[3px] flex items-center gap-[6px]">
          <div className="h-[6px] w-[6px] rounded-full skeleton-shimmer" />
          <div className="h-[13px] w-24 rounded-[3px] skeleton-shimmer" />
        </div>
      </div>
      <div className="h-[31px] w-[51px] rounded-full skeleton-shimmer" />
    </div>
  )
}

