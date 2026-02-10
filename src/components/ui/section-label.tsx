/**
 * SectionLabel - iOS-style section header text
 * 
 * Used for labeling groups of content in list views and pages.
 * Follows Apple HIG typography for section headers.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface SectionLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional icon to display alongside label */
  icon?: LucideIcon
  /** Add left padding for grouped list context (Settings-style) */
  inset?: boolean
}

const SectionLabel = React.forwardRef<HTMLDivElement, SectionLabelProps>(
  ({ className, children, icon: Icon, inset = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-[8px] text-[13px] font-medium tracking-[-0.08px] text-[var(--color-text-tertiary)]",
        inset && "pl-[16px]",
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-[14px] w-[14px]" strokeWidth={2} />}
      <span>{children}</span>
    </div>
  )
)
SectionLabel.displayName = "SectionLabel"

/**
 * SectionFooter - iOS-style section footer/description text
 * 
 * Used for explanatory text below grouped content sections.
 */
interface SectionFooterProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Add left/right padding for grouped list context */
  inset?: boolean
}

const SectionFooter = React.forwardRef<HTMLParagraphElement, SectionFooterProps>(
  ({ className, inset = false, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "text-[13px] leading-[18px] text-[var(--color-text-tertiary)]",
        inset && "px-[16px]",
        className
      )}
      {...props}
    />
  )
)
SectionFooter.displayName = "SectionFooter"

export { SectionLabel, SectionFooter }

