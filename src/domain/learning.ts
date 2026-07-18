import type {
  AnswerAttemptRow,
  LearningDayRow,
  PracticeResultRow,
  PracticeSessionRow,
  QuestionProgressRow,
  PracticeAnswerSource,
} from '../database/types';
import type { Question } from '../types/question';

export type PracticeAnswerStatus = 'all' | 'unanswered' | 'incorrect' | 'favorite';

export interface LearningDashboard {
  totalQuestions: number;
  studiedQuestions: number;
  unansweredQuestions: number;
  currentlyIncorrectQuestions: number;
  favoriteQuestions: number;
  latestCorrectQuestions: number;
  latestCorrectRate: number;
  todayAnswerCount: number;
  learningStreak: number;
}

export function getPracticeModeForAnswerStatus(
  answerStatus: PracticeAnswerStatus,
): PracticeAnswerSource {
  switch (answerStatus) {
    case 'unanswered':
      return 'review_unanswered';
    case 'incorrect':
      return 'review_incorrect';
    case 'favorite':
      return 'review_favorite';
    default:
      return 'normal_practice';
  }
}

export function getQuestionAnswerStatus(
  progress: QuestionProgressRow | undefined,
): PracticeAnswerStatus {
  if (progress?.favorite) {
    return 'favorite';
  }
  if (progress?.lastIsCorrect === false) {
    return 'incorrect';
  }
  if ((progress?.attemptCount ?? 0) === 0) {
    return 'unanswered';
  }
  return 'all';
}

export function matchesPracticeAnswerStatus(
  progress: QuestionProgressRow | undefined,
  answerStatus: PracticeAnswerStatus,
): boolean {
  switch (answerStatus) {
    case 'unanswered':
      return (progress?.attemptCount ?? 0) === 0;
    case 'incorrect':
      return progress?.lastIsCorrect === false;
    case 'favorite':
      return progress?.favorite === true;
    default:
      return true;
  }
}

export function createEmptyQuestionProgress(code: string, updatedAt: string): QuestionProgressRow {
  return {
    code,
    attemptCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    favorite: false,
    updatedAt,
  };
}

export function applyAnswerToQuestionProgress(
  current: QuestionProgressRow | undefined,
  attempt: Pick<AnswerAttemptRow, 'code' | 'selectedChoice' | 'isCorrect' | 'answeredAt'>,
): QuestionProgressRow {
  const base = current ?? createEmptyQuestionProgress(attempt.code, attempt.answeredAt);

  return {
    ...base,
    attemptCount: base.attemptCount + 1,
    correctCount: base.correctCount + (attempt.isCorrect ? 1 : 0),
    incorrectCount: base.incorrectCount + (attempt.isCorrect ? 0 : 1),
    firstAnsweredAt: base.firstAnsweredAt ?? attempt.answeredAt,
    lastChoice: attempt.selectedChoice,
    lastIsCorrect: attempt.isCorrect,
    lastAnsweredAt: attempt.answeredAt,
    updatedAt: attempt.answeredAt,
  };
}

export function getAsiaTokyoDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function calculateLearningStreak(
  learningDates: Iterable<string>,
  referenceDate: Date = new Date(),
): number {
  const dateSet = new Set(learningDates);
  const today = getAsiaTokyoDate(referenceDate);
  let currentDate = today;

  if (!dateSet.has(today)) {
    currentDate = previousDateKey(today);
    if (!dateSet.has(currentDate)) {
      return 0;
    }
  }

  let streak = 0;
  while (dateSet.has(currentDate)) {
    streak += 1;
    currentDate = previousDateKey(currentDate);
  }

  return streak;
}

export function createLearningDashboard(
  questions: readonly Question[],
  progressByCode: ReadonlyMap<string, QuestionProgressRow>,
  learningDays: readonly LearningDayRow[],
  referenceDate: Date = new Date(),
): LearningDashboard {
  const activeQuestions = questions.filter((question) => question.status === 'active');
  let studiedQuestions = 0;
  let currentlyIncorrectQuestions = 0;
  let favoriteQuestions = 0;
  let latestCorrectQuestions = 0;

  for (const question of activeQuestions) {
    const progress = progressByCode.get(question.code);
    if ((progress?.attemptCount ?? 0) > 0) {
      studiedQuestions += 1;
      if (progress?.lastIsCorrect === true) {
        latestCorrectQuestions += 1;
      }
    }
    if (progress?.lastIsCorrect === false) {
      currentlyIncorrectQuestions += 1;
    }
    if (progress?.favorite) {
      favoriteQuestions += 1;
    }
  }

  const today = getAsiaTokyoDate(referenceDate);
  const todayAnswerCount = learningDays.find((day) => day.date === today)?.answerCount ?? 0;

  return {
    totalQuestions: activeQuestions.length,
    studiedQuestions,
    unansweredQuestions: activeQuestions.length - studiedQuestions,
    currentlyIncorrectQuestions,
    favoriteQuestions,
    latestCorrectQuestions,
    latestCorrectRate:
      studiedQuestions === 0 ? 0 : Math.round((latestCorrectQuestions / studiedQuestions) * 100),
    todayAnswerCount,
    learningStreak: calculateLearningStreak(
      learningDays.filter((day) => day.answerCount > 0).map((day) => day.date),
      referenceDate,
    ),
  };
}

export function createPracticeResult(
  session: PracticeSessionRow,
  completedAt: string,
): PracticeResultRow {
  const confirmedAnswers = Object.entries(session.answers).filter(([, answer]) => answer.confirmed);
  const correct = confirmedAnswers.filter(([, answer]) => answer.isCorrect === true).length;
  const answered = confirmedAnswers.length;
  const total = session.questionCodes.length;
  const elapsedMilliseconds =
    new Date(completedAt).getTime() - new Date(session.createdAt).getTime();

  return {
    id: session.id,
    version: 1,
    sessionId: session.id,
    mode: session.mode ?? getPracticeModeForAnswerStatus(session.filters.answerStatus ?? 'all'),
    startedAt: session.createdAt,
    completedAt,
    filters: {
      ...session.filters,
      categoryIds: [...session.filters.categoryIds],
      answerStatus: session.filters.answerStatus ?? 'all',
    },
    questionCodes: [...session.questionCodes],
    confirmedQuestionCodes: confirmedAnswers.map(([code]) => code),
    total,
    correct,
    incorrect: answered - correct,
    unanswered: total - answered,
    correctRate: total === 0 ? 0 : Math.round((correct / total) * 100),
    elapsedSeconds: Math.max(0, Math.round(elapsedMilliseconds / 1000)),
  };
}

function previousDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return previous.toISOString().slice(0, 10);
}
