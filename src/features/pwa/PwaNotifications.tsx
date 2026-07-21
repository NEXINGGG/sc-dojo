import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { usePwa } from './PwaContext';

export function PwaNotifications() {
  const location = useLocation();
  const {
    isOnline,
    isOfflineReadyNoticeVisible,
    dismissOfflineReadyNotice,
    needsUpdate,
    isUpdateDismissed,
    isUpdating,
    isDataOperationInProgress,
    updateError,
    requestUpdate,
    dismissUpdate,
  } = usePwa();
  const [showExamConfirmation, setShowExamConfirmation] = useState(false);
  const isExamInProgress = /^\/exam\/[^/]+$/.test(location.pathname);
  const showUpdate = needsUpdate && !isUpdateDismissed;

  async function applyUpdate() {
    try {
      await requestUpdate();
      setShowExamConfirmation(false);
    } catch {
      // 詳細な利用者向けメッセージはPWA Contextで状態別に設定します。
    }
  }

  function beginUpdate() {
    if (isExamInProgress) {
      setShowExamConfirmation(true);
      return;
    }
    void applyUpdate();
  }

  return (
    <>
      <div aria-label="接続と更新のお知らせ" className="app-notification-area">
        {!isOnline ? (
          <section className="app-notification app-notification-offline" role="status">
            <strong>オフラインです</strong>
            <p>保存済みデータで学習できます。接続が戻ると自動で表示を切り替えます。</p>
          </section>
        ) : null}
        {isOfflineReadyNoticeVisible ? (
          <section aria-live="polite" className="app-notification app-notification-ready">
            <div>
              <strong>オフラインでも利用できるようになりました</strong>
              <p>一度開いた画面や問題データは、通信がない場所でも使えます。</p>
            </div>
            <button
              aria-label="オフライン準備完了のお知らせを閉じる"
              className="text-button compact-notification-button"
              onClick={dismissOfflineReadyNotice}
              type="button"
            >
              閉じる
            </button>
          </section>
        ) : null}
        {showUpdate ? (
          <section
            aria-live="polite"
            className="app-notification app-notification-update"
            role="status"
          >
            <div>
              <strong>新しいバージョンがあります</strong>
              <p>学習状態を保存して更新できます。</p>
              {updateError !== undefined ? (
                <p className="notification-error">{updateError}</p>
              ) : null}
              {isDataOperationInProgress ? <p>復元または全消去の完了後に更新できます。</p> : null}
            </div>
            <div className="notification-actions">
              <button
                className="primary-button compact-notification-button"
                disabled={isUpdating || isDataOperationInProgress}
                onClick={beginUpdate}
                type="button"
              >
                {isUpdating ? '更新中…' : '更新する'}
              </button>
              <button
                className="secondary-button compact-notification-button"
                disabled={isUpdating}
                onClick={dismissUpdate}
                type="button"
              >
                後で
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {showExamConfirmation ? (
        <ConfirmDialog
          description="回答、現在位置、見直しはこの端末に保存してから更新します。更新後は保存済みの模試を続きから再開できます。"
          title="模試を保存して更新しますか？"
        >
          <button
            className="primary-button"
            disabled={isUpdating || isDataOperationInProgress}
            onClick={() => void applyUpdate()}
            type="button"
          >
            {isUpdating ? '更新中…' : '保存して更新する'}
          </button>
          <button
            className="secondary-button"
            disabled={isUpdating}
            onClick={() => setShowExamConfirmation(false)}
            type="button"
          >
            模試を続ける
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
