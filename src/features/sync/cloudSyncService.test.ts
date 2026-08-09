import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, type A1DojoDatabase } from '../../database/database';
import type { QuestionProgressRow } from '../../database/types';
import { getSubjectCatalog } from '../../data/catalog';
import { b1Cases } from '../../data/b1';
import { defaultB1RelevanceFilter } from '../../domain/b1LearningSupport';
import type { Question } from '../../types/question';
import { LearningRepository } from '../learning/learningRepository';
import { B1Repository } from '../b1/b1Repository';
import { DataManagementRepository } from '../settings/dataManagementRepository';
import { CloudSyncLocalRepository, createCloudSyncMetadataRow } from './cloudSyncLocalRepository';
import { CloudSyncService } from './cloudSyncService';
import { CloudSyncGatewayError } from './types';
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
  upsertCount = 0;
  beforeUpsert?: (items: readonly CloudLearningSyncUpsert[]) => Promise<void>;

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
    this.upsertCount += 1;
    await this.beforeUpsert?.(items);
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

  it('オフラインのA-1・A-2変更をユーザー別outboxへ保存し、オンライン復帰後に一括送信して消去する', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);
    await service.synchronize({ userId, isOnline: false });

    await new LearningRepository(database, 'a1').setFavorite(
      a1Question.code,
      true,
      '2026-08-09T01:00:00.000Z',
    );
    await new LearningRepository(database, 'a2').setFavorite(
      a2Question.code,
      true,
      '2026-08-09T01:01:00.000Z',
    );

    expect(await database.cloudSyncOutbox.toArray()).toMatchObject([
      { userId, scope: 'a1.question', itemKey: a1Question.code, retryCount: 0 },
      { userId, scope: 'a2.question', itemKey: a2Question.code, retryCount: 0 },
    ]);

    const result = await service.synchronize({ userId, isOnline: true });

    expect(result).toMatchObject({ status: 'synchronized', uploadedCount: 2 });
    expect(gateway.upsertCount).toBe(1);
    await expect(database.cloudSyncOutbox.count()).resolves.toBe(0);
  });

  it('オフラインのB-1途中回答をautosaveとoutboxへ保存し、復帰後に最新回答を送信する', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);
    await service.synchronize({ userId, isOnline: false });
    const repository = new B1Repository(database);
    const session = await repository.createPractice(b1Cases[0], '2026-08-09T02:00:00.000Z');
    const answered = {
      ...session,
      answers: { [session.unitIds[0]]: { a: 'オフライン回答' } },
      updatedAt: '2026-08-09T02:01:00.000Z',
    };
    await repository.savePractice(answered, { previous: session });

    await expect(database.b1PracticeSessions.get(session.id)).resolves.toMatchObject({
      answers: { [session.unitIds[0]]: { a: 'オフライン回答' } },
    });
    expect(await database.cloudSyncOutbox.where('userId').equals(userId).toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId, scope: 'b1.answer' }),
        expect.objectContaining({ userId, scope: 'b1.progress' }),
      ]),
    );

    await service.synchronize({ userId, isOnline: true });

    expect(
      gateway.rows.some(
        (row) =>
          row.scope === 'b1.answer' && JSON.stringify(row.payload).includes('オフライン回答'),
      ),
    ).toBe(true);
    await expect(database.cloudSyncOutbox.count()).resolves.toBe(0);
  });

  it('一時失敗を永続化し、backoff中は自動送信せず、手動再試行の成功時だけ消去する', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);
    await service.synchronize({ userId, isOnline: false });
    await new LearningRepository(database, 'a1').setFavorite(
      a1Question.code,
      true,
      '2026-08-09T03:00:00.000Z',
    );
    gateway.upsertError = true;

    await expect(service.synchronize({ userId, isOnline: true })).rejects.toThrow('upsert failed');
    await expect(database.cloudSyncOutbox.toArray()).resolves.toMatchObject([
      {
        userId,
        retryCount: 1,
        failureKind: 'transient',
        nextRetryAt: '2026-08-09T00:00:03.000Z',
      },
    ]);

    const reloadedService = createService(database, gateway);
    const fetchCount = gateway.fetchCount;
    await expect(reloadedService.synchronize({ userId, isOnline: true })).resolves.toMatchObject({
      status: 'deferred',
      pendingCount: 1,
    });
    expect(gateway.fetchCount).toBe(fetchCount);

    gateway.upsertError = false;
    await reloadedService.synchronize({ userId, isOnline: true, force: true });
    await expect(database.cloudSyncOutbox.count()).resolves.toBe(0);
  });

  it('同一itemの変更を1件へcoalesceし、古いpending payloadではなく最新IndexedDB状態を送る', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);
    await service.synchronize({ userId, isOnline: false });
    const learning = new LearningRepository(database, 'a1');
    await learning.setFavorite(a1Question.code, true, '2026-08-09T04:00:00.000Z');
    await learning.setFavorite(a1Question.code, false, '2026-08-09T04:01:00.000Z');

    await expect(database.cloudSyncOutbox.count()).resolves.toBe(1);
    await expect(database.cloudSyncOutbox.toArray()).resolves.toMatchObject([
      { clientUpdatedAt: '2026-08-09T04:01:00.000Z', retryCount: 0 },
    ]);

    await service.synchronize({ userId, isOnline: true });
    expect((gateway.rows[0].payload as LearningSyncPayloadV1).progress).toMatchObject({
      favorite: false,
      updatedAt: '2026-08-09T04:01:00.000Z',
    });
  });

  it('同期中の新規変更では送信済み世代だけを消し、次回flush用pendingを残す', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);
    await service.synchronize({ userId, isOnline: false });
    const learning = new LearningRepository(database, 'a1');
    await learning.setFavorite(a1Question.code, true, '2026-08-09T05:00:00.000Z');
    let releaseUpsert: (() => void) | undefined;
    let notifyUpsertStarted: (() => void) | undefined;
    const upsertStarted = new Promise<void>((resolve) => {
      notifyUpsertStarted = resolve;
    });
    gateway.beforeUpsert = async () => {
      notifyUpsertStarted?.();
      await new Promise<void>((resolve) => {
        releaseUpsert = resolve;
      });
    };

    const firstSync = service.synchronize({ userId, isOnline: true });
    await upsertStarted;
    await learning.setFavorite(a1Question.code, false, '2026-08-09T05:01:00.000Z');
    releaseUpsert?.();
    await firstSync;

    await expect(database.cloudSyncOutbox.toArray()).resolves.toMatchObject([
      { clientUpdatedAt: '2026-08-09T05:01:00.000Z' },
    ]);
    gateway.beforeUpsert = undefined;
    await service.synchronize({ userId, isOnline: true });
    expect((gateway.rows[0].payload as LearningSyncPayloadV1).progress?.favorite).toBe(false);
    await expect(database.cloudSyncOutbox.count()).resolves.toBe(0);
  });

  it('同じユーザーの同期多重起動をsingle-flightにまとめる', async () => {
    const database = createTestDatabase();
    let releaseFetch: (() => void) | undefined;
    let notifyFetchStarted: (() => void) | undefined;
    const fetchStarted = new Promise<void>((resolve) => {
      notifyFetchStarted = resolve;
    });
    const gateway = new InMemoryCloudSyncGateway();
    const originalFetch = gateway.fetchItems.bind(gateway);
    gateway.fetchItems = async (requestedUserId: string) => {
      notifyFetchStarted?.();
      await new Promise<void>((resolve) => {
        releaseFetch = resolve;
      });
      return originalFetch(requestedUserId);
    };
    const service = createService(database, gateway);

    const first = service.synchronize({ userId, isOnline: true });
    await fetchStarted;
    const second = service.synchronize({ userId, isOnline: true });
    expect(second).toBe(first);
    releaseFetch?.();
    await Promise.all([first, second]);
    expect(gateway.fetchCount).toBe(1);
  });

  it('ログアウト中と別ユーザーではAのpendingを送らず、Aの再ログイン時だけ再送する', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryCloudSyncGateway();
    const service = createService(database, gateway);
    await service.synchronize({ userId: 'user-a', isOnline: false });
    await new LearningRepository(database, 'a1').setFavorite(
      a1Question.code,
      true,
      '2026-08-09T06:00:00.000Z',
    );
    service.deactivateUser('user-a');
    const fetchCount = gateway.fetchCount;

    await expect(service.synchronize({ isOnline: true })).resolves.toEqual({
      status: 'skipped_logged_out',
    });
    await expect(service.synchronize({ userId: 'user-b', isOnline: true })).rejects.toThrow(
      '別のアカウント',
    );
    expect(gateway.fetchCount).toBe(fetchCount);
    await expect(database.cloudSyncOutbox.toArray()).resolves.toMatchObject([{ userId: 'user-a' }]);

    await service.synchronize({ userId: 'user-a', isOnline: true });
    expect(gateway.rows).toHaveLength(1);
    expect(gateway.rows[0].userId).toBe('user-a');
    await expect(database.cloudSyncOutbox.count()).resolves.toBe(0);
  });

  it('401/403相当の認証エラーは自動retryせず、手動操作までpendingを保持する', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryCloudSyncGateway();
    gateway.beforeUpsert = async () => {
      throw new CloudSyncGatewayError('unauthorized', 'auth', '401');
    };
    const service = createService(database, gateway);
    await service.synchronize({ userId, isOnline: false });
    await new LearningRepository(database, 'a1').setFavorite(
      a1Question.code,
      true,
      '2026-08-09T07:00:00.000Z',
    );

    await expect(service.synchronize({ userId, isOnline: true })).rejects.toThrow('unauthorized');
    await expect(database.cloudSyncOutbox.toArray()).resolves.toMatchObject([
      { failureKind: 'auth', retryCount: 1, nextRetryAt: undefined },
    ]);
    const fetchCount = gateway.fetchCount;
    await expect(service.synchronize({ userId, isOnline: true })).resolves.toMatchObject({
      status: 'deferred',
      failedCount: 1,
    });
    expect(gateway.fetchCount).toBe(fetchCount);
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
