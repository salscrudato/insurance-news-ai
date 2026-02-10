/**
 * Ask AI Page - ChatGPT-class chat interface for querying P&C news
 * Premium, minimal, message-first design with Apple-inspired polish
 * Wired to answerQuestionRag backend endpoint with streaming support
 *
 * Features:
 * - Multi-session chat management (new chat, history, delete)
 * - localStorage persistence per session
 * - Streaming-first with non-streaming fallback
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  ArrowUp,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  SquarePen,
  Clock,
  Trash2,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery } from "@tanstack/react-query"
import { doc, getDoc } from "firebase/firestore"
import { signInAnonymously } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useUserPreferences } from "@/lib/hooks"
import { ArticleDetailSheet } from "@/components/feed"
import { AppLogo } from "@/components/ui/app-logo"
import { trackEvent } from "@/lib/analytics"
import type { Article } from "@/types/firestore"

/**
 * Ensures we have a valid Firebase auth token.
 * If no current user, attempts anonymous sign-in first with a timeout.
 * Returns the ID token or null if unable to authenticate (for Capacitor fallback).
 */
async function ensureAuthToken(): Promise<string | null> {
  // If we already have a user, get their token
  if (auth.currentUser) {
    return auth.currentUser.getIdToken()
  }

  // No current user - try anonymous sign-in with timeout
  // (Firebase Auth SDK hangs in Capacitor WebView)
  // No current user - try anonymous sign-in with timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), 3000)
  })

  try {
    const result = await Promise.race([
      signInAnonymously(auth),
      timeoutPromise
    ])
    return result.user.getIdToken()
  } catch {
    return null
  }
}

// ============================================================================
// Session Storage
// ============================================================================

/** localStorage key for AI data consent */
const AI_CONSENT_KEY = "pcbrief_ai_consent"

/** Check if user has accepted AI data consent */
function hasAiConsent(): boolean {
  try {
    return localStorage.getItem(AI_CONSENT_KEY) === "accepted"
  } catch {
    return false
  }
}

/** Record AI data consent acceptance */
function acceptAiConsent() {
  try {
    localStorage.setItem(AI_CONSENT_KEY, "accepted")
  } catch {
    // ignore quota errors
  }
}

/** localStorage key for the session index (list of session metadata) */
const SESSIONS_INDEX_KEY = "pcbrief_chat_sessions"
/** localStorage key prefix for individual session messages */
const SESSION_PREFIX = "pcbrief_chat_"
/** Max sessions to keep in history */
const MAX_SESSIONS = 30
/** Max messages per session (kept in memory/storage) */
const MAX_MESSAGES_PER_SESSION = 40

interface ChatSession {
  id: string
  title: string
  createdAt: number  // epoch ms
  updatedAt: number  // epoch ms
  messageCount: number
}

/** Read the session index from localStorage */
function loadSessionIndex(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Persist the session index */
function saveSessionIndex(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
  } catch {
    // ignore quota errors
  }
}

