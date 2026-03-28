import type { FC } from 'react';

interface Props {
  title: string;
  onClose: () => void;
}

const LevelUpPopup: FC<Props> = ({ title, onClose }) => {
  const name = title.startsWith('уровень: ') ? title.slice('уровень: '.length) : title;
  return (
    <div className="levelup-overlay" onClick={onClose}>
      <div className="levelup-box" onClick={e => e.stopPropagation()}>
        <div className="levelup-icon">⚡</div>
        <div className="levelup-label">новый уровень:</div>
        <div className="levelup-title">{name}</div>
        <button className="levelup-btn" onClick={onClose}>
          ну и ладно, дальше →
        </button>
      </div>
    </div>
  );
};

export default LevelUpPopup;
