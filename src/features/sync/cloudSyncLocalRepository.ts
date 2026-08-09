import type { A1DojoDatabase } from '../../database/database';
import type {
  AnswerAttemptRow,
  CloudSyncMetadataRow,
  CloudSyncScope,
  CloudSyncStateRow,
  LearningDayRow,
  QuestionProgressRow,
} from '../../database/types';
import { getQuestionByCode } from '../../data/catalog';
import { getAsiaTokyoDate } from '../../domain/learning';
import type { SubjectId } from '../../domain/subject';
import { getDeviceId } from './deviceId';
import {
  CLOUD_SYNC_SCHEMA_VERSION,
  CLOUD_SYNC_SCOPES,
  type CloudLearningSyncItem,
  type CloudLearningSyncUpsert,
  type LearningSyncItem,
  type LearningSyncPayloadV1,
  type SyncedAnswerAttempt,
} from './types';

const answerSources = new Set<AnswerAttemptRow['mode']>([
  'normal_practice',
  'review_unanswered',
  'review_incorrect',
  'review_favorite',
  'exam',
  'mock_exam_fixed_1',
  'mock_exam_fixed_2',
  'mock_exam_random',
]);

export interface CloudSyncMergeResult {
  uploads: readonly CloudLearningSyncUpsert[];
  downloadedCount: number;
}

export class CloudSyncUserMismatchError extends Error {
  constructor(
    readonly ownerUserId: string,
    readonly requestedUserId: string,
  ) {
    super('この端末には別のアカウントで同期した学習データがあります。');
    this.name = 'CloudSyncUserMismatchError';
  }
}

export class InvalidCloudSyncDataError extends Error {
  constructor() {
    super('クラウド上の学習データ形式を確認できませんでした。');
    this.name = 'InvalidCloudSyncDataError';
  }
}

