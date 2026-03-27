export interface Card {
  id: string;
  english: string;
  russian: string;
  synonyms: string[];
  example?: string;
  topicId: string;
  isCustom: boolean;
}

export interface CardProgress {
  cardId: string;
  level: number;           // 0–5
  nextReviewDate: string;  // ISO "2026-04-01"
  consecutiveCorrect: number;
  totalCorrect: number;
  totalWrong: number;
}

export interface Topic {
  id: string;
  name: string;
  emoji: string;
}

export interface SessionCard {
  card: Card;
  direction: 'en-ru' | 'ru-en';
  isRetry: boolean;
}

export type AppScreen = 'main' | 'topics' | 'add-word' | 'stats';

export interface DayActivity {
  date: string;
  count: number;
}
