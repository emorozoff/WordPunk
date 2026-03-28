import { useState } from 'react';
import type { AppScreen } from './types';
import MainScreen from './components/MainScreen';
import TopicModal from './components/TopicModal';
import StatsScreen from './components/StatsScreen';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('main');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [showTopics, setShowTopics] = useState(false);

  return (
    <div className="app">
      {/* MainScreen всегда в DOM — сохраняет состояние сессии при переходе в статистику */}
      <div style={{ display: screen === 'main' ? '' : 'none' }}>
        <MainScreen
          topicId={topicId}
          onOpenTopics={() => setShowTopics(true)}
          onOpenStats={() => setScreen('stats')}
        />
      </div>

      {screen === 'stats' && (
        <StatsScreen onBack={() => setScreen('main')} />
      )}

      {showTopics && (
        <TopicModal
          selectedTopicId={topicId}
          onSelect={setTopicId}
          onClose={() => setShowTopics(false)}
        />
      )}

      {/* CRT scanline effect */}
      <div className="scanline" />
    </div>
  );
}
