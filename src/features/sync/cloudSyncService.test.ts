import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, type A1DojoDatabase } from '../../database/database';
import type { QuestionProgressRow } from '../../database/types';
import { getSubjectCatalog } from '../../data/catalog';
import { defaultB1RelevanceFilter } from '../../domain/b1LearningSupport';
import type { Question } from '../../types/question';
import { LearningRepository } from '../learning/learningRepository';
import { DataManagementRepository } from '../settings/dataManagementRepository';
import { CloudSyncLocalRepository, createCloudSyncMetadataRow } from './cloudSyncLocalRepository';
import { CloudSyncService } from './cloudSyncService';
import type {
  CloudLearningSyncItem,
  CloudLearningSyncUpsert,
  CloudSyncGateway,
  LearningSyncPayloadV1,
} from './types';

const databaseNames: string[] = [];
const openDatabases: A1DojoDatabase[] = [];
const a1Question = getSubjectCatalog('a1').questions[0];
const a2Question = getSubjectCatalog('a2').questions[0];
const userId = 'user-a';

class InMemoryCloudSyncGateway implements CloudSyncGateway {
  readonly rows: CloudLearningSyncItem[];
  fetchCount = 0;
  uploadedItemCount = 0;
  leakAllUsers = false;
  fetchError = false;
  upsertError = false;

  constructor(rows: readonly CloudLearningSyncItem[] = []) {
    this.rows = structuredClone(rows);
  }

  async fetchItems(requestedUserId: string): Promise<readonly CloudLearningSyncItem[]> {
    this.fetchCount += 1;
    if (this.fetchError) throw new Error('fetch failed');
    return structuredClone(
      this.leakAllUsers ? this.rows : this.rows.filter((item) => item.userId === requestedUserId),
    );
  }

  async upsertItems(items: readonly CloudLearningSyncUpsert[]): Promise<void> {
    if (this.upsertError) throw new Error('upsert failed');
    this.uploadedItemCount += items.length;
    for (const item of items) {
      const index = this.rows.findIndex(
        (row) =>
          row.userId === item.userId && row.scope === item.scope && row.itemKey === item.itemKey,
      );
      const next: CloudLearningSyncItem = structuredClone(item);
      if (index < 0) this.rows.push(next);
      else this.rows[index] = next;
    }
  }
}

afterEach(async () => {
  for (const database of openDatabases.splice(0)) database.close();
  await Promise.all(databaseNames.splice(0).map((name) => indexedDB.deleteDatabase(name)));
  window.localStorage.removeItem('nw-a1-dojo-device-id');
});

