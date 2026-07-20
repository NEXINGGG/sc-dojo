import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { usePwa } from './PwaContext';

export function PwaSettingsSection() {
  const {
    appVersion,
    isOnline,
    isOfflineReady,
    serviceWorkerStatus,
    serviceWorkerError,
    needsUpdate,
    isUpdateDismissed,
    isUpdating,
    updateError,
    updateCheckMessage,
    isDataOperationInProgress,
    canPromptInstall,
    isInstalling,
    isInstalled,
    isIos,
    isIosSafari,
    requestInstall,
    checkForUpdate,
    requestUpdate,
    showUpdateNotice,
    dismissInstallSuggestion,
  } = usePwa();
  const [showGuide, setShowGuide] = useState(false);
  const [message, setMessage] = useState<string>();

  async function install() {
    setMessage(undefined);
    await requestInstall();
  }

  async function checkUpdate() {
    setMessage(undefined);
    try {
      await checkForUpdate();
    } catch {
      setMessage('更新を確認できませんでした。オンライン接続を確認して、もう一度お試しください。');
    }
  }

  async function update() {
    setMessage(undefined);
    try {
      await requestUpdate();
    } catch {
      setMessage(
        '更新できませんでした。保存状態とネットワーク接続を確認して、もう一度お試しください。',
      );
    }
  }

  return (
    <section aria-labelledby="pwa-settings-heading" className="surface-card settings-section">
      <h2 id="pwa-settings-heading">オフライン・インストール</h2>
      <p className="muted-text">
        NW道場を端末へ追加すると、通信が不安定な場所でも、保存済みの問題と学習データで続けられます。
      </p>
      <dl className="settings-summary-list">
        <div>
          <dt>接続状態</dt>
          <dd>{isOnline ? 'オンライン' : 'オフライン（保存済みデータで利用中）'}</dd>
        </div>
        <div>
          <dt>オフライン準備</dt>
          <dd>{offlineStatusLabel(serviceWorkerStatus, isOfflineReady)}</dd>
        </div>
        <div>
          <dt>インストール状態</dt>
          <dd>{isInstalled ? 'この端末に追加済み' : 'ブラウザから利用中'}</dd>
        </div>
        <div>
          <dt>アプリバージョン</dt>
          <dd>{appVersion}</dd>
        </div>
        <div>
          <dt>更新</dt>
          <dd>{needsUpdate ? '新しいバージョンがあります' : '現在のバージョンを利用中'}</dd>
        </div>
      </dl>
      {serviceWorkerError !== undefined ? (
        <p className="settings-inline-error">{serviceWorkerError}</p>
      ) : null}
      {(updateError ?? message) ? (
        <p className="settings-inline-error" role="alert">
          {updateError ?? message}
        </p>
      ) : null}
      {updateCheckMessage !== undefined ? (
        <p className="settings-inline-success" role="status">
          {updateCheckMessage}
        </p>
      ) : null}

      <div className="settings-action-list pwa-action-list">
        {canPromptInstall ? (
          <button
            className="primary-button"
            disabled={isInstalling}
            onClick={() => void install()}
            type="button"
          >
            {isInstalling ? 'インストールを確認中…' : 'この端末にインストール'}
          </button>
        ) : null}
        {!isInstalled ? (
          <button className="secondary-button" onClick={() => setShowGuide(true)} type="button">
            インストール方法を見る
          </button>
        ) : null}
        {needsUpdate ? (
          isUpdateDismissed ? (
            <button className="secondary-button" onClick={showUpdateNotice} type="button">
              更新のお知らせを再表示
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={isUpdating || isDataOperationInProgress}
              onClick={() => void update()}
              type="button"
            >
              {isUpdating ? '更新中…' : '保存して更新する'}
            </button>
          )
        ) : (
          <button
            className="secondary-button"
            disabled={isDataOperationInProgress}
            onClick={() => void checkUpdate()}
            type="button"
          >
            更新を確認する
          </button>
        )}
      </div>

      {showGuide ? (
        <ConfirmDialog
          description="NW道場は、ブラウザのメニューから端末のホーム画面へ追加できます。追加すると、アプリのように開けます。"
          title="インストール方法"
        >
          <div className="install-guide">
            <h3>PC・Android</h3>
            <p>
              ブラウザのメニューにある「インストール」または「アプリをインストール」を選びます。
            </p>
            <h3>iPhone・iPad</h3>
            {isIos && !isIosSafari ? (
              <p>
                このブラウザでは追加できない場合があります。Safariで開き、共有ボタンから「ホーム画面に追加」を選んでください。
              </p>
            ) : (
              <p>Safariの共有ボタンを押し、「ホーム画面に追加」を選んでください。</p>
            )}
            {isIos ? <p>ホーム画面から起動すると、追加済みかどうかを確認できます。</p> : null}
          </div>
          <button className="primary-button" onClick={() => setShowGuide(false)} type="button">
            閉じる
          </button>
          {!isInstalled ? (
            <button className="text-button" onClick={dismissInstallSuggestion} type="button">
              今は案内を表示しない
            </button>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

function offlineStatusLabel(
  serviceWorkerStatus: 'preparing' | 'ready' | 'unavailable' | 'error',
  isOfflineReady: boolean,
): string {
  if (isOfflineReady) return '準備済み（オフラインでも利用可能）';
  if (serviceWorkerStatus === 'unavailable') return 'このブラウザでは利用できません';
  if (serviceWorkerStatus === 'error') return '準備できませんでした';
  return '準備中（本番環境で初回読込み後に完了）';
}
