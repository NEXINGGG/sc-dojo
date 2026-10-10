import { isCompatibleB1RemoteItem } from './b1CloudSync';
import type { A1DojoDatabase } from '../../database/database';
import type {
  AnswerAttemptRow,
  CloudSyncFailureKind,
  CloudSyncMetadataRow,
  CloudSyncOutboxRow,
  CloudSyncScope,
  CloudSyncStateRow,
  LearningDayRow,
  QuestionProgressRow,
} from '../../database/types';
import { getQuestionByCode } from '../../data/catalog';
import { initializeDatabase } from '../../database/database';
import { a1LegacyManifest } from '../../domain/questionManifest';
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
import {
  B1_RESET_ITEM_KEY,
  applyRemoteB1PracticeItem,
  isB1CloudSyncDataScope,
  isB1CloudSyncScope,
  normalizeRemoteB1PracticeItem,
  readLocalB1PracticeItems,
} from './b1CloudSync';
import {
  clearActiveCloudSyncUser,
  cloudSyncItemKey,
  isActiveCloudSyncUser,
  queueCloudSyncMetadata,
  queueCloudSyncMetadataForActiveUser,
  setActiveCloudSyncUser,
} from './cloudSyncOutbox';

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
  downloadedScopes: readonly CloudSyncScope[];
}

export interface CloudSyncPendingSummary {
  pending: number;
  failed: number;
  authFailed: number;
  permanentFailed: number;
  nextRetryAt?: string;
  bySubject: { A1: number; A2: number; B1: number };
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

  async activateUser(userId: string): Promise<void> {
    if (isActiveCloudSyncUser(this.database, userId)) return;
    await this.database.open();
    await this.database.transaction(
      'rw',
      [
        this.database.cloudSyncState,
        this.database.cloudSyncMetadata,
        this.database.cloudSyncOutbox,
      ],
      async () => {
        const state = await this.database.cloudSyncState.get('cloud-sync');
        if (state?.ownerUserId !== undefined && state.ownerUserId !== userId) {
          throw new CloudSyncUserMismatchError(state.ownerUserId, userId);
        }
        const activatedAt = this.now();
        const deviceId = this.resolveDeviceId();
        const metadataRows = (await this.database.cloudSyncMetadata.toArray()).filter(
          (row) =>
            row.deviceId === deviceId &&
            (state?.lastSuccessfulSyncAt === undefined ||
              row.clientUpdatedAt > state.lastSuccessfulSyncAt),
        );
        await queueCloudSyncMetadata(this.database, userId, metadataRows, activatedAt);
        await this.database.cloudSyncState.put({
          key: 'cloud-sync',
          ownerUserId: userId,
          lastSuccessfulSyncAt: state?.lastSuccessfulSyncAt,
          updatedAt: activatedAt,
        });
      },
    );
    setActiveCloudSyncUser(this.database, userId);
  }

  deactivateUser(userId: string): void {
    clearActiveCloudSyncUser(this.database, userId);
  }

  isUserActive(userId: string): boolean {
    return isActiveCloudSyncUser(this.database, userId);
  }

  async getPendingSummary(userId: string): Promise<CloudSyncPendingSummary> {
    await this.database.open();
    const rows = await this.database.cloudSyncOutbox.where('userId').equals(userId).toArray();
    return summarizePendingRows(rows);
  }

  async getAttemptablePending(
    userId: string,
    at: string,
    force: boolean,
  ): Promise<readonly CloudSyncOutboxRow[]> {
    await this.database.open();
    const rows = await this.database.cloudSyncOutbox.where('userId').equals(userId).toArray();
    return rows.filter((row) => isPendingAttemptDue(row, at, force));
  }

  async queueUploads(
    userId: string,
    uploads: readonly CloudLearningSyncUpsert[],
    queuedAt: string,
  ): Promise<void> {
    await queueCloudSyncMetadata(
      this.database,
      userId,
      uploads.map((item) => ({
        scope: item.scope,
        itemKey: item.itemKey,
        clientUpdatedAt: item.clientUpdatedAt,
        deviceId: item.deviceId,
        isDeleted: item.isDeleted,
      })),
      queuedAt,
    );
  }

  async selectAttemptableUploads(
    userId: string,
    uploads: readonly CloudLearningSyncUpsert[],
    at: string,
    force: boolean,
  ): Promise<readonly CloudLearningSyncUpsert[]> {
    const pending = await this.getAttemptablePending(userId, at, force);
    const dueByKey = new Map(pending.map((row) => [cloudSyncItemKey(row), row]));
    return uploads.filter((item) => {
      const pendingRow = dueByKey.get(cloudSyncItemKey(item));
      return (
        pendingRow?.clientUpdatedAt === item.clientUpdatedAt &&
        pendingRow.deviceId === item.deviceId
      );
    });
  }

