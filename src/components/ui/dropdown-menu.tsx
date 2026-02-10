/**
 * Dropdown Menu - iOS-style context menu
 * Following Apple HIG 2026 with refined styling and accessibility
 */

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      [
        "flex cursor-default select-none items-center gap-[8px]",
        "min-h-[44px] rounded-[8px] px-[14px] py-[10px]",
        "text-[15px] tracking-[-0.2px]",
        "outline-none transition-colors duration-[var(--duration-instant)]",
        "focus:bg-[var(--color-fill-quaternary)]",
        "data-[state=open]:bg-[var(--color-fill-quaternary)]",
        "[&_svg]:pointer-events-none [&_svg]:size-[16px] [&_svg]:shrink-0",
      ].join(" "),
      inset && "pl-[32px]",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto text-[var(--color-text-quaternary)]" strokeWidth={2} />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      [
        "z-50 min-w-[180px] overflow-hidden",
        "rounded-[14px] p-[6px]",
        "bg-[var(--color-surface-elevated)]",
        "shadow-[var(--shadow-xl)]",
        "text-[var(--color-text-primary)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      ].join(" "),
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        [
          "z-50 min-w-[180px] overflow-hidden",
          "rounded-[14px] p-[6px]",
          "bg-[var(--color-surface-elevated)]",
          "shadow-[var(--shadow-xl)]",
          "text-[var(--color-text-primary)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        ].join(" "),
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
    destructive?: boolean
  }
>(({ className, inset, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      [
        "relative flex cursor-default select-none items-center gap-[10px]",
        "min-h-[44px] rounded-[8px] px-[14px] py-[10px]",
        "text-[15px] tracking-[-0.2px] font-medium",
        "outline-none transition-colors duration-[var(--duration-instant)]",
        "focus:bg-[var(--color-fill-quaternary)]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
      ].join(" "),
      destructive && "text-[var(--color-destructive)]",
      inset && "pl-[32px]",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      [
        "relative flex cursor-default select-none items-center",
        "min-h-[44px] rounded-[8px] py-[10px] pl-[38px] pr-[14px]",
        "text-[15px] tracking-[-0.2px] font-medium",
        "outline-none transition-colors duration-[var(--duration-instant)]",
        "focus:bg-[var(--color-fill-quaternary)]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      ].join(" "),
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-[12px] flex h-[20px] w-[20px] items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-[16px] w-[16px] text-[var(--color-accent)]" strokeWidth={2.5} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      [
        "relative flex cursor-default select-none items-center",
        "min-h-[44px] rounded-[8px] py-[10px] pl-[38px] pr-[14px]",
        "text-[15px] tracking-[-0.2px] font-medium",
        "outline-none transition-colors duration-[var(--duration-instant)]",
        "focus:bg-[var(--color-fill-quaternary)]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      ].join(" "),
      className
    )}
    {...props}
  >
    <span className="absolute left-[12px] flex h-[20px] w-[20px] items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-[8px] w-[8px] fill-[var(--color-accent)] text-[var(--color-accent)]" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-[14px] py-[8px] text-[12px] font-semibold uppercase tracking-[0.02em] text-[var(--color-text-tertiary)]",
      inset && "pl-[32px]",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("mx-[6px] my-[6px] h-[0.5px] bg-[var(--color-separator)]", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-[12px] tracking-[0.02em] text-[var(--color-text-tertiary)]",
        className
      )}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}

