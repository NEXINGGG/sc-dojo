import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { database } from '../../database/database';
import { b1Cases } from '../../data/b1';
import { getSubjectCatalog } from '../../data/catalog';
import { waitForRouteLoadingToFinish } from '../../test/routeLoading';
import { B1Repository } from '../b1/b1Repository';
import { LearningRepository } from '../learning/learningRepository';

const supabaseMocks = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  const auth = {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  };
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

  return {
    auth,
    client: { auth, from },
    configuration: { isConfigured: true },
    from,
    query,
    unsubscribe,
  };
});

vi.mock('./supabaseClient', () => ({
  supabaseClient: supabaseMocks.client,
  authConfiguration: supabaseMocks.configuration,
}));

import { AuthProvider } from './AuthContext';
import { CloudAuthSection } from './CloudAuthSection';
import { CloudSyncProvider } from '../sync/CloudSyncContext';
import { notifyCloudSyncNeeded } from '../sync/syncEvents';

const a1QuestionCode = getSubjectCatalog('a1').questions[0].code;

function signedInSession(): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: 2_000_000_000,
    expires_in: 3_600,
    token_type: 'bearer',
    user: {
      id: 'test-user-id',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'learner@example.com',
      app_metadata: {},
      user_metadata: { full_name: '学習 太郎' },
      created_at: '2026-08-04T00:00:00.000Z',
      updated_at: '2026-08-04T00:00:00.000Z',
    },
  };
}

function renderAuthSection() {
  return render(
    <AuthProvider>
      <CloudSyncProvider>
        <CloudAuthSection />
      </CloudSyncProvider>
    </AuthProvider>,
  );
}

beforeEach(async () => {
  setNavigatorOnline(true);
  window.history.replaceState({}, '', '/#/');
  await Promise.all([
    database.cloudSyncMetadata.clear(),
    database.cloudSyncState.clear(),
    database.cloudSyncOutbox.clear(),
    database.b1PracticeSessions.clear(),
  ]);
  supabaseMocks.configuration.isConfigured = true;
  supabaseMocks.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  supabaseMocks.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: supabaseMocks.unsubscribe } },
  });
  supabaseMocks.auth.signInWithOAuth.mockResolvedValue({
    data: { provider: 'google' },
    error: null,
  });
  supabaseMocks.auth.signOut.mockResolvedValue({ error: null });
  supabaseMocks.from.mockImplementation(() => supabaseMocks.query);
  supabaseMocks.query.select.mockReturnValue(supabaseMocks.query);
  supabaseMocks.query.eq.mockReturnValue(supabaseMocks.query);
  supabaseMocks.query.in.mockResolvedValue({ data: [], error: null });
  supabaseMocks.query.upsert.mockResolvedValue({ error: null });
});

afterEach(() => {
  setNavigatorOnline(true);
  cleanup();
  vi.restoreAllMocks();
  supabaseMocks.auth.getSession.mockReset();
  supabaseMocks.auth.onAuthStateChange.mockReset();
  supabaseMocks.auth.signInWithOAuth.mockReset();
  supabaseMocks.auth.signOut.mockReset();
  supabaseMocks.from.mockClear();
  supabaseMocks.query.select.mockClear();
  supabaseMocks.query.eq.mockClear();
  supabaseMocks.query.in.mockClear();
  supabaseMocks.query.upsert.mockClear();
  supabaseMocks.unsubscribe.mockReset();
  window.history.replaceState({}, '', '/#/');
});

