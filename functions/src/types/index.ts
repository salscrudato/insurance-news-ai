/**
 * Type exports for P&C Insurance News AI (Cloud Functions)
 */

export type {
  // Source types
  Source,
  SourceCategory,
  SourceTier,
  SourceFetchState,
  // Article types
  Article,
  ArticleAI,
  ArticleEmbedding,
  // Brief types
  Brief,
  BriefTopStory,
  BriefSection,
  BriefSourceUsed,
  // User types
  UserProfile,
  Bookmark,
  UserPreferences,
  // Chat types
  ChatTimeScope,
  ChatSourceFilter,
  ChatCategory,
  ChatCitation,
  ChatThread,
  ChatMessage,
} from "./firestore.js";

