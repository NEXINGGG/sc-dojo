import type {
  ExamQuestionResultRow,
  ExamResultRow,
  ExamScoreBreakdownRow,
  ExamSessionRow,
  ExamSubmissionReason,
  ExamType,
} from '../database/types';
import { getSubjectConfig, type SubjectId } from './subject';
import type { ChoiceId, Question } from '../types/question';

export const EXAM_QUESTION_COUNT = 30;
export const EXAM_DURATION_SECONDS = 50 * 60;
export const EXAM_DURATION_MILLISECONDS = EXAM_DURATION_SECONDS * 1000;
export const EXAM_PASSING_CORRECT_COUNT = 18;

export type ExamTimerStatus = 'normal' | 'warning' | 'critical' | 'expired' | 'invalid';

export interface ExamTimerState {
  remainingSeconds: number;
  status: ExamTimerStatus;
}

export interface ExamSubmissionSummary {
  answered: number;
  unanswered: number;
  review: number;
}

export class ExamDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExamDataError';
  }
}

export function getExamName(examType: ExamType): string {
  switch (examType) {
    case 'fixed_1':
      return '固定模試1';
    case 'fixed_2':
      return '固定模試2';
    default:
      return 'ランダム模試';
  }
}

export function getExamAnswerSource(
  examType: ExamType,
): 'mock_exam_fixed_1' | 'mock_exam_fixed_2' | 'mock_exam_random' {
  switch (examType) {
    case 'fixed_1':
      return 'mock_exam_fixed_1';
    case 'fixed_2':
      return 'mock_exam_fixed_2';
    default:
      return 'mock_exam_random';
  }
}

export function selectExamQuestionCodes(
  examType: ExamType,
  source: readonly Question[],
  random?: () => number,
): string[];
export function selectExamQuestionCodes(
  subjectId: SubjectId,
  examType: ExamType,
  source: readonly Question[],
  random?: () => number,
): string[];
export function selectExamQuestionCodes(
  subjectOrExamType: SubjectId | ExamType,
  examTypeOrSource: ExamType | readonly Question[],
  sourceOrRandom?: readonly Question[] | (() => number),
  random: () => number = Math.random,
): string[] {
  const usesSubjectId = subjectOrExamType === 'a1' || subjectOrExamType === 'a2';
  const subjectId: SubjectId = usesSubjectId ? subjectOrExamType : 'a1';
  const examType = (usesSubjectId ? examTypeOrSource : subjectOrExamType) as ExamType;
  const source = (usesSubjectId ? sourceOrRandom : examTypeOrSource) as readonly Question[];
  const randomizer = (usesSubjectId ? random : sourceOrRandom) as (() => number) | undefined;
  if (examType === 'fixed_1' || examType === 'fixed_2') {
    const questionSetId = examType === 'fixed_1' ? 'mock_exam_1' : 'mock_exam_2';
    const selected = source
      .filter((question) => question.questionSet.id === questionSetId)
      .sort((a, b) => (a.questionSet.sequence ?? 0) - (b.questionSet.sequence ?? 0));
    validateExamQuestionPool(selected, getExamName(examType));
    return selected.map((question) => question.code);
  }

  const activeQuestions = source.filter((question) => question.status === 'active');
  const { questionCount } = getSubjectConfig(subjectId).exam;
  if (activeQuestions.length < questionCount) {
    throw new ExamDataError(
      `ランダム模試に必要な${questionCount}問を用意できません。問題データを確認してください。`,
    );
  }

  return shuffle(activeQuestions, randomizer ?? Math.random)
    .slice(0, questionCount)
    .map((question) => question.code);
}

