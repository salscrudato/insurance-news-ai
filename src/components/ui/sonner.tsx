/**
 * Toaster - iOS-style toast notifications
 *
 * Uses Sonner with Apple-inspired styling:
 * - Rounded corners (14px)
 * - Subtle shadows
 * - Success/error color accents
 * - Proper typography
 */

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--color-surface-elevated)] group-[.toaster]:text-[var(--color-text-primary)] group-[.toaster]:border group-[.toaster]:border-[var(--color-border)] group-[.toaster]:shadow-[var(--shadow-lg)] group-[.toaster]:rounded-[14px] group-[.toaster]:px-[16px] group-[.toaster]:py-[12px] group-[.toaster]:text-[15px] group-[.toaster]:font-medium group-[.toaster]:tracking-[-0.2px]",
          description:
            "group-[.toast]:text-[var(--color-text-secondary)] group-[.toast]:text-[13px] group-[.toast]:font-normal group-[.toast]:mt-[2px]",
          actionButton:
            "group-[.toast]:bg-[var(--color-accent)] group-[.toast]:text-white group-[.toast]:rounded-[8px] group-[.toast]:font-semibold group-[.toast]:text-[13px]",
          cancelButton:
            "group-[.toast]:bg-[var(--color-fill-tertiary)] group-[.toast]:text-[var(--color-text-secondary)] group-[.toast]:rounded-[8px] group-[.toast]:font-medium group-[.toast]:text-[13px]",
          success:
            "group-[.toaster]:border-[var(--color-success)]/20 group-[.toaster]:text-[var(--color-success)]",
          error:
            "group-[.toaster]:border-[var(--color-destructive)]/20 group-[.toaster]:text-[var(--color-destructive)]",
          warning:
            "group-[.toaster]:border-[var(--color-warning)]/20 group-[.toaster]:text-[var(--color-warning)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

