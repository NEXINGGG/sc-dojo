import { expect, test } from '@playwright/test';

test('B-1 starts a 90-minute two-case mock and keeps the official PDF route usable offline', async ({
  context,
  page,
}) => {
  await page.goto('/#/');
  await page.waitForFunction(async () => {
    await navigator.serviceWorker?.ready;
    return navigator.serviceWorker?.controller !== null;
  });

  await page.getByRole('radio', { name: /B-1/ }).click();
  await page.getByRole('navigation').getByRole('link', { name: '模試' }).click();
  await expect(page.getByText(/2大問・90分/)).toBeVisible();

  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: /90分.*B-1模試/ }).click();
  await expect(page.getByRole('link', { name: '公式PDFを開く' })).toBeVisible();
  await expect(page.getByText(/残り時間/)).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('link', { name: '公式PDFを開く' })).toBeVisible();
  await expect(page.getByText(/問題本文を表示できません/)).toBeVisible();
});
