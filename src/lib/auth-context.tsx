/**
 * Firebase Auth Context
 *
 * Provides authentication state throughout the app.
 * Supports Google sign-in, phone sign-in, and anonymous (guest) auth.
 * Falls back to local guest mode when Firebase auth is unavailable (e.g., in Capacitor WebView).
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  RecaptchaVerifier,
  type User,
  type ConfirmationResult,
} from "firebase/auth"
import { Capacitor } from "@capacitor/core"
import { auth } from "@/lib/firebase"

const LOCAL_GUEST_KEY = "pnc_brief_local_guest"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAnonymous: boolean
  isLocalGuest: boolean // New: true when using local guest mode (no Firebase)
  signInWithGoogle: () => Promise<void>
  signInWithPhone: (phoneNumber: string) => Promise<ConfirmationResult>
  continueAsGuest: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAnonymous: false,
  isLocalGuest: false,
  signInWithGoogle: async () => {},
  signInWithPhone: async () => { throw new Error("Not initialized") },
  continueAsGuest: async () => {},
  signOut: async () => {},
})

// Google auth provider
const googleProvider = new GoogleAuthProvider()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLocalGuest, setIsLocalGuest] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log("[AuthProvider] Setting up auth state listener...")
    let authStateReceived = false

    // Check for existing local guest session
    const localGuest = localStorage.getItem(LOCAL_GUEST_KEY)
    if (localGuest) {
      console.log("[AuthProvider] Found local guest session")
      setIsLocalGuest(true)
      setIsLoading(false)
      authStateReceived = true
    }

    // Check for redirect result (from signInWithRedirect)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("[AuthProvider] Got redirect result, user:", result.user.uid)
        }
      })
      .catch((error) => {
        console.error("[AuthProvider] Redirect result error:", error)
      })

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("[AuthProvider] onAuthStateChanged fired, user:", firebaseUser?.uid ?? "null")
      authStateReceived = true
      setUser(firebaseUser)
      // If we have a Firebase user, clear local guest mode
      if (firebaseUser) {
        localStorage.removeItem(LOCAL_GUEST_KEY)
        setIsLocalGuest(false)
      }
      setIsLoading(false)
    })

    // Timeout fallback - if auth state hasn't been received after 5 seconds,
    // force loading to false so the app doesn't hang
    const timeoutId = setTimeout(() => {
      if (!authStateReceived) {
        console.warn("[AuthProvider] Auth state timeout - forcing isLoading to false")
        setIsLoading(false)
      }
    }, 5000)

    return () => {
      clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [])

  // Sign in with Google
  // Uses redirect on native platforms (popup doesn't work in Capacitor WebView)
  const signInWithGoogle = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform()
    console.log("[AuthContext] signInWithGoogle: isNative =", isNative)

    if (isNative) {
      // Use redirect flow for native apps
      await signInWithRedirect(auth, googleProvider)
    } else {
      // Use popup for web
      await signInWithPopup(auth, googleProvider)
    }
  }, [])

  // Sign in with phone number - returns confirmation result for OTP verification
  const signInWithPhone = useCallback(async (phoneNumber: string) => {
    // Create invisible recaptcha verifier
    const recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    })
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
    return confirmationResult
  }, [])

  // Continue as guest - tries Firebase anonymous auth first, falls back to local guest mode
  const continueAsGuest = useCallback(async (): Promise<void> => {
    console.log("[AuthContext] continueAsGuest: starting...")

    // Create a timeout promise (3 seconds for faster fallback)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("timeout"))
      }, 3000)
    })

    try {
      // Try Firebase anonymous auth first
      console.log("[AuthContext] continueAsGuest: trying Firebase signInAnonymously...")
      const result = await Promise.race([
        signInAnonymously(auth),
        timeoutPromise
      ])
      console.log("[AuthContext] continueAsGuest: Firebase auth succeeded", result.user?.uid)
    } catch (error) {
      // Firebase auth failed or timed out - use local guest mode
      console.log("[AuthContext] continueAsGuest: Firebase auth failed, using local guest mode")
      localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify({
        createdAt: Date.now(),
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
      setIsLocalGuest(true)
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    // Clear local guest mode
    localStorage.removeItem(LOCAL_GUEST_KEY)
    setIsLocalGuest(false)
    // Sign out of Firebase if authenticated
    if (user) {
      await firebaseSignOut(auth)
    }
  }, [user])

  // User is authenticated if they have a Firebase user OR are a local guest
  const isAuthenticated = !!user || isLocalGuest

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAnonymous: user?.isAnonymous ?? false,
        isLocalGuest,
        signInWithGoogle,
        signInWithPhone,
        continueAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

