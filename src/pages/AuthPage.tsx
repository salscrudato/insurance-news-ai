/**
 * Auth Page - Landing page with sign-in options
 *
 * Provides Apple sign-in, Google sign-in, and continue as guest options.
 * Apple-inspired design with clean, centered layout.
 */

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"
import { useAuth } from "@/lib/auth-context"

// ---------------------------------------------------------------------------
// Auth Page
// ---------------------------------------------------------------------------
export function AuthPage() {
  const navigate = useNavigate()
  const { signInWithGoogle, signInWithApple, continueAsGuest } = useAuth()

  const [isLoading, setIsLoading] = useState<"apple" | "google" | "guest" | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Apple
  // ---------------------------------------------------------------------------
  const handleAppleSignIn = async () => {
    setError(null)
    setIsLoading("apple")

    try {
      await signInWithApple()
      navigate("/", { replace: true })
    } catch (err) {
      console.error("Apple sign-in failed:", err)
      setError("Apple sign-in failed. Please try again.")
    } finally {
      setIsLoading(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Google
  // ---------------------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading("google")

    try {
      await signInWithGoogle()
      navigate("/", { replace: true })
    } catch (err) {
      console.error("Google sign-in failed:", err)
      setError("Google sign-in failed. Please try again.")
    } finally {
      setIsLoading(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Guest
  // ---------------------------------------------------------------------------
  const handleContinueAsGuest = async () => {
    setError(null)
    setIsLoading("guest")

    try {
      await continueAsGuest()
      navigate("/", { replace: true })
    } catch (err) {
      console.error("[AuthPage] handleContinueAsGuest failed:", err)
      setError(err instanceof Error ? err.message : "Failed to continue as guest. Please try again.")
    } finally {
      setIsLoading(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--color-background)]">
      {/* Main content */}
      <div className="flex flex-1 flex-col items-center px-[24px] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">

        {/* Top spacer */}
        <div className="flex-[1.1]" />

        {/* Logo and branding */}
        <div className="flex flex-col items-center">
          <AppLogo size={56} glow className="mb-[20px]" />
          <h1 className="text-[34px] font-bold tracking-[-0.4px] leading-[1.1] text-[var(--color-text-primary)]">
            The Brief
          </h1>
          <p className="mt-[8px] text-center text-[17px] leading-[1.35] tracking-[-0.4px] text-[var(--color-text-secondary)]">
            Your daily insurance intelligence
          </p>
        </div>

        {/* Flexible gap */}
        <div className="flex-[1.4]" />

        {/* Error message */}
        {error && (
          <div className="mb-[16px] w-full max-w-[320px] rounded-[10px] bg-[var(--color-destructive-soft)] px-[16px] py-[12px]">
            <p className="text-center text-[14px] leading-[1.35] tracking-[-0.15px] text-[var(--color-destructive)]">{error}</p>
          </div>
        )}

        {/* Sign-in buttons */}
        <div className="flex w-full max-w-[320px] flex-col gap-[10px]">
          {/* Sign in with Apple — placed first per Apple HIG (equal or greater prominence) */}
          <button
            onClick={handleAppleSignIn}
            disabled={isLoading !== null}
            className="relative flex h-[50px] w-full items-center justify-center gap-[10px] rounded-[12px] bg-black text-[16px] font-semibold tracking-[-0.2px] text-white shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.98] active:shadow-[var(--shadow-xs)] disabled:opacity-40"
          >
            {isLoading === "apple" ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin text-white/60" />
            ) : (
              <>
                <AppleIcon />
                <span>Continue with Apple</span>
              </>
            )}
          </button>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading !== null}
            className="relative flex h-[50px] w-full items-center justify-center gap-[10px] rounded-[12px] bg-[var(--color-surface)] text-[16px] font-semibold tracking-[-0.2px] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.98] active:shadow-[var(--shadow-xs)] disabled:opacity-40"
          >
            {isLoading === "google" ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin text-[var(--color-text-tertiary)]" />
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Guest option */}
        <button
          onClick={handleContinueAsGuest}
          disabled={isLoading !== null}
          className="mt-[20px] py-[10px] text-[15px] font-medium tracking-[-0.2px] text-[var(--color-text-tertiary)] transition-colors duration-[var(--duration-fast)] active:text-[var(--color-text-secondary)] disabled:opacity-40"
        >
          {isLoading === "guest" ? (
            <Loader2 className="mx-auto h-[16px] w-[16px] animate-spin" />
          ) : (
            "Continue as Guest"
          )}
        </button>

        {/* Bottom spacer */}
        <div className="flex-[0.6]" />

        {/* Disclaimer */}
        <p className="max-w-[240px] text-center text-[12px] leading-[1.45] tracking-[-0.08px] text-[var(--color-text-quaternary)]">
          Sign in to sync preferences and unlock AI features
        </p>

        {/* Terms & Privacy */}
        <nav
          className="pb-[max(20px,env(safe-area-inset-bottom))] pt-[12px] flex flex-wrap items-center justify-center gap-x-[10px] gap-y-[4px]"
          aria-label="Legal"
        >
          <Link
            to="/terms"
            className="text-[12px] font-medium tracking-[-0.08px] text-[var(--color-text-tertiary)] underline underline-offset-2 transition-colors active:text-[var(--color-text-secondary)]"
          >
            Terms of Service
          </Link>
          <span className="text-[var(--color-text-quaternary)]" aria-hidden>·</span>
          <Link
            to="/privacy"
            className="text-[12px] font-medium tracking-[-0.08px] text-[var(--color-text-tertiary)] underline underline-offset-2 transition-colors active:text-[var(--color-text-secondary)]"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
