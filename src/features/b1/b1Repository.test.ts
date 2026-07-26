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
