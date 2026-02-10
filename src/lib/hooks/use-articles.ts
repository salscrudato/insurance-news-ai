/**
 * Hook for fetching articles with infinite scroll, filters, and search
 * Uses HTTP fetch to Cloud Function (Firestore SDK hangs in Capacitor WebView)
 */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Article, SourceCategory } from "@/types/firestore"

const ARTICLES_PER_PAGE = 20

// Cloud Functions endpoint URL
const FUNCTIONS_BASE_URL = "https://us-central1-insurance-news-ai.cloudfunctions.net"

export interface ArticleFilters {
  category?: SourceCategory | "all"
  sourceIds?: string[]
  timeWindow?: "24h" | "7d" | "all"
  searchQuery?: string
}

interface FetchArticlesParams {
  filters: ArticleFilters
  pageParam?: string | null // ISO date string for pagination
}

// Article as returned from the Cloud Function (dates are ISO strings, not Timestamps)
// This is compatible with the Article type for display purposes
export interface ArticleFromApi {
  id: string
  sourceId: string
  sourceName: string
  title: string
  snippet: string
  url: string
  canonicalUrl: string
  guid: string | null
  imageUrl: string | null
  categories: string[]
  publishedAt: string | null // ISO string (vs Timestamp in Article)
  ingestedAt: string | null // ISO string (vs Timestamp in Article)
  relevanceScore: number
  isRelevant: boolean
  ai: Article["ai"] | null
}

interface GetArticlesResponse {
  articles: ArticleFromApi[]
  hasMore: boolean
}

interface FetchArticlesResult {
  articles: ArticleFromApi[]
  lastPublishedAt: string | null
  hasMore: boolean
}

/**
 * Fetch articles using HTTP (works in Capacitor WebView where Firestore SDK hangs)
 */
async function fetchArticlesHttp(params: {
  category?: string
  timeWindow?: "24h" | "7d" | "all"
  sourceIds?: string[]
  limit?: number
  startAfterPublishedAt?: string
}): Promise<GetArticlesResponse> {
  const response = await fetch(`${FUNCTIONS_BASE_URL}/getArticles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: params }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const json = await response.json()
  // Firebase callable functions wrap response in { result: ... }
  const result = json.result || json

  return result
}

async function fetchArticles({ filters, pageParam }: FetchArticlesParams): Promise<FetchArticlesResult> {
  const result = await fetchArticlesHttp({
    category: filters.category,
    timeWindow: filters.timeWindow,
    sourceIds: filters.sourceIds,
    limit: ARTICLES_PER_PAGE,
    startAfterPublishedAt: pageParam || undefined,
  })

  // Get the last article's publishedAt for pagination
  const lastPublishedAt = result.articles.length > 0
    ? result.articles[result.articles.length - 1].publishedAt
    : null

  return {
    articles: result.articles,
    lastPublishedAt,
    hasMore: result.hasMore,
  }
}

/**
 * Hook for infinite scroll articles list
 */
export function useArticles(filters: ArticleFilters = {}) {
  return useInfiniteQuery<FetchArticlesResult, Error, { pages: FetchArticlesResult[]; pageParams: (string | null)[] }, (string | ArticleFilters)[], string | null>({
    queryKey: ["articles", filters],
    queryFn: ({ pageParam }) => fetchArticles({ filters, pageParam }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastPublishedAt : undefined),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

// Maximum sources to fetch (prevents runaway reads if sources grow)
const MAX_SOURCES = 50

/**
 * Hook for fetching available sources for filter (lightweight)
 */
export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const sourcesRef = collection(db, "sources")
      const q = query(sourcesRef, where("enabled", "==", true), orderBy("name"), limit(MAX_SOURCES))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name as string,
      }))
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}



