import type { PracticeSessionRow, PracticeSessionAnswer } from '../database/types';
import type { ChoiceId, Difficulty, Question } from '../types/question';

export const practiceQuestionCounts = [10, 20, 30, 'all'] as const;

export type PracticeQuestionCount = (typeof practiceQuestionCounts)[number];
export type PracticeOrder = 'registered' | 'random';

export interface PracticeFilters {
  domainId: string | 'all';
  categoryIds: readonly string[];
  difficulty: Difficulty | 'all';
  questionCount: PracticeQuestionCount;
  order: PracticeOrder;
}

export interface PracticeSessionResult {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  correctRate: number;
}

export type PracticeSessionValidation =
  | { valid: true }
  | {
      valid: false;
      reason:
        | 'empty_questions'
        | 'duplicate_questions'
        | 'missing_question'
        | 'invalid_current_index'
        | 'unexpected_answer';
    };

export type ConfirmPracticeAnswerResult =
  | { ok: true; session: PracticeSessionRow }
  | { ok: false; reason: 'already_answered' | 'choice_not_found' | 'question_not_in_session' };

export const defaultPracticeFilters: PracticeFilters = {
  domainId: 'all',
  categoryIds: [],
  difficulty: 'all',
  questionCount: 10,
  order: 'registered',
};

export function clonePracticeFilters(filters: PracticeFilters): PracticeFilters {
  return {
    ...filters,
    categoryIds: [...filters.categoryIds],
  };
}

export function filterPracticeQuestions(
  source: readonly Question[],
  filters: Pick<PracticeFilters, 'domainId' | 'categoryIds' | 'difficulty'>,
): readonly Question[] {
  const categoryIds = new Set(filters.categoryIds);

  return source.filter(
    (question) =>
      question.status === 'active' &&
      (filters.domainId === 'all' || question.domainId === filters.domainId) &&
      (categoryIds.size === 0 || categoryIds.has(question.categoryId)) &&
      (filters.difficulty === 'all' || question.difficulty === filters.difficulty),
  );
}

export function shuffleQuestions<T>(source: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...source];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const selectedIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[selectedIndex]] = [shuffled[selectedIndex], shuffled[index]];
  }

  return shuffled;
}

export function selectPracticeQuestions(
  source: readonly Question[],
  filters: PracticeFilters,
  random: () => number = Math.random,
): readonly Question[] {
  const filtered = filterPracticeQuestions(source, filters);
  const ordered = filters.order === 'random' ? shuffleQuestions(filtered, random) : [...filtered];
  const limit = filters.questionCount === 'all' ? ordered.length : filters.questionCount;

  return ordered.slice(0, limit);
}

export function countQuestionsByCategory(
  source: readonly Question[],
  filters: Pick<PracticeFilters, 'domainId' | 'difficulty'>,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const question of filterPracticeQuestions(source, { ...filters, categoryIds: [] })) {
    counts.set(question.categoryId, (counts.get(question.categoryId) ?? 0) + 1);
  }

  return counts;
}

export function countQuestionsByDifficulty(
  source: readonly Question[],
  filters: Pick<PracticeFilters, 'domainId' | 'categoryIds'>,
): ReadonlyMap<Difficulty, number> {
  const counts = new Map<Difficulty, number>();

  for (const question of filterPracticeQuestions(source, { ...filters, difficulty: 'all' })) {
    counts.set(question.difficulty, (counts.get(question.difficulty) ?? 0) + 1);
  }

  return counts;
}

export function createPracticeSession(
  questionCodes: readonly string[],
  filters: PracticeFilters,
  options: { id: string; now: string },
): PracticeSessionRow {
  return {
    id: options.id,
    version: 1,
    status: 'in_progress',
    filters: clonePracticeFilters(filters),
    questionCodes: [...questionCodes],
    currentIndex: 0,
    answers: {},
    createdAt: options.now,
    updatedAt: options.now,
  };
}

