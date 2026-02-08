import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

function ArticleCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
      </CardContent>
    </Card>
  )
}

export function TodayPage() {
  return (
    <div className="space-y-[var(--spacing-lg)]">
      {/* Hero Section */}
      <section className="space-y-2">
        <p className="text-[var(--color-text-secondary)]">
          Your daily insurance industry briefing
        </p>
      </section>

      {/* Today's Highlights */}
      <section className="space-y-[var(--spacing-md)]">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-semibold text-[var(--color-text-primary)]">
            Today's Highlights
          </h2>
          <Badge variant="secondary">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Badge>
        </div>

        {/* Sample Cards - Replace with real data */}
        <div className="space-y-[var(--spacing-md)]">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-[17px] leading-snug">
                  Major Insurer Announces Digital Transformation Initiative
                </CardTitle>
                <Badge variant="outline" className="shrink-0">
                  Tech
                </Badge>
              </div>
              <p className="text-[13px] text-[var(--color-text-tertiary)]">
                Insurance Weekly • 2 hours ago
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                A leading property and casualty insurer has unveiled plans for a
                comprehensive digital transformation aimed at streamlining claims
                processing and enhancing customer experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-[17px] leading-snug">
                  Climate Risk Models Updated for 2026 Hurricane Season
                </CardTitle>
                <Badge variant="warning" className="shrink-0">
                  Risk
                </Badge>
              </div>
              <p className="text-[13px] text-[var(--color-text-tertiary)]">
                Risk Management Today • 4 hours ago
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                Catastrophe modeling firms have released updated projections for
                the upcoming hurricane season, incorporating new climate data
                and improved AI-driven forecasting methodologies.
              </p>
            </CardContent>
          </Card>

          {/* Skeleton for loading state demonstration */}
          <ArticleCardSkeleton />
        </div>
      </section>
    </div>
  )
}

