import { FC, useState, useRef, useCallback } from 'react';

const WORDS = ['cat', 'phone', 'beautiful', 'comfortable', 'particularly', 'extraordinary'];

const VOICES: Record<string, string> = {
  jenny: 'Jenny (US)',
  aria: 'Aria (US)',
  guy: 'Guy (US)',
  sonia: 'Sonia (GB)',
};

const BASE = import.meta.env.BASE_URL + 'audio-samples';

interface Props {
  onClose: () => void;
}

const VoiceTestPage: FC<Props> = ({ onClose }) => {
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((voice: string, word: string) => {
    const key = `${voice}/${word}`;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playing === key) {
      setPlaying(null);
      return;
    }

    setError(null);
    const url = `${BASE}/${voice}/${word}.mp3`;
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlaying(key);

    audio.onended = () => {
      setPlaying(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setError(`Файл не найден: ${voice}/${word}.mp3 — запусти скрипт генерации`);
      setPlaying(null);
      audioRef.current = null;
    };
    audio.play().catch(() => {
      setError('Не удалось воспроизвести');
      setPlaying(null);
    });
  }, [playing]);

  return (
    <div className="voice-test-page">
      <div className="voice-test-header">
        <button className="voice-test-back" onClick={onClose}>← НАЗАД</button>
        <h2 className="voice-test-title">ТЕСТ ГОЛОСОВ_</h2>
      </div>

      {error && <div className="voice-test-error">{error}</div>}

      <p className="voice-test-hint">
        Запусти на маке: <code>python3 scripts/generate-voice-samples.py</code>
      </p>

      <div className="voice-test-grid">
        {Object.entries(VOICES).map(([voiceKey, voiceLabel]) => (
          <div key={voiceKey} className="voice-test-voice-section">
            <h3 className="voice-test-voice-name">{voiceLabel}</h3>
            <div className="voice-test-words">
              {WORDS.map(word => {
                const key = `${voiceKey}/${word}`;
                const isPlaying = playing === key;
                return (
                  <button
                    key={key}
                    className={`voice-test-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={() => play(voiceKey, word)}
                  >
                    {isPlaying ? '■' : '▶'} {word}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceTestPage;
