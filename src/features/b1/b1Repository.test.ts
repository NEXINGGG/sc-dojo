import { afterEach, describe, expect, it } from 'vitest';
import { b1Cases } from '../../data/b1';
import { createDatabase, initializeDatabase, type A1DojoDatabase } from '../../database/database';
import { B1Repository } from './b1Repository';

const databaseNames: string[] = [];
const now = '2026-07-21T00:00:00.000Z';

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => indexedDB.deleteDatabase(name)));
});

function createTestDatabase(): A1DojoDatabase {
  const name = `b1-repository-${crypto.randomUUID()}`;
  databaseNames.push(name);
  return createDatabase(name);
}

describe('B1Repository', () => {
  it('stores a user-selected PDF locally and restores B-1 practice answers', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);
    const file = new File(['%PDF-1.7'], 'ipa-2025.pdf', { type: 'application/pdf' });

    await repository.savePdf(2025, file, now);
    await expect(repository.getPdf(2025)).resolves.toMatchObject({
      fileName: 'ipa-2025.pdf',
      size: file.size,
    });

    const session = await repository.createPractice(b1Cases[0], now);
    const saved = {
      ...session,
      answers: { [session.unitIds[0]]: { a: 'バックボーン' } },
      updatedAt: now,
    };
    await repository.savePractice(saved);
    await expect(repository.getPractice(session.id)).resolves.toMatchObject({
      answers: { [session.unitIds[0]]: { a: 'バックボーン' } },
    });
    database.close();
  });

  it('persists a confirmed multi-field answer and a later self-assessment change', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);
    const caseItem = b1Cases.find((item) =>
      item.questionUnits.some((unit) => unit.answerFields.length > 1),
    );
    if (caseItem === undefined) throw new Error('A multi-field B-1 case is required');
    const session = await repository.createPractice(caseItem, now);
    const unit = caseItem.questionUnits.find((item) => item.answerFields.length > 1);
    if (unit === undefined) throw new Error('A multi-field B-1 unit is required');
    const answers = Object.fromEntries(
      unit.answerFields.map((field) => [field.fieldId, '入力済み']),
    );
    const confirmedAt = '2026-07-21T00:01:00.000Z';

    await repository.savePractice({
      ...session,
      answers: { [unit.questionId]: answers },
      unitConfirmations: { [unit.questionId]: { answers, confirmedAt } },
      selfGrades: { [unit.questionId]: 'partial' },
      selfGradeUpdatedAt: { [unit.questionId]: confirmedAt },
      updatedAt: confirmedAt,
    });
    await expect(repository.getPractice(session.id)).resolves.toMatchObject({
      unitConfirmations: { [unit.questionId]: { answers, confirmedAt } },
      selfGrades: { [unit.questionId]: 'partial' },
      selfGradeUpdatedAt: { [unit.questionId]: confirmedAt },
    });

    const changedAt = '2026-07-21T00:02:00.000Z';
    const restored = await repository.getPractice(session.id);
    if (restored === undefined) throw new Error('The B-1 practice session must be restored');
    await repository.savePractice({
      ...restored,
      selfGrades: { ...restored.selfGrades, [unit.questionId]: 'incorrect' },
      selfGradeUpdatedAt: { ...restored.selfGradeUpdatedAt, [unit.questionId]: changedAt },
      updatedAt: changedAt,
    });

    await expect(repository.getProgressSummary()).resolves.toMatchObject({
      confirmedUnitCount: 1,
      partialSelfGrades: 0,
      incorrectSelfGrades: 1,
    });
    database.close();
  });

  it('creates a 90-minute mock from two distinct cases in one year', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);
    const session = await repository.createMock(2025, [b1Cases[0].caseId, b1Cases[1].caseId], now);

    expect(session.unitIds).not.toHaveLength(0);
    expect(new Date(session.deadlineAt).getTime() - new Date(session.startedAt).getTime()).toBe(
      90 * 60 * 1000,
    );
    database.close();
  });

  it('creates a mock from two added 2016 cases', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);
    const caseIds = b1Cases
      .filter((caseItem) => caseItem.year === 2016)
      .slice(0, 2)
      .map((caseItem) => caseItem.caseId);

    await expect(repository.createMock(2016, caseIds, now)).resolves.toMatchObject({
      year: 2016,
      caseIds,
    });
    database.close();
  });

  it('confirms only fully answered units when a mock is submitted', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);
    const session = await repository.createMock(2025, [b1Cases[0].caseId, b1Cases[1].caseId], now);
    const answeredUnit = b1Cases[0].questionUnits[0];
    const completeAnswer = Object.fromEntries(
      answeredUnit.answerFields.map((field) => [field.fieldId, '入力済み']),
    );
    await repository.saveMock({
      ...session,
      answers: { [answeredUnit.questionId]: completeAnswer },
      updatedAt: '2026-07-21T00:03:00.000Z',
    });

    const submitted = await repository.submitMock(session.id, 'manual', '2026-07-21T00:05:00.000Z');

    expect(submitted.status).toBe('submitted');
    expect(submitted.unitConfirmations?.[answeredUnit.questionId]).toEqual({
      answers: completeAnswer,
      confirmedAt: '2026-07-21T00:05:00.000Z',
    });
    expect(Object.keys(submitted.unitConfirmations ?? {})).toEqual([answeredUnit.questionId]);
    database.close();
  });

  it('migrates a previously submitted mock so completed answer fields remain confirmed', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);
    const session = await repository.createMock(2025, [b1Cases[0].caseId, b1Cases[1].caseId], now);
    const answeredUnit = b1Cases[0].questionUnits[0];
    const answers = Object.fromEntries(
      answeredUnit.answerFields.map((field) => [field.fieldId, '以前の回答']),
    );
    await database.b1MockSessions.put({
      ...session,
      status: 'submitted',
      answers: { [answeredUnit.questionId]: answers },
      unitConfirmations: {},
      submittedAt: '2026-07-21T00:05:00.000Z',
      submissionReason: 'manual',
      updatedAt: '2026-07-21T00:05:00.000Z',
    });

    await expect(repository.getMock(session.id)).resolves.toMatchObject({
      unitConfirmations: {
        [answeredUnit.questionId]: {
          answers,
          confirmedAt: '2026-07-21T00:05:00.000Z',
        },
      },
    });
    database.close();
  });

  it('can discard an in-progress mock and delete a completed mock without touching practice data', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);
    const practice = await repository.createPractice(b1Cases[2], now);
    const inProgress = await repository.createMock(
      2025,
      [b1Cases[0].caseId, b1Cases[1].caseId],
      now,
    );

    await repository.discardInProgressMock(inProgress.id);
    await expect(repository.getMock(inProgress.id)).resolves.toBeUndefined();
    await expect(repository.getPractice(practice.id)).resolves.toMatchObject({ id: practice.id });

    const session = await repository.createMock(2025, [b1Cases[0].caseId, b1Cases[1].caseId], now);
    const submitted = await repository.submitMock(session.id, 'manual', '2026-07-21T00:05:00.000Z');
    const selfGrades = Object.fromEntries(
      submitted.unitIds
        .map((questionId) => {
          const unit = b1Cases
            .flatMap((caseItem) => caseItem.questionUnits)
            .find((item) => item.questionId === questionId);
          return unit !== undefined && unit.grading.mode !== 'automatic'
            ? [questionId, 'incorrect']
            : [];
        })
        .filter((entry): entry is [string, 'incorrect'] => entry.length === 2),
    );
    const selfGradeUpdatedAt = Object.fromEntries(
      Object.keys(selfGrades).map((questionId) => [questionId, '2026-07-21T00:06:00.000Z']),
    );
    await repository.saveMock({
      ...submitted,
      selfGrades,
      selfGradeUpdatedAt,
      updatedAt: '2026-07-21T00:06:00.000Z',
    });
    const completed = await repository.completeMock(session.id, '2026-07-21T00:07:00.000Z');
    await repository.createAnswerAttempt({
      sessionId: completed.id,
      questionId: completed.unitIds[0],
      answers: {},
      now: '2026-07-21T00:07:00.000Z',
    });

    await repository.deleteCompletedMock(completed.id);
    await expect(repository.getMock(completed.id)).resolves.toBeUndefined();
    await expect(
      repository.listAnswerAttempts(completed.id, completed.unitIds[0]),
    ).resolves.toEqual([]);
    await expect(repository.getPractice(practice.id)).resolves.toMatchObject({ id: practice.id });
    database.close();
  });

  it('keeps mock90 and answer attempts separate from the original answer', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);
    const session = await repository.createPractice(b1Cases[0], 'practical', now);
    const questionId = session.unitIds[0];
    const first = await repository.createAnswerAttempt({
      sessionId: session.id,
      questionId,
      answers: { a: '初回答' },
      selfGrade: 'partial',
      failureCauseIds: ['knowledge_gap'],
      now,
    });
    const second = await repository.createAnswerAttempt({
      sessionId: session.id,
      questionId,
      answers: { a: '書き直し' },
      selfGrade: 'correct',
      remediationCompletedBefore: true,
      now: '2026-07-21T00:01:00.000Z',
    });

    expect(session.mode).toBe('practical');
    expect(second.attemptNumber).toBe(first.attemptNumber + 1);
    await expect(repository.listAnswerAttempts(session.id, questionId)).resolves.toMatchObject([
      { answers: { a: '初回答' }, selfGrade: 'partial' },
      { answers: { a: '書き直し' }, remediationCompletedBefore: true },
    ]);
    database.close();
  });

  it('migrates a saved grouped Phase 1 answer into its split official question units', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);
    const caseItem = b1Cases.find((item) => item.caseId === 'B1-2018-Q1');
    if (caseItem === undefined) throw new Error('B1-2018-Q1 is required for this test');
    const legacyQuestionId = 'B1-2018-Q1-U01';

    await database.b1PracticeSessions.put({
      id: 'b1-practice-legacy-phase1',
      subjectId: 'b1',
      version: 1,
      status: 'in_progress',
      caseId: caseItem.caseId,
      unitIds: [legacyQuestionId],
      answers: {
        [legacyQuestionId]: {
          forward: 'フォワード',
          id: '利用者ID',
          connect: 'CONNECTメソッド',
        },
      },
      selfGrades: { [legacyQuestionId]: 'correct' },
      reviewQuestionIds: [legacyQuestionId],
      currentIndex: 0,
      createdAt: now,
      updatedAt: now,
    });

    await expect(repository.getPractice('b1-practice-legacy-phase1')).resolves.toMatchObject({
      unitIds: caseItem.questionUnits.map((unit) => unit.questionId),
      answers: {
        'B1-2018-Q1-U01': { forward: 'フォワード' },
        'B1-2018-Q1-U02': { id: '利用者ID' },
        'B1-2018-Q1-U03': { connect: 'CONNECTメソッド' },
      },
      reviewQuestionIds: caseItem.questionUnits.map((unit) => unit.questionId),
    });
    database.close();
  });

  it('keeps PDF registrations separate for every added past-paper year', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1Repository(database);

    for (const year of [2016, 2017, 2018, 2019, 2021, 2022]) {
      const file = new File(['%PDF-1.7'], `ipa-${year}.pdf`, { type: 'application/pdf' });
      await repository.savePdf(year, file, now);
      await expect(repository.getPdf(year)).resolves.toMatchObject({ fileName: `ipa-${year}.pdf` });
    }
    await expect(repository.getPdf(2020)).resolves.toBeUndefined();
    database.close();
  });
});
