import { useState, useCallback } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import MainScreen from './components/MainScreen';
import TopicModal from './components/TopicModal';
import StatsScreen from './components/StatsScreen';
import SettingsScreen from './components/SettingsScreen';
import AddWordModal from './components/AddWordModal';
import SkillTree from './components/SkillTree';
import SwearingBlast from './components/SwearingBlast';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [prefsVersion, setPrefsVersion] = useState(0);
  const [blastActive, setBlastActive] = useState(false);

  const handleTopicsClose = useCallback(() => {
    setShowTopics(false);
    setPrefsVersion(v => v + 1);
  }, []);

  const handleAddWordAdded = useCallback(() => {
    setPrefsVersion(v => v + 1);
  }, []);

  const handleProgressReset = useCallback(() => {
    setPrefsVersion(v => v + 1);
  }, []);

  const handleBlastDone = useCallback(() => setBlastActive(false), []);
  const handleSwearingActivated = useCallback(() => setBlastActive(b => b ? b : true), []);

  return (
    <ThemeProvider>
      <div className={`app${blastActive ? ' swearing-blast' : ''}`}>
        <MainScreen
          prefsVersion={prefsVersion}
          onOpenSettings={() => setShowSettings(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenSkillTree={() => setShowSkillTree(true)}
        />

        {showSettings && (
          <SettingsScreen
            onClose={() => setShowSettings(false)}
            onOpenTopics={() => setShowTopics(true)}
            onOpenAddWord={() => setShowAddWord(true)}
            onProgressReset={handleProgressReset}
          />
        )}

        {showTopics && (
          <TopicModal
            onClose={handleTopicsClose}
            onSwearingActivated={handleSwearingActivated}
          />
        )}

        {showStats && (
          <StatsScreen onClose={() => setShowStats(false)} />
        )}

        {showAddWord && (
          <AddWordModal
            onClose={() => setShowAddWord(false)}
            onAdded={handleAddWordAdded}
          />
        )}

        {showSkillTree && (
          <SkillTree onClose={() => setShowSkillTree(false)} />
        )}

        {blastActive && <SwearingBlast onDone={handleBlastDone} />}
      </div>
    </ThemeProvider>
  );
}
