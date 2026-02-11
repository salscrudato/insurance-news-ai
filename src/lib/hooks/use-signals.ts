/**
 * Hook for fetching Industry Pulse signals from Cloud Functions
 *
 * Features:
 * - Configurable window (7D or 30D)
 * - Automatic caching via React Query
 * - Direct HTTP with callable fallback (same pattern as useTodayBrief)
 */

import { useQuery } from "@tanstack/react-query"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import type { PulseSignalsResponse } from "@/types/firestore"

// Cloud Functions endpoint URL
const FUNCTIONS_BASE_URL = "https://us-central1-insurance-news-ai.cloudfunctions.net"

// Callable function reference
const getPulseSignalsCallable = httpsCallable<
  { windowDays?: number; dateKey?: string },
  PulseSignalsResponse
>(functions, "getPulseSignals")

/**
 * Fetch signals via direct HTTP (works in Capacitor WebView)
 */
async function fetchSignalsHttp(
  windowDays: number,
  dateKey?: string
): Promise<PulseSignalsResponse> {
  const response = await fetch(`${FUNCTIONS_BASE_URL}/getPulseSignals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { windowDays, dateKey } }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const json = await response.json()
  return json.result || json
}

/**
 * Fetch signals with timeout, HTTP-first with callable fallback
 */
async function fetchSignals(
  windowDays: number,
  dateKey?: string
): Promise<PulseSignalsResponse> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Request timed out")), 15000)
  })

  try {
    return await Promise.race([
      fetchSignalsHttp(windowDays, dateKey),
      timeoutPromise,
    ])
  } catch {
    // Fallback to callable
    const result = await Promise.race([
      getPulseSignalsCallable({ windowDays, dateKey }),
      timeoutPromise,
    ])
    return result.data
  }
}

/**
 * Hook to fetch pulse signals
 *
 * @param windowDays - 7 or 30
 * @param dateKey - Optional date in yyyy-mm-dd format
 */
export function useSignals(windowDays: number = 7, dateKey?: string) {
  return useQuery({
    queryKey: ["pulseSignals", windowDays, dateKey ?? "today"],
    queryFn: () => fetchSignals(windowDays, dateKey),
    staleTime: 1000 * 60 * 10, // 10 minutes (signals don't change often)
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  })
}
