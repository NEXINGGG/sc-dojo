import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseCloudSyncGateway } from './supabaseCloudSyncGateway';

describe('Supabaseクラウド同期gateway', () => {
  it('user_idとA-1/A-2/B-1 scopeを明示して取得し、複合キーでbulk upsertする', async () => {
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
    expect(query.in).toHaveBeenCalledWith('scope', [
      'a1.question',
      'a2.question',
      'b1.answer',
      'b1.progress',
      'b1.reset',
    ]);
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

  it('401/403を再ログインが必要な非自動retryエラーとして分類する', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockResolvedValue({
      data: null,
      error: { code: 'PGRST301', message: 'JWT expired' },
      status: 401,
    });
    const gateway = new SupabaseCloudSyncGateway({
      from: vi.fn(() => query),
    } as unknown as SupabaseClient);

    await expect(gateway.fetchItems('user-a')).rejects.toMatchObject({
      kind: 'auth',
      code: 'PGRST301',
    });
  });

  it('5xxを自動retry対象、4xx payload不正を非retry対象として分類する', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const from = vi.fn(() => query);
    const gateway = new SupabaseCloudSyncGateway({ from } as unknown as SupabaseClient);
    query.in.mockResolvedValueOnce({
      data: null,
      error: { code: 'SERVER_ERROR' },
      status: 503,
    });

    await expect(gateway.fetchItems('user-a')).rejects.toMatchObject({ kind: 'transient' });

    query.in.mockResolvedValueOnce({
      data: null,
      error: { code: 'INVALID_PAYLOAD' },
      status: 400,
    });
    await expect(gateway.fetchItems('user-a')).rejects.toMatchObject({ kind: 'permanent' });

    query.in.mockResolvedValueOnce({
      data: null,
      error: { code: '42501' },
      status: undefined,
    });
    await expect(gateway.fetchItems('user-a')).rejects.toMatchObject({ kind: 'permanent' });
  });

  it('応答しないrequestを中断してtimeoutを一時エラーにする', async () => {
    const request = {
      abortSignal: (signal: AbortSignal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
      then: () => undefined,
    };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockReturnValue(request);
    const gateway = new SupabaseCloudSyncGateway(
      { from: vi.fn(() => query) } as unknown as SupabaseClient,
      1,
    );

    await expect(gateway.fetchItems('user-a')).rejects.toMatchObject({
      kind: 'transient',
      code: 'TIMEOUT',
    });
  });
});
