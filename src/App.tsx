import { useState } from 'react';
import MainScreen from './components/MainScreen';
import TopicModal from './components/TopicModal';
import StatsScreen from './components/StatsScreen';
import SwearingBlast from './components/SwearingBlast';

export default function App() {
  const [showTopics, setShowTopics] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [prefsVersion, setPrefsVersion] = useState(0);
  const [blastActive, setBlastActive] = useState(false);

  const handleTopicsClose = () => {
    setShowTopics(false);
    setPrefsVersion(v => v + 1);
  };

  return (
    <div className={`app${blastActive ? ' swearing-blast' : ''}`}>
      <MainScreen
        prefsVersion={prefsVersion}
        onOpenTopics={() => setShowTopics(true)}
        onOpenStats={() => setShowStats(true)}
      />

      {showTopics && (
        <TopicModal
          onClose={handleTopicsClose}
          onSwearingActivated={() => { if (!blastActive) setBlastActive(true); }}
        />
      )}

      {showStats && (
        <StatsScreen onClose={() => setShowStats(false)} />
      )}

      {blastActive && <SwearingBlast onDone={() => setBlastActive(false)} />}

      {/* CRT scanline effect */}
      <div className="scanline" />
    </div>
  );
}
