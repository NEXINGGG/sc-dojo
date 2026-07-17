import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { database } from './database/database';
import { ensureLearningDataReady } from './features/learning/learningRepository';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  useEffect(() => {
    void ensureLearningDataReady(database).catch(() => {
      // 各画面で利用者に再試行できるエラーを表示する。
    });
  }, []);

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
