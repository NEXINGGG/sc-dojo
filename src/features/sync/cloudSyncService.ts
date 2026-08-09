import type { CloudSyncStateRow } from '../../database/types';
import { CloudSyncLocalRepository } from './cloudSyncLocalRepository';
import type { CloudSyncGateway } from './types';

export type CloudSyncResult =
  | { status: 'skipped_logged_out' }
  | { status: 'skipped_offline' }
  | {
      status: 'synchronized';
      uploadedCount: number;
      downloadedCount: number;
      completedAt: string;
    };

export class CloudSyncService {
  constructor(
    private readonly localRepository: CloudSyncLocalRepository,
    private readonly gateway: CloudSyncGateway,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  getState(): Promise<CloudSyncStateRow | undefined> {
    return this.localRepository.getState();
  }

  async synchronize(options: { userId?: string; isOnline: boolean }): Promise<CloudSyncResult> {
    if (options.userId === undefined) {
      return { status: 'skipped_logged_out' };
    }
    if (!options.isOnline) {
      return { status: 'skipped_offline' };
    }

    await this.localRepository.assertUserCanSync(options.userId);
    const remoteItems = await this.gateway.fetchItems(options.userId);
    const merge = await this.localRepository.mergeRemoteItems(options.userId, remoteItems);
    await this.gateway.upsertItems(merge.uploads);
    const completedAt = this.now();
    await this.localRepository.recordSuccessfulSync(options.userId, completedAt);
    return {
      status: 'synchronized',
      uploadedCount: merge.uploads.length,
      downloadedCount: merge.downloadedCount,
      completedAt,
    };
  }
}
