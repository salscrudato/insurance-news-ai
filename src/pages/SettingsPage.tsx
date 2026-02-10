import { Switch } from "@/components/ui/switch"
import { SectionLabel, SectionFooter, Card, Separator } from "@/components/ui"
import { ChevronRight, Bell, Tag, TextCursor, Info, FileText, Shield } from "lucide-react"
import {
  useUserPreferences,
  useToggleNotifications,
  usePushNotifications,
} from "@/lib/hooks"
import { hapticLight, hapticSuccess } from "@/lib/haptics"

export function SettingsPage() {
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

  return (
    <div className="space-y-[24px] pb-[20px]">
      {/* Notifications Section */}
      <section className="space-y-[6px]">
        <SectionLabel inset>Notifications</SectionLabel>
        <Card variant="grouped">
          {/* Daily Brief row */}
          <div className="flex min-h-[44px] items-center px-[16px] py-[8px]">
            <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] bg-[#FF3B30]">
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
            <span className="font-medium">Settings → P&C Brief → Notifications</span>.
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
          {/* Topics row - disabled */}
          <div className="flex min-h-[44px] items-center px-[16px] py-[8px]">
            <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] bg-[#5856D6] opacity-50">
              <Tag className="h-[17px] w-[17px] text-white" strokeWidth={1.75} />
            </div>
            <span className="ml-[12px] flex-1 text-[17px] leading-[22px] text-[var(--color-text-tertiary)]">
              Topics
            </span>
            <span className="mr-[6px] text-[15px] text-[var(--color-text-tertiary)]">
              Coming Soon
            </span>
            <ChevronRight className="h-[14px] w-[14px] text-[var(--color-text-tertiary)]" strokeWidth={2} />
          </div>
          <Separator variant="inset-icon" />
          {/* Reading row - disabled */}
          <div className="flex min-h-[44px] items-center px-[16px] py-[8px]">
            <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[6px] bg-[#007AFF] opacity-50">
              <TextCursor className="h-[17px] w-[17px] text-white" strokeWidth={1.75} />
            </div>
            <span className="ml-[12px] flex-1 text-[17px] leading-[22px] text-[var(--color-text-tertiary)]">
              Reading
            </span>
            <span className="mr-[6px] text-[15px] text-[var(--color-text-tertiary)]">
              Coming Soon
            </span>
            <ChevronRight className="h-[14px] w-[14px] text-[var(--color-text-tertiary)]" strokeWidth={2} />
          </div>
        </Card>
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
            onClick={() => hapticLight()}
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
            onClick={() => hapticLight()}
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
            className="flex min-h-[44px] w-full items-center justify-center text-[17px] text-[var(--color-destructive)] transition-colors active:bg-[var(--color-fill-quaternary)]"
            onClick={() => hapticLight()}
          >
            Sign Out
          </button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="pt-[8px] text-center">
        <p className="text-[13px] text-[var(--color-text-tertiary)]">
          P&C Brief
        </p>
      </footer>
    </div>
  )
}

