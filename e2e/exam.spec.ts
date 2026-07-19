import { expect, test } from '@playwright/test';

test('固定模試を開始し、見直し・問題一覧・提出・結果履歴を利用できる', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });

  await page.goto('/#/exam');
  await expect(page.getByRole('heading', { name: '模擬試験' })).toBeVisible();
  await page.getByRole('button', { name: '固定模試1を選ぶ' }).click();
  await expect(page.getByRole('heading', { name: '固定模試1を開始' })).toBeVisible();
  await page.getByRole('button', { name: '模試を開始する' }).click();

  await expect(page.getByRole('heading', { name: '1 / 30 問' })).toBeVisible();
  await expect(page.getByText('解説')).toHaveCount(0);
  const choices = page.getByRole('radio');
  await choices.first().check();
  await choices.nth(1).check();
  await expect(choices.nth(1)).toBeChecked();
  await page.getByRole('button', { name: '見直しにする' }).click();
  await expect(page.getByRole('button', { name: '見直しを解除' })).toBeVisible();
  await page.getByRole('button', { name: /問題 2: 未回答/ }).click();
  await expect(page.getByRole('heading', { name: '2 / 30 問' })).toBeVisible();

  await page.getByRole('button', { name: '提出する' }).click();
  const dialog = page.getByRole('dialog', { name: '模試を提出しますか？' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/未回答 29問/)).toBeVisible();
  await dialog.getByRole('button', { name: '提出する' }).click();

  await expect(page.getByRole('heading', { name: /合格|不合格/ })).toBeVisible();
  await expect(page.getByText('解説')).toBeVisible();
  await expect(page.getByText(/^あなたの回答:/)).toBeVisible();
  await page.getByRole('link', { name: '模試選択へ' }).click();
  await expect(page.getByRole('heading', { name: '模擬試験' })).toBeVisible();
  await expect(page.getByRole('link', { name: /固定模試1/ })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
