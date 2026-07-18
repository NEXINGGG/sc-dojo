import { expect, test } from '@playwright/test';

test('履歴がない状態でも成績、期間、カテゴリ詳細を表示できる', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });

  await page.goto('/#/progress');
  await expect(page.getByRole('heading', { name: '成績' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'カテゴリ別成績' })).toBeVisible();
  await expect(page.getByText('現在、強い苦手分野はありません')).toBeVisible();
  await expect(page.getByText('まだ模試を受験していません')).toBeVisible();

  await page.getByRole('radio', { name: '直近7日' }).check();
  await expect(page.getByText('直近7日の全回答実績')).toBeVisible();

  await page.getByRole('link', { name: '詳細' }).first().click();
  await expect(page.getByRole('heading', { name: /の成績$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '小分類別成績' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '問題一覧' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
