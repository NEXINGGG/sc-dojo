import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { database } from './database/database';
import { ensureLearningDataReady } from './features/learning/learningRepository';
import { DisplaySettingsProvider } from './features/settings/DisplaySettingsContext';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  useEffect(() => {
    void ensureLearningDataReady(database).catch(() => {
      // 各画面で利用者に再試行できるエラーを表示する。
    });
  }, []);

  return (
    <DisplaySettingsProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </DisplaySettingsProvider>
  );
}
