import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CLOUD_SYNC_SCOPES,
  type CloudLearningSyncItem,
  type CloudLearningSyncUpsert,
  type CloudSyncGateway,
} from './types';

const SYNC_COLUMNS =
  'user_id,scope,item_key,schema_version,payload,client_updated_at,device_id,is_deleted';

export class SupabaseCloudSyncError extends Error {
  constructor(message = 'クラウドの学習履歴を同期できませんでした。') {
    super(message);
    this.name = 'SupabaseCloudSyncError';
  }
}

export class SupabaseCloudSyncGateway implements CloudSyncGateway {
  constructor(private readonly client: SupabaseClient) {}

  async fetchItems(userId: string): Promise<readonly CloudLearningSyncItem[]> {
    const { data, error } = await this.client
      .from('learning_sync_items')
      .select(SYNC_COLUMNS)
      .eq('user_id', userId)
      .in('scope', [...CLOUD_SYNC_SCOPES]);

    if (error !== null) {
      throw new SupabaseCloudSyncError();
    }

    return (data ?? []).map((row) => ({
      userId: row.user_id,
      scope: row.scope,
      itemKey: row.item_key,
      schemaVersion: row.schema_version,
      payload: row.payload,
      clientUpdatedAt: row.client_updated_at,
      deviceId: row.device_id,
      isDeleted: row.is_deleted,
    })) as CloudLearningSyncItem[];
  }

  async upsertItems(items: readonly CloudLearningSyncUpsert[]): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const rows = items.map((item) => ({
      user_id: item.userId,
      scope: item.scope,
      item_key: item.itemKey,
      schema_version: item.schemaVersion,
      payload: item.payload,
      client_updated_at: item.clientUpdatedAt,
      device_id: item.deviceId,
      is_deleted: item.isDeleted,
    }));
    const { error } = await this.client
      .from('learning_sync_items')
      .upsert(rows, { onConflict: 'user_id,scope,item_key' });

    if (error !== null) {
      throw new SupabaseCloudSyncError();
    }
  }
}
