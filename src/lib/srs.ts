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
export const LEVELS = [
  { min: 0,    title: 'уровень: Английский? Не, не слышал' },
  { min: 10,   title: 'уровень: Кто такой хеллоу?' },
  { min: 25,   title: 'уровень: Hello my name is… и всё' },
  { min: 45,   title: 'уровень: Sorry, I don\'t speak English (на английском)' },
  { min: 70,   title: 'уровень: Тупой как Siri' },
  { min: 100,  title: 'уровень: Умный как Siri' },
  { min: 135,  title: 'уровень: Немой турист' },
  { min: 175,  title: 'уровень: Гугл транслейт на ножках' },
  { min: 220,  title: 'уровень: Знаю "hello" и "sorry"' },
  { min: 270,  title: 'уровень: Выживший в аэропорту' },
  { min: 325,  title: 'уровень: Смотрю сериалы с субтитрами' },
  { min: 385,  title: 'уровень: Могу заказать кофе' },
  { min: 450,  title: 'уровень: Читаю меню без паники' },
  { min: 520,  title: 'уровень: Иностранец с акцентом' },
  { min: 595,  title: 'уровень: Разговариваю руками и словами' },
  { min: 675,  title: 'уровень: B1 с понтами' },
  { min: 760,  title: 'уровень: Понимаю половину мемов' },
  { min: 850,  title: 'уровень: Средний английский, нижний предел' },
  { min: 940,  title: 'уровень: Пишу "I\'m fine" и это правда' },
  { min: 1030, title: 'уровень: Смотрел Друзей 4 раза' },
  { min: 1120, title: 'уровень: Дружу с грамматикой (иногда)' },
  { min: 1210, title: 'уровень: Смотрю ютуб без субтитров и злюсь только раз в 10 минут' },
  { min: 1300, title: 'уровень: Могу поспорить и проиграть' },
  { min: 1390, title: 'уровень: Разговариваю как человек' },
  { min: 1480, title: 'уровень: Пишу в чат без переводчика' },
  { min: 1565, title: 'уровень: Читаю медленно но уверенно' },
  { min: 1645, title: 'уровень: Делаю замечания по чужой грамматике' },
  { min: 1720, title: 'уровень: Английский не мой враг, просто сложный друг' },
  { min: 1790, title: 'уровень: Думаю на английском в душе' },
  { min: 1855, title: 'уровень: Почти не стыдно' },
  { min: 1915, title: 'уровень: Смотрю стендап и смеюсь в нужных местах' },
  { min: 1970, title: 'уровень: Смотрю новости и понимаю заголовки' },
  { min: 2020, title: 'уровень: Носитель духа языка' },
  { min: 2070, title: 'уровень: Говорю быстро и мало думаю' },
  { min: 2120, title: 'уровень: Объясняю грамматику русским' },
  { min: 2170, title: 'уровень: Иностранцы не догадываются. Сразу.' },
  { min: 2220, title: 'уровень: Лингвистический монстр' },
  { min: 2270, title: 'уровень: Словарный запас > самооценка' },
  { min: 2320, title: 'уровень: Читаю книги без словаря' },
  { min: 2370, title: 'уровень: Думаю на английском даже когда злюсь' },
  { min: 2420, title: 'уровень: Профессиональный болтун' },
  { min: 2510, title: 'уровень: Объясняю русские мемы иностранцам' },
  { min: 2600, title: 'уровень: Слушаю подкасты на скорости 1.5х' },
  { min: 2700, title: 'уровень: Поправляю носителей и они соглашаются' },
  { min: 2800, title: 'уровень: Шекспир был бы доволен' },
  { min: 2920, title: 'уровень: Английский — это я' },
  { min: 3000, title: 'уровень: WordPunk завершён. Иди жить.' },
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
