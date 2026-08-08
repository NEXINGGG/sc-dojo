import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { database } from '../../database/database';
import { waitForRouteLoadingToFinish } from '../../test/routeLoading';

const supabaseMocks = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  const auth = {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  };

  return {
    auth,
    client: { auth },
    configuration: { isConfigured: true },
    unsubscribe,
  };
});

vi.mock('./supabaseClient', () => ({
  supabaseClient: supabaseMocks.client,
  authConfiguration: supabaseMocks.configuration,
}));

import { AuthProvider } from './AuthContext';
import { CloudAuthSection } from './CloudAuthSection';

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
      <CloudAuthSection />
    </AuthProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/#/');
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
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  supabaseMocks.auth.getSession.mockReset();
  supabaseMocks.auth.onAuthStateChange.mockReset();
  supabaseMocks.auth.signInWithOAuth.mockReset();
  supabaseMocks.auth.signOut.mockReset();
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
    expect(
      screen.getByText('クラウド同期準備完了。学習履歴の同期はまだ利用できません。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeEnabled();
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
    supabaseMocks.auth.getSession.mockResolvedValue({
      data: { session: signedInSession() },
      error: null,
    });
    renderAuthSection();

    await user.click(await screen.findByRole('button', { name: 'ログアウト' }));

    await waitFor(() => expect(supabaseMocks.auth.signOut).toHaveBeenCalledTimes(1));
    expect(deleteDatabase).not.toHaveBeenCalled();
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
