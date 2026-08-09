import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabase, type A1DojoDatabase } from '../../database/database';
import { b1Cases } from '../../data/b1';
import { B1Repository } from '../b1/b1Repository';
import { DataManagementRepository } from '../settings/dataManagementRepository';
import { CloudSyncLocalRepository } from './cloudSyncLocalRepository';
import { CloudSyncService } from './cloudSyncService';
import { DEVICE_ID_STORAGE_KEY } from './deviceId';
import { CLOUD_SYNC_NEEDED_EVENT } from './syncEvents';
import type {
  B1AnswerSyncPayloadV1,
  CloudLearningSyncItem,
  CloudLearningSyncUpsert,
  CloudSyncGateway,
} from './types';

const databaseNames: string[] = [];
const databases: A1DojoDatabase[] = [];
const userId = 'b1-user';
const caseItem = b1Cases[0];
const unit = caseItem.questionUnits[0];
const firstFieldId = unit.answerFields[0].fieldId;

class InMemoryGateway implements CloudSyncGateway {
  readonly rows: CloudLearningSyncItem[] = [];
  uploadedCount = 0;
  failFetch = false;
  failUpsert = false;

  async fetchItems(requestedUserId: string): Promise<readonly CloudLearningSyncItem[]> {
    if (this.failFetch) throw new Error('cloud fetch failed');
    return structuredClone(this.rows.filter((row) => row.userId === requestedUserId));
  }

  async upsertItems(items: readonly CloudLearningSyncUpsert[]): Promise<void> {
    if (this.failUpsert) throw new Error('cloud upsert failed');
    this.uploadedCount += items.length;
    for (const item of items) {
      const index = this.rows.findIndex(
        (row) =>
          row.userId === item.userId && row.scope === item.scope && row.itemKey === item.itemKey,
      );
      const row = structuredClone(item);
      if (index < 0) this.rows.push(row);
      else this.rows[index] = row;
    }
  }
}

afterEach(async () => {
  for (const database of databases.splice(0)) database.close();
  await Promise.all(databaseNames.splice(0).map((name) => indexedDB.deleteDatabase(name)));
  window.localStorage.removeItem(DEVICE_ID_STORAGE_KEY);
});

