import { useState } from 'react';
import type { AppScreen } from './types';
import MainScreen from './components/MainScreen';
import TopicModal from './components/TopicModal';
import AddWordModal from './components/AddWordModal';
import StatsScreen from './components/StatsScreen';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('main');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [showTopics, setShowTopics] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="app">
      {screen === 'stats' ? (
        <StatsScreen onBack={() => setScreen('main')} />
      ) : (
        <MainScreen
          topicId={topicId}
          onOpenTopics={() => setShowTopics(true)}
          onOpenAdd={() => setShowAdd(true)}
          onOpenStats={() => setScreen('stats')}
        />
      )}

      {showTopics && (
        <TopicModal
          selectedTopicId={topicId}
          onSelect={setTopicId}
          onClose={() => setShowTopics(false)}
        />
      )}

      {showAdd && (
        <AddWordModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {}}
        />
      )}

      {/* CRT scanline effect */}
      <div className="scanline" />
    </div>
  );
}
