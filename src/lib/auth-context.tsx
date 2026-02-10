/**
 * Firebase Auth Context
 *
 * Provides authentication state throughout the app.
 * Supports Google sign-in, phone sign-in, and anonymous (guest) auth.
 * Falls back to local guest mode when Firebase auth is unavailable (e.g., in Capacitor WebView).
 *
 * Phone auth uses native Firebase SDK on iOS (via @capacitor-firebase/authentication)
 * to bypass reCAPTCHA issues, with web fallback for browsers.
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
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  signInWithCredential,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  PhoneAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  type User,
  type ConfirmationResult,
} from "firebase/auth"
import { Capacitor } from "@capacitor/core"
import { FirebaseAuthentication } from "@capacitor-firebase/authentication"
import { auth } from "@/lib/firebase"

// Singleton RecaptchaVerifier to avoid creating multiple instances
let recaptchaVerifier: RecaptchaVerifier | null = null

const LOCAL_GUEST_KEY = "pnc_brief_local_guest"

// Phone auth result type - works for both web and native flows
export interface PhoneAuthResult {
  // For web flow: standard Firebase confirmation result
  webConfirmationResult?: ConfirmationResult
  // For native flow: verification ID from Capacitor plugin
  nativeVerificationId?: string
  // Method to verify the code (works for both flows)
  confirm: (code: string) => Promise<void>
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAnonymous: boolean
  isLocalGuest: boolean // New: true when using local guest mode (no Firebase)
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signInWithPhone: (phoneNumber: string) => Promise<PhoneAuthResult>
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
          // Convert native user to a format compatible with our app
          // We'll create a minimal user object that works with our context
          const nativeUser = {
            uid: change.user.uid,
            email: change.user.email,
            displayName: change.user.displayName,
            photoURL: change.user.photoUrl,
            phoneNumber: change.user.phoneNumber,
            emailVerified: change.user.emailVerified,
            isAnonymous: change.user.isAnonymous,
            // Add required User interface properties
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
      if (nativeListenerHandle) {
        nativeListenerHandle.remove()
      }
    }
  }, [])

  // Sign in with Google
  // Uses redirect on native platforms (popup doesn't work in Capacitor WebView)
  const signInWithGoogle = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform()
    console.log("[AuthContext] signInWithGoogle: isNative =", isNative)

    if (isNative) {
      // Use native Firebase Authentication plugin for iOS
      // This uses the native Google Sign-In SDK
      console.log("[AuthContext] Native: calling signInWithGoogle...")
      try {
        const result = await FirebaseAuthentication.signInWithGoogle()
        console.log("[AuthContext] Native: signInWithGoogle result:", result)

        // The native plugin automatically signs in to Firebase
        // The auth state listener will pick up the new user
        if (!result.user) {
          throw new Error("Google sign-in failed - no user returned")
        }
      } catch (error) {
        console.error("[AuthContext] Native: signInWithGoogle error:", error)
        throw error
      }
    } else {
      // Use popup for web
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
      // Use native Firebase Authentication plugin for iOS
      // This triggers the native ASAuthorizationController flow
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

            // Build OAuthCredential for linking
            const oauthCredential = new OAuthProvider("apple.com").credential({
              idToken: result.credential.idToken,
              rawNonce: result.credential.nonce ?? undefined,
            })

            // Attempt to link credentials
            await linkWithCredential(currentUser, oauthCredential)
            console.log("[AuthContext] Native: linked Apple credential to anonymous user")

            // Update display name if provided by Apple
            if (result.user?.displayName) {
              await currentUser.reload()
            }
            return
          } catch (linkError: unknown) {
            const firebaseError = linkError as { code?: string }
            console.warn("[AuthContext] Native: link failed, signing in directly:", firebaseError)
            // If linking fails (credential-already-in-use), fall through to direct sign-in
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

      // If user is anonymous, try to link
      if (currentUser && currentUser.isAnonymous) {
        console.log("[AuthContext] Web: anonymous user detected, attempting link...")
        try {
          const result = await signInWithPopup(auth, appleProvider)
          if (result.user) {
            // Build credential and link
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

      // Direct sign-in
      await signInWithPopup(auth, appleProvider)
    }
  }, [])

  // Sign in with phone number - uses native SDK on iOS, web SDK otherwise
  // Returns a PhoneAuthResult with a unified confirm() method
  const signInWithPhone = useCallback(async (phoneNumber: string): Promise<PhoneAuthResult> => {
    const isNative = Capacitor.isNativePlatform()
    console.log("[AuthContext] signInWithPhone: isNative =", isNative, "phoneNumber =", phoneNumber)

    if (isNative) {
      // Native iOS flow using Capacitor Firebase Authentication plugin
      // This uses APNs for silent push verification - no reCAPTCHA needed!
      return new Promise<PhoneAuthResult>((resolve, reject) => {
        let verificationId: string | null = null

        // Set up listeners for phone verification events
        const setupListeners = async () => {
          // Listen for verification code sent (user needs to enter code)
          const codeSentListener = await FirebaseAuthentication.addListener(
            "phoneCodeSent",
            (event) => {
              console.log("[AuthContext] Native: phoneCodeSent, verificationId:", event.verificationId)
              verificationId = event.verificationId

              // Resolve with the PhoneAuthResult
              resolve({
                nativeVerificationId: event.verificationId,
                confirm: async (code: string) => {
                  console.log("[AuthContext] Native: confirming verification code...")
                  const result = await FirebaseAuthentication.confirmVerificationCode({
                    verificationId: event.verificationId,
                    verificationCode: code,
                  })
                  console.log("[AuthContext] Native: verification confirmed, user:", result.user?.uid)

                  // Sign in to web SDK using the credential from native
                  // This syncs the auth state between native and web layers
                  if (result.credential?.idToken) {
                    const credential = PhoneAuthProvider.credential(event.verificationId, code)
                    await signInWithCredential(auth, credential)
                  }
                },
              })

              // Clean up listeners after resolving
              codeSentListener.remove()
              failedListener.remove()
              completedListener.remove()
            }
          )

          // Listen for verification failure
          const failedListener = await FirebaseAuthentication.addListener(
            "phoneVerificationFailed",
            (event) => {
              console.error("[AuthContext] Native: phoneVerificationFailed:", event.message)
              reject(new Error(event.message))

              // Clean up listeners
              codeSentListener.remove()
              failedListener.remove()
              completedListener.remove()
            }
          )

          // Listen for auto-verification (Android only, but good to handle)
          const completedListener = await FirebaseAuthentication.addListener(
            "phoneVerificationCompleted",
            async (event) => {
              console.log("[AuthContext] Native: phoneVerificationCompleted (auto-verified)")
              // Auto-verification completed - sign in directly
              if (event.verificationCode && verificationId) {
                const credential = PhoneAuthProvider.credential(verificationId, event.verificationCode)
                await signInWithCredential(auth, credential)
              }

              resolve({
                nativeVerificationId: verificationId || undefined,
                confirm: async () => {
                  // Already verified, no action needed
                  console.log("[AuthContext] Native: already auto-verified")
                },
              })

              // Clean up listeners
              codeSentListener.remove()
              failedListener.remove()
              completedListener.remove()
            }
          )
        }

        // Start the phone sign-in flow
        setupListeners()
          .then(() => {
            console.log("[AuthContext] Native: calling signInWithPhoneNumber...")
            return FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber })
          })
          .catch(reject)
      })
    } else {
      // Web flow using Firebase JS SDK with reCAPTCHA
      try {
        // Clear any existing recaptcha verifier to avoid conflicts
        if (recaptchaVerifier) {
          recaptchaVerifier.clear()
          recaptchaVerifier = null
        }

        // Create invisible recaptcha verifier
        recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {
            console.log("[AuthContext] reCAPTCHA verified")
          },
          "expired-callback": () => {
            console.log("[AuthContext] reCAPTCHA expired, clearing...")
            if (recaptchaVerifier) {
              recaptchaVerifier.clear()
              recaptchaVerifier = null
            }
          },
        })

        const confirmationResult = await firebaseSignInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)

        return {
          webConfirmationResult: confirmationResult,
          confirm: async (code: string) => {
            await confirmationResult.confirm(code)
          },
        }
      } catch (error) {
        // Clean up on error
        if (recaptchaVerifier) {
          recaptchaVerifier.clear()
          recaptchaVerifier = null
        }
        throw error
      }
    }
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
    } catch {
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
  // Designed to be resilient — always clears local state even if Firebase SDK
  // calls fail (e.g., after server-side account deletion).
  const signOut = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform()

    // Clear local guest mode
    localStorage.removeItem(LOCAL_GUEST_KEY)
    setIsLocalGuest(false)

    // Always clear local user state immediately so the UI navigates away
    // regardless of whether the SDK signOut succeeds.
    const hadUser = !!user
    setUser(null)

    // Sign out of Firebase if we had an authenticated user
    if (hadUser) {
      // Wrap SDK calls in a timeout + try-catch so they can never hang.
      // If the auth user was already deleted server-side, the native SDK
      // signOut may stall or throw.
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
        // Don't block on signOut failures — the user is already gone locally
        console.warn("[AuthContext] signOut SDK call failed (may be expected after account deletion):", error)
      }
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
        signInWithApple,
        signInWithPhone,
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

