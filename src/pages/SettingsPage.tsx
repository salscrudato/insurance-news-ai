/**
 * Settings Page - iOS Settings-style grouped list
 * Apple HIG 2026 with refined typography, spacing, and interaction polish
 */

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Switch } from "@/components/ui/switch"
import {
  SectionLabel,
  SectionFooter,
  Card,
  Separator,
  ListRow,
  ListRowIcon,
  ListRowContent,
  ListRowLabel,
  ListRowDescription,
  ListRowValue,
} from "@/components/ui"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Bell, Tag, TextCursor, Info, FileText, Shield, Trash2, Loader2 } from "lucide-react"
import {
  useUserPreferences,
  useToggleNotifications,
  usePushNotifications,
} from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { toast } from "sonner"

// iOS system colors for icon chips
const ICON_COLORS = {
  red: "#FF3B30",
  blue: "#007AFF",
  indigo: "#5856D6",
  gray: undefined, // uses ListRowIcon default (fill-secondary)
} as const

// Callable to delete account and all associated data
const deleteAccountCallable = httpsCallable<void, { success: boolean }>(
  functions,
  "deleteAccount"
)

export function SettingsPage() {
  const navigate = useNavigate()
  const { signOut, isAnonymous, user } = useAuth()
  const [showSignOutSheet, setShowSignOutSheet] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showDeleteSheet, setShowDeleteSheet] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: prefs, isLoading: prefsLoading } = useUserPreferences()
  const toggleNotifications = useToggleNotifications()
  const {
    isSupported: pushSupported,
    isLoading: pushLoading,
    permissionStatus,
    enableNotifications,
  } = usePushNotifications()

  const notificationsEnabled = prefs?.notifications?.dailyBrief ?? true
  const canEnableNotifications = pushSupported && permissionStatus !== "denied"

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked && permissionStatus !== "granted") {
      const success = await enableNotifications()
      if (!success) return
    }
    toggleNotifications.mutate({ dailyBrief: checked })
  }

  const handleSignOutClick = () => {
    setShowSignOutSheet(true)
  }

  const handleSignOutConfirm = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      setShowSignOutSheet(false)
      navigate("/auth", { replace: true })
    } catch (error) {
      console.error("Sign out failed:", error)
    } finally {
      setIsSigningOut(false)
    }
  }

  // Delete Account
  const handleDeleteAccountClick = () => {
    setShowDeleteSheet(true)
  }

  const handleDeleteAccountConfirm = async () => {
    setIsDeleting(true)
    try {
      await deleteAccountCallable()
      toast.success("Account deleted", {
        description: "Your account and all associated data have been permanently removed.",
      })
      setShowDeleteSheet(false)

      // The callable already deleted the Firebase Auth user server-side.
      // Calling signOut() would try to talk to the native Firebase SDK with
      // an already-invalidated token, which hangs on iOS.
      // Instead, sign out defensively: swallow errors since the auth user is
      // already gone and we just need to clear local state.
      try {
        await signOut()
      } catch {
        // Expected — the server already deleted the auth user, so the
        // native/web SDK sign-out may fail. That's fine.
        console.log("[DeleteAccount] signOut after deletion failed (expected)")
      }

      navigate("/auth", { replace: true })
    } catch (error) {
      console.error("Account deletion failed:", error)
      toast.error("Deletion failed", {
        description: "Something went wrong. Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Only show delete account for authenticated (non-local-guest) users with a Firebase account
  const showDeleteAccount = !!user

  return (
    <div className="space-y-[28px] pb-[20px]">
      {/* ============================================================ */}
      {/* Notifications                                                 */}
      {/* ============================================================ */}
      <section className="space-y-[7px]">
        <SectionLabel inset>Notifications</SectionLabel>
        <Card variant="grouped">
          <ListRow variant="compact">
            <ListRowIcon color={ICON_COLORS.red}>
              <Bell strokeWidth={1.75} />
            </ListRowIcon>
            <ListRowContent>
              <ListRowLabel>Daily Brief</ListRowLabel>
            </ListRowContent>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleNotificationToggle}
              disabled={
                prefsLoading ||
                pushLoading ||
                toggleNotifications.isPending ||
                !canEnableNotifications
              }
              aria-label="Toggle daily brief notifications"
            />
          </ListRow>
        </Card>
        <SectionFooter inset>
          {permissionStatus === "denied"
            ? <>Notifications are blocked for this app. Open <span className="font-medium text-[var(--color-text-secondary)]">Settings → The Brief</span> on your device to allow them.</>
            : !pushSupported && !pushLoading
              ? "Push notifications aren\u2019t available on this device."
              : "Receive a notification each morning when your daily brief is ready."
          }
        </SectionFooter>
      </section>

      {/* ============================================================ */}
      {/* Preferences                                                   */}
      {/* ============================================================ */}
      <section className="space-y-[7px]">
        <SectionLabel inset>Preferences</SectionLabel>
        <Card variant="grouped">
          {/* Topics - coming soon */}
          <ListRow variant="compact">
            <ListRowIcon color={ICON_COLORS.indigo} disabled>
              <Tag strokeWidth={1.75} />
            </ListRowIcon>
            <ListRowContent>
              <ListRowLabel disabled>Topics</ListRowLabel>
              <ListRowDescription className="text-[13px] text-[var(--color-text-quaternary)]">
                Coming soon
              </ListRowDescription>
            </ListRowContent>
          </ListRow>
          <Separator variant="inset-icon" />
          {/* Reading - coming soon */}
          <ListRow variant="compact">
            <ListRowIcon color={ICON_COLORS.blue} disabled>
              <TextCursor strokeWidth={1.75} />
            </ListRowIcon>
            <ListRowContent>
              <ListRowLabel disabled>Reading</ListRowLabel>
              <ListRowDescription className="text-[13px] text-[var(--color-text-quaternary)]">
                Coming soon
              </ListRowDescription>
            </ListRowContent>
          </ListRow>
        </Card>
        <SectionFooter inset>
          More customization options are on the way.
        </SectionFooter>
      </section>

      {/* ============================================================ */}
      {/* About                                                         */}
      {/* ============================================================ */}
      <section className="space-y-[7px]">
        <SectionLabel inset>About</SectionLabel>
        <Card variant="grouped">
          {/* Version */}
          <ListRow variant="compact">
            <ListRowIcon>
              <Info strokeWidth={1.75} />
            </ListRowIcon>
            <ListRowContent>
              <ListRowLabel>Version</ListRowLabel>
            </ListRowContent>
            <ListRowValue className="tabular-nums">1.0.0</ListRowValue>
          </ListRow>
          <Separator variant="inset-icon" />
          {/* Terms of Service */}
          <ListRow
            variant="compact"
            interactive
            hasChevron
            onClick={() => navigate("/terms")}
            aria-label="Terms of Service"
          >
            <ListRowIcon>
              <FileText strokeWidth={1.75} />
            </ListRowIcon>
            <ListRowContent>
              <ListRowLabel>Terms of Service</ListRowLabel>
            </ListRowContent>
          </ListRow>
          <Separator variant="inset-icon" />
          {/* Privacy Policy */}
          <ListRow
            variant="compact"
            interactive
            hasChevron
            onClick={() => navigate("/privacy")}
            aria-label="Privacy Policy"
          >
            <ListRowIcon>
              <Shield strokeWidth={1.75} />
            </ListRowIcon>
            <ListRowContent>
              <ListRowLabel>Privacy Policy</ListRowLabel>
            </ListRowContent>
          </ListRow>
        </Card>
      </section>

      {/* ============================================================ */}
      {/* Sign Out                                                      */}
      {/* ============================================================ */}
      <section>
        <Card variant="grouped">
          <button
            onClick={handleSignOutClick}
            aria-label="Sign out"
            className="flex min-h-[44px] w-full items-center justify-center px-[16px] py-[11px] -webkit-tap-highlight-color-transparent transition-colors duration-[var(--duration-instant)] ease-[var(--ease-ios)] active:bg-[var(--color-fill-quaternary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]"
          >
            <span className="text-[17px] tracking-[-0.4px] text-[var(--color-destructive)]">
              Sign Out
            </span>
          </button>
        </Card>
      </section>

      {/* ============================================================ */}
      {/* Delete Account                                                */}
      {/* ============================================================ */}
      {showDeleteAccount && (
        <section className="space-y-[7px]">
          <Card variant="grouped">
            <ListRow
              variant="compact"
              interactive
              onClick={handleDeleteAccountClick}
              aria-label="Delete account"
            >
              <ListRowIcon color="#FF3B30">
                <Trash2 strokeWidth={1.75} />
              </ListRowIcon>
              <ListRowContent>
                <ListRowLabel className="text-[var(--color-destructive)]">Delete Account</ListRowLabel>
              </ListRowContent>
            </ListRow>
          </Card>
          <SectionFooter inset>
            Permanently delete your account and all associated data including preferences, chat history, and push notification tokens.
          </SectionFooter>
        </section>
      )}

      {/* ============================================================ */}
      {/* Footer                                                        */}
      {/* ============================================================ */}
      <footer className="pt-[4px] pb-[8px] text-center">
        <p className="text-[12px] tracking-[-0.02em] text-[var(--color-text-quaternary)]">
          The Brief · P&C Insurance News
        </p>
        <p className="mt-[2px] text-[12px] tracking-[-0.02em] text-[var(--color-text-quaternary)]">
          Made in Hackensack
        </p>
      </footer>

      {/* ============================================================ */}
      {/* Sign Out Confirmation Sheet                                   */}
      {/* ============================================================ */}
      <Sheet open={showSignOutSheet} onOpenChange={setShowSignOutSheet}>
        <SheetContent
          side="bottom"
          hideCloseButton
          className="rounded-t-[var(--radius-3xl)] px-[20px] pb-[calc(20px+var(--safe-area-inset-bottom))] pt-[8px]"
        >
          {/* Drag indicator */}
          <div className="drag-indicator mb-[20px]" />

          <SheetTitle className="text-center text-[20px] font-bold leading-[1.2] tracking-[-0.36px] text-[var(--color-text-primary)]">
            Sign Out?
          </SheetTitle>
          <SheetDescription className="mt-[8px] text-center text-[15px] leading-[1.45] tracking-[-0.2px] text-[var(--color-text-secondary)]">
            {isAnonymous
              ? "You\u2019re signed in as a guest. Your reading history and preferences will be cleared."
              : "Your preferences will be saved to your account and restored when you sign back in."
            }
          </SheetDescription>

          <div className="mt-[24px] flex flex-col gap-[10px]">
            <button
              onClick={handleSignOutConfirm}
              disabled={isSigningOut}
              className="w-full rounded-[var(--radius-xl)] bg-[var(--color-destructive)] py-[15px] text-[17px] font-semibold tracking-[-0.4px] text-white shadow-[var(--shadow-button)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.98] active:bg-[#E0342B] disabled:opacity-50"
            >
              {isSigningOut ? "Signing Out\u2026" : "Sign Out"}
            </button>
            <button
              onClick={() => setShowSignOutSheet(false)}
              disabled={isSigningOut}
              className="w-full rounded-[var(--radius-xl)] bg-[var(--color-fill-tertiary)] py-[15px] text-[17px] font-semibold tracking-[-0.4px] text-[var(--color-text-primary)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.98] active:bg-[var(--color-fill-secondary)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============================================================ */}
      {/* Delete Account Confirmation Sheet                             */}
      {/* ============================================================ */}
      <Sheet open={showDeleteSheet} onOpenChange={setShowDeleteSheet}>
        <SheetContent
          side="bottom"
          hideCloseButton
          className="rounded-t-[var(--radius-3xl)] px-[20px] pb-[calc(20px+var(--safe-area-inset-bottom))] pt-[8px]"
        >
          {/* Drag indicator */}
          <div className="drag-indicator mb-[20px]" />

          <SheetTitle className="text-center text-[20px] font-bold leading-[1.2] tracking-[-0.36px] text-[var(--color-text-primary)]">
            Delete Account?
          </SheetTitle>
          <SheetDescription className="mt-[8px] text-center text-[15px] leading-[1.45] tracking-[-0.2px] text-[var(--color-text-secondary)]">
            This action is permanent and cannot be undone. The following will be deleted:
          </SheetDescription>

          <ul className="mt-[14px] space-y-[6px] px-[4px]">
            {[
              "Your account and login credentials",
              "Notification preferences and push tokens",
              "Ask AI chat history",
              "All other associated data",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-[8px] text-[14px] leading-[1.4] tracking-[-0.15px] text-[var(--color-text-secondary)]"
              >
                <span className="mt-[4px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--color-text-quaternary)]" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-[24px] flex flex-col gap-[10px]">
            <button
              onClick={handleDeleteAccountConfirm}
              disabled={isDeleting}
              className="flex w-full items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-destructive)] py-[15px] text-[17px] font-semibold tracking-[-0.4px] text-white shadow-[var(--shadow-button)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.98] active:bg-[#E0342B] disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-[20px] w-[20px] animate-spin" />
              ) : (
                "Delete Account"
              )}
            </button>
            <button
              onClick={() => setShowDeleteSheet(false)}
              disabled={isDeleting}
              className="w-full rounded-[var(--radius-xl)] bg-[var(--color-fill-tertiary)] py-[15px] text-[17px] font-semibold tracking-[-0.4px] text-[var(--color-text-primary)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.98] active:bg-[var(--color-fill-secondary)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
