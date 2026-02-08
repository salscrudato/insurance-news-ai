import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { Menu, Newspaper, Rss, Bookmark, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

const navItems = [
  { path: "/", label: "Today", icon: Newspaper },
  { path: "/feed", label: "Feed", icon: Rss },
  { path: "/sources", label: "Sources", icon: Rss },
  { path: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { path: "/settings", label: "Settings", icon: Settings },
]

function getPageTitle(pathname: string): string {
  const route = navItems.find((item) => item.path === pathname)
  return route?.label ?? "Insurance News"
}

export function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const pageTitle = getPageTitle(location.pathname)

  const handleNavigation = (path: string) => {
    navigate(path)
    setOpen(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      {/* Top Navigation Bar */}
      <header className="glass sticky top-0 z-40 border-b border-[var(--color-border)]">
        <div className="safe-area-padding-x">
          <div className="flex h-14 items-center justify-between px-[var(--spacing-md)]">
            {/* Large Title */}
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {pageTitle}
            </h1>

            {/* Hamburger Menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] pt-12">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    const Icon = item.icon
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={`flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left text-[17px] font-medium transition-colors ${
                          isActive
                            ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                            : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </button>
                    )
                  })}
                </nav>
                <Separator className="my-4" />
                <p className="px-4 text-[13px] text-[var(--color-text-tertiary)]">
                  Insurance News AI
                </p>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="safe-area-padding-x">
          <div className="mx-auto max-w-2xl px-[var(--spacing-md)] py-[var(--spacing-lg)]">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Safe area bottom padding */}
      <div className="safe-area-padding-y" />
    </div>
  )
}

