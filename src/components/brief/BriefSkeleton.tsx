/**
 * Skeleton loading states for the Today screen
 *
 * Matches the premium Daily Brief design
 */

import { Skeleton } from "@/components/ui/skeleton"

export function ExecutiveSummarySkeleton() {
  return (
    <div className="space-y-[12px]">
      <div className="flex gap-[12px]">
        <Skeleton className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full" />
        <Skeleton className="h-[20px] flex-1" />
      </div>
      <div className="flex gap-[12px]">
        <Skeleton className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full" />
        <Skeleton className="h-[20px] w-11/12" />
      </div>
      <div className="flex gap-[12px]">
        <Skeleton className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full" />
        <Skeleton className="h-[20px] w-10/12" />
      </div>
    </div>
  )
}

export function TopStoryCardSkeleton() {
  return (
    <div className="w-[280px] shrink-0 snap-start overflow-hidden rounded-[14px] bg-[var(--color-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.02)]">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="p-[14px]">
        <Skeleton className="mb-[5px] h-[11px] w-[64px]" />
        <Skeleton className="mb-[6px] h-[17px] w-full" />
        <Skeleton className="h-[14px] w-4/5" />
      </div>
    </div>
  )
}

export function TopStoriesCarouselSkeleton() {
  return (
    <div className="-mx-[var(--spacing-4)] flex gap-[10px] overflow-hidden px-[var(--spacing-4)]">
      <TopStoryCardSkeleton />
      <TopStoryCardSkeleton />
    </div>
  )
}

export function SectionSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-[10px] px-[16px] py-[12px]">
        <Skeleton className="h-[30px] w-[30px] rounded-[8px]" />
        <Skeleton className="h-[17px] w-28" />
      </div>
      <div className="space-y-[8px] px-[16px] pb-[16px]">
        <div className="flex gap-[10px]">
          <Skeleton className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full" />
          <Skeleton className="h-[16px] flex-1" />
        </div>
        <div className="flex gap-[10px]">
          <Skeleton className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full" />
          <Skeleton className="h-[16px] w-11/12" />
        </div>
      </div>
    </div>
  )
}

export function TodayScreenSkeleton() {
  return (
    <div className="space-y-[28px]">
      {/* Date */}
      <header className="-mt-[4px]">
        <Skeleton className="h-[15px] w-44" />
      </header>

      {/* Executive Summary Card */}
      <section className="overflow-hidden rounded-[16px] bg-[var(--color-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.02)]">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-[var(--color-separator)] px-[18px] py-[12px]">
          <Skeleton className="h-[22px] w-[100px] rounded-full" />
          <Skeleton className="h-[11px] w-[90px]" />
        </div>
        {/* Bullets */}
        <div className="px-[18px] py-[18px]">
          <ExecutiveSummarySkeleton />
        </div>
      </section>

      {/* Top Stories */}
      <section className="space-y-[10px]">
        <Skeleton className="h-[12px] w-20" />
        <TopStoriesCarouselSkeleton />
      </section>

      {/* Sections */}
      <section className="space-y-[10px]">
        <Skeleton className="h-[12px] w-24" />
        <div className="overflow-hidden rounded-[16px] bg-[var(--color-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.02)]">
          <SectionSkeleton />
          <div className="mx-[16px] h-[0.5px] bg-[var(--color-separator)]" />
          <SectionSkeleton />
        </div>
      </section>
    </div>
  )
}

