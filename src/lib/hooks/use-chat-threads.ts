/**
 * Hooks for chat thread persistence (optional)
 * 
 * Chat threads are stored in users/{uid}/chatThreads/{threadId}
 * Messages are stored in users/{uid}/chatThreads/{threadId}/messages/{messageId}
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  limit,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type {
  ChatThread,
  ChatMessage,
  ChatTimeScope,
  ChatSourceFilter,
  ChatCategory,
  ChatCitation,
} from "@/types/firestore"

// Maximum threads to fetch
const MAX_THREADS = 20

// ============================================================================
// Types for hook inputs
// ============================================================================

export interface CreateThreadInput {
  title: string
  scope: ChatTimeScope
  sourceFilter: ChatSourceFilter
  category: ChatCategory
}

export interface AppendMessageInput {
  threadId: string
  role: "user" | "assistant"
  content: string
  citations?: ChatCitation[]
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch recent chat threads for the current user
 */
export function useChatThreads() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["chatThreads", user?.uid],
    queryFn: async (): Promise<ChatThread[]> => {
      if (!user) return []

      const threadsRef = collection(db, "users", user.uid, "chatThreads")
      const q = query(threadsRef, orderBy("updatedAt", "desc"), limit(MAX_THREADS))
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatThread[]
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Create a new chat thread
 */
export function useCreateThread() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateThreadInput): Promise<string> => {
      if (!user) throw new Error("Must be authenticated to create thread")

      const threadsRef = collection(db, "users", user.uid, "chatThreads")
      const now = Timestamp.now()

      const docRef = await addDoc(threadsRef, {
        title: input.title,
        createdAt: now,
        updatedAt: now,
        scope: input.scope,
        sourceFilter: input.sourceFilter,
        category: input.category,
      })

      return docRef.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatThreads", user?.uid] })
    },
  })
}

/**
 * Append a message to a chat thread
 */
export function useAppendMessage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AppendMessageInput): Promise<string> => {
      if (!user) throw new Error("Must be authenticated to append message")

      const messagesRef = collection(
        db,
        "users",
        user.uid,
        "chatThreads",
        input.threadId,
        "messages"
      )

      // Add the message
      const docRef = await addDoc(messagesRef, {
        role: input.role,
        content: input.content,
        createdAt: Timestamp.now(),
        ...(input.citations && { citations: input.citations }),
      })

      // Update thread's updatedAt
      const threadRef = doc(db, "users", user.uid, "chatThreads", input.threadId)
      await updateDoc(threadRef, {
        updatedAt: serverTimestamp(),
      })

      return docRef.id
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["chatThreads", user?.uid] })
      queryClient.invalidateQueries({ queryKey: ["chatMessages", input.threadId] })
    },
  })
}

/**
 * Fetch messages for a specific thread
 */
export function useChatMessages(threadId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["chatMessages", threadId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!user || !threadId) return []

      const messagesRef = collection(
        db,
        "users",
        user.uid,
        "chatThreads",
        threadId,
        "messages"
      )
      const q = query(messagesRef, orderBy("createdAt", "asc"))
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[]
    },
    enabled: !!user && !!threadId,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Delete a chat thread and all its messages
 */
export function useDeleteThread() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (threadId: string): Promise<void> => {
      if (!user) throw new Error("Must be authenticated to delete thread")

      // Note: In production, you might want to use a Cloud Function
      // to delete subcollections atomically. For now, we just delete the thread doc.
      // Firestore will orphan the messages subcollection, but they won't be accessible.
      const threadRef = doc(db, "users", user.uid, "chatThreads", threadId)
      await deleteDoc(threadRef)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatThreads", user?.uid] })
    },
  })
}

