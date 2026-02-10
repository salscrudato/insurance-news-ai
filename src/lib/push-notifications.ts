/**
 * Push Notifications Service
 *
 * Handles FCM registration for both web (Firebase Messaging) and iOS (Capacitor Push Notifications).
 * Stores device tokens under users/{uid}/pushTokens/{token}
 */

import { Capacitor } from "@capacitor/core"
import { PushNotifications, type Token } from "@capacitor/push-notifications"
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging"
import { doc, setDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { app, db } from "@/lib/firebase"

// VAPID key for web push (you need to generate this in Firebase Console > Cloud Messaging)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ""

export interface PushToken {
  token: string
  platform: "ios" | "web"
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Check if push notifications are supported on the current platform
 */
export async function isPushSupported(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    return true // iOS native always supports push
  }
  // Check web push support - requires VAPID key to be configured
  if (!VAPID_KEY) {
    return false
  }
  return await isSupported()
}

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<"granted" | "denied" | "default"> {
  if (Capacitor.isNativePlatform()) {
    const result = await PushNotifications.requestPermissions()
    return result.receive === "granted" ? "granted" : "denied"
  }

  // Web permission
  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Register for push notifications and store the token
 */
export async function registerPushToken(uid: string): Promise<string | null> {
  try {
    const permission = await requestPushPermission()
    if (permission !== "granted") {
      return null
    }

    if (Capacitor.isNativePlatform()) {
      return await registerNativePush(uid)
    } else {
      return await registerWebPush(uid)
    }
  } catch {
    return null
  }
}

/**
 * Register native (iOS) push notifications via Capacitor
 */
async function registerNativePush(uid: string): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false
    const safeResolve = (value: string | null) => {
      if (!resolved) {
        resolved = true
        resolve(value)
      }
    }

    // Listen for registration success
    PushNotifications.addListener("registration", async (token: Token) => {
      try {
        await storePushToken(uid, token.value, "ios")
      } catch {
        // Token storage failed but we still have the token
      }
      safeResolve(token.value)
    })

    // Listen for registration errors
    PushNotifications.addListener("registrationError", () => {
      safeResolve(null)
    })

    // Register with APNS
    PushNotifications.register().catch(() => {
      safeResolve(null)
    })
  })
}

/** Track whether we've already set up the foreground message listener */
let webMessageListenerRegistered = false

/**
 * Register web push notifications via Firebase Messaging
 */
async function registerWebPush(uid: string): Promise<string | null> {
  // Skip web push if VAPID key is not configured
  if (!VAPID_KEY) {
    return null
  }

  try {
    const messaging = getMessaging(app)
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })

    if (token) {
      await storePushToken(uid, token, "web")

      // Listen for foreground messages (only register once to prevent memory leak)
      if (!webMessageListenerRegistered) {
        webMessageListenerRegistered = true
        onMessage(messaging, (payload) => {
          // Show notification manually for foreground
          if (payload.notification) {
            try {
              new Notification(payload.notification.title || "The Brief", {
                body: payload.notification.body,
                icon: "/pwa-192x192.png",
              })
            } catch {
              // Notification API may throw if permission was revoked
            }
          }
        })
      }

      return token
    }
    return null
  } catch {
    return null
  }
}

/**
 * Store push token in Firestore
 */
async function storePushToken(
  uid: string,
  token: string,
  platform: "ios" | "web"
): Promise<void> {
  const tokenRef = doc(db, "users", uid, "pushTokens", token)
  await setDoc(tokenRef, {
    token,
    platform,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Remove a push token from Firestore
 */
export async function removePushToken(uid: string, token: string): Promise<void> {
  const tokenRef = doc(db, "users", uid, "pushTokens", token)
  await deleteDoc(tokenRef)
}

/**
 * Unregister from push notifications
 */
export async function unregisterPush(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await PushNotifications.removeAllListeners()
  }
}

