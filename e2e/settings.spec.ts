import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('表示設定を保存し、バックアップ・全消去・復元を安全に利用できる', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });

  await page.goto('/#/practice');
  await page.getByRole('button', { name: 'この条件で始める' }).click();
  await expect(page.getByRole('heading', { name: '1 / 10 問' })).toBeVisible();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: '回答する' }).click();
  await page.getByRole('button', { name: '☆ お気に入りに追加' }).click();

  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '保存データの概要' })).toBeVisible();

  await page.getByRole('radio', { name: 'ダーク' }).check();
  await page.getByRole('radio', { name: '特大（125%）' }).check();
  await page.getByRole('radio', { name: '軽減する' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-font-size', 'extra_large');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'reduce');

  await page.reload();
  await expect(page.getByRole('radio', { name: 'ダーク' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '特大（125%）' })).toBeChecked();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップを作成' }).click();
  const backupDownload = await download;
  await expect(backupDownload.suggestedFilename()).toMatch(/^nw-a1-dojo-backup-\d{8}-\d{6}\.json$/);
  const backupPath = await backupDownload.path();
  if (backupPath === null) {
    throw new Error('バックアップファイルを確認できませんでした。');
  }
  const backupJson = await readFile(backupPath, 'utf8');
  const backup = JSON.parse(backupJson) as {
    data: { answerHistory: unknown[]; favorites: unknown[] };
  };
  expect(backup.data.answerHistory).toHaveLength(1);
  expect(backup.data.favorites).toHaveLength(1);
  expect(backupJson).not.toContain('問題文');

  await page.locator('#backup-file-input').setInputFiles(backupPath);
  const preview = page.getByRole('dialog', { name: 'バックアップを復元しますか？' });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('回答履歴1件');
  await preview.getByRole('button', { name: 'キャンセル' }).click();

  await page.getByRole('button', { name: '学習データを全消去' }).click();
  const dialog = page.getByRole('dialog', { name: '学習データを全消去しますか？' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '学習データを全消去する' })).toBeDisabled();
  await dialog.getByLabel('確認文字「削除」を入力してください').fill('削除');
  await dialog.getByRole('button', { name: '学習データを全消去する' }).click();
  await expect(page.getByRole('status')).toContainText('学習データを全消去しました');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('region', { name: 'データ管理' })).toContainText('回答履歴0件');

  await page.locator('#backup-file-input').setInputFiles(backupPath);
  await expect(preview).toBeVisible();
  await preview.getByRole('button', { name: '復元する' }).click();
  await expect(page.getByRole('status')).toContainText('バックアップを復元しました');
  await expect(page.getByRole('region', { name: 'データ管理' })).toContainText('回答履歴1件');
  expect(browserErrors).toEqual([]);
});
