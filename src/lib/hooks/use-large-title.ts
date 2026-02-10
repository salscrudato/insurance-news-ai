/**
 * useLargeTitle - Hook for iOS-style large title collapse behavior
 *
 * Uses IntersectionObserver to track when the large title element
 * scrolls out of view, enabling the collapsed title in TopNav.
 */

import { useRef, useState, useEffect, type RefObject } from "react"

// Nav bar height (44px) - must match TopNav component
const NAV_HEIGHT = 44

interface UseLargeTitleResult {
  /** Ref to attach to the large title container element */
  titleRef: RefObject<HTMLDivElement | null>
  /** Whether the large title is currently visible */
  isVisible: boolean
}

/**
 * Track large title visibility for iOS-style collapse behavior
 *
 * @param threshold - Visibility threshold (0-1). Default 0.1 means title is considered
 *                    "not visible" when less than 10% is showing
 * @returns titleRef to attach to large title element, and isVisible state
 */
export function useLargeTitle(threshold = 0.1): UseLargeTitleResult {
  const titleRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const element = titleRef.current
    if (!element) return

    // Get safe area inset for accurate rootMargin calculation
    const safeAreaTop = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '0',
      10
    ) || 0

    const topOffset = NAV_HEIGHT + safeAreaTop

    const observer = new IntersectionObserver(
      (entries) => {
        // The title is considered visible if it's intersecting above threshold
        const entry = entries[0]
        if (entry) {
          setIsVisible(entry.isIntersecting)
        }
      },
      {
        // Use the viewport as root
        root: null,
        // Account for sticky header height + safe area
        // We observe when the title hits the bottom of the header
        rootMargin: `-${topOffset}px 0px 0px 0px`,
        threshold,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  return {
    titleRef,
    isVisible,
  }
}

/**
 * Scrollable container variant of useLargeTitle
 * Use when the scrollable element is not the viewport
 */
export function useLargeTitleWithScroll(
  scrollContainerRef: RefObject<HTMLElement | null>,
  threshold = 0.1
): UseLargeTitleResult {
  const titleRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const element = titleRef.current
    const scrollContainer = scrollContainerRef.current
    if (!element || !scrollContainer) return

    // Get safe area inset for accurate rootMargin calculation
    const safeAreaTop = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '0',
      10
    ) || 0

    const topOffset = NAV_HEIGHT + safeAreaTop

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) {
          setIsVisible(entry.isIntersecting)
        }
      },
      {
        root: scrollContainer,
        rootMargin: `-${topOffset}px 0px 0px 0px`,
        threshold,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [scrollContainerRef, threshold])

  return {
    titleRef,
    isVisible,
  }
}

