import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Card - Unified surface component with iOS-style variants
 * Following Apple HIG 2026 with refined shadows and interactions
 *
 * Variants:
 * - default: Standard card with subtle shadow (for content cards)
 * - grouped: iOS Settings-style grouped list container
 * - interactive: Card that responds to press/hover (for tappable items)
 * - elevated: More prominent shadow for floating elements
 * - outline: Bordered card without shadow
 * - filled: Subtle background fill without shadow
 * - glass: Frosted glass effect for overlays
 */
const cardVariants = cva(
  [
    "overflow-hidden",
    "bg-[var(--color-surface)]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Default - subtle shadow, standard corners
        default: [
          "rounded-[var(--radius-2xl)]",
          "shadow-[var(--shadow-card)]",
        ].join(" "),
        // Grouped - iOS Settings-style container
        grouped: [
          "rounded-[var(--radius-xl)]",
          "shadow-[0_0.5px_1px_rgba(0,0,0,0.05)]",
        ].join(" "),
        // Interactive - responds to touch
        interactive: [
          "rounded-[var(--radius-2xl)]",
          "shadow-[var(--shadow-card)]",
          "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
          "cursor-pointer",
          "-webkit-tap-highlight-color-transparent",
          "hover:shadow-[var(--shadow-card-elevated)]",
          "active:scale-[0.985] active:bg-[var(--color-fill-quaternary)] active:shadow-[var(--shadow-card-active)]",
        ].join(" "),
        // Elevated - floating appearance
        elevated: [
          "rounded-[var(--radius-2xl)]",
          "shadow-[var(--shadow-card-elevated)]",
        ].join(" "),
        // Outline - bordered without shadow
        outline: [
          "rounded-[var(--radius-lg)]",
          "border border-[var(--color-separator-opaque)]",
          "shadow-none",
        ].join(" "),
        // Filled - subtle background, no shadow
        filled: [
          "rounded-[var(--radius-lg)]",
          "bg-[var(--color-fill-quaternary)]",
          "shadow-none",
        ].join(" "),
        // Glass - frosted glass effect
        glass: [
          "rounded-[var(--radius-2xl)]",
          "glass-card",
          "border border-[rgba(255,255,255,0.4)]",
          "shadow-[var(--shadow-md)]",
        ].join(" "),
      },
      padding: {
        none: "",
        sm: "p-[12px]",
        default: "p-[16px]",
        lg: "p-[20px]",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "none",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 px-[18px] py-[14px]", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-[17px] font-semibold leading-tight tracking-[-0.32px] text-[var(--color-text-primary)]",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[15px] leading-[1.45] tracking-[-0.2px] text-[var(--color-text-secondary)]", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-[18px] pb-[18px]", className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center px-[18px] pb-[14px]", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, cardVariants, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

