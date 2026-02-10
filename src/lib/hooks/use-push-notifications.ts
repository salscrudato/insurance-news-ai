/**
 * Hook for managing push notifications
 */

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useUserPreferences } from "@/lib/hooks/use-user-preferences"
import {
  isPushSupported,
  registerPushToken,
  unregisterPush,
} from "@/lib/push-notifications"

interface UsePushNotificationsResult {
  /** Whether push is supported on this platform */
  isSupported: boolean
  /** Whether we're loading the support check */
  isLoading: boolean
  /** Current permission status */
  permissionStatus: NotificationPermission | "unknown"
  /** Whether notifications are enabled in user preferences */
  isEnabled: boolean
  /** Register for push notifications */
  enableNotifications: () => Promise<boolean>
  /** Current push token (if registered) */
  pushToken: string | null
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { user } = useAuth()
  const { data: prefs } = useUserPreferences()

  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unknown">("unknown")
  const [pushToken, setPushToken] = useState<string | null>(null)

  // Check support on mount
  useEffect(() => {
    async function checkSupport() {
      const supported = await isPushSupported()
      setIsSupported(supported)
      setIsLoading(false)

      // Check current permission status
      if (supported && "Notification" in window) {
        setPermissionStatus(Notification.permission)
      }
    }
    checkSupport()
  }, [])

  // Auto-register if user has notifications enabled
  useEffect(() => {
    async function autoRegister() {
      if (
        user &&
        isSupported &&
        prefs?.notifications?.dailyBrief &&
        permissionStatus === "granted" &&
        !pushToken
      ) {
        const token = await registerPushToken(user.uid)
        if (token) {
          setPushToken(token)
        }
      }
    }
    autoRegister()
  }, [user, isSupported, prefs?.notifications?.dailyBrief, permissionStatus, pushToken])

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!user || !isSupported) return false

    const token = await registerPushToken(user.uid)
    if (token) {
      setPushToken(token)
      setPermissionStatus("granted")
      return true
    }
    setPermissionStatus("denied")
    return false
  }, [user, isSupported])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unregisterPush()
    }
  }, [])

  return {
    isSupported,
    isLoading,
    permissionStatus,
    isEnabled: prefs?.notifications?.dailyBrief ?? true,
    enableNotifications,
    pushToken,
  }
}

