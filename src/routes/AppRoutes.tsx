import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';

const HomePage = lazy(() =>
  import('../pages/HomePage').then((module) => ({ default: module.HomePage })),
);
const PracticeSetupPage = lazy(() =>
  import('../pages/PracticeSetupPage').then((module) => ({ default: module.PracticeSetupPage })),
);
const PracticeQuestionPage = lazy(() =>
  import('../pages/PracticeQuestionPage').then((module) => ({
    default: module.PracticeQuestionPage,
  })),
);
const PracticeResultPage = lazy(() =>
  import('../pages/PracticeResultPage').then((module) => ({ default: module.PracticeResultPage })),
);
const QuestionHistoryPage = lazy(() =>
  import('../pages/QuestionHistoryPage').then((module) => ({
    default: module.QuestionHistoryPage,
  })),
);
const ExamSelectionPage = lazy(() =>
  import('../pages/ExamSelectionPage').then((module) => ({ default: module.ExamSelectionPage })),
);
const ExamPage = lazy(() =>
  import('../pages/ExamPage').then((module) => ({ default: module.ExamPage })),
);
const ExamResultPage = lazy(() =>
  import('../pages/ExamResultPage').then((module) => ({ default: module.ExamResultPage })),
);
const ProgressPage = lazy(() =>
  import('../pages/ProgressPage').then((module) => ({ default: module.ProgressPage })),
);
const CategoryProgressPage = lazy(() =>
  import('../pages/CategoryProgressPage').then((module) => ({
    default: module.CategoryProgressPage,
  })),
);
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="practice" element={<PracticeSetupPage />} />
          <Route path="practice/:sessionId/result" element={<PracticeResultPage />} />
          <Route path="practice/:sessionId" element={<PracticeQuestionPage />} />
          <Route path="history/:questionCode" element={<QuestionHistoryPage />} />
          <Route path="exam" element={<ExamSelectionPage />} />
          <Route path="exam/:sessionId/result" element={<ExamResultPage />} />
          <Route path="exam/:sessionId" element={<ExamPage />} />
          <Route path="progress/category/:categoryId" element={<CategoryProgressPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function RouteLoadingFallback() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="surface-card route-loading-card"
      role="status"
    >
      <h1>画面を読み込んでいます</h1>
      <p>少しお待ちください。</p>
    </section>
  );
}
