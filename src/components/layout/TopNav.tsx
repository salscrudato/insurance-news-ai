/**
 * TopNav - iOS-style sticky top navigation with large title collapse behavior
 * Following Apple HIG 2026 with refined glass effects and precise typography
 *
 * Features:
 * - Brand mark + app name on top-level screens, or back button for sub-screens
 * - Menu button (Sheet trigger) with 44px tap target
 * - Enhanced glass/blur background with subtle saturation
 * - Collapsed title that appears when large title scrolls out of view
 * - Hairline divider that appears on scroll
 * - Optional right-side action slot
 */

import React from "react"
import { useNavigate } from "react-router-dom"
import { Menu, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppLogo } from "@/components/ui/app-logo"
import { hapticLight, hapticMedium } from "@/lib/haptics"
import { cn } from "@/lib/utils"

interface TopNavProps {
  /** Page title shown in collapsed state */
  title: string
  /** Whether the large title is visible (controls collapsed state) */
  isLargeTitleVisible: boolean
  /** Optional action element for the right side (appears left of menu button) */
  rightAction?: React.ReactNode
  /** Sheet trigger to open navigation menu */
  menuTrigger: React.ReactNode
  /** Whether this is a sub-screen with back navigation */
  isSubScreen?: boolean
  /** Custom back action (defaults to navigate(-1)) */
  onBack?: () => void
  /** Optional variant for different nav appearances */
  variant?: "default" | "transparent"
}

export function TopNav({
  title,
  isLargeTitleVisible,
  rightAction,
  menuTrigger,
  isSubScreen = false,
  onBack,
  variant = "default",
}: TopNavProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    hapticLight()
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  // Show hairline divider when scrolled (title not visible)
  const showDivider = !isLargeTitleVisible && variant === "default"

  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        "transition-all duration-[var(--duration-normal)] ease-[var(--ease-ios)]",
        variant === "default" && "glass-nav",
        variant === "transparent" && "bg-transparent",
        // Hairline divider appears on scroll
        showDivider && [
          "shadow-[inset_0_-0.5px_0_0_var(--color-separator-opaque)]",
        ]
      )}
    >
      <div
        className="safe-area-padding-x"
        style={{ paddingTop: 'var(--safe-area-inset-top)' }}
      >
        <div className="flex h-[52px] items-center justify-between px-[var(--spacing-4)]">
          {/* Left side: Brand or Back button */}
          <div className="flex items-center min-w-0 flex-1">
            {isSubScreen ? (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "-ml-2 h-[44px] w-[44px] rounded-full",
                  "text-[var(--color-accent)]",
                  "-webkit-tap-highlight-color-transparent",
                  "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
                  "hover:bg-[var(--color-fill-tertiary)]",
                  "active:bg-[var(--color-fill-secondary)] active:scale-[0.90]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                )}
                onClick={handleBack}
              >
                <ChevronLeft className="h-[24px] w-[24px]" strokeWidth={2.5} />
                <span className="sr-only">Go back</span>
              </Button>
            ) : (
              <div className="flex items-center gap-[12px]">
                {/* Logo - fixed size container to prevent jitter */}
                <div className="flex h-[30px] w-[30px] items-center justify-center shrink-0">
                  <AppLogo
                    size={30}
                    glow
                    className="drop-shadow-[0_1px_3px_rgba(10,132,255,0.20)]"
                  />
                </div>
                {/* Collapsed title - fades in when large title scrolls out */}
                <span
                  className={cn(
                    "text-[17px] font-semibold tracking-[-0.41px] text-[var(--color-text-primary)] whitespace-nowrap",
                    "transition-all duration-[var(--duration-normal)] ease-[var(--ease-ios)]",
                    isLargeTitleVisible
                      ? "opacity-0 translate-y-[2px]"
                      : "opacity-100 translate-y-0"
                  )}
                >
                  {title}
                </span>
              </div>
            )}
          </div>

          {/* Right side: Optional action + Menu button */}
          <div className="flex items-center gap-[6px] shrink-0">
            {rightAction}
            {menuTrigger}
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * MenuButton - Standardized menu trigger button
 * Enhanced with refined interaction states
 * Use with Sheet + SheetTrigger
 */
interface MenuButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
}

export const MenuButton = React.forwardRef<HTMLButtonElement, MenuButtonProps>(
  ({ onClick, className }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(
          [
            "-mr-2 h-[44px] w-[44px] rounded-full",
            "text-[var(--color-text-secondary)]",
            "-webkit-tap-highlight-color-transparent",
            "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
            "hover:bg-[var(--color-fill-tertiary)] hover:text-[var(--color-text-primary)]",
            "active:bg-[var(--color-fill-secondary)] active:scale-[0.90]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
          ].join(" "),
          className
        )}
        onClick={(e) => {
          hapticMedium()
          onClick?.(e)
        }}
      >
        <Menu className="h-[22px] w-[22px]" strokeWidth={2} />
        <span className="sr-only">Open menu</span>
      </Button>
    )
  }
)
MenuButton.displayName = "MenuButton"

