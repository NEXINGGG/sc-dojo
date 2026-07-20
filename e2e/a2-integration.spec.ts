import { expect, test } from '@playwright/test';

test('A-2 can be selected and starts a 25-question mock exam', async ({ page }) => {
  await page.goto('/#/');

  const subject = page.getByRole('radio', { name: /A-2/ });
  await subject.click();
  await expect(subject).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('navigation').getByRole('link', { name: /模試/ }).click();
  await expect(page.getByText(/25問・40分・15問以上/)).toBeVisible();
  await page.getByRole('button', { name: '固定模試1を選ぶ' }).click();
  await page.getByRole('button', { name: '模試を開始する' }).click();

  await expect(page.getByRole('heading', { name: /1 \/ 25/ })).toBeVisible();
  await expect(page.locator('.exam-number-button')).toHaveCount(25);
});

test('A-2 mock exam remains usable offline after service-worker caching', async ({
  context,
  page,
}) => {
  await page.goto('/#/');
  await page.waitForFunction(async () => {
    await navigator.serviceWorker?.ready;
    return navigator.serviceWorker?.controller !== null;
  });
  await page.getByRole('radio', { name: /A-2/ }).click();
  await page.goto('/#/exam');
  await expect(page.getByText(/25問・40分・15問以上/)).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/25問・40分・15問以上/)).toBeVisible();
  await page.getByRole('button', { name: '固定模試1を選ぶ' }).click();
  await page.getByRole('button', { name: '模試を開始する' }).click();
  await expect(page.getByRole('heading', { name: /1 \/ 25/ })).toBeVisible();
});
