/**
 * Hook for managing Industry Pulse watchlist (pinned topics)
 *
 * Persists watchlistTopics in user preferences document.
 * Optimistic updates for instant UI feedback.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { useUserPreferences } from "./use-user-preferences"

/**
 * Get the current watchlist topics from user preferences
 */
export function useWatchlist() {
  const { data: prefs, isLoading } = useUserPreferences()
  const watchlistTopics = prefs?.watchlistTopics ?? []

  return {
    watchlistTopics,
    isLoading,
    isPinned: (canonical: string) => watchlistTopics.includes(canonical),
  }
}

/**
 * Hook to toggle a topic in the watchlist
 */
export function useToggleWatchlistTopic() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      canonical,
      pinned,
    }: {
      canonical: string
      pinned: boolean
    }) => {
      if (!user) throw new Error("Not authenticated")

      const prefsRef = doc(db, "users", user.uid, "prefs", "main")
      const prefsDoc = await getDoc(prefsRef)

      if (prefsDoc.exists()) {
        const currentTopics: string[] = prefsDoc.data().watchlistTopics ?? []
        let newTopics: string[]

        if (pinned) {
          // Add to watchlist (avoid duplicates)
          newTopics = currentTopics.includes(canonical)
            ? currentTopics
            : [...currentTopics, canonical]
        } else {
          // Remove from watchlist
          newTopics = currentTopics.filter((t) => t !== canonical)
        }

        await updateDoc(prefsRef, {
          watchlistTopics: newTopics,
          updatedAt: serverTimestamp(),
        })
      } else {
        // Create prefs doc with watchlist
        await setDoc(prefsRef, {
          enabledSourceIds: [],
          enabledCategories: [
            "property_cat",
            "casualty_liability",
            "regulation",
            "claims",
            "reinsurance",
            "insurtech",
          ],
          notifications: {
            dailyBrief: true,
            breakingNews: false,
          },
          watchlistTopics: pinned ? [canonical] : [],
          updatedAt: serverTimestamp(),
        })
      }
    },
    // Optimistic update for instant feedback
    onMutate: async ({ canonical, pinned }) => {
      const queryKey = ["userPreferences", user?.uid]
      await queryClient.cancelQueries({ queryKey })

      const previous = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: Record<string, unknown> | undefined) => {
        if (!old) return old
        const currentTopics = (old.watchlistTopics as string[] | undefined) ?? []
        const newTopics = pinned
          ? currentTopics.includes(canonical) ? currentTopics : [...currentTopics, canonical]
          : currentTopics.filter((t) => t !== canonical)
        return { ...old, watchlistTopics: newTopics }
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["userPreferences", user?.uid],
          context.previous
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["userPreferences", user?.uid],
      })
    },
  })
}
