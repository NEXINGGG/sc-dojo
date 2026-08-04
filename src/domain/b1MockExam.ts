import type { B1QuestionUnit } from '../data/b1';
import type { B1AnswerValues } from './b1';

export interface B1MockAnswerProgress {
  totalUnitCount: number;
  answeredUnitCount: number;
  partiallyAnsweredUnitCount: number;
  unansweredUnitCount: number;
  totalAnswerFieldCount: number;
  answeredAnswerFieldCount: number;
  unansweredAnswerFieldCount: number;
  reviewUnitCount: number;
}

export interface B1MockTiming {
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string;
  completedAt?: string;
}

type B1MockProgressUnit = Pick<B1QuestionUnit, 'questionId' | 'answerFields'>;

/**
 * Counts durable answer-field values rather than relying on the current React
 * state. A unit is answered only when every required field has text; a partly
 * completed multi-field unit remains visible as such to the learner.
 */
export function summarizeB1MockAnswers(
  units: readonly B1MockProgressUnit[],
  answers: Readonly<Record<string, B1AnswerValues>>,
  reviewQuestionIds: readonly string[],
): B1MockAnswerProgress {
  let answeredUnitCount = 0;
  let partiallyAnsweredUnitCount = 0;
  let totalAnswerFieldCount = 0;
  let answeredAnswerFieldCount = 0;

  for (const unit of units) {
    const values = answers[unit.questionId] ?? {};
    const fieldCount = unit.answerFields.length;
    const answeredFields = unit.answerFields.filter(
      (field) => (values[field.fieldId] ?? '').trim().length > 0,
    ).length;
    totalAnswerFieldCount += fieldCount;
    answeredAnswerFieldCount += answeredFields;
    if (fieldCount > 0 && answeredFields === fieldCount) answeredUnitCount += 1;
    else if (answeredFields > 0) partiallyAnsweredUnitCount += 1;
  }

  return {
    totalUnitCount: units.length,
    answeredUnitCount,
    partiallyAnsweredUnitCount,
    unansweredUnitCount: units.length - answeredUnitCount - partiallyAnsweredUnitCount,
    totalAnswerFieldCount,
    answeredAnswerFieldCount,
    unansweredAnswerFieldCount: totalAnswerFieldCount - answeredAnswerFieldCount,
    reviewUnitCount: new Set(reviewQuestionIds).size,
  };
}

/**
 * Derives elapsed time from persisted timestamps. The interval used by the UI
 * merely refreshes the display, so reloads and device sleep do not reset time.
 */
export function getB1MockElapsedSeconds(timing: B1MockTiming, now = new Date()): number {
  const startedAt = new Date(timing.startedAt).getTime();
  const deadlineAt = new Date(timing.deadlineAt).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(deadlineAt) || deadlineAt < startedAt) {
    return 0;
  }
  const endedAt = firstValidTime(timing.submittedAt, timing.completedAt, now.toISOString());
  const cappedEndedAt = Math.max(startedAt, Math.min(endedAt, deadlineAt));
  return Math.floor((cappedEndedAt - startedAt) / 1000);
}

export function formatB1MockElapsedTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours > 0
    ? `${hours}時間${String(minutes).padStart(2, '0')}分${String(remainingSeconds).padStart(2, '0')}秒`
    : `${minutes}分${String(remainingSeconds).padStart(2, '0')}秒`;
}

function firstValidTime(...values: readonly (string | undefined)[]): number {
  for (const value of values) {
    if (value === undefined) continue;
    const time = new Date(value).getTime();
    if (Number.isFinite(time)) return time;
  }
  return 0;
}
