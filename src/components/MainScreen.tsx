import { FC, useState, useEffect, useRef, useCallback } from 'react';
import type { Card, SessionCard } from '../types';
import {
  getAllCards, getAllProgress, getProgress,
  putProgress, putCards, isSeeded, getDueCards, getKnownCount,
  recordActivity,
} from '../db';
import { WORDS } from '../data/words';
import {
  buildQueue, generateOptions, processAnswer, finalizeLevel0Card,
  createInitialProgress, getCurrentLevel, getLevelProgress,
  getToday,
} from '../lib/srs';
import { playCorrect, playWrong, playLevelUp } from '../lib/audio';
import { getTopicById } from '../data/topics';
import LevelUpPopup from './LevelUpPopup';

interface Props {
  topicId: string | null;
  onOpenTopics: () => void;
  onOpenAdd: () => void;
  onOpenStats: () => void;
}

function getWordSizeClass(word: string): string {
  const len = word.length;
  if (len <= 6)  return 'size-xs';
  if (len <= 9)  return 'size-sm';
  if (len <= 12) return 'size-md';
  if (len <= 16) return 'size-lg';
  return 'size-xl';
}

const TYPING_SPEED_MS = 40;

const MainScreen: FC<Props> = ({ topicId, onOpenTopics, onOpenAdd, onOpenStats }) => {
  const [queue, setQueue]           = useState<SessionCard[]>([]);
  const [queueIdx, setQueueIdx]     = useState(0);
  const [options, setOptions]       = useState<string[]>([]);
  const [answered, setAnswered]     = useState<null | { chosen: string; correct: string; wasCorrect: boolean }>(null);
  const [displayWord, setDisplayWord] = useState('');
  const [isTyping, setIsTyping]     = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [levelUpTitle, setLevelUpTitle] = useState<string | null>(null);
  const [allCards, setAllCards]     = useState<Card[]>([]);
  const [loading, setLoading]       = useState(true);
  const prevLevelRef = useRef<string>('');
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Отслеживаем показы слов уровня 0 внутри текущей сессии (в памяти, не в DB)
  const sessionDataRef = useRef<Map<string, { shows: number; correctCount: number; wrongCount: number }>>(new Map());

  // Seed DB on first load
  useEffect(() => {
    const init = async () => {
      const seeded = await isSeeded();
      if (!seeded) {
        await putCards(WORDS);
      }
      const cards = await getAllCards();
      setAllCards(cards);
      await loadQueue(cards, topicId);
      const kc = await getKnownCount();
      setKnownCount(kc);
      const lvl = getCurrentLevel(kc);
      prevLevelRef.current = lvl.title;
      setLoading(false);
    };
    init();
  }, []);

  // Reload queue when topic changes
  useEffect(() => {
    if (!loading && allCards.length > 0) {
      loadQueue(allCards, topicId);
    }
  }, [topicId]);

  const loadQueue = async (cards: Card[], tid: string | null) => {
    const today = getToday();
    const dueProgress = await getDueCards(today);
    // Get new cards (no progress yet) from chosen topic
    const topicCards = tid
      ? cards.filter(c => c.topicId === tid)
      : cards.filter(c => c.topicId !== 'custom');

    const allProgress = await getAllProgress();
    const progressMap = new Map(allProgress.map(p => [p.cardId, p]));

    const newCards = topicCards
      .filter(c => !progressMap.has(c.id))
      .slice(0, 20); // max 20 new per session

    const q = buildQueue(dueProgress.filter(p => {
      const c = cards.find(cc => cc.id === p.cardId);
      if (!c) return false;
      if (tid) return c.topicId === tid;
      return c.topicId !== 'custom';
    }), newCards, cards);

    setQueue(q);
    setQueueIdx(0);
    setAnswered(null);
    if (q.length > 0) {
      setupCard(q[0]!, cards);
    }
  };

  const setupCard = useCallback((sc: SessionCard, cards: Card[]) => {
    const word = sc.direction === 'en-ru' ? sc.card.english : sc.card.russian;
    setOptions(generateOptions(sc.card, sc.direction, cards));
    setAnswered(null);
    typeWord(word);
  }, []);

  const typeWord = (word: string) => {
    setDisplayWord('');
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayWord(word.slice(0, i));
      if (i >= word.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, TYPING_SPEED_MS);
  };

  const handleAnswer = async (chosen: string) => {
    if (answered || queue.length === 0) return;
    const sc = queue[queueIdx];
    if (!sc) return;

    const correctAnswer = sc.direction === 'en-ru' ? sc.card.russian : sc.card.english;
    const allSynonyms = [correctAnswer, ...(sc.card.synonyms || [])];
    const isCorrect = allSynonyms.some(s => s.toLowerCase() === chosen.toLowerCase());

    setAnswered({ chosen, correct: correctAnswer, wasCorrect: isCorrect });

    // Звук
    if (isCorrect) playCorrect();
    else playWrong();

    // Активность — записываем каждый ответ
    await recordActivity(getToday());

    // Прогресс из DB (или создаём начальный для новых слов)
    const progressFromDB = await getProgress(sc.card.id) ?? createInitialProgress(sc.card.id);
    const isLevel0 = progressFromDB.level === 0;

    if (isLevel0) {
      // Уровень 0: до 3 показов в сессии, в DB не пишем до финального
      const existing = sessionDataRef.current.get(sc.card.id) ?? { shows: 0, correctCount: 0, wrongCount: 0 };
      const newShows = existing.shows + 1;
      const newCorrectCount = existing.correctCount + (isCorrect ? 1 : 0);
      const newWrongCount = existing.wrongCount + (isCorrect ? 0 : 1);
      sessionDataRef.current.set(sc.card.id, { shows: newShows, correctCount: newCorrectCount, wrongCount: newWrongCount });

      // TEMP: при первом правильном ответе на новое слово — сразу +1 в счётчик
      // Берём текущий стейт knownCount, а не DB — иначе счётчик сбрасывается каждый раз
      // TODO v1.0: убрать, вернуть дробную систему
      if (isCorrect && newShows === 1) {
        const tentative = knownCount + 1;
        setKnownCount(tentative);
        const newLvl = getCurrentLevel(tentative);
        if (newLvl.title !== prevLevelRef.current) {
          prevLevelRef.current = newLvl.title;
          setTimeout(() => { playLevelUp(); setLevelUpTitle(newLvl.title); }, 800);
        }
      }

      if (newShows < 3) {
        // Вставляем карточку обратно в очередь: ~10-15 карточек для 2-го показа, ~20-30 для 3-го
        const offset = newShows === 1
          ? 10 + Math.floor(Math.random() * 6)   // 10–15 карточек
          : 20 + Math.floor(Math.random() * 11);  // 20–30 карточек
        setQueue(prev => {
          const insertIdx = Math.min(queueIdx + 1 + offset, prev.length);
          const newQueue = [...prev];
          newQueue.splice(insertIdx, 0, { ...sc, isRetry: true });
          return newQueue;
        });
      } else {
        // 3-й показ: финализируем и сохраняем в DB
        const finalProgress = finalizeLevel0Card(progressFromDB, newCorrectCount, newWrongCount);
        await putProgress(finalProgress);
        const newKnown = await getKnownCount();
        setKnownCount(newKnown);
        const newLvl = getCurrentLevel(newKnown);
        if (newLvl.title !== prevLevelRef.current) {
          prevLevelRef.current = newLvl.title;
          setTimeout(() => { playLevelUp(); setLevelUpTitle(newLvl.title); }, 800);
        }
      }
    } else {
      // Уровень 1–5: стандартный SRS
      // Правильно → +1 уровень, ошибка → -1 уровень (минимум 1), следующий показ завтра
      const progress = processAnswer(progressFromDB, isCorrect);
      await putProgress(progress);
      const newKnown = await getKnownCount();
      setKnownCount(newKnown);
      const newLvl = getCurrentLevel(newKnown);
      if (newLvl.title !== prevLevelRef.current) {
        prevLevelRef.current = newLvl.title;
        setTimeout(() => { playLevelUp(); setLevelUpTitle(newLvl.title); }, 800);
      }
    }

    // Автопереход — только при правильном ответе
    // При ошибке пользователь сам нажимает "ДАЛЕЕ"
    if (isCorrect) {
      autoAdvanceRef.current = setTimeout(() => {
        advance();
      }, 1600);
    }
  };

  const advance = useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setQueueIdx(prev => {
      const next = prev + 1;
      setQueue(q => {
        if (next < q.length) {
          setupCard(q[next]!, allCards);
        } else {
          setAnswered(null);
          setDisplayWord('');
        }
        return q;
      });
      return next;
    });
  }, [allCards, setupCard]);

  const currentCard = queue[queueIdx];
  const isFinished = !loading && queueIdx >= queue.length;
  const topic = currentCard ? getTopicById(currentCard.card.topicId) : null;
  const displayQuestion = currentCard
    ? (currentCard.direction === 'en-ru' ? currentCard.card.english : currentCard.card.russian)
    : '';
  const sizeClass = getWordSizeClass(displayQuestion);
  const knownLevel = getCurrentLevel(knownCount);
  const levelPct = getLevelProgress(knownCount);
  const wordsUntil = knownLevel.nextMin - knownCount;

  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="header-logo">
          WORDPUNK_
          <span className="header-version">v0.242</span>
        </div>
        <div className="header-known">ЗНАЮ {knownCount} слов</div>
      </div>

      {/* Level bar */}
      <div className="level-bar">
        <div className="level-bar-top">
          <span className="level-title">{knownLevel.title}</span>
          {wordsUntil > 0 && (
            <span className="level-until">до уровня: {wordsUntil}</span>
          )}
        </div>
        <div className="level-track">
          <div className="level-fill" style={{ width: `${levelPct}%` }} />
        </div>
      </div>

      {/* Card area */}
      <div className="card-area">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-title">загрузка_</div>
          </div>
        ) : isFinished ? (
          <div className="empty-state">
            <div className="empty-state-title">готово на сегодня</div>
            <div className="empty-state-sub">
              все карточки пройдены 🎉{'\n'}
              возвращайся завтра
            </div>
          </div>
        ) : currentCard ? (
          <div className="word-card">
            {topic && (
              <div className="card-topic-tag">[ {topic.name.toUpperCase()} ]</div>
            )}
            <div className={`card-word ${sizeClass} ${isTyping ? 'typing' : ''}`}>
              {displayWord}
            </div>
            <div className="card-hint">
              {currentCard.direction === 'en-ru' ? 'что это значит?' : 'как по-английски?'}
            </div>
            {answered && answered.wasCorrect && (
              <div className="card-answer">
                <div className="card-translation">
                  {currentCard.direction === 'en-ru'
                    ? currentCard.card.russian
                    : currentCard.card.english}
                </div>
                {currentCard.card.example && (
                  <div className="card-example">{currentCard.card.example}</div>
                )}
                <div className="card-level-up">▲ УРОВЕНЬ ПОВЫШЕН</div>
              </div>
            )}
            {answered && !answered.wasCorrect && (
              <div className="wrong-reveal">
                <div className="wrong-reveal-pair">
                  <span className="wrong-reveal-en">{currentCard.card.english}</span>
                  <span className="wrong-reveal-sep">→</span>
                  <span className="wrong-reveal-ru">{currentCard.card.russian}</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Options / Continue */}
      {!isFinished && !loading && currentCard && (
        answered && !answered.wasCorrect ? (
          <div className="continue-area">
            <button className="continue-btn" onClick={advance}>
              ДАЛЕЕ →
            </button>
          </div>
        ) : (
          <div className="options-grid">
            {options.map((opt, i) => {
              let cls = 'option-btn';
              if (answered) {
                if (opt === answered.correct) cls += ' correct';
                else if (opt === answered.chosen) cls += ' wrong';
                else cls += ' dimmed';
              }
              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => handleAnswer(opt)}
                  disabled={!!answered}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )
      )}

      {/* Bottom nav */}
      <div className="bottom-nav">
        <button className="nav-btn" onClick={onOpenTopics}>ТЕМЫ</button>
        <button className="nav-btn center" onClick={onOpenAdd}>ЗНАЮ {knownCount}</button>
        <button className="nav-btn" onClick={onOpenStats}>СТАТ ↗</button>
      </div>

      {/* Level up popup */}
      {levelUpTitle && (
        <LevelUpPopup
          title={levelUpTitle}
          onClose={() => setLevelUpTitle(null)}
        />
      )}
    </>
  );
};

export default MainScreen;
