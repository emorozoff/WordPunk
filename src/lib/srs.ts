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

// Финализация слова уровня 0 после 3 показов в сессии
// Если все 3 правильно → уровень 1 (следующий показ завтра)
// Если была хоть одна ошибка → остаётся на уровне 0 (завтра снова)
export function finalizeLevel0Card(
  progress: CardProgress,
  correctCount: number,
  wrongCount: number,
): CardProgress {
  const allCorrect = wrongCount === 0;
  return {
    ...progress,
    level: allCorrect ? 1 : 0,
    consecutiveCorrect: allCorrect ? 1 : 0,
    totalCorrect: progress.totalCorrect + correctCount,
    totalWrong: progress.totalWrong + wrongCount,
    nextReviewDate: addDays(getToday(), 1), // завтра в любом случае
  };
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

export const LEVELS: Level[] = [
  {
    min: 0,
    title: 'Чистый лист',
    description: 'Начало пути — ты уже здесь, это уже шаг',
  },
  {
    min: 50,
    title: 'Первые слова',
    description: 'Знаешь базовые реакции: yes, no, thank you, sorry',
  },
  {
    min: 150,
    title: 'Турист-новичок',
    description: 'Выживешь в аэропорту: найдёшь выход и не потеряешь чемодан',
  },
  {
    min: 300,
    title: 'Школьник 4–5 класс',
    description: 'Простые предложения, базовый словарь — не стыдно на уроке',
  },
  {
    min: 500,
    title: 'A1 — Начальный',
    description: 'Можешь представиться, заказать еду и спросить дорогу',
  },
  {
    min: 700,
    title: 'Разговорный турист',
    description: 'Выживешь в отпуске без переводчика: отель, ресторан, транспорт',
  },
  {
    min: 950,
    title: 'A2 — Элементарный',
    description: 'Обсуждаешь себя, семью и повседневные вещи',
  },
  {
    min: 1200,
    title: 'Уверенный A2',
    description: 'Понимаешь простые диалоги, читаешь адаптированные тексты',
  },
  {
    min: 1450,
    title: 'B1 — Пороговый',
    description: 'Объясняешь свою точку зрения, понимаешь основное в разговорах',
  },
  {
    min: 1700,
    title: 'Средний B1',
    description: 'Смотришь ютуб на английском и понимаешь большую часть',
  },
  {
    min: 1950,
    title: 'Уверенный B1',
    description: 'Переписываешься без переводчика, смотришь сериалы с субтитрами',
  },
  {
    min: 2150,
    title: 'B2 — Самостоятельный',
    description: 'Говоришь свободно, делаешь ошибки, но тебя легко понимают',
  },
  {
    min: 2350,
    title: 'Средний B2',
    description: 'Смотришь фильмы без субтитров, понимаешь 80–85%',
  },
  {
    min: 2550,
    title: 'Уверенный B2',
    description: 'Читаешь книги в оригинале, пишешь связные тексты на любую тему',
  },
  {
    min: 2700,
    title: 'C1 — Продвинутый',
    description: 'Говоришь спонтанно, понимаешь носителей без усилий',
  },
  {
    min: 2850,
    title: 'Уверенный C1',
    description: 'Понимаешь сленг, акценты и юмор — думаешь на английском',
  },
  {
    min: 2950,
    title: 'C2 — Мастер',
    description: 'Уровень для работы и учёбы в полностью англоязычной среде',
  },
  {
    min: 3000,
    title: 'WordPunk завершён',
    description: 'Ты освоил весь словарный запас приложения. Иди жить.',
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
