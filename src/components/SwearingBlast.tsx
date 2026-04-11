import { FC, useEffect, useRef } from 'react';

const WORDS = ['пиздец', 'нахуй', 'блять'];

interface WordInstance {
  id: number;
  word: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  isWhite: boolean;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateWords(): WordInstance[] {
  const count = Math.round(rand(15, 25));
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    word: WORDS[Math.floor(Math.random() * WORDS.length)]!,
    x: rand(2, 85),
    y: rand(5, 88),
    size: Math.round(rand(24, 80)),
    rotation: rand(-15, 15),
    delay: Math.round(rand(0, 900)),
    duration: Math.round(rand(300, 600)),
    isWhite: Math.random() > 0.6,
  }));
}

const SwearingBlast: FC<{ onDone: () => void }> = ({ onDone }) => {
  const words = useRef(generateWords()).current;

  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="swearing-blast-overlay">
      {words.map(w => (
        <span
          key={w.id}
          className={`swearing-word${w.isWhite ? ' swearing-word-white' : ''}`}
          style={{
            left: `${w.x}%`,
            top: `${w.y}%`,
            fontSize: `${w.size}px`,
            '--rot': `${w.rotation}deg`,
            animationDelay: `${w.delay}ms`,
            animationDuration: `${w.duration}ms`,
          } as React.CSSProperties}
        >
          {w.word}
        </span>
      ))}
    </div>
  );
};

export default SwearingBlast;
