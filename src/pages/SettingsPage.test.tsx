import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { database } from '../database/database';
import { questionDataVersion, questions } from '../data/catalog';
import {
  createBackupDocument,
  createQuestionDataIdentity,
  serializeBackup,
} from '../domain/backup';
import { waitForRouteLoadingToFinish } from '../test/routeLoading';

async function clearAllData() {
  await Promise.all([
    database.questionProgress.clear(),
    database.answerAttempts.clear(),
    database.practiceSessions.clear(),
    database.practiceResults.clear(),
    database.examSessions.clear(),
    database.examResults.clear(),
    database.learningDays.clear(),
    database.settings.clear(),
  ]);
}

function renderSettings() {
  window.location.hash = '#/settings';
  render(<App />);
}

beforeEach(async () => {
  await clearAllData();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.fontSize;
  delete document.documentElement.dataset.reducedMotion;
});

afterEach(async () => {
  cleanup();
  await clearAllData();
  window.location.hash = '#/';
});

describe('設定画面', () => {
  it('テーマ、文字サイズ、動きの軽減を保存し、再表示後も維持する', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitForRouteLoadingToFinish();
    expect(
      await screen.findByRole('heading', { name: '設定' }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    const themeGroup = screen.getByRole('group', { name: 'テーマ' });
    const motionGroup = screen.getByRole('group', { name: '動きの軽減' });
    await user.click(within(themeGroup).getByRole('radio', { name: 'ライト' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    await user.click(within(themeGroup).getByRole('radio', { name: 'システム設定に合わせる' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined());
    await user.click(screen.getByRole('radio', { name: 'ダーク' }));
    await user.click(screen.getByRole('radio', { name: '小（90%）' }));
    await waitFor(() => expect(document.documentElement.dataset.fontSize).toBe('small'));
    await user.click(screen.getByRole('radio', { name: '標準（100%）' }));
    await user.click(screen.getByRole('radio', { name: '大（112.5%）' }));
    await user.click(screen.getByRole('radio', { name: '特大（125%）' }));
    await user.click(within(motionGroup).getByRole('radio', { name: '軽減しない' }));
    await user.click(within(motionGroup).getByRole('radio', { name: 'システム設定に合わせる' }));
    await user.click(within(motionGroup).getByRole('radio', { name: '軽減する' }));

    await waitFor(async () => {
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(document.documentElement.dataset.fontSize).toBe('extra_large');
      expect(document.documentElement.dataset.reducedMotion).toBe('reduce');
      await expect(database.settings.get('appearance')).resolves.toMatchObject({
        theme: 'dark',
        fontSize: 'extra_large',
        reducedMotion: 'reduce',
      });
    });

    cleanup();
    renderSettings();
    await waitForRouteLoadingToFinish();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'ダーク' })).toBeChecked());
    expect(screen.getByRole('radio', { name: '特大（125%）' })).toBeChecked();
  });

  it('表示設定のリセットでは学習データを削除しない', async () => {
    const user = userEvent.setup();
    await database.answerAttempts.add({
      code: questions[0].code,
      selectedChoice: questions[0].correctChoice,
      correctChoice: questions[0].correctChoice,
      isCorrect: true,
      answeredAt: '2026-07-18T00:00:00.000Z',
      mode: 'normal_practice',
      sessionId: 'settings-reset',
      version: 1,
    });
    renderSettings();
    await waitForRouteLoadingToFinish();
    await screen.findByRole('heading', { name: '設定' }, { timeout: 5_000 });
    await user.click(screen.getByRole('radio', { name: 'ライト' }));
    await user.click(screen.getByRole('radio', { name: '大（112.5%）' }));
    await user.click(screen.getByRole('button', { name: '表示設定を初期値へ戻す' }));
    const dialog = screen.getByRole('dialog', { name: '表示設定を初期値へ戻しますか？' });
    await user.click(within(dialog).getByRole('button', { name: '初期値へ戻す' }));

    await waitFor(() => expect(document.documentElement.dataset.fontSize).toBe('standard'));
    await expect(database.answerAttempts.count()).resolves.toBe(1);
  });

  it('復元プレビューを表示し、キャンセルでは現在のデータを変更しない', async () => {
    const user = userEvent.setup();
    await database.answerAttempts.add({
      code: questions[1].code,
      selectedChoice: questions[1].correctChoice,
      correctChoice: questions[1].correctChoice,
      isCorrect: true,
      answeredAt: '2026-07-18T00:00:00.000Z',
      mode: 'normal_practice',
      sessionId: 'current-data',
      version: 1,
    });
    const backup = createBackupDocument({
      exportedAt: '2026-07-18T00:00:00.000Z',
      appVersion: '0.1.0',
      databaseSchemaVersion: 4,
      questionData: createQuestionDataIdentity(questions, questionDataVersion),
      answerHistory: [],
      favorites: [],
      normalPracticeSessions: [],
      normalPracticeResults: [],
      mockExamSessions: [],
      mockExamResults: [],
      learningDays: [],
      settings: [],
    });
    renderSettings();
    await waitForRouteLoadingToFinish();
    await screen.findByRole('heading', { name: '設定' }, { timeout: 5_000 });
    const input = screen.getByLabelText('バックアップから復元');
    await user.upload(
      input,
      new File([serializeBackup(backup)], 'backup.json', { type: 'application/json' }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'バックアップを復元しますか？' });
    expect(dialog).toHaveTextContent(
      '現在の学習データを、表示したバックアップ内容で完全に置き換えます。',
    );
    await user.click(within(dialog).getByRole('button', { name: 'キャンセル' }));
    await expect(database.answerAttempts.count()).resolves.toBe(1);
  });

  it('確認文字が一致したときだけ学習データを全消去し、表示設定を保持する', async () => {
    const user = userEvent.setup();
    await database.answerAttempts.add({
      code: questions[2].code,
      selectedChoice: questions[2].correctChoice,
      correctChoice: questions[2].correctChoice,
      isCorrect: true,
      answeredAt: '2026-07-18T00:00:00.000Z',
      mode: 'normal_practice',
      sessionId: 'clear-data',
      version: 1,
    });
    await database.settings.put({
      key: 'appearance',
      theme: 'dark',
      fontSize: 'large',
      reducedMotion: 'reduce',
      shuffleChoices: false,
      updatedAt: '2026-07-18T00:00:00.000Z',
    });
    renderSettings();
    await waitForRouteLoadingToFinish();
    await screen.findByRole('heading', { name: '設定' }, { timeout: 5_000 });
    await user.click(screen.getByRole('button', { name: '学習データを全消去' }));
    const dialog = screen.getByRole('dialog', { name: '学習データを全消去しますか？' });
    const clearButton = within(dialog).getByRole('button', { name: '学習データを全消去する' });
    expect(clearButton).toBeDisabled();
    await user.type(screen.getByLabelText('確認文字「削除」を入力してください'), '削除');
    expect(clearButton).toBeEnabled();
    await user.click(clearButton);

    await waitFor(async () => {
      await expect(database.answerAttempts.count()).resolves.toBe(0);
      await expect(database.settings.get('appearance')).resolves.toMatchObject({
        theme: 'dark',
        fontSize: 'large',
      });
    });
  });
});
