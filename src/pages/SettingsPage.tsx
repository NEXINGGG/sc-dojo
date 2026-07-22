import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { database } from '../database/database';
import { allQuestions } from '../data/catalog';
import {
  createQuestionDataIdentity,
  parseBackupJsonWithB1,
  validateBackupFileSize,
  type BackupPreview,
  type ValidatedBackup,
} from '../domain/backup';
import { downloadBackup } from '../features/settings/backupDownload';
import { readBackupFileAsText } from '../features/settings/backupFile';
import {
  APP_VERSION,
  DataManagementRepository,
  type StoredDataSummary,
} from '../features/settings/dataManagementRepository';
import { useDisplaySettings } from '../features/settings/DisplaySettingsContext';
import { PwaSettingsSection } from '../features/pwa/PwaSettingsSection';
import { usePwa } from '../features/pwa/PwaContext';

type DialogKind = 'reset-display' | 'restore' | 'clear-learning-data';
type Notice = { kind: 'success' | 'error'; message: string };

const dataManagementRepository = new DataManagementRepository(database);
const questionDataIdentity = createQuestionDataIdentity(allQuestions, 1);

export function SettingsPage() {
  const {
    settings,
    isLoading: isSettingsLoading,
    error: settingsError,
    updateTheme,
    updateFontSize,
    updateReducedMotion,
    resetDisplaySettings,
    reloadDisplaySettings,
    clearError,
  } = useDisplaySettings();
  const { runDataOperation } = usePwa();
  const [summary, setSummary] = useState<StoredDataSummary>();
  const [dialog, setDialog] = useState<DialogKind>();
  const [restoreCandidate, setRestoreCandidate] = useState<ValidatedBackup>();
  const [notice, setNotice] = useState<Notice>();
  const [clearConfirmation, setClearConfirmation] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await dataManagementRepository.getSummary());
    } catch {
      setNotice({
        kind: 'error',
        message: '保存データの概要を読み込めませんでした。再読み込みしてもう一度お試しください。',
      });
    }
  }, []);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  function closeDialog() {
    setDialog(undefined);
    setRestoreCandidate(undefined);
    setClearConfirmation('');
  }

  async function createBackup() {
    setIsBusy(true);
    setNotice(undefined);
    try {
      const backup = await dataManagementRepository.createBackup();
      downloadBackup(backup);
      setNotice({ kind: 'success', message: '学習データのバックアップを作成しました。' });
    } catch {
      setNotice({
        kind: 'error',
        message:
          'バックアップを作成できませんでした。現在の学習データは変更されていません。再試行してください。',
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function selectBackupFile(file: File | undefined) {
    if (file === undefined) {
      return;
    }
    setNotice(undefined);
    setRestoreCandidate(undefined);
    const fileSizeError = validateBackupFileSize(file.size);
    if (fileSizeError !== undefined && !fileSizeError.ok) {
      setNotice({ kind: 'error', message: fileSizeError.errors[0].message });
      return;
    }

    setIsBusy(true);
    try {
      const validation = await parseBackupJsonWithB1(
        await readBackupFileAsText(file),
        allQuestions,
        questionDataIdentity,
      );
      if (!validation.ok) {
        setNotice({ kind: 'error', message: validation.errors[0].message });
        return;
      }
      setRestoreCandidate(validation.value);
      if (validation.warnings.length > 0) {
        setNotice({ kind: 'success', message: validation.warnings.join(' ') });
      }
      setDialog('restore');
    } catch {
      setNotice({
        kind: 'error',
        message: 'ファイルを読み込めませんでした。別のバックアップファイルを選んでください。',
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function performRestore() {
    if (restoreCandidate === undefined) {
      return;
    }
    setIsBusy(true);
    setNotice(undefined);
    try {
      await runDataOperation(() => dataManagementRepository.restore(restoreCandidate));
      await reloadDisplaySettings();
      await refreshSummary();
      closeDialog();
      setNotice({
        kind: 'success',
        message: 'バックアップを復元しました。学習データを完全に置き換えました。',
      });
    } catch {
      setNotice({
        kind: 'error',
        message:
          '復元に失敗しました。現在の学習データは変更されていません。再試行するか、別のファイルを選んでください。',
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function clearLearningData() {
    if (clearConfirmation !== '削除') {
      return;
    }
    setIsBusy(true);
    setNotice(undefined);
    try {
      await runDataOperation(() => dataManagementRepository.clearLearningData());
      await refreshSummary();
      closeDialog();
      setNotice({
        kind: 'success',
        message: '学習データを全消去しました。表示設定は保持されています。',
      });
    } catch {
      setNotice({
        kind: 'error',
        message:
          '学習データを削除できませんでした。現在のデータは変更されていません。再試行してください。',
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <PageHeader description="表示と学習データを、この端末内で安全に管理します。" title="設定" />

      {(notice !== undefined || settingsError !== undefined) && (
        <div
          className={`inline-notice ${notice?.kind === 'error' || settingsError !== undefined ? 'inline-notice-error' : 'inline-notice-success'}`}
          role={notice?.kind === 'error' || settingsError !== undefined ? 'alert' : 'status'}
        >
          <strong>
            {notice?.kind === 'error' || settingsError !== undefined
              ? '操作できませんでした'
              : '完了しました'}
          </strong>
          <p>{settingsError ?? notice?.message}</p>
          {settingsError !== undefined && (
            <button className="text-button" onClick={clearError} type="button">
              閉じる
            </button>
          )}
        </div>
      )}

      <section aria-labelledby="display-settings-heading" className="surface-card settings-section">
        <h2 id="display-settings-heading">表示設定</h2>
        <p className="muted-text">変更はすぐに反映され、この端末に保存されます。</p>

        <fieldset className="settings-fieldset" disabled={isBusy || isSettingsLoading}>
          <legend>テーマ</legend>
          <div className="settings-option-list">
            <SettingRadio
              checked={settings.theme === 'system'}
              label="システム設定に合わせる"
              name="theme"
              onChange={() => void updateTheme('system')}
              value="system"
            />
            <SettingRadio
              checked={settings.theme === 'light'}
              label="ライト"
              name="theme"
              onChange={() => void updateTheme('light')}
              value="light"
            />
            <SettingRadio
              checked={settings.theme === 'dark'}
              label="ダーク"
              name="theme"
              onChange={() => void updateTheme('dark')}
              value="dark"
            />
          </div>
        </fieldset>

        <fieldset className="settings-fieldset" disabled={isBusy || isSettingsLoading}>
          <legend>文字サイズ</legend>
          <div className="settings-option-list">
            <SettingRadio
              checked={settings.fontSize === 'small'}
              label="小（90%）"
              name="font-size"
              onChange={() => void updateFontSize('small')}
              value="small"
            />
            <SettingRadio
              checked={settings.fontSize === 'standard'}
              label="標準（100%）"
              name="font-size"
              onChange={() => void updateFontSize('standard')}
              value="standard"
            />
            <SettingRadio
              checked={settings.fontSize === 'large'}
              label="大（112.5%）"
              name="font-size"
              onChange={() => void updateFontSize('large')}
              value="large"
            />
            <SettingRadio
              checked={settings.fontSize === 'extra_large'}
              label="特大（125%）"
              name="font-size"
              onChange={() => void updateFontSize('extra_large')}
              value="extra_large"
            />
          </div>
        </fieldset>

        <fieldset className="settings-fieldset" disabled={isBusy || isSettingsLoading}>
          <legend>動きの軽減</legend>
          <div className="settings-option-list">
            <SettingRadio
              checked={settings.reducedMotion === 'system'}
              label="システム設定に合わせる"
              name="reduced-motion"
              onChange={() => void updateReducedMotion('system')}
              value="system"
            />
            <SettingRadio
              checked={settings.reducedMotion === 'reduce'}
              label="軽減する"
              name="reduced-motion"
              onChange={() => void updateReducedMotion('reduce')}
              value="reduce"
            />
            <SettingRadio
              checked={settings.reducedMotion === 'no_preference'}
              label="軽減しない"
              name="reduced-motion"
              onChange={() => void updateReducedMotion('no_preference')}
              value="no_preference"
            />
          </div>
        </fieldset>

        <button
          className="secondary-button"
          disabled={isBusy}
          onClick={() => setDialog('reset-display')}
          type="button"
        >
          表示設定を初期値へ戻す
        </button>
      </section>

      <section aria-labelledby="data-management-heading" className="surface-card settings-section">
        <h2 id="data-management-heading">データ管理</h2>
        <p className="muted-text">バックアップには問題文・選択肢・正解・解説の全文は含めません。</p>
        <div className="settings-action-list">
          <button
            className="primary-button"
            disabled={isBusy}
            onClick={() => void createBackup()}
            type="button"
          >
            バックアップを作成
          </button>
          <label className="file-input-label" htmlFor="backup-file-input">
            バックアップから復元
          </label>
          <input
            accept="application/json,.json"
            aria-describedby="backup-file-help"
            disabled={isBusy}
            id="backup-file-input"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              void selectBackupFile(file);
            }}
            type="file"
          />
          <p className="muted-text" id="backup-file-help">
            JSON形式・10MB以下。選択しただけでは復元されません。
          </p>
          <button
            className="secondary-button danger-button"
            disabled={isBusy}
            onClick={() => setDialog('clear-learning-data')}
            type="button"
          >
            学習データを全消去
          </button>
        </div>
        <DataSummary summary={summary} />
      </section>

      <section aria-labelledby="app-information-heading" className="surface-card settings-section">
        <h2 id="app-information-heading">アプリ情報</h2>
        <dl className="settings-summary-list">
          <div>
            <dt>アプリ名</dt>
            <dd>NW道場</dd>
          </div>
          <div>
            <dt>アプリバージョン</dt>
            <dd>{APP_VERSION}</dd>
          </div>
          <div>
            <dt>問題数</dt>
            <dd>{allQuestions.length}問</dd>
          </div>
          <div>
            <dt>問題データ</dt>
            <dd>
              v{questionDataIdentity.schemaVersion}・{questionDataIdentity.fingerprint}
            </dd>
          </div>
        </dl>
      </section>

      <PwaSettingsSection />

      {dialog === 'reset-display' && (
        <ConfirmDialog
          description="テーマ、文字サイズ、動きの軽減だけを初期値へ戻します。学習データは削除しません。"
          title="表示設定を初期値へ戻しますか？"
        >
          <button
            className="primary-button"
            disabled={isBusy}
            onClick={() => {
              void resetDisplaySettings();
              closeDialog();
              setNotice({ kind: 'success', message: '表示設定を初期値へ戻しました。' });
            }}
            type="button"
          >
            初期値へ戻す
          </button>
          <button
            className="secondary-button"
            disabled={isBusy}
            onClick={closeDialog}
            type="button"
          >
            キャンセル
          </button>
        </ConfirmDialog>
      )}

      {dialog === 'restore' && restoreCandidate !== undefined && (
        <RestoreDialog
          backup={restoreCandidate}
          disabled={isBusy}
          onCancel={closeDialog}
          onRestore={() => void performRestore()}
        />
      )}

      {dialog === 'clear-learning-data' && (
        <ConfirmDialog
          description="回答履歴、お気に入り、途中セッション、演習結果、模試結果、学習日記録と、端末へ登録したB-1公式PDFを削除します。元に戻せません。表示設定は残ります。"
          title="学習データを全消去しますか？"
        >
          <p className="dialog-inline-help">必要なら、先にバックアップを作成できます。</p>
          <button
            className="secondary-button"
            disabled={isBusy}
            onClick={() => void createBackup()}
            type="button"
          >
            先にバックアップを作成
          </button>
          <label className="dialog-input-label" htmlFor="clear-confirmation">
            確認文字「削除」を入力してください
          </label>
          <input
            autoComplete="off"
            id="clear-confirmation"
            onChange={(event) => setClearConfirmation(event.target.value)}
            value={clearConfirmation}
          />
          <button
            className="primary-button danger-button"
            disabled={isBusy || clearConfirmation !== '削除'}
            onClick={() => void clearLearningData()}
            type="button"
          >
            学習データを全消去する
          </button>
          <button
            className="secondary-button"
            disabled={isBusy}
            onClick={closeDialog}
            type="button"
          >
            キャンセル
          </button>
        </ConfirmDialog>
      )}
    </>
  );
}

interface SettingRadioProps {
  checked: boolean;
  label: string;
  name: string;
  onChange: () => void;
  value: string;
}

function SettingRadio({ checked, label, name, onChange, value }: SettingRadioProps) {
  const id = `${name}-${value}`;
  return (
    <label className="setting-option" htmlFor={id}>
      <input checked={checked} id={id} name={name} onChange={onChange} type="radio" value={value} />
      <span>{label}</span>
    </label>
  );
}

function DataSummary({ summary }: { summary: StoredDataSummary | undefined }) {
  if (summary === undefined) {
    return <p className="muted-text">保存データを確認しています。</p>;
  }
  return (
    <>
      <h3>保存データの概要</h3>
      <dl className="settings-summary-list">
        <div>
          <dt>回答履歴</dt>
          <dd>{summary.answerHistoryCount}件</dd>
        </div>
        <div>
          <dt>回答済み問題</dt>
          <dd>{summary.studiedQuestionCount}問</dd>
        </div>
        <div>
          <dt>お気に入り</dt>
          <dd>{summary.favoriteCount}問</dd>
        </div>
        <div>
          <dt>通常演習結果</dt>
          <dd>{summary.normalPracticeResultCount}件</dd>
        </div>
        <div>
          <dt>模試結果</dt>
          <dd>{summary.mockExamResultCount}件</dd>
        </div>
        <div>
          <dt>学習日数</dt>
          <dd>{summary.learningDayCount}日</dd>
        </div>
        <div>
          <dt>未完了通常演習</dt>
          <dd>{summary.hasInProgressPractice ? 'あり' : 'なし'}</dd>
        </div>
        <div>
          <dt>未完了模試</dt>
          <dd>{summary.hasInProgressExam ? 'あり' : 'なし'}</dd>
        </div>
        <div>
          <dt>DBスキーマ</dt>
          <dd>v{summary.databaseSchemaVersion}</dd>
        </div>
        <div>
          <dt>B-1登録PDF</dt>
          <dd>{summary.b1RegisteredPdfCount}年度分</dd>
        </div>
        <div>
          <dt>未完了B-1演習</dt>
          <dd>{summary.b1InProgressPractice ? 'あり' : 'なし'}</dd>
        </div>
        <div>
          <dt>未完了B-1模試</dt>
          <dd>{summary.b1InProgressMock ? 'あり' : 'なし'}</dd>
        </div>
      </dl>
    </>
  );
}

function RestoreDialog({
  backup,
  disabled,
  onCancel,
  onRestore,
}: {
  backup: ValidatedBackup;
  disabled: boolean;
  onCancel: () => void;
  onRestore: () => void;
}) {
  const preview: BackupPreview = backup.preview;
  return (
    <ConfirmDialog
      description="現在の学習データを、表示したバックアップ内容で完全に置き換えます。元に戻せません。"
      title="バックアップを復元しますか？"
    >
      <dl className="settings-summary-list dialog-summary-list">
        <div>
          <dt>作成日時</dt>
          <dd>{formatDateTime(preview.exportedAt)}</dd>
        </div>
        <div>
          <dt>アプリバージョン</dt>
          <dd>{preview.appVersion}</dd>
        </div>
        <div>
          <dt>回答履歴</dt>
          <dd>{preview.answerHistoryCount}件</dd>
        </div>
        <div>
          <dt>お気に入り</dt>
          <dd>{preview.favoriteCount}問</dd>
        </div>
        <div>
          <dt>通常演習結果</dt>
          <dd>{preview.normalPracticeResultCount}件</dd>
        </div>
        <div>
          <dt>模試結果</dt>
          <dd>{preview.mockExamResultCount}件</dd>
        </div>
        <div>
          <dt>学習日数</dt>
          <dd>{preview.learningDayCount}日</dd>
        </div>
        <div>
          <dt>未完了通常演習</dt>
          <dd>{preview.normalPracticeSessionCount > 0 ? 'あり' : 'なし'}</dd>
        </div>
        <div>
          <dt>未完了模試</dt>
          <dd>{preview.mockExamSessionCount > 0 ? 'あり' : 'なし'}</dd>
        </div>
        <div>
          <dt>未完了B-1演習</dt>
          <dd>{preview.b1PracticeSessionCount > 0 ? 'あり' : 'なし'}</dd>
        </div>
        <div>
          <dt>B-1模試</dt>
          <dd>{preview.b1MockSessionCount}件</dd>
        </div>
        <div>
          <dt>B-1登録PDFの情報</dt>
          <dd>{preview.b1PdfRegistrationCount}年度分（PDF本体は復元しません）</dd>
        </div>
        <div>
          <dt>表示設定</dt>
          <dd>{displaySettingsLabel(preview.settings)}</dd>
        </div>
        <div>
          <dt>未知の問題ID</dt>
          <dd>{preview.unknownQuestionIdCount}件</dd>
        </div>
        <div>
          <dt>除外されるデータ</dt>
          <dd>{preview.excludedRecordCount}件</dd>
        </div>
        <div>
          <dt>問題データ</dt>
          <dd>
            {preview.questionDataMatches
              ? '現在の問題データと一致'
              : '差分あり（存在する問題IDのみ復元）'}
          </dd>
        </div>
      </dl>
      <button
        className="primary-button danger-button"
        disabled={disabled}
        onClick={onRestore}
        type="button"
      >
        復元する
      </button>
      <button className="secondary-button" disabled={disabled} onClick={onCancel} type="button">
        キャンセル
      </button>
    </ConfirmDialog>
  );
}

function displaySettingsLabel(settings: {
  theme: string;
  fontSize: string;
  reducedMotion: string;
}): string {
  const theme =
    settings.theme === 'system' ? 'システム' : settings.theme === 'light' ? 'ライト' : 'ダーク';
  const fontSize =
    settings.fontSize === 'small'
      ? '小'
      : settings.fontSize === 'large'
        ? '大'
        : settings.fontSize === 'extra_large'
          ? '特大'
          : '標準';
  const motion =
    settings.reducedMotion === 'system'
      ? 'システム'
      : settings.reducedMotion === 'reduce'
        ? '軽減する'
        : '軽減しない';
  return `${theme}・${fontSize}・${motion}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '不明'
    : new Intl.DateTimeFormat('ja-JP', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Tokyo',
      }).format(date);
}
