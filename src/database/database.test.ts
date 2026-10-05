import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, DATABASE_NAME, DATABASE_VERSION, initializeDatabase } from './database';

const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map(async (name) => indexedDB.deleteDatabase(name)));
});

describe('A1DojoDatabase', () => {
  it('SCは別DBを新規作成し、既存NWのDBバージョン・設定・進捗を変更しない', async () => {
    // These are fake-indexeddb databases in the test environment, not browser user data.
    const nw = new Dexie('a1-dojo');
    nw.version(1).stores({ questionProgress: '&code', settings: '&key' });
    databaseNames.push(nw.name, DATABASE_NAME);
    const progress = { code: 'A1-001', favorite: true, attemptCount: 5 };
    const settings = { key: 'appearance', theme: 'dark', selectedSubject: 'b1' };
    await nw.table('questionProgress').put(progress);
    await nw.table('settings').put(settings);
    const sc = createDatabase();
    try {
      expect(sc.name).toBe('sc-dojo');
      await initializeDatabase(sc);
      await expect(sc.questionProgress.count()).resolves.toBe(0);
      await expect(sc.settings.get('appearance')).resolves.toBeUndefined();
      await sc.questionProgress.put({
        subjectId: 'a1',
        code: 'A1-001',
        favorite: false,
        attemptCount: 1,
        correctCount: 1,
        incorrectCount: 0,
        updatedAt: '2026-10-05T00:00:00.000Z',
      });
      expect(nw.verno).toBe(1);
      await expect(nw.table('questionProgress').get('A1-001')).resolves.toEqual(progress);
      await expect(nw.table('settings').get('appearance')).resolves.toEqual(settings);
    } finally {
      sc.close();
      nw.close();
    }
  });

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
      'learningDaysBySubject',
      'b1PdfFiles',
      'b1PracticeSessions',
      'b1MockSessions',
      'b1LearnerEvidence',
      'b1LearningReflections',
      'b1RemediationProgress',
      'b1AnswerAttempts',
      'b1Preferences',
      'cloudSyncMetadata',
      'cloudSyncState',
      'cloudSyncOutbox',
    ]);

    database.close();
  });

  it('v2の学習データを保持したままv4へ更新できる', async () => {
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
    await legacy.table('settings').put({
      key: 'appearance',
      theme: 'dark',
      fontSize: 'large',
      shuffleChoices: true,
      updatedAt: '2026-07-18T00:00:00.000Z',
    });
    legacy.close();

    const upgraded = createDatabase(name);
    await initializeDatabase(upgraded);

    expect(upgraded.verno).toBe(DATABASE_VERSION);
    await expect(upgraded.questionProgress.get('A1-001')).resolves.toMatchObject({
      favorite: true,
      attemptCount: 2,
    });
    await expect(upgraded.learningDays.get('2026-07-18')).resolves.toMatchObject({
      answerCount: 2,
    });
    await expect(upgraded.learningDaysBySubject.get(['a1', '2026-07-18'])).resolves.toMatchObject({
      subjectId: 'a1',
      answerCount: 2,
    });
    await expect(upgraded.settings.get('appearance')).resolves.toMatchObject({
      theme: 'dark',
      fontSize: 'large',
      reducedMotion: 'system',
      shuffleChoices: true,
      selectedSubject: 'a1',
    });
    await expect(upgraded.b1PdfFiles.count()).resolves.toBe(0);
    await expect(upgraded.b1PracticeSessions.count()).resolves.toBe(0);
    await expect(upgraded.b1MockSessions.count()).resolves.toBe(0);
    await expect(upgraded.b1LearnerEvidence.count()).resolves.toBe(0);
    await expect(upgraded.b1LearningReflections.count()).resolves.toBe(0);
    await expect(upgraded.b1RemediationProgress.count()).resolves.toBe(0);
    upgraded.close();
  });

  it('v7のB-1保存データを保持したままPhase 2テーブルを追加できる', async () => {
    const name = `a1-dojo-v7-migration-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(7).stores({
      b1PdfFiles: '&year, subjectId, updatedAt',
      b1PracticeSessions:
        '&id, &[subjectId+id], [subjectId+status], subjectId, status, caseId, updatedAt',
      b1MockSessions:
        '&id, &[subjectId+id], [subjectId+status], subjectId, status, year, updatedAt, deadlineAt',
    });
    await legacy.open();
    await legacy.table('b1PracticeSessions').put({
      id: 'b1-v7-practice',
      subjectId: 'b1',
      version: 1,
      status: 'in_progress',
      caseId: 'B1-2025-Q1',
      unitIds: ['B1-2025-Q1-U01'],
      answers: {},
      selfGrades: {},
      reviewQuestionIds: [],
      currentIndex: 0,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    legacy.close();

    const upgraded = createDatabase(name);
    await initializeDatabase(upgraded);

    await expect(upgraded.b1PracticeSessions.get('b1-v7-practice')).resolves.toMatchObject({
      caseId: 'B1-2025-Q1',
    });
    await expect(upgraded.b1LearnerEvidence.count()).resolves.toBe(0);
    upgraded.close();
  });

  it('v8の根拠記録を保持したまま、Phase 3で複数根拠を登録できる', async () => {
    const name = `a1-dojo-v8-migration-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(8).stores({
      b1LearnerEvidence: '&id, &[sessionId+questionId], sessionId, questionId, updatedAt',
    });
    await legacy.open();
    await legacy.table('b1LearnerEvidence').put({
      id: 'legacy-evidence',
      version: 1,
      sessionId: 'b1-session',
      questionId: 'B1-2025-Q1-U01',
      note: '既存根拠',
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: '2026-07-18T00:00:00.000Z',
    });
    legacy.close();

    const upgraded = createDatabase(name);
    await initializeDatabase(upgraded);
    await upgraded.b1LearnerEvidence.put({
      id: 'new-evidence',
      version: 2,
      sessionId: 'b1-session',
      questionId: 'B1-2025-Q1-U01',
      sourceType: 'figure',
      printedPage: 2,
      note: '新しい根拠',
      createdAt: '2026-07-18T00:01:00.000Z',
      updatedAt: '2026-07-18T00:01:00.000Z',
    });

    await expect(
      upgraded.b1LearnerEvidence
        .where('[sessionId+questionId]')
        .equals(['b1-session', 'B1-2025-Q1-U01'])
        .count(),
    ).resolves.toBe(2);
    upgraded.close();
  });

  it('v9のB-1回答を残したまま、Phase 4の確定・自己評価データを初期化する', async () => {
    const name = `a1-dojo-v9-migration-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(9).stores({
      b1PracticeSessions:
        '&id, &[subjectId+id], [subjectId+status], subjectId, status, caseId, updatedAt',
      b1MockSessions:
        '&id, &[subjectId+id], [subjectId+status], subjectId, status, year, updatedAt, deadlineAt',
    });
    await legacy.open();
    await legacy.table('b1PracticeSessions').put({
      id: 'b1-v9-practice',
      subjectId: 'b1',
      version: 2,
      status: 'in_progress',
      mode: 'training',
      caseId: 'B1-2025-Q1',
      unitIds: ['B1-2025-Q1-U01'],
      answers: { 'B1-2025-Q1-U01': { a: '旧データの回答' } },
      selfGrades: { 'B1-2025-Q1-U01': 'partial' },
      reviewQuestionIds: [],
      requirementDisclosureQuestionIds: [],
      attemptIdsByQuestion: {},
      currentIndex: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });
    legacy.close();

    const upgraded = createDatabase(name);
    await initializeDatabase(upgraded);
    await expect(upgraded.b1PracticeSessions.get('b1-v9-practice')).resolves.toMatchObject({
      version: 3,
      answers: { 'B1-2025-Q1-U01': { a: '旧データの回答' } },
      unitConfirmations: {},
      selfGradeUpdatedAt: {},
    });
    upgraded.close();
  });

  it('v11のA-1・B-1・同期metadataを保持したままPhase 4 outboxを追加する', async () => {
    const name = `a1-dojo-v11-cloud-outbox-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(11).stores({
      questionProgress:
        '&code, &[subjectId+code], subjectId, favorite, lastAnsweredAt, lastIsCorrect',
      b1PracticeSessions:
        '&id, &[subjectId+id], [subjectId+status], subjectId, status, caseId, updatedAt',
      cloudSyncMetadata: '&[scope+itemKey], scope, itemKey, clientUpdatedAt, isDeleted',
      cloudSyncState: '&key, ownerUserId, updatedAt',
    });
    await legacy.open();
    await legacy.table('questionProgress').put({
      subjectId: 'a1',
      code: 'A1-001',
      attemptCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      favorite: true,
      updatedAt: '2026-08-09T00:00:00.000Z',
    });
    await legacy.table('b1PracticeSessions').put({
      id: 'b1-v11-practice',
      subjectId: 'b1',
      version: 3,
      status: 'in_progress',
      mode: 'training',
      caseId: 'B1-2025-Q1',
      unitIds: ['B1-2025-Q1-U01'],
      answers: { 'B1-2025-Q1-U01': { a: '既存回答' } },
      unitConfirmations: {},
      selfGrades: {},
      selfGradeUpdatedAt: {},
      reviewQuestionIds: [],
      requirementDisclosureQuestionIds: [],
      attemptIdsByQuestion: {},
      currentIndex: 0,
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    });
    await legacy.table('cloudSyncMetadata').put({
      scope: 'a1.question',
      itemKey: 'A1-001',
      clientUpdatedAt: '2026-08-09T00:00:00.000Z',
      deviceId: 'device-a',
      isDeleted: false,
    });
    await legacy.table('cloudSyncState').put({
      key: 'cloud-sync',
      ownerUserId: 'user-a',
      lastSuccessfulSyncAt: '2026-08-08T00:00:00.000Z',
      updatedAt: '2026-08-08T00:00:00.000Z',
    });
    legacy.close();

    const upgraded = createDatabase(name);
    await initializeDatabase(upgraded);

    expect(upgraded.verno).toBe(DATABASE_VERSION);
    await expect(upgraded.questionProgress.get('A1-001')).resolves.toMatchObject({
      favorite: true,
    });
    await expect(upgraded.b1PracticeSessions.get('b1-v11-practice')).resolves.toMatchObject({
      answers: { 'B1-2025-Q1-U01': { a: '既存回答' } },
    });
    await expect(upgraded.cloudSyncMetadata.get(['a1.question', 'A1-001'])).resolves.toMatchObject({
      deviceId: 'device-a',
    });
    await expect(upgraded.cloudSyncState.get('cloud-sync')).resolves.toMatchObject({
      ownerUserId: 'user-a',
    });
    await expect(upgraded.cloudSyncOutbox.count()).resolves.toBe(0);
    upgraded.close();
  });
});
