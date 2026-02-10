/**
 * Category section blocks for the daily brief
 *
 * Premium design with:
 * - Muted, consistent icon background chips
 * - Improved bullet readability and spacing
 * - Clean section separators
 */

import {
  Building2,
  Scale,
  ClipboardList,
  FileText,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { Card, Separator } from "@/components/ui"
import type { BriefSection } from "@/types/firestore"

// Section display configuration with muted, sophisticated colors
// Using consistent opacity/saturation for a cohesive look
const SECTION_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string; bgOpacity: string }> = {
  propertyCat: { label: "Property & Cat", icon: Building2, color: "#007AFF", bgOpacity: "10%" },
  casualtyLiability: { label: "Casualty & Liability", icon: Scale, color: "#8E8E93", bgOpacity: "12%" },
  regulation: { label: "Regulation", icon: ClipboardList, color: "#5856D6", bgOpacity: "10%" },
  claims: { label: "Claims", icon: FileText, color: "#FF9500", bgOpacity: "10%" },
  reinsurance: { label: "Reinsurance", icon: RefreshCw, color: "#32ADE6", bgOpacity: "12%" },
  insurtech: { label: "InsurTech", icon: Lightbulb, color: "#34C759", bgOpacity: "10%" },
  market: { label: "Market & M&A", icon: TrendingUp, color: "#AF52DE", bgOpacity: "10%" },
}

interface SectionBlockProps {
  sectionKey: string
  section: BriefSection
  isLast: boolean
}

function SectionBlock({ sectionKey, section, isLast }: SectionBlockProps) {
  const config = SECTION_CONFIG[sectionKey]

  if (!config || section.bullets.length === 0) {
    return null
  }

  const Icon = config.icon

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center gap-[8px] px-[14px] py-[10px]">
        <div
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px]"
          style={{ backgroundColor: `color-mix(in srgb, ${config.color} ${config.bgOpacity}, transparent)` }}
        >
          <Icon
            className="h-[14px] w-[14px]"
            strokeWidth={1.75}
            style={{ color: config.color, opacity: 0.85 }}
          />
        </div>
        <h3 className="text-[14px] font-semibold tracking-[-0.2px] text-[var(--color-text-primary)]">
          {config.label}
        </h3>
      </div>

      {/* Bullets */}
      <ul className="space-y-[6px] px-[14px] pb-[12px]">
        {section.bullets.map((bullet, index) => (
          <li
            key={index}
            className="flex gap-[8px] text-[14px] leading-[1.42] tracking-[-0.1px] text-[var(--color-text-secondary)]"
          >
            <span
              className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full"
              style={{ backgroundColor: config.color, opacity: 0.5 }}
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      {/* Section separator */}
      {!isLast && <Separator className="mx-[14px]" />}
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
  // Filter to only show sections with content
  const sectionEntries = Object.entries(sections).filter(
    ([, section]) => section.bullets.length > 0
  )

  if (sectionEntries.length === 0) {
    return null
  }

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

