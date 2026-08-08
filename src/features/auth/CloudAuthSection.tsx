import type { User } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';

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
  const isBusy = isLoading || isActionInProgress;

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
              disabled={isBusy}
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
          <p className="muted-text">クラウド同期準備完了。学習履歴の同期はまだ利用できません。</p>
          <div className="cloud-auth-actions">
            <button
              className="secondary-button"
              disabled={isBusy}
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
