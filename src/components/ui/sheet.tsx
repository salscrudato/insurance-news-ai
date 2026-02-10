import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

/**
 * Sheet overlay with refined blur and dimming
 * Uses Apple-style vibrancy-like dimming
 */
const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      [
        "fixed inset-0 z-50",
        // Apple-style dim overlay - light, non-distracting
        "bg-black/30",
        "backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)]",
        // Animations
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:duration-[var(--duration-fast)]",
        "data-[state=open]:duration-[var(--duration-normal)]",
      ].join(" "),
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Sheet content variants with iOS-native behavior
 * - Bottom sheets with rounded corners and spring animation
 * - Side sheets for navigation drawers
 */
const sheetVariants = cva(
  [
    "fixed z-50",
    "bg-[var(--color-surface-elevated)]",
    "shadow-[var(--shadow-sheet)]",
    // Spring-like transition
    "transition-transform ease-[var(--ease-ios-spring)]",
    "data-[state=closed]:duration-[var(--duration-normal)]",
    "data-[state=open]:duration-[var(--duration-sheet)]",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
  ].join(" "),
  {
    variants: {
      side: {
        top: [
          "inset-x-0 top-0",
          "rounded-b-[var(--radius-3xl)]",
          "data-[state=closed]:slide-out-to-top",
          "data-[state=open]:slide-in-from-top",
        ].join(" "),
        bottom: [
          "inset-x-0 bottom-0",
          "rounded-t-[var(--radius-3xl)]",
          "data-[state=closed]:slide-out-to-bottom",
          "data-[state=open]:slide-in-from-bottom",
        ].join(" "),
        left: [
          "inset-y-0 left-0",
          "h-full w-[85%] max-w-[360px]",
          "rounded-r-[var(--radius-2xl)]",
          "data-[state=closed]:slide-out-to-left",
          "data-[state=open]:slide-in-from-left",
        ].join(" "),
        right: [
          "inset-y-0 right-0",
          "h-full w-[85%] max-w-[360px]",
          "rounded-l-[var(--radius-3xl)]",
          "data-[state=closed]:slide-out-to-right",
          "data-[state=open]:slide-in-from-right",
        ].join(" "),
      },
    },
    defaultVariants: {
      side: "bottom",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Hide the default close button (for bottom sheets with drag indicator) */
  hideCloseButton?: boolean
}

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "bottom", className, children, hideCloseButton = false, ...props }, ref) => {
  const isBottomSheet = side === "bottom"
  const isTopSheet = side === "top"
  const isSideSheet = side === "left" || side === "right"

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {/* Close button - refined styling with safe area awareness */}
        {!hideCloseButton && !isBottomSheet && !isTopSheet && (
          <DialogPrimitive.Close
            className={cn(
              [
                "absolute z-10",
                "flex h-[44px] w-[44px] items-center justify-center",
                "rounded-full",
                "bg-[var(--color-fill-tertiary)]",
                "text-[var(--color-text-secondary)]",
                "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
                "hover:bg-[var(--color-fill-secondary)]",
                "active:scale-[0.90] active:bg-[var(--color-fill-primary)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
              ].join(" "),
              isSideSheet && "right-[16px] top-[calc(16px+var(--safe-area-inset-top))]"
            )}
          >
            <X className="h-[16px] w-[16px]" strokeWidth={2.5} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = DialogPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-[4px] text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-[10px] sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-[20px] font-bold leading-[1.2] tracking-[-0.36px] text-[var(--color-text-primary)]", className)}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[14px] leading-[1.5] tracking-[-0.14px] text-[var(--color-text-secondary)]", className)}
    {...props}
  />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

