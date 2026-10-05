import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseCloudSyncGateway } from './supabaseCloudSyncGateway';
import { CLOUD_SYNC_SCOPES, type CloudLearningSyncUpsert } from './types';

describe('Supabaseクラウド同期gateway', () => {
  it('user_idとSC専用scopeを明示して取得し、複合キーでbulk upsertする', async () => {
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
      'sc:a1.question',
      'sc:a2.question',
      'sc:b1.answer',
      'sc:b1.progress',
      'sc:b1.reset',
    ]);
    expect(from).toHaveBeenNthCalledWith(2, 'learning_sync_items');
    expect(query.upsert).toHaveBeenCalledWith(
      [
        {
          user_id: 'user-a',
          scope: 'sc:a1.question',
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

  it('同じユーザー・item_keyのNW履歴を保持し、全SC scopeの削除情報も分離して往復する', async () => {
    interface CloudRow {
      user_id: string;
      scope: string;
      item_key: string;
      schema_version: number;
      payload: unknown;
      client_updated_at: string;
      device_id: string;
      is_deleted: boolean;
    }
    const nwRows: CloudRow[] = CLOUD_SYNC_SCOPES.map((scope) => ({
      user_id: 'user-a',
      scope,
      item_key: 'same-key',
      schema_version: 1,
      payload: { nw: true },
      client_updated_at: '2026-10-01T00:00:00.000Z',
      device_id: 'nw-device',
      is_deleted: false,
    }));
    const rows = structuredClone(nwRows);
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      upsert: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockImplementation((_column: string, scopes: string[]) =>
      Promise.resolve({ data: rows.filter((row) => scopes.includes(row.scope)), error: null }),
    );
    query.upsert.mockImplementation((uploaded: CloudRow[]) => {
      for (const row of uploaded) {
        const index = rows.findIndex(
          (existing) =>
            existing.user_id === row.user_id &&
            existing.scope === row.scope &&
            existing.item_key === row.item_key,
        );
        if (index < 0) rows.push(structuredClone(row));
        else rows[index] = structuredClone(row);
      }
      return Promise.resolve({ error: null });
    });
    const gateway = new SupabaseCloudSyncGateway({
      from: vi.fn(() => query),
    } as unknown as SupabaseClient);
    const items: CloudLearningSyncUpsert[] = CLOUD_SYNC_SCOPES.map((scope) => ({
      userId: 'user-a',
      scope,
      itemKey: 'same-key',
      schemaVersion: 1,
      payload:
        scope === 'b1.reset'
          ? { kind: 'b1.reset', resetAt: '2026-10-05T00:00:00.000Z' }
          : scope.startsWith('b1.')
            ? { kind: 'b1.tombstone' }
            : { progress: null, answerAttempts: [] },
      clientUpdatedAt: '2026-10-05T00:00:00.000Z',
      deviceId: 'sc-device',
      isDeleted: scope !== 'b1.reset',
    }));

    await expect(gateway.fetchItems('user-a')).resolves.toEqual([]);
    await gateway.upsertItems(items);
    await expect(gateway.fetchItems('user-a')).resolves.toEqual(items);
    expect(rows.filter((row) => !row.scope.startsWith('sc:'))).toEqual(nwRows);
    expect(rows.filter((row) => row.scope.startsWith('sc:'))).toHaveLength(5);
  });

  it('サーバーが返したNW scope・未知scope・別ユーザーの行を取り込まない', async () => {
    const row = {
      user_id: 'user-a',
      item_key: 'A1-001',
      schema_version: 1,
      payload: { progress: null, answerAttempts: [] },
      client_updated_at: '2026-10-05T00:00:00.000Z',
      device_id: 'sc-device',
      is_deleted: false,
    };
    const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockResolvedValue({
      data: [
        { ...row, scope: 'a1.question' },
        { ...row, scope: 'sc:unknown' },
        { ...row, scope: 'sc:a1.question', user_id: 'other-user' },
        { ...row, scope: 'sc:a1.question' },
      ],
      error: null,
    });
    const gateway = new SupabaseCloudSyncGateway({
      from: vi.fn(() => query),
    } as unknown as SupabaseClient);
    const items = await gateway.fetchItems('user-a');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ userId: 'user-a', scope: 'a1.question', itemKey: 'A1-001' });
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
