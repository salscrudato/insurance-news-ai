/**
 * AI Module Exports
 */

export {
  getOpenAIClient,
  openaiApiKey,
  AI_MODEL,
  AI_MODEL_PREMIUM,
  ARTICLE_AI_SCHEMA,
  DAILY_BRIEF_SCHEMA,
  RAG_ANSWER_SCHEMA,
  type ArticleAIResponse,
  type DailyBriefResponse,
  type RagAnswerResponse,
  type RagCitation,
} from "./openai-client.js";

export {
  ARTICLE_SUMMARIZE_SYSTEM,
  DAILY_BRIEF_SYSTEM,
  buildArticleSummarizePrompt,
  buildDailyBriefPrompt,
} from "./prompts.js";

export {
  RATE_LIMITS,
  checkRateLimit,
  getRateLimitStatus,
} from "./rate-limit.js";

export {
  selectArticlesForBrief,
  logSelectionMetrics,
  type SelectionMetrics,
} from "./article-selection.js";
