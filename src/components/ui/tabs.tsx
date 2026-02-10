/**
 * Tabs component - iOS Segmented Control style
 * Following Apple HIG 2026 with refined styling and animations
 */

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * TabsList - Container for segmented control
 * iOS-style pill background with refined styling
 */
const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      [
        "inline-flex h-[36px] items-center justify-center",
        "rounded-[9px] bg-[var(--color-fill-tertiary)]",
        "p-[2px]",
        "text-[var(--color-text-secondary)]",
      ].join(" "),
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

/**
 * TabsTrigger - Individual tab button
 * Features smooth sliding background animation
 */
const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      [
        "inline-flex items-center justify-center whitespace-nowrap",
        // Sizing
        "h-[32px] min-w-[80px] px-[16px]",
        "rounded-[7px]",
        // Typography
        "text-[13px] font-semibold tracking-[-0.08px]",
        // Remove tap highlight
        "-webkit-tap-highlight-color-transparent",
        // Transition
        "transition-all duration-[var(--duration-normal)] ease-[var(--ease-ios)]",
        // Focus state
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset",
        // Disabled state
        "disabled:pointer-events-none disabled:opacity-40",
        // Active state - elevated white pill
        "data-[state=active]:bg-white",
        "data-[state=active]:text-[var(--color-text-primary)]",
        "data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]",
        // Inactive hover
        "data-[state=inactive]:hover:text-[var(--color-text-primary)]",
      ].join(" "),
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/**
 * TabsContent - Content panel for each tab
 */
const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      [
        "mt-[var(--spacing-4)]",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
        // Subtle fade-in animation
        "data-[state=active]:animate-in data-[state=active]:fade-in-0",
        "data-[state=active]:duration-200",
      ].join(" "),
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

