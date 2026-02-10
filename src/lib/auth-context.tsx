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
    const isNative = Capacitor.isNativePlatform()

    // Check for existing local guest session
    const localGuest = localStorage.getItem(LOCAL_GUEST_KEY)
    if (localGuest) {
      setIsLocalGuest(true)
      setIsLoading(false)
      authStateReceived = true
    }

    // Check for redirect result (from signInWithRedirect) - web only
    if (!isNative) {
      getRedirectResult(auth).catch(() => {
        // Redirect result error - ignore, onAuthStateChanged will handle
      })
    }

    // For native platforms, listen to the native plugin's auth state changes
    // This is needed because the native Firebase SDK auth state doesn't automatically
    // sync with the web SDK's onAuthStateChanged
    let nativeListenerHandle: { remove: () => Promise<void> } | null = null

    if (isNative) {
      FirebaseAuthentication.addListener('authStateChange', (change) => {
        authStateReceived = true

        if (change.user) {
          const nativeUser = {
            uid: change.user.uid,
            email: change.user.email,
            displayName: change.user.displayName,
            photoURL: change.user.photoUrl,
            phoneNumber: change.user.phoneNumber,
            emailVerified: change.user.emailVerified,
            isAnonymous: change.user.isAnonymous,
            providerId: change.user.providerId || 'firebase',
            metadata: {},
            providerData: change.user.providerData || [],
            refreshToken: '',
            tenantId: change.user.tenantId || null,
            delete: async () => { throw new Error("Not implemented") },
            getIdToken: async () => "",
            getIdTokenResult: async () => ({ token: "", claims: {}, authTime: "", issuedAtTime: "", expirationTime: "", signInProvider: null, signInSecondFactor: null }),
            reload: async () => {},
            toJSON: () => ({}),
          } as unknown as User

          setUser(nativeUser)
          localStorage.removeItem(LOCAL_GUEST_KEY)
          setIsLocalGuest(false)
        } else {
          setUser(null)
        }
        setIsLoading(false)
      }).then(handle => {
        nativeListenerHandle = handle
      })

      // Also check current user immediately on native
      FirebaseAuthentication.getCurrentUser().then((result) => {
        if (result.user && !authStateReceived) {
          authStateReceived = true
          const nativeUser = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoUrl,
            phoneNumber: result.user.phoneNumber,
            emailVerified: result.user.emailVerified,
            isAnonymous: result.user.isAnonymous,
            providerId: result.user.providerId || 'firebase',
            metadata: {},
            providerData: result.user.providerData || [],
            refreshToken: '',
            tenantId: result.user.tenantId || null,
            delete: async () => { throw new Error("Not implemented") },
            getIdToken: async () => "",
            getIdTokenResult: async () => ({ token: "", claims: {}, authTime: "", issuedAtTime: "", expirationTime: "", signInProvider: null, signInSecondFactor: null }),
            reload: async () => {},
            toJSON: () => ({}),
          } as unknown as User

          setUser(nativeUser)
          localStorage.removeItem(LOCAL_GUEST_KEY)
          setIsLocalGuest(false)
          setIsLoading(false)
        }
      }).catch(() => {
        // Native getCurrentUser error - ignore, onAuthStateChanged will handle
      })
    }

    // Web SDK auth state listener (works on web, may not fire on native after native sign-in)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      authStateReceived = true
      setUser(firebaseUser)
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
        // Auth state timeout - force loading to false so the app doesn't hang
        setIsLoading(false)
      }
    }, 5000)

    return () => {
      clearTimeout(timeoutId)
      unsubscribe()
      if (nativeListenerHandle) {
        nativeListenerHandle.remove()
      }
    }
  }, [])

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform()

    if (isNative) {
      const result = await FirebaseAuthentication.signInWithGoogle()
      if (!result.user) {
        throw new Error("Google sign-in failed - no user returned")
      }
    } else {
      await signInWithPopup(auth, googleProvider)
    }
  }, [])

  // Sign in with Apple
  // Uses native Firebase Authentication plugin on iOS, Firebase web SDK on web
  // If the current user is anonymous, attempts to link Apple credential to preserve data
  const signInWithApple = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform()

    if (isNative) {
      const currentUser = auth.currentUser

      // If user is anonymous, try to link Apple credential to preserve their data
      if (currentUser && currentUser.isAnonymous) {
        try {
          const result = await FirebaseAuthentication.signInWithApple()
          if (!result.credential?.idToken) {
            throw new Error("Apple sign-in returned no ID token")
          }

          const oauthCredential = new OAuthProvider("apple.com").credential({
            idToken: result.credential.idToken,
            rawNonce: result.credential.nonce ?? undefined,
          })

          await linkWithCredential(currentUser, oauthCredential)

          if (result.user?.displayName) {
            await currentUser.reload()
          }
          return
        } catch (linkError: unknown) {
          const firebaseError = linkError as { code?: string }
          if (firebaseError.code !== "auth/credential-already-in-use") {
            throw linkError
          }
        }
      }

      // Direct sign-in (no anonymous user, or linking failed)
      const result = await FirebaseAuthentication.signInWithApple()

      if (!result.user) {
        throw new Error("Apple sign-in failed - no user returned")
      }
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
  const signOut = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform()

    localStorage.removeItem(LOCAL_GUEST_KEY)
    setIsLocalGuest(false)

    // Use auth.currentUser instead of stale closure to check if there's a user
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
        if (isNative) {
          await withTimeout(FirebaseAuthentication.signOut())
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
