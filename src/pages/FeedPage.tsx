import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function FeedPage() {
  return (
    <div className="space-y-[var(--spacing-lg)]">
      <section className="space-y-2">
        <p className="text-[var(--color-text-secondary)]">
          Browse articles by category
        </p>
      </section>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="regulation">Regulation</TabsTrigger>
          <TabsTrigger value="tech">Technology</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-[var(--spacing-md)]">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-[17px] leading-snug">
                  Regulatory Changes Ahead for Cyber Insurance
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  Regulation
                </Badge>
              </div>
              <p className="text-[13px] text-[var(--color-text-tertiary)]">
                Insurance Journal • 1 hour ago
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                State regulators are proposing new requirements for cyber
                liability policies, focusing on transparency and standardized
                coverage terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-[17px] leading-snug">
                  Q4 Earnings Preview: Top Insurers to Watch
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  Markets
                </Badge>
              </div>
              <p className="text-[13px] text-[var(--color-text-tertiary)]">
                Financial Times • 3 hours ago
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                Analysts are predicting strong results for major insurance
                carriers, driven by improved underwriting margins and investment
                income.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markets">
          <p className="py-8 text-center text-[var(--color-text-tertiary)]">
            Market news will appear here
          </p>
        </TabsContent>

        <TabsContent value="regulation">
          <p className="py-8 text-center text-[var(--color-text-tertiary)]">
            Regulatory news will appear here
          </p>
        </TabsContent>

        <TabsContent value="tech">
          <p className="py-8 text-center text-[var(--color-text-tertiary)]">
            Technology news will appear here
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}

