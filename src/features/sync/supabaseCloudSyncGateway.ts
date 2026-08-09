import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CLOUD_SYNC_SCOPES,
  CloudSyncGatewayError,
  type CloudLearningSyncItem,
  type CloudLearningSyncUpsert,
  type CloudSyncGateway,
} from './types';

const SYNC_COLUMNS =
  'user_id,scope,item_key,schema_version,payload,client_updated_at,device_id,is_deleted';

interface SupabaseErrorLike {
  code?: string;
}

interface AbortableThenable<T> extends PromiseLike<T> {
  abortSignal?: (signal: AbortSignal) => PromiseLike<T>;
}

export class SupabaseCloudSyncError extends CloudSyncGatewayError {
  constructor(
    kind: 'transient' | 'auth' | 'permanent' = 'transient',
    code?: string,
    message = 'クラウドの学習履歴を同期できませんでした。',
  ) {
    super(message, kind, code);
    this.name = 'SupabaseCloudSyncError';
  }
}

export class SupabaseCloudSyncGateway implements CloudSyncGateway {
  constructor(
    private readonly client: SupabaseClient,
    private readonly requestTimeoutMs = 15_000,
  ) {}

  async fetchItems(userId: string): Promise<readonly CloudLearningSyncItem[]> {
    const request = this.client
      .from('learning_sync_items')
      .select(SYNC_COLUMNS)
      .eq('user_id', userId)
      .in('scope', [...CLOUD_SYNC_SCOPES]);
    const { data, error, status } = await this.executeRequest(request);

    if (error !== null) {
      throw createSupabaseError(status, error);
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
    if (items.length === 0) return;

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
    const request = this.client
      .from('learning_sync_items')
      .upsert(rows, { onConflict: 'user_id,scope,item_key' });
    const { error, status } = await this.executeRequest(request);

    if (error !== null) {
      throw createSupabaseError(status, error);
    }
  }

  private async executeRequest<T>(request: AbortableThenable<T>): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.requestTimeoutMs);
    try {
      const abortableRequest =
        typeof request.abortSignal === 'function'
          ? request.abortSignal(controller.signal)
          : request;
      return await abortableRequest;
    } catch {
      throw new SupabaseCloudSyncError('transient', timedOut ? 'TIMEOUT' : 'NETWORK_ERROR');
    } finally {
      clearTimeout(timeout);
    }
  }
}

function createSupabaseError(status: number | undefined, error: SupabaseErrorLike) {
  const code = typeof error.code === 'string' ? error.code : undefined;
  if (status === 401 || status === 403 || code === 'PGRST301') {
    return new SupabaseCloudSyncError('auth', code ?? String(status));
  }
  if (code === '42501') {
    return new SupabaseCloudSyncError('permanent', code);
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return new SupabaseCloudSyncError('permanent', code ?? String(status));
  }
  return new SupabaseCloudSyncError(
    'transient',
    code ?? (status === undefined ? undefined : String(status)),
  );
}
