import type { B1Case, B1QuestionUnit } from '../data/b1';
import { hasB1Answer, type B1AnswerValues, type B1SelfGrade } from './b1';

export interface B1UnitConfirmationProgress {
  answers: B1AnswerValues;
  confirmedAt: string;
}

export interface B1ProgressSession {
  id: string;
  unitIds: readonly string[];
  answers: Readonly<Record<string, B1AnswerValues>>;
  unitConfirmations?: Readonly<Record<string, B1UnitConfirmationProgress>>;
  selfGrades: Readonly<Record<string, B1SelfGrade>>;
  selfGradeUpdatedAt?: Readonly<Record<string, string>>;
  reviewQuestionIds: readonly string[];
  updatedAt: string;
}

export interface B1ReviewTarget {
  questionId: string;
  caseId: string;
  year: number;
  label: string;
  reasons: readonly B1ReviewReason[];
}

export type B1ReviewReason = 'unanswered' | 'partial' | 'incorrect' | 'manual';

export interface B1ProgressBreakdown {
  id: string;
  label: string;
  totalUnitCount: number;
  confirmedUnitCount: number;
  selfAssessedUnitCount: number;
  progressRate: number;
}

export interface B1UnitProgressSummary {
  totalUnitCount: number;
  unansweredUnitCount: number;
  confirmedUnitCount: number;
  selfAssessedUnitCount: number;
  correctSelfGradeCount: number;
  partialSelfGradeCount: number;
  incorrectSelfGradeCount: number;
  reviewTargetCount: number;
  progressRate: number;
  byYear: readonly B1ProgressBreakdown[];
  byCase: readonly B1ProgressBreakdown[];
  reviewTargets: readonly B1ReviewTarget[];
}

interface B1UnitState {
  confirmation?: B1UnitConfirmationProgress;
  selfGrade?: B1SelfGrade;
  manualReview: boolean;
  updatedAt: string;
}

/** Returns all required answer fields that are currently blank. */
export function getB1UnansweredFieldIds(
  unit: Pick<B1QuestionUnit, 'answerFields'>,
  answers: B1AnswerValues,
): readonly string[] {
  return unit.answerFields
    .filter((field) => (answers[field.fieldId] ?? '').trim().length === 0)
    .map((field) => field.fieldId);
}

/**
 * Produces the learner-facing B-1 progress view from durable session data.
 * A newer draft intentionally supersedes an older confirmation for the same
 * unit so that a retry is not reported as complete until it is confirmed.
 */
export function summarizeB1UnitProgress(
  cases: readonly B1Case[],
  sessions: readonly B1ProgressSession[],
): B1UnitProgressSummary {
  const allUnits = cases.flatMap((caseItem) =>
    caseItem.questionUnits.map((unit) => ({ caseItem, unit })),
  );
  const states = latestStatesByQuestionId(sessions);
  const summary = summarizeUnits(allUnits, states);
  const byYear = [...new Set(cases.map((caseItem) => caseItem.year))]
    .sort((left, right) => right - left)
    .map((year) => {
      const units = allUnits.filter(({ caseItem }) => caseItem.year === year);
      const result = summarizeUnits(units, states);
      return {
        id: String(year),
        label: `${year}年度`,
        totalUnitCount: units.length,
        confirmedUnitCount: result.confirmedUnitCount,
        selfAssessedUnitCount: result.selfAssessedUnitCount,
        progressRate: result.progressRate,
      };
    });
  const byCase = cases.map((caseItem) => {
    const units = allUnits.filter(({ caseItem: item }) => item.caseId === caseItem.caseId);
    const result = summarizeUnits(units, states);
    return {
      id: caseItem.caseId,
      label: `${caseItem.year}年度 問${caseItem.questionNumber}`,
      totalUnitCount: units.length,
      confirmedUnitCount: result.confirmedUnitCount,
      selfAssessedUnitCount: result.selfAssessedUnitCount,
      progressRate: result.progressRate,
    };
  });
  const reviewTargets = allUnits
    .flatMap(({ caseItem, unit }) => {
      const state = states.get(unit.questionId);
      const reasons = reviewReasons(state);
      return reasons.length === 0
        ? []
        : [
            {
              questionId: unit.questionId,
              caseId: caseItem.caseId,
              year: caseItem.year,
              label: unit.label,
              reasons,
            },
          ];
    })
    .sort(compareReviewTarget);

  return { ...summary, byYear, byCase, reviewTargets };
}