  async reconcileResolvedPending(
    userId: string,
    uploads: readonly CloudLearningSyncUpsert[],
  ): Promise<void> {
    await this.database.open();
    const uploadKeys = new Set(uploads.map(cloudSyncItemKey));
    const rows = await this.database.cloudSyncOutbox.where('userId').equals(userId).toArray();
    const resolvedKeys = rows
      .filter((row) => !uploadKeys.has(cloudSyncItemKey(row)))
      .map((row) => [row.userId, row.scope, row.itemKey] as [string, CloudSyncScope, string]);
    if (resolvedKeys.length > 0) {
      await this.database.cloudSyncOutbox.bulkDelete(resolvedKeys);
    }
  }

  async recordUploaded(userId: string, uploads: readonly CloudLearningSyncUpsert[]): Promise<void> {
    if (uploads.length === 0) return;
    await this.database.open();
    await this.database.transaction('rw', this.database.cloudSyncOutbox, async () => {
      const keys = uploads.map(
        (item) => [userId, item.scope, item.itemKey] as [string, CloudSyncScope, string],
      );
      const currentRows = await this.database.cloudSyncOutbox.bulkGet(keys);
      const uploadedKeys = keys.filter((_, index) => {
        const current = currentRows[index];
        const item = uploads[index];
        return (
          current?.clientUpdatedAt === item.clientUpdatedAt && current.deviceId === item.deviceId
        );
      });
      if (uploadedKeys.length > 0) {
        await this.database.cloudSyncOutbox.bulkDelete(uploadedKeys);
      }
    });
  }

  async recordFailedPending(
    rows: readonly CloudSyncOutboxRow[],
    failure: { kind: CloudSyncFailureKind; code?: string },
    attemptedAt: string,
    retryDelay: (retryCount: number) => number,
  ): Promise<void> {
    if (rows.length === 0) return;
    await this.database.open();
    await this.database.transaction('rw', this.database.cloudSyncOutbox, async () => {
      for (const attempted of rows) {
        const key = [attempted.userId, attempted.scope, attempted.itemKey] as [
          string,
          CloudSyncScope,
          string,
        ];
        const current = await this.database.cloudSyncOutbox.get(key);
        if (
          current?.clientUpdatedAt !== attempted.clientUpdatedAt ||
          current.deviceId !== attempted.deviceId
        ) {
          continue;
        }
        const retryCount = current.retryCount + 1;
        const nextRetryAt =
          failure.kind === 'transient'
            ? new Date(new Date(attemptedAt).getTime() + retryDelay(retryCount)).toISOString()
            : undefined;
        await this.database.cloudSyncOutbox.put({
          ...current,
          lastAttemptAt: attemptedAt,
          retryCount,
          nextRetryAt,
          failureKind: failure.kind,
          errorCode: failure.code,
        });
      }
    });
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
    await initializeDatabase(this.database);

    return this.database.transaction(
      'rw',
      [
        this.database.questionProgress,
        this.database.answerAttempts,
        this.database.learningDays,
        this.database.learningDaysBySubject,
        this.database.b1PracticeSessions,
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
        applyB1ResetBoundary(localByKey, remoteByKey);
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
          await this.applyRemoteItems(downloads);
          await this.rebuildLearningDays();
        }

        const claimedAt = this.now();
        await this.database.cloudSyncState.put({
          key: 'cloud-sync',
          ownerUserId: userId,
          lastSuccessfulSyncAt: state?.lastSuccessfulSyncAt,
          updatedAt: claimedAt,
        });

        return {
          uploads,
          downloadedCount: downloads.length,
          downloadedScopes: downloads.map((item) => item.scope),
        };
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
        payload: {
          progress: { ...progress },
          answerAttempts,
          ...questionSyncIdentity(scope, progress.code),
        },
        clientUpdatedAt: metadata.clientUpdatedAt,
        deviceId: metadata.deviceId,
        isDeleted: false,
      });
    }

    for (const metadata of metadataRows) {
      if (isB1CloudSyncScope(metadata.scope)) continue;
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

    items.push(
      ...(await readLocalB1PracticeItems(this.database, metadataRows, deviceId, this.now)),
    );

    return items;
  }

  private async applyRemoteItems(items: readonly LearningSyncItem[]): Promise<void> {
    const b1Items = items.filter((item) => isB1CloudSyncScope(item.scope));
    for (const item of b1Items) {
      await applyRemoteB1PracticeItem(this.database, item);
    }

    const questionItems = items.filter(
      (item): item is LearningSyncItem & { scope: 'a1.question' | 'a2.question' } =>
        !isB1CloudSyncScope(item.scope),
    );
    if (questionItems.length === 0) return;

    for (const subjectId of ['a1', 'a2'] as const) {
      const keys = questionItems
        .filter((item) => getSubjectForScope(item.scope) === subjectId)
        .map((item) => [subjectId, item.itemKey] as [SubjectId, string]);
      if (keys.length === 0) continue;
      await this.database.answerAttempts.where('[subjectId+code]').anyOf(keys).delete();
      await this.database.questionProgress.where('[subjectId+code]').anyOf(keys).delete();
    }

    const payloads = questionItems.map((item) => item.payload as LearningSyncPayloadV1);
    const progressRows = payloads.flatMap((payload) =>
      payload.progress === null ? [] : [payload.progress],
    );
    const answerAttempts = payloads.flatMap((payload) => payload.answerAttempts);
    if (progressRows.length > 0) await this.database.questionProgress.bulkPut(progressRows);
    if (answerAttempts.length > 0) await this.database.answerAttempts.bulkAdd(answerAttempts);
    await this.database.cloudSyncMetadata.bulkPut(
      questionItems.map((item) => ({
        scope: item.scope,
        itemKey: item.itemKey,
        clientUpdatedAt: item.clientUpdatedAt,
        deviceId: item.deviceId,
        isDeleted: item.isDeleted,
      })),
    );
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
    throw new Error('科目BはPhase 2のクラウド同期対象ではありません。');
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
  const metadata = createCloudSyncMetadataRow(
    subjectId,
    code,
    clientUpdatedAt,
    getDeviceId(),
    false,
  );
  await database.cloudSyncMetadata.put(metadata);
  await queueCloudSyncMetadataForActiveUser(database, [metadata], clientUpdatedAt);
}

