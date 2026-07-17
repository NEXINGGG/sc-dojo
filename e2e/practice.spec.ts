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

  await page.getByRole('button', { name: '中断する' }).click();
  await expect(page.getByRole('dialog', { name: '通常演習を中断しますか？' })).toBeVisible();
  await page.getByRole('button', { name: '保存してホームへ戻る' }).click();
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
  await expect(page.getByRole('link', { name: /前回の続きから再開/ })).toBeVisible();
});
