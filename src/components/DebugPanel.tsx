import type { FC } from 'react';

interface Props {
  onClose: () => void;
  onReset: () => void;
  onPromoteCurrent: () => void;
}

const DebugPanel: FC<Props> = ({ onClose, onReset, onPromoteCurrent }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="debug-panel" onClick={e => e.stopPropagation()}>
      <div className="debug-title">Отладка</div>
      <div className="debug-grid">
        <button className="debug-btn accent" onClick={onPromoteCurrent}>На финал</button>
        <button className="debug-btn danger" onClick={onReset}>Сброс</button>
      </div>
    </div>
  </div>
);

export default DebugPanel;
