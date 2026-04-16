import type { FC } from 'react';

interface Props {
  onClose: () => void;
  onAddPoints: (n: number) => void;
  onNextLevel: () => void;
  onReset: () => void;
  onVoiceTest: () => void;
}

const DebugPanel: FC<Props> = ({ onClose, onAddPoints, onNextLevel, onReset, onVoiceTest }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="debug-panel" onClick={e => e.stopPropagation()}>
      <div className="debug-title">// DEBUG MODE</div>
      <div className="debug-grid">
        <button className="debug-btn" onClick={() => onAddPoints(9)}>+9 очков</button>
        <button className="debug-btn" onClick={() => onAddPoints(100)}>+100 очков</button>
        <button className="debug-btn accent" onClick={onNextLevel}>следующий уровень</button>
        <button className="debug-btn danger" onClick={onReset}>сбросить прогресс</button>
        <button className="debug-btn" onClick={onVoiceTest}>тест голосов</button>
      </div>
    </div>
  </div>
);

export default DebugPanel;
