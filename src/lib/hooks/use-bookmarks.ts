/**
 * Hooks for article AI management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { ArticleAI } from "@/types/firestore"

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
