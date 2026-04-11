import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import type { Card, SessionCard } from '../types';
import {
  getAllCards, getAllProgress, getProgress,
  putProgress, putCards, deleteCard, getDueCards, getKnownCount,
  recordActivity, clearAllProgress,
} from '../db';

import { WORDS } from '../data/words';
import { UNIQUE_WORD_COUNT } from '../data/wordCount';
import {
  buildQueue, generateOptions, processAnswer, processLevel0Answer,
  createInitialProgress, getCurrentLevel, getLevelProgress,
  getToday,
} from '../lib/srs';
import { playCorrect, playWrong, playLevelUp } from '../lib/audio';
import { getTopicById } from '../data/topics';
import { loadTopicPrefs, getWeight } from '../lib/topicPrefs';
import LevelUpPopup from './LevelUpPopup';
import LevelsModal from './LevelsModal';
import DebugPanel from './DebugPanel';

interface Props {
  prefsVersion: number;
  onOpenTopics: () => void;
  onOpenStats: () => void;
}

function renderExample(example: string, englishWord: string): React.ReactNode {
  // Sentence-first cards use **word** markers (markdown bold) for the target word.
  // Legacy cards without markers fall back to regex matching on the english word.
  if (example.includes('**')) {
    const parts = example.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="example-highlight">{part.slice(2, -2)}</span>;
      }
      return part;
    });
  }
  const escaped = englishWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = example.split(regex);
  return parts.map((part, i) =>
    part.toLowerCase() === englishWord.toLowerCase()
      ? <span key={i} className="example-highlight">{part}</span>
      : part
  );
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

