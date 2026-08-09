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
    isOnline,
    error: syncError,
    errorKind: syncErrorKind,
    lastSuccessfulSyncAt,
    lastSyncCounts,
    pending,
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

      <p className={`cloud-connection-status ${isOnline ? 'is-online' : 'is-offline'}`}>
        <strong>{isOnline ? 'オンライン' : 'オフライン'}</strong>
        {!isOnline && <span> - 学習内容はこの端末に保存されています</span>}
      </p>

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
              {pending.failed > 0 ? '再試行' : '今すぐ同期'}
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
          同期中...
          <span className="visually-hidden">学習履歴を同期しています。</span>
        </p>
      )}

      {user !== undefined && pending.pending > 0 && (
        <div className="cloud-pending-summary" role="status">
          <strong>未同期 {pending.pending}件</strong>
          <span>学習内容はこの端末に保存されています。</span>
        </div>
      )}

      {syncStatus === 'success' && (
        <div className="inline-notice inline-notice-success cloud-auth-error" role="status">
          <strong>同期完了</strong>
          <p>対象: A-1 / A-2 / B-1</p>
          {lastSyncCounts !== undefined ? (
            <p>
              アップロード: {lastSyncCounts.uploaded}件 / ダウンロード: {lastSyncCounts.downloaded}
              件
            </p>
          ) : null}
          {lastSyncCounts !== undefined ? (
            <CloudSubjectCounts
              counts={lastSyncCounts.bySubject}
              pendingBySubject={pending.bySubject}
            />
          ) : null}
        </div>
      )}

      {syncStatus === 'partial' && syncError !== undefined && (
        <div className="inline-notice inline-notice-warning cloud-auth-error" role="status">
          <strong>
            {syncErrorKind === 'auth'
              ? '再ログインが必要です'
              : `${pending.pending}件中${pending.failed}件を同期できませんでした`}
          </strong>
          <p>{syncError}</p>
          <p>学習内容はこの端末に保存されています。</p>
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
              : syncErrorKind === 'auth'
                ? '再ログインが必要です'
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

function CloudSubjectCounts({
  counts,
  pendingBySubject,
}: {
  counts: Record<'A1' | 'A2' | 'B1', { uploaded: number; downloaded: number }>;
  pendingBySubject: Record<'A1' | 'A2' | 'B1', number>;
}) {
  return (
    <dl className="cloud-scope-summary">
      {(['A1', 'A2', 'B1'] as const).map((subject) => (
        <div key={subject}>
          <dt>{subject}</dt>
          <dd>
            {formatSubjectSyncCounts(
              counts[subject].uploaded,
              counts[subject].downloaded,
              pendingBySubject[subject],
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatSubjectSyncCounts(uploaded: number, downloaded: number, pending: number): string {
  const parts: string[] = [];
  if (uploaded > 0) parts.push(`${uploaded}件アップロード`);
  if (downloaded > 0) parts.push(`${downloaded}件ダウンロード`);
  if (pending > 0) parts.push(`未同期${pending}件`);
  return parts.length === 0 ? '変更なし' : parts.join(' / ');
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
