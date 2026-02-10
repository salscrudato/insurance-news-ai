import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { Capacitor } from "@capacitor/core"
import { StatusBar, Style } from "@capacitor/status-bar"
import { queryClient } from "@/lib/query-client"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { MainLayout } from "@/layouts/MainLayout"
import { Toaster } from "@/components/ui/sonner"
import {
  TodayPage,
  FeedPage,
  BookmarksPage,
  SettingsPage,
  AskPage,
  TermsPage,
  PrivacyPage,
  AuthPage,
} from "@/pages"

/**
 * Protected route wrapper - redirects to /auth if not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  // Show nothing while checking auth state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-grouped)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    )
  }

  // Redirect to auth if not logged in (includes local guest check)
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

/**
 * Auth route wrapper - redirects to / if already authenticated
 */
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  // Show nothing while checking auth state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-grouped)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    )
  }

  // Redirect to home if already logged in (includes local guest)
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  // Configure iOS status bar on app load
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Set status bar to light style (dark text) for our light UI
      StatusBar.setStyle({ style: Style.Light }).catch(() => {
        // Ignore errors on unsupported platforms
      })
    }
  }, [])

  return (
    <Routes>
      {/* Auth page - accessible only when not logged in */}
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        }
      />

      {/* Protected main app routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<TodayPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/ask" element={<AskPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Legal pages - standalone with their own headers */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
