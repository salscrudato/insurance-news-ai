/**
 * Shared types and interfaces for insurance-news-ai
 */

export interface NewsSignal {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: Date;
  category: 'market' | 'regulatory' | 'claims' | 'technology' | 'other';
  sentiment: 'positive' | 'neutral' | 'negative';
  relevanceScore: number;
  tags: string[];
}

export interface UserPreferences {
  userId: string;
  categories: string[];
  sources: string[];
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export interface SavedArticle {
  id: string;
  userId: string;
  signalId: string;
  savedAt: Date;
  notes?: string;
}

export interface AnalyticsEvent {
  eventName: string;
  timestamp: Date;
  userId?: string;
  properties?: Record<string, unknown>;
}

export const CATEGORIES = [
  'market',
  'regulatory',
  'claims',
  'technology',
  'other',
] as const;

export const SENTIMENTS = ['positive', 'neutral', 'negative'] as const;

export const THEMES = ['light', 'dark', 'system'] as const;

