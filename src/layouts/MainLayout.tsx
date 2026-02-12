import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { Newspaper, LayoutList, Settings, ChevronRight, Sparkles, BarChart3, TrendingUp, type LucideIcon } from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { TopNav, MenuButton } from "@/components/layout"
import { useLargeTitle } from "@/lib/hooks"
import { LargeTitleContext } from "./large-title-context"

interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  description?: string
  /** Whether this is a secondary/utility item (uses neutral styling) */
  secondary?: boolean
}

const primaryNavItems: NavItem[] = [
  { path: "/", label: "Today", icon: Newspaper, description: "Daily brief" },
  { path: "/feed", label: "Feed", icon: LayoutList, description: "All articles" },
  { path: "/pulse", label: "Pulse", icon: BarChart3, description: "Trending signals" },
  { path: "/ask", label: "Ask AI", icon: Sparkles, description: "Chat with sources" },
  { path: "/earnings", label: "Earnings", icon: TrendingUp, description: "Financials & calls" },
]

const secondaryNavItems: NavItem[] = [
  { path: "/settings", label: "Settings", icon: Settings, description: "Preferences", secondary: true },
]

const allNavItems = [...primaryNavItems, ...secondaryNavItems]

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/earnings/")) return "Earnings"
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

  /**
   * NavRow - Shared navigation row for side nav
   * Apple-style: restrained active state, subtle icon containers, inset separators
   */
  const NavRow = ({
    item,
    isLast = false,
  }: {
    item: NavItem
    isLast?: boolean
  }) => {
    const isActive = location.pathname === item.path
    const Icon = item.icon

    return (
      <button
        key={item.path}
        onClick={() => {
          handleNavigation(item.path)
        }}
        className={cn(
          "group relative flex w-full items-center gap-[12px] px-[14px] text-left",
          "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
          "-webkit-tap-highlight-color-transparent",
          // Row height: 52px for comfortable tap targets with two-line content
          "min-h-[52px] py-[10px]",
          isActive
            ? "bg-[var(--color-fill-quaternary)]"
            : "bg-transparent hover:bg-[var(--color-fill-quaternary)] active:bg-[var(--color-fill-tertiary)]",
        )}
      >
        {/* Icon container - subtle rounded square */}
        <div
          className={cn(
            "flex h-[30px] w-[30px] items-center justify-center rounded-[7px] shrink-0",
            "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
            "group-active:scale-[0.92]",
            item.secondary
              ? (isActive ? "bg-[var(--color-fill-secondary)]" : "bg-[var(--color-fill-tertiary)]")
              : (isActive ? "bg-[var(--color-accent)]" : "bg-[var(--color-accent-soft)]"),
          )}
        >
          <Icon
            className="h-[16px] w-[16px]"
            style={{
              color: item.secondary
                ? 'var(--color-text-secondary)'
                : isActive ? 'white' : 'var(--color-accent)',
            }}
            strokeWidth={1.8}
          />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "block text-[15px] font-medium tracking-[-0.24px]",
              isActive ? "text-[var(--color-text-primary)] font-semibold" : "text-[var(--color-text-primary)]"
            )}
          >
            {item.label}
          </span>
          {item.description && (
            <span className="block text-[12px] tracking-[-0.02em] text-[var(--color-text-tertiary)] mt-[1px]">
              {item.description}
            </span>
          )}
        </div>

        {/* Chevron - only for non-active items */}
        <ChevronRight
          className={cn(
            "h-[13px] w-[13px] shrink-0",
            "transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
            isActive ? "text-[var(--color-text-quaternary)] opacity-0" : "text-[var(--color-text-quaternary)] opacity-60",
            "group-hover:translate-x-[1px]"
          )}
          strokeWidth={2.5}
        />

        {/* Inset separator - only between non-active rows */}
        {!isLast && (
          <div
            className={cn(
              "absolute bottom-0 right-[14px] h-[0.5px] bg-[var(--color-separator)]",
              // Inset from left: icon width (30) + gap (12) + padding (14) = 56px
              "left-[56px]"
            )}
          />
        )}
      </button>
    )
  }

  // Menu trigger element for TopNav (contains full Sheet with trigger + content)
  const menuTrigger = (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <MenuButton />
      </SheetTrigger>
      <SheetContent
        side="right"
        hideCloseButton
        className="w-[300px] border-l-0 bg-[var(--color-surface)] p-0 shadow-[-4px_0_24px_rgba(0,0,0,0.06)]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Navigate between app sections</SheetDescription>
        </SheetHeader>

        <div className="flex h-full flex-col">
          {/* Brand header */}
          <div
            className="px-[20px] pb-[20px]"
            style={{ paddingTop: 'calc(20px + var(--safe-area-inset-top))' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[12px]">
                <div className="flex h-[40px] w-[40px] items-center justify-center shrink-0">
                  <AppLogo size={40} />
                </div>
                <div>
                  <span className="block text-[18px] font-bold tracking-[-0.4px] text-[var(--color-text-primary)] leading-[1.2]">
                    The Brief
                  </span>
                  <span className="block text-[12px] tracking-[-0.02em] text-[var(--color-text-tertiary)] mt-[1px]">
                    P&C Insurance News
                  </span>
                </div>
              </div>
              {/* Close button - aligned with brand row */}
              <button
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-[28px] w-[28px] items-center justify-center rounded-full shrink-0",
                  "bg-[var(--color-fill-tertiary)]",
                  "text-[var(--color-text-tertiary)]",
                  "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
                  "hover:bg-[var(--color-fill-secondary)] hover:text-[var(--color-text-secondary)]",
                  "active:scale-[0.90] active:bg-[var(--color-fill-primary)]",
                  "-webkit-tap-highlight-color-transparent",
                )}
                aria-label="Close menu"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="1" y1="1" x2="9" y2="9" />
                  <line x1="9" y1="1" x2="1" y2="9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Separator between brand and nav */}
          <div className="mx-[20px] h-[0.5px] bg-[var(--color-separator)] mb-[12px]" />

          {/* Navigation */}
          <nav className="flex-1 px-[8px]">
            {/* Primary Navigation */}
            <div className="overflow-hidden rounded-[12px]">
              {primaryNavItems.map((item, index) => (
                <NavRow
                  key={item.path}
                  item={item}
                  isLast={index === primaryNavItems.length - 1}
                />
              ))}
            </div>

            {/* Visual break between groups */}
            <div className="my-[8px] mx-[14px] h-[0.5px] bg-[var(--color-separator)]" />

            {/* Secondary Navigation */}
            <div className="overflow-hidden rounded-[12px]">
              {secondaryNavItems.map((item, index) => (
                <NavRow
                  key={item.path}
                  item={item}
                  isLast={index === secondaryNavItems.length - 1}
                />
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div
            className="px-[20px] pt-[16px] text-center"
            style={{ paddingBottom: 'calc(24px + var(--safe-area-inset-bottom))' }}
          >
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
      <div className="flex h-full flex-col bg-[var(--color-bg-grouped)] overflow-hidden">
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
            {location.pathname === "/ask" || location.pathname === "/feed" || location.pathname.startsWith("/earnings/") ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <Outlet />
              </div>
            ) : (
              <div className="mx-auto w-full max-w-2xl px-[var(--spacing-4)] pb-[calc(20px+var(--safe-area-inset-bottom))] pt-[8px] flex-1 overflow-x-hidden overflow-y-auto overscroll-none">
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
      </div>
    </LargeTitleContext.Provider>
  )
}

