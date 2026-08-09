import type { User } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';
import { useCloudSync } from '../sync/CloudSyncContext';

export function CloudAuthSection() {
  const {
    user,
    isConfigured,
    isLoading,
    isActionInProgress,
    error,
    signInWithGoogle,
    signOut,
    clearError,
  } = useAuth();
  const {
    status: syncStatus,
    error: syncError,
    errorKind: syncErrorKind,
    lastSuccessfulSyncAt,
    requestSync,
    clearSyncError,
  } = useCloudSync();
  const isSyncing = syncStatus === 'syncing';
  const isAuthBusy = isLoading || isActionInProgress;
  const isSyncBusy = isAuthBusy || isSyncing;

  return (
    <section
      aria-labelledby="cloud-auth-heading"
      className="surface-card settings-section cloud-auth-section"
    >
      <h2 id="cloud-auth-heading">クラウド同期</h2>

      {!isConfigured ? (
        <p className="muted-text">
          クラウド同期は設定されていません。この端末での学習は引き続き利用できます。
        </p>
      ) : isLoading ? (
        <p aria-live="polite" className="muted-text" role="status">
          ログイン状態を確認しています。
        </p>
      ) : user === undefined ? (
        <>
          <p className="muted-text">クラウド同期を利用するにはログインが必要です。</p>
          <div className="cloud-auth-actions">
            <button
              className="primary-button"
              disabled={isAuthBusy}
              onClick={() => void signInWithGoogle()}
              type="button"
            >
              Googleでログイン
            </button>
          </div>
        </>
      ) : (
        <>
          <dl className="settings-summary-list cloud-auth-account">
            <div>
              <dt>ログイン中のアカウント</dt>
              <dd>{getAccountLabel(user)}</dd>
            </div>
          </dl>
          <dl className="settings-summary-list cloud-auth-account">
            <div>
              <dt>最終同期</dt>
              <dd>
                {lastSuccessfulSyncAt === undefined
                  ? 'まだ同期していません'
                  : formatSyncDateTime(lastSuccessfulSyncAt)}
              </dd>
            </div>
          </dl>
          <div className="cloud-auth-actions">
            <button
              className="primary-button"
              disabled={isSyncBusy}
              onClick={() => void requestSync()}
              type="button"
            >
              今すぐ同期
            </button>
            <button
              className="secondary-button"
              disabled={isAuthBusy}
              onClick={() => void signOut()}
              type="button"
            >
              ログアウト
            </button>
          </div>
        </>
      )}

      {isActionInProgress && (
        <p aria-live="polite" className="muted-text" role="status">
          処理しています。
        </p>
      )}

      {isSyncing && (
        <p aria-live="polite" className="muted-text" role="status">
          学習履歴を同期しています。
        </p>
      )}

      {syncStatus === 'success' && (
        <div className="inline-notice inline-notice-success cloud-auth-error" role="status">
          <strong>クラウド同期が完了しました</strong>
          <p>この端末とクラウドのA-1・A-2学習履歴を問題単位で統合しました。</p>
        </div>
      )}

      {syncStatus === 'error' && syncError !== undefined && (
        <div
          className={`inline-notice ${syncErrorKind === 'user_switch' ? 'inline-notice-warning' : 'inline-notice-error'} cloud-auth-error`}
          role="alert"
        >
          <strong>
            {syncErrorKind === 'user_switch'
              ? 'アカウントの切替を検出しました'
              : 'クラウド同期に失敗しました'}
          </strong>
          <p>{syncError}</p>
          <p>この端末の学習データは引き続き利用できます。</p>
          <button className="text-button" onClick={clearSyncError} type="button">
            閉じる
          </button>
        </div>
      )}

      {error !== undefined && (
        <div className="inline-notice inline-notice-error cloud-auth-error" role="alert">
          <strong>認証を完了できませんでした</strong>
          <p>{error}</p>
          <button className="text-button" onClick={clearError} type="button">
            閉じる
          </button>
        </div>
      )}
    </section>
  );
}

function getAccountLabel(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown>;
  const fullName = metadata.full_name;
  const name = metadata.name;

  if (typeof fullName === 'string' && fullName.trim() !== '') {
    return fullName;
  }
  if (typeof name === 'string' && name.trim() !== '') {
    return name;
  }
  return user.email ?? 'Googleアカウント';
}

function formatSyncDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '不明'
    : new Intl.DateTimeFormat('ja-JP', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Tokyo',
      }).format(date);
}
