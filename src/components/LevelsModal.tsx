import { FC, useRef } from 'react';
import { LEVELS } from '../lib/srs';

interface Props {
  knownCount: number;
  onClose: () => void;
}

const DISMISS_THRESHOLD = 100;

const LevelsModal: FC<Props> = ({ knownCount, onClose }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  let currentIdx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (knownCount >= LEVELS[i]!.min) currentIdx = i;
  }

  const dismiss = () => {
    const sheet = sheetRef.current;
    if (!sheet) { onClose(); return; }
    sheet.style.transition = 'transform 0.25s ease';
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
        <div className="modal-title">УРОВНИ_</div>
        <div className="levels-list">
          {LEVELS.map((lvl, idx) => {
            const title = lvl.title.replace(/^уровень:\s*/i, '');
            const isPast = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div
                key={idx}
                className={`level-row ${isPast ? 'level-row-past' : isCurrent ? 'level-row-current' : 'level-row-future'}`}
              >
                <span className="level-row-icon">
                  {isPast ? '✓' : isCurrent ? '→' : '·'}
                </span>
                <span className="level-row-title">{title}</span>
                <span className="level-row-min">{lvl.min}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LevelsModal;
