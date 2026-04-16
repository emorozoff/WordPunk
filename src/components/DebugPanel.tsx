import type { FC } from 'react';

interface Props {
  onClose: () => void;
  onReset: () => void;
  onPromoteCurrent: () => void;
}

const DebugPanel: FC<Props> = ({ onClose, onReset, onPromoteCurrent }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="debug-panel" onClick={e => e.stopPropagation()}>
      <div className="debug-title">// DEBUG MODE</div>
      <div className="debug-grid">
        <button className="debug-btn accent" onClick={onPromoteCurrent}>текущую → lvl 4</button>
        <button className="debug-btn danger" onClick={onReset}>сбросить прогресс</button>
      </div>
    </div>
  </div>
);

export default DebugPanel;
