import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-[12px] text-[15px] font-semibold tracking-[-0.2px] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-38 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.96]",
  {
    variants: {
      variant: {
        default:
          "bg-[#007AFF] text-white shadow-[0_1px_3px_rgba(0,122,255,0.24),inset_0_1px_0_rgba(255,255,255,0.10)] hover:bg-[#0066D6] active:bg-[#0055B3]",
        destructive:
          "bg-[#FF3B30] text-white shadow-[0_1px_3px_rgba(255,59,48,0.24),inset_0_1px_0_rgba(255,255,255,0.10)] hover:bg-[#E5352B] active:brightness-90",
        outline:
          "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-card)] hover:bg-[var(--color-fill-quaternary)] active:bg-[var(--color-fill-tertiary)] active:shadow-[var(--shadow-card-active)]",
        secondary:
          "bg-[var(--color-fill-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-fill-secondary)] active:bg-[var(--color-fill-primary)]",
        ghost:
          "text-[var(--color-text-primary)] hover:bg-[var(--color-fill-quaternary)] active:bg-[var(--color-fill-tertiary)]",
        link:
          "text-[var(--color-accent)] underline-offset-4 hover:underline active:opacity-70",
      },
      size: {
        default: "h-[46px] px-[20px]",
        sm: "h-[36px] rounded-[10px] px-[14px] text-[14px]",
        lg: "h-[52px] rounded-[14px] px-[26px] text-[16px]",
        icon: "h-[44px] w-[44px]",
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

