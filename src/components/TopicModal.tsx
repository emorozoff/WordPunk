import { FC, useState } from 'react';
import { TOPICS } from '../data/topics';
import { loadTopicPrefs, saveTopicPrefs, getPref } from '../lib/topicPrefs';
import type { PrefLevel, TopicPrefs } from '../lib/topicPrefs';

interface Props {
  onClose: () => void;
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

const TopicModal: FC<Props> = ({ onClose }) => {
  const [prefs, setPrefs] = useState<TopicPrefs>(() => loadTopicPrefs());

  const toggle = (topicId: string) => {
    const current = getPref(prefs, topicId);
    const next = PREF_NEXT[current];
    const updated = { ...prefs, [topicId]: next };
    setPrefs(updated);
    saveTopicPrefs(updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
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
            return (
              <div key={topic.id} className={`topic-item pref-${pref}`}>
                <div className="topic-item-left">
                  <span className="topic-emoji">{topic.emoji}</span>
                  <span className="topic-name">{topic.name}</span>
                </div>
                <button
                  className={`pref-toggle pref-toggle-${pref}`}
                  onClick={() => toggle(topic.id)}
                >
                  {PREF_LABELS[pref]}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TopicModal;
