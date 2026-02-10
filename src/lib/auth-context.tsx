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
    console.log("[AuthProvider] Setting up auth state listener...")
    let authStateReceived = false
    const isNative = Capacitor.isNativePlatform()

    // Check for existing local guest session
    const localGuest = localStorage.getItem(LOCAL_GUEST_KEY)
    if (localGuest) {
      console.log("[AuthProvider] Found local guest session")
      setIsLocalGuest(true)
      setIsLoading(false)
      authStateReceived = true
    }

    // Check for redirect result (from signInWithRedirect) - web only
    if (!isNative) {
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            console.log("[AuthProvider] Got redirect result, user:", result.user.uid)
          }
        })
        .catch((error) => {
          console.error("[AuthProvider] Redirect result error:", error)
        })
    }

    // For native platforms, listen to the native plugin's auth state changes
    // This is needed because the native Firebase SDK auth state doesn't automatically
    // sync with the web SDK's onAuthStateChanged
    let nativeListenerHandle: { remove: () => Promise<void> } | null = null

    if (isNative) {
      console.log("[AuthProvider] Setting up native auth state listener...")
      FirebaseAuthentication.addListener('authStateChange', (change) => {
        console.log("[AuthProvider] Native authStateChange:", change.user?.uid ?? "null")
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
        console.log("[AuthProvider] Native getCurrentUser:", result.user?.uid ?? "null")
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
      }).catch((error) => {
        console.error("[AuthProvider] Native getCurrentUser error:", error)
      })
    }

    // Web SDK auth state listener (works on web, may not fire on native after native sign-in)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("[AuthProvider] onAuthStateChanged fired, user:", firebaseUser?.uid ?? "null")
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
        console.warn("[AuthProvider] Auth state timeout - forcing isLoading to false")
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
    console.log("[AuthContext] signInWithGoogle: isNative =", isNative)

    if (isNative) {
      console.log("[AuthContext] Native: calling signInWithGoogle...")
      try {
        const result = await FirebaseAuthentication.signInWithGoogle()
        console.log("[AuthContext] Native: signInWithGoogle result:", result)
        if (!result.user) {
          throw new Error("Google sign-in failed - no user returned")
        }
      } catch (error) {
        console.error("[AuthContext] Native: signInWithGoogle error:", error)
        throw error
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
    console.log("[AuthContext] signInWithApple: isNative =", isNative)

    if (isNative) {
      console.log("[AuthContext] Native: calling signInWithApple...")
      try {
        const currentUser = auth.currentUser

        // If user is anonymous, try to link Apple credential to preserve their data
        if (currentUser && currentUser.isAnonymous) {
          console.log("[AuthContext] Native: anonymous user detected, attempting link...")
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
            console.log("[AuthContext] Native: linked Apple credential to anonymous user")

            if (result.user?.displayName) {
              await currentUser.reload()
            }
            return
          } catch (linkError: unknown) {
            const firebaseError = linkError as { code?: string }
            console.warn("[AuthContext] Native: link failed, signing in directly:", firebaseError)
            if (firebaseError.code !== "auth/credential-already-in-use") {
              throw linkError
            }
          }
        }

        // Direct sign-in (no anonymous user, or linking failed)
        const result = await FirebaseAuthentication.signInWithApple()
        console.log("[AuthContext] Native: signInWithApple result:", result)

        if (!result.user) {
          throw new Error("Apple sign-in failed - no user returned")
        }
      } catch (error) {
        console.error("[AuthContext] Native: signInWithApple error:", error)
        throw error
      }
    } else {
      // Web flow using Firebase OAuthProvider popup
      const appleProvider = new OAuthProvider("apple.com")
      appleProvider.addScope("email")
      appleProvider.addScope("name")

      const currentUser = auth.currentUser

      if (currentUser && currentUser.isAnonymous) {
        console.log("[AuthContext] Web: anonymous user detected, attempting link...")
        try {
          const result = await signInWithPopup(auth, appleProvider)
          if (result.user) {
            const credential = OAuthProvider.credentialFromResult(result)
            if (credential) {
              await linkWithCredential(currentUser, credential)
              console.log("[AuthContext] Web: linked Apple credential to anonymous user")
              return
            }
          }
        } catch (linkError: unknown) {
          const firebaseError = linkError as { code?: string }
          console.warn("[AuthContext] Web: link failed, signing in directly:", firebaseError)
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
    console.log("[AuthContext] continueAsGuest: starting...")

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("timeout"))
      }, 3000)
    })

    try {
      console.log("[AuthContext] continueAsGuest: trying Firebase signInAnonymously...")
      const result = await Promise.race([
        signInAnonymously(auth),
        timeoutPromise
      ])
      console.log("[AuthContext] continueAsGuest: Firebase auth succeeded", result.user?.uid)
    } catch {
      console.log("[AuthContext] continueAsGuest: Firebase auth failed, using local guest mode")
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

    const hadUser = !!user
    setUser(null)

    if (hadUser) {
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
          console.log("[AuthContext] Native: calling signOut...")
          await withTimeout(FirebaseAuthentication.signOut())
          console.log("[AuthContext] Native: signOut completed")
        } else {
          await withTimeout(firebaseSignOut(auth))
        }
      } catch (error) {
        console.warn("[AuthContext] signOut SDK call failed (may be expected after account deletion):", error)
      }
    }
  }, [user])

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
