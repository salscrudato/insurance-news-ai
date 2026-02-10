/**
 * Hook for fetching today's brief from Cloud Functions
 *
 * Features:
 * - localStorage caching with 30min TTL for instant display
 * - Falls back to cache while fresh data loads
 */

import { useQuery } from "@tanstack/react-query"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { getCached, setCache } from "@/lib/cache"
import type { Brief } from "@/types/firestore"

// Article data embedded in top story (may be null if article was deleted)
export interface TopStoryArticle {
  id: string
  title: string
  url: string
  sourceName: string
  sourceId?: string
  publishedAt: string
  snippet: string
  imageUrl: string | null
}

// Response type from getTodayBrief callable
// Note: article can be null if the referenced article was deleted from Firestore
export interface TopStoryWithArticle {
  articleId: string
  headline: string
  whyItMatters: string
  article: TopStoryArticle | null
}

export interface TodayBriefResponse {
  found: boolean
  date: string
  brief: Brief | null
  topStoriesWithArticles: TopStoryWithArticle[]
}

// Cache key for today's brief
const BRIEF_CACHE_KEY = "today_brief"
const BRIEF_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

// Cloud Functions endpoint URL
const FUNCTIONS_BASE_URL = "https://us-central1-insurance-news-ai.cloudfunctions.net"

// Callable function reference (for web)
const getTodayBriefCallable = httpsCallable<{ date?: string }, TodayBriefResponse>(
  functions,
  "getTodayBrief"
)

/**
 * Fetch today's brief using direct HTTP (works in Capacitor WebView)
 */
async function fetchTodayBriefHttp(date?: string): Promise<TodayBriefResponse> {
  const response = await fetch(`${FUNCTIONS_BASE_URL}/getTodayBrief`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { date } }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const json = await response.json()
  // Firebase callable functions wrap response in { result: ... }
  return json.result || json
}

/**
 * Fetch today's brief (or a specific date's brief)
 * Uses direct HTTP fetch with timeout, falls back to callable
 * Updates localStorage cache on success
 */
async function fetchTodayBrief(date?: string): Promise<TodayBriefResponse> {
  console.log("[useTodayBrief] fetchTodayBrief starting...", { date })

  // Create timeout promise (10 seconds)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Request timed out")), 10000)
  })

  try {
    // Try direct HTTP fetch first (works better in Capacitor)
    console.log("[useTodayBrief] Trying HTTP fetch...")
    const data = await Promise.race([
      fetchTodayBriefHttp(date),
      timeoutPromise
    ])
    console.log("[useTodayBrief] fetchTodayBrief succeeded", data?.found)

    // Cache the response (only for "today" queries)
    if (!date && data.found) {
      setCache(BRIEF_CACHE_KEY, data, BRIEF_CACHE_TTL)
    }

    return data
  } catch (httpError) {
    console.warn("[useTodayBrief] HTTP fetch failed, trying callable...", httpError)

    try {
      // Fallback to callable (for web/emulator)
      const result = await Promise.race([
        getTodayBriefCallable({ date }),
        timeoutPromise
      ])
      console.log("[useTodayBrief] Callable succeeded", result.data?.found)
      const data = result.data

      if (!date && data.found) {
        setCache(BRIEF_CACHE_KEY, data, BRIEF_CACHE_TTL)
      }

      return data
    } catch (callableError) {
      console.error("[useTodayBrief] Both methods failed", callableError)
      throw callableError
    }
  }
}

/**
 * Hook to fetch today's brief with TanStack Query
 *
 * Uses localStorage cache for instant initial display, then fetches fresh data.
 *
 * @param date - Optional date in yyyy-mm-dd format (defaults to today ET)
 */
export function useTodayBrief(date?: string) {
  // Get cached data for initial display (only for "today")
  const cachedData = !date ? getCached<TodayBriefResponse>(BRIEF_CACHE_KEY) : null

  return useQuery({
    queryKey: ["brief", date ?? "today"],
    queryFn: () => fetchTodayBrief(date),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    // Use cached data as placeholder while fetching
    placeholderData: cachedData ?? undefined,
  })
}

