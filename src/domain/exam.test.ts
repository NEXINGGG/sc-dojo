import { describe, expect, it } from 'vitest';
import { getSubjectCatalog, questions } from '../data/catalog';
import type { ExamSessionRow } from '../database/types';
import {
  createExamSession,
  EXAM_DURATION_MILLISECONDS,
  EXAM_PASSING_CORRECT_COUNT,
  formatExamRemainingTime,
  getExamSubmissionSummary,
  getExamTimerState,
  gradeExam,
  moveExamSession,
  selectExamAnswer,
  selectExamQuestionCodes,
  toggleExamReview,
} from './exam';

const activeQuestions = questions.filter((question) => question.status === 'active');
const a2Questions = getSubjectCatalog('a2').questions.filter(
  (question) => question.status === 'active',
);

function createSession(id = 'exam-test'): ExamSessionRow {
  return createExamSession(
    'random',
    activeQuestions.slice(0, 30).map((question) => question.code),
    { id, now: '2026-07-18T00:00:00.000Z' },
  );
}

describe('模試の出題生成', () => {
  it('固定模試1・2はそれぞれ固定30問を使う', () => {
    const first = selectExamQuestionCodes('fixed_1', questions);
    const second = selectExamQuestionCodes('fixed_2', questions);

    expect(first).toHaveLength(30);
    expect(second).toHaveLength(30);
    expect(new Set(first)).toHaveLength(30);
    expect(new Set(second)).toHaveLength(30);
    expect(first).toEqual(questions.slice(180, 210).map((question) => question.code));
    expect(second).toEqual(questions.slice(210, 240).map((question) => question.code));
  });

  it('ランダム模試はactiveな問題から重複なし30問を再現可能に抽出する', () => {
    const before = activeQuestions.map((question) => question.code);
    const first = selectExamQuestionCodes('random', activeQuestions, () => 0);
    const second = selectExamQuestionCodes('random', activeQuestions, () => 0);

    expect(first).toHaveLength(30);
    expect(new Set(first)).toHaveLength(30);
    expect(first).toEqual(second);
    expect(first.every((code) => before.includes(code))).toBe(true);
    expect(activeQuestions.map((question) => question.code)).toEqual(before);
  });
});

describe('A-2 exam rules', () => {
  it('uses 25 unique questions, 40 minutes, and a 15-answer pass threshold', () => {
    const codes = selectExamQuestionCodes('a2', 'random', a2Questions, () => 0.2);
    const session = createExamSession('a2', 'random', codes, {
      id: 'a2-exam',
      now: '2026-07-18T00:00:00.000Z',
    });
    const selectedQuestions = codes.map((code) =>
      a2Questions.find((question) => question.code === code),
    );
    const answers = Object.fromEntries(
      selectedQuestions.slice(0, 15).map((question) => [question?.code, question?.correctChoice]),
    );
    const passed = gradeExam(
      { ...session, answers },
      new Map(a2Questions.map((question) => [question.code, question])),
      '2026-07-18T00:40:00.000Z',
      'manual',
    );
    const failed = gradeExam(
      {
        ...session,
        answers: Object.fromEntries(
          selectedQuestions
            .slice(0, 14)
            .map((question) => [question?.code, question?.correctChoice]),
        ),
      },
      new Map(a2Questions.map((question) => [question.code, question])),
      '2026-07-18T00:40:00.000Z',
      'manual',
    );

    expect(codes).toHaveLength(25);
    expect(new Set(codes)).toHaveLength(25);
    expect(new Date(session.deadlineAt).getTime() - new Date(session.startedAt).getTime()).toBe(
      40 * 60 * 1000,
    );
    expect(passed).toMatchObject({ total: 25, correct: 15, passed: true });
    expect(failed).toMatchObject({ correct: 14, passed: false });
  });
});

