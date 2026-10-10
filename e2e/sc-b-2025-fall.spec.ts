import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

async function saved(page: Page) {
  await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('IPA 2025秋 SC B: 4問の演習・3組合せ模試・390px・根拠・PDF・復習', async ({ browser }) => {
  test.setTimeout(300_000);
  const project = fileURLToPath(new URL('../', import.meta.url));
  const server = spawn(process.execPath, [resolve(project, 'e2e/fixtures/serve-sc-b-pilot.mjs')], {
    cwd: project,
    env: { ...process.env, VITE_SC_B_PILOT: '1' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const url = await new Promise<string>((done, reject) => {
    const timer = setTimeout(() => reject(new Error('実問pilot起動失敗')), 20000);
    server.once('error', reject);
    server.stdout.on('data', (chunk: Buffer) => {
      const match = chunk.toString().match(/READY (http:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        done(match[1]);
      }
    });
    server.stderr.on('data', (chunk: Buffer) => {
      if (server.exitCode) reject(new Error(chunk.toString()));
    });
  });
  mkdirSync(resolve(project, 'tmp/sc-b-2025-fall-ui'), { recursive: true });
  const errors: string[] = [];
  try {
    // All four originals in practice, with native table/code/image QA.
    for (let q = 1; q <= 4; q++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`${url}#/`);
        await page.getByRole('radio', { name: /科目B/ }).click();
        await page.getByRole('link', { name: '科目B演習を始める' }).click();
        const year = page.getByRole('region', { name: '2025年度の科目B演習' });
        await expect(year.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(4);
        await year
          .getByRole('button', { name: 'この大問を練習する' })
          .nth(q - 1)
          .click();
        await page.getByRole('tab', { name: '本文・図表' }).click();
        const body = page.getByRole('region', { name: '問題本文・図表' });
        await expect(body.locator('[data-material-id]')).toHaveCount([5, 8, 13, 16][q - 1]);
        for (const image of await body.locator('img.b1-source-image').all()) {
          if (await image.isVisible()) {
            await image.scrollIntoViewIfNeeded();
            await expect(image).toHaveJSProperty('complete', true);
            expect(
              await image.evaluate((img: HTMLImageElement) => img.naturalWidth),
            ).toBeGreaterThan(0);
          }
        }
        await page
          .getByRole('combobox', { name: 'PDF参照ページ' })
          .selectOption(String([2, 8, 15, 26][q - 1]));
        await expect(
          page.getByRole('link', { name: '公式PDFを開く', exact: true }),
        ).toHaveAttribute(
          'href',
          new RegExp(`2025r07a_sc_pm_qs.pdf#page=${[2, 8, 15, 26][q - 1]}$`),
        );
        if (q === 2) {
          await page.getByRole('button', { name: '同梱公式PDFを端末へ登録' }).click();
          await expect(page.locator('.b1-pdf-frame')).toHaveAttribute('src', /blob:.+#page=8$/);
          await page.reload();
          await page.getByRole('tab', { name: '本文・図表' }).click();
          await expect(page.locator('.b1-pdf-frame')).toHaveAttribute('src', /blob:/);
          await page.getByRole('combobox', { name: 'PDF参照ページ' }).selectOption('8');
          await context.setOffline(true);
          await expect(page.locator('.b1-pdf-frame')).toHaveAttribute('src', /blob:.+#page=8$/);
          await page.getByRole('tab', { name: '答案', exact: true }).click();
          await page.locator('.b1-answer-field input').first().fill('オフライン');
          await saved(page);
          await context.setOffline(false);
          await page.getByRole('tab', { name: '本文・図表' }).click();
        }
        for (const width of [320, 390]) {
          await page.setViewportSize({ width, height: 844 });
          for (const theme of ['light', 'dark']) {
            await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
            await noOverflow(page);
          }
        }
        const material = body.locator('[data-material-id]').first();
        await material.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: resolve(project, `tmp/sc-b-2025-fall-ui/q${q}-body-390.png`),
        });
        // Verify zoom containment, including long table and network diagram.
        const zoom = material.getByText('原寸で拡大して読む（横スクロール）', { exact: true });
        if (await zoom.isVisible()) {
          await zoom.click();
          await noOverflow(page);
        }
        await page.getByRole('tab', { name: '答案', exact: true }).click();
        if (q === 1) {
          await page
            .getByRole('combobox', { name: '設問を選ぶ' })
            .selectOption({ label: '問1 設問3(3)' });
          await page
            .getByRole('combobox', { name: '本文・図表から根拠を選ぶ' })
            .selectOption('p-16');
          await page
            .getByRole('textbox', { name: 'メモ', exact: true })
            .fill('入力のscriptがHTMLとして出力されるため，出力時に文字列として扱う。');
          await page.getByRole('button', { name: '根拠を追加', exact: true }).click();
          await expect(page.getByText(/根拠を端末に保存しました/)).toBeVisible();
          await page.locator('.b1-answer-field textarea').fill('出力時にエスケープ処理を施す。');
          await saved(page);
          await page.reload();
          await expect(page.getByRole('textbox', { name: '追加する処理' })).toHaveValue(
            '出力時にエスケープ処理を施す。',
          );
          await expect(page.getByText('根拠 1件')).toBeVisible();
          await page.getByRole('button', { name: '回答を確定して模範解答を確認する' }).click();
          await expect(page.getByRole('heading', { name: '学習用解説' })).toBeVisible();
          await page.getByRole('button', { name: '惜しい', exact: true }).first().click();
          await saved(page);
          await page.getByRole('button', { name: '演習を完了して確認する' }).click();
          await page.getByRole('button', { name: '完了する', exact: true }).click();
          await page.getByRole('checkbox', { name: '技術知識不足', exact: true }).check();
          await expect(page.getByRole('button', { name: 'A2復習を開始する' })).toBeEnabled();
          await page.screenshot({
            path: resolve(project, 'tmp/sc-b-2025-fall-ui/q1-self-grade-390.png'),
            fullPage: true,
          });
          await noOverflow(page);
          await page.getByRole('button', { name: 'A2復習を開始する' }).click();
          await expect(page).toHaveURL(/practice\/.+\?b1Remediation=/);
        } else {
          // Switch every original question branch to exercise answer forms, including 18 cells.
          const selector = page.getByRole('combobox', { name: '設問を選ぶ' });
          const count = await selector.locator('option').count();
          for (let i = 0; i < count; i++) {
            await selector.selectOption(String(i));
            await saved(page);
            await noOverflow(page);
          }
          if (q === 4) {
            await selector.selectOption({ label: '問4 設問2(2)' });
            await expect(page.locator('.b1-answer-field')).toHaveCount(18);
            await noOverflow(page);
          }
        }
      } finally {
        await context.close();
      }
    }
    for (const pair of [
      [1, 2],
      [1, 3],
      [2, 4],
    ]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`${url}#/`);
        await page.getByRole('radio', { name: /科目B/ }).click();
        await page.goto(`${url}#/exam`);
        const selection = page.getByRole('region', { name: '模試の大問を選択' });
        await expect(selection.getByRole('checkbox')).toHaveCount(4);
        await expect(selection).not.toContainText(/SaaS|暗号|VPN|リスク|hard|normal/);
        for (const q of pair) await page.getByRole('checkbox', { name: `問${q}を選ぶ` }).check();
        await page.getByRole('button', { name: '150分模試を開始する' }).click();
        await expect(page.locator('.exam-timer')).toContainText(/149:|150:00/);
        await expect(page.getByRole('heading', { name: '学習用解説' })).toHaveCount(0);
        const fields = page.locator('.b1-answer-field input, .b1-answer-field textarea');
        await fields.first().fill('答案');
        await saved(page);
        await page.getByRole('combobox', { name: '本文・図表から根拠を選ぶ' }).selectOption('p-2');
        await page
          .getByRole('textbox', { name: 'メモ', exact: true })
          .fill('本文の条件と解答対象を対応付ける。');
        await page.getByRole('button', { name: '根拠を追加', exact: true }).click();
        await expect(page.getByText(/根拠を端末に保存しました/)).toBeVisible();
        await page.getByRole('button', { name: '見直しにする' }).click();
        const nav = page.getByRole('navigation', { name: '大問切替' });
        await nav.getByRole('button', { name: `問${pair[1]}`, exact: true }).click();
        await fields.first().fill('再開');
        await saved(page);
        await page.reload();
        await expect(fields.first()).toHaveValue('再開');
        await nav.getByRole('button', { name: `問${pair[0]}`, exact: true }).click();
        await expect(fields.first()).toHaveValue('答案');
        await expect(page.getByRole('button', { name: '見直しを外す' })).toBeVisible();
        await page.getByRole('button', { name: '模試を提出する' }).click();
        await page.getByRole('button', { name: '提出する', exact: true }).click();
        await expect(page.getByRole('heading', { name: '学習用解説' })).toBeVisible();
        const selector = page.getByRole('combobox', { name: '設問を選ぶ' });
        const count = await selector.locator('option').count();
        for (let i = 0; i < count; i++) {
          await selector.selectOption(String(i));
          await page.getByRole('button', { name: 'できなかった', exact: true }).first().click();
          await saved(page);
          await noOverflow(page);
        }
        await page.getByRole('button', { name: '結果を確定する' }).click();
        await expect(page.getByRole('heading', { name: '結果を確定しました' })).toBeVisible();
        await page.screenshot({
          path: resolve(project, `tmp/sc-b-2025-fall-ui/mock-${pair.join('-')}-390.png`),
        });
        await page.goto(`${url}#/exam`);
        for (const q of pair) await page.getByRole('checkbox', { name: `問${q}を選ぶ` }).check();
        await page.getByRole('button', { name: '150分模試を開始する' }).click();
        await fields.first().fill('期限');
        await saved(page);
        await page.clock.install();
        await page.clock.fastForward(150 * 60 * 1000);
        await expect(
          page.getByRole('heading', { name: '自己採点を完了してください' }),
        ).toBeVisible();
        await expect(fields.first()).toBeDisabled();
      } finally {
        await context.close();
      }
    }
    expect(errors).toEqual([]);
  } finally {
    server.kill();
  }
});
