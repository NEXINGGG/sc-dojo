import { expect, test } from '@playwright/test';

test('SCの起動・回答・全消去でNWのDB・通知設定・端末ID・キャッシュを変更しない', async ({
  page,
}) => {
  // Seed NW state before the SC application or Service Worker has started.
  await page.goto('/robots.txt');
  const nwCacheName = await page.evaluate(async () => {
    localStorage.setItem('a1-dojo:pwa-offline-ready-notified', '1');
    localStorage.setItem('a1-dojo:pwa-install-suggestion-dismissed', '1');
    localStorage.setItem('nw-a1-dojo-device-id', 'nw-device-original');
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('a1-dojo', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('settings', { keyPath: 'key' });
        request.result.createObjectStore('questionProgress', { keyPath: 'code' });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['settings', 'questionProgress'], 'readwrite');
        transaction.objectStore('settings').put({ key: 'appearance', theme: 'dark' });
        transaction.objectStore('questionProgress').put({
          code: 'A1-001',
          favorite: true,
          attemptCount: 7,
        });
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
    const cacheName = `workbox-precache-v2-${location.origin}/`;
    const nwCache = await caches.open(cacheName);
    await nwCache.put('/nw-cache-sentinel', new Response('nw-cache-original'));
    return cacheName;
  });

  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'アプリ情報' })).toContainText('SC道場');
  await expect(page.getByRole('region', { name: 'データ管理' })).toContainText('回答履歴0件');
  await expect(page.getByRole('radio', { name: 'ダーク' })).not.toBeChecked();
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller !== null;
  });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('sc-dojo:pwa-offline-ready-notified')))
    .toBe('1');

  await page.getByRole('link', { name: '演習', exact: true }).click();
  await page.getByRole('button', { name: 'この条件で始める' }).click();
  await expect(page.getByRole('heading', { name: '1 / 10 問' })).toBeVisible();
  await page
    .getByRole('group', { name: '答えを1つ選んでください' })
    .getByRole('radio')
    .first()
    .check();
  await page.getByRole('button', { name: '回答する' }).click();
  await page.getByRole('link', { name: '設定', exact: true }).click();
  await expect(page.getByRole('region', { name: 'データ管理' })).toContainText('回答履歴1件');
  await page.getByRole('button', { name: '学習データを全消去', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '学習データを全消去しますか？' });
  await dialog.getByLabel('確認文字「削除」を入力してください').fill('削除');
  await dialog.getByRole('button', { name: '学習データを全消去する' }).click();
  await expect(page.getByRole('region', { name: 'データ管理' })).toContainText('回答履歴0件');

  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  const preserved = await page.evaluate(async (cacheName) => {
    const nw = await new Promise<{ version: number; settings: unknown; progress: unknown }>(
      (resolve, reject) => {
        const request = indexedDB.open('a1-dojo');
        request.onupgradeneeded = () => {
          request.transaction?.abort();
          reject(new Error('NW database was deleted'));
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['settings', 'questionProgress'], 'readonly');
          const settings = transaction.objectStore('settings').get('appearance');
          const progress = transaction.objectStore('questionProgress').get('A1-001');
          transaction.oncomplete = () => {
            resolve({ version: db.version, settings: settings.result, progress: progress.result });
            db.close();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      },
    );
    const nwCache = await caches.open(cacheName);
    return {
      nw,
      nwOffline: localStorage.getItem('a1-dojo:pwa-offline-ready-notified'),
      nwInstall: localStorage.getItem('a1-dojo:pwa-install-suggestion-dismissed'),
      nwDevice: localStorage.getItem('nw-a1-dojo-device-id'),
      scDevice: localStorage.getItem('sc-dojo-device-id'),
      scInstall: localStorage.getItem('sc-dojo:pwa-install-suggestion-dismissed'),
      nwCache: await (await nwCache.match('/nw-cache-sentinel'))?.text(),
      cacheNames: await caches.keys(),
      databaseNames: (await indexedDB.databases()).map((db) => db.name),
    };
  }, nwCacheName);
  expect(preserved.nw).toEqual({
    version: 1,
    settings: { key: 'appearance', theme: 'dark' },
    progress: { code: 'A1-001', favorite: true, attemptCount: 7 },
  });
  expect(preserved).toMatchObject({
    nwOffline: '1',
    nwInstall: '1',
    nwDevice: 'nw-device-original',
    scInstall: '1',
    nwCache: 'nw-cache-original',
  });
  expect(preserved.scDevice).toBeTruthy();
  expect(preserved.scDevice).not.toBe(preserved.nwDevice);
  expect(preserved.databaseNames).toEqual(expect.arrayContaining(['a1-dojo', 'sc-dojo']));
  expect(preserved.cacheNames.some((name) => name.startsWith('sc-dojo-'))).toBe(true);
});
