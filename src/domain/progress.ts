import { categories as catalogCategories, domains as catalogDomains } from '../data/catalog';
import type {
  AnswerAttemptRow,
  ExamResultRow,
  ExamType,
  PracticeAnswerSource,
  PracticeResultRow,
  QuestionProgressRow,
} from '../database/types';
import { calculateLearningStreak, getAsiaTokyoDate } from './learning';
import { getSubjectConfig } from './subject';
import {
  difficulties,
  type Category,
  type Difficulty,
  type Domain,
  type Question,
} from '../types/question';

export const analyticsPeriods = ['7d', '30d', '90d', 'all'] as const;
export type AnalyticsPeriod = (typeof analyticsPeriods)[number];

export const historyFilters = [
  'all',
  'normal_practice',
  'review_unanswered',
  'review_incorrect',
  'review_favorite',
  'mock_exam_fixed_1',
  'mock_exam_fixed_2',
  'mock_exam_random',
] as const;
export type LearningHistoryFilter = (typeof historyFilters)[number];

export type CategoryStatus = '判定中' | '得意' | '合格圏' | '要復習';
export type QuestionStatus = '未回答' | '正解' | '誤答';
export type CategoryQuestionFilter = 'all' | 'unanswered' | 'correct' | 'incorrect' | 'favorite';
export type CategoryQuestionSort = 'code' | 'incorrect' | 'unanswered' | 'oldest';

interface ValidAttempt {
  code: string;
  selectedChoice: AnswerAttemptRow['selectedChoice'];
  isCorrect: boolean;
  answeredAt: string;
  answeredAtMilliseconds: number;
  sessionId: string;
  mode: AnswerAttemptRow['mode'];
  order: number;
}

export interface LatestAnswer {
  code: string;
  isCorrect: boolean;
  answeredAt: string;
  answeredAtMilliseconds: number;
}

export interface SegmentStatistics {
  totalQuestions: number;
  studiedQuestions: number;
  unansweredQuestions: number;
  latestCorrectQuestions: number;
  currentlyIncorrectQuestions: number;
  latestCorrectRate?: number;
  progressRate: number;
  totalAnswerCount: number;
  totalCorrectAnswerCount: number;
  totalCorrectRate?: number;
  favoriteQuestions: number;
}

export interface DomainStatistics extends SegmentStatistics {
  id: string;
  name: string;
  order: number;
}

export interface CategoryStatistics extends SegmentStatistics {
  id: string;
  name: string;
  description: string;
  order: number;
  status: CategoryStatus;
}

export interface DifficultyStatistics extends SegmentStatistics {
  difficulty: Difficulty;
}

export interface SubcategoryStatistics extends SegmentStatistics {
  id: string;
  name: string;
}

export interface WeakCategory extends CategoryStatistics {
  recommendation: string;
}

export interface DailyLearningStatistics {
  date: string;
  answerCount: number;
  correctCount: number;
  incorrectCount: number;
  correctRate?: number;
  completedPracticeCount: number;
  examCount: number;
}

export interface ExamTrendPoint {
  id: string;
  examType: ExamType;
  name: string;
  submittedAt: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  passed: boolean;
  elapsedSeconds: number;
}

export interface LearningHistoryItem {
  id: string;
  kind: 'practice' | 'exam';
  filter: LearningHistoryFilter;
  typeLabel: string;
  happenedAt: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  correctRate?: number;
  elapsedSeconds: number;
  conditions: string;
  detailPath: string;
}

export interface QuestionProgressDetail {
  code: string;
  id: string;
  categoryId: string;
  subcategoryId: string;
  subcategory: string;
  difficulty: Difficulty;
  status: QuestionStatus;
  attemptCount: number;
  lastAnsweredAt?: string;
  favorite: boolean;
}