export class CloudSyncLocalRepository {
  constructor(
    private readonly database: A1DojoDatabase,
    private readonly resolveDeviceId: () => string = getDeviceId,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async getState(): Promise<CloudSyncStateRow | undefined> {
    await this.database.open();
    return this.database.cloudSyncState.get('cloud-sync');
  }

  async assertUserCanSync(userId: string): Promise<void> {
    const state = await this.getState();
    if (state?.ownerUserId !== undefined && state.ownerUserId !== userId) {
      throw new CloudSyncUserMismatchError(state.ownerUserId, userId);
    }
  }

  async mergeRemoteItems(
    userId: string,
    remoteItems: readonly CloudLearningSyncItem[],
  ): Promise<CloudSyncMergeResult> {
    const normalizedRemote = normalizeRemoteItems(remoteItems, userId);
    await this.database.open();

    return this.database.transaction(
      'rw',
      [
        this.database.questionProgress,
        this.database.answerAttempts,
        this.database.learningDays,
        this.database.learningDaysBySubject,
        this.database.cloudSyncMetadata,
        this.database.cloudSyncState,
      ],
      async () => {
        const state = await this.database.cloudSyncState.get('cloud-sync');
        if (state?.ownerUserId !== undefined && state.ownerUserId !== userId) {
          throw new CloudSyncUserMismatchError(state.ownerUserId, userId);
        }

        const localItems = await this.readLocalItems();
        const localByKey = new Map(localItems.map((item) => [syncKey(item), item]));
        const remoteByKey = new Map(normalizedRemote.map((item) => [syncKey(item), item]));
        const keys = new Set([...localByKey.keys(), ...remoteByKey.keys()]);
        const uploads: CloudLearningSyncUpsert[] = [];
        const downloads: LearningSyncItem[] = [];

        for (const key of [...keys].sort()) {
          const local = localByKey.get(key);
          const remote = remoteByKey.get(key);
          if (local === undefined && remote !== undefined) {
            downloads.push(remote);
          } else if (local !== undefined && remote === undefined) {
            uploads.push({ ...local, userId });
          } else if (local !== undefined && remote !== undefined) {
            const comparison = compareSyncItems(local, remote);
            if (comparison > 0) {
              uploads.push({ ...local, userId });
            } else if (comparison < 0) {
              downloads.push(remote);
            }
          }
        }

        if (downloads.length > 0) {
          for (const item of downloads) {
            await this.applyRemoteItem(item);
          }
          await this.rebuildLearningDays();
        }

        const claimedAt = this.now();
        await this.database.cloudSyncState.put({
          key: 'cloud-sync',
          ownerUserId: userId,
          lastSuccessfulSyncAt: state?.lastSuccessfulSyncAt,
          updatedAt: claimedAt,
        });

        return { uploads, downloadedCount: downloads.length };
      },
    );
  }

  async recordSuccessfulSync(userId: string, completedAt: string): Promise<void> {
    await this.database.open();
    await this.database.transaction('rw', this.database.cloudSyncState, async () => {
      const state = await this.database.cloudSyncState.get('cloud-sync');
      if (state?.ownerUserId !== undefined && state.ownerUserId !== userId) {
        throw new CloudSyncUserMismatchError(state.ownerUserId, userId);
      }
      await this.database.cloudSyncState.put({
        key: 'cloud-sync',
        ownerUserId: userId,
        lastSuccessfulSyncAt: completedAt,
        updatedAt: completedAt,
      });
    });
  }

  private async readLocalItems(): Promise<LearningSyncItem[]> {
    const [progressRows, attemptRows, metadataRows] = await Promise.all([
      this.database.questionProgress.toArray(),
      this.database.answerAttempts.toArray(),
      this.database.cloudSyncMetadata.toArray(),
    ]);
    const deviceId = this.resolveDeviceId();
    const progressByKey = new Map<string, QuestionProgressRow>();
    const attemptsByKey = new Map<string, SyncedAnswerAttempt[]>();
    const metadataByKey = new Map(
      metadataRows.map((row) => [metadataKey(row.scope, row.itemKey), row]),
    );

    for (const progress of progressRows) {
      const scope = getCloudSyncScope(progress.subjectId);
      if (scope !== undefined) {
        progressByKey.set(metadataKey(scope, progress.code), progress);
      }
    }
    for (const attempt of attemptRows) {
      const scope = getCloudSyncScope(attempt.subjectId);
      if (scope === undefined) continue;
      const key = metadataKey(scope, attempt.code);
      const syncedAttempt: SyncedAnswerAttempt = {
        subjectId: attempt.subjectId,
        code: attempt.code,
        selectedChoice: attempt.selectedChoice,
        correctChoice: attempt.correctChoice,
        isCorrect: attempt.isCorrect,
        answeredAt: attempt.answeredAt,
        mode: attempt.mode,
        sessionId: attempt.sessionId,
        version: attempt.version,
      };
      const attempts = attemptsByKey.get(key) ?? [];
      attempts.push(syncedAttempt);
      attemptsByKey.set(key, attempts);
    }

    const items: LearningSyncItem[] = [];
    for (const [key, progress] of progressByKey) {
      const scope = getCloudSyncScope(progress.subjectId);
      if (scope === undefined) continue;
      let metadata = metadataByKey.get(key);
      if (
        metadata === undefined ||
        metadata.clientUpdatedAt.localeCompare(progress.updatedAt) < 0
      ) {
        metadata = createCloudSyncMetadataRow(
          progress.subjectId,
          progress.code,
          progress.updatedAt,
          deviceId,
          false,
        );
        await this.database.cloudSyncMetadata.put(metadata);
        metadataByKey.set(key, metadata);
      }

      if (metadata.isDeleted) {
        items.push(createTombstoneItem(metadata));
        continue;
      }

      const answerAttempts = (attemptsByKey.get(key) ?? []).sort(compareAttempts);
      items.push({
        scope,
        itemKey: progress.code,
        schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
        payload: { progress: { ...progress }, answerAttempts },
        clientUpdatedAt: metadata.clientUpdatedAt,
        deviceId: metadata.deviceId,
        isDeleted: false,
      });
    }

    for (const metadata of metadataRows) {
      const key = metadataKey(metadata.scope, metadata.itemKey);
      if (progressByKey.has(key)) continue;
      if (!metadata.isDeleted) {
        const tombstone: CloudSyncMetadataRow = {
          ...metadata,
          clientUpdatedAt: this.now(),
          deviceId,
          isDeleted: true,
        };
        await this.database.cloudSyncMetadata.put(tombstone);
        items.push(createTombstoneItem(tombstone));
      } else {
        items.push(createTombstoneItem(metadata));
      }
    }

    return items;
  }

  private async applyRemoteItem(item: LearningSyncItem): Promise<void> {
    const subjectId = getSubjectForScope(item.scope);
    await this.database.answerAttempts
      .where('[subjectId+code]')
      .equals([subjectId, item.itemKey])
      .delete();

    if (item.isDeleted || item.payload.progress === null) {
      await this.database.questionProgress
        .where('[subjectId+code]')
        .equals([subjectId, item.itemKey])
        .delete();
    } else {
      await this.database.questionProgress.put(item.payload.progress);
      if (item.payload.answerAttempts.length > 0) {
        await this.database.answerAttempts.bulkAdd(item.payload.answerAttempts);
      }
    }

    await this.database.cloudSyncMetadata.put({
      scope: item.scope,
      itemKey: item.itemKey,
      clientUpdatedAt: item.clientUpdatedAt,
      deviceId: item.deviceId,
      isDeleted: item.isDeleted,
    });
  }

  private async rebuildLearningDays(): Promise<void> {
    const attempts = (await this.database.answerAttempts.toArray()).filter(
      (attempt) => getCloudSyncScope(attempt.subjectId) !== undefined,
    );
    const days = new Map<string, LearningDayRow>();
    for (const attempt of attempts) {
      const date = getAsiaTokyoDate(new Date(attempt.answeredAt));
      const key = `${attempt.subjectId}:${date}`;
      const current = days.get(key);
      days.set(key, {
        subjectId: attempt.subjectId,
        date,
        answerCount: (current?.answerCount ?? 0) + 1,
        updatedAt:
          current === undefined || current.updatedAt.localeCompare(attempt.answeredAt) < 0
            ? attempt.answeredAt
            : current.updatedAt,
      });
    }

    await this.database.learningDaysBySubject.where('subjectId').anyOf('a1', 'a2').delete();
    await this.database.learningDays.clear();
    const rows = [...days.values()];
    if (rows.length > 0) {
      await this.database.learningDaysBySubject.bulkPut(rows);
      await this.database.learningDays.bulkPut(rows.filter((row) => row.subjectId === 'a1'));
    }
  }
}

export function getCloudSyncScope(subjectId: SubjectId): CloudSyncScope | undefined {
  return subjectId === 'a1' ? 'a1.question' : subjectId === 'a2' ? 'a2.question' : undefined;
}

export function createCloudSyncMetadataRow(
  subjectId: SubjectId,
  code: string,
  clientUpdatedAt: string,
  deviceId = getDeviceId(),
  isDeleted = false,
): CloudSyncMetadataRow {
  const scope = getCloudSyncScope(subjectId);
  if (scope === undefined) {
    throw new Error('B-1はPhase 2のクラウド同期対象ではありません。');
  }
  return { scope, itemKey: code, clientUpdatedAt, deviceId, isDeleted };
}

export async function markQuestionForCloudSync(
  database: A1DojoDatabase,
  subjectId: SubjectId,
  code: string,
  clientUpdatedAt: string,
): Promise<void> {
  const scope = getCloudSyncScope(subjectId);
  if (scope === undefined) return;
  await database.cloudSyncMetadata.put(
    createCloudSyncMetadataRow(subjectId, code, clientUpdatedAt, getDeviceId(), false),
  );
}

export function compareSyncItems(left: LearningSyncItem, right: LearningSyncItem): number {
  const leftTime = new Date(left.clientUpdatedAt).getTime();
  const rightTime = new Date(right.clientUpdatedAt).getTime();
  if (leftTime !== rightTime) {
    return leftTime < rightTime ? -1 : 1;
  }
  return left.deviceId.localeCompare(right.deviceId);
}

function normalizeRemoteItems(
  items: readonly CloudLearningSyncItem[],
  userId: string,
): LearningSyncItem[] {
  const normalized: LearningSyncItem[] = [];
  const keys = new Set<string>();
  for (const item of items) {
    if (item.userId !== userId || !CLOUD_SYNC_SCOPES.includes(item.scope)) continue;
    if (
      item.schemaVersion !== CLOUD_SYNC_SCHEMA_VERSION ||
      !isIsoDate(item.clientUpdatedAt) ||
      typeof item.deviceId !== 'string' ||
      item.deviceId.trim() === '' ||
      typeof item.isDeleted !== 'boolean'
    ) {
      throw new InvalidCloudSyncDataError();
    }

    const subjectId = getSubjectForScope(item.scope);
    const question = getQuestionByCode(item.itemKey, subjectId);
    if (question === undefined) {
      throw new InvalidCloudSyncDataError();
    }
    const key = metadataKey(item.scope, item.itemKey);
    if (keys.has(key)) {
      throw new InvalidCloudSyncDataError();
    }
    keys.add(key);

    normalized.push({
      scope: item.scope,
      itemKey: item.itemKey,
      schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
      payload: item.isDeleted
        ? { progress: null, answerAttempts: [] }
        : parsePayload(item.payload, subjectId, item.itemKey),
      clientUpdatedAt: item.clientUpdatedAt,
      deviceId: item.deviceId,
      isDeleted: item.isDeleted,
    });
  }
  return normalized;
}

function parsePayload(value: unknown, subjectId: 'a1' | 'a2', code: string): LearningSyncPayloadV1 {
  if (!isRecord(value) || !isRecord(value.progress) || !Array.isArray(value.answerAttempts)) {
    throw new InvalidCloudSyncDataError();
  }
  const progress = parseProgress(value.progress, subjectId, code);
  const answerAttempts = value.answerAttempts.map((attempt) =>
    parseAttempt(attempt, subjectId, code),
  );
  const sessionKeys = new Set(answerAttempts.map((attempt) => attempt.sessionId));
  const correctCount = answerAttempts.filter((attempt) => attempt.isCorrect).length;
  if (
    sessionKeys.size !== answerAttempts.length ||
    progress.attemptCount !== answerAttempts.length ||
    progress.correctCount !== correctCount ||
    progress.incorrectCount !== answerAttempts.length - correctCount
  ) {
    throw new InvalidCloudSyncDataError();
  }
  return { progress, answerAttempts: answerAttempts.sort(compareAttempts) };
}

function parseProgress(
  value: Record<string, unknown>,
  subjectId: 'a1' | 'a2',
  code: string,
): QuestionProgressRow {
  if (
    value.subjectId !== subjectId ||
    value.code !== code ||
    !isNonNegativeInteger(value.attemptCount) ||
    !isNonNegativeInteger(value.correctCount) ||
    !isNonNegativeInteger(value.incorrectCount) ||
    value.attemptCount !== value.correctCount + value.incorrectCount ||
    typeof value.favorite !== 'boolean' ||
    !isIsoDate(value.updatedAt) ||
    !isOptionalIsoDate(value.firstAnsweredAt) ||
    !isOptionalIsoDate(value.lastAnsweredAt) ||
    !isOptionalIsoDate(value.favoriteAt) ||
    (value.lastIsCorrect !== undefined && typeof value.lastIsCorrect !== 'boolean')
  ) {
    throw new InvalidCloudSyncDataError();
  }
  const question = getQuestionByCode(code, subjectId);
  if (
    question === undefined ||
    (value.lastChoice !== undefined &&
      !question.choices.some((choice) => choice.id === value.lastChoice))
  ) {
    throw new InvalidCloudSyncDataError();
  }
  return {
    subjectId,
    code,
    attemptCount: value.attemptCount,
    correctCount: value.correctCount,
    incorrectCount: value.incorrectCount,
    firstAnsweredAt: value.firstAnsweredAt,
    lastChoice: value.lastChoice,
    lastIsCorrect: value.lastIsCorrect,
    lastAnsweredAt: value.lastAnsweredAt,
    favorite: value.favorite,
    favoriteAt: value.favoriteAt,
    updatedAt: value.updatedAt,
  } as QuestionProgressRow;
}

function parseAttempt(value: unknown, subjectId: 'a1' | 'a2', code: string): SyncedAnswerAttempt {
  if (!isRecord(value)) throw new InvalidCloudSyncDataError();
  const question = getQuestionByCode(code, subjectId);
  if (
    question === undefined ||
    value.subjectId !== subjectId ||
    value.code !== code ||
    !question.choices.some((choice) => choice.id === value.selectedChoice) ||
    value.correctChoice !== question.correctChoice ||
    value.isCorrect !== (value.selectedChoice === value.correctChoice) ||
    !isIsoDate(value.answeredAt) ||
    !answerSources.has(value.mode as AnswerAttemptRow['mode']) ||
    typeof value.sessionId !== 'string' ||
    value.sessionId.trim() === '' ||
    value.version !== 1
  ) {
    throw new InvalidCloudSyncDataError();
  }
  return {
    subjectId,
    code,
    selectedChoice: value.selectedChoice,
    correctChoice: value.correctChoice,
    isCorrect: value.isCorrect,
    answeredAt: value.answeredAt,
    mode: value.mode,
    sessionId: value.sessionId,
    version: 1,
  } as SyncedAnswerAttempt;
}

function getSubjectForScope(scope: CloudSyncScope): 'a1' | 'a2' {
  return scope === 'a1.question' ? 'a1' : 'a2';
}

function createTombstoneItem(metadata: CloudSyncMetadataRow): LearningSyncItem {
  return {
    scope: metadata.scope,
    itemKey: metadata.itemKey,
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
    payload: { progress: null, answerAttempts: [] },
    clientUpdatedAt: metadata.clientUpdatedAt,
    deviceId: metadata.deviceId,
    isDeleted: true,
  };
}

function syncKey(item: Pick<LearningSyncItem, 'scope' | 'itemKey'>): string {
  return metadataKey(item.scope, item.itemKey);
}

function metadataKey(scope: CloudSyncScope, itemKey: string): string {
  return `${scope}\u0000${itemKey}`;
}

function compareAttempts(left: SyncedAnswerAttempt, right: SyncedAnswerAttempt): number {
  return (
    left.answeredAt.localeCompare(right.answeredAt) || left.sessionId.localeCompare(right.sessionId)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function isOptionalIsoDate(value: unknown): value is string | undefined {
  return value === undefined || isIsoDate(value);
}
