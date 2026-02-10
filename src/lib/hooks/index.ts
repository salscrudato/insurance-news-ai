/**
 * Custom hooks for P&C Insurance News AI
 */

export { useTodayBrief, type TodayBriefResponse, type TopStoryWithArticle } from "./use-today-brief"
export { useArticles, useSources, useAllSources, type ArticleFilters } from "./use-articles"
export {
  useBookmarks,
  useIsBookmarked,
  useToggleBookmark,
  useArticleAI,
  useCachedArticleAI,
} from "./use-bookmarks"
export {
  useUserPreferences,
  useToggleSource,
  useResetSourcePreferences,
  useToggleNotifications,
} from "./use-user-preferences"
export { usePushNotifications } from "./use-push-notifications"
export { useLargeTitle, useLargeTitleWithScroll } from "./use-large-title"

