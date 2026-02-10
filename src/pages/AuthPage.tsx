/**
 * Auth Page - Landing page with sign-in options
 * 
 * Provides Google sign-in, phone sign-in, and continue as guest options.
 * Apple-inspired design with clean, centered layout.
 */

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"
import { useAuth } from "@/lib/auth-context"
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/haptics"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

export function AuthPage() {
  const navigate = useNavigate()
  const { signInWithGoogle, signInWithPhone, continueAsGuest } = useAuth()
  
  const [isLoading, setIsLoading] = useState<"google" | "phone" | "guest" | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Phone auth state
  const [showPhoneSheet, setShowPhoneSheet] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [confirmationResult, setConfirmationResult] = useState<Awaited<ReturnType<typeof signInWithPhone>> | null>(null)
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone")

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading("google")
    hapticLight()
    
    try {
      await signInWithGoogle()
      hapticSuccess()
      navigate("/", { replace: true })
    } catch (err) {
      console.error("Google sign-in failed:", err)
      setError("Google sign-in failed. Please try again.")
      hapticWarning()
    } finally {
      setIsLoading(null)
    }
  }

  const handlePhoneSignIn = () => {
    hapticLight()
    setShowPhoneSheet(true)
    setPhoneStep("phone")
    setPhoneNumber("")
    setVerificationCode("")
    setConfirmationResult(null)
  }

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) return
    
    setError(null)
    setIsLoading("phone")
    
    try {
      const result = await signInWithPhone(phoneNumber)
      setConfirmationResult(result)
      setPhoneStep("code")
      hapticSuccess()
    } catch (err) {
      console.error("Phone sign-in failed:", err)
      setError("Failed to send verification code. Please check the number and try again.")
      hapticWarning()
    } finally {
      setIsLoading(null)
    }
  }

  const handleVerifyCode = async () => {
    if (!confirmationResult || !verificationCode.trim()) return
    
    setError(null)
    setIsLoading("phone")
    
    try {
      await confirmationResult.confirm(verificationCode)
      hapticSuccess()
      setShowPhoneSheet(false)
      navigate("/", { replace: true })
    } catch (err) {
      console.error("Code verification failed:", err)
      setError("Invalid verification code. Please try again.")
      hapticWarning()
    } finally {
      setIsLoading(null)
    }
  }

  const handleContinueAsGuest = async () => {
    console.log("[AuthPage] handleContinueAsGuest: starting...")
    setError(null)
    setIsLoading("guest")
    hapticLight()

    try {
      console.log("[AuthPage] handleContinueAsGuest: calling continueAsGuest...")
      await continueAsGuest()
      console.log("[AuthPage] handleContinueAsGuest: continueAsGuest succeeded!")
      hapticSuccess()
      navigate("/", { replace: true })
    } catch (err) {
      console.error("[AuthPage] handleContinueAsGuest failed:", err)
      setError(err instanceof Error ? err.message : "Failed to continue as guest. Please try again.")
      hapticWarning()
    } finally {
      console.log("[AuthPage] handleContinueAsGuest: cleanup, setting isLoading to null")
      setIsLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--color-bg-grouped)]">
      {/* Invisible recaptcha container for phone auth */}
      <div id="recaptcha-container" />

      {/* Main content - centered with safe areas */}
      <div className="flex flex-1 flex-col items-center justify-center px-[32px] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Logo and branding */}
        <div className="mb-[56px] flex flex-col items-center">
          <AppLogo size={72} glow className="mb-[24px]" />
          <h1 className="text-[32px] font-bold tracking-[-0.8px] text-[var(--color-text-primary)]">
            The Brief
          </h1>
          <p className="mt-[10px] text-center text-[17px] leading-[1.35] text-[var(--color-text-secondary)]">
            Your daily insurance intelligence
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-[24px] w-full max-w-[300px] rounded-[12px] bg-[var(--color-destructive)]/10 px-[16px] py-[12px]">
            <p className="text-center text-[14px] text-[var(--color-destructive)]">{error}</p>
          </div>
        )}

        {/* Sign-in buttons */}
        <div className="flex w-full max-w-[300px] flex-col gap-[12px]">
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading !== null}
            className="flex h-[54px] w-full items-center justify-center gap-[12px] rounded-[12px] bg-[var(--color-surface)] text-[17px] font-semibold text-[var(--color-text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading === "google" ? (
              <Loader2 className="h-[20px] w-[20px] animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          {/* Phone Sign In */}
          <button
            onClick={handlePhoneSignIn}
            disabled={isLoading !== null}
            className="flex h-[54px] w-full items-center justify-center gap-[12px] rounded-[12px] bg-[var(--color-surface)] text-[17px] font-semibold text-[var(--color-text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading === "phone" && !showPhoneSheet ? (
              <Loader2 className="h-[20px] w-[20px] animate-spin" />
            ) : (
              <>
                <PhoneIcon />
                Continue with Phone
              </>
            )}
          </button>
        </div>

        {/* Guest option - subtle link style */}
        <button
          onClick={handleContinueAsGuest}
          disabled={isLoading !== null}
          className="mt-[32px] flex items-center justify-center gap-[6px] py-[12px] text-[15px] font-medium text-[var(--color-text-tertiary)] transition-colors active:text-[var(--color-text-secondary)] disabled:opacity-50"
        >
          {isLoading === "guest" ? (
            <Loader2 className="h-[16px] w-[16px] animate-spin" />
          ) : (
            "Continue as Guest"
          )}
        </button>

        {/* Disclaimer - positioned at bottom */}
        <p className="mt-auto pt-[24px] pb-[16px] max-w-[260px] text-center text-[13px] leading-[1.4] text-[var(--color-text-quaternary)]">
          Sign in to save bookmarks and sync across devices
        </p>
      </div>

      {/* Phone Sign In Sheet */}
      <Sheet open={showPhoneSheet} onOpenChange={setShowPhoneSheet}>
        <SheetContent side="bottom" className="rounded-t-[20px] px-[20px] pb-[calc(20px+env(safe-area-inset-bottom))]">
          <SheetHeader className="pb-[20px] pt-[4px]">
            <SheetTitle className="text-[22px] font-bold tracking-[-0.4px] text-center">
              {phoneStep === "phone" ? "Enter Phone Number" : "Enter Verification Code"}
            </SheetTitle>
            <SheetDescription className="text-[15px] leading-[1.45] tracking-[-0.16px] text-center text-[var(--color-text-secondary)] mt-[6px]">
              {phoneStep === "phone"
                ? "We'll send you a verification code"
                : `Code sent to ${phoneNumber}`
              }
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-[16px]">
            {phoneStep === "phone" ? (
              <>
                <input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-[16px] py-[14px] text-[17px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                />
                <button
                  onClick={handleSendCode}
                  disabled={isLoading === "phone" || !phoneNumber.trim()}
                  className="w-full rounded-[14px] bg-[var(--color-accent)] py-[16px] text-[17px] font-semibold text-white shadow-[0_2px_8px_rgba(0,122,255,0.25)] transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  {isLoading === "phone" ? "Sending..." : "Send Code"}
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-[16px] py-[14px] text-center text-[24px] font-semibold tracking-[8px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] placeholder:tracking-normal focus:border-[var(--color-accent)] focus:outline-none"
                  maxLength={6}
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={isLoading === "phone" || verificationCode.length !== 6}
                  className="w-full rounded-[14px] bg-[var(--color-accent)] py-[16px] text-[17px] font-semibold text-white shadow-[0_2px_8px_rgba(0,122,255,0.25)] transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  {isLoading === "phone" ? "Verifying..." : "Verify"}
                </button>
                <button
                  onClick={() => setPhoneStep("phone")}
                  className="w-full py-[12px] text-[15px] font-medium text-[var(--color-accent)]"
                >
                  Use a different number
                </button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
      <path d="M12 18h.01"/>
    </svg>
  )
}

