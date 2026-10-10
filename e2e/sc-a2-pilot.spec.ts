import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
const pilot = JSON.parse(
  readFileSync(new URL('../data/sc-a2-pilot-30.json', import.meta.url), 'utf8'),
) as typeof import('../data/sc-a2-pilot-30.json');

const project = fileURLToPath(new URL('../', import.meta.url));
const captureStyle = '.practice-action-bar, .bottom-navigation { visibility: hidden !important; }';

test('pilot30問を演習・四択解説・図表・履歴・復習・成績・模試で確認する', async ({ browser }) => {
  // Thirty answers plus repeated viewport/theme captures and exam review need
  // a generous overall budget; individual assertion timeouts stay unchanged.
  test.setTimeout(480_000);
  const server = spawn(process.execPath, [resolve(project, 'e2e/fixtures/serve-a2-pilot.mjs')], {
    cwd: project,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const url = await new Promise<string>((done, reject) => {
      const timeout = setTimeout(() => reject(new Error('pilot server startup timeout')), 20_000);
      server.once('error', reject);
      server.stdout.on('data', (chunk: Buffer) => {
        const ready = chunk.toString().match(/READY (http:\/\/[^\s]+)/);
        if (ready) {
          clearTimeout(timeout);
          done(ready[1]);
        }
      });
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}#/`);
    await expect(page.getByText(/教材試作・30問/)).toBeVisible();
    await page.getByRole('radio', { name: /A-2/ }).click();
    await page.goto(`${url}#/practice`);
    await page.locator('input[name="question-count"]').last().check();
    await expect(page.getByText('出題予定: 30問')).toBeVisible();
    await page.getByRole('button', { name: 'この条件で始める' }).click();
    mkdirSync(resolve(project, 'tmp/pilot/ui'), { recursive: true });
    for (const [index, q] of pilot.questions.entries()) {
      await expect(page.getByRole('heading', { name: `${index + 1} / 30 問` })).toBeVisible();
      await expect(page.locator('.question-text')).toHaveText(q.question);
      await expect(page.getByRole('heading', { name: '解説', exact: true })).toHaveCount(0);
      await expect(page.locator('input[name="practice-answer"]')).toHaveCount(4);
      const stimuli = [
        ...(q.stimulus ?? []),
        ...q.choices.flatMap((c) => ('stimulus' in c ? c.stimulus : [])),
      ];
      await expect(page.getByRole('table')).toHaveCount(
        stimuli.filter((s) => s.type === 'table').length,
      );
      for (const s of stimuli) {
        if (s.type === 'code') await expect(page.getByLabel(s.caption)).toHaveText(s.content);
        if (s.type === 'image') {
          const image = page.getByRole('img', { name: s.alt, exact: true });
          await expect(image).toBeVisible();
          await expect
            .poll(() => image.evaluate((e) => (e as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0);
        }
      }
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        for (const theme of ['light', 'dark']) {
          await page.evaluate((theme) => {
            document.documentElement.dataset.theme = theme;
          }, theme);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          if (stimuli.length && width === 320 && theme === 'dark') {
            await page.locator('.practice-question-card').screenshot({
              path: resolve(project, `tmp/pilot/ui/${q.source.source_id}-320-dark-before.png`),
              style: captureStyle,
            });
          }
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'light';
      });
      if (stimuli.length)
        await page.locator('.practice-question-card').screenshot({
          path: resolve(project, `tmp/pilot/ui/${q.source.source_id}-before.png`),
          style: captureStyle,
        });
      const answer =
        index === 0 ? q.choices.find((c) => c.id !== q.correct_choice)!.id : q.correct_choice;
      await page.locator(`input[name="practice-answer"][value="${answer}"]`).check();
      await page.getByRole('button', { name: '回答する' }).click();
      await expect(page.locator('.answer-feedback-status')).toHaveText(
        index === 0 ? '不正解です' : '正解です',
      );
      await expect(
        page.getByRole('region', { name: '選択肢ごとの解説' }).locator('dt'),
      ).toHaveCount(4);
      await expect(page.getByText(q.exam_tip, { exact: true })).toBeVisible();
      await expect(page.getByText(q.memory_point, { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'IPA公式問題' })).toHaveAttribute(
        'href',
        q.source.official_question_url,
      );
      await expect(page.getByRole('link', { name: 'IPA公式解答' })).toHaveAttribute(
        'href',
        q.source.official_answer_url,
      );
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        for (const theme of ['light', 'dark']) {
          await page.evaluate((theme) => {
            document.documentElement.dataset.theme = theme;
          }, theme);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          if (index === 0 || (stimuli.length && width === 320 && theme === 'dark')) {
            await page.locator('.answer-feedback').screenshot({
              path: resolve(project, `tmp/pilot/ui/${q.source.source_id}-${width}-${theme}.png`),
              style: captureStyle,
            });
          }
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'light';
      });
      if (index === 0) {
        await page.getByRole('button', { name: '☆ お気に入りに追加' }).click();
        await page.reload();
        await expect(page.locator('.answer-feedback-status')).toHaveText('不正解です');
        await expect(page.getByRole('button', { name: '★ お気に入り登録済み' })).toBeVisible();
        await page.getByRole('link', { name: 'この問題の学習履歴を見る' }).click();
        await expect(page.locator('.attempt-history-list li')).toHaveCount(1);
        await page.getByText('正解と解説を表示する').click();
        await expect(page.getByRole('heading', { name: '試験での見分け方' })).toBeVisible();
        await page.getByRole('button', { name: '前の画面へ戻る' }).click();
        await page.locator('.answer-feedback').screenshot({
          path: resolve(project, 'tmp/pilot/ui/text-explanation.png'),
          style: captureStyle,
        });
      }
      await page.getByRole('button', { name: index === 29 ? '結果を見る' : '次の問題' }).click();
    }
    await expect(page.getByRole('heading', { name: '通常演習の結果' })).toBeVisible();
    await page.goto(`${url}#/progress`);
    await expect(page.getByRole('heading', { name: 'カテゴリ別成績' })).toBeVisible();
    await expect(page.getByText('30 / 30問')).toBeVisible();
    await page.screenshot({ path: resolve(project, 'tmp/pilot/ui/progress.png'), fullPage: true });
    await page.goto(`${url}#/practice`);
    for (const name of [/お気に入り/, /現在間違えている/]) {
      await page.getByRole('radio', { name }).check();
      await expect(page.getByText('出題予定: 1問')).toBeVisible();
    }
    await page.getByRole('button', { name: 'この条件で始める' }).click();
    await expect(page.locator('.question-text')).toHaveText(pilot.questions[0].question);
    await page
      .locator(`input[name="practice-answer"][value="${pilot.questions[0].correct_choice}"]`)
      .check();
    await page.getByRole('button', { name: '回答する' }).click();
    await page.getByRole('button', { name: '結果を見る' }).click();
    await page.goto(`${url}#/practice`);
    await expect(page.getByRole('radio', { name: /現在間違えている/ })).toBeDisabled();
    await page.goto(`${url}#/exam`);
    await page.getByRole('button', { name: 'ランダム模試を選ぶ' }).click();
    await page.getByRole('button', { name: '模試を開始する' }).click();
    await expect(page.locator('.exam-number-button')).toHaveCount(25);
    for (let i = 0; i < 5; i++) {
      await expect(page.getByRole('heading', { name: '解説', exact: true })).toHaveCount(0);
      await expect(page.locator('input[name="exam-answer"]')).toHaveCount(4);
      if (i < 4) await page.getByRole('button', { name: '次の問題' }).click();
    }
    await page.screenshot({ path: resolve(project, 'tmp/pilot/ui/exam.png'), fullPage: true });
    await page.getByRole('button', { name: '提出する', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '提出する', exact: true }).click();
    await expect(page.getByRole('heading', { name: '不合格', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '選択肢ごとの解説' })).toBeVisible();
    const dbs = await page.evaluate(() => indexedDB.databases());
    expect(dbs.map((db) => db.name)).toContain('sc-dojo-sc-a2-pilot-v1');
    expect(dbs.map((db) => db.name)).not.toContain('sc-dojo');
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    server.kill();
  }
});
