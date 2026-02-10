/**
 * Custom hooks for P&C Insurance News AI
 */

export { useTodayBrief, type TodayBriefResponse, type TopStoryWithArticle } from "./use-today-brief"
export { useArticles, useSources, type ArticleFilters, type ArticleFromApi } from "./use-articles"
export {
  useBookmarks,
  useIsBookmarked,
  useToggleBookmark,
  useArticleAI,
  useCachedArticleAI,
} from "./use-bookmarks"
export {
  useUserPreferences,
  useToggleNotifications,
} from "./use-user-preferences"
export { usePushNotifications } from "./use-push-notifications"
export { useLargeTitle, useLargeTitleWithScroll } from "./use-large-title"
export {
  useChatThreads,
  useCreateThread,
  useAppendMessage,
  useChatMessages,
  useDeleteThread,
  type CreateThreadInput,
  type AppendMessageInput,
} from "./use-chat-threads"

