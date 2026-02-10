/**
 * Hook for managing user preferences (source toggles, etc.)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { UserPreferences } from "@/types/firestore"

// Default preferences for new users
const DEFAULT_PREFERENCES: Omit<UserPreferences, "updatedAt"> = {
  enabledSourceIds: [], // Empty means "all sources"
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
}

/**
 * Fetch user preferences from Firestore
 */
async function fetchUserPreferences(uid: string): Promise<UserPreferences | null> {
  const prefsRef = doc(db, "users", uid, "prefs", "main")
  const snapshot = await getDoc(prefsRef)

  if (!snapshot.exists()) {
    return null
  }

  return snapshot.data() as UserPreferences
}

/**
 * Hook to get user preferences
 */
export function useUserPreferences() {
  const { user, isLoading: authLoading } = useAuth()

  return useQuery({
    queryKey: ["userPreferences", user?.uid],
    queryFn: () => fetchUserPreferences(user!.uid),
    enabled: !!user && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to toggle notification preferences
 */
export function useToggleNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      dailyBrief,
    }: {
      dailyBrief: boolean
    }) => {
      if (!user) throw new Error("Not authenticated")

      const prefsRef = doc(db, "users", user.uid, "prefs", "main")
      const prefsDoc = await getDoc(prefsRef)

      if (prefsDoc.exists()) {
        await updateDoc(prefsRef, {
          "notifications.dailyBrief": dailyBrief,
          updatedAt: serverTimestamp(),
        })
      } else {
        await setDoc(prefsRef, {
          ...DEFAULT_PREFERENCES,
          notifications: {
            ...DEFAULT_PREFERENCES.notifications,
            dailyBrief,
          },
          updatedAt: serverTimestamp(),
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences", user?.uid] })
    },
  })
}

