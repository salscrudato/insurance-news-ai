import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

const settingsSections = [
  {
    title: "Account",
    items: [
      { label: "Profile", description: "Manage your account details" },
      { label: "Notifications", description: "Configure alerts and updates" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { label: "Topics", description: "Customize your news feed" },
      { label: "Reading", description: "Text size and display options" },
    ],
  },
  {
    title: "About",
    items: [
      { label: "Version", description: "1.0.0" },
      { label: "Terms of Service", description: "Legal information" },
      { label: "Privacy Policy", description: "How we handle your data" },
    ],
  },
]

export function SettingsPage() {
  return (
    <div className="space-y-[var(--spacing-lg)]">
      <section className="space-y-2">
        <p className="text-[var(--color-text-secondary)]">
          App preferences and account settings
        </p>
      </section>

      <div className="space-y-[var(--spacing-lg)]">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-[var(--spacing-sm)] px-1 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              {section.title}
            </h2>
            <Card>
              <CardContent className="p-0">
                {section.items.map((item, index) => (
                  <div key={item.label}>
                    <button className="flex w-full items-center justify-between px-[var(--spacing-md)] py-3 text-left transition-colors hover:bg-[var(--color-surface)]">
                      <div>
                        <p className="text-[17px] font-medium text-[var(--color-text-primary)]">
                          {item.label}
                        </p>
                        <p className="text-[13px] text-[var(--color-text-secondary)]">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                    </button>
                    {index < section.items.length - 1 && (
                      <Separator className="ml-[var(--spacing-md)]" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <div className="pt-[var(--spacing-md)]">
        <Button variant="destructive" className="w-full">
          Sign Out
        </Button>
      </div>
    </div>
  )
}

