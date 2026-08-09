import type { A1DojoDatabase } from '../../database/database';
import type {
  CloudSyncMetadataRow,
  CloudSyncOutboxRow,
  CloudSyncScope,
} from '../../database/types';

const activeUserByDatabase = new WeakMap<A1DojoDatabase, string>();

export function setActiveCloudSyncUser(database: A1DojoDatabase, userId: string): void {
  activeUserByDatabase.set(database, userId);
}

export function clearActiveCloudSyncUser(database: A1DojoDatabase, userId?: string): void {
  if (userId === undefined || activeUserByDatabase.get(database) === userId) {
    activeUserByDatabase.delete(database);
  }
}

export function isActiveCloudSyncUser(database: A1DojoDatabase, userId: string): boolean {
  return activeUserByDatabase.get(database) === userId;
}

export async function queueCloudSyncMetadataForActiveUser(
  database: A1DojoDatabase,
  metadataRows: readonly CloudSyncMetadataRow[],
  queuedAt = new Date().toISOString(),
): Promise<void> {
  const userId = activeUserByDatabase.get(database);
  if (userId === undefined) return;
  await queueCloudSyncMetadata(database, userId, metadataRows, queuedAt);
}

export async function queueCloudSyncMetadata(
  database: A1DojoDatabase,
  userId: string,
  metadataRows: readonly CloudSyncMetadataRow[],
  queuedAt: string,
): Promise<void> {
  if (metadataRows.length === 0) return;
  const keys = metadataRows.map(
    (row) => [userId, row.scope, row.itemKey] as [string, CloudSyncScope, string],
  );
  const existingRows = await database.cloudSyncOutbox.bulkGet(keys);
  const nextRows: CloudSyncOutboxRow[] = [];

  metadataRows.forEach((metadata, index) => {
    const existing = existingRows[index];
    if (
      existing?.clientUpdatedAt === metadata.clientUpdatedAt &&
      existing.deviceId === metadata.deviceId
    ) {
      return;
    }
    nextRows.push({
      userId,
      scope: metadata.scope,
      itemKey: metadata.itemKey,
      clientUpdatedAt: metadata.clientUpdatedAt,
      deviceId: metadata.deviceId,
      queuedAt,
      retryCount: 0,
    });
  });

  if (nextRows.length > 0) {
    await database.cloudSyncOutbox.bulkPut(nextRows);
  }
}

export function cloudSyncItemKey(item: { scope: CloudSyncScope; itemKey: string }): string {
  return `${item.scope}\u0000${item.itemKey}`;
}
