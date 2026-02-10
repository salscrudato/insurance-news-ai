/**
 * Auth Page - Landing page with sign-in options
 *
 * Provides Google sign-in, phone sign-in, and continue as guest options.
 * Apple-inspired design with clean, centered layout.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"
import { useAuth } from "@/lib/auth-context"
import { hapticLight, hapticSuccess, hapticWarning, hapticError } from "@/lib/haptics"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

// ---------------------------------------------------------------------------
// OTP Code Input — individual digit boxes, iOS-native feel
// ---------------------------------------------------------------------------
function OTPInput({
  value,
  onChange,
  length = 6,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const focusIndex = (i: number) => {
    const el = inputRefs.current[i]
    if (el) {
      el.focus()
      // iOS: ensure the caret is visible
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1) // take last digit only
    if (!digit && raw !== "") return // ignore non-numeric

    const arr = value.split("")
    arr[i] = digit
    const next = arr.join("").slice(0, length)
    onChange(next)

    // Advance focus
    if (digit && i < length - 1) {
      focusIndex(i + 1)
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault()
      const arr = value.split("")
      if (arr[i]) {
        // Clear current digit
        arr[i] = ""
        onChange(arr.join(""))
      } else if (i > 0) {
        // Move back and clear previous
        arr[i - 1] = ""
        onChange(arr.join(""))
        focusIndex(i - 1)
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focusIndex(i - 1)
    } else if (e.key === "ArrowRight" && i < length - 1) {
      focusIndex(i + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (pasted) {
      onChange(pasted)
      focusIndex(Math.min(pasted.length, length - 1))
    }
  }

  // Auto-focus first empty box when value is cleared externally (e.g. reset)
  const isEmpty = value === ""
  useEffect(() => {
    if (isEmpty) {
      focusIndex(0)
    }
  }, [isEmpty])

  return (
    <div className="flex items-center justify-center gap-[8px]">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={[
            "h-[52px] w-[44px]",
            "rounded-[10px]",
            "bg-[var(--color-fill-tertiary)]",
            "border border-transparent",
            "text-center text-[22px] font-semibold tracking-normal",
            "text-[var(--color-text-primary)]",
            "caret-[var(--color-accent)]",
            "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
            "focus:outline-none focus:border-[var(--color-accent)] focus:bg-[var(--color-surface)]",
            "focus:shadow-[0_0_0_3px_var(--color-accent-soft)]",
            "disabled:opacity-40",
          ].join(" ")}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Auth Page
// ---------------------------------------------------------------------------
export function AuthPage() {
  const navigate = useNavigate()
  const { signInWithGoogle, signInWithApple, signInWithPhone, continueAsGuest } = useAuth()

  const [isLoading, setIsLoading] = useState<"apple" | "google" | "phone" | "guest" | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Phone auth state
  const [showPhoneSheet, setShowPhoneSheet] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [confirmationResult, setConfirmationResult] = useState<Awaited<ReturnType<typeof signInWithPhone>> | null>(null)
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone")

  // Format phone number as user types: (555) 123-4567
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "")

    // Limit to 10 digits (US phone number)
    const limitedDigits = digits.slice(0, 10)

    // Format based on length
    if (limitedDigits.length === 0) {
      return ""
    } else if (limitedDigits.length <= 3) {
      return `(${limitedDigits}`
    } else if (limitedDigits.length <= 6) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
    } else {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
    }
  }

  // Get raw phone number for API (with country code)
  const getRawPhoneNumber = useCallback((): string => {
    const digits = phoneNumber.replace(/\D/g, "")
    return digits.length === 10 ? `+1${digits}` : ""
  }, [phoneNumber])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Refs for auto-focus
  const phoneInputRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // Apple
  // ---------------------------------------------------------------------------
  const handleAppleSignIn = async () => {
    setError(null)
    setIsLoading("apple")
    hapticLight()

    try {
      await signInWithApple()
      hapticSuccess()
      navigate("/", { replace: true })
    } catch (err) {
      console.error("Apple sign-in failed:", err)
      setError("Apple sign-in failed. Please try again.")
      hapticWarning()
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

  // ---------------------------------------------------------------------------
  // Phone — open sheet
  // ---------------------------------------------------------------------------
  const handlePhoneSignIn = () => {
    hapticLight()
    setPhoneError(null)
    setShowPhoneSheet(true)
    setPhoneStep("phone")
    setPhoneNumber("")
    setVerificationCode("")
    setConfirmationResult(null)
  }

  // Auto-focus phone input when sheet opens / step changes
  useEffect(() => {
    if (showPhoneSheet && phoneStep === "phone") {
      // Delay slightly so the sheet animation finishes and the input is mounted
      const t = setTimeout(() => phoneInputRef.current?.focus(), 380)
      return () => clearTimeout(t)
    }
  }, [showPhoneSheet, phoneStep])

  // ---------------------------------------------------------------------------
  // Phone — send code
  // ---------------------------------------------------------------------------
  const handleSendCode = useCallback(async () => {
    const rawNumber = getRawPhoneNumber()
    if (!rawNumber) return

    setPhoneError(null)
    setIsLoading("phone")
    hapticLight()

    try {
      const result = await signInWithPhone(rawNumber)
      setConfirmationResult(result)
      setPhoneStep("code")
      setVerificationCode("")
      hapticSuccess()
    } catch (err) {
      console.error("Phone sign-in failed:", err)
      setPhoneError("Couldn\u2019t send code. Check the number and try again.")
      hapticError()
    } finally {
      setIsLoading(null)
    }
  }, [getRawPhoneNumber, signInWithPhone])

  // ---------------------------------------------------------------------------
  // Phone — verify code (auto-submits when 6 digits entered)
  // ---------------------------------------------------------------------------
  const handleVerifyCode = useCallback(async (code?: string) => {
    const codeToVerify = code ?? verificationCode
    if (!confirmationResult || codeToVerify.length !== 6) return

    setPhoneError(null)
    setIsLoading("phone")
    hapticLight()

    try {
      await confirmationResult.confirm(codeToVerify)
      hapticSuccess()
      setShowPhoneSheet(false)
      navigate("/", { replace: true })
    } catch (err) {
      console.error("Code verification failed:", err)
      setPhoneError("Invalid code. Please try again.")
      setVerificationCode("")
      hapticError()
    } finally {
      setIsLoading(null)
    }
  }, [confirmationResult, verificationCode, navigate])

  // Auto-submit when code reaches 6 digits
  const handleCodeChange = useCallback((code: string) => {
    setVerificationCode(code)
    if (code.length === 6 && confirmationResult) {
      // Small delay so the user sees the last digit render
      setTimeout(() => handleVerifyCode(code), 120)
    }
  }, [confirmationResult, handleVerifyCode])

  // ---------------------------------------------------------------------------
  // Guest
  // ---------------------------------------------------------------------------
  const handleContinueAsGuest = async () => {
    setError(null)
    setIsLoading("guest")
    hapticLight()

    try {
      await continueAsGuest()
      hapticSuccess()
      navigate("/", { replace: true })
    } catch (err) {
      console.error("[AuthPage] handleContinueAsGuest failed:", err)
      setError(err instanceof Error ? err.message : "Failed to continue as guest. Please try again.")
      hapticWarning()
    } finally {
      setIsLoading(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Clean up sheet state when closed externally (swipe / overlay tap)
  // ---------------------------------------------------------------------------
  const handleSheetOpenChange = (open: boolean) => {
    setShowPhoneSheet(open)
    if (!open) {
      // Reset after close animation
      setTimeout(() => {
        setPhoneError(null)
        setIsLoading(null)
      }, 300)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--color-background)]">
      {/* Invisible recaptcha container for phone auth */}
      <div id="recaptcha-container" />

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

        {/* Error message (main page level — Google / Guest errors) */}
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

          {/* Phone Sign In */}
          <button
            onClick={handlePhoneSignIn}
            disabled={isLoading !== null}
            className="relative flex h-[50px] w-full items-center justify-center gap-[10px] rounded-[12px] bg-[var(--color-surface)] text-[16px] font-semibold tracking-[-0.2px] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)] active:scale-[0.98] active:shadow-[var(--shadow-xs)] disabled:opacity-40"
          >
            {isLoading === "phone" && !showPhoneSheet ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin text-[var(--color-text-tertiary)]" />
            ) : (
              <>
                <PhoneIcon />
                <span>Continue with Phone</span>
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
          Sign in to save bookmarks and sync across devices
        </p>

        {/* Terms & Privacy */}
        <nav
          className="pb-[max(20px,env(safe-area-inset-bottom))] pt-[12px] flex flex-wrap items-center justify-center gap-x-[10px] gap-y-[4px]"
          aria-label="Legal"
        >
          <Link
            to="/terms"
            className="text-[12px] font-medium tracking-[-0.08px] text-[var(--color-text-tertiary)] underline underline-offset-2 transition-colors active:text-[var(--color-text-secondary)]"
            onClick={() => hapticLight()}
          >
            Terms of Service
          </Link>
          <span className="text-[var(--color-text-quaternary)]" aria-hidden>·</span>
          <Link
            to="/privacy"
            className="text-[12px] font-medium tracking-[-0.08px] text-[var(--color-text-tertiary)] underline underline-offset-2 transition-colors active:text-[var(--color-text-secondary)]"
            onClick={() => hapticLight()}
          >
            Privacy Policy
          </Link>
        </nav>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Phone Sign In Sheet                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={showPhoneSheet} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-[16px] px-[24px] pb-[calc(24px+env(safe-area-inset-bottom))]"
        >
          {/* Drag indicator */}
          <div className="flex justify-center pt-[10px] pb-[6px]">
            <div className="h-[5px] w-[36px] rounded-full bg-[var(--color-fill-secondary)]" />
          </div>

          <SheetHeader className="pb-[24px] pt-[8px]">
            <SheetTitle className="text-[20px] font-bold tracking-[-0.4px] text-center text-[var(--color-text-primary)]">
              {phoneStep === "phone" ? "Enter Phone Number" : "Verify Your Number"}
            </SheetTitle>
            <SheetDescription className="text-[15px] leading-[1.45] tracking-[-0.2px] text-center text-[var(--color-text-secondary)] mt-[4px]">
              {phoneStep === "phone"
                ? "We\u2019ll send a verification code via SMS"
                : (
                    <>
                      Enter the 6-digit code sent to{" "}
                      <span className="font-medium text-[var(--color-text-primary)]">{phoneNumber}</span>
                    </>
                  )
              }
            </SheetDescription>
          </SheetHeader>

          {/* Inline error for phone sheet */}
          {phoneError && (
            <div className="mb-[16px] rounded-[10px] bg-[var(--color-destructive-soft)] px-[14px] py-[10px]">
              <p className="text-center text-[14px] leading-[1.35] tracking-[-0.15px] text-[var(--color-destructive)]">
                {phoneError}
              </p>
            </div>
          )}

          {/* Step: Phone number entry */}
          {phoneStep === "phone" && (
            <div className="flex flex-col gap-[14px]">
              <input
                ref={phoneInputRef}
                type="tel"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={(e) => {
                  handlePhoneChange(e)
                  setPhoneError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSendCode()
                  }
                }}
                disabled={isLoading === "phone"}
                className={[
                  "h-[50px] w-full rounded-[12px] px-[16px]",
                  "bg-[var(--color-fill-tertiary)]",
                  "border border-transparent",
                  "text-[17px] tracking-[-0.4px] text-[var(--color-text-primary)]",
                  "placeholder:text-[var(--color-text-placeholder)]",
                  "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
                  "focus:outline-none focus:bg-[var(--color-surface)] focus:border-[var(--color-accent)]",
                  "focus:shadow-[0_0_0_3px_var(--color-accent-soft)]",
                  "disabled:opacity-40",
                ].join(" ")}
              />
              <button
                onClick={handleSendCode}
                disabled={isLoading === "phone" || !getRawPhoneNumber()}
                className={[
                  "flex h-[50px] w-full items-center justify-center",
                  "rounded-[12px]",
                  "bg-[var(--color-accent)] text-white",
                  "text-[16px] font-semibold tracking-[-0.2px]",
                  "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
                  "active:scale-[0.98] active:brightness-95",
                  "disabled:opacity-40 disabled:active:scale-100",
                ].join(" ")}
              >
                {isLoading === "phone" ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  "Send Code"
                )}
              </button>
            </div>
          )}

          {/* Step: Code verification */}
          {phoneStep === "code" && (
            <div className="flex flex-col gap-[16px]">
              <OTPInput
                value={verificationCode}
                onChange={handleCodeChange}
                disabled={isLoading === "phone"}
              />

              <button
                onClick={() => handleVerifyCode()}
                disabled={isLoading === "phone" || verificationCode.length !== 6}
                className={[
                  "flex h-[50px] w-full items-center justify-center",
                  "rounded-[12px]",
                  "bg-[var(--color-accent)] text-white",
                  "text-[16px] font-semibold tracking-[-0.2px]",
                  "transition-all duration-[var(--duration-fast)] ease-[var(--ease-ios)]",
                  "active:scale-[0.98] active:brightness-95",
                  "disabled:opacity-40 disabled:active:scale-100",
                ].join(" ")}
              >
                {isLoading === "phone" ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  "Verify"
                )}
              </button>

              {/* Secondary actions */}
              <div className="flex flex-col items-center gap-[2px] pt-[4px]">
                <button
                  onClick={() => {
                    setPhoneStep("phone")
                    setVerificationCode("")
                    setPhoneError(null)
                  }}
                  disabled={isLoading === "phone"}
                  className="py-[8px] text-[15px] font-medium tracking-[-0.2px] text-[var(--color-accent)] transition-opacity active:opacity-60 disabled:opacity-40"
                >
                  Use a different number
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
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

function PhoneIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
      <path d="M12 18h.01"/>
    </svg>
  )
}
