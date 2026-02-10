import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { Newspaper, LayoutList, Globe, Bookmark, Settings, ChevronRight, type LucideIcon } from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Card, Separator } from "@/components/ui"
import { useState, createContext, useContext } from "react"
import { hapticMedium } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import { TopNav, MenuButton } from "@/components/layout"
import { useLargeTitle } from "@/lib/hooks"

// Context to share large title state with child pages
interface LargeTitleContextValue {
  titleRef: React.RefObject<HTMLDivElement | null>
  isVisible: boolean
}

const LargeTitleContext = createContext<LargeTitleContextValue | null>(null)

export function useLargeTitleContext() {
  const context = useContext(LargeTitleContext)
  if (!context) {
    throw new Error("useLargeTitleContext must be used within MainLayout")
  }
  return context
}

interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  iconBg: string
  description?: string
}

const primaryNavItems: NavItem[] = [
  { path: "/", label: "Today", icon: Newspaper, iconBg: "#007AFF", description: "Daily brief" },
  { path: "/feed", label: "Feed", icon: LayoutList, iconBg: "#FF9500", description: "All articles" },
  { path: "/sources", label: "Sources", icon: Globe, iconBg: "#32ADE6", description: "News sources" },
  { path: "/bookmarks", label: "Bookmarks", icon: Bookmark, iconBg: "#FF2D55", description: "Saved articles" },
]

const secondaryNavItems: NavItem[] = [
  { path: "/settings", label: "Settings", icon: Settings, iconBg: "#8E8E93", description: "Preferences" },
]

const allNavItems = [...primaryNavItems, ...secondaryNavItems]

function getPageTitle(pathname: string): string {
  const item = allNavItems.find((nav) => nav.path === pathname)
  return item?.label ?? "Today"
}

