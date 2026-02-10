/**
 * Firebase Auth Context
 *
 * Provides authentication state throughout the app.
 * Uses anonymous auth by default for user preferences.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setIsLoading(false)
      } else {
        // Sign in anonymously if no user
        try {
          await signInAnonymously(auth)
          // onAuthStateChanged will fire again with the new user
        } catch (error) {
          console.error("Anonymous auth failed:", error)
          setIsLoading(false)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

