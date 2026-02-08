import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const sources = [
  {
    name: "Insurance Journal",
    description: "Breaking news and analysis for insurance professionals",
    category: "News",
    active: true,
  },
  {
    name: "Risk Management Today",
    description: "Enterprise risk management insights and trends",
    category: "Analysis",
    active: true,
  },
  {
    name: "Insurance Insider",
    description: "Global specialty insurance and reinsurance intelligence",
    category: "Premium",
    active: false,
  },
  {
    name: "Carrier Management",
    description: "Strategic insights for P&C insurance executives",
    category: "News",
    active: true,
  },
]

export function SourcesPage() {
  return (
    <div className="space-y-[var(--spacing-lg)]">
      <section className="space-y-2">
        <p className="text-[var(--color-text-secondary)]">
          Manage your news sources
        </p>
      </section>

      <div className="space-y-[var(--spacing-md)]">
        {sources.map((source, index) => (
          <div key={source.name}>
            <Card className={source.active ? "" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-[17px]">{source.name}</CardTitle>
                    <CardDescription>{source.description}</CardDescription>
                  </div>
                  <Badge variant={source.active ? "success" : "outline"}>
                    {source.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{source.category}</Badge>
                </div>
              </CardContent>
            </Card>
            {index < sources.length - 1 && (
              <Separator className="mt-[var(--spacing-md)]" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

