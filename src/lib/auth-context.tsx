/**
 * Firebase Auth Context
 *
 * Provides authentication state throughout the app.
 * Supports Apple sign-in, Google sign-in, and anonymous (guest) auth.
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
  signInWithCredential,
  getRedirectResult,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  linkWithCredential,
  type User,
} from "firebase/auth"
import { Capacitor } from "@capacitor/core"
import { FirebaseAuthentication } from "@capacitor-firebase/authentication"
import { auth } from "@/lib/firebase"

const LOCAL_GUEST_KEY = "pnc_brief_local_guest"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAnonymous: boolean
  isLocalGuest: boolean
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
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
  signInWithApple: async () => {},
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
    let authStateReceived = false

    // Check for existing local guest session
    const localGuest = localStorage.getItem(LOCAL_GUEST_KEY)
    if (localGuest) {
      setIsLocalGuest(true)
      setIsLoading(false)
      authStateReceived = true
    }

    // Check for redirect result (from signInWithRedirect) — web only
    if (!Capacitor.isNativePlatform()) {
      getRedirectResult(auth).catch(() => {
        // Redirect result error — ignore, onAuthStateChanged will handle
      })
    }

    // Web SDK auth state listener — single source of truth for user state.
    // On native, our sign-in methods sync the credential to the web SDK
    // via signInWithCredential, so this listener fires for all platforms.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      authStateReceived = true
      setUser(firebaseUser)
      if (firebaseUser) {
        localStorage.removeItem(LOCAL_GUEST_KEY)
        setIsLocalGuest(false)
      }
      setIsLoading(false)
    })

    // Timeout fallback — if auth state hasn't been received after 5 seconds,
    // force loading to false so the app doesn't hang
    const timeoutId = setTimeout(() => {
      if (!authStateReceived) {
        setIsLoading(false)
      }
    }, 5000)

    return () => {
      clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [])

  // Sign in with Google
  // On native: uses native Google Sign-In SDK, then syncs credential to web Firebase SDK.
  // On web: uses Firebase popup sign-in directly.
  const signInWithGoogle = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      // 1. Sign in on the native layer
      const result = await FirebaseAuthentication.signInWithGoogle()

      // 2. Sync to web layer using the credential from native
      const idToken = result.credential?.idToken
      if (!idToken) {
        throw new Error("Google sign-in failed — no ID token returned from native")
      }

      const credential = GoogleAuthProvider.credential(idToken)
      await signInWithCredential(auth, credential)
    } else {
      await signInWithPopup(auth, googleProvider)
    }
  }, [])

  // Sign in with Apple
  // On native: uses skipNativeAuth so the plugin only presents the Apple Sign-In UI
  // and returns raw credentials without signing in on the native Firebase SDK.
  // We then sign in on the web SDK ourselves using signInWithCredential.
  // (Apple Sign-In requires skipNativeAuth=true per the capacitor-firebase docs.)
  // On web: uses Firebase popup sign-in directly.
  // If the current user is anonymous, attempts to link Apple credential to preserve data.
  const signInWithApple = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      // skipNativeAuth: true — only get the Apple credential, don't sign in natively.
      // This is required for Apple Sign-In to work with the web Firebase SDK because
      // the nonce must be handled consistently on a single layer.
      const result = await FirebaseAuthentication.signInWithApple({
        skipNativeAuth: true,
      })

      if (!result.credential?.idToken) {
        throw new Error("Apple sign-in failed — no credential returned")
      }

      const oauthCredential = new OAuthProvider("apple.com").credential({
        idToken: result.credential.idToken,
        rawNonce: result.credential.nonce ?? undefined,
      })

      const currentUser = auth.currentUser

      // If user is anonymous, try to link Apple credential to preserve their data
      if (currentUser && currentUser.isAnonymous) {
        try {
          await linkWithCredential(currentUser, oauthCredential)
          await currentUser.reload()
          return
        } catch (linkError: unknown) {
          const firebaseError = linkError as { code?: string }
          // If credential is already linked to another account, fall through to
          // a regular sign-in which will switch to that account instead.
          if (firebaseError.code !== "auth/credential-already-in-use") {
            throw linkError
          }
        }
      }

      // Direct sign-in — sync credential to web SDK
      await signInWithCredential(auth, oauthCredential)
    } else {
      // Web flow using Firebase OAuthProvider popup
      const appleProvider = new OAuthProvider("apple.com")
      appleProvider.addScope("email")
      appleProvider.addScope("name")

      const currentUser = auth.currentUser

      if (currentUser && currentUser.isAnonymous) {
        try {
          const result = await signInWithPopup(auth, appleProvider)
          if (result.user) {
            const credential = OAuthProvider.credentialFromResult(result)
            if (credential) {
              await linkWithCredential(currentUser, credential)
              return
            }
          }
        } catch (linkError: unknown) {
          const firebaseError = linkError as { code?: string }
          if (firebaseError.code !== "auth/credential-already-in-use") {
            throw linkError
          }
        }
      }

      await signInWithPopup(auth, appleProvider)
    }
  }, [])

  // Continue as guest - tries Firebase anonymous auth first, falls back to local guest mode
  const continueAsGuest = useCallback(async (): Promise<void> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("timeout"))
      }, 3000)
    })

    try {
      await Promise.race([
        signInAnonymously(auth),
        timeoutPromise
      ])
    } catch {
      localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify({
        createdAt: Date.now(),
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
      setIsLocalGuest(true)
    }
  }, [])

  // Sign out
  // Designed to be resilient — always clears local state even if Firebase SDK
  // calls fail (e.g., after server-side account deletion).
  // On native, signs out of both the native SDK and the web SDK.
  const signOut = useCallback(async () => {
    localStorage.removeItem(LOCAL_GUEST_KEY)
    setIsLocalGuest(false)

    const currentUser = auth.currentUser
    setUser(null)

    if (currentUser) {
      const timeoutMs = 4000
      const withTimeout = <T,>(p: Promise<T>): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("signOut timeout")), timeoutMs)
          ),
        ])

      try {
        if (Capacitor.isNativePlatform()) {
          // Sign out of both native and web SDKs in parallel
          await withTimeout(
            Promise.all([
              FirebaseAuthentication.signOut(),
              firebaseSignOut(auth),
            ]).then(() => {})
          )
        } else {
          await withTimeout(firebaseSignOut(auth))
        }
      } catch {
        // Expected: signOut SDK call may fail after server-side account deletion
      }
    }
  }, [])

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
        signInWithApple,
        continueAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
