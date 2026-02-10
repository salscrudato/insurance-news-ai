import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Card - Unified surface component with iOS-style variants
 *
 * Variants:
 * - default: Standard card with subtle shadow (for content cards)
 * - grouped: iOS Settings-style grouped list container
 * - interactive: Card that responds to press/hover (for tappable items)
 * - elevated: Slightly more prominent shadow
 */
const cardVariants = cva(
  "overflow-hidden bg-[var(--color-surface)]",
  {
    variants: {
      variant: {
        default: "rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.02)]",
        grouped: "rounded-[var(--radius-xl)] shadow-[0_0.5px_1px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.015)]",
        interactive: "rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.02)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] cursor-pointer active:scale-[0.985] active:bg-[var(--color-fill-quaternary)]",
        elevated: "rounded-[16px] shadow-[var(--shadow-md)]",
        outline: "rounded-[var(--radius-lg)] border border-[var(--color-separator)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
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

