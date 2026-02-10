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
        "transition-[border-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-ios)]",
        variant === "default" && "glass-nav",
        variant === "transparent" && "bg-transparent",
        // Override the glass-nav border with a dynamic hairline:
        // transparent when large title visible, opaque separator when scrolled
        variant === "default" && (showDivider
          ? "border-b-[0.5px] border-[var(--color-separator-opaque)]"
          : "border-b-[0.5px] border-transparent"
        )
      )}
    >
      <div
        className="safe-area-padding-x"
        style={{ paddingTop: 'var(--safe-area-inset-top)' }}
      >
        <div className="flex h-[44px] items-center justify-between px-[16px]">
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
                  "active:bg-[var(--color-fill-secondary)] active:scale-[0.92]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                )}
                onClick={handleBack}
              >
                <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={2.5} />
                <span className="sr-only">Go back</span>
              </Button>
            ) : (
              <div className="flex items-center gap-[10px]">
                {/* Logo - fixed size container to prevent jitter */}
                <div className="flex h-[28px] w-[28px] items-center justify-center shrink-0">
                  <AppLogo size={28} />
                </div>
                {/* Collapsed title - crossfades when large title scrolls out */}
                <span
                  className={cn(
                    "text-[17px] font-semibold tracking-[-0.41px] text-[var(--color-text-primary)] whitespace-nowrap",
                    "transition-[opacity,transform] duration-[280ms] ease-[var(--ease-ios)]",
                    isLargeTitleVisible
                      ? "opacity-0 translate-y-[3px] pointer-events-none"
                      : "opacity-100 translate-y-0"
                  )}
                >
                  {title}
                </span>
              </div>
            )}
          </div>

          {/* Right side: Optional action + Menu button */}
          <div className="flex items-center gap-[4px] shrink-0">
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
            "-mr-1 h-[44px] w-[44px] rounded-full",
            "text-[var(--color-text-tertiary)]",
            "-webkit-tap-highlight-color-transparent",
            "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
            "hover:bg-[var(--color-fill-quaternary)] hover:text-[var(--color-text-secondary)]",
            "active:bg-[var(--color-fill-tertiary)] active:scale-[0.92]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
          ].join(" "),
          className
        )}
        onClick={(e) => {
          hapticMedium()
          onClick?.(e)
        }}
      >
        <Menu className="h-[20px] w-[20px]" strokeWidth={1.8} />
        <span className="sr-only">Open menu</span>
      </Button>
    )
  }
)
MenuButton.displayName = "MenuButton"

