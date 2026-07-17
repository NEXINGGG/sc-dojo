import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../../database/database';
import { createPracticeSession, defaultPracticeFilters } from '../../domain/practice';
import {
  ActivePracticeSessionExistsError,
  PracticeSessionRepository,
} from './practiceSessionRepository';

const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(
    databaseNames.splice(0).map(async (name) => {
      indexedDB.deleteDatabase(name);
    }),
  );
});

describe('PracticeSessionRepository', () => {
  it('途中セッションを1件だけ保持し、置換できる', async () => {
    const name = `practice-repository-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const database = createDatabase(name);
    const repository = new PracticeSessionRepository(database);
    const first = createPracticeSession(['Q001'], defaultPracticeFilters, {
      id: 'first',
      now: '2026-07-17T00:00:00.000Z',
    });
    const replacement = createPracticeSession(['Q002'], defaultPracticeFilters, {
      id: 'replacement',
      now: '2026-07-17T00:01:00.000Z',
    });

    await repository.createInProgress(first);
    await expect(repository.createInProgress(replacement)).rejects.toBeInstanceOf(
      ActivePracticeSessionExistsError,
    );
    await repository.replaceInProgress(replacement);

    expect((await repository.getInProgress())?.id).toBe('replacement');
    expect(await repository.get('first')).toBeUndefined();
    database.close();
  });
});
