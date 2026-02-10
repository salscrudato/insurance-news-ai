/**
 * Sources Page - Manage followed news sources
 */

import { useMemo } from "react"
import { Globe } from "lucide-react"
import { toast } from "sonner"
import {
  useAllSources,
  useUserPreferences,
  useToggleSource,
  useResetSourcePreferences,
} from "@/lib/hooks"
import { useAuth } from "@/lib/auth-context"
import { SourceRow, SourceRowSkeleton } from "@/components/sources"
import { Card, Separator, EmptyState, ErrorState } from "@/components/ui"
import { hapticLight, hapticSuccess } from "@/lib/haptics"

export function SourcesPage() {
  const { isLoading: authLoading } = useAuth()
  const { data: sources, isLoading: sourcesLoading, error: sourcesError } = useAllSources()
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences()
  const toggleSource = useToggleSource()
  const resetPreferences = useResetSourcePreferences()

  // Determine which sources the user is following
  // Empty enabledSourceIds means "follow all"
  const followedSourceIds = useMemo(() => {
    if (!preferences?.enabledSourceIds || preferences.enabledSourceIds.length === 0) {
      // Following all sources
      return sources?.map((s) => s.id) ?? []
    }
    return preferences.enabledSourceIds
  }, [preferences, sources])

  const isFollowingAll =
    !preferences?.enabledSourceIds || preferences.enabledSourceIds.length === 0

  const followingCount = isFollowingAll
    ? sources?.length ?? 0
    : followedSourceIds.length

  const isLoading = authLoading || sourcesLoading || prefsLoading

  const handleToggle = (sourceId: string, enabled: boolean) => {
    hapticLight()

    // If currently following all and toggling off, we need to set explicit list
    let currentIds: string[]
    if (isFollowingAll) {
      // Start with all sources, then remove the one being toggled off
      currentIds = sources?.map((s) => s.id) ?? []
    } else {
      currentIds = [...followedSourceIds]
    }

    toggleSource.mutate(
      { sourceId, enabled, currentEnabledIds: currentIds },
      {
        onError: (error) => {
          console.error("Failed to toggle source:", error)
          toast.error("Failed to update preference", {
            description: "Please try again",
          })
        },
      }
    )
  }

  const handleFollowAll = () => {
    resetPreferences.mutate(undefined, {
      onSuccess: () => {
        hapticSuccess()
        toast.success("Following all sources")
      },
      onError: (error) => {
        console.error("Failed to reset preferences:", error)
        toast.error("Failed to update preferences")
      },
    })
  }

  return (
    <div className="space-y-[24px]">
      {/* Description */}
      <p className="-mt-[6px] text-[14px] leading-[1.5] tracking-[-0.14px] text-[var(--color-text-secondary)]">
        Choose which sources appear in your feed. Changes only affect your personal view.
      </p>

      {/* Stats and actions bar */}
      {!isLoading && sources && (
        <div className="flex min-h-[44px] items-center justify-between py-[2px]">
          <p className="text-[13px] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
            Following{" "}
            <span className="font-medium tabular-nums text-[var(--color-text-secondary)]">
              {followingCount}
            </span>{" "}
            of {sources.length}
          </p>
          {!isFollowingAll && (
            <button
              onClick={handleFollowAll}
              disabled={resetPreferences.isPending}
              className="min-h-[34px] min-w-[44px] px-[var(--spacing-2)] text-[15px] font-normal tracking-[-0.2px] text-[var(--color-accent)] transition-opacity active:opacity-50 disabled:opacity-38"
            >
              Follow All
            </button>
          )}
        </div>
      )}

      {/* Sources list */}
      <div className="min-h-[40vh]">
        {/* Loading state */}
        {isLoading && (
          <Card variant="grouped">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <SourceRowSkeleton />
                {i < 5 && <Separator variant="inset" />}
              </div>
            ))}
          </Card>
        )}

        {/* Error state */}
        {sourcesError && (
          <ErrorState
            title="Unable to load sources"
            description="We couldn't fetch the sources list. Please try again."
            onRetry={() => window.location.reload()}
          />
        )}

        {/* Empty state */}
        {!isLoading && !sourcesError && sources?.length === 0 && (
          <EmptyState
            icon={Globe}
            title="No sources available"
            description="News sources will appear here once configured."
          />
        )}

        {/* Sources grouped list - iOS Settings style */}
        {!isLoading && sources && sources.length > 0 && (
          <Card variant="grouped">
            {sources.map((source, index) => (
              <div key={source.id}>
                <SourceRow
                  source={source}
                  isFollowing={followedSourceIds.includes(source.id)}
                  onToggle={(enabled) => handleToggle(source.id, enabled)}
                  isLoading={toggleSource.isPending}
                />
                {index < sources.length - 1 && <Separator variant="inset" />}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}

