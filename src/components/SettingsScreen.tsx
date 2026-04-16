import { FC, useRef, useState } from 'react';
import { clearAllProgress } from '../db';
import { isTtsEnabled, setTtsEnabled, stopSpeech } from '../lib/audio';

interface Props {
  onClose: () => void;
  onOpenTopics: () => void;
  onOpenAddWord: () => void;
  onProgressReset: () => void;
}

const DISMISS_THRESHOLD = 100;

const SettingsScreen: FC<Props> = ({ onClose, onOpenTopics, onOpenAddWord, onProgressReset }) => {
  const [ttsOn, setTtsOn] = useState(isTtsEnabled);
  const [confirmReset, setConfirmReset] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

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

  const toggleTts = () => {
    const next = !ttsOn;
    setTtsEnabled(next);
    setTtsOn(next);
    if (!next) stopSpeech();
  };

  const handleReset = async () => {
    await clearAllProgress();
    onProgressReset();
    setConfirmReset(false);
    dismiss();
  };

  return (
    <div className="modal-overlay" onClick={dismiss}>
      <div
        ref={sheetRef}
        className="modal-sheet settings-sheet"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="modal-handle" />
        <div className="modal-title">НАСТРОЙКИ_</div>

        <div className="settings-row" onClick={toggleTts}>
          <span className="settings-label">озвучка слова</span>
          <span className={`settings-toggle${ttsOn ? ' on' : ''}`}>
            {ttsOn ? '◉ ВКЛ' : '◎ ВЫКЛ'}
          </span>
        </div>

        <div className="settings-row" onClick={onOpenTopics}>
          <span className="settings-label">темы</span>
          <span className="settings-arrow">→</span>
        </div>

        <div className="settings-row" onClick={onOpenAddWord}>
          <span className="settings-label">мои слова</span>
          <span className="settings-arrow">→</span>
        </div>

        <div className="settings-section-gap" />

        <button className="settings-danger-btn" onClick={() => setConfirmReset(true)}>
          сбросить прогресс
        </button>
      </div>

      {confirmReset && (
        <div className="modal-overlay settings-confirm-overlay" onClick={() => setConfirmReset(false)}>
          <div className="debug-panel" onClick={e => e.stopPropagation()}>
            <div className="debug-title">// УДАЛИТЬ ВЕСЬ ПРОГРЕСС?</div>
            <div className="settings-confirm-body">
              Это действие нельзя отменить. Все выученные слова вернутся в уровень 0.
            </div>
            <div className="debug-grid">
              <button className="debug-btn" onClick={() => setConfirmReset(false)}>отмена</button>
              <button className="debug-btn danger" onClick={handleReset}>удалить всё</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsScreen;