describe('A-1・A-2クラウド同期', () => {
  it('クラウドが空ならローカル履歴を正しいscopeでbulk uploadする', async () => {
    const database = createTestDatabase();
    await seedLocal(database, a1Question, '2026-08-08T01:00:00.000Z', 'device-a');
    await seedLocal(database, a2Question, '2026-08-08T02:00:00.000Z', 'device-a');
    const gateway = new InMemoryCloudSyncGateway();

    const result = await createService(database, gateway).synchronize({ userId, isOnline: true });

    expect(result).toMatchObject({ status: 'synchronized', uploadedCount: 2 });
    expect(gateway.uploadedItemCount).toBe(2);
    expect(gateway.rows.map((row) => [row.scope, row.itemKey])).toEqual([
      ['a1.question', a1Question.code],
      ['a2.question', a2Question.code],
    ]);
    expect(gateway.rows[0].payload).toMatchObject({
      progress: { attemptCount: 1, correctCount: 1, favorite: false },
      answerAttempts: [{ sessionId: `session-${a1Question.code}` }],
    });
  });

  it('ローカルが空ならクラウド履歴をIndexedDBへ反映する', async () => {
    const database = createTestDatabase();
    const remote = createCloudItem(a1Question, '2026-08-08T03:00:00.000Z', 'device-cloud');
    const gateway = new InMemoryCloudSyncGateway([remote]);

    const result = await createService(database, gateway).synchronize({ userId, isOnline: true });

    expect(result).toMatchObject({ status: 'synchronized', downloadedCount: 1 });
    await expect(database.questionProgress.get(a1Question.code)).resolves.toMatchObject({
      subjectId: 'a1',
      attemptCount: 1,
      lastChoice: a1Question.correctChoice,
    });
    await expect(
      database.answerAttempts.where('[subjectId+code]').equals(['a1', a1Question.code]).count(),
    ).resolves.toBe(1);
    await expect(database.learningDaysBySubject.get(['a1', '2026-08-08'])).resolves.toMatchObject({
      answerCount: 1,
    });
  });

  it('ローカルが新しい場合はクラウドへ反映する', async () => {
    const database = createTestDatabase();
    await seedLocal(database, a1Question, '2026-08-08T04:00:00.000Z', 'device-local');
    const gateway = new InMemoryCloudSyncGateway([
      createCloudItem(a1Question, '2026-08-08T03:00:00.000Z', 'device-cloud', false),
    ]);

    await createService(database, gateway).synchronize({ userId, isOnline: true });

    expect(gateway.rows[0].clientUpdatedAt).toBe('2026-08-08T04:00:00.000Z');
    expect((gateway.rows[0].payload as LearningSyncPayloadV1).progress?.lastIsCorrect).toBe(true);
  });

  it('クラウドが新しい場合はIndexedDBへ反映する', async () => {
    const database = createTestDatabase();
    await seedLocal(database, a1Question, '2026-08-08T03:00:00.000Z', 'device-local');
    const gateway = new InMemoryCloudSyncGateway([
      createCloudItem(a1Question, '2026-08-08T04:00:00.000Z', 'device-cloud', false),
    ]);

    await createService(database, gateway).synchronize({ userId, isOnline: true });

    await expect(database.questionProgress.get(a1Question.code)).resolves.toMatchObject({
      lastIsCorrect: false,
      correctCount: 0,
      incorrectCount: 1,
    });
  });

  it('同一日時はdeviceIdによるtie-breakで全端末が同じ結果になる', async () => {
    const database = createTestDatabase();
    const updatedAt = '2026-08-08T05:00:00.000Z';
    await seedLocal(database, a1Question, updatedAt, 'device-a', true);
    const gateway = new InMemoryCloudSyncGateway([
      createCloudItem(a1Question, updatedAt, 'device-z', false),
    ]);

    await createService(database, gateway).synchronize({ userId, isOnline: true });

    await expect(database.questionProgress.get(a1Question.code)).resolves.toMatchObject({
      lastIsCorrect: false,
    });
    await expect(
      database.cloudSyncMetadata.get(['a1.question', a1Question.code]),
    ).resolves.toMatchObject({
      deviceId: 'device-z',
    });
  });

  it('ログアウト中とオフライン中はクラウドへ接続しない', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);

    await expect(service.synchronize({ isOnline: true })).resolves.toEqual({
      status: 'skipped_logged_out',
    });
    await expect(service.synchronize({ userId, isOnline: false })).resolves.toEqual({
      status: 'skipped_offline',
    });
    expect(gateway.fetchCount).toBe(0);
  });

  it('オフラインやSupabaseエラーでも先に行ったIndexedDB保存は維持する', async () => {
    const database = createTestDatabase();
    const learning = new LearningRepository(database, 'a1');
    await learning.setFavorite(a1Question.code, true, '2026-08-08T06:00:00.000Z');
    const gateway = new InMemoryCloudSyncGateway();
    gateway.fetchError = true;

    await expect(
      createService(database, gateway).synchronize({ userId, isOnline: true }),
    ).rejects.toThrow('fetch failed');
    await expect(database.questionProgress.get(a1Question.code)).resolves.toMatchObject({
      favorite: true,
      attemptCount: 0,
    });
  });

  it('一方の科目をdownloadしても既存A-1/A-2履歴を消さない', async () => {
    const database = createTestDatabase();
    await seedLocal(database, a1Question, '2026-08-08T07:00:00.000Z', 'device-local');
    const anotherA2Question = getSubjectCatalog('a2').questions[1];
    await seedLocal(database, a2Question, '2026-08-08T07:00:00.000Z', 'device-local');
    const gateway = new InMemoryCloudSyncGateway([
      createCloudItem(anotherA2Question, '2026-08-08T08:00:00.000Z', 'device-cloud'),
    ]);

    await createService(database, gateway).synchronize({ userId, isOnline: true });

    await expect(database.questionProgress.get(a1Question.code)).resolves.toBeDefined();
    await expect(database.questionProgress.get(a2Question.code)).resolves.toBeDefined();
    await expect(database.questionProgress.get(anotherA2Question.code)).resolves.toBeDefined();
  });

  it('同期を2回実行しても学習データとクラウド行が変化しない', async () => {
    const database = createTestDatabase();
    await seedLocal(database, a1Question, '2026-08-08T09:00:00.000Z', 'device-local');
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);

    await service.synchronize({ userId, isOnline: true });
    const firstCloud = structuredClone(gateway.rows);
    const firstProgress = await database.questionProgress.toArray();
    const firstAttempts = await database.answerAttempts.toArray();
    await service.synchronize({ userId, isOnline: true });

    expect(gateway.rows).toEqual(firstCloud);
    expect(await database.questionProgress.toArray()).toEqual(firstProgress);
    expect(await database.answerAttempts.toArray()).toEqual(firstAttempts);
    expect(gateway.uploadedItemCount).toBe(1);
  });

  it('他ユーザーの行はgatewayから返されても適用しない', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryCloudSyncGateway([
      {
        ...createCloudItem(a1Question, '2026-08-08T10:00:00.000Z', 'device-other'),
        userId: 'user-b',
      },
    ]);
    gateway.leakAllUsers = true;

    await createService(database, gateway).synchronize({ userId, isOnline: true });

    await expect(database.questionProgress.count()).resolves.toBe(0);
  });

  it('別ユーザーへの切替時は同期を停止してデータを混在させない', async () => {
    const database = createTestDatabase();
    await seedLocal(database, a1Question, '2026-08-08T11:00:00.000Z', 'device-local');
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);
    await service.synchronize({ userId: 'user-a', isOnline: true });
    const fetchCount = gateway.fetchCount;

    await expect(service.synchronize({ userId: 'user-b', isOnline: true })).rejects.toThrow(
      '別のアカウント',
    );
    expect(gateway.fetchCount).toBe(fetchCount);
    await expect(database.questionProgress.get(a1Question.code)).resolves.toBeDefined();
  });

  it('A-1/A-2同期時にB-1ストアへ一切触れない', async () => {
    const database = createTestDatabase();
    const b1Preference = {
      key: 'b1-learning-preferences' as const,
      version: 1 as const,
      relevanceFilter: { ...defaultB1RelevanceFilter },
      updatedAt: '2026-08-08T12:00:00.000Z',
    };
    await database.b1Preferences.put(b1Preference);
    const gateway = new InMemoryCloudSyncGateway([
      createCloudItem(a1Question, '2026-08-08T12:00:00.000Z', 'device-cloud'),
    ]);

    await createService(database, gateway).synchronize({ userId, isOnline: true });

    await expect(database.b1Preferences.get('b1-learning-preferences')).resolves.toEqual(
      b1Preference,
    );
    expect(gateway.rows.every((row) => row.scope !== ('b1.question' as string))).toBe(true);
  });

  it('履歴リセットをtombstoneとして送り古いクラウド履歴を復活させない', async () => {
    const database = createTestDatabase();
    await seedLocal(database, a1Question, '2026-08-08T13:00:00.000Z', 'device-local');
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);
    await service.synchronize({ userId, isOnline: true });

    await new DataManagementRepository(database).clearLearningData();
    await service.synchronize({ userId, isOnline: true });

    await expect(database.questionProgress.get(a1Question.code)).resolves.toBeUndefined();
    const cloudRow = gateway.rows.find((row) => row.itemKey === a1Question.code);
    expect(cloudRow).toMatchObject({ isDeleted: true, scope: 'a1.question' });
    expect(cloudRow?.payload).toEqual({ progress: null, answerAttempts: [] });
  });
});