export function createExamSession(
  examType: ExamType,
  questionCodes: readonly string[],
  options: { id: string; now: string },
): ExamSessionRow;
export function createExamSession(
  subjectId: SubjectId,
  examType: ExamType,
  questionCodes: readonly string[],
  options: { id: string; now: string },
): ExamSessionRow;
export function createExamSession(
  subjectOrExamType: SubjectId | ExamType,
  examTypeOrCodes: ExamType | readonly string[],
  questionCodesOrOptions: readonly string[] | { id: string; now: string },
  options?: { id: string; now: string },
): ExamSessionRow {
  const usesSubjectId = subjectOrExamType === 'a1' || subjectOrExamType === 'a2';
  const subjectId: SubjectId = usesSubjectId ? subjectOrExamType : 'a1';
  const examType = (usesSubjectId ? examTypeOrCodes : subjectOrExamType) as ExamType;
  const questionCodes = (
    usesSubjectId ? questionCodesOrOptions : examTypeOrCodes
  ) as readonly string[];
  const sessionOptions = (usesSubjectId ? options : questionCodesOrOptions) as {
    id: string;
    now: string;
  };
  validateQuestionCodes(questionCodes, subjectId);
  const startedAt = new Date(sessionOptions.now);

  if (Number.isNaN(startedAt.getTime())) {
    throw new ExamDataError('模試の開始時刻が不正です。もう一度開始してください。');
  }

  return {
    id: sessionOptions.id,
    subjectId,
    version: 1,
    status: 'in_progress',
    examType,
    questionCodes: [...questionCodes],
    answers: {},
    reviewCodes: [],
    currentIndex: 0,
    startedAt: sessionOptions.now,
    deadlineAt: new Date(
      startedAt.getTime() + getSubjectConfig(subjectId).exam.durationSeconds * 1000,
    ).toISOString(),
    updatedAt: sessionOptions.now,
  };
}

export function selectExamAnswer(
  session: ExamSessionRow,
  question: Question,
  choiceId: ChoiceId | undefined,
  updatedAt: string,
): ExamSessionRow {
  validateEditableSession(session);
  if (!session.questionCodes.includes(question.code)) {
    throw new ExamDataError('この問題は模試セッションに含まれていません。');
  }
  if (choiceId !== undefined && !question.choices.some((choice) => choice.id === choiceId)) {
    throw new ExamDataError('選択肢の形式に問題があります。もう一度選択してください。');
  }

  const answers = { ...session.answers };
  if (choiceId === undefined) {
    delete answers[question.code];
  } else {
    answers[question.code] = choiceId;
  }

  return { ...session, answers, updatedAt };
}

export function toggleExamReview(
  session: ExamSessionRow,
  code: string,
  updatedAt: string,
): ExamSessionRow {
  validateEditableSession(session);
  if (!session.questionCodes.includes(code)) {
    throw new ExamDataError('この問題は模試セッションに含まれていません。');
  }

  const reviewCodes = new Set(session.reviewCodes);
  if (reviewCodes.has(code)) {
    reviewCodes.delete(code);
  } else {
    reviewCodes.add(code);
  }

  return { ...session, reviewCodes: [...reviewCodes], updatedAt };
}

export function moveExamSession(
  session: ExamSessionRow,
  nextIndex: number,
  updatedAt: string,
): ExamSessionRow {
  validateEditableSession(session);
  const currentIndex = Math.min(Math.max(0, nextIndex), session.questionCodes.length - 1);
  return { ...session, currentIndex, updatedAt };
}

export function getExamTimerState(deadlineAt: string, now: Date = new Date()): ExamTimerState {
  const deadline = new Date(deadlineAt);
  if (Number.isNaN(deadline.getTime())) {
    return { remainingSeconds: 0, status: 'invalid' };
  }

  const remainingMilliseconds = deadline.getTime() - now.getTime();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMilliseconds / 1000));
  if (remainingSeconds === 0) {
    return { remainingSeconds, status: 'expired' };
  }
  if (remainingSeconds <= 5 * 60) {
    return { remainingSeconds, status: 'critical' };
  }
  if (remainingSeconds <= 10 * 60) {
    return { remainingSeconds, status: 'warning' };
  }
  return { remainingSeconds, status: 'normal' };
}

