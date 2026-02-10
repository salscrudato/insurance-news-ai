/**
 * Lightweight Analytics Utility
 * 
 * Simple event tracking for key user actions.
 * Uses Firebase Analytics when available, falls back to console.log in dev.
 */

// Event names for Ask AI feature
export type AskAnalyticsEvent =
  | "ask_sent"
  | "ask_answered"
  | "ask_no_coverage"
  | "citation_opened"
  | "follow_up_clicked"

// Event parameters
export interface AskEventParams {
  scope?: string
  source_filter?: string
  source_count?: number
  article_id?: string
  has_citations?: boolean
  response_time_ms?: number
}

// Simple in-memory debounce for duplicate events
const recentEvents = new Map<string, number>()
const DEBOUNCE_MS = 1000

/**
 * Track an analytics event
 * 
 * In production, this would send to Firebase Analytics.
 * For now, we log to console in dev and store basic metrics.
 */
export function trackEvent(
  event: AskAnalyticsEvent,
  params?: AskEventParams
): void {
  try {
    // Create a key for debouncing
    const eventKey = `${event}_${JSON.stringify(params || {})}`
    const now = Date.now()
    const lastTime = recentEvents.get(eventKey)
    
    // Skip if same event was fired recently
    if (lastTime && now - lastTime < DEBOUNCE_MS) {
      return
    }
    
    recentEvents.set(eventKey, now)
    
    // Clean old entries periodically
    if (recentEvents.size > 100) {
      const cutoff = now - DEBOUNCE_MS * 10
      for (const [key, time] of recentEvents.entries()) {
        if (time < cutoff) recentEvents.delete(key)
      }
    }

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${event}`, params || {})
    }

    // TODO: In production, send to Firebase Analytics
    // import { getAnalytics, logEvent } from "firebase/analytics"
    // const analytics = getAnalytics()
    // logEvent(analytics, event, params)
    
    // For now, store basic metrics in localStorage for debugging
    try {
      const metricsKey = "pcbrief_analytics"
      const metrics = JSON.parse(localStorage.getItem(metricsKey) || "{}")
      metrics[event] = (metrics[event] || 0) + 1
      metrics.lastEvent = { event, params, timestamp: new Date().toISOString() }
      localStorage.setItem(metricsKey, JSON.stringify(metrics))
    } catch {
      // Silently ignore storage errors
    }
  } catch {
    // Analytics should never break the app
  }
}

/**
 * Get analytics summary (for debugging)
 */
export function getAnalyticsSummary(): Record<string, unknown> {
  try {
    const metricsKey = "pcbrief_analytics"
    return JSON.parse(localStorage.getItem(metricsKey) || "{}")
  } catch {
    return {}
  }
}

