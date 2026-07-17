import { describe, expect, it } from 'vitest';
import { questions } from '../data/catalog';
import type { QuestionProgressRow } from '../database/types';
import {
  completePracticeSession,
  confirmPracticeAnswer,
  createPracticeSession,
  defaultPracticeFilters,
  filterPracticeQuestions,
  getPracticeSessionResult,
  selectPracticeAnswer,
  selectPracticeQuestions,
  shuffleQuestions,
  validatePracticeSession,
} from './practice';

const firstActiveQuestions = questions
  .filter((question) => question.status === 'active')
  .slice(0, 3);

describe('通常演習の出題条件', () => {
  it('系統、カテゴリ、難易度で正本データを絞り込める', () => {
    const target = firstActiveQuestions[0];
    const filtered = filterPracticeQuestions(questions, {
      domainId: target.domainId,
      categoryIds: [target.categoryId],
      difficulty: target.difficulty,
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((question) => question.domainId === target.domainId)).toBe(true);
    expect(filtered.every((question) => question.categoryId === target.categoryId)).toBe(true);
    expect(filtered.every((question) => question.difficulty === target.difficulty)).toBe(true);
  });

  it('該当問題がない条件では空配列を返す', () => {
    expect(
      filterPracticeQuestions(questions, {
        domainId: 'all',
        categoryIds: ['does-not-exist'],
        difficulty: 'all',
      }),
    ).toEqual([]);
  });

  it('回答状態と他の条件を組み合わせて絞り込める', () => {
    const [firstQuestion, secondQuestion] = firstActiveQuestions;
    const progressByCode = new Map<string, QuestionProgressRow>([
      [
        firstQuestion.code,
        {
          code: firstQuestion.code,
          attemptCount: 1,
          correctCount: 0,
          incorrectCount: 1,
          favorite: true,
          lastIsCorrect: false,
          updatedAt: '2026-07-17T00:00:00.000Z',
        },
      ],
      [
        secondQuestion.code,
        {
          code: secondQuestion.code,
          attemptCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          favorite: false,
          lastIsCorrect: true,
          updatedAt: '2026-07-17T00:00:00.000Z',
        },
      ],
    ]);

    expect(
      filterPracticeQuestions(
        [firstQuestion, secondQuestion],
        {
          domainId: firstQuestion.domainId,
          categoryIds: [firstQuestion.categoryId],
          difficulty: firstQuestion.difficulty,
          answerStatus: 'incorrect',
        },
        progressByCode,
      ).map((question) => question.code),
    ).toEqual([firstQuestion.code]);
    expect(
      filterPracticeQuestions(
        [firstQuestion, secondQuestion],
        { domainId: 'all', categoryIds: [], difficulty: 'all', answerStatus: 'favorite' },
        progressByCode,
      ).map((question) => question.code),
    ).toEqual([firstQuestion.code]);
  });

  it('登録順を保持し、ランダム順でも元の配列を変更しない', () => {
    const filters = { ...defaultPracticeFilters, questionCount: 'all' as const };
    const registered = selectPracticeQuestions(firstActiveQuestions, filters);
    const beforeShuffle = firstActiveQuestions.map((question) => question.code);
    const randomized = selectPracticeQuestions(
      firstActiveQuestions,
      { ...filters, order: 'random' },
      () => 0,
    );

    expect(registered.map((question) => question.code)).toEqual(beforeShuffle);
    expect(randomized.map((question) => question.code)).not.toEqual(beforeShuffle);
    expect(firstActiveQuestions.map((question) => question.code)).toEqual(beforeShuffle);
    expect(shuffleQuestions([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });

  it('出題数の5問・10問・20問・30問・すべてを安定して適用する', () => {
    const source = questions.filter((question) => question.status === 'active');

    for (const count of [5, 10, 20, 30, 'all'] as const) {
      const selected = selectPracticeQuestions(source, {
        ...defaultPracticeFilters,
        questionCount: count,
        order: 'random',
      });
      const expectedCount = count === 'all' ? source.length : count;

      expect(selected).toHaveLength(expectedCount);
      expect(new Set(selected.map((question) => question.code))).toHaveLength(expectedCount);
    }
  });
});

describe('通常演習セッション', () => {
  it('選択を即時保存し、確定後は正誤と結果を計算できる', () => {
    const [firstQuestion, secondQuestion] = firstActiveQuestions;
    const session = createPracticeSession(
      [firstQuestion.code, secondQuestion.code],
      defaultPracticeFilters,
      { id: 'practice-test', now: '2026-07-17T00:00:00.000Z' },
    );
    const selected = selectPracticeAnswer(
      session,
      firstQuestion,
      firstQuestion.correctChoice,
      '2026-07-17T00:01:00.000Z',
    );

    expect(selected.ok).toBe(true);
    if (!selected.ok) {
      return;
    }
    expect(selected.session.answers[firstQuestion.code]).toMatchObject({
      selectedChoice: firstQuestion.correctChoice,
      confirmed: false,
    });
    expect(getPracticeSessionResult(selected.session)).toMatchObject({
      answered: 0,
      unanswered: 2,
    });

    const confirmed = confirmPracticeAnswer(
      selected.session,
      firstQuestion,
      firstQuestion.correctChoice,
      '2026-07-17T00:02:00.000Z',
    );

    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) {
      return;
    }
    expect(confirmed.session.answers[firstQuestion.code]).toMatchObject({
      confirmed: true,
      isCorrect: true,
    });
    expect(
      getPracticeSessionResult(
        completePracticeSession(confirmed.session, '2026-07-17T00:03:00.000Z'),
      ),
    ).toEqual({
      total: 2,
      answered: 1,
      correct: 1,
      incorrect: 0,
      unanswered: 1,
      correctRate: 50,
    });
  });

  it('壊れたセッションを検出できる', () => {
    const session = createPracticeSession(['missing-question'], defaultPracticeFilters, {
      id: 'invalid-session',
      now: '2026-07-17T00:00:00.000Z',
    });
    const catalogCodes = new Set(questions.map((question) => question.code));

    expect(validatePracticeSession(session, catalogCodes)).toEqual({
      valid: false,
      reason: 'missing_question',
    });
  });
});