export function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { titleRef, isVisible } = useLargeTitle()

  const handleNavigation = (path: string) => {
    navigate(path)
    setOpen(false)
  }

  const pageTitle = getPageTitle(location.pathname)

  // Menu trigger element for TopNav (contains full Sheet with trigger + content)
  const menuTrigger = (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <MenuButton />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[300px] border-l-0 bg-[var(--color-bg-grouped)] p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>

        <div className="flex h-full flex-col">
          {/* Header with brand - padding accounts for safe area */}
          <div className="px-[20px] pb-[28px]" style={{ paddingTop: 'calc(20px + var(--safe-area-inset-top))' }}>
            <div className="flex items-center gap-[14px]">
              {/* Logo container for consistent sizing */}
              <div className="flex h-[44px] w-[44px] items-center justify-center shrink-0">
                <AppLogo size={44} glow className="drop-shadow-[0_2px_8px_rgba(53,211,255,0.3)]" />
              </div>
              <div>
                <span className="block text-[19px] font-bold tracking-[-0.4px] text-[var(--color-text-primary)]">
                  P&C Brief
                </span>
                <span className="block text-[13px] text-[var(--color-text-tertiary)] tracking-[-0.08px] mt-[1px]">
                  Insurance News AI
                </span>
              </div>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="flex-1 px-[12px]">
            <p className="mb-[6px] ml-[8px] text-[12px] font-semibold uppercase tracking-[0.4px] text-[var(--color-text-tertiary)]">
              Navigation
            </p>
            <Card variant="grouped">
              {primaryNavItems.map((item, index) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                const isNextActive = location.pathname === primaryNavItems[index + 1]?.path
                return (
                  <div key={item.path}>
                    <button
                      onClick={() => {
                        hapticMedium()
                        handleNavigation(item.path)
                      }}
                      className={cn(
                        "flex w-full items-center gap-[12px] px-[14px] py-[11px] text-left transition-all duration-[var(--duration-fast)]",
                        isActive
                          ? "bg-[var(--color-accent)]"
                          : "active:bg-[var(--color-fill-quaternary)]"
                      )}
                    >
                      <div
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px]"
                        style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : `${item.iconBg}14`
                        }}
                      >
                        <Icon
                          className="h-[16px] w-[16px]"
                          style={{ color: isActive ? 'white' : item.iconBg }}
                          strokeWidth={1.8}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            "block text-[15px] font-semibold tracking-[-0.2px]",
                            isActive ? "text-white" : "text-[var(--color-text-primary)]"
                          )}
                        >
                          {item.label}
                        </span>
                        {item.description && (
                          <span
                            className={cn(
                              "block text-[12px] tracking-[-0.04px] mt-[1px]",
                              isActive ? "text-white/70" : "text-[var(--color-text-secondary)]"
                            )}
                          >
                            {item.description}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-[14px] w-[14px] shrink-0",
                          isActive ? "text-white/50" : "text-[var(--color-text-tertiary)]"
                        )}
                        strokeWidth={2.5}
                      />
                    </button>
                    {index < primaryNavItems.length - 1 && !isActive && !isNextActive && (
                      <Separator className="ml-[56px]" />
                    )}
                  </div>
                )
              })}
            </Card>

            {/* Secondary Navigation */}
            <Card variant="grouped" className="mt-[14px]">
              {secondaryNavItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      hapticMedium()
                      handleNavigation(item.path)
                    }}
                    className={cn(
                      "flex w-full items-center gap-[12px] px-[14px] py-[11px] text-left transition-all duration-[var(--duration-fast)]",
                      isActive
                        ? "bg-[var(--color-accent)]"
                        : "active:bg-[var(--color-fill-quaternary)]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-[30px] w-[30px] items-center justify-center rounded-[7px]",
                        isActive
                          ? "bg-white/22"
                          : "bg-[var(--color-fill-tertiary)]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[16px] w-[16px]",
                          isActive ? "text-white" : "text-[var(--color-text-secondary)]"
                        )}
                        strokeWidth={1.8}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block text-[15px] font-semibold tracking-[-0.2px]",
                          isActive ? "text-white" : "text-[var(--color-text-primary)]"
                        )}
                      >
                        {item.label}
                      </span>
                      {item.description && (
                        <span
                          className={cn(
                            "block text-[12px] tracking-[-0.04px] mt-[1px]",
                            isActive ? "text-white/70" : "text-[var(--color-text-secondary)]"
                          )}
                        >
                          {item.description}
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-[14px] w-[14px] shrink-0",
                        isActive ? "text-white/50" : "text-[var(--color-text-tertiary)]"
                      )}
                      strokeWidth={2.5}
                    />
                  </button>
                )
              })}
            </Card>
          </nav>

          {/* Footer */}
          <div className="px-[20px] pb-[calc(24px+var(--safe-area-inset-bottom))] pt-[20px] text-center">
            <p className="text-[12px] font-medium tracking-[-0.03em] text-[var(--color-text-tertiary)]">
              Made in Hackensack · v5.16
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <LargeTitleContext.Provider value={{ titleRef, isVisible }}>
      <div className="flex min-h-screen flex-col bg-[var(--color-bg-grouped)]">
        {/* Top Navigation Bar */}
        <TopNav
          title={pageTitle}
          isLargeTitleVisible={isVisible}
          menuTrigger={menuTrigger}
        />

        {/* Main Content */}
        <main className="flex-1">
          <div className="safe-area-padding-x">
            <div className="mx-auto max-w-2xl px-[var(--spacing-4)] pb-[52px] pt-[20px]">
              {/* Large Page Title - iOS style with ref for IntersectionObserver */}
              <div ref={titleRef}>
                <h1 className="mb-[20px] text-[32px] font-bold leading-[1.1] tracking-[-0.4px] text-[var(--color-text-primary)]">
                  {pageTitle}
                </h1>
              </div>
              <Outlet />
            </div>
          </div>
        </main>

        {/* Safe area bottom padding */}
        <div style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }} />
      </div>
    </LargeTitleContext.Provider>
  )
}

