/**
 * Filter components for the Feed page
 * Refined iOS-native design with compact, elegant controls
 */

import { useState } from "react"
import { ChevronDown, Check, Clock, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { SourceCategory } from "@/types/firestore"
import { cn } from "@/lib/utils"
import { hapticLight } from "@/lib/haptics"

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

// Time window options
const TIME_WINDOWS: { value: "24h" | "7d" | "all"; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "all", label: "All time" },
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
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            role="tab"
            aria-selected={value === cat.value}
            onClick={() => handleChange(cat.value)}
            className={cn(
              // min-h-[32px] with py gives touch area; horizontal spacing adequate
              "shrink-0 rounded-full min-h-[32px] px-[14px] py-[6px] text-[13px] font-medium tracking-[-0.08px] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
              value === cat.value
                ? "bg-[var(--color-text-primary)] text-white"
                : "text-[var(--color-text-secondary)] active:bg-[var(--color-fill-tertiary)]"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface TimeWindowToggleProps {
  value: "24h" | "7d" | "all"
  onChange: (value: "24h" | "7d" | "all") => void
}

export function TimeWindowToggle({ value, onChange }: TimeWindowToggleProps) {
  const [open, setOpen] = useState(false)

  const handleChange = (newValue: "24h" | "7d" | "all") => {
    hapticLight()
    onChange(newValue)
    setOpen(false)
  }

  const currentLabel = TIME_WINDOWS.find((tw) => tw.value === value)?.label ?? "7 days"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="flex min-h-[44px] min-w-[44px] items-center gap-[4px] rounded-[var(--radius-md)] px-[10px] py-[8px] text-[13px] font-medium tracking-[-0.08px] text-[var(--color-text-secondary)] transition-colors active:bg-[var(--color-fill-quaternary)]"
          onClick={() => hapticLight()}
          aria-label={`Time range: ${currentLabel}`}
        >
          <Clock className="h-[13px] w-[13px] shrink-0 opacity-60" strokeWidth={2} />
          <span className="whitespace-nowrap">{currentLabel}</span>
          <ChevronDown className="h-[10px] w-[10px] shrink-0 opacity-40" strokeWidth={2.5} />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[45vh] rounded-t-[var(--radius-3xl)] bg-[var(--color-bg-grouped)] p-0"
      >
        <div className="drag-indicator" />
        <SheetHeader className="px-[18px] pb-[12px] pt-[14px]">
          <SheetTitle className="text-[17px] font-semibold tracking-[-0.32px]">Time Range</SheetTitle>
        </SheetHeader>
        <div className="mx-[16px] mb-[calc(var(--safe-area-inset-bottom)+16px)] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)]">
          {TIME_WINDOWS.map((tw, index) => (
            <div key={tw.value}>
              <button
                onClick={() => handleChange(tw.value)}
                className="flex w-full min-h-[48px] items-center justify-between px-[16px] py-[12px] text-left transition-colors duration-[var(--duration-instant)] active:bg-[var(--color-fill-quaternary)]"
              >
                <span className="text-[15px] font-medium tracking-[-0.18px] text-[var(--color-text-primary)]">
                  {tw.label}
                </span>
                {value === tw.value && (
                  <Check className="h-[18px] w-[18px] text-[var(--color-accent)]" strokeWidth={2.5} />
                )}
              </button>
              {index < TIME_WINDOWS.length - 1 && (
                <div className="ml-[16px] h-[0.5px] bg-[var(--color-separator)]" />
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface SourceFilterProps {
  sources: { id: string; name: string }[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function SourceFilter({ sources, selectedIds, onChange }: SourceFilterProps) {
  const [open, setOpen] = useState(false)

  const toggleSource = (id: string) => {
    hapticLight()
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id))
    } else {
      onChange([...selectedIds, id])
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
          <SheetTitle className="text-[17px] font-semibold tracking-[-0.32px]">Sources</SheetTitle>
          {selectedIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-[var(--color-accent)] font-medium text-[14px]">
              Clear
            </Button>
          )}
        </SheetHeader>

        <div className="mx-[16px] mb-[calc(var(--safe-area-inset-bottom)+16px)] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)]">
          <div className="max-h-[calc(55vh-120px)] overflow-y-auto">
            {sources.map((source, index) => {
              const isSelected = selectedIds.includes(source.id)
              return (
                <div key={source.id}>
                  <button
                    onClick={() => toggleSource(source.id)}
                    className="flex w-full min-h-[48px] items-center justify-between px-[16px] py-[12px] text-left transition-colors duration-[var(--duration-instant)] active:bg-[var(--color-fill-quaternary)]"
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