function latestStatesByQuestionId(
  sessions: readonly B1ProgressSession[],
): ReadonlyMap<string, B1UnitState> {
  const states = new Map<string, B1UnitState>();
  for (const session of sessions) {
    for (const questionId of session.unitIds) {
      const confirmation = session.unitConfirmations?.[questionId];
      const selfGrade = session.selfGrades[questionId];
      const hasDraft = hasB1Answer(session.answers[questionId] ?? {});
      const manualReview = session.reviewQuestionIds.includes(questionId);
      if (confirmation === undefined && selfGrade === undefined && !hasDraft && !manualReview)
        continue;
      const selfGradeUpdatedAt = session.selfGradeUpdatedAt?.[questionId] ?? session.updatedAt;
      const updatedAt = [
        confirmation?.confirmedAt,
        selfGrade === undefined ? undefined : selfGradeUpdatedAt,
        hasDraft || manualReview ? session.updatedAt : undefined,
      ]
        .filter((value): value is string => value !== undefined)
        .sort()
        .at(-1);
      if (updatedAt === undefined) continue;
      const current = states.get(questionId);
      if (current !== undefined && current.updatedAt > updatedAt) continue;
      states.set(questionId, { confirmation, selfGrade, manualReview, updatedAt });
    }
  }
  return states;
}

function summarizeUnits(
  units: readonly { caseItem: B1Case; unit: B1QuestionUnit }[],
  states: ReadonlyMap<string, B1UnitState>,
): Omit<B1UnitProgressSummary, 'byYear' | 'byCase' | 'reviewTargets'> {
  const stateValues = units.map(({ unit }) => states.get(unit.questionId));
  const confirmedUnitCount = stateValues.filter(
    (state) => state?.confirmation !== undefined,
  ).length;
  const selfAssessedUnitCount = stateValues.filter(
    (state) => state?.selfGrade !== undefined,
  ).length;
  const correctSelfGradeCount = stateValues.filter(
    (state) => state?.selfGrade === 'correct',
  ).length;
  const partialSelfGradeCount = stateValues.filter(
    (state) => state?.selfGrade === 'partial',
  ).length;
  const incorrectSelfGradeCount = stateValues.filter(
    (state) => state?.selfGrade === 'incorrect' || state?.selfGrade === 'review',
  ).length;
  const reviewTargetCount = stateValues.filter((state) => reviewReasons(state).length > 0).length;
  return {
    totalUnitCount: units.length,
    unansweredUnitCount: units.length - confirmedUnitCount,
    confirmedUnitCount,
    selfAssessedUnitCount,
    correctSelfGradeCount,
    partialSelfGradeCount,
    incorrectSelfGradeCount,
    reviewTargetCount,
    progressRate: toProgressRate(confirmedUnitCount, units.length),
  };
}

function reviewReasons(state: B1UnitState | undefined): readonly B1ReviewReason[] {
  const reasons: B1ReviewReason[] = [];
  if (state?.confirmation === undefined) reasons.push('unanswered');
  if (state?.selfGrade === 'partial') reasons.push('partial');
  if (state?.selfGrade === 'incorrect' || state?.selfGrade === 'review') {
    reasons.push('incorrect');
  }
  if (state?.manualReview) reasons.push('manual');
  return reasons;
}

function toProgressRate(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function compareReviewTarget(left: B1ReviewTarget, right: B1ReviewTarget): number {
  const priority = (target: B1ReviewTarget) => {
    if (target.reasons.includes('incorrect')) return 0;
    if (target.reasons.includes('partial')) return 1;
    if (target.reasons.includes('manual')) return 2;
    return 3;
  };
  return (
    priority(left) - priority(right) ||
    right.year - left.year ||
    left.caseId.localeCompare(right.caseId) ||
    left.questionId.localeCompare(right.questionId)
  );
}