describe('B-1 cloud sync Phase 3', () => {
  it('connects B1Repository autosave through IndexedDB to bulk cloud upload', async () => {
    const database = createTestDatabase();
    const repository = new B1Repository(database);
    const gateway = new InMemoryGateway();
    const syncNeeded = vi.fn();
    window.addEventListener(CLOUD_SYNC_NEEDED_EVENT, syncNeeded);
    useDevice('device-local');
    const session = await repository.createPractice(caseItem, '2026-08-09T01:00:00.000Z');
    const answers = Object.fromEntries(
      unit.answerFields.map((field, index) => [field.fieldId, index === 0 ? '入力途中' : '']),
    );
    await repository.savePractice({
      ...session,
      answers: { [unit.questionId]: answers },
      currentIndex: Math.min(1, session.unitIds.length - 1),
      updatedAt: '2026-08-09T01:01:00.000Z',
    });

    const result = await createService(database, gateway, 'device-local').synchronize({
      userId,
      isOnline: true,
    });

    expect(result).toMatchObject({ status: 'synchronized', uploadedCount: 2 });
    expect(gateway.rows.map((row) => row.scope).sort()).toEqual(['b1.answer', 'b1.progress']);
    const answerRow = gateway.rows.find((row) => row.scope === 'b1.answer');
    expect(answerRow).toMatchObject({
      itemKey: `${session.id}:${unit.questionId}`,
      isDeleted: false,
    });
    expect((answerRow?.payload as B1AnswerSyncPayloadV1).answers).toEqual(answers);
    expect((answerRow?.payload as B1AnswerSyncPayloadV1).answers[firstFieldId]).toBe('入力途中');
    expect(gateway.rows.find((row) => row.scope === 'b1.progress')?.payload).toMatchObject({
      currentIndex: Math.min(1, session.unitIds.length - 1),
    });
    expect((syncNeeded.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({
      debounceMs: 1_500,
    });
    window.removeEventListener(CLOUD_SYNC_NEEDED_EVENT, syncNeeded);
  });

  it('uploads pre-Phase-3 IndexedDB history even when sync metadata does not exist yet', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryGateway();
    const repository = new B1Repository(database);
    const session = await repository.createPractice(caseItem, '2026-08-09T01:30:00.000Z');
    await database.cloudSyncMetadata.clear();
    await database.b1PracticeSessions.put({
      ...session,
      answers: { [unit.questionId]: { [firstFieldId]: '既存のローカル履歴' } },
      updatedAt: '2026-08-09T01:31:00.000Z',
    });

    await createService(database, gateway, 'device-legacy').synchronize({
      userId,
      isOnline: true,
    });

    expect(gateway.rows.map((row) => row.scope).sort()).toEqual(['b1.answer', 'b1.progress']);
    expect(
      (gateway.rows.find((row) => row.scope === 'b1.answer')?.payload as B1AnswerSyncPayloadV1)
        .answers[firstFieldId],
    ).toBe('既存のローカル履歴');
  });

  it('downloads a cloud-only B-1 answer and restores it through B1Repository', async () => {
    const source = createTestDatabase();
    const target = createTestDatabase();
    const gateway = new InMemoryGateway();
    useDevice('device-source');
    const sourceRepository = new B1Repository(source);
    const session = await sourceRepository.createPractice(caseItem, '2026-08-09T02:00:00.000Z');
    await sourceRepository.savePractice({
      ...session,
      answers: { [unit.questionId]: { [firstFieldId]: 'クラウドから復元する回答' } },
      currentIndex: Math.min(1, session.unitIds.length - 1),
      updatedAt: '2026-08-09T02:01:00.000Z',
    });
    await createService(source, gateway, 'device-source').synchronize({ userId, isOnline: true });

    useDevice('device-target');
    const result = await createService(target, gateway, 'device-target').synchronize({
      userId,
      isOnline: true,
    });
    const restored = await new B1Repository(target).getPractice(session.id);

    expect(result).toMatchObject({ status: 'synchronized', downloadedCount: 2 });
    expect(restored?.answers[unit.questionId]).toEqual({
      [firstFieldId]: 'クラウドから復元する回答',
    });
    expect(restored?.currentIndex).toBe(Math.min(1, session.unitIds.length - 1));
  });

  it('uses item-level LWW in both directions without coupling answers to currentIndex', async () => {
    const left = createTestDatabase();
    const right = createTestDatabase();
    const gateway = new InMemoryGateway();
    useDevice('device-left');
    const leftRepository = new B1Repository(left);
    const created = await leftRepository.createPractice(caseItem, '2026-08-09T03:00:00.000Z');
    await leftRepository.savePractice({
      ...created,
      answers: { [unit.questionId]: { [firstFieldId]: '最初の回答' } },
      updatedAt: '2026-08-09T03:01:00.000Z',
    });
    await createService(left, gateway, 'device-left').synchronize({ userId, isOnline: true });
    await createService(right, gateway, 'device-right').synchronize({ userId, isOnline: true });

    useDevice('device-right');
    const rightRepository = new B1Repository(right);
    const rightSession = await rightRepository.getPractice(created.id);
    if (rightSession === undefined) throw new Error('right session is required');
    await rightRepository.savePractice({
      ...rightSession,
      answers: { [unit.questionId]: { [firstFieldId]: 'クラウド側の新しい回答' } },
      updatedAt: '2026-08-09T03:03:00.000Z',
    });
    await createService(right, gateway, 'device-right').synchronize({ userId, isOnline: true });

    useDevice('device-left');
    const leftBeforeDownload = await leftRepository.getPractice(created.id);
    if (leftBeforeDownload === undefined) throw new Error('left session is required');
    await leftRepository.savePractice({
      ...leftBeforeDownload,
      currentIndex: Math.min(1, created.unitIds.length - 1),
      updatedAt: '2026-08-09T03:04:00.000Z',
    });
    await createService(left, gateway, 'device-left').synchronize({ userId, isOnline: true });
    const downloaded = await leftRepository.getPractice(created.id);

    expect(downloaded?.answers[unit.questionId]?.[firstFieldId]).toBe('クラウド側の新しい回答');
    expect(downloaded?.currentIndex).toBe(Math.min(1, created.unitIds.length - 1));

    if (downloaded === undefined) throw new Error('downloaded session is required');
    await leftRepository.savePractice({
      ...downloaded,
      answers: { [unit.questionId]: { [firstFieldId]: 'ローカル側の新しい回答' } },
      updatedAt: '2026-08-09T03:05:00.000Z',
    });
    await createService(left, gateway, 'device-left').synchronize({ userId, isOnline: true });
    expect(
      (gateway.rows.find((row) => row.scope === 'b1.answer')?.payload as B1AnswerSyncPayloadV1)
        .answers[firstFieldId],
    ).toBe('ローカル側の新しい回答');
  });

  it('resolves equal timestamps deterministically by device_id and remains idempotent', async () => {
    const left = createTestDatabase();
    const right = createTestDatabase();
    const gateway = new InMemoryGateway();
    useDevice('device-a');
    const leftRepository = new B1Repository(left);
    const session = await leftRepository.createPractice(caseItem, '2026-08-09T04:00:00.000Z');
    await createService(left, gateway, 'device-a').synchronize({ userId, isOnline: true });
    await createService(right, gateway, 'device-z').synchronize({ userId, isOnline: true });
    const sameTime = '2026-08-09T04:01:00.000Z';

    useDevice('device-a');
    await leftRepository.savePractice({
      ...(await requirePractice(leftRepository, session.id)),
      answers: { [unit.questionId]: { [firstFieldId]: 'device-a' } },
      updatedAt: sameTime,
    });
    useDevice('device-z');
    const rightRepository = new B1Repository(right);
    await rightRepository.savePractice({
      ...(await requirePractice(rightRepository, session.id)),
      answers: { [unit.questionId]: { [firstFieldId]: 'device-z' } },
      updatedAt: sameTime,
    });

    await createService(left, gateway, 'device-a').synchronize({ userId, isOnline: true });
    await createService(right, gateway, 'device-z').synchronize({ userId, isOnline: true });
    await createService(left, gateway, 'device-a').synchronize({ userId, isOnline: true });
    const stableCloudRows = structuredClone(gateway.rows);
    const uploadedCount = gateway.uploadedCount;
    await createService(left, gateway, 'device-a').synchronize({ userId, isOnline: true });

    expect((await requirePractice(leftRepository, session.id)).answers[unit.questionId]).toEqual({
      [firstFieldId]: 'device-z',
    });
    expect(gateway.rows).toEqual(stableCloudRows);
    expect(gateway.uploadedCount).toBe(uploadedCount);
  });

  it('keeps IndexedDB autosave successful when cloud access fails and skips cloud while logged out', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryGateway();
    const repository = new B1Repository(database);
    useDevice('device-offline');
    const session = await repository.createPractice(caseItem, '2026-08-09T05:00:00.000Z');
    await repository.savePractice({
      ...session,
      answers: { [unit.questionId]: { [firstFieldId]: 'オフラインでも残る' } },
      updatedAt: '2026-08-09T05:01:00.000Z',
    });
    gateway.failFetch = true;
    const service = createService(database, gateway, 'device-offline');

    await expect(service.synchronize({ userId, isOnline: true })).rejects.toThrow(
      'cloud fetch failed',
    );
    expect((await requirePractice(repository, session.id)).answers[unit.questionId]).toEqual({
      [firstFieldId]: 'オフラインでも残る',
    });
    gateway.failFetch = false;
    await expect(service.synchronize({ isOnline: true })).resolves.toEqual({
      status: 'skipped_logged_out',
    });
    expect(gateway.rows).toHaveLength(0);
  });

  it('rejects a different signed-in user before applying B-1 cloud data', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryGateway();
    const repository = new B1Repository(database);
    const session = await repository.createPractice(caseItem, '2026-08-09T05:30:00.000Z');
    await repository.savePractice({
      ...session,
      answers: { [unit.questionId]: { [firstFieldId]: 'user-aの回答' } },
      updatedAt: '2026-08-09T05:31:00.000Z',
    });
    const service = createService(database, gateway, 'device-user');
    await service.synchronize({ userId: 'user-a', isOnline: true });
    const fetchSnapshot = structuredClone(gateway.rows);

    await expect(service.synchronize({ userId: 'user-b', isOnline: true })).rejects.toThrow();

    expect(gateway.rows).toEqual(fetchSnapshot);
    expect((await requirePractice(repository, session.id)).answers[unit.questionId]).toEqual({
      [firstFieldId]: 'user-aの回答',
    });
  });

  it('uses tombstones on reset so old cloud answers do not return on another device', async () => {
    const source = createTestDatabase();
    const target = createTestDatabase();
    const gateway = new InMemoryGateway();
    useDevice('device-reset');
    const repository = new B1Repository(source);
    const session = await repository.createPractice(caseItem, '2026-08-09T06:00:00.000Z');
    await repository.savePractice({
      ...session,
      answers: { [unit.questionId]: { [firstFieldId]: '削除前の回答' } },
      updatedAt: '2026-08-09T06:01:00.000Z',
    });
    await createService(source, gateway, 'device-reset').synchronize({ userId, isOnline: true });
    await createService(target, gateway, 'device-target').synchronize({ userId, isOnline: true });
    await new DataManagementRepository(source).clearLearningData();
    await createService(source, gateway, 'device-reset').synchronize({ userId, isOnline: true });
    await createService(target, gateway, 'device-target').synchronize({ userId, isOnline: true });

    await expect(target.b1PracticeSessions.get(session.id)).resolves.toBeUndefined();
    expect(
      gateway.rows
        .filter((row) => row.scope === 'b1.answer' || row.scope === 'b1.progress')
        .every((row) => row.isDeleted),
    ).toBe(true);
  });

  it('uses the reset boundary to delete cloud-only sessions that this device never downloaded', async () => {
    const source = createTestDatabase();
    const resettingDevice = createTestDatabase();
    const gateway = new InMemoryGateway();
    const repository = new B1Repository(source);
    const session = await repository.createPractice(caseItem, '2026-08-09T06:30:00.000Z');
    await repository.savePractice({
      ...session,
      answers: { [unit.questionId]: { [firstFieldId]: '未取得のクラウド回答' } },
      updatedAt: '2026-08-09T06:31:00.000Z',
    });
    await createService(source, gateway, 'device-source').synchronize({ userId, isOnline: true });
    await expect(resettingDevice.b1PracticeSessions.count()).resolves.toBe(0);

    await new DataManagementRepository(resettingDevice).clearLearningData();
    await createService(resettingDevice, gateway, 'device-reset-empty').synchronize({
      userId,
      isOnline: true,
    });

    await expect(resettingDevice.b1PracticeSessions.count()).resolves.toBe(0);
    expect(
      gateway.rows
        .filter((row) => row.scope === 'b1.answer' || row.scope === 'b1.progress')
        .every((row) => row.isDeleted),
    ).toBe(true);
    expect(gateway.rows.find((row) => row.scope === 'b1.reset')).toMatchObject({
      itemKey: 'practice-sessions',
      isDeleted: false,
    });
  });

  it('keeps B-1 mock sessions outside Phase 3 scopes', async () => {
    const database = createTestDatabase();
    const gateway = new InMemoryGateway();
    const repository = new B1Repository(database);
    const caseIds = b1Cases
      .filter((item) => item.year === 2025)
      .slice(0, 2)
      .map((item) => item.caseId);
    await repository.createMock(2025, caseIds, '2026-08-09T07:00:00.000Z');

    await createService(database, gateway, 'device-mock').synchronize({ userId, isOnline: true });

    expect(gateway.rows).toHaveLength(0);
    await expect(database.b1MockSessions.count()).resolves.toBe(1);
  });
});

function createTestDatabase(): A1DojoDatabase {
  const name = `b1-cloud-sync-${crypto.randomUUID()}`;
  databaseNames.push(name);
  const database = createDatabase(name);
  databases.push(database);
  return database;
}

function createService(
  database: A1DojoDatabase,
  gateway: CloudSyncGateway,
  deviceId: string,
): CloudSyncService {
  return new CloudSyncService(
    new CloudSyncLocalRepository(
      database,
      () => deviceId,
      () => '2026-08-09T23:59:00.000Z',
    ),
    gateway,
    () => '2026-08-09T23:59:01.000Z',
  );
}

function useDevice(deviceId: string): void {
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
}

async function requirePractice(repository: B1Repository, id: string) {
  const session = await repository.getPractice(id);
  if (session === undefined) throw new Error('B-1 practice session is required');
  return session;
}