function summarizePendingRows(rows: readonly CloudSyncOutboxRow[]): CloudSyncPendingSummary {
  const bySubject = { A1: 0, A2: 0, B1: 0 };
  let failed = 0;
  let authFailed = 0;
  let permanentFailed = 0;
  let nextRetryAt: string | undefined;
  for (const row of rows) {
    bySubject[getSubjectLabelForScope(row.scope)] += 1;
    if (row.failureKind !== undefined) failed += 1;
    if (row.failureKind === 'auth') authFailed += 1;
    if (row.failureKind === 'permanent') permanentFailed += 1;
    if (
      row.failureKind === 'transient' &&
      row.nextRetryAt !== undefined &&
      (nextRetryAt === undefined || row.nextRetryAt < nextRetryAt)
    ) {
      nextRetryAt = row.nextRetryAt;
    }
  }
  return {
    pending: rows.length,
    failed,
    authFailed,
    permanentFailed,
    nextRetryAt,
    bySubject,
  };
}

function isPendingAttemptDue(row: CloudSyncOutboxRow, at: string, force: boolean): boolean {
  if (force) return true;
  if (row.failureKind === 'auth' || row.failureKind === 'permanent') return false;
  return row.nextRetryAt === undefined || row.nextRetryAt <= at;
}

export function getSubjectLabelForScope(scope: CloudSyncScope): 'A1' | 'A2' | 'B1' {
  return scope === 'a1.question' ? 'A1' : scope === 'a2.question' ? 'A2' : 'B1';
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

    const key = metadataKey(item.scope, item.itemKey);
    if (keys.has(key)) {
      throw new InvalidCloudSyncDataError();
    }
    keys.add(key);

    if (isB1CloudSyncScope(item.scope)) {
      if (!isCompatibleB1RemoteItem(item)) continue;
      try {
        normalized.push(normalizeRemoteB1PracticeItem(item));
      } catch {
        throw new InvalidCloudSyncDataError();
      }
    } else {
      const subjectId = getSubjectForScope(item.scope);
      const question = getQuestionByCode(item.itemKey, subjectId);
      if (question === undefined) {
        throw new InvalidCloudSyncDataError();
      }
      const expectedIdentity = questionSyncIdentity(item.scope, item.itemKey).questionIdentity;
      if (
        expectedIdentity &&
        (!isRecord(item.payload) ||
          !isRecord(item.payload.questionIdentity) ||
          item.payload.questionIdentity.sourceId !== expectedIdentity.sourceId ||
          item.payload.questionIdentity.contentHash !== expectedIdentity.contentHash) &&
        !isCompatibleLegacyA1Item(item, expectedIdentity)
      ) {
        // Unknown or changed content must not be merged by code alone.
        continue;
      }
      normalized.push({
        scope: item.scope,
        itemKey: item.itemKey,
        schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
        payload: item.isDeleted
          ? {
              progress: null,
              answerAttempts: [],
              ...questionSyncIdentity(item.scope, item.itemKey),
            }
          : parsePayload(item.payload, subjectId, item.itemKey),
        clientUpdatedAt: item.clientUpdatedAt,
        deviceId: item.deviceId,
        isDeleted: item.isDeleted,
      });
    }
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
  return {
    progress,
    answerAttempts: answerAttempts.sort(compareAttempts),
    ...questionSyncIdentity(`${subjectId}.question`, code),
  };
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

function getSubjectForScope(
  scope: Exclude<CloudSyncScope, 'b1.answer' | 'b1.progress' | 'b1.reset'>,
): 'a1' | 'a2' {
  return scope === 'a1.question' ? 'a1' : 'a2';
}

function createTombstoneItem(metadata: CloudSyncMetadataRow): LearningSyncItem {
  return {
    scope: metadata.scope,
    itemKey: metadata.itemKey,
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
    payload: {
      progress: null,
      answerAttempts: [],
      ...questionSyncIdentity(metadata.scope, metadata.itemKey),
    },
    clientUpdatedAt: metadata.clientUpdatedAt,
    deviceId: metadata.deviceId,
    isDeleted: true,
  };
}

function questionSyncIdentity(
  scope: CloudSyncScope,
  code: string,
): Pick<LearningSyncPayloadV1, 'questionIdentity'> {
  if (scope !== 'a1.question' && scope !== 'a2.question') return {};
  const q = getQuestionByCode(code, scope === 'a1.question' ? 'a1' : 'a2');
  return q?.sourceId &&
    q.contentHash &&
    (scope === 'a1.question' || /^sc-a2-v[0-9]+$/.test(q.datasetVersion ?? ''))
    ? { questionIdentity: { sourceId: q.sourceId, contentHash: q.contentHash } }
    : {};
}

function isCompatibleLegacyA1Item(
  item: CloudLearningSyncItem,
  expected: NonNullable<LearningSyncPayloadV1['questionIdentity']>,
): boolean {
  if (
    item.scope !== 'a1.question' ||
    !isRecord(item.payload) ||
    item.payload.questionIdentity !== undefined
  )
    return false;
  const legacy = a1LegacyManifest.entries.find((entry) => entry.code === item.itemKey);
  return legacy?.sourceId === expected.sourceId && legacy.contentHash === expected.contentHash;
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

function applyB1ResetBoundary(
  localByKey: Map<string, LearningSyncItem>,
  remoteByKey: Map<string, LearningSyncItem>,
): void {
  const resetKey = metadataKey('b1.reset', B1_RESET_ITEM_KEY);
  const localReset = localByKey.get(resetKey);
  const remoteReset = remoteByKey.get(resetKey);
  if (localReset === undefined && remoteReset === undefined) return;

  const resetSource =
    remoteReset === undefined ||
    (localReset !== undefined && compareSyncItems(localReset, remoteReset) >= 0)
      ? 'local'
      : 'remote';
  const resetItem = resetSource === 'local' ? localReset : remoteReset;
  if (resetItem === undefined) return;

  const keys = new Set([...localByKey.keys(), ...remoteByKey.keys()]);
  for (const key of keys) {
    const local = localByKey.get(key);
    const remote = remoteByKey.get(key);
    const sample = local ?? remote;
    if (sample === undefined || !isB1CloudSyncDataScope(sample.scope)) continue;

    if (resetSource === 'local') {
      if (local !== undefined && local.clientUpdatedAt >= resetItem.clientUpdatedAt) continue;
      if (remote !== undefined && remote.clientUpdatedAt <= resetItem.clientUpdatedAt) {
        localByKey.set(key, createResetTombstone(sample, resetItem));
      }
    } else {
      if (remote !== undefined && remote.clientUpdatedAt >= resetItem.clientUpdatedAt) continue;
      if (local !== undefined && local.clientUpdatedAt <= resetItem.clientUpdatedAt) {
        remoteByKey.set(key, createResetTombstone(sample, resetItem));
      }
    }
  }
}

function createResetTombstone(
  item: LearningSyncItem,
  resetItem: LearningSyncItem,
): LearningSyncItem {
  return {
    scope: item.scope,
    itemKey: item.itemKey,
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
    payload: { kind: 'b1.tombstone' },
    clientUpdatedAt: resetItem.clientUpdatedAt,
    deviceId: resetItem.deviceId,
    isDeleted: true,
  };
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
