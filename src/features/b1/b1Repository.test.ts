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
});
