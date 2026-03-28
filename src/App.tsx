import { useState } from 'react';
import type { AppScreen } from './types';
import MainScreen from './components/MainScreen';
import TopicModal from './components/TopicModal';
import StatsScreen from './components/StatsScreen';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('main');
  const [showTopics, setShowTopics] = useState(false);
  const [prefsVersion, setPrefsVersion] = useState(0);

  const handleTopicsClose = () => {
    setShowTopics(false);
    setPrefsVersion(v => v + 1);
  };

  return (
    <div className="app">
      {/* MainScreen всегда в DOM — сохраняет состояние сессии при переходе в статистику */}
      <div style={{ display: screen === 'main' ? 'contents' : 'none' }}>
        <MainScreen
          prefsVersion={prefsVersion}
          onOpenTopics={() => setShowTopics(true)}
          onOpenStats={() => setScreen('stats')}
        />
      </div>

      {screen === 'stats' && (
        <StatsScreen onBack={() => setScreen('main')} />
      )}

      {showTopics && (
        <TopicModal onClose={handleTopicsClose} />
      )}

      {/* CRT scanline effect */}
      <div className="scanline" />
    </div>
  );
}
