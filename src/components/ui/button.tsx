import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button variants following Apple HIG 2026
 * - Generous touch targets (min 44pt)
 * - Subtle shadows with depth
 * - Refined press states with scale + color shift
 * - Smooth transitions with iOS-native easing
 */
const buttonVariants = cva(
  [
    // Base styles
    "inline-flex items-center justify-center gap-[8px]",
    "whitespace-nowrap rounded-[12px]",
    "text-[15px] font-semibold tracking-[-0.24px]",
    // Transitions
    "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
    // Focus states
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-accent-soft)]",
    // Disabled
    "disabled:pointer-events-none disabled:opacity-40",
    // Icons
    "[&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
    // Press scale
    "active:scale-[0.97]",
    // Tap highlight
    "-webkit-tap-highlight-color-transparent",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary - bold accent with subtle inner highlight
        default: [
          "bg-[var(--color-accent)] text-white",
          "shadow-[0_1px_2px_rgba(0,122,255,0.20),inset_0_1px_0_rgba(255,255,255,0.12)]",
          "hover:bg-[var(--color-accent-hover)]",
          "active:bg-[var(--color-accent-pressed)] active:shadow-[0_0.5px_1px_rgba(0,122,255,0.16)]",
        ].join(" "),
        // Destructive - red with matching shadow
        destructive: [
          "bg-[var(--color-destructive)] text-white",
          "shadow-[0_1px_2px_rgba(255,59,48,0.20),inset_0_1px_0_rgba(255,255,255,0.12)]",
          "hover:brightness-[0.95]",
          "active:brightness-[0.90] active:shadow-[0_0.5px_1px_rgba(255,59,48,0.16)]",
        ].join(" "),
        // Outline - card-like with border
        outline: [
          "bg-[var(--color-surface)] text-[var(--color-text-primary)]",
          "border border-[var(--color-separator-opaque)]",
          "shadow-[var(--shadow-button)]",
          "hover:bg-[var(--color-fill-quaternary)] hover:shadow-[var(--shadow-button-hover)]",
          "active:bg-[var(--color-fill-tertiary)] active:shadow-[var(--shadow-button-active)]",
        ].join(" "),
        // Secondary - subtle fill background
        secondary: [
          "bg-[var(--color-fill-tertiary)] text-[var(--color-text-primary)]",
          "hover:bg-[var(--color-fill-secondary)]",
          "active:bg-[var(--color-fill-primary)]",
        ].join(" "),
        // Ghost - transparent until hover
        ghost: [
          "text-[var(--color-text-primary)]",
          "hover:bg-[var(--color-fill-quaternary)]",
          "active:bg-[var(--color-fill-tertiary)]",
        ].join(" "),
        // Link - text-only with underline
        link: [
          "text-[var(--color-accent)]",
          "underline-offset-4 hover:underline",
          "active:opacity-70",
        ].join(" "),
        // Accent soft - muted accent background
        "accent-soft": [
          "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
          "hover:bg-[rgba(0,122,255,0.18)]",
          "active:bg-[rgba(0,122,255,0.22)]",
        ].join(" "),
      },
      size: {
        default: "h-[46px] px-[20px] min-w-[44px]",
        sm: "h-[36px] rounded-[10px] px-[14px] text-[14px] [&_svg]:size-[16px]",
        lg: "h-[52px] rounded-[14px] px-[26px] text-[16px] font-semibold [&_svg]:size-[20px]",
        xl: "h-[56px] rounded-[16px] px-[32px] text-[17px] font-semibold [&_svg]:size-[22px]",
        icon: "h-[44px] w-[44px] p-0",
        "icon-sm": "h-[36px] w-[36px] rounded-[10px] p-0 [&_svg]:size-[16px]",
        "icon-lg": "h-[52px] w-[52px] rounded-[14px] p-0 [&_svg]:size-[22px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

