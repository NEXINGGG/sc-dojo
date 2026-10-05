import { expect, test } from '@playwright/test';

test('本番previewで更新がなければ最新のバージョンと表示する', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });

  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible();
  await page.waitForFunction(async () => {
    await navigator.serviceWorker?.ready;
    return navigator.serviceWorker?.controller !== null;
  });

  await page.getByRole('button', { name: '更新を確認する' }).click();
  await expect(page.getByText('現在のバージョンが最新です。')).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('本番previewでmanifest・Service Workerを登録し、オフラインでも主要画面を開ける', async ({
  context,
  page,
}) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });

  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();

  const manifest = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href;
    if (href === undefined) {
      return undefined;
    }
    return (await fetch(href).then((response) => response.json())) as {
      name: string;
      short_name: string;
      display: string;
      icons: Array<{ src: string; purpose?: string }>;
    };
  });
  expect(manifest).toMatchObject({
    name: '情報処理安全確保支援士 SC道場',
    short_name: 'SC道場',
    display: 'standalone',
  });
  expect(manifest?.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: 'icons/a1-dojo-192.png' }),
      expect.objectContaining({ src: 'icons/a1-dojo-512.png' }),
      expect.objectContaining({ purpose: 'maskable' }),
    ]),
  );

  await page.waitForFunction(async () => {
    await navigator.serviceWorker?.ready;
    return navigator.serviceWorker?.controller !== null;
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
  await expect(page.getByText('オフラインです')).toBeVisible();

  await page.getByRole('link', { name: '演習', exact: true }).click();
  await expect(page.getByRole('heading', { name: '通常演習', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'この条件で始める' }).click();
  await expect(page.getByRole('heading', { name: '1 / 10 問' })).toBeVisible();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: '回答する' }).click();
  await expect(page.getByText(/正解です|不正解です/)).toBeVisible();

  await page.getByRole('link', { name: '模試', exact: true }).click();
  await expect(page.getByRole('heading', { name: '模擬試験' })).toBeVisible();
  await page.getByRole('button', { name: '固定模試1を選ぶ' }).click();
  await page.getByRole('button', { name: '模試を開始する' }).click();
  await expect(page.getByRole('heading', { name: '1 / 30 問' })).toBeVisible();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: '提出する' }).click();
  const submitDialog = page.getByRole('dialog', { name: '模試を提出しますか？' });
  await submitDialog.getByRole('button', { name: '提出する' }).click();
  await expect(page.getByRole('heading', { name: /合格|不合格/ })).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText('オフラインです')).not.toBeVisible();
  expect(browserErrors).toEqual([]);
});
