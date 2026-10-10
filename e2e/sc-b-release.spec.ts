import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import payload from '../data/sc-b-cases-2023-2025-ready.json' with { type: 'json' };
import sets from '../data/sc-b-exam-sets.json' with { type: 'json' };

const project = fileURLToPath(new URL('../', import.meta.url));
let server: ChildProcess;
let url: string;
test.beforeAll(async () => {
  test.setTimeout(180_000);
  server = spawn(process.execPath, [resolve(project, 'e2e/fixtures/serve-sc-b-release.mjs')], {
    cwd: project,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  url = await new Promise<string>((done, reject) => {
    const timer = setTimeout(() => reject(new Error('SC B候補build/preview起動失敗')), 150_000);
    let diagnostics = '';
    server.once('error', reject);
    server.stdout!.on('data', (chunk: Buffer) => {
      const match = chunk.toString().match(/READY (http:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        done(match[1]);
      }
    });
    server.stderr!.on('data', (chunk: Buffer) => {
      diagnostics += chunk.toString();
    });
    server.once('exit', (code) => {
      clearTimeout(timer);
      if (code) reject(new Error(diagnostics));
    });
  });
  mkdirSync(resolve(project, 'tmp/sc-b-v1/ui'), { recursive: true });
});
test.afterAll(() => server?.kill());
async function saved(page: Page) {
  await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function fillAnswer(page: Page, value = '答') {
  for (const field of await page
    .locator('.b1-answer-field input:enabled,.b1-answer-field textarea:enabled')
    .all())
    await field.fill(value);
  await saved(page);
}
async function enter(page: Page, route = 'practice') {
  page.setDefaultTimeout(15_000);
  await page.goto(url + '#/');
  await page.getByRole('radio', { name: /科目B/ }).click();
  await page.goto(url + '#/' + route);
}

test('SC B候補:20大問の本文・図表・欄・PDF位置と320/390px、フィルタ・お気に入り', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  for (const c of payload.cases) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await enter(page);
      await page.getByRole('combobox', { name: '年度', exact: true }).selectOption(String(c.year));
      await page.getByRole('combobox', { name: '期', exact: true }).selectOption(c.term);
      await page
        .getByRole('combobox', { name: '大問', exact: true })
        .selectOption(String(c.questionNumber));
      await page
        .getByRole('combobox', { name: 'カテゴリ', exact: true })
        .selectOption(c.primaryCategory);
      await expect(page.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(1);
      await page.getByRole('button', { name: 'お気に入りに追加' }).click();
      await page.getByRole('combobox', { name: '学習状況' }).selectOption('favorite');
      await expect(page.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(1);
      await page.reload();
      await page.getByRole('combobox', { name: '学習状況' }).selectOption('favorite');
      await expect(page.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(1);
      await page.getByRole('button', { name: 'この大問を練習する' }).click();
      await page.getByRole('tab', { name: '本文・図表' }).click();
      const body = page.getByRole('region', { name: '問題本文・図表' });
      await expect(body.locator('[data-material-id]')).toHaveCount(c.body.materials.length);
      for (const img of await body.locator('img.b1-source-image').all()) {
        if (await img.isVisible()) {
          await img.scrollIntoViewIfNeeded();
          await expect(img).toHaveJSProperty('complete', true);
          expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
        }
      }
      const first = c.source.questionPdfPagesZeroBased[0] + 1;
      await page
        .getByRole('combobox', { name: 'PDF参照ページ' })
        .selectOption(String(first - (c.examSetId === 'SC-2024-SPRING-PM' ? 1 : 0)));
      await expect(page.getByRole('link', { name: '公式PDFを開く', exact: true })).toHaveAttribute(
        'href',
        c.source.questionPdfUrl + '#page=' + first,
      );
      await body.locator('[data-material-id]').first().scrollIntoViewIfNeeded();
      const original = body
        .locator('[data-material-id]')
        .first()
        .getByText(/^(?:原本画像・注記|再構成図)を確認$/);
      if (await original.count()) await original.click();
      const zoom = body.locator('[data-material-id]').first()
        .getByText('原寸で拡大して読む（横スクロール）', { exact: true });
      if (await zoom.count()) await zoom.click();
      if (!c.body.originalPageMode) {
        await expect(body.locator('.b1-original-text')).not.toHaveCount(0);
        await expect(body).not.toContainText('設問の案内（学習用）');
      }
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        for (const theme of ['light', 'dark']) {
          await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
          await noOverflow(page);
        }
      }
      if (c.questionNumber === 1)
        await page.screenshot({ path: resolve(project, `tmp/sc-b-v1/ui/${c.examSetId}-390.png`) });
      await page.getByRole('tab', { name: '答案', exact: true }).click();
      const input = page.locator('.b1-answer-field input,.b1-answer-field textarea').first();
      await fillAnswer(page);
      await page.reload();
      await expect(input).toHaveValue('答');
      await page.getByRole('button', { name: '回答を確定して模範解答を確認する' }).click();
      await expect(page.getByRole('heading', { name: '学習用解説' })).toBeVisible();
      await page.getByRole('button', { name: '惜しい', exact: true }).first().click();
      await saved(page);
      await noOverflow(page);
      await page.goto(url + '#/practice');
      await page.getByRole('combobox', { name: '学習状況' }).selectOption('weak');
      await expect(page.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(1);
      await page.getByRole('combobox', { name: '学習状況' }).selectOption('unstarted');
      await expect(page.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(19);
    } finally {
      await context.close();
    }
  }
});

test('SC B候補:5回の4→2・150分模試、保存再開・締切提出・答案凍結', async ({ browser }) => {
  test.setTimeout(180_000);
  for (const set of sets.sets) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await enter(page, 'exam');
      await page.getByRole('combobox', { name: '試験回' }).selectOption(set.examSetId);
      const selection = page.getByRole('region', { name: '模試の大問を選択' });
      await expect(selection.getByRole('checkbox')).toHaveCount(4);
      await expect(selection).not.toContainText(/hard|normal|脆弱性|カテゴリ/);
      await page.getByRole('checkbox', { name: '問1を選ぶ' }).check();
      await page.getByRole('checkbox', { name: '問2を選ぶ' }).check();
      await page.getByRole('button', { name: '150分模試を開始する' }).click();
      await page.getByRole('tab', { name: '答案', exact: true }).click();
      await page.locator('.b1-answer-field input,.b1-answer-field textarea').first().fill('保存');
      await saved(page);
      await page.reload();
      await expect(
        page.locator('.b1-answer-field input,.b1-answer-field textarea').first(),
      ).toHaveValue('保存');
      const sessionId = page.url().split('/').at(-1)!;
      // Browser Date is advanced to the stored deadline; the real 150-minute session remains unchanged.
      const deadline = await page.evaluate(async (id) => {
        const db = await new Promise<IDBDatabase>((done, reject) => {
          const req = indexedDB.open('sc-dojo');
          req.onsuccess = () => done(req.result);
          req.onerror = () => reject(req.error);
        });
        try {
          return await new Promise<string>((done, reject) => {
            const req = db.transaction('b1MockSessions').objectStore('b1MockSessions').get(id);
            req.onsuccess = () => done(req.result.deadlineAt);
            req.onerror = () => reject(req.error);
          });
        } finally {
          db.close();
        }
      }, sessionId);
      await page.clock.install({ time: new Date(deadline) });
      await page.reload();
      await expect(page.getByRole('heading', { name: '自己採点を完了してください' })).toBeVisible();
      await expect(
        page.locator('.b1-answer-field input,.b1-answer-field textarea').first(),
      ).toBeDisabled();
      await expect(page.getByRole('heading', { name: '学習用解説' })).toBeVisible();
      await noOverflow(page);
    } finally {
      await context.close();
    }
  }
});

test('SC B候補:PWA完全オフライン20大問・全画像・入力・自己採点、根拠・振り返り・A2・PDF登録', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    let page = await context.newPage();
    await enter(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    const assets = [
      ...new Set(
        payload.cases.flatMap((c) =>
          [
            ...c.body.materials,
            ...c.body.originalPages,
            ...c.questionUnits.flatMap((u) =>
              u.answerFields.flatMap((f) =>
                'officialAnswerAsset' in f ? [f.officialAnswerAsset] : [],
              ),
            ),
          ].flatMap((m) => 'assetUrl' in m ? [m.assetUrl] : []),
        ),
      ),
    ];
    await expect
      .poll(
        () =>
          page.evaluate(async (urls) => {
            const keys = await caches.keys();
            let n = 0;
            for (const u of urls) {
              for (const key of keys) {
                if (await (await caches.open(key)).match(u, { ignoreSearch: true })) {
                  n++;
                  break;
                }
              }
            }
            return n;
          }, assets),
        { timeout: 30_000 },
      )
      .toBe(assets.length);
    await context.setOffline(true);
    // Close the warm document; reopen through the installed SW with network disabled.
    await page.close();
    const coldPage = await context.newPage();
    // Reuse the existing scenario below with a fresh document.
    page = coldPage;
    await page.goto(url + '#/practice');
    await expect(page.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(20);
    expect(
      await page.evaluate(async (urls) => {
        for (const u of urls) {
          const r = await fetch(u);
          if (!r.ok) return false;
        }
        return true;
      }, assets),
    ).toBe(true);
    // One saved answer and self-grade for every case entirely offline, each in a separate storage context is unnecessary.
    for (const c of payload.cases) {
      await page.getByRole('combobox', { name: '年度', exact: true }).selectOption(String(c.year));
      await page.getByRole('combobox', { name: '期', exact: true }).selectOption(c.term);
      await page
        .getByRole('combobox', { name: '大問', exact: true })
        .selectOption(String(c.questionNumber));
      await page.getByRole('button', { name: 'この大問を練習する' }).click();
      await page.getByRole('tab', { name: '本文・図表' }).click();
      const body = page.getByRole('region', { name: '問題本文・図表' });
      const paragraphCount = c.body.sections.flatMap((s) => s.paragraphs).length;
      await expect(body.locator('p.b1-original-text[id]')).toHaveCount(paragraphCount);
      await expect(body.locator('[data-material-id]')).toHaveCount(c.body.materials.length);
      await expect(body.getByText('公式問題冊子のページ画像で照合する')).toHaveCount(0);
      for (const m of c.body.materials) {
        const material = body.locator(`[data-material-id="${m.id}"]`);
        if (m.classification === 'B') await expect(material.locator('table')).toBeVisible();
        if (m.classification === 'C')
          await expect(material.locator('pre code')).toHaveText(m.text, { useInnerText: false });
        if ('assetUrl' in m) {
          const disclosure = material.locator('details').first();
          if (m.renderText && await disclosure.count())
            await disclosure.evaluate((d: HTMLDetailsElement) => d.open = true);
          const image = material.locator('img.b1-source-image');
          await image.scrollIntoViewIfNeeded();
          await expect(image).toHaveJSProperty('complete', true);
          expect(await image.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
        }
      }
      await noOverflow(page);
      await page.getByRole('tab', { name: '答案', exact: true }).click();
      await fillAnswer(page);
      await page.getByRole('button', { name: '回答を確定して模範解答を確認する' }).click();
      await expect(page.getByRole('heading', { name: '学習用解説' })).toBeVisible();
      await page.getByRole('button', { name: 'できた', exact: true }).first().click();
      await saved(page);
      await page.getByRole('button', { name: '演習を完了して確認する' }).click();
      await page.getByRole('button', { name: '完了する', exact: true }).click();
      await expect(page.getByRole('heading', { name: '演習を完了しました' })).toBeVisible();
      await saved(page);
      await page.getByRole('link', { name: '別の大問を練習する' }).click();
    }
    await context.setOffline(false);
    await page.getByRole('combobox', { name: '年度', exact: true }).selectOption('2023');
    await page.getByRole('combobox', { name: '期', exact: true }).selectOption('fall');
    await page.getByRole('combobox', { name: '大問', exact: true }).selectOption('3');
    await page.getByRole('button', { name: 'この大問を練習する' }).click();
    await page.getByRole('tab', { name: '答案', exact: true }).click();
    await page
      .getByRole('combobox', { name: '設問を選ぶ' })
      .selectOption({ label: '問3 設問2(5)' });
    await page.getByRole('combobox', { name: '本文・図表から根拠を選ぶ' }).selectOption('figure-2');
    await page
      .getByRole('textbox', { name: 'メモ', exact: true })
      .fill('認証器とサーバの署名検証を分けて読む');
    await page.getByRole('button', { name: '根拠を追加', exact: true }).click();
    await expect(page.getByText(/根拠を端末に保存しました/)).toBeVisible();
    await fillAnswer(page, 'WebAuthn');
    await page.getByRole('tab', { name: '本文・図表' }).click();
    await page.getByLabel('2023年度のPDFを端末へ登録').setInputFiles({
      name: '2023-fall.pdf',
      mimeType: 'application/pdf',
      buffer: readFileSync(resolve(project, 'reference/sc-b-official/2023-fall/qs.pdf')),
    });
    await expect(page.locator('.b1-pdf-frame')).toHaveAttribute('src', /blob:/);
    await page.getByRole('tab', { name: '答案', exact: true }).click();
    await page.getByRole('button', { name: '回答を確定して模範解答を確認する' }).click();
    await page.getByRole('button', { name: '惜しい', exact: true }).first().click();
    await saved(page);
    await page.getByRole('button', { name: '演習を完了して確認する' }).click();
    await page.getByRole('button', { name: '完了する', exact: true }).click();
    await page.getByRole('checkbox', { name: '技術知識不足', exact: true }).check();
    await page.getByRole('button', { name: 'A2復習を開始する' }).click();
    await expect(page).toHaveURL(/practice\/.+\?b1Remediation=/);
  } finally {
    await context.close().catch(() => undefined);
  }
});
