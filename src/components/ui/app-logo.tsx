/**
 * AppLogo - Shield outline logo component with gradient stroke
 *
 * Clean, modern shield outline representing protection and trust.
 * Stroke-based design with a subtle Apple-inspired blue gradient.
 */

import { cn } from "@/lib/utils"

interface AppLogoProps {
  /** Size preset or custom size in pixels */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number
  /** Additional CSS classes */
  className?: string
  /** Whether to add a subtle shadow glow effect */
  glow?: boolean
  /** Whether to render as a rounded square (for app icon style) */
  rounded?: boolean
}

const SIZE_MAP = {
  xs: 16,
  sm: 20,
  md: 32,
  lg: 40,
  xl: 64,
} as const

export function AppLogo({ 
  size = "md", 
  className,
  glow = false,
  rounded = false,
}: AppLogoProps) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size]
  
  // Generate unique gradient ID to avoid conflicts when multiple logos render
  const gradientId = `logo-gradient-${Math.random().toString(36).slice(2, 9)}`
  
  // Scale stroke width relative to render size for crisp rendering at all sizes
  const strokeWidth = pixelSize <= 24 ? 56 : pixelSize <= 40 ? 52 : 48
  
  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0",
        glow && "drop-shadow-[0_2px_12px_rgba(0,122,255,0.3)]",
        rounded && "rounded-[22%]",
        className
      )}
      aria-label="The Brief logo"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="512"
          y1="140"
          x2="512"
          y2="900"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#5AC8FA" />
          <stop offset="50%" stopColor="#007AFF" />
          <stop offset="100%" stopColor="#0055D4" />
        </linearGradient>
      </defs>
      
      {/* Shield outline path */}
      <path
        d="M512 160
           C400 160 310 195 270 240
           C240 274 230 310 230 360
           L230 500
           C230 600 270 690 340 760
           C390 810 450 850 512 890
           C574 850 634 810 684 760
           C754 690 794 600 794 500
           L794 360
           C794 310 784 274 754 240
           C714 195 624 160 512 160Z"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * AppLogoMark - Compact version for tight spaces
 * Same shield outline but optimized viewBox for tighter cropping
 */
export function AppLogoMark({ 
  size = 24, 
  className 
}: { 
  size?: number
  className?: string 
}) {
  const gradientId = `logo-mark-${Math.random().toString(36).slice(2, 9)}`
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="180 120 664 820"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="The Brief"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="512"
          y1="140"
          x2="512"
          y2="900"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#5AC8FA" />
          <stop offset="50%" stopColor="#007AFF" />
          <stop offset="100%" stopColor="#0055D4" />
        </linearGradient>
      </defs>
      
      <path
        d="M512 160
           C400 160 310 195 270 240
           C240 274 230 310 230 360
           L230 500
           C230 600 270 690 340 760
           C390 810 450 850 512 890
           C574 850 634 810 684 760
           C754 690 794 600 794 500
           L794 360
           C794 310 784 274 754 240
           C714 195 624 160 512 160Z"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={size <= 20 ? 56 : 48}
        strokeLinejoin="round"
      />
    </svg>
  )
}
