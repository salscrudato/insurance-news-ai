/**
 * Ask AI Page - ChatGPT-style chat interface for querying P&C news
 * Clean, minimal, message-first design with Apple-inspired polish
 * Wired to answerQuestionRag backend endpoint with streaming support
 */

import { useState, useRef, useEffect, useCallback } from "react"
import {
  ArrowUp,
  ExternalLink,
  RotateCcw,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery } from "@tanstack/react-query"
import { doc, getDoc } from "firebase/firestore"
import { signInAnonymously } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { hapticLight, hapticMedium } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useUserPreferences } from "@/lib/hooks"
import { ArticleDetailSheet } from "@/components/feed"
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
  console.log("[ensureAuthToken] No current user, attempting anonymous sign-in...")

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), 3000)
  })

  try {
    const result = await Promise.race([
      signInAnonymously(auth),
      timeoutPromise
    ])
    console.log("[ensureAuthToken] Anonymous sign-in succeeded:", result.user.uid)
    return result.user.getIdToken()
  } catch (error) {
    console.warn("[ensureAuthToken] Anonymous sign-in failed or timed out, proceeding without auth")
    return null
  }
}

// localStorage cache key for Q/A history
const ASK_CACHE_KEY = "pcbrief_ask_cache"
const MAX_CACHED_MESSAGES = 40 // 20 Q/A pairs = 40 messages

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
  followUps: string[]
  remaining: number
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: RagCitation[]
  takeaways?: string[]
  followUps?: string[]
  error?: boolean
}

type SourceFilterMode = "my-sources" | "all-sources"

