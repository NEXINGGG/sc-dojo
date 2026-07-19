import { expect, test } from '@playwright/test';

test('通常演習を開始し、回答を保存してホームから再開できる', async ({ page }) => {
  await page.goto('/#/practice');
  await expect(page.getByRole('heading', { name: '通常演習' })).toBeVisible();
  await page.getByRole('button', { name: 'この条件で始める' }).click();

  await expect(page.getByRole('heading', { name: '1 / 10 問' })).toBeVisible();
  const choices = page.getByRole('radio');
  await expect(choices).toHaveCount(4);
  await choices.first().check();
  await expect(page.getByRole('button', { name: '回答する' })).toBeEnabled();
  await page.getByRole('button', { name: '回答する' }).click();
  await expect(page.getByRole('status')).toContainText(/正解です|不正解です/);

  await page.getByRole('button', { name: '☆ お気に入りに追加' }).click();
  await expect(page.getByRole('button', { name: '★ お気に入り登録済み' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '1 / 10 問' })).toBeVisible();
  await expect(page.getByRole('button', { name: '★ お気に入り登録済み' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText(/正解です|不正解です/);
  await page.getByRole('link', { name: 'この問題の学習履歴を見る' }).click();
  await expect(page.getByRole('heading', { name: '問題の学習履歴' })).toBeVisible();
  await expect(page.locator('.history-metrics dt', { hasText: '回答回数' })).toBeVisible();
  await page.getByRole('button', { name: '前の画面へ戻る' }).click();

  await page.getByRole('button', { name: '中断する' }).click();
  await expect(page.getByRole('dialog', { name: '通常演習を中断しますか？' })).toBeVisible();
  await page.getByRole('button', { name: '保存してホームへ戻る' }).click();
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
  const resumeLink = page.getByRole('link', { name: /前回の続きから再開/ });
  await expect(resumeLink).toBeVisible();
  await expect(page.getByText('1 / 240問')).toBeVisible();
  await resumeLink.click();
  await expect(page.getByRole('heading', { name: '1 / 10 問' })).toBeVisible();
});
