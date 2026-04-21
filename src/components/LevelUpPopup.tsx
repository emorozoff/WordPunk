import type { FC } from 'react';

interface Props {
  title: string;
  description: string;
  onClose: () => void;
}

const LevelUpPopup: FC<Props> = ({ title, description, onClose }) => {
  return (
    <div className="levelup-overlay" onClick={onClose}>
      <div className="levelup-box" onClick={e => e.stopPropagation()}>
        <div className="levelup-icon">🎯</div>
        <div className="levelup-label">Новый уровень</div>
        <div className="levelup-title">{title}</div>
        <div className="levelup-description">{description}</div>
        <button className="levelup-btn" onClick={onClose}>
          Продолжить
        </button>
      </div>
    </div>
  );
};

export default LevelUpPopup;
