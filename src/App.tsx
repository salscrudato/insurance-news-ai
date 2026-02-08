import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
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
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  )
}

export default App
