import { useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { Capacitor } from "@capacitor/core"
import { StatusBar, Style } from "@capacitor/status-bar"
import { queryClient } from "@/lib/query-client"
import { AuthProvider } from "@/lib/auth-context"
import { MainLayout } from "@/layouts/MainLayout"
import { Toaster } from "@/components/ui/sonner"
import {
  TodayPage,
  FeedPage,
  SourcesPage,
  BookmarksPage,
  SettingsPage,
} from "@/pages"

function App() {
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<TodayPage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/sources" element={<SourcesPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
