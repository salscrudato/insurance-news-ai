import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { Newspaper, LayoutList, Bookmark, Settings, ChevronRight, Sparkles, type LucideIcon } from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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

// Clean, unified blue accent - Apple-inspired monochrome navigation
const ACCENT_BLUE = "#0A84FF"
const NEUTRAL_GRAY = "#8E8E93"

const primaryNavItems: NavItem[] = [
  { path: "/", label: "Today", icon: Newspaper, iconBg: ACCENT_BLUE, description: "Daily brief" },
  { path: "/feed", label: "Feed", icon: LayoutList, iconBg: ACCENT_BLUE, description: "All articles" },
  { path: "/ask", label: "Ask AI", icon: Sparkles, iconBg: ACCENT_BLUE, description: "Chat with sources" },
  { path: "/bookmarks", label: "Bookmarks", icon: Bookmark, iconBg: ACCENT_BLUE, description: "Saved articles" },
]

const secondaryNavItems: NavItem[] = [
  { path: "/settings", label: "Settings", icon: Settings, iconBg: NEUTRAL_GRAY, description: "Preferences" },
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
        className="w-[320px] border-l-0 bg-[var(--color-surface)] p-0 shadow-[-8px_0_32px_rgba(0,0,0,0.08)]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>

        <div className="flex h-full flex-col">
          {/* Header with brand */}
          <div className="px-[24px] pb-[32px]" style={{ paddingTop: 'calc(24px + var(--safe-area-inset-top))' }}>
            <div className="flex items-center gap-[16px]">
              <div className="flex h-[48px] w-[48px] items-center justify-center shrink-0">
                <AppLogo size={48} glow className="drop-shadow-[0_4px_12px_rgba(10,132,255,0.25)]" />
              </div>
              <div>
                <span className="block text-[20px] font-bold tracking-[-0.5px] text-[var(--color-text-primary)]">
                  P&C Brief
                </span>
                <span className="block text-[12px] tracking-[-0.02em] text-[var(--color-text-tertiary)]">
                  Insurance News AI
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-[16px]">
            {/* Primary Navigation Card */}
            <div className="overflow-hidden rounded-[16px] bg-[var(--color-bg-grouped)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {primaryNavItems.map((item, index) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                const isLast = index === primaryNavItems.length - 1
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      hapticMedium()
                      handleNavigation(item.path)
                    }}
                    className={cn(
                      "group flex w-full items-center gap-[14px] px-[16px] py-[14px] text-left transition-all duration-200",
                      isActive
                        ? "bg-[var(--color-accent)]"
                        : "bg-[var(--color-surface)] hover:bg-[var(--color-fill-quaternary)] active:bg-[var(--color-fill-tertiary)]",
                      !isLast && !isActive && "border-b border-[var(--color-separator)]"
                    )}
                  >
                    {/* Icon container */}
                    <div
                      className={cn(
                        "flex h-[32px] w-[32px] items-center justify-center rounded-[8px] shrink-0 transition-transform duration-200 group-active:scale-[0.92]",
                        isActive
                          ? "bg-white/20"
                          : "bg-[var(--color-accent-soft)]"
                      )}
                    >
                      <Icon
                        className="h-[17px] w-[17px]"
                        style={{ color: isActive ? 'white' : 'var(--color-accent)' }}
                        strokeWidth={1.8}
                      />
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block text-[16px] font-semibold tracking-[-0.3px]",
                          isActive ? "text-white" : "text-[var(--color-text-primary)]"
                        )}
                      >
                        {item.label}
                      </span>
                      {item.description && (
                        <span
                          className={cn(
                            "block text-[13px] tracking-[-0.08px] mt-[1px]",
                            isActive ? "text-white/65" : "text-[var(--color-text-tertiary)]"
                          )}
                        >
                          {item.description}
                        </span>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight
                      className={cn(
                        "h-[14px] w-[14px] shrink-0 transition-transform duration-200 group-hover:translate-x-[2px]",
                        isActive ? "text-white/40" : "text-[var(--color-text-quaternary)]"
                      )}
                      strokeWidth={2.5}
                    />
                  </button>
                )
              })}
            </div>

            {/* Secondary Navigation Card */}
            <div className="mt-[20px] overflow-hidden rounded-[16px] bg-[var(--color-bg-grouped)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
                      "group flex w-full items-center gap-[14px] px-[16px] py-[14px] text-left transition-all duration-200",
                      isActive
                        ? "bg-[var(--color-accent)]"
                        : "bg-[var(--color-surface)] hover:bg-[var(--color-fill-quaternary)] active:bg-[var(--color-fill-tertiary)]"
                    )}
                  >
                    {/* Icon container */}
                    <div
                      className={cn(
                        "flex h-[32px] w-[32px] items-center justify-center rounded-[8px] shrink-0 transition-transform duration-200 group-active:scale-[0.92]",
                        isActive
                          ? "bg-white/20"
                          : "bg-[var(--color-fill-tertiary)]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[17px] w-[17px]",
                          isActive ? "text-white" : "text-[var(--color-text-secondary)]"
                        )}
                        strokeWidth={1.8}
                      />
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block text-[16px] font-semibold tracking-[-0.3px]",
                          isActive ? "text-white" : "text-[var(--color-text-primary)]"
                        )}
                      >
                        {item.label}
                      </span>
                      {item.description && (
                        <span
                          className={cn(
                            "block text-[13px] tracking-[-0.08px] mt-[1px]",
                            isActive ? "text-white/65" : "text-[var(--color-text-tertiary)]"
                          )}
                        >
                          {item.description}
                        </span>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight
                      className={cn(
                        "h-[14px] w-[14px] shrink-0 transition-transform duration-200 group-hover:translate-x-[2px]",
                        isActive ? "text-white/40" : "text-[var(--color-text-quaternary)]"
                      )}
                      strokeWidth={2.5}
                    />
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="px-[24px] pb-[calc(28px+var(--safe-area-inset-bottom))] pt-[24px] text-center">
            <p className="text-[11px] font-medium tracking-[0.02em] text-[var(--color-text-quaternary)]">
              Made in Hackensack
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
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="safe-area-padding-x flex-1 flex flex-col overflow-hidden">
            {/* Full-bleed layout for /ask and /feed routes (no title, no padding) */}
            {location.pathname === "/ask" || location.pathname === "/feed" ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <Outlet />
              </div>
            ) : (
              <div className="mx-auto w-full max-w-2xl px-[var(--spacing-4)] pb-[52px] pt-[20px] flex-1 overflow-x-hidden overflow-y-auto">
                {/* Large Page Title - iOS style with ref for IntersectionObserver */}
                <div ref={titleRef}>
                  <h1 className="mb-[12px] text-[32px] font-bold leading-[1.1] tracking-[-0.4px] text-[var(--color-text-primary)]">
                    {pageTitle}
                  </h1>
                </div>
                <Outlet />
              </div>
            )}
          </div>
        </main>

        {/* Safe area bottom padding */}
        <div style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }} />
      </div>
    </LargeTitleContext.Provider>
  )
}

