import { expect, test } from '@playwright/test';

test('主要画面を表示でき、ブラウザエラーを出さない', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });

  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();

  for (const [label, heading] of [
    ['演習', '演習条件'],
    ['模試', '模擬試験'],
    ['成績', '成績'],
    ['設定', '設定'],
  ]) {
    await page.getByRole('link', { name: label }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }

  await page.goto('/#/not-found');
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
