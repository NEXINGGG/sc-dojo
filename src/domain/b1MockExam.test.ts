import { describe, expect, it } from 'vitest';
import { b1Cases } from '../data/b1';
import {
  formatB1MockElapsedTime,
  getB1MockElapsedSeconds,
  summarizeB1MockAnswers,
} from './b1MockExam';

describe('B-1 mock-exam domain', () => {
  it('counts answer fields and distinguishes complete, partial, and blank units', () => {
    const multiFieldUnit = b1Cases
      .flatMap((caseItem) => caseItem.questionUnits)
      .find((unit) => unit.answerFields.length > 1);
    if (multiFieldUnit === undefined) throw new Error('A multi-field unit is required');
    const singleFieldUnit = b1Cases
      .flatMap((caseItem) => caseItem.questionUnits)
      .find((unit) => unit.answerFields.length === 1);
    if (singleFieldUnit === undefined) throw new Error('A single-field unit is required');

    const progress = summarizeB1MockAnswers(
      [multiFieldUnit, singleFieldUnit],
      {
        [multiFieldUnit.questionId]: { [multiFieldUnit.answerFields[0].fieldId]: '入力済み' },
        [singleFieldUnit.questionId]: { [singleFieldUnit.answerFields[0].fieldId]: ' ' },
      },
      [multiFieldUnit.questionId],
    );

    expect(progress).toMatchObject({
      totalUnitCount: 2,
      answeredUnitCount: 0,
      partiallyAnsweredUnitCount: 1,
      unansweredUnitCount: 1,
      answeredAnswerFieldCount: 1,
      reviewUnitCount: 1,
    });
    expect(progress.totalAnswerFieldCount).toBe(multiFieldUnit.answerFields.length + 1);
    expect(progress.unansweredAnswerFieldCount).toBe(progress.totalAnswerFieldCount - 1);
  });

  it('derives elapsed time from timestamps and never exceeds the saved deadline', () => {
    const timing = {
      startedAt: '2026-08-03T00:00:00.000Z',
      deadlineAt: '2026-08-03T01:30:00.000Z',
    };

    expect(getB1MockElapsedSeconds(timing, new Date('2026-08-03T00:02:03.000Z'))).toBe(123);
    expect(getB1MockElapsedSeconds(timing, new Date('2026-08-03T02:00:00.000Z'))).toBe(5400);
    expect(
      getB1MockElapsedSeconds(
        { ...timing, submittedAt: '2026-08-03T00:15:04.000Z' },
        new Date('2026-08-03T01:00:00.000Z'),
      ),
    ).toBe(904);
    expect(formatB1MockElapsedTime(904)).toBe('15分04秒');
  });
});