export function formatExamRemainingTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}分${String(seconds).padStart(2, '0')}秒`;
}

export function getExamSubmissionSummary(session: ExamSessionRow): ExamSubmissionSummary {
  const answered = session.questionCodes.filter(
    (code) => session.answers[code] !== undefined,
  ).length;
  return {
    answered,
    unanswered: session.questionCodes.length - answered,
    review: session.reviewCodes.length,
  };
}

export function gradeExam(
  session: ExamSessionRow,
  questionsByCode: ReadonlyMap<string, Question>,
  submittedAt: string,
  submissionReason: ExamSubmissionReason,
): ExamResultRow {
  validateQuestionCodes(session.questionCodes, session.subjectId);
  const submitted = new Date(submittedAt);
  const started = new Date(session.startedAt);
  const deadline = new Date(session.deadlineAt);
  if (
    Number.isNaN(submitted.getTime()) ||
    Number.isNaN(started.getTime()) ||
    Number.isNaN(deadline.getTime()) ||
    deadline.getTime() <= started.getTime()
  ) {
    throw new ExamDataError('保存された模試の時刻に問題があります。新しく模試を開始してください。');
  }

  const reviewCodes = new Set(session.reviewCodes);
  const questionResults: Record<string, ExamQuestionResultRow> = {};
  const categoryResults: Record<string, ExamScoreBreakdownRow> = {};
  const domainResults: Record<string, ExamScoreBreakdownRow> = {};
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  for (const code of session.questionCodes) {
    const question = questionsByCode.get(code);
    if (question === undefined) {
      throw new ExamDataError(
        '保存された模試に存在しない問題があります。模試を破棄して新しく開始してください。',
      );
    }
    const selectedChoice = session.answers[code];
    if (
      selectedChoice !== undefined &&
      !question.choices.some((choice) => choice.id === selectedChoice)
    ) {
      throw new ExamDataError(
        '保存された回答に問題があります。模試を破棄して新しく開始してください。',
      );
    }
    const isCorrect =
      selectedChoice === undefined ? undefined : selectedChoice === question.correctChoice;
    if (isCorrect === true) {
      correct += 1;
    } else if (isCorrect === false) {
      incorrect += 1;
    } else {
      unanswered += 1;
    }
    questionResults[code] = {
      code,
      selectedChoice,
      correctChoice: question.correctChoice,
      isCorrect,
      review: reviewCodes.has(code),
    };
    incrementBreakdown(categoryResults, question.categoryId, isCorrect);
    incrementBreakdown(domainResults, question.domainId, isCorrect);
  }

  const total = session.questionCodes.length;
  return {
    id: session.id,
    subjectId: session.subjectId,
    version: 1,
    examSessionId: session.id,
    examType: session.examType,
    questionCodes: [...session.questionCodes],
    questionResults,
    reviewCodes: [...session.reviewCodes],
    startedAt: session.startedAt,
    submittedAt,
    deadlineAt: session.deadlineAt,
    elapsedSeconds: getElapsedSeconds(started, deadline, submitted),
    total,
    correct,
    incorrect,
    unanswered,
    score: Math.round((correct / total) * 100),
    correctRate: Math.round((correct / total) * 100),
    passed: correct >= getSubjectConfig(session.subjectId).exam.passingCorrectCount,
    submissionReason,
    categoryResults,
    domainResults,
  };
}

export function createExamSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `exam-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validateExamQuestionPool(
  questions: readonly Question[],
  label: string,
  subjectId: SubjectId = questions[0]?.subjectId ?? 'a1',
): void {
  const { questionCount } = getSubjectConfig(subjectId).exam;
  if (questions.length !== questionCount) {
    throw new ExamDataError(
      `${label}は${questionCount}問である必要があります。問題データを確認してください。`,
    );
  }
  validateQuestionCodes(
    questions.map((question) => question.code),
    subjectId,
  );
}

function validateQuestionCodes(questionCodes: readonly string[], subjectId: SubjectId): void {
  if (questionCodes.length !== getSubjectConfig(subjectId).exam.questionCount) {
    throw new ExamDataError(
      `模試は${getSubjectConfig(subjectId).exam.questionCount}問で作成する必要があります。`,
    );
  }
  if (new Set(questionCodes).size !== questionCodes.length) {
    throw new ExamDataError('模試の問題に重複があります。問題データを確認してください。');
  }
}

function validateEditableSession(session: ExamSessionRow): void {
  if (session.status !== 'in_progress') {
    throw new ExamDataError('提出済みの模試は変更できません。');
  }
}

function shuffle<T>(source: readonly T[], random: () => number): T[] {
  const shuffled = [...source];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const selectedIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[selectedIndex]] = [shuffled[selectedIndex], shuffled[index]];
  }
  return shuffled;
}

function incrementBreakdown(
  breakdown: Record<string, ExamScoreBreakdownRow>,
  id: string,
  isCorrect: boolean | undefined,
): void {
  const current = breakdown[id] ?? {
    total: 0,
    answered: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
  };
  current.total += 1;
  if (isCorrect === true) {
    current.answered += 1;
    current.correct += 1;
  } else if (isCorrect === false) {
    current.answered += 1;
    current.incorrect += 1;
  } else {
    current.unanswered += 1;
  }
  breakdown[id] = current;
}

function getElapsedSeconds(started: Date, deadline: Date, submitted: Date): number {
  const end = Math.min(submitted.getTime(), deadline.getTime());
  return Math.max(0, Math.floor((end - started.getTime()) / 1000));
}
