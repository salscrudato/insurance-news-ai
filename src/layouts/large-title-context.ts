/**
 * Large title context - shared between MainLayout and child pages
 * Extracted to its own file to satisfy react-refresh/only-export-components.
 */

import { createContext, useContext } from "react"

export interface LargeTitleContextValue {
  titleRef: React.RefObject<HTMLDivElement | null>
  isVisible: boolean
}

export const LargeTitleContext = createContext<LargeTitleContextValue | null>(null)

export function useLargeTitleContext() {
  const context = useContext(LargeTitleContext)
  if (!context) {
    throw new Error("useLargeTitleContext must be used within MainLayout")
  }
  return context
}
