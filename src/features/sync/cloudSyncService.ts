import type { CloudSyncFailureKind, CloudSyncScope, CloudSyncStateRow } from '../../database/types';
import {
  CloudSyncLocalRepository,
  type CloudSyncPendingSummary,
  getSubjectLabelForScope,
} from './cloudSyncLocalRepository';
import { cloudSyncItemKey } from './cloudSyncOutbox';
import {
  CloudSyncGatewayError,
  type CloudLearningSyncUpsert,
  type CloudSyncGateway,
} from './types';

export interface CloudSyncSubjectCounts {
  uploaded: number;
  downloaded: number;
}

export type CloudSyncCountsBySubject = Record<'A1' | 'A2' | 'B1', CloudSyncSubjectCounts>;

export type CloudSyncResult =
  | { status: 'skipped_logged_out' }
  | { status: 'skipped_offline' }
  | { status: 'deferred'; pendingCount: number; failedCount: number }
  | {
      status: 'synchronized';
      uploadedCount: number;
      downloadedCount: number;
      completedAt?: string;
      countsBySubject: CloudSyncCountsBySubject;
      pending: CloudSyncPendingSummary;
    };

const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000, 40_000, 60_000] as const;

export class CloudSyncService {
  private readonly inFlightByUser = new Map<string, Promise<CloudSyncResult>>();

  constructor(
    private readonly localRepository: CloudSyncLocalRepository,
    private readonly gateway: CloudSyncGateway,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly retryDelay: (retryCount: number) => number = defaultRetryDelay,
  ) {}

  getState(): Promise<CloudSyncStateRow | undefined> {
    return this.localRepository.getState();
  }

  getPendingSummary(userId: string): Promise<CloudSyncPendingSummary> {
    return this.localRepository.getPendingSummary(userId);
  }

  activateUser(userId: string): Promise<void> {
    return this.localRepository.activateUser(userId);
  }

  deactivateUser(userId: string): void {
    this.localRepository.deactivateUser(userId);
  }

  synchronize(options: {
    userId?: string;
    isOnline: boolean;
    force?: boolean;
  }): Promise<CloudSyncResult> {
    if (options.userId === undefined) {
      return Promise.resolve({ status: 'skipped_logged_out' });
    }
    const existing = this.inFlightByUser.get(options.userId);
    if (existing !== undefined) return existing;

    const userId = options.userId;
    const operation = this.synchronizeOnce({
      userId,
      isOnline: options.isOnline,
      force: options.force === true,
    }).finally(() => {
      if (this.inFlightByUser.get(userId) === operation) {
        this.inFlightByUser.delete(userId);
      }
    });
    this.inFlightByUser.set(userId, operation);
    return operation;
  }

  private async synchronizeOnce(options: {
    userId: string;
    isOnline: boolean;
    force: boolean;
  }): Promise<CloudSyncResult> {
    await this.localRepository.activateUser(options.userId);
    if (!options.isOnline) return { status: 'skipped_offline' };

    const startedAt = this.now();
    const pendingBefore = await this.localRepository.getPendingSummary(options.userId);
    const attemptableBefore = await this.localRepository.getAttemptablePending(
      options.userId,
      startedAt,
      options.force,
    );
    if (pendingBefore.pending > 0 && attemptableBefore.length === 0) {
      return {
        status: 'deferred',
        pendingCount: pendingBefore.pending,
        failedCount: pendingBefore.failed,
      };
    }

    let remoteItems;
    try {
      remoteItems = await this.gateway.fetchItems(options.userId);
    } catch (error) {
      await this.recordFailure(attemptableBefore, error, startedAt);
      throw error;
    }
    if (!this.localRepository.isUserActive(options.userId)) {
      return { status: 'skipped_logged_out' };
    }

    const merge = await this.localRepository.mergeRemoteItems(options.userId, remoteItems);
    if (!this.localRepository.isUserActive(options.userId)) {
      return { status: 'skipped_logged_out' };
    }

    await this.localRepository.queueUploads(options.userId, merge.uploads, startedAt);
    await this.localRepository.reconcileResolvedPending(options.userId, merge.uploads);
    const uploads = await this.localRepository.selectAttemptableUploads(
      options.userId,
      merge.uploads,
      startedAt,
      options.force,
    );

    if (uploads.length > 0) {
      try {
        await this.gateway.upsertItems(uploads);
      } catch (error) {
        const attemptedKeys = new Set(uploads.map(cloudSyncItemKey));
        const attemptedRows = (
          await this.localRepository.getAttemptablePending(options.userId, startedAt, true)
        ).filter((row) => attemptedKeys.has(cloudSyncItemKey(row)));
        await this.recordFailure(attemptedRows, error, startedAt);
        throw error;
      }
      await this.localRepository.recordUploaded(options.userId, uploads);
    }

    const pending = await this.localRepository.getPendingSummary(options.userId);
    const completedAt = pending.pending === 0 ? this.now() : undefined;
    if (completedAt !== undefined) {
      await this.localRepository.recordSuccessfulSync(options.userId, completedAt);
    }
    return {
      status: 'synchronized',
      uploadedCount: uploads.length,
      downloadedCount: merge.downloadedCount,
      completedAt,
      countsBySubject: createCountsBySubject(uploads, merge.downloadedScopes),
      pending,
    };
  }

  private async recordFailure(
    rows: Parameters<CloudSyncLocalRepository['recordFailedPending']>[0],
    error: unknown,
    attemptedAt: string,
  ): Promise<void> {
    const failure = classifyFailure(error);
    await this.localRepository.recordFailedPending(rows, failure, attemptedAt, this.retryDelay);
  }
}

export function defaultRetryDelay(retryCount: number): number {
  return RETRY_DELAYS_MS[Math.min(Math.max(retryCount, 1), RETRY_DELAYS_MS.length) - 1];
}

export function classifyFailure(error: unknown): {
  kind: CloudSyncFailureKind;
  code?: string;
} {
  if (error instanceof CloudSyncGatewayError) {
    return { kind: error.kind, code: error.code };
  }
  if (error instanceof Error && error.name === 'InvalidCloudSyncDataError') {
    return { kind: 'permanent', code: 'INVALID_SYNC_DATA' };
  }
  return { kind: 'transient' };
}

function createCountsBySubject(
  uploads: readonly CloudLearningSyncUpsert[],
  downloadedScopes: readonly CloudSyncScope[],
): CloudSyncCountsBySubject {
  const counts = {
    A1: { uploaded: 0, downloaded: 0 },
    A2: { uploaded: 0, downloaded: 0 },
    B1: { uploaded: 0, downloaded: 0 },
  } satisfies CloudSyncCountsBySubject;
  for (const item of uploads) counts[getSubjectLabelForScope(item.scope)].uploaded += 1;
  for (const scope of downloadedScopes) counts[getSubjectLabelForScope(scope)].downloaded += 1;
  return counts;
}
