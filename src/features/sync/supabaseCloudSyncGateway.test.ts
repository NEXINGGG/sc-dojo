import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseCloudSyncGateway } from './supabaseCloudSyncGateway';

describe('Supabaseクラウド同期gateway', () => {
  it('user_idとA-1/A-2 scopeを明示して取得し、複合キーでbulk upsertする', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      upsert: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockResolvedValue({ data: [], error: null });
    query.upsert.mockResolvedValue({ error: null });
    const from = vi.fn(() => query);
    const gateway = new SupabaseCloudSyncGateway({ from } as unknown as SupabaseClient);

    await gateway.fetchItems('user-a');
    await gateway.upsertItems([
      {
        userId: 'user-a',
        scope: 'a1.question',
        itemKey: 'A1-001',
        schemaVersion: 1,
        payload: { progress: null, answerAttempts: [] },
        clientUpdatedAt: '2026-08-09T00:00:00.000Z',
        deviceId: 'device-a',
        isDeleted: true,
      },
    ]);

    expect(from).toHaveBeenNthCalledWith(1, 'learning_sync_items');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(query.in).toHaveBeenCalledWith('scope', ['a1.question', 'a2.question']);
    expect(from).toHaveBeenNthCalledWith(2, 'learning_sync_items');
    expect(query.upsert).toHaveBeenCalledWith(
      [
        {
          user_id: 'user-a',
          scope: 'a1.question',
          item_key: 'A1-001',
          schema_version: 1,
          payload: { progress: null, answerAttempts: [] },
          client_updated_at: '2026-08-09T00:00:00.000Z',
          device_id: 'device-a',
          is_deleted: true,
        },
      ],
      { onConflict: 'user_id,scope,item_key' },
    );
  });
});
