/**
 * Push Notifications Service
 *
 * Handles sending FCM notifications to users with registered push tokens.
 * Batches notifications for efficiency and handles token cleanup.
 */

import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Lazy initialization to avoid calling before Firebase is initialized
let _db: Firestore | null = null;
let _messaging: Messaging | null = null;

function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore();
  }
  return _db;
}

function getMessagingInstance(): Messaging {
  if (!_messaging) {
    _messaging = getMessaging();
  }
  return _messaging;
}

// Maximum tokens per multicast message (FCM limit is 500)
const BATCH_SIZE = 500;

interface PushToken {
  token: string;
  platform: "ios" | "web";
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Get all push tokens for users who have daily brief notifications enabled
 */
async function getOptedInTokens(): Promise<{ uid: string; tokens: PushToken[] }[]> {
  const usersWithTokens: { uid: string; tokens: PushToken[] }[] = [];

  // Get all users who have dailyBrief notifications enabled
  const usersSnap = await getDb().collectionGroup("prefs").get();

  for (const prefDoc of usersSnap.docs) {
    const prefs = prefDoc.data();

    // Check if daily brief notifications are enabled (default is true)
    const dailyBriefEnabled = prefs.notifications?.dailyBrief !== false;

    if (!dailyBriefEnabled) {
      continue;
    }

    // Get the user ID from the path: users/{uid}/prefs/main
    const uid = prefDoc.ref.parent.parent?.id;
    if (!uid) continue;

    // Get all push tokens for this user
    const tokensSnap = await getDb().collection(`users/${uid}/pushTokens`).get();

    if (!tokensSnap.empty) {
      const tokens = tokensSnap.docs.map((doc) => ({
        token: doc.data().token as string,
        platform: doc.data().platform as "ios" | "web",
      }));
      usersWithTokens.push({ uid, tokens });
    }
  }

  return usersWithTokens;
}

/**
 * Send a notification to all opted-in users
 * Batches tokens for efficient sending and cleans up invalid tokens
 */
export async function sendNotificationToOptedInUsers(
  payload: NotificationPayload
): Promise<{ sent: number; failed: number; cleaned: number }> {
  console.log("[notifications] Starting notification send...");

  const usersWithTokens = await getOptedInTokens();
  const allTokens: { token: string; uid: string }[] = [];

  // Flatten all tokens with their user IDs
  for (const user of usersWithTokens) {
    for (const t of user.tokens) {
      allTokens.push({ token: t.token, uid: user.uid });
    }
  }

  console.log(`[notifications] Found ${allTokens.length} tokens from ${usersWithTokens.length} users`);

  if (allTokens.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  // Process in batches
  for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
    const batch = allTokens.slice(i, i + BATCH_SIZE);
    const tokens = batch.map((t) => t.token);

    try {
      const response = await getMessagingInstance().sendEachForMulticast({
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: "/icons/icon-192.png",
          },
        },
      });

      sent += response.successCount;
      failed += response.failureCount;

      // Clean up invalid tokens
      for (let j = 0; j < response.responses.length; j++) {
        if (!response.responses[j].success) {
          const error = response.responses[j].error;
          // Remove invalid tokens (unregistered, invalid, etc.)
          if (
            error?.code === "messaging/invalid-registration-token" ||
            error?.code === "messaging/registration-token-not-registered"
          ) {
            const { token, uid } = batch[j];
            await getDb().doc(`users/${uid}/pushTokens/${token}`).delete();
            cleaned++;
            console.log(`[notifications] Cleaned invalid token for user ${uid}`);
          }
        }
      }
    } catch (error) {
      console.error("[notifications] Batch send error:", error);
      failed += batch.length;
    }
  }

  console.log(`[notifications] Complete: ${sent} sent, ${failed} failed, ${cleaned} cleaned`);
  return { sent, failed, cleaned };
}

/**
 * Format date for notification body (e.g., "February 8")
 */
export function formatDateForNotification(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

