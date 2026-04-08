import type { Card, CardProgress, SessionCard } from '../types';

// Level 0 = новое слово (до 3 показов в сессии)
// Level 1 = +1 день, 2 = +3 дня, 3 = +7 дней, 4 = +30 дней, 5 = +180 дней
export const SRS_INTERVALS = [0, 1, 3, 7, 30, 180];

export function getToday(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

export function createInitialProgress(cardId: string): CardProgress {
  return {
    cardId,
    level: 0,
    nextReviewDate: getToday(),
    consecutiveCorrect: 0,
    totalCorrect: 0,
    totalWrong: 0,
  };
}

// Для уровней 1–5: 1 правильный → уровень вверх, 1 ошибка → уровень вниз (минимум 1, не 0)
export function processAnswer(
  progress: CardProgress,
  correct: boolean
): CardProgress {
  const today = getToday();
  if (correct) {
    const newLevel = Math.min(progress.level + 1, 5);
    const interval = SRS_INTERVALS[newLevel] ?? 180;
    return {
      ...progress,
      level: newLevel,
      consecutiveCorrect: progress.consecutiveCorrect + 1,
      totalCorrect: progress.totalCorrect + 1,
      nextReviewDate: addDays(today, interval),
    };
  } else {
    // Откат на 1 уровень, но не ниже 1 (0 — особый статус новых слов)
    const newLevel = Math.max(progress.level - 1, 1);
    return {
      ...progress,
      level: newLevel,
      consecutiveCorrect: 0,
      totalWrong: progress.totalWrong + 1,
      nextReviewDate: addDays(today, 1), // завтра
    };
  }
}

// Обработка ответа для слов уровня 0.
// Прогресс сохраняется в DB после каждого ответа.
// Продвижение на уровень 1 происходит при 3 правильных подряд (consecutiveCorrect >= 3),
// независимо от того, были они в одной сессии или в разных.
// Ошибка сбрасывает consecutiveCorrect в 0.
export function processLevel0Answer(
  progress: CardProgress,
  correct: boolean,
): CardProgress {
  const today = getToday();
  if (correct) {
    const newConsecutive = progress.consecutiveCorrect + 1;
    if (newConsecutive >= 3) {
      // 3 правильных подряд → уровень 1, следующий показ завтра
      return {
        ...progress,
        level: 1,
        consecutiveCorrect: newConsecutive,
        totalCorrect: progress.totalCorrect + 1,
        nextReviewDate: addDays(today, SRS_INTERVALS[1]!),
      };
    }
    return {
      ...progress,
      level: 0,
      consecutiveCorrect: newConsecutive,
      totalCorrect: progress.totalCorrect + 1,
      nextReviewDate: today, // доступно сегодня — в следующей сессии покажется снова
    };
  } else {
    return {
      ...progress,
      level: 0,
      consecutiveCorrect: 0,
      totalWrong: progress.totalWrong + 1,
      nextReviewDate: today,
    };
  }
}

// Build the session queue
export function buildQueue(
  dueProgress: CardProgress[],
  newCards: Card[],
  allCards: Card[],
  direction: 'mixed' | 'en-ru' | 'ru-en' = 'mixed'
): SessionCard[] {
  const queue: SessionCard[] = [];

  // Map cardId -> Card for lookup
  const cardMap = new Map(allCards.map(c => [c.id, c]));

  // 1. Due cards (review)
  for (const p of dueProgress) {
    const card = cardMap.get(p.cardId);
    if (!card) continue;
    const dir = direction === 'mixed'
      ? (Math.random() < 0.5 ? 'en-ru' : 'ru-en')
      : direction;
    queue.push({ card, direction: dir, isRetry: false });
  }

  // 2. New cards
  for (const card of newCards) {
    const dir = direction === 'mixed'
      ? (Math.random() < 0.5 ? 'en-ru' : 'ru-en')
      : direction;
    queue.push({ card, direction: dir, isRetry: false });
  }

  // Shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j]!, queue[i]!];
  }

  return queue;
}

// Generate 4 options: 1 correct + 3 random
function distractorScore(
  correctAnswer: string,
  candidate: string,
  sameTopic: boolean
): number {
  let score = 0;
  const ca = correctAnswer.toLowerCase();
  const cb = candidate.toLowerCase();

  // Same topic = semantically close
  if (sameTopic) score += 5;

  // Same first letter
  if (ca[0] === cb[0]) score += 2;

  // Similar string length (±3 chars)
  const lenDiff = Math.abs(ca.length - cb.length);
  if (lenDiff <= 2) score += 2;
  else if (lenDiff <= 5) score += 1;

  // Common prefix
  let prefix = 0;
  for (let i = 0; i < Math.min(ca.length, cb.length); i++) {
    if (ca[i] === cb[i]) prefix++;
    else break;
  }
  if (prefix >= 3) score += 3;
  else if (prefix >= 2) score += 1;

  return score;
}

