import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, DATABASE_VERSION, initializeDatabase } from './database';

const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map(async (name) => indexedDB.deleteDatabase(name)));
});

describe('A1DojoDatabase', () => {
  it('バージョン付きのテーブル定義を初期化できる', async () => {
    const name = `a1-dojo-test-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const database = createDatabase(name);

    await initializeDatabase(database);

    expect(database.verno).toBe(DATABASE_VERSION);
    expect(database.tables.map((table) => table.name)).toEqual([
      'questionProgress',
      'answerAttempts',
      'practiceSessions',
      'examSessions',
      'examResults',
      'learningDays',
      'settings',
      'metadata',
      'practiceResults',
    ]);

    database.close();
  });
});