export function confirmPracticeAnswer(
  session: PracticeSessionRow,
  question: Question,
  selectedChoice: ChoiceId,
  answeredAt: string,
): ConfirmPracticeAnswerResult {
  if (!session.questionCodes.includes(question.code)) {
    return { ok: false, reason: 'question_not_in_session' };
  }

  if (session.answers[question.code]?.confirmed) {
    return { ok: false, reason: 'already_answered' };
  }

  if (!question.choices.some((choice) => choice.id === selectedChoice)) {
    return { ok: false, reason: 'choice_not_found' };
  }

  const answer: PracticeSessionAnswer = {
    selectedChoice,
    confirmed: true,
    isCorrect: selectedChoice === question.correctChoice,
    selectedAt: session.answers[question.code]?.selectedAt ?? answeredAt,
    confirmedAt: answeredAt,
  };

  return {
    ok: true,
    session: {
      ...session,
      answers: { ...session.answers, [question.code]: answer },
      updatedAt: answeredAt,
    },
  };
}

export function selectPracticeAnswer(
  session: PracticeSessionRow,
  question: Question,
  selectedChoice: ChoiceId,
  selectedAt: string,
): ConfirmPracticeAnswerResult {
  if (!session.questionCodes.includes(question.code)) {
    return { ok: false, reason: 'question_not_in_session' };
  }

  if (session.answers[question.code]?.confirmed) {
    return { ok: false, reason: 'already_answered' };
  }

  if (!question.choices.some((choice) => choice.id === selectedChoice)) {
    return { ok: false, reason: 'choice_not_found' };
  }

  const answer: PracticeSessionAnswer = {
    selectedChoice,
    confirmed: false,
    selectedAt,
  };

  return {
    ok: true,
    session: {
      ...session,
      answers: { ...session.answers, [question.code]: answer },
      updatedAt: selectedAt,
    },
  };
}

export function movePracticeSession(
  session: PracticeSessionRow,
  nextIndex: number,
  updatedAt: string,
): PracticeSessionRow {
  const lastIndex = Math.max(0, session.questionCodes.length - 1);
  const currentIndex = Math.min(Math.max(0, nextIndex), lastIndex);

  return { ...session, currentIndex, updatedAt };
}

export function completePracticeSession(
  session: PracticeSessionRow,
  completedAt: string,
): PracticeSessionRow {
  return {
    ...session,
    status: 'completed',
    completedAt,
    updatedAt: completedAt,
  };
}

export function getPracticeSessionResult(
  session: Pick<PracticeSessionRow, 'questionCodes' | 'answers'>,
): PracticeSessionResult {
  const total = session.questionCodes.length;
  const answers = Object.values(session.answers).filter((answer) => answer.confirmed);
  const answered = answers.length;
  const correct = answers.filter((answer) => answer.isCorrect === true).length;
  const incorrect = answered - correct;
  const unanswered = total - answered;

  return {
    total,
    answered,
    correct,
    incorrect,
    unanswered,
    correctRate: total === 0 ? 0 : Math.round((correct / total) * 100),
  };
}

export function validatePracticeSession(
  session: PracticeSessionRow,
  questionCodesInCatalog: ReadonlySet<string>,
): PracticeSessionValidation {
  if (session.questionCodes.length === 0) {
    return { valid: false, reason: 'empty_questions' };
  }

  if (new Set(session.questionCodes).size !== session.questionCodes.length) {
    return { valid: false, reason: 'duplicate_questions' };
  }

  if (session.questionCodes.some((code) => !questionCodesInCatalog.has(code))) {
    return { valid: false, reason: 'missing_question' };
  }

  if (Object.keys(session.answers).some((code) => !session.questionCodes.includes(code))) {
    return { valid: false, reason: 'unexpected_answer' };
  }

  if (session.currentIndex < 0 || session.currentIndex >= session.questionCodes.length) {
    return { valid: false, reason: 'invalid_current_index' };
  }

  return { valid: true };
}

export function createPracticeSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `practice-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
