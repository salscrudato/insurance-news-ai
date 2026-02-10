/**
 * PageShell - Unified page layout wrapper
 *
 * Provides consistent structure for all pages:
 * - iOS grouped-style background
 * - Proper padding and safe area handling
 * - Optional description below title
 * - Flexible content area
 *
 * Note: The large title is rendered by MainLayout, not PageShell.
 * PageShell wraps the page content that appears below the title.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional page description text shown at the top */
  description?: string
  /** Whether to remove top margin (for pages with custom headers) */
  noTopMargin?: boolean
}

const PageShell = React.forwardRef<HTMLDivElement, PageShellProps>(
  ({ className, children, description, noTopMargin = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "space-y-[20px]",
        !noTopMargin && description && "-mt-[4px]",
        className
      )}
      {...props}
    >
      {description && (
        <p className="text-[15px] leading-[1.45] tracking-[-0.16px] text-[var(--color-text-secondary)]">
          {description}
        </p>
      )}
      {children}
    </div>
  )
)
PageShell.displayName = "PageShell"

export { PageShell }