/** Load messages for a specific session */
function loadSessionMessages(sessionId: string): Message[] {
  try {
    const raw = localStorage.getItem(SESSION_PREFIX + sessionId)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Save messages for a specific session */
function saveSessionMessages(sessionId: string, messages: Message[]) {
  try {
    const toSave = messages.slice(-MAX_MESSAGES_PER_SESSION)
    localStorage.setItem(SESSION_PREFIX + sessionId, JSON.stringify(toSave))
  } catch {
    // ignore quota errors
  }
}

/** Delete a session's messages from storage */
function deleteSessionStorage(sessionId: string) {
  try {
    localStorage.removeItem(SESSION_PREFIX + sessionId)
  } catch {
    // ignore
  }
}

/** Generate a unique session ID */
function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** Derive a title from the first user message */
function deriveTitle(messages: Message[]): string {
  const firstUserMsg = messages.find((m) => m.role === "user")
  if (!firstUserMsg) return "New conversation"
  const text = firstUserMsg.content.trim()
  return text.length > 60 ? text.slice(0, 57) + "..." : text
}

// ============================================================================
// Migrate legacy single-conversation cache to session system
// ============================================================================

const LEGACY_CACHE_KEY = "pcbrief_ask_cache"

function migrateLegacyCache(): string | null {
  try {
    const legacy = localStorage.getItem(LEGACY_CACHE_KEY)
    if (!legacy) return null

    const messages = JSON.parse(legacy) as Message[]
    if (!Array.isArray(messages) || messages.length === 0) {
      localStorage.removeItem(LEGACY_CACHE_KEY)
      return null
    }

    // Create a session from legacy messages
    const sessionId = generateSessionId()
    const now = Date.now()
    const session: ChatSession = {
      id: sessionId,
      title: deriveTitle(messages),
      createdAt: now,
      updatedAt: now,
      messageCount: messages.length,
    }

    saveSessionMessages(sessionId, messages)
    saveSessionIndex([session])
    localStorage.removeItem(LEGACY_CACHE_KEY)
    return sessionId
  } catch {
    localStorage.removeItem(LEGACY_CACHE_KEY)
    return null
  }
}

// Cloud Functions base URL
const FUNCTIONS_BASE_URL =
  import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATOR === "true"
    ? "http://localhost:5001/insurance-news-ai/us-central1"
    : "https://us-central1-insurance-news-ai.cloudfunctions.net"

// Streaming endpoint URL (Firebase Functions v2)
const STREAMING_ENDPOINT = `${FUNCTIONS_BASE_URL}/answerQuestionRagStream`

// Non-streaming RAG endpoint (fallback)
const RAG_ENDPOINT = `${FUNCTIONS_BASE_URL}/answerQuestionRag`

// Types matching backend RAG response
type RagScope = "today" | "7d" | "30d"

interface RagCitation {
  articleId: string
  title: string
  sourceName: string
  url: string
  publishedAt: string
}

interface RagAnswerResponse {
  answerMarkdown: string
  takeaways: string[]
  citations: RagCitation[]
  followUps?: string[]   // ignored — no longer rendered
  remaining: number
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: RagCitation[]
  takeaways?: string[]
  error?: boolean
}

type SourceFilterMode = "my-sources" | "all-sources"

// ============================================================================
// Main Component
// ============================================================================

export function AskPage() {
  const { isAuthenticated } = useAuth()
  const { data: userPrefs } = useUserPreferences()

  // AI data consent
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(() => hasAiConsent())

  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Scope & source filter state (defaults: 7 days, my sources)
  const [scope] = useState<RagScope>("7d")
  const [sourceFilterMode] = useState<SourceFilterMode>("my-sources")

  // Article detail sheet state
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [articleSheetOpen, setArticleSheetOpen] = useState(false)

  // Retry state
  const [pendingRetry, setPendingRetry] = useState<string | null>(null)

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ── Initialize: migrate legacy cache + load sessions ──
  useEffect(() => {
    const migratedId = migrateLegacyCache()
    const loadedSessions = loadSessionIndex()
    setSessions(loadedSessions)

    if (migratedId) {
      // Open the migrated session
      setActiveSessionId(migratedId)
      setMessages(loadSessionMessages(migratedId))
    } else if (loadedSessions.length > 0) {
      // Open the most recent session
      const mostRecent = loadedSessions[0]
      setActiveSessionId(mostRecent.id)
      setMessages(loadSessionMessages(mostRecent.id))
    }
    // If no sessions, stay in empty/new chat state
  }, [])

  // ── Persist messages to session storage when they change ──
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return

    saveSessionMessages(activeSessionId, messages)

    // Update session index (title, updatedAt, messageCount)
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: deriveTitle(messages),
              updatedAt: Date.now(),
              messageCount: messages.length,
            }
          : s
      )
      saveSessionIndex(updated)
      return updated
    })
  }, [messages, activeSessionId])

  // ── New Chat ──
  const handleNewChat = useCallback(() => {
    // If current session is empty, just stay
    if (messages.length === 0 && activeSessionId) return

    // Abort any in-flight stream
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsStreaming(false)

    setMessages([])
    setActiveSessionId(null)
    setInputValue("")
    setPendingRetry(null)
    setConfirmingDelete(null)

    // Focus the input
    setTimeout(() => inputRef.current?.focus(), 100)

    trackEvent("chat_new")
  }, [messages.length, activeSessionId])

  // ── Open a session from history ──
  const handleOpenSession = useCallback((sessionId: string) => {
    // Abort any in-flight stream
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsStreaming(false)

    const sessionMessages = loadSessionMessages(sessionId)
    setActiveSessionId(sessionId)
    setMessages(sessionMessages)
    setInputValue("")
    setPendingRetry(null)
    setHistoryOpen(false)
    setConfirmingDelete(null)

    trackEvent("chat_history_opened")
  }, [])

  // ── Delete a session ──
  const handleDeleteSession = useCallback((sessionId: string) => {
    deleteSessionStorage(sessionId)
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId)
      saveSessionIndex(updated)
      return updated
    })

    // If the deleted session is the active one, reset to empty
    if (sessionId === activeSessionId) {
      setMessages([])
      setActiveSessionId(null)
      setInputValue("")
      setPendingRetry(null)
    }

    setConfirmingDelete(null)
    trackEvent("chat_deleted")
  }, [activeSessionId])

  // Fetch article for detail sheet
  const { data: selectedArticle } = useQuery({
    queryKey: ["article", selectedArticleId],
    queryFn: async () => {
      if (!selectedArticleId) return null
      const articleDoc = await getDoc(doc(db, "articles", selectedArticleId))
      if (!articleDoc.exists()) return null
      return { id: articleDoc.id, ...articleDoc.data() } as Article
    },
    enabled: !!selectedArticleId,
  })

  // RAG mutation - uses HTTP fetch (httpsCallable hangs in Capacitor WebView)
  const ragMutation = useMutation({
    mutationFn: async ({
      question,
      history,
    }: {
      question: string
      history: { role: "user" | "assistant"; content: string }[]
    }): Promise<RagAnswerResponse> => {
      // Get auth token (will attempt anonymous sign-in if needed)
      const token = await ensureAuthToken()

      // Determine source IDs
      const sourceIds =
        sourceFilterMode === "my-sources" &&
        userPrefs?.enabledSourceIds &&
        userPrefs.enabledSourceIds.length > 0
          ? userPrefs.enabledSourceIds
          : null

      // Build headers - only include Authorization if we have a token
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch(RAG_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: {
            question,
            scope,
            category: "all",
            sourceIds,
            history,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      const json = await response.json()
      // Firebase callable functions wrap response in { result: ... }
      return json.result || json
    },
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px"
    }
  }, [inputValue])

  // Stream response from SSE endpoint
  const streamResponse = useCallback(
    async (
      question: string,
      history: { role: "user" | "assistant"; content: string }[],
      assistantMessageId: string
    ): Promise<boolean> => {
      // Get auth token (will attempt anonymous sign-in if needed)
      const token = await ensureAuthToken()

      // Determine source IDs
      const sourceIds =
        sourceFilterMode === "my-sources" &&
        userPrefs?.enabledSourceIds &&
        userPrefs.enabledSourceIds.length > 0
          ? userPrefs.enabledSourceIds
          : null

      // Create abort controller for cleanup
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Build headers - only include Authorization if we have a token
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch(STREAMING_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          question,
          scope,
          category: "all",
          sourceIds,
          history,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let buffer = ""

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("event: done")) {
            // Next line will be the done data
            continue
          }
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6)
            if (!dataStr) continue

            try {
              const data = JSON.parse(dataStr)

              // Check if this is the done event payload
              if (data.citations !== undefined) {
                // Final done event with metadata
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: data.answerMarkdown || msg.content,
                          citations: data.citations,
                          takeaways: data.takeaways,
                        }
                      : msg
                  )
                )
              } else if (data.text !== undefined) {
                // Streaming text chunk
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + data.text }
                      : msg
                  )
                )
              }
            } catch {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      }

      return true
    },
    [scope, sourceFilterMode, userPrefs]
  )

  // Fallback to non-streaming mutation
  const fallbackToNonStreaming = useCallback(
    async (
      question: string,
      history: { role: "user" | "assistant"; content: string }[],
      assistantMessageId: string
    ) => {
      const response = await ragMutation.mutateAsync({ question, history })

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: response.answerMarkdown,
                citations: response.citations,
                takeaways: response.takeaways,
              }
            : msg
        )
      )
    },
    [ragMutation]
  )

  // Handle send - tries streaming first, falls back to non-streaming
  const handleSend = useCallback(
    async (overrideQuestion?: string) => {
      const question = overrideQuestion ?? inputValue.trim()
      if (!question || isStreaming || ragMutation.isPending) return

      if (!isAuthenticated) {
        toast.error("Sign in to ask questions")
        return
      }

      // Show AI data consent dialog if not yet accepted
      if (!consentAccepted) {
        setShowConsentDialog(true)
        return
      }

      // ── Ensure we have an active session ──
      let currentSessionId = activeSessionId
      if (!currentSessionId) {
        currentSessionId = generateSessionId()
        const now = Date.now()
        const newSession: ChatSession = {
          id: currentSessionId,
          title: question.length > 60 ? question.slice(0, 57) + "..." : question,
          createdAt: now,
          updatedAt: now,
          messageCount: 0,
        }
        setActiveSessionId(currentSessionId)
        setSessions((prev) => {
          const updated = [newSession, ...prev].slice(0, MAX_SESSIONS)
          saveSessionIndex(updated)
          return updated
        })
      }

      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: question,
      }

      // Create placeholder assistant message for streaming
      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      if (!overrideQuestion) setInputValue("")
      setPendingRetry(null)
      setIsStreaming(true)

      // Track ask_sent
      const startTime = Date.now()
      trackEvent("ask_sent", { scope, source_filter: sourceFilterMode })

      // Build history from last 8 messages
      const history = messages
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }))

      try {
        // Try streaming first
        const success = await streamResponse(question, history, assistantMessageId)

        // Track ask_answered on success
        if (success) {
          // Get the final message to check citations
          setMessages((prev) => {
            const finalMsg = prev.find((m) => m.id === assistantMessageId)
            const citationCount = finalMsg?.citations?.length || 0
            trackEvent("ask_answered", {
              scope,
              source_filter: sourceFilterMode,
              source_count: citationCount,
              has_citations: citationCount > 0,
              response_time_ms: Date.now() - startTime,
            })
            // Track no coverage if no citations
            if (citationCount === 0) {
              trackEvent("ask_no_coverage", { scope, source_filter: sourceFilterMode })
            }
            return prev
          })
        }
      } catch (streamError) {
        const streamErrMsg = streamError instanceof Error ? streamError.message : String(streamError)
        console.warn("Streaming failed, falling back to non-streaming:", streamErrMsg)

        // Reset the assistant message for fallback
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: "" } : msg
          )
        )

        try {
          await fallbackToNonStreaming(question, history, assistantMessageId)
        } catch (fallbackError) {
          const fallbackErrMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          console.error("RAG error:", fallbackErrMsg)

          // Update the assistant message to show error
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: "I couldn't process your question. Please try again.",
                    error: true,
                  }
                : msg
            )
          )
          setPendingRetry(question)
          toast.error("Failed to get response", {
            description: "Tap retry or try a different question",
          })
        }
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [
      inputValue,
      messages,
      ragMutation,
      isAuthenticated,
      isStreaming,
      activeSessionId,
      streamResponse,
      fallbackToNonStreaming,
      scope,
      sourceFilterMode,
      consentAccepted,
    ]
  )

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // Handle retry
  const handleRetry = useCallback(() => {
    if (pendingRetry) {
      // Remove the error message
      setMessages((prev) => prev.slice(0, -1))
      handleSend(pendingRetry)
    }
  }, [pendingRetry, handleSend])

  // Handle AI data consent acceptance
  const handleConsentAccept = useCallback(() => {
    acceptAiConsent()
    setConsentAccepted(true)
    setShowConsentDialog(false)
    // Auto-send the pending message after consent
    setTimeout(() => {
      const pending = inputValue.trim()
      if (pending) handleSend()
    }, 100)
  }, [inputValue, handleSend])

  // Handle citation click - open article detail sheet
  const handleCitationClick = useCallback((citation: RagCitation) => {
    trackEvent("citation_opened", { article_id: citation.articleId })
    setSelectedArticleId(citation.articleId)
    setArticleSheetOpen(true)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0
  const isLoading = ragMutation.isPending || isStreaming

  // Sessions excluding the currently active one (for history list)
  const historySessions = useMemo(
    () => sessions.filter((s) => s.id !== activeSessionId || messages.length === 0),
    [sessions, activeSessionId, messages.length]
  )

  return (
    <div className="flex flex-col flex-1 bg-[var(--color-surface)] overflow-hidden">
      {/* ── Action bar ── */}
      <div className="shrink-0 flex items-center justify-between px-[12px] h-[40px] border-b border-[var(--color-separator-light)] bg-[var(--color-surface)]">
        <button
          onClick={() => {
            setHistoryOpen((v) => !v)
          }}
          aria-label="Chat history"
          className={cn(
            "flex items-center gap-[5px] h-[32px] px-[10px] rounded-[8px]",
            "text-[13px] font-medium tracking-[-0.08px]",
            "transition-all duration-150",
            "-webkit-tap-highlight-color-transparent",
            historyOpen
              ? "bg-[var(--color-fill-tertiary)] text-[var(--color-text-primary)]"
              : "text-[var(--color-text-tertiary)] active:bg-[var(--color-fill-tertiary)] active:scale-[0.97]"
          )}
        >
          <Clock className="h-[14px] w-[14px]" strokeWidth={1.8} />
          <span>History</span>
        </button>

        <button
          onClick={handleNewChat}
          aria-label="New chat"
          className={cn(
            "flex items-center gap-[5px] h-[32px] px-[10px] rounded-[8px]",
            "text-[13px] font-medium tracking-[-0.08px] text-[var(--color-accent)]",
            "transition-all duration-150",
            "-webkit-tap-highlight-color-transparent",
            "active:bg-[var(--color-accent-soft)] active:scale-[0.97]",
          )}
        >
          <SquarePen className="h-[14px] w-[14px]" strokeWidth={1.8} />
          <span>New Chat</span>
        </button>
      </div>

      {/* ── Chat History Panel ── */}
      {historyOpen && (
        <div className="shrink-0 border-b border-[var(--color-separator-light)] bg-[var(--color-surface-secondary)] overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto overscroll-contain">
            {historySessions.length === 0 ? (
              <div className="px-[20px] py-[24px] text-center">
                <p className="text-[13px] text-[var(--color-text-quaternary)]">
                  No past conversations
                </p>
              </div>
            ) : (
              <div className="py-[4px]">
                {historySessions.map((session, idx) => (
                  <div key={session.id} className="relative group">
                    <button
                      onClick={() => handleOpenSession(session.id)}
                      className={cn(
                        "w-full text-left px-[16px] py-[11px] pr-[48px] flex items-center",
                        "transition-colors duration-100",
                        "-webkit-tap-highlight-color-transparent",
                        session.id === activeSessionId
                          ? "bg-[var(--color-fill-quaternary)]"
                          : "active:bg-[var(--color-fill-quaternary)]",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[var(--color-text-primary)] leading-[1.3] truncate tracking-[-0.1px]">
                          {session.title}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-quaternary)] mt-[3px] tracking-[-0.02em]">
                          {formatRelativeDate(session.updatedAt)}
                          <span className="mx-[4px] opacity-40">&middot;</span>
                          {Math.ceil(session.messageCount / 2)} {Math.ceil(session.messageCount / 2) === 1 ? "exchange" : "exchanges"}
                        </p>
                      </div>
                    </button>

                    {/* Delete */}
                    {confirmingDelete === session.id ? (
                      <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px]">
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          aria-label="Confirm delete"
                          className="h-[28px] px-[10px] rounded-[7px] bg-[var(--color-destructive)] text-white text-[12px] font-medium transition-all active:scale-[0.95]"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(null)}
                          aria-label="Cancel delete"
                          className="h-[28px] px-[8px] rounded-[7px] text-[12px] font-medium text-[var(--color-text-tertiary)] bg-[var(--color-fill-tertiary)] transition-all active:scale-[0.95]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmingDelete(session.id)
                        }}
                        aria-label={`Delete conversation: ${session.title}`}
                        className={cn(
                          "absolute right-[10px] top-1/2 -translate-y-1/2",
                          "flex items-center justify-center h-[36px] w-[36px] rounded-[8px]",
                          "text-[var(--color-text-quaternary)]",
                          "transition-all duration-150",
                          "active:bg-[var(--color-fill-tertiary)] active:text-[var(--color-destructive)]",
                          "active:scale-[0.92]",
                        )}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.8} />
                      </button>
                    )}

                    {/* Inset separator */}
                    {idx < historySessions.length - 1 && (
                      <div className="absolute bottom-0 left-[16px] right-[16px] h-[0.5px] bg-[var(--color-separator-light)]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chat Transcript Area ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="flex-1 px-[20px] pt-[16px] pb-[8px]">
            {messages.map((message, index) => {
              // During streaming, the last assistant message might be empty or partial
              const isStreamingMessage =
                isStreaming &&
                index === messages.length - 1 &&
                message.role === "assistant"

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCitationClick={handleCitationClick}
                  onRetry={message.error ? handleRetry : undefined}
                  isStreaming={isStreamingMessage}
                />
              )
            })}
            {/* Typing indicator for non-streaming loading (fallback mode) */}
            {isLoading && !isStreaming && <TypingIndicator />}
            <div ref={messagesEndRef} className="h-[1px]" />
          </div>
        )}
      </div>

      {/* ── Composer ── */}
      <div
        className={cn(
          "shrink-0 px-[16px] pt-[10px]",
          "pb-[max(12px,env(safe-area-inset-bottom))]",
          "border-t border-[var(--color-separator-light)]",
          "bg-[var(--color-surface)]",
        )}
      >
        <div
          className={cn(
            "relative flex items-end rounded-[22px]",
            "bg-[var(--color-fill-tertiary)]",
            "border border-[var(--color-separator-opaque)]",
            "transition-colors duration-200",
            "has-[:focus]:border-[rgba(0,122,255,0.35)]",
          )}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about P&C news..."
            aria-label="Type your question"
            rows={1}
            className="flex-1 resize-none overflow-hidden bg-transparent pl-[16px] pr-[44px] py-[10px] text-[16px] leading-[1.45] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-quaternary)] focus:outline-none focus:ring-0 focus:[box-shadow:none] focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:none] border-none outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
            className={cn(
              "absolute right-[6px] bottom-[6px] flex h-[30px] w-[30px] items-center justify-center rounded-full transition-all duration-150",
              inputValue.trim() && !isLoading
                ? "bg-[var(--color-text-primary)] text-white active:scale-[0.90]"
                : "bg-[var(--color-fill-secondary)] text-[var(--color-text-quaternary)] cursor-not-allowed"
            )}
          >
            <ArrowUp className="h-[15px] w-[15px]" strokeWidth={2.5} />
          </button>
        </div>
        <p className="text-[11px] text-[var(--color-text-quaternary)] text-center mt-[8px] tracking-[0.01em]">
          Grounded in your curated news sources
        </p>
      </div>

      {/* AI Data Consent Dialog */}
      {showConsentDialog && (
        <AiConsentDialog
          onAccept={handleConsentAccept}
          onCancel={() => setShowConsentDialog(false)}
        />
      )}

      {/* Article Detail Sheet */}
      <ArticleDetailSheet
        article={selectedArticle ?? null}
        open={articleSheetOpen}
        onOpenChange={setArticleSheetOpen}
      />
    </div>
  )
}

// ============================================================================
// Utilities
// ============================================================================

function formatRelativeDate(epochMs: number): string {
  const now = Date.now()
  const diffMs = now - epochMs
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`

  return new Date(epochMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

// ============================================================================
// Sub-components
// ============================================================================

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-[32px]">
      <AppLogo size={52} className="mb-[18px]" />
      <h2 className="text-[22px] font-bold tracking-[-0.5px] text-[var(--color-text-primary)] mb-[6px] text-center">
        Ask The Brief
      </h2>
      <p className="text-[15px] text-[var(--color-text-tertiary)] text-center leading-[1.5] max-w-[260px]">
        Get answers grounded in your curated P&C news sources
      </p>
    </div>
  )
}

// ============================================================================
// AI Data Consent Dialog
// ============================================================================

function AiConsentDialog({
  onAccept,
  onCancel,
}: {
  onAccept: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className={cn(
          "relative w-full sm:max-w-[380px] mx-auto",
          "bg-[var(--color-surface)] rounded-t-[20px] sm:rounded-[20px]",
          "shadow-[0_-4px_32px_rgba(0,0,0,0.12)]",
          "animate-in slide-in-from-bottom duration-300",
          "pb-[max(20px,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="px-[24px] pt-[28px]">
          {/* Icon */}
          <div className="flex justify-center mb-[16px]">
            <div className="flex items-center justify-center h-[48px] w-[48px] rounded-full bg-[var(--color-accent-soft)]">
              <Shield className="h-[22px] w-[22px] text-[var(--color-accent)]" strokeWidth={1.8} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-[20px] font-bold tracking-[-0.4px] text-[var(--color-text-primary)] text-center mb-[8px]">
            Before You Ask
          </h2>

          {/* Description */}
          <p className="text-[15px] leading-[1.55] text-[var(--color-text-secondary)] text-center mb-[20px] tracking-[-0.1px]">
            Ask The Brief uses AI to answer your questions. Here's how your data is handled:
          </p>

          {/* Data disclosure items */}
          <div className="space-y-[14px] mb-[24px]">
            <div className="flex gap-[12px]">
              <span className="text-[14px] leading-[1.1] mt-[3px] shrink-0">💬</span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--color-text-primary)] leading-[1.35] tracking-[-0.1px]">
                  What is sent
                </p>
                <p className="text-[13px] text-[var(--color-text-tertiary)] leading-[1.45] mt-[2px]">
                  Your question, recent chat messages, and relevant article excerpts from your news sources.
                </p>
              </div>
            </div>

            <div className="flex gap-[12px]">
              <span className="text-[14px] leading-[1.1] mt-[3px] shrink-0">🔒</span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--color-text-primary)] leading-[1.35] tracking-[-0.1px]">
                  Who processes it
                </p>
                <p className="text-[13px] text-[var(--color-text-tertiary)] leading-[1.45] mt-[2px]">
                  Your data is sent to OpenAI to generate answers. OpenAI does not use your data to train its models.
                </p>
              </div>
            </div>

            <div className="flex gap-[12px]">
              <span className="text-[14px] leading-[1.1] mt-[3px] shrink-0">🚫</span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--color-text-primary)] leading-[1.35] tracking-[-0.1px]">
                  What is not sent
                </p>
                <p className="text-[13px] text-[var(--color-text-tertiary)] leading-[1.45] mt-[2px]">
                  Your name, email, account details, or any other personal information are never sent to OpenAI.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy policy reference */}
          <p className="text-[12px] text-[var(--color-text-quaternary)] text-center mb-[20px] leading-[1.45]">
            For full details, see our Privacy Policy in Settings.
          </p>
        </div>

        {/* Buttons */}
        <div className="px-[24px] flex flex-col gap-[8px]">
          <button
            onClick={onAccept}
            className="h-[50px] w-full rounded-[12px] bg-[var(--color-accent)] text-[16px] font-semibold text-white tracking-[-0.2px] transition-all active:scale-[0.98] active:opacity-90"
          >
            I Understand & Agree
          </button>
          <button
            onClick={onCancel}
            className="h-[44px] w-full rounded-[12px] text-[15px] font-medium text-[var(--color-text-tertiary)] tracking-[-0.2px] transition-all active:bg-[var(--color-fill-tertiary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Markdown Rendering
// ============================================================================

/**
 * Format inline text with bold, citations, and other inline elements.
 */
function formatInlineText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Match bold (**text**) and citations ([1])
  const regex = /(\*\*[^*]+\*\*|\[\d+\])/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIdx = 0

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      nodes.push(<span key={keyIdx++}>{text.slice(lastIndex, match.index)}</span>)
    }

    const token = match[0]
    if (token.startsWith("**") && token.endsWith("**")) {
      // Bold text
      nodes.push(
        <strong key={keyIdx++} className="font-semibold text-[var(--color-text-primary)] tracking-[-0.1px]">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (/^\[\d+\]$/.test(token)) {
      // Citation — compact superscript with accent tint
      nodes.push(
        <sup
          key={keyIdx++}
          className="text-[10px] font-semibold text-[var(--color-accent)] opacity-50 ml-[1px] select-none align-super leading-none"
        >
          {token}
        </sup>
      )
    }
    lastIndex = match.index + token.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(<span key={keyIdx}>{text.slice(lastIndex)}</span>)
  }

  return nodes.length > 0 ? nodes : [<span key="0">{text}</span>]
}

/**
 * FormattedResponse — Lightweight markdown renderer for assistant messages.
 * Supports: headings, numbered lists, bullet lists, paragraphs, bold, citations.
 * Designed for high readability with clear visual hierarchy.
 */
function FormattedResponse({ content }: { content: string }) {
  if (!content) return null

  // Split by double newlines into blocks
  const blocks = content.split(/\n\n+/)

  return (
    <div className="space-y-[14px]">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        // Section heading (### Heading or ## Heading)
        const headingMatch = trimmed.match(/^#{2,3}\s+(.+)$/)
        if (headingMatch) {
          return (
            <p
              key={bIdx}
              className="text-[16px] font-semibold text-[var(--color-text-primary)] leading-[1.35] tracking-[-0.2px]"
            >
              {formatInlineText(headingMatch[1])}
            </p>
          )
        }

        // Numbered list block (lines starting with 1., 2., etc.)
        const lines = trimmed.split("\n")
        const isNumberedList = lines.every(line => /^\d+\.\s/.test(line.trim()) || line.trim() === "")
        if (isNumberedList && lines.some(line => /^\d+\.\s/.test(line.trim()))) {
          return (
            <ol key={bIdx} className="space-y-[10px] list-none">
              {lines.map((line, lIdx) => {
                const boldMatch = line.trim().match(/^(\d+)\.\s*\*\*(.+?)\*\*:?\s*(.*)$/)
                if (boldMatch) {
                  // "1. **Title**: description"
                  const [, num, title, rest] = boldMatch
                  return (
                    <li key={lIdx} className="flex gap-[8px]">
                      <span className="text-[15px] leading-[1.6] font-medium text-[var(--color-text-quaternary)] w-[18px] shrink-0 text-right tabular-nums">{num}.</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-[1.6]">{title}</span>
                        {rest && (
                          <span className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
                            {" "}{formatInlineText(rest.trim())}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                }
                // Simple numbered item
                const simpleMatch = line.trim().match(/^(\d+)\.\s+(.+)$/)
                if (simpleMatch) {
                  return (
                    <li key={lIdx} className="flex gap-[8px]">
                      <span className="text-[15px] leading-[1.6] font-medium text-[var(--color-text-quaternary)] w-[18px] shrink-0 text-right tabular-nums">{simpleMatch[1]}.</span>
                      <span className="flex-1 text-[15px] leading-[1.6] text-[var(--color-text-primary)]">{formatInlineText(simpleMatch[2])}</span>
                    </li>
                  )
                }
                return null
              })}
            </ol>
          )
        }

        // Bullet list (lines starting with - or •)
        const isBulletList = lines.every(line => /^[-•]\s/.test(line.trim()) || line.trim() === "")
        if (isBulletList && lines.some(line => /^[-•]\s/.test(line.trim()))) {
          return (
            <ul key={bIdx} className="space-y-[6px] list-none">
              {lines.map((line, lIdx) => {
                const bulletMatch = line.trim().match(/^[-•]\s+(.+)$/)
                if (bulletMatch) {
                  return (
                    <li key={lIdx} className="flex gap-[10px] items-start">
                      <span className="text-[var(--color-text-quaternary)] text-[5px] mt-[9px] shrink-0">●</span>
                      <span className="flex-1 text-[15px] leading-[1.6] text-[var(--color-text-primary)]">{formatInlineText(bulletMatch[1])}</span>
                    </li>
                  )
                }
                return null
              })}
            </ul>
          )
        }

        // Numbered item with bold header spanning multiple paragraphs
        const numberedHeaderMatch = trimmed.match(/^(\d+)\.\s*\*\*(.+?)\*\*:?\s*(.*)$/s)
        if (numberedHeaderMatch) {
          const [, num, header, rest] = numberedHeaderMatch
          return (
            <div key={bIdx} className="flex gap-[8px]">
              <span className="text-[15px] leading-[1.6] font-medium text-[var(--color-text-quaternary)] w-[18px] shrink-0 text-right tabular-nums">{num}.</span>
              <div className="flex-1 min-w-0">
                <span className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-[1.6]">{header}</span>
                {rest && (
                  <span className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
                    {" "}{formatInlineText(rest.trim())}
                  </span>
                )}
              </div>
            </div>
          )
        }

        // Regular paragraph
        return (
          <p key={bIdx} className="text-[15px] leading-[1.6] text-[var(--color-text-primary)] tracking-[-0.1px]">
            {formatInlineText(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

// ============================================================================
// Chat Message
// ============================================================================

interface ChatMessageProps {
  message: Message
  onCitationClick: (c: RagCitation) => void
  onRetry?: () => void
  isStreaming?: boolean
}

function ChatMessage({ message, onCitationClick, onRetry, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user"

  // User message — right-aligned bubble
  if (isUser) {
    return (
      <div className="flex justify-end pl-[52px] mb-[20px]">
        <div className="max-w-[82%] rounded-[20px] bg-[var(--color-accent)] px-[16px] py-[10px]">
          <p className="text-[15px] leading-[1.5] text-white whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (message.error) {
    return (
      <div className="mb-[20px] pr-[24px]">
        <div className="rounded-[14px] border border-[var(--color-destructive)]/15 bg-[var(--color-destructive)]/[0.03] px-[14px] py-[12px]">
          <div className="flex items-start gap-[10px]">
            <AlertCircle className="h-[16px] w-[16px] text-[var(--color-destructive)] shrink-0 mt-[1px]" />
            <div className="flex-1">
              <p className="text-[15px] leading-[1.5] text-[var(--color-text-primary)] mb-[10px]">
                {message.content}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  aria-label="Retry sending message"
                  className="inline-flex items-center gap-[5px] rounded-full bg-[var(--color-fill-tertiary)] px-[12px] py-[6px] text-[13px] font-medium text-[var(--color-text-primary)] transition-all active:scale-[0.96] active:bg-[var(--color-fill-secondary)] min-h-[36px]"
                >
                  <RotateCcw className="h-[12px] w-[12px]" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Assistant message — flush left, no bubble (ChatGPT-style)
  const isEmptyStreaming = isStreaming && !message.content
  // Note: takeaways are intentionally not rendered — they are extracted from the
  // answer's own numbered/bullet items and would duplicate the content already
  // shown in the formatted response body. (Same treatment as followUps.)
  const hasSources = !isStreaming && message.citations && message.citations.length > 0

  return (
    <div className="mb-[28px]">
      {/* Thinking indicator — before first token */}
      {isEmptyStreaming && (
        <div className="flex items-center gap-[8px] py-[2px]">
          <div className="flex gap-[3px]">
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-text-tertiary)] opacity-60 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-text-tertiary)] opacity-60 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-text-tertiary)] opacity-60 animate-bounce" />
          </div>
          <span className="text-[13px] text-[var(--color-text-quaternary)]">Searching articles...</span>
        </div>
      )}

      {/* Answer body */}
      {!isEmptyStreaming && (
        <div className="pr-[4px]">
          <FormattedResponse content={message.content || "..."} />
          {isStreaming && (
            <span className="inline-block w-[2px] h-[14px] bg-[var(--color-text-tertiary)] ml-[2px] align-middle animate-pulse rounded-full opacity-60" />
          )}
        </div>
      )}

      {/* Sources — only after streaming completes */}
      {hasSources && (
        <div className="mt-[18px] pt-[16px] border-t border-[var(--color-separator-light)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--color-text-quaternary)] mb-[10px]">
            Sources
          </p>
          <div className="space-y-[6px]">
            {message.citations!.map((citation) => (
              <SourceCard key={citation.articleId} citation={citation} onClick={onCitationClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Source Card
// ============================================================================

function SourceCard({ citation, onClick }: { citation: RagCitation; onClick: (c: RagCitation) => void }) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffHours < 1) return "Just now"
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } catch {
      return ""
    }
  }

  return (
    <button
      onClick={() => onClick(citation)}
      aria-label={`View article: ${citation.title}`}
      className="group w-full text-left flex items-center gap-[10px] rounded-[12px] bg-[var(--color-fill-quaternary)] px-[14px] py-[11px] transition-all duration-150 active:scale-[0.98] active:bg-[var(--color-fill-tertiary)]"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-[var(--color-text-primary)] leading-[1.35] line-clamp-2 tracking-[-0.1px]">
          {citation.title}
        </p>
        <div className="flex items-center gap-[5px] mt-[3px]">
          <span className="text-[12px] text-[var(--color-text-tertiary)] truncate">{citation.sourceName}</span>
          <span className="text-[8px] text-[var(--color-text-quaternary)] opacity-50">●</span>
          <span className="text-[12px] text-[var(--color-text-quaternary)]">{formatDate(citation.publishedAt)}</span>
        </div>
      </div>
      <ExternalLink className="h-[12px] w-[12px] text-[var(--color-text-quaternary)] shrink-0 opacity-40 group-active:opacity-80" strokeWidth={2} />
    </button>
  )
}

// ============================================================================
// Typing Indicator
// ============================================================================

function TypingIndicator() {
  return (
    <div className="flex items-center gap-[4px] py-[8px] mb-[20px]">
      <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-text-tertiary)] opacity-50 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-text-tertiary)] opacity-50 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-text-tertiary)] opacity-50 animate-bounce" />
    </div>
  )
}