export interface OverallProgress extends SegmentStatistics {
  learningDayCount: number;
  learningStreak: number;
  examAttemptCount: number;
  examHighestScore?: number;
  latestExam?: ExamTrendPoint;
  recentSevenDayAnswerCount: number;
  previousSevenDayAnswerCount?: number;
  recentThirtyDayLearningDays: number;
}

export interface PeriodProgress {
  period: AnalyticsPeriod;
  label: string;
  answerCount: number;
  correctCount: number;
  incorrectCount: number;
  correctRate?: number;
  learningDayCount: number;
}

export interface ProgressAnalytics {
  overall: OverallProgress;
  period: PeriodProgress;
  domains: readonly DomainStatistics[];
  categories: readonly CategoryStatistics[];
  difficulties: readonly DifficultyStatistics[];
  weakCategories: readonly WeakCategory[];
  daily: readonly DailyLearningStatistics[];
  examTrend: readonly ExamTrendPoint[];
  history: readonly LearningHistoryItem[];
  questions: readonly QuestionProgressDetail[];
  latestByCode: ReadonlyMap<string, LatestAnswer>;
}

export interface ProgressAnalyticsInput {
  attempts: readonly AnswerAttemptRow[];
  progressRows: readonly QuestionProgressRow[];
  practiceResults: readonly PracticeResultRow[];
  examResults: readonly ExamResultRow[];
  period: AnalyticsPeriod;
  now?: Date;
}

export function buildProgressAnalytics(
  sourceQuestions: readonly Question[],
  input: ProgressAnalyticsInput,
  sourceCategories: readonly Category[] = catalogCategories,
  sourceDomains: readonly Domain[] = catalogDomains,
): ProgressAnalytics {
  const now = normalizeNow(input.now);
  const examConfig = getSubjectConfig(sourceQuestions[0]?.subjectId ?? 'a1').exam;
  const activeQuestions = sourceQuestions.filter((question) => question.status === 'active');
  const questionByCode = new Map(activeQuestions.map((question) => [question.code, question]));
  const progressByCode = new Map(input.progressRows.map((row) => [row.code, row]));
  const attempts = collectValidAttempts(input.attempts, questionByCode, now);
  const latestByCode = extractLatestAnswers(attempts);
  const questionDetails = createQuestionDetails(
    activeQuestions,
    attempts,
    latestByCode,
    progressByCode,
  );
  const answersForPeriod = filterAttemptsByPeriod(attempts, input.period, now);
  const overallBase = createSegmentStatistics(
    activeQuestions,
    attempts,
    latestByCode,
    progressByCode,
  );
  const examTrend = normalizeExamResults(input.examResults, questionByCode, now, examConfig)
    .filter((result) => isInPeriod(result.submittedAt, input.period, now))
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
  const allExamTrend = normalizeExamResults(input.examResults, questionByCode, now, examConfig);
  const history = createLearningHistory(
    input.practiceResults,
    allExamTrend,
    attempts,
    questionByCode,
    input.period,
    now,
    examConfig,
  );
  const learningDates = new Set(
    attempts.map((attempt) => getAsiaTokyoDate(new Date(attempt.answeredAt))),
  );
  const recentSeven = filterAttemptsByPeriod(attempts, '7d', now);
  const previousSeven = attempts.filter((attempt) =>
    isInPreviousSevenDays(attempt.answeredAt, now),
  );
  const recentThirty = filterAttemptsByPeriod(attempts, '30d', now);

  const overall: OverallProgress = {
    ...overallBase,
    learningDayCount: learningDates.size,
    learningStreak: calculateLearningStreak(learningDates, now),
    examAttemptCount: allExamTrend.length,
    examHighestScore:
      allExamTrend.length === 0 ? undefined : Math.max(...allExamTrend.map((exam) => exam.score)),
    latestExam: [...allExamTrend].sort((left, right) =>
      right.submittedAt.localeCompare(left.submittedAt),
    )[0],
    recentSevenDayAnswerCount: recentSeven.length,
    previousSevenDayAnswerCount: previousSeven.length === 0 ? undefined : previousSeven.length,
    recentThirtyDayLearningDays: new Set(
      recentThirty.map((attempt) => getAsiaTokyoDate(new Date(attempt.answeredAt))),
    ).size,
  };

  const domains = sourceDomains
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((domain) => ({
      id: domain.id,
      name: domain.name,
      order: domain.order,
      ...createSegmentStatistics(
        activeQuestions.filter((question) => question.domainId === domain.id),
        attempts,
        latestByCode,
        progressByCode,
      ),
    }));

  const categories = sourceCategories
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((category) => {
      const statistics = createSegmentStatistics(
        activeQuestions.filter((question) => question.categoryId === category.id),
        attempts,
        latestByCode,
        progressByCode,
      );
      return {
        id: category.id,
        name: category.name,
        description: category.description,
        order: category.order,
        ...statistics,
        status: getCategoryStatus(statistics),
      };
    });

  const difficultyStats = difficulties.map((difficulty) => ({
    difficulty,
    ...createSegmentStatistics(
      activeQuestions.filter((question) => question.difficulty === difficulty),
      attempts,
      latestByCode,
      progressByCode,
    ),
  }));

  return {
    overall,
    period: createPeriodProgress(input.period, answersForPeriod),
    domains,
    categories,
    difficulties: difficultyStats,
    weakCategories: findWeakCategories(categories),
    daily: createDailyStatistics(answersForPeriod, history, input.period, now),
    examTrend,
    history,
    questions: questionDetails,
    latestByCode,
  };
}

