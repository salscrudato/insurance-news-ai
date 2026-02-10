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
import { Bell, Tag, TextCursor, Info, FileText, Shield } from "lucide-react"
import {
  useUserPreferences,
  useToggleNotifications,
  usePushNotifications,
} from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/haptics"

// iOS system colors for icon chips
const ICON_COLORS = {
  red: "#FF3B30",
  blue: "#007AFF",
  indigo: "#5856D6",
  gray: undefined, // uses ListRowIcon default (fill-secondary)
} as const

export function SettingsPage() {
  const navigate = useNavigate()
  const { signOut, isAnonymous } = useAuth()
  const [showSignOutSheet, setShowSignOutSheet] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

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
    hapticLight()

    if (checked && permissionStatus !== "granted") {
      const success = await enableNotifications()
      if (success) {
        hapticSuccess()
      }
      if (!success) return
    }
    toggleNotifications.mutate({ dailyBrief: checked })
  }

  const handleSignOutClick = () => {
    hapticWarning()
    setShowSignOutSheet(true)
  }

  const handleSignOutConfirm = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      setShowSignOutSheet(false)
      hapticSuccess()
      navigate("/auth", { replace: true })
    } catch (error) {
      console.error("Sign out failed:", error)
    } finally {
      setIsSigningOut(false)
    }
  }

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
            onClick={() => {
              hapticLight()
              navigate("/terms")
            }}
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
            onClick={() => {
              hapticLight()
              navigate("/privacy")
            }}
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
              : "Your bookmarks and preferences will be saved to your account and restored when you sign back in."
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
              onClick={() => {
                hapticLight()
                setShowSignOutSheet(false)
              }}
              disabled={isSigningOut}
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
