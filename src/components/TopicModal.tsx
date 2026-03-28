import { FC, useEffect, useState } from 'react';
import { TOPICS } from '../data/topics';
import { getCardsByTopic } from '../db';

interface Props {
  selectedTopicId: string | null; // null = all topics
  onSelect: (topicId: string | null) => void;
  onClose: () => void;
}

const TopicModal: FC<Props> = ({ selectedTopicId, onSelect, onClose }) => {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const map: Record<string, number> = {};
      for (const t of TOPICS) {
        const cards = await getCardsByTopic(t.id);
        map[t.id] = cards.length;
      }
      setCounts(map);
    };
    load();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">ТЕМЫ_</div>
        <div className="topics-list">
          <div
            className={`topic-item ${selectedTopicId === null ? 'active' : ''}`}
            onClick={() => { onSelect(null); onClose(); }}
          >
            <div className="topic-item-left">
              <span className="topic-emoji">🌐</span>
              <span className="topic-name">Все темы вперемешку</span>
            </div>
            <span className="topic-count">все</span>
          </div>
          {TOPICS.filter(t => t.id !== 'custom').map(topic => (
            <div
              key={topic.id}
              className={`topic-item ${selectedTopicId === topic.id ? 'active' : ''}`}
              onClick={() => { onSelect(topic.id); onClose(); }}
            >
              <div className="topic-item-left">
                <span className="topic-emoji">{topic.emoji}</span>
                <span className="topic-name">{topic.name}</span>
              </div>
              <span className="topic-count">{counts[topic.id] ?? 0} сл.</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopicModal;
