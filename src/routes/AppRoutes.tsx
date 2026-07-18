import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { CategoryProgressPage } from '../pages/CategoryProgressPage';
import { ExamPage } from '../pages/ExamPage';
import { ExamResultPage } from '../pages/ExamResultPage';
import { ExamSelectionPage } from '../pages/ExamSelectionPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PracticeQuestionPage } from '../pages/PracticeQuestionPage';
import { PracticeResultPage } from '../pages/PracticeResultPage';
import { PracticeSetupPage } from '../pages/PracticeSetupPage';
import { ProgressPage } from '../pages/ProgressPage';
import { QuestionHistoryPage } from '../pages/QuestionHistoryPage';
import { SettingsPage } from '../pages/SettingsPage';

export function AppRoutes() {
  return (
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
  );
}
