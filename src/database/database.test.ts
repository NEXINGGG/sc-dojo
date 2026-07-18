import Dexie from 'dexie';
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

  it('v2の学習データを保持したままv3へ更新できる', async () => {
    const name = `a1-dojo-v2-migration-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(2).stores({
      questionProgress: '&code, favorite, lastAnsweredAt, lastIsCorrect',
      answerAttempts: '++id, &[sessionId+code], code, sessionId, answeredAt, mode',
      practiceSessions: '&id, status, updatedAt',
      practiceResults: '&id, &sessionId, completedAt, mode',
      examSessions: '&id, status, updatedAt, deadlineAt',
      examResults: '&id, examSessionId, completedAt',
      learningDays: '&date, updatedAt',
      settings: '&key, updatedAt',
      metadata: '&key, updatedAt',
    });
    await legacy.open();
    await legacy.table('questionProgress').put({
      code: 'A1-001',
      attemptCount: 2,
      correctCount: 1,
      incorrectCount: 1,
      favorite: true,
      updatedAt: '2026-07-18T00:00:00.000Z',
    });
    await legacy.table('learningDays').put({
      date: '2026-07-18',
      answerCount: 2,
      updatedAt: '2026-07-18T00:00:00.000Z',
    });
    legacy.close();

    const upgraded = createDatabase(name);
    await initializeDatabase(upgraded);

    expect(upgraded.verno).toBe(3);
    await expect(upgraded.questionProgress.get('A1-001')).resolves.toMatchObject({
      favorite: true,
      attemptCount: 2,
    });
    await expect(upgraded.learningDays.get('2026-07-18')).resolves.toMatchObject({
      answerCount: 2,
    });
    upgraded.close();
  });
});