export function generateOptions(
  correctCard: Card,
  direction: 'en-ru' | 'ru-en',
  allCards: Card[]
): string[] {
  const correctAnswer = direction === 'en-ru' ? correctCard.russian : correctCard.english;
  const correctWordCount = correctAnswer.trim().split(/\s+/).length;

  const scored = allCards
    .filter(c => c.id !== correctCard.id)
    .map(c => {
      const text = direction === 'en-ru' ? c.russian : c.english;
      const wordCount = text.trim().split(/\s+/).length;
      let score = distractorScore(correctAnswer, text, c.topicId === correctCard.topicId);
      // Same word count is a hard preference
      if (wordCount === correctWordCount) score += 10;
      return { text, score };
    });

  // Sort by score desc, take top bucket and shuffle to add variety
  scored.sort((a, b) => b.score - a.score);
  const topBucket = scored.slice(0, Math.min(15, scored.length));
  const shuffled = topBucket.sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, 3).map(d => d.text);

  // Fallback
  if (distractors.length < 3) {
    const used = new Set(distractors);
    const rest = scored.filter(d => !used.has(d.text));
    for (const d of rest) {
      if (distractors.length >= 3) break;
      distractors.push(d.text);
    }
  }

  const options = [correctAnswer, ...distractors];
  return options.sort(() => Math.random() - 0.5);
}

// Language level system
export interface Level {
  min: number;
  title: string;
  description: string;
}

// Реалистичные пороги: A1 ≈ 500 слов, A2 ≈ 1000, B1 ≈ 2000, B2 ≈ 4000+
// Приложение содержит ~3000 слов → честный потолок: уверенный B1 / старт B2.
// C1 и C2 не включены — для них нужно 8000–10 000+ слов, которых в приложении нет.
export const LEVELS: Level[] = [
  {
    min: 0,
    title: 'Чистый лист',
    description: 'Ты только начинаешь — и это уже хорошо. Первые слова появятся быстро: мозг отлично запоминает то, что встречает впервые. Через несколько дней ты уже не будешь нулём.',
  },
  {
    min: 100,
    title: 'Первые слова',
    description: 'Знаешь самые базовые слова и реакции: yes, no, please, sorry, thank you. Можешь назвать себя и понять простые вывески. Это не ещё A1 — но уже не ноль.',
  },
  {
    min: 300,
    title: 'Выживание в аэропорту',
    description: 'Справишься с базовыми ситуациями: аэропорт, отель, кафе. Понимаешь ключевые слова в объявлениях и вывесках, можешь задать простой вопрос. Словарь маленький, но рабочий.',
  },
  {
    min: 500,
    title: 'A1 — Начальный',
    description: 'Примерно 500 слов — стандартный A1 по шкале CEFR. Можешь представиться, сказать откуда ты, заказать еду, спросить дорогу. Говоришь медленно и с паузами, но тебя понимают.',
  },
  {
    min: 750,
    title: 'Уверенный A1',
    description: 'Словарь растёт, базовые темы уже не пугают. Справишься в магазине, банке, на ресепшне. Читаешь простые объявления и смс без словаря. Ещё не свободно — но уже комфортно.',
  },
  {
    min: 1000,
    title: 'A2 — Элементарный',
    description: 'Около 1000 слов — уровень A2. Обсуждаешь себя, семью, работу, распорядок дня. Понимаешь медленную речь на знакомые темы. Примерно как после 1–2 лет обычной школьной программы.',
  },
  {
    min: 1400,
    title: 'Уверенный A2',
    description: 'Читаешь адаптированные тексты и простые статьи. Переписываешься в мессенджерах без постоянного словаря. Понимаешь основное в несложных видео с субтитрами. Это уже практический английский.',
  },
  {
    min: 2000,
    title: 'B1 — Пороговый',
    description: 'Около 2000 слов — уровень B1 по CEFR, международный стандарт "базовое общение". Объясняешься в большинстве бытовых ситуаций, понимаешь суть разговоров на знакомые темы. Примерно как выпускник средней школы с нормальной подготовкой.',
  },
  {
    min: 2500,
    title: 'Средний B1',
    description: 'Смотришь ютуб и подкасты на английском — понимаешь большую часть, если тема знакома. Пишешь письма и сообщения без переводчика. Можешь поддержать разговор, хотя иногда теряешь нить.',
  },
  {
    min: 3000,
    title: 'Уверенный B1 — максимум WordPunk',
    description: 'Ты выучил весь словарный запас приложения. Это честный уверенный B1: смотришь сериалы с субтитрами, читаешь несложные тексты в оригинале, справляешься в поездках без переводчика. Для B2 нужно ещё ~1000–2000 слов за пределами приложения — это реально.',
  },
];

export function getCurrentLevel(knownCount: number): { title: string; description: string; min: number; nextMin: number } {
  let current = LEVELS[0]!;
  for (const lvl of LEVELS) {
    if (knownCount >= lvl.min) current = lvl;
    else break;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] ?? current;
  return { title: current.title, description: current.description, min: current.min, nextMin: next.min };
}

export function getLevelProgress(knownCount: number): number {
  const { min, nextMin } = getCurrentLevel(knownCount);
  if (nextMin === min) return 100;
  return Math.min(100, ((knownCount - min) / (nextMin - min)) * 100);
}
