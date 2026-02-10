/**
 * Filter components for the Feed page
 * Refined iOS-native design with compact, elegant controls
 */

import { useState } from "react"
import { ChevronDown, Check, Newspaper, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { SourceCategory } from "@/types/firestore"
import { cn } from "@/lib/utils"
import { hapticLight, hapticWarning } from "@/lib/haptics"

// Maximum sources allowed due to Firestore 'in' query limitation
export const MAX_SOURCE_FILTER = 10

// Category configuration
const CATEGORIES: { value: SourceCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "property_cat", label: "Property" },
  { value: "casualty_liability", label: "Casualty" },
  { value: "regulation", label: "Regulation" },
  { value: "claims", label: "Claims" },
  { value: "reinsurance", label: "Reinsurance" },
  { value: "insurtech", label: "InsurTech" },
]

// Time window options for segmented control
const TIME_WINDOW_OPTIONS: SegmentOption<"24h" | "7d" | "all">[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "all", label: "All" },
]

interface CategoryChipsProps {
  value: SourceCategory | "all"
  onChange: (value: SourceCategory | "all") => void
}

export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  const handleChange = (newValue: SourceCategory | "all") => {
    hapticLight()
    onChange(newValue)
  }

  return (
    <div
      className="-mx-[var(--spacing-4)] overflow-x-auto px-[var(--spacing-4)] scrollbar-none scroll-smooth"
      role="tablist"
      aria-label="Filter by category"
    >
      <div className="flex gap-[6px]">
        {CATEGORIES.map((cat) => {
          const isActive = value === cat.value
          return (
            <Chip
              key={cat.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleChange(cat.value)}
              variant={isActive ? "filterActive" : "filter"}
              size="default"
              className={cn(
                "shrink-0",
                isActive && "bg-[var(--color-text-primary)]"
              )}
            >
              {cat.label}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}

interface TimeWindowToggleProps {
  value: "24h" | "7d" | "all"
  onChange: (value: "24h" | "7d" | "all") => void
}

/**
 * iOS-style segmented control for time window selection
 */
export function TimeWindowToggle({ value, onChange }: TimeWindowToggleProps) {
  return (
    <SegmentedControl
      options={TIME_WINDOW_OPTIONS}
      value={value}
      onChange={onChange}
      compact
    />
  )
}

interface SourceFilterProps {
  sources: { id: string; name: string }[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function SourceFilter({ sources, selectedIds, onChange }: SourceFilterProps) {
  const [open, setOpen] = useState(false)

  const atLimit = selectedIds.length >= MAX_SOURCE_FILTER
  const remaining = MAX_SOURCE_FILTER - selectedIds.length

  const toggleSource = (id: string) => {
    const isSelected = selectedIds.includes(id)

    if (isSelected) {
      hapticLight()
      onChange(selectedIds.filter((s) => s !== id))
    } else if (!atLimit) {
      hapticLight()
      onChange([...selectedIds, id])
    } else {
      // At limit - provide warning haptic
      hapticWarning()
    }
  }

  const clearAll = () => {
    hapticLight()
    onChange([])
  }

  const label = selectedIds.length === 0
    ? "All sources"
    : selectedIds.length === 1
      ? sources.find((s) => s.id === selectedIds[0])?.name ?? "1 source"
      : `${selectedIds.length} sources`

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "flex min-h-[44px] min-w-[44px] items-center gap-[4px] rounded-[var(--radius-md)] px-[10px] py-[8px] text-[13px] font-medium tracking-[-0.08px] transition-colors active:bg-[var(--color-fill-quaternary)]",
            selectedIds.length > 0
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)]"
          )}
          onClick={() => hapticLight()}
          aria-label={`Filter sources: ${label}`}
        >
          <Newspaper className="h-[13px] w-[13px] shrink-0 opacity-60" strokeWidth={2} />
          <span className="whitespace-nowrap">{label}</span>
          <ChevronDown className="h-[10px] w-[10px] shrink-0 opacity-40" strokeWidth={2.5} />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[55vh] rounded-t-[var(--radius-3xl)] bg-[var(--color-bg-grouped)] p-0"
      >
        <div className="drag-indicator" />

        <SheetHeader className="flex-row items-center justify-between px-[18px] pb-[12px] pt-[14px]">
          <div>
            <SheetTitle className="text-[17px] font-semibold tracking-[-0.32px]">Sources</SheetTitle>
            {/* Limit indicator */}
            {selectedIds.length > 0 && (
              <p className={cn(
                "mt-[2px] text-[12px] tracking-[-0.04px]",
                atLimit ? "text-[var(--color-warning)]" : "text-[var(--color-text-tertiary)]"
              )}>
                {atLimit ? (
                  <span className="flex items-center gap-[4px]">
                    <AlertCircle className="h-[11px] w-[11px]" />
                    Max {MAX_SOURCE_FILTER} selected
                  </span>
                ) : (
                  `${remaining} more available`
                )}
              </p>
            )}
          </div>
          {selectedIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-[var(--color-accent)] font-medium text-[14px]">
              Clear
            </Button>
          )}
        </SheetHeader>

        <div className="mx-[16px] mb-[calc(var(--safe-area-inset-bottom)+16px)] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)]">
          <div className="max-h-[calc(55vh-140px)] overflow-y-auto">
            {sources.map((source, index) => {
              const isSelected = selectedIds.includes(source.id)
              const isDisabled = atLimit && !isSelected
              return (
                <div key={source.id}>
                  <button
                    onClick={() => toggleSource(source.id)}
                    disabled={isDisabled}
                    className={cn(
                      "flex w-full min-h-[48px] items-center justify-between px-[16px] py-[12px] text-left transition-colors duration-[var(--duration-instant)]",
                      isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "active:bg-[var(--color-fill-quaternary)]"
                    )}
                  >
                    <span className="text-[15px] font-medium tracking-[-0.18px] text-[var(--color-text-primary)]">
                      {source.name}
                    </span>
                    {isSelected && (
                      <Check className="h-[18px] w-[18px] text-[var(--color-accent)]" strokeWidth={2.5} />
                    )}
                  </button>
                  {index < sources.length - 1 && (
                    <div className="ml-[16px] h-[0.5px] bg-[var(--color-separator)]" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

