import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { useSubject } from '../features/subjects/SubjectContext';

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
const B1HomePage = lazy(() =>
  import('../pages/B1HomePage').then((module) => ({ default: module.B1HomePage })),
);
const B1PracticePage = lazy(() =>
  import('../pages/B1PracticePage').then((module) => ({ default: module.B1PracticePage })),
);
const B1MockSelectionPage = lazy(() =>
  import('../pages/B1MockSelectionPage').then((module) => ({
    default: module.B1MockSelectionPage,
  })),
);
const B1PracticeSessionPage = lazy(() =>
  import('../pages/B1SessionPage').then((module) => ({ default: module.B1PracticeSessionPage })),
);
const B1MockSessionPage = lazy(() =>
  import('../pages/B1SessionPage').then((module) => ({ default: module.B1MockSessionPage })),
);
const B1ProgressPage = lazy(() =>
  import('../pages/B1ProgressPage').then((module) => ({ default: module.B1ProgressPage })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<SubjectHomeRoute />} />
          <Route path="practice" element={<SubjectPracticeRoute />} />
          <Route path="practice/:sessionId/result" element={<PracticeResultPage />} />
          <Route path="practice/:sessionId" element={<PracticeQuestionPage />} />
          <Route path="history/:questionCode" element={<QuestionHistoryPage />} />
          <Route path="exam" element={<SubjectExamRoute />} />
          <Route path="exam/:sessionId/result" element={<ExamResultPage />} />
          <Route path="exam/:sessionId" element={<ExamPage />} />
          <Route path="progress/category/:categoryId" element={<CategoryProgressPage />} />
          <Route path="progress" element={<SubjectProgressRoute />} />
          <Route path="b1/practice/:sessionId" element={<B1PracticeSessionPage />} />
          <Route path="b1/mock/:sessionId" element={<B1MockSessionPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function SubjectHomeRoute() {
  return useSubject().subjectId === 'b1' ? <B1HomePage /> : <HomePage />;
}

function SubjectPracticeRoute() {
  return useSubject().subjectId === 'b1' ? <B1PracticePage /> : <PracticeSetupPage />;
}

function SubjectExamRoute() {
  return useSubject().subjectId === 'b1' ? <B1MockSelectionPage /> : <ExamSelectionPage />;
}

function SubjectProgressRoute() {
  return useSubject().subjectId === 'b1' ? <B1ProgressPage /> : <ProgressPage />;
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