describe('模試セッションとタイマー', () => {
  it('開始時に50分の締切を固定し、再開しても出題順を保持する', () => {
    const codes = selectExamQuestionCodes('random', activeQuestions, () => 0.1);
    const session = createExamSession('random', codes, {
      id: 'fixed-session',
      now: '2026-07-18T00:00:00.000Z',
    });

    expect(new Date(session.deadlineAt).getTime() - new Date(session.startedAt).getTime()).toBe(
      EXAM_DURATION_MILLISECONDS,
    );
    expect(session.questionCodes).toEqual(codes);
  });

  it('締切時刻との差で残り時間と注意状態を計算する', () => {
    const deadline = '2026-07-18T00:50:00.000Z';

    expect(getExamTimerState(deadline, new Date('2026-07-18T00:39:59.000Z'))).toMatchObject({
      remainingSeconds: 601,
      status: 'normal',
    });
    expect(getExamTimerState(deadline, new Date('2026-07-18T00:40:00.000Z')).status).toBe(
      'warning',
    );
    expect(getExamTimerState(deadline, new Date('2026-07-18T00:45:00.000Z')).status).toBe(
      'critical',
    );
    expect(getExamTimerState(deadline, new Date('2026-07-18T00:50:00.000Z')).status).toBe(
      'expired',
    );
    expect(getExamTimerState('invalid-date').status).toBe('invalid');
    expect(formatExamRemainingTime(65)).toBe('1分05秒');
  });

  it('回答変更・選択解除・見直し・問題移動を保存用の状態へ反映する', () => {
    const session = createSession();
    const question = activeQuestions[0];
    const selected = selectExamAnswer(session, question, 'A', '2026-07-18T00:01:00.000Z');
    const changed = selectExamAnswer(selected, question, 'B', '2026-07-18T00:02:00.000Z');
    const reviewed = toggleExamReview(changed, question.code, '2026-07-18T00:03:00.000Z');
    const moved = moveExamSession(reviewed, 5, '2026-07-18T00:04:00.000Z');
    const cleared = selectExamAnswer(moved, question, undefined, '2026-07-18T00:05:00.000Z');

    expect(cleared.answers[question.code]).toBeUndefined();
    expect(cleared.reviewCodes).toEqual([question.code]);
    expect(cleared.currentIndex).toBe(5);
    expect(getExamSubmissionSummary(cleared)).toEqual({ answered: 0, unanswered: 30, review: 1 });
  });
});

describe('模試の一括採点', () => {
  it('正解・不正解・未回答、系統・カテゴリ集計、合格判定を正しく保存用に集計する', () => {
    const session = createSession('grade-pass');
    const answered: ExamSessionRow = {
      ...session,
      answers: Object.fromEntries(
        activeQuestions
          .slice(0, 23)
          .map((question, index) => [
            question.code,
            index < EXAM_PASSING_CORRECT_COUNT
              ? question.correctChoice
              : question.correctChoice === 'A'
                ? 'B'
                : 'A',
          ]),
      ),
      reviewCodes: [activeQuestions[0].code, activeQuestions[29].code],
    };
    const result = gradeExam(
      answered,
      new Map(activeQuestions.map((question) => [question.code, question])),
      '2026-07-18T00:50:00.000Z',
      'manual',
    );

    expect(result).toMatchObject({
      total: 30,
      correct: 18,
      incorrect: 5,
      unanswered: 7,
      score: 60,
      correctRate: 60,
      passed: true,
      elapsedSeconds: 3000,
    });
    expect(result.questionResults[activeQuestions[0].code]).toMatchObject({ review: true });
    expect(Object.values(result.categoryResults).reduce((sum, row) => sum + row.total, 0)).toBe(30);
    expect(Object.values(result.domainResults).reduce((sum, row) => sum + row.correct, 0)).toBe(18);
  });

  it('17問以下は不合格で、100点換算は四捨五入する', () => {
    const session = createSession('grade-fail');
    const answered: ExamSessionRow = {
      ...session,
      answers: Object.fromEntries(
        activeQuestions.slice(0, 17).map((question) => [question.code, question.correctChoice]),
      ),
    };
    const result = gradeExam(
      answered,
      new Map(activeQuestions.map((question) => [question.code, question])),
      '2026-07-18T00:10:00.000Z',
      'timeout',
    );

    expect(result).toMatchObject({
      correct: 17,
      passed: false,
      score: 57,
      submissionReason: 'timeout',
    });
  });
});
