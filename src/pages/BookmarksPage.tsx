import { Bookmark } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const bookmarks = [
  {
    title: "Insurance Industry Outlook 2026",
    source: "Insurance Weekly",
    date: "Feb 5, 2026",
    category: "Analysis",
  },
  {
    title: "AI Claims Processing: Best Practices",
    source: "Tech Insurance Review",
    date: "Feb 3, 2026",
    category: "Technology",
  },
]

export function BookmarksPage() {
  return (
    <div className="space-y-[var(--spacing-lg)]">
      <section className="space-y-2">
        <p className="text-[var(--color-text-secondary)]">
          Articles you've saved for later
        </p>
      </section>

      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-[var(--color-surface)] p-4">
            <Bookmark className="h-8 w-8 text-[var(--color-text-tertiary)]" />
          </div>
          <h3 className="mb-2 text-[17px] font-semibold text-[var(--color-text-primary)]">
            No bookmarks yet
          </h3>
          <p className="max-w-[280px] text-[15px] text-[var(--color-text-secondary)]">
            Save articles you want to read later by tapping the bookmark icon.
          </p>
        </div>
      ) : (
        <div className="space-y-[var(--spacing-md)]">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark.title}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-[17px] leading-snug">
                    {bookmark.title}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Bookmark className="h-4 w-4 fill-[var(--color-accent)] text-[var(--color-accent)]" />
                  </Button>
                </div>
                <p className="text-[13px] text-[var(--color-text-tertiary)]">
                  {bookmark.source} • {bookmark.date}
                </p>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{bookmark.category}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

