import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

test('図表を初めて開く場合もPWA precacheからオフライン表示でき、320/390px・暗色で利用できる', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const temporary = mkdtempSync(join(tmpdir(), 'sc-question-pwa-'));
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let server: ReturnType<typeof spawn> | undefined;
  try {
    execFileSync(
      process.execPath,
      [join(project, 'e2e/fixtures/build-question-material-pwa.mjs'), temporary],
      // This builds the whole production catalog plus the isolated image fixtures.
      // Allow the build and SW generation to finish on slower Windows hosts.
      { cwd: project, windowsHide: true, stdio: 'pipe', timeout: 120_000 },
    );
    const sw = readFileSync(join(temporary, 'dist/sw.js'), 'utf8');
    for (const extension of ['png', 'svg', 'jpg', 'jpeg', 'webp', 'avif', 'gif'])
      expect(sw).toContain(`questions/sc/a2/test.${extension}`);
    server = spawn(
      process.execPath,
      [join(project, 'e2e/fixtures/serve-question-material-pwa.mjs'), join(temporary, 'dist')],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const fixtureUrl = await new Promise<string>((done, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('fixture server startup timed out')),
        10_000,
      );
      server?.once('error', reject);
      server?.stdout?.on('data', (chunk: Buffer) => {
        const match = chunk.toString().match(/READY (http:\/\/[^\s]+)/);
        if (match) {
          clearTimeout(timeout);
          done(match[1]);
        }
      });
    });
    const page = await context.newPage();
    await page.goto(`${fixtureUrl}#/`);
    await page.waitForFunction(async () => {
      await navigator.serviceWorker.ready;
      return navigator.serviceWorker.controller !== null;
    });
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('radio', { name: /A-2/ }).click();
    await page.getByRole('navigation').getByRole('link', { name: '演習', exact: true }).click();
    // Unanswered defaults to code order, ensuring the synthetic A2-001 is shown.
    await page.getByRole('radio', { name: /未回答/ }).click();
    await page.getByRole('button', { name: 'この条件で始める' }).click();
    await expect(page.getByRole('table', { name: 'テスト用の表', exact: true })).toBeVisible();
    await expect(page.getByRole('table', { name: '選択肢の表', exact: true })).toBeVisible();
    await expect(page.getByLabel('テスト用のコード')).toBeVisible();
    const image = page.getByRole('img', { name: 'テスト用の通信経路' });
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBe(640);
    expect(await image.getAttribute('src')).toBe('/sc-material/questions/sc/a2/test.svg');
    // All formats were cached on installation, even without an earlier image request.
    expect(
      await page.evaluate(async () =>
        Promise.all(
          ['png', 'svg', 'jpg', 'jpeg', 'webp', 'avif', 'gif'].map(
            async (extension) => (await fetch(`/sc-material/questions/sc/a2/test.${extension}`)).ok,
          ),
        ),
      ),
    ).toEqual(Array(7).fill(true));
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        const overflow = await page
          .locator('.question-stimulus-scroll')
          .evaluateAll((elements) =>
            elements.some((element) => element.scrollWidth > element.clientWidth),
          );
        expect(overflow).toBe(true);
        await expect(image).toBeVisible();
      }
    }
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: '回答する' }).click();
    await expect(page.getByText(/正解です|不正解です/)).toBeVisible();
    await page.getByRole('link', { name: 'この問題の学習履歴を見る' }).click();
    await expect(page.getByRole('img', { name: 'テスト用の通信経路' })).toBeVisible();
    await page.getByRole('navigation').getByRole('link', { name: '模試', exact: true }).click();
    await page.getByRole('button', { name: '固定模試1を選ぶ' }).click();
    await page.getByRole('button', { name: '模試を開始する' }).click();
    await expect(page.getByRole('table', { name: 'テスト用の表', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'テスト用の通信経路' })).toBeVisible();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: '提出する' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '提出する' }).click();
    await expect(page.getByRole('heading', { name: '不合格', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'テスト用の通信経路' })).toBeVisible();
    await expect(page.getByRole('table', { name: '選択肢の表', exact: true })).toBeVisible();
  } finally {
    await context.close();
    if (server) server.kill();
    // temporary is the absolute, freshly-created mkdtemp directory for this test.
    rmSync(temporary, { recursive: true, force: true });
  }
});
