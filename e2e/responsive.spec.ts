import { expect, test } from '@playwright/test';

test('各画面幅で横スクロールせず、下部ナビゲーションとダイアログを操作できる', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
  expect(
    await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);

  const navigation = page.getByRole('navigation', { name: 'メインナビゲーション' });
  const practiceLink = navigation.getByRole('link', { name: '演習', exact: true });
  const practiceBox = await practiceLink.boundingBox();
  expect(practiceBox?.height).toBeGreaterThanOrEqual(44);
  expect(practiceBox?.width).toBeGreaterThanOrEqual(44);

  await practiceLink.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '通常演習' })).toBeVisible();

  await page.goto('/#/settings');
  await page.getByRole('radio', { name: '特大（125%）' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-font-size', 'extra_large');
  expect(
    await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);

  await page.getByRole('button', { name: '学習データを全消去' }).click();
  const dialog = page.getByRole('dialog', { name: '学習データを全消去しますか？' });
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dialogBox?.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox?.y).toBeGreaterThanOrEqual(0);
  expect((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0)).toBeLessThanOrEqual(
    (viewport?.width ?? 0) + 1,
  );
  expect((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0)).toBeLessThanOrEqual(
    (viewport?.height ?? 0) + 1,
  );
});