function createTestDatabase(): A1DojoDatabase {
  const name = `cloud-sync-${crypto.randomUUID()}`;
  databaseNames.push(name);
  const database = createDatabase(name);
  openDatabases.push(database);
  return database;
}

function createService(database: A1DojoDatabase, gateway: CloudSyncGateway): CloudSyncService {
  return new CloudSyncService(
    new CloudSyncLocalRepository(
      database,
      () => 'device-local',
      () => '2026-08-09T00:00:00.000Z',
    ),
    gateway,
    () => '2026-08-09T00:00:01.000Z',
  );
}

async function seedLocal(
  database: A1DojoDatabase,
  question: Question,
  updatedAt: string,
  deviceId: string,
  isCorrect = true,
): Promise<void> {
  const payload = createPayload(question, updatedAt, isCorrect);
  if (payload.progress === null) throw new Error('progress is required');
  await database.questionProgress.put(payload.progress);
  await database.answerAttempts.bulkAdd(payload.answerAttempts);
  await database.cloudSyncMetadata.put(
    createCloudSyncMetadataRow(question.subjectId, question.code, updatedAt, deviceId),
  );
}

function createCloudItem(
  question: Question,
  updatedAt: string,
  deviceId: string,
  isCorrect = true,
): CloudLearningSyncItem {
  return {
    userId,
    scope: question.subjectId === 'a1' ? 'a1.question' : 'a2.question',
    itemKey: question.code,
    schemaVersion: 1,
    payload: createPayload(question, updatedAt, isCorrect),
    clientUpdatedAt: updatedAt,
    deviceId,
    isDeleted: false,
  };
}

function createPayload(
  question: Question,
  updatedAt: string,
  isCorrect: boolean,
): LearningSyncPayloadV1 {
  if (question.subjectId === 'b1') throw new Error('B-1 is not supported');
  const selectedChoice = isCorrect
    ? question.correctChoice
    : (question.choices.find((choice) => choice.id !== question.correctChoice)?.id ?? 'A');
  const progress: QuestionProgressRow = {
    subjectId: question.subjectId,
    code: question.code,
    attemptCount: 1,
    correctCount: isCorrect ? 1 : 0,
    incorrectCount: isCorrect ? 0 : 1,
    firstAnsweredAt: updatedAt,
    lastChoice: selectedChoice,
    lastIsCorrect: isCorrect,
    lastAnsweredAt: updatedAt,
    favorite: false,
    updatedAt,
  };
  return {
    progress,
    answerAttempts: [
      {
        subjectId: question.subjectId,
        code: question.code,
        selectedChoice,
        correctChoice: question.correctChoice,
        isCorrect,
        answeredAt: updatedAt,
        mode: 'normal_practice',
        sessionId: `session-${question.code}`,
        version: 1,
      },
    ],
  };
}
