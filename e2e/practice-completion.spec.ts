import { expect, test } from '@playwright/test';

test('10問の通常演習を完了して結果を表示できる', async ({ page }) => {
  await page.goto('/#/practice');
  await page.getByRole('button', { name: 'この条件で始める' }).click();

  for (let questionNumber = 1; questionNumber <= 10; questionNumber += 1) {
    await expect(page.getByRole('heading', { name: `${questionNumber} / 10 問` })).toBeVisible();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: '回答する' }).click();
    await expect(page.getByRole('status')).toContainText(/正解です|不正解です/);

    if (questionNumber === 10) {
      await page.getByRole('button', { name: '結果を見る' }).click();
    } else {
      await page.getByRole('button', { name: '次の問題' }).click();
    }
  }

  await expect(page.getByRole('heading', { name: '通常演習の結果' })).toBeVisible();
  await expect(page.locator('[aria-label="演習結果の内訳"]')).toBeVisible();
});
