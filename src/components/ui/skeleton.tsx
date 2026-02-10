import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-[var(--radius-sm)]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