describe('Supabase認証', () => {
  it('未ログイン時はGoogleログインを案内する', async () => {
    renderAuthSection();

    expect(
      await screen.findByText('クラウド同期を利用するにはログインが必要です。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Googleでログイン' })).toBeEnabled();
  });

  it('ログイン済みの場合は表示名とログアウトを表示する', async () => {
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    renderAuthSection();

    expect(await screen.findByText('学習 太郎')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '今すぐ同期' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeEnabled();
    await waitFor(() => {
      expect(supabaseMocks.from).toHaveBeenCalledWith('learning_sync_items');
      expect(supabaseMocks.query.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
      expect(supabaseMocks.query.in).toHaveBeenCalledWith('scope', [
        'sc:a1.question',
        'sc:a2.question',
        'sc:b1.answer',
        'sc:b1.progress',
        'sc:b1.reset',
      ]);
    });
  });

  it('オンライン復帰時にA-1・A-2同期を再実行する', async () => {
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    renderAuthSection();
    await waitFor(() => expect(supabaseMocks.query.in).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event('online'));

    await waitFor(() => expect(supabaseMocks.query.in).toHaveBeenCalledTimes(2));
  });

  it('オフラインと未同期件数を表示し、オンライン復帰で自動送信する', async () => {
    setNavigatorOnline(false);
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    renderAuthSection();
    expect(await screen.findByText('オフライン')).toBeInTheDocument();
    expect(screen.getByText(/学習内容はこの端末に保存されています/)).toBeInTheDocument();
    await new LearningRepository(database, 'a1').setFavorite(
      a1QuestionCode,
      true,
      '2026-08-09T08:00:00.000Z',
    );

    expect(await screen.findByText('未同期 1件')).toBeInTheDocument();
    expect(supabaseMocks.query.in).not.toHaveBeenCalled();

    setNavigatorOnline(true);
    window.dispatchEvent(new Event('online'));
    expect(await screen.findByText('同期完了')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('未同期 1件')).not.toBeInTheDocument());
    await expect(database.cloudSyncOutbox.count()).resolves.toBe(0);
  });

  it('一時失敗後に未同期を保持し、再試行ボタンで送信できる', async () => {
    setNavigatorOnline(false);
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    const user = userEvent.setup();
    renderAuthSection();
    await screen.findByText('オフライン');
    await new LearningRepository(database, 'a1').setFavorite(
      a1QuestionCode,
      true,
      '2026-08-09T08:10:00.000Z',
    );
    await screen.findByText('未同期 1件');
    setNavigatorOnline(true);
    supabaseMocks.query.upsert.mockResolvedValueOnce({
      error: { code: 'SERVER_ERROR' },
      status: 503,
    });

    await user.click(screen.getByRole('button', { name: '今すぐ同期' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('この端末に保存され');
    expect(screen.getByRole('button', { name: '再試行' })).toBeEnabled();
    await expect(database.cloudSyncOutbox.count()).resolves.toBe(1);

    supabaseMocks.query.upsert.mockResolvedValueOnce({ error: null, status: 201 });
    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByText('同期完了')).toBeInTheDocument();
    await expect(database.cloudSyncOutbox.count()).resolves.toBe(0);
  });

  it('同期中に更新通知を受けた場合は並列化せず完了後にもう一度同期する', async () => {
    let resolveInitialSync: ((value: { data: []; error: null }) => void) | undefined;
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    supabaseMocks.query.in.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitialSync = resolve;
        }),
    );
    renderAuthSection();
    await waitFor(() => expect(supabaseMocks.query.in).toHaveBeenCalledTimes(1));

    notifyCloudSyncNeeded({ debounceMs: 0 });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(supabaseMocks.query.in).toHaveBeenCalledTimes(1);
    resolveInitialSync?.({ data: [], error: null });

    await waitFor(() => expect(supabaseMocks.query.in).toHaveBeenCalledTimes(2));
  });

  it('同期失敗時も端末の学習を利用できることを表示する', async () => {
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    supabaseMocks.query.in.mockResolvedValue({
      data: null,
      error: { message: 'network error' },
    });

    renderAuthSection();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('クラウド同期に失敗しました');
    expect(alert).toHaveTextContent('この端末の学習データは引き続き利用できます。');
  });

  it('PKCEの認証後はセッション確立後にcodeだけを除去し、HashRouterのhashを保持する', async () => {
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    window.history.replaceState({}, '', '/?code=oauth-code&state=test#/settings');
    renderAuthSection();

    expect(await screen.findByText('学習 太郎')).toBeInTheDocument();
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#/settings');
  });

  it('表示名がない場合はメールアドレスを表示する', async () => {
    const session = signedInSession();
    session.user.user_metadata = {};
    supabaseMocks.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    renderAuthSection();

    expect(await screen.findByText('learner@example.com')).toBeInTheDocument();
  });

  it('ログイン状態の取得中は操作を無効化して表示する', () => {
    supabaseMocks.auth.getSession.mockReturnValue(new Promise(() => undefined));
    renderAuthSection();

    expect(screen.getByRole('status')).toHaveTextContent('ログイン状態を確認しています。');
    expect(screen.queryByRole('button', { name: 'Googleでログイン' })).not.toBeInTheDocument();
  });

  it('Googleログイン時にBASE_URLを戻り先としてOAuthを開始する', async () => {
    const user = userEvent.setup();
    renderAuthSection();

    await user.click(await screen.findByRole('button', { name: 'Googleでログイン' }));

    await waitFor(() =>
      expect(supabaseMocks.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
        },
      }),
    );
  });

  it('ログアウト時にSupabaseのログアウトだけを呼び、IndexedDBを削除しない', async () => {
    const user = userEvent.setup();
    const deleteDatabase = vi.spyOn(database, 'delete');
    let resolveInitialSync: ((value: { data: []; error: null }) => void) | undefined;
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    supabaseMocks.query.in.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitialSync = resolve;
        }),
    );
    renderAuthSection();

    await screen.findByText('学習履歴を同期しています。');
    const signOutButton = await screen.findByRole('button', { name: 'ログアウト' });
    expect(signOutButton).toBeEnabled();
    await user.click(signOutButton);

    await waitFor(() => expect(supabaseMocks.auth.signOut).toHaveBeenCalledTimes(1));
    expect(supabaseMocks.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(deleteDatabase).not.toHaveBeenCalled();
    resolveInitialSync?.({ data: [], error: null });
  });

  it('クラウド同期中でもB-1回答と次への移動をブロックしない', async () => {
    const user = userEvent.setup();
    let resolveInitialSync: ((value: { data: []; error: null }) => void) | undefined;
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    supabaseMocks.query.in.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitialSync = resolve;
        }),
    );
    const session = await new B1Repository(database).createPractice(
      b1Cases[0],
      '2026-08-09T08:00:00.000Z',
    );
    window.location.hash = `#/b1/practice/${session.id}`;
    render(<App />);

    await waitFor(() => expect(supabaseMocks.query.in).toHaveBeenCalledTimes(1));
    const answer = (await screen.findAllByRole('textbox')).find((element) =>
      element.id.startsWith(`${session.unitIds[0]}-`),
    );
    if (answer === undefined) throw new Error('B-1 answer field is required');
    expect(answer).toBeEnabled();
    await user.type(answer, '同期中の回答');
    const nextButton = screen.getByRole('button', { name: '次へ' });
    await waitFor(() => expect(nextButton).toBeEnabled());
    await user.click(nextButton);

    await waitFor(async () => {
      expect((await database.b1PracticeSessions.get(session.id))?.currentIndex).toBe(1);
    });
    resolveInitialSync?.({ data: [], error: null });
  });

  it('認証に失敗した場合は日本語のエラーを表示する', async () => {
    const user = userEvent.setup();
    supabaseMocks.auth.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google' },
      error: { message: 'OAuth failure' },
    });
    renderAuthSection();

    await user.click(await screen.findByRole('button', { name: 'Googleでログイン' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Googleログインを開始できませんでした。接続と設定を確認して、もう一度お試しください。',
    );
  });

  it('環境変数が未設定でも既存の設定画面を表示する', async () => {
    supabaseMocks.configuration.isConfigured = false;
    window.history.replaceState({}, '', '/#/settings');
    render(<App />);

    await waitForRouteLoadingToFinish();
    expect(await screen.findByRole('heading', { name: '設定' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'クラウド同期は設定されていません。この端末での学習は引き続き利用できます。',
      ),
    ).toBeInTheDocument();
  });

  it('認証後のHashRouterルートをNotFoundへ変更しない', async () => {
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    window.history.replaceState({}, '', '/?code=oauth-code#/settings');
    render(<App />);

    await waitForRouteLoadingToFinish();
    expect(await screen.findByRole('heading', { name: '設定' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'ページが見つかりません' }),
    ).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#/settings');
  });

  it('コンポーネント破棄時に認証状態の購読を解除する', async () => {
    const view = renderAuthSection();
    await screen.findByRole('button', { name: 'Googleでログイン' });

    view.unmount();

    expect(supabaseMocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});

function setNavigatorOnline(value: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}
