import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { initializeOpenAI } from './services/openai';
import { CanvasLayout } from './components/CanvasLayout';
import { Settings } from './components/Settings';

function App() {
  const { activeView, settings } = useStore();

  useEffect(() => {
    if (settings.openaiApiKey) {
      initializeOpenAI(settings.openaiApiKey);
    }
  }, [settings.openaiApiKey]);

  // Settings is rendered separately, everything else goes through CanvasLayout
  if (activeView === 'settings') {
    return <Settings />;
  }

  return <CanvasLayout />;
}

export default App;
