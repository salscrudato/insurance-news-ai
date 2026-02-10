/**
 * Hooks for bookmark management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  orderBy,
  query,
  limit,
  Timestamp,
} from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { db, functions } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Bookmark, Article, ArticleAI } from "@/types/firestore"

// Maximum bookmarks to fetch (most users won't have more than this)
const MAX_BOOKMARKS = 100

// ============================================================================
// Bookmarks Hooks
// ============================================================================

/**
 * Fetch bookmarks for the current user (limited to prevent excessive reads)
 */
export function useBookmarks() {
  const { user, isLoading: authLoading } = useAuth()

  return useQuery({
    queryKey: ["bookmarks", user?.uid],
    queryFn: async () => {
      if (!user) return []

      const bookmarksRef = collection(db, "users", user.uid, "bookmarks")
      const q = query(bookmarksRef, orderBy("bookmarkedAt", "desc"), limit(MAX_BOOKMARKS))
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        articleId: doc.id,
      })) as Bookmark[]
    },
    enabled: !authLoading && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Check if a specific article is bookmarked
 */
export function useIsBookmarked(articleId: string | undefined) {
  const { user, isLoading: authLoading } = useAuth()

  return useQuery({
    queryKey: ["bookmark", user?.uid, articleId],
    queryFn: async () => {
      if (!user || !articleId) return false
      
      const bookmarkRef = doc(db, "users", user.uid, "bookmarks", articleId)
      const snapshot = await getDoc(bookmarkRef)
      return snapshot.exists()
    },
    enabled: !authLoading && !!user && !!articleId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

interface ToggleBookmarkParams {
  article: Article
  isCurrentlyBookmarked: boolean
}

/**
 * Toggle bookmark status for an article
 */
export function useToggleBookmark() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ article, isCurrentlyBookmarked }: ToggleBookmarkParams) => {
      if (!user) throw new Error("Must be authenticated to bookmark")
      
      const bookmarkRef = doc(db, "users", user.uid, "bookmarks", article.id)
      
      if (isCurrentlyBookmarked) {
        // Remove bookmark
        await deleteDoc(bookmarkRef)
        return { bookmarked: false }
      } else {
        // Add bookmark
        const bookmark: Bookmark = {
          articleId: article.id,
          title: article.title,
          sourceName: article.sourceName,
          url: article.url,
          bookmarkedAt: Timestamp.now(),
        }
        await setDoc(bookmarkRef, bookmark)
        return { bookmarked: true }
      }
    },
    onSuccess: (_, { article }) => {
      // Invalidate bookmark queries
      queryClient.invalidateQueries({ queryKey: ["bookmarks", user?.uid] })
      queryClient.invalidateQueries({ queryKey: ["bookmark", user?.uid, article.id] })
    },
  })
}

// ============================================================================
// Article AI Hook
// ============================================================================

interface ArticleAIResponse {
  cached: boolean
  ai: ArticleAI & { generatedAt: string }
  remaining: number
}

/**
 * Generate or retrieve AI summary for an article
 */
export function useArticleAI() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (articleId: string): Promise<ArticleAIResponse> => {
      if (!user) throw new Error("Must be authenticated to generate AI summary")
      
      const getOrCreateArticleAI = httpsCallable<{ articleId: string }, ArticleAIResponse>(
        functions,
        "getOrCreateArticleAI"
      )
      
      const result = await getOrCreateArticleAI({ articleId })
      return result.data
    },
    onSuccess: (data, articleId) => {
      // Update article cache with AI data
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      // Cache the AI response
      queryClient.setQueryData(["articleAI", articleId], data)
    },
  })
}

/**
 * Get cached AI data for an article
 */
export function useCachedArticleAI(articleId: string | undefined) {
  return useQuery<ArticleAIResponse | null>({
    queryKey: ["articleAI", articleId],
    queryFn: () => null, // Only used for cached data
    enabled: false,
    staleTime: Infinity,
  })
}

