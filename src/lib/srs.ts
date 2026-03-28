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
export function generateOptions(
  correctCard: Card,
  direction: 'en-ru' | 'ru-en',
  allCards: Card[]
): string[] {
  const correctAnswer = direction === 'en-ru' ? correctCard.russian : correctCard.english;

  const pool = allCards
    .filter(c => c.id !== correctCard.id)
    .map(c => direction === 'en-ru' ? c.russian : c.english);

  // Shuffle pool
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, 3);

  const options = [correctAnswer, ...distractors];
  // Shuffle options
  return options.sort(() => Math.random() - 0.5);
}

// Language level system
export const LEVELS = [
  { min: 0,    title: 'уровень: кто такой хеллоу?' },
  { min: 10,   title: 'уровень: тупой как Siri' },
  { min: 50,   title: 'уровень: немой турист' },
  { min: 100,  title: 'уровень: гугл транслейт на ножках' },
  { min: 150,  title: 'уровень: знаю "hello" и "sorry"' },
  { min: 200,  title: 'уровень: выживший в аэропорту' },
  { min: 250,  title: 'уровень: смотрю сериалы с субтитрами' },
  { min: 300,  title: 'уровень: могу заказать кофе' },
  { min: 350,  title: 'уровень: читаю меню без паники' },
  { min: 400,  title: 'уровень: иностранец с акцентом' },
  { min: 450,  title: 'уровень: разговариваю руками и словами' },
  { min: 500,  title: 'уровень: B1 с понтами' },
  { min: 550,  title: 'уровень: понимаю половину мемов' },
  { min: 600,  title: 'уровень: средний английский, нижний предел' },
  { min: 650,  title: 'уровень: пишу "I\'m fine" и это правда' },
  { min: 700,  title: 'уровень: смотрел Друзей 4 раза' },
  { min: 750,  title: 'уровень: дружу с грамматикой (иногда)' },
  { min: 850,  title: 'уровень: могу поспорить и проиграть' },
  { min: 950,  title: 'уровень: разговариваю как человек' },
  { min: 1050, title: 'уровень: пишу в чат без переводчика' },
  { min: 1150, title: 'уровень: делаю замечания по чужой грамматике' },
  { min: 1250, title: 'уровень: думаю на английском в душе' },
  { min: 1350, title: 'уровень: почти не стыдно' },
  { min: 1450, title: 'уровень: смотрю стендап и смеюсь в нужных местах' },
  { min: 1550, title: 'уровень: носитель духа языка' },
  { min: 1650, title: 'уровень: говорю быстро и мало думаю' },
  { min: 1750, title: 'уровень: объясняю грамматику русским' },
  { min: 1850, title: 'уровень: иностранцы не догадываются. сразу.' },
  { min: 1950, title: 'уровень: лингвистический монстр' },
  { min: 2050, title: 'уровень: словарный запас > самооценка' },
  { min: 2150, title: 'уровень: читаю книги без словаря' },
  { min: 2300, title: 'уровень: думаю на английском даже когда злюсь' },
  { min: 2450, title: 'уровень: профессиональный болтун' },
  { min: 2550, title: 'уровень: объясняю русские мемы иностранцам' },
  { min: 2650, title: 'уровень: слушаю подкасты на скорости 1.5х' },
  { min: 2750, title: 'уровень: поправляю носителей и они соглашаются' },
  { min: 2850, title: 'уровень: Шекспир был бы доволен' },
  { min: 2950, title: 'уровень: английский — это я' },
  { min: 3000, title: 'уровень: WordPunk завершён. иди жить.' },
];

export function getCurrentLevel(knownCount: number): { title: string; min: number; nextMin: number } {
  let current = LEVELS[0]!;
  for (const lvl of LEVELS) {
    if (knownCount >= lvl.min) current = lvl;
    else break;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] ?? current;
  return { title: current.title, min: current.min, nextMin: next.min };
}

export function getLevelProgress(knownCount: number): number {
  const { min, nextMin } = getCurrentLevel(knownCount);
  if (nextMin === min) return 100;
  return Math.min(100, ((knownCount - min) / (nextMin - min)) * 100);
}
