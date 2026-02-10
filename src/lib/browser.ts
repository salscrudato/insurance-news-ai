/**
 * Cross-platform browser utility
 * 
 * Uses Capacitor Browser on iOS for native in-app browser experience.
 * Falls back to window.open on web.
 */

import { Capacitor } from "@capacitor/core"
import { Browser } from "@capacitor/browser"

const isNative = Capacitor.isNativePlatform()

/**
 * Open a URL in the browser
 * 
 * On iOS: Opens in Safari View Controller (in-app browser)
 * On web: Opens in a new tab
 */
export async function openUrl(url: string): Promise<void> {
  if (!url) return

  if (isNative) {
    try {
      await Browser.open({
        url,
        presentationStyle: "popover",
        toolbarColor: "#FFFFFF",
      })
    } catch (error) {
      console.error("[Browser] Failed to open URL:", error)
      // Fallback to window.open if Capacitor fails
      window.open(url, "_blank", "noopener,noreferrer")
    }
  } else {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

/**
 * Close the in-app browser (iOS only)
 * No-op on web.
 */
export async function closeBrowser(): Promise<void> {
  if (!isNative) return

  try {
    await Browser.close()
  } catch {
    // Silently ignore errors
  }
}

