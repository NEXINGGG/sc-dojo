import { expect, test } from '@playwright/test';

for (const [selectButton, confirmationHeading] of [
  ['固定模試2を選ぶ', '固定模試2を開始'],
  ['ランダム模試を選ぶ', 'ランダム模試を開始'],
]) {
  test(`${selectButton}から30問の模試を開始できる`, async ({ page }) => {
    await page.goto('/#/exam');
    await page.getByRole('button', { name: selectButton }).click();
    await expect(page.getByRole('heading', { name: confirmationHeading })).toBeVisible();
    await page.getByRole('button', { name: '模試を開始する' }).click();

    await expect(page.getByRole('heading', { name: '1 / 30 問' })).toBeVisible();
    await expect(page.getByRole('button', { name: /問題 \d+: 未回答/ })).toHaveCount(30);
  });
}
