import { describe, expect, it } from 'vitest';
import { categories, domains, questions } from '../data/catalog';
import type { AnswerAttemptRow, ExamResultRow, PracticeResultRow } from '../database/types';
import {
  buildProgressAnalytics,
  filterAndSortCategoryQuestions,
  findWeakCategories,
  getCategorySubcategories,
  getCategoryStatus,
} from './progress';

const now = new Date('2026-03-01T03:00:00.000Z');

function incorrectChoice(code: string): 'A' | 'B' | 'C' | 'D' {
  const question = questions.find((item) => item.code === code);
  if (question === undefined) {
    throw new Error('テスト問題が見つかりません。');
  }
  return question.correctChoice === 'A' ? 'B' : 'A';
}

function createAttempt(
  code: string,
  selectedChoice: 'A' | 'B' | 'C' | 'D',
  answeredAt: string,
  sessionId = `session-${code}`,
): AnswerAttemptRow {
  const question = questions.find((item) => item.code === code);
  if (question === undefined) {
    throw new Error('テスト問題が見つかりません。');
  }
  return {
    code,
    selectedChoice,
    correctChoice: question.correctChoice,
    isCorrect: selectedChoice === question.correctChoice,
    answeredAt,
    mode: 'normal_practice',
    sessionId,
    version: 1,
  };
}

function analyticsFor(attempts: readonly AnswerAttemptRow[]) {
  return buildProgressAnalytics(questions, {
    attempts,
    progressRows: [],
    practiceResults: [],
    examResults: [],
    period: 'all',
    now,
  });
}

