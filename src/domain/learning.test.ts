import { describe, expect, it } from 'vitest';
import { questions } from '../data/catalog';
import type { LearningDayRow, QuestionProgressRow } from '../database/types';
import {
  applyAnswerToQuestionProgress,
  calculateLearningStreak,
  createLearningDashboard,
  getAsiaTokyoDate,
  matchesPracticeAnswerStatus,
} from './learning';

function progress(code: string, options: Partial<QuestionProgressRow> = {}): QuestionProgressRow {
  return {
    code,
    attemptCount: 1,
    correctCount: 1,
    incorrectCount: 0,
    favorite: false,
    lastChoice: 'A',
    lastIsCorrect: true,
    lastAnsweredAt: '2026-07-16T15:00:00.000Z',
    updatedAt: '2026-07-16T15:00:00.000Z',
    ...options,
  };
}

describe('学習進捗のドメインロジック', () => {
  it('回答ごとに累積値と最新の状態を更新する', () => {
    const first = applyAnswerToQuestionProgress(undefined, {
      code: 'NW-A1-001',
      selectedChoice: 'A',
      isCorrect: false,
      answeredAt: '2026-07-16T15:00:00.000Z',
    });
    const second = applyAnswerToQuestionProgress(first, {
      code: 'NW-A1-001',
      selectedChoice: 'B',
      isCorrect: true,
      answeredAt: '2026-07-17T01:00:00.000Z',
    });

    expect(first).toMatchObject({
      attemptCount: 1,
      correctCount: 0,
      incorrectCount: 1,
      lastIsCorrect: false,
    });
    expect(second).toMatchObject({
      attemptCount: 2,
      correctCount: 1,
      incorrectCount: 1,
      firstAnsweredAt: '2026-07-16T15:00:00.000Z',
      lastChoice: 'B',
      lastIsCorrect: true,
    });
  });

  it('未回答・現在間違い・お気に入りを独立して絞り込める', () => {
    const wrong = progress('NW-A1-001', { lastIsCorrect: false });
    const favorite = progress('NW-A1-002', { favorite: true });

    expect(matchesPracticeAnswerStatus(undefined, 'unanswered')).toBe(true);
    expect(matchesPracticeAnswerStatus(wrong, 'incorrect')).toBe(true);
    expect(matchesPracticeAnswerStatus(favorite, 'favorite')).toBe(true);
    expect(matchesPracticeAnswerStatus(favorite, 'incorrect')).toBe(false);
    expect(matchesPracticeAnswerStatus(wrong, 'favorite')).toBe(false);
  });

  it('Asia/Tokyoの日付で日付境界を判定する', () => {
    expect(getAsiaTokyoDate(new Date('2026-07-16T14:59:59.000Z'))).toBe('2026-07-16');
    expect(getAsiaTokyoDate(new Date('2026-07-16T15:00:00.000Z'))).toBe('2026-07-17');
  });

  it('今日または昨日からのみ連続学習日数を数える', () => {
    const today = new Date('2026-01-01T03:00:00.000Z');

    expect(calculateLearningStreak(['2026-01-01', '2025-12-31', '2025-12-30'], today)).toBe(3);
    expect(calculateLearningStreak(['2025-12-31', '2025-12-30'], today)).toBe(2);
    expect(calculateLearningStreak(['2025-12-30'], today)).toBe(0);
  });

  it('月末・年末・うるう年をまたいで連続日数を数える', () => {
    expect(
      calculateLearningStreak(
        ['2024-03-01', '2024-02-29', '2024-02-28'],
        new Date('2024-03-01T03:00:00.000Z'),
      ),
    ).toBe(3);
    expect(
      calculateLearningStreak(['2026-01-01', '2025-12-31'], new Date('2026-01-01T03:00:00.000Z')),
    ).toBe(2);
  });

  it('ホーム集計では最新回答の状態と当日の回答数を使う', () => {
    const [first, second, third] = questions.filter((question) => question.status === 'active');
    const days: LearningDayRow[] = [
      { date: '2026-07-17', answerCount: 3, updatedAt: '2026-07-17T01:00:00.000Z' },
      { date: '2026-07-16', answerCount: 1, updatedAt: '2026-07-16T01:00:00.000Z' },
    ];
    const dashboard = createLearningDashboard(
      questions,
      new Map([
        [first.code, progress(first.code)],
        [second.code, progress(second.code, { lastIsCorrect: false, favorite: true })],
        [third.code, progress(third.code, { favorite: true })],
      ]),
      days,
      new Date('2026-07-17T03:00:00.000Z'),
    );

    expect(dashboard).toMatchObject({
      totalQuestions: 240,
      studiedQuestions: 3,
      currentlyIncorrectQuestions: 1,
      favoriteQuestions: 2,
      latestCorrectQuestions: 2,
      latestCorrectRate: 67,
      todayAnswerCount: 3,
      learningStreak: 2,
    });
  });
});