export function getCategoryStatus(
  statistics: Pick<CategoryStatistics, 'studiedQuestions' | 'latestCorrectRate'>,
): CategoryStatus {
  if (statistics.studiedQuestions < 3 || statistics.latestCorrectRate === undefined) {
    return '判定中';
  }
  if (statistics.latestCorrectRate >= 80) {
    return '得意';
  }
  if (statistics.latestCorrectRate >= 60) {
    return '合格圏';
  }
  return '要復習';
}

export function findWeakCategories(
  categories: readonly CategoryStatistics[],
  maximum = 3,
): readonly WeakCategory[] {
  return categories
    .filter(
      (category) => category.studiedQuestions >= 3 && category.latestCorrectRate !== undefined,
    )
    .slice()
    .sort(compareWeakCategories)
    .slice(0, maximum)
    .map((category) => ({
      ...category,
      recommendation: createWeakCategoryRecommendation(category),
    }));
}

export function createWeakCategoryRecommendation(category: CategoryStatistics): string {
  if (category.currentlyIncorrectQuestions > 0) {
    return `まず誤答${category.currentlyIncorrectQuestions}問を復習しましょう`;
  }
  if (category.unansweredQuestions > 0) {
    return `未回答が${category.unansweredQuestions}問です。10問演習がおすすめです`;
  }
  const requiredCorrect = Math.ceil((category.studiedQuestions * 60) / 100);
  const remaining = Math.max(1, requiredCorrect - category.latestCorrectQuestions);
  return `合格圏まであと${remaining}問です。もう一度確認しましょう`;
}