describe('成績集計', () => {
  it('最新状態と全回答実績を分け、存在しない問題IDと未来日時を除外する', () => {
    const [first, second] = questions;
    const analytics = analyticsFor([
      createAttempt(first.code, incorrectChoice(first.code), '2026-02-27T00:00:00.000Z'),
      createAttempt(first.code, first.correctChoice, '2026-02-28T00:00:00.000Z'),
      createAttempt(second.code, incorrectChoice(second.code), '2026-02-28T01:00:00.000Z'),
      {
        code: 'A1-999',
        selectedChoice: 'A',
        correctChoice: 'A',
        isCorrect: true,
        answeredAt: '2026-02-28T02:00:00.000Z',
        mode: 'normal_practice',
        sessionId: 'missing-question',
        version: 1,
      },
      createAttempt(first.code, first.correctChoice, '2030-01-01T00:00:00.000Z'),
    ]);

    expect(analytics.overall.studiedQuestions).toBe(2);
    expect(analytics.overall.unansweredQuestions).toBe(238);
    expect(analytics.overall.latestCorrectQuestions).toBe(1);
    expect(analytics.overall.currentlyIncorrectQuestions).toBe(1);
    expect(analytics.overall.latestCorrectRate).toBe(50);
    expect(analytics.overall.totalAnswerCount).toBe(3);
    expect(analytics.overall.totalCorrectRate).toBe(33);
  });

  it('問題ごとのdomain_idを系統集計の正本として使用する', () => {
    const lawQuestions = questions.filter(
      (question) => question.categoryId === 'law_standards_emerging',
    );
    expect(lawQuestions.some((question) => question.domainId === 'technology')).toBe(true);
    expect(lawQuestions.some((question) => question.domainId === 'strategy')).toBe(true);

    const analytics = analyticsFor([]);
    const technology = analytics.domains.find((domain) => domain.id === 'technology');
    const strategy = analytics.domains.find((domain) => domain.id === 'strategy');

    expect(technology?.totalQuestions).toBe(
      questions.filter((question) => question.domainId === 'technology').length,
    );
    expect(strategy?.totalQuestions).toBe(
      questions.filter((question) => question.domainId === 'strategy').length,
    );
  });

  it('カテゴリ状態を回答済み数と最新正答率で判定する', () => {
    const categoryQuestionGroups = categories
      .slice(0, 4)
      .map((category) =>
        questions.filter((question) => question.categoryId === category.id).slice(0, 3),
      );
    const attempts = [
      ...categoryQuestionGroups[0].map((question, index) =>
        createAttempt(question.code, question.correctChoice, `2026-02-2${index}T00:00:00.000Z`),
      ),
      ...categoryQuestionGroups[1].map((question, index) =>
        createAttempt(
          question.code,
          index === 2 ? incorrectChoice(question.code) : question.correctChoice,
          `2026-02-2${index}T01:00:00.000Z`,
        ),
      ),
      ...categoryQuestionGroups[2].map((question, index) =>
        createAttempt(
          question.code,
          index === 0 ? question.correctChoice : incorrectChoice(question.code),
          `2026-02-2${index}T02:00:00.000Z`,
        ),
      ),
      ...categoryQuestionGroups[3]
        .slice(0, 2)
        .map((question, index) =>
          createAttempt(question.code, question.correctChoice, `2026-02-2${index}T03:00:00.000Z`),
        ),
    ];
    const analytics = analyticsFor(attempts);

    expect(analytics.categories[0].status).toBe('得意');
    expect(analytics.categories[1].status).toBe('合格圏');
    expect(analytics.categories[2].status).toBe('要復習');
    expect(analytics.categories[3].status).toBe('判定中');
    expect(getCategoryStatus({ studiedQuestions: 0, latestCorrectRate: undefined })).toBe('判定中');
  });

  it('苦手カテゴリを正答率、誤答数、未回答数、表示順で並べる', () => {
    const weak = findWeakCategories([
      {
        id: 'a',
        name: 'A',
        description: '',
        order: 2,
        status: '要復習',
        totalQuestions: 8,
        studiedQuestions: 3,
        unansweredQuestions: 5,
        latestCorrectQuestions: 1,
        currentlyIncorrectQuestions: 2,
        latestCorrectRate: 33,
        progressRate: 38,
        totalAnswerCount: 3,
        totalCorrectAnswerCount: 1,
        totalCorrectRate: 33,
        favoriteQuestions: 0,
      },
      {
        id: 'b',
        name: 'B',
        description: '',
        order: 1,
        status: '要復習',
        totalQuestions: 9,
        studiedQuestions: 3,
        unansweredQuestions: 6,
        latestCorrectQuestions: 1,
        currentlyIncorrectQuestions: 2,
        latestCorrectRate: 33,
        progressRate: 33,
        totalAnswerCount: 3,
        totalCorrectAnswerCount: 1,
        totalCorrectRate: 33,
        favoriteQuestions: 0,
      },
      {
        id: 'c',
        name: 'C',
        description: '',
        order: 3,
        status: '判定中',
        totalQuestions: 3,
        studiedQuestions: 2,
        unansweredQuestions: 1,
        latestCorrectQuestions: 0,
        currentlyIncorrectQuestions: 2,
        latestCorrectRate: 0,
        progressRate: 67,
        totalAnswerCount: 2,
        totalCorrectAnswerCount: 0,
        totalCorrectRate: 0,
        favoriteQuestions: 0,
      },
    ]);

    expect(weak.map((category) => category.id)).toEqual(['b', 'a']);
    expect(weak[0].recommendation).toBe('まず誤答2問を復習しましょう');
  });

  it('期間を日本時間の日付で処理し、回答がない日も日別推移に含める', () => {
    const [first] = questions;
    const analytics = buildProgressAnalytics(questions, {
      attempts: [
        createAttempt(first.code, first.correctChoice, '2026-02-22T14:59:00.000Z'),
        createAttempt(first.code, incorrectChoice(first.code), '2026-02-22T15:00:00.000Z'),
      ],
      progressRows: [],
      practiceResults: [],
      examResults: [],
      period: '7d',
      now: new Date('2026-03-01T03:00:00.000Z'),
    });

    expect(analytics.period.answerCount).toBe(1);
    expect(analytics.daily).toHaveLength(7);
    expect(analytics.daily[0].date).toBe('2026-02-23');
    expect(analytics.daily[0].answerCount).toBe(1);
  });

  it('模試推移と通常演習履歴を時系列で統合し、不正な模試を除外する', () => {
    const examQuestions = questions.slice(0, 30);
    const practiceQuestion = questions[40];
    const practiceResult: PracticeResultRow = {
      id: 'practice-history',
      version: 1,
      sessionId: 'practice-history',
      mode: 'normal_practice',
      startedAt: '2026-02-27T00:00:00.000Z',
      completedAt: '2026-02-27T00:05:00.000Z',
      filters: {
        domainId: 'all',
        categoryIds: [],
        difficulty: 'all',
        answerStatus: 'all',
        questionCount: 5,
        order: 'registered',
      },
      questionCodes: [practiceQuestion.code],
      confirmedQuestionCodes: [practiceQuestion.code],
      total: 99,
      correct: 99,
      incorrect: 0,
      unanswered: 0,
      correctRate: 100,
      elapsedSeconds: 300,
    };
    const examResult: ExamResultRow = {
      id: 'exam-history',
      version: 1,
      examSessionId: 'exam-history',
      examType: 'fixed_1',
      questionCodes: examQuestions.map((question) => question.code),
      questionResults: Object.fromEntries(
        examQuestions.map((question, index) => [
          question.code,
          {
            code: question.code,
            selectedChoice: index < 18 ? question.correctChoice : undefined,
            correctChoice: question.correctChoice,
            isCorrect: index < 18,
            review: false,
          },
        ]),
      ),
      reviewCodes: [],
      startedAt: '2026-02-28T00:00:00.000Z',
      submittedAt: '2026-02-28T00:50:00.000Z',
      deadlineAt: '2026-02-28T00:50:00.000Z',
      elapsedSeconds: 3000,
      total: 1,
      correct: 1,
      incorrect: 0,
      unanswered: 0,
      score: 1,
      correctRate: 1,
      passed: false,
      submissionReason: 'manual',
      categoryResults: {},
      domainResults: {},
    };
    const analytics = buildProgressAnalytics(questions, {
      attempts: [
        createAttempt(
          practiceQuestion.code,
          practiceQuestion.correctChoice,
          '2026-02-27T00:02:00.000Z',
          'practice-history',
        ),
      ],
      progressRows: [],
      practiceResults: [practiceResult],
      examResults: [examResult, { ...examResult, id: 'invalid-exam', questionCodes: ['A1-001'] }],
      period: 'all',
      now,
    });

    expect(analytics.examTrend).toHaveLength(1);
    expect(analytics.examTrend[0]).toMatchObject({ correct: 18, score: 60, passed: true });
    expect(analytics.history.map((item) => item.id)).toEqual(['exam-history', 'practice-history']);
    expect(analytics.history[1]).toMatchObject({ total: 1, correct: 1, correctRate: 100 });
  });

  it('カテゴリ問題を状態と並び替えで安全に絞り込める', () => {
    const category = categories[0];
    const questionRows = [
      {
        code: 'A1-003',
        id: '3',
        categoryId: category.id,
        subcategoryId: '',
        subcategory: '',
        difficulty: '基礎' as const,
        status: '正解' as const,
        attemptCount: 1,
        favorite: false,
      },
      {
        code: 'A1-002',
        id: '2',
        categoryId: category.id,
        subcategoryId: '',
        subcategory: '',
        difficulty: '標準' as const,
        status: '誤答' as const,
        attemptCount: 2,
        favorite: true,
      },
      {
        code: 'A1-001',
        id: '1',
        categoryId: category.id,
        subcategoryId: '',
        subcategory: '',
        difficulty: '応用' as const,
        status: '未回答' as const,
        attemptCount: 0,
        favorite: false,
      },
    ];

    expect(
      filterAndSortCategoryQuestions(questionRows, 'favorite', 'code').map((item) => item.code),
    ).toEqual(['A1-002']);
    expect(
      filterAndSortCategoryQuestions(questionRows, 'all', 'incorrect').map((item) => item.code),
    ).toEqual(['A1-002', 'A1-001', 'A1-003']);
  });

  it('問題数0の難易度と空の小分類を安全に扱う', () => {
    const question = {
      ...questions[0],
      code: 'A1-custom',
      id: 'custom',
      subcategoryId: '',
      subcategory: '',
    };
    const analytics = buildProgressAnalytics(
      [question],
      {
        attempts: [],
        progressRows: [],
        practiceResults: [],
        examResults: [],
        period: 'all',
        now,
      },
      categories,
      domains,
    );

    expect(analytics.difficulties.find((item) => item.difficulty === '標準')?.totalQuestions).toBe(
      0,
    );
    expect(getCategorySubcategories(analytics, question.categoryId)).toMatchObject([
      { name: 'その他', totalQuestions: 1, studiedQuestions: 0 },
    ]);
  });
});
