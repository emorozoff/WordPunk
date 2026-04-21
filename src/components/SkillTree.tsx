import { FC, useState, useEffect, useRef } from 'react';
import { TOPICS } from '../data/topics';
import { getAllCards, getAllProgress } from '../db';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface TopicNode {
  id: string;
  name: string;
  icon: string;
  total: number;
  known: number;
  level: number;
  isAdult?: boolean;
}

const MILESTONES = [10, 25, 50, 100, 200, 500];

function getNodeLevel(known: number, total: number): number {
  if (total === 0) return 0;
  let lvl = 0;
  for (const m of MILESTONES) {
    if (known >= m) lvl++;
  }
  if (known >= total) lvl++;
  return lvl;
}

function getNextMilestone(known: number, total: number): number {
  for (const m of MILESTONES) {
    if (known < m && m <= total) return m;
  }
  return total;
}

const TopicIcon: FC<{ name: string; size?: number }> = ({ name, size = 20 }) => {
  const Icon = (LucideIcons as unknown as Record<string, FC<LucideProps>>)[name];
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={1.5} />;
};

interface Props {
  onClose: () => void;
}

const DISMISS_THRESHOLD = 100;

const SkillTree: FC<Props> = ({ onClose }) => {
  const [nodes, setNodes] = useState<TopicNode[]>([]);
  const [totalKnown, setTotalKnown] = useState(0);
  const [totalWords, setTotalWords] = useState(0);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const load = async () => {
      const [cards, progress] = await Promise.all([getAllCards(), getAllProgress()]);
      const knownSet = new Set(progress.filter(p => p.level >= 1).map(p => p.cardId));

      let tKnown = 0;
      let tTotal = 0;

      const result: TopicNode[] = TOPICS.map(topic => {
        const topicCards = cards.filter(c => c.topicIds.includes(topic.id));
        const known = topicCards.filter(c => knownSet.has(c.id)).length;
        tKnown += known;
        tTotal += topicCards.length;
        return {
          id: topic.id,
          name: topic.name,
          icon: topic.icon,
          total: topicCards.length,
          known,
          level: getNodeLevel(known, topicCards.length),
          isAdult: topic.isAdult,
        };
      }).filter(n => n.total > 0);

      setTotalKnown(tKnown);
      setTotalWords(tTotal);
      setNodes(result);
    };
    load();
  }, []);

  const dismiss = () => {
    const sheet = sheetRef.current;
    if (!sheet) { onClose(); return; }
    sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
    sheet.style.transform = 'translateY(110%)';
    setTimeout(onClose, 250);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0]!.clientY;
    isDragging.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const delta = e.touches[0]!.clientY - dragStartY.current;
    if (delta <= 0) return;
    if (sheet.scrollTop > 0) return;
    isDragging.current = true;
    sheet.style.transition = 'none';
    sheet.style.overflowY = 'hidden';
    sheet.style.transform = `translateY(${delta}px)`;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const delta = e.changedTouches[0]!.clientY - dragStartY.current;
    isDragging.current = false;
    sheet.style.overflowY = '';
    if (delta > DISMISS_THRESHOLD) {
      dismiss();
    } else {
      sheet.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
      sheet.style.transform = 'translateY(0)';
    }
  };

  const coreTopics = nodes.filter(n => !n.isAdult && n.id === 'basic');
  const mainTopics = nodes.filter(n => !n.isAdult && n.id !== 'basic');
  const adultTopics = nodes.filter(n => n.isAdult);

  return (
    <div className="modal-overlay" onClick={dismiss}>
      <div
        ref={sheetRef}
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="modal-handle" />
        <div className="modal-title">Дерево навыков</div>

        <div className="skill-tree-summary">
          <div className="skill-tree-total">
            <span className="skill-tree-total-num">{totalKnown}</span>
            <span className="skill-tree-total-sep">/</span>
            <span className="skill-tree-total-den">{totalWords}</span>
          </div>
          <div className="skill-tree-total-label">слов изучено</div>
          <div className="skill-tree-progress-track">
            <div
              className="skill-tree-progress-fill"
              style={{ width: totalWords > 0 ? `${(totalKnown / totalWords) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {coreTopics.length > 0 && (
          <div className="skill-tree-section">
            <div className="skill-tree-section-title">Основа</div>
            <div className="skill-tree-nodes">
              {coreTopics.map(node => (
                <SkillNode key={node.id} node={node} />
              ))}
            </div>
          </div>
        )}

        <div className="skill-tree-section">
          <div className="skill-tree-section-title">Темы</div>
          <div className="skill-tree-nodes">
            {mainTopics.map(node => (
              <SkillNode key={node.id} node={node} />
            ))}
          </div>
        </div>

        {adultTopics.length > 0 && (
          <div className="skill-tree-section">
            <div className="skill-tree-section-title" style={{ color: 'var(--red)' }}>18+</div>
            <div className="skill-tree-nodes">
              {adultTopics.map(node => (
                <SkillNode key={node.id} node={node} isAdult />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SkillNode: FC<{ node: TopicNode; isAdult?: boolean }> = ({ node, isAdult }) => {
  const pct = node.total > 0 ? (node.known / node.total) * 100 : 0;
  const nextMilestone = getNextMilestone(node.known, node.total);
  const isComplete = node.known >= node.total;
  const accentColor = isAdult ? 'var(--red)' : 'var(--accent)';

  return (
    <div className={`skill-node${isComplete ? ' skill-node-complete' : ''}`}>
      <div className="skill-node-icon" style={isComplete ? { background: accentColor, color: 'var(--text-on-accent)' } : undefined}>
        <TopicIcon name={node.icon} size={18} />
      </div>
      <div className="skill-node-body">
        <div className="skill-node-header">
          <span className="skill-node-name" style={isAdult ? { color: 'var(--red)' } : undefined}>
            {node.name}
          </span>
          <span className="skill-node-count">{node.known}/{node.total}</span>
        </div>
        <div className="skill-node-track">
          <div
            className="skill-node-fill"
            style={{
              width: `${pct}%`,
              background: isAdult ? 'var(--red)' : undefined,
            }}
          />
        </div>
        {!isComplete && (
          <div className="skill-node-next">
            Следующая цель: {nextMilestone} слов
          </div>
        )}
        {isComplete && (
          <div className="skill-node-next" style={{ color: accentColor }}>
            Тема завершена
          </div>
        )}
      </div>
      <div className="skill-node-level">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="skill-node-pip"
            style={i < node.level ? { background: accentColor } : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default SkillTree;