export function getCategorySubcategories(
  analytics: ProgressAnalytics,
  categoryId: string,
): readonly SubcategoryStatistics[] {
  const categoryQuestions = analytics.questions.filter(
    (question) => question.categoryId === categoryId,
  );
  const groups = new Map<string, QuestionProgressDetail[]>();
  for (const question of categoryQuestions) {
    const name = question.subcategory.trim() === '' ? 'その他' : question.subcategory;
    const id =
      question.subcategoryId.trim() === '' ? `other-${categoryId}` : question.subcategoryId;
    const existing = groups.get(`${id}::${name}`) ?? [];
    existing.push(question);
    groups.set(`${id}::${name}`, existing);
  }

  return [...groups.entries()]
    .map(([key, questions]) => {
      const [id, name] = key.split('::');
      return {
        id,
        name,
        ...createSegmentStatisticsFromDetails(questions),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'ja'));
}

export function filterAndSortCategoryQuestions(
  source: readonly QuestionProgressDetail[],
  filter: CategoryQuestionFilter,
  sort: CategoryQuestionSort,
): readonly QuestionProgressDetail[] {
  return source
    .filter((question) => {
      switch (filter) {
        case 'unanswered':
          return question.status === '未回答';
        case 'correct':
          return question.status === '正解';
        case 'incorrect':
          return question.status === '誤答';
        case 'favorite':
          return question.favorite;
        default:
          return true;
      }
    })
    .slice()
    .sort((left, right) => {
      switch (sort) {
        case 'incorrect':
          return (
            statusWeight(left.status) - statusWeight(right.status) ||
            left.code.localeCompare(right.code)
          );
        case 'unanswered':
          return (
            unansweredWeight(left.status) - unansweredWeight(right.status) ||
            left.code.localeCompare(right.code)
          );
        case 'oldest':
          return (
            (left.lastAnsweredAt ?? '').localeCompare(right.lastAnsweredAt ?? '') ||
            left.code.localeCompare(right.code)
          );
        default:
          return left.code.localeCompare(right.code);
      }
    });
}

export function filterLearningHistory(
  history: readonly LearningHistoryItem[],
  filter: LearningHistoryFilter,
): readonly LearningHistoryItem[] {
  return filter === 'all' ? history : history.filter((item) => item.filter === filter);
}

export function getAnalyticsPeriodLabel(period: AnalyticsPeriod): string {
  switch (period) {
    case '7d':
      return '直近7日';
    case '30d':
      return '直近30日';
    case '90d':
      return '直近90日';
    default:
      return '全期間';
  }
}

function collectValidAttempts(
  source: readonly AnswerAttemptRow[],
  questionByCode: ReadonlyMap<string, Question>,
  now: Date,
): readonly ValidAttempt[] {
  const nowMilliseconds = now.getTime();
  const attempts: ValidAttempt[] = [];

  source.forEach((attempt, order) => {
    const question = questionByCode.get(attempt.code);
    const answeredAtMilliseconds = parseDateMilliseconds(attempt.answeredAt);
    if (
      question === undefined ||
      answeredAtMilliseconds === undefined ||
      answeredAtMilliseconds > nowMilliseconds ||
      !question.choices.some((choice) => choice.id === attempt.selectedChoice)
    ) {
      return;
    }

    attempts.push({
      code: question.code,
      selectedChoice: attempt.selectedChoice,
      isCorrect: attempt.selectedChoice === question.correctChoice,
      answeredAt: attempt.answeredAt,
      answeredAtMilliseconds,
      sessionId: attempt.sessionId,
      mode: attempt.mode,
      order,
    });
  });

  return attempts;
}

function extractLatestAnswers(
  attempts: readonly ValidAttempt[],
): ReadonlyMap<string, LatestAnswer> {
  const latest = new Map<string, LatestAnswer & { order: number }>();

  for (const attempt of attempts) {
    const current = latest.get(attempt.code);
    if (
      current === undefined ||
      attempt.answeredAtMilliseconds > current.answeredAtMilliseconds ||
      (attempt.answeredAtMilliseconds === current.answeredAtMilliseconds &&
        attempt.order > current.order)
    ) {
      latest.set(attempt.code, {
        code: attempt.code,
        isCorrect: attempt.isCorrect,
        answeredAt: attempt.answeredAt,
        answeredAtMilliseconds: attempt.answeredAtMilliseconds,
        order: attempt.order,
      });
    }
  }

  return new Map(
    [...latest.entries()].map(([code, answer]) => [
      code,
      {
        code: answer.code,
        isCorrect: answer.isCorrect,
        answeredAt: answer.answeredAt,
        answeredAtMilliseconds: answer.answeredAtMilliseconds,
      },
    ]),
  );
}

function createQuestionDetails(
  source: readonly Question[],
  attempts: readonly ValidAttempt[],
  latestByCode: ReadonlyMap<string, LatestAnswer>,
  progressByCode: ReadonlyMap<string, QuestionProgressRow>,
): readonly QuestionProgressDetail[] {
  const attemptsByCode = countAttemptsByCode(attempts);
  return source.map((question) => {
    const latest = latestByCode.get(question.code);
    return {
      code: question.code,
      id: question.id,
      categoryId: question.categoryId,
      subcategoryId: question.subcategoryId,
      subcategory: question.subcategory,
      difficulty: question.difficulty,
      status: latest === undefined ? '未回答' : latest.isCorrect ? '正解' : '誤答',
      attemptCount: attemptsByCode.get(question.code) ?? 0,
      lastAnsweredAt: latest?.answeredAt,
      favorite: progressByCode.get(question.code)?.favorite === true,
    };
  });
}

function createSegmentStatistics(
  source: readonly Question[],
  attempts: readonly ValidAttempt[],
  latestByCode: ReadonlyMap<string, LatestAnswer>,
  progressByCode: ReadonlyMap<string, QuestionProgressRow>,
): SegmentStatistics {
  const codes = new Set(source.map((question) => question.code));
  const matchingAttempts = attempts.filter((attempt) => codes.has(attempt.code));
  const studiedQuestions = source.filter((question) => latestByCode.has(question.code));
  const latestCorrectQuestions = studiedQuestions.filter(
    (question) => latestByCode.get(question.code)?.isCorrect === true,
  ).length;
  const currentlyIncorrectQuestions = studiedQuestions.length - latestCorrectQuestions;
  const totalCorrectAnswerCount = matchingAttempts.filter((attempt) => attempt.isCorrect).length;

  return {
    totalQuestions: source.length,
    studiedQuestions: studiedQuestions.length,
    unansweredQuestions: source.length - studiedQuestions.length,
    latestCorrectQuestions,
    currentlyIncorrectQuestions,
    latestCorrectRate: rate(latestCorrectQuestions, studiedQuestions.length),
    progressRate:
      source.length === 0 ? 0 : Math.round((studiedQuestions.length / source.length) * 100),
    totalAnswerCount: matchingAttempts.length,
    totalCorrectAnswerCount,
    totalCorrectRate: rate(totalCorrectAnswerCount, matchingAttempts.length),
    favoriteQuestions: source.filter((question) => progressByCode.get(question.code)?.favorite)
      .length,
  };
}

function createSegmentStatisticsFromDetails(
  details: readonly QuestionProgressDetail[],
): SegmentStatistics {
  const studied = details.filter((detail) => detail.status !== '未回答');
  const correct = studied.filter((detail) => detail.status === '正解').length;
  const totalAnswerCount = details.reduce((total, detail) => total + detail.attemptCount, 0);

  // 小分類は軽量な一覧なので、全回答の正解数を保存しない。最新状態は正確に表示する。
  return {
    totalQuestions: details.length,
    studiedQuestions: studied.length,
    unansweredQuestions: details.length - studied.length,
    latestCorrectQuestions: correct,
    currentlyIncorrectQuestions: studied.length - correct,
    latestCorrectRate: rate(correct, studied.length),
    progressRate: details.length === 0 ? 0 : Math.round((studied.length / details.length) * 100),
    totalAnswerCount,
    totalCorrectAnswerCount: 0,
    totalCorrectRate: undefined,
    favoriteQuestions: details.filter((detail) => detail.favorite).length,
  };
}

function createPeriodProgress(
  period: AnalyticsPeriod,
  attempts: readonly ValidAttempt[],
): PeriodProgress {
  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
  return {
    period,
    label: getAnalyticsPeriodLabel(period),
    answerCount: attempts.length,
    correctCount,
    incorrectCount: attempts.length - correctCount,
    correctRate: rate(correctCount, attempts.length),
    learningDayCount: new Set(
      attempts.map((attempt) => getAsiaTokyoDate(new Date(attempt.answeredAt))),
    ).size,
  };
}

function normalizeExamResults(
  source: readonly ExamResultRow[],
  questionByCode: ReadonlyMap<string, Question>,
  now: Date,
  examConfig: ReturnType<typeof getSubjectConfig>['exam'],
): readonly ExamTrendPoint[] {
  const unique = new Set<string>();
  const normalized: ExamTrendPoint[] = [];

  for (const result of source) {
    const submittedAtMilliseconds = parseDateMilliseconds(result.submittedAt);
    if (
      unique.has(result.id) ||
      submittedAtMilliseconds === undefined ||
      submittedAtMilliseconds > now.getTime() ||
      !isExamType(result.examType) ||
      result.questionCodes.length !== examConfig.questionCount ||
      new Set(result.questionCodes).size !== examConfig.questionCount ||
      result.questionCodes.some((code) => !questionByCode.has(code))
    ) {
      continue;
    }
    unique.add(result.id);

    const answered = result.questionCodes.flatMap((code) => {
      const selectedChoice = result.questionResults[code]?.selectedChoice;
      const question = questionByCode.get(code);
      if (
        selectedChoice === undefined ||
        question === undefined ||
        !question.choices.some((choice) => choice.id === selectedChoice)
      ) {
        return [];
      }
      return [{ code, isCorrect: selectedChoice === question.correctChoice }];
    });
    const correct = answered.filter((answer) => answer.isCorrect).length;
    const total = result.questionCodes.length;
    const incorrect = answered.length - correct;
    const unanswered = total - answered.length;

    normalized.push({
      id: result.id,
      examType: result.examType,
      name: getExamTypeName(result.examType),
      submittedAt: result.submittedAt,
      total,
      correct,
      incorrect,
      unanswered,
      score: Math.round((correct / total) * 100),
      passed: correct >= examConfig.passingCorrectCount,
      elapsedSeconds: Math.max(0, Math.round(result.elapsedSeconds)),
    });
  }

  return normalized;
}

function createLearningHistory(
  practiceResults: readonly PracticeResultRow[],
  examResults: readonly ExamTrendPoint[],
  attempts: readonly ValidAttempt[],
  questionByCode: ReadonlyMap<string, Question>,
  period: AnalyticsPeriod,
  now: Date,
  examConfig: ReturnType<typeof getSubjectConfig>['exam'],
): readonly LearningHistoryItem[] {
  const practice = normalizePracticeResults(practiceResults, attempts, questionByCode, now).filter(
    (item) => isInPeriod(item.happenedAt, period, now),
  );
  const exams = examResults
    .filter((item) => isInPeriod(item.submittedAt, period, now))
    .map<LearningHistoryItem>((exam) => ({
      id: exam.id,
      kind: 'exam',
      filter: getExamHistoryFilter(exam.examType),
      typeLabel: exam.name,
      happenedAt: exam.submittedAt,
      total: exam.total,
      correct: exam.correct,
      incorrect: exam.incorrect,
      unanswered: exam.unanswered,
      correctRate: rate(exam.correct, exam.total),
      elapsedSeconds: exam.elapsedSeconds,
      conditions: `${examConfig.questionCount}問・${examConfig.durationSeconds / 60}分`,
      detailPath: `/exam/${exam.id}/result`,
    }));

  return [...practice, ...exams].sort((left, right) =>
    right.happenedAt.localeCompare(left.happenedAt),
  );
}

function normalizePracticeResults(
  source: readonly PracticeResultRow[],
  attempts: readonly ValidAttempt[],
  questionByCode: ReadonlyMap<string, Question>,
  now: Date,
): readonly LearningHistoryItem[] {
  const unique = new Set<string>();
  const attemptsBySession = new Map<string, ValidAttempt[]>();
  for (const attempt of attempts) {
    const sessionAttempts = attemptsBySession.get(attempt.sessionId) ?? [];
    sessionAttempts.push(attempt);
    attemptsBySession.set(attempt.sessionId, sessionAttempts);
  }

  const results: LearningHistoryItem[] = [];
  for (const result of source) {
    const completedAtMilliseconds = parseDateMilliseconds(result.completedAt);
    const codes = result.questionCodes.filter((code) => questionByCode.has(code));
    if (
      unique.has(result.id) ||
      completedAtMilliseconds === undefined ||
      completedAtMilliseconds > now.getTime() ||
      codes.length === 0 ||
      new Set(codes).size !== codes.length ||
      !isPracticeSource(result.mode)
    ) {
      continue;
    }
    unique.add(result.id);
    const codeSet = new Set(codes);
    const sessionAttempts = (attemptsBySession.get(result.sessionId) ?? []).filter((attempt) =>
      codeSet.has(attempt.code),
    );
    const correct = sessionAttempts.filter((attempt) => attempt.isCorrect).length;
    const incorrect = sessionAttempts.length - correct;
    const total = codes.length;
    results.push({
      id: result.id,
      kind: 'practice',
      filter: result.mode,
      typeLabel: getPracticeSourceName(result.mode),
      happenedAt: result.completedAt,
      total,
      correct,
      incorrect,
      unanswered: total - sessionAttempts.length,
      correctRate: rate(correct, total),
      elapsedSeconds: Math.max(0, Math.round(result.elapsedSeconds)),
      conditions: describePracticeConditions(result),
      detailPath: `/practice/${result.sessionId}/result`,
    });
  }
  return results;
}

function createDailyStatistics(
  attempts: readonly ValidAttempt[],
  history: readonly LearningHistoryItem[],
  period: AnalyticsPeriod,
  now: Date,
): readonly DailyLearningStatistics[] {
  const dates = getDatesForPeriod(period, attempts, now);
  const attemptsByDate = new Map<string, ValidAttempt[]>();
  for (const attempt of attempts) {
    const date = getAsiaTokyoDate(new Date(attempt.answeredAt));
    const values = attemptsByDate.get(date) ?? [];
    values.push(attempt);
    attemptsByDate.set(date, values);
  }
  const historyByDate = new Map<string, LearningHistoryItem[]>();
  for (const item of history) {
    const date = getAsiaTokyoDate(new Date(item.happenedAt));
    const values = historyByDate.get(date) ?? [];
    values.push(item);
    historyByDate.set(date, values);
  }

  return dates.map((date) => {
    const dailyAttempts = attemptsByDate.get(date) ?? [];
    const correctCount = dailyAttempts.filter((attempt) => attempt.isCorrect).length;
    const dailyHistory = historyByDate.get(date) ?? [];
    return {
      date,
      answerCount: dailyAttempts.length,
      correctCount,
      incorrectCount: dailyAttempts.length - correctCount,
      correctRate: rate(correctCount, dailyAttempts.length),
      completedPracticeCount: dailyHistory.filter((item) => item.kind === 'practice').length,
      examCount: dailyHistory.filter((item) => item.kind === 'exam').length,
    };
  });
}

function filterAttemptsByPeriod(
  attempts: readonly ValidAttempt[],
  period: AnalyticsPeriod,
  now: Date,
): readonly ValidAttempt[] {
  return attempts.filter((attempt) => isInPeriod(attempt.answeredAt, period, now));
}

function isInPeriod(value: string, period: AnalyticsPeriod, now: Date): boolean {
  const milliseconds = parseDateMilliseconds(value);
  if (milliseconds === undefined || milliseconds > now.getTime()) {
    return false;
  }
  if (period === 'all') {
    return true;
  }
  const date = getAsiaTokyoDate(new Date(milliseconds));
  return date >= getPeriodStartDate(period, now) && date <= getAsiaTokyoDate(now);
}

function isInPreviousSevenDays(value: string, now: Date): boolean {
  const milliseconds = parseDateMilliseconds(value);
  if (milliseconds === undefined || milliseconds > now.getTime()) {
    return false;
  }
  const date = getAsiaTokyoDate(new Date(milliseconds));
  const today = getAsiaTokyoDate(now);
  return date >= shiftDateKey(today, -13) && date < shiftDateKey(today, -6);
}

function getDatesForPeriod(
  period: AnalyticsPeriod,
  attempts: readonly ValidAttempt[],
  now: Date,
): readonly string[] {
  const today = getAsiaTokyoDate(now);
  const first =
    period === 'all'
      ? (attempts.map((attempt) => getAsiaTokyoDate(new Date(attempt.answeredAt))).sort()[0] ??
        today)
      : getPeriodStartDate(period, now);
  const dates: string[] = [];
  for (let date = first; date <= today; date = shiftDateKey(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function getPeriodStartDate(period: Exclude<AnalyticsPeriod, 'all'>, now: Date): string {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return shiftDateKey(getAsiaTokyoDate(now), -(days - 1));
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function compareWeakCategories(left: CategoryStatistics, right: CategoryStatistics): number {
  return (
    (left.latestCorrectRate ?? Number.POSITIVE_INFINITY) -
      (right.latestCorrectRate ?? Number.POSITIVE_INFINITY) ||
    right.currentlyIncorrectQuestions - left.currentlyIncorrectQuestions ||
    right.unansweredQuestions - left.unansweredQuestions ||
    left.order - right.order
  );
}

function countAttemptsByCode(attempts: readonly ValidAttempt[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    counts.set(attempt.code, (counts.get(attempt.code) ?? 0) + 1);
  }
  return counts;
}

function rate(correct: number, total: number): number | undefined {
  return total === 0 ? undefined : Math.round((correct / total) * 100);
}

function normalizeNow(value: Date | undefined): Date {
  const candidate = value ?? new Date();
  return Number.isFinite(candidate.getTime()) ? candidate : new Date(0);
}

function parseDateMilliseconds(value: string): number | undefined {
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : undefined;
}

function isExamType(value: unknown): value is ExamType {
  return value === 'fixed_1' || value === 'fixed_2' || value === 'random';
}

function isPracticeSource(value: unknown): value is PracticeAnswerSource {
  return (
    value === 'normal_practice' ||
    value === 'review_unanswered' ||
    value === 'review_incorrect' ||
    value === 'review_favorite'
  );
}

function getExamHistoryFilter(examType: ExamType): LearningHistoryFilter {
  switch (examType) {
    case 'fixed_1':
      return 'mock_exam_fixed_1';
    case 'fixed_2':
      return 'mock_exam_fixed_2';
    default:
      return 'mock_exam_random';
  }
}

function getExamTypeName(examType: ExamType): string {
  switch (examType) {
    case 'fixed_1':
      return '固定模試1';
    case 'fixed_2':
      return '固定模試2';
    default:
      return 'ランダム模試';
  }
}

function getPracticeSourceName(source: PracticeAnswerSource): string {
  switch (source) {
    case 'review_unanswered':
      return '未回答演習';
    case 'review_incorrect':
      return '誤答演習';
    case 'review_favorite':
      return 'お気に入り演習';
    default:
      return '通常演習';
  }
}

function describePracticeConditions(result: PracticeResultRow): string {
  const parts: string[] = [];
  if (result.filters.categoryIds.length > 0) {
    parts.push(`カテゴリ${result.filters.categoryIds.length}件`);
  }
  if (result.filters.difficulty !== 'all') {
    parts.push(`難易度: ${result.filters.difficulty}`);
  }
  if (result.filters.answerStatus !== 'all') {
    parts.push(getPracticeSourceName(result.mode));
  }
  return parts.length === 0 ? '全問を対象' : parts.join('・');
}

function statusWeight(status: QuestionStatus): number {
  return status === '誤答' ? 0 : status === '未回答' ? 1 : 2;
}

function unansweredWeight(status: QuestionStatus): number {
  return status === '未回答' ? 0 : status === '誤答' ? 1 : 2;
}