const MainScreen: FC<Props> = ({ prefsVersion, onOpenTopics, onOpenStats }) => {
  const [queue, setQueue]           = useState<SessionCard[]>([]);
  const [queueIdx, setQueueIdx]     = useState(0);
  const [options, setOptions]       = useState<string[]>([]);
  const [answered, setAnswered]     = useState<null | { chosen: string; correct: string; wasCorrect: boolean }>(null);
  const [displayWord, setDisplayWord] = useState('');
  const [isTyping, setIsTyping]     = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [levelUp, setLevelUp] = useState<{ title: string; description: string } | null>(null);
  const [xpToastKey, setXpToastKey] = useState(0); // каждый инкремент — новая анимация
  const [showXpToast, setShowXpToast] = useState(false);
  const xpToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debugOpen, setDebugOpen]       = useState(false);
  const [allCards, setAllCards]     = useState<Card[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isGlitching, setIsGlitching] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [prevExample, setPrevExample] = useState<{ text: string; word: string; animKey: number } | null>(null);
  const pendingExampleRef = useRef<{ text: string; word: string } | null>(null);
  const prevLevelRef = useRef<string>('');
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevKnownRef = useRef<number>(0);
  const swipeTouchStartX = useRef(0);
  const swipeTouchStartY = useRef(0);
  const swipeEdge = useRef(false);

  // Отслеживаем показы слов уровня 0 внутри текущей сессии (в памяти, не в DB)
  const sessionDataRef = useRef<Map<string, { shows: number; correctCount: number; wrongCount: number }>>(new Map());

  // Seed DB on first load (re-seed if built-in word count changed)
  useEffect(() => {
    const init = async () => {
      const allExisting = await getAllCards();
      const builtInCount = allExisting.filter(c => !c.isCustom).length;
      if (builtInCount !== WORDS.length) {
        // Remove outdated built-in cards, keep custom ones
        for (const c of allExisting.filter(cc => !cc.isCustom)) {
          await deleteCard(c.id);
        }
        await putCards(WORDS);
      }
      const cards = await getAllCards();
      setAllCards(cards);
      await loadQueue(cards);
      const kc = await getKnownCount();
      setKnownCount(kc);
      const lvl = getCurrentLevel(kc);
      prevLevelRef.current = lvl.title;
      setLoading(false);
    };
    init();
  }, []);

  // Reload queue when topic prefs change
  useEffect(() => {
    if (!loading && allCards.length > 0) {
      loadQueue(allCards);
    }
  }, [prefsVersion]);

  // Glitch animation when knownCount increases
  useEffect(() => {
    if (knownCount > prevKnownRef.current && prevKnownRef.current !== 0) {
      if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);
      setIsGlitching(true);
      glitchTimerRef.current = setTimeout(() => setIsGlitching(false), 650);
    }
    prevKnownRef.current = knownCount;
  }, [knownCount]);

  const loadQueue = async (cards: Card[]) => {
    const today = getToday();
    const dueProgress = await getDueCards(today);
    const prefs = loadTopicPrefs();

    const allProgress = await getAllProgress();
    const progressMap = new Map(allProgress.map(p => [p.cardId, p]));

    // Due cards (SRS reviews) — show all regardless of prefs
    const filteredDue = dueProgress.filter(p => {
      const c = cards.find(cc => cc.id === p.cardId);
      return c && c.topicId !== 'custom';
    });

    // New cards — weighted by topic prefs, grouped by difficulty
    const eligibleNew = cards.filter(c =>
      c.topicId !== 'custom' && !progressMap.has(c.id) && c.topicIds.some(t => getWeight(prefs, t) > 0)
    ).sort((a, b) => (a.difficulty ?? 6) - (b.difficulty ?? 6));

    // Group by difficulty, shuffle within each group, then concat
    const byDiff = new Map<number, Card[]>();
    for (const card of eligibleNew) {
      const d = card.difficulty ?? 6;
      if (!byDiff.has(d)) byDiff.set(d, []);
      byDiff.get(d)!.push(card);
    }
    const pool: Card[] = [];
    for (const d of [...byDiff.keys()].sort((a, b) => a - b)) {
      const group = byDiff.get(d)!;
      // Weighted shuffle within difficulty group
      const weighted: Card[] = [];
      for (const card of group) {
        const w = Math.max(...card.topicIds.map(t => getWeight(prefs, t)));
        for (let i = 0; i < w; i++) weighted.push(card);
      }
      for (let i = weighted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [weighted[i], weighted[j]] = [weighted[j]!, weighted[i]!];
      }
      pool.push(...weighted);
    }
    // Unique first 20
    const seen = new Set<string>();
    const newCards: Card[] = [];
    for (const card of pool) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        newCards.push(card);
        if (newCards.length >= 20) break;
      }
    }

    const q = buildQueue(filteredDue, newCards, cards);

    setQueue(q);
    setQueueIdx(0);
    setAnswered(null);
    if (q.length > 0) {
      setupCard(q[0]!, cards);
    }
  };

  const setupCard = useCallback((sc: SessionCard, cards: Card[]) => {
    const prefs = loadTopicPrefs();
    setOptions(generateOptions(sc.card, sc.direction, cards, prefs));
    setAnswered(null);
    if (sc.direction === 'ru-en') {
      typeWord(sc.card.russian);
    } else {
      // en-ru: показываем предложение напрямую, без typing-анимации
      setDisplayWord('');
      setIsTyping(false);
    }
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

  const showXp = () => {
    if (xpToastTimer.current) clearTimeout(xpToastTimer.current);
    setXpToastKey(k => k + 1);
    setShowXpToast(true);
    xpToastTimer.current = setTimeout(() => setShowXpToast(false), 1400);
  };

  const handleAnswer = async (chosen: string) => {
    if (answered || queue.length === 0) return;
    setPrevExample(null); // убираем предыдущий пример при новом ответе
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
      // Уровень 0: прогресс сохраняется в DB после каждого ответа.
      // 3 правильных подряд (consecutiveCorrect >= 3) → уровень 1, независимо от сессии.
      // Ошибка сбрасывает consecutiveCorrect.
      const existing = sessionDataRef.current.get(sc.card.id) ?? { shows: 0, correctCount: 0, wrongCount: 0 };
      const newShows = existing.shows + 1;
      sessionDataRef.current.set(sc.card.id, {
        shows: newShows,
        correctCount: existing.correctCount + (isCorrect ? 1 : 0),
        wrongCount: existing.wrongCount + (isCorrect ? 0 : 1),
      });

      // Сохраняем в DB сразу после каждого ответа
      const newProgress = processLevel0Answer(progressFromDB, isCorrect);
      await putProgress(newProgress);

      if (isCorrect) showXp();

      if (newProgress.level === 1) {
        // Слово выучено (3 правильных подряд) — берём счётчик из DB
        const newKnown = await getKnownCount();
        setKnownCount(newKnown);
        const newLvl = getCurrentLevel(newKnown);
        if (newLvl.title !== prevLevelRef.current) {
          prevLevelRef.current = newLvl.title;
          setTimeout(() => { playLevelUp(); setLevelUp({ title: newLvl.title, description: newLvl.description }); }, 800);
        }
      } else if (isCorrect && newShows === 1) {
        // Первый правильный ответ в этой сессии — оптимистичный +1 в счётчик
        const tentative = knownCount + 1;
        setKnownCount(tentative);
        const newLvl = getCurrentLevel(tentative);
        if (newLvl.title !== prevLevelRef.current) {
          prevLevelRef.current = newLvl.title;
          setTimeout(() => { playLevelUp(); setLevelUp({ title: newLvl.title, description: newLvl.description }); }, 800);
        }
      }

      // Вставляем обратно в очередь (не более 3 показов за сессию)
      if (newShows < 3) {
        const offset = newShows === 1
          ? 10 + Math.floor(Math.random() * 6)   // 10–15 карточек
          : 20 + Math.floor(Math.random() * 11);  // 20–30 карточек
        setQueue(prev => {
          const insertIdx = Math.min(queueIdx + 1 + offset, prev.length);
          const newQueue = [...prev];
          newQueue.splice(insertIdx, 0, { ...sc, isRetry: true });
          return newQueue;
        });
      }
    } else {
      // Уровень 1–5: стандартный SRS
      // Правильно → +1 уровень, ошибка → -1 уровень (минимум 1), следующий показ завтра
      if (isCorrect) showXp();
      const progress = processAnswer(progressFromDB, isCorrect);
      await putProgress(progress);
      const newKnown = await getKnownCount();
      setKnownCount(newKnown);
      const newLvl = getCurrentLevel(newKnown);
      if (newLvl.title !== prevLevelRef.current) {
        prevLevelRef.current = newLvl.title;
        setTimeout(() => { playLevelUp(); setLevelUp({ title: newLvl.title, description: newLvl.description }); }, 800);
      }
    }

    // Автопереход — только при правильном ответе
    // При ошибке пользователь сам нажимает "ДАЛЕЕ"
    if (isCorrect) {
      // Для ru-en: пример показывается под карточкой после ответа, потом гаснет
      // Для en-ru: пример уже был на карточке — не дублируем
      if (sc.card.example && sc.direction === 'ru-en') {
        pendingExampleRef.current = { text: sc.card.example, word: sc.card.english };
      }
      autoAdvanceRef.current = setTimeout(() => {
        advance();
      }, 1600);
    }
  };

  const advance = useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (pendingExampleRef.current) {
      setPrevExample({ ...pendingExampleRef.current, animKey: Date.now() });
      pendingExampleRef.current = null;
    }
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

  // Debug handlers
  const handleDebugAddPoints = (n: number) => {
    const next = knownCount + n;
    setKnownCount(next);
    const newLvl = getCurrentLevel(next);
    if (newLvl.title !== prevLevelRef.current) {
      prevLevelRef.current = newLvl.title;
      playLevelUp();
      setLevelUp({ title: newLvl.title, description: newLvl.description });
    }
    setDebugOpen(false);
  };

  const handleDebugNextLevel = () => {
    const { nextMin } = getCurrentLevel(knownCount);
    const next = nextMin;
    setKnownCount(next);
    const newLvl = getCurrentLevel(next);
    prevLevelRef.current = newLvl.title;
    playLevelUp();
    setLevelUp({ title: newLvl.title, description: newLvl.description });
    setDebugOpen(false);
  };

  const handleDebugReset = async () => {
    await clearAllProgress();
    sessionDataRef.current.clear();
    setKnownCount(0);
    prevLevelRef.current = getCurrentLevel(0).title;
    await loadQueue(allCards);
    setDebugOpen(false);
  };

  const handleMainZoneTap = useCallback(() => {
    if (answered?.wasCorrect) advance();
  }, [answered, advance]);

  const onSwipeTouchStart = (e: React.TouchEvent) => {
    swipeTouchStartX.current = e.touches[0]!.clientX;
    swipeTouchStartY.current = e.touches[0]!.clientY;
    swipeEdge.current = e.touches[0]!.clientX >= window.innerWidth - 30;
  };

  const onSwipeTouchEnd = (e: React.TouchEvent) => {
    if (!swipeEdge.current) return;
    const dx = e.changedTouches[0]!.clientX - swipeTouchStartX.current;
    const dy = Math.abs(e.changedTouches[0]!.clientY - swipeTouchStartY.current);
    if (dx < -80 && dy < 80) onOpenStats();
  };

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
    <div
      style={{ display: 'contents' }}
      onTouchStart={onSwipeTouchStart}
      onTouchEnd={onSwipeTouchEnd}
    >
      {/* Header */}
      <div className="header">
        <div className="header-logo" onClick={() => setDebugOpen(true)} style={{ cursor: 'pointer' }}>
          WORDPUNK_
          <span className="header-version">v0.62</span>
          <span className="header-version" style={{ opacity: 0.4, fontSize: '0.6em', marginLeft: 4 }}>[{UNIQUE_WORD_COUNT}]</span>
        </div>
        <div className="header-known" onClick={onOpenStats} style={{ cursor: 'pointer' }}>
          <span className="header-known-label">знаю слов:</span>
          <span className={`header-known-count${isGlitching ? ' glitching' : ''}`}>{knownCount}</span>
        </div>
      </div>

      {/* Level bar */}
      <div className="level-bar" onClick={() => setShowLevels(true)} style={{ cursor: 'pointer' }}>
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
      <div className="card-area" onClick={handleMainZoneTap}>
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-title">загрузка_</div>
          </div>
        ) : isFinished ? (
          <div className="empty-state">
            <div className="empty-state-no-words">НЕТ СЛОВ_</div>
            <div className="empty-state-no-words-body">
              <span className="empty-state-no-words-line">либо ты всё выучил</span>
              <span className="empty-state-no-words-sep">//</span>
              <span className="empty-state-no-words-line">либо не выбрал темы</span>
            </div>
          </div>
        ) : currentCard ? (
          <>
            {/* Слот фиксированной высоты для XP — карточка не прыгает */}
            <div className="xp-toast-slot">
              {showXpToast && <div key={xpToastKey} className="xp-toast">▲ ОПЫТ</div>}
            </div>
            <div className="word-card" style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); if (answered?.wasCorrect) advance(); else if (!answered) onOpenTopics(); }}>
              {topic && (
                <div className="card-topic-tag">[ {topic.name.toUpperCase()} ]</div>
              )}
              {currentCard.direction === 'en-ru' && currentCard.card.example ? (
                <div className="card-sentence">
                  {renderExample(currentCard.card.example, currentCard.card.english)}
                </div>
              ) : (
                <div className={`card-word ${sizeClass} ${isTyping ? 'typing' : ''}`}>
                  {displayWord}
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
            {/* Перевод и пример — под карточкой, вне рамки */}
            {answered && answered.wasCorrect && (
              <div className="card-answer-below">
                <div className="card-translation">
                  {currentCard.direction === 'en-ru'
                    ? currentCard.card.russian
                    : currentCard.card.english}
                </div>
                {/* Пример только для ru-en: при en-ru он уже виден на карточке */}
                {currentCard.direction === 'ru-en' && currentCard.card.example && (
                  <div className="card-example">
                    {renderExample(currentCard.card.example, currentCard.card.english)}
                  </div>
                )}
              </div>
            )}
            {/* Предыдущий пример — остаётся и гаснет */}
            {!answered && prevExample && (
              <div key={prevExample.animKey} className="prev-example">
                {renderExample(prevExample.text, prevExample.word)}
              </div>
            )}
          </>
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
          <div className="options-grid" onClick={handleMainZoneTap}>
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
                  style={answered ? { pointerEvents: 'none' } : undefined}
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
        <button className="nav-btn" onClick={onOpenStats}>СТАТИСТИКА</button>
      </div>

      {/* XP toast */}
      {/* Level up popup */}
      {levelUp && (
        <LevelUpPopup
          title={levelUp.title}
          description={levelUp.description}
          onClose={() => setLevelUp(null)}
        />
      )}

      {/* Levels modal */}
      {showLevels && (
        <LevelsModal knownCount={knownCount} onClose={() => setShowLevels(false)} />
      )}

      {/* Debug panel */}
      {debugOpen && (
        <DebugPanel
          onClose={() => setDebugOpen(false)}
          onAddPoints={handleDebugAddPoints}
          onNextLevel={handleDebugNextLevel}
          onReset={handleDebugReset}
        />
      )}
    </div>
  );
};

export default MainScreen;
