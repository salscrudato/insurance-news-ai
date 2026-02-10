/**
 * Hook for fetching articles with infinite scroll, filters, and search
 */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  getDocs,
  Timestamp,
  QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Article, SourceCategory } from "@/types/firestore"

const ARTICLES_PER_PAGE = 20

export interface ArticleFilters {
  category?: SourceCategory | "all"
  sourceIds?: string[]
  timeWindow?: "24h" | "7d" | "all"
  searchQuery?: string
}

// Convert Firestore doc to Article
function docToArticle(doc: QueryDocumentSnapshot<DocumentData>): Article {
  const data = doc.data()
  return {
    id: doc.id,
    sourceId: data.sourceId,
    sourceName: data.sourceName,
    title: data.title,
    snippet: data.snippet,
    url: data.url,
    canonicalUrl: data.canonicalUrl,
    guid: data.guid,
    imageUrl: data.imageUrl,
    categories: data.categories,
    publishedAt: data.publishedAt,
    ingestedAt: data.ingestedAt,
    relevanceScore: data.relevanceScore,
    isRelevant: data.isRelevant,
    ai: data.ai,
  } as Article
}

// Get time threshold for filtering
function getTimeThreshold(timeWindow: "24h" | "7d" | "all"): Date | null {
  if (timeWindow === "all") return null
  const now = new Date()
  if (timeWindow === "24h") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
}

interface FetchArticlesParams {
  filters: ArticleFilters
  pageParam?: QueryDocumentSnapshot<DocumentData> | null
}

async function fetchArticles({ filters, pageParam }: FetchArticlesParams) {
  const articlesRef = collection(db, "articles")
  const constraints: Parameters<typeof query>[1][] = []

  // Time window filter
  const timeThreshold = getTimeThreshold(filters.timeWindow ?? "all")
  if (timeThreshold) {
    constraints.push(where("publishedAt", ">=", Timestamp.fromDate(timeThreshold)))
  }

  // Category filter (only if not "all")
  if (filters.category && filters.category !== "all") {
    constraints.push(where("categories", "array-contains", filters.category))
  }

  // Source filter
  if (filters.sourceIds && filters.sourceIds.length > 0 && filters.sourceIds.length <= 10) {
    constraints.push(where("sourceId", "in", filters.sourceIds))
  }

  // Order by publishedAt desc
  constraints.push(orderBy("publishedAt", "desc"))

  // Pagination
  if (pageParam) {
    constraints.push(startAfter(pageParam))
  }

  // Limit
  constraints.push(limit(ARTICLES_PER_PAGE))

  const q = query(articlesRef, ...constraints)
  const snapshot = await getDocs(q)

  const articles = snapshot.docs.map(docToArticle)
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null

  return {
    articles,
    lastDoc,
    hasMore: snapshot.docs.length === ARTICLES_PER_PAGE,
  }
}

/**
 * Hook for infinite scroll articles list
 */
export function useArticles(filters: ArticleFilters = {}) {
  return useInfiniteQuery({
    queryKey: ["articles", filters],
    queryFn: ({ pageParam }) => fetchArticles({ filters, pageParam }),
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
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

/**
 * Hook for fetching all enabled sources with full data (for Sources page)
 */
export function useAllSources() {
  return useQuery({
    queryKey: ["sources", "full"],
    queryFn: async () => {
      const sourcesRef = collection(db, "sources")
      const q = query(sourcesRef, where("enabled", "==", true), orderBy("name"), limit(MAX_SOURCES))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          siteUrl: data.siteUrl,
          rssUrl: data.rssUrl,
          enabled: data.enabled,
          tier: data.tier,
          tags: data.tags || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          fetchState: data.fetchState,
        } as import("@/types/firestore").Source
      })
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

