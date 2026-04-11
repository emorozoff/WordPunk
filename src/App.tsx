import { useState, useCallback } from 'react';
import MainScreen from './components/MainScreen';
import TopicModal from './components/TopicModal';
import StatsScreen from './components/StatsScreen';
import SwearingBlast from './components/SwearingBlast';

export default function App() {
  const [showTopics, setShowTopics] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [prefsVersion, setPrefsVersion] = useState(0);
  const [blastActive, setBlastActive] = useState(false);

  const handleTopicsClose = useCallback(() => {
    setShowTopics(false);
    setPrefsVersion(v => v + 1);
  }, []);

  const handleBlastDone = useCallback(() => setBlastActive(false), []);
  const handleSwearingActivated = useCallback(() => setBlastActive(b => b ? b : true), []);

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
          onSwearingActivated={handleSwearingActivated}
        />
      )}

      {showStats && (
        <StatsScreen onClose={() => setShowStats(false)} />
      )}

      {blastActive && <SwearingBlast onDone={handleBlastDone} />}

      {/* CRT scanline effect */}
      <div className="scanline" />
    </div>
  );
}
