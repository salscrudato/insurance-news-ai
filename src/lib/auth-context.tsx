/**
 * Firebase Auth Context
 *
 * Provides authentication state throughout the app.
 * Supports Google sign-in, phone sign-in, and anonymous (guest) auth.
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
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  RecaptchaVerifier,
  type User,
  type ConfirmationResult,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAnonymous: boolean
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
  signInWithGoogle: async () => {},
  signInWithPhone: async () => { throw new Error("Not initialized") },
  continueAsGuest: async () => {},
  signOut: async () => {},
})

// Google auth provider
const googleProvider = new GoogleAuthProvider()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
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

  // Continue as guest (anonymous auth)
  const continueAsGuest = useCallback(async () => {
    await signInAnonymously(auth)
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAnonymous: user?.isAnonymous ?? false,
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

