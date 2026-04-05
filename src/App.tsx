import { useState } from 'react';
import MainScreen from './components/MainScreen';
import TopicModal from './components/TopicModal';
import StatsScreen from './components/StatsScreen';

export default function App() {
  const [showTopics, setShowTopics] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [prefsVersion, setPrefsVersion] = useState(0);

  const handleTopicsClose = () => {
    setShowTopics(false);
    setPrefsVersion(v => v + 1);
  };

  return (
    <div className="app">
      <MainScreen
        prefsVersion={prefsVersion}
        onOpenTopics={() => setShowTopics(true)}
        onOpenStats={() => setShowStats(true)}
      />

      {showTopics && (
        <TopicModal onClose={handleTopicsClose} />
      )}

      {showStats && (
        <StatsScreen onClose={() => setShowStats(false)} />
      )}

      {/* CRT scanline effect */}
      <div className="scanline" />
    </div>
  );
}
