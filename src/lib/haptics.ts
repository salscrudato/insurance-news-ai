/**
 * iOS Haptic Feedback Utility
 * 
 * Provides haptic feedback on iOS devices. Gracefully no-ops on web.
 */

import { Capacitor } from "@capacitor/core"
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics"

const isNative = Capacitor.isNativePlatform()

/**
 * Light impact - for subtle UI feedback (toggles, selections)
 */
export async function hapticLight(): Promise<void> {
  if (!isNative) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Silently ignore errors
  }
}

/**
 * Medium impact - for button presses, card taps
 */
export async function hapticMedium(): Promise<void> {
  if (!isNative) return
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {
    // Silently ignore errors
  }
}

/**
 * Heavy impact - for significant actions
 */
export async function hapticHeavy(): Promise<void> {
  if (!isNative) return
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch {
    // Silently ignore errors
  }
}

/**
 * Selection changed - for picker/segment changes
 */
export async function hapticSelection(): Promise<void> {
  if (!isNative) return
  try {
    await Haptics.selectionChanged()
  } catch {
    // Silently ignore errors
  }
}

/**
 * Success notification - for successful actions
 */
export async function hapticSuccess(): Promise<void> {
  if (!isNative) return
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    // Silently ignore errors
  }
}

/**
 * Warning notification - for warnings
 */
export async function hapticWarning(): Promise<void> {
  if (!isNative) return
  try {
    await Haptics.notification({ type: NotificationType.Warning })
  } catch {
    // Silently ignore errors
  }
}

/**
 * Error notification - for errors
 */
export async function hapticError(): Promise<void> {
  if (!isNative) return
  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch {
    // Silently ignore errors
  }
}

