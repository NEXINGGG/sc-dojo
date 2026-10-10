import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { BackupDocument } from '../src/domain/backup';

const project = fileURLToPath(new URL('../', import.meta.url));
const evidence = resolve(project, 'tmp/sc-v1-release-audit');
mkdirSync(evidence, { recursive: true });
test.use({ actionTimeout: 15_000 });

async function selectSubject(page: Page, name: RegExp) {
  const radio = page.getByRole('radio', { name });
  await radio.click();
  await expect(radio).toBeChecked();
}

async function exportBackup(page: Page) {
  await page.goto('/#/settings');
  const downloaded = page.waitForEvent('download', {
    predicate: (download) =>
      /^sc-dojo-backup-\d{8}-\d{6}\.json$/.test(download.suggestedFilename()),
  });
  await page.getByRole('button', { name: 'バックアップを作成' }).click();
  const path = await (await downloaded).path();
  if (!path) throw new Error('バックアップを取得できません');
  return { path, document: JSON.parse(readFileSync(path, 'utf8')) as BackupDocument };
}

async function auditVisibleControls(page: Page) {
  const issues = await page.evaluate(() => {
    const visible = (element: Element) => element.getClientRects().length > 0;
    const controls = [
      ...document.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement
      >('input:not([type="hidden"]),textarea,select,button'),
    ];
    const name = (element: (typeof controls)[number]) =>
      element.getAttribute('aria-label') ||
      element
        .getAttribute('aria-labelledby')
        ?.split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ')
        .trim() ||
      ('labels' in element
        ? [...(element.labels ?? [])]
            .map((label) => label.textContent)
            .join(' ')
            .trim()
        : '') ||
      (element.tagName === 'BUTTON' ? element.textContent?.trim() : '') ||
      element.getAttribute('title');
    return {
      unnamedControls: controls
        .filter((element) => visible(element) && !name(element))
        .map((element) => `${element.tagName}#${element.id}`),
      missingAlt: [...document.querySelectorAll('img')]
        .filter((img) => visible(img) && !img.getAttribute('alt')?.trim())
        .map((img) => img.getAttribute('src')),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(issues).toEqual({ unnamedControls: [], missingAlt: [], overflow: false });
  await expect(page.locator('body')).not.toContainText(
    /NW道場|ネットワークスペシャリスト|B-1|ネットワーク記述式|開発専用|架空pilot/,
  );
}

for (const width of [320, 390]) {
  test(`通常production ${width}px: 初回A-1→A-2→B・保存再開・正式3科目backup復元・cold offline`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const openedAt = Date.now();
    await page.goto('/#/');
    await expect(page.getByRole('heading', { name: 'ホーム', exact: true })).toBeVisible();
    const firstHomeMs = Date.now() - openedAt;
    await auditVisibleControls(page);
    const navigation = page.getByRole('navigation', { name: 'メインナビゲーション' });
    await navigation.getByRole('link', { name: '演習', exact: true }).focus();
    await page.keyboard.press('Enter');

    const sessions: Record<string, string> = {};
    for (const subject of ['a1', 'a2'] as const) {
      await page.goto('/#/');
      await selectSubject(page, subject === 'a1' ? /科目A-1/ : /科目A-2/);
      await navigation.getByRole('link', { name: '演習', exact: true }).click();
      await page.getByRole('button', { name: 'この条件で始める' }).click();
      await expect(page.getByRole('heading', { name: '1 / 10 問' })).toBeVisible();
      sessions[subject] = page.url();
      await auditVisibleControls(page);
      await page
        .getByRole('group', { name: '答えを1つ選んでください' })
        .getByRole('radio')
        .first()
        .check();
      await page.getByRole('button', { name: '回答する', exact: true }).click();
      await expect(page.getByRole('status')).toContainText(/正解です|不正解です/);
      await page.getByRole('button', { name: '☆ お気に入りに追加' }).click();
      await page.getByRole('button', { name: '中断する' }).click();
      await page.getByRole('button', { name: '保存してホームへ戻る' }).click();
      await page.getByRole('link', { name: /前回の続きから再開/ }).click();
      await expect(page.getByRole('button', { name: '★ お気に入り登録済み' })).toBeVisible();
      await expect(page.getByRole('status')).toContainText(/正解です|不正解です/);
      await auditVisibleControls(page);
      await page.goto('/#/progress');
      await expect(page.getByText('1 / 240問', { exact: true })).toBeVisible();
    }
    await page.goto('/#/');
    await selectSubject(page, /科目B/);
    await navigation.getByRole('link', { name: '演習', exact: true }).click();
    await expect(page.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(20);
    await page.getByRole('button', { name: 'お気に入りに追加', exact: true }).first().click();
    await page.getByRole('button', { name: 'この大問を練習する' }).first().click();
    await expect(page).toHaveURL(/\/b1\/practice\/[^/]+$/);
    sessions.b1 = page.url();
    await page.getByRole('tab', { name: '答案', exact: true }).click();
    const field = page
      .locator('.b1-answer-field input:enabled,.b1-answer-field textarea:enabled')
      .first();
    await field.fill('監査の保存答案');
    await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    await auditVisibleControls(page);
    await page.reload();
    await page.getByRole('tab', { name: '答案', exact: true }).click();
    await expect(field).toHaveValue('監査の保存答案');

    await page.goto('/#/exam');
    await expect(page.getByRole('combobox', { name: '試験回' }).locator('option')).toHaveCount(5);
    await expect(page.getByRole('checkbox')).toHaveCount(4);
    await page.getByRole('checkbox', { name: '問1を選ぶ' }).check();
    await page.getByRole('checkbox', { name: '問2を選ぶ' }).check();
    await page.getByRole('button', { name: '150分模試を開始する' }).click();
    await page.getByRole('tab', { name: '答案', exact: true }).click();
    await field.fill('監査の模試答案1');
    await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    const switcher = page.getByRole('navigation', { name: '大問切替', exact: true });
    await switcher.getByRole('button', { name: '問2', exact: true }).click();
    await expect(field).toHaveValue('');
    await field.fill('監査の模試答案2');
    await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    await switcher.getByRole('button', { name: '問1', exact: true }).click();
    await expect(field).toHaveValue('監査の模試答案1');
    await auditVisibleControls(page);

    const original = await exportBackup(page);
    expect(original.document).toMatchObject({
      format: 'sc-dojo-backup',
      backupVersion: 7,
      appVersion: '0.6.0',
    });
    expect(original.document.data.answerHistory.map((row) => row.subjectId).sort()).toEqual([
      'a1',
      'a2',
    ]);
    expect(original.document.data.favorites.map((row) => row.subjectId).sort()).toEqual([
      'a1',
      'a2',
    ]);
    expect(original.document.data.normalPracticeSessions).toHaveLength(2);
    expect(original.document.data.b1.practiceSessions).toHaveLength(1);
    expect(original.document.data.b1.mockSessions).toHaveLength(1);
    expect(
      original.document.data.b1.preferences?.some((row) => (row.favoriteCaseIds?.length ?? 0) > 0),
    ).toBe(true);
    await page.locator('#backup-file-input').setInputFiles({
      name: 'old-nw.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...original.document, format: 'nw-a1-dojo-backup' })),
    });
    await expect(
      page.getByText('このアプリのバックアップ形式ではありません。別のファイルを選んでください。'),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: '学習データを全消去', exact: true }).click();
    const deletion = page.getByRole('dialog');
    await deletion.getByLabel('確認文字「削除」を入力してください').fill('削除');
    await deletion.getByRole('button', { name: '学習データを全消去する' }).click();
    await expect(page.getByRole('region', { name: 'データ管理' })).toContainText('回答履歴0件');
    await page.locator('#backup-file-input').setInputFiles(original.path);
    await page.getByRole('dialog').getByRole('button', { name: '復元する', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('バックアップを復元しました');
    const restored = (await exportBackup(page)).document;
    for (const key of ['answerHistory', 'favorites', 'normalPracticeSessions', 'b1'] as const)
      expect(restored.data[key]).toEqual(original.document.data[key]);

    await page.waitForFunction(async () => {
      await navigator.serviceWorker.ready;
      return Boolean(navigator.serviceWorker.controller);
    });
    const performance = await page.evaluate(() => ({
      navigation: performance.getEntriesByType('navigation').map((entry) => entry.toJSON()),
      cacheNames: [] as string[],
    }));
    performance.cacheNames = await page.evaluate(() => caches.keys());
    await context.setOffline(true);
    await page.close();
    const cold = await context.newPage();
    await cold.setViewportSize({ width, height: 844 });
    cold.on('pageerror', (error) => errors.push(error.message));
    for (const subject of ['a1', 'a2', 'b1'] as const) {
      await cold.goto('/#/');
      await selectSubject(
        cold,
        subject === 'a1' ? /科目A-1/ : subject === 'a2' ? /科目A-2/ : /科目B/,
      );
      await cold.goto(sessions[subject]);
      if (subject === 'b1') {
        await cold.getByRole('tab', { name: '本文・図表' }).click();
        await expect(cold.locator('p.b1-original-text[id]')).not.toHaveCount(0);
        await cold.getByRole('tab', { name: '答案', exact: true }).click();
        await expect(
          cold.locator('.b1-answer-field input,.b1-answer-field textarea').first(),
        ).toHaveValue('監査の保存答案');
      } else {
        await expect(cold.locator('.answer-feedback-status')).toContainText(/正解です|不正解です/);
        await expect(cold.getByRole('button', { name: '★ お気に入り登録済み' })).toBeVisible();
      }
      await auditVisibleControls(cold);
    }
    await cold.screenshot({ path: resolve(evidence, `production-${width}.png`) });
    expect(errors).toEqual([]);
    mkdirSync(evidence, { recursive: true });
    writeFileSync(
      resolve(evidence, `runtime-${width}.json`),
      JSON.stringify({ width, firstHomeMs, ...performance, errors }, null, 2),
    );
  });
}

test('production: IndexedDB不可と途中セッション欠損を日本語で案内する', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    await context.addInitScript(() => {
      indexedDB.open = () => {
        throw new DOMException('Audit storage unavailable', 'SecurityError');
      };
    });
    const page = await context.newPage();
    await page.goto('/#/practice');
    await expect(page.getByText(/学習履歴を読み込めませんでした/)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'メインナビゲーション' })).toBeVisible();
  } finally {
    await context.close();
  }
  const normal = await browser.newContext();
  try {
    const page = await normal.newPage();
    await page.goto('/#/practice/missing-release-session');
    await expect(page.getByRole('heading', { name: '通常演習', exact: true })).toBeVisible();
    await page.goto('/#/');
    await selectSubject(page, /科目B/);
    await page.goto('/#/b1/practice/missing-release-session');
    await expect(page.getByRole('heading', { name: '科目B演習' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'この大問を練習する' })).toHaveCount(20);
    await page.goto('/#/exam');
    await page.getByRole('checkbox', { name: '問1を選ぶ' }).check();
    await page.getByRole('checkbox', { name: '問2を選ぶ' }).check();
    await page.getByRole('button', { name: '150分模試を開始する' }).click();
    await expect(page).toHaveURL(/\/b1\/mock\/[^/]+$/);
    const id = page.url().split('/').at(-1)!;
    await page.evaluate(async (sessionId) => {
      await new Promise<void>((done, reject) => {
        const open = indexedDB.open('sc-dojo');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('b1MockSessions', 'readwrite');
          const store = tx.objectStore('b1MockSessions');
          const request = store.get(sessionId);
          request.onsuccess = () => {
            const row = request.result as Record<string, unknown>;
            store.put({ ...row, currentIndex: 999 });
          };
          tx.oncomplete = () => {
            db.close();
            done();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      });
    }, id);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: '科目B模試の保存内容を確認してください' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: '科目B模試一覧へ戻る' })).toBeVisible();
  } finally {
    await normal.close();
  }
});

test('production: B画像読込失敗・PDF未登録でも答案入力を利用できる', async ({ browser }) => {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 320, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.route('**/questions/sc/b/**', (route) => route.abort());
    await page.goto('/#/');
    await selectSubject(page, /科目B/);
    await page.goto('/#/practice');
    await page.getByRole('combobox', { name: '年度', exact: true }).selectOption('2023');
    await page.getByRole('combobox', { name: '大問', exact: true }).selectOption('1');
    await page.getByRole('button', { name: 'この大問を練習する' }).click();
    await page.getByRole('tab', { name: '本文・図表' }).click();
    const image = page.locator('img.b1-source-image').filter({ visible: true }).first();
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    await expect(image).toHaveJSProperty('naturalWidth', 0);
    await expect(image).toHaveAttribute('alt', /.+/);
    await page.getByRole('tab', { name: '答案', exact: true }).click();
    await page
      .locator('.b1-answer-field input,.b1-answer-field textarea')
      .first()
      .fill('画像失敗時の答案');
    await expect(page.getByText('答案はこの端末に自動保存されています。')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'メインナビゲーション' })).toBeVisible();
  } finally {
    await context.close();
  }
});
