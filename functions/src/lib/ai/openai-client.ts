/**
 * OpenAI Client Wrapper
 *
 * Uses the official OpenAI SDK with Responses API for:
 * - Article summarization and classification
 * - Grounded Q&A using daily brief context
 */

import OpenAI from "openai";
import { defineSecret } from "firebase-functions/params";

// Define the secret (accessed at runtime)
export const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Lazy-initialized client
let _client: OpenAI | null = null;

/**
 * Get the OpenAI client instance.
 * Must be called within a function that has access to the secret.
 */
export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = openaiApiKey.value();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY secret is not configured");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Model configuration for AI operations.
 * - gpt-4o: Higher quality for critical content (daily briefs)
 * - gpt-4o-mini: Cost-efficient for high-volume operations (article summaries)
 */
export const AI_MODEL = "gpt-4o-mini";
export const AI_MODEL_PREMIUM = "gpt-4o";

/**
 * Article AI response structure
 */
export interface ArticleAIResponse {
  tldr: string;
  whyItMatters: string;
  topics: string[];
  category: string;
}

/**
 * JSON schema for article AI structured output
 */
export const ARTICLE_AI_SCHEMA = {
  type: "object" as const,
  properties: {
    tldr: {
      type: "string",
      description: "2-3 sentence executive summary of the article",
    },
    whyItMatters: {
      type: "string",
      description: "1-2 sentences on why this matters for P&C insurance professionals",
    },
    topics: {
      type: "array",
      items: { type: "string" },
      description: "2-4 relevant topics (e.g., 'auto insurance', 'catastrophe losses', 'rate increases')",
    },
    category: {
      type: "string",
      enum: ["property", "casualty", "reinsurance", "regulation", "claims", "insurtech", "market", "litigation"],
      description: "Primary category for the article",
    },
  },
  required: ["tldr", "whyItMatters", "topics", "category"],
  additionalProperties: false,
};

/**
 * Daily brief response structure
 */
export interface DailyBriefResponse {
  executiveSummary: string[];
  topStories: Array<{
    articleId: string;
    headline: string;
    whyItMatters: string;
  }>;
  sections: {
    propertyCat: { bullets: string[]; articleIds: string[] };
    casualtyLiability: { bullets: string[]; articleIds: string[] };
    regulation: { bullets: string[]; articleIds: string[] };
    claims: { bullets: string[]; articleIds: string[] };
    reinsurance: { bullets: string[]; articleIds: string[] };
    insurtech: { bullets: string[]; articleIds: string[] };
    market: { bullets: string[]; articleIds: string[] };
  };
  topics: string[];
}

const SECTION_SCHEMA = {
  type: "object" as const,
  properties: {
    bullets: {
      type: "array",
      items: { type: "string" },
      description: "2-4 bullet points for this section",
    },
    articleIds: {
      type: "array",
      items: { type: "string" },
      description: "Article IDs related to this section",
    },
  },
  required: ["bullets", "articleIds"],
  additionalProperties: false,
};

/**
 * JSON schema for daily brief structured output
 */
export const DAILY_BRIEF_SCHEMA = {
  type: "object" as const,
  properties: {
    executiveSummary: {
      type: "array",
      items: { type: "string" },
      description: "3-5 bullet points summarizing the most important developments",
    },
    topStories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          articleId: { type: "string", description: "The article ID" },
          headline: { type: "string", description: "Synthesized headline (not copied)" },
          whyItMatters: { type: "string", description: "1-2 sentences on implications" },
        },
        required: ["articleId", "headline", "whyItMatters"],
        additionalProperties: false,
      },
      description: "3-5 top stories",
    },
    sections: {
      type: "object",
      properties: {
        propertyCat: SECTION_SCHEMA,
        casualtyLiability: SECTION_SCHEMA,
        regulation: SECTION_SCHEMA,
        claims: SECTION_SCHEMA,
        reinsurance: SECTION_SCHEMA,
        insurtech: SECTION_SCHEMA,
        market: SECTION_SCHEMA,
      },
      required: ["propertyCat", "casualtyLiability", "regulation", "claims", "reinsurance", "insurtech", "market"],
      additionalProperties: false,
    },
    topics: {
      type: "array",
      items: { type: "string" },
      description: "5-10 key topics covered",
    },
  },
  required: ["executiveSummary", "topStories", "sections", "topics"],
  additionalProperties: false,
};

// ============================================================================
// RAG Answer Types and Schema
// ============================================================================

/**
 * RAG answer citation
 */
export interface RagCitation {
  articleId: string;
  title: string;
  sourceName: string;
  url: string;
  publishedAt: string;
}

/**
 * RAG answer response structure
 */
export interface RagAnswerResponse {
  answerMarkdown: string;
  takeaways: string[];
  citations: RagCitation[];
  followUps: string[];
}

/**
 * JSON schema for RAG answer structured output
 */
export const RAG_ANSWER_SCHEMA = {
  type: "object" as const,
  properties: {
    answerMarkdown: {
      type: "string",
      description: "The answer in markdown format with inline citations [1], [2], etc.",
    },
    takeaways: {
      type: "array",
      items: { type: "string" },
      description: "3-6 key takeaway bullet points",
    },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          articleId: { type: "string", description: "The article ID" },
          title: { type: "string", description: "Article title" },
          sourceName: { type: "string", description: "Source name" },
          url: { type: "string", description: "Article URL" },
          publishedAt: { type: "string", description: "Publication date" },
        },
        required: ["articleId", "title", "sourceName", "url", "publishedAt"],
        additionalProperties: false,
      },
      description: "List of cited articles",
    },
    followUps: {
      type: "array",
      items: { type: "string" },
      description: "3 suggested follow-up questions",
    },
  },
  required: ["answerMarkdown", "takeaways", "citations", "followUps"],
  additionalProperties: false,
};

