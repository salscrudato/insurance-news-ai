/**
 * Category section blocks for the daily brief
 *
 * Executive-grade design with:
 * - Subtle, neutral icon styling (muted tones)
 * - 2-4 bullets per category for high-density readability
 * - Clean section separators
 * - Improved line length for readability
 */

import { useState } from "react"
import {
  Building2,
  Scale,
  ClipboardList,
  FileText,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  ChevronDown,
  type LucideIcon,
} from "lucide-react"
import { Card, Separator } from "@/components/ui"
import type { BriefSection } from "@/types/firestore"

/**
 * Strip citation brackets from bullet text
 */
function stripCitations(text: string): string {
  return text.replace(/\s*\[[a-f0-9]{10,}\]/gi, "").trim()
}

// Section display configuration
const SECTION_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  propertyCat: { label: "Property & Cat", icon: Building2 },
  casualtyLiability: { label: "Casualty & Liability", icon: Scale },
  regulation: { label: "Regulation", icon: ClipboardList },
  claims: { label: "Claims", icon: FileText },
  reinsurance: { label: "Reinsurance", icon: RefreshCw },
  insurtech: { label: "InsurTech", icon: Lightbulb },
  market: { label: "Market & M&A", icon: TrendingUp },
}

const MAX_VISIBLE_BULLETS = 3

interface SectionBlockProps {
  sectionKey: string
  section: BriefSection
  isLast: boolean
}

function SectionBlock({ sectionKey, section, isLast }: SectionBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const config = SECTION_CONFIG[sectionKey]

  if (!config || section.bullets.length === 0) return null

  const Icon = config.icon
  const hasMore = section.bullets.length > MAX_VISIBLE_BULLETS
  const visibleBullets = expanded ? section.bullets : section.bullets.slice(0, MAX_VISIBLE_BULLETS)
  const hiddenCount = section.bullets.length - MAX_VISIBLE_BULLETS

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-[8px] px-[16px] py-[10px]">
        <div className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] bg-[var(--color-fill-tertiary)]">
          <Icon
            className="h-[13px] w-[13px] text-[var(--color-text-tertiary)]"
            strokeWidth={1.75}
          />
        </div>
        <h3 className="flex-1 text-[15px] font-semibold tracking-[-0.2px] text-[var(--color-text-primary)]">
          {config.label}
        </h3>
        <span className="text-[12px] font-normal tabular-nums text-[var(--color-text-quaternary)]">
          {section.bullets.length}
        </span>
      </div>

      {/* Bullets */}
      <ul className="space-y-[8px] px-[16px] pb-[12px]">
        {visibleBullets.map((bullet, index) => (
          <li
            key={index}
            className="flex gap-[8px] text-[14px] leading-[1.47] tracking-[-0.15px] text-[var(--color-text-secondary)]"
            style={{ maxWidth: "520px" }}
          >
            <span className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-[var(--color-text-quaternary)]" />
            <span>{stripCitations(bullet)}</span>
          </li>
        ))}
      </ul>

      {/* Expand / collapse */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? `Show fewer ${config.label} items` : `Show ${hiddenCount} more ${config.label} items`}
          className="flex w-full min-h-[44px] items-center justify-center gap-[4px] pb-[10px] text-[13px] font-medium text-[var(--color-text-tertiary)] transition-colors duration-[var(--duration-fast)] active:text-[var(--color-text-secondary)]"
        >
          <span>{expanded ? "Show less" : `${hiddenCount} more`}</span>
          <ChevronDown
            className={`h-[12px] w-[12px] transition-transform duration-[var(--duration-fast)] ease-[var(--ease-ios)] ${expanded ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>
      )}

      {/* Separator */}
      {!isLast && <Separator className="mx-[16px]" />}
    </div>
  )
}

interface BriefSectionsProps {
  sections: {
    propertyCat: BriefSection
    casualtyLiability: BriefSection
    regulation: BriefSection
    claims: BriefSection
    reinsurance: BriefSection
    insurtech: BriefSection
    market: BriefSection
  }
}

export function BriefSections({ sections }: BriefSectionsProps) {
  const sectionEntries = Object.entries(sections).filter(
    ([, section]) => section.bullets.length > 0
  )

  if (sectionEntries.length === 0) return null

  return (
    <Card>
      {sectionEntries.map(([key, section], index) => (
        <SectionBlock
          key={key}
          sectionKey={key}
          section={section}
          isLast={index === sectionEntries.length - 1}
        />
      ))}
    </Card>
  )
}
