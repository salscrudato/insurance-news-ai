/**
 * AppLogo - Shield logo component with gradient
 * 
 * Derived from public/logo.svg - a gradient shield representing
 * protection and trust in the insurance industry.
 * 
 * The gradient flows from deep navy (#0A2A45) through ocean blue (#0D3A66)
 * to bright cyan (#35D3FF), symbolizing depth, stability, and innovation.
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
  
  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0",
        glow && "drop-shadow-[0_2px_8px_rgba(53,211,255,0.35)]",
        rounded && "rounded-[22%]",
        className
      )}
      aria-label="P&C Brief logo"
    >
      <defs>
        <linearGradient 
          id={gradientId} 
          x1="260" 
          y1="180" 
          x2="780" 
          y2="920" 
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0A2A45" />
          <stop offset="55%" stopColor="#0D3A66" />
          <stop offset="100%" stopColor="#35D3FF" />
        </linearGradient>
      </defs>
      
      {/* Shield path */}
      <path
        d="M512 176
           C654 176 776 248 776 380
           V556
           C776 702 654 824 512 904
           C370 824 248 702 248 556
           V380
           C248 248 370 176 512 176
           Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  )
}

/**
 * AppLogoMark - Compact version for tight spaces
 * Same shield but optimized viewBox for tighter cropping
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
      viewBox="200 140 624 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="P&C Brief"
    >
      <defs>
        <linearGradient 
          id={gradientId} 
          x1="260" 
          y1="180" 
          x2="780" 
          y2="920" 
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0A2A45" />
          <stop offset="55%" stopColor="#0D3A66" />
          <stop offset="100%" stopColor="#35D3FF" />
        </linearGradient>
      </defs>
      
      <path
        d="M512 176
           C654 176 776 248 776 380
           V556
           C776 702 654 824 512 904
           C370 824 248 702 248 556
           V380
           C248 248 370 176 512 176
           Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  )
}

