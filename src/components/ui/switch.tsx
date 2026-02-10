/**
 * Switch component - iOS-style toggle
 * Following Apple HIG 2026 with refined styling and animations
 */

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      [
        // Base sizing - iOS standard dimensions
        "peer inline-flex h-[31px] w-[51px] shrink-0",
        "cursor-pointer items-center rounded-full",
        // Remove tap highlight
        "-webkit-tap-highlight-color-transparent",
        // Subtle border for depth in off state
        "border-2 border-transparent",
        // Smooth transitions
        "transition-all duration-[var(--duration-normal)] ease-[var(--ease-ios)]",
        // Focus state
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-40",
        // Toggle states - refined iOS green
        "data-[state=checked]:bg-[#34C759]",
        "data-[state=unchecked]:bg-[var(--color-fill-secondary)]",
      ].join(" "),
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn([
        "pointer-events-none block",
        // iOS standard thumb size
        "h-[27px] w-[27px] rounded-full",
        // White thumb with refined shadow
        "bg-white",
        "shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.04)]",
        // Smooth spring animation
        "ring-0",
        "transition-transform duration-[var(--duration-normal)] ease-[var(--ease-ios-spring)]",
        // Translation on toggle (20px travel)
        "data-[state=checked]:translate-x-[20px]",
        "data-[state=unchecked]:translate-x-0",
      ].join(" "))}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }

