import { describe, expect, it } from 'vitest';
import { b1Cases } from '../data/b1';
import { getB1UnansweredFieldIds, summarizeB1UnitProgress } from './b1Progress';

const now = '2026-08-03T00:00:00.000Z';

describe('B-1 Phase 4 progress', () => {
  it('reports every B-1 unit as unanswered when there is no saved learning data', () => {
    const summary = summarizeB1UnitProgress(b1Cases, []);

    expect(summary.totalUnitCount).toBe(243);
    expect(summary.unansweredUnitCount).toBe(243);
    expect(summary.confirmedUnitCount).toBe(0);
    expect(summary.selfAssessedUnitCount).toBe(0);
    expect(summary.reviewTargetCount).toBe(243);
    expect(summary.progressRate).toBe(0);
  });

  it('requires every answer field before a multi-field unit can be confirmed', () => {
    const unit = b1Cases
      .flatMap((caseItem) => caseItem.questionUnits)
      .find((item) => item.answerFields.length > 1);
    if (unit === undefined) throw new Error('A multi-field B-1 unit is required');

    const incomplete = Object.fromEntries(
      unit.answerFields.slice(0, -1).map((field) => [field.fieldId, '入力済み']),
    );
    expect(getB1UnansweredFieldIds(unit, incomplete)).toEqual([
      unit.answerFields[unit.answerFields.length - 1].fieldId,
    ]);
  });

  it('derives self-assessment and review targets from the latest durable unit state', () => {
    const caseItem = b1Cases[0];
    const unit = caseItem.questionUnits[0];
    const answers = Object.fromEntries(unit.answerFields.map((field) => [field.fieldId, '回答']));
    const summary = summarizeB1UnitProgress(
      [caseItem],
      [
        {
          id: 'b1-phase4-session',
          unitIds: caseItem.questionUnits.map((item) => item.questionId),
          answers: { [unit.questionId]: answers },
          unitConfirmations: { [unit.questionId]: { answers, confirmedAt: now } },
          selfGrades: { [unit.questionId]: 'partial' },
          selfGradeUpdatedAt: { [unit.questionId]: now },
          reviewQuestionIds: [unit.questionId],
          updatedAt: now,
        },
      ],
    );

    expect(summary.confirmedUnitCount).toBe(1);
    expect(summary.selfAssessedUnitCount).toBe(1);
    expect(summary.partialSelfGradeCount).toBe(1);
    expect(summary.reviewTargetCount).toBe(caseItem.questionUnits.length);
    expect(summary.reviewTargets[0]).toMatchObject({
      questionId: unit.questionId,
      reasons: ['partial', 'manual'],
    });
  });
});