export function AskPage() {
  const { isAuthenticated } = useAuth()
  const { data: userPrefs } = useUserPreferences()

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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

  // Load cached messages on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(ASK_CACHE_KEY)
      if (cached) {
        const parsedMessages = JSON.parse(cached) as Message[]
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages)
        }
      }
    } catch {
      // Ignore cache errors
    }
  }, [])

  // Save messages to cache when they change
  useEffect(() => {
    if (messages.length === 0) return
    try {
      // Keep only the last MAX_CACHED_MESSAGES
      const toCache = messages.slice(-MAX_CACHED_MESSAGES)
      localStorage.setItem(ASK_CACHE_KEY, JSON.stringify(toCache))
    } catch {
      // Ignore cache errors
    }
  }, [messages])

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

      // eslint-disable-next-line no-constant-condition
      while (true) {
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
                          followUps: data.followUps,
                        }
                      : msg
                  )
                )
                hapticLight()
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
                followUps: response.followUps,
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

      hapticMedium()

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
      streamResponse,
      fallbackToNonStreaming,
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

  // Handle citation click - open article detail sheet
  const handleCitationClick = useCallback((citation: RagCitation) => {
    hapticLight()
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

  return (
    <div className="flex flex-col flex-1 bg-[var(--color-bg-grouped)] overflow-hidden">
      {/* Chat Transcript Area - clean full-height surface */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {isEmpty ? (
          <EmptyState onSuggestionClick={handleSend} />
        ) : (
          /* Standardized spacing: 16px padding, 18px message gap for clear separation */
          <div className="flex-1 px-[16px] py-[20px] space-y-[18px]">
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

      {/* Composer - ChatGPT mobile-inspired, keyboard-safe */}
      <div className="bg-[var(--color-surface)] border-t border-[var(--color-border)] px-[16px] pb-[max(14px,env(safe-area-inset-bottom))] pt-[12px] shrink-0">
        {/* Input container - refined radius and padding */}
        <div className="relative flex items-center rounded-[20px] bg-[var(--color-fill-tertiary)] border border-[var(--color-separator)] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about P&C news..."
            aria-label="Type your question"
            rows={1}
            className="flex-1 resize-none overflow-hidden bg-transparent pl-[16px] pr-[48px] py-[11px] text-[16px] leading-[1.4] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-0 border-none outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
            className={cn(
              "absolute right-[5px] bottom-[5px] flex h-[32px] w-[32px] items-center justify-center rounded-full transition-all duration-150",
              inputValue.trim() && !isLoading
                ? "bg-[var(--color-accent)] text-white shadow-sm active:scale-[0.92]"
                : "bg-[var(--color-fill-secondary)] text-[var(--color-text-quaternary)] cursor-not-allowed"
            )}
          >
            <ArrowUp className="h-[16px] w-[16px]" strokeWidth={2.5} />
          </button>
        </div>
        {/* Subtle helper text */}
        <p className="text-[11px] text-[var(--color-text-quaternary)] text-center mt-[8px] tracking-[-0.1px]">
          Grounded in your curated news sources
        </p>
      </div>

      {/* Article Detail Sheet */}
      <ArticleDetailSheet
        article={selectedArticle ?? null}
        open={articleSheetOpen}
        onOpenChange={setArticleSheetOpen}
      />
    </div>
  )
}

// Starter suggestion chips
const STARTER_SUGGESTIONS = [
  "What's happening in cyber insurance?",
  "Latest on climate risk pricing",
  "CAT bond market trends",
  "InsurTech funding news",
  "Regulatory changes this week",
  "M&A activity in P&C",
]

// Sub-components

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void
}

function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-[24px] pb-[48px]">
      {/* Icon - refined gradient and sizing */}
      <div className="mb-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-gradient-to-br from-[var(--color-fill-tertiary)] to-[var(--color-fill-secondary)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <svg className="h-[26px] w-[26px] text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10H12V2Z" />
          <path d="M12 12 2.1 9.1" />
          <path d="m12 12 7.5 7.5" />
        </svg>
      </div>

      {/* Headline - tighter spacing */}
      <h2 className="text-[22px] font-bold tracking-[-0.5px] text-[var(--color-text-primary)] mb-[6px] text-center">
        Ask The Brief
      </h2>
      <p className="text-[15px] text-[var(--color-text-secondary)] text-center leading-[1.5] max-w-[260px] mb-[32px]">
        Get answers grounded in your curated news sources
      </p>

      {/* Suggestion chips - refined styling */}
      <div className="flex flex-wrap justify-center gap-[10px] max-w-[320px]">
        {STARTER_SUGGESTIONS.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => {
              hapticLight()
              onSuggestionClick(suggestion)
            }}
            className="rounded-full bg-[var(--color-surface)] border border-[var(--color-separator-opaque)] px-[14px] py-[9px] text-[13px] font-medium text-[var(--color-text-secondary)] leading-[1.3] transition-all active:scale-[0.97] active:bg-[var(--color-fill-quaternary)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] min-h-[44px]"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Format inline text with bold, citations, and other inline elements
 * Returns an array of React nodes
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
        <strong key={keyIdx++} className="font-semibold text-[var(--color-text-primary)]">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (/^\[\d+\]$/.test(token)) {
      // Citation - subtle superscript, muted color
      nodes.push(
        <sup key={keyIdx++} className="text-[10px] font-medium text-[var(--color-text-quaternary)] ml-[1px] select-none">
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
 * FormattedResponse - Lightweight markdown-style renderer for assistant responses
 * Supports: headings, numbered lists, bullet lists, paragraphs, bold, and citations
 * Designed for high readability with clear visual hierarchy
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

        // Check for section heading (### Heading or ## Heading)
        const headingMatch = trimmed.match(/^#{2,3}\s+(.+)$/)
        if (headingMatch) {
          return (
            <h3 key={bIdx} className="text-[16px] font-semibold text-[var(--color-text-primary)] leading-[1.35] tracking-[-0.2px] mt-[6px] first:mt-0">
              {headingMatch[1]}
            </h3>
          )
        }

        // Check for numbered list block (lines starting with 1., 2., etc.)
        const lines = trimmed.split("\n")
        const isNumberedList = lines.every(line => /^\d+\.\s/.test(line.trim()) || line.trim() === "")
        if (isNumberedList && lines.some(line => /^\d+\.\s/.test(line.trim()))) {
          return (
            <ol key={bIdx} className="space-y-[10px] list-none">
              {lines.map((line, lIdx) => {
                const match = line.trim().match(/^(\d+)\.\s*\*\*(.+?)\*\*:?\s*(.*)$/)
                if (match) {
                  // Numbered item with bold header: "1. **Title**: description"
                  const [, num, title, rest] = match
                  return (
                    <li key={lIdx} className="flex gap-[8px]">
                      <span className="text-[15px] font-medium text-[var(--color-text-tertiary)] w-[18px] shrink-0 text-right">{num}.</span>
                      <div className="flex-1">
                        <span className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-[1.5]">{title}</span>
                        {rest && <span className="text-[15px] leading-[1.65] text-[var(--color-text-secondary)]"> {formatInlineText(rest.trim())}</span>}
                      </div>
                    </li>
                  )
                }
                // Simple numbered item
                const simpleMatch = line.trim().match(/^(\d+)\.\s+(.+)$/)
                if (simpleMatch) {
                  return (
                    <li key={lIdx} className="flex gap-[8px]">
                      <span className="text-[15px] font-medium text-[var(--color-text-tertiary)] w-[18px] shrink-0 text-right">{simpleMatch[1]}.</span>
                      <span className="flex-1 text-[15px] leading-[1.65] text-[var(--color-text-primary)]">{formatInlineText(simpleMatch[2])}</span>
                    </li>
                  )
                }
                return null
              })}
            </ol>
          )
        }

        // Check for bullet list (lines starting with - or •)
        const isBulletList = lines.every(line => /^[-•]\s/.test(line.trim()) || line.trim() === "")
        if (isBulletList && lines.some(line => /^[-•]\s/.test(line.trim()))) {
          return (
            <ul key={bIdx} className="space-y-[6px] list-none">
              {lines.map((line, lIdx) => {
                const match = line.trim().match(/^[-•]\s+(.+)$/)
                if (match) {
                  return (
                    <li key={lIdx} className="flex gap-[10px] items-start">
                      <span className="text-[var(--color-text-tertiary)] text-[8px] mt-[7px] shrink-0">●</span>
                      <span className="flex-1 text-[15px] leading-[1.65] text-[var(--color-text-primary)]">{formatInlineText(match[1])}</span>
                    </li>
                  )
                }
                return null
              })}
            </ul>
          )
        }

        // Check for numbered item with bold header spanning multiple paragraphs
        const numberedHeaderMatch = trimmed.match(/^(\d+)\.\s*\*\*(.+?)\*\*:?\s*(.*)$/s)
        if (numberedHeaderMatch) {
          const [, num, header, rest] = numberedHeaderMatch
          return (
            <div key={bIdx} className="flex gap-[8px]">
              <span className="text-[15px] font-medium text-[var(--color-text-tertiary)] w-[18px] shrink-0 text-right">{num}.</span>
              <div className="flex-1">
                <span className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-[1.5]">{header}</span>
                {rest && <p className="text-[15px] leading-[1.65] text-[var(--color-text-secondary)] mt-[2px]">{formatInlineText(rest.trim())}</p>}
              </div>
            </div>
          )
        }

        // Regular paragraph with inline formatting
        return (
          <p key={bIdx} className="text-[15px] leading-[1.7] text-[var(--color-text-primary)]">
            {formatInlineText(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

interface ChatMessageProps {
  message: Message
  onCitationClick: (c: RagCitation) => void
  onRetry?: () => void
  isStreaming?: boolean
}

function ChatMessage({ message, onCitationClick, onRetry, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user"

  // User message - refined dark bubble, right aligned
  // Reduced heaviness: smaller padding, tighter radius, max 78% width
  if (isUser) {
    return (
      <div className="flex justify-end pl-[40px]">
        <div className="max-w-[78%] rounded-[20px] bg-[var(--color-text-primary)] px-[14px] py-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
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
      <div className="flex justify-start pr-[40px]">
        <div className="max-w-full">
          <div className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-destructive)]/20 px-[14px] py-[12px]">
            <div className="flex items-start gap-[10px]">
              <AlertCircle className="h-[16px] w-[16px] text-[var(--color-destructive)] shrink-0 mt-[1px]" />
              <div className="flex-1">
                <p className="text-[15px] leading-[1.5] text-[var(--color-text-primary)] mb-[12px]">
                  {message.content}
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    aria-label="Retry sending message"
                    className="inline-flex items-center gap-[6px] rounded-full bg-[var(--color-fill-tertiary)] px-[14px] py-[8px] text-[13px] font-medium text-[var(--color-text-primary)] transition-all active:scale-[0.97] active:bg-[var(--color-fill-secondary)] min-h-[44px]"
                  >
                    <RotateCcw className="h-[13px] w-[13px]" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Assistant message - flush on background (ChatGPT-style Option A)
  // Clean typography, no bubble, perfect spacing
  return (
    <div className="w-full pr-[24px]">
      {/* Answer text with improved typography */}
      <div className="text-[var(--color-text-primary)]">
        <FormattedResponse content={message.content || (isStreaming ? "" : "...")} />
        {isStreaming && (
          <span className="inline-block w-[2px] h-[15px] bg-[var(--color-accent)] ml-[2px] align-middle animate-pulse rounded-full" />
        )}
      </div>

      {/* Key Takeaways - subtle bullet list */}
      {!isStreaming && message.takeaways && message.takeaways.length > 0 && (
        <div className="mt-[16px] pt-[12px] border-t border-[var(--color-separator)]">
          <ul className="space-y-[6px]">
            {message.takeaways.map((takeaway, idx) => (
              <li key={idx} className="flex gap-[10px] items-start text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-accent)] text-[6px] mt-[6px] shrink-0">●</span>
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources Section - clean cards with clear hierarchy */}
      {!isStreaming && message.citations && message.citations.length > 0 && (
        <div className="mt-[18px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--color-text-tertiary)] mb-[10px]">
            Sources
          </p>
          <div className="space-y-[8px]">
            {message.citations.map((citation) => (
              <SourceCard key={citation.articleId} citation={citation} onClick={onCitationClick} />
            ))}
          </div>
        </div>
      )}


    </div>
  )
}

/**
 * Source Card - Compact tappable article card with clear hierarchy
 * Improved: Better density, cleaner visual weight, proper tap target
 */
function SourceCard({ citation, onClick }: { citation: RagCitation; onClick: (c: RagCitation) => void }) {
  // Format date for display
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
      onClick={() => {
        hapticLight()
        onClick(citation)
      }}
      aria-label={`View article: ${citation.title}`}
      className="group w-full text-left flex items-start gap-[12px] rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-separator)] p-[12px] transition-all duration-150 active:scale-[0.98] active:bg-[var(--color-fill-quaternary)] min-h-[52px]"
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Article title - 15px semibold, line-clamp 2 */}
        <p className="text-[14px] font-medium text-[var(--color-text-primary)] leading-[1.4] line-clamp-2 mb-[3px]">
          {citation.title}
        </p>
        {/* Source + date row */}
        <div className="flex items-center gap-[6px]">
          <span className="text-[12px] font-medium text-[var(--color-text-secondary)] truncate">{citation.sourceName}</span>
          <span className="text-[10px] text-[var(--color-text-quaternary)]">·</span>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">{formatDate(citation.publishedAt)}</span>
        </div>
      </div>
      {/* External link icon - aligned right, 44px tap target implied by row height */}
      <div className="shrink-0 flex items-center justify-center w-[24px] h-[24px] rounded-full bg-[var(--color-fill-quaternary)] group-active:bg-[var(--color-fill-tertiary)] mt-[2px]">
        <ExternalLink className="h-[12px] w-[12px] text-[var(--color-text-tertiary)]" strokeWidth={2} />
      </div>
    </button>
  )
}

/**
 * Typing indicator - subtle bouncing dots
 */
function TypingIndicator() {
  return (
    <div className="flex justify-start pl-[2px]">
      <div className="flex items-center gap-[5px] py-[8px]">
        <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-text-tertiary)]/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-text-tertiary)]/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-text-tertiary)]/60 animate-bounce" />
      </div>
    </div>
  )
}

