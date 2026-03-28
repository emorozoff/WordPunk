import { FC, useState, useEffect, useRef } from 'react';
import { TOPICS } from '../data/topics';
import { getAllCards, getAllProgress } from '../db';
import { loadTopicPrefs, saveTopicPrefs, getPref } from '../lib/topicPrefs';
import type { PrefLevel, TopicPrefs } from '../lib/topicPrefs';

interface Props {
  onClose: () => void;
}

interface TopicStats {
  total: number;
  known: number;
}

const PREF_LABELS: Record<PrefLevel, string> = {
  2: '++',
  1: '+',
  0: '—',
};

const PREF_NEXT: Record<PrefLevel, PrefLevel> = {
  1: 2,
  2: 0,
  0: 1,
};

const DISMISS_THRESHOLD = 100; // px

const TopicModal: FC<Props> = ({ onClose }) => {
  const [prefs, setPrefs] = useState<TopicPrefs>(() => loadTopicPrefs());
  const [stats, setStats] = useState<Record<string, TopicStats>>({});
  const sheetRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const load = async () => {
      const [cards, progress] = await Promise.all([getAllCards(), getAllProgress()]);
      const knownSet = new Set(progress.filter(p => p.level >= 1).map(p => p.cardId));
      const result: Record<string, TopicStats> = {};
      for (const topic of TOPICS) {
        const topicCards = cards.filter(c => c.topicId === topic.id);
        result[topic.id] = {
          total: topicCards.length,
          known: topicCards.filter(c => knownSet.has(c.id)).length,
        };
      }
      setStats(result);
    };
    load();
  }, []);

  const toggle = (topicId: string) => {
    const current = getPref(prefs, topicId);
    const next = PREF_NEXT[current];
    const updated = { ...prefs, [topicId]: next };
    setPrefs(updated);
    saveTopicPrefs(updated);
  };

  const dismiss = () => {
    const sheet = sheetRef.current;
    const overlay = overlayRef.current;
    if (!sheet) { onClose(); return; }
    sheet.style.transition = 'transform 0.25s ease';
    sheet.style.transform = 'translateY(110%)';
    if (overlay) {
      overlay.style.transition = 'opacity 0.25s ease';
      overlay.style.opacity = '0';
    }
    setTimeout(onClose, 250);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0]!.clientY;
    isDragging.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const sheet = sheetRef.current;
    const overlay = overlayRef.current;
    if (!sheet) return;

    const delta = e.touches[0]!.clientY - dragStartY.current;
    if (delta <= 0) return;

    // Only dismiss-drag when list is scrolled to top
    if (sheet.scrollTop > 0) return;

    isDragging.current = true;
    sheet.style.transition = 'none';
    sheet.style.overflowY = 'hidden'; // prevent content scroll while dragging
    sheet.style.transform = `translateY(${delta}px)`;

    // Fade overlay proportionally to sheet height
    if (overlay) {
      const sheetH = sheet.clientHeight || 400;
      const opacity = Math.max(0, 0.75 * (1 - delta / sheetH));
      overlay.style.transition = 'none';
      overlay.style.opacity = String(opacity);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const delta = e.changedTouches[0]!.clientY - dragStartY.current;
    isDragging.current = false;
    sheet.style.overflowY = ''; // restore scroll

    if (delta > DISMISS_THRESHOLD) {
      dismiss();
    } else {
      sheet.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
      sheet.style.transform = 'translateY(0)';
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0.75';
      }
    }
  };

  return (
    <div ref={overlayRef} className="modal-overlay" onClick={dismiss}>
      <div
        ref={sheetRef}
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="modal-handle" />
        <div className="modal-title">ТЕМЫ_</div>
        <div className="topics-pref-hint">
          Выбери темы — алгоритм подберёт слова автоматически
        </div>
        <div className="topics-pref-legend">
          <span className="legend-item legend-2">++ очень интересно</span>
          <span className="legend-item legend-1">+ немного</span>
          <span className="legend-item legend-0">— исключить</span>
        </div>
        <div className="topics-list">
          {TOPICS.filter(t => t.id !== 'custom').map(topic => {
            const pref = getPref(prefs, topic.id);
            const s = stats[topic.id] ?? { total: 0, known: 0 };
            const pct = s.total > 0 ? (s.known / s.total) * 100 : 0;
            return (
              <div key={topic.id} className={`topic-item pref-${pref}`}>
                <div className="topic-item-row">
                  <div className="topic-item-left">
                    <span className="topic-emoji">{topic.emoji}</span>
                    <span className="topic-name">{topic.name}</span>
                  </div>
                  <div className="topic-item-right">
                    <span className="topic-progress-count">{s.known}/{s.total}</span>
                    <button
                      className={`pref-toggle pref-toggle-${pref}`}
                      onClick={() => toggle(topic.id)}
                    >
                      {PREF_LABELS[pref]}
                    </button>
                  </div>
                </div>
                <div className="topic-progress-bar">
                  <div className="topic-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TopicModal;
