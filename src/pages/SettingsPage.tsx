import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Switch } from "@/components/ui/switch"
import { SectionLabel, SectionFooter, Card, Separator } from "@/components/ui"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ChevronRight, Bell, Tag, TextCursor, Info, FileText, Shield, LogOut } from "lucide-react"
import {
  useUserPreferences,
  useToggleNotifications,
  usePushNotifications,
} from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/haptics"

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
      // Navigate to auth page after sign out
      navigate("/auth", { replace: true })
    } catch (error) {
      console.error("Sign out failed:", error)
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="space-y-[24px] pb-[20px]">
      {/* Notifications Section */}
      <section className="space-y-[6px]">
        <SectionLabel inset>Notifications</SectionLabel>
        <Card variant="grouped">
          {/* Daily Brief row */}
          <div className="flex min-h-[44px] items-center px-[16px] py-[8px]">
            <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-destructive)]">
              <Bell className="h-[17px] w-[17px] text-white" strokeWidth={1.75} />
            </div>
            <span className="ml-[12px] flex-1 text-[17px] leading-[22px] text-[var(--color-text-primary)]">
              Daily Brief
            </span>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleNotificationToggle}
              disabled={
                prefsLoading ||
                pushLoading ||
                toggleNotifications.isPending ||
                !canEnableNotifications
              }
            />
          </div>
        </Card>
        {permissionStatus === "denied" ? (
          <SectionFooter inset>
            Notifications are turned off. To enable, go to{" "}
            <span className="font-medium">Settings → The Brief → Notifications</span>.
          </SectionFooter>
        ) : !pushSupported && !pushLoading ? (
          <SectionFooter inset>
            Push notifications aren't available on this device.
          </SectionFooter>
        ) : (
          <SectionFooter inset>
            Get a notification each morning when your brief is ready.
          </SectionFooter>
        )}
      </section>

      {/* Preferences Section */}
      <section className="space-y-[6px]">
        <SectionLabel inset>Preferences</SectionLabel>
        <Card variant="grouped">
          {/* Topics row - disabled with explanatory text */}
          <div className="flex min-h-[52px] items-center px-[16px] py-[10px] opacity-60">
            <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-indigo)]">
              <Tag className="h-[17px] w-[17px] text-white" strokeWidth={1.75} />
            </div>
            <div className="ml-[12px] flex-1 min-w-0">
              <span className="block text-[17px] leading-[22px] text-[var(--color-text-primary)]">
                Topics
              </span>
              <span className="block text-[13px] leading-[18px] text-[var(--color-text-tertiary)]">
                Customize your feed — coming soon
              </span>
            </div>
          </div>
          <Separator variant="inset-icon" />
          {/* Reading row - disabled with explanatory text */}
          <div className="flex min-h-[52px] items-center px-[16px] py-[10px] opacity-60">
            <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-accent)]">
              <TextCursor className="h-[17px] w-[17px] text-white" strokeWidth={1.75} />
            </div>
            <div className="ml-[12px] flex-1 min-w-0">
              <span className="block text-[17px] leading-[22px] text-[var(--color-text-primary)]">
                Reading
              </span>
              <span className="block text-[13px] leading-[18px] text-[var(--color-text-tertiary)]">
                Text size & display — coming soon
              </span>
            </div>
          </div>
        </Card>
        <SectionFooter inset>
          More customization options are on the way.
        </SectionFooter>
      </section>

      {/* About Section */}
      <section className="space-y-[6px]">
        <SectionLabel inset>About</SectionLabel>
        <Card variant="grouped">
          {/* Version row */}
          <div className="flex min-h-[44px] items-center px-[16px] py-[8px]">
            <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-fill-secondary)]">
              <Info className="h-[17px] w-[17px] text-[var(--color-text-secondary)]" strokeWidth={1.75} />
            </div>
            <span className="ml-[12px] flex-1 text-[17px] leading-[22px] text-[var(--color-text-primary)]">
              Version
            </span>
            <span className="text-[17px] text-[var(--color-text-tertiary)]">
              1.0.0
            </span>
          </div>
          <Separator variant="inset-icon" />
          {/* Terms of Service row */}
          <button
            className="flex min-h-[44px] w-full items-center px-[16px] py-[8px] text-left transition-colors active:bg-[var(--color-fill-quaternary)]"
            onClick={() => {
              hapticLight()
              navigate("/terms")
            }}
          >
            <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-fill-secondary)]">
              <FileText className="h-[17px] w-[17px] text-[var(--color-text-secondary)]" strokeWidth={1.75} />
            </div>
            <span className="ml-[12px] flex-1 text-[17px] leading-[22px] text-[var(--color-text-primary)]">
              Terms of Service
            </span>
            <ChevronRight className="h-[14px] w-[14px] text-[var(--color-text-tertiary)]" strokeWidth={2} />
          </button>
          <Separator variant="inset-icon" />
          {/* Privacy Policy row */}
          <button
            className="flex min-h-[44px] w-full items-center px-[16px] py-[8px] text-left transition-colors active:bg-[var(--color-fill-quaternary)]"
            onClick={() => {
              hapticLight()
              navigate("/privacy")
            }}
          >
            <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-fill-secondary)]">
              <Shield className="h-[17px] w-[17px] text-[var(--color-text-secondary)]" strokeWidth={1.75} />
            </div>
            <span className="ml-[12px] flex-1 text-[17px] leading-[22px] text-[var(--color-text-primary)]">
              Privacy Policy
            </span>
            <ChevronRight className="h-[14px] w-[14px] text-[var(--color-text-tertiary)]" strokeWidth={2} />
          </button>
        </Card>
      </section>

      {/* Sign Out */}
      <section className="pt-[8px]">
        <Card variant="grouped">
          <button
            className="flex min-h-[44px] w-full items-center justify-center gap-[8px] text-[17px] text-[var(--color-destructive)] transition-colors active:bg-[var(--color-fill-quaternary)]"
            onClick={handleSignOutClick}
          >
            <LogOut className="h-[17px] w-[17px]" strokeWidth={1.75} />
            Sign Out
          </button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="pt-[8px] text-center">
        <p className="text-[13px] text-[var(--color-text-tertiary)]">
          The Brief
        </p>
      </footer>

      {/* Sign Out Confirmation Sheet */}
      <Sheet open={showSignOutSheet} onOpenChange={setShowSignOutSheet}>
        <SheetContent side="bottom" className="rounded-t-[20px] px-[20px] pb-[calc(20px+env(safe-area-inset-bottom))]">
          <SheetHeader className="pb-[20px] pt-[4px]">
            <SheetTitle className="text-[22px] font-bold tracking-[-0.4px] text-center">
              Sign Out?
            </SheetTitle>
            <SheetDescription className="text-[15px] leading-[1.45] tracking-[-0.16px] text-center text-[var(--color-text-secondary)] mt-[6px]">
              {isAnonymous
                ? "You're signed in as a guest. Your reading history will be cleared."
                : "Your bookmarks and preferences will be synced to your account and restored when you sign back in."
              }
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-[12px]">
            <button
              onClick={handleSignOutConfirm}
              disabled={isSigningOut}
              className="w-full rounded-[14px] bg-[var(--color-destructive)] py-[16px] text-[17px] font-semibold text-white shadow-[0_2px_8px_rgba(255,59,48,0.25)] transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {isSigningOut ? "Signing Out..." : "Sign Out"}
            </button>
            <button
              onClick={() => {
                hapticLight()
                setShowSignOutSheet(false)
              }}
              disabled={isSigningOut}
              className="w-full rounded-[14px] bg-[var(--color-fill-tertiary)] py-[16px] text-[17px] font-semibold text-[var(--color-text-primary)] transition-all active:scale-[0.97] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

